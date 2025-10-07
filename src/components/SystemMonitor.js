import React, { useState, useEffect } from 'react';
import './SystemMonitor.css';

const SystemMonitor = () => {
  const [systemData, setSystemData] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30); // seconds

  useEffect(() => {
    loadSystemData();
    
    const interval = setInterval(loadSystemData, refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  const loadSystemData = async () => {
    try {
      // Simulate loading real system data
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const mockSystemData = {
        server: {
          uptime: generateUptime(),
          cpu: Math.floor(Math.random() * 60) + 20,
          memory: Math.floor(Math.random() * 40) + 40,
          disk: Math.floor(Math.random() * 30) + 30,
          network: {
            incoming: Math.floor(Math.random() * 1000) + 100,
            outgoing: Math.floor(Math.random() * 800) + 50
          }
        },
        application: {
          activeConnections: Math.floor(Math.random() * 200) + 50,
          queueLength: Math.floor(Math.random() * 20),
          errorRate: (Math.random() * 2).toFixed(2),
          responseTime: (Math.random() * 300 + 50).toFixed(0),
          totalRequests: Math.floor(Math.random() * 10000) + 50000
        },
        database: {
          connections: Math.floor(Math.random() * 50) + 20,
          queries: Math.floor(Math.random() * 1000) + 500,
          slowQueries: Math.floor(Math.random() * 10),
          storage: Math.floor(Math.random() * 20) + 60
        },
        conversion: {
          activeJobs: Math.floor(Math.random() * 15),
          completedToday: Math.floor(Math.random() * 500) + 1000,
          failedToday: Math.floor(Math.random() * 20),
          averageTime: (Math.random() * 120 + 30).toFixed(1)
        },
        alerts: generateAlerts()
      };
      
      setSystemData(mockSystemData);
    } catch (error) {
      console.error('Failed to load system data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateUptime = () => {
    const days = Math.floor(Math.random() * 30) + 10;
    const hours = Math.floor(Math.random() * 24);
    const minutes = Math.floor(Math.random() * 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  const generateAlerts = () => {
    const alertTypes = ['warning', 'error', 'info'];
    const messages = [
      'High memory usage detected',
      'Disk space running low',
      'Database connection spike',
      'Slow query detected',
      'Failed conversion job',
      'System update available',
      'SSL certificate expires soon',
      'Backup completed successfully'
    ];

    const alertCount = Math.floor(Math.random() * 5);
    return Array.from({ length: alertCount }, (_, index) => ({
      id: `alert_${Date.now()}_${index}`,
      type: alertTypes[Math.floor(Math.random() * alertTypes.length)],
      message: messages[Math.floor(Math.random() * messages.length)],
      timestamp: Date.now() - (Math.random() * 24 * 60 * 60 * 1000)
    }));
  };

  const getStatusColor = (value, thresholds = { warning: 70, critical: 90 }) => {
    if (value >= thresholds.critical) return '#f44336';
    if (value >= thresholds.warning) return '#ff9800';
    return '#4caf50';
  };

  const getAlertIcon = (type) => {
    switch (type) {
      case 'error': return '🔴';
      case 'warning': return '🟡';
      case 'info': return '🔵';
      default: return '⚪';
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const restartService = (serviceName) => {
    if (window.confirm(`Are you sure you want to restart ${serviceName}?`)) {
      alert(`${serviceName} restart initiated (simulated)`);
    }
  };

  const clearCache = () => {
    if (window.confirm('Are you sure you want to clear all caches?')) {
      alert('Cache cleared successfully (simulated)');
    }
  };

  const runMaintenance = () => {
    if (window.confirm('This will run system maintenance tasks. Continue?')) {
      alert('Maintenance tasks started (simulated)');
    }
  };

  if (loading) {
    return (
      <div className="system-loading">
        <div className="loading-spinner"></div>
        <p>Loading system data...</p>
      </div>
    );
  }

  return (
    <div className="system-monitor">
      <div className="system-header">
        <h2>⚙️ System Monitor</h2>
        <div className="refresh-controls">
          <label>Refresh every:</label>
          <select 
            value={refreshInterval} 
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
          >
            <option value={10}>10 seconds</option>
            <option value={30}>30 seconds</option>
            <option value={60}>1 minute</option>
            <option value={300}>5 minutes</option>
          </select>
          <button onClick={() => loadSystemData()} className="refresh-btn">
            🔄 Refresh Now
          </button>
        </div>
      </div>

      {/* Server Metrics */}
      <div className="metrics-section">
        <h3>Server Health</h3>
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-header">
              <span className="metric-icon">⏱️</span>
              <h4>Uptime</h4>
            </div>
            <div className="metric-value">{systemData.server?.uptime}</div>
          </div>
          
          <div className="metric-card">
            <div className="metric-header">
              <span className="metric-icon">🖥️</span>
              <h4>CPU Usage</h4>
            </div>
            <div className="metric-value" style={{ color: getStatusColor(systemData.server?.cpu) }}>
              {systemData.server?.cpu}%
            </div>
            <div className="metric-bar">
              <div 
                className="metric-fill" 
                style={{ 
                  width: `${systemData.server?.cpu}%`,
                  backgroundColor: getStatusColor(systemData.server?.cpu)
                }}
              ></div>
            </div>
          </div>
          
          <div className="metric-card">
            <div className="metric-header">
              <span className="metric-icon">💾</span>
              <h4>Memory</h4>
            </div>
            <div className="metric-value" style={{ color: getStatusColor(systemData.server?.memory) }}>
              {systemData.server?.memory}%
            </div>
            <div className="metric-bar">
              <div 
                className="metric-fill" 
                style={{ 
                  width: `${systemData.server?.memory}%`,
                  backgroundColor: getStatusColor(systemData.server?.memory)
                }}
              ></div>
            </div>
          </div>
          
          <div className="metric-card">
            <div className="metric-header">
              <span className="metric-icon">💿</span>
              <h4>Disk Usage</h4>
            </div>
            <div className="metric-value" style={{ color: getStatusColor(systemData.server?.disk) }}>
              {systemData.server?.disk}%
            </div>
            <div className="metric-bar">
              <div 
                className="metric-fill" 
                style={{ 
                  width: `${systemData.server?.disk}%`,
                  backgroundColor: getStatusColor(systemData.server?.disk)
                }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Application Metrics */}
      <div className="metrics-section">
        <h3>Application Performance</h3>
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-header">
              <span className="metric-icon">🔗</span>
              <h4>Active Connections</h4>
            </div>
            <div className="metric-value">{systemData.application?.activeConnections}</div>
          </div>
          
          <div className="metric-card">
            <div className="metric-header">
              <span className="metric-icon">📊</span>
              <h4>Queue Length</h4>
            </div>
            <div className="metric-value">{systemData.application?.queueLength}</div>
          </div>
          
          <div className="metric-card">
            <div className="metric-header">
              <span className="metric-icon">⚡</span>
              <h4>Response Time</h4>
            </div>
            <div className="metric-value">{systemData.application?.responseTime}ms</div>
          </div>
          
          <div className="metric-card">
            <div className="metric-header">
              <span className="metric-icon">❌</span>
              <h4>Error Rate</h4>
            </div>
            <div className="metric-value">{systemData.application?.errorRate}%</div>
          </div>
        </div>
      </div>

      {/* Conversion Stats */}
      <div className="metrics-section">
        <h3>Conversion Statistics</h3>
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-header">
              <span className="metric-icon">🔄</span>
              <h4>Active Jobs</h4>
            </div>
            <div className="metric-value">{systemData.conversion?.activeJobs}</div>
          </div>
          
          <div className="metric-card">
            <div className="metric-header">
              <span className="metric-icon">✅</span>
              <h4>Completed Today</h4>
            </div>
            <div className="metric-value">{systemData.conversion?.completedToday}</div>
          </div>
          
          <div className="metric-card">
            <div className="metric-header">
              <span className="metric-icon">❌</span>
              <h4>Failed Today</h4>
            </div>
            <div className="metric-value">{systemData.conversion?.failedToday}</div>
          </div>
          
          <div className="metric-card">
            <div className="metric-header">
              <span className="metric-icon">⏱️</span>
              <h4>Avg Time</h4>
            </div>
            <div className="metric-value">{systemData.conversion?.averageTime}s</div>
          </div>
        </div>
      </div>

      {/* System Alerts */}
      <div className="alerts-section">
        <h3>System Alerts</h3>
        {systemData.alerts?.length > 0 ? (
          <div className="alerts-list">
            {systemData.alerts.map(alert => (
              <div key={alert.id} className={`alert-item ${alert.type}`}>
                <span className="alert-icon">{getAlertIcon(alert.type)}</span>
                <div className="alert-content">
                  <div className="alert-message">{alert.message}</div>
                  <div className="alert-timestamp">{formatTimestamp(alert.timestamp)}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-alerts">
            <span className="success-icon">✅</span>
            <p>All systems running normally</p>
          </div>
        )}
      </div>

      {/* System Actions */}
      <div className="actions-section">
        <h3>System Actions</h3>
        <div className="action-buttons">
          <button onClick={() => restartService('Web Server')} className="action-btn warning">
            🔄 Restart Web Server
          </button>
          <button onClick={() => restartService('Database')} className="action-btn warning">
            🔄 Restart Database
          </button>
          <button onClick={clearCache} className="action-btn">
            🗑️ Clear Cache
          </button>
          <button onClick={runMaintenance} className="action-btn">
            🔧 Run Maintenance
          </button>
        </div>
      </div>
    </div>
  );
};

export default SystemMonitor;