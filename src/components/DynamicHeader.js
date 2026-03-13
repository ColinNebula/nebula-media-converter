import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import NebulaLogo from './NebulaLogo';
import './DynamicHeader.css';

const DynamicHeader = ({ 
  isPremium, 
  userSubscription, 
  onAccountClick,
  onContactClick,
  isScrolled = false 
}) => {
  const { theme, toggleTheme, isDark } = useTheme();
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [headerHeight, setHeaderHeight] = useState('auto');

  // Handle scroll behavior
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // Scrolling down - hide header
        setIsVisible(false);
      } else {
        // Scrolling up - show header
        setIsVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  // Dynamic height based on content
  useEffect(() => {
    const updateHeight = () => {
      const header = document.querySelector('.dynamic-header');
      if (header) {
        setHeaderHeight(`${header.offsetHeight}px`);
      }
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return '🌅 Good Morning';
    if (hour < 18) return '☀️ Good Afternoon';
    return '🌙 Good Evening';
  };

  const formatTime = () => {
    return new Date().toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const [currentTime, setCurrentTime] = useState(formatTime());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(formatTime());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <>
      <div 
        className={`dynamic-header ${isVisible ? 'visible' : 'hidden'} ${isScrolled ? 'scrolled' : ''}`}
        data-theme={theme}
      >
        <div className="header-container">
          {/* Left Section - Logo and Brand */}
          <div className="header-left">
            <div className="logo-section">
              <NebulaLogo size={40} />
              <div className="brand-info">
                <h1 className="brand-title">⭐ Nebula Media Converter</h1>
                <p className="brand-subtitle">Convert media files and documents with ease</p>
              </div>
            </div>
          </div>

          {/* Center Section - Dynamic Content */}
          <div className="header-center">
            <div className="time-greeting">
              <span className="greeting">{getGreeting()}</span>
              <span className="current-time">{currentTime}</span>
            </div>
          </div>

          {/* Right Section - User Info and Controls */}
          <div className="header-right">
            <div className="user-status">
              {isPremium ? (
                <div className="premium-badge">
                  <span className="premium-icon">✨</span>
                  <span className="premium-text">Premium Active</span>
                </div>
              ) : (
                <div className="free-badge">
                  <span className="free-icon">🆓</span>
                  <span className="free-text">Free Version</span>
                </div>
              )}
              
              {userSubscription && (
                <div className="user-welcome">
                  <span className="welcome-text">
                    Welcome, {userSubscription.user?.name || 'User'}!
                  </span>
                </div>
              )}
            </div>

            <div className="header-controls">
              {/* Theme Toggle */}
              <button 
                className={`theme-toggle ${isDark ? 'dark' : 'light'}`}
                onClick={toggleTheme}
                title={`Switch to ${isDark ? 'light' : 'dark'} theme (Ctrl+D)`}
                aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
              >
                <span className="theme-toggle-track">
                  <span className="theme-toggle-thumb">
                    <span className="theme-icon">
                      {isDark ? '☀️' : '🌙'}
                    </span>
                  </span>
                </span>
                <span className="theme-label">
                  {isDark ? 'Light Mode' : 'Dark Mode'}
                </span>
              </button>

              {/* User Account Button */}
              <button 
                className="account-btn"
                onClick={() => {
                  console.log('👤 Account button clicked in header!');
                  if (onAccountClick) {
                    onAccountClick();
                  } else {
                    console.warn('⚠️ onAccountClick prop not provided');
                    window.dispatchEvent(new CustomEvent('open-user-dashboard'));
                  }
                }}
                title="View your account and usage stats"
              >
                <span className="account-icon">👤</span>
                <span className="account-text">Account</span>
              </button>

              {/* Contact Button */}
              <button 
                className="contact-btn"
                onClick={onContactClick}
                title="Contact us for support or feedback"
              >
                <span className="contact-icon">📧</span>
                <span className="contact-text">Contact</span>
              </button>
            </div>
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="scroll-progress">
          <div 
            className="scroll-progress-bar"
            style={{
              width: `${Math.min((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100, 100)}%`
            }}
          />
        </div>
      </div>

      {/* Header Spacer */}
      <div 
        className="header-spacer" 
        style={{ height: headerHeight }}
      />
    </>
  );
};

export default DynamicHeader;