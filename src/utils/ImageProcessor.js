/**
 * ImageProcessor - Image enhancement and manipulation utilities
 * Features:
 * - Resize to specific dimensions
 * - Crop tool
 * - Rotate/flip
 * - Compress for web
 * - Format conversion
 */

class ImageProcessor {
  constructor() {
    this.canvas = null;
    this.ctx = null;
  }

  /**
   * Load image from file
   */
  async loadImage(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Create canvas with image
   */
  createCanvas(width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }

  /**
   * Resize image
   */
  async resize(file, options, onProgress) {
    onProgress?.(10, 'Loading image...');
    
    const { width, height, maintainAspect = true, method = 'contain' } = options;
    const img = await this.loadImage(file);
    
    onProgress?.(30, 'Calculating dimensions...');
    
    let newWidth, newHeight;
    
    if (maintainAspect) {
      const aspectRatio = img.width / img.height;
      
      if (method === 'contain') {
        // Fit within bounds
        if (width / height > aspectRatio) {
          newHeight = height;
          newWidth = Math.round(height * aspectRatio);
        } else {
          newWidth = width;
          newHeight = Math.round(width / aspectRatio);
        }
      } else if (method === 'cover') {
        // Cover the entire area
        if (width / height > aspectRatio) {
          newWidth = width;
          newHeight = Math.round(width / aspectRatio);
        } else {
          newHeight = height;
          newWidth = Math.round(height * aspectRatio);
        }
      } else if (method === 'width') {
        newWidth = width;
        newHeight = Math.round(width / aspectRatio);
      } else if (method === 'height') {
        newHeight = height;
        newWidth = Math.round(height * aspectRatio);
      }
    } else {
      newWidth = width;
      newHeight = height;
    }
    
    onProgress?.(50, 'Resizing image...');
    
    const canvas = this.createCanvas(newWidth, newHeight);
    const ctx = canvas.getContext('2d');
    
    // Use high-quality scaling
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    ctx.drawImage(img, 0, 0, newWidth, newHeight);
    
    onProgress?.(80, 'Encoding image...');
    
    const format = this.getOutputFormat(file.type, options.format);
    const quality = options.quality || 0.92;
    
    const blob = await this.canvasToBlob(canvas, format, quality);
    
    onProgress?.(100, 'Complete!');
    
    URL.revokeObjectURL(img.src);
    
    return {
      blob,
      filename: this.getNewFilename(file.name, format),
      originalDimensions: { width: img.width, height: img.height },
      newDimensions: { width: newWidth, height: newHeight }
    };
  }

  /**
   * Crop image
   */
  async crop(file, cropArea, onProgress) {
    onProgress?.(10, 'Loading image...');
    
    const { x, y, width, height } = cropArea;
    const img = await this.loadImage(file);
    
    onProgress?.(40, 'Cropping image...');
    
    const canvas = this.createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    ctx.drawImage(img, x, y, width, height, 0, 0, width, height);
    
    onProgress?.(80, 'Encoding image...');
    
    const format = this.getOutputFormat(file.type);
    const blob = await this.canvasToBlob(canvas, format, 0.92);
    
    onProgress?.(100, 'Complete!');
    
    URL.revokeObjectURL(img.src);
    
    return {
      blob,
      filename: this.getNewFilename(file.name, format, '_cropped'),
      dimensions: { width, height }
    };
  }

  /**
   * Rotate image
   */
  async rotate(file, degrees, onProgress) {
    onProgress?.(10, 'Loading image...');
    
    const img = await this.loadImage(file);
    
    onProgress?.(40, 'Rotating image...');
    
    // Calculate new canvas size
    const radians = (degrees * Math.PI) / 180;
    const sin = Math.abs(Math.sin(radians));
    const cos = Math.abs(Math.cos(radians));
    
    const newWidth = Math.round(img.width * cos + img.height * sin);
    const newHeight = Math.round(img.width * sin + img.height * cos);
    
    const canvas = this.createCanvas(newWidth, newHeight);
    const ctx = canvas.getContext('2d');
    
    // Move to center, rotate, draw, move back
    ctx.translate(newWidth / 2, newHeight / 2);
    ctx.rotate(radians);
    ctx.drawImage(img, -img.width / 2, -img.height / 2);
    
    onProgress?.(80, 'Encoding image...');
    
    const format = this.getOutputFormat(file.type);
    const blob = await this.canvasToBlob(canvas, format, 0.92);
    
    onProgress?.(100, 'Complete!');
    
    URL.revokeObjectURL(img.src);
    
    return {
      blob,
      filename: this.getNewFilename(file.name, format, '_rotated'),
      dimensions: { width: newWidth, height: newHeight }
    };
  }

  /**
   * Flip image
   */
  async flip(file, direction, onProgress) {
    onProgress?.(10, 'Loading image...');
    
    const img = await this.loadImage(file);
    
    onProgress?.(40, 'Flipping image...');
    
    const canvas = this.createCanvas(img.width, img.height);
    const ctx = canvas.getContext('2d');
    
    if (direction === 'horizontal') {
      ctx.translate(img.width, 0);
      ctx.scale(-1, 1);
    } else {
      ctx.translate(0, img.height);
      ctx.scale(1, -1);
    }
    
    ctx.drawImage(img, 0, 0);
    
    onProgress?.(80, 'Encoding image...');
    
    const format = this.getOutputFormat(file.type);
    const blob = await this.canvasToBlob(canvas, format, 0.92);
    
    onProgress?.(100, 'Complete!');
    
    URL.revokeObjectURL(img.src);
    
    return {
      blob,
      filename: this.getNewFilename(file.name, format, '_flipped'),
      dimensions: { width: img.width, height: img.height }
    };
  }

  /**
   * Compress image for web
   */
  async compress(file, quality = 0.8, onProgress) {
    onProgress?.(10, 'Loading image...');
    
    const img = await this.loadImage(file);
    
    onProgress?.(30, 'Analyzing image...');
    
    // Determine optimal format
    const hasAlpha = await this.hasAlphaChannel(file);
    const targetFormat = hasAlpha ? 'image/png' : 'image/jpeg';
    
    // Calculate if resizing would help
    const maxDimension = 2048;
    let width = img.width;
    let height = img.height;
    
    if (width > maxDimension || height > maxDimension) {
      const scale = maxDimension / Math.max(width, height);
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }
    
    onProgress?.(50, 'Compressing image...');
    
    const canvas = this.createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, width, height);
    
    onProgress?.(80, 'Encoding compressed image...');
    
    const blob = await this.canvasToBlob(canvas, targetFormat, quality);
    
    onProgress?.(100, 'Complete!');
    
    URL.revokeObjectURL(img.src);
    
    const originalSize = file.size;
    const compressedSize = blob.size;
    const reduction = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);
    
