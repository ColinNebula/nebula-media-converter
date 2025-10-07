// Infrastructure Scaling Configuration
// Auto-scaling, load balancing, and resource optimization for high traffic

export const ScalingConfig = {
  // Auto-scaling policies
  autoScaling: {
    webServers: {
      minInstances: 2,
      maxInstances: 20,
      targetCPU: 70, // Scale up at 70% CPU
      targetMemory: 80, // Scale up at 80% memory
      scaleUpCooldown: 300, // 5 minutes
      scaleDownCooldown: 600, // 10 minutes
      
      metrics: {
        cpuUtilization: { threshold: 70, period: 300 },
        memoryUtilization: { threshold: 80, period: 300 },
        activeConnections: { threshold: 1000, period: 60 },
        responseTime: { threshold: 2000, period: 300 } // 2 seconds
      }
    },

    conversionWorkers: {
      minInstances: 3,
      maxInstances: 50,
      targetQueueLength: 10, // Scale up when queue > 10
      avgProcessingTime: 300, // 5 minutes average
      
      metrics: {
        queueLength: { threshold: 10, period: 60 },
        processingTime: { threshold: 600, period: 300 },
        failureRate: { threshold: 0.05, period: 300 } // 5% failure rate
      }
    },

    database: {
      readReplicas: {
        min: 1,
        max: 5,
        targetConnections: 80 // Percentage of max connections
      },
      
      connectionPooling: {
        maxConnections: 100,
        minConnections: 5,
        acquireTimeout: 60000,
        idleTimeout: 10000
      }
    }
  },

  // Load balancing configuration
  loadBalancing: {
    strategy: 'least_connections', // round_robin, least_connections, ip_hash
    
    healthChecks: {
      interval: 30, // seconds
      timeout: 5, // seconds
      failureThreshold: 3,
      successThreshold: 2,
      path: '/health'
    },

    stickySessions: {
      enabled: true,
      cookieName: 'nebula_session',
      duration: 3600 // 1 hour
    },

    circuitBreaker: {
      failureThreshold: 5,
      recoveryTimeout: 30, // seconds
      monitoringPeriod: 60 // seconds
    }
  },

  // Caching strategies
  caching: {
    redis: {
      cluster: {
        nodes: [
          { host: 'redis-1.nebula.com', port: 6379 },
          { host: 'redis-2.nebula.com', port: 6379 },
          { host: 'redis-3.nebula.com', port: 6379 }
        ],
        options: {
          enableReadyCheck: false,
          redisOptions: {
            password: process.env.REDIS_PASSWORD
          }
        }
      },
      
      strategies: {
        sessions: { ttl: 86400, keyPrefix: 'session:' },
        fileMetadata: { ttl: 3600, keyPrefix: 'file:' },
        userProfiles: { ttl: 1800, keyPrefix: 'user:' },
        conversionResults: { ttl: 7200, keyPrefix: 'result:' }
      }
    },

    cdn: {
      provider: 'cloudflare',
      purgeOnUpdate: true,
      cacheRules: [
        { path: '/api/files/*', ttl: 3600 },
        { path: '/converted/*', ttl: 86400 },
        { path: '/thumbnails/*', ttl: 604800 } // 1 week
      ]
    }
  },

  // Storage optimization
  storage: {
    multiRegion: {
      primary: 'us-east-1',
      replicas: ['us-west-2', 'eu-west-1'],
      strategy: 'eventual_consistency'
    },

    tiering: {
      hot: {
        storage: 's3_standard',
        duration: 7, // days
        accessPattern: 'frequent'
      },
      warm: {
        storage: 's3_ia', // Infrequent Access
        duration: 30, // days
        accessPattern: 'weekly'
      },
      cold: {
        storage: 's3_glacier',
        duration: 365, // days
        accessPattern: 'rare'
      },
      archive: {
        storage: 's3_deep_archive',
        duration: 'permanent',
        accessPattern: 'never'
      }
    },

    cleanup: {
      tempFiles: { maxAge: 24 * 60 * 60 * 1000 }, // 24 hours
      failedConversions: { maxAge: 7 * 24 * 60 * 60 * 1000 }, // 7 days
      completedJobs: { maxAge: 30 * 24 * 60 * 60 * 1000 }, // 30 days
      userDeletedFiles: { maxAge: 90 * 24 * 60 * 60 * 1000 } // 90 days
    }
  },

  // Resource limits and quotas
  quotas: {
    free: {
      dailyConversions: 5,
      maxFileSize: 100 * 1024 * 1024, // 100MB
      storageLimit: 1024 * 1024 * 1024, // 1GB
      concurrentJobs: 1,
      apiCalls: 100 // per hour
    },
    
    pro: {
      dailyConversions: 100,
      maxFileSize: 1024 * 1024 * 1024, // 1GB
      storageLimit: 100 * 1024 * 1024 * 1024, // 100GB
      concurrentJobs: 3,
      apiCalls: 1000 // per hour
    },
    
    business: {
      dailyConversions: 1000,
      maxFileSize: 5 * 1024 * 1024 * 1024, // 5GB
      storageLimit: 1024 * 1024 * 1024 * 1024, // 1TB
      concurrentJobs: 10,
      apiCalls: 10000 // per hour
    }
  },

  // Monitoring and alerting
  monitoring: {
    metrics: {
      system: [
        'cpu_usage', 'memory_usage', 'disk_usage', 'network_io',
        'load_average', 'connection_count'
      ],
      application: [
        'response_time', 'error_rate', 'throughput', 'queue_length',
        'conversion_success_rate', 'storage_usage'
      ],
      business: [
        'active_users', 'new_signups', 'conversion_volume',
        'revenue', 'churn_rate'
      ]
    },

    alerts: {
      critical: {
        high_cpu: { threshold: 90, duration: 300 },
        high_memory: { threshold: 95, duration: 180 },
        high_error_rate: { threshold: 5, duration: 300 }, // 5%
        slow_response: { threshold: 5000, duration: 300 }, // 5 seconds
        queue_overflow: { threshold: 100, duration: 60 }
      },
      
      warning: {
        moderate_cpu: { threshold: 75, duration: 600 },
        moderate_memory: { threshold: 80, duration: 600 },
        slow_conversions: { threshold: 600, duration: 900 }, // 10 minutes
        storage_limit: { threshold: 80, duration: 3600 } // 80% of quota
      }
    },

    dashboards: {
      operations: ['system_health', 'performance_metrics', 'error_tracking'],
      business: ['user_analytics', 'revenue_tracking', 'usage_patterns'],
      development: ['deployment_status', 'api_performance', 'queue_monitoring']
    }
  },

  // Disaster recovery
  disasterRecovery: {
    backups: {
      database: {
        frequency: 'hourly',
        retention: 30, // days
        crossRegion: true
      },
      files: {
        frequency: 'daily',
        retention: 90, // days
        incrementalBackups: true
      }
    },

    failover: {
      rto: 300, // Recovery Time Objective: 5 minutes
      rpo: 3600, // Recovery Point Objective: 1 hour
      autoFailover: true,
      regions: ['us-west-2', 'eu-west-1']
    }
  },

  // Cost optimization
  costOptimization: {
    scheduling: {
      scaleDownHours: [23, 0, 1, 2, 3, 4, 5], // UTC hours
      weekendReduction: 0.5, // 50% capacity on weekends
      holidayReduction: 0.3 // 30% capacity on holidays
    },

    spotInstances: {
      enabled: true,
      percentage: 70, // 70% spot, 30% on-demand
      interruptionHandling: 'graceful_shutdown'
    },

    resourceOptimization: {
      rightsizing: {
        enabled: true,
        analysisWindow: 14, // days
        utilizationThreshold: 20 // Under 20% utilization
      },
      
      unused_resources: {
        detectUnusedEBS: true,
        detectUnusedElasticIPs: true,
        detectIdleInstances: true
      }
    }
  }
};

