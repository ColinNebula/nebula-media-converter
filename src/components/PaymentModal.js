import React, { useState } from 'react';
import './PaymentModal.css';

const PaymentModal = ({ isOpen, onClose, selectedPlan, userData, onPaymentSuccess }) => {
  const [paymentData, setPaymentData] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    nameOnCard: '',
    billingAddress: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'US'
    }
  });
  const [errors, setErrors] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name.startsWith('billing.')) {
      const field = name.split('.')[1];
      setPaymentData(prev => ({
        ...prev,
        billingAddress: {
          ...prev.billingAddress,
          [field]: value
        }
      }));
    } else {
      let formattedValue = value;
      
      // Format card number
      if (name === 'cardNumber') {
        formattedValue = value.replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim();
        if (formattedValue.length > 19) formattedValue = formattedValue.substring(0, 19);
      }
      
      // Format expiry date
      if (name === 'expiryDate') {
        formattedValue = value.replace(/\D/g, '').replace(/(\d{2})(\d)/, '$1/$2');
        if (formattedValue.length > 5) formattedValue = formattedValue.substring(0, 5);
      }
      
      // Format CVV
      if (name === 'cvv') {
        formattedValue = value.replace(/\D/g, '');
        if (formattedValue.length > 4) formattedValue = formattedValue.substring(0, 4);
      }
      
      setPaymentData(prev => ({
        ...prev,
        [name]: formattedValue
      }));
    }
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validatePayment = () => {
    const newErrors = {};

    if (!paymentData.cardNumber || paymentData.cardNumber.replace(/\s/g, '').length < 16) {
      newErrors.cardNumber = 'Please enter a valid card number';
    }

    if (!paymentData.expiryDate || paymentData.expiryDate.length < 5) {
      newErrors.expiryDate = 'Please enter a valid expiry date';
    }

    if (!paymentData.cvv || paymentData.cvv.length < 3) {
      newErrors.cvv = 'Please enter a valid CVV';
    }

    if (!paymentData.nameOnCard) {
      newErrors.nameOnCard = 'Name on card is required';
    }

    if (!paymentData.billingAddress.street) {
      newErrors['billing.street'] = 'Street address is required';
    }

    if (!paymentData.billingAddress.city) {
      newErrors['billing.city'] = 'City is required';
    }

    if (!paymentData.billingAddress.state) {
      newErrors['billing.state'] = 'State is required';
    }

    if (!paymentData.billingAddress.zipCode) {
      newErrors['billing.zipCode'] = 'ZIP code is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validatePayment()) return;

    setIsProcessing(true);

    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Simulate successful payment
      const subscriptionData = {
        planId: selectedPlan.id,
        planName: selectedPlan.name,
        amount: selectedPlan.price,
        status: 'active',
        startDate: new Date().toISOString(),
        nextBilling: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        paymentMethod: {
          last4: paymentData.cardNumber.slice(-4),
          brand: getCardBrand(paymentData.cardNumber)
        }
      };

      onPaymentSuccess({
        user: userData,
        subscription: subscriptionData
      });
    } catch (error) {
      setErrors({ submit: 'Payment failed. Please check your information and try again.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const getCardBrand = (cardNumber) => {
    const number = cardNumber.replace(/\s/g, '');
    if (number.startsWith('4')) return 'Visa';
    if (number.startsWith('5') || number.startsWith('2')) return 'Mastercard';
    if (number.startsWith('3')) return 'American Express';
    return 'Card';
  };

  if (!isOpen) return null;

  return (
    <div className="payment-modal-overlay" onClick={onClose}>
      <div className="payment-modal" onClick={e => e.stopPropagation()}>
        <div className="payment-modal-header">
          <h2>Complete Your Purchase</h2>
          <button className="payment-modal-close" onClick={onClose}>×</button>
        </div>

        <div className="payment-summary">
          <div className="plan-summary">
            <div className="plan-details">
              <h3>{selectedPlan?.name} Plan</h3>
              <p>Monthly subscription</p>
            </div>
            <div className="plan-total">
              <span className="amount">{selectedPlan?.price}</span>
              <span className="period">/month</span>
            </div>
          </div>
          
          <div className="user-info">
            <p><strong>Account:</strong> {userData?.email}</p>
            {userData?.company && <p><strong>Company:</strong> {userData.company}</p>}
          </div>
        </div>

        <form className="payment-form" onSubmit={handleSubmit}>
          <div className="payment-section">
            <h4>Payment Information</h4>
            
            <div className="form-group">
              <label htmlFor="cardNumber">Card Number</label>
              <input
                type="text"
                id="cardNumber"
                name="cardNumber"
                value={paymentData.cardNumber}
                onChange={handleInputChange}
                placeholder="1234 5678 9012 3456"
                className={errors.cardNumber ? 'error' : ''}
              />
              {errors.cardNumber && <span className="error-message">{errors.cardNumber}</span>}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="expiryDate">Expiry Date</label>
                <input
                  type="text"
                  id="expiryDate"
                  name="expiryDate"
                  value={paymentData.expiryDate}
                  onChange={handleInputChange}
                  placeholder="MM/YY"
                  className={errors.expiryDate ? 'error' : ''}
                />
                {errors.expiryDate && <span className="error-message">{errors.expiryDate}</span>}
              </div>
              <div className="form-group">
                <label htmlFor="cvv">CVV</label>
                <input
                  type="text"
                  id="cvv"
                  name="cvv"
                  value={paymentData.cvv}
                  onChange={handleInputChange}
                  placeholder="123"
                  className={errors.cvv ? 'error' : ''}
                />
                {errors.cvv && <span className="error-message">{errors.cvv}</span>}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="nameOnCard">Name on Card</label>
              <input
                type="text"
                id="nameOnCard"
                name="nameOnCard"
                value={paymentData.nameOnCard}
                onChange={handleInputChange}
                className={errors.nameOnCard ? 'error' : ''}
              />
              {errors.nameOnCard && <span className="error-message">{errors.nameOnCard}</span>}
            </div>
          </div>

          <div className="billing-section">
            <h4>Billing Address</h4>
            
            <div className="form-group">
              <label htmlFor="billing.street">Street Address</label>
              <input
                type="text"
                id="billing.street"
                name="billing.street"
                value={paymentData.billingAddress.street}
                onChange={handleInputChange}
                className={errors['billing.street'] ? 'error' : ''}
              />
              {errors['billing.street'] && <span className="error-message">{errors['billing.street']}</span>}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="billing.city">City</label>
                <input
                  type="text"
                  id="billing.city"
                  name="billing.city"
                  value={paymentData.billingAddress.city}
                  onChange={handleInputChange}
                  className={errors['billing.city'] ? 'error' : ''}
                />
                {errors['billing.city'] && <span className="error-message">{errors['billing.city']}</span>}
              </div>
              <div className="form-group">
                <label htmlFor="billing.state">State</label>
                <input
                  type="text"
                  id="billing.state"
                  name="billing.state"
                  value={paymentData.billingAddress.state}
                  onChange={handleInputChange}
                  className={errors['billing.state'] ? 'error' : ''}
                />
                {errors['billing.state'] && <span className="error-message">{errors['billing.state']}</span>}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="billing.zipCode">ZIP Code</label>
                <input
                  type="text"
                  id="billing.zipCode"
                  name="billing.zipCode"
                  value={paymentData.billingAddress.zipCode}
                  onChange={handleInputChange}
                  className={errors['billing.zipCode'] ? 'error' : ''}
                />
                {errors['billing.zipCode'] && <span className="error-message">{errors['billing.zipCode']}</span>}
              </div>
              <div className="form-group">
                <label htmlFor="billing.country">Country</label>
                <select
                  id="billing.country"
                  name="billing.country"
                  value={paymentData.billingAddress.country}
                  onChange={handleInputChange}
                >
                  <option value="US">United States</option>
                  <option value="CA">Canada</option>
                  <option value="GB">United Kingdom</option>
                  <option value="AU">Australia</option>
                </select>
              </div>
            </div>
          </div>

          {errors.submit && <div className="error-message submit-error">{errors.submit}</div>}

          <button type="submit" className="payment-submit-btn" disabled={isProcessing}>
            {isProcessing ? (
              <>
                <div className="loading-spinner"></div>
                Processing Payment...
              </>
            ) : (
              `Subscribe to ${selectedPlan?.name} - ${selectedPlan?.price}/month`
            )}
          </button>
        </form>

        <div className="security-notice">
          <p>🔒 Your payment information is encrypted and secure</p>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;