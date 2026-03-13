import React, { useState, useEffect } from 'react';
import './SignupPrompt.css';
import userService from '../services/UserService';

const SignupPrompt = ({ onSignup, onDismiss, trigger }) => {
  const [benefits] = useState(userService.getSignupBenefits());
  const [showDetails, setShowDetails] = useState(false);

  // Get contextual message based on trigger
  const getPromptMessage = () => {
    switch (trigger) {
      case 'file-size':
        return {
          icon: '📁',
          title: 'File Too Large',
          message: 'Sign up for free to upload files up to 500MB!',
          highlight: 'guest'
        };
      case 'daily-limit':
        return {
          icon: '📊',
          title: 'Daily Limit Reached',
          message: 'Free accounts get 20 conversions per day instead of 5!',
          highlight: 'free'
        };
      case 'advanced-settings':
        return {
          icon: '⚙️',
          title: 'Advanced Settings',
          message: 'Sign up to unlock advanced conversion settings!',
          highlight: 'free'
        };
      case 'presets':
        return {
          icon: '💾',
          title: 'Save Your Presets',
          message: 'Create a free account to save up to 5 custom presets!',
          highlight: 'free'
        };
      case 'history':
        return {
          icon: '📜',
          title: 'Keep Your History',
          message: 'Free accounts keep 30 days of conversion history!',
          highlight: 'free'
        };
      default:
        return {
          icon: '🚀',
          title: 'Unlock More Features',
          message: 'Sign up for free to get 4x more conversions and bigger files!',
          highlight: 'both'
        };
    }
  };

  const prompt = getPromptMessage();

  return (
    <div className="signup-prompt-overlay" onClick={onDismiss}>
      <div className="signup-prompt-card" onClick={(e) => e.stopPropagation()}>
        <button className="close-prompt" onClick={onDismiss}>✕</button>
        
        <div className="prompt-header">
          <span className="prompt-icon">{prompt.icon}</span>
          <h2>{prompt.title}</h2>
          <p className="prompt-message">{prompt.message}</p>
        </div>

        <div className="benefits-preview">
          {benefits.slice(0, 3).map((benefit, index) => (
            <div key={index} className="benefit-item">
              <span className="benefit-icon">{benefit.icon}</span>
              <div className="benefit-content">
                <strong>{benefit.title}</strong>
                <div className="benefit-comparison">
                  <span className="guest-value">Guest: {benefit.guest}</span>
                  <span className="arrow">→</span>
                  <span className="free-value">Free: {benefit.free}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {showDetails && (
          <div className="all-benefits">
            <h3>All Free Account Benefits</h3>
            <div className="benefits-grid">
              {benefits.map((benefit, index) => (
                <div key={index} className="benefit-detail">
                  <span className="benefit-icon">{benefit.icon}</span>
                  <strong>{benefit.title}</strong>
                  <span className="improvement-badge">{benefit.improvement}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="prompt-actions">
          <button className="signup-btn primary" onClick={onSignup}>
            🚀 Sign Up Free
          </button>
          <button className="show-more-btn" onClick={() => setShowDetails(!showDetails)}>
            {showDetails ? 'Show Less' : `See All ${benefits.length} Benefits`}
          </button>
        </div>

        <div className="prompt-footer">
          <p>✓ 100% Free Forever • No Credit Card • 30 Second Setup</p>
        </div>
      </div>
    </div>
  );
};

export default SignupPrompt;
