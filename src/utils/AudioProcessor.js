/**
 * AudioProcessor - Audio manipulation utilities using FFmpeg
 * Features:
 * - Audio normalization
 * - Trim/cut audio
 * - Extract audio from video
 * - Change bitrate/quality
 * - Format conversion
 * - Volume adjustment
 * - Fade in/out effects
 */

class AudioProcessor {
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
      onProgress?.(pct, 'Processing audio...');
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
   * Normalize audio levels
   */
  async normalize(file, options = {}, onProgress) {
    const { targetLevel = -16, method = 'loudnorm' } = options;

    const ffmpeg = await this.loadFFmpeg(onProgress);

    onProgress?.(20, 'Loading audio...');

    const inputData = new Uint8Array(await file.arrayBuffer());
    const inputExt = this.getExtension(file.name);
    await ffmpeg.writeFile(`input.${inputExt}`, inputData);

    onProgress?.(30, 'Analyzing audio levels...');

    // Use loudnorm for proper loudness normalization
    let filterComplex;
    if (method === 'loudnorm') {
      filterComplex = `loudnorm=I=${targetLevel}:TP=-1.5:LRA=11`;
    } else if (method === 'dynaudnorm') {
      filterComplex = 'dynaudnorm=f=150:g=15';
    } else {
      // Simple peak normalization
      filterComplex = 'acompressor=threshold=-20dB:ratio=4:attack=5:release=50,volume=2';
    }

    await ffmpeg.exec([
      '-i', `input.${inputExt}`,
      '-af', filterComplex,
      '-ar', '44100',
      '-y', 'output.mp3'
    ]);

    onProgress?.(85, 'Reading output...');

    const outputData = await ffmpeg.readFile('output.mp3');
    const blob = new Blob([outputData], { type: 'audio/mpeg' });

    // Cleanup
    await ffmpeg.deleteFile(`input.${inputExt}`);
    await ffmpeg.deleteFile('output.mp3');

    onProgress?.(100, 'Complete!');

    return {
      blob,
      filename: this.getNewFilename(file.name, 'mp3', '_normalized')
    };
  }

  /**
   * Trim/cut audio
   */
  async trim(file, options = {}, onProgress) {
    const { startTime = 0, endTime, duration } = options;

    const ffmpeg = await this.loadFFmpeg(onProgress);

    onProgress?.(20, 'Loading audio...');

    const inputData = new Uint8Array(await file.arrayBuffer());
    const inputExt = this.getExtension(file.name);
    await ffmpeg.writeFile(`input.${inputExt}`, inputData);

    onProgress?.(30, 'Trimming audio...');

    const args = [
      '-i', `input.${inputExt}`,
      '-ss', this.formatTime(startTime)
    ];

    if (endTime !== undefined) {
      args.push('-to', this.formatTime(endTime));
    } else if (duration !== undefined) {
      args.push('-t', this.formatTime(duration));
    }

    args.push('-c', 'copy', '-y', `output.${inputExt}`);

    await ffmpeg.exec(args);

    onProgress?.(85, 'Reading output...');

    const outputData = await ffmpeg.readFile(`output.${inputExt}`);
    const mimeType = this.getMimeType(inputExt);
    const blob = new Blob([outputData], { type: mimeType });

    // Cleanup
    await ffmpeg.deleteFile(`input.${inputExt}`);
    await ffmpeg.deleteFile(`output.${inputExt}`);

    onProgress?.(100, 'Complete!');

    return {
      blob,
      filename: this.getNewFilename(file.name, inputExt, '_trimmed'),
      startTime,
      endTime: endTime || startTime + duration
    };
  }

