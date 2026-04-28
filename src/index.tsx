import ReactDOM from 'react-dom/client';
import './index.css';
import './styles/dark-theme.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './components/Toast';
import ErrorBoundary from './components/ErrorBoundary';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>
);

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

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
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

