// Secure Storage Service - encrypts sensitive data before storing
class SecureStorage {
  constructor() {
    this.encryptionKey = this.getOrCreateKey();
  }
  
  // Generate or retrieve encryption key
  getOrCreateKey() {
    let key = sessionStorage.getItem('nebula_key');
    if (!key) {
      key = this.generateKey();
      sessionStorage.setItem('nebula_key', key);
    }
    return key;
  }
  
  // Simple encryption (in production, use proper crypto libraries)
  encrypt(data) {
    try {
      const jsonString = JSON.stringify(data);
      // Simple XOR encryption (for demonstration - use proper crypto in production)
      let encrypted = '';
      for (let i = 0; i < jsonString.length; i++) {
        encrypted += String.fromCharCode(
          jsonString.charCodeAt(i) ^ this.encryptionKey.charCodeAt(i % this.encryptionKey.length)
        );
      }
      return btoa(encrypted); // Base64 encode
    } catch (error) {
      console.error('Encryption failed:', error);
      return null;
    }
  }
  
  // Simple decryption
  decrypt(encryptedData) {
    try {
      const encrypted = atob(encryptedData); // Base64 decode
      let decrypted = '';
      for (let i = 0; i < encrypted.length; i++) {
        decrypted += String.fromCharCode(
          encrypted.charCodeAt(i) ^ this.encryptionKey.charCodeAt(i % this.encryptionKey.length)
        );
      }
      return JSON.parse(decrypted);
    } catch (error) {
      console.error('Decryption failed:', error);
      return null;
    }
  }
  
  // Generate a simple key (in production, use proper key derivation)
  generateKey() {
    return Math.random().toString(36).substr(2, 16) + Date.now().toString(36);
  }
  
  // Secure storage methods
  setItem(key, value, options = {}) {
    try {
      const item = {
        value: value,
        timestamp: Date.now(),
        expires: options.expires || null,
        encrypted: options.encrypt || false
      };
      
      const dataToStore = options.encrypt ? this.encrypt(item) : JSON.stringify(item);
      
      if (options.session) {
        sessionStorage.setItem(`nebula_${key}`, dataToStore);
      } else {
        localStorage.setItem(`nebula_${key}`, dataToStore);
      }
      
      return true;
    } catch (error) {
      console.error('Storage failed:', error);
      return false;
    }
  }
  
  getItem(key, options = {}) {
    try {
      const storageKey = `nebula_${key}`;
      const rawData = options.session 
        ? sessionStorage.getItem(storageKey)
        : localStorage.getItem(storageKey);
        
      if (!rawData) return null;
      
      let item;
      if (options.encrypted) {
        item = this.decrypt(rawData);
      } else {
        item = JSON.parse(rawData);
      }
      
      if (!item) return null;
      
      // Check expiration
      if (item.expires && Date.now() > item.expires) {
        this.removeItem(key, options);
        return null;
      }
      
      return item.value;
    } catch (error) {
      console.error('Storage retrieval failed:', error);
      return null;
    }
  }
  
  removeItem(key, options = {}) {
    const storageKey = `nebula_${key}`;
    if (options.session) {
      sessionStorage.removeItem(storageKey);
    } else {
      localStorage.removeItem(storageKey);
    }
  }
  
  // Clear all nebula data
  clearAll() {
    // Clear localStorage
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('nebula_')) {
        localStorage.removeItem(key);
      }
    });
    
    // Clear sessionStorage
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith('nebula_')) {
        sessionStorage.removeItem(key);
      }
    });
  }
  
  // Secure admin session storage
  setAdminSession(sessionData) {
    return this.setItem('admin_session', sessionData, {
      encrypt: true,
      session: true,
      expires: Date.now() + (30 * 60 * 1000) // 30 minutes
    });
  }
  
  getAdminSession() {
    return this.getItem('admin_session', {
      encrypted: true,
      session: true
    });
  }
  
  clearAdminSession() {
    this.removeItem('admin_session', { session: true });
  }
}

// Export singleton instance
const secureStorage = new SecureStorage();
export default secureStorage;