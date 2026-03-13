/**
 * Rate Limiter - Prevent abuse and DDoS attempts
 */

class RateLimiter {
  constructor() {
    this.limits = new Map();
    this.blockList = new Set();
  }

  /**
   * Check if action is allowed
   */
  checkLimit(identifier, action, maxAttempts = 5, windowMs = 60000) {
    const key = `${identifier}:${action}`;
    const now = Date.now();
    
    // Check if identifier is blocked
    if (this.blockList.has(identifier)) {
      return {
        allowed: false,
        reason: 'Blocked due to excessive violations',
        retryAfter: null
      };
    }
    
    // Get or create limit record
    if (!this.limits.has(key)) {
      this.limits.set(key, []);
    }
    
    const attempts = this.limits.get(key);
    
    // Remove old attempts outside the time window
    const recentAttempts = attempts.filter(time => now - time < windowMs);
    
    // Check if limit exceeded
    if (recentAttempts.length >= maxAttempts) {
      const oldestAttempt = recentAttempts[0];
      const retryAfter = windowMs - (now - oldestAttempt);
      
      // Block if excessive violations
      if (recentAttempts.length > maxAttempts * 2) {
        this.blockIdentifier(identifier);
      }
      
      return {
        allowed: false,
        reason: 'Rate limit exceeded',
        retryAfter: Math.ceil(retryAfter / 1000) // seconds
      };
    }
    
    // Record this attempt
    recentAttempts.push(now);
    this.limits.set(key, recentAttempts);
    
    return {
      allowed: true,
      remaining: maxAttempts - recentAttempts.length
    };
  }

  /**
   * Block an identifier permanently
   */
  blockIdentifier(identifier) {
    this.blockList.add(identifier);
    console.warn(`🚫 Blocked identifier due to excessive violations: ${identifier}`);
  }

  /**
   * Unblock an identifier
   */
  unblockIdentifier(identifier) {
    this.blockList.delete(identifier);
  }

  /**
   * Clear all limits for an identifier
   */
  clearLimits(identifier) {
    const keysToDelete = [];
    for (const key of this.limits.keys()) {
      if (key.startsWith(`${identifier}:`)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => this.limits.delete(key));
  }

  /**
   * Clean up old entries
   */
  cleanup() {
    const now = Date.now();
    const maxAge = 3600000; // 1 hour
    
    for (const [key, attempts] of this.limits.entries()) {
      const recentAttempts = attempts.filter(time => now - time < maxAge);
      if (recentAttempts.length === 0) {
        this.limits.delete(key);
      } else {
        this.limits.set(key, recentAttempts);
      }
    }
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      totalTracked: this.limits.size,
      totalBlocked: this.blockList.size,
      blockedIdentifiers: Array.from(this.blockList)
    };
  }
}

// Create singleton instance
const rateLimiter = new RateLimiter();

// Cleanup every 10 minutes (only in browser environment)
if (typeof window !== 'undefined') {
  setInterval(() => rateLimiter.cleanup(), 600000);
}

export default rateLimiter;
