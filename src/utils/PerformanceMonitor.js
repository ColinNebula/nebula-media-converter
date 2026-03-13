/**
 * Performance Monitor - Track and optimize app performance
 */

class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.enabled = process.env.NODE_ENV === 'development';
  }

  /**
   * Start timing an operation
   */
  start(label) {
    if (!this.enabled) return;
    
    performance.mark(`${label}-start`);
  }

  /**
   * End timing and log result
   */
  end(label) {
    if (!this.enabled) return;

    try {
      performance.mark(`${label}-end`);
      performance.measure(label, `${label}-start`, `${label}-end`);
      
      const measure = performance.getEntriesByName(label)[0];
      const duration = measure.duration;
      
      // Store metric
      if (!this.metrics.has(label)) {
        this.metrics.set(label, []);
      }
      this.metrics.get(label).push(duration);
      
      // Log with color coding
      const color = duration < 100 ? '#4caf50' : duration < 500 ? '#ff9800' : '#f44336';
      console.log(
        `%c⚡ ${label}: ${duration.toFixed(2)}ms`,
        `color: ${color}; font-weight: bold`
      );
      
      // Clean up
      performance.clearMarks(`${label}-start`);
      performance.clearMarks(`${label}-end`);
      performance.clearMeasures(label);
      
    } catch (error) {
      console.warn('Performance measurement failed:', error);
    }
  }

  /**
   * Measure function execution time
   */
  async measure(label, fn) {
    this.start(label);
    try {
      const result = await fn();
      this.end(label);
      return result;
    } catch (error) {
      this.end(label);
      throw error;
    }
  }

  /**
   * Get average time for operation
   */
  getAverage(label) {
    const times = this.metrics.get(label);
    if (!times || times.length === 0) return 0;
    
    const sum = times.reduce((a, b) => a + b, 0);
    return sum / times.length;
  }

  /**
   * Get all metrics
   */
  getAllMetrics() {
    const result = {};
    for (const [label, times] of this.metrics.entries()) {
      result[label] = {
        count: times.length,
        average: this.getAverage(label),
        min: Math.min(...times),
        max: Math.max(...times),
        total: times.reduce((a, b) => a + b, 0)
      };
    }
    return result;
  }

  /**
   * Log all metrics
   */
  logMetrics() {
    console.group('📊 Performance Metrics');
    const metrics = this.getAllMetrics();
    
    for (const [label, data] of Object.entries(metrics)) {
      console.log(`${label}:`, {
        'Calls': data.count,
        'Avg': `${data.average.toFixed(2)}ms`,
        'Min': `${data.min.toFixed(2)}ms`,
        'Max': `${data.max.toFixed(2)}ms`,
        'Total': `${data.total.toFixed(2)}ms`
      });
    }
    console.groupEnd();
  }

  /**
   * Monitor render performance
   */
  monitorComponent(componentName) {
    if (!this.enabled) return {};

    return {
      onRender: (id, phase, actualDuration) => {
        console.log(
          `%c🎨 ${componentName} (${phase}): ${actualDuration.toFixed(2)}ms`,
          `color: ${actualDuration < 16 ? '#4caf50' : '#ff9800'}`
        );
      }
    };
  }

  /**
   * Monitor memory usage
   */
  logMemory() {
    if (!performance.memory) {
      console.warn('Memory API not available');
      return;
    }

    const formatBytes = (bytes) => {
      const mb = bytes / 1024 / 1024;
      return `${mb.toFixed(2)} MB`;
    };

    console.log('💾 Memory Usage:', {
      'Used JS Heap': formatBytes(performance.memory.usedJSHeapSize),
      'Total JS Heap': formatBytes(performance.memory.totalJSHeapSize),
      'Heap Limit': formatBytes(performance.memory.jsHeapSizeLimit),
      'Usage %': `${((performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100).toFixed(1)}%`
    });
  }

  /**
   * Monitor network performance
   */
  logNetworkPerformance() {
    const resources = performance.getEntriesByType('resource');
    
    console.group('🌐 Network Performance');
    
    const byType = {};
    resources.forEach(resource => {
      const type = resource.initiatorType;
      if (!byType[type]) {
        byType[type] = { count: 0, totalSize: 0, totalDuration: 0 };
      }
      byType[type].count++;
      byType[type].totalSize += resource.transferSize || 0;
      byType[type].totalDuration += resource.duration;
    });

    for (const [type, data] of Object.entries(byType)) {
      console.log(`${type}:`, {
        'Count': data.count,
        'Total Size': `${(data.totalSize / 1024).toFixed(2)} KB`,
        'Avg Duration': `${(data.totalDuration / data.count).toFixed(2)}ms`
      });
    }
    
    console.groupEnd();
  }

  /**
   * Check for performance issues
   */
  checkPerformanceIssues() {
    const issues = [];
    const metrics = this.getAllMetrics();

    for (const [label, data] of Object.entries(metrics)) {
      if (data.average > 1000) {
        issues.push(`⚠️ ${label} is slow (avg ${data.average.toFixed(2)}ms)`);
      }
      if (data.max > 5000) {
        issues.push(`🔴 ${label} has very slow instances (max ${data.max.toFixed(2)}ms)`);
      }
    }

    if (performance.memory) {
      const usage = performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit;
      if (usage > 0.9) {
        issues.push(`🔴 Memory usage critical: ${(usage * 100).toFixed(1)}%`);
      } else if (usage > 0.7) {
        issues.push(`⚠️ Memory usage high: ${(usage * 100).toFixed(1)}%`);
      }
    }

    if (issues.length > 0) {
      console.group('⚠️ Performance Issues Detected');
      issues.forEach(issue => console.log(issue));
      console.groupEnd();
    } else {
      console.log('✅ No performance issues detected');
    }

    return issues;
  }

  /**
   * Clear all metrics
   */
  clear() {
    this.metrics.clear();
    console.log('🗑️ Performance metrics cleared');
  }
}

// Singleton instance
const performanceMonitor = new PerformanceMonitor();

// Make available globally in dev
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  window.__performanceMonitor = performanceMonitor;
}

export default performanceMonitor;
