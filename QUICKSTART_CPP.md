# Quick Start Guide - C++ Enhanced Nebula

## 🚀 Get Started in 5 Minutes

### Step 1: Install Prerequisites

**Windows** (PowerShell as Administrator):
```powershell
# Install Chocolatey if needed
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Install dependencies
choco install nodejs ffmpeg-shared cmake -y
```

**Linux/macOS**:
```bash
# Ubuntu/Debian
sudo apt install nodejs npm ffmpeg cmake build-essential -y

# macOS
brew install node ffmpeg cmake
```

### Step 2: Clone and Build

```bash
# Clone repository
git clone https://github.com/ColinNebula/nebula-media-converter.git
cd nebula-media-converter

# Install dependencies
npm install

# Build everything (automated)
# Windows:
.\scripts\build.ps1

# Linux/macOS:
chmod +x scripts/build.sh && ./scripts/build.sh
```

### Step 3: Run!

Choose your preferred mode:

**Option A: Desktop App** (Fastest, GPU support)
```bash
npm run electron:dev
```

**Option B: Web Version** (Original, browser-based)
```bash
npm start
# Opens http://localhost:3000
```

**Option C: Backend Server** (For cloud deployment)
```bash
cd backend/cpp_server/build
./nebula_server  # Linux/macOS
# OR
.\nebula_server.exe  # Windows
```

### Step 4: Test Conversion

1. Open the app (desktop or web)
2. Drag and drop a media file
3. Select output format
4. Click "Convert"
5. Download result

**Desktop app will automatically use:**
- ✅ Native C++ (10x faster)
- ✅ GPU acceleration (if available)
- ✅ Multi-threading

**Web version will use:**
- FFmpeg.wasm (original behavior)

---

## 🎯 What You Get

| Feature | Web | Desktop | Backend |
|---------|-----|---------|---------|
| **Speed** | 1x | 10-20x | 10-50x |
| **Max File Size** | 500MB | ∞ | ∞ |
| **GPU Acceleration** | ❌ | ✅ | ✅ |
| **Batch Processing** | Sequential | Parallel | Parallel |
| **Offline** | ❌ | ✅ | N/A |

---

## 📦 Distribution

Package desktop app for users:

```bash
npm run electron:build

# Output:
# Windows: dist/Nebula Media Converter Setup.exe
# macOS: dist/Nebula Media Converter.dmg
# Linux: dist/Nebula Media Converter.AppImage
```

---

## 🆘 Need Help?

- 📖 Full Guide: [CPP_INTEGRATION_GUIDE.md](CPP_INTEGRATION_GUIDE.md)
- 🐛 Issues: [GitHub Issues](https://github.com/ColinNebula/nebula-media-converter/issues)
- 💬 Discord: [Join Community](#)

---

**Made with ❤️ by Nebula3D Dev Company**
