import React from 'react';
import './ProgressBar.css';

const ProgressBar = ({ progress, isProcessing, currentStep, error }) => {
  if (!isProcessing && !error) return null;

  return (
    <div className="progress-container">
      {error ? (
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