import React, { useCallback, useState } from 'react';
import SecurityUtils from '../utils/SecurityUtils';
import './FileUpload.css';

const FileUpload = ({ onFileSelect, isProcessing }) => {
  const [isDragActive, setIsDragActive] = useState(false);

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Drag enter');
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Drag leave');
    setIsDragActive(false);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Drop event triggered');
    setIsDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    console.log('Files dropped:', files);

    if (files.length > 0) {
      const file = files[0];
      console.log('File details:', {
        name: file.name,
        type: file.type,
        size: file.size
      });
      
      // Validate file using security utils
      const validation = SecurityUtils.validateFile(file, {
        maxSize: 500 * 1024 * 1024, // 500MB
        allowedTypes: ['video/', 'audio/', 'image/']
      });
      
      if (validation.isValid) {
        console.log('Valid media file, calling onFileSelect');
        onFileSelect(file);
      } else {
        console.log('File validation failed:', validation.errors);
        alert(`File validation failed:\n${validation.errors.join('\n')}`);
      }
    }
  }, [onFileSelect]);

  const handleFileInput = useCallback((e) => {
    const files = Array.from(e.target.files);
    console.log('File input:', files);
    
    if (files.length > 0) {
      const file = files[0];
      console.log('File selected via input:', file);
      
      // Validate file using security utils
      const validation = SecurityUtils.validateFile(file, {
        maxSize: 500 * 1024 * 1024, // 500MB
        allowedTypes: ['video/', 'audio/', 'image/']
      });
      
      if (validation.isValid) {
        onFileSelect(file);
      } else {
        alert(`File validation failed:\n${validation.errors.join('\n')}`);
      }
    }
  }, [onFileSelect]);

  const handleClick = useCallback(() => {
    console.log('🔵 FileUpload area clicked!', { isProcessing });
    if (!isProcessing) {
      const input = document.getElementById('file-input');
      if (input) {
        console.log('✅ Triggering file input click');
        input.click();
      } else {
        console.error('❌ File input not found!');
      }
    } else {
      console.log('⚠️ Click blocked - processing in progress');
    }
  }, [isProcessing]);

  console.log('FileUpload render - isDragActive:', isDragActive, 'isProcessing:', isProcessing);

  return (
    <div 
      className={`dropzone ${isDragActive ? 'active' : ''} ${isProcessing ? 'disabled' : ''}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <input 
        id="file-input"
        type="file"
        accept="video/*,audio/*,image/*"
        onChange={handleFileInput}
        style={{ display: 'none' }}
        disabled={isProcessing}
      />
      {isDragActive ? (
        <p>Drop the file here...</p>
      ) : (
        <div className="upload-content">
          <div className="upload-icon">📁</div>
          <p>Drag & drop a video, audio, or image file here, or click to select</p>
          <p className="supported-formats">
            Supported formats: MP4, AVI, MOV, MKV, WebM, FLV, MP3, WAV, FLAC, AAC, OGG, M4A, JPG, PNG, GIF, BMP
          </p>
        </div>
      )}
    </div>
  );
};

export default FileUpload;