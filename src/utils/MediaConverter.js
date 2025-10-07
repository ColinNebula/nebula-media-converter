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
      
      // Load FFmpeg with CDN URLs
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
      await this.ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });

      onProgress?.(30, 'FFmpeg loaded successfully');
      this.isLoaded = true;
    } catch (error) {
      throw new Error(`Failed to load FFmpeg: ${error.message}`);
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
      default:
        return [...baseCommand, outputName];
    }
  }

  getMimeType(format) {
    const mimeTypes = {
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      flac: 'audio/flac',
      aac: 'audio/aac',
      ogg: 'audio/ogg',
      m4a: 'audio/mp4',
      mp4: 'video/mp4',
      avi: 'video/x-msvideo',
      mov: 'video/quicktime',
      mkv: 'video/x-matroska',
      webm: 'video/webm'
    };
    return mimeTypes[format] || 'application/octet-stream';
  }
}

export default MediaConverter;