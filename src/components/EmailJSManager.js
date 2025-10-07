import React, { useState, useEffect } from 'react';
import emailJSService from '../services/EmailJSService';
import './EmailJSManager.css';

const EmailJSManager = () => {
  const [emailStats, setEmailStats] = useState(null);
  const [emailHistory, setEmailHistory] = useState([]);
  const [isConfigured, setIsConfigured] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    loadEmailData();
  }, []);

  const loadEmailData = () => {
    setIsConfigured(emailJSService.isConfigured());
    setEmailStats(emailJSService.getEmailStats());
    setEmailHistory(emailJSService.getEmailHistory(50));
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    
    try {
      const result = await emailJSService.testConnection();
      setTestResult(result);
    } catch (error) {
      setTestResult({
        success: false,
        error: error.message,
        message: 'Test failed with error'
      });
    } finally {
      setIsTesting(false);
      // Refresh data after test
      setTimeout(loadEmailData, 1000);
    }
  };

  const getStatusColor = (status) => {
    return status === 'success' ? '#22c55e' : '#ef4444';
  };

  const getEmailTypeIcon = (type) => {
    const icons = {
      welcome: '👋',
      conversion: '✅',
      upgrade: '💎',
      newsletter: '📧',
      contact: '📞',
      test: '🧪'
    };
    return icons[type] || '📧';
  };

  return (
    <div className="emailjs-manager">
      <div className="emailjs-header">
        <h3>📧 EmailJS Integration</h3>
        <div className="emailjs-status">
          <span className={`status-indicator ${isConfigured ? 'configured' : 'not-configured'}`}>
            {isConfigured ? '🟢 Configured' : '🔴 Not Configured'}
          </span>
        </div>
      </div>

      {!isConfigured && (
        <div className="configuration-warning">
          <h4>⚠️ EmailJS Not Configured</h4>
          <p>To enable real email sending, add these environment variables to your .env file:</p>
          <div className="env-example">
            <code>
              REACT_APP_EMAILJS_SERVICE_ID=your_service_id<br/>
              REACT_APP_EMAILJS_TEMPLATE_ID=your_template_id<br/>
              REACT_APP_EMAILJS_PUBLIC_KEY=your_public_key
            </code>
          </div>
          <p>
            <a href="https://www.emailjs.com/" target="_blank" rel="noopener noreferrer">
              Get your EmailJS credentials here →
            </a>
          </p>
        </div>
      )}

      {isConfigured && (
        <div className="emailjs-controls">
          <button 
            className="test-btn"
            onClick={handleTestConnection}
            disabled={isTesting}
          >
            {isTesting ? '🔄 Testing...' : '🧪 Test Connection'}
          </button>
          
          {testResult && (
            <div className={`test-result ${testResult.success ? 'success' : 'error'}`}>
              {testResult.success ? '✅' : '❌'} {testResult.message}
              {testResult.error && <div className="error-details">{testResult.error}</div>}
            </div>
          )}
        </div>
      )}

      {emailStats && (
        <div className="email-stats">
          <h4>📊 Email Statistics</h4>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-number">{emailStats.total}</div>
              <div className="stat-label">Total Emails</div>
            </div>
            <div className="stat-card success">
              <div className="stat-number">{emailStats.successful}</div>
              <div className="stat-label">Successful</div>
            </div>
            <div className="stat-card error">
              <div className="stat-number">{emailStats.failed}</div>
              <div className="stat-label">Failed</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">
                {emailStats.total > 0 ? Math.round((emailStats.successful / emailStats.total) * 100) : 0}%
              </div>
              <div className="stat-label">Success Rate</div>
            </div>
          </div>

          {Object.keys(emailStats.byType).length > 0 && (
            <div className="type-breakdown">
              <h5>By Email Type:</h5>
              <div className="type-list">
                {Object.entries(emailStats.byType).map(([type, stats]) => (
                  <div key={type} className="type-item">
                    <span className="type-icon">{getEmailTypeIcon(type)}</span>
                    <span className="type-name">{type}</span>
                    <span className="type-stats">
                      {stats.successful}/{stats.total} 
                      ({stats.total > 0 ? Math.round((stats.successful / stats.total) * 100) : 0}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="email-history">
        <h4>📝 Recent Email Activity</h4>
        {emailHistory.length === 0 ? (
          <div className="no-emails">
            <p>No email activity yet. Emails will appear here after they are sent.</p>
            {isConfigured && (
              <p>Try the test connection button above to send a test email!</p>
            )}
          </div>
        ) : (
          <div className="history-list">
            {emailHistory.map((email) => (
              <div key={email.id} className="history-item">
                <div className="email-header">
                  <span className="email-type">
                    {getEmailTypeIcon(email.type)} {email.type}
                  </span>
                  <span 
                    className="email-status"
                    style={{ color: getStatusColor(email.status) }}
                  >
                    {email.status === 'success' ? '✅' : '❌'} {email.status}
                  </span>
                </div>
                <div className="email-details">
                  <div className="email-recipient">To: {email.recipient}</div>
                  <div className="email-timestamp">{email.timestamp}</div>
                  {email.details && (
                    <div className="email-info">{email.details}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="emailjs-info">
        <h4>💡 About EmailJS Integration</h4>
        <ul>
          <li><strong>Welcome Emails:</strong> Sent when users first use the app (if configured)</li>
          <li><strong>Conversion Notifications:</strong> Sent after successful file conversions</li>
          <li><strong>Upgrade Confirmations:</strong> Sent when users upgrade to premium</li>
          <li><strong>Contact Form:</strong> Allows users to send messages directly to admin</li>
          <li><strong>Newsletters:</strong> Can be sent through the admin panel</li>
        </ul>
        <p>
          All emails are sent client-side through EmailJS, ensuring no server infrastructure is needed.
        </p>
      </div>
    </div>
  );
};

export default EmailJSManager;