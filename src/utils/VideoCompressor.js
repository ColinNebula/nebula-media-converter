/**
 * VideoCompressor - Video compression with quality presets
 * Features:
 * - Quality presets (High/Medium/Low)
 * - Bitrate control
 * - Resolution scaling
 * - Custom compression settings
 */

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';

class VideoCompressor {
  constructor() {
    this.ffmpeg = new FFmpeg();
    this.isLoaded = false;
  }

  /**
   * Load FFmpeg
   */
  async load(onProgress) {
    if (this.isLoaded) return;

    onProgress?.(5, 'Loading video compressor...');
    
    const baseURLs = [
      'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd',
      'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd'
    ];

    for (const baseURL of baseURLs) {
      try {
        await this.ffmpeg.load({
          coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
          wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        });
        this.isLoaded = true;
        onProgress?.(15, 'Video compressor ready');
        return;
      } catch (error) {
        console.warn(`Failed to load from ${baseURL}:`, error);
      }
    }
    
    throw new Error('Failed to load video compressor');
  }

  /**
   * Get quality presets
   */
  getPresets() {
    return {
      high: {
        name: 'High Quality',
        description: 'Best quality, larger file size',
        crf: 18,
        preset: 'slow',
        audioBitrate: '192k',
        estimatedReduction: '20-40%'
      },
      medium: {
        name: 'Balanced',
        description: 'Good quality, moderate file size',
        crf: 23,
        preset: 'medium',
        audioBitrate: '128k',
        estimatedReduction: '40-60%'
      },
      low: {
        name: 'Maximum Compression',
        description: 'Smaller file, reduced quality',
        crf: 28,
        preset: 'fast',
        audioBitrate: '96k',
        estimatedReduction: '60-80%'
      },
      web: {
        name: 'Web Optimized',
        description: 'Optimized for web streaming',
        crf: 23,
        preset: 'fast',
        audioBitrate: '128k',
        maxWidth: 1280,
        estimatedReduction: '50-70%'
      },
      mobile: {
        name: 'Mobile Friendly',
        description: 'Optimized for mobile devices',
        crf: 25,
        preset: 'fast',
        audioBitrate: '96k',
        maxWidth: 720,
        estimatedReduction: '60-80%'
      }
    };
  }

  /**
   * Compress video with preset
   */
  async compress(file, presetName = 'medium', onProgress) {
    if (!this.isLoaded) {
      await this.load(onProgress);
    }

    const preset = this.getPresets()[presetName];
    if (!preset) {
      throw new Error(`Unknown preset: ${presetName}`);
    }

    onProgress?.(20, 'Preparing video...');

    const inputName = 'input.mp4';
    const outputName = 'output.mp4';

    // Write input file
    await this.ffmpeg.writeFile(inputName, new Uint8Array(await file.arrayBuffer()));

    onProgress?.(30, `Compressing with ${preset.name} preset...`);

    // Build compression command
    const command = this.buildCompressionCommand(inputName, outputName, preset);
    
    // Set up progress tracking
    this.ffmpeg.on('progress', ({ progress }) => {
      const percent = 30 + Math.round(progress * 60);
      onProgress?.(percent, `Compressing... ${Math.round(progress * 100)}%`);
    });

    // Execute compression
    await this.ffmpeg.exec(command);

    onProgress?.(95, 'Finalizing...');

    // Read output
    const data = await this.ffmpeg.readFile(outputName);
    const blob = new Blob([data.buffer], { type: 'video/mp4' });

    onProgress?.(100, 'Compression complete!');

    const originalSize = file.size;
    const compressedSize = blob.size;
    const reduction = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);

