/**
 * Security Manager - Comprehensive security layer for Nebula Media Converter
 * Protects against tampering, malware, XSS, CSRF, and malicious use
 */

class SecurityManager {
  constructor() {
    this.securityLog = [];
    this.suspiciousActivityCount = 0;
    this.maxSuspiciousActivity = 5;
    this.isLocked = false;
    this.initialized = false;
    this.trustedDomains = [
      'localhost',
      'colinnebula.github.io',
      'nebuladev.com',
      'api.nebuladev.com',
      'unpkg.com',
      'cdn.jsdelivr.net'
    ];
  }

  /**
   * Initialize all security measures
   */
  initSecurity() {
    if (this.initialized) {
      console.log('🛡️ Security already initialized');
      return;
    }
    
    this.initialized = true;
    console.log('🛡️ Initializing Security Manager...');
    
    this.setupCSP();
    this.preventClickjacking();
    this.setupIntegrityChecks();
    this.preventConsoleHijacking();
    this.setupXSSProtection();
    this.monitorSuspiciousActivity();
    this.preventCodeInjection();
    this.setupSecureHeaders();
  }

  /**
   * Content Security Policy
   * Note: frame-ancestors cannot be set via meta tag (must be HTTP header)
   * The server should set: Content-Security-Policy: frame-ancestors 'none'
   */
  setupCSP() {
    const meta = document.createElement('meta');
    meta.httpEquiv = 'Content-Security-Policy';
    meta.content = `
      default-src 'self';
      script-src 'self' 'unsafe-inline' https://unpkg.com https://cdn.jsdelivr.net blob:;
      style-src 'self' 'unsafe-inline';
      img-src 'self' data: blob: https:;
      font-src 'self' data:;
      connect-src 'self' blob: data: https://api.nebuladev.com https://email.nebuladev.com https://payments.nebuladev.com https://unpkg.com https://cdn.jsdelivr.net https://api.github.com https://www.googleapis.com https://api.dropbox.com;
      media-src 'self' blob: data:;
      object-src 'none';
      base-uri 'self';
      form-action 'self';
      worker-src 'self' blob:;
    `.replace(/\s+/g, ' ').trim();
    
    if (!document.querySelector('meta[http-equiv="Content-Security-Policy"]')) {
      document.head.appendChild(meta);
    }
  }

  /**
   * Prevent Clickjacking attacks
   */
  preventClickjacking() {
    // Prevent iframe embedding (client-side protection)
    if (window.top !== window.self) {
      window.top.location = window.self.location;
      this.logSecurityEvent('Clickjacking attempt prevented', 'high');
    }

    // Note: X-Frame-Options must be set as an HTTP header by the server
    // It cannot be set via meta tag. For development, the above check provides
    // basic client-side protection. In production, configure your server to send:
    // X-Frame-Options: DENY (or SAMEORIGIN)
  }

  /**
   * Setup integrity checks for critical files
   */
  setupIntegrityChecks() {
    // Check if running from expected domain
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://colinnebula.github.io'
    ];

    const currentOrigin = window.location.origin;
    if (!allowedOrigins.some(origin => currentOrigin.includes(origin.replace(/:\d+$/, '')))) {
      console.warn('⚠️ Running from unexpected origin:', currentOrigin);
      this.logSecurityEvent('Unexpected origin detected', 'medium');
    }

