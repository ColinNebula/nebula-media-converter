/**
 * React Error Overlay Filter
 * Prevents React DevTools errors from appearing in the error overlay
 * 
 * NOTE: Only suppresses console messages and overlay display,
 * does NOT use stopImmediatePropagation which can break React events
 */

(function() {
  'use strict';

  // Patterns to filter from error overlay
  const filterPatterns = [
    /addObjectDiffToProperties/,
    /logComponentRender/,
    /Should not already be working/,
    /commitPassiveMountOnFiber/,
    /performWorkOnRoot/,
    /performWorkOnRootViaSchedulerTask/,
    /performWorkUntilDeadline/,
    /Cannot read properties of undefined.*reading 'toString'/,
    /recursivelyTraversePassiveMountEffects/
  ];

  function shouldFilterError(error) {
    if (!error) return false;
    
    const message = error.message || error.toString();
    const stack = error.stack || '';
    
    return filterPatterns.some(pattern => 
      pattern.test(message) || pattern.test(stack)
    );
  }

  // Try to intercept react-error-overlay directly (without blocking events)
  const interval = setInterval(() => {
    try {
      // Check if react-error-overlay has loaded
      if (window.__REACT_ERROR_OVERLAY_GLOBAL_HOOK__) {
        const overlay = window.__REACT_ERROR_OVERLAY_GLOBAL_HOOK__;
        
        // Wrap the error handler
        if (overlay.handleRuntimeError && !overlay._patched) {
          const original = overlay.handleRuntimeError;
          overlay.handleRuntimeError = function(error) {
            if (!shouldFilterError(error)) {
              original.call(this, error);
            }
          };
          overlay._patched = true;
        }
        
        clearInterval(interval);
      }
    } catch (e) {
      // Ignore errors when trying to intercept
    }
  }, 100);

  // Stop trying after 5 seconds
  setTimeout(() => clearInterval(interval), 5000);
})();
