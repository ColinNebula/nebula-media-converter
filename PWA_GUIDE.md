# Progressive Web App (PWA) Guide

## Overview

Nebula Media Converter is now a fully functional Progressive Web App (PWA) that can be installed on both mobile and desktop devices!

## Features

### ✨ Key PWA Features
- **📱 Add to Home Screen** - Install the app on mobile devices (iOS/Android)
- **💻 Desktop Installation** - Install on Windows, macOS, and Linux via Chrome/Edge
- **📴 Offline Support** - Core functionality works without internet connection
- **⚡ Fast Loading** - Cached assets for instant startup
- **🎯 Full Screen** - Immersive app-like experience
- **🔄 Auto Updates** - Automatic updates when new versions are available

## Installation Instructions

### Mobile Devices

#### iOS (iPhone/iPad)
1. Open Safari and navigate to Nebula Media Converter
2. Tap the **Share** button (square with arrow pointing up)
3. Scroll down and tap **"Add to Home Screen"**
4. Tap **"Add"** in the top-right corner
5. The app icon will appear on your home screen

#### Android
1. Open Chrome and navigate to Nebula Media Converter
2. Tap the menu (three dots) in the top-right
3. Tap **"Add to Home screen"** or **"Install app"**
4. Follow the on-screen prompts
5. The app icon will appear on your home screen

**Alternative (if prompt appears):**
- When you visit the site, you may see an "Add to Home Screen" banner
- Simply tap **"Install App"** on the banner

### Desktop Browsers

#### Chrome / Edge
1. Navigate to Nebula Media Converter
2. Look for the install icon (⊕) in the address bar
3. Click the icon and select **"Install"**
4. The app will open in its own window

**Alternative:**
- Click the menu (three dots) → **"Install Nebula Media Converter"**
- Or wait for the install prompt banner to appear

#### Firefox / Safari
Currently, Firefox and Safari have limited PWA support on desktop. Use Chrome or Edge for the best experience.

## PWA Capabilities

### Online Features
- Full media conversion capabilities
- Cloud storage integration
- Real-time progress tracking
- Premium features access

### Offline Features
- Access cached files
- View conversion history
- Use the interface
- Read help documentation

## Technical Details

### Service Worker
The app uses a service worker (`service-worker.js`) that:
- Caches static assets for offline use
- Implements network-first, cache-fallback strategy
- Automatically updates when new versions are available
- Manages cache lifecycle

### Manifest Configuration
Located in `public/manifest.json`:
- **App Name:** Nebula Media Converter
- **Short Name:** Nebula Media
- **Theme Color:** #667eea (Purple)
- **Background Color:** #764ba2 (Gradient purple)
- **Display Mode:** Standalone (full screen)
- **Icons:** Multiple sizes (192x192, 512x512, SVG)

### Browser Support

| Feature | Chrome | Edge | Safari | Firefox |
|---------|--------|------|--------|---------|
| Mobile Install | ✅ | ✅ | ✅ | ⚠️ |
| Desktop Install | ✅ | ✅ | ❌ | ❌ |
| Service Worker | ✅ | ✅ | ✅ | ✅ |
| Offline Cache | ✅ | ✅ | ✅ | ✅ |
| Push Notifications | ✅ | ✅ | ❌ | ✅ |

✅ Full Support | ⚠️ Partial Support | ❌ No Support

## Development

### Testing PWA Features Locally

1. **Build the app:**
   ```bash
   npm run build
   ```

2. **Serve the build:**
   ```bash
   npx serve -s build
   ```

3. **Test in Chrome:**
   - Open Chrome DevTools (F12)
   - Go to Application → Service Workers
   - Check "Update on reload"
   - Test installation and offline mode

### Service Worker Registration

The service worker is registered in `src/index.js`:

```javascript
import * as serviceWorkerRegistration from './serviceWorkerRegistration';

serviceWorkerRegistration.register({
  onSuccess: () => console.log('PWA ready'),
  onUpdate: (registration) => console.log('New version available')
});
```

### Debugging

**Chrome DevTools:**
- `Application → Service Workers` - View service worker status
- `Application → Manifest` - Check manifest configuration
- `Application → Cache Storage` - Inspect cached files
- `Lighthouse` - Run PWA audit

**Common Issues:**
- Service workers only work on HTTPS (except localhost)
- Clear cache if changes aren't appearing
- Check browser console for service worker errors

## Uninstalling the PWA

### Mobile
- **iOS:** Long-press the app icon → "Remove App"
- **Android:** Long-press the app icon → "Uninstall" or "App info" → "Uninstall"

### Desktop
- **Chrome/Edge:** 
  - Open the app → Menu (⋮) → "Uninstall Nebula Media Converter"
  - Or: `chrome://apps` → Right-click app → "Remove from Chrome"

## Future Enhancements

Planned PWA features:
- 🔔 Push notifications for completed conversions
- 📊 Background sync for large files
- 📱 Share target API (receive files from other apps)
- 🎨 Adaptive icons and splash screens
- 💾 IndexedDB for local file management
- 🌐 Multi-language support in manifest

## Resources

- [MDN PWA Guide](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [Google PWA Documentation](https://web.dev/progressive-web-apps/)
- [PWA Builder](https://www.pwabuilder.com/)
- [Lighthouse PWA Audit](https://developers.google.com/web/tools/lighthouse)

## Support

If you encounter any issues with PWA installation or functionality:
1. Clear browser cache and try again
2. Ensure you're using HTTPS (or localhost)
3. Check browser compatibility
4. Contact support via the app's contact form
