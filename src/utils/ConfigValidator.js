// Environment Configuration Validator
class ConfigValidator {
  constructor() {
    this.requiredVars = [
      'REACT_APP_ADMIN_USERNAME',
      'REACT_APP_ADMIN_PASSWORD', 
      'REACT_APP_ADMIN_EMAIL'
    ];
    
    this.recommendedVars = [
      'REACT_APP_COMPANY_NAME',
      'REACT_APP_APP_NAME',
      'REACT_APP_APP_URL',
      'REACT_APP_SUPPORT_EMAIL',
      'REACT_APP_EMAILJS_SERVICE_ID',
      'REACT_APP_EMAILJS_TEMPLATE_ID',
      'REACT_APP_EMAILJS_PUBLIC_KEY',
      'REACT_APP_PAYPAL_CLIENT_ID',
      'REACT_APP_STRIPE_PUBLISHABLE_KEY'
    ];
    
    this.optionalVars = [
      'REACT_APP_API_BASE_URL',
      'REACT_APP_EMAIL_SERVICE_URL',
      'REACT_APP_PAYMENT_API',
      'REACT_APP_CDN_URL',
      'REACT_APP_ANALYTICS_ID',
      'REACT_APP_ERROR_REPORTING_KEY'
    ];
  }

  // Validate all environment variables
  validateConfig() {
    const results = {
      isValid: true,
      missing: [],
      warnings: [],
      configured: [],
      security: []
    };

    // Check required variables
    this.requiredVars.forEach(varName => {
      const value = process.env[varName];
      if (!value || value.trim() === '') {
        results.missing.push(varName);
        results.isValid = false;
      } else {
        results.configured.push(varName);
        
        // Check for default/insecure values
        if (this.isDefaultValue(varName, value)) {
          results.security.push({
            var: varName,
            issue: 'Using default/example value',
            severity: 'high'
          });
        }
      }
    });

    // Check recommended variables
    this.recommendedVars.forEach(varName => {
      const value = process.env[varName];
      if (!value || value.trim() === '') {
        results.warnings.push(varName);
      } else {
        results.configured.push(varName);
        
        if (this.isDefaultValue(varName, value)) {
          results.security.push({
            var: varName,
            issue: 'Using default/example value',
            severity: 'medium'
          });
        }
      }
    });

    // Check optional variables
    this.optionalVars.forEach(varName => {
      const value = process.env[varName];
      if (value && value.trim() !== '') {
        results.configured.push(varName);
      }
    });

    return results;
  }

  // Check if a value is a default/example value
  isDefaultValue(varName, value) {
    const defaultPatterns = [
      /your_/i,
      /example/i,
      /demo_/i,
      /test_/i,
      /pk_test_/i,
      /nebula2025!/i,
      /admin@nebula\.com/i,
      /yourdomain\.com/i,
      /localhost/i,
      /127\.0\.0\.1/i
    ];

    return defaultPatterns.some(pattern => pattern.test(value));
  }

  // Get configuration summary
  getConfigSummary() {
    const validation = this.validateConfig();
    
    return {
      totalVars: this.requiredVars.length + this.recommendedVars.length + this.optionalVars.length,
      configuredCount: validation.configured.length,
      missingRequired: validation.missing.length,
      missingRecommended: validation.warnings.length,
      securityIssues: validation.security.length,
      isProductionReady: validation.isValid && validation.security.length === 0,
      completionPercentage: Math.round((validation.configured.length / (this.requiredVars.length + this.recommendedVars.length)) * 100)
    };
  }

  // Log configuration status to console
  logConfigStatus() {
    const validation = this.validateConfig();
    const summary = this.getConfigSummary();
    
    console.group('🔧 Environment Configuration Status');
    
    if (validation.isValid) {
      console.log('✅ All required variables are configured');
    } else {
      console.error('❌ Missing required environment variables:');
      validation.missing.forEach(varName => {
        console.error(`  - ${varName}`);
      });
    }
    
    if (validation.warnings.length > 0) {
      console.warn('⚠️ Missing recommended variables:');
      validation.warnings.forEach(varName => {
        console.warn(`  - ${varName}`);
      });
    }
    
    if (validation.security.length > 0) {
      console.warn('🔐 Security warnings:');
      validation.security.forEach(issue => {
        const emoji = issue.severity === 'high' ? '🚨' : '⚠️';
        console.warn(`  ${emoji} ${issue.var}: ${issue.issue}`);
      });
    }
    
    console.log(`📊 Configuration: ${summary.configuredCount}/${summary.totalVars} variables set (${summary.completionPercentage}%)`);
    console.log(`🛡️ Production ready: ${summary.isProductionReady ? 'Yes' : 'No'}`);
    
    console.groupEnd();
    
    return validation;
  }

  // Get environment-specific configuration
  getEnvConfig() {
    return {
      // App Information
      appName: process.env.REACT_APP_APP_NAME || 'Nebula Media Converter',
      companyName: process.env.REACT_APP_COMPANY_NAME || 'Nebula3D Dev Company',
      developerName: process.env.REACT_APP_DEVELOPER_NAME || 'Colin Nebula',
      appUrl: process.env.REACT_APP_APP_URL || 'https://colinnebula.github.io/nebula-media-converter/',
      supportEmail: process.env.REACT_APP_SUPPORT_EMAIL || process.env.REACT_APP_ADMIN_EMAIL || 'admin@nebuladev.com',
      
      // API Endpoints
      apiBaseUrl: process.env.REACT_APP_API_BASE_URL || 'https://api.nebuladev.com',
      emailServiceUrl: process.env.REACT_APP_EMAIL_SERVICE_URL || 'https://email.nebuladev.com',
      paymentApiUrl: process.env.REACT_APP_PAYMENT_API || 'https://payments.nebuladev.com',
      cdnUrl: process.env.REACT_APP_CDN_URL || 'https://cdn.nebuladev.com',
      
      // Admin Configuration
      adminUsername: process.env.REACT_APP_ADMIN_USERNAME,
      adminEmail: process.env.REACT_APP_ADMIN_EMAIL,
      
      // EmailJS Configuration
      emailJS: {
        serviceId: process.env.REACT_APP_EMAILJS_SERVICE_ID,
        templateId: process.env.REACT_APP_EMAILJS_TEMPLATE_ID,
        publicKey: process.env.REACT_APP_EMAILJS_PUBLIC_KEY,
        isConfigured: !!(process.env.REACT_APP_EMAILJS_SERVICE_ID && 
                        process.env.REACT_APP_EMAILJS_TEMPLATE_ID && 
                        process.env.REACT_APP_EMAILJS_PUBLIC_KEY)
      },
      
      // Payment Configuration
      payments: {
        paypalClientId: process.env.REACT_APP_PAYPAL_CLIENT_ID,
        stripePublishableKey: process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY,
        isConfigured: !!(process.env.REACT_APP_PAYPAL_CLIENT_ID || process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY)
      },
      
      // Feature Flags
      features: {
        premiumEnabled: process.env.REACT_APP_ENABLE_PREMIUM_FEATURES !== 'false',
        emailMarketingEnabled: process.env.REACT_APP_ENABLE_EMAIL_MARKETING !== 'false',
        adminPanelEnabled: process.env.REACT_APP_ENABLE_ADMIN_PANEL !== 'false'
      },
      
      // Development/Production
      isDevelopment: process.env.NODE_ENV === 'development',
      isProduction: process.env.NODE_ENV === 'production'
    };
  }
}

// Export singleton instance
const configValidator = new ConfigValidator();
export default configValidator;