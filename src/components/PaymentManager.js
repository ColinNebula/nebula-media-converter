import React, { useState, useEffect } from 'react';
import paymentService from '../services/PaymentService';
import './PaymentManager.css';

const PaymentManager = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [paymentStats, setPaymentStats] = useState(null);
  const [paymentLogs, setPaymentLogs] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(false);

  // Test payment form
  const [testPayment, setTestPayment] = useState({
    planId: 'pro',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    paymentMethod: 'stripe'
  });

  useEffect(() => {
    loadPaymentData();
    initializePaymentProviders();
  }, []);

  const loadPaymentData = () => {
    setPaymentStats(paymentService.getPaymentStats(30));
    setPaymentLogs(paymentService.getPaymentLogs(50));
    
    // Load subscriptions
    const allSubscriptions = JSON.parse(localStorage.getItem('nebula_subscriptions') || '[]');
    setSubscriptions(allSubscriptions);
  };

  const initializePaymentProviders = async () => {
    try {
      const result = await paymentService.initializePaymentProviders();
      if (result.success) {
        console.log('Payment providers initialized successfully');
      }
    } catch (error) {
      console.error('Failed to initialize payment providers:', error);
    }
  };

  const handleTestPayment = async () => {
    if (!testPayment.firstName || !testPayment.lastName || !testPayment.email) {
      alert('Please fill in all customer information');
      return;
    }

    setLoading(true);
    try {
      let result;
      
      if (testPayment.paymentMethod === 'paypal') {
        result = await paymentService.createPayPalSubscription(testPayment.planId, {
          firstName: testPayment.firstName,
          lastName: testPayment.lastName,
          email: testPayment.email
        });
        
        if (result.approvalUrl) {
          alert(`PayPal subscription created! In production, user would be redirected to: ${result.approvalUrl}`);
        }
      } else if (testPayment.paymentMethod === 'stripe') {
        result = await paymentService.createStripePayment(testPayment.planId, {
          firstName: testPayment.firstName,
          lastName: testPayment.lastName,
          email: testPayment.email
        });
        
        if (result.url) {
          alert(`Stripe session created! In production, user would be redirected to: ${result.url}`);
        }
      }

      // Simulate successful payment completion for demo
      await paymentService.createSubscriptionRecord({
        planId: testPayment.planId,
        customerInfo: {
          firstName: testPayment.firstName,
          lastName: testPayment.lastName,
          email: testPayment.email
        },
        paymentMethod: testPayment.paymentMethod,
        transactionId: paymentService.generateId('demo_txn_'),
        subscriptionType: 'recurring',
        expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000) // 30 days
      });

      alert('Test payment completed successfully!');
      loadPaymentData();
    } catch (error) {
      alert(`Payment failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async (subscriptionId) => {
    if (!window.confirm('Are you sure you want to cancel this subscription?')) {
      return;
    }

    try {
      await paymentService.cancelSubscription(subscriptionId, 'Admin cancellation');
      alert('Subscription cancelled successfully');
      loadPaymentData();
    } catch (error) {
      alert(`Failed to cancel subscription: ${error.message}`);
    }
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return '#4caf50';
      case 'cancelled': return '#f44336';
      case 'expired': return '#ff9800';
      default: return '#9e9e9e';
    }
  };

  const getPlanColor = (planId) => {
    switch (planId) {
      case 'free': return '#9e9e9e';
      case 'pro': return '#2196f3';
      case 'business': return '#9c27b0';
      default: return '#607d8b';
    }
  };

  return (
    <div className="payment-manager">
      <div className="payment-header">
        <h2>💳 Payment Management System</h2>
        <div className="payment-stats-summary">
          {paymentStats && (
            <>
              <div className="stat-item">
                <span className="stat-value">${paymentStats.totalRevenue.toFixed(2)}</span>
                <span className="stat-label">Revenue</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{paymentStats.totalTransactions}</span>
                <span className="stat-label">Transactions</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{paymentStats.subscriptions}</span>
                <span className="stat-label">Subscriptions</span>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="payment-tabs">
        <button 
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📊 Overview
        </button>
        <button 
          className={`tab-btn ${activeTab === 'test' ? 'active' : ''}`}
          onClick={() => setActiveTab('test')}
        >
          🧪 Test Payments
        </button>
        <button 
          className={`tab-btn ${activeTab === 'subscriptions' ? 'active' : ''}`}
          onClick={() => setActiveTab('subscriptions')}
        >
          📋 Subscriptions
        </button>
        <button 
          className={`tab-btn ${activeTab === 'logs' ? 'active' : ''}`}
          onClick={() => setActiveTab('logs')}
        >
          📜 Payment Logs
        </button>
        <button 
          className={`tab-btn ${activeTab === 'plans' ? 'active' : ''}`}
          onClick={() => setActiveTab('plans')}
        >
          💎 Plans & Pricing
        </button>
      </div>

      <div className="payment-content">
        {/* Overview Tab */}
        {activeTab === 'overview' && paymentStats && (
          <div className="overview-section">
            <h3>Payment Statistics (Last 30 Days)</h3>
            <div className="stats-grid">
              <div className="stat-card">
                <h4>💰 Total Revenue</h4>
                <div className="stat-number">${paymentStats.totalRevenue.toFixed(2)}</div>
              </div>
              <div className="stat-card">
                <h4>📈 Transactions</h4>
                <div className="stat-number">{paymentStats.totalTransactions}</div>
              </div>
              <div className="stat-card">
                <h4>✅ Success Rate</h4>
                <div className="stat-number">
                  {paymentStats.totalTransactions > 0 ? 
                    Math.round((paymentStats.successfulPayments / (paymentStats.successfulPayments + paymentStats.failedPayments)) * 100) : 0}%
                </div>
              </div>
              <div className="stat-card">
                <h4>🔄 Active Subscriptions</h4>
                <div className="stat-number">{paymentStats.subscriptions}</div>
              </div>
            </div>

            {Object.keys(paymentStats.byPlan).length > 0 && (
              <div className="plan-breakdown">
                <h4>Revenue by Plan</h4>
                <div className="plan-stats">
                  {Object.entries(paymentStats.byPlan).map(([planId, count]) => {
                    const plan = paymentService.getPlan(planId);
                    return (
                      <div key={planId} className="plan-stat-item">
                        <span 
                          className="plan-color" 
                          style={{ backgroundColor: getPlanColor(planId) }}
                        ></span>
                        <span className="plan-name">{plan?.name || planId}</span>
                        <span className="plan-count">{count}</span>
                        <span className="plan-revenue">
                          ${((plan?.price || 0) * count).toFixed(2)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Test Payments Tab */}
        {activeTab === 'test' && (
          <div className="test-payment-section">
            <h3>Test Payment Processing</h3>
            <div className="test-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Plan:</label>
                  <select
                    value={testPayment.planId}
                    onChange={(e) => setTestPayment({...testPayment, planId: e.target.value})}
                  >
                    <option value="pro">Pro - $9.99/month</option>
                    <option value="business">Business - $29.99/month</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Payment Method:</label>
                  <select
                    value={testPayment.paymentMethod}
                    onChange={(e) => setTestPayment({...testPayment, paymentMethod: e.target.value})}
                  >
                    <option value="stripe">Credit Card (Stripe)</option>
                    <option value="paypal">PayPal</option>
                  </select>
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>First Name:</label>
                  <input
                    type="text"
                    value={testPayment.firstName}
                    onChange={(e) => setTestPayment({...testPayment, firstName: e.target.value})}
                    placeholder="John"
                  />
                </div>
                <div className="form-group">
                  <label>Last Name:</label>
                  <input
                    type="text"
                    value={testPayment.lastName}
                    onChange={(e) => setTestPayment({...testPayment, lastName: e.target.value})}
                    placeholder="Doe"
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label>Email:</label>
                <input
                  type="email"
                  value={testPayment.email}
                  onChange={(e) => setTestPayment({...testPayment, email: e.target.value})}
                  placeholder="john.doe@example.com"
                />
              </div>

              <div className="form-actions">
                <button onClick={handleTestPayment} disabled={loading}>
                  {loading ? 'Processing...' : 'Test Payment Flow'}
                </button>
              </div>
            </div>

            <div className="test-info">
              <h4>🧪 Test Information</h4>
              <p>This simulates the payment flow without actual charges:</p>
              <ul>
                <li>PayPal: Simulates subscription creation and approval URL</li>
                <li>Stripe: Simulates checkout session creation</li>
                <li>Success rate: ~90% (simulates real-world conditions)</li>
                <li>All test transactions are logged for review</li>
              </ul>
            </div>
          </div>
        )}

        {/* Subscriptions Tab */}
        {activeTab === 'subscriptions' && (
          <div className="subscriptions-section">
            <h3>Active Subscriptions</h3>
            {subscriptions.length === 0 ? (
              <p>No subscriptions found.</p>
            ) : (
              <div className="subscriptions-table-container">
                <table className="subscriptions-table">
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Plan</th>
                      <th>Status</th>
                      <th>Created</th>
                      <th>Expires</th>
                      <th>Payment Method</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscriptions.map((subscription) => (
                      <tr key={subscription.id}>
                        <td>
                          <div className="customer-info">
                            <div className="customer-name">{subscription.user.name}</div>
                            <div className="customer-email">{subscription.customer.email}</div>
                          </div>
                        </td>
                        <td>
                          <span 
                            className="plan-badge"
                            style={{ backgroundColor: getPlanColor(subscription.planId) }}
                          >
                            {subscription.plan.name}
                          </span>
                        </td>
                        <td>
                          <span 
                            className="status-badge"
                            style={{ backgroundColor: getStatusColor(subscription.status) }}
                          >
                            {subscription.status}
                          </span>
                        </td>
                        <td>{formatDate(subscription.createdAt)}</td>
                        <td>{formatDate(subscription.expiresAt)}</td>
                        <td className="payment-method">{subscription.paymentMethod}</td>
                        <td>
                          {subscription.status === 'active' && (
                            <button
                              className="cancel-btn"
                              onClick={() => handleCancelSubscription(subscription.id)}
                            >
                              Cancel
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Payment Logs Tab */}
        {activeTab === 'logs' && (
          <div className="logs-section">
            <h3>Payment Activity Logs</h3>
            {paymentLogs.length === 0 ? (
              <p>No payment logs found.</p>
            ) : (
              <div className="logs-table-container">
                <table className="logs-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Action</th>
                      <th>Plan</th>
                      <th>Amount</th>
                      <th>Customer</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentLogs.map((log) => (
                      <tr key={log.id}>
                        <td>{formatDate(log.timestamp)}</td>
                        <td>{log.action?.replace(/_/g, ' ')}</td>
                        <td>{log.planId || '-'}</td>
                        <td>
                          {log.amount ? 
                            paymentService.formatCurrency(log.amount, log.currency) : 
                            '-'
                          }
                        </td>
                        <td>{log.customerEmail || '-'}</td>
                        <td>
                          {log.error ? (
                            <span className="status-error">Failed</span>
                          ) : (
                            <span className="status-success">Success</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Plans & Pricing Tab */}
        {activeTab === 'plans' && (
          <div className="plans-section">
            <h3>Pricing Plans Configuration</h3>
            <div className="plans-grid">
              {paymentService.getAllPlans().map((plan) => (
                <div key={plan.id} className="plan-card">
                  <div className="plan-header">
                    <h4>{plan.name}</h4>
                    <div className="plan-price">
                      {plan.price === 0 ? 'Free' : 
                        `${paymentService.formatCurrency(plan.price)}/${plan.interval}`
                      }
                    </div>
                  </div>
                  <div className="plan-features">
                    <ul>
                      {plan.features.map((feature, index) => (
                        <li key={index}>{feature}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="plan-limits">
                    <h5>Limits:</h5>
                    <ul>
                      <li>File size: {(plan.limits.fileSize / (1024 * 1024 * 1024)).toFixed(1)}GB</li>
                      <li>Conversions: {plan.limits.conversionsPerMonth === -1 ? 'Unlimited' : plan.limits.conversionsPerMonth}</li>
                      <li>Storage: {(plan.limits.storageLimit / (1024 * 1024 * 1024)).toFixed(0)}GB</li>
                      <li>Retention: {plan.limits.retentionDays} days</li>
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentManager;