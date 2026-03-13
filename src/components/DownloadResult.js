import React from 'react';
import './DownloadResult.css';

const DownloadResult = ({ 
  convertedFile, 
  onReset,
  onSaveToCloud,
  onEditMetadata,
  onProtectFile
}) => {
  if (!convertedFile) return null;

  const downloadFile = () => {
    const url = URL.createObjectURL(convertedFile.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = convertedFile.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Create a File object from the blob for the handlers
  const getFileObject = () => {
    return new File([convertedFile.blob], convertedFile.filename, { 
      type: convertedFile.blob.type 
    });
  };

  return (
    <div className="download-result">
      <h3>✅ Conversion Complete!</h3>
      <div className="result-info">
        <p><strong>Output file:</strong> {convertedFile.filename}</p>
        <p><strong>Size:</strong> {(convertedFile.blob.size / 1024 / 1024).toFixed(2)} MB</p>
      </div>
      
      <div className="action-buttons">
        <button className="download-btn" onClick={downloadFile}>
          📥 Download File
        </button>
        <button className="reset-btn" onClick={onReset}>
          🔄 Convert Another File
        </button>
      </div>

      {/* Additional Actions */}
      <div className="additional-actions">
        {onSaveToCloud && (
          <button 
            className="secondary-action-btn"
            onClick={() => onSaveToCloud(getFileObject())}
            title="Save to Google Drive or Dropbox"
          >
            ☁️ Save to Cloud
          </button>
        )}
        {onEditMetadata && (
          <button 
            className="secondary-action-btn"
            onClick={() => onEditMetadata(getFileObject())}
            title="Edit file metadata"
          >
            🏷️ Edit Metadata
          </button>
        )}
        {onProtectFile && (
          <button 
            className="secondary-action-btn"
            onClick={() => onProtectFile(getFileObject())}
            title="Password protect your file"
          >
            🔐 Password Protect
          </button>
        )}
      </div>
    </div>
  );
};

export default DownloadResult;