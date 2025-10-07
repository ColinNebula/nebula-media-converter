import React, { useState } from 'react';
import './PremiumFeatures.css';
import AuthModal from './AuthModal';
import CheckoutModal from './CheckoutModal';
import SuccessModal from './SuccessModal';
import paymentService from '../services/PaymentService';

const PremiumFeatures = ({ isPremium, onUpgrade }) => {
  const [showModal, setShowModal] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [userData, setUserData] = useState(null);
  const [subscriptionData, setSubscriptionData] = useState(null);

  const premiumFeatures = [
    {
      icon: '📄',
      title: 'Document Conversion',
      description: 'Convert PDF, Word, EPUB, MOBI, and more',
      benefit: 'Complete document workflow'
    },
    {
      icon: '🔤',
      title: 'OCR Text Extraction',
      description: 'Extract text from images and PDFs',
      benefit: 'Advanced document processing'
    },
    {
      icon: '⚡',
      title: 'Batch Processing',
      description: 'Convert multiple files simultaneously',
      benefit: 'Save hours of time'
    },
    {
      icon: '🎯',
      title: 'Advanced Quality Controls',
      description: 'Custom bitrate, resolution, and codec settings',
      benefit: 'Professional-grade output'
    },
    {
      icon: '☁️',
      title: 'Cloud Storage Integration',
      description: 'Direct upload to Google Drive, Dropbox, OneDrive',
      benefit: 'Seamless workflow'
    },
    {
      icon: '🎬',
      title: 'Video Editing Tools',
      description: 'Trim, crop, merge, add watermarks',
      benefit: 'All-in-one solution'
    },
    {
      icon: '🎵',
      title: 'Audio Enhancement',
      description: 'Noise reduction, EQ, volume normalization',
      benefit: 'Studio-quality audio'
    },
    {
      icon: '📱',
      title: 'Device Presets',
      description: 'iPhone, Android, TV, social media optimized',
      benefit: 'Perfect compatibility'
    },
    {
      icon: '⏰',
      title: 'Priority Processing',
      description: '10x faster conversion speeds',
      benefit: 'No waiting time'
    },
    {
      icon: '📊',
      title: 'Analytics Dashboard',
      description: 'Track usage, savings, conversion history',
      benefit: 'Business insights'
    },
    {
      icon: '🔄',
      title: 'API Access',
      description: 'Integrate with your apps and workflows',
      benefit: 'Automation ready'
    },
    {
      icon: '💾',
      title: 'Unlimited Storage',
      description: 'Keep converted files for 30 days',
      benefit: 'Never lose your work'
    },
    {
      icon: '🎨',
      title: 'Custom Branding',
      description: 'White-label for business use',
      benefit: 'Professional image'
    },
    {
      icon: '📞',
      title: 'Priority Support',
      description: '24/7 dedicated customer service',
      benefit: 'Peace of mind'
    }
  ];

  // Get plans from payment service
  const servicePlans = paymentService.getAllPlans();
  
  const plans = [
    {
      id: 'free',
      name: 'Free',
      price: '$0',
      period: 'forever',
      features: [
        'Basic file conversion',
        '500MB file size limit',
        '10 conversions per month',
        'Standard formats only',
        'Community support'
      ],
      current: !isPremium
    },
    {
      id: 'pro',
      name: 'Pro', 
      price: '$9.99',
      period: 'month',
      features: [
        'All file conversion formats',
        '2GB file size limit',
        'Unlimited conversions',
        'Batch processing',
        'Priority support',
        'Advanced settings',
        'Cloud storage (10GB)'
      ],
      popular: true,
      current: false
    },
    {
      id: 'business',
      name: 'Business',
      price: '$29.99', 
      period: 'month',
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
      enterprise: true,
      current: false
    }
  ];

  const handleUpgrade = (planName) => {
    const servicePlan = servicePlans.find(p => p.name === planName);
    if (servicePlan && servicePlan.id !== 'free') {
      setSelectedPlan(servicePlan);
      setShowModal(false); // Close the plans modal
      setCheckoutModalOpen(true);
    }
  };

  const handleCheckoutSuccess = (subscription) => {
    setSubscriptionData(subscription);
    setCheckoutModalOpen(false);
    setSuccessModalOpen(true);
    
    // Call the parent onUpgrade function
    onUpgrade(subscription.planId, subscription);
  };

  const handleUpgradeClick = (planName, planPrice) => {
    handleUpgrade(planName);
  };

  const handleQuickUpgrade = () => {
    // Quick upgrade to Pro plan when clicking the banner button
    const proPlan = servicePlans.find(p => p.id === 'pro');
    if (proPlan) {
      setSelectedPlan(proPlan);
      setCheckoutModalOpen(true);
    }
  };

  const handleAuthSuccess = (user) => {
    setUserData(user);
    setAuthModalOpen(false);
    setCheckoutModalOpen(true);
  };

  const handleCloseAll = () => {
    setAuthModalOpen(false);
    setCheckoutModalOpen(false);
    setSuccessModalOpen(false);
    setSelectedPlan(null);
    setUserData(null);
    setSubscriptionData(null);
  };

  return (
    <div className="premium-features">
      {!isPremium && (
        <div className="premium-banner">
          <div className="banner-content">
            <h3>🌟 Unlock Premium Features</h3>
            <p>Get unlimited conversions and advanced tools</p>
            <div className="banner-actions">
              <button className="upgrade-btn primary" onClick={handleQuickUpgrade}>
                Upgrade to Pro - $9.99/month
              </button>
              <button className="upgrade-btn secondary" onClick={() => setShowModal(true)}>
                View All Plans
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="premium-modal">
          <div className="modal-content">
            <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
            
            <div className="modal-header">
              <h2>Choose Your Plan</h2>
              <p>Unlock the full potential of Nebula Media Converter</p>
            </div>

            <div className="plans-grid">
              {plans.map((plan, index) => (
                <div key={index} className={`plan-card ${plan.popular ? 'popular' : ''} ${plan.current ? 'current' : ''}`}>
                  {plan.popular && <div className="popular-badge">Most Popular</div>}
                  {plan.current && <div className="current-badge">Current Plan</div>}
                  
                  <h3>{plan.name}</h3>
                  <div className="price">
                    <span className="amount">{plan.price}</span>
                    <span className="period">/{plan.period}</span>
                  </div>
                  
                  <ul className="features-list">
                    {plan.features.map((feature, idx) => (
                      <li key={idx}>✓ {feature}</li>
                    ))}
                  </ul>
                  
                  <button 
                    className={`plan-btn ${plan.current ? 'current-plan' : ''}`}
                    onClick={() => !plan.current && handleUpgradeClick(plan.name, plan.price)}
                    disabled={plan.current}
                  >
                    {plan.current ? 'Current Plan' : 'Get Started'}
                  </button>
                </div>
              ))}
            </div>

            <div className="features-showcase">
              <h3>Premium Features</h3>
              <div className="features-grid">
                {premiumFeatures.map((feature, index) => (
                  <div key={index} className="feature-card">
                    <div className="feature-icon">{feature.icon}</div>
                    <h4>{feature.title}</h4>
                    <p>{feature.description}</p>
                    <span className="benefit">{feature.benefit}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="guarantee">
              <p>💰 30-day money-back guarantee • ⚡ Instant activation • 🔒 Secure payment</p>
            </div>
          </div>
        </div>
      )}

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        selectedPlan={selectedPlan}
        onAuthSuccess={handleAuthSuccess}
      />

      <CheckoutModal
        isOpen={checkoutModalOpen}
        onClose={() => setCheckoutModalOpen(false)}
        selectedPlan={selectedPlan}
        onSuccess={handleCheckoutSuccess}
      />

      <SuccessModal
        isOpen={successModalOpen}
        onClose={handleCloseAll}
        subscriptionData={subscriptionData}
      />
    </div>
  );
};

export default PremiumFeatures;