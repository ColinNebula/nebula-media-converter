/**
 * Worker Manager - Manages Web Workers for background processing
 */

class WorkerManager {
  constructor() {
    this.workers = new Map();
    this.maxWorkers = navigator.hardwareConcurrency || 4;
    this.activeWorkers = 0;
  }

  /**
   * Create FFmpeg worker
   */
  createFFmpegWorker(onProgress, onComplete, onError) {
    if (this.activeWorkers >= this.maxWorkers) {
      throw new Error('Maximum workers reached. Please wait for current tasks to complete.');
    }

    const worker = new Worker(
      new URL('../workers/ffmpegWorker.js', import.meta.url),
      { type: 'module' }
    );

    const workerId = `ffmpeg_${Date.now()}`;
    this.workers.set(workerId, worker);
    this.activeWorkers++;

    // Set up message handlers
    worker.onmessage = (e) => {
      const { type, progress, time, data, message, success } = e.data;

      switch (type) {
        case 'loaded':
          console.log('✅ FFmpeg worker loaded successfully');
          break;
        case 'progress':
          if (onProgress) onProgress(progress, time);
          break;
        case 'complete':
          if (onComplete) onComplete(data);
          this.terminateWorker(workerId);
          break;
        case 'error':
          if (onError) onError(new Error(message));
          this.terminateWorker(workerId);
          break;
        default:
          console.warn('Unknown message from worker:', type);
      }
    };

    worker.onerror = (error) => {
      console.error('Worker error:', error);
      if (onError) onError(error);
      this.terminateWorker(workerId);
    };

    return { workerId, worker };
  }

  /**
   * Convert file using worker
   */
  async convertFile(file, outputFormat, onProgress, onComplete, onError) {
    return new Promise((resolve, reject) => {
      try {
        const { workerId, worker } = this.createFFmpegWorker(
          onProgress,
          (data) => {
            const blob = new Blob([data], { type: `video/${outputFormat}` });
            if (onComplete) onComplete(blob);
            resolve(blob);
          },
          (error) => {
            if (onError) onError(error);
            reject(error);
          }
        );

        // Read file as ArrayBuffer
        const reader = new FileReader();
        reader.onload = () => {
          worker.postMessage({
            type: 'convert',
            payload: {
              fileData: reader.result,
              inputName: file.name,
              outputFormat: outputFormat
            }
          });
        };
        reader.onerror = () => {
          const error = new Error('Failed to read file');
          if (onError) onError(error);
          reject(error);
        };
        reader.readAsArrayBuffer(file);

      } catch (error) {
        if (onError) onError(error);
        reject(error);
      }
    });
  }

  /**
   * Terminate specific worker
   */
  terminateWorker(workerId) {
    const worker = this.workers.get(workerId);
    if (worker) {
      worker.postMessage({ type: 'terminate' });
      worker.terminate();
      this.workers.delete(workerId);
      this.activeWorkers--;
      console.log(`🗑️ Worker ${workerId} terminated. Active: ${this.activeWorkers}`);
    }
  }

  /**
   * Terminate all workers
   */
  terminateAll() {
    this.workers.forEach((worker, id) => {
      worker.postMessage({ type: 'terminate' });
      worker.terminate();
    });
    this.workers.clear();
    this.activeWorkers = 0;
    console.log('🗑️ All workers terminated');
  }

  /**
   * Get worker stats
   */
  getStats() {
    return {
      activeWorkers: this.activeWorkers,
      maxWorkers: this.maxWorkers,
      utilization: Math.round((this.activeWorkers / this.maxWorkers) * 100)
    };
  }
}

// Singleton instance
const workerManager = new WorkerManager();

export default workerManager;
