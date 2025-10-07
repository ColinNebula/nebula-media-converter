// File Lifecycle Manager - Handles automatic tiering and cleanup
import React, { useState, useEffect } from 'react';
import './FileLifecycleManager.css';

const FileLifecycleManager = ({ cloudStorage, userId, isPremium }) => {
  const [files, setFiles] = useState([]);
  const [lifecycle, setLifecycle] = useState({
    hot: { count: 0, size: 0 },
    warm: { count: 0, size: 0 },
    cold: { count: 0, size: 0 },
    archive: { count: 0, size: 0 }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [cleanupStats, setCleanupStats] = useState(null);

  useEffect(() => {
    if (userId) {
      loadFileLifecycleData();
    }
  }, [userId, cloudStorage]);

  const loadFileLifecycleData = async () => {
    setIsLoading(true);
    try {
      // Mock data - in real implementation, this would fetch from your API
      const mockFiles = [
        {
          id: '1',
          name: 'video_conversion_output.mp4',
          size: 25 * 1024 * 1024, // 25MB
          tier: 'hot',
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
          lastAccessed: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
          type: 'video',
          isTemporary: true
        },
        {
          id: '2',
          name: 'document_converted.pdf',
          size: 5 * 1024 * 1024, // 5MB
          tier: 'warm',
          createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
          lastAccessed: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
          type: 'document',
          isTemporary: false
        },
        {
          id: '3',
          name: 'old_audio_conversion.mp3',
          size: 8 * 1024 * 1024, // 8MB
          tier: 'cold',
          createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000), // 45 days ago
          lastAccessed: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000), // 20 days ago
          type: 'audio',
          isTemporary: false
        }
      ];

      setFiles(mockFiles);
      
      // Calculate lifecycle stats
      const stats = {
        hot: { count: 0, size: 0 },
        warm: { count: 0, size: 0 },
        cold: { count: 0, size: 0 },
        archive: { count: 0, size: 0 }
      };

      mockFiles.forEach(file => {
        stats[file.tier].count++;
        stats[file.tier].size += file.size;
      });

      setLifecycle(stats);
    } catch (error) {
      console.error('Failed to load lifecycle data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const performCleanup = async (tier = 'all') => {
    setIsLoading(true);
    try {
      let cleanedFiles = 0;
      let freedSpace = 0;

      if (tier === 'temporary' || tier === 'all') {
        // Clean temporary files older than 24 hours
        const tempFiles = files.filter(f => 
          f.isTemporary && 
          Date.now() - new Date(f.createdAt).getTime() > 24 * 60 * 60 * 1000
        );
        
        for (const file of tempFiles) {
          try {
            await cloudStorage.deleteFile(file.fileKey);
            cleanedFiles++;
            freedSpace += file.size;
          } catch (error) {
            console.warn(`Failed to delete ${file.name}:`, error);
          }
        }
      }

      if (tier === 'old' || tier === 'all') {
        // Archive files older than 90 days
        const oldFiles = files.filter(f => 
          !f.isTemporary && 
          Date.now() - new Date(f.createdAt).getTime() > 90 * 24 * 60 * 60 * 1000
        );
        
        for (const file of oldFiles) {
          try {
            await cloudStorage.archiveFile(file.fileKey);
            cleanedFiles++;
          } catch (error) {
            console.warn(`Failed to archive ${file.name}:`, error);
          }
        }
      }

      setCleanupStats({ cleanedFiles, freedSpace });
      await loadFileLifecycleData(); // Refresh data
      
    } catch (error) {
      console.error('Cleanup failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getTierColor = (tier) => {
    const colors = {
      hot: '#ff5733',
      warm: '#ffa500',
      cold: '#74b9ff',
      archive: '#9c88ff'
    };
    return colors[tier] || '#ccc';
  };

  const getTierInfo = (tier) => {
    const info = {
      hot: {
        name: 'Hot Storage',
        icon: '🔥',
        description: 'Recently accessed files (0-7 days)',
        cost: '$0.023/GB/month'
      },
      warm: {
        name: 'Warm Storage',
        icon: '🌡️',
        description: 'Occasionally accessed files (7-30 days)',
        cost: '$0.0125/GB/month'
      },
      cold: {
        name: 'Cold Storage',
        icon: '❄️',
        description: 'Rarely accessed files (30-365 days)',
        cost: '$0.004/GB/month'
      },
      archive: {
        name: 'Deep Archive',
        icon: '📦',
        description: 'Long-term storage (365+ days)',
        cost: '$0.00099/GB/month'
      }
    };
    return info[tier];
  };

  return (
    <div className="lifecycle-manager">
      <div className="lifecycle-header">
        <h3>🔄 File Lifecycle Management</h3>
        <p>Automatically optimize your storage costs with intelligent file tiering</p>
      </div>

      {cleanupStats && (
        <div className="cleanup-success">
          <span className="success-icon">✅</span>
          <div className="success-content">
            <strong>Cleanup Complete!</strong>
            <p>
              Cleaned {cleanupStats.cleanedFiles} files, 
              freed {formatBytes(cleanupStats.freedSpace)} of storage
            </p>
          </div>
          <button 
            className="dismiss-btn"
            onClick={() => setCleanupStats(null)}
          >
            ×
          </button>
        </div>
      )}

      <div className="lifecycle-overview">
        {Object.entries(lifecycle).map(([tier, stats]) => {
          const tierInfo = getTierInfo(tier);
          return (
            <div key={tier} className="tier-summary">
              <div className="tier-header">
                <span className="tier-icon">{tierInfo.icon}</span>
                <div className="tier-details">
                  <h4>{tierInfo.name}</h4>
                  <p>{tierInfo.description}</p>
                </div>
              </div>
              
              <div className="tier-stats">
                <div className="stat-item">
                  <span className="stat-label">Files</span>
                  <span className="stat-value">{stats.count}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Size</span>
                  <span className="stat-value">{formatBytes(stats.size)}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Cost</span>
                  <span className="stat-value">{tierInfo.cost}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="lifecycle-actions">
        <h4>🛠️ Storage Optimization</h4>
        <div className="action-buttons">
          <button 
            className="action-btn primary"
            onClick={() => performCleanup('temporary')}
            disabled={isLoading}
          >
            {isLoading ? '🔄 Cleaning...' : '🗑️ Clean Temp Files'}
          </button>
          
          <button 
            className="action-btn secondary"
            onClick={() => performCleanup('old')}
            disabled={isLoading}
          >
            {isLoading ? '🔄 Archiving...' : '📦 Archive Old Files'}
          </button>
          
          <button 
            className="action-btn secondary"
            onClick={() => performCleanup('all')}
            disabled={isLoading}
          >
            {isLoading ? '🔄 Optimizing...' : '⚡ Full Optimization'}
          </button>
        </div>
      </div>

      <div className="file-list">
        <h4>📁 Recent Files</h4>
        {isLoading ? (
          <div className="loading-files">
            <div className="loading-spinner"></div>
            <p>Loading files...</p>
          </div>
        ) : (
          <div className="files-table">
            {files.slice(0, 10).map(file => (
              <div key={file.id} className="file-row">
                <div className="file-info">
                  <div className="file-icon">
                    {file.type === 'video' ? '🎬' : 
                     file.type === 'audio' ? '🎵' : 
                     file.type === 'document' ? '📄' : '📁'}
                  </div>
                  <div className="file-details">
                    <span className="file-name">{file.name}</span>
                    <span className="file-size">{formatBytes(file.size)}</span>
                  </div>
                </div>
                
                <div className="file-metadata">
                  <span 
                    className="file-tier"
                    style={{ backgroundColor: getTierColor(file.tier) }}
                  >
                    {getTierInfo(file.tier).name}
                  </span>
                  <span className="file-date">
                    Created {formatDate(file.createdAt)}
                  </span>
                  <span className="file-accessed">
                    Last accessed {formatDate(file.lastAccessed)}
                  </span>
                </div>
                
                <div className="file-actions">
                  {file.isTemporary && (
                    <span className="temp-badge">Temporary</span>
                  )}
                  <button className="file-action-btn">⬇️</button>
                  <button className="file-action-btn">🗑️</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="lifecycle-rules">
        <h4>📋 Automatic Lifecycle Rules</h4>
        <div className="rules-list">
          <div className="rule-item">
            <span className="rule-icon">🔥→🌡️</span>
            <div className="rule-content">
              <strong>Hot to Warm</strong>
              <p>Files automatically move to warm storage after 7 days</p>
            </div>
          </div>
          
          <div className="rule-item">
            <span className="rule-icon">🌡️→❄️</span>
            <div className="rule-content">
              <strong>Warm to Cold</strong>
              <p>Files move to cold storage after 30 days of no access</p>
            </div>
          </div>
          
          <div className="rule-item">
            <span className="rule-icon">❄️→📦</span>
            <div className="rule-content">
              <strong>Cold to Archive</strong>
              <p>Files archived after 365 days for long-term storage</p>
            </div>
          </div>
          
          <div className="rule-item">
            <span className="rule-icon">🗑️</span>
            <div className="rule-content">
              <strong>Temporary Cleanup</strong>
              <p>Temporary files automatically deleted after 24 hours</p>
            </div>
          </div>
        </div>
      </div>

      <div className="cost-savings">
        <h4>💰 Cost Savings</h4>
        <div className="savings-stats">
          <div className="savings-item">
            <span className="savings-label">Monthly Storage Cost</span>
            <span className="savings-value">
              ${((lifecycle.hot.size * 0.023 + 
                  lifecycle.warm.size * 0.0125 + 
                  lifecycle.cold.size * 0.004 + 
                  lifecycle.archive.size * 0.00099) / (1024 * 1024 * 1024)).toFixed(2)}
            </span>
          </div>
          
          <div className="savings-item">
            <span className="savings-label">Savings vs Hot Storage</span>
            <span className="savings-value savings-positive">
              ${(((lifecycle.warm.size + lifecycle.cold.size + lifecycle.archive.size) * 0.023 - 
                  (lifecycle.warm.size * 0.0125 + lifecycle.cold.size * 0.004 + lifecycle.archive.size * 0.00099)) / (1024 * 1024 * 1024)).toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileLifecycleManager;