import React, { useState, useEffect } from 'react';
import './ConnectionManager.css';

const ConnectionManager = ({ mediaConverter, onConnectionReady, onConnectionFailed }) => {
  const [connectionStatus, setConnectionStatus] = useState('checking');
  const [diagnostics, setDiagnostics] = useState({});
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    runDiagnostics();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const runDiagnostics = async () => {
    setConnectionStatus('checking');
    const results = {};

    try {
      // Test internet connectivity
      results.internet = await testInternetConnection();
      
      // Test CDN accessibility
      results.cdnAccess = await testCDNAccess();
      
      // Test FFmpeg loading
      results.ffmpeg = await testFFmpegLoad();
      
      setDiagnostics(results);
      
      if (results.internet && results.cdnAccess && results.ffmpeg) {
        setConnectionStatus('ready');
        onConnectionReady?.(true);
      } else {
        setConnectionStatus('failed');
        onConnectionFailed?.({ 
          message: 'Connection diagnostics failed',
          details: results 
        });
      }
    } catch (error) {
      setConnectionStatus('failed');
      setDiagnostics({ error: error.message });
      onConnectionFailed?.(error);
    }
  };

  const testInternetConnection = async () => {
    try {
      const response = await fetch('https://httpbin.org/get', { 
        method: 'GET',
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000)
      });
      return response.ok;
    } catch (error) {
      console.warn('Internet connectivity test failed:', error);
      return false;
    }
  };

  const testCDNAccess = async () => {
    const cdns = [
      'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.js',
      'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.js'
    ];

    for (const cdn of cdns) {
      try {
        const response = await fetch(cdn, {
          method: 'HEAD',
          cache: 'no-cache',
          signal: AbortSignal.timeout(5000)
        });
        if (response.ok) return true;
      } catch (error) {
        console.warn(`CDN test failed for ${cdn}:`, error);
      }
    }
    return false;
  };

  const testFFmpegLoad = async () => {
    try {
      if (mediaConverter) {
        await mediaConverter.load();
        return true;
      }
      return false;
    } catch (error) {
      console.warn('FFmpeg load test failed:', error);
      return false;
    }
  };

  const handleRetry = async () => {
    setIsRetrying(true);
    setRetryCount(prev => prev + 1);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await runDiagnostics();
    } finally {
      setIsRetrying(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'checking':
        return '🔄';
      case 'ready':
        return '✅';
      case 'failed':
        return '❌';
      default:
        return '⚠️';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ready':
        return '#4CAF50';
      case 'failed':
        return '#f44336';
      case 'checking':
        return '#ff9800';
      default:
        return '#9e9e9e';
    }
  };

  return (
    <div className="connection-manager">
      <div className="connection-header">
        <h3>
          {getStatusIcon(connectionStatus)} Connection Diagnostics
        </h3>
        <div 
          className="connection-status"
          style={{ color: getStatusColor(connectionStatus) }}
        >
          {connectionStatus === 'checking' && 'Checking connection...'}
          {connectionStatus === 'ready' && 'All systems ready!'}
          {connectionStatus === 'failed' && 'Connection issues detected'}
        </div>
      </div>

      <div className="diagnostics-grid">
        <div className="diagnostic-item">
          <span className="diagnostic-label">Internet Connection:</span>
          <span className={`diagnostic-result ${diagnostics.internet ? 'success' : 'failed'}`}>
            {diagnostics.internet === undefined ? '🔄 Testing...' : 
             diagnostics.internet ? '✅ Connected' : '❌ Failed'}
          </span>
        </div>

        <div className="diagnostic-item">
          <span className="diagnostic-label">CDN Access:</span>
          <span className={`diagnostic-result ${diagnostics.cdnAccess ? 'success' : 'failed'}`}>
            {diagnostics.cdnAccess === undefined ? '🔄 Testing...' : 
             diagnostics.cdnAccess ? '✅ Accessible' : '❌ Blocked'}
          </span>
        </div>

        <div className="diagnostic-item">
          <span className="diagnostic-label">FFmpeg Loading:</span>
          <span className={`diagnostic-result ${diagnostics.ffmpeg ? 'success' : 'failed'}`}>
            {diagnostics.ffmpeg === undefined ? '🔄 Testing...' : 
             diagnostics.ffmpeg ? '✅ Loaded' : '❌ Failed'}
          </span>
        </div>
      </div>

      {connectionStatus === 'failed' && (
        <div className="troubleshooting">
          <h4>🔧 Troubleshooting Steps:</h4>
          <ul>
            {!diagnostics.internet && (
              <li>Check your internet connection and try again</li>
            )}
            {!diagnostics.cdnAccess && (
              <>
                <li>Your network may be blocking CDN access</li>
                <li>Try disabling VPN or proxy if enabled</li>
                <li>Check if your firewall is blocking the application</li>
              </>
            )}
            {!diagnostics.ffmpeg && (
              <>
                <li>FFmpeg failed to load - this could be a browser issue</li>
                <li>Try refreshing the page</li>
                <li>Clear your browser cache</li>
                <li>Try using a different browser</li>
              </>
            )}
          </ul>
        </div>
      )}

      <div className="connection-actions">
        <button 
          className="retry-btn"
          onClick={handleRetry}
          disabled={isRetrying || connectionStatus === 'checking'}
        >
          {isRetrying ? '🔄 Retrying...' : '🔄 Retry Connection'}
        </button>
        
        {retryCount > 0 && (
          <span className="retry-count">Attempts: {retryCount}</span>
        )}
      </div>

      {connectionStatus === 'ready' && (
        <div className="success-message">
          🎉 Everything looks good! You can now convert your files.
        </div>
      )}
    </div>
  );
};

export default ConnectionManager;