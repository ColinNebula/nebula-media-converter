/**
 * Memory Manager - Optimize memory usage for large file handling
 */

class MemoryManager {
  constructor() {
    this.objectURLs = new Set();
    this.maxCacheSize = 100 * 1024 * 1024; // 100MB
    this.currentCacheSize = 0;
    this.fileCache = new Map();
    this.cleanupInterval = null;
    
    // Start cleanup interval
    this.startCleanup();
  }

  /**
   * Create and track object URL
   */
  createObjectURL(blob) {
    const url = URL.createObjectURL(blob);
    this.objectURLs.add(url);
    console.log(`📎 Created Object URL. Total tracked: ${this.objectURLs.size}`);
    return url;
  }

  /**
   * Revoke object URL
   */
  revokeObjectURL(url) {
    if (this.objectURLs.has(url)) {
      URL.revokeObjectURL(url);
      this.objectURLs.delete(url);
      console.log(`🗑️ Revoked Object URL. Remaining: ${this.objectURLs.size}`);
    }
  }

  /**
   * Revoke all object URLs
   */
  revokeAllObjectURLs() {
    this.objectURLs.forEach(url => {
      URL.revokeObjectURL(url);
    });
    this.objectURLs.clear();
    console.log('🗑️ All Object URLs revoked');
  }

  /**
   * Cache file with size limit
   */
  cacheFile(key, data, size) {
    // Check if adding would exceed limit
    if (this.currentCacheSize + size > this.maxCacheSize) {
      this.evictCache(size);
    }

    this.fileCache.set(key, {
      data,
      size,
      timestamp: Date.now()
    });
    this.currentCacheSize += size;
    console.log(`💾 Cached file: ${key} (${this.formatBytes(size)}). Total cache: ${this.formatBytes(this.currentCacheSize)}`);
  }

  /**
   * Get cached file
   */
  getCachedFile(key) {
    const cached = this.fileCache.get(key);
    if (cached) {
      console.log(`✅ Cache hit: ${key}`);
      return cached.data;
    }
    console.log(`❌ Cache miss: ${key}`);
    return null;
  }

  /**
   * Evict cache to make room
   */
  evictCache(neededSize) {
    const entries = Array.from(this.fileCache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp); // Oldest first

    let freedSize = 0;
    for (const [key, value] of entries) {
      if (this.currentCacheSize - freedSize + neededSize <= this.maxCacheSize) {
        break;
      }
      this.fileCache.delete(key);
      freedSize += value.size;
      console.log(`🗑️ Evicted: ${key} (${this.formatBytes(value.size)})`);
    }
    this.currentCacheSize -= freedSize;
  }

  /**
   * Clear all cache
   */
  clearCache() {
    this.fileCache.clear();
    this.currentCacheSize = 0;
    console.log('🗑️ Cache cleared');
  }

  /**
   * Process large file in chunks
   */
  async processFileInChunks(file, chunkSize = 5 * 1024 * 1024, onChunk) {
    const chunks = Math.ceil(file.size / chunkSize);
    const results = [];

    for (let i = 0; i < chunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      const chunk = file.slice(start, end);

      const result = await onChunk(chunk, i, chunks);
      results.push(result);

      // Allow garbage collection between chunks
      if (i % 10 === 0) {
        await this.sleep(0);
      }
    }

    return results;
  }

  /**
   * Get memory usage estimate
   */
  getMemoryUsage() {
    if (performance.memory) {
      return {
        usedJSHeapSize: this.formatBytes(performance.memory.usedJSHeapSize),
        totalJSHeapSize: this.formatBytes(performance.memory.totalJSHeapSize),
        jsHeapSizeLimit: this.formatBytes(performance.memory.jsHeapSizeLimit),
        cacheSize: this.formatBytes(this.currentCacheSize),
        objectURLs: this.objectURLs.size,
        cachedFiles: this.fileCache.size
      };
    }
    return {
      cacheSize: this.formatBytes(this.currentCacheSize),
      objectURLs: this.objectURLs.size,
      cachedFiles: this.fileCache.size
    };
  }

  /**
   * Format bytes to human readable
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Sleep utility for yielding to event loop
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Start automatic cleanup
   */
  startCleanup() {
    // Clean up every 5 minutes
    this.cleanupInterval = setInterval(() => {
      console.log('🧹 Running automatic cleanup...');
      this.cleanupOldCache();
      this.logMemoryUsage();
    }, 5 * 60 * 1000);
  }

  /**
   * Stop cleanup interval
   */
  stopCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Clean up cache older than 30 minutes
   */
  cleanupOldCache() {
    const thirtyMinutesAgo = Date.now() - (30 * 60 * 1000);
    let cleaned = 0;

    for (const [key, value] of this.fileCache.entries()) {
      if (value.timestamp < thirtyMinutesAgo) {
        this.fileCache.delete(key);
        this.currentCacheSize -= value.size;
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Cleaned ${cleaned} old cache entries`);
    }
  }

  /**
   * Log current memory usage
   */
  logMemoryUsage() {
    const usage = this.getMemoryUsage();
    console.log('📊 Memory Usage:', usage);
  }

  /**
   * Force garbage collection (if available in dev tools)
   */
  forceGC() {
    if (window.gc) {
      console.log('🗑️ Forcing garbage collection...');
      window.gc();
    } else {
      console.warn('⚠️ GC not available. Run Chrome with --expose-gc flag.');
    }
  }

  /**
   * Cleanup on app unmount
   */
  destroy() {
    this.revokeAllObjectURLs();
    this.clearCache();
    this.stopCleanup();
    console.log('🗑️ Memory Manager destroyed');
  }
}

// Singleton instance
const memoryManager = new MemoryManager();

// Clean up on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    memoryManager.destroy();
  });
}

export default memoryManager;
