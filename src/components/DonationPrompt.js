import React, { useState, useEffect } from 'react';
import './DonationPrompt.css';
import donationService from '../services/DonationService';

const DonationPrompt = ({ onClose }) => {
  const [conversions] = useState(donationService.getConversionCount());
  const [thankYou] = useState(donationService.getThankYouMessage(conversions));
  const [impacts] = useState(donationService.getImpactMessages());
  const [showImpact, setShowImpact] = useState(false);

  useEffect(() => {
    donationService.markPromptShown();
  }, []);

  const handleDonateClick = (platform) => {
    donationService.trackDonationClick(platform);
    window.open(donationService.platforms[platform].url, '_blank');
  };

  const handleDismiss = () => {
    donationService.dismissPrompt();
    onClose();
  };

  const handleDismissPermanently = () => {
    if (window.confirm('Are you sure? We won\'t ask again. You can still donate anytime from Settings.')) {
      donationService.dismissPermanently();
      onClose();
    }
  };

  return (
    <div className="donation-prompt-overlay" onClick={handleDismiss}>
      <div className="donation-prompt-card" onClick={(e) => e.stopPropagation()}>
        <button className="close-donation" onClick={handleDismiss}>✕</button>

        <div className="donation-header">
          <div className="donation-icon">💜</div>
          <h2>{thankYou.title}</h2>
          <p className="donation-message">{thankYou.message}</p>
        </div>

        <div className="donation-stats">
          <div className="stat-badge">
            <span className="stat-number">{conversions}</span>
            <span className="stat-label">Conversions</span>
          </div>
          <div className="stat-badge">
            <span className="stat-number">100%</span>
            <span className="stat-label">Free</span>
          </div>
          <div className="stat-badge">
            <span className="stat-number">0</span>
            <span className="stat-label">Ads</span>
          </div>
        </div>

        <div className="donation-platforms">
          <h3>Support Development</h3>
          <div className="platform-buttons">
            <button
              className="platform-btn paypal"
              onClick={() => handleDonateClick('paypal')}
            >
              <span className="platform-icon">{donationService.platforms.paypal.icon}</span>
              <div className="platform-info">
                <strong>{donationService.platforms.paypal.name}</strong>
                <span>{donationService.platforms.paypal.description}</span>
              </div>
            </button>

            <button
              className="platform-btn kofi"
              onClick={() => handleDonateClick('kofi')}
            >
              <span className="platform-icon">{donationService.platforms.kofi.icon}</span>
              <div className="platform-info">
                <strong>{donationService.platforms.kofi.name}</strong>
                <span>{donationService.platforms.kofi.description}</span>
              </div>
            </button>

            <button
              className="platform-btn github"
              onClick={() => handleDonateClick('github')}
            >
              <span className="platform-icon">{donationService.platforms.github.icon}</span>
              <div className="platform-info">
                <strong>{donationService.platforms.github.name}</strong>
                <span>{donationService.platforms.github.description}</span>
              </div>
            </button>
          </div>
        </div>

        {showImpact && (
          <div className="donation-impact">
            <h3>Your Donation Helps:</h3>
            <div className="impact-grid">
              {impacts.map((impact, index) => (
                <div key={index} className="impact-item">
                  <span className="impact-icon">{impact.icon}</span>
                  <div className="impact-content">
                    <strong>{impact.title}</strong>
                    <p>{impact.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="donation-actions">
          <button
            className="show-impact-btn"
            onClick={() => setShowImpact(!showImpact)}
          >
            {showImpact ? '▲ Hide Impact' : '▼ Where Your Donation Goes'}
          </button>
        </div>

        <div className="donation-footer">
          <p className="donation-note">
            💙 Nebula is free forever. Donations are optional but help us improve!
          </p>
          <button
            className="dismiss-forever-btn"
            onClick={handleDismissPermanently}
          >
            Don't show again
          </button>
        </div>
      </div>
    </div>
  );
};

export default DonationPrompt;
