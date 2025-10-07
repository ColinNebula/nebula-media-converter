import React, { useState, useEffect } from 'react';
import './AdminDashboard.css';
import adminAuthService from '../services/AdminAuthService';
import EmailManager from './EmailManager';
import PaymentManager from './PaymentManager';
import UserManager from './UserManager';
import SystemMonitor from './SystemMonitor';
import ConversionAnalytics from './ConversionAnalytics';

const AdminDashboard = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [adminSession, setAdminSession] = useState(null);
  const [systemStats, setSystemStats] = useState({});
  const [userStats, setUserStats] = useState({});
  const [conversionStats, setConversionStats] = useState({});
  const [activityLogs, setActivityLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAdminData();
    const interval = setInterval(loadAdminData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAdminData = async () => {
    try {
      const session = adminAuthService.getCurrentSession();
      if (!session) {
        onLogout();
        return;
      }

      setAdminSession(session);

      // Load system statistics (mock data for demo)
      setSystemStats({
        uptime: '99.9%',
        totalUsers: 1247,
        activeUsers: 89,
        totalConversions: 15673,
        storageUsed: '2.3 TB',
        bandwidthUsed: '15.2 TB',
        serverLoad: 45,
        memoryUsage: 67,
        diskUsage: 34
      });

      setUserStats({
        freeUsers: 1089,
        proUsers: 134,
        businessUsers: 24,
        newSignups: 23,
        churnRate: 2.3
      });

      setConversionStats({
        totalToday: 456,
        successRate: 98.7,
        averageTime: '2.3 min',
        popularFormats: ['MP4', 'MP3', 'PDF', 'DOCX'],
        queueLength: 12
      });

      // Get activity logs
      const logs = adminAuthService.getActivityLogs(50);
      setActivityLogs(logs);

    } catch (error) {
      console.error('Failed to load admin data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    adminAuthService.logout();
    onLogout();
  };

  const formatTimeAgo = (timestamp) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  const getActivityIcon = (action) => {
    const icons = {
      'LOGIN': '🔓',
      'LOGOUT': '🔒',
      'LOGIN_FAILED': '❌',
      'PASSWORD_CHANGED': '🔑',
      'USER_CREATED': '👤',
      'CONVERSION_STARTED': '🔄',
      'CONVERSION_COMPLETED': '✅',
      'SYSTEM_UPDATE': '⚙️'
    };
    return icons[action] || '📝';
  };

  if (isLoading) {
    return (
      <div className="admin-loading">
        <div className="loading-spinner"></div>
        <p>Loading admin dashboard...</p>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <div className="admin-brand">
          <span className="admin-logo">🛡️</span>
          <div className="brand-info">
            <h1>Nebula Admin</h1>
            <p>Media Converter Administration</p>
          </div>
        </div>

        <div className="admin-user-info">
          <div className="user-details">
            <span className="user-name">{adminSession?.username}</span>
            <span className="user-role">{adminSession?.role}</span>
          </div>
          <button className="logout-btn" onClick={handleLogout}>
            <span className="logout-icon">🚪</span>
            Logout
          </button>
        </div>
      </header>

      <nav className="admin-nav">
        <button 
          className={`nav-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <span className="nav-icon">📊</span>
          Overview
        </button>
        <button 
          className={`nav-btn ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <span className="nav-icon">👥</span>
          Users
        </button>
        <button 
          className={`nav-btn ${activeTab === 'conversions' ? 'active' : ''}`}
          onClick={() => setActiveTab('conversions')}
        >
          <span className="nav-icon">🔄</span>
          Conversions
        </button>
        <button 
          className={`nav-btn ${activeTab === 'system' ? 'active' : ''}`}
          onClick={() => setActiveTab('system')}
        >
          <span className="nav-icon">⚙️</span>
          System
        </button>
        <button 
          className={`nav-btn ${activeTab === 'logs' ? 'active' : ''}`}
          onClick={() => setActiveTab('logs')}
        >
          <span className="nav-icon">📜</span>
          Activity Logs
        </button>
        <button 
          className={`nav-btn ${activeTab === 'email' ? 'active' : ''}`}
          onClick={() => setActiveTab('email')}
        >
          <span className="nav-icon">📧</span>
          Email Management
        </button>
        <button 
          className={`nav-btn ${activeTab === 'payments' ? 'active' : ''}`}
          onClick={() => setActiveTab('payments')}
        >
          <span className="nav-icon">💳</span>
          Payment Management
        </button>
      </nav>

      <main className="admin-content">
        {activeTab === 'overview' && (
          <div className="overview-tab">
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">👥</div>
                <div className="stat-info">
                  <h3>{systemStats.totalUsers}</h3>
                  <p>Total Users</p>
                  <span className="stat-change positive">+{userStats.newSignups} today</span>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">🔄</div>
                <div className="stat-info">
                  <h3>{systemStats.totalConversions}</h3>
                  <p>Total Conversions</p>
                  <span className="stat-change positive">+{conversionStats.totalToday} today</span>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">💾</div>
                <div className="stat-info">
                  <h3>{systemStats.storageUsed}</h3>
                  <p>Storage Used</p>
                  <span className="stat-change neutral">34% capacity</span>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">📈</div>
                <div className="stat-info">
                  <h3>{systemStats.uptime}</h3>
                  <p>System Uptime</p>
                  <span className="stat-change positive">Excellent</span>
                </div>
              </div>
            </div>

            <div className="charts-grid">
              <div className="chart-card">
                <h3>System Performance</h3>
                <div className="performance-metrics">
                  <div className="metric">
                    <span className="metric-label">Server Load</span>
                    <div className="metric-bar">
                      <div 
                        className="metric-fill" 
                        style={{ width: `${systemStats.serverLoad}%`, backgroundColor: '#00d4ff' }}
                      ></div>
                    </div>
                    <span className="metric-value">{systemStats.serverLoad}%</span>
                  </div>
                  <div className="metric">
                    <span className="metric-label">Memory Usage</span>
                    <div className="metric-bar">
                      <div 
                        className="metric-fill" 
                        style={{ width: `${systemStats.memoryUsage}%`, backgroundColor: '#7b68ee' }}
                      ></div>
                    </div>
                    <span className="metric-value">{systemStats.memoryUsage}%</span>
                  </div>
                  <div className="metric">
                    <span className="metric-label">Disk Usage</span>
                    <div className="metric-bar">
                      <div 
                        className="metric-fill" 
                        style={{ width: `${systemStats.diskUsage}%`, backgroundColor: '#f093fb' }}
                      ></div>
                    </div>
                    <span className="metric-value">{systemStats.diskUsage}%</span>
                  </div>
                </div>
              </div>

              <div className="chart-card">
                <h3>User Distribution</h3>
                <div className="user-distribution">
                  <div className="distribution-item">
                    <span className="distribution-color free"></span>
                    <span className="distribution-label">Free Users</span>
                    <span className="distribution-value">{userStats.freeUsers}</span>
                  </div>
                  <div className="distribution-item">
                    <span className="distribution-color pro"></span>
                    <span className="distribution-label">Pro Users</span>
                    <span className="distribution-value">{userStats.proUsers}</span>
                  </div>
                  <div className="distribution-item">
                    <span className="distribution-color business"></span>
                    <span className="distribution-label">Business Users</span>
                    <span className="distribution-value">{userStats.businessUsers}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="logs-tab">
            <div className="logs-header">
              <h2>Activity Logs</h2>
              <button className="refresh-btn" onClick={loadAdminData}>
                <span className="refresh-icon">🔄</span>
                Refresh
              </button>
            </div>

            <div className="logs-list">
              {activityLogs.map((log, index) => (
                <div key={index} className="log-entry">
                  <div className="log-icon">{getActivityIcon(log.action)}</div>
                  <div className="log-content">
                    <div className="log-action">{log.action.replace('_', ' ')}</div>
                    <div className="log-details">
                      {log.details.username && <span>User: {log.details.username}</span>}
                      {log.details.error && <span className="error">Error: {log.details.error}</span>}
                    </div>
                  </div>
                  <div className="log-time">{formatTimeAgo(log.timestamp)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'email' && (
          <div className="email-tab">
            <EmailManager />
          </div>
        )}

        {activeTab === 'payments' && (
          <div className="payments-tab">
            <PaymentManager />
          </div>
        )}

        {activeTab === 'users' && (
          <div className="users-tab">
            <UserManager />
          </div>
        )}

        {activeTab === 'conversions' && (
          <div className="conversions-tab">
            <ConversionAnalytics />
          </div>
        )}

        {activeTab === 'system' && (
          <div className="system-tab">
            <SystemMonitor />
          </div>
        )}

        {/* Add other tab content here */}
        {activeTab !== 'overview' && activeTab !== 'logs' && activeTab !== 'email' && activeTab !== 'payments' && activeTab !== 'users' && activeTab !== 'conversions' && activeTab !== 'system' && (
          <div className="coming-soon">
            <h2>🚧 {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Panel</h2>
            <p>This section is under development and will be available soon.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;