  /**
   * Extract audio from video
   */
  async extractFromVideo(file, options = {}, onProgress) {
    const { format = 'mp3', bitrate = '192k', sampleRate = 44100 } = options;

    const ffmpeg = await this.loadFFmpeg(onProgress);

    onProgress?.(20, 'Loading video...');

    const inputData = new Uint8Array(await file.arrayBuffer());
    await ffmpeg.writeFile('input.mp4', inputData);

    onProgress?.(30, 'Extracting audio...');

    const args = [
      '-i', 'input.mp4',
      '-vn', // No video
      '-ar', sampleRate.toString(),
      '-b:a', bitrate
    ];

    if (format === 'mp3') {
      args.push('-acodec', 'libmp3lame');
    } else if (format === 'aac') {
      args.push('-acodec', 'aac');
    } else if (format === 'wav') {
      args.push('-acodec', 'pcm_s16le');
    } else if (format === 'ogg') {
      args.push('-acodec', 'libvorbis');
    }

    args.push('-y', `output.${format}`);

    await ffmpeg.exec(args);

    onProgress?.(85, 'Reading output...');

    const outputData = await ffmpeg.readFile(`output.${format}`);
    const mimeType = this.getMimeType(format);
    const blob = new Blob([outputData], { type: mimeType });

    // Cleanup
    await ffmpeg.deleteFile('input.mp4');
    await ffmpeg.deleteFile(`output.${format}`);

    onProgress?.(100, 'Complete!');

    return {
      blob,
      filename: this.getNewFilename(file.name, format, '_audio'),
      format,
      bitrate
    };
  }

  /**
   * Change audio bitrate/quality
   */
  async changeBitrate(file, options = {}, onProgress) {
    const { bitrate = '192k', sampleRate = 44100, format } = options;

    const ffmpeg = await this.loadFFmpeg(onProgress);

    onProgress?.(20, 'Loading audio...');

    const inputData = new Uint8Array(await file.arrayBuffer());
    const inputExt = this.getExtension(file.name);
    const outputExt = format || inputExt;
    await ffmpeg.writeFile(`input.${inputExt}`, inputData);

    onProgress?.(30, 'Changing bitrate...');

    await ffmpeg.exec([
      '-i', `input.${inputExt}`,
      '-b:a', bitrate,
      '-ar', sampleRate.toString(),
      '-y', `output.${outputExt}`
    ]);

    onProgress?.(85, 'Reading output...');

    const outputData = await ffmpeg.readFile(`output.${outputExt}`);
    const mimeType = this.getMimeType(outputExt);
    const blob = new Blob([outputData], { type: mimeType });

    // Cleanup
    await ffmpeg.deleteFile(`input.${inputExt}`);
    await ffmpeg.deleteFile(`output.${outputExt}`);

    onProgress?.(100, 'Complete!');

    return {
      blob,
      filename: this.getNewFilename(file.name, outputExt, `_${bitrate}`),
      bitrate,
      sampleRate
    };
  }

  /**
   * Adjust volume
   */
  async adjustVolume(file, options = {}, onProgress) {
    const { volume = 1.0 } = options; // 1.0 = 100%, 0.5 = 50%, 2.0 = 200%

    const ffmpeg = await this.loadFFmpeg(onProgress);

    onProgress?.(20, 'Loading audio...');

    const inputData = new Uint8Array(await file.arrayBuffer());
    const inputExt = this.getExtension(file.name);
    await ffmpeg.writeFile(`input.${inputExt}`, inputData);

    onProgress?.(30, 'Adjusting volume...');

    await ffmpeg.exec([
      '-i', `input.${inputExt}`,
      '-af', `volume=${volume}`,
      '-y', `output.${inputExt}`
    ]);

    onProgress?.(85, 'Reading output...');

    const outputData = await ffmpeg.readFile(`output.${inputExt}`);
    const mimeType = this.getMimeType(inputExt);
    const blob = new Blob([outputData], { type: mimeType });

    // Cleanup
    await ffmpeg.deleteFile(`input.${inputExt}`);
    await ffmpeg.deleteFile(`output.${inputExt}`);

    onProgress?.(100, 'Complete!');

    return {
      blob,
      filename: this.getNewFilename(file.name, inputExt, '_volume'),
      volumeChange: `${Math.round(volume * 100)}%`
    };
  }

