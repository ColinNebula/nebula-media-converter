/**
 * UI Block Diagnostic Tool
 * Checks for elements blocking user interactions
 * 
 * Usage: Call window.diagnoseUI() from the console to run diagnostics
 */

(function() {
  'use strict';
  
  // Only run automatically if DEBUG_UI is set
  const autoRun = window.DEBUG_UI === true;
  
  function diagnoseUIBlocks() {
    const results = {
      overlays: [],
      highZIndex: [],
      pointerEventsNone: [],
      fixedElements: []
    };
    
    // Check all elements
    const allElements = document.querySelectorAll('*');
    
    allElements.forEach(el => {
      const styles = window.getComputedStyle(el);
      const zIndex = parseInt(styles.zIndex);
      
      // Check for high z-index elements
      if (zIndex > 1000) {
        const display = styles.display;
        const visibility = styles.visibility;
        const opacity = parseFloat(styles.opacity);
        
        if (display !== 'none' && visibility !== 'hidden' && opacity > 0) {
          results.highZIndex.push({
            element: el.tagName + (el.className ? `.${el.className.split(' ')[0]}` : ''),
            zIndex: zIndex,
            position: styles.position,
            className: el.className,
            id: el.id
          });
        }
      }
      
      // Check for fixed position elements that might block
      if (styles.position === 'fixed' || styles.position === 'absolute') {
        const rect = el.getBoundingClientRect();
        if (rect.width > window.innerWidth * 0.5 && rect.height > window.innerHeight * 0.5) {
          results.fixedElements.push({
            element: el.tagName + (el.className ? `.${el.className.split(' ')[0]}` : ''),
            position: styles.position,
            dimensions: `${rect.width}x${rect.height}`,
            zIndex: zIndex
          });
        }
      }
      
      // Check for overlay classes
      if (el.className && typeof el.className === 'string') {
        if (el.className.includes('overlay') || el.className.includes('modal') || el.className.includes('splash')) {
          const display = styles.display;
          if (display !== 'none') {
            results.overlays.push({
              element: el.tagName,
              className: el.className,
              display: display,
              zIndex: zIndex
            });
          }
        }
      }
    });
    
    // Print results
    console.log('📊 Diagnostic Results:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    if (results.highZIndex.length > 0) {
      console.warn('⚠️ High Z-Index Elements (>1000):', results.highZIndex);
    } else {
      console.log('✅ No high z-index elements blocking UI');
    }
    
    if (results.overlays.length > 0) {
      console.warn('⚠️ Visible Overlays:', results.overlays);
    } else {
      console.log('✅ No overlays detected');
    }
    
    if (results.fixedElements.length > 0) {
      console.warn('⚠️ Large Fixed/Absolute Elements:', results.fixedElements);
    } else {
      console.log('✅ No blocking fixed elements');
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Check for splash screen specifically
    const splashScreen = document.querySelector('.splash-screen');
    if (splashScreen) {
      const styles = window.getComputedStyle(splashScreen);
      console.log('🔍 Splash Screen Status:');
      console.log('  - Display:', styles.display);
      console.log('  - Visibility:', styles.visibility);
      console.log('  - Opacity:', styles.opacity);
      console.log('  - Z-Index:', styles.zIndex);
      console.log('  - Pointer Events:', styles.pointerEvents);
      
      if (styles.display !== 'none') {
        console.error('❌ FOUND PROBLEM: Splash screen is still visible!');
        console.log('💡 Fix: Splash screen should have display:none when not loading');
      }
    } else {
      console.log('✅ No splash screen element found');
    }
    
    // Test click at center of screen
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const topElement = document.elementFromPoint(centerX, centerY);
    
    console.log('🎯 Element at screen center:', {
      tag: topElement?.tagName,
      className: topElement?.className,
      id: topElement?.id,
      zIndex: window.getComputedStyle(topElement || document.body).zIndex
    });
  }
  
  // Run on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', diagnoseUIBlocks);
  } else {
  // Expose function globally for manual testing
  window.diagnoseUI = diagnoseUIBlocks;
  
  // Only run automatically if DEBUG_UI flag is set
  if (autoRun) {
    console.log('🔍 Running UI Block Diagnostic...');
    diagnoseUIBlocks();
    
    // Run again after 2 seconds
    setTimeout(() => {
      console.log('\n🔍 Re-running diagnostic after 2 seconds...');
      diagnoseUIBlocks();
    }, 2000);
  }
  
  // Silent initialization message
  // console.log('💡 UI diagnostic available: call window.diagnoseUI() in console');
  
})();
