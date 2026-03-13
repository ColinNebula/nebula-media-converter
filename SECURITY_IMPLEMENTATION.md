# Security Implementation Guide

## Overview
Nebula now includes a comprehensive three-tier security system to protect against tampering, malware, XSS attacks, injection attacks, and abuse.

## Security Architecture

### Layer 1: SecurityManager
**Purpose:** Application-wide security monitoring, threat detection, and enforcement

**Features:**
- ✅ Content Security Policy (CSP) enforcement
- ✅ Clickjacking prevention (X-Frame-Options)
- ✅ XSS protection with input sanitization
- ✅ localStorage tampering detection with hash verification
- ✅ Console hijacking prevention
- ✅ API activity monitoring with rate limiting
- ✅ Code injection prevention (eval/Function disabled)
- ✅ Malicious pattern detection
- ✅ Lockdown mode (triggers after 5 suspicious activities)
- ✅ File upload validation
- ✅ Filename sanitization

**Trusted Domains:**
- localhost
- colinnebula.github.io
- nebuladev.com
- unpkg.com
- cdn.jsdelivr.net

**Thresholds:**
- Max API calls: 100 per minute
- Max localStorage writes: 20 per 10 seconds
- Lockdown trigger: 5 suspicious activities
- Max file size: 2GB
- Blocked extensions: .exe, .dll, .bat, .sh, .ps1, .vbs, .js, .app, .dmg, .deb, .rpm

### Layer 2: InputValidator
**Purpose:** Sanitize and validate all user inputs

**Methods:**
- `sanitizeHTML()` - Prevents XSS attacks
- `sanitizeEmail()` - Email validation
- `sanitizeUsername()` - Alphanumeric validation
- `validatePassword()` - Strength validation (8-128 chars)
- `sanitizeURL()` - Protocol validation (http/https only)
- `sanitizeFilePath()` - Path traversal prevention
- `validateJSON()` - Prototype pollution detection
- `sanitizeObject()` - Recursive sanitization
- `generateCSRFToken()` - Cryptographically secure tokens
- `validateCSRFToken()` - Constant-time comparison

**Password Rules:**
- Minimum: 8 characters
- Maximum: 128 characters
- Blocked passwords: password, 12345678, qwerty, admin

**Prototype Pollution Protection:**
Blocks dangerous keys: `__proto__`, `constructor`, `prototype`

### Layer 3: RateLimiter
**Purpose:** Prevent abuse, brute force, and DDoS attacks

**Features:**
- Per-identifier, per-action rate limiting
- Configurable time windows and max attempts
- Permanent block list for repeat offenders
- Automatic cleanup every 10 minutes
- Statistics tracking

**Default Limits:**
- 5 attempts per 60 seconds
- Permanent block after 2x violations

**Methods:**
- `checkLimit(identifier, action, maxAttempts, timeWindow)`
- `blockIdentifier(identifier)`
- `unblockIdentifier(identifier)`
- `clearLimits(identifier, action)`
- `getStats()`

## Integration Points

### 1. App.js (Application Initialization)
```javascript
import securityManager from './security/SecurityManager';

useEffect(() => {
  // Initialize security on app mount
  securityManager.initSecurity();
}, []);
```

**File Upload Validation:**
```javascript
const handleFileSelect = useCallback(async (file) => {
  // Validate file
  const validation = securityManager.validateFileUpload(file);
  if (!validation.valid) {
    showToast(validation.reason, 'error');
    return;
  }

  // Sanitize filename
  const safeFile = new File([file], securityManager.sanitizeFilename(file.name), {
    type: file.type,
    lastModified: file.lastModified
  });

  setSelectedFile(safeFile);
}, [showToast]);
```

### 2. AdminAuthService.js (Login Security)
```javascript
import InputValidator from '../security/InputValidator';
import rateLimiter from '../security/RateLimiter';

async login(usernameOrEmail, password) {
  // Rate limiting
  const rateCheck = rateLimiter.checkLimit(usernameOrEmail, 'admin_login', 5, 300000);
  if (!rateCheck.allowed) {
    throw new Error(`Too many login attempts. Retry after ${rateCheck.retryAfter}s`);
  }

  // Verify credentials
  if (usernameMatch && passwordMatch) {
    // Generate CSRF token
    const csrfToken = InputValidator.generateCSRFToken();
    
    const session = {
      token: sessionToken,
      csrfToken: csrfToken, // Add to session
      // ... other session data
    };
  }
}
```

### 3. DocumentConverter.js (File Upload Security)
**TODO:** Add file validation before processing
```javascript
import securityManager from '../security/SecurityManager';

const handleFileSelect = (event) => {
  const file = event.target.files[0];
  
  // Validate file
  const validation = securityManager.validateFileUpload(file);
  if (!validation.valid) {
    setError(validation.reason);
    return;
  }
  
  // Sanitize filename
  const safeFile = new File([file], securityManager.sanitizeFilename(file.name), {
    type: file.type,
    lastModified: file.lastModified
  });
  
  setFile(safeFile);
};
```

## Security Events Logging

All security events are logged with severity levels and styled console output:

