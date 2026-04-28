// Admin Authentication Service
import InputValidator from '../security/InputValidator';
import rateLimiter from '../security/RateLimiter';

class AdminAuthService {
  constructor() {
    this.backendUrl = process.env.REACT_APP_CPP_BACKEND_URL ||
                     process.env.REACT_APP_API_BASE_URL ||
                     'http://localhost:8080';

    this.sessionTimeout = 8 * 60 * 60 * 1000; // 8 hours
    this.maxLoginAttempts = 5;
    this.lockoutDuration = 30 * 60 * 1000; // 30 minutes
  }

  // Client-side PBKDF2-SHA256 verification using Web Crypto API.
  // Replicates exactly what Node does: pbkdf2Sync(password, saltHexString, 310000, 32, 'sha256')
  // The salt is the hex string treated as UTF-8 bytes (Node's default string encoding).
  async _verifyPasswordClientSide(password, saltHex, expectedHash) {
    try {
      const enc = new TextEncoder();
      const keyMaterial = await crypto.subtle.importKey(
        'raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']
      );
      const derivedBits = await crypto.subtle.deriveBits(
        { name: 'PBKDF2', salt: enc.encode(saltHex), iterations: 310000, hash: 'SHA-256' },
        keyMaterial,
        256 // 32 bytes
      );
      const derived = Array.from(new Uint8Array(derivedBits))
        .map(b => b.toString(16).padStart(2, '0')).join('');
      return derived === expectedHash;
    } catch {
      return false;
    }
  }

  // Offline login against REACT_APP_ env credentials when the backend is unreachable.
  async _loginOffline(usernameOrEmail, password) {
    const expectedUsername = process.env.REACT_APP_ADMIN_USERNAME || '';
    const salt             = process.env.REACT_APP_ADMIN_PASSWORD_SALT || '';
    const hash             = process.env.REACT_APP_ADMIN_PASSWORD_HASH || '';
    const email            = process.env.REACT_APP_ADMIN_EMAIL || expectedUsername;

    if (!salt || !hash) {
      throw new Error('Admin credentials not configured. Set REACT_APP_ADMIN_PASSWORD_SALT and REACT_APP_ADMIN_PASSWORD_HASH in .env');
    }

    const normalizedInput    = usernameOrEmail?.trim().toLowerCase();
    const normalizedExpected = expectedUsername.trim().toLowerCase();

    if (normalizedInput !== normalizedExpected) {
      throw new Error('Invalid username/email or password');
    }

    const valid = await this._verifyPasswordClientSide(password, salt, hash);
    if (!valid) {
      throw new Error('Invalid username/email or password');
    }

    // Build a local session token (not server-issued, but sufficient for a static deployment)
    const token = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
    return {
      token,
      expiresAt: Date.now() + this.sessionTimeout,
      username: expectedUsername,
      email,
      role: 'super_admin',
    };
  }

  // Admin login — tries the backend first, falls back to client-side PBKDF2 if unreachable
  async login(usernameOrEmail, password) {
    try {
      const normalizedInput = usernameOrEmail?.trim().toLowerCase();

      // Client-side rate limit as first guard (server also rate-limits)
      const rateCheck = rateLimiter.checkLimit(normalizedInput, 'admin_login', 5, 300000);
      if (!rateCheck.allowed) {
        throw new Error(`Too many login attempts. Retry after ${rateCheck.retryAfter}s`);
      }

      const lockoutInfo = this.getLoginAttempts(normalizedInput);
      if (lockoutInfo.isLocked) {
        throw new Error(`Account locked. Try again in ${Math.ceil((lockoutInfo.lockoutEnd - Date.now()) / 60000)} minutes.`);
      }

      // Try backend first; fall back to offline WebCrypto verification if unreachable
      let serverSession;
      try {
        const response = await fetch(`${this.backendUrl}/api/admin/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: usernameOrEmail?.trim(), password }),
          signal: AbortSignal.timeout(5000),
        });

        if (response.status === 429) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || 'Too many login attempts');
        }

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          this.recordFailedLogin(normalizedInput);
          throw new Error(data.error || 'Invalid username/email or password');
        }

        serverSession = await response.json();
      } catch (networkErr) {
        // Backend unreachable — authenticate client-side using bundled PBKDF2 hash
        if (networkErr.message.startsWith('Invalid') || networkErr.message.startsWith('Too many') || networkErr.message.startsWith('Account')) {
          throw networkErr;
        }
        serverSession = await this._loginOffline(usernameOrEmail, password);
      }

      this.clearLoginAttempts(normalizedInput);

      const csrfToken = InputValidator.generateCSRFToken();
      const session = {
        token: serverSession.token,
        csrfToken,
        username: serverSession.username,
        email: serverSession.email,
        role: serverSession.role || 'super_admin',
        permissions: ['all'],
        subscriptionPlan: 'business',
        isPremium: true,
        features: {
          unlimitedConversions: true,
          prioritySupport: true,
          advancedSettings: true,
          batchProcessing: true,
          apiAccess: true,
          customBranding: true,
          analytics: true,
          multiUserAccess: true,
          cloudStorage: 'unlimited',
          retentionPeriod: 'unlimited',
        },
        loginTime: Date.now(),
        expiresAt: serverSession.expiresAt,
        ipAddress: this.getCurrentIP(),
        userAgent: navigator.userAgent,
        user: {
          id: 'admin_user',
          name: 'System Administrator',
          email: serverSession.email,
          plan: 'business',
          status: 'active',
        },
      };

      localStorage.setItem('nebula_admin_session', JSON.stringify(session));
      sessionStorage.setItem('nebula_admin_token', serverSession.token);

      this.logAdminActivity('LOGIN', { username: serverSession.username, timestamp: Date.now() });

      return { success: true, session, message: 'Admin login successful' };
    } catch (error) {
      this.logAdminActivity('LOGIN_FAILED', {
        username: usernameOrEmail,
        error: error.message,
        timestamp: Date.now(),
      });
      throw error;
    }
  }

  // Verify admin session
  verifySession() {
    try {
      const sessionData = localStorage.getItem('nebula_admin_session');
      const sessionToken = sessionStorage.getItem('nebula_admin_token');

      if (!sessionData || !sessionToken) {
        return { isValid: false, reason: 'No session found' };
      }

      const session = JSON.parse(sessionData);

      // Check token match
      if (session.token !== sessionToken) {
        return { isValid: false, reason: 'Token mismatch' };
      }

      // Check expiration
      if (Date.now() > session.expiresAt) {
        this.logout();
        return { isValid: false, reason: 'Session expired' };
      }

      // Update last activity
      session.lastActivity = Date.now();
      localStorage.setItem('nebula_admin_session', JSON.stringify(session));

      return { 
        isValid: true, 
        session,
        timeRemaining: session.expiresAt - Date.now()
      };
    } catch (error) {
      console.error('Session verification error:', error);
      return { isValid: false, reason: 'Session verification failed' };
    }
  }

  // Admin logout
  logout() {
    const session = this.getCurrentSession();
    if (session) {
      this.logAdminActivity('LOGOUT', { username: session.username, timestamp: Date.now() });
      // Fire-and-forget server-side session invalidation
      fetch(`${this.backendUrl}/api/admin/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.token}` },
      }).catch(() => {}); // ignore network errors on logout
    }

    localStorage.removeItem('nebula_admin_session');
    sessionStorage.removeItem('nebula_admin_token');
    sessionStorage.removeItem('nebula_admin_permissions');
  }

  // Get current admin session
  getCurrentSession() {
    const verification = this.verifySession();
    return verification.isValid ? verification.session : null;
  }

  // Check if admin is logged in
  isLoggedIn() {
    const verification = this.verifySession();
    return verification.isValid;
  }

  // Check admin permissions
  hasPermission(permission) {
    const session = this.getCurrentSession();
    if (!session) return false;

    return session.permissions.includes('all') || session.permissions.includes(permission);
  }

  // Check if user has business plan privileges
  hasBusinessPlan() {
    const session = this.getCurrentSession();
    return session && session.subscriptionPlan === 'business';
  }

  // Get admin subscription data
  getSubscriptionData() {
    const session = this.getCurrentSession();
    if (!session) return null;

    return {
      plan: session.subscriptionPlan,
      isPremium: session.isPremium,
      features: session.features,
      user: session.user
    };
  }

  // Change admin password via the backend server
  async changePassword(currentPassword, newPassword) {
    const session = this.getCurrentSession();
    if (!session) {
      throw new Error('Admin session required');
    }

    if (newPassword.length < 12) {
      throw new Error('New password must be at least 12 characters');
    }

    let response;
    try {
      response = await fetch(`${this.backendUrl}/api/admin/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
        signal: AbortSignal.timeout(10000),
      });
    } catch {
      throw new Error('Cannot reach the admin backend. Password not changed.');
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Password change failed');

    this.logAdminActivity('PASSWORD_CHANGED', { username: session.username, timestamp: Date.now() });
    return { success: true, message: data.message || 'Password changed successfully' };
  }

  // Track login attempts
  getLoginAttempts(username) {
    const key = `admin_login_attempts_${username}`;
    const data = localStorage.getItem(key);
    
    if (!data) {
      return { attempts: 0, isLocked: false };
    }

    const attempts = JSON.parse(data);
    const now = Date.now();

    // Check if lockout has expired
    if (attempts.lockoutEnd && now > attempts.lockoutEnd) {
      localStorage.removeItem(key);
      return { attempts: 0, isLocked: false };
    }

    return {
      attempts: attempts.count || 0,
      isLocked: attempts.count >= this.maxLoginAttempts,
      lockoutEnd: attempts.lockoutEnd
    };
  }

  recordFailedLogin(username) {
    const key = `admin_login_attempts_${username}`;
    const existing = this.getLoginAttempts(username);
    const newCount = existing.attempts + 1;

    const data = {
      count: newCount,
      lastAttempt: Date.now()
    };

    if (newCount >= this.maxLoginAttempts) {
      data.lockoutEnd = Date.now() + this.lockoutDuration;
    }

    localStorage.setItem(key, JSON.stringify(data));
  }

  clearLoginAttempts(username) {
    const key = `admin_login_attempts_${username}`;
    localStorage.removeItem(key);
  }

  // Generate secure token
  generateSecureToken() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  // Get current IP (mock implementation)
  getCurrentIP() {
    return '127.0.0.1'; // In production, get from server
  }

  // Log admin activities
  logAdminActivity(action, details) {
    const logEntry = {
      id: this.generateSecureToken(),
      action,
      details,
      timestamp: Date.now(),
      userAgent: navigator.userAgent
    };

    // Store in localStorage (in production, send to server)
    const logs = JSON.parse(localStorage.getItem('nebula_admin_logs') || '[]');
    logs.unshift(logEntry);

    // Keep only last 1000 entries
    if (logs.length > 1000) {
      logs.splice(1000);
    }

    localStorage.setItem('nebula_admin_logs', JSON.stringify(logs));
  }

  // Get admin activity logs
  getActivityLogs(limit = 100) {
    const logs = JSON.parse(localStorage.getItem('nebula_admin_logs') || '[]');
    return logs.slice(0, limit);
  }

  // Session management
  extendSession() {
    const session = this.getCurrentSession();
    if (session) {
      session.expiresAt = Date.now() + this.sessionTimeout;
      localStorage.setItem('nebula_admin_session', JSON.stringify(session));
      return true;
    }
    return false;
  }

  // Security utilities
  encryptSensitiveData(data) {
    // Basic encoding (in production, use proper encryption)
    return btoa(JSON.stringify(data));
  }

  decryptSensitiveData(encryptedData) {
    try {
      return JSON.parse(atob(encryptedData));
    } catch (error) {
      throw new Error('Failed to decrypt data');
    }
  }

  // Get system security status
  getSecurityStatus() {
    const session = this.getCurrentSession();
    const logs = this.getActivityLogs(50);
    const failedLogins = logs.filter(log => log.action === 'LOGIN_FAILED').length;

    return {
      isSecure: failedLogins < 10,
      sessionActive: !!session,
      sessionTimeRemaining: session ? session.expiresAt - Date.now() : 0,
      recentFailedLogins: failedLogins,
      lastActivity: session ? session.lastActivity : null,
      securityLevel: failedLogins < 5 ? 'HIGH' : failedLogins < 10 ? 'MEDIUM' : 'LOW'
    };
  }

}

// Create and export a singleton instance
const adminAuthServiceInstance = new AdminAuthService();

// Make it available globally for debugging
if (typeof window !== 'undefined') {
  window.adminAuthService = adminAuthServiceInstance;
}

export default adminAuthServiceInstance;