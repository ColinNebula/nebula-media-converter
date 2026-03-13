# FFmpeg.wasm Stability Guide

## Overview
This document explains the FFmpeg implementation in Nebula, why it might fail, and how to ensure it works reliably.

## Critical Requirements

### 1. SharedArrayBuffer Support
FFmpeg.wasm **requires** SharedArrayBuffer, which is only available when these HTTP headers are present:

```
Cross-Origin-Embedder-Policy: require-corp
Cross-Origin-Opener-Policy: same-origin
```

**Why this matters:**
- Without these headers, FFmpeg.wasm cannot load at all
- Modern browsers restrict SharedArrayBuffer due to security concerns (Spectre/Meltdown vulnerabilities)
- The app will show "Failed to fetch" errors if headers are missing

**How we handle it:**
- ✅ **Development**: `setupProxy.js` adds these headers automatically
- ✅ **Production**: These headers **must** be configured on your web server

### 2. Browser Compatibility
Not all browsers support SharedArrayBuffer:

| Browser | Version Required | Status |
|---------|-----------------|--------|
| Chrome | 92+ | ✅ Full Support |
| Firefox | 89+ | ✅ Full Support |
| Safari | 15.2+ | ✅ Full Support |
| Edge | 92+ | ✅ Full Support |
| Opera | 78+ | ✅ Full Support |

**Older browsers will NOT work** - the app should detect this and show an upgrade message.

## Implementation Details

### Multi-CDN Fallback System
We use 4 CDN sources with automatic fallback:

1. **unpkg.com** (Primary)
2. **jsdelivr.net** (Fallback 1)
3. **skypack.dev** (Fallback 2)
4. **esm.sh** (Fallback 3)

**Why multiple CDNs:**
- CDNs can be blocked in certain regions
- Individual CDNs may experience downtime
- Network conditions vary by location
- Corporate firewalls may block specific domains

**How it works:**
```javascript
// Try each CDN with 10-second timeout
for (const baseURL of [unpkg, jsdelivr, skypack, esm]) {
  try {
    await loadFromCDN(baseURL);
    break; // Success! Stop trying
  } catch (error) {
    console.warn(`CDN failed: ${baseURL}`);
    continue; // Try next CDN
  }
}
```

### Retry Mechanism
- **Max Retries**: 3 attempts
- **Delay**: 2 seconds between retries
- **Smart Retry**: Only retries on network errors, not on permanent failures

**Retryable errors:**
- "Failed to fetch" - Network connection issues
- "timeout" - CDN took too long to respond
- "ERR_NETWORK" - Browser network error
- "CORS" - Cross-origin issues

**Non-retryable errors:**
- SharedArrayBuffer not available
- Invalid FFmpeg files
- Memory allocation failures

### Memory Management
FFmpeg.wasm runs in-browser, so memory is limited:

| File Size | Browser Memory | Risk Level |
|-----------|----------------|------------|
| < 50MB | ~200MB | ✅ Safe |
| 50-200MB | ~500MB | ⚠️ Moderate |
| 200-500MB | ~1GB | ⚠️ High |
| > 500MB | > 1GB | ❌ Very High |

**Memory optimization strategies:**
1. **File size limits**: Enforce 500MB max (free tier)
2. **Cleanup**: Delete files from FFmpeg filesystem after conversion
3. **Worker threads**: Offload work to Web Workers (future enhancement)
4. **Chunking**: Process large files in segments (future enhancement)

### Conversion Commands
Different formats require different FFmpeg commands:

**Audio Formats:**
```javascript
mp3:  ['-acodec', 'libmp3lame', '-ab', '192k']
wav:  ['-acodec', 'pcm_s16le']
flac: ['-acodec', 'flac']
aac:  ['-acodec', 'aac', '-ab', '192k']
```

**Video Formats:**
```javascript
mp4:  ['-vcodec', 'libx264', '-acodec', 'aac']
webm: ['-vcodec', 'libvpx', '-acodec', 'libvorbis']
avi:  ['-vcodec', 'libx264', '-acodec', 'mp3']
```

**Image Formats:**
```javascript
jpg:  ['-vcodec', 'mjpeg', '-q:v', '2']
png:  ['-vcodec', 'png']
webp: ['-vcodec', 'libwebp', '-quality', '80']
```

## Common Issues and Solutions

### Issue 1: "Failed to fetch"
**Symptoms:** FFmpeg won't load, shows network error
**Causes:**
- Missing SharedArrayBuffer headers
- CDN blocked by firewall
- No internet connection
- Browser not compatible

**Solutions:**
1. Check browser console for SharedArrayBuffer errors
2. Verify HTTP headers are set (use browser DevTools → Network tab)
3. Try different browser
4. Check firewall settings
5. Use FFmpeg Test tab to diagnose