- 🔴 **CRITICAL** - Red - Immediate threats (lockdown triggered)
- 🟠 **HIGH** - Orange - Serious security violations (malicious patterns, dangerous files)
- 🟡 **MEDIUM** - Yellow - Moderate concerns (failed logins, rate limits)
- 🟢 **LOW** - Green - Informational (successful validations)

**Example logs:**
```
🛡️ [SECURITY] HIGH: Dangerous file extension detected: malware.exe
🛡️ [SECURITY] MEDIUM: Rate limit exceeded for user123
🛡️ [SECURITY] CRITICAL: Application in lockdown mode - 5 suspicious activities detected
```

## Testing Security Features

### Test XSS Prevention
```javascript
import InputValidator from './security/InputValidator';

const malicious = '<script>alert("XSS")</script>';
const safe = InputValidator.sanitizeHTML(malicious);
console.log(safe); // &lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;
```

### Test File Upload Validation
1. Try uploading an .exe file - should be blocked
2. Try uploading a 3GB file - should be blocked
3. Try uploading a 1MB .mp4 file - should succeed

### Test Rate Limiting
1. Attempt admin login 6 times with wrong password
2. Should block after 5 attempts
3. Wait 5 minutes or clear limits to retry

### Test localStorage Tampering
1. Open DevTools > Application > Local Storage
2. Modify any value manually
3. SecurityManager should detect and alert

### Test Lockdown Mode
Trigger 5 suspicious activities:
1. Upload .exe file (HIGH)
2. Attempt XSS injection (HIGH)
3. Try path traversal (MEDIUM)
4. Exceed rate limit (MEDIUM)
5. Tamper localStorage (HIGH)
→ Lockdown overlay should appear

## CSRF Protection (Pending)

### Implementation Plan
Add CSRF tokens to sensitive forms:

**ContactForm.js:**
```javascript
const [csrfToken] = useState(() => InputValidator.generateCSRFToken());

// Store expected token
useEffect(() => {
  sessionStorage.setItem('contact_csrf', csrfToken);
}, [csrfToken]);

// Validate on submit
const handleSubmit = (e) => {
  const stored = sessionStorage.getItem('contact_csrf');
  if (!InputValidator.validateCSRFToken(csrfToken, stored)) {
    setError('Invalid security token');
    return;
  }
  // ... proceed with submission
};
```

**CheckoutModal.js:**
Similar implementation for payment forms

**AdminLogin.js:**
CSRF token already generated in AdminAuthService.login()

## Maintenance

### Cleanup Rate Limits
Rate limiter automatically cleans up old entries every 10 minutes. Manual cleanup:
```javascript
import rateLimiter from './security/RateLimiter';

// Clear specific user's limits
rateLimiter.clearLimits('user@example.com', 'login');

// Unblock a user
rateLimiter.unblockIdentifier('user@example.com');

// Get statistics
const stats = rateLimiter.getStats();
console.log(stats); // { totalTracked, totalBlocked, blockList }
```

### Security Audit
Regular security checks:
1. Review security event logs in console
2. Check blocked identifiers: `rateLimiter.getStats()`
3. Monitor localStorage hash integrity
4. Verify CSP violations in browser DevTools
5. Test file upload validation quarterly

## Production Deployment

### Environment Variables
No additional environment variables required. Security features work out-of-the-box.

### Browser Compatibility
- Modern browsers (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
- Requires Crypto Web API for CSRF tokens
- LocalStorage required for rate limiting

### Performance Impact
- SecurityManager: ~5ms initialization overhead
- File validation: <1ms per file
- Rate limiting: <1ms per check
- CSRF token generation: ~2ms per token

## Security Best Practices

1. **Never disable security features** - They protect against real threats
2. **Monitor security logs** - Watch console for suspicious activity patterns
3. **Update trusted domains** - Add new CDN/API domains to SecurityManager whitelist
4. **Regular password changes** - Change admin credentials quarterly
5. **Test security quarterly** - Run penetration tests on staging environment
6. **Keep dependencies updated** - Run `npm audit` monthly
7. **Review lockdown events** - Investigate why lockdown was triggered
8. **Backup localStorage** - Store critical data server-side as well

## Known Limitations

1. **Client-side only** - Security runs in browser, server-side validation recommended
2. **localStorage tampering** - Detects but can't prevent manual edits (use with care)
3. **Rate limiting** - Can be bypassed by clearing browser data (server-side recommended)
4. **CSRF tokens** - Only validated client-side, add server validation for APIs

## Future Enhancements

- [ ] Server-side security integration
- [ ] Content Security Policy reporting endpoint
- [ ] Security event analytics dashboard
- [ ] IP-based rate limiting
- [ ] Two-factor authentication for admin
- [ ] File content scanning (antivirus)
- [ ] Encryption for sensitive localStorage data
- [ ] Security audit logs exported to server

## Support

For security concerns or questions:
- Email: colinnebula@nebula3ddev.com
- File issues: GitHub Issues (for non-sensitive bugs)
- Critical vulnerabilities: Email directly (do not file public issues)

---

**Last Updated:** January 2025  
**Security Version:** 1.0.0  
**Status:** ✅ Active and Monitoring
