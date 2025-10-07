import React, { useCallback, useState } from 'react';
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
      
      // Check if it's a valid media file
      if (file.type.startsWith('video/') || file.type.startsWith('audio/')) {
        console.log('Valid media file, calling onFileSelect');
        onFileSelect(file);
      } else {
        console.log('Invalid file type:', file.type);
        alert('Please select a valid video or audio file.');
      }
    }
  }, [onFileSelect]);

  const handleFileInput = useCallback((e) => {
    const files = Array.from(e.target.files);
    console.log('File input:', files);
    
    if (files.length > 0) {
      const file = files[0];
      console.log('File selected via input:', file);
      onFileSelect(file);
    }
  }, [onFileSelect]);

  const handleClick = useCallback(() => {
    if (!isProcessing) {
      document.getElementById('file-input').click();
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
        accept="video/*,audio/*"
        onChange={handleFileInput}
        style={{ display: 'none' }}
        disabled={isProcessing}
      />
      {isDragActive ? (
        <p>Drop the file here...</p>
      ) : (
        <div className="upload-content">
          <div className="upload-icon">📁</div>
          <p>Drag & drop a video or audio file here, or click to select</p>
          <p className="supported-formats">
            Supported formats: MP4, AVI, MOV, MKV, WebM, FLV, MP3, WAV, FLAC, AAC, OGG, M4A
          </p>
        </div>
      )}
    </div>
  );
};

export default FileUpload;