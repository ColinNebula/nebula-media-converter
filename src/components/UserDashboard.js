import React, { useState, useEffect } from 'react';
import './UserDashboard.css';
import userService from '../services/UserService';

const UserDashboard = ({ onClose }) => {
  const [userInfo, setUserInfo] = useState(null);
  const [usageStats, setUsageStats] = useState(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = () => {
    const info = userService.getUserInfo();
    const stats = userService.getUsageStats();
    setUserInfo(info);
    setUsageStats(stats);
  };

  const handleLogout = () => {
    userService.logout();
    window.location.reload();
  };

  if (!userInfo || !usageStats) {
    return <div className="user-dashboard-loading">Loading...</div>;
  }

  return (
    <div className="user-dashboard-overlay" onClick={onClose}>
      <div className="user-dashboard-card" onClick={(e) => e.stopPropagation()}>
        <button className="close-dashboard" onClick={onClose}>✕</button>

        <div className="dashboard-header">
          <div className="user-avatar">
            {userInfo.name.charAt(0).toUpperCase()}
          </div>
          <div className="user-info">
            <h2>{userInfo.name}</h2>
            <p className="user-email">{userInfo.email || 'Guest User'}</p>
            <span className="account-badge">{usageStats.accountType}</span>
          </div>
        </div>

        <div className="usage-stats">
          <div className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <label>Conversions Today</label>
              <div className="stat-value">
                {usageStats.conversionsToday} / {usageStats.conversionsLimit}
              </div>
              <div className="stat-bar">
                <div 
                  className="stat-bar-fill"
                  style={{ width: `${usageStats.conversionsPercentage}%` }}
                ></div>
              </div>
              <span className="stat-remaining">
                {usageStats.conversionsRemaining} remaining
              </span>
            </div>
          </div>

          {userInfo.type !== 'guest' && (
            <div className="stat-card">
              <div className="stat-icon">💾</div>
              <div className="stat-content">
                <label>Saved Presets</label>
                <div className="stat-value">
                  {usageStats.savedPresets} / {usageStats.presetsLimit}
                </div>
                <div className="stat-bar">
                  <div 
                    className="stat-bar-fill presets"
                    style={{ width: `${usageStats.presetsPercentage}%` }}
                  ></div>
                </div>
                <span className="stat-remaining">
                  {usageStats.presetsRemaining} available
                </span>
              </div>
            </div>
          )}

          <div className="stat-card">
            <div className="stat-icon">📁</div>
            <div className="stat-content">
              <label>Max File Size</label>
              <div className="stat-value">{usageStats.maxFileSizeMB}MB</div>
              <span className="stat-description">
                {userInfo.type === 'guest' 
                  ? 'Sign up for 500MB' 
                  : 'Upload large files'
                }
              </span>
            </div>
          </div>
        </div>

        <div className="features-list">
          <h3>Your Features</h3>
          <div className="features-grid">
            <div className="feature-item active">
              <span className="feature-check">✓</span>
              <span>All formats supported</span>
            </div>
            <div className="feature-item active">
              <span className="feature-check">✓</span>
              <span>No watermarks</span>
            </div>
            <div className="feature-item active">
              <span className="feature-check">✓</span>
              <span>Local processing</span>
            </div>
            <div className="feature-item active">
              <span className="feature-check">✓</span>
              <span>Offline mode</span>
            </div>
            
            {userInfo.type !== 'guest' && (
              <>
                <div className="feature-item active">
                  <span className="feature-check">✓</span>
                  <span>Advanced settings</span>
                </div>
                <div className="feature-item active">
                  <span className="feature-check">✓</span>
                  <span>Batch processing</span>
                </div>
                <div className="feature-item active">
                  <span className="feature-check">✓</span>
                  <span>Custom presets</span>
                </div>
                <div className="feature-item active">
                  <span className="feature-check">✓</span>
                  <span>30-day history</span>
                </div>
              </>
            )}

            {userInfo.type === 'guest' && (
              <>
                <div className="feature-item locked">
                  <span className="feature-lock">🔒</span>
                  <span>Advanced settings</span>
                </div>
                <div className="feature-item locked">
                  <span className="feature-lock">🔒</span>
                  <span>Batch processing</span>
                </div>
                <div className="feature-item locked">
                  <span className="feature-lock">🔒</span>
                  <span>Custom presets</span>
                </div>
                <div className="feature-item locked">
                  <span className="feature-lock">🔒</span>
                  <span>30-day history</span>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="dashboard-actions">
          <button 
            className="donate-btn-dashboard"
            onClick={() => {
              onClose();
              window.dispatchEvent(new CustomEvent('open-donation-modal'));
            }}
          >
            💜 Support Development
          </button>
          
          {userInfo.type !== 'guest' ? (
            <button 
              className="logout-btn"
              onClick={() => setShowLogoutConfirm(true)}
            >
              Logout
            </button>
          ) : (
            <button 
              className="signup-btn-dashboard"
              onClick={() => {
                onClose();
                // Trigger signup modal
                window.dispatchEvent(new CustomEvent('open-auth-modal'));
              }}
            >
              🚀 Sign Up Free
            </button>
          )}
        </div>

        {showLogoutConfirm && (
          <div className="logout-confirm">
            <p>Are you sure you want to logout?</p>
            <div className="logout-confirm-actions">
              <button onClick={handleLogout} className="confirm-yes">Yes, Logout</button>
              <button onClick={() => setShowLogoutConfirm(false)} className="confirm-no">Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserDashboard;
