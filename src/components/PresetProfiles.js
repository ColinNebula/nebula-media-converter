import React, { useState, useEffect } from 'react';
import './PresetProfiles.css';

// Default preset profiles
const DEFAULT_PRESETS = {
  web: {
    id: 'web',
    name: 'For Web',
    description: 'Optimized for web delivery with balanced quality and file size',
    icon: '🌐',
    category: 'built-in',
    settings: {
      video: {
        codec: 'h264',
        quality: 'medium',
        bitrate: '2000k',
        resolution: '1280x720',
        fps: 30,
        preset: 'medium'
      },
      audio: {
        codec: 'aac',
        bitrate: '128k',
        sampleRate: 44100,
        channels: 2
      },
      image: {
        quality: 75,
        maxWidth: 1920,
        maxHeight: 1080,
        format: 'webp',
        progressive: true
      },
      document: {
        quality: 'screen',
        compress: true,
        optimizeImages: true
      }
    }
  },
  email: {
    id: 'email',
    name: 'For Email',
    description: 'Heavily compressed for email attachments under 10MB',
    icon: '📧',
    category: 'built-in',
    settings: {
      video: {
        codec: 'h264',
        quality: 'low',
        bitrate: '500k',
        resolution: '640x360',
        fps: 24,
        preset: 'fast'
      },
      audio: {
        codec: 'aac',
        bitrate: '64k',
        sampleRate: 22050,
        channels: 1
      },
      image: {
        quality: 50,
        maxWidth: 800,
        maxHeight: 600,
        format: 'jpeg',
        progressive: true
      },
      document: {
        quality: 'ebook',
        compress: true,
        optimizeImages: true,
        grayscale: true
      }
    }
  },
  archive: {
    id: 'archive',
    name: 'For Archive',
    description: 'Maximum quality for long-term storage and archival',
    icon: '🗄️',
    category: 'built-in',
    settings: {
      video: {
        codec: 'prores',
        quality: 'high',
        bitrate: '50000k',
        resolution: 'original',
        fps: 'original',
        preset: 'slow'
      },
      audio: {
        codec: 'flac',
        bitrate: 'lossless',
        sampleRate: 48000,
        channels: 'original'
      },
      image: {
        quality: 100,
        maxWidth: 'original',
        maxHeight: 'original',
        format: 'png',
        progressive: false
      },
      document: {
        quality: 'prepress',
        compress: false,
        optimizeImages: false
      }
    }
  },
  social: {
    id: 'social',
    name: 'For Social Media',
    description: 'Optimized for Instagram, TikTok, and other platforms',
    icon: '📱',
    category: 'built-in',
    settings: {
      video: {
        codec: 'h264',
        quality: 'high',
        bitrate: '8000k',
        resolution: '1080x1920',
        fps: 30,
        preset: 'medium'
      },
      audio: {
        codec: 'aac',
        bitrate: '192k',
        sampleRate: 48000,
        channels: 2
      },
      image: {
        quality: 90,
        maxWidth: 1080,
        maxHeight: 1350,
        format: 'jpeg',
        progressive: true
      },
      document: {
        quality: 'screen',
        compress: true,
        optimizeImages: true
      }
    }
  },
  print: {
    id: 'print',
    name: 'For Print',
    description: 'High resolution output suitable for professional printing',
    icon: '🖨️',
    category: 'built-in',
    settings: {
      video: {
        codec: 'prores',
        quality: 'high',
        bitrate: '100000k',
        resolution: '3840x2160',
        fps: 'original',
        preset: 'slow'
      },
      audio: {
        codec: 'wav',
        bitrate: 'lossless',
        sampleRate: 96000,
        channels: 'original'
      },
      image: {
        quality: 100,
        maxWidth: 'original',
        maxHeight: 'original',
        format: 'tiff',
        dpi: 300,
        colorSpace: 'CMYK'
      },
      document: {
        quality: 'prepress',
        compress: false,
        optimizeImages: false,
        embedFonts: true
      }
    }
  }
};