// Performance optimization utilities
export class PerformanceOptimizer {
  static calculateOptimalInstanceCount(currentLoad, targetUtilization = 70) {
    const requiredCapacity = currentLoad / (targetUtilization / 100);
    return Math.ceil(requiredCapacity);
  }

  static estimateScalingNeed(metrics) {
    const { cpuUsage, memoryUsage, queueLength, responseTime } = metrics;
    
    let scaleScore = 0;
    
    if (cpuUsage > 80) scaleScore += 3;
    else if (cpuUsage > 70) scaleScore += 2;
    else if (cpuUsage > 60) scaleScore += 1;
    
    if (memoryUsage > 85) scaleScore += 3;
    else if (memoryUsage > 75) scaleScore += 2;
    
    if (queueLength > 20) scaleScore += 3;
    else if (queueLength > 10) scaleScore += 2;
    else if (queueLength > 5) scaleScore += 1;
    
    if (responseTime > 3000) scaleScore += 3;
    else if (responseTime > 2000) scaleScore += 2;
    else if (responseTime > 1000) scaleScore += 1;
    
    // Scale recommendations
    if (scaleScore >= 8) return 'SCALE_UP_URGENT';
    if (scaleScore >= 5) return 'SCALE_UP';
    if (scaleScore >= 2) return 'MONITOR';
    return 'SCALE_DOWN_CONSIDERATION';
  }

  static optimizeResourceAllocation(workload) {
    const recommendations = {};
    
    // CPU optimization
    if (workload.type === 'cpu_intensive') {
      recommendations.instanceType = 'c5.xlarge';
      recommendations.cpuCores = 4;
    } else if (workload.type === 'memory_intensive') {
      recommendations.instanceType = 'r5.xlarge';
      recommendations.memory = '32GB';
    } else {
      recommendations.instanceType = 't3.large';
    }
    
    // Storage optimization
    if (workload.ioPattern === 'high_iops') {
      recommendations.storageType = 'gp3';
      recommendations.iops = 3000;
    } else {
      recommendations.storageType = 'gp2';
    }
    
    return recommendations;
  }
}

export default ScalingConfig;