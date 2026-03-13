import React, { useState, useEffect } from 'react';
import './UserSession.css';

const UserSession = ({ currentUser, onLogout }) => {
  const [sessionInfo, setSessionInfo] = useState(null);

  useEffect(() => {
    const session = localStorage.getItem('nebula_session');
    if (session) {
      try {
        const sessionData = JSON.parse(session);
        setSessionInfo(sessionData);
      } catch (error) {
        console.error('Invalid session:', error);
      }
    }
  }, [currentUser]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getSessionTimeRemaining = () => {
    if (!sessionInfo?.expiresAt) return 'Unknown';
    
    const now = new Date();
    const expires = new Date(sessionInfo.expiresAt);
    const diff = expires - now;
    
    if (diff < 0) return 'Expired';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ${hours}h`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
    
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  };

  return (
    <div className="user-session-info">
      <div className="session-card">
        <div className="session-header">
          <h3>Session Information</h3>
          <span className="session-status active">● Active</span>
        </div>
        
        <div className="session-details">
          <div className="detail-row">
            <span className="detail-label">User:</span>
            <span className="detail-value">{currentUser?.name || 'Guest'}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Email:</span>
            <span className="detail-value">{currentUser?.email}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">User ID:</span>
            <span className="detail-value mono">{currentUser?.id?.slice(0, 16)}...</span>
          </div>
          {sessionInfo && (
            <>
              <div className="detail-row">
                <span className="detail-label">Login Time:</span>
                <span className="detail-value">{formatDate(sessionInfo.loginTime)}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Session Expires:</span>
                <span className="detail-value">{getSessionTimeRemaining()}</span>
              </div>
            </>
          )}
        </div>

        <button onClick={onLogout} className="session-logout-btn">
          🔒 End Session
        </button>
      </div>
    </div>
  );
};

export default UserSession;
