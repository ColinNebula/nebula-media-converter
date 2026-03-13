import React, { useState, useEffect } from 'react';
import './DesktopFeatures.css';
import UserSession from './UserSession';

const DesktopFeatures = ({ currentUser, onLogout }) => {
  const [platformInfo, setPlatformInfo] = useState(null);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    // Check if running in Electron
    if (window.electron) {
      setIsDesktop(true);
      loadPlatformInfo();
    }
  }, []);

  const loadPlatformInfo = async () => {
    try {
      const info = await window.electron.checkNativeConverter();
      const systemInfo = await window.electron.getSystemInfo();
      setPlatformInfo({ ...info, ...systemInfo });
    } catch (error) {
      console.error('Failed to load platform info:', error);
      setPlatformInfo({
        available: false,
        message: 'Using FFmpeg.wasm (web fallback mode)'
      });
    }
  };

  const openFileDialog = async () => {
    if (!window.electron) return;
    
    try {
      const files = await window.electron.selectFiles();
      console.log('Selected files:', files);
      alert(`Selected ${files.length} file(s):\n${files.join('\n')}`);
    } catch (error) {
      console.error('File dialog error:', error);
    }
  };

  if (!isDesktop) {
    return (
      <div className="desktop-features web-mode">
        <div className="info-card">
          <h3>🌐 Web Version</h3>
          <p>Running in browser mode with FFmpeg.wasm</p>
          <div className="tip">
            💡 <strong>Tip:</strong> For 10-20x faster conversions with GPU support,
            download the desktop app!
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="desktop-features">
      <div className="desktop-header">
        <h2>🖥️ Desktop App - Enhanced Performance</h2>
        <div className="platform-badge">
          {window.electron.platform === 'win32' && '🪟 Windows'}
          {window.electron.platform === 'darwin' && '🍎 macOS'}
          {window.electron.platform === 'linux' && '🐧 Linux'}
        </div>
      </div>

      <div className="features-grid">
        <div className="feature-card">
          <div className="feature-icon">⚡</div>
          <h3>Native Performance</h3>
          <p>10-20x faster conversions compared to web version</p>
          <div className="feature-status">
            {platformInfo?.available ? '✅ Active' : '⚠️ Using Fallback'}
          </div>
        </div>

        <div className="feature-card">
          <div className="feature-icon">🎮</div>
          <h3>GPU Acceleration</h3>
          <p>Hardware-accelerated encoding & decoding</p>
          <div className="feature-status">
            {platformInfo?.gpuAcceleration ? '✅ Enabled' : '❌ Not Available'}
          </div>
          {platformInfo?.gpuInfo && (
            <div className="gpu-info">{platformInfo.gpuInfo}</div>
          )}
        </div>

        <div className="feature-card">
          <div className="feature-icon">💾</div>
          <h3>Unlimited File Sizes</h3>
          <p>No 500MB browser limit - process any size file</p>
          <div className="feature-status">✅ Enabled</div>
        </div>

        <div className="feature-card">
          <div className="feature-icon">🔄</div>
          <h3>Batch Processing</h3>
          <p>Convert multiple files simultaneously</p>
          <div className="feature-status">✅ Enabled</div>
        </div>

        <div className="feature-card">
          <div className="feature-icon">📁</div>
          <h3>File System Access</h3>
          <p>Direct file access without browser restrictions</p>
          <button className="action-button" onClick={openFileDialog}>
            📂 Open Files
          </button>
        </div>

        <div className="feature-card">
          <div className="feature-icon">🔒</div>
          <h3>Offline Mode</h3>
          <p>Works without internet connection</p>
          <div className="feature-status">✅ Always Available</div>
        </div>
      </div>

      {platformInfo && (
        <div className="system-info-panel">
          <h3>📊 System Information</h3>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Platform:</span>
              <span className="info-value">{window.electron.platform}</span>
            </div>
            {platformInfo.cpuCores && (
              <div className="info-item">
                <span className="info-label">CPU Cores:</span>
                <span className="info-value">{platformInfo.cpuCores}</span>
              </div>
            )}
            {platformInfo.ffmpegVersion && (
              <div className="info-item">
                <span className="info-label">FFmpeg Version:</span>
                <span className="info-value">{platformInfo.ffmpegVersion}</span>
              </div>
            )}
            <div className="info-item">
              <span className="info-label">Converter Mode:</span>
              <span className="info-value">
                {platformInfo.available ? 'Native C++' : 'FFmpeg.wasm (Fallback)'}
              </span>
            </div>
          </div>
          
          {platformInfo.supportedFormats && (
            <div className="formats-section">
              <h4>Supported Formats ({platformInfo.supportedFormats.length}):</h4>
              <div className="formats-list">
                {platformInfo.supportedFormats.slice(0, 10).map(format => (
                  <span key={format} className="format-badge">{format}</span>
                ))}
                {platformInfo.supportedFormats.length > 10 && (
                  <span className="format-badge">+{platformInfo.supportedFormats.length - 10} more</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="desktop-advantages">
        <h3>🚀 Desktop App Advantages</h3>
        <ul>
          <li>✅ <strong>10-20x Faster:</strong> Native C++ processing vs JavaScript</li>
          <li>✅ <strong>GPU Acceleration:</strong> Use NVIDIA/AMD/Intel hardware encoding</li>
          <li>✅ <strong>No File Size Limits:</strong> Process multi-GB files easily</li>
          <li>✅ <strong>Batch Processing:</strong> Convert 100+ files simultaneously</li>
          <li>✅ <strong>Better Memory:</strong> 70% less RAM usage than browser</li>
          <li>✅ <strong>Offline First:</strong> No internet required after installation</li>
          <li>✅ <strong>System Integration:</strong> Native file dialogs and notifications</li>
        </ul>
      </div>

      {/* User Session Info */}
      {currentUser && (
        <UserSession currentUser={currentUser} onLogout={onLogout} />
      )}
    </div>
  );
};

export default DesktopFeatures;
