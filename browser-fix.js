/**
 * Browser Compatibility Fix Script
 * Run this in the browser console if the app isn't working properly
 * 
 * Usage: Copy and paste this entire script into the browser console (F12 -> Console)
 */

(async function browserFix() {
  console.log('🔧 Starting Nebula Media Converter browser fix...\n');
  
  let fixes = 0;
  
  // 1. Unregister all service workers
  console.log('1️⃣ Checking service workers...');
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    if (registrations.length > 0) {
      for (const registration of registrations) {
        await registration.unregister();
        fixes++;
        console.log('   ✅ Unregistered:', registration.scope);
      }
    } else {
      console.log('   ℹ️ No service workers registered');
    }
  } else {
    console.log('   ⚠️ Service Workers not supported');
  }
  
  // 2. Clear all caches
  console.log('\n2️⃣ Clearing caches...');
  if ('caches' in window) {
    const cacheNames = await caches.keys();
    if (cacheNames.length > 0) {
      for (const cacheName of cacheNames) {
        await caches.delete(cacheName);
        fixes++;
        console.log('   ✅ Deleted cache:', cacheName);
      }
    } else {
      console.log('   ℹ️ No caches to clear');
    }
  } else {
    console.log('   ⚠️ Cache API not supported');
  }
  
  // 3. Clear localStorage data (optional - preserves user preferences)
  console.log('\n3️⃣ Checking localStorage...');
  const lsKeys = Object.keys(localStorage).filter(k => k.startsWith('nebula'));
  console.log('   ℹ️ Found', lsKeys.length, 'Nebula-related localStorage entries');
  console.log('   ℹ️ Run localStorage.clear() manually if needed');
  
  // 4. Clear sessionStorage
  console.log('\n4️⃣ Clearing sessionStorage...');
  const ssLength = sessionStorage.length;
  sessionStorage.clear();
  if (ssLength > 0) {
    fixes++;
    console.log('   ✅ Cleared', ssLength, 'sessionStorage entries');
  } else {
    console.log('   ℹ️ sessionStorage was empty');
  }
  
  // 5. Check for IndexedDB databases
  console.log('\n5️⃣ Checking IndexedDB...');
  if ('indexedDB' in window && indexedDB.databases) {
    try {
      const databases = await indexedDB.databases();
      console.log('   ℹ️ Found', databases.length, 'IndexedDB databases');
      databases.forEach(db => console.log('      -', db.name));
    } catch (e) {
      console.log('   ⚠️ Could not list databases');
    }
  }
  
  // 6. Browser compatibility check
  console.log('\n6️⃣ Browser Compatibility Check:');
  
  const checks = {
    'SharedArrayBuffer': typeof SharedArrayBuffer !== 'undefined',
    'WebAssembly': typeof WebAssembly !== 'undefined',
    'Service Worker': 'serviceWorker' in navigator,
    'Cache API': 'caches' in window,
    'File API': 'File' in window,
    'Blob': 'Blob' in window,
    'FileReader': 'FileReader' in window,
    'Crypto API': 'crypto' in window && 'subtle' in window.crypto,
  };
  
  for (const [feature, supported] of Object.entries(checks)) {
    console.log(`   ${supported ? '✅' : '❌'} ${feature}`);
  }
  
  if (!checks['SharedArrayBuffer']) {
    console.log('\n   ⚠️ SharedArrayBuffer not available - FFmpeg will run in single-threaded mode');
    console.log('   This is normal and the app should still work!');
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log(`✨ Browser fix complete! Applied ${fixes} fixes.`);
  console.log('');
  console.log('Please refresh the page (Ctrl+Shift+R or Cmd+Shift+R)');
  console.log('');
  console.log('If issues persist, try:');
  console.log('  1. Add ?nosw=1 to the URL to disable service workers');
  console.log('  2. Use incognito/private browsing mode');
  console.log('  3. Clear browser cache: Settings > Privacy > Clear browsing data');
  console.log('='.repeat(50));
  
  // Offer to refresh
  if (fixes > 0) {
    console.log('\n🔄 Refreshing in 3 seconds... (press Ctrl+C to cancel)');
    await new Promise(r => setTimeout(r, 3000));
    window.location.reload(true);
  }
  
})();
