import React, { useState, useEffect, useCallback } from 'react';
import './MetadataEditor.css';

// EXIF data keys we can edit for images
const EDITABLE_IMAGE_FIELDS = [
  { key: 'title', label: 'Title', type: 'text' },
  { key: 'description', label: 'Description', type: 'textarea' },
  { key: 'artist', label: 'Artist/Author', type: 'text' },
  { key: 'copyright', label: 'Copyright', type: 'text' },
  { key: 'dateTime', label: 'Date Taken', type: 'datetime-local' },
  { key: 'gpsLatitude', label: 'GPS Latitude', type: 'number' },
  { key: 'gpsLongitude', label: 'GPS Longitude', type: 'number' },
  { key: 'software', label: 'Software', type: 'text' },
  { key: 'make', label: 'Camera Make', type: 'text' },
  { key: 'model', label: 'Camera Model', type: 'text' }
];

// ID3 tags for audio files
const EDITABLE_AUDIO_FIELDS = [
  { key: 'title', label: 'Title', type: 'text' },
  { key: 'artist', label: 'Artist', type: 'text' },
  { key: 'album', label: 'Album', type: 'text' },
  { key: 'year', label: 'Year', type: 'number' },
  { key: 'track', label: 'Track Number', type: 'text' },
  { key: 'genre', label: 'Genre', type: 'select', options: [
    'Pop', 'Rock', 'Jazz', 'Classical', 'Hip-Hop', 'Electronic', 
    'Country', 'R&B', 'Blues', 'Folk', 'Metal', 'Punk', 'Indie', 
    'Alternative', 'Soul', 'Funk', 'Reggae', 'Latin', 'World', 'Other'
  ]},
  { key: 'composer', label: 'Composer', type: 'text' },
  { key: 'albumArtist', label: 'Album Artist', type: 'text' },
  { key: 'discNumber', label: 'Disc Number', type: 'text' },
  { key: 'comment', label: 'Comment', type: 'textarea' },
  { key: 'lyrics', label: 'Lyrics', type: 'textarea' }
];

// PDF metadata fields
const EDITABLE_PDF_FIELDS = [
  { key: 'title', label: 'Title', type: 'text' },
  { key: 'author', label: 'Author', type: 'text' },
  { key: 'subject', label: 'Subject', type: 'text' },
  { key: 'keywords', label: 'Keywords', type: 'text', placeholder: 'Comma-separated keywords' },
  { key: 'creator', label: 'Creator', type: 'text' },
  { key: 'producer', label: 'Producer', type: 'text' },
  { key: 'creationDate', label: 'Creation Date', type: 'datetime-local' },
  { key: 'modificationDate', label: 'Modification Date', type: 'datetime-local' }
];

// Video metadata fields
const EDITABLE_VIDEO_FIELDS = [
  { key: 'title', label: 'Title', type: 'text' },
  { key: 'artist', label: 'Artist/Director', type: 'text' },
  { key: 'album', label: 'Album/Show', type: 'text' },
  { key: 'year', label: 'Year', type: 'number' },
  { key: 'genre', label: 'Genre', type: 'text' },
  { key: 'description', label: 'Description', type: 'textarea' },
  { key: 'comment', label: 'Comment', type: 'textarea' },
  { key: 'copyright', label: 'Copyright', type: 'text' },
  { key: 'encoder', label: 'Encoder', type: 'text' }
];

