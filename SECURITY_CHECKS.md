# Security Policy

## Security Workflow Status

The security scanning workflow runs automatically but **does not block deployments**. Security checks are informational and should be reviewed regularly.

### Current Checks

1. **npm audit** - Checks for known vulnerabilities
   - High-level vulnerabilities in all dependencies
   - Moderate+ vulnerabilities in production dependencies
   - Status: ⚠️ Non-blocking (warnings only)

2. **License Check** - Validates dependency licenses
   - Scans for incompatible licenses
   - Status: ⚠️ Non-blocking (warnings only)

3. **CodeQL Analysis** - Static code security analysis
   - JavaScript/TypeScript security patterns
   - Status: ✅ Informational

4. **Secret Scanning** - Detects leaked credentials
   - Uses TruffleHog for verified secrets
   - Status: ⚠️ Non-blocking (warnings only)

5. **Dependency Review** - PR-only dependency analysis
   - Blocks high-severity vulnerabilities in PRs
   - Denies GPL-3.0 and AGPL-3.0 licenses
   - Status: ✅ Active on PRs

## Reviewing Security Issues

View security scan results:
- Go to **Actions** tab
- Click on **Security Scan** workflow
- Review any warnings or findings

## Addressing Vulnerabilities

```bash
# Check for vulnerabilities
npm audit

# Fix automatically when possible
npm audit fix

# Fix breaking changes (use caution)
npm audit fix --force

# Review specific package
npm audit <package-name>
```

## Best Practices

- Review security scan results weekly
- Keep dependencies updated
- Run `npm audit` before releases
- Document any accepted risks
