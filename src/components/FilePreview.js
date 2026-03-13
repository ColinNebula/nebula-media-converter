import React, { useState, useEffect } from 'react';
import './FilePreview.css';

const FilePreview = ({ file, onClose }) => {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [metadata, setMetadata] = useState({});

  useEffect(() => {
    if (!file) return;

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    // Extract metadata
    const meta = {
      name: file.name,
      size: formatFileSize(file.size),
      type: file.type,
      lastModified: new Date(file.lastModified).toLocaleString(),
    };

    // Get dimensions for images and videos
    if (file.type.startsWith('image/')) {
      const img = new Image();
      img.onload = () => {
        setMetadata({
          ...meta,
          width: img.width,
          height: img.height,
          dimensions: `${img.width} × ${img.height}`
        });
      };
      img.src = url;
    } else if (file.type.startsWith('video/')) {
      const video = document.createElement('video');
      video.onloadedmetadata = () => {
        setMetadata({
          ...meta,
          width: video.videoWidth,
          height: video.videoHeight,
          dimensions: `${video.videoWidth} × ${video.videoHeight}`,
          duration: formatDuration(video.duration)
        });
      };
      video.src = url;
    } else if (file.type.startsWith('audio/')) {
      const audio = new Audio();
      audio.onloadedmetadata = () => {
        setMetadata({
          ...meta,
          duration: formatDuration(audio.duration)
        });
      };
      audio.src = url;
    } else {
      setMetadata(meta);
    }

    return () => URL.revokeObjectURL(url);
  }, [file]);

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderPreview = () => {
    if (!file || !previewUrl) return null;

    if (file.type.startsWith('image/')) {
      return <img src={previewUrl} alt={file.name} className="preview-image" />;
    }

    if (file.type.startsWith('video/')) {
      return (
        <video src={previewUrl} controls className="preview-video">
          Your browser does not support video playback.
        </video>
      );
    }

    if (file.type.startsWith('audio/')) {
      return (
        <div className="preview-audio-container">
          <div className="audio-icon">🎵</div>
          <audio src={previewUrl} controls className="preview-audio">
            Your browser does not support audio playback.
          </audio>
        </div>
      );
    }

    // For other file types, show icon and info
    return (
      <div className="preview-file-icon">
        <div className="file-icon">📄</div>
        <p>Preview not available for this file type</p>
      </div>
    );
  };

  if (!file) return null;

  return (
    <div className="file-preview-overlay" onClick={onClose}>
      <div className="file-preview-modal" onClick={(e) => e.stopPropagation()}>
        <div className="preview-header">
          <h3>File Preview</h3>
          <button className="preview-close" onClick={onClose}>×</button>
        </div>

        <div className="preview-content">
          {renderPreview()}
        </div>

        <div className="preview-metadata">
          <h4>File Information</h4>
          <div className="metadata-grid">
            <div className="metadata-item">
              <span className="metadata-label">Name:</span>
              <span className="metadata-value" title={metadata.name}>
                {metadata.name}
              </span>
            </div>
            <div className="metadata-item">
              <span className="metadata-label">Size:</span>
              <span className="metadata-value">{metadata.size}</span>
            </div>
            <div className="metadata-item">
              <span className="metadata-label">Type:</span>
              <span className="metadata-value">{metadata.type || 'Unknown'}</span>
            </div>
            {metadata.dimensions && (
              <div className="metadata-item">
                <span className="metadata-label">Dimensions:</span>
                <span className="metadata-value">{metadata.dimensions}</span>
              </div>
            )}
            {metadata.duration && (
              <div className="metadata-item">
                <span className="metadata-label">Duration:</span>
                <span className="metadata-value">{metadata.duration}</span>
              </div>
            )}
            <div className="metadata-item">
              <span className="metadata-label">Modified:</span>
              <span className="metadata-value">{metadata.lastModified}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilePreview;
