// Admin Authentication Service
class AdminAuthService {
  constructor() {
    this.adminCredentials = {
      // Default admin credentials (should be changed in production)
      username: 'admin',
      password: 'nebula2025!',
      email: 'admin@nebula.com',
      role: 'super_admin',
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
        retentionPeriod: 'unlimited'
      }
    };

    this.sessionTimeout = 8 * 60 * 60 * 1000; // 8 hours
    this.maxLoginAttempts = 5;
    this.lockoutDuration = 30 * 60 * 1000; // 30 minutes
  }

  // Admin login
  async login(username, password) {
    try {
      // Check for account lockout
      const lockoutInfo = this.getLoginAttempts(username);
      if (lockoutInfo.isLocked) {
        throw new Error(`Account locked. Try again in ${Math.ceil((lockoutInfo.lockoutEnd - Date.now()) / 60000)} minutes.`);
      }

      // Verify credentials
      if (username === this.adminCredentials.username && password === this.adminCredentials.password) {
        // Clear login attempts on successful login
        this.clearLoginAttempts(username);

        // Generate admin session
        const sessionToken = this.generateSecureToken();
        const session = {
          token: sessionToken,
          username: this.adminCredentials.username,
          email: this.adminCredentials.email,
          role: this.adminCredentials.role,
          permissions: this.adminCredentials.permissions,
          subscriptionPlan: this.adminCredentials.subscriptionPlan,
          isPremium: this.adminCredentials.isPremium,
          features: this.adminCredentials.features,
          loginTime: Date.now(),
          expiresAt: Date.now() + this.sessionTimeout,
          ipAddress: this.getCurrentIP(),
          userAgent: navigator.userAgent,
          user: {
            id: 'admin_user',
            name: 'System Administrator',
            email: this.adminCredentials.email,
            plan: 'business',
            status: 'active'
          }
        };

        // Store session
        localStorage.setItem('nebula_admin_session', JSON.stringify(session));
        sessionStorage.setItem('nebula_admin_token', sessionToken);

        // Log admin login
        this.logAdminActivity('LOGIN', { username, timestamp: Date.now() });

        return {
          success: true,
          session,
          message: 'Admin login successful'
        };
      } else {
        // Record failed login attempt
        this.recordFailedLogin(username);
        throw new Error('Invalid admin credentials');
      }
    } catch (error) {
      this.logAdminActivity('LOGIN_FAILED', { 
        username, 
        error: error.message, 
        timestamp: Date.now() 
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
      this.logAdminActivity('LOGOUT', { 
        username: session.username, 
        timestamp: Date.now() 
      });
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

  // Change admin password
  async changePassword(currentPassword, newPassword) {
    const session = this.getCurrentSession();
    if (!session) {
      throw new Error('Admin session required');
    }

    if (currentPassword !== this.adminCredentials.password) {
      throw new Error('Current password is incorrect');
    }

    if (newPassword.length < 8) {
      throw new Error('New password must be at least 8 characters');
    }

    // Update password (in production, this should update the database)
    this.adminCredentials.password = newPassword;

    this.logAdminActivity('PASSWORD_CHANGED', { 
      username: session.username, 
      timestamp: Date.now() 
    });

    return { success: true, message: 'Password changed successfully' };
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
const adminAuthService = new AdminAuthService();
export default adminAuthService;