    return {
      blob,
      filename: this.getNewFilename(file.name, targetFormat, '_compressed'),
      originalSize,
      compressedSize,
      reduction: `${reduction}%`,
      dimensions: { width, height }
    };
  }

  /**
   * Convert image format
   */
  async convert(file, targetFormat, quality = 0.92, onProgress) {
    onProgress?.(10, 'Loading image...');
    
    const img = await this.loadImage(file);
    
    onProgress?.(40, 'Converting format...');
    
    const canvas = this.createCanvas(img.width, img.height);
    const ctx = canvas.getContext('2d');
    
    // Handle transparency for non-PNG formats
    if (targetFormat !== 'image/png' && targetFormat !== 'image/webp') {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    ctx.drawImage(img, 0, 0);
    
    onProgress?.(80, 'Encoding image...');
    
    const mimeType = this.getMimeType(targetFormat);
    const blob = await this.canvasToBlob(canvas, mimeType, quality);
    
    onProgress?.(100, 'Complete!');
    
    URL.revokeObjectURL(img.src);
    
    return {
      blob,
      filename: this.getNewFilename(file.name, mimeType),
      dimensions: { width: img.width, height: img.height }
    };
  }

  /**
   * Apply filters to image
   */
  async applyFilters(file, filters, onProgress) {
    onProgress?.(10, 'Loading image...');
    
    const img = await this.loadImage(file);
    
    onProgress?.(30, 'Applying filters...');
    
    const canvas = this.createCanvas(img.width, img.height);
    const ctx = canvas.getContext('2d');
    
    // Build CSS filter string
    const filterParts = [];
    
    if (filters.brightness !== undefined) {
      filterParts.push(`brightness(${filters.brightness}%)`);
    }
    if (filters.contrast !== undefined) {
      filterParts.push(`contrast(${filters.contrast}%)`);
    }
    if (filters.saturation !== undefined) {
      filterParts.push(`saturate(${filters.saturation}%)`);
    }
    if (filters.grayscale !== undefined) {
      filterParts.push(`grayscale(${filters.grayscale}%)`);
    }
    if (filters.sepia !== undefined) {
      filterParts.push(`sepia(${filters.sepia}%)`);
    }
    if (filters.blur !== undefined) {
      filterParts.push(`blur(${filters.blur}px)`);
    }
    if (filters.hueRotate !== undefined) {
      filterParts.push(`hue-rotate(${filters.hueRotate}deg)`);
    }
    if (filters.invert !== undefined) {
      filterParts.push(`invert(${filters.invert}%)`);
    }
    
    ctx.filter = filterParts.join(' ') || 'none';
    ctx.drawImage(img, 0, 0);
    
    onProgress?.(80, 'Encoding image...');
    
    const format = this.getOutputFormat(file.type);
    const blob = await this.canvasToBlob(canvas, format, 0.92);
    
    onProgress?.(100, 'Complete!');
    
    URL.revokeObjectURL(img.src);
    
    return {
      blob,
      filename: this.getNewFilename(file.name, format, '_filtered'),
      dimensions: { width: img.width, height: img.height }
    };
  }

  /**
   * Get image info
   */
  async getInfo(file) {
    const img = await this.loadImage(file);
    
    URL.revokeObjectURL(img.src);
    
    return {
      width: img.width,
      height: img.height,
      aspectRatio: (img.width / img.height).toFixed(2),
      size: file.size,
      sizeFormatted: this.formatFileSize(file.size),
      type: file.type,
      name: file.name
    };
  }

  /**
   * Check if image has alpha channel
   */
  async hasAlphaChannel(file) {
    const img = await this.loadImage(file);
    
    const canvas = this.createCanvas(Math.min(img.width, 100), Math.min(img.height, 100));
    const ctx = canvas.getContext('2d');
    
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Check if any pixel has alpha < 255
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 255) {
        URL.revokeObjectURL(img.src);
        return true;
      }
    }
    
    URL.revokeObjectURL(img.src);
    return false;
  }

  /**
   * Canvas to blob helper
   */
  canvasToBlob(canvas, type, quality) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        blob => blob ? resolve(blob) : reject(new Error('Failed to create blob')),
        type,
        quality
      );
    });
  }

  /**
   * Get output format
   */
  getOutputFormat(inputType, overrideFormat) {
    if (overrideFormat) {
      return this.getMimeType(overrideFormat);
    }
    return inputType || 'image/jpeg';
  }

  /**
   * Get mime type from format
   */
  getMimeType(format) {
    const types = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      bmp: 'image/bmp'
    };
    
    // Handle if already a mime type
    if (format.startsWith('image/')) {
      return format;
    }
    
    return types[format.toLowerCase()] || 'image/jpeg';
  }

  /**
   * Get new filename with format
   */
  getNewFilename(originalName, mimeType, suffix = '') {
    const baseName = originalName.split('.').slice(0, -1).join('.');
    const extensions = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'image/bmp': 'bmp'
    };
    const ext = extensions[mimeType] || 'jpg';
    return `${baseName}${suffix}.${ext}`;
  }

  /**
   * Format file size
   */
  formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  /**
   * Get preset resize dimensions
   */
  getResizePresets() {
    return {
      thumbnail: { width: 150, height: 150, name: 'Thumbnail (150x150)' },
      small: { width: 320, height: 240, name: 'Small (320x240)' },
      medium: { width: 640, height: 480, name: 'Medium (640x480)' },
      large: { width: 1024, height: 768, name: 'Large (1024x768)' },
      hd: { width: 1280, height: 720, name: 'HD (1280x720)' },
      fullhd: { width: 1920, height: 1080, name: 'Full HD (1920x1080)' },
      '4k': { width: 3840, height: 2160, name: '4K (3840x2160)' },
      instagram: { width: 1080, height: 1080, name: 'Instagram (1080x1080)' },
      twitter: { width: 1200, height: 675, name: 'Twitter (1200x675)' },
      facebook: { width: 1200, height: 630, name: 'Facebook (1200x630)' },
      youtube: { width: 1280, height: 720, name: 'YouTube (1280x720)' }
    };
  }
}

// Export singleton instance
const imageProcessor = new ImageProcessor();
export default imageProcessor;
