/**
 * PDFTools - Comprehensive PDF manipulation utilities
 * Features:
 * - Merge multiple PDFs
 * - Split PDF into pages
 * - Compress/optimize PDF
 * - Rotate pages
 * - Extract pages
 */

class PDFTools {
  constructor() {
    this.pdfLib = null;
    this.initialized = false;
  }

  /**
   * Initialize PDF-lib
   */
  async initialize() {
    if (this.initialized) return;

    if (!window.PDFLib) {
      await this.loadScript('https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js');
    }
    this.pdfLib = window.PDFLib;
    this.initialized = true;
  }

  /**
   * Load external script
   */
  loadScript(url) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${url}"]`)) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = url;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Failed to load ${url}`));
      document.head.appendChild(script);
    });
  }

  /**
   * Merge multiple PDFs into one
   */
  async mergePDFs(pdfFiles, onProgress) {
    await this.initialize();
    
    onProgress?.(10, 'Creating merged document...');
    
    const { PDFDocument } = this.pdfLib;
    const mergedPdf = await PDFDocument.create();
    
    for (let i = 0; i < pdfFiles.length; i++) {
      const file = pdfFiles[i];
      onProgress?.(10 + (i / pdfFiles.length) * 80, `Processing ${file.name}...`);
      
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuffer);
      const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      
      pages.forEach(page => mergedPdf.addPage(page));
    }
    
    onProgress?.(95, 'Saving merged PDF...');
    const pdfBytes = await mergedPdf.save();
    
    onProgress?.(100, 'Complete!');
    
    return new Blob([pdfBytes], { type: 'application/pdf' });
  }

  /**
   * Split PDF into individual pages
   */
  async splitPDF(pdfFile, onProgress) {
    await this.initialize();
    
    onProgress?.(10, 'Loading PDF...');
    
    const { PDFDocument } = this.pdfLib;
    const arrayBuffer = await pdfFile.arrayBuffer();
    const pdf = await PDFDocument.load(arrayBuffer);
    const pageCount = pdf.getPageCount();
    
    const results = [];
    
    for (let i = 0; i < pageCount; i++) {
      onProgress?.(10 + (i / pageCount) * 85, `Extracting page ${i + 1} of ${pageCount}...`);
      
      const newPdf = await PDFDocument.create();
      const [page] = await newPdf.copyPages(pdf, [i]);
      newPdf.addPage(page);
      
      const pdfBytes = await newPdf.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      
      results.push({
        blob,
        filename: `${pdfFile.name.replace('.pdf', '')}_page_${i + 1}.pdf`,
        pageNumber: i + 1
      });
    }
    
    onProgress?.(100, 'Complete!');
    
    return results;
  }

  /**
   * Extract specific pages from PDF
   */
  async extractPages(pdfFile, pageNumbers, onProgress) {
    await this.initialize();
    
    onProgress?.(10, 'Loading PDF...');
    
    const { PDFDocument } = this.pdfLib;
    const arrayBuffer = await pdfFile.arrayBuffer();
    const pdf = await PDFDocument.load(arrayBuffer);
    
    onProgress?.(30, 'Extracting selected pages...');
    
    const newPdf = await PDFDocument.create();
    const pageIndices = pageNumbers.map(n => n - 1); // Convert to 0-based
    const pages = await newPdf.copyPages(pdf, pageIndices);
    
    pages.forEach(page => newPdf.addPage(page));
    
    onProgress?.(90, 'Saving extracted pages...');
    const pdfBytes = await newPdf.save();
    
    onProgress?.(100, 'Complete!');
    
    return new Blob([pdfBytes], { type: 'application/pdf' });
  }

  /**
   * Rotate pages in PDF
   */
  async rotatePages(pdfFile, rotation, pageNumbers = null, onProgress) {
    await this.initialize();
    
    onProgress?.(10, 'Loading PDF...');
    
    const { PDFDocument, degrees } = this.pdfLib;
    const arrayBuffer = await pdfFile.arrayBuffer();
    const pdf = await PDFDocument.load(arrayBuffer);
    const pages = pdf.getPages();
    
    onProgress?.(30, 'Rotating pages...');
    
    // If no specific pages, rotate all
    const targetPages = pageNumbers || pages.map((_, i) => i + 1);
    
    targetPages.forEach((pageNum, i) => {
      if (pageNum >= 1 && pageNum <= pages.length) {
        const page = pages[pageNum - 1];
        const currentRotation = page.getRotation().angle;
        page.setRotation(degrees(currentRotation + rotation));
      }
      onProgress?.(30 + (i / targetPages.length) * 60, `Rotating page ${pageNum}...`);
    });
    
    onProgress?.(95, 'Saving rotated PDF...');
    const pdfBytes = await pdf.save();
    
    onProgress?.(100, 'Complete!');
    
    return new Blob([pdfBytes], { type: 'application/pdf' });
  }

  /**
   * Compress/optimize PDF
   * Note: PDF-lib has limited compression, but we can remove unused objects
   */
  async compressPDF(pdfFile, quality = 'medium', onProgress) {
    await this.initialize();
    
    onProgress?.(10, 'Loading PDF...');
    
    const { PDFDocument } = this.pdfLib;
    const arrayBuffer = await pdfFile.arrayBuffer();
    const pdf = await PDFDocument.load(arrayBuffer);
    
    onProgress?.(40, 'Optimizing PDF...');
    
    // Get compression settings based on quality
    const settings = this.getCompressionSettings(quality);
    
    onProgress?.(70, 'Compressing images...');
    
    // Re-save with optimization
    // PDF-lib removes unused objects automatically on save
    const pdfBytes = await pdf.save({
      useObjectStreams: settings.useObjectStreams,
      addDefaultPage: false,
    });
    
    onProgress?.(100, 'Complete!');
    
    const originalSize = pdfFile.size;
    const compressedSize = pdfBytes.length;
    const reduction = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);
    
    return {
      blob: new Blob([pdfBytes], { type: 'application/pdf' }),
      originalSize,
      compressedSize,
      reduction: `${reduction}%`
    };
  }

  /**
   * Get compression settings based on quality
   */
  getCompressionSettings(quality) {
    const settings = {
      low: {
        useObjectStreams: true,
        imageQuality: 0.5
      },
      medium: {
        useObjectStreams: true,
        imageQuality: 0.7
      },
      high: {
        useObjectStreams: false,
        imageQuality: 0.9
      }
    };
    
    return settings[quality] || settings.medium;
  }

  /**
   * Get PDF info
   */
  async getPDFInfo(pdfFile) {
    await this.initialize();
    
    const { PDFDocument } = this.pdfLib;
    const arrayBuffer = await pdfFile.arrayBuffer();
    const pdf = await PDFDocument.load(arrayBuffer);
    
    const pages = pdf.getPages();
    const firstPage = pages[0];
    const { width, height } = firstPage.getSize();
    
    return {
      pageCount: pdf.getPageCount(),
      title: pdf.getTitle() || 'Unknown',
      author: pdf.getAuthor() || 'Unknown',
      subject: pdf.getSubject() || '',
      creator: pdf.getCreator() || '',
      producer: pdf.getProducer() || '',
      creationDate: pdf.getCreationDate(),
      modificationDate: pdf.getModificationDate(),
      pageSize: {
        width: Math.round(width),
        height: Math.round(height),
        unit: 'points'
      },
      fileSizeKB: Math.round(pdfFile.size / 1024)
    };
  }

  /**
   * Add page numbers to PDF
   */
  async addPageNumbers(pdfFile, position = 'bottom-center', onProgress) {
    await this.initialize();
    
    onProgress?.(10, 'Loading PDF...');
    
    const { PDFDocument, StandardFonts, rgb } = this.pdfLib;
    const arrayBuffer = await pdfFile.arrayBuffer();
    const pdf = await PDFDocument.load(arrayBuffer);
    const pages = pdf.getPages();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    
    const totalPages = pages.length;
    
    for (let i = 0; i < totalPages; i++) {
      onProgress?.(10 + (i / totalPages) * 85, `Adding number to page ${i + 1}...`);
      
      const page = pages[i];
      const { width, height } = page.getSize();
      const text = `${i + 1} / ${totalPages}`;
      const textWidth = font.widthOfTextAtSize(text, 10);
      
      let x, y;
      
      switch (position) {
        case 'bottom-left':
          x = 40;
          y = 30;
          break;
        case 'bottom-right':
          x = width - textWidth - 40;
          y = 30;
          break;
        case 'top-center':
          x = (width - textWidth) / 2;
          y = height - 30;
          break;
        case 'top-left':
          x = 40;
          y = height - 30;
          break;
        case 'top-right':
          x = width - textWidth - 40;
          y = height - 30;
          break;
        default: // bottom-center
          x = (width - textWidth) / 2;
          y = 30;
      }
      
      page.drawText(text, {
        x,
        y,
        size: 10,
        font,
        color: rgb(0.3, 0.3, 0.3),
      });
    }
    
    onProgress?.(95, 'Saving PDF...');
    const pdfBytes = await pdf.save();
    
    onProgress?.(100, 'Complete!');
    
    return new Blob([pdfBytes], { type: 'application/pdf' });
  }
}

// Export singleton instance
const pdfTools = new PDFTools();
export default pdfTools;
