// Database Schema and Models for Nebula Media Converter
// Optimized for high-throughput file processing and user management

export const DatabaseSchema = {
  // Users table
  users: {
    id: 'UUID PRIMARY KEY',
    email: 'VARCHAR(255) UNIQUE NOT NULL',
    password_hash: 'VARCHAR(255) NOT NULL',
    first_name: 'VARCHAR(100)',
    last_name: 'VARCHAR(100)',
    company: 'VARCHAR(255)',
    subscription_tier: 'ENUM("free", "pro", "business") DEFAULT "free"',
    subscription_status: 'ENUM("active", "cancelled", "expired") DEFAULT "active"',
    storage_used: 'BIGINT DEFAULT 0', // bytes
    storage_limit: 'BIGINT DEFAULT 1073741824', // 1GB default
    api_key: 'VARCHAR(64) UNIQUE',
    created_at: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
    updated_at: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
    last_login: 'TIMESTAMP',
    
    // Indexes
    indexes: [
      'INDEX idx_email (email)',
      'INDEX idx_subscription_tier (subscription_tier)',
      'INDEX idx_created_at (created_at)'
    ]
  },

  // File storage tracking
  files: {
    id: 'UUID PRIMARY KEY',
    user_id: 'UUID NOT NULL',
    file_key: 'VARCHAR(500) UNIQUE NOT NULL', // S3/Storage key
    original_filename: 'VARCHAR(255) NOT NULL',
    file_size: 'BIGINT NOT NULL',
    mime_type: 'VARCHAR(100) NOT NULL',
    file_type: 'ENUM("video", "audio", "document", "image")',
    storage_provider: 'ENUM("aws", "google", "azure", "cloudflare") DEFAULT "aws"',
    storage_region: 'VARCHAR(50) DEFAULT "us-east-1"',
    upload_status: 'ENUM("uploading", "completed", "failed", "processing") DEFAULT "uploading"',
    processing_status: 'ENUM("pending", "processing", "completed", "failed")',
    is_temporary: 'BOOLEAN DEFAULT true',
    expires_at: 'TIMESTAMP NULL',
    created_at: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
    updated_at: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
    
    // Foreign keys
    foreign_keys: [
      'FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE'
    ],
    
    // Indexes
    indexes: [
      'INDEX idx_user_id (user_id)',
      'INDEX idx_file_key (file_key)',
      'INDEX idx_upload_status (upload_status)',
      'INDEX idx_expires_at (expires_at)',
      'INDEX idx_created_at (created_at)',
      'INDEX idx_file_type (file_type)'
    ]
  },

  // Conversion jobs tracking
  conversion_jobs: {
    id: 'UUID PRIMARY KEY',
    user_id: 'UUID NOT NULL',
    input_file_id: 'UUID NOT NULL',
    output_file_id: 'UUID NULL',
    input_format: 'VARCHAR(20) NOT NULL',
    output_format: 'VARCHAR(20) NOT NULL',
    conversion_settings: 'JSON', // Quality, bitrate, etc.
    status: 'ENUM("queued", "processing", "completed", "failed", "cancelled") DEFAULT "queued"',
    progress_percentage: 'TINYINT DEFAULT 0',
    current_step: 'VARCHAR(255)',
    worker_id: 'VARCHAR(100)', // Which server/worker is processing
    priority: 'TINYINT DEFAULT 5', // 1-10, higher = more priority
    estimated_completion: 'TIMESTAMP NULL',
    processing_time_seconds: 'INT DEFAULT 0',
    error_message: 'TEXT',
    retry_count: 'TINYINT DEFAULT 0',
    max_retries: 'TINYINT DEFAULT 3',
    started_at: 'TIMESTAMP NULL',
    completed_at: 'TIMESTAMP NULL',
    created_at: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
    updated_at: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
    
    // Foreign keys
    foreign_keys: [
      'FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE',
      'FOREIGN KEY (input_file_id) REFERENCES files(id) ON DELETE CASCADE',
      'FOREIGN KEY (output_file_id) REFERENCES files(id) ON DELETE SET NULL'
    ],
    
    // Indexes
    indexes: [
      'INDEX idx_user_id (user_id)',
      'INDEX idx_status (status)',
      'INDEX idx_priority_created (priority DESC, created_at ASC)', // For job queue
      'INDEX idx_worker_id (worker_id)',
      'INDEX idx_created_at (created_at)'
    ]
  },

  // User sessions for tracking active users
  user_sessions: {
    id: 'UUID PRIMARY KEY',
    user_id: 'UUID NOT NULL',
    session_token: 'VARCHAR(255) UNIQUE NOT NULL',
    ip_address: 'VARCHAR(45)',
    user_agent: 'TEXT',
    expires_at: 'TIMESTAMP NOT NULL',
    created_at: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
    last_activity: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
    
    // Foreign keys
    foreign_keys: [
      'FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE'
    ],
    
    // Indexes
    indexes: [
      'INDEX idx_user_id (user_id)',
      'INDEX idx_session_token (session_token)',
      'INDEX idx_expires_at (expires_at)'
    ]
  },

  // Subscription management
  subscriptions: {
    id: 'UUID PRIMARY KEY',
    user_id: 'UUID NOT NULL',
    plan_id: 'VARCHAR(50) NOT NULL',
    plan_name: 'VARCHAR(100) NOT NULL',
    status: 'ENUM("active", "cancelled", "past_due", "trialing") DEFAULT "active"',
    current_period_start: 'TIMESTAMP NOT NULL',
    current_period_end: 'TIMESTAMP NOT NULL',
    cancel_at_period_end: 'BOOLEAN DEFAULT false',
    stripe_subscription_id: 'VARCHAR(100) UNIQUE',
    stripe_customer_id: 'VARCHAR(100)',
    payment_method_id: 'VARCHAR(100)',
    trial_end: 'TIMESTAMP NULL',
    created_at: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
    updated_at: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
    
    // Foreign keys
    foreign_keys: [
      'FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE'
    ],
    
    // Indexes
    indexes: [
      'INDEX idx_user_id (user_id)',
      'INDEX idx_status (status)',
      'INDEX idx_stripe_subscription_id (stripe_subscription_id)',
      'INDEX idx_current_period_end (current_period_end)'
    ]
  },

  // Usage analytics and quotas
  usage_analytics: {
    id: 'UUID PRIMARY KEY',
    user_id: 'UUID NOT NULL',
    date: 'DATE NOT NULL',
    conversions_count: 'INT DEFAULT 0',
    storage_used_bytes: 'BIGINT DEFAULT 0',
    bandwidth_used_bytes: 'BIGINT DEFAULT 0',
    processing_time_seconds: 'INT DEFAULT 0',
    api_requests: 'INT DEFAULT 0',
    created_at: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
    updated_at: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
    
    // Foreign keys
    foreign_keys: [
      'FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE'
    ],
    
    // Indexes
    indexes: [
      'UNIQUE KEY idx_user_date (user_id, date)',
      'INDEX idx_date (date)',
      'INDEX idx_user_id (user_id)'
    ]
  },

  // System-wide analytics
  system_analytics: {
    id: 'UUID PRIMARY KEY',
    date: 'DATE NOT NULL',
    total_users: 'INT DEFAULT 0',
    active_users: 'INT DEFAULT 0',
    new_signups: 'INT DEFAULT 0',
    total_conversions: 'INT DEFAULT 0',
    total_storage_used: 'BIGINT DEFAULT 0',
    total_bandwidth_used: 'BIGINT DEFAULT 0',
    average_processing_time: 'FLOAT DEFAULT 0',
    server_uptime_percentage: 'FLOAT DEFAULT 100',
    error_rate_percentage: 'FLOAT DEFAULT 0',
    created_at: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
    updated_at: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
    
    // Indexes
    indexes: [
      'UNIQUE KEY idx_date (date)',
      'INDEX idx_created_at (created_at)'
    ]
  },

  // Error logging
  error_logs: {
    id: 'UUID PRIMARY KEY',
    user_id: 'UUID NULL',
    conversion_job_id: 'UUID NULL',
    error_type: 'VARCHAR(100) NOT NULL',
    error_message: 'TEXT NOT NULL',
    stack_trace: 'TEXT',
    request_data: 'JSON',
    user_agent: 'TEXT',
    ip_address: 'VARCHAR(45)',
    resolved: 'BOOLEAN DEFAULT false',
    created_at: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
    
    // Foreign keys
    foreign_keys: [
      'FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL',
      'FOREIGN KEY (conversion_job_id) REFERENCES conversion_jobs(id) ON DELETE SET NULL'
    ],
    
    // Indexes
    indexes: [
      'INDEX idx_user_id (user_id)',
      'INDEX idx_error_type (error_type)',
      'INDEX idx_resolved (resolved)',
      'INDEX idx_created_at (created_at)'
    ]
  },

  // API rate limiting
  api_rate_limits: {
    id: 'UUID PRIMARY KEY',
    user_id: 'UUID NOT NULL',
    endpoint: 'VARCHAR(255) NOT NULL',
    requests_count: 'INT DEFAULT 0',
    window_start: 'TIMESTAMP NOT NULL',
    window_duration_seconds: 'INT DEFAULT 3600', // 1 hour default
    limit_per_window: 'INT DEFAULT 1000',
    created_at: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
    updated_at: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
    
    // Foreign keys
    foreign_keys: [
      'FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE'
    ],
    
    // Indexes
    indexes: [
      'UNIQUE KEY idx_user_endpoint_window (user_id, endpoint, window_start)',
      'INDEX idx_window_start (window_start)'
    ]
  }
};

