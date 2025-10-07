// Email Service for Nebula
import emailJSService from './EmailJSService';

class EmailService {
  constructor() {
    this.apiEndpoint = process.env.REACT_APP_EMAIL_API || 'https://api.nebula.com/email';
    this.emailProvider = process.env.REACT_APP_EMAIL_PROVIDER || 'emailjs'; // emailjs, sendgrid, mailgun, ses
    this.emailJSService = emailJSService;
    this.templates = {
      welcome: 'welcome-template',
      verification: 'email-verification',
      newsletter: 'newsletter-template',
      passwordReset: 'password-reset',
      subscription: 'subscription-confirmation',
      upgrade: 'plan-upgrade',
      downgrade: 'plan-downgrade',
      expiration: 'subscription-expiring',
      conversion: 'conversion-complete',
      maintenance: 'maintenance-notice'
    };
    
    // Email queue for batch processing
    this.emailQueue = [];
    this.maxBatchSize = 100;
    this.rateLimitDelay = 1000; // 1 second between batches
  }

  // Send single email
  async sendEmail(emailData) {
    try {
      // If EmailJS is configured, use it for real email sending
      if (this.emailProvider === 'emailjs' && this.emailJSService.isConfigured()) {
        return await this.sendViaEmailJS(emailData);
      }

      // Fallback to mock API for other providers
      const payload = {
        to: emailData.to,
        from: emailData.from || 'noreply@nebula.com',
        subject: emailData.subject,
        template: emailData.template,
        templateData: emailData.templateData || {},
        html: emailData.html,
        text: emailData.text,
        attachments: emailData.attachments || [],
        priority: emailData.priority || 'normal', // high, normal, low
        scheduledAt: emailData.scheduledAt,
        tags: emailData.tags || []
      };

      // In production, this would make an actual API call
      // For now, we'll simulate and log the email
      console.log('Sending email via mock API:', payload);
      
      const response = await this.mockEmailAPI(payload);
      
      // Log email activity
      this.logEmailActivity({
        action: 'EMAIL_SENT',
        to: emailData.to,
        subject: emailData.subject,
        template: emailData.template,
        status: response.success ? 'success' : 'failed',
        messageId: response.messageId,
        timestamp: Date.now()
      });

      return response;
    } catch (error) {
      console.error('Email sending failed:', error);
      this.logEmailActivity({
        action: 'EMAIL_FAILED',
        to: emailData.to,
        subject: emailData.subject,
        error: error.message,
        timestamp: Date.now()
      });
      throw error;
    }
  }

  // Send email via EmailJS
  async sendViaEmailJS(emailData) {
    try {
      let result;
      
      // Route to appropriate EmailJS method based on template
      switch (emailData.template) {
        case 'welcome':
        case this.templates.welcome:
          result = await this.emailJSService.sendWelcomeEmail(
            emailData.to,
            emailData.templateData?.userName || 'User'
          );
          break;
          
        case 'conversion':
        case this.templates.conversion:
          result = await this.emailJSService.sendConversionNotification(
            emailData.to,
            emailData.templateData?.fileName || 'file',
            emailData.templateData?.outputFormat || 'unknown'
          );
          break;
          
        case 'upgrade':
        case this.templates.upgrade:
          result = await this.emailJSService.sendUpgradeConfirmation(
            emailData.to,
            emailData.templateData?.planName || 'Premium',
            emailData.templateData?.features || []
          );
          break;
          
        case 'newsletter':
        case this.templates.newsletter:
          result = await this.emailJSService.sendNewsletter(
            emailData.to,
            emailData.subject,
            emailData.templateData?.content || emailData.text || emailData.html
          );
          break;
          
        default:
          // For custom emails, use the newsletter method with custom content
          result = await this.emailJSService.sendNewsletter(
            emailData.to,
            emailData.subject,
            emailData.text || emailData.html || 'Message sent from Nebula Media Converter'
          );
      }
      
      // Log the activity
      this.logEmailActivity({
        action: 'EMAIL_SENT_EMAILJS',
        to: emailData.to,
        subject: emailData.subject,
        template: emailData.template,
        status: result.success ? 'success' : 'failed',
        messageId: result.messageId,
        timestamp: Date.now(),
        provider: 'emailjs'
      });
      
      return {
        success: result.success,
        messageId: result.messageId,
        provider: 'emailjs',
        timestamp: result.timestamp
      };
      
    } catch (error) {
      console.error('EmailJS sending failed:', error);
      throw error;
    }
  }

