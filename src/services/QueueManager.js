// Queue Management System for High-Volume File Processing
// Supports distributed processing with Redis and message queues

import Redis from 'ioredis';
import { EventEmitter } from 'events';

class QueueManager extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      redis: {
        host: config.redisHost || process.env.REDIS_HOST || 'localhost',
        port: config.redisPort || process.env.REDIS_PORT || 6379,
        password: config.redisPassword || process.env.REDIS_PASSWORD,
        db: config.redisDb || 1,
        keyPrefix: 'nebula:queue:'
      },
      queues: {
        conversion: 'conversion_jobs',
        priority: 'priority_jobs',
        document: 'document_jobs',
        cleanup: 'cleanup_jobs'
      },
      concurrency: {
        conversion: config.conversionWorkers || 5,
        document: config.documentWorkers || 3,
        cleanup: config.cleanupWorkers || 2
      },
      retryConfig: {
        maxRetries: 3,
        retryDelay: 5000, // 5 seconds
        backoffFactor: 2
      },
      ...config
    };

    this.redis = new Redis(this.config.redis);
    this.subscribers = new Map();
    this.workers = new Map();
    this.processing = new Map();
    
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.redis.on('error', (error) => {
      console.error('Redis connection error:', error);
      this.emit('error', error);
    });

    this.redis.on('connect', () => {
      console.log('Connected to Redis queue system');
      this.emit('connected');
    });
  }

  // Add job to queue with priority support
  async addJob(queueName, jobData, options = {}) {
    const {
      priority = 5, // 1-10, higher = more priority
      delay = 0,
      retry = true,
      maxRetries = this.config.retryConfig.maxRetries,
      uniqueId = null // For deduplication
    } = options;

    const jobId = uniqueId || this.generateJobId();
    const job = {
      id: jobId,
      data: jobData,
      priority,
      retry,
      maxRetries,
      retryCount: 0,
      createdAt: Date.now(),
      processedAt: null,
      completedAt: null,
      failedAt: null,
      error: null
    };

    try {
      // Check for duplicate jobs if uniqueId provided
      if (uniqueId) {
        const existing = await this.redis.hget(
          `${this.config.redis.keyPrefix}jobs`,
          jobId
        );
        
        if (existing) {
          const existingJob = JSON.parse(existing);
          if (!existingJob.completedAt && !existingJob.failedAt) {
            return { jobId, status: 'duplicate' };
          }
        }
      }

      // Store job data
      await this.redis.hset(
        `${this.config.redis.keyPrefix}jobs`,
        jobId,
        JSON.stringify(job)
      );

      if (delay > 0) {
        // Schedule delayed job
        await this.redis.zadd(
          `${this.config.redis.keyPrefix}delayed`,
          Date.now() + delay,
          jobId
        );
      } else {
        // Add to priority queue
        await this.redis.zadd(
          `${this.config.redis.keyPrefix}${queueName}`,
          -priority, // Negative for descending order
          jobId
        );
      }

      this.emit('jobAdded', { queueName, jobId, job });
      return { jobId, status: 'queued' };

    } catch (error) {
      console.error('Error adding job to queue:', error);
      throw error;
    }
  }

  // Process jobs from queue
  async processQueue(queueName, processorFunction, concurrency = null) {
    const workers = concurrency || this.config.concurrency[queueName] || 3;
    const queueKey = `${this.config.redis.keyPrefix}${queueName}`;
    
    console.log(`Starting ${workers} workers for queue: ${queueName}`);

    // Start worker processes
    for (let i = 0; i < workers; i++) {
      this.startWorker(queueName, queueKey, processorFunction, i);
    }

    // Start delayed job processor
    this.startDelayedJobProcessor();
  }

  async startWorker(queueName, queueKey, processorFunction, workerId) {
    const workerKey = `${queueName}-${workerId}`;
    this.workers.set(workerKey, { active: true, processing: 0 });

    while (this.workers.get(workerKey)?.active) {
      try {
        // Get next job from priority queue
        const result = await this.redis.bzpopmin(queueKey, 5); // 5 second timeout
        
        if (!result) continue; // Timeout, try again

        const [, jobId] = result;
        await this.processJob(jobId, processorFunction, workerId);

      } catch (error) {
        console.error(`Worker ${workerKey} error:`, error);
        await this.sleep(1000); // Wait before retrying
      }
    }
  }

  async processJob(jobId, processorFunction, workerId) {
    const jobKey = `${this.config.redis.keyPrefix}jobs`;
    
    try {
      // Get job data
      const jobData = await this.redis.hget(jobKey, jobId);
      if (!jobData) {
        console.warn(`Job ${jobId} not found`);
        return;
      }

      const job = JSON.parse(jobData);
      
      // Mark as processing
      job.processedAt = Date.now();
      job.workerId = workerId;
      await this.redis.hset(jobKey, jobId, JSON.stringify(job));

      // Track processing
      this.processing.set(jobId, { job, workerId, startTime: Date.now() });
      
      this.emit('jobStarted', { jobId, job, workerId });

      // Process the job
      const result = await processorFunction(job.data, {
        jobId,
        onProgress: (progress, message) => {
          this.emit('jobProgress', { jobId, progress, message });
        },
        onCancel: () => {
          this.emit('jobCancelled', { jobId });
          throw new Error('Job cancelled');
        }
      });

      // Mark as completed
      job.completedAt = Date.now();
      job.result = result;
      await this.redis.hset(jobKey, jobId, JSON.stringify(job));

      this.processing.delete(jobId);
      this.emit('jobCompleted', { jobId, job, result });

    } catch (error) {
      console.error(`Job ${jobId} failed:`, error);
      await this.handleJobFailure(jobId, error);
    }
  }

  async handleJobFailure(jobId, error) {
    const jobKey = `${this.config.redis.keyPrefix}jobs`;
    const jobData = await this.redis.hget(jobKey, jobId);
    
    if (!jobData) return;

    const job = JSON.parse(jobData);
    job.retryCount++;
    job.error = error.message;
    job.failedAt = Date.now();

    // Retry logic
    if (job.retry && job.retryCount < job.maxRetries) {
      const delay = this.config.retryConfig.retryDelay * 
                   Math.pow(this.config.retryConfig.backoffFactor, job.retryCount - 1);
      
      // Reset processing timestamp
      job.processedAt = null;
      job.failedAt = null;
      
      await this.redis.hset(jobKey, jobId, JSON.stringify(job));
      
      // Schedule retry
      await this.redis.zadd(
        `${this.config.redis.keyPrefix}delayed`,
        Date.now() + delay,
        jobId
      );

      this.emit('jobRetry', { jobId, job, retryCount: job.retryCount, delay });
    } else {
      // Max retries reached
      await this.redis.hset(jobKey, jobId, JSON.stringify(job));
      this.processing.delete(jobId);
      this.emit('jobFailed', { jobId, job, error });
    }
  }

  async startDelayedJobProcessor() {
    const delayedKey = `${this.config.redis.keyPrefix}delayed`;
    
    while (true) {
      try {
        // Get jobs ready to process
        const now = Date.now();
        const readyJobs = await this.redis.zrangebyscore(
          delayedKey, 0, now, 'LIMIT', 0, 10
        );

        for (const jobId of readyJobs) {
          // Get job to determine queue
          const jobData = await this.redis.hget(
            `${this.config.redis.keyPrefix}jobs`,
            jobId
          );
          
          if (!jobData) continue;

          const job = JSON.parse(jobData);
          
          // Move to appropriate queue
          const queueName = this.determineQueue(job);
          await this.redis.zadd(
            `${this.config.redis.keyPrefix}${queueName}`,
            -job.priority,
            jobId
          );

          // Remove from delayed queue
          await this.redis.zrem(delayedKey, jobId);
        }

        await this.sleep(1000); // Check every second

      } catch (error) {
        console.error('Delayed job processor error:', error);
        await this.sleep(5000);
      }
    }
  }

  determineQueue(job) {
    // Logic to determine which queue based on job data
    if (job.data.fileType === 'document') return 'document';
    if (job.data.priority > 8) return 'priority';
    if (job.data.type === 'cleanup') return 'cleanup';
    return 'conversion';
  }

  // Job management methods
  async getJob(jobId) {
    const jobData = await this.redis.hget(
      `${this.config.redis.keyPrefix}jobs`,
      jobId
    );
    return jobData ? JSON.parse(jobData) : null;
  }

  async cancelJob(jobId) {
    const job = await this.getJob(jobId);
    if (!job) return false;

    if (this.processing.has(jobId)) {
      // Job is currently processing
      this.emit('jobCancelled', { jobId });
      return true;
    }

    // Remove from all queues
    for (const queueName of Object.values(this.config.queues)) {
      await this.redis.zrem(
        `${this.config.redis.keyPrefix}${queueName}`,
        jobId
      );
    }

    await this.redis.zrem(
      `${this.config.redis.keyPrefix}delayed`,
      jobId
    );

    // Mark as cancelled
    job.cancelledAt = Date.now();
    await this.redis.hset(
      `${this.config.redis.keyPrefix}jobs`,
      jobId,
      JSON.stringify(job)
    );

    return true;
  }

  async getQueueStats() {
    const stats = {};
    
    for (const [name, queueName] of Object.entries(this.config.queues)) {
      const queueKey = `${this.config.redis.keyPrefix}${queueName}`;
      const count = await this.redis.zcard(queueKey);
      stats[name] = { queued: count };
    }

    stats.delayed = await this.redis.zcard(
      `${this.config.redis.keyPrefix}delayed`
    );
    
    stats.processing = this.processing.size;
    
    return stats;
  }

  async cleanup() {
    // Stop all workers
    for (const [workerKey, worker] of this.workers) {
      worker.active = false;
    }

    // Close Redis connections
    await this.redis.quit();
  }

  // Utility methods
  generateJobId() {
    return `job_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Monitoring and metrics
  async getMetrics() {
    const metrics = await this.getQueueStats();
    
    // Add processing metrics
    const processingJobs = Array.from(this.processing.values());
    metrics.averageProcessingTime = processingJobs.length > 0 
      ? processingJobs.reduce((sum, p) => sum + (Date.now() - p.startTime), 0) / processingJobs.length
      : 0;

    // Worker status
    metrics.workers = {};
    for (const [workerKey, worker] of this.workers) {
      metrics.workers[workerKey] = {
        active: worker.active,
        processing: worker.processing
      };
    }

    return metrics;
  }
}

// Specific job processors
export class ConversionJobProcessor {
  static async processMediaConversion(jobData, context) {
    const { inputFileKey, outputFormat, settings } = jobData;
    const { jobId, onProgress } = context;

    try {
      onProgress(10, 'Downloading input file...');
      // Download file from storage
      
      onProgress(30, 'Initializing conversion...');
      // Initialize FFmpeg or other conversion tool
      
      onProgress(50, 'Converting file...');
      // Perform actual conversion
      
      onProgress(80, 'Uploading result...');
      // Upload converted file
      
      onProgress(100, 'Conversion complete');
      
      return {
        outputFileKey: 'converted_file_key',
        outputSize: 1234567,
        processingTime: Date.now()
      };

    } catch (error) {
      throw new Error(`Conversion failed: ${error.message}`);
    }
  }

  static async processDocumentConversion(jobData, context) {
    const { inputFileKey, outputFormat } = jobData;
    const { onProgress } = context;

    onProgress(25, 'Processing document...');
    // Document-specific conversion logic
    
    onProgress(100, 'Document conversion complete');
    
    return {
      outputFileKey: 'converted_doc_key',
      outputSize: 123456
    };
  }
}

export default QueueManager;