// Database connection and optimization settings
export const DatabaseConfig = {
  // Connection pooling
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'nebula_media',
    username: process.env.DB_USERNAME || 'nebula_user',
    password: process.env.DB_PASSWORD,
    ssl: process.env.NODE_ENV === 'production',
    
    // Connection pool settings
    pool: {
      min: 2,
      max: 20,
      acquire: 60000,
      idle: 10000
    }
  },

  // Performance optimizations
  optimizations: {
    // Partition large tables by date
    partitioning: {
      conversion_jobs: 'PARTITION BY RANGE (YEAR(created_at))',
      usage_analytics: 'PARTITION BY RANGE (YEAR(date))',
      error_logs: 'PARTITION BY RANGE (YEAR(created_at))'
    },

    // Automated cleanup procedures
    cleanup: {
      // Delete expired temporary files
      expired_files: 'DELETE FROM files WHERE is_temporary = true AND expires_at < NOW()',
      
      // Archive old completed jobs
      old_jobs: 'DELETE FROM conversion_jobs WHERE status = "completed" AND completed_at < DATE_SUB(NOW(), INTERVAL 30 DAY)',
      
      // Clean old error logs
      old_errors: 'DELETE FROM error_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY)',
      
      // Remove expired sessions
      expired_sessions: 'DELETE FROM user_sessions WHERE expires_at < NOW()'
    },

    // Caching strategies
    caching: {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD,
        db: 0,
        keyPrefix: 'nebula:',
        
        // Cache configurations
        ttl: {
          user_sessions: 86400, // 24 hours
          file_metadata: 3600, // 1 hour
          usage_stats: 1800, // 30 minutes
          rate_limits: 3600 // 1 hour
        }
      }
    }
  }
};

