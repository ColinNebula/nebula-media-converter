const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  // Platform detection
  platform: process.platform,
  isDesktop: true,

  // Environment info (non-sensitive)
  getEnvVars: () => ({
    appName: process.env.REACT_APP_APP_NAME,
    backendUrl: process.env.REACT_APP_CPP_BACKEND_URL || 'http://localhost:8080',
  }),

  // Native converter methods
  checkNativeConverter: () => ipcRenderer.invoke('check-native-converter'),
  
  convertMediaNative: (params) => ipcRenderer.invoke('convert-media-native', params),
  
  batchConvertNative: (params) => ipcRenderer.invoke('batch-convert-native', params),
  
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),

  // File dialogs
  selectFiles: () => ipcRenderer.invoke('select-files'),
  
  selectSaveLocation: (defaultName) => ipcRenderer.invoke('select-save-location', defaultName),

  // Progress listeners
  onConversionProgress: (callback) => {
    ipcRenderer.on('conversion-progress', (event, data) => callback(data));
  },
  
  onBatchProgress: (callback) => {
    ipcRenderer.on('batch-progress', (event, data) => callback(data));
  },

  // Remove listeners
  removeProgressListeners: () => {
    ipcRenderer.removeAllListeners('conversion-progress');
    ipcRenderer.removeAllListeners('batch-progress');
  },
});
