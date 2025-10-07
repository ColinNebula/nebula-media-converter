import React, { useState, useEffect } from 'react';
import './ConversionAnalytics.css';

const ConversionAnalytics = () => {
  const [analyticsData, setAnalyticsData] = useState({});
  const [timeRange, setTimeRange] = useState('7d');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalyticsData();
  }, [timeRange]);

  const loadAnalyticsData = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const mockData = generateMockAnalytics(timeRange);
      setAnalyticsData(mockData);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateMockAnalytics = (range) => {
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 1;
    const multiplier = days === 30 ? 4 : days === 7 ? 1 : 0.2;
    
    return {
      overview: {
        totalConversions: Math.floor((Math.random() * 5000 + 1000) * multiplier),
        successfulConversions: Math.floor((Math.random() * 4800 + 950) * multiplier),
        failedConversions: Math.floor((Math.random() * 200 + 50) * multiplier),
        averageTime: (Math.random() * 120 + 30).toFixed(1),
        totalDataProcessed: (Math.random() * 500 + 100).toFixed(1),
        peakHour: Math.floor(Math.random() * 12) + 9 // 9 AM to 9 PM
      },
      formats: {
        input: [
          { format: 'MP4', count: Math.floor(Math.random() * 1000 + 500), percentage: 35 },
          { format: 'AVI', count: Math.floor(Math.random() * 800 + 300), percentage: 25 },
          { format: 'MOV', count: Math.floor(Math.random() * 600 + 200), percentage: 20 },
          { format: 'WMV', count: Math.floor(Math.random() * 400 + 100), percentage: 12 },
          { format: 'Other', count: Math.floor(Math.random() * 300 + 50), percentage: 8 }
        ],
        output: [
          { format: 'MP4', count: Math.floor(Math.random() * 1200 + 600), percentage: 40 },
          { format: 'MP3', count: Math.floor(Math.random() * 900 + 400), percentage: 30 },
          { format: 'AVI', count: Math.floor(Math.random() * 600 + 200), percentage: 15 },
          { format: 'PDF', count: Math.floor(Math.random() * 300 + 100), percentage: 10 },
          { format: 'Other', count: Math.floor(Math.random() * 200 + 50), percentage: 5 }
        ]
      },
      timeline: generateTimelineData(days),
      users: {
        totalActiveUsers: Math.floor((Math.random() * 500 + 100) * multiplier),
        newUsers: Math.floor((Math.random() * 100 + 20) * multiplier),
        returningUsers: Math.floor((Math.random() * 400 + 80) * multiplier),
        premiumUsers: Math.floor((Math.random() * 50 + 10) * multiplier)
      },
      performance: {
        averageQueueTime: (Math.random() * 30 + 5).toFixed(1),
        serverLoad: Math.floor(Math.random() * 40 + 30),
        errorRate: (Math.random() * 2).toFixed(2),
        throughput: Math.floor(Math.random() * 100 + 50)
      }
    };
  };

  const generateTimelineData = (days) => {
    return Array.from({ length: days }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (days - index - 1));
      
      return {
        date: date.toISOString().split('T')[0],
        conversions: Math.floor(Math.random() * 200 + 50),
        successful: Math.floor(Math.random() * 190 + 45),
        failed: Math.floor(Math.random() * 10 + 2),
        users: Math.floor(Math.random() * 80 + 20)
      };
    });
  };

  const getSuccessRate = () => {
    const { totalConversions, successfulConversions } = analyticsData.overview || {};
    if (!totalConversions) return 0;
    return ((successfulConversions / totalConversions) * 100).toFixed(1);
  };

  const exportData = () => {
    const csvData = generateCSVData();
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversion-analytics-${timeRange}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generateCSVData = () => {
    const headers = ['Date', 'Total Conversions', 'Successful', 'Failed', 'Active Users'];
    const rows = analyticsData.timeline?.map(day => [
      day.date,
      day.conversions,
      day.successful,
      day.failed,
      day.users
    ]) || [];
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  };

  if (loading) {
    return (
      <div className="analytics-loading">
        <div className="loading-spinner"></div>
        <p>Loading analytics data...</p>
      </div>
    );
  }

  return (
    <div className="conversion-analytics">
      <div className="analytics-header">
        <h2>📊 Conversion Analytics</h2>
        <div className="analytics-controls">
          <select 
            value={timeRange} 
            onChange={(e) => setTimeRange(e.target.value)}
            className="time-range-select"
          >
            <option value="1d">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
          <button onClick={exportData} className="export-btn">
            📥 Export Data
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="overview-section">
        <div className="overview-grid">
          <div className="overview-card">
            <div className="card-icon">🔄</div>
            <div className="card-content">
              <h3>{analyticsData.overview?.totalConversions?.toLocaleString()}</h3>
              <p>Total Conversions</p>
            </div>
          </div>
          
          <div className="overview-card success">
            <div className="card-icon">✅</div>
            <div className="card-content">
              <h3>{getSuccessRate()}%</h3>
              <p>Success Rate</p>
            </div>
          </div>
          
          <div className="overview-card">
            <div className="card-icon">⏱️</div>
            <div className="card-content">
              <h3>{analyticsData.overview?.averageTime}s</h3>
              <p>Avg Processing Time</p>
            </div>
          </div>
          
          <div className="overview-card">
            <div className="card-icon">💾</div>
            <div className="card-content">
              <h3>{analyticsData.overview?.totalDataProcessed}GB</h3>
              <p>Data Processed</p>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline Chart */}
      <div className="chart-section">
        <h3>Conversion Timeline</h3>
        <div className="timeline-chart">
          {analyticsData.timeline?.map((day, index) => (
            <div key={day.date} className="timeline-bar">
              <div 
                className="bar successful"
                style={{ 
                  height: `${(day.successful / 200) * 100}%`,
                  backgroundColor: '#4caf50'
                }}
                title={`${day.successful} successful conversions`}
              ></div>
              <div 
                className="bar failed"
                style={{ 
                  height: `${(day.failed / 20) * 100}%`,
                  backgroundColor: '#f44336'
                }}
                title={`${day.failed} failed conversions`}
              ></div>
              <div className="bar-label">{day.date.split('-')[2]}</div>
            </div>
          ))}
        </div>
        <div className="chart-legend">
          <div className="legend-item">
            <span className="legend-color successful"></span>
            <span>Successful</span>
          </div>
          <div className="legend-item">
            <span className="legend-color failed"></span>
            <span>Failed</span>
          </div>
        </div>
      </div>

      {/* Format Statistics */}
      <div className="formats-section">
        <div className="format-charts">
          <div className="format-chart">
            <h3>Input Formats</h3>
            <div className="format-list">
              {analyticsData.formats?.input?.map((format, index) => (
                <div key={format.format} className="format-item">
                  <div className="format-info">
                    <span className="format-name">{format.format}</span>
                    <span className="format-count">{format.count.toLocaleString()}</span>
                  </div>
                  <div className="format-bar">
                    <div 
                      className="format-fill"
                      style={{ 
                        width: `${format.percentage}%`,
                        backgroundColor: `hsl(${210 + index * 30}, 70%, 50%)`
                      }}
                    ></div>
                  </div>
                  <span className="format-percentage">{format.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="format-chart">
            <h3>Output Formats</h3>
            <div className="format-list">
              {analyticsData.formats?.output?.map((format, index) => (
                <div key={format.format} className="format-item">
                  <div className="format-info">
                    <span className="format-name">{format.format}</span>
                    <span className="format-count">{format.count.toLocaleString()}</span>
                  </div>
                  <div className="format-bar">
                    <div 
                      className="format-fill"
                      style={{ 
                        width: `${format.percentage}%`,
                        backgroundColor: `hsl(${120 + index * 30}, 70%, 50%)`
                      }}
                    ></div>
                  </div>
                  <span className="format-percentage">{format.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* User & Performance Stats */}
      <div className="stats-section">
        <div className="stats-grid">
          <div className="stat-group">
            <h3>User Statistics</h3>
            <div className="stat-items">
              <div className="stat-item">
                <span className="stat-label">Total Active Users</span>
                <span className="stat-value">{analyticsData.users?.totalActiveUsers?.toLocaleString()}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">New Users</span>
                <span className="stat-value">{analyticsData.users?.newUsers?.toLocaleString()}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Returning Users</span>
                <span className="stat-value">{analyticsData.users?.returningUsers?.toLocaleString()}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Premium Users</span>
                <span className="stat-value">{analyticsData.users?.premiumUsers?.toLocaleString()}</span>
              </div>
            </div>
          </div>
          
          <div className="stat-group">
            <h3>Performance Metrics</h3>
            <div className="stat-items">
              <div className="stat-item">
                <span className="stat-label">Avg Queue Time</span>
                <span className="stat-value">{analyticsData.performance?.averageQueueTime}s</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Server Load</span>
                <span className="stat-value">{analyticsData.performance?.serverLoad}%</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Error Rate</span>
                <span className="stat-value">{analyticsData.performance?.errorRate}%</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Throughput</span>
                <span className="stat-value">{analyticsData.performance?.throughput}/min</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConversionAnalytics;