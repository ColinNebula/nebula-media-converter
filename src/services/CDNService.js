// Content Delivery Network (CDN) and Caching Strategy
// Optimizes file delivery and reduces server load for high traffic

class CDNService {
  constructor(config = {}) {
    this.config = {
      provider: config.provider || 'cloudflare', // cloudflare, aws, azure
      domains: {
        primary: config.primaryDomain || 'cdn.nebula.com',
        fallback: config.fallbackDomain || 'files.nebula.com'
      },
      caching: {
        defaultTTL: config.defaultTTL || 86400, // 24 hours
        maxAge: config.maxAge || 31536000, // 1 year
        staleWhileRevalidate: config.staleWhileRevalidate || 86400
      },
      compression: {
        enabled: config.compression !== false,
        types: ['video', 'audio', 'document', 'image'],
        quality: config.compressionQuality || 85
      },
      geo: {
        enabled: config.geoOptimization !== false,
        regions: ['us-east', 'us-west', 'eu-west', 'ap-southeast']
      },
      ...config
    };

    this.cache = new Map();
    this.compressionQueue = new Map();
  }

  // Generate optimized CDN URLs based on file type and user location
  generateCDNUrl(fileKey, options = {}) {
    const {
      quality = 'auto',
      format = 'auto',
      resize = null,
      userRegion = 'us-east',
      cacheBuster = false
    } = options;

    const baseUrl = this.selectOptimalDomain(userRegion);
    const params = new URLSearchParams();

    // Add optimization parameters
    if (quality !== 'auto') params.set('q', quality);
    if (format !== 'auto') params.set('f', format);
    if (resize) params.set('w', resize.width);
    if (resize) params.set('h', resize.height);
    if (cacheBuster) params.set('v', Date.now());

    const queryString = params.toString();
    return `${baseUrl}/${fileKey}${queryString ? `?${queryString}` : ''}`;
  }

  selectOptimalDomain(userRegion) {
    // Use geo-location to select nearest CDN edge
    const regionMapping = {
      'us-east': `https://us-east.${this.config.domains.primary}`,
      'us-west': `https://us-west.${this.config.domains.primary}`,
      'eu-west': `https://eu.${this.config.domains.primary}`,
      'ap-southeast': `https://asia.${this.config.domains.primary}`
    };

    return regionMapping[userRegion] || `https://${this.config.domains.primary}`;
  }

  // Intelligent pre-loading and caching
  async preloadFiles(fileKeys, priority = 'low') {
    const preloadPromises = fileKeys.map(async (fileKey) => {
      try {
        const url = this.generateCDNUrl(fileKey);
        
        // Use different strategies based on priority
        if (priority === 'high') {
          return this.warmCache(url);
        } else {
          return this.schedulePreload(url);
        }
      } catch (error) {
        console.warn(`Failed to preload ${fileKey}:`, error);
      }
    });

    return Promise.allSettled(preloadPromises);
  }

  async warmCache(url) {
    // Immediately fetch to warm CDN cache
    const response = await fetch(url, { 
      method: 'HEAD',
      headers: { 'Cache-Control': 'max-age=0' }
    });
    
    return response.ok;
  }