    return {
      blob,
      filename: `${file.name.split('.')[0]}_compressed.mp4`,
      originalSize,
      compressedSize,
      reduction: `${reduction}%`,
      preset: presetName
    };
  }

  /**
   * Build FFmpeg compression command
   */
  buildCompressionCommand(inputName, outputName, preset) {
    const command = ['-i', inputName];

    // Video codec and quality
    command.push('-c:v', 'libx264');
    command.push('-crf', preset.crf.toString());
    command.push('-preset', preset.preset);

    // Resolution scaling if specified
    if (preset.maxWidth) {
      command.push('-vf', `scale='min(${preset.maxWidth},iw)':-2`);
    }

    // Audio settings
    command.push('-c:a', 'aac');
    command.push('-b:a', preset.audioBitrate);

    // Optimize for streaming
    command.push('-movflags', '+faststart');

    // Output
    command.push(outputName);

    return command;
  }

  /**
   * Compress with custom settings
   */
  async compressCustom(file, settings, onProgress) {
    if (!this.isLoaded) {
      await this.load(onProgress);
    }

    const {
      crf = 23,
      videoBitrate,
      audioBitrate = '128k',
      width,
      height,
      fps
    } = settings;

    onProgress?.(20, 'Preparing video...');

    const inputName = 'input.mp4';
    const outputName = 'output.mp4';

    await this.ffmpeg.writeFile(inputName, new Uint8Array(await file.arrayBuffer()));

    onProgress?.(30, 'Applying custom compression...');

    const command = ['-i', inputName, '-c:v', 'libx264'];

    // Quality control
    if (videoBitrate) {
      command.push('-b:v', videoBitrate);
    } else {
      command.push('-crf', crf.toString());
    }

    // Resolution
    if (width && height) {
      command.push('-vf', `scale=${width}:${height}`);
    } else if (width) {
      command.push('-vf', `scale=${width}:-2`);
    }

    // Frame rate
    if (fps) {
      command.push('-r', fps.toString());
    }

    // Audio
    command.push('-c:a', 'aac', '-b:a', audioBitrate);
    command.push('-movflags', '+faststart');
    command.push(outputName);

    this.ffmpeg.on('progress', ({ progress }) => {
      const percent = 30 + Math.round(progress * 60);
      onProgress?.(percent, `Compressing... ${Math.round(progress * 100)}%`);
    });

    await this.ffmpeg.exec(command);

    onProgress?.(95, 'Finalizing...');

    const data = await this.ffmpeg.readFile(outputName);
    const blob = new Blob([data.buffer], { type: 'video/mp4' });

    onProgress?.(100, 'Complete!');

    return {
      blob,
      filename: `${file.name.split('.')[0]}_compressed.mp4`,
      originalSize: file.size,
      compressedSize: blob.size,
      reduction: `${((file.size - blob.size) / file.size * 100).toFixed(1)}%`
    };
  }

  /**
   * Extract audio from video
   */
  async extractAudio(file, format = 'mp3', onProgress) {
    if (!this.isLoaded) {
      await this.load(onProgress);
    }

    onProgress?.(20, 'Loading video...');

    const inputName = `input.${file.name.split('.').pop()}`;
    const outputName = `output.${format}`;

    await this.ffmpeg.writeFile(inputName, new Uint8Array(await file.arrayBuffer()));

    onProgress?.(40, 'Extracting audio...');

    const codecMap = {
      mp3: 'libmp3lame',
      aac: 'aac',
      wav: 'pcm_s16le',
      flac: 'flac',
      ogg: 'libvorbis'
    };

    const command = [
      '-i', inputName,
      '-vn', // No video
      '-acodec', codecMap[format] || 'libmp3lame',
      '-ab', '192k',
      outputName
    ];

    await this.ffmpeg.exec(command);

    onProgress?.(90, 'Saving audio...');

    const data = await this.ffmpeg.readFile(outputName);
    const mimeTypes = {
      mp3: 'audio/mpeg',
      aac: 'audio/aac',
      wav: 'audio/wav',
      flac: 'audio/flac',
      ogg: 'audio/ogg'
    };

    const blob = new Blob([data.buffer], { type: mimeTypes[format] || 'audio/mpeg' });

    onProgress?.(100, 'Complete!');

    return {
      blob,
      filename: `${file.name.split('.')[0]}.${format}`
    };
  }

  /**
   * Create GIF from video
   */
  async createGif(file, options = {}, onProgress) {
    if (!this.isLoaded) {
      await this.load(onProgress);
    }

    const {
      startTime = 0,
      duration = 5,
      width = 480,
      fps = 10
    } = options;

    onProgress?.(20, 'Loading video...');

    const inputName = `input.${file.name.split('.').pop()}`;
    const outputName = 'output.gif';

    await this.ffmpeg.writeFile(inputName, new Uint8Array(await file.arrayBuffer()));

    onProgress?.(40, 'Creating GIF...');

    // Two-pass GIF creation for better quality
    const paletteCmd = [
      '-i', inputName,
      '-ss', startTime.toString(),
      '-t', duration.toString(),
      '-vf', `fps=${fps},scale=${width}:-1:flags=lanczos,palettegen`,
      '-y', 'palette.png'
    ];

    await this.ffmpeg.exec(paletteCmd);

    onProgress?.(60, 'Optimizing GIF...');

    const gifCmd = [
      '-i', inputName,
      '-i', 'palette.png',
      '-ss', startTime.toString(),
      '-t', duration.toString(),
      '-lavfi', `fps=${fps},scale=${width}:-1:flags=lanczos [x]; [x][1:v] paletteuse`,
      '-y', outputName
    ];

    await this.ffmpeg.exec(gifCmd);

    onProgress?.(90, 'Saving GIF...');

    const data = await this.ffmpeg.readFile(outputName);
    const blob = new Blob([data.buffer], { type: 'image/gif' });

    onProgress?.(100, 'Complete!');

    return {
      blob,
      filename: `${file.name.split('.')[0]}.gif`
    };
  }

  /**
   * Trim video
   */
  async trimVideo(file, startTime, endTime, onProgress) {
    if (!this.isLoaded) {
      await this.load(onProgress);
    }

    onProgress?.(20, 'Loading video...');

    const ext = file.name.split('.').pop();
    const inputName = `input.${ext}`;
    const outputName = `output.${ext}`;

    await this.ffmpeg.writeFile(inputName, new Uint8Array(await file.arrayBuffer()));

    onProgress?.(40, 'Trimming video...');

    const duration = endTime - startTime;
    const command = [
      '-i', inputName,
      '-ss', startTime.toString(),
      '-t', duration.toString(),
      '-c', 'copy', // Fast copy without re-encoding
      outputName
    ];

    await this.ffmpeg.exec(command);

    onProgress?.(90, 'Saving trimmed video...');

    const data = await this.ffmpeg.readFile(outputName);
    const blob = new Blob([data.buffer], { type: file.type });

    onProgress?.(100, 'Complete!');

    return {
      blob,
      filename: `${file.name.split('.')[0]}_trimmed.${ext}`
    };
  }
}

// Export singleton instance
const videoCompressor = new VideoCompressor();
export default videoCompressor;
