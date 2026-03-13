import React, { useEffect, useState } from 'react';
import './InstallPWA.css';

/**
 * InstallPWA Component
 * Displays a prompt to install the app as a PWA on supported devices
 * Works on both mobile (iOS/Android) and desktop (Chrome/Edge)
 */
const InstallPWA = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if running as standalone app
    const standalone = window.matchMedia('(display-mode: standalone)').matches 
                    || window.navigator.standalone 
                    || document.referrer.includes('android-app://');
    
    setIsStandalone(standalone);

    // Detect iOS devices
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(ios);

    // Don't show prompt if already installed
    if (standalone) {
      return;
    }

    // Check if user previously dismissed
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    const dismissedTime = dismissed ? parseInt(dismissed) : 0;
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);

    // Show again after 24 hours
    if (dismissedTime > oneDayAgo) {
      return;
    }

    // Handle beforeinstallprompt event (Android/Chrome/Edge)
    const handleBeforeInstallPrompt = (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      
      // Stash the event so it can be triggered later
      setDeferredPrompt(e);
      
      // Show install prompt after a short delay (better UX)
      setTimeout(() => {
        setShowInstallPrompt(true);
      }, 2000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // For iOS, show prompt after a delay
    if (ios && !standalone) {
      setTimeout(() => {
        setShowInstallPrompt(true);
      }, 3000);
    }

    // Handle successful installation
    const handleAppInstalled = () => {
      console.log('✅ PWA installed successfully');
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      return;
    }

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    console.log(`User response to install prompt: ${outcome}`);

    if (outcome === 'accepted') {
      console.log('✅ User accepted the install prompt');
    } else {
      console.log('❌ User dismissed the install prompt');
    }

    // Clear the deferredPrompt
    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  // Don't render if already installed or prompt shouldn't show
  if (isStandalone || !showInstallPrompt) {
    return null;
  }

  // iOS Install Instructions
  if (isIOS) {
    return (
      <div className="install-pwa-container">
        <div className="install-pwa-prompt ios-prompt">
          <button className="install-pwa-close" onClick={handleDismiss} aria-label="Close">
            ✕
          </button>
          
          <div className="install-pwa-icon">
            📱
          </div>
          
          <div className="install-pwa-content">
            <h3>Install Nebula Media Converter</h3>
            <p>Install this app on your iPhone:</p>
            <ol className="ios-instructions">
              <li>Tap the <strong>Share</strong> button <span className="ios-icon">⎙</span></li>
              <li>Scroll down and tap <strong>Add to Home Screen</strong> <span className="ios-icon">➕</span></li>
              <li>Tap <strong>Add</strong> in the top-right corner</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  // Android/Desktop Install Prompt
  return (
    <div className="install-pwa-container">
      <div className="install-pwa-prompt">
        <button className="install-pwa-close" onClick={handleDismiss} aria-label="Close">
          ✕
        </button>
        
        <div className="install-pwa-icon">
          📱
        </div>
        
        <div className="install-pwa-content">
          <h3>Install Nebula Media Converter</h3>
          <p>Install this app for quick access and offline use!</p>
          
          <div className="install-pwa-features">
            <div className="feature-item">
              <span className="feature-icon">⚡</span>
              <span>Fast access from home screen</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">📴</span>
              <span>Works offline</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🎯</span>
              <span>Full screen experience</span>
            </div>
          </div>

          <div className="install-pwa-actions">
            <button className="install-pwa-button" onClick={handleInstallClick}>
              Install App
            </button>
            <button className="install-pwa-dismiss" onClick={handleDismiss}>
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstallPWA;
