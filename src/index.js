import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './styles/dark-theme.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './components/Toast';
import ErrorBoundary from './components/ErrorBoundary';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';

// Suppress React DevTools and extension errors (temporarily disabled for debugging)
if (typeof window !== 'undefined') {
  const originalError = console.error;
  
  // eslint-disable-next-line no-func-assign
  console.error = (...args) => {
    const msg = args[0]?.toString ? args[0].toString() : String(args[0] || '');
    
    // Only suppress extension errors, not app errors
    if (
      msg.includes('contentScript') ||
      msg.includes('chrome-extension') ||
      msg.includes('Failed to fetch')
    ) {
      return;
    }
    
    originalError.apply(console, args);
  };

  // Disable React DevTools profiler in development
  if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    window.__REACT_DEVTOOLS_GLOBAL_HOOK__.inject = function() {};
  }
}

const root = ReactDOM.createRoot(document.getElementById('root'));

// Add error boundary at the top level
try {
  root.render(
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
} catch (error) {
  console.error('Error rendering app:', error);
  // Fallback rendering
  root.render(
    <div style={{padding: '20px', fontFamily: 'Arial'}}>
      <h1>Error Loading App</h1>
      <p>Please check the console for details.</p>
      <pre>{error.toString()}</pre>
    </div>
  );
}

// Register PWA service worker for offline support
// Disable in development if causing issues - add ?nosw=1 to URL
const urlParams = new URLSearchParams(window.location.search);
const disableSW =
  process.env.NODE_ENV !== 'production' || // never run in dev — SW caches stale bundles
  urlParams.get('nosw') === '1' ||
  process.env.REACT_APP_DISABLE_SW === 'true';

if (disableSW) {
  serviceWorkerRegistration.unregister();
} else {
  serviceWorkerRegistration.register({
    onSuccess: (registration) => {
      // PWA ready
    },
    onUpdate: (registration) => {
      // New version available
      if (registration && registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
    }
  });
}

// Expose cache clearing function globally for debugging
window.clearNebulaCache = async () => {
  const { clearAllCaches } = await import('./serviceWorkerRegistration');
  await clearAllCaches();
  console.log('✅ Cache cleared! Refreshing...');
  window.location.reload(true);
};

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();

