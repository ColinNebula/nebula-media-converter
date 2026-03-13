// Platform detection and converter routing service
class ConverterPlatformService {
  constructor() {
    this.platform = this.detectPlatform();
    this.nativeAvailable = false;
    this.backendAvailable = false;
    this.checkAvailability();
  }

  detectPlatform() {
    // Check if running in Electron
    if (window.electron) {
      return 'desktop';
    }
    
    // Check if running in browser
    if (typeof window !== 'undefined' && window.navigator) {
      return 'web';
    }
    
    return 'unknown';
  }

  async checkAvailability() {
    // Check native C++ addon (Electron)
    if (this.platform === 'desktop' && window.electron) {
      try {
        const info = await window.electron.checkNativeConverter();
        this.nativeAvailable = info.available;
        console.log('✅ Native C++ converter:', this.nativeAvailable ? 'Available' : 'Not available');
        if (info.gpuAcceleration) {
          console.log('🎮 GPU acceleration available');
        }
      } catch (error) {
        console.warn('Native converter check failed:', error);
      }
    }

    // Check C++ backend server
    try {
      const backendUrl = process.env.REACT_APP_CPP_BACKEND_URL || 'http://localhost:8080';
      const response = await fetch(`${backendUrl}/health`, { 
        method: 'GET',
        signal: AbortSignal.timeout(3000) // 3 second timeout
      });
      this.backendAvailable = response.ok;
      console.log('✅ C++ backend server:', this.backendAvailable ? 'Available' : 'Not available');
    } catch (error) {
      console.log('⚠️ C++ backend not available (fallback to web)');
    }
  }

  getRecommendedConverter() {
    // Priority: Native Desktop > C++ Backend > FFmpeg.wasm
    if (this.nativeAvailable) {
      return {
        type: 'native',
        name: 'Native C++',
        speed: 'fastest',
        maxFileSize: Infinity,
        features: ['gpu', 'unlimited-size', 'batch', 'offline']
      };
    }

    if (this.backendAvailable) {
      return {
        type: 'backend',
        name: 'C++ Backend',
        speed: 'very-fast',
        maxFileSize: Infinity,
        features: ['gpu', 'unlimited-size', 'batch', 'cloud']
      };
    }

    return {
      type: 'wasm',
      name: 'FFmpeg.wasm',
      speed: 'moderate',
      maxFileSize: 500 * 1024 * 1024, // 500MB
      features: ['offline', 'privacy']
    };
  }

  async getSystemInfo() {
    const converter = this.getRecommendedConverter();
    
    if (converter.type === 'native' && window.electron) {
      return await window.electron.getSystemInfo();
    }
    
    if (converter.type === 'backend') {
      const backendUrl = process.env.REACT_APP_CPP_BACKEND_URL || 'http://localhost:8080';
      const response = await fetch(`${backendUrl}/api/system/info`);
      return await response.json();
    }

    return {
      available: false,
      platform: 'web',
      converter: 'FFmpeg.wasm'
    };
  }

  createConverter() {
    const recommended = this.getRecommendedConverter();
    
    switch (recommended.type) {
      case 'native':
        return new NativeDesktopConverter();
      case 'backend':
        return new CppBackendConverter();
      case 'wasm':
      default:
        return new WebAssemblyConverter();
    }
  }
}

// Native Desktop Converter (Electron + C++ addon)
class NativeDesktopConverter {
  async convert(file, outputFormat, options, onProgress) {
    if (!window.electron) {
      throw new Error('Desktop environment not available');
    }

    try {
      // Save file to temp location
      const tempInputPath = await this.saveToTemp(file);
      const tempOutputPath = tempInputPath.replace(/\.[^.]+$/, `.${outputFormat}`);

      // Listen for progress
      window.electron.onConversionProgress((data) => {
        onProgress?.(data.progress, data.message);
      });

      // Convert using native C++
      const result = await window.electron.convertMediaNative({
        inputPath: tempInputPath,
        outputPath: tempOutputPath,
        format: outputFormat,
        options: {
          quality: options.quality || 'high',
          useGPU: options.useGPU !== false,
          threads: options.threads || 0,
          preset: options.preset || 'medium'
        }
      });

      // Read converted file
      const blob = await this.readFromTemp(tempOutputPath);
      const filename = `${file.name.split('.')[0]}.${outputFormat}`;

      // Cleanup
      window.electron.removeProgressListeners();

      return { blob, filename };
    } catch (error) {
      throw new Error(`Native conversion failed: ${error.message}`);
    }
  }

