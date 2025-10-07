// Security utilities for input validation and sanitization
class SecurityUtils {
  // File validation
  static validateFile(file, options = {}) {
    const errors = [];
    
    // File size validation
    const maxSize = options.maxSize || 500 * 1024 * 1024; // 500MB default
    if (file.size > maxSize) {
      errors.push(`File size exceeds ${(maxSize / 1024 / 1024).toFixed(0)}MB limit`);
    }
    
    // File type validation
    const allowedTypes = options.allowedTypes || [
      'video/', 'audio/', 'image/'
    ];
    
    const isAllowedType = allowedTypes.some(type => 
      file.type.startsWith(type)
    );
    
    if (!isAllowedType) {
      errors.push('File type not supported');
    }
    
    // File name validation (prevent directory traversal)
    const suspiciousPatterns = [
      /\.\./g,     // Directory traversal
      /[<>:"|?*]/g, // Windows invalid characters
      /[\x00-\x1f]/g, // Control characters
    ];
    
    if (suspiciousPatterns.some(pattern => pattern.test(file.name))) {
      errors.push('Invalid file name');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  // Input sanitization
  static sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    
    return input
      .trim()
      .replace(/[<>]/g, '') // Remove HTML brackets
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+\s*=/gi, ''); // Remove event handlers
  }
  
  // Email validation
  static validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
  }
  
  // Rate limiting for actions
  static rateLimit(key, maxAttempts = 5, timeWindow = 60000) {
    const now = Date.now();
    const attempts = JSON.parse(localStorage.getItem(`rate_limit_${key}`) || '[]');
    
    // Clean old attempts
    const recentAttempts = attempts.filter(time => now - time < timeWindow);
    
    if (recentAttempts.length >= maxAttempts) {
      return {
        allowed: false,
        remainingTime: Math.ceil((timeWindow - (now - recentAttempts[0])) / 1000)
      };
    }
    
    // Record this attempt
    recentAttempts.push(now);
    localStorage.setItem(`rate_limit_${key}`, JSON.stringify(recentAttempts));
    
    return { allowed: true };
  }
  
  // Secure random string generation
  static generateSecureToken(length = 32) {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }
  
  // Content Security Policy validation
  static validateCSP() {
    const csp = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    return {
      hasCSP: !!csp,
      policy: csp ? csp.getAttribute('content') : null
    };
  }
}

export default SecurityUtils;