### Issue 2: Conversion Hangs/Freezes
**Symptoms:** Progress bar stops, browser becomes unresponsive
**Causes:**
- File too large for browser memory
- Complex conversion requiring too much CPU
- FFmpeg process crashed

**Solutions:**
1. Reduce file size (compress before converting)
2. Use simpler output formats
3. Close other browser tabs
4. Restart browser
5. Try desktop version of browser (more memory)

### Issue 3: Poor Quality Output
**Symptoms:** Converted file has artifacts, low quality
**Causes:**
- Default bitrate too low
- Wrong codec for format
- Incompatible parameters

**Solutions:**
1. Adjust bitrate in advanced settings (future feature)
2. Use recommended formats (MP3 for audio, MP4 for video)
3. Check input file quality

### Issue 4: "Out of Memory"
**Symptoms:** Crash during conversion, browser tab dies
**Causes:**
- File exceeds browser memory limits
- Too many concurrent conversions
- Memory leak

**Solutions:**
1. Reduce file size to < 200MB
2. Convert one file at a time
3. Refresh page before converting
4. Upgrade to desktop application (future)

## Testing FFmpeg Stability

Use the built-in **FFmpeg Test Suite** (🔬 FFmpeg Test tab) to diagnose issues:

### Tests Performed:
1. **SharedArrayBuffer Support** - Verifies browser compatibility
2. **FFmpeg Load Test** - Tests CDN connectivity and loading
3. **Audio Conversion Test** - Validates actual conversion works
4. **Memory Handling Test** - Checks larger file processing
5. **CDN Fallback Test** - Verifies backup CDNs work

### Interpreting Results:
- ✅ **All Pass**: FFmpeg is fully functional
- ⚠️ **Mixed Results**: Partial functionality, may work for small files
- ❌ **Failed**: Critical issue, FFmpeg won't work

## Production Deployment Checklist

### Web Server Configuration
**Apache (.htaccess):**
```apache
Header set Cross-Origin-Embedder-Policy "require-corp"
Header set Cross-Origin-Opener-Policy "same-origin"
```

**Nginx (nginx.conf):**
```nginx
add_header Cross-Origin-Embedder-Policy "require-corp";
add_header Cross-Origin-Opener-Policy "same-origin";
```

**Netlify (netlify.toml):**
```toml
[[headers]]
  for = "/*"
  [headers.values]
    Cross-Origin-Embedder-Policy = "require-corp"
    Cross-Origin-Opener-Policy = "same-origin"
```

**Vercel (vercel.json):**
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Cross-Origin-Embedder-Policy",
          "value": "require-corp"
        },
        {
          "key": "Cross-Origin-Opener-Policy",
          "value": "same-origin"
        }
      ]
    }
  ]
}
```

### Verification Steps:
1. Deploy to production
2. Open browser DevTools → Network tab
3. Reload page
4. Check response headers for COEP and COOP
5. Run FFmpeg Test Suite
6. Test actual conversion

## Performance Optimization

### Best Practices:
1. **Preload FFmpeg** - Load on app startup, not first conversion
2. **Cache Instance** - Reuse same MediaConverter instance
3. **Show Progress** - Keep user informed during long operations
4. **Validate Early** - Check file size/type before loading FFmpeg
5. **Error Recovery** - Gracefully handle failures, offer alternatives

### Future Enhancements:
- [ ] Service Worker caching for FFmpeg files
- [ ] Web Worker for background processing
- [ ] File chunking for large files
- [ ] Progressive conversion (show preview during conversion)
- [ ] Desktop app with native FFmpeg (no size limits)

## Monitoring and Analytics

### Key Metrics to Track:
- **FFmpeg Load Success Rate** - % of successful loads
- **CDN Usage Distribution** - Which CDNs are actually used
- **Conversion Success Rate** - % of successful conversions
- **Average Conversion Time** - By file size and format
- **Memory Issues** - How often users hit memory limits
- **Browser Compatibility** - Which browsers work best

### Recommended Tools:
- Google Analytics (custom events)
- Sentry (error tracking)
- LogRocket (session replay)
- Browser Error Logs (console.error)

## Support Resources

### Documentation:
- [FFmpeg.wasm Official Docs](https://ffmpegwasm.netlify.app/)
- [SharedArrayBuffer MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer)
- [COOP/COEP Guide](https://web.dev/coop-coep/)

### Community:
- FFmpeg.wasm GitHub Issues
- Stack Overflow (tag: ffmpeg.wasm)
- Reddit r/webdev

### Internal:
- Use ConnectionManager component for diagnostics
- Check browser console for detailed errors
- Run FFmpeg Test Suite regularly
- Monitor error logs for patterns

---

**Last Updated:** 2025-01-06
**Version:** 1.0.0
**Maintainer:** Nebula Development Team
