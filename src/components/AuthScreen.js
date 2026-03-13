import React, { useState } from 'react';
import './AuthScreen.css';

const hashPassword = async (password) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

const AuthScreen = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const validatePassword = (password) => {
    return password.length >= 8;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Validation
    if (!validateEmail(formData.email)) {
      setError('Please enter a valid email address');
      setIsLoading(false);
      return;
    }

    if (!formData.password) {
      setError('Password is required');
      setIsLoading(false);
      return;
    }

    try {
      // Get stored users
      const users = JSON.parse(localStorage.getItem('nebula_users') || '[]');
      
      // Find user
      const user = users.find(u => u.email.toLowerCase() === formData.email.toLowerCase());

      if (!user) {
        setError('Invalid email or password');
        setIsLoading(false);
        return;
      }

      // Verify password — compare hashes; migrate legacy plaintext on success
      const inputHash = await hashPassword(formData.password);
      const storedIsHash = /^[0-9a-f]{64}$/.test(user.password);
      let passwordMatches;
      if (storedIsHash) {
        passwordMatches = user.password === inputHash;
      } else {
        // Legacy plaintext — compare directly then migrate to hash
        passwordMatches = user.password === formData.password;
        if (passwordMatches) {
          user.password = inputHash;
          const migratedUsers = users.map(u => u.email === user.email ? user : u);
          localStorage.setItem('nebula_users', JSON.stringify(migratedUsers));
        }
      }
      if (!passwordMatches) {
        setError('Invalid email or password');
        setIsLoading(false);
        return;
      }

      // Check if user is active
      if (!user.isActive) {
        setError('Your account has been deactivated. Please contact support.');
        setIsLoading(false);
        return;
      }

      // Update last login
      user.lastLogin = new Date().toISOString();
      const updatedUsers = users.map(u => u.email === user.email ? user : u);
      localStorage.setItem('nebula_users', JSON.stringify(updatedUsers));

      // Create session
      const session = {
        userId: user.id,
        email: user.email,
        name: user.name,
        loginTime: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
      };

      localStorage.setItem('nebula_session', JSON.stringify(session));

      setSuccessMessage('Login successful! Welcome back.');
      setTimeout(() => {
        onAuthSuccess(session);
      }, 1000);

    } catch (error) {
      console.error('Login error:', error);
      setError('An error occurred during login. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Validation
    if (!formData.name.trim()) {
      setError('Name is required');
      setIsLoading(false);
      return;
    }

    if (!validateEmail(formData.email)) {
      setError('Please enter a valid email address');
      setIsLoading(false);
      return;
    }

    if (!validatePassword(formData.password)) {
      setError('Password must be at least 8 characters long');
      setIsLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    try {
      // Get existing users
      const users = JSON.parse(localStorage.getItem('nebula_users') || '[]');

      // Check if user already exists
      if (users.some(u => u.email.toLowerCase() === formData.email.toLowerCase())) {
        setError('An account with this email already exists');
        setIsLoading(false);
        return;
      }

      // Create new user
      const newUser = {
        id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        email: formData.email.toLowerCase(),
        password: await hashPassword(formData.password),
        name: formData.name.trim(),
        createdAt: new Date().toISOString(),
        lastLogin: null,
        isActive: true,
        isPremium: false,
        plan: 'free'
      };

      // Save user
      users.push(newUser);
      localStorage.setItem('nebula_users', JSON.stringify(users));

      setSuccessMessage('Account created successfully! Please log in.');
      setTimeout(() => {
        setIsLogin(true);
        setFormData({
          email: formData.email,
          password: '',
          confirmPassword: '',
          name: ''
        });
      }, 1500);

    } catch (error) {
      console.error('Registration error:', error);
      setError('An error occurred during registration. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setSuccessMessage('');
    setFormData({
      email: '',
      password: '',
      confirmPassword: '',
      name: ''
    });
  };

  return (
    <div className="auth-screen">
      <div className="auth-background">
        <div className="stars"></div>
        <div className="nebula-effect"></div>
      </div>

      <div className="auth-container">
        <div className="auth-header">
          <div className="auth-logo">
            <div className="logo-circle">
              <span className="logo-icon">🌟</span>
            </div>
            <h1>Nebula Media Converter</h1>
          </div>
          <p className="auth-subtitle">
            {isLogin ? 'Sign in to continue' : 'Create your free account'}
          </p>
        </div>

        <div className="auth-card">
          <div className="auth-tabs">
            <button 
              className={`auth-tab ${isLogin ? 'active' : ''}`}
              onClick={() => setIsLogin(true)}
              disabled={isLoading}
            >
              Login
            </button>
            <button 
              className={`auth-tab ${!isLogin ? 'active' : ''}`}
              onClick={() => setIsLogin(false)}
              disabled={isLoading}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={isLogin ? handleLogin : handleRegister} className="auth-form">
            {!isLogin && (
              <div className="form-group">
                <label htmlFor="name">Full Name</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter your full name"
                  disabled={isLoading}
                  autoComplete="name"
                />
              </div>
            )}

            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="your.email@example.com"
                disabled={isLoading}
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder={isLogin ? "Enter your password" : "At least 8 characters"}
                disabled={isLoading}
                autoComplete={isLogin ? "current-password" : "new-password"}
              />
            </div>

            {!isLogin && (
              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  placeholder="Re-enter your password"
                  disabled={isLoading}
                  autoComplete="new-password"
                />
              </div>
            )}

            {error && (
              <div className="auth-message error">
                <span className="message-icon">⚠️</span>
                {error}
              </div>
            )}

            {successMessage && (
              <div className="auth-message success">
                <span className="message-icon">✅</span>
                {successMessage}
              </div>
            )}

            <button 
              type="submit" 
              className="auth-submit"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="loading-spinner">⏳</span>
              ) : (
                isLogin ? '🔓 Login' : '🚀 Create Account'
              )}
            </button>
          </form>

          <div className="auth-footer">
            <p>
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button 
                onClick={switchMode}
                className="switch-mode-btn"
                disabled={isLoading}
              >
                {isLogin ? 'Sign up here' : 'Login here'}
              </button>
            </p>
          </div>
        </div>

        <div className="auth-features">
          <div className="feature-item">
            <span className="feature-icon">🎥</span>
            <span>Convert any media format</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">⚡</span>
            <span>Desktop performance</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">🔒</span>
            <span>Secure & private</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">💾</span>
            <span>Offline capable</span>
          </div>
        </div>

        <p className="auth-terms">
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
};

export default AuthScreen;
