import React, { useEffect, useState } from 'react';
import './UpdateNotification.css';

/**
 * UpdateNotification Component
 * Shows a notification when a new version of the PWA is available
 */
const UpdateNotification = () => {
  const [showUpdate, setShowUpdate] = useState(false);
  const [registration, setRegistration] = useState(null);

  useEffect(() => {
    // Listen for service worker updates
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          
          newWorker?.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New version available
              setRegistration(reg);
              setShowUpdate(true);
            }
          });
        });
      });
    }
  }, []);

  const handleUpdate = () => {
    if (registration && registration.waiting) {
      // Tell the service worker to skip waiting
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      
      // Reload the page to get the new version
      window.location.reload();
    }
  };

  const handleDismiss = () => {
    setShowUpdate(false);
  };

  if (!showUpdate) {
    return null;
  }

  return (
    <div className="update-notification-container">
      <div className="update-notification">
        <div className="update-icon">🔄</div>
        <div className="update-content">
          <h4>Update Available</h4>
          <p>A new version of Nebula Media Converter is ready!</p>
        </div>
        <div className="update-actions">
          <button className="update-btn" onClick={handleUpdate}>
            Update Now
          </button>
          <button className="dismiss-btn" onClick={handleDismiss}>
            Later
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpdateNotification;
