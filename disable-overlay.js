/**
 * Completely disable webpack/React error overlay for React DevTools conflicts
 * This aggressively removes the error overlay UI without blocking click events
 */

(function() {
  'use strict';
  
  // List of errors to suppress
  const SUPPRESSED_ERRORS = [
    'addObjectDiffToProperties',
    'logComponentRender',
    'Should not already be working',
    'commitPassiveMountOnFiber',
    'performWorkOnRoot',
    'performWorkOnRootViaSchedulerTask',
    'performWorkUntilDeadline',
    'recursivelyTraversePassiveMountEffects',
    'Cannot read properties of undefined',
    'reading \'toString\''
  ];

  function shouldSuppressError(text) {
    if (!text) return false;
    const message = typeof text === 'string' ? text : (text.message || text.toString?.() || String(text));
    return SUPPRESSED_ERRORS.some(pattern => message.includes(pattern));
  }

  // Function to remove error overlay elements
  function removeErrorOverlays() {
    // Remove any iframe-based error overlays
    document.querySelectorAll('iframe').forEach(iframe => {
      try {
        // Check if it looks like an error overlay (fixed position, full screen)
        const style = iframe.style;
        if (style.position === 'fixed' && 
            (style.top === '0px' || style.top === '0') &&
            (style.left === '0px' || style.left === '0')) {
          // Check content if accessible
          try {
            const doc = iframe.contentDocument || iframe.contentWindow?.document;
            if (doc && shouldSuppressError(doc.body?.innerText)) {
              iframe.remove();
              return;
            }
          } catch (e) {}
          
          // If we can't access content but it looks like webpack overlay, check src
          if (iframe.src?.includes('webpack') || !iframe.src) {
            // Could be error overlay, remove it
            iframe.remove();
          }
        }
      } catch (e) {}
    });

    // Remove react-error-overlay container
    const overlayContainer = document.getElementById('webpack-dev-server-client-overlay');
    if (overlayContainer) {
      overlayContainer.remove();
    }

    // Remove any fixed position div that contains error text
    document.querySelectorAll('div[style*="position: fixed"]').forEach(div => {
      if (shouldSuppressError(div.innerText)) {
        div.remove();
      }
    });
  }

  // Run removal periodically
  const interval = setInterval(removeErrorOverlays, 200);
  
  // Also run on DOM changes
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === 1) {
          // Check if it's an iframe or fixed div
          if (node.tagName === 'IFRAME' || 
              (node.tagName === 'DIV' && node.style?.position === 'fixed')) {
            setTimeout(removeErrorOverlays, 50);
            return;
          }
        }
      }
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  // Stop interval after 60 seconds but keep observer
  setTimeout(() => clearInterval(interval), 60000);

  // Patch webpack dev server client if it exists
  const patchInterval = setInterval(() => {
    try {
      if (window.__webpack_dev_server_client__?.overlay) {
        const client = window.__webpack_dev_server_client__;
        client.overlay.showMessage = function() {};
        client.overlay.show = function() {};
        clearInterval(patchInterval);
      }
    } catch (e) {}
  }, 100);
  
  setTimeout(() => clearInterval(patchInterval), 10000);

  // Also intercept the error reporting
  if (typeof window !== 'undefined') {
    // Override window.reportError if it exists
    window.reportError = function(error) {
      if (!shouldSuppressError(error)) {
        console.error(error);
      }
    };
  }
})();
