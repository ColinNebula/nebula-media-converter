/**
 * ImageSequenceConverter
 * ─────────────────────────────────────────────────────────────────────────────
 * Import:  image sequence (PNG/JPG/WebP files) → MP4 / WebM / GIF / MKV
 * Export:  video (MP4/WebM/MKV/GIF) → ZIP of PNG or JPG frames
 *
 * All processing is done in-browser via ffmpeg.wasm + JSZip.
 */

class ImageSequenceConverter {
  constructor() {
    this.ffmpeg = null;
    this.loaded = false;
  }

  // ── FFmpeg bootstrap ────────────────────────────────────────────────────────

  async _loadFFmpeg(onProgress) {
    if (this.loaded && this.ffmpeg) return this.ffmpeg;

    onProgress?.(3, 'Loading FFmpeg engine...');

    const { FFmpeg } = await import('@ffmpeg/ffmpeg');
    const { toBlobURL } = await import('@ffmpeg/util');

    this.ffmpeg = new FFmpeg();
    this.ffmpeg.on('progress', ({ progress }) => {
      onProgress?.(15 + Math.round(progress * 65), 'Processing...');
    });

    const CDNs = [
      'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm',
      'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm',
    ];

    for (const base of CDNs) {
      try {
        await this.ffmpeg.load({
          coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, 'text/javascript'),
          wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, 'application/wasm'),
        });
        this.loaded = true;
        break;
      } catch {
        // try next CDN
      }
    }

    if (!this.loaded) throw new Error('Failed to load FFmpeg — check your internet connection.');
    onProgress?.(12, 'FFmpeg ready');
    return this.ffmpeg;
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  _pad(n) { return String(n).padStart(4, '0'); }

  async _cleanup(ffmpeg, names) {
    for (const name of names) {
      try { await ffmpeg.deleteFile(name); } catch { /* ignore */ }
    }
  }

  // ── Import: image sequence → video / GIF ────────────────────────────────────

  /**
   * Convert a sorted array of image Files into a single video or GIF.
   *
   * @param {File[]} files         Sorted image files (PNG / JPG / WebP / BMP)
   * @param {string} outputFormat  Target: 'mp4' | 'webm' | 'mkv' | 'gif'
   * @param {object} options
   *   @param {number}  options.fps      Frames per second (default 24)
   *   @param {number}  options.width    Output width in px, -1 = keep source (default -1)
   *   @param {string}  options.quality  'low' | 'medium' | 'high' (default 'medium')
   *   @param {boolean} options.sort     Sort files by name before encoding (default true)
   * @param {Function} onProgress  (percent, message) => void
   * @returns {{ blob, filename, frameCount }}
   */
  async sequenceToVideo(files, outputFormat, options = {}, onProgress) {
    if (!files || files.length === 0) throw new Error('No images provided.');

    const {
      fps     = 24,
      width   = -1,
      quality = 'medium',
      sort    = true,
    } = options;

    const fmt = outputFormat.toLowerCase();

    const ffmpeg = await this._loadFFmpeg(onProgress);

    // Sort
    const sorted = sort
      ? [...files].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }))
      : [...files];

    onProgress?.(14, 'Loading images into memory...');

    // Detect extension — use the most common one; standardise to a single ext
    const firstExt = sorted[0].name.split('.').pop().toLowerCase();
    const writtenNames = [];

    for (let i = 0; i < sorted.length; i++) {
      const data = new Uint8Array(await sorted[i].arrayBuffer());
      const name = `seq_frame${this._pad(i)}.${firstExt}`;
      await ffmpeg.writeFile(name, data);
      writtenNames.push(name);
      onProgress?.(
        14 + Math.round((i / sorted.length) * 6),
        `Loaded frame ${i + 1} / ${sorted.length}`
      );
    }

    const outputName = `sequence_output.${fmt}`;

    onProgress?.(22, `Encoding ${fmt.toUpperCase()}...`);

    // Scale filter
    const scaleFilter = width > 0
      ? `scale=${width}:-2:flags=lanczos`  // -2 = keep aspect, divisible by 2
      : 'scale=trunc(iw/2)*2:trunc(ih/2)*2'; // just ensure even dimensions

    if (fmt === 'gif') {
      // 2-pass GIF (palette generation)
      await ffmpeg.exec([
        '-framerate', String(fps),
        '-i', `seq_frame%04d.${firstExt}`,
        '-vf', `${scaleFilter},palettegen=stats_mode=diff`,
        '-y', 'seq_palette.png',
      ]);
      const ditherMap = { low: 'none', medium: 'bayer:bayer_scale=5', high: 'sierra2_4a' };
      await ffmpeg.exec([
        '-framerate', String(fps),
        '-i', `seq_frame%04d.${firstExt}`,
        '-i', 'seq_palette.png',
        '-lavfi', `${scaleFilter}[x];[x][1:v]paletteuse=dither=${ditherMap[quality] || ditherMap.medium}`,
        '-loop', '0',
        '-y', outputName,
      ]);
      await ffmpeg.deleteFile('seq_palette.png');
    } else {
      // Video
      const crfMap   = { low: '32', medium: '23', high: '18' };
      const presetMap = { low: 'veryfast', medium: 'medium', high: 'slow' };
      const crf    = crfMap[quality]    || crfMap.medium;
      const preset = presetMap[quality] || presetMap.medium;

      const codecArgs = fmt === 'webm'
        ? ['-c:v', 'libvpx', '-crf', crf, '-b:v', '0', '-an']
        : ['-c:v', 'libx264', '-crf', crf, '-preset', preset, '-pix_fmt', 'yuv420p', '-an'];

      await ffmpeg.exec([
        '-framerate', String(fps),
        '-i', `seq_frame%04d.${firstExt}`,
        '-vf', scaleFilter,
        ...codecArgs,
        '-y', outputName,
      ]);
    }

    onProgress?.(84, 'Reading output file...');
    const outputData = await ffmpeg.readFile(outputName);

    const mimeMap = {
      mp4: 'video/mp4', webm: 'video/webm', mkv: 'video/x-matroska', gif: 'image/gif',
    };
    const blob = new Blob([outputData.buffer], { type: mimeMap[fmt] || 'video/mp4' });

    // Cleanup
    await this._cleanup(ffmpeg, [...writtenNames, outputName]);

    onProgress?.(100, 'Complete!');

    return {
      blob,
      filename: `sequence.${fmt}`,
      frameCount: sorted.length,
    };
  }

  // ── Export: video → image sequence (ZIP) ────────────────────────────────────

  /**
   * Extract frames from a video and return a ZIP file containing all images.
   *
   * @param {File}   file          Input video (MP4 / WebM / MKV / GIF / MOV)
   * @param {string} imageFormat   'png' | 'jpg' (default 'png')
   * @param {object} options
   *   @param {number|string} options.fps    Frames per second to extract.
   *                                        'source' = native frame rate (default 'source')
   *   @param {number}        options.width  Resize width, -1 = keep original (default -1)
   *   @param {number}        options.maxFrames  Cap on total frames extracted (default 500)
   * @param {Function} onProgress  (percent, message) => void
   * @returns {{ blob, filename, frameCount }}
   */
  async videoToSequence(file, imageFormat = 'png', options = {}, onProgress) {
    const {
      fps       = 'source',
      width     = -1,
      maxFrames = 500,
    } = options;

    const fmt = imageFormat.toLowerCase() === 'jpg' ? 'jpg' : 'png';

    const ffmpeg = await this._loadFFmpeg(onProgress);

    onProgress?.(14, 'Loading video...');
    const inputExt  = file.name.split('.').pop().toLowerCase() || 'mp4';
    const inputName = `seq_input.${inputExt}`;
    await ffmpeg.writeFile(inputName, new Uint8Array(await file.arrayBuffer()));

    // Build vf filter
    const scaleFilter = width > 0 ? `scale=${width}:-2:flags=lanczos,` : '';
    const fpsFilter   = fps === 'source' ? '' : `fps=${fps},`;
    const vf          = `${fpsFilter}${scaleFilter}`.replace(/,$/, '');

    const outputPattern = `frame%04d.${fmt}`;

    onProgress?.(22, 'Extracting frames...');

    const execArgs = ['-i', inputName];
    if (vf) execArgs.push('-vf', vf);
    execArgs.push(
      '-vframes', String(maxFrames),
      '-q:v', fmt === 'jpg' ? '2' : '1',
      '-y', outputPattern,
    );

    await ffmpeg.exec(execArgs);

    onProgress?.(82, 'Collecting frames...');

    // Collect frame files
    const { JSZip } = await this._loadJSZip();
    const zip = new JSZip();
    const folder = zip.folder('frames');
    let frameCount = 0;

    for (let i = 1; i <= maxFrames; i++) {
      const name = `frame${this._pad(i - 1 + 1)}.${fmt}`;
      // ffmpeg outputs frame0001, frame0002, … (1-based)
      const fname = `frame${String(i).padStart(4, '0')}.${fmt}`;
      try {
        const data = await ffmpeg.readFile(fname);
        folder.file(fname, data);
        frameCount++;
        await ffmpeg.deleteFile(fname);
      } catch {
        break; // no more frames
      }
    }

    if (frameCount === 0) throw new Error('No frames were extracted. The video may be empty or unsupported.');

    onProgress?.(92, `Zipping ${frameCount} frames...`);

    await this._cleanup(ffmpeg, [inputName]);

    const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 3 } });

    const baseName = file.name.replace(/\.[^.]+$/, '');

    onProgress?.(100, 'Complete!');

    return {
      blob: zipBlob,
      filename: `${baseName}_frames_${fmt}.zip`,
      frameCount,
    };
  }

  // ── JSZip loader ─────────────────────────────────────────────────────────────

  async _loadJSZip() {
    const JSZip = (await import('jszip')).default;
    return { JSZip };
  }

  // ── Format metadata ──────────────────────────────────────────────────────────

  get videoOutputFormats() {
    return [
      { value: 'mp4',  label: 'MP4 (H.264)' },
      { value: 'webm', label: 'WebM (VP8)' },
      { value: 'mkv',  label: 'MKV (H.264)' },
      { value: 'gif',  label: 'Animated GIF' },
    ];
  }

  get imageOutputFormats() {
    return [
      { value: 'png', label: 'PNG (lossless)' },
      { value: 'jpg', label: 'JPG (smaller files)' },
    ];
  }
}

export default new ImageSequenceConverter();
