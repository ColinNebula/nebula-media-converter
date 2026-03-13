/**
 * GIFCreator - Create and optimize GIFs
 * Features:
 * - Video to GIF conversion
 * - Image sequence to GIF
 * - GIF optimization/compression
 * - Frame rate control
 * - Size/quality adjustment
 * - Add text overlays
 */

class GIFCreator {
  constructor() {
    this.ffmpeg = null;
    this.ffmpegLoaded = false;
  }

  /**
   * Load FFmpeg
   */
  async loadFFmpeg(onProgress) {
    if (this.ffmpegLoaded && this.ffmpeg) {
      return this.ffmpeg;
    }

    onProgress?.(5, 'Loading FFmpeg...');

    const { FFmpeg } = await import('@ffmpeg/ffmpeg');
    const { toBlobURL } = await import('@ffmpeg/util');

    this.ffmpeg = new FFmpeg();

    this.ffmpeg.on('progress', ({ progress }) => {
      const pct = Math.round(20 + progress * 60);
      onProgress?.(pct, 'Processing...');
    });

    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
    await this.ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm')
    });

    this.ffmpegLoaded = true;
    onProgress?.(15, 'FFmpeg ready');
    return this.ffmpeg;
  }

  /**
   * Convert video to GIF
   */
  async videoToGif(file, options = {}, onProgress) {
    const {
      fps = 10,
      width = 480,
      startTime = 0,
      duration = 5,
      quality = 'medium', // low, medium, high
      loop = 0 // 0 = infinite loop
    } = options;

    const ffmpeg = await this.loadFFmpeg(onProgress);

    onProgress?.(20, 'Loading video...');

    const inputData = new Uint8Array(await file.arrayBuffer());
    await ffmpeg.writeFile('input.mp4', inputData);

    onProgress?.(30, 'Generating palette...');

    // Generate optimized color palette
    const paletteFilters = `fps=${fps},scale=${width}:-1:flags=lanczos`;
    
    await ffmpeg.exec([
      '-ss', startTime.toString(),
      '-t', duration.toString(),
      '-i', 'input.mp4',
      '-vf', `${paletteFilters},palettegen=stats_mode=diff`,
      '-y', 'palette.png'
    ]);

    onProgress?.(50, 'Creating GIF...');

    // Quality settings
    let ditherMode = 'bayer:bayer_scale=5';
    if (quality === 'low') {
      ditherMode = 'none';
    } else if (quality === 'high') {
      ditherMode = 'sierra2_4a';
    }

    await ffmpeg.exec([
      '-ss', startTime.toString(),
      '-t', duration.toString(),
      '-i', 'input.mp4',
      '-i', 'palette.png',
      '-lavfi', `${paletteFilters}[x];[x][1:v]paletteuse=dither=${ditherMode}`,
      '-loop', loop.toString(),
      '-y', 'output.gif'
    ]);

    onProgress?.(85, 'Reading output...');

    const outputData = await ffmpeg.readFile('output.gif');
    const blob = new Blob([outputData], { type: 'image/gif' });

    // Cleanup
    await ffmpeg.deleteFile('input.mp4');
    await ffmpeg.deleteFile('palette.png');
    await ffmpeg.deleteFile('output.gif');

    onProgress?.(100, 'Complete!');

    return {
      blob,
      filename: this.getNewFilename(file.name, 'gif'),
      settings: { fps, width, duration, quality }
    };
  }

  /**
   * Create GIF from image sequence
   */
  async imagestoGif(files, options = {}, onProgress) {
    const {
      fps = 10,
      width = 480,
      quality = 'medium',
      loop = 0
    } = options;

    const ffmpeg = await this.loadFFmpeg(onProgress);

    onProgress?.(15, 'Loading images...');

    // Sort files by name
    const sortedFiles = [...files].sort((a, b) => a.name.localeCompare(b.name));

    // Write images with sequential numbering
    for (let i = 0; i < sortedFiles.length; i++) {
      const file = sortedFiles[i];
      const inputData = new Uint8Array(await file.arrayBuffer());
      const ext = file.name.split('.').pop().toLowerCase();
      await ffmpeg.writeFile(`frame${String(i).padStart(4, '0')}.${ext}`, inputData);
      
      const progress = 15 + ((i / sortedFiles.length) * 20);
      onProgress?.(Math.round(progress), `Loading image ${i + 1}/${sortedFiles.length}...`);
    }

    // Determine input extension
    const firstExt = sortedFiles[0].name.split('.').pop().toLowerCase();

    onProgress?.(40, 'Generating palette...');

    // Generate palette
    await ffmpeg.exec([
      '-framerate', fps.toString(),
      '-i', `frame%04d.${firstExt}`,
      '-vf', `scale=${width}:-1:flags=lanczos,palettegen=stats_mode=diff`,
      '-y', 'palette.png'
    ]);

    onProgress?.(60, 'Creating GIF...');

    // Quality settings
    let ditherMode = 'bayer:bayer_scale=5';
    if (quality === 'low') ditherMode = 'none';
    if (quality === 'high') ditherMode = 'sierra2_4a';

    await ffmpeg.exec([
      '-framerate', fps.toString(),
      '-i', `frame%04d.${firstExt}`,
      '-i', 'palette.png',
      '-lavfi', `scale=${width}:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=${ditherMode}`,
      '-loop', loop.toString(),
      '-y', 'output.gif'
    ]);

    onProgress?.(85, 'Reading output...');

    const outputData = await ffmpeg.readFile('output.gif');
    const blob = new Blob([outputData], { type: 'image/gif' });

    // Cleanup
    for (let i = 0; i < sortedFiles.length; i++) {
      const ext = sortedFiles[i].name.split('.').pop().toLowerCase();
      await ffmpeg.deleteFile(`frame${String(i).padStart(4, '0')}.${ext}`);
    }
    await ffmpeg.deleteFile('palette.png');
    await ffmpeg.deleteFile('output.gif');

    onProgress?.(100, 'Complete!');

    return {
      blob,
      filename: 'animation.gif',
      frameCount: sortedFiles.length,
      settings: { fps, width, quality }
    };
  }

  /**
   * Optimize/compress existing GIF
   */
  async optimizeGif(file, options = {}, onProgress) {
    const {
      width,
      fps,
      colors = 256,
      lossy = 0, // 0-200, higher = more lossy
      quality = 'medium'
    } = options;

    const ffmpeg = await this.loadFFmpeg(onProgress);

    onProgress?.(20, 'Loading GIF...');

    const inputData = new Uint8Array(await file.arrayBuffer());
    await ffmpeg.writeFile('input.gif', inputData);

    onProgress?.(35, 'Analyzing GIF...');

    // Build filter chain
    const filters = [];
    
    if (width) {
      filters.push(`scale=${width}:-1:flags=lanczos`);
    }
    if (fps) {
      filters.push(`fps=${fps}`);
    }

    const filterStr = filters.length > 0 ? filters.join(',') + ',' : '';

    onProgress?.(50, 'Generating optimized palette...');

    // Generate new palette with specified colors
    await ffmpeg.exec([
      '-i', 'input.gif',
      '-vf', `${filterStr}palettegen=max_colors=${colors}:stats_mode=diff`,
      '-y', 'palette.png'
    ]);

    onProgress?.(70, 'Recompressing GIF...');

    // Quality settings
    let ditherMode = 'bayer:bayer_scale=5';
    if (quality === 'low') ditherMode = 'none';
    if (quality === 'high') ditherMode = 'sierra2_4a';

    await ffmpeg.exec([
      '-i', 'input.gif',
      '-i', 'palette.png',
      '-lavfi', `${filterStr.slice(0, -1)}[x];[x][1:v]paletteuse=dither=${ditherMode}`,
      '-y', 'output.gif'
    ]);

    onProgress?.(90, 'Reading output...');

    const outputData = await ffmpeg.readFile('output.gif');
    const blob = new Blob([outputData], { type: 'image/gif' });

    // Cleanup
    await ffmpeg.deleteFile('input.gif');
    await ffmpeg.deleteFile('palette.png');
    await ffmpeg.deleteFile('output.gif');

    const originalSize = file.size;
    const optimizedSize = blob.size;
    const savings = ((originalSize - optimizedSize) / originalSize * 100).toFixed(1);

    onProgress?.(100, 'Complete!');

    return {
      blob,
      filename: this.getNewFilename(file.name, 'gif', '_optimized'),
      originalSize,
      optimizedSize,
      savings: `${savings}%`
    };
  }

  /**
   * Extract frames from GIF
   */
  async extractFrames(file, options = {}, onProgress) {
    const { format = 'png' } = options;

    const ffmpeg = await this.loadFFmpeg(onProgress);

    onProgress?.(20, 'Loading GIF...');

    const inputData = new Uint8Array(await file.arrayBuffer());
    await ffmpeg.writeFile('input.gif', inputData);

    onProgress?.(40, 'Extracting frames...');

    await ffmpeg.exec([
      '-i', 'input.gif',
      '-vsync', '0',
      `frame%04d.${format}`
    ]);

    onProgress?.(70, 'Reading frames...');

    // Read all frame files
    const frames = [];
    let frameIndex = 1;
    
    while (true) {
      const frameName = `frame${String(frameIndex).padStart(4, '0')}.${format}`;
      try {
        const frameData = await ffmpeg.readFile(frameName);
        const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
        frames.push({
          blob: new Blob([frameData], { type: mimeType }),
          filename: frameName
        });
        await ffmpeg.deleteFile(frameName);
        frameIndex++;
      } catch (e) {
        break; // No more frames
      }
    }

    // Cleanup
    await ffmpeg.deleteFile('input.gif');

    onProgress?.(100, 'Complete!');

    return {
      frames,
      frameCount: frames.length,
      format
    };
  }

  /**
   * Add text overlay to GIF
   */
  async addTextOverlay(file, options = {}, onProgress) {
    const {
      text = 'Sample Text',
      position = 'bottom',
      fontSize = 24,
      fontColor = 'white',
      backgroundColor = 'black@0.5',
      padding = 10
    } = options;

    const ffmpeg = await this.loadFFmpeg(onProgress);

    onProgress?.(20, 'Loading GIF...');

    const inputData = new Uint8Array(await file.arrayBuffer());
    await ffmpeg.writeFile('input.gif', inputData);

    onProgress?.(40, 'Adding text overlay...');

    // Position mapping
    const positionMap = {
      'top': `x=(w-text_w)/2:y=${padding}`,
      'bottom': `x=(w-text_w)/2:y=h-text_h-${padding}`,
      'center': `x=(w-text_w)/2:y=(h-text_h)/2`,
      'top-left': `x=${padding}:y=${padding}`,
      'top-right': `x=w-text_w-${padding}:y=${padding}`,
      'bottom-left': `x=${padding}:y=h-text_h-${padding}`,
      'bottom-right': `x=w-text_w-${padding}:y=h-text_h-${padding}`
    };

    const posFilter = positionMap[position] || positionMap['bottom'];

    // Generate palette for the output
    await ffmpeg.exec([
      '-i', 'input.gif',
      '-vf', `drawtext=text='${text}':fontsize=${fontSize}:fontcolor=${fontColor}:box=1:boxcolor=${backgroundColor}:boxborderw=5:${posFilter},palettegen=stats_mode=diff`,
      '-y', 'palette.png'
    ]);

    onProgress?.(60, 'Rendering GIF...');

    await ffmpeg.exec([
      '-i', 'input.gif',
      '-i', 'palette.png',
      '-lavfi', `drawtext=text='${text}':fontsize=${fontSize}:fontcolor=${fontColor}:box=1:boxcolor=${backgroundColor}:boxborderw=5:${posFilter}[x];[x][1:v]paletteuse`,
      '-y', 'output.gif'
    ]);

    onProgress?.(85, 'Reading output...');

    const outputData = await ffmpeg.readFile('output.gif');
    const blob = new Blob([outputData], { type: 'image/gif' });

    // Cleanup
    await ffmpeg.deleteFile('input.gif');
    await ffmpeg.deleteFile('palette.png');
    await ffmpeg.deleteFile('output.gif');

    onProgress?.(100, 'Complete!');

    return {
      blob,
      filename: this.getNewFilename(file.name, 'gif', '_text')
    };
  }

  /**
   * Reverse GIF playback
   */
  async reverseGif(file, onProgress) {
    const ffmpeg = await this.loadFFmpeg(onProgress);

    onProgress?.(20, 'Loading GIF...');

    const inputData = new Uint8Array(await file.arrayBuffer());
    await ffmpeg.writeFile('input.gif', inputData);

    onProgress?.(40, 'Reversing frames...');

    // Generate palette
    await ffmpeg.exec([
      '-i', 'input.gif',
      '-vf', 'reverse,palettegen',
      '-y', 'palette.png'
    ]);

    onProgress?.(60, 'Creating reversed GIF...');

    await ffmpeg.exec([
      '-i', 'input.gif',
      '-i', 'palette.png',
      '-lavfi', 'reverse[x];[x][1:v]paletteuse',
      '-y', 'output.gif'
    ]);

    onProgress?.(85, 'Reading output...');

    const outputData = await ffmpeg.readFile('output.gif');
    const blob = new Blob([outputData], { type: 'image/gif' });

    // Cleanup
    await ffmpeg.deleteFile('input.gif');
    await ffmpeg.deleteFile('palette.png');
    await ffmpeg.deleteFile('output.gif');

    onProgress?.(100, 'Complete!');

    return {
      blob,
      filename: this.getNewFilename(file.name, 'gif', '_reversed')
    };
  }

  /**
   * Change GIF speed
   */
  async changeSpeed(file, options = {}, onProgress) {
    const { speed = 1.0 } = options; // 0.5 = half speed, 2.0 = double speed

    const ffmpeg = await this.loadFFmpeg(onProgress);

    onProgress?.(20, 'Loading GIF...');

    const inputData = new Uint8Array(await file.arrayBuffer());
    await ffmpeg.writeFile('input.gif', inputData);

    onProgress?.(40, 'Changing speed...');

    const ptsFilter = `setpts=${1/speed}*PTS`;

    // Generate palette
    await ffmpeg.exec([
      '-i', 'input.gif',
      '-vf', `${ptsFilter},palettegen`,
      '-y', 'palette.png'
    ]);

    onProgress?.(60, 'Creating GIF...');

    await ffmpeg.exec([
      '-i', 'input.gif',
      '-i', 'palette.png',
      '-lavfi', `${ptsFilter}[x];[x][1:v]paletteuse`,
      '-y', 'output.gif'
    ]);

    onProgress?.(85, 'Reading output...');

    const outputData = await ffmpeg.readFile('output.gif');
    const blob = new Blob([outputData], { type: 'image/gif' });

    // Cleanup
    await ffmpeg.deleteFile('input.gif');
    await ffmpeg.deleteFile('palette.png');
    await ffmpeg.deleteFile('output.gif');

    onProgress?.(100, 'Complete!');

    return {
      blob,
      filename: this.getNewFilename(file.name, 'gif', `_${speed}x`),
      speedMultiplier: speed
    };
  }

  /**
   * Get GIF info
   */
  async getInfo(file) {
    // Basic info from file
    const info = {
      name: file.name,
      size: file.size,
      sizeFormatted: this.formatFileSize(file.size),
      type: file.type
    };

    // Try to get dimensions from image
    try {
      const img = await this.loadImage(file);
      info.width = img.width;
      info.height = img.height;
      URL.revokeObjectURL(img.src);
    } catch (e) {
      // Ignore
    }

    return info;
  }

  /**
   * Get quality presets
   */
  getQualityPresets() {
    return [
      { 
        value: 'low', 
        name: 'Low Quality', 
        description: 'Smallest file size, visible artifacts',
        colors: 64,
        fps: 8
      },
      { 
        value: 'medium', 
        name: 'Medium Quality', 
        description: 'Good balance of size and quality',
        colors: 128,
        fps: 12
      },
      { 
        value: 'high', 
        name: 'High Quality', 
        description: 'Best quality, larger file size',
        colors: 256,
        fps: 15
      }
    ];
  }

  /**
   * Get size presets
   */
  getSizePresets() {
    return [
      { width: 240, name: 'Small (240px)' },
      { width: 320, name: 'Medium (320px)' },
      { width: 480, name: 'Large (480px)' },
      { width: 640, name: 'HD (640px)' },
      { width: 800, name: 'Full (800px)' }
    ];
  }

  /**
   * Helper: Load image
   */
  loadImage(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Helper: Get new filename
   */
  getNewFilename(originalName, ext, suffix = '') {
    const baseName = originalName.split('.').slice(0, -1).join('.');
    return `${baseName}${suffix}.${ext}`;
  }

  /**
   * Helper: Format file size
   */
  formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }
}

// Export singleton
const gifCreator = new GIFCreator();
export default gifCreator;
