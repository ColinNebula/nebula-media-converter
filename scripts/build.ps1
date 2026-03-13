# Build scripts for C++ native addon and Electron packaging

Write-Host "🔨 Building Nebula C++ Components..." -ForegroundColor Cyan

# Step 1: Install FFmpeg (if not already installed)
Write-Host "`n📦 Checking FFmpeg installation..." -ForegroundColor Yellow

$ffmpegInstalled = Get-Command ffmpeg -ErrorAction SilentlyContinue
if (-not $ffmpegInstalled) {
    Write-Host "FFmpeg not found. Installing via Chocolatey..." -ForegroundColor Yellow
    if (Get-Command choco -ErrorAction SilentlyContinue) {
        choco install ffmpeg-shared -y
    } else {
        Write-Host "❌ Chocolatey not installed. Please install FFmpeg manually:" -ForegroundColor Red
        Write-Host "   Download from: https://www.gyan.dev/ffmpeg/builds/" -ForegroundColor Red
        Write-Host "   Or install Chocolatey: https://chocolatey.org/install" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "✅ FFmpeg is installed" -ForegroundColor Green
}

# Step 2: Install Node.js dependencies
Write-Host "`n📦 Installing Node.js dependencies..." -ForegroundColor Yellow
npm install

# Step 3: Build C++ native addon
Write-Host "`n🔧 Building C++ native addon..." -ForegroundColor Yellow

try {
    npm run addon:build
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ C++ addon built successfully" -ForegroundColor Green
    } else {
        Write-Host "⚠️ C++ addon build failed (will fallback to FFmpeg.wasm)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️ C++ addon build failed (will fallback to FFmpeg.wasm)" -ForegroundColor Yellow
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Step 4: Build React app
Write-Host "`n⚛️ Building React application..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ React build failed" -ForegroundColor Red
    exit 1
}

Write-Host "`n✅ All builds completed successfully!" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "  • Run desktop app: npm run electron:dev" -ForegroundColor White
Write-Host "  • Package for distribution: npm run electron:build" -ForegroundColor White
Write-Host "  • Start C++ backend server: See backend/cpp_server/README.md" -ForegroundColor White