  async batchConvert(files, outputFormat, options, onProgress) {
    if (!window.electron) {
      throw new Error('Desktop environment not available');
    }

    const fileParams = files.map(file => ({
      inputPath: file.path,
      outputPath: file.path.replace(/\.[^.]+$/, `.${outputFormat}`)
    }));

    window.electron.onBatchProgress((data) => {
      onProgress?.({
        fileIndex: data.fileIndex,
        totalFiles: data.totalFiles,
        progress: data.progress,
        message: data.message
      });
    });

    const results = await window.electron.batchConvertNative({
      files: fileParams,
      format: outputFormat,
      options
    });

    window.electron.removeProgressListeners();
    return results;
  }

  async saveToTemp(file) {
    // In Electron, we can use node fs to save to temp
    const fs = window.require('fs');
    const path = window.require('path');
    const os = window.require('os');
    
    const tempPath = path.join(os.tmpdir(), `nebula_${Date.now()}_${file.name}`);
    const buffer = await file.arrayBuffer();
    fs.writeFileSync(tempPath, Buffer.from(buffer));
    
    return tempPath;
  }

  async readFromTemp(filepath) {
    const fs = window.require('fs');
    const buffer = fs.readFileSync(filepath);
    return new Blob([buffer]);
  }
}

// C++ Backend Converter (Cloud/Server)
class CppBackendConverter {
  constructor() {
    this.backendUrl = process.env.REACT_APP_CPP_BACKEND_URL || 'http://localhost:8080';
  }

  async convert(file, outputFormat, options, onProgress) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('format', outputFormat);
      formData.append('quality', options.quality || 'medium');
      formData.append('useGPU', options.useGPU !== false ? 'true' : 'false');

      onProgress?.(10, 'Uploading to server...');

      const response = await fetch(`${this.backendUrl}/api/convert`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      onProgress?.(90, 'Downloading converted file...');

      const blob = await response.blob();
      const filename = `${file.name.split('.')[0]}.${outputFormat}`;

      onProgress?.(100, 'Conversion complete!');

      return { blob, filename };
    } catch (error) {
      throw new Error(`Backend conversion failed: ${error.message}`);
    }
  }

  async batchConvert(files, outputFormat, options, onProgress) {
    // Implement batch conversion via backend
    const results = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const result = await this.convert(file, outputFormat, options, (progress, message) => {
          onProgress?.({
            fileIndex: i,
            totalFiles: files.length,
            progress,
            message
          });
        });
        results.push({ success: true, file: file.name, result });
      } catch (error) {
        results.push({ success: false, file: file.name, error: error.message });
      }
    }
    return results;
  }
}

// WebAssembly Converter (existing FFmpeg.wasm)
class WebAssemblyConverter {
  constructor() {
    // Use existing MediaConverter from utils/MediaConverter.js
    const MediaConverter = require('../utils/MediaConverter').default;
    this.converter = new MediaConverter();
  }

  async convert(file, outputFormat, options, onProgress) {
    return await this.converter.convert(file, outputFormat, onProgress);
  }

  async batchConvert(files, outputFormat, options, onProgress) {
    // Sequential conversion for wasm (no parallel processing)
    const results = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const result = await this.convert(file, outputFormat, options, (progress, message) => {
          onProgress?.({
            fileIndex: i,
            totalFiles: files.length,
            progress,
            message: `[${i + 1}/${files.length}] ${message}`
          });
        });
        results.push({ success: true, file: file.name, result });
      } catch (error) {
        results.push({ success: false, file: file.name, error: error.message });
      }
    }
    return results;
  }
}

export default ConverterPlatformService;
export { NativeDesktopConverter, CppBackendConverter, WebAssemblyConverter };
