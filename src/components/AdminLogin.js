import React, { useState, useEffect } from 'react';
import './AdminLogin.css';
import adminAuthService from '../services/AdminAuthService';

const AdminLogin = ({ onLoginSuccess }) => {
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [lockoutInfo, setLockoutInfo] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    // Check if admin is already logged in
    const verification = adminAuthService.verifySession();
    if (verification.isValid) {
      onLoginSuccess(verification.session);
    }

    // Check for account lockout
    checkLockoutStatus();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkLockoutStatus = () => {
    const lockout = adminAuthService.getLoginAttempts(credentials.username || 'admin');
    if (lockout.isLocked) {
      setLockoutInfo(lockout);
      const timeRemaining = Math.ceil((lockout.lockoutEnd - Date.now()) / 60000);
      setError(`Account locked. Try again in ${timeRemaining} minutes.`);
    } else {
      setLockoutInfo(null);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCredentials(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!credentials.username || !credentials.password) {
      setError('Please enter both username and password');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      setIsLoading(true);
      setError('');
      
      console.log('Attempting login with:', credentials.username); // Debug log
      const result = await adminAuthService.login(credentials.username, credentials.password);
      console.log('Login result:', result); // Debug log
      
      if (result.success) {
        console.log('Login successful, calling onLoginSuccess'); // Debug log
        onLoginSuccess(result.session);
      } else {
        setError(result.message || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error); // Debug log
      setError(error.message || 'Login failed. Please try again.');
      checkLockoutStatus();
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimeRemaining = (milliseconds) => {
    const minutes = Math.ceil(milliseconds / 60000);
    return minutes > 1 ? `${minutes} minutes` : '1 minute';
  };

  return (
    <div className="admin-login-container">
      <div className="admin-login-card">
        <div className="admin-login-header">
          <div className="admin-logo">
            <span className="admin-icon">🛡️</span>
          </div>
          <h2>Admin Access</h2>
          <p>Nebula Media Converter Administration</p>
        </div>

        <form className="admin-login-form" onSubmit={handleSubmit}>
          {error && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          )}

          {lockoutInfo?.isLocked && (
            <div className="lockout-warning">
              <span className="lockout-icon">🔒</span>
              <div className="lockout-content">
                <strong>Account Temporarily Locked</strong>
                <p>Too many failed login attempts. Please try again in {formatTimeRemaining(lockoutInfo.lockoutEnd - Date.now())}.</p>
              </div>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="username">
              <span className="label-icon">👤</span>
              Username
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={credentials.username}
              onChange={handleInputChange}
              disabled={isLoading || lockoutInfo?.isLocked}
              placeholder="Enter admin username"
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">
              <span className="label-icon">🔑</span>
              Password
            </label>
            <div className="password-input-container">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={credentials.password}
                onChange={handleInputChange}
                disabled={isLoading || lockoutInfo?.isLocked}
                placeholder="Enter admin password"
                autoComplete="current-password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading || lockoutInfo?.isLocked}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="admin-login-btn"
            disabled={isLoading || lockoutInfo?.isLocked}
          >
            {isLoading ? (
              <>
                <div className="loading-spinner"></div>
                Authenticating...
              </>
            ) : (
              <>
                <span className="login-icon">🚀</span>
                Access Admin Panel
              </>
            )}
          </button>
        </form>

        <div className="admin-login-info">
          <div className="security-info">
            <h4>🔐 Security Information</h4>
            <ul>
              <li>Sessions expire after 8 hours of inactivity</li>
              <li>Account locks after 5 failed attempts</li>
              <li>All admin activities are logged</li>
              <li>Use strong passwords for security</li>
            </ul>
          </div>

          <div className="default-credentials">
            <h4>🔑 Default Credentials</h4>
            <div className="credential-item">
              <span className="credential-label">Username:</span>
              <code>admin</code>
            </div>
            <div className="credential-item">
              <span className="credential-label">Password:</span>
              <code>nebula2025!</code>
            </div>
            <p className="credential-warning">
              ⚠️ Change these credentials immediately in production!
            </p>
          </div>
        </div>

        <div className="admin-login-footer">
          <p>
            <span className="footer-icon">⚡</span>
            Powered by Nebula Media Converter
          </p>
          <p className="version-info">Admin Panel v1.0</p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;