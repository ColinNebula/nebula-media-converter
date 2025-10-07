// Payment Service for Nebula
class PaymentService {
  constructor() {
    this.apiEndpoint = process.env.REACT_APP_PAYMENT_API || process.env.REACT_APP_API_BASE_URL + '/payments' || 'https://api.nebula.com/payments';
    this.paypalClientId = process.env.REACT_APP_PAYPAL_CLIENT_ID || 'demo_paypal_client_id';
    this.stripePublishableKey = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || 'pk_test_demo_key';
    
    // Payment plans configuration
    this.plans = {
      free: {
        id: 'free',
        name: 'Free',
        price: 0,
        currency: 'USD',
        interval: 'month',
        features: [
          'Basic file conversion',
          '500MB file size limit',
          '10 conversions per month',
          'Standard formats only',
          'Community support'
        ],
        limits: {
          fileSize: 500 * 1024 * 1024, // 500MB
          conversionsPerMonth: 10,
          storageLimit: 1024 * 1024 * 1024, // 1GB
          retentionDays: 7
        }
      },
      pro: {
        id: 'pro',
        name: 'Pro',
        price: 9.99,
        currency: 'USD',
        interval: 'month',
        paypalPlanId: 'P-demo-pro-monthly',
        stripePriceId: 'price_demo_pro_monthly',
        features: [
          'All file conversion formats',
          '2GB file size limit',
          'Unlimited conversions',
          'Batch processing',
          'Priority support',
          'Advanced settings',
          'Cloud storage (10GB)'
        ],
        limits: {
          fileSize: 2 * 1024 * 1024 * 1024, // 2GB
          conversionsPerMonth: -1, // unlimited
          storageLimit: 10 * 1024 * 1024 * 1024, // 10GB
          retentionDays: 30
        }
      },
      business: {
        id: 'business',
        name: 'Business',
        price: 29.99,
        currency: 'USD',
        interval: 'month',
        paypalPlanId: 'P-demo-business-monthly',
        stripePriceId: 'price_demo_business_monthly',
        features: [
          'Everything in Pro',
          '10GB file size limit',
          'API access',
          'Custom branding',
          'Team collaboration',
          'Analytics dashboard',
          'Cloud storage (100GB)',
          'Priority email support'
        ],
        limits: {
          fileSize: 10 * 1024 * 1024 * 1024, // 10GB
          conversionsPerMonth: -1, // unlimited
          storageLimit: 100 * 1024 * 1024 * 1024, // 100GB
          retentionDays: 90
        }
      }
    };

    this.paymentMethods = ['paypal', 'stripe'];
    this.supportedCurrencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD'];
  }

  // Initialize payment providers
  async initializePaymentProviders() {
    try {
      // Initialize PayPal SDK
      if (window.paypal) {
        console.log('PayPal SDK already loaded');
      } else {
        await this.loadPayPalSDK();
      }

      // Initialize Stripe
      if (window.Stripe) {
        this.stripe = window.Stripe(this.stripePublishableKey);
        console.log('Stripe initialized');
      } else {
        await this.loadStripeSDK();
        this.stripe = window.Stripe(this.stripePublishableKey);
      }

      return { success: true, message: 'Payment providers initialized' };
    } catch (error) {
      console.error('Failed to initialize payment providers:', error);
      return { success: false, error: error.message };
    }
  }