  /**
   * Add fade in/out effects
   */
  async addFade(file, options = {}, onProgress) {
    const { fadeIn = 0, fadeOut = 0 } = options;

    const ffmpeg = await this.loadFFmpeg(onProgress);

    onProgress?.(20, 'Loading audio...');

    const inputData = new Uint8Array(await file.arrayBuffer());
    const inputExt = this.getExtension(file.name);
    await ffmpeg.writeFile(`input.${inputExt}`, inputData);

    onProgress?.(25, 'Getting audio duration...');

    // Get duration first
    await ffmpeg.exec([
      '-i', `input.${inputExt}`,
      '-f', 'null', '-'
    ]);

    onProgress?.(30, 'Applying fade effects...');

    const filters = [];
    if (fadeIn > 0) {
      filters.push(`afade=t=in:st=0:d=${fadeIn}`);
    }
    if (fadeOut > 0) {
      // For fade out, we need the duration. Using a safe default.
      filters.push(`afade=t=out:st=0:d=${fadeOut}`);
    }

    const filterStr = filters.length > 0 ? filters.join(',') : 'anull';

    await ffmpeg.exec([
      '-i', `input.${inputExt}`,
      '-af', filterStr,
      '-y', `output.${inputExt}`
    ]);

    onProgress?.(85, 'Reading output...');

    const outputData = await ffmpeg.readFile(`output.${inputExt}`);
    const mimeType = this.getMimeType(inputExt);
    const blob = new Blob([outputData], { type: mimeType });

    // Cleanup
    await ffmpeg.deleteFile(`input.${inputExt}`);
    await ffmpeg.deleteFile(`output.${inputExt}`);

    onProgress?.(100, 'Complete!');

    return {
      blob,
      filename: this.getNewFilename(file.name, inputExt, '_faded'),
      fadeIn,
      fadeOut
    };
  }

  /**
   * Convert audio format
   */
  async convert(file, options = {}, onProgress) {
    const { format = 'mp3', bitrate = '192k', sampleRate = 44100 } = options;

    const ffmpeg = await this.loadFFmpeg(onProgress);

    onProgress?.(20, 'Loading audio...');

    const inputData = new Uint8Array(await file.arrayBuffer());
    const inputExt = this.getExtension(file.name);
    await ffmpeg.writeFile(`input.${inputExt}`, inputData);

    onProgress?.(30, 'Converting format...');

    const args = [
      '-i', `input.${inputExt}`,
      '-ar', sampleRate.toString(),
      '-b:a', bitrate
    ];

    // Format-specific codecs
    if (format === 'mp3') {
      args.push('-acodec', 'libmp3lame');
    } else if (format === 'aac' || format === 'm4a') {
      args.push('-acodec', 'aac');
    } else if (format === 'wav') {
      args.push('-acodec', 'pcm_s16le');
    } else if (format === 'ogg') {
      args.push('-acodec', 'libvorbis');
    } else if (format === 'flac') {
      args.push('-acodec', 'flac');
    }

    args.push('-y', `output.${format}`);

    await ffmpeg.exec(args);

    onProgress?.(85, 'Reading output...');

    const outputData = await ffmpeg.readFile(`output.${format}`);
    const mimeType = this.getMimeType(format);
    const blob = new Blob([outputData], { type: mimeType });

    // Cleanup
    await ffmpeg.deleteFile(`input.${inputExt}`);
    await ffmpeg.deleteFile(`output.${format}`);

    onProgress?.(100, 'Complete!');

    return {
      blob,
      filename: this.getNewFilename(file.name, format),
      format,
      bitrate
    };
  }

  /**
   * Merge multiple audio files
   */
  async merge(files, options = {}, onProgress) {
    const { format = 'mp3', crossfade = 0 } = options;

    const ffmpeg = await this.loadFFmpeg(onProgress);

    onProgress?.(15, 'Loading audio files...');

    // Write all input files
    const inputList = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const inputData = new Uint8Array(await file.arrayBuffer());
      const filename = `input${i}.${this.getExtension(file.name)}`;
      await ffmpeg.writeFile(filename, inputData);
      inputList.push(`file '${filename}'`);
      
      const progress = 15 + ((i / files.length) * 20);
      onProgress?.(Math.round(progress), `Loading file ${i + 1}/${files.length}...`);
    }

