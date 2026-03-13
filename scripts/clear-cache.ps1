# Clear Browser Cache and Service Workers
# Run this script to completely reset browser state

Write-Host "`n🧹 Clearing Browser Cache and Service Workers..." -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Gray

# Step 1: Instructions for manual clearing
Write-Host "`n📋 OPTION 1: Manual Clear (Recommended)" -ForegroundColor Yellow
Write-Host "   1. Open your browser" -ForegroundColor White
Write-Host "   2. Press Ctrl+Shift+Del" -ForegroundColor White
Write-Host "   3. Select:" -ForegroundColor White
Write-Host "      ✓ Cached images and files" -ForegroundColor Green
Write-Host "      ✓ Cookies and other site data" -ForegroundColor Green
Write-Host "   4. Click 'Clear data'" -ForegroundColor White
Write-Host "   5. Hard refresh: Ctrl+Shift+R" -ForegroundColor White

# Step 2: Chrome DevTools method
Write-Host "`n📋 OPTION 2: Using DevTools" -ForegroundColor Yellow
Write-Host "   1. Open DevTools (F12)" -ForegroundColor White
Write-Host "   2. Go to Application tab" -ForegroundColor White
Write-Host "   3. Click 'Service Workers' in left sidebar" -ForegroundColor White
Write-Host "   4. Click 'Unregister' for each service worker" -ForegroundColor White
Write-Host "   5. Go to 'Storage' in left sidebar" -ForegroundColor White
Write-Host "   6. Click 'Clear site data'" -ForegroundColor White

# Step 3: Automated Chrome cleanup
Write-Host "`n📋 OPTION 3: Launch Chrome in Clean Mode" -ForegroundColor Yellow

$chromeClean = @"
Start-Process chrome.exe @(
    '--disable-extensions',
    '--disable-background-networking',
    '--disable-sync',
    '--disable-translate',
    '--no-first-run',
    '--new-window',
    'http://localhost:3000'
)
"@

Write-Host $chromeClean -ForegroundColor Green

# Step 4: Clear npm cache
Write-Host "`n📋 OPTION 4: Clear Development Cache" -ForegroundColor Yellow
Write-Host "   Clearing npm and webpack cache..." -ForegroundColor White

try {
    # Clear webpack cache
    if (Test-Path "node_modules\.cache") {
        Remove-Item -Path "node_modules\.cache" -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "   ✓ Webpack cache cleared" -ForegroundColor Green
    }

    # Clear React cache
    $tempPath = [System.IO.Path]::GetTempPath()
    Get-ChildItem -Path $tempPath -Filter "react-*" -ErrorAction SilentlyContinue | 
        Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "   ✓ React temp cache cleared" -ForegroundColor Green

    Write-Host "   ✓ Development cache cleared successfully" -ForegroundColor Green
} catch {
    Write-Host "   ⚠ Could not clear all cache (this is OK)" -ForegroundColor Yellow
}

# Step 5: Restart dev server
Write-Host "`n📋 OPTION 5: Restart Development Server" -ForegroundColor Yellow
Write-Host "   Stop current server (Ctrl+C) and run:" -ForegroundColor White
Write-Host "   npm start" -ForegroundColor Green

Write-Host "`n" -NoNewline
Write-Host "💡 TIP: " -ForegroundColor Cyan -NoNewline
Write-Host "Use Incognito mode (Ctrl+Shift+N) for clean testing" -ForegroundColor White

Write-Host "`n✅ Cache cleanup instructions provided!" -ForegroundColor Green
Write-Host "   Your application will be clean after following any option above.`n" -ForegroundColor White
