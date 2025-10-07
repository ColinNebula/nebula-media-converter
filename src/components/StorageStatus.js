import React from 'react';
import './StorageStatus.css';

const StorageStatus = ({ storageStats, isPremium, userSubscription }) => {
  if (!storageStats) return null;

  const { used = 0, limit = 0, files = 0, bandwidth = 0 } = storageStats;
  const usagePercentage = limit > 0 ? (used / limit) * 100 : 0;
  
  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getUsageColor = () => {
    if (usagePercentage >= 90) return '#ff4757'; // Red
    if (usagePercentage >= 75) return '#ffa502'; // Orange
    if (usagePercentage >= 50) return '#f1c40f'; // Yellow
    return '#00d4ff'; // Blue
  };

  const getTierInfo = () => {
    if (!isPremium) {
      return {
        name: 'Free',
        storageLimit: '1 GB',
        features: ['Basic conversion', '5 files/day', 'Standard quality']
      };
    }
    
    const planName = userSubscription?.subscription?.planName || 'Pro';
    if (planName === 'Business') {
      return {
        name: 'Business',
        storageLimit: '1 TB',
        features: ['Unlimited conversions', 'API access', 'Team collaboration']
      };
    }
    
    return {
      name: 'Pro',
      storageLimit: '100 GB',
      features: ['Unlimited conversions', 'Premium formats', 'Priority support']
    };
  };

  const tierInfo = getTierInfo();

  return (
    <div className="storage-status">
      <div className="storage-header">
        <div className="storage-title">
          <h3>📊 Storage Usage</h3>
          <span className={`tier-badge ${isPremium ? 'premium' : 'free'}`}>
            {tierInfo.name}
          </span>
        </div>
      </div>

      <div className="storage-metrics">
        <div className="storage-bar-container">
          <div className="storage-bar">
            <div 
              className="storage-fill" 
              style={{ 
                width: `${Math.min(usagePercentage, 100)}%`,
                backgroundColor: getUsageColor()
              }}
            />
          </div>
          <div className="storage-text">
            <span className="storage-used">{formatBytes(used)}</span>
            <span className="storage-limit">of {formatBytes(limit)}</span>
          </div>
        </div>

        <div className="storage-details">
          <div className="storage-item">
            <span className="storage-icon">📁</span>
            <div className="storage-info">
              <span className="storage-label">Files Stored</span>
              <span className="storage-value">{files.toLocaleString()}</span>
            </div>
          </div>
          
          <div className="storage-item">
            <span className="storage-icon">📈</span>
            <div className="storage-info">
              <span className="storage-label">Bandwidth Used</span>
              <span className="storage-value">{formatBytes(bandwidth)}</span>
            </div>
          </div>
          
          <div className="storage-item">
            <span className="storage-icon">⚡</span>
            <div className="storage-info">
              <span className="storage-label">Usage</span>
              <span className="storage-value">{usagePercentage.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </div>

      {usagePercentage >= 80 && (
        <div className={`storage-warning ${usagePercentage >= 95 ? 'critical' : ''}`}>
          <span className="warning-icon">⚠️</span>
          <div className="warning-content">
            <strong>
              {usagePercentage >= 95 ? 'Storage Almost Full!' : 'Storage Getting Full'}
            </strong>
            <p>
              {usagePercentage >= 95 
                ? 'You\'re running out of storage space. Consider upgrading your plan.'
                : 'You\'re using most of your storage. Consider cleaning up old files.'
              }
            </p>
            {!isPremium && (
              <button className="upgrade-storage-btn">
                Upgrade for More Storage
              </button>
            )}
          </div>
        </div>
      )}

      <div className="storage-management">
        <h4>📋 Storage Management</h4>
        <div className="management-actions">
          <button className="action-btn secondary">
            🗑️ Clean Temp Files
          </button>
          <button className="action-btn secondary">
            📦 Archive Old Files
          </button>
          <button className="action-btn secondary">
            📊 View Usage History
          </button>
        </div>
      </div>

      <div className="storage-lifecycle">
        <h4>🔄 File Lifecycle</h4>
        <div className="lifecycle-stages">
          <div className="lifecycle-stage active">
            <div className="stage-icon hot">🔥</div>
            <div className="stage-info">
              <span className="stage-name">Hot Storage</span>
              <span className="stage-desc">Recent files (7 days)</span>
            </div>
          </div>
          
          <div className="lifecycle-stage">
            <div className="stage-icon warm">🌡️</div>
            <div className="stage-info">
              <span className="stage-name">Warm Storage</span>
              <span className="stage-desc">Older files (30 days)</span>
            </div>
          </div>
          
          <div className="lifecycle-stage">
            <div className="stage-icon cold">❄️</div>
            <div className="stage-info">
              <span className="stage-name">Cold Storage</span>
              <span className="stage-desc">Archive (1 year)</span>
            </div>
          </div>
          
          <div className="lifecycle-stage">
            <div className="stage-icon archive">📦</div>
            <div className="stage-info">
              <span className="stage-name">Deep Archive</span>
              <span className="stage-desc">Long-term storage</span>
            </div>
          </div>
        </div>
      </div>

      <div className="storage-features">
        <h4>✨ {tierInfo.name} Features</h4>
        <ul className="features-list">
          {tierInfo.features.map((feature, index) => (
            <li key={index} className="feature-item">
              <span className="feature-check">✅</span>
              {feature}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default StorageStatus;