const PresetProfiles = ({ 
  onApplyPreset, 
  currentSettings,
  fileType = 'video',
  onClose,
  isPremium = false 
}) => {
  const [presets, setPresets] = useState(DEFAULT_PRESETS);
  const [customPresets, setCustomPresets] = useState({});
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetDescription, setNewPresetDescription] = useState('');
  const [editingPreset, setEditingPreset] = useState(null);
  const [showSettings, setShowSettings] = useState(false);

  // Load custom presets from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('nebula_custom_presets');
    if (saved) {
      try {
        setCustomPresets(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load custom presets:', e);
      }
    }
  }, []);

  // Save custom presets to localStorage
  const saveCustomPresets = (presets) => {
    localStorage.setItem('nebula_custom_presets', JSON.stringify(presets));
    setCustomPresets(presets);
  };

  // Apply a preset
  const handleApplyPreset = (preset) => {
    setSelectedPreset(preset.id);
    const settings = preset.settings[fileType] || preset.settings.video;
    onApplyPreset?.(settings, preset);
  };

  // Create new custom preset
  const handleCreatePreset = () => {
    if (!newPresetName.trim()) return;
    
    const id = `custom_${Date.now()}`;
    const newPreset = {
      id,
      name: newPresetName,
      description: newPresetDescription || 'Custom preset',
      icon: '⚙️',
      category: 'custom',
      settings: {
        video: currentSettings?.video || DEFAULT_PRESETS.web.settings.video,
        audio: currentSettings?.audio || DEFAULT_PRESETS.web.settings.audio,
        image: currentSettings?.image || DEFAULT_PRESETS.web.settings.image,
        document: currentSettings?.document || DEFAULT_PRESETS.web.settings.document
      },
      createdAt: new Date().toISOString()
    };

    const updated = { ...customPresets, [id]: newPreset };
    saveCustomPresets(updated);
    
    setNewPresetName('');
    setNewPresetDescription('');
    setIsCreating(false);
  };

  // Delete custom preset
  const handleDeletePreset = (presetId) => {
    const updated = { ...customPresets };
    delete updated[presetId];
    saveCustomPresets(updated);
  };

  // Edit custom preset
  const handleSaveEdit = () => {
    if (!editingPreset) return;
    
    const updated = {
      ...customPresets,
      [editingPreset.id]: {
        ...editingPreset,
        updatedAt: new Date().toISOString()
      }
    };
    saveCustomPresets(updated);
    setEditingPreset(null);
  };

  // Export presets
  const handleExportPresets = () => {
    const data = JSON.stringify(customPresets, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nebula-presets.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import presets
  const handleImportPresets = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        const merged = { ...customPresets, ...imported };
        saveCustomPresets(merged);
      } catch (err) {
        console.error('Failed to import presets:', err);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const allPresets = { ...presets, ...customPresets };
  const builtInPresets = Object.values(allPresets).filter(p => p.category === 'built-in');
  const userPresets = Object.values(allPresets).filter(p => p.category === 'custom');

  return (
    <div className="preset-profiles-overlay" onClick={onClose}>
      <div className="preset-profiles-modal" onClick={e => e.stopPropagation()}>
        <div className="preset-header">
          <h2>📋 Conversion Presets</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="preset-content">
          {/* Built-in Presets */}
          <div className="preset-section">
            <h3>Built-in Presets</h3>
            <div className="preset-grid">
              {builtInPresets.map(preset => (
                <div
                  key={preset.id}
                  className={`preset-card ${selectedPreset === preset.id ? 'selected' : ''}`}
                  onClick={() => handleApplyPreset(preset)}
                >
                  <div className="preset-icon">{preset.icon}</div>
                  <div className="preset-info">
                    <h4>{preset.name}</h4>
                    <p>{preset.description}</p>
                  </div>
                  {selectedPreset === preset.id && (
                    <div className="selected-indicator">✓</div>
                  )}
                  <button
                    className="preview-settings-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowSettings(showSettings === preset.id ? null : preset.id);
                    }}
                  >
                    {showSettings === preset.id ? '▼' : '▶'}
                  </button>
                  {showSettings === preset.id && (
                    <div className="preset-settings-preview">
                      <h5>Settings for {fileType}:</h5>
                      <pre>{JSON.stringify(preset.settings[fileType], null, 2)}</pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Custom Presets */}
          <div className="preset-section">
            <div className="section-header">
              <h3>Custom Presets</h3>
              <div className="section-actions">
                <button 
                  className="action-btn small"
                  onClick={() => setIsCreating(true)}
                  disabled={!isPremium}
                >
                  + New
                </button>
                <button 
                  className="action-btn small secondary"
                  onClick={handleExportPresets}
                  disabled={Object.keys(customPresets).length === 0}
                >
                  Export
                </button>
                <label className="action-btn small secondary import-btn">
                  Import
                  <input 
                    type="file" 
                    accept=".json" 
                    onChange={handleImportPresets}
                    hidden
                  />
                </label>
              </div>
            </div>

            {!isPremium && (
              <div className="premium-notice">
                <span>⭐</span>
                <p>Custom presets are a premium feature. Upgrade to create and save your own presets.</p>
              </div>
            )}

            {userPresets.length === 0 ? (
              <div className="empty-presets">
                <span>📝</span>
                <p>No custom presets yet. Create one to save your preferred settings!</p>
              </div>
            ) : (
              <div className="preset-grid">
                {userPresets.map(preset => (
                  <div
                    key={preset.id}
                    className={`preset-card custom ${selectedPreset === preset.id ? 'selected' : ''}`}
                    onClick={() => handleApplyPreset(preset)}
                  >
                    <div className="preset-icon">{preset.icon}</div>
                    <div className="preset-info">
                      <h4>{preset.name}</h4>
                      <p>{preset.description}</p>
                    </div>
                    {selectedPreset === preset.id && (
                      <div className="selected-indicator">✓</div>
                    )}
                    <div className="preset-actions">
                      <button
                        className="edit-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingPreset(preset);
                        }}
                      >
                        ✏️
                      </button>
                      <button
                        className="delete-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePreset(preset.id);
                        }}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Create Preset Modal */}
        {isCreating && (
          <div className="create-preset-form">
            <h3>Create New Preset</h3>
            <div className="form-group">
              <label>Preset Name</label>
              <input
                type="text"
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
                placeholder="My Custom Preset"
                autoFocus
              />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea
                value={newPresetDescription}
                onChange={(e) => setNewPresetDescription(e.target.value)}
                placeholder="Describe your preset settings..."
                rows={2}
              />
            </div>
            <p className="form-hint">
              This preset will save your current conversion settings.
            </p>
            <div className="form-actions">
              <button 
                className="cancel-btn"
                onClick={() => setIsCreating(false)}
              >
                Cancel
              </button>
              <button 
                className="save-btn"
                onClick={handleCreatePreset}
                disabled={!newPresetName.trim()}
              >
                Create Preset
              </button>
            </div>
          </div>
        )}

        {/* Edit Preset Modal */}
        {editingPreset && (
          <div className="edit-preset-form">
            <h3>Edit Preset</h3>
            <div className="form-group">
              <label>Preset Name</label>
              <input
                type="text"
                value={editingPreset.name}
                onChange={(e) => setEditingPreset({ ...editingPreset, name: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea
                value={editingPreset.description}
                onChange={(e) => setEditingPreset({ ...editingPreset, description: e.target.value })}
                rows={2}
              />
            </div>
            <div className="form-group">
              <label>Icon</label>
              <div className="icon-picker">
                {['⚙️', '🎬', '🎵', '📷', '📁', '🔧', '💎', '🚀', '⭐', '🎨'].map(icon => (
                  <button
                    key={icon}
                    className={`icon-option ${editingPreset.icon === icon ? 'selected' : ''}`}
                    onClick={() => setEditingPreset({ ...editingPreset, icon })}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-actions">
              <button 
                className="cancel-btn"
                onClick={() => setEditingPreset(null)}
              >
                Cancel
              </button>
              <button 
                className="save-btn"
                onClick={handleSaveEdit}
              >
                Save Changes
              </button>
            </div>
          </div>
        )}

        <div className="preset-footer">
          <button className="close-footer-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PresetProfiles;
