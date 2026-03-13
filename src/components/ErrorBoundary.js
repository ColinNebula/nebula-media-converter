import React from 'react';
import './ErrorBoundary.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    console.error('Error Boundary Caught:', error, errorInfo);
    
    this.setState(prevState => ({
      error,
      errorInfo,
      errorCount: prevState.errorCount + 1
    }));

    // Log to error reporting service (e.g., Sentry)
    if (window.errorReporter) {
      window.errorReporter.logError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
    window.location.reload();
  };

  handleReportIssue = () => {
    const { error, errorInfo } = this.state;
    const issueBody = encodeURIComponent(
      `**Error Description:**\n\n` +
      `${error?.toString()}\n\n` +
      `**Stack Trace:**\n\`\`\`\n${errorInfo?.componentStack}\n\`\`\``
    );
    window.open(
      `https://github.com/ColinNebula/nebula-media-converter/issues/new?title=Error%20Report&body=${issueBody}`,
      '_blank'
    );
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-boundary-container">
            <div className="error-icon">⚠️</div>
            <h1>Oops! Something went wrong</h1>
            <p className="error-message">
              We're sorry, but the application encountered an unexpected error.
            </p>

            {this.state.error && (
              <details className="error-details">
                <summary>Error Details (for developers)</summary>
                <div className="error-content">
                  <p className="error-type">
                    <strong>Error:</strong> {this.state.error.toString()}
                  </p>
                  {this.state.errorInfo && (
                    <pre className="error-stack">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              </details>
            )}

            <div className="error-actions">
              <button 
                className="btn-primary" 
                onClick={this.handleReset}
              >
                🔄 Reload Application
              </button>
              <button 
                className="btn-secondary" 
                onClick={this.handleReportIssue}
              >
                🐛 Report Issue
              </button>
              <button 
                className="btn-tertiary" 
                onClick={() => window.history.back()}
              >
                ← Go Back
              </button>
            </div>

            <div className="error-tips">
              <h3>💡 Quick Fixes:</h3>
              <ul>
                <li>Try refreshing the page</li>
                <li>Clear your browser cache and cookies</li>
                <li>Try using a different browser</li>
                <li>Check if your browser is up to date</li>
              </ul>
            </div>

            <div className="error-footer">
              <p>Error Count: {this.state.errorCount}</p>
              <p>Time: {new Date().toLocaleString()}</p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
