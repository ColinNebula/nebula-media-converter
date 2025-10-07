import React, { useState } from 'react';
import './SuccessModal.css';

const SuccessModal = ({ isOpen, onClose, subscriptionData }) => {
  const [showDetails, setShowDetails] = useState(false);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (!isOpen || !subscriptionData) return null;

  const { user, subscription } = subscriptionData;

  return (
    <div className="success-modal-overlay" onClick={onClose}>
      <div className="success-modal" onClick={e => e.stopPropagation()}>
        <div className="success-modal-header">
          <div className="success-icon">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" fill="#00d4ff"/>
              <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h2>Welcome to {subscription.planName}!</h2>
          <p>Your subscription is now active</p>
          <button className="success-modal-close" onClick={onClose}>×</button>
        </div>

        <div className="success-content">
          <div className="subscription-summary">
            <div className="plan-info">
              <h3>{subscription.planName} Plan</h3>
              <div className="plan-amount">{subscription.amount}/month</div>
              <div className="plan-status">
                <span className="status-badge active">Active</span>
              </div>
            </div>

            <div className="account-info">
              <h4>Account Details</h4>
              <p><strong>Email:</strong> {user.email}</p>
              <p><strong>Name:</strong> {user.firstName} {user.lastName}</p>
              {user.company && <p><strong>Company:</strong> {user.company}</p>}
            </div>
          </div>

          <div className="billing-summary">
            <div className="billing-info">
              <div className="billing-row">
                <span>Started:</span>
                <span>{formatDate(subscription.startDate)}</span>
              </div>
              <div className="billing-row">
                <span>Next billing:</span>
                <span>{formatDate(subscription.nextBilling)}</span>
              </div>
              <div className="billing-row">
                <span>Payment method:</span>
                <span>{subscription.paymentMethod.brand} ending in {subscription.paymentMethod.last4}</span>
              </div>
            </div>
          </div>

          <div className="premium-features">
            <h4>🎉 You now have access to:</h4>
            <div className="features-grid">
              {subscription.planName === 'Pro' && (
                <>
                  <div className="feature-item">
                    <span className="feature-icon">🎵</span>
                    <span>High-quality audio conversion</span>
                  </div>
                  <div className="feature-item">
                    <span className="feature-icon">🎬</span>
                    <span>Advanced video formats</span>
                  </div>
                  <div className="feature-item">
                    <span className="feature-icon">📄</span>
                    <span>Premium document formats</span>
                  </div>
                  <div className="feature-item">
                    <span className="feature-icon">⚡</span>
                    <span>Faster processing speeds</span>
                  </div>
                  <div className="feature-item">
                    <span className="feature-icon">📊</span>
                    <span>Advanced settings & controls</span>
                  </div>
                  <div className="feature-item">
                    <span className="feature-icon">☁️</span>
                    <span>Cloud storage integration</span>
                  </div>
                </>
              )}
              {subscription.planName === 'Business' && (
                <>
                  <div className="feature-item">
                    <span className="feature-icon">🏢</span>
                    <span>All Pro features</span>
                  </div>
                  <div className="feature-item">
                    <span className="feature-icon">👥</span>
                    <span>Team collaboration tools</span>
                  </div>
                  <div className="feature-item">
                    <span className="feature-icon">🔧</span>
                    <span>API access</span>
                  </div>
                  <div className="feature-item">
                    <span className="feature-icon">📈</span>
                    <span>Usage analytics</span>
                  </div>
                  <div className="feature-item">
                    <span className="feature-icon">🎯</span>
                    <span>Priority support</span>
                  </div>
                  <div className="feature-item">
                    <span className="feature-icon">⚙️</span>
                    <span>Custom integrations</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="next-steps">
            <h4>Next Steps</h4>
            <div className="steps-list">
              <div className="step-item">
                <span className="step-number">1</span>
                <span>Start converting files with your new premium features</span>
              </div>
              <div className="step-item">
                <span className="step-number">2</span>
                <span>Explore advanced settings and customization options</span>
              </div>
              <div className="step-item">
                <span className="step-number">3</span>
                <span>Manage your subscription in your account settings</span>
              </div>
            </div>
          </div>

          <div className="action-buttons">
            <button className="primary-btn" onClick={onClose}>
              Start Converting
            </button>
            <button 
              className="secondary-btn" 
              onClick={() => setShowDetails(!showDetails)}
            >
              {showDetails ? 'Hide Details' : 'View Details'}
            </button>
          </div>

          {showDetails && (
            <div className="detailed-info">
              <h4>Subscription Details</h4>
              <div className="details-grid">
                <div className="detail-item">
                  <span className="detail-label">Plan ID:</span>
                  <span className="detail-value">{subscription.planId}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Status:</span>
                  <span className="detail-value status-active">{subscription.status}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Billing Cycle:</span>
                  <span className="detail-value">Monthly</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Auto-renewal:</span>
                  <span className="detail-value">Enabled</span>
                </div>
              </div>
            </div>
          )}

          <div className="support-info">
            <p>Need help? Contact our support team at <a href="mailto:support@nebula.com">support@nebula.com</a></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuccessModal;