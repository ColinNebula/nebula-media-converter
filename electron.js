const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');

let mainWindow;
let nativeConverter;
let isDev = false;

// Check if running in development
async function checkDev() {
  try {
    const electronIsDev = await import('electron-is-dev');
    isDev = electronIsDev.default;
  } catch (error) {
    // Fallback: check NODE_ENV or if app is packaged
    isDev = !app.isPackaged && (process.env.NODE_ENV === 'development' || process.defaultApp);
  }
}

// Try to load native C++ addon (fallback to web version if not available)
function loadNativeConverter() {
  try {
    nativeConverter = require('../build/Release/nebula_native_converter.node');
    console.log('✅ Native C++ converter loaded successfully');
  } catch (error) {
    console.warn('⚠️ Native converter not available, using FFmpeg.wasm fallback');
    nativeConverter = null;
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js'),
      // Enable SharedArrayBuffer for FFmpeg.wasm fallback
      webSecurity: true,
    },
    icon: path.join(__dirname, 'icon.png'),
    backgroundColor: '#1a1a2e',
    show: false,
    autoHideMenuBar: true,
  });

  // Show window when ready to prevent flickering
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Load the app
  const startUrl = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, '../build/index.html')}`;

  mainWindow.loadURL(startUrl);

  // Open DevTools in development
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App lifecycle
app.on('ready', async () => {
  await checkDev();
  loadNativeConverter();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// IPC handlers for native C++ conversion
ipcMain.handle('check-native-converter', async () => {
  return {
    available: nativeConverter !== null,
    version: nativeConverter ? nativeConverter.getVersion() : null,
    gpuAcceleration: nativeConverter ? nativeConverter.hasGPUSupport() : false,
  };
});

ipcMain.handle('convert-media-native', async (event, { inputPath, outputPath, format, options }) => {
  if (!nativeConverter) {
    throw new Error('Native converter not available');
  }

  try {
    // Progress callback
    const progressCallback = (progress, message) => {
      event.sender.send('conversion-progress', { progress, message });
    };

    const result = await nativeConverter.convertMedia({
      inputPath,
      outputPath,
      format,
      options: {
        quality: options.quality || 'high',
        bitrate: options.bitrate || 'auto',
        useGPU: options.useGPU !== false,
        threads: options.threads || 0, // 0 = auto-detect
        preset: options.preset || 'medium',
      },
      progressCallback,
    });

    return result;
  } catch (error) {
    console.error('Native conversion error:', error);
    throw error;
  }
});

ipcMain.handle('batch-convert-native', async (event, { files, format, options }) => {
  if (!nativeConverter) {
    throw new Error('Native converter not available');
  }

  const results = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    try {
      const result = await nativeConverter.convertMedia({
        inputPath: file.inputPath,
        outputPath: file.outputPath,
        format,
        options,
        progressCallback: (progress, message) => {
          event.sender.send('batch-progress', {
            fileIndex: i,
            totalFiles: files.length,
            progress,
            message,
          });
        },
      });
      results.push({ success: true, file: file.inputPath, result });
    } catch (error) {
      results.push({ success: false, file: file.inputPath, error: error.message });
    }
  }

  return results;
});

ipcMain.handle('get-system-info', async () => {
  if (!nativeConverter) {
    return { available: false };
  }

  return {
    available: true,
    cpuCores: nativeConverter.getCPUCores(),
    gpuInfo: nativeConverter.getGPUInfo(),
    ffmpegVersion: nativeConverter.getFFmpegVersion(),
    supportedFormats: nativeConverter.getSupportedFormats(),
  };
});

// File dialog for desktop
ipcMain.handle('select-files', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Media Files', extensions: ['mp4', 'avi', 'mov', 'mkv', 'mp3', 'wav', 'flac', 'jpg', 'png', 'gif'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });

  return result.filePaths;
});

ipcMain.handle('select-save-location', async (event, defaultName) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultName,
    filters: [
      { name: 'All Files', extensions: ['*'] },
    ],
  });

  return result.filePath;
});