  // Send verification email
  async sendVerificationEmail(userEmail, verificationToken, userName = '') {
    const verificationUrl = `${window.location.origin}/verify-email?token=${verificationToken}`;
    
    return await this.sendEmail({
      to: userEmail,
      subject: '🔐 Verify Your Nebula Account',
      template: this.templates.verification,
      templateData: {
        userName: userName || userEmail.split('@')[0],
        verificationUrl: verificationUrl,
        supportEmail: 'support@nebula.com'
      },
      html: this.generateVerificationHTML(userName || userEmail.split('@')[0], verificationUrl),
      priority: 'high',
      tags: ['verification', 'onboarding']
    });
  }

  // Send welcome email
  async sendWelcomeEmail(userEmail, userName = '', subscriptionPlan = 'free') {
    return await this.sendEmail({
      to: userEmail,
      subject: '🌟 Welcome to Nebula - Your Media Conversion Journey Begins!',
      template: this.templates.welcome,
      templateData: {
        userName: userName || userEmail.split('@')[0],
        subscriptionPlan: subscriptionPlan,
        dashboardUrl: `${window.location.origin}/dashboard`,
        supportEmail: 'support@nebula.com'
      },
      html: this.generateWelcomeHTML(userName || userEmail.split('@')[0], subscriptionPlan),
      tags: ['welcome', 'onboarding']
    });
  }

  // Send newsletter
  async sendNewsletter(newsletterData) {
    const { recipients, subject, content, template, scheduledAt } = newsletterData;
    
    // Add to queue for batch processing
    const emailPromises = recipients.map(recipient => ({
      to: recipient.email,
      subject: subject,
      template: template || this.templates.newsletter,
      templateData: {
        userName: recipient.name || recipient.email.split('@')[0],
        unsubscribeUrl: `${window.location.origin}/unsubscribe?email=${encodeURIComponent(recipient.email)}`,
        ...content
      },
      html: this.generateNewsletterHTML(content, recipient),
      scheduledAt: scheduledAt,
      tags: ['newsletter', 'marketing']
    }));

    return await this.sendBulkEmails(emailPromises);
  }

  // Send bulk emails with rate limiting
  async sendBulkEmails(emails) {
    const results = [];
    const batches = this.chunkArray(emails, this.maxBatchSize);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`Processing email batch ${i + 1}/${batches.length} (${batch.length} emails)`);

      const batchPromises = batch.map(email => this.sendEmail(email));
      const batchResults = await Promise.allSettled(batchPromises);
      
      results.push(...batchResults);

