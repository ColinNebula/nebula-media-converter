import React from 'react';
import './ProgressBar.css';

const ProgressBar = ({ progress, isProcessing, currentStep, error, connectionError }) => {
  if (!isProcessing && !error && !connectionError) return null;

  return (
    <div className="progress-container">
      {connectionError ? (
        <div className="connection-error-message">
          <h4>🌐 Connection Issue</h4>
          <p>{connectionError}</p>
          <div className="connection-help">
            <p>🔧 The Connection Manager above will help diagnose and fix this issue.</p>
          </div>
        </div>
      ) : error ? (
        <div className="error-message">
          <h4>❌ Conversion Failed</h4>
          <p>{error}</p>
        </div>
      ) : (
        <>
          <h4>🔄 Converting...</h4>
          <p className="current-step">{currentStep}</p>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="progress-text">{progress}% complete</p>
        </>
      )}
    </div>
  );
};

export default ProgressBar;