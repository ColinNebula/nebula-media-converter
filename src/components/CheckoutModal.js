import React, { useState, useEffect } from 'react';
import paymentService from '../services/PaymentService';
import './CheckoutModal.css';

const CheckoutModal = ({ isOpen, onClose, selectedPlan, onSuccess }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('stripe');
  const [loading, setLoading] = useState(false);
  const [customerInfo, setCustomerInfo] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    country: 'US'
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      paymentService.initializePaymentProviders();
      setCurrentStep(1);
      setErrors({});
    }
  }, [isOpen]);

  const validateCustomerInfo = () => {
    const newErrors = {};
    
    if (!customerInfo.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    
    if (!customerInfo.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    
    if (!customerInfo.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(customerInfo.email)) {
      newErrors.email = 'Invalid email address';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (currentStep === 1 && validateCustomerInfo()) {
      setCurrentStep(2);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handlePayment = async () => {
    setLoading(true);
    try {
      let result;
      
      if (paymentMethod === 'paypal') {
        result = await paymentService.createPayPalSubscription(selectedPlan.id, customerInfo);
        
        // In production, redirect to PayPal
        if (result.approvalUrl) {
          window.open(result.approvalUrl, '_blank');
          // For demo, simulate successful payment after a delay
          setTimeout(() => {
            handlePaymentSuccess(result.subscriptionId);
          }, 3000);
        }
      } else if (paymentMethod === 'stripe') {
        result = await paymentService.createStripePayment(selectedPlan.id, customerInfo);
        
        // In production, redirect to Stripe Checkout
        if (result.url) {
          window.open(result.url, '_blank');
          // For demo, simulate successful payment after a delay
          setTimeout(() => {
            handlePaymentSuccess(result.sessionId);
          }, 3000);
        }
      }
      
    } catch (error) {
      console.error('Payment failed:', error);
      alert(`Payment failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = async (transactionId) => {
    try {
      // Create subscription record
      const subscription = await paymentService.createSubscriptionRecord({
        planId: selectedPlan.id,
        customerInfo: customerInfo,
        paymentMethod: paymentMethod,
        transactionId: transactionId,
        subscriptionType: 'recurring',
        expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000) // 30 days
      });

      onSuccess(subscription);
      onClose();
    } catch (error) {
      console.error('Failed to create subscription:', error);
    }
  };

  if (!isOpen || !selectedPlan) return null;

  return (
    <div className="checkout-modal-overlay">
      <div className="checkout-modal">
        <div className="checkout-header">
          <h2>🚀 Upgrade to {selectedPlan.name}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="checkout-progress">
          <div className={`progress-step ${currentStep >= 1 ? 'active' : ''}`}>
            <span className="step-number">1</span>
            <span className="step-label">Details</span>
          </div>
          <div className="progress-line"></div>
          <div className={`progress-step ${currentStep >= 2 ? 'active' : ''}`}>
            <span className="step-number">2</span>
            <span className="step-label">Payment</span>
          </div>
        </div>

        <div className="checkout-content">
          {/* Step 1: Customer Information */}
          {currentStep === 1 && (
            <div className="step-content">
              <h3>Customer Information</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>First Name *</label>
                  <input
                    type="text"
                    value={customerInfo.firstName}
                    onChange={(e) => setCustomerInfo({...customerInfo, firstName: e.target.value})}
                    className={errors.firstName ? 'error' : ''}
                    placeholder="John"
                  />
                  {errors.firstName && <span className="error-text">{errors.firstName}</span>}
                </div>
                <div className="form-group">
                  <label>Last Name *</label>
                  <input
                    type="text"
                    value={customerInfo.lastName}
                    onChange={(e) => setCustomerInfo({...customerInfo, lastName: e.target.value})}
                    className={errors.lastName ? 'error' : ''}
                    placeholder="Doe"
                  />
                  {errors.lastName && <span className="error-text">{errors.lastName}</span>}
                </div>
              </div>
              
              <div className="form-group">
                <label>Email Address *</label>
                <input
                  type="email"
                  value={customerInfo.email}
                  onChange={(e) => setCustomerInfo({...customerInfo, email: e.target.value})}
                  className={errors.email ? 'error' : ''}
                  placeholder="john.doe@example.com"
                />
                {errors.email && <span className="error-text">{errors.email}</span>}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Phone (Optional)</label>
                  <input
                    type="tel"
                    value={customerInfo.phone}
                    onChange={(e) => setCustomerInfo({...customerInfo, phone: e.target.value})}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
                <div className="form-group">
                  <label>Country</label>
                  <select
                    value={customerInfo.country}
                    onChange={(e) => setCustomerInfo({...customerInfo, country: e.target.value})}
                  >
                    <option value="US">United States</option>
                    <option value="CA">Canada</option>
                    <option value="GB">United Kingdom</option>
                    <option value="AU">Australia</option>
                    <option value="DE">Germany</option>
                    <option value="FR">France</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Payment Method */}
          {currentStep === 2 && (
            <div className="step-content">
              <h3>Choose Payment Method</h3>
              
              <div className="payment-methods">
                <div 
                  className={`payment-method ${paymentMethod === 'stripe' ? 'selected' : ''}`}
                  onClick={() => setPaymentMethod('stripe')}
                >
                  <div className="payment-icon">💳</div>
                  <div className="payment-info">
                    <h4>Credit Card</h4>
                    <p>Visa, Mastercard, American Express</p>
                    <small>Secure payment via Stripe</small>
                  </div>
                  <div className="payment-radio">
                    <input 
                      type="radio" 
                      checked={paymentMethod === 'stripe'} 
                      onChange={() => setPaymentMethod('stripe')}
                    />
                  </div>
                </div>

                <div 
                  className={`payment-method ${paymentMethod === 'paypal' ? 'selected' : ''}`}
                  onClick={() => setPaymentMethod('paypal')}
                >
                  <div className="payment-icon">🎯</div>
                  <div className="payment-info">
                    <h4>PayPal</h4>
                    <p>Pay with your PayPal account</p>
                    <small>Fast and secure</small>
                  </div>
                  <div className="payment-radio">
                    <input 
                      type="radio" 
                      checked={paymentMethod === 'paypal'} 
                      onChange={() => setPaymentMethod('paypal')}
                    />
                  </div>
                </div>
              </div>

              <div className="order-summary">
                <h4>Order Summary</h4>
                <div className="summary-row">
                  <span>Plan:</span>
                  <span>{selectedPlan.name}</span>
                </div>
                <div className="summary-row">
                  <span>Billing:</span>
                  <span>Monthly</span>
                </div>
                <div className="summary-row total">
                  <span>Total:</span>
                  <span>{paymentService.formatCurrency(selectedPlan.price)}/month</span>
                </div>
              </div>

              <div className="terms-notice">
                <p>
                  <input type="checkbox" id="terms" defaultChecked />
                  <label htmlFor="terms">
                    I agree to the <a href="/terms" target="_blank">Terms of Service</a> and{' '}
                    <a href="/privacy" target="_blank">Privacy Policy</a>
                  </label>
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="checkout-actions">
          {currentStep === 1 && (
            <>
              <button className="btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleNext}>
                Continue
              </button>
            </>
          )}
          
          {currentStep === 2 && (
            <>
              <button className="btn-secondary" onClick={handleBack}>
                Back
              </button>
              <button 
                className="btn-primary payment-btn" 
                onClick={handlePayment}
                disabled={loading}
              >
                {loading ? (
                  <span>Processing...</span>
                ) : (
                  <span>
                    {paymentMethod === 'paypal' ? '🎯 Pay with PayPal' : '💳 Pay with Card'}
                  </span>
                )}
              </button>
            </>
          )}
        </div>

        <div className="security-notice">
          <p>
            🔒 Your payment information is secure and encrypted. We never store your card details.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CheckoutModal;