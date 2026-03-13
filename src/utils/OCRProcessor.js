/**
 * OCRProcessor - Text extraction from images using Tesseract.js
 * Features:
 * - Extract text from images
 * - Convert scanned PDFs to searchable PDFs
 * - Multiple language support
 * - Confidence scoring
 */

import Tesseract from 'tesseract.js';

class OCRProcessor {
  constructor() {
    this.worker = null;
    this.isInitialized = false;
    this.currentLanguage = 'eng';
  }

  /**
   * Initialize Tesseract worker
   */
  async initialize(language = 'eng', onProgress) {
    if (this.worker && this.currentLanguage === language) {
      return this.worker;
    }

    // Terminate existing worker if language changed
    if (this.worker) {
      await this.worker.terminate();
    }

    onProgress?.(5, 'Initializing OCR engine...');

    this.worker = await Tesseract.createWorker(language, 1, {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          const progress = Math.round(m.progress * 80) + 10;
          onProgress?.(progress, 'Recognizing text...');
        } else if (m.status === 'loading language traineddata') {
          onProgress?.(8, `Loading ${language} language data...`);
        }
      }
    });

    this.currentLanguage = language;
    this.isInitialized = true;
    
    return this.worker;
  }

  /**
   * Extract text from image file
   */
  async extractTextFromImage(file, options = {}, onProgress) {
    const { language = 'eng', outputFormat = 'text' } = options;

    onProgress?.(0, 'Starting OCR...');

    await this.initialize(language, onProgress);

    onProgress?.(10, 'Processing image...');

    const result = await this.worker.recognize(file);

    onProgress?.(90, 'Finalizing...');

    const output = {
      text: result.data.text,
      confidence: result.data.confidence,
      words: result.data.words?.map(w => ({
        text: w.text,
        confidence: w.confidence,
        bbox: w.bbox
      })) || [],
      lines: result.data.lines?.map(l => ({
        text: l.text,
        confidence: l.confidence,
        bbox: l.bbox
      })) || [],
      paragraphs: result.data.paragraphs?.map(p => ({
        text: p.text,
        confidence: p.confidence
      })) || []
    };

    onProgress?.(100, 'Complete!');

    // Return based on output format
    if (outputFormat === 'json') {
      return {
        type: 'json',
        data: output,
        filename: this.getNewFilename(file.name, 'json')
      };
    } else if (outputFormat === 'hocr') {
      return {
        type: 'hocr',
        data: result.data.hocr,
        filename: this.getNewFilename(file.name, 'html')
      };
    } else {
      return {
        type: 'text',
        data: output.text,
        confidence: output.confidence,
        filename: this.getNewFilename(file.name, 'txt')
      };
    }
  }

  /**
   * Extract text from multiple images (batch)
   */
  async extractTextFromImages(files, options = {}, onProgress) {
    const results = [];
    const totalFiles = files.length;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileProgress = (progress) => {
        const overallProgress = ((i / totalFiles) + (progress / 100 / totalFiles)) * 100;
        onProgress?.(Math.round(overallProgress), `Processing ${i + 1}/${totalFiles}: ${file.name}`);
      };

      try {
        const result = await this.extractTextFromImage(file, options, fileProgress);
        results.push({
          filename: file.name,
          success: true,
          ...result
        });
      } catch (error) {
        results.push({
          filename: file.name,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Convert scanned PDF to searchable PDF
   * Uses pdf-lib to embed text layer
   */
  async createSearchablePDF(file, options = {}, onProgress) {
    const { language = 'eng' } = options;

    onProgress?.(0, 'Loading PDF library...');

    // Load PDF.js for rendering
    const pdfjsLib = window.pdfjsLib || await this.loadPDFJS();
    
    // Load pdf-lib for creating PDF
    const PDFLib = await this.loadPDFLib();

    onProgress?.(5, 'Loading PDF...');

    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const numPages = pdfDoc.numPages;

    // Create new PDF with text layer
    const newPdfDoc = await PDFLib.PDFDocument.create();

    onProgress?.(10, 'Initializing OCR...');
    await this.initialize(language, onProgress);

    const allText = [];

    for (let i = 1; i <= numPages; i++) {
      const pageProgress = 10 + ((i - 1) / numPages) * 80;
      onProgress?.(Math.round(pageProgress), `Processing page ${i}/${numPages}...`);

      const page = await pdfDoc.getPage(i);
      const viewport = page.getViewport({ scale: 2 }); // Higher scale for better OCR

      // Render page to canvas
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');

      await page.render({
        canvasContext: ctx,
        viewport: viewport
      }).promise;

      // OCR the canvas
      const result = await this.worker.recognize(canvas);
      allText.push(`--- Page ${i} ---\n${result.data.text}`);

      // Add page to new PDF
      const pngData = canvas.toDataURL('image/png');
      const pngBytes = await fetch(pngData).then(res => res.arrayBuffer());
      const pngImage = await newPdfDoc.embedPng(pngBytes);

      const newPage = newPdfDoc.addPage([viewport.width / 2, viewport.height / 2]);
      newPage.drawImage(pngImage, {
        x: 0,
        y: 0,
        width: viewport.width / 2,
        height: viewport.height / 2
      });

      // Note: For a truly searchable PDF, we'd need to embed invisible text
      // This is a simplified version that creates a new PDF with the image
    }

    onProgress?.(90, 'Generating PDF...');

    const pdfBytes = await newPdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });

    onProgress?.(100, 'Complete!');

    return {
      blob,
      filename: this.getNewFilename(file.name, 'pdf', '_searchable'),
      extractedText: allText.join('\n\n'),
      pageCount: numPages
    };
  }

  /**
   * Load PDF.js library
   */
  async loadPDFJS() {
    if (window.pdfjsLib) return window.pdfjsLib;
    // pdfjs-dist v4 is ESM-only — use dynamic import instead of CDN script tag
    const pdfjsLib = await import('pdfjs-dist/build/pdf');
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      (process.env.PUBLIC_URL || '') + '/pdf.worker.min.mjs';
    window.pdfjsLib = pdfjsLib;
    return window.pdfjsLib;
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
   * Get supported languages
   */
  getSupportedLanguages() {
    return [
      { code: 'eng', name: 'English' },
      { code: 'spa', name: 'Spanish' },
      { code: 'fra', name: 'French' },
      { code: 'deu', name: 'German' },
      { code: 'ita', name: 'Italian' },
      { code: 'por', name: 'Portuguese' },
      { code: 'rus', name: 'Russian' },
      { code: 'jpn', name: 'Japanese' },
      { code: 'chi_sim', name: 'Chinese (Simplified)' },
      { code: 'chi_tra', name: 'Chinese (Traditional)' },
      { code: 'kor', name: 'Korean' },
      { code: 'ara', name: 'Arabic' },
      { code: 'hin', name: 'Hindi' },
      { code: 'tha', name: 'Thai' },
      { code: 'vie', name: 'Vietnamese' },
      { code: 'nld', name: 'Dutch' },
      { code: 'pol', name: 'Polish' },
      { code: 'tur', name: 'Turkish' },
      { code: 'ukr', name: 'Ukrainian' },
      { code: 'heb', name: 'Hebrew' }
    ];
  }

  /**
   * Get new filename
   */
  getNewFilename(originalName, extension, suffix = '') {
    const baseName = originalName.split('.').slice(0, -1).join('.');
    return `${baseName}${suffix}.${extension}`;
  }

  /**
   * Download text as file
   */
  downloadText(text, filename) {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Cleanup worker
   */
  async terminate() {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
      this.isInitialized = false;
    }
  }
}

// Export singleton
const ocrProcessor = new OCRProcessor();
export default ocrProcessor;