const MetadataEditor = ({ 
  file,
  onSave,
  onClose,
  isPremium = false 
}) => {
  const [metadata, setMetadata] = useState({});
  const [originalMetadata, setOriginalMetadata] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [fileType, setFileType] = useState('unknown');
  const [albumArt, setAlbumArt] = useState(null);
  const [newAlbumArt, setNewAlbumArt] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Determine file type
  useEffect(() => {
    if (!file) return;
    
    const mimeType = file.type || '';
    const extension = file.name.split('.').pop().toLowerCase();
    
    if (mimeType.includes('image') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'tiff'].includes(extension)) {
      setFileType('image');
    } else if (mimeType.includes('audio') || ['mp3', 'wav', 'flac', 'aac', 'm4a', 'ogg'].includes(extension)) {
      setFileType('audio');
    } else if (mimeType.includes('video') || ['mp4', 'mkv', 'avi', 'mov', 'webm'].includes(extension)) {
      setFileType('video');
    } else if (mimeType.includes('pdf') || extension === 'pdf') {
      setFileType('pdf');
    } else {
      setFileType('unknown');
    }
  }, [file]);

  // Read metadata from file
  const readMetadata = useCallback(async () => {
    if (!file) return;
    
    setLoading(true);
    setError(null);
    
    try {
      let extractedMetadata = {};
      
      if (fileType === 'image') {
        extractedMetadata = await readImageMetadata(file);
      } else if (fileType === 'audio') {
        extractedMetadata = await readAudioMetadata(file);
      } else if (fileType === 'pdf') {
        extractedMetadata = await readPdfMetadata(file);
      } else if (fileType === 'video') {
        extractedMetadata = await readVideoMetadata(file);
      }
      
      setMetadata(extractedMetadata);
      setOriginalMetadata(extractedMetadata);
    } catch (err) {
      console.error('Failed to read metadata:', err);
      setError('Failed to read metadata: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [file, fileType]);

  useEffect(() => {
    if (fileType !== 'unknown') {
      readMetadata();
    }
  }, [fileType, readMetadata]);

  // Check for changes
  useEffect(() => {
    const changed = JSON.stringify(metadata) !== JSON.stringify(originalMetadata) || newAlbumArt !== null;
    setHasChanges(changed);
  }, [metadata, originalMetadata, newAlbumArt]);

  // Read image EXIF data
  const readImageMetadata = async (file) => {
    return new Promise((resolve) => {
      // Use browser-native approach for basic metadata
      const img = new Image();
      const url = URL.createObjectURL(file);
      
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve({
          width: img.width,
          height: img.height,
          title: file.name.replace(/\.[^/.]+$/, ''),
          fileSize: file.size,
          mimeType: file.type
        });
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve({});
      };
      
      img.src = url;
    });
  };

  // Read audio ID3 tags (simplified - would need jsmediatags in production)
  const readAudioMetadata = async (file) => {
    // In production, use jsmediatags or similar library
    return {
      title: file.name.replace(/\.[^/.]+$/, ''),
      artist: '',
      album: '',
      year: '',
      genre: '',
      duration: 0
    };
  };

  // Read PDF metadata (simplified - would need pdf-lib in production)
  const readPdfMetadata = async (file) => {
    return {
      title: file.name.replace(/\.[^/.]+$/, ''),
      author: '',
      subject: '',
      keywords: '',
      creator: 'Nebula Media Converter'
    };
  };

  // Read video metadata
  const readVideoMetadata = async (file) => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(video.src);
        resolve({
          title: file.name.replace(/\.[^/.]+$/, ''),
          duration: video.duration,
          width: video.videoWidth,
          height: video.videoHeight
        });
      };
      
      video.onerror = () => {
        URL.revokeObjectURL(video.src);
        resolve({
          title: file.name.replace(/\.[^/.]+$/, '')
        });
      };
      
      video.src = URL.createObjectURL(file);
    });
  };

  // Handle field change
  const handleFieldChange = (key, value) => {
    setMetadata(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Handle album art change
  const handleAlbumArtChange = (e) => {
    const artFile = e.target.files[0];
    if (artFile && artFile.type.includes('image')) {
      setNewAlbumArt(artFile);
      const url = URL.createObjectURL(artFile);
      setAlbumArt(url);
    }
  };

  // Remove album art
  const handleRemoveAlbumArt = () => {
    setAlbumArt(null);
    setNewAlbumArt(null);
    setMetadata(prev => ({
      ...prev,
      albumArt: null
    }));
  };

  // Save metadata
  const handleSave = async () => {
    setSaving(true);
    setError(null);
    
    try {
      // In production, this would use appropriate libraries to write metadata
      const updatedFile = await writeMetadata(file, metadata, newAlbumArt);
      onSave?.(updatedFile, metadata);
      onClose?.();
    } catch (err) {
      setError('Failed to save metadata: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Write metadata to file (simplified - would need actual implementation)
  const writeMetadata = async (file, metadata, albumArt) => {
    // In production, use appropriate libraries:
    // - Images: piexifjs or exif-js
    // - Audio: jsmediatags for reading, browser-id3-writer for writing
    // - PDF: pdf-lib
    // - Video: ffmpeg.wasm
    
    // For now, return the file with metadata stored separately
    const updatedFile = new File([file], file.name, { type: file.type });
    updatedFile.metadata = metadata;
    if (albumArt) {
      updatedFile.albumArt = albumArt;
    }
    return updatedFile;
  };

  // Reset to original
  const handleReset = () => {
    setMetadata(originalMetadata);
    setNewAlbumArt(null);
    setAlbumArt(null);
  };

  // Get fields based on file type
  const getFields = () => {
    switch (fileType) {
      case 'image': return EDITABLE_IMAGE_FIELDS;
      case 'audio': return EDITABLE_AUDIO_FIELDS;
      case 'pdf': return EDITABLE_PDF_FIELDS;
      case 'video': return EDITABLE_VIDEO_FIELDS;
      default: return [];
    }
  };

  // Get file type icon
  const getFileTypeIcon = () => {
    switch (fileType) {
      case 'image': return '🖼️';
      case 'audio': return '🎵';
      case 'pdf': return '📄';
      case 'video': return '🎬';
      default: return '📁';
    }
  };

  const fields = getFields();

  return (
    <div className="metadata-editor-overlay" onClick={onClose}>
      <div className="metadata-editor-modal" onClick={e => e.stopPropagation()}>
        <div className="metadata-header">
          <h2>
            {getFileTypeIcon()} Edit Metadata
          </h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        {!isPremium && (
          <div className="premium-notice">
            <span>⭐</span>
            <p>Metadata editing is a premium feature. Some functions may be limited.</p>
          </div>
        )}

        <div className="file-info-bar">
          <span className="file-name">{file?.name}</span>
          <span className="file-type-badge">{fileType.toUpperCase()}</span>
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Reading metadata...</p>
          </div>
        ) : error ? (
          <div className="error-state">
            <span>⚠️</span>
            <p>{error}</p>
            <button onClick={readMetadata}>Try Again</button>
          </div>
        ) : fileType === 'unknown' ? (
          <div className="unsupported-state">
            <span>❓</span>
            <p>Metadata editing is not supported for this file type.</p>
          </div>
        ) : (
          <div className="metadata-content">
            {/* Album Art for Audio */}
            {fileType === 'audio' && (
              <div className="album-art-section">
                <h3>Album Artwork</h3>
                <div className="album-art-container">
                  {albumArt ? (
                    <div className="album-art-preview">
                      <img src={albumArt} alt="Album Art" />
                      <div className="album-art-actions">
                        <label className="change-art-btn">
                          Change
                          <input 
                            type="file" 
                            accept="image/*" 
                            onChange={handleAlbumArtChange}
                            hidden 
                          />
                        </label>
                        <button 
                          className="remove-art-btn"
                          onClick={handleRemoveAlbumArt}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="add-album-art">
                      <span>🖼️</span>
                      <p>Click to add album artwork</p>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleAlbumArtChange}
                        hidden 
                      />
                    </label>
                  )}
                </div>
              </div>
            )}

            {/* Metadata Fields */}
            <div className="metadata-fields">
              {fields.map(field => (
                <div key={field.key} className="field-group">
                  <label htmlFor={field.key}>{field.label}</label>
                  {field.type === 'textarea' ? (
                    <textarea
                      id={field.key}
                      value={metadata[field.key] || ''}
                      onChange={(e) => handleFieldChange(field.key, e.target.value)}
                      placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                      rows={3}
                    />
                  ) : field.type === 'select' ? (
                    <select
                      id={field.key}
                      value={metadata[field.key] || ''}
                      onChange={(e) => handleFieldChange(field.key, e.target.value)}
                    >
                      <option value="">Select {field.label}</option>
                      {field.options.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field.type}
                      id={field.key}
                      value={metadata[field.key] || ''}
                      onChange={(e) => handleFieldChange(field.key, e.target.value)}
                      placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Read-only Technical Info */}
            <div className="technical-info">
              <h3>Technical Information</h3>
              <div className="info-grid">
                {metadata.width && metadata.height && (
                  <div className="info-item">
                    <span className="info-label">Dimensions</span>
                    <span className="info-value">{metadata.width} × {metadata.height}</span>
                  </div>
                )}
                {metadata.duration && (
                  <div className="info-item">
                    <span className="info-label">Duration</span>
                    <span className="info-value">
                      {Math.floor(metadata.duration / 60)}:{String(Math.floor(metadata.duration % 60)).padStart(2, '0')}
                    </span>
                  </div>
                )}
                {metadata.fileSize && (
                  <div className="info-item">
                    <span className="info-label">File Size</span>
                    <span className="info-value">
                      {(metadata.fileSize / (1024 * 1024)).toFixed(2)} MB
                    </span>
                  </div>
                )}
                {metadata.mimeType && (
                  <div className="info-item">
                    <span className="info-label">MIME Type</span>
                    <span className="info-value">{metadata.mimeType}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="metadata-footer">
          <button 
            className="reset-btn"
            onClick={handleReset}
            disabled={!hasChanges || loading}
          >
            Reset Changes
          </button>
          <div className="footer-actions">
            <button className="cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button 
              className="save-btn"
              onClick={handleSave}
              disabled={!hasChanges || saving || loading}
            >
              {saving ? 'Saving...' : 'Save Metadata'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MetadataEditor;
