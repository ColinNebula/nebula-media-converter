import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';

class MediaConverter {
  constructor() {
    this.ffmpeg = new FFmpeg();
    this.isLoaded = false;
  }

  async load(onProgress) {
    if (this.isLoaded) return;

    try {
      onProgress?.(10, 'Loading FFmpeg...');
      
      // Load FFmpeg with CDN URLs - try multiple sources
      const baseURLs = [
        process.env.REACT_APP_FFMPEG_CDN_PRIMARY || 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd',
        process.env.REACT_APP_FFMPEG_CDN_FALLBACK || 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd'
      ];

      let loadSuccess = false;
      for (const baseURL of baseURLs) {
        try {
          onProgress?.(20, `Trying CDN: ${baseURL.includes('unpkg') ? 'unpkg' : 'jsdelivr'}...`);
          
          await this.ffmpeg.load({
            coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
            wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
          });
          
          loadSuccess = true;
          break;
        } catch (error) {
          console.warn(`Failed to load from ${baseURL}:`, error);
          if (baseURL === baseURLs[baseURLs.length - 1]) {
            throw error; // Re-throw if it's the last attempt
          }
        }
      }

      if (!loadSuccess) {
        throw new Error('Failed to load FFmpeg from all CDN sources');
      }

      onProgress?.(30, 'FFmpeg loaded successfully');
      this.isLoaded = true;
    } catch (error) {
      throw new Error(`Failed to load FFmpeg: ${error.message}. Please refresh the page and try again.`);
    }
  }

  async convert(file, outputFormat, onProgress) {
    if (!this.isLoaded) {
      await this.load(onProgress);
    }

    try {
      onProgress?.(40, 'Preparing file for conversion...');
      
      // Write input file to FFmpeg filesystem
      const inputName = `input.${file.name.split('.').pop()}`;
      const outputName = `output.${outputFormat}`;
      
      await this.ffmpeg.writeFile(inputName, new Uint8Array(await file.arrayBuffer()));

      onProgress?.(60, 'Converting file...');

      // Build FFmpeg command based on output format
      const command = this.buildCommand(inputName, outputName, outputFormat);
      
      // Execute conversion
      await this.ffmpeg.exec(command);

      onProgress?.(90, 'Finalizing conversion...');

      // Read the output file
      const data = await this.ffmpeg.readFile(outputName);
      
      onProgress?.(100, 'Conversion complete!');

      // Create blob and return result
      const blob = new Blob([data.buffer], { type: this.getMimeType(outputFormat) });
      const filename = `${file.name.split('.')[0]}.${outputFormat}`;

      return { blob, filename };
    } catch (error) {
      throw new Error(`Conversion failed: ${error.message}`);
    }
  }

  buildCommand(inputName, outputName, outputFormat) {
    const baseCommand = ['-i', inputName];
    
    switch (outputFormat) {
      // Audio formats
      case 'mp3':
        return [...baseCommand, '-acodec', 'libmp3lame', '-ab', '192k', outputName];
      case 'wav':
        return [...baseCommand, '-acodec', 'pcm_s16le', outputName];
      case 'flac':
        return [...baseCommand, '-acodec', 'flac', outputName];
      case 'aac':
        return [...baseCommand, '-acodec', 'aac', '-ab', '192k', outputName];
      case 'ogg':
        return [...baseCommand, '-acodec', 'libvorbis', '-ab', '192k', outputName];
      case 'm4a':
        return [...baseCommand, '-acodec', 'aac', '-ab', '192k', outputName];
      
      // Video formats
      case 'mp4':
        return [...baseCommand, '-vcodec', 'libx264', '-acodec', 'aac', outputName];
      case 'avi':
        return [...baseCommand, '-vcodec', 'libx264', '-acodec', 'mp3', outputName];
      case 'mov':
        return [...baseCommand, '-vcodec', 'libx264', '-acodec', 'aac', outputName];
      case 'mkv':
        return [...baseCommand, '-vcodec', 'libx264', '-acodec', 'aac', outputName];
      case 'webm':
        return [...baseCommand, '-vcodec', 'libvpx', '-acodec', 'libvorbis', outputName];
      
      // Image formats
      case 'jpg':
      case 'jpeg':
        return [...baseCommand, '-vcodec', 'mjpeg', '-q:v', '2', outputName];
      case 'png':
        return [...baseCommand, '-vcodec', 'png', outputName];
      case 'gif':
        return [...baseCommand, '-vcodec', 'gif', outputName];
      case 'bmp':
        return [...baseCommand, '-vcodec', 'bmp', outputName];
      case 'webp':
        return [...baseCommand, '-vcodec', 'libwebp', '-quality', '80', outputName];
      
      default:
        return [...baseCommand, outputName];
    }
  }

  getMimeType(format) {
    const mimeTypes = {
      // Audio
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      flac: 'audio/flac',
      aac: 'audio/aac',
      ogg: 'audio/ogg',
      m4a: 'audio/mp4',
      
      // Video
      mp4: 'video/mp4',
      avi: 'video/x-msvideo',
      mov: 'video/quicktime',
      mkv: 'video/x-matroska',
      webm: 'video/webm',
      
      // Image
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      bmp: 'image/bmp',
      webp: 'image/webp'
    };
    return mimeTypes[format] || 'application/octet-stream';
  }
}

export default MediaConverter;