/**
 * User Service - Manages user accounts and features
 * Free tier with valuable features to encourage signup
 */

class UserService {
  constructor() {
    this.STORAGE_KEY = 'nebula_users';
    this.SESSION_KEY = 'nebula_session';
    this.FEATURES_KEY = 'nebula_user_features';
  }

  // Free tier features that provide real value
  getFreeFeatures() {
    return {
      // Conversion limits
      maxFileSize: 500 * 1024 * 1024, // 500MB
      maxConversionsPerDay: 20,
      maxBatchConversions: 3,
      
      // History & Storage
      conversionHistoryDays: 30, // 30 days of history
      savedPresetsLimit: 5,
      cloudStorageDays: 7,
      
      // Quality options
      maxVideoResolution: '1080p',
      maxAudioBitrate: 320,
      formatSupport: 'all', // All formats supported
      
      // Advanced features
      advancedSettings: true,
      batchProcessing: true,
      presets: true,
      keyboardShortcuts: true,
      
      // Convenience features
      autoQualityDetection: true,
      smartFormatSuggestions: true,
      progressNotifications: true,
      offlineMode: true,
      pwaInstall: true,
      
      // Privacy & Security
      localProcessing: true,
      noWatermark: true,
      encryptedStorage: true,
      
      // Extras for signed-up users
      prioritySupport: false, // Email support with 48hr response
      customPresets: true,
      apiAccess: false,
      noAds: true, // No ads even on free tier
    };
  }

  // Guest (not signed up) limitations
  getGuestFeatures() {
    return {
      maxFileSize: 100 * 1024 * 1024, // 100MB
      maxConversionsPerDay: 5,
      maxBatchConversions: 1,
      conversionHistoryDays: 1, // Only today
      savedPresetsLimit: 0, // Can't save presets
      cloudStorageDays: 0, // No cloud storage
      maxVideoResolution: '720p',
      maxAudioBitrate: 192,
      formatSupport: 'basic', // Limited formats
      advancedSettings: false,
      batchProcessing: false,
      presets: false,
      keyboardShortcuts: false,
      autoQualityDetection: false,
      smartFormatSuggestions: false,
      progressNotifications: false,
      offlineMode: true, // PWA works for everyone
      pwaInstall: true,
      localProcessing: true,
      noWatermark: true,
      encryptedStorage: false,
      prioritySupport: false,
      customPresets: false,
      apiAccess: false,
      noAds: true,
    };
  }

  // Check if user is signed up
  isSignedUp() {
    const session = this.getSession();
    return session !== null && !this.isSessionExpired(session);
  }

  // Get current session
  getSession() {
    try {
      const session = localStorage.getItem(this.SESSION_KEY);
      return session ? JSON.parse(session) : null;
    } catch (error) {
      console.error('Error getting session:', error);
      return null;
    }
  }

  // Check if session is expired
  isSessionExpired(session) {
    if (!session || !session.expiresAt) return true;
    return new Date(session.expiresAt) < new Date();
  }

  // Get user features based on authentication status
  getUserFeatures() {
    if (this.isSignedUp()) {
      return this.getFreeFeatures();
    }
    return this.getGuestFeatures();
  }

  // Get user info
  getUserInfo() {
    const session = this.getSession();
    if (!session || this.isSessionExpired(session)) {
      return {
        type: 'guest',
        name: 'Guest User',
        email: null,
        features: this.getGuestFeatures()
      };
    }

    return {
      type: 'free',
      name: session.name || 'User',
      email: session.email,
      userId: session.userId,
      features: this.getFreeFeatures()
    };
  }

  // Track daily conversions
  canConvertToday() {
    const features = this.getUserFeatures();
    const today = new Date().toDateString();
    const conversions = this.getTodayConversions();
    
    return conversions.length < features.maxConversionsPerDay;
  }

  getTodayConversions() {
    const today = new Date().toDateString();
    const history = JSON.parse(localStorage.getItem('conversion_history') || '[]');
    return history.filter(item => {
      const itemDate = new Date(item.timestamp).toDateString();
      return itemDate === today;
    });
  }

  getRemainingConversions() {
    const features = this.getUserFeatures();
    const used = this.getTodayConversions().length;
    return Math.max(0, features.maxConversionsPerDay - used);
  }

  // Track file size limit
  canUploadFile(fileSize) {
    const features = this.getUserFeatures();
    return fileSize <= features.maxFileSize;
  }

  // Get file size limit in MB
  getFileSizeLimitMB() {
    const features = this.getUserFeatures();
    return Math.floor(features.maxFileSize / (1024 * 1024));
  }

  // Check if user can use advanced features
  canUseAdvancedSettings() {
    return this.getUserFeatures().advancedSettings;
  }

  canUseBatchProcessing() {
    return this.getUserFeatures().batchProcessing;
  }

  canSavePresets() {
    return this.getUserFeatures().savedPresetsLimit > 0;
  }