  schedulePreload(url) {
    // Use requestIdleCallback for low-priority preloading
    return new Promise((resolve) => {
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => {
          const link = document.createElement('link');
          link.rel = 'prefetch';
          link.href = url;
          document.head.appendChild(link);
          resolve(true);
        });
      } else {
        setTimeout(() => this.warmCache(url).then(resolve), 1000);
      }
    });
  }

  // Progressive loading for large files
  generateProgressiveUrls(fileKey, segments = 4) {
    const urls = [];
    
    for (let i = 0; i < segments; i++) {
      const start = Math.floor((i / segments) * 100);
      const end = Math.floor(((i + 1) / segments) * 100) - 1;
      
      const url = this.generateCDNUrl(fileKey, {
        range: `${start}-${end}`
      });
      
      urls.push({ url, start, end, index: i });
    }

    return urls;
  }

  // Adaptive bitrate streaming for video
  generateStreamingManifest(fileKey, qualities = ['720p', '480p', '360p']) {
    const manifest = {
      version: '1.0',
      sequences: qualities.map((quality, index) => ({
        bandwidth: this.getBandwidthForQuality(quality),
        resolution: quality,
        url: this.generateCDNUrl(fileKey, { 
          quality: quality.replace('p', ''),
          format: 'hls'
        }),
        index
      }))
    };

    return manifest;
  }

  getBandwidthForQuality(quality) {
    const bandwidthMap = {
      '1080p': 5000000,  // 5 Mbps
      '720p': 2500000,   // 2.5 Mbps
      '480p': 1000000,   // 1 Mbps
      '360p': 500000     // 500 Kbps
    };
    
    return bandwidthMap[quality] || 1000000;
  }

  // Smart compression based on device and connection
  async optimizeForDevice(fileKey, deviceInfo) {
    const {
      deviceType = 'desktop', // mobile, tablet, desktop
      connectionSpeed = 'fast', // slow, medium, fast
      screenSize = { width: 1920, height: 1080 },
      supportsWebP = false,
      supportsAV1 = false
    } = deviceInfo;

    let optimizations = {};

    // Device-specific optimizations
    if (deviceType === 'mobile') {
      optimizations = {
        quality: connectionSpeed === 'slow' ? 60 : 75,
        maxWidth: Math.min(screenSize.width * 2, 1280),
        format: supportsWebP ? 'webp' : 'auto'
      };
    } else if (deviceType === 'tablet') {
      optimizations = {
        quality: connectionSpeed === 'slow' ? 70 : 85,
        maxWidth: Math.min(screenSize.width * 2, 1920),
        format: supportsWebP ? 'webp' : 'auto'
      };
    } else {
      optimizations = {
        quality: 90,
        format: supportsAV1 ? 'av1' : (supportsWebP ? 'webp' : 'auto')
      };
    }

    return this.generateCDNUrl(fileKey, optimizations);
  }

  // Edge caching strategies
  setCacheHeaders(fileType, isTemporary = false) {
    const headers = new Headers();

    if (isTemporary) {
      // Short cache for temporary files
      headers.set('Cache-Control', 'public, max-age=3600'); // 1 hour
      headers.set('Edge-Control', 'cache, max-age=1800'); // 30 min edge cache
    } else {
      // Long cache for permanent files
      const maxAge = this.config.caching.maxAge;
      const stale = this.config.caching.staleWhileRevalidate;
      
      headers.set('Cache-Control', `public, max-age=${maxAge}, stale-while-revalidate=${stale}`);
      headers.set('Edge-Control', `cache, max-age=${maxAge}`);
    }

    // Content-specific headers
    switch (fileType) {
      case 'video':
        headers.set('Accept-Ranges', 'bytes');
        headers.set('Content-Type', 'video/mp4');
        break;
      case 'audio':
        headers.set('Accept-Ranges', 'bytes');
        headers.set('Content-Type', 'audio/mpeg');
        break;
      case 'document':
        headers.set('Content-Type', 'application/pdf');
        break;
      case 'image':
        headers.set('Content-Type', 'image/jpeg');
        headers.set('Vary', 'Accept'); // For WebP support
        break;
    }

    return headers;
  }

  // Bandwidth-aware loading
  async loadWithBandwidthAdaptation(fileKey, onProgress) {
    // Detect connection speed
    const connection = navigator.connection;
    const effectiveType = connection?.effectiveType || 'unknown';
    
    let chunkSize;
    switch (effectiveType) {
      case 'slow-2g':
      case '2g':
        chunkSize = 64 * 1024; // 64KB
        break;
      case '3g':
        chunkSize = 256 * 1024; // 256KB
        break;
      case '4g':
      default:
        chunkSize = 1024 * 1024; // 1MB
        break;
    }

    return this.loadInChunks(fileKey, chunkSize, onProgress);
  }

  async loadInChunks(fileKey, chunkSize, onProgress) {
    const url = this.generateCDNUrl(fileKey);
    
    // Get file size first
    const headResponse = await fetch(url, { method: 'HEAD' });
    const totalSize = parseInt(headResponse.headers.get('Content-Length'));
    
    const chunks = [];
    let loadedBytes = 0;

    for (let start = 0; start < totalSize; start += chunkSize) {
      const end = Math.min(start + chunkSize - 1, totalSize - 1);
      
      const response = await fetch(url, {
        headers: {
          'Range': `bytes=${start}-${end}`
        }
      });

      const chunk = await response.arrayBuffer();
      chunks.push(chunk);
      
      loadedBytes += chunk.byteLength;
      onProgress?.(loadedBytes, totalSize, (loadedBytes / totalSize) * 100);
    }

    return new Blob(chunks);
  }

  // Analytics and monitoring
  async trackDeliveryMetrics(fileKey, metrics) {
    const data = {
      fileKey,
      timestamp: Date.now(),
      loadTime: metrics.loadTime,
      transferSize: metrics.transferSize,
      cacheHit: metrics.cacheHit,
      region: metrics.region,
      deviceType: metrics.deviceType,
      connectionType: metrics.connectionType
    };

    // Send to analytics endpoint
    try {
      await fetch('/api/analytics/cdn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    } catch (error) {
      console.warn('Failed to track CDN metrics:', error);
    }
  }

  // Cache invalidation
  async invalidateCache(fileKeys) {
    const invalidationPromises = fileKeys.map(async (fileKey) => {
      try {
        const response = await fetch('/api/cdn/invalidate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileKey })
        });

        return response.ok;
      } catch (error) {
        console.error(`Failed to invalidate cache for ${fileKey}:`, error);
        return false;
      }
    });

    return Promise.allSettled(invalidationPromises);
  }

  // Cost optimization
  calculateStorageCosts(usage) {
    const costs = {
      storage: usage.storageGB * 0.023, // $0.023 per GB
      bandwidth: usage.bandwidthGB * 0.085, // $0.085 per GB
      requests: usage.requests * 0.0004, // $0.0004 per 10k requests
      transformations: usage.transformations * 0.0005 // $0.0005 per 1k
    };

    costs.total = Object.values(costs).reduce((sum, cost) => sum + cost, 0);
    return costs;
  }

  // Performance monitoring
  getPerformanceMetrics() {
    return {
      cacheHitRate: this.calculateCacheHitRate(),
      averageLoadTime: this.calculateAverageLoadTime(),
      bandwidthSaved: this.calculateBandwidthSaved(),
      errorRate: this.calculateErrorRate()
    };
  }

  calculateCacheHitRate() {
    // Implementation for cache hit rate calculation
    return 0.85; // 85% cache hit rate example
  }

  calculateAverageLoadTime() {
    // Implementation for average load time calculation
    return 1.2; // 1.2 seconds example
  }

  calculateBandwidthSaved() {
    // Implementation for bandwidth savings calculation
    return 0.45; // 45% bandwidth saved through optimization
  }

  calculateErrorRate() {
    // Implementation for error rate calculation
    return 0.001; // 0.1% error rate example
  }
}

export default CDNService;