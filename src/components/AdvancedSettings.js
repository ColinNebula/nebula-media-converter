import React, { useState } from 'react';
import './AdvancedSettings.css';

const AdvancedSettings = ({ isPremium, settings, onSettingsChange }) => {
  const [activeTab, setActiveTab] = useState('quality');

  const qualityPresets = [
    { name: 'Ultra High', bitrate: '50M', resolution: '4K', description: 'Best quality, large file size' },
    { name: 'High', bitrate: '25M', resolution: '1080p', description: 'Excellent quality, moderate size' },
    { name: 'Medium', bitrate: '10M', resolution: '720p', description: 'Good quality, smaller size' },
    { name: 'Low', bitrate: '5M', resolution: '480p', description: 'Basic quality, smallest size' },
    { name: 'Custom', bitrate: 'custom', resolution: 'custom', description: 'Set your own parameters' }
  ];

  const devicePresets = [
    { name: 'iPhone 15 Pro', format: 'mp4', resolution: '1080p', description: 'Optimized for latest iPhone' },
    { name: 'Android Phone', format: 'mp4', resolution: '1080p', description: 'Universal Android compatibility' },
    { name: 'iPad', format: 'mp4', resolution: '1080p', description: 'Perfect for tablet viewing' },
    { name: 'Smart TV', format: 'mp4', resolution: '4K', description: 'Large screen optimization' },
    { name: 'YouTube', format: 'mp4', resolution: '1080p', description: 'YouTube upload ready' },
    { name: 'Instagram', format: 'mp4', resolution: '1080p', description: 'Square/story formats' },
    { name: 'TikTok', format: 'mp4', resolution: '1080p', description: 'Vertical video optimized' },
    { name: 'Web Streaming', format: 'webm', resolution: '720p', description: 'Fast web playback' }
  ];

  const audioSettings = [
    { name: 'Studio Quality', bitrate: '320kbps', sampleRate: '48kHz', description: 'Professional audio' },
    { name: 'High Quality', bitrate: '192kbps', sampleRate: '44.1kHz', description: 'CD quality' },
    { name: 'Standard', bitrate: '128kbps', sampleRate: '44.1kHz', description: 'Good for most uses' },
    { name: 'Podcast', bitrate: '64kbps', sampleRate: '22kHz', description: 'Speech optimized' }
  ];

  if (!isPremium) {
    return (
      <div className="advanced-settings locked">
        <div className="locked-overlay">
          <div className="lock-icon">🔒</div>
          <h3>Advanced Settings</h3>
          <p>Unlock premium features to access advanced conversion settings</p>
          <button className="upgrade-btn">Upgrade to Premium</button>
        </div>
      </div>
    );
  }

  return (
    <div className="advanced-settings">
      <div className="settings-header">
        <h3>⚙️ Advanced Settings</h3>
        <p>Fine-tune your conversion parameters</p>
      </div>

      <div className="settings-tabs">
        <button 
          className={`tab ${activeTab === 'quality' ? 'active' : ''}`}
          onClick={() => setActiveTab('quality')}
        >
          Quality
        </button>
        <button 
          className={`tab ${activeTab === 'devices' ? 'active' : ''}`}
          onClick={() => setActiveTab('devices')}
        >
          Devices
        </button>
        <button 
          className={`tab ${activeTab === 'audio' ? 'active' : ''}`}
          onClick={() => setActiveTab('audio')}
        >
          Audio
        </button>
        <button 
          className={`tab ${activeTab === 'filters' ? 'active' : ''}`}
          onClick={() => setActiveTab('filters')}
        >
          Filters
        </button>
      </div>

      <div className="settings-content">
        {activeTab === 'quality' && (
          <div className="quality-settings">
            <h4>Video Quality Presets</h4>
            <div className="presets-grid">
              {qualityPresets.map((preset, index) => (
                <div key={index} className="preset-card">
                  <h5>{preset.name}</h5>
                  <div className="preset-details">
                    <span>Bitrate: {preset.bitrate}</span>
                    <span>Resolution: {preset.resolution}</span>
                  </div>
                  <p>{preset.description}</p>
                  <button className="select-preset-btn">Select</button>
                </div>
              ))}
            </div>

            <div className="custom-settings">
              <h4>Custom Settings</h4>
              <div className="settings-row">
                <label>
                  Video Bitrate:
                  <input type="range" min="1" max="50" defaultValue="10" />
                  <span>10 Mbps</span>
                </label>
              </div>
              <div className="settings-row">
                <label>
                  Frame Rate:
                  <select>
                    <option>24 fps</option>
                    <option>30 fps</option>
                    <option>60 fps</option>
                  </select>
                </label>
              </div>
              <div className="settings-row">
                <label>
                  Codec:
                  <select>
                    <option>H.264</option>
                    <option>H.265 (HEVC)</option>
                    <option>VP9</option>
                    <option>AV1</option>
                  </select>
                </label>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'devices' && (
          <div className="device-settings">
            <h4>Device Optimization</h4>
            <div className="devices-grid">
              {devicePresets.map((device, index) => (
                <div key={index} className="device-card">
                  <h5>{device.name}</h5>
                  <div className="device-specs">
                    <span>Format: {device.format}</span>
                    <span>Resolution: {device.resolution}</span>
                  </div>
                  <p>{device.description}</p>
                  <button className="select-device-btn">Optimize</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'audio' && (
          <div className="audio-settings">
            <h4>Audio Enhancement</h4>
            <div className="audio-presets">
              {audioSettings.map((audio, index) => (
                <div key={index} className="audio-card">
                  <h5>{audio.name}</h5>
                  <div className="audio-specs">
                    <span>Bitrate: {audio.bitrate}</span>
                    <span>Sample Rate: {audio.sampleRate}</span>
                  </div>
                  <p>{audio.description}</p>
                  <button className="select-audio-btn">Apply</button>
                </div>
              ))}
            </div>

            <div className="audio-enhancements">
              <h4>Audio Enhancements</h4>
              <div className="enhancement-toggles">
                <label className="toggle">
                  <input type="checkbox" />
                  <span className="slider"></span>
                  Noise Reduction
                </label>
                <label className="toggle">
                  <input type="checkbox" />
                  <span className="slider"></span>
                  Volume Normalization
                </label>
                <label className="toggle">
                  <input type="checkbox" />
                  <span className="slider"></span>
                  Bass Boost
                </label>
                <label className="toggle">
                  <input type="checkbox" />
                  <span className="slider"></span>
                  Vocal Enhancement
                </label>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'filters' && (
          <div className="filter-settings">
            <h4>Video Filters & Effects</h4>
            <div className="filters-section">
              <div className="filter-group">
                <h5>Color Correction</h5>
                <div className="slider-group">
                  <label>
                    Brightness: <input type="range" min="-100" max="100" defaultValue="0" />
                  </label>
                  <label>
                    Contrast: <input type="range" min="-100" max="100" defaultValue="0" />
                  </label>
                  <label>
                    Saturation: <input type="range" min="-100" max="100" defaultValue="0" />
                  </label>
                </div>
              </div>

              <div className="filter-group">
                <h5>Video Effects</h5>
                <div className="effect-toggles">
                  <label className="toggle">
                    <input type="checkbox" />
                    <span className="slider"></span>
                    Stabilization
                  </label>
                  <label className="toggle">
                    <input type="checkbox" />
                    <span className="slider"></span>
                    Deinterlace
                  </label>
                  <label className="toggle">
                    <input type="checkbox" />
                    <span className="slider"></span>
                    Sharpen
                  </label>
                </div>
              </div>

              <div className="filter-group">
                <h5>Watermark</h5>
                <div className="watermark-settings">
                  <input type="file" accept="image/*" placeholder="Upload watermark" />
                  <select>
                    <option>Top Left</option>
                    <option>Top Right</option>
                    <option>Bottom Left</option>
                    <option>Bottom Right</option>
                    <option>Center</option>
                  </select>
                  <label>
                    Opacity: <input type="range" min="0" max="100" defaultValue="50" />
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdvancedSettings;