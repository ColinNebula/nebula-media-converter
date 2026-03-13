/**
 * WatermarkProcessor - Add watermarks to PDFs, images, and videos
 * Features:
 * - Text watermarks
 * - Image watermarks
 * - PDF watermarking
 * - Video watermarking (via FFmpeg)
 * - Batch processing
 */

class WatermarkProcessor {
  constructor() {
    this.ffmpeg = null;
    this.ffmpegLoaded = false;
  }

  /**
   * Add text watermark to image
   */
  async addTextWatermarkToImage(file, options = {}, onProgress) {
    const {
      text = 'WATERMARK',
      position = 'center',
      fontSize = 48,
      fontFamily = 'Arial',
      color = 'rgba(255, 255, 255, 0.5)',
      rotation = -30,
      opacity = 0.5,
      repeat = false
    } = options;

    onProgress?.(10, 'Loading image...');

    const img = await this.loadImage(file);

    onProgress?.(30, 'Creating watermark...');

    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');

    // Draw original image
    ctx.drawImage(img, 0, 0);

    // Set watermark style
    ctx.font = `${fontSize}px ${fontFamily}`;
    ctx.fillStyle = color;
    ctx.globalAlpha = opacity;

    onProgress?.(50, 'Applying watermark...');

    if (repeat) {
      // Tile watermark across image
      ctx.save();
      ctx.rotate((rotation * Math.PI) / 180);
      
      const textWidth = ctx.measureText(text).width;
      const gap = textWidth * 1.5;
      
      for (let y = -canvas.height; y < canvas.height * 2; y += fontSize * 3) {
        for (let x = -canvas.width; x < canvas.width * 2; x += gap) {
          ctx.fillText(text, x, y);
        }
      }
      ctx.restore();
    } else {
      // Single watermark at position
      const pos = this.calculatePosition(canvas.width, canvas.height, position, ctx.measureText(text).width, fontSize);
      
      ctx.save();
      ctx.translate(pos.x, pos.y);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.fillText(text, 0, 0);
      ctx.restore();
    }

    onProgress?.(80, 'Encoding image...');

    ctx.globalAlpha = 1;
    const blob = await this.canvasToBlob(canvas, file.type || 'image/png');

    onProgress?.(100, 'Complete!');

    URL.revokeObjectURL(img.src);

    return {
      blob,
      filename: this.getNewFilename(file.name, '_watermarked')
    };
  }

  /**
   * Add image watermark to image
   */
  async addImageWatermarkToImage(file, watermarkFile, options = {}, onProgress) {
    const {
      position = 'bottom-right',
      scale = 0.2,
      opacity = 0.7,
      padding = 20
    } = options;

    onProgress?.(10, 'Loading images...');

    const [img, watermark] = await Promise.all([
      this.loadImage(file),
      this.loadImage(watermarkFile)
    ]);

    onProgress?.(40, 'Applying watermark...');

    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');

    // Draw original image
    ctx.drawImage(img, 0, 0);

    // Calculate watermark size
    const wmWidth = img.width * scale;
    const wmHeight = (watermark.height / watermark.width) * wmWidth;

    // Calculate position
    const pos = this.calculateImagePosition(
      canvas.width, canvas.height,
      wmWidth, wmHeight,
      position, padding
    );

    // Draw watermark
    ctx.globalAlpha = opacity;
    ctx.drawImage(watermark, pos.x, pos.y, wmWidth, wmHeight);
    ctx.globalAlpha = 1;

    onProgress?.(80, 'Encoding image...');

    const blob = await this.canvasToBlob(canvas, file.type || 'image/png');

    onProgress?.(100, 'Complete!');

    URL.revokeObjectURL(img.src);
    URL.revokeObjectURL(watermark.src);

    return {
      blob,
      filename: this.getNewFilename(file.name, '_watermarked')
    };
  }

  /**
   * Add watermark to PDF
   */
  async addWatermarkToPDF(file, options = {}, onProgress) {
    const {
      text = 'WATERMARK',
      fontSize = 60,
      color = { r: 0.5, g: 0.5, b: 0.5 },
      opacity = 0.3,
      rotation = -45,
      position = 'center'
    } = options;

    onProgress?.(5, 'Loading PDF library...');

    const PDFLib = await this.loadPDFLib();

    onProgress?.(15, 'Loading PDF...');

    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
    const pages = pdfDoc.getPages();

    onProgress?.(25, 'Embedding font...');

    const font = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);

    const totalPages = pages.length;

    for (let i = 0; i < totalPages; i++) {
      const progress = 25 + ((i / totalPages) * 60);
      onProgress?.(Math.round(progress), `Watermarking page ${i + 1}/${totalPages}...`);

      const page = pages[i];
      const { width, height } = page.getSize();
      const textWidth = font.widthOfTextAtSize(text, fontSize);

      // Calculate position
      let x, y;
      if (position === 'center') {
        x = (width - textWidth) / 2;
        y = height / 2;
      } else {
        const pos = this.calculatePosition(width, height, position, textWidth, fontSize);
        x = pos.x;
        y = height - pos.y; // PDF coordinates are from bottom
      }

      page.drawText(text, {
        x,
        y,
        size: fontSize,
        font,
        color: PDFLib.rgb(color.r, color.g, color.b),
        opacity,
        rotate: PDFLib.degrees(rotation)
      });
    }

    onProgress?.(90, 'Generating PDF...');

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });

    onProgress?.(100, 'Complete!');

    return {
      blob,
      filename: this.getNewFilename(file.name, '_watermarked'),
      pageCount: totalPages
    };
  }

  /**
   * Add image watermark to PDF
   */
  async addImageWatermarkToPDF(file, watermarkFile, options = {}, onProgress) {
    const {
      scale = 0.3,
      opacity = 0.5,
      position = 'center'
    } = options;

    onProgress?.(5, 'Loading PDF library...');

    const PDFLib = await this.loadPDFLib();

    onProgress?.(15, 'Loading files...');

    const [pdfBuffer, wmBuffer] = await Promise.all([
      file.arrayBuffer(),
      watermarkFile.arrayBuffer()
    ]);

    const pdfDoc = await PDFLib.PDFDocument.load(pdfBuffer);

    // Embed watermark image
    let wmImage;
    if (watermarkFile.type === 'image/png') {
      wmImage = await pdfDoc.embedPng(wmBuffer);
    } else {
      wmImage = await pdfDoc.embedJpg(wmBuffer);
    }

    const pages = pdfDoc.getPages();
    const totalPages = pages.length;

    for (let i = 0; i < totalPages; i++) {
      const progress = 25 + ((i / totalPages) * 60);
      onProgress?.(Math.round(progress), `Watermarking page ${i + 1}/${totalPages}...`);

      const page = pages[i];
      const { width, height } = page.getSize();

      const wmWidth = width * scale;
      const wmHeight = (wmImage.height / wmImage.width) * wmWidth;

      const pos = this.calculateImagePosition(width, height, wmWidth, wmHeight, position, 0);

      page.drawImage(wmImage, {
        x: pos.x,
        y: height - pos.y - wmHeight, // PDF coords from bottom
        width: wmWidth,
        height: wmHeight,
        opacity
      });
    }

    onProgress?.(90, 'Generating PDF...');

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });

    onProgress?.(100, 'Complete!');

    return {
      blob,
      filename: this.getNewFilename(file.name, '_watermarked'),
      pageCount: totalPages
    };
  }

  /**
   * Add watermark to video using FFmpeg
   */
  async addWatermarkToVideo(file, options = {}, onProgress) {
    const {
      text,
      watermarkImage,
      position = 'bottom-right',
      fontSize = 24,
      fontColor = 'white',
      opacity = 0.7,
      padding = 10
    } = options;

    onProgress?.(5, 'Loading FFmpeg...');

    const ffmpeg = await this.loadFFmpeg(onProgress);

    onProgress?.(15, 'Loading video...');

    const inputData = new Uint8Array(await file.arrayBuffer());
    await ffmpeg.writeFile('input.mp4', inputData);

    let filterComplex;

    if (watermarkImage) {
      // Image watermark
      onProgress?.(20, 'Loading watermark image...');
      const wmData = new Uint8Array(await watermarkImage.arrayBuffer());
      await ffmpeg.writeFile('watermark.png', wmData);

      const posFilter = this.getFFmpegPosition(position, padding);
      filterComplex = `[1:v]format=rgba,colorchannelmixer=aa=${opacity}[wm];[0:v][wm]overlay=${posFilter}`;

      onProgress?.(30, 'Applying watermark...');

      await ffmpeg.exec([
        '-i', 'input.mp4',
        '-i', 'watermark.png',
        '-filter_complex', filterComplex,
        '-c:a', 'copy',
        '-y', 'output.mp4'
      ]);
    } else if (text) {
      // Text watermark
      const posFilter = this.getFFmpegTextPosition(position, padding);
      filterComplex = `drawtext=text='${text}':fontsize=${fontSize}:fontcolor=${fontColor}@${opacity}:${posFilter}`;

      onProgress?.(30, 'Applying watermark...');

      await ffmpeg.exec([
        '-i', 'input.mp4',
        '-vf', filterComplex,
        '-c:a', 'copy',
        '-y', 'output.mp4'
      ]);
    }

    onProgress?.(80, 'Reading output...');

    const outputData = await ffmpeg.readFile('output.mp4');
    const blob = new Blob([outputData], { type: 'video/mp4' });

    // Cleanup
    await ffmpeg.deleteFile('input.mp4');
    await ffmpeg.deleteFile('output.mp4');
    if (watermarkImage) {
      await ffmpeg.deleteFile('watermark.png');
    }

    onProgress?.(100, 'Complete!');

    return {
      blob,
      filename: this.getNewFilename(file.name, '_watermarked')
    };
  }

  /**
   * Batch watermark images
   */
  async batchWatermarkImages(files, options, onProgress) {
    const results = [];
    const totalFiles = files.length;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileProgress = (progress, status) => {
        const overallProgress = ((i / totalFiles) + (progress / 100 / totalFiles)) * 100;
        onProgress?.(Math.round(overallProgress), `Processing ${i + 1}/${totalFiles}: ${file.name}`);
      };

      try {
        let result;
        if (options.watermarkImage) {
          result = await this.addImageWatermarkToImage(file, options.watermarkImage, options, fileProgress);
        } else {
          result = await this.addTextWatermarkToImage(file, options, fileProgress);
        }
        results.push({ filename: file.name, success: true, ...result });
      } catch (error) {
        results.push({ filename: file.name, success: false, error: error.message });
      }
    }

    return results;
  }

  /**
   * Load FFmpeg
   */
  async loadFFmpeg(onProgress) {
    if (this.ffmpegLoaded && this.ffmpeg) {
      return this.ffmpeg;
    }

    const { FFmpeg } = await import('@ffmpeg/ffmpeg');
    const { fetchFile, toBlobURL } = await import('@ffmpeg/util');

    this.ffmpeg = new FFmpeg();

    this.ffmpeg.on('progress', ({ progress }) => {
      const pct = Math.round(30 + progress * 50);
      onProgress?.(pct, 'Processing video...');
    });

    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
    await this.ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm')
    });

    this.ffmpegLoaded = true;
    return this.ffmpeg;
  }

  /**
   * Load pdf-lib
   */
  async loadPDFLib() {
    if (window.PDFLib) return window.PDFLib;

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js';
      script.onload = () => resolve(window.PDFLib);
      script.onerror = () => reject(new Error('Failed to load pdf-lib'));
      document.head.appendChild(script);
    });
  }

  /**
   * Load image from file
   */
  loadImage(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Calculate text position
   */
  calculatePosition(width, height, position, textWidth, fontSize) {
    const padding = 20;
    const positions = {
      'top-left': { x: padding, y: padding + fontSize },
      'top-center': { x: (width - textWidth) / 2, y: padding + fontSize },
      'top-right': { x: width - textWidth - padding, y: padding + fontSize },
      'center-left': { x: padding, y: height / 2 },
      'center': { x: (width - textWidth) / 2, y: height / 2 },
      'center-right': { x: width - textWidth - padding, y: height / 2 },
      'bottom-left': { x: padding, y: height - padding },
      'bottom-center': { x: (width - textWidth) / 2, y: height - padding },
      'bottom-right': { x: width - textWidth - padding, y: height - padding }
    };
    return positions[position] || positions['center'];
  }

  /**
   * Calculate image watermark position
   */
  calculateImagePosition(width, height, wmWidth, wmHeight, position, padding) {
    const positions = {
      'top-left': { x: padding, y: padding },
      'top-center': { x: (width - wmWidth) / 2, y: padding },
      'top-right': { x: width - wmWidth - padding, y: padding },
      'center-left': { x: padding, y: (height - wmHeight) / 2 },
      'center': { x: (width - wmWidth) / 2, y: (height - wmHeight) / 2 },
      'center-right': { x: width - wmWidth - padding, y: (height - wmHeight) / 2 },
      'bottom-left': { x: padding, y: height - wmHeight - padding },
      'bottom-center': { x: (width - wmWidth) / 2, y: height - wmHeight - padding },
      'bottom-right': { x: width - wmWidth - padding, y: height - wmHeight - padding }
    };
    return positions[position] || positions['center'];
  }

  /**
   * Get FFmpeg overlay position
   */
  getFFmpegPosition(position, padding) {
    const positions = {
      'top-left': `${padding}:${padding}`,
      'top-center': `(W-w)/2:${padding}`,
      'top-right': `W-w-${padding}:${padding}`,
      'center-left': `${padding}:(H-h)/2`,
      'center': `(W-w)/2:(H-h)/2`,
      'center-right': `W-w-${padding}:(H-h)/2`,
      'bottom-left': `${padding}:H-h-${padding}`,
      'bottom-center': `(W-w)/2:H-h-${padding}`,
      'bottom-right': `W-w-${padding}:H-h-${padding}`
    };
    return positions[position] || positions['bottom-right'];
  }

  /**
   * Get FFmpeg text position
   */
  getFFmpegTextPosition(position, padding) {
    const positions = {
      'top-left': `x=${padding}:y=${padding}`,
      'top-center': `x=(w-text_w)/2:y=${padding}`,
      'top-right': `x=w-text_w-${padding}:y=${padding}`,
      'center-left': `x=${padding}:y=(h-text_h)/2`,
      'center': `x=(w-text_w)/2:y=(h-text_h)/2`,
      'center-right': `x=w-text_w-${padding}:y=(h-text_h)/2`,
      'bottom-left': `x=${padding}:y=h-text_h-${padding}`,
      'bottom-center': `x=(w-text_w)/2:y=h-text_h-${padding}`,
      'bottom-right': `x=w-text_w-${padding}:y=h-text_h-${padding}`
    };
    return positions[position] || positions['bottom-right'];
  }

  /**
   * Canvas to blob
   */
  canvasToBlob(canvas, type = 'image/png', quality = 0.92) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        blob => blob ? resolve(blob) : reject(new Error('Failed to create blob')),
        type,
        quality
      );
    });
  }

  /**
   * Get new filename
   */
  getNewFilename(originalName, suffix) {
    const parts = originalName.split('.');
    const ext = parts.pop();
    return `${parts.join('.')}${suffix}.${ext}`;
  }
}

// Export singleton
const watermarkProcessor = new WatermarkProcessor();
export default watermarkProcessor;