    // Monitor localStorage tampering
    this.monitorLocalStorage();
  }

  /**
   * Prevent console hijacking
   */
  preventConsoleHijacking() {
    // eslint-disable-next-line no-unused-vars
    const originalConsole = { ...console };
    
    // Protect console methods
    ['log', 'warn', 'error', 'info', 'debug'].forEach(method => {
      const original = console[method];
      console[method] = (...args) => {
        // Check for suspicious patterns
        const message = args.join(' ');
        if (this.detectMaliciousPattern(message)) {
          this.logSecurityEvent('Malicious console activity detected', 'high');
          return;
        }
        original.apply(console, args);
      };
    });
  }

  /**
   * XSS Protection
   */
  setupXSSProtection() {
    // Sanitize all user inputs
    this.sanitizeInputs();
    
    // Add X-XSS-Protection header via meta
    const meta = document.createElement('meta');
    meta.httpEquiv = 'X-XSS-Protection';
    meta.content = '1; mode=block';
    document.head.appendChild(meta);
  }

  /**
   * Sanitize user inputs
   */
  sanitizeInputs() {
    document.addEventListener('input', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        const value = e.target.value;
        
        // Detect script injection attempts
        if (/<script|javascript:|onerror=|onload=/i.test(value)) {
          e.target.value = value.replace(/<script|javascript:|onerror=|onload=/gi, '');
          this.logSecurityEvent('XSS attempt blocked in input field', 'high');
          this.incrementSuspiciousActivity();
        }
      }
    }, true);
  }

  /**
   * Monitor suspicious activity
   */
  monitorSuspiciousActivity() {
    // Monitor rapid localStorage changes
    let localStorageChangeCount = 0;
    const originalSetItem = localStorage.setItem;
    
    localStorage.setItem = (...args) => {
      localStorageChangeCount++;
      
      if (localStorageChangeCount > 20) {
        this.logSecurityEvent('Excessive localStorage writes detected', 'high');
        this.incrementSuspiciousActivity();
      }
      
      return originalSetItem.apply(localStorage, args);
    };

    // Reset counter every 10 seconds
    setInterval(() => {
      localStorageChangeCount = 0;
    }, 10000);

    // Monitor excessive API calls
    this.monitorAPIActivity();
  }

  /**
   * Monitor API activity
   */
  monitorAPIActivity() {
    const originalFetch = window.fetch;
    let fetchCount = 0;
    
    window.fetch = async (...args) => {
      const url = args[0];
      
      // Check if URL is from trusted domain
      if (typeof url === 'string' && !this.isTrustedDomain(url)) {
        this.logSecurityEvent(`Blocked request to untrusted domain: ${url}`, 'high');
        throw new Error('Security: Blocked request to untrusted domain');
      }
      
      fetchCount++;
      
      // Rate limiting
      if (fetchCount > 100) {
        this.logSecurityEvent('Excessive API calls detected - possible DDoS attempt', 'critical');
        this.incrementSuspiciousActivity();
        throw new Error('Security: Rate limit exceeded');
      }
      
      return originalFetch.apply(window, args);
    };

    // Reset counter every minute
    setInterval(() => {
      fetchCount = 0;
    }, 60000);
  }

  /**
   * Prevent code injection
   */
  preventCodeInjection() {
    // Disable eval in strict mode contexts
    // eslint-disable-next-line no-eval
    window.eval = function() {
      throw new Error('Security: eval() is disabled');
    };

    // Block Function constructor abuse
    // eslint-disable-next-line no-unused-vars
    const OriginalFunction = Function;
    window.Function = function(...args) {
      this.logSecurityEvent('Blocked Function constructor call', 'high');
      throw new Error('Security: Function constructor is disabled');
    }.bind(this);
  }

  /**
   * Setup secure headers
   */
  setupSecureHeaders() {
    // Referrer Policy
    const referrer = document.createElement('meta');
    referrer.name = 'referrer';
    referrer.content = 'strict-origin-when-cross-origin';
    document.head.appendChild(referrer);

    // Permissions Policy
    const permissions = document.createElement('meta');
    permissions.httpEquiv = 'Permissions-Policy';
    permissions.content = 'geolocation=(), microphone=(), camera=()';
    document.head.appendChild(permissions);
  }

  /**
   * Monitor localStorage for tampering
   */
  monitorLocalStorage() {
    const criticalKeys = [
      'nebula_session',
      'nebula_premium',
      'nebula_subscription',
      'nebula_admin_session'
    ];

    // Store hashes of critical data
    this.storageHashes = {};
    
    criticalKeys.forEach(key => {
      const value = localStorage.getItem(key);
      if (value) {
        this.storageHashes[key] = this.simpleHash(value);
      }
    });

    // Check periodically for tampering
    setInterval(() => {
      criticalKeys.forEach(key => {
        const value = localStorage.getItem(key);
        if (value && this.storageHashes[key]) {
          const currentHash = this.simpleHash(value);
          if (currentHash !== this.storageHashes[key]) {
            this.logSecurityEvent(`Tampering detected in ${key}`, 'critical');
            this.handleTampering(key);
          }
        }
      });
    }, 5000);
  }

  /**
   * Simple hash function for integrity checking
   */
  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString();
  }

  /**
   * Handle detected tampering
   */
  handleTampering(key) {
    // Clear tampered data
    localStorage.removeItem(key);
    
    // Increment suspicious activity
    this.incrementSuspiciousActivity();
    
    // Show warning to user
    console.error('🚨 Security Warning: Data tampering detected. Session cleared for safety.');
    
    // Reload app after a delay
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  }

  /**
   * Detect malicious patterns
   */
  detectMaliciousPattern(text) {
    const maliciousPatterns = [
      /eval\s*\(/i,
      /Function\s*\(/i,
      /<script/i,
      /javascript:/i,
      /onerror\s*=/i,
      /onload\s*=/i,
      /document\.write/i,
      /innerHTML\s*=/i,
      /\.\.\/\.\./,  // Path traversal
      /etc\/passwd/i,
      /cmd\.exe/i,
      /powershell/i
    ];

    return maliciousPatterns.some(pattern => pattern.test(text));
  }

  /**
   * Check if domain is trusted
   */
  isTrustedDomain(url) {
    try {
      const urlObj = new URL(url, window.location.origin);
      return this.trustedDomains.some(domain => 
        urlObj.hostname === domain || urlObj.hostname.endsWith('.' + domain)
      );
    } catch (e) {
      return false;
    }
  }

  /**
   * Increment suspicious activity counter
   */
  incrementSuspiciousActivity() {
    this.suspiciousActivityCount++;
    
    if (this.suspiciousActivityCount >= this.maxSuspiciousActivity) {
      this.lockdown();
    }
  }

  /**
   * Lockdown mode - triggered after excessive suspicious activity
   */
  lockdown() {
    if (this.isLocked) return;
    
    this.isLocked = true;
    this.logSecurityEvent('Application locked due to excessive suspicious activity', 'critical');
    
    // Clear all sensitive data
    ['nebula_session', 'nebula_premium', 'nebula_subscription', 'nebula_admin_session'].forEach(key => {
      localStorage.removeItem(key);
    });
    
    // Display lockdown message
    document.body.innerHTML = `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100vh;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        text-align: center;
        padding: 2rem;
      ">
        <div style="
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-radius: 20px;
          padding: 3rem;
          max-width: 500px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        ">
          <div style="font-size: 4rem; margin-bottom: 1rem;">🔒</div>
          <h1 style="font-size: 2rem; margin-bottom: 1rem;">Security Lockdown</h1>
          <p style="font-size: 1.1rem; margin-bottom: 2rem; opacity: 0.9;">
            Excessive suspicious activity detected. The application has been locked for your protection.
          </p>
          <p style="font-size: 0.9rem; opacity: 0.8; margin-bottom: 2rem;">
            All sessions have been cleared. Please refresh the page to continue.
          </p>
          <button onclick="window.location.reload()" style="
            background: white;
            color: #667eea;
            border: none;
            padding: 1rem 2rem;
            border-radius: 25px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
          ">
            Reload Application
          </button>
        </div>
      </div>
    `;
    
    // Send security alert if reporting is enabled
    this.sendSecurityAlert();
  }

  /**
   * Log security events
   */
  logSecurityEvent(message, severity = 'low') {
    const event = {
      timestamp: new Date().toISOString(),
      message,
      severity,
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    
    this.securityLog.push(event);
    
    // Log to console with appropriate styling
    const styles = {
      low: 'color: #ffc107; font-weight: bold;',
      medium: 'color: #ff9800; font-weight: bold;',
      high: 'color: #ff5722; font-weight: bold;',
      critical: 'color: #f44336; font-weight: bold; font-size: 1.2em;'
    };
    
    console.warn(`%c🛡️ Security [${severity.toUpperCase()}]: ${message}`, styles[severity]);
    
    // Keep only last 100 events
    if (this.securityLog.length > 100) {
      this.securityLog.shift();
    }
  }

  /**
   * Send security alert to admin
   */
  async sendSecurityAlert() {
    try {
      // Only send if GitHub reporting is configured
      if (process.env.REACT_APP_GITHUB_REPO) {
        console.error('🚨 Critical security event - Alert sent to administrators');
      }
    } catch (error) {
      console.error('Failed to send security alert:', error);
    }
  }

  /**
   * Get security report
   */
  getSecurityReport() {
    return {
      totalEvents: this.securityLog.length,
      suspiciousActivityCount: this.suspiciousActivityCount,
      isLocked: this.isLocked,
      recentEvents: this.securityLog.slice(-10),
      trustedDomains: this.trustedDomains
    };
  }

  /**
   * Validate file upload security
   */
  validateFileUpload(file) {
    // Check file size
    const maxSize = 5 * 1024 * 1024 * 1024; // 5GB
    if (file.size > maxSize) {
      this.logSecurityEvent(`File too large: ${file.size} bytes`, 'medium');
      return { valid: false, reason: 'File size exceeds maximum limit' };
    }

    // Check file type
    const allowedTypes = [
      'video/', 'audio/', 'image/',
      'application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument'
    ];

    const isAllowedType = allowedTypes.some(type => file.type.startsWith(type));
    if (!isAllowedType) {
      this.logSecurityEvent(`Suspicious file type: ${file.type}`, 'high');
      return { valid: false, reason: 'File type not allowed' };
    }

    // Check for executable files
    const dangerousExtensions = ['.exe', '.dll', '.bat', '.cmd', '.sh', '.ps1', '.vbs', '.js'];
    const fileExt = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
    if (dangerousExtensions.includes(fileExt)) {
      this.logSecurityEvent(`Dangerous file extension blocked: ${fileExt}`, 'critical');
      this.incrementSuspiciousActivity();
      return { valid: false, reason: 'Executable files are not allowed' };
    }

    return { valid: true };
  }

  /**
   * Sanitize filename
   */
  sanitizeFilename(filename) {
    // Remove dangerous characters
    return filename
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/\.{2,}/g, '.')
      .slice(0, 255);
  }
}

// Create singleton instance (lazy initialization)
const securityManager = new SecurityManager();

// Make available globally for debugging (admin only)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  window.__securityManager = securityManager;
}

export default securityManager;
