/**
 * Input Validator - Sanitize and validate all user inputs
 */

class InputValidator {
  /**
   * Sanitize HTML to prevent XSS
   */
  static sanitizeHTML(input) {
    if (typeof input !== 'string') return input;
    
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;',
    };
    
    return input.replace(/[&<>"'/]/g, (char) => map[char]);
  }

  /**
   * Sanitize email
   */
  static sanitizeEmail(email) {
    if (typeof email !== 'string') return '';
    
    // Remove any HTML tags
    email = this.sanitizeHTML(email);
    
    // Basic email validation
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format');
    }
    
    return email.toLowerCase().trim();
  }

  /**
   * Sanitize username
   */
  static sanitizeUsername(username) {
    if (typeof username !== 'string') return '';
    
    // Remove HTML and special characters
    username = this.sanitizeHTML(username);
    
    // Allow only alphanumeric, dots, hyphens, underscores
    username = username.replace(/[^a-zA-Z0-9._@-]/g, '');
    
    // Limit length
    return username.slice(0, 100).trim();
  }

  /**
   * Validate password strength
   */
  static validatePassword(password) {
    if (typeof password !== 'string') {
      return { valid: false, message: 'Password must be a string' };
    }

    if (password.length < 8) {
      return { valid: false, message: 'Password must be at least 8 characters' };
    }

    if (password.length > 128) {
      return { valid: false, message: 'Password is too long' };
    }

    // Check for common patterns
    const commonPasswords = ['password', '12345678', 'qwerty', 'admin'];
    if (commonPasswords.some(common => password.toLowerCase().includes(common))) {
      return { valid: false, message: 'Password is too common' };
    }

    return { valid: true, message: 'Password is valid' };
  }

  /**
   * Sanitize URL
   */
  static sanitizeURL(url) {
    if (typeof url !== 'string') return '';
    
    try {
      const urlObj = new URL(url);
      
      // Only allow http and https protocols
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        throw new Error('Invalid protocol');
      }
      
      return urlObj.href;
    } catch (e) {
      throw new Error('Invalid URL');
    }
  }

  /**
   * Sanitize file path (prevent path traversal)
   */
  static sanitizeFilePath(path) {
    if (typeof path !== 'string') return '';
    
    // Reject any path containing traversal sequences rather than silently stripping them
    // (stripping '...' yields '.' which can still escape intended directories)
    if (/\.{2,}/.test(path) || /[\x00-\x1f]/.test(path)) {
      throw new Error('Invalid file path: path traversal or control characters detected');
    }
    
    path = path.replace(/[\/\\]+/g, '/');
    
    // Remove leading slashes
    path = path.replace(/^\/+/, '');
    
    return path;
  }

  /**
   * Validate JSON input
   */
  static validateJSON(input) {
    try {
      const parsed = JSON.parse(input);
      
      // Check for prototype pollution attempts
      if (parsed.__proto__ || parsed.constructor || parsed.prototype) {
        throw new Error('Potential prototype pollution detected');
      }
      
      return { valid: true, data: parsed };
    } catch (e) {
      return { valid: false, error: e.message };
    }
  }

  /**
   * Sanitize object keys (prevent prototype pollution)
   */
  static sanitizeObject(obj) {
    if (typeof obj !== 'object' || obj === null) return obj;
    
    const sanitized = {};
    const dangerousKeys = ['__proto__', 'constructor', 'prototype'];
    
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        // Skip dangerous keys
        if (dangerousKeys.includes(key)) {
          console.warn(`🛡️ Blocked dangerous key: ${key}`);
          continue;
        }
        
        // Recursively sanitize nested objects
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          sanitized[key] = this.sanitizeObject(obj[key]);
        } else if (typeof obj[key] === 'string') {
          sanitized[key] = this.sanitizeHTML(obj[key]);
        } else {
          sanitized[key] = obj[key];
        }
      }
    }
    
    return sanitized;
  }

  /**
   * Rate limiting helper
   */
  static createRateLimiter(maxAttempts, windowMs) {
    const attempts = new Map();
    
    return (identifier) => {
      const now = Date.now();
      const userAttempts = attempts.get(identifier) || [];
      
      // Remove old attempts outside the window
      const recentAttempts = userAttempts.filter(time => now - time < windowMs);
      
      if (recentAttempts.length >= maxAttempts) {
        return { allowed: false, retryAfter: windowMs - (now - recentAttempts[0]) };
      }
      
      recentAttempts.push(now);
      attempts.set(identifier, recentAttempts);
      
      return { allowed: true };
    };
  }

  /**
   * CSRF Token generator
   */
  static generateCSRFToken() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Validate CSRF Token
   */
  static validateCSRFToken(token, storedToken) {
    if (!token || !storedToken) return false;
    
    // Use constant-time comparison to prevent timing attacks
    if (token.length !== storedToken.length) return false;
    
    let result = 0;
    for (let i = 0; i < token.length; i++) {
      result |= token.charCodeAt(i) ^ storedToken.charCodeAt(i);
    }
    
    return result === 0;
  }
}

export default InputValidator;