      // Rate limiting delay between batches
      if (i < batches.length - 1) {
        await this.delay(this.rateLimitDelay);
      }
    }

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`Bulk email complete: ${successful} sent, ${failed} failed`);
    
    return {
      total: emails.length,
      successful,
      failed,
      results
    };
  }

  // Send subscription-related emails
  async sendSubscriptionEmail(type, userEmail, subscriptionData) {
    const templates = {
      upgrade: {
        subject: '🎉 Subscription Upgraded - Welcome to Premium!',
        template: this.templates.upgrade
      },
      downgrade: {
        subject: '📋 Subscription Updated',
        template: this.templates.downgrade
      },
      expiration: {
        subject: '⚠️ Your Subscription is Expiring Soon',
        template: this.templates.expiration
      },
      confirmation: {
        subject: '✅ Subscription Confirmed',
        template: this.templates.subscription
      }
    };

    const emailConfig = templates[type];
    if (!emailConfig) {
      throw new Error(`Unknown subscription email type: ${type}`);
    }

    return await this.sendEmail({
      to: userEmail,
      subject: emailConfig.subject,
      template: emailConfig.template,
      templateData: {
        userName: subscriptionData.userName || userEmail.split('@')[0],
        planName: subscriptionData.planName,
        expirationDate: subscriptionData.expirationDate,
        features: subscriptionData.features || [],
        billingAmount: subscriptionData.billingAmount,
        dashboardUrl: `${window.location.origin}/dashboard`
      },
      html: this.generateSubscriptionHTML(type, subscriptionData),
      priority: type === 'expiration' ? 'high' : 'normal',
      tags: ['subscription', type]
    });
  }

  // Mock email API (replace with actual provider in production)
  async mockEmailAPI(payload) {
    // Simulate API delay
    await this.delay(Math.random() * 500 + 200);

    // Simulate 95% success rate
    const success = Math.random() > 0.05;
    
    if (success) {
      return {
        success: true,
        messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        status: 'sent',
        timestamp: Date.now()
      };
    } else {
      throw new Error('Email delivery failed - simulated error');
    }
  }

  // Email template generators
  generateVerificationHTML(userName, verificationUrl) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;">
          <h1>🌟 Verify Your Nebula Account</h1>
        </div>
        <div style="padding: 30px; background: #f9f9f9;">
          <h2>Hi ${userName}!</h2>
          <p>Welcome to Nebula! Please verify your email address to complete your registration.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Verify Email Address
            </a>
          </div>
          <p>If the button doesn't work, copy and paste this link:</p>
          <p style="word-break: break-all; color: #667eea;">${verificationUrl}</p>
          <p>This link will expire in 24 hours.</p>
        </div>
        <div style="padding: 20px; text-align: center; color: #666; font-size: 12px;">
          <p>© 2025 Nebula Media Converter. All rights reserved.</p>
        </div>
      </div>
    `;
  }

  generateWelcomeHTML(userName, subscriptionPlan) {
    const isPremium = subscriptionPlan !== 'free';
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;">
          <h1>🌟 Welcome to Nebula!</h1>
          <p>Your media conversion journey begins now</p>
        </div>
        <div style="padding: 30px; background: #f9f9f9;">
          <h2>Hi ${userName}!</h2>
          <p>Thank you for joining Nebula! You're now part of our community of creative professionals.</p>
          
          ${isPremium ? `
            <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>✨ Premium Features Activated</h3>
              <p>You now have access to all premium features including:</p>
              <ul>
                <li>Unlimited conversions</li>
                <li>Advanced settings</li>
                <li>Priority support</li>
                <li>Batch processing</li>
              </ul>
            </div>
          ` : `
            <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>🚀 Ready to Get Started?</h3>
              <p>You're on the free plan with access to basic conversion features.</p>
              <p>Upgrade anytime to unlock premium features!</p>
            </div>
          `}
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${window.location.origin}" style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Start Converting
            </a>
          </div>
        </div>
        <div style="padding: 20px; text-align: center; color: #666; font-size: 12px;">
          <p>© 2025 Nebula Media Converter. All rights reserved.</p>
        </div>
      </div>
    `;
  }

  generateNewsletterHTML(content, recipient) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;">
          <h1>📧 ${content.title}</h1>
        </div>
        <div style="padding: 30px; background: #f9f9f9;">
          <h2>Hi ${recipient.name || recipient.email.split('@')[0]}!</h2>
          <div>${content.body}</div>
        </div>
        <div style="padding: 20px; text-align: center; color: #666; font-size: 12px;">
          <p>© 2025 Nebula Media Converter. All rights reserved.</p>
          <p><a href="${recipient.unsubscribeUrl}" style="color: #666;">Unsubscribe</a></p>
        </div>
      </div>
    `;
  }

  generateSubscriptionHTML(type, data) {
    // Implementation for subscription email templates
    return `<div>Subscription ${type} email for ${data.planName}</div>`;
  }

  // Utility functions
  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Email activity logging
  logEmailActivity(activity) {
    const logs = JSON.parse(localStorage.getItem('nebula_email_logs') || '[]');
    logs.unshift({
      id: `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...activity
    });

    // Keep only last 1000 entries
    if (logs.length > 1000) {
      logs.splice(1000);
    }

    localStorage.setItem('nebula_email_logs', JSON.stringify(logs));
  }

  // Get email statistics
  getEmailStats(days = 30) {
    const logs = JSON.parse(localStorage.getItem('nebula_email_logs') || '[]');
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
    const recentLogs = logs.filter(log => log.timestamp > cutoff);

    const stats = {
      total: recentLogs.length,
      sent: recentLogs.filter(log => log.action === 'EMAIL_SENT' && log.status === 'success').length,
      failed: recentLogs.filter(log => log.action === 'EMAIL_FAILED').length,
      byTemplate: {},
      byDay: {}
    };

    recentLogs.forEach(log => {
      // Count by template
      if (log.template) {
        stats.byTemplate[log.template] = (stats.byTemplate[log.template] || 0) + 1;
      }

      // Count by day
      const day = new Date(log.timestamp).toDateString();
      stats.byDay[day] = (stats.byDay[day] || 0) + 1;
    });

    return stats;
  }

  // Get email logs
  getEmailLogs(limit = 100) {
    const logs = JSON.parse(localStorage.getItem('nebula_email_logs') || '[]');
    return logs.slice(0, limit);
  }
}

// Create and export singleton instance
const emailService = new EmailService();
export default emailService;