// Data access layer with optimized queries
export class DatabaseQueries {
  static async getUserWithSubscription(userId) {
    return `
      SELECT u.*, s.plan_name, s.status as subscription_status, s.current_period_end
      FROM users u
      LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
      WHERE u.id = ?
    `;
  }

  static async getActiveConversionJobs(limit = 100) {
    return `
      SELECT cj.*, f.original_filename, f.file_size
      FROM conversion_jobs cj
      JOIN files f ON cj.input_file_id = f.id
      WHERE cj.status IN ('queued', 'processing')
      ORDER BY cj.priority DESC, cj.created_at ASC
      LIMIT ${limit}
    `;
  }

  static async getUserStorageUsage(userId) {
    return `
      SELECT 
        SUM(f.file_size) as total_storage_used,
        COUNT(*) as total_files,
        COUNT(CASE WHEN f.is_temporary = true THEN 1 END) as temporary_files
      FROM files f
      WHERE f.user_id = ? AND f.upload_status = 'completed'
    `;
  }

  static async getConversionStats(userId, days = 30) {
    return `
      SELECT 
        DATE(cj.created_at) as date,
        COUNT(*) as conversions,
        SUM(cj.processing_time_seconds) as total_processing_time,
        COUNT(CASE WHEN cj.status = 'completed' THEN 1 END) as successful_conversions,
        COUNT(CASE WHEN cj.status = 'failed' THEN 1 END) as failed_conversions
      FROM conversion_jobs cj
      WHERE cj.user_id = ? AND cj.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY DATE(cj.created_at)
      ORDER BY date DESC
    `;
  }

  static async cleanupExpiredFiles() {
    return `
      DELETE f FROM files f
      WHERE f.is_temporary = true 
      AND f.expires_at < NOW()
    `;
  }

  static async getSystemLoad() {
    return `
      SELECT 
        COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing_jobs,
        COUNT(CASE WHEN status = 'queued' THEN 1 END) as queued_jobs,
        AVG(processing_time_seconds) as avg_processing_time
      FROM conversion_jobs
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
    `;
  }
}

export default { DatabaseSchema, DatabaseConfig, DatabaseQueries };