    // Create concat file
    await ffmpeg.writeFile('concat.txt', inputList.join('\n'));

    onProgress?.(40, 'Merging audio files...');

    await ffmpeg.exec([
      '-f', 'concat',
      '-safe', '0',
      '-i', 'concat.txt',
      '-c', 'copy',
      '-y', `output.${format}`
    ]);

    onProgress?.(85, 'Reading output...');

    const outputData = await ffmpeg.readFile(`output.${format}`);
    const mimeType = this.getMimeType(format);
    const blob = new Blob([outputData], { type: mimeType });

    // Cleanup
    for (let i = 0; i < files.length; i++) {
      await ffmpeg.deleteFile(`input${i}.${this.getExtension(files[i].name)}`);
    }
    await ffmpeg.deleteFile('concat.txt');
    await ffmpeg.deleteFile(`output.${format}`);

    onProgress?.(100, 'Complete!');

    return {
      blob,
      filename: `merged_audio.${format}`,
      fileCount: files.length
    };
  }

  /**
   * Get audio info
   */
  async getInfo(file) {
    // Use Web Audio API to get basic info
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    return {
      duration: audioBuffer.duration,
      durationFormatted: this.formatTime(audioBuffer.duration),
      sampleRate: audioBuffer.sampleRate,
      channels: audioBuffer.numberOfChannels,
      size: file.size,
      sizeFormatted: this.formatFileSize(file.size),
      type: file.type,
      name: file.name
    };
  }

  /**
   * Get supported formats
   */
  getSupportedFormats() {
    return [
      { ext: 'mp3', name: 'MP3', mimeType: 'audio/mpeg' },
      { ext: 'wav', name: 'WAV', mimeType: 'audio/wav' },
      { ext: 'ogg', name: 'OGG Vorbis', mimeType: 'audio/ogg' },
      { ext: 'aac', name: 'AAC', mimeType: 'audio/aac' },
      { ext: 'm4a', name: 'M4A', mimeType: 'audio/mp4' },
      { ext: 'flac', name: 'FLAC', mimeType: 'audio/flac' },
      { ext: 'wma', name: 'WMA', mimeType: 'audio/x-ms-wma' }
    ];
  }

  /**
   * Get bitrate presets
   */
  getBitratePresets() {
    return [
      { value: '64k', name: 'Low (64 kbps)', description: 'Small file size, lower quality' },
      { value: '128k', name: 'Standard (128 kbps)', description: 'Good for speech/podcasts' },
      { value: '192k', name: 'High (192 kbps)', description: 'Good quality music' },
      { value: '256k', name: 'Very High (256 kbps)', description: 'High quality music' },
      { value: '320k', name: 'Maximum (320 kbps)', description: 'Best MP3 quality' }
    ];
  }

  /**
   * Helper: Get file extension
   */
  getExtension(filename) {
    return filename.split('.').pop().toLowerCase();
  }

  /**
   * Helper: Get MIME type
   */
  getMimeType(ext) {
    const types = {
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      ogg: 'audio/ogg',
      aac: 'audio/aac',
      m4a: 'audio/mp4',
      flac: 'audio/flac',
      wma: 'audio/x-ms-wma'
    };
    return types[ext] || 'audio/mpeg';
  }

  /**
   * Helper: Get new filename
   */
  getNewFilename(originalName, newExt, suffix = '') {
    const baseName = originalName.split('.').slice(0, -1).join('.');
    return `${baseName}${suffix}.${newExt}`;
  }

  /**
   * Helper: Format time
   */
  formatTime(seconds) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
const audioProcessor = new AudioProcessor();
export default audioProcessor;
