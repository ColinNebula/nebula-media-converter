import React, { useState, useEffect } from 'react';
import VirtualList from './VirtualList';
import './ConversionHistory.css';

const ConversionHistory = ({ onClose }) => {
  const [history, setHistory] = useState([]);
  const [filter, setFilter] = useState('all'); // all, success, failed
  const [sortBy, setSortBy] = useState('date'); // date, name, size

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = () => {
    const saved = localStorage.getItem('nebula_conversion_history');
    if (saved) {
      setHistory(JSON.parse(saved));
    }
  };

  const addToHistory = (conversion) => {
    const newHistory = [
      {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        ...conversion
      },
      ...history
    ].slice(0, 100); // Keep only last 100

    setHistory(newHistory);
    localStorage.setItem('nebula_conversion_history', JSON.stringify(newHistory));
  };

  const clearHistory = () => {
    if (window.confirm('Are you sure you want to clear all conversion history?')) {
      setHistory([]);
      localStorage.removeItem('nebula_conversion_history');
    }
  };

  const deleteItem = (id) => {
    const newHistory = history.filter(item => item.id !== id);
    setHistory(newHistory);
    localStorage.setItem('nebula_conversion_history', JSON.stringify(newHistory));
  };

  const downloadAgain = (item) => {
    // Trigger download if file still exists
    if (item.downloadUrl) {
      const a = document.createElement('a');
      a.href = item.downloadUrl;
      a.download = item.outputName;
      a.click();
    }
  };

  const filteredHistory = history
    .filter(item => {
      if (filter === 'all') return true;
      return item.status === filter;
    })
    .sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.timestamp) - new Date(a.timestamp);
      } else if (sortBy === 'name') {
        return a.fileName.localeCompare(b.fileName);
      } else if (sortBy === 'size') {
        return b.fileSize - a.fileSize;
      }
      return 0;
    });

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  // Render function for VirtualList
  const renderHistoryItem = (item) => (
    <div className={`history-item ${item.status}`}>
      <div className="item-icon">
        {item.status === 'success' ? '✅' : '❌'}
      </div>
      <div className="item-details">
        <div className="item-name">{item.fileName}</div>
        <div className="item-meta">
          <span>{item.fromFormat} → {item.toFormat}</span>
          <span>•</span>
          <span>{formatFileSize(item.fileSize)}</span>
          <span>•</span>
          <span>{formatDate(item.timestamp)}</span>
        </div>
        {item.error && (
          <div className="item-error">{item.error}</div>
        )}
      </div>
      <div className="item-actions">
        {item.status === 'success' && item.downloadUrl && (
          <button 
            className="action-btn download"
            onClick={() => downloadAgain(item)}
            title="Download again"
          >
            ⬇️
          </button>
        )}
        <button 
          className="action-btn delete"
          onClick={() => deleteItem(item.id)}
          title="Delete from history"
        >
          🗑️
        </button>
      </div>
    </div>
  );

  return (
    <div className="conversion-history-overlay" onClick={onClose}>
      <div className="conversion-history-modal" onClick={(e) => e.stopPropagation()}>
        <div className="history-header">
          <h2>📊 Conversion History</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="history-controls">
          <div className="filter-group">
            <label>Filter:</label>
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">All ({history.length})</option>
              <option value="success">Success ({history.filter(h => h.status === 'success').length})</option>
              <option value="failed">Failed ({history.filter(h => h.status === 'failed').length})</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Sort by:</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="date">Date</option>
              <option value="name">Name</option>
              <option value="size">Size</option>
            </select>
          </div>

          <button className="clear-history-btn" onClick={clearHistory}>
            🗑️ Clear All
          </button>
        </div>

        {/* Use VirtualList for performance with large histories */}
        <VirtualList
          items={filteredHistory}
          itemHeight={80}
          containerHeight={450}
          renderItem={renderHistoryItem}
          emptyMessage={
            <div className="empty-history">
              <div className="empty-icon">📭</div>
              <p>No conversion history found</p>
              <span>Your converted files will appear here</span>
            </div>
          }
        />

        <div className="history-footer">
          <p>Showing {filteredHistory.length} of {history.length} conversions</p>
          <p className="history-note">
            💡 History is stored locally in your browser
          </p>
        </div>
      </div>
    </div>
  );
};

// Export helper function to add to history from other components
export const addConversionToHistory = (conversion) => {
  const history = JSON.parse(localStorage.getItem('nebula_conversion_history') || '[]');
  const newHistory = [
    {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      ...conversion
    },
    ...history
  ].slice(0, 100);

  localStorage.setItem('nebula_conversion_history', JSON.stringify(newHistory));
};

export default ConversionHistory;
