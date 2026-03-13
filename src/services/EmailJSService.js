import emailjs from '@emailjs/browser';

// EmailJS Integration Service
class EmailJSService {
  constructor() {
    this.serviceId = process.env.REACT_APP_EMAILJS_SERVICE_ID;
    this.templateId = process.env.REACT_APP_EMAILJS_TEMPLATE_ID;
    this.publicKey = process.env.REACT_APP_EMAILJS_PUBLIC_KEY;
    this.isInitialized = false;
    this.emailHistory = [];
    
    this.init();
  }

  // Initialize EmailJS
  init() {
    try {
      if (this.publicKey) {
        emailjs.init(this.publicKey);
        this.isInitialized = true;
        console.log('EmailJS initialized successfully');
      } else {
        console.warn('EmailJS not configured - missing environment variables');
      }
    } catch (error) {
      console.error('EmailJS initialization failed:', error);
    }
  }

  // Check if EmailJS is properly configured
  isConfigured() {
    return this.isInitialized && this.serviceId && this.templateId && this.publicKey;
  }

  // Send welcome email to new users
  async sendWelcomeEmail(userEmail, userName = 'User') {
    if (!this.isConfigured()) {
      console.warn('EmailJS not configured, skipping welcome email');
      return { success: false, error: 'EmailJS not configured' };
    }

    try {
      const templateParams = {
        to_email: userEmail,
        to_name: userName,
        from_name: process.env.REACT_APP_APP_NAME || 'Nebula Media Converter',
        subject: `Welcome to ${process.env.REACT_APP_APP_NAME || 'Nebula Media Converter'}! 🌟`,
        message: `Hello ${userName}!

Welcome to ${process.env.REACT_APP_APP_NAME || 'Nebula Media Converter'} - your new favorite tool for converting media files!

🎥 Features you can enjoy:
• Convert videos, audio, and images
• Multiple format support (MP4, MP3, PNG, JPEG, and more)
• Fast client-side processing
• No file uploads to servers (your privacy is protected)

🚀 Getting Started:
1. Simply drag and drop your file or click to browse
2. Choose your desired output format
3. Click convert and watch the magic happen!
4. Download your converted file instantly

💎 Premium Features Available:
• Unlimited file sizes
• Batch processing
• Priority support
• Advanced conversion settings

Need help? Just reply to this email and we'll be happy to assist!

Best regards,
The Nebula Team
${process.env.REACT_APP_DEVELOPER_NAME || 'Colin Nebula'} - ${process.env.REACT_APP_COMPANY_NAME || 'Nebula3D Dev Company'}

---
Visit us: ${process.env.REACT_APP_APP_URL || 'https://colinnebula.github.io/nebula-media-converter/'}
Support: ${process.env.REACT_APP_SUPPORT_EMAIL || 'admin@nebuladev.com'}`,
        app_name: process.env.REACT_APP_APP_NAME || 'Nebula Media Converter',
        company_name: process.env.REACT_APP_COMPANY_NAME || 'Nebula3D Dev Company',
        support_email: process.env.REACT_APP_SUPPORT_EMAIL || 'admin@nebuladev.com',
        app_url: process.env.REACT_APP_APP_URL || 'https://colinnebula.github.io/nebula-media-converter/'
      };

      const result = await emailjs.send(
        this.serviceId,
        this.templateId,
        templateParams
      );

      this.logEmail('welcome', userEmail, 'success', result);
      
      return {
        success: true,
        messageId: result.text,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Welcome email failed:', error);
      this.logEmail('welcome', userEmail, 'failed', error);
      
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Send conversion completion notification
  async sendConversionNotification(userEmail, fileName, outputFormat) {
    if (!this.isConfigured()) {
      return { success: false, error: 'EmailJS not configured' };
    }

    try {
      const templateParams = {
        to_email: userEmail,
        to_name: 'User',
        from_name: process.env.REACT_APP_APP_NAME || 'Nebula Media Converter',
        subject: '✅ Your file conversion is complete!',
        message: `Great news! Your file conversion is ready.

📁 File Details:
• Original File: ${fileName}
• Converted To: ${outputFormat.toUpperCase()}
• Conversion Time: ${new Date().toLocaleString()}

🎉 Your converted file should have downloaded automatically. If not, please return to the app and download it from the results page.

Thanks for using ${process.env.REACT_APP_APP_NAME || 'Nebula Media Converter'}!

Best regards,
The Nebula Team`,
        file_name: fileName,
        output_format: outputFormat,
        conversion_time: new Date().toLocaleString(),
        app_url: process.env.REACT_APP_APP_URL || 'https://colinnebula.github.io/nebula-media-converter/'
      };

      const result = await emailjs.send(
        this.serviceId,
        this.templateId,
        templateParams
      );

      this.logEmail('conversion', userEmail, 'success', result);
      
      return {
        success: true,
        messageId: result.text,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Conversion notification failed:', error);
      this.logEmail('conversion', userEmail, 'failed', error);
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Send newsletter/marketing email
  async sendNewsletter(userEmail, subject, content) {
    if (!this.isConfigured()) {
      return { success: false, error: 'EmailJS not configured' };
    }

    try {
      const templateParams = {
        to_email: userEmail,
        to_name: 'Valued User',
        from_name: process.env.REACT_APP_APP_NAME || 'Nebula Media Converter',
        subject: subject,
        message: content,
        app_name: process.env.REACT_APP_APP_NAME || 'Nebula Media Converter',
        unsubscribe_url: process.env.REACT_APP_APP_URL || 'https://colinnebula.github.io/nebula-media-converter/',
        app_url: process.env.REACT_APP_APP_URL || 'https://colinnebula.github.io/nebula-media-converter/'
      };

      const result = await emailjs.send(
        this.serviceId,
        this.templateId,
        templateParams
      );

      this.logEmail('newsletter', userEmail, 'success', result);
      
      return {
        success: true,
        messageId: result.text,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Newsletter send failed:', error);
      this.logEmail('newsletter', userEmail, 'failed', error);
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Send contact form submission
  async sendContactMessage(fromEmail, fromName, subject, message) {
    if (!this.isConfigured()) {
      return { success: false, error: 'EmailJS not configured' };
    }

    try {
      const templateParams = {
        to_email: process.env.REACT_APP_SUPPORT_EMAIL || 'admin@nebuladev.com',
        to_name: 'Admin',
        from_name: fromName,
        from_email: fromEmail,
        subject: `Contact Form: ${subject}`,
        message: `New contact form submission:

From: ${fromName} (${fromEmail})
Subject: ${subject}

Message:
${message}

---
Sent from Nebula Media Converter Contact Form
${new Date().toLocaleString()}`,
        reply_to: fromEmail,
        app_url: 'https://colinnebula.github.io/nebula-media-converter/'
      };

      const result = await emailjs.send(
        this.serviceId,
        this.templateId,
        templateParams
      );

      this.logEmail('contact', fromEmail, 'success', result);
      
      return {
        success: true,
        messageId: result.text,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Contact message failed:', error);
      this.logEmail('contact', fromEmail, 'failed', error);
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Send premium upgrade confirmation
  async sendUpgradeConfirmation(userEmail, planName, features) {
    if (!this.isConfigured()) {
      return { success: false, error: 'EmailJS not configured' };
    }

    try {
      const featureList = features.map(f => `• ${f}`).join('\n');
      
      const templateParams = {
        to_email: userEmail,
        to_name: 'Premium User',
        from_name: 'Nebula Media Converter',
        subject: `🎉 Welcome to ${planName} - Premium Access Activated!`,
        message: `Congratulations! Your premium upgrade is now active.

💎 Your ${planName} Plan Includes:
${featureList}

🚀 You can now enjoy:
• Unlimited file conversions
• Larger file size limits
• Priority processing speed
• Advanced conversion settings
• Premium customer support

Thank you for upgrading to premium! We're excited to provide you with the best media conversion experience.

If you have any questions, don't hesitate to reach out.

Best regards,
Colin Nebula
Nebula3D Dev Company`,
        plan_name: planName,
        features: featureList,
        app_url: 'https://colinnebula.github.io/nebula-media-converter/'
      };

      const result = await emailjs.send(
        this.serviceId,
        this.templateId,
        templateParams
      );

      this.logEmail('upgrade', userEmail, 'success', result);
      
      return {
        success: true,
        messageId: result.text,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Upgrade confirmation failed:', error);
      this.logEmail('upgrade', userEmail, 'failed', error);
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Log email activity
  logEmail(type, recipient, status, details) {
    const logEntry = {
      id: Date.now().toString(),
      type,
      recipient,
      status,
      timestamp: new Date().toISOString(),
      details: status === 'success' ? details.text : details.message
    };

    this.emailHistory.push(logEntry);
    
    // Keep only last 100 entries
    if (this.emailHistory.length > 100) {
      this.emailHistory = this.emailHistory.slice(-100);
    }

    // Store in localStorage for admin viewing
    localStorage.setItem('nebula_emailjs_history', JSON.stringify(this.emailHistory));
  }

  // Get email sending statistics
  getEmailStats() {
    const stats = {
      total: this.emailHistory.length,
      successful: this.emailHistory.filter(e => e.status === 'success').length,
      failed: this.emailHistory.filter(e => e.status === 'failed').length,
      byType: {}
    };

    // Count by type
    this.emailHistory.forEach(entry => {
      if (!stats.byType[entry.type]) {
        stats.byType[entry.type] = { total: 0, successful: 0, failed: 0 };
      }
      stats.byType[entry.type].total++;
      stats.byType[entry.type][entry.status]++;
    });

    return stats;
  }

  // Get recent email history for admin
  getEmailHistory(limit = 20) {
    return this.emailHistory
      .slice(-limit)
      .reverse()
      .map(entry => ({
        ...entry,
        timestamp: new Date(entry.timestamp).toLocaleString()
      }));
  }

  // Test EmailJS connection
  async testConnection() {
    if (!this.isConfigured()) {
      return { success: false, error: 'EmailJS not configured' };
    }

    try {
      const testParams = {
        to_email: process.env.REACT_APP_SUPPORT_EMAIL || 'admin@nebuladev.com',
        to_name: 'Admin',
        from_name: 'Nebula Media Converter Test',
        subject: 'EmailJS Connection Test',
        message: `This is a test email to verify EmailJS is working correctly.

Configuration:
• Service ID: ${this.serviceId}
• Template ID: ${this.templateId}
• Public Key: ${this.publicKey.substring(0, 8)}...

Sent at: ${new Date().toLocaleString()}

If you received this email, EmailJS is working perfectly! 🎉`,
        test: true
      };

      const result = await emailjs.send(
        this.serviceId,
        this.templateId,
        testParams
      );

      return {
        success: true,
        messageId: result.text,
        message: 'Test email sent successfully!'
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Test email failed to send'
      };
    }
  }
}

// Export singleton instance
const emailJSService = new EmailJSService();
export default emailJSService;