  // Saved presets management
  getSavedPresets() {
    const userInfo = this.getUserInfo();
    if (!userInfo.userId) return [];

    const allPresets = JSON.parse(localStorage.getItem('user_presets') || '{}');
    return allPresets[userInfo.userId] || [];
  }

  canSaveMorePresets() {
    const features = this.getUserFeatures();
    const current = this.getSavedPresets().length;
    return current < features.savedPresetsLimit;
  }

  // Benefits comparison for signup encouragement
  getSignupBenefits() {
    const guest = this.getGuestFeatures();
    const free = this.getFreeFeatures();

    return [
      {
        icon: '📊',
        title: 'More Daily Conversions',
        guest: `${guest.maxConversionsPerDay} per day`,
        free: `${free.maxConversionsPerDay} per day`,
        improvement: '4x more'
      },
      {
        icon: '📁',
        title: 'Larger File Support',
        guest: `${Math.floor(guest.maxFileSize / (1024 * 1024))}MB max`,
        free: `${Math.floor(free.maxFileSize / (1024 * 1024))}MB max`,
        improvement: '5x larger'
      },
      {
        icon: '🎬',
        title: 'Better Quality',
        guest: guest.maxVideoResolution,
        free: free.maxVideoResolution,
        improvement: 'Full HD'
      },
      {
        icon: '📜',
        title: 'Conversion History',
        guest: `${guest.conversionHistoryDays} day`,
        free: `${free.conversionHistoryDays} days`,
        improvement: '30 days'
      },
      {
        icon: '⚙️',
        title: 'Advanced Settings',
        guest: 'Not available',
        free: 'Full access',
        improvement: 'Unlocked'
      },
      {
        icon: '💾',
        title: 'Save Custom Presets',
        guest: 'Cannot save',
        free: `Save ${free.savedPresetsLimit} presets`,
        improvement: '5 presets'
      },
      {
        icon: '🚀',
        title: 'Batch Processing',
        guest: 'Not available',
        free: `${free.maxBatchConversions} files at once`,
        improvement: 'Enabled'
      },
      {
        icon: '☁️',
        title: 'Cloud Storage',
        guest: 'Not available',
        free: `${free.cloudStorageDays} days`,
        improvement: '7 days'
      },
      {
        icon: '🎨',
        title: 'All Formats',
        guest: 'Basic formats',
        free: 'All formats',
        improvement: '100+ formats'
      },
      {
        icon: '⌨️',
        title: 'Keyboard Shortcuts',
        guest: 'Not available',
        free: 'Full shortcuts',
        improvement: 'Unlocked'
      }
    ];
  }

  // Create account
  async createAccount(name, email, password) {
    try {
      // Get existing users
      const users = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '[]');

      // Check if user exists
      if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
        throw new Error('An account with this email already exists');
      }

      // Create new user
      const newUser = {
        id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        email: email.toLowerCase(),
        password: password, // In production, hash this!
        name: name.trim(),
        createdAt: new Date().toISOString(),
        lastLogin: null,
        isActive: true,
        plan: 'free',
        features: this.getFreeFeatures()
      };

      // Save user
      users.push(newUser);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(users));

      return { success: true, user: newUser };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Login
  async login(email, password) {
    try {
      const users = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '[]');
      const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

      if (!user || user.password !== password) {
        throw new Error('Invalid email or password');
      }

      if (!user.isActive) {
        throw new Error('Account deactivated');
      }

      // Update last login
      user.lastLogin = new Date().toISOString();
      const updatedUsers = users.map(u => u.email === user.email ? user : u);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedUsers));

      // Create session (30 days)
      const session = {
        userId: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        loginTime: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      };

      localStorage.setItem(this.SESSION_KEY, JSON.stringify(session));

      return { success: true, session };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Logout
  logout() {
    localStorage.removeItem(this.SESSION_KEY);
  }

  // Get usage stats for user dashboard
  getUsageStats() {
    const features = this.getUserFeatures();
    const todayConversions = this.getTodayConversions();
    const presets = this.getSavedPresets();

    return {
      conversionsToday: todayConversions.length,
      conversionsLimit: features.maxConversionsPerDay,
      conversionsRemaining: features.maxConversionsPerDay - todayConversions.length,
      conversionsPercentage: (todayConversions.length / features.maxConversionsPerDay) * 100,
      
      savedPresets: presets.length,
      presetsLimit: features.savedPresetsLimit,
      presetsRemaining: features.savedPresetsLimit - presets.length,
      presetsPercentage: (presets.length / features.savedPresetsLimit) * 100,
      
      maxFileSize: features.maxFileSize,
      maxFileSizeMB: Math.floor(features.maxFileSize / (1024 * 1024)),
      
      accountType: this.isSignedUp() ? 'Free Account' : 'Guest',
      features: features
    };
  }
}

export default new UserService();
