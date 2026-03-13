# 🚀 Quick Start: Testing Your PWA

## Step 1: Build the Application

```powershell
# Build the production version
npm run build
```

## Step 2: Serve the Build Locally

```powershell
# Install serve if you haven't already
npm install -g serve

# Serve the build folder
serve -s build -l 3000
```

## Step 3: Open in Browser

Visit: `http://localhost:3000`

## Step 4: Test PWA Features

### Method 1: Use PWA Test Page
Visit: `http://localhost:3000/pwa-test.html`

This page shows:
- ✅ Service Worker status
- ✅ Manifest validation
- ✅ Installation readiness
- ✅ Cache status
- ✅ Network status

### Method 2: Chrome DevTools
1. Open DevTools (F12)
2. Go to **Application** tab
3. Check these sections:
   - **Manifest** - Should show app details
   - **Service Workers** - Should be active
   - **Cache Storage** - Should have cached files

### Method 3: Lighthouse Audit
1. Open DevTools (F12)
2. Go to **Lighthouse** tab
3. Select **Progressive Web App**
4. Click **Generate report**
5. Target score: 90+

## Step 5: Test Installation

### Desktop (Chrome/Edge)
1. Wait 2-3 seconds for install prompt to appear
2. Click **"Install App"** button
3. Or click the ⊕ icon in the address bar

### Mobile Simulation
1. In Chrome DevTools, toggle device toolbar (Ctrl+Shift+M)
2. Select a mobile device
3. Refresh the page
4. Wait for install prompt

## Step 6: Test Offline Mode

### In Chrome DevTools
1. Go to **Application** → **Service Workers**
2. Check **"Offline"** checkbox
3. Refresh the page
4. App should still load (from cache)

### Test Updates
1. Make a change to the app
2. Rebuild (`npm run build`)
3. Refresh the browser
4. Update notification should appear
5. Click **"Update Now"**

## Common Issues & Solutions

### Issue: Service worker not registering
**Solution:**
- Ensure you're using HTTPS or localhost
- Check browser console for errors
- Clear browser cache and try again

### Issue: Install prompt not showing
**Solution:**
- Wait at least 2-3 seconds after page load
- Ensure app meets PWA criteria (Lighthouse audit)
- Try in incognito mode

### Issue: Offline mode not working
**Solution:**
- Check if service worker is active
- Verify cache storage has files
- Check network tab for fetch errors

### Issue: Icons not showing
**Solution:**
- Verify icon files exist in `public/` folder
- Check manifest.json paths are correct
- Clear browser cache

## Testing Checklist

- [ ] App loads successfully
- [ ] Service worker registers
- [ ] Manifest loads correctly
- [ ] Install prompt appears (desktop)
- [ ] Install prompt appears (mobile)
- [ ] App installs successfully
- [ ] App opens in standalone mode
- [ ] Offline mode works
- [ ] Cache updates work
- [ ] Update notification appears
- [ ] Icons display correctly
- [ ] Theme colors applied
- [ ] Lighthouse PWA score 90+

## Production Deployment

### Before deploying to production:

1. **Ensure HTTPS** - PWA requires HTTPS (except localhost)
2. **Update service-worker.js** - Adjust cache strategy if needed
3. **Test on real devices** - iOS and Android
4. **Run Lighthouse audit** - Target 90+ on all categories
5. **Verify icons** - Test on actual home screens
6. **Test updates** - Ensure update mechanism works

### Deploy checklist:
- [ ] HTTPS enabled
- [ ] Service worker registered
- [ ] Manifest accessible
- [ ] Icons at correct sizes
- [ ] Tested on iOS device
- [ ] Tested on Android device
- [ ] Tested on desktop
- [ ] Offline works in production
- [ ] Updates work in production

## Need Help?

- Check `PWA_GUIDE.md` for user documentation
- Check `PWA_IMPLEMENTATION.md` for technical details
- Visit `http://localhost:3000/pwa-test.html` for diagnostics
- Check browser console for errors

## Happy Testing! 🎉
