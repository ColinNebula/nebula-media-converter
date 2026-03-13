/**
 * Suppress Browser Extension Errors
 * Add this script to your index.html to filter out extension errors during development
 * 
 * This prevents extension errors from cluttering your console
 * while still showing YOUR app's errors
 * 
 * NOTE: Only suppresses console messages, does NOT intercept click events
 */

(function() {
  'use strict';

  // Create patterns early
  const extensionPatterns = [
    /chrome-extension:\/\//,
    /moz-extension:\/\//,
    /contentScript\.js/,
    /content_script\.js/,
    /content-script\.js/i,
    /frame-ancestors.*meta.*element/i,
    /Content Security Policy.*ignored.*meta/i,
    /injected\.js/,
    /installHook\.js/,
    /React DevTools failed to get Console Patching settings/,
    /Console won't be patched/,
    /addObjectDiffToProperties/,
    /logComponentRender/,
    /commitPassiveMountOnFiber/,
    /Should not already be working/,
    /performWorkOnRoot/,
    /performWorkOnRootViaSchedulerTask/,
    /reading 'toString'/,
  ];

  // Helper to check if error is from extension
  function isExtensionSource(source) {
    if (!source) return false;
    const src = String(source);
    return src.includes('extension://') || 
           src.includes('contentScript') || 
           src.includes('chrome-extension') ||
           src.includes('moz-extension');
  }

  function isExtensionMessage(message) {
    if (!message) return false;
    const msg = String(message);
    return extensionPatterns.some(pattern => pattern.test(msg));
  }

  // Store original console methods
  const originalError = console.error;
  const originalWarn = console.warn;

  // Check if error is from an extension
  function isExtensionError(args) {
    const message = args.join(' ');
    return extensionPatterns.some(pattern => pattern.test(message));
  }

  // Override console.error - only suppress console messages, not events
  console.error = function(...args) {
    if (!isExtensionError(args)) {
      originalError.apply(console, args);
    }
  };

  // Override console.warn - only suppress console messages
  console.warn = function(...args) {
    const message = args.join(' ');
    if (!isExtensionMessage(message)) {
      originalWarn.apply(console, args);
    }
  };

  // NOTE: We intentionally do NOT use stopImmediatePropagation() on error events
  // because that can interfere with React's event handling system
})();

