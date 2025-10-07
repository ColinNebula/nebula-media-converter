import React from 'react';
import './SplashScreen.css';
import NebulaLogo from './NebulaLogo';

const SplashScreen = ({ isLoading }) => {
  if (!isLoading) return null;

  return (
    <div className="splash-screen">
      <div className="splash-content">
        <div className="splash-logo">
          <div className="nebula-icon">
            <NebulaLogo size={80} />
          </div>
          <h1 className="splash-title">Nebula</h1>
          <p className="splash-subtitle">Media Converter</p>
        </div>
        
        <div className="loading-animation">
          <div className="orbit">
            <div className="planet planet-1">🎵</div>
            <div className="planet planet-2">🎬</div>
            <div className="planet planet-3">📱</div>
          </div>
        </div>
        
        <div className="loading-text">
          <p>Initializing converter...</p>
          <div className="loading-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;