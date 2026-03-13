# Browser Extension Debugger
# This script helps identify problematic browser extensions

Write-Host "=== Browser Extension Debugger ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "STEP 1: Check if error is from an extension" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Gray
Write-Host "1. Open your browser console (F12)"
Write-Host "2. Look at the error stack trace"
Write-Host "3. If you see 'chrome-extension://' or 'contentScript.js', it's an extension"
Write-Host ""

Write-Host "STEP 2: Find the extension ID" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Gray
Write-Host "The error will show something like:"
Write-Host "  chrome-extension://abcdefghijklmnop/contentScript.js" -ForegroundColor White
Write-Host ""
Write-Host "Copy the ID part (abcdefghijklmnop)"
Write-Host ""

Write-Host "STEP 3: Identify the extension" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Gray
Write-Host "1. Navigate to: chrome://extensions/" -ForegroundColor Cyan
Write-Host "2. Enable 'Developer mode' (toggle in top right)"
Write-Host "3. Look for the extension with matching ID"
Write-Host ""

Write-Host "STEP 4: Quick disable all extensions test" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Gray
Write-Host "Run this test to confirm it's an extension issue:"
Write-Host ""
Write-Host "Option A - Chrome (Windows):" -ForegroundColor Green
Write-Host '  Start-Process "chrome.exe" "--disable-extensions", "http://localhost:3000"' -ForegroundColor White
Write-Host ""
Write-Host "Option B - Edge (Windows):" -ForegroundColor Green
Write-Host '  Start-Process "msedge.exe" "--disable-extensions", "http://localhost:3000"' -ForegroundColor White
Write-Host ""

Write-Host "STEP 5: Test in Incognito/Private mode" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Gray
Write-Host "Chrome Incognito: Ctrl+Shift+N"
Write-Host "Edge InPrivate: Ctrl+Shift+N"
Write-Host "Firefox Private: Ctrl+Shift+P"
Write-Host ""

Write-Host "COMMON CULPRITS:" -ForegroundColor Magenta
Write-Host "----------------------------------------" -ForegroundColor Gray
$commonExtensions = @(
    "Grammarly - Injects into text fields",
    "LastPass/1Password - Monitors form inputs",
    "Honey - Scans for shopping deals",
    "React DevTools - Can conflict with React apps",
    "Redux DevTools - Can interfere with state",
    "Ad Blockers - May block resources",
    "Password Managers - Monitor input fields",
    "AI Assistants - Inject scripts into pages"
)

foreach ($ext in $commonExtensions) {
    Write-Host "  • $ext" -ForegroundColor White
}

Write-Host ""
Write-Host "AUTOMATED FIX:" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Gray
Write-Host "I've added a script to suppress extension errors in your app."
Write-Host "Location: public/suppress-extension-errors.js" -ForegroundColor Cyan
Write-Host ""
Write-Host "This will filter out extension errors while keeping your app errors visible."
Write-Host ""

Write-Host "Would you like to launch Chrome without extensions? (Y/N)" -ForegroundColor Yellow
$response = Read-Host

if ($response -eq 'Y' -or $response -eq 'y') {
    Write-Host ""
    Write-Host "Launching Chrome without extensions..." -ForegroundColor Green
    
    # Check if Chrome is installed
    $chromePaths = @(
        "${env:ProgramFiles}\Google\Chrome\Application\chrome.exe",
        "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
        "${env:LOCALAPPDATA}\Google\Chrome\Application\chrome.exe"
    )
    
    $chromeExe = $null
    foreach ($path in $chromePaths) {
        if (Test-Path $path) {
            $chromeExe = $path
            break
        }
    }
    
    if ($chromeExe) {
        Start-Process $chromeExe -ArgumentList "--disable-extensions", "--new-window", "http://localhost:3000"
        Write-Host "✅ Chrome launched without extensions!" -ForegroundColor Green
        Write-Host "Test your app and see if the error persists." -ForegroundColor Cyan
    } else {
        Write-Host "❌ Chrome not found. Trying Edge..." -ForegroundColor Red
        
        $edgePath = "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
        if (Test-Path $edgePath) {
            Start-Process $edgePath -ArgumentList "--disable-extensions", "--new-window", "http://localhost:3000"
            Write-Host "✅ Edge launched without extensions!" -ForegroundColor Green
        } else {
            Write-Host "❌ Neither Chrome nor Edge found." -ForegroundColor Red
            Write-Host "Please manually launch your browser with the --disable-extensions flag" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host ""
    Write-Host "No problem! Follow the steps above to debug manually." -ForegroundColor Cyan
}

Write-Host ""
Write-Host "=== Additional Tips ===" -ForegroundColor Cyan
Write-Host "• The suppress-extension-errors.js script is now active" -ForegroundColor Green
Write-Host "• Refresh your app to see cleaner console output" -ForegroundColor Green
Write-Host "• Set window.DEBUG_EXTENSIONS=true in console to see extension errors" -ForegroundColor Yellow
Write-Host ""
