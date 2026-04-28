# GitHub Actions Workflows

This project uses GitHub Actions for automated CI/CD, security scanning, and deployments.

## Workflows

### 1. CI/CD Pipeline (`.github/workflows/ci.yml`)
**Triggers:** Push to main/develop, Pull Requests

**Jobs:**
- **Lint** - Runs ESLint on the codebase
- **Test** - Executes all Jest tests
- **Build** - Creates production build
- **Deploy Preview** - Deploys PR previews (when configured)
- **Deploy Production** - Deploys to GitHub Pages on main branch

### 2. Security Scan (`.github/workflows/security.yml`)
**Triggers:** Push, Pull Requests, Weekly schedule (Sundays)

**Jobs:**
- **Security Audit** - Runs npm audit for vulnerabilities
- **Dependency Review** - Reviews dependency changes in PRs
- **CodeQL Analysis** - Static code analysis for security issues
- **Secrets Scan** - Scans for leaked secrets with TruffleHog
- **License Check** - Validates dependency licenses

### 3. Deploy PWA (`.github/workflows/deploy-pwa.yml`)
**Triggers:** Push to main/master, Manual dispatch

**Jobs:**
- Builds and deploys PWA to GitHub Pages
- Accessible at: https://colinnebula.github.io/nebula-media-converter

### 4. Electron Build (`.github/workflows/electron-build.yml`)
**Triggers:** Version tags (v*), Manual dispatch

**Jobs:**
- **Build Electron** - Creates installers for Windows, macOS, Linux
  - Windows: `.exe`, `.msi`
  - macOS: `.dmg`, `.zip` (Intel + Apple Silicon)
  - Linux: `.AppImage`, `.deb`, `.rpm`
- **Release** - Creates GitHub release with all artifacts

### 5. Performance Testing (`.github/workflows/performance.yml`)
**Triggers:** Pull Requests, Manual dispatch

**Jobs:**
- **Lighthouse** - Runs Lighthouse CI for performance metrics
- **Bundle Size** - Analyzes build size and warns if >5MB

## Setup Instructions

### 1. GitHub Pages Deployment
Already configured! The PWA deploys automatically on push to main.

### 2. Electron App Releases

#### Create a Release:
```bash
# Create and push a version tag
git tag v1.0.0
git push origin v1.0.0
```

This will trigger the Electron build workflow and create a GitHub Release with installers for all platforms.

#### Optional: Code Signing (for macOS)

Add these secrets to your GitHub repository:
- `MAC_CERT` - Base64-encoded .p12 certificate
- `MAC_CERT_PASSWORD` - Certificate password
- `APPLE_ID` - Apple Developer ID
- `APPLE_APP_PASSWORD` - App-specific password

### 3. Custom Domain (Optional)

To use a custom domain for your PWA:

1. Update `deploy-pwa.yml`:
   ```yaml
   - name: Deploy to GitHub Pages
     uses: peaceiris/actions-gh-pages@v4
     with:
       cname: your-domain.com  # Add this line
   ```

2. Add DNS record:
   ```
   CNAME -> colinnebula.github.io
   ```

## Monitoring Workflows

View workflow runs:
- **Repository** → **Actions** tab
- See status badges, logs, and artifacts

## Local Testing

Test workflows locally with [act](https://github.com/nektos/act):

```bash
# Install act
choco install act-cli

# Run CI workflow
act push

# Run specific job
act -j build
```

## Badge Status

Add these to your README.md:

```markdown
![CI/CD](https://github.com/ColinNebula/nebula-media-converter/workflows/CI%2FCD%20Pipeline/badge.svg)
![Security](https://github.com/ColinNebula/nebula-media-converter/workflows/Security%20Scan/badge.svg)
```

## Troubleshooting

### Build Failures
- Check Node.js version matches (currently v20)
- Verify all dependencies install correctly
- Review build logs in Actions tab

### Deployment Issues
- Ensure GitHub Pages is enabled in repository settings
- Check branch is set to `gh-pages`
- Verify `GITHUB_TOKEN` has write permissions

### Electron Build Issues
- macOS: Code signing requires paid Apple Developer account
- Windows: Consider Windows Code Signing certificate for production
- Linux: AppImage works without signing
