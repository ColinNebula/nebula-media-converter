/**
 * Clear Service Workers
 * Removes any registered service workers that might be causing issues
 */

(function() {
  'use strict';

  if ('serviceWorker' in navigator) {
    // Get all registrations
    navigator.serviceWorker.getRegistrations().then(function(registrations) {
      if (registrations.length === 0) {
        console.log('ℹ️ No service workers registered');
        return;
      }

      console.log(`🗑️ Unregistering ${registrations.length} service worker(s)...`);
      
      // Unregister all service workers
      for (let registration of registrations) {
        registration.unregister().then(function(success) {
          if (success) {
            console.log('✅ Service worker unregistered:', registration.scope);
          }
        }).catch(function(error) {
          console.error('❌ Failed to unregister service worker:', error);
        });
      }
    }).catch(function(error) {
      console.error('Error getting service worker registrations:', error);
    });

    // Also clear service worker controller if present
    if (navigator.serviceWorker.controller) {
      console.log('🔄 Active service worker controller found, clearing...');
      navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
    }

    // Prevent service worker errors from showing in console
    const originalError = console.error;
    console.error = function(...args) {
      const msg = String(args[0] || '');
      
      // Suppress service worker fetch errors
      if (
        msg.includes('Failed to fetch') ||
        msg.includes('sw.js') ||
        msg.includes('service-worker') ||
        msg.includes('ServiceWorker')
      ) {
        return; // Suppress
      }
      
      originalError.apply(console, args);
    };
  }

  // Debug message disabled for cleaner console
  // console.log('🛡️ Service worker cleanup initialized');
})();