  // Load PayPal SDK
  async loadPayPalSDK() {
    return new Promise((resolve, reject) => {
      if (window.paypal) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = `https://www.paypal.com/sdk/js?client-id=${this.paypalClientId}&vault=true&intent=subscription`;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  // Load Stripe SDK
  async loadStripeSDK() {
    return new Promise((resolve, reject) => {
      if (window.Stripe) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://js.stripe.com/v3/';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  // Create PayPal subscription
  async createPayPalSubscription(planId, customerInfo) {
    try {
      const plan = this.plans[planId];
      if (!plan) {
        throw new Error('Invalid plan selected');
      }

      const orderData = {
        plan_id: plan.paypalPlanId,
        application_context: {
          brand_name: 'Nebula Media Converter',
          locale: 'en-US',
          shipping_preference: 'NO_SHIPPING',
          user_action: 'SUBSCRIBE_NOW',
          return_url: `${window.location.origin}/payment/success`,
          cancel_url: `${window.location.origin}/payment/cancel`
        },
        subscriber: {
          name: {
            given_name: customerInfo.firstName,
            surname: customerInfo.lastName
          },
          email_address: customerInfo.email
        }
      };

      // In production, this would call PayPal API
      const response = await this.mockPayPalAPI('create_subscription', orderData);
      
      this.logPaymentActivity({
        action: 'PAYPAL_SUBSCRIPTION_CREATED',
        planId: planId,
        amount: plan.price,
        currency: plan.currency,
        customerEmail: customerInfo.email,
        subscriptionId: response.subscriptionId,
        timestamp: Date.now()
      });

      return response;
    } catch (error) {
      console.error('PayPal subscription creation failed:', error);
      this.logPaymentActivity({
        action: 'PAYPAL_SUBSCRIPTION_FAILED',
        planId: planId,
        error: error.message,
        timestamp: Date.now()
      });
      throw error;
    }
  }

  // Create Stripe payment
  async createStripePayment(planId, customerInfo, paymentMethodId) {
    try {
      const plan = this.plans[planId];
      if (!plan) {
        throw new Error('Invalid plan selected');
      }

      const paymentData = {
        price_id: plan.stripePriceId,
        customer_email: customerInfo.email,
        customer_name: `${customerInfo.firstName} ${customerInfo.lastName}`,
        payment_method_id: paymentMethodId,
        success_url: `${window.location.origin}/payment/success`,
        cancel_url: `${window.location.origin}/payment/cancel`
      };

      // In production, this would call Stripe API
      const response = await this.mockStripeAPI('create_checkout_session', paymentData);
      
      this.logPaymentActivity({
        action: 'STRIPE_PAYMENT_CREATED',
        planId: planId,
        amount: plan.price,
        currency: plan.currency,
        customerEmail: customerInfo.email,
        sessionId: response.sessionId,
        timestamp: Date.now()
      });

      return response;
    } catch (error) {
      console.error('Stripe payment creation failed:', error);
      this.logPaymentActivity({
        action: 'STRIPE_PAYMENT_FAILED',
        planId: planId,
        error: error.message,
        timestamp: Date.now()
      });
      throw error;
    }
  }

  // Process one-time payment
  async processOneTimePayment(planId, customerInfo, paymentMethod, paymentData) {
    try {
      const plan = this.plans[planId];
      if (!plan) {
        throw new Error('Invalid plan selected');
      }

      let response;
      if (paymentMethod === 'paypal') {
        response = await this.processPayPalOneTime(plan, customerInfo, paymentData);
      } else if (paymentMethod === 'stripe') {
        response = await this.processStripeOneTime(plan, customerInfo, paymentData);
      } else {
        throw new Error('Unsupported payment method');
      }

      // Create subscription record
      const subscription = await this.createSubscriptionRecord({
        planId: planId,
        customerInfo: customerInfo,
        paymentMethod: paymentMethod,
        transactionId: response.transactionId,
        subscriptionType: 'one_time',
        expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000) // 30 days
      });

      return {
        success: true,
        subscription: subscription,
        transactionId: response.transactionId,
        message: 'Payment processed successfully'
      };
    } catch (error) {
      console.error('One-time payment failed:', error);
      throw error;
    }
  }

  // Create subscription record
  async createSubscriptionRecord(subscriptionData) {
    const subscription = {
      id: this.generateId('sub_'),
      planId: subscriptionData.planId,
      plan: this.plans[subscriptionData.planId],
      customer: subscriptionData.customerInfo,
      paymentMethod: subscriptionData.paymentMethod,
      status: 'active',
      createdAt: Date.now(),
      expiresAt: subscriptionData.expiresAt,
      autoRenew: subscriptionData.subscriptionType === 'recurring',
      transactionId: subscriptionData.transactionId,
      user: {
        id: subscriptionData.customerInfo.userId || this.generateId('user_'),
        name: `${subscriptionData.customerInfo.firstName} ${subscriptionData.customerInfo.lastName}`,
        email: subscriptionData.customerInfo.email,
        plan: subscriptionData.planId,
        status: 'active'
      }
    };

    // Store subscription
    const subscriptions = JSON.parse(localStorage.getItem('nebula_subscriptions') || '[]');
    subscriptions.push(subscription);
    localStorage.setItem('nebula_subscriptions', JSON.stringify(subscriptions));

    this.logPaymentActivity({
      action: 'SUBSCRIPTION_CREATED',
      subscriptionId: subscription.id,
      planId: subscription.planId,
      customerEmail: subscription.customer.email,
      timestamp: Date.now()
    });

    return subscription;
  }

  // Get subscription by user email
  getSubscriptionByEmail(email) {
    const subscriptions = JSON.parse(localStorage.getItem('nebula_subscriptions') || '[]');
    return subscriptions.find(sub => 
      sub.customer.email === email && 
      sub.status === 'active' && 
      sub.expiresAt > Date.now()
    );
  }

  // Cancel subscription
  async cancelSubscription(subscriptionId, reason = '') {
    try {
      const subscriptions = JSON.parse(localStorage.getItem('nebula_subscriptions') || '[]');
      const subscriptionIndex = subscriptions.findIndex(sub => sub.id === subscriptionId);
      
      if (subscriptionIndex === -1) {
        throw new Error('Subscription not found');
      }

      const subscription = subscriptions[subscriptionIndex];
      
      // Update subscription status
      subscription.status = 'cancelled';
      subscription.cancelledAt = Date.now();
      subscription.cancellationReason = reason;
      
      subscriptions[subscriptionIndex] = subscription;
      localStorage.setItem('nebula_subscriptions', JSON.stringify(subscriptions));

      this.logPaymentActivity({
        action: 'SUBSCRIPTION_CANCELLED',
        subscriptionId: subscriptionId,
        reason: reason,
        timestamp: Date.now()
      });

      return { success: true, message: 'Subscription cancelled successfully' };
    } catch (error) {
      console.error('Subscription cancellation failed:', error);
      throw error;
    }
  }

  // Get payment history
  getPaymentHistory(customerEmail) {
    const logs = JSON.parse(localStorage.getItem('nebula_payment_logs') || '[]');
    return logs.filter(log => 
      log.customerEmail === customerEmail ||
      (log.action && log.action.includes('SUBSCRIPTION'))
    );
  }

  // Get payment statistics
  getPaymentStats(days = 30) {
    const logs = JSON.parse(localStorage.getItem('nebula_payment_logs') || '[]');
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
    const recentLogs = logs.filter(log => log.timestamp > cutoff);

    const stats = {
      totalRevenue: 0,
      totalTransactions: 0,
      successfulPayments: 0,
      failedPayments: 0,
      subscriptions: 0,
      byPlan: {},
      byPaymentMethod: {},
      revenueByDay: {}
    };

    recentLogs.forEach(log => {
      if (log.amount) {
        stats.totalRevenue += log.amount;
      }
      
      if (log.action && log.action.includes('CREATED')) {
        stats.totalTransactions++;
        stats.successfulPayments++;
      }
      
      if (log.action && log.action.includes('FAILED')) {
        stats.failedPayments++;
      }
      
      if (log.action && log.action.includes('SUBSCRIPTION_CREATED')) {
        stats.subscriptions++;
      }
      
      if (log.planId) {
        stats.byPlan[log.planId] = (stats.byPlan[log.planId] || 0) + 1;
      }
      
      const day = new Date(log.timestamp).toDateString();
      stats.revenueByDay[day] = (stats.revenueByDay[day] || 0) + (log.amount || 0);
    });

    return stats;
  }

  // Mock API functions (replace with actual API calls in production)
  async mockPayPalAPI(action, data) {
    await this.delay(1000); // Simulate API delay
    
    if (Math.random() > 0.1) { // 90% success rate
      return {
        success: true,
        subscriptionId: this.generateId('PAYPAL_SUB_'),
        approvalUrl: `https://www.sandbox.paypal.com/checkoutnow?token=demo_token`,
        status: 'APPROVAL_PENDING'
      };
    } else {
      throw new Error('PayPal API error - simulated failure');
    }
  }

  async mockStripeAPI(action, data) {
    await this.delay(800); // Simulate API delay
    
    if (Math.random() > 0.1) { // 90% success rate
      return {
        success: true,
        sessionId: this.generateId('cs_'),
        url: `https://checkout.stripe.com/c/pay/demo_session`,
        status: 'open'
      };
    } else {
      throw new Error('Stripe API error - simulated failure');
    }
  }

  async processPayPalOneTime(plan, customerInfo, paymentData) {
    await this.delay(1500);
    return {
      success: true,
      transactionId: this.generateId('PAYPAL_TXN_'),
      status: 'completed'
    };
  }

  async processStripeOneTime(plan, customerInfo, paymentData) {
    await this.delay(1200);
    return {
      success: true,
      transactionId: this.generateId('pi_'),
      status: 'succeeded'
    };
  }

  // Utility functions
  generateId(prefix = '') {
    return prefix + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  formatCurrency(amount, currency = 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  }

  // Payment activity logging
  logPaymentActivity(activity) {
    const logs = JSON.parse(localStorage.getItem('nebula_payment_logs') || '[]');
    logs.unshift({
      id: this.generateId('pay_log_'),
      ...activity
    });

    // Keep only last 1000 entries
    if (logs.length > 1000) {
      logs.splice(1000);
    }

    localStorage.setItem('nebula_payment_logs', JSON.stringify(logs));
  }

  getPaymentLogs(limit = 100) {
    const logs = JSON.parse(localStorage.getItem('nebula_payment_logs') || '[]');
    return logs.slice(0, limit);
  }

  // Validate payment data
  validatePaymentData(paymentData) {
    const required = ['firstName', 'lastName', 'email'];
    const missing = required.filter(field => !paymentData[field]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }

    if (!/\S+@\S+\.\S+/.test(paymentData.email)) {
      throw new Error('Invalid email address');
    }

    return true;
  }

  // Get all plans
  getAllPlans() {
    return Object.values(this.plans);
  }

  // Get plan by ID
  getPlan(planId) {
    return this.plans[planId];
  }
}

// Create and export singleton instance
const paymentService = new PaymentService();
export default paymentService;