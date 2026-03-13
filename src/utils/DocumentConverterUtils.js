/**
 * DocumentConverterUtils - Real document conversion using browser-compatible libraries
 * 
 * Supported conversions:
 * - PDF → TXT (text extraction)
 * - DOCX → HTML, TXT
 * - TXT → PDF, HTML
 * - HTML → PDF, TXT
 * - RTF → TXT, HTML
 * 
 * Libraries used (all installed as npm packages — no CDN loading):
 * - pdf-lib: PDF creation and page manipulation
 * - mammoth: DOCX to HTML/TXT conversion
 * - pdfjs-dist: PDF text extraction (worker served from public/pdf.worker.min.js)
 * - jszip: DOCX/ZIP file creation
 */

class DocumentConverterUtils {
  constructor() {
    this._pdfLib = null;
    this._pdfjs = null;
    this._mammoth = null;
    this._jszip = null;
  }

  // ── Lazy per-library loaders ────────────────────────────────────────────────

  async loadPdfLib() {
    if (!this._pdfLib) {
      this._pdfLib = await import('pdf-lib');
    }
    return this._pdfLib;
  }

  async loadPdfJs() {
    if (!this._pdfjs) {
      const pdfjs = await import('pdfjs-dist/build/pdf');
      // Worker (.mjs) is copied to public/ at build time — pdfjs v4 uses type:"module" worker
      pdfjs.GlobalWorkerOptions.workerSrc =
        (process.env.PUBLIC_URL || '') + '/pdf.worker.min.mjs';
      this._pdfjs = pdfjs;
    }
    return this._pdfjs;
  }

  async loadMammoth() {
    if (!this._mammoth) {
      this._mammoth = await import('mammoth');
    }
    return this._mammoth;
  }

  async loadJSZip() {
    if (!this._jszip) {
      const mod = await import('jszip');
      this._jszip = mod.default || mod;
    }
    return this._jszip;
  }

  /**
   * Main conversion function — loads only the library needed for this conversion
   */
  async convert(file, outputFormat, progressCallback = () => {}) {
    const inputFormat = this.getFileExtension(file.name).toLowerCase();
    progressCallback(10, 'Analyzing document...');

    console.log(`Converting ${inputFormat} to ${outputFormat}`);

    try {
      let result;

      switch (inputFormat) {
        case 'pdf':
          result = await this.convertFromPdf(file, outputFormat, progressCallback);
          break;
        case 'docx':
        case 'doc':
          result = await this.convertFromDocx(file, outputFormat, progressCallback);
          break;
        case 'txt':
          result = await this.convertFromTxt(file, outputFormat, progressCallback);
          break;
        case 'html':
        case 'htm':
          result = await this.convertFromHtml(file, outputFormat, progressCallback);
          break;
        case 'rtf':
          result = await this.convertFromRtf(file, outputFormat, progressCallback);
          break;
        default:
          throw new Error(`Unsupported input format: ${inputFormat}`);
      }

      progressCallback(100, 'Conversion complete!');
      return result;

    } catch (error) {
      console.error('Conversion error:', error);
      throw error;
    }
  }

  /**
   * Convert from PDF to other formats
   */
  async convertFromPdf(file, outputFormat, progressCallback) {
    progressCallback(20, 'Loading PDF...');
    const arrayBuffer = await file.arrayBuffer();

    switch (outputFormat) {
      case 'txt':
        return await this.pdfToText(arrayBuffer, progressCallback);
      case 'html':
        return await this.pdfToHtml(arrayBuffer, progressCallback);
      case 'docx':
        // PDF to DOCX is complex - we extract text and create a simple DOCX
        return await this.pdfToDocx(arrayBuffer, progressCallback);
      default:
        throw new Error(`Cannot convert PDF to ${outputFormat}`);
    }
  }

  /**
   * Extract text from PDF
   */
  async pdfToText(arrayBuffer, progressCallback) {
    progressCallback(30, 'Extracting text from PDF...');
    
    const pdfjs = await this.loadPdfJs();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    const numPages = pdf.numPages;
    let fullText = '';

    for (let i = 1; i <= numPages; i++) {
      progressCallback(30 + Math.floor((i / numPages) * 50), `Processing page ${i} of ${numPages}...`);
      
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      fullText += pageText + '\n\n--- Page ' + i + ' ---\n\n';
    }

    progressCallback(90, 'Creating text file...');
    const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
    return { blob, mimeType: 'text/plain' };
  }

  /**
   * Convert PDF to HTML (text with basic formatting)
   */
  async pdfToHtml(arrayBuffer, progressCallback) {
    progressCallback(30, 'Extracting content from PDF...');
    
    const pdfjs = await this.loadPdfJs();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    const numPages = pdf.numPages;
    let htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Converted Document</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
    .page { margin-bottom: 30px; padding-bottom: 30px; border-bottom: 1px solid #ccc; }
    .page-number { color: #666; font-size: 12px; text-align: center; }
    p { margin: 10px 0; }
  </style>
</head>
<body>
`;

    for (let i = 1; i <= numPages; i++) {
      progressCallback(30 + Math.floor((i / numPages) * 50), `Processing page ${i} of ${numPages}...`);
      
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      
      htmlContent += `<div class="page">
  <p>${this.escapeHtml(pageText).replace(/\n/g, '</p><p>')}</p>
  <div class="page-number">Page ${i}</div>
</div>\n`;
    }

    htmlContent += '</body>\n</html>';

    progressCallback(90, 'Creating HTML file...');
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    return { blob, mimeType: 'text/html' };
  }

  /**
   * Convert PDF to DOCX (simplified - creates a basic Word document)
   */
  async pdfToDocx(arrayBuffer, progressCallback) {
    progressCallback(30, 'Extracting text from PDF...');
    
    // First extract text
    const pdfjs = await this.loadPdfJs();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    const numPages = pdf.numPages;
    let fullText = '';

    for (let i = 1; i <= numPages; i++) {
      progressCallback(30 + Math.floor((i / numPages) * 40), `Processing page ${i} of ${numPages}...`);
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      fullText += textContent.items.map(item => item.str).join(' ') + '\n\n';
    }

    progressCallback(80, 'Creating Word document...');
    
    // Create a simple DOCX using the XML structure
    const docxContent = await this.createSimpleDocx(fullText);
    
    progressCallback(90, 'Finalizing document...');
    return { blob: docxContent, mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
  }

  /**
   * Convert DOCX to other formats using Mammoth
   */
  async convertFromDocx(file, outputFormat, progressCallback) {
    progressCallback(20, 'Reading Word document...');
    const arrayBuffer = await file.arrayBuffer();

    switch (outputFormat) {
      case 'html':
        return await this.docxToHtml(arrayBuffer, progressCallback);
      case 'txt':
        return await this.docxToText(arrayBuffer, progressCallback);
      case 'pdf':
        return await this.docxToPdf(arrayBuffer, progressCallback);
      default:
        throw new Error(`Cannot convert DOCX to ${outputFormat}`);
    }
  }

  /**
   * DOCX to HTML using Mammoth
   */
  async docxToHtml(arrayBuffer, progressCallback) {
    progressCallback(40, 'Converting to HTML...');
    
    const mammoth = await this.loadMammoth();
    const result = await mammoth.convertToHtml({ arrayBuffer });
    
    if (result.messages.length > 0) {
      console.log('Mammoth conversion messages:', result.messages);
    }

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Converted Document</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
    h1 { color: #333; }
    h2 { color: #444; }
    p { margin: 10px 0; }
    table { border-collapse: collapse; width: 100%; }
    td, th { border: 1px solid #ddd; padding: 8px; }
  </style>
</head>
<body>
${result.value}
</body>
</html>`;

    progressCallback(90, 'Creating HTML file...');
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    return { blob, mimeType: 'text/html' };
  }

  /**
   * DOCX to plain text using Mammoth
   */
  async docxToText(arrayBuffer, progressCallback) {
    progressCallback(40, 'Extracting text...');
    
    const mammoth = await this.loadMammoth();
    const result = await mammoth.extractRawText({ arrayBuffer });
    
    progressCallback(90, 'Creating text file...');
    const blob = new Blob([result.value], { type: 'text/plain;charset=utf-8' });
    return { blob, mimeType: 'text/plain' };
  }

  /**
   * DOCX to PDF
   */
  async docxToPdf(arrayBuffer, progressCallback) {
    progressCallback(30, 'Converting Word to HTML...');
    
    // First convert to HTML
    const mammoth = await this.loadMammoth();
    const result = await mammoth.convertToHtml({ arrayBuffer });
    
    progressCallback(50, 'Creating PDF...');
    
    // Then create PDF from HTML content
    return await this.htmlContentToPdf(result.value, progressCallback);
  }

  /**
   * Convert TXT to other formats
   */
  async convertFromTxt(file, outputFormat, progressCallback) {
    progressCallback(20, 'Reading text file...');
    const text = await file.text();

    switch (outputFormat) {
      case 'pdf':
        return await this.textToPdf(text, progressCallback);
      case 'html':
        return await this.textToHtml(text, progressCallback);
      case 'docx':
        return await this.createSimpleDocx(text);
      default:
        throw new Error(`Cannot convert TXT to ${outputFormat}`);
    }
  }

  /**
   * Convert text to PDF using pdf-lib
   */
  async textToPdf(text, progressCallback) {
    progressCallback(40, 'Creating PDF document...');

    // Normalize line endings — pdf-lib WinAnsi cannot encode \r (0x000d)
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    // Strip any remaining non-WinAnsi control characters (keep tab, newline)
    text = text.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '');

    const { PDFDocument, StandardFonts, rgb } = await this.loadPdfLib();
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    
    const fontSize = 12;
    const lineHeight = fontSize * 1.2;
    const margin = 50;
    const pageWidth = 612; // Letter size
    const pageHeight = 792;
    const maxLineWidth = pageWidth - (margin * 2);
    
    // Split text into lines
    const lines = this.wrapText(text, font, fontSize, maxLineWidth);
    const linesPerPage = Math.floor((pageHeight - margin * 2) / lineHeight);
    
    let currentPage = null;
    let yPosition = pageHeight - margin;
    let lineCount = 0;
    
    progressCallback(50, 'Adding text to PDF...');

    for (let i = 0; i < lines.length; i++) {
      if (lineCount % linesPerPage === 0) {
        currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
        yPosition = pageHeight - margin;
        lineCount = 0;
      }
      
      currentPage.drawText(lines[i], {
        x: margin,
        y: yPosition,
        size: fontSize,
        font: font,
        color: rgb(0, 0, 0),
      });
      
      yPosition -= lineHeight;
      lineCount++;
      
      if (i % 100 === 0) {
        progressCallback(50 + Math.floor((i / lines.length) * 40), `Processing line ${i} of ${lines.length}...`);
      }
    }

    progressCallback(90, 'Saving PDF...');
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    return { blob, mimeType: 'application/pdf' };
  }

  /**
   * Convert text to HTML
   */
  async textToHtml(text, progressCallback) {
    progressCallback(40, 'Converting to HTML...');
    
    const paragraphs = text.split(/\n\n+/).filter(p => p.trim());
    const htmlParagraphs = paragraphs.map(p => 
      `<p>${this.escapeHtml(p).replace(/\n/g, '<br>')}</p>`
    ).join('\n');

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Converted Document</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
    p { margin: 15px 0; }
  </style>
</head>
<body>
${htmlParagraphs}
</body>
</html>`;

    progressCallback(90, 'Creating HTML file...');
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    return { blob, mimeType: 'text/html' };
  }

  /**
   * Convert HTML to other formats
   */
  async convertFromHtml(file, outputFormat, progressCallback) {
    progressCallback(20, 'Reading HTML file...');
    const htmlContent = await file.text();

    switch (outputFormat) {
      case 'pdf':
        return await this.htmlContentToPdf(htmlContent, progressCallback);
      case 'txt':
        return await this.htmlToText(htmlContent, progressCallback);
      case 'docx':
        const textContent = this.stripHtml(htmlContent);
        return await this.createSimpleDocx(textContent);
      default:
        throw new Error(`Cannot convert HTML to ${outputFormat}`);
    }
  }

  /**
   * Convert HTML content to PDF
   */
  async htmlContentToPdf(htmlContent, progressCallback) {
    progressCallback(60, 'Creating PDF from HTML...');
    
    // Extract text content from HTML and create PDF
    const textContent = this.stripHtml(htmlContent);
    return await this.textToPdf(textContent, progressCallback);
  }

  /**
   * Convert HTML to plain text
   */
  async htmlToText(htmlContent, progressCallback) {
    progressCallback(40, 'Extracting text from HTML...');
    
    const textContent = this.stripHtml(htmlContent);
    
    progressCallback(90, 'Creating text file...');
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    return { blob, mimeType: 'text/plain' };
  }

  /**
   * Convert RTF to other formats
   */
  async convertFromRtf(file, outputFormat, progressCallback) {
    progressCallback(20, 'Reading RTF file...');
    const rtfContent = await file.text();
    
    // Basic RTF to text conversion (strips RTF codes)
    const textContent = this.stripRtf(rtfContent);

    switch (outputFormat) {
      case 'txt':
        progressCallback(90, 'Creating text file...');
        const txtBlob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
        return { blob: txtBlob, mimeType: 'text/plain' };
      case 'html':
        return await this.textToHtml(textContent, progressCallback);
      case 'pdf':
        return await this.textToPdf(textContent, progressCallback);
      case 'docx':
        return await this.createSimpleDocx(textContent);
      default:
        throw new Error(`Cannot convert RTF to ${outputFormat}`);
    }
  }

  /**
   * Create a simple DOCX file from text
   */
  async createSimpleDocx(text) {
    // Create a minimal DOCX file structure
    const JSZip = await this.loadJSZip();
    const zip = new JSZip();

    // Add required DOCX structure
    zip.file('[Content_Types].xml', this.getContentTypesXml());
    zip.folder('_rels').file('.rels', this.getRelsXml());
    zip.folder('word').file('document.xml', this.getDocumentXml(text));
    zip.folder('word/_rels').file('document.xml.rels', this.getDocumentRelsXml());

    const blob = await zip.generateAsync({ 
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    });
    
    return { blob, mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
  }

  /**
   * Load JSZip for DOCX creation
   */
  // loadJSZip is now defined above as a proper lazy npm import loader

  // DOCX XML templates
  getContentTypesXml() {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;
  }

  getRelsXml() {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;
  }

  getDocumentXml(text) {
    const paragraphs = text.split(/\n/).map(line => {
      const escapedText = this.escapeXml(line);
      return `<w:p><w:r><w:t>${escapedText}</w:t></w:r></w:p>`;
    }).join('\n');

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${paragraphs}
  </w:body>
</w:document>`;
  }

  getDocumentRelsXml() {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>`;
  }

  // Utility functions
  getFileExtension(filename) {
    return filename.split('.').pop() || '';
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  escapeXml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  stripHtml(html) {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || '';
  }

  stripRtf(rtf) {
    // Basic RTF stripping
    return rtf
      .replace(/\\par[d]?/g, '\n')
      .replace(/\{\*?\\[^{}]+}|[{}]|\\[A-Za-z]+\n?(?:-?\d+)?[ ]?/g, '')
      .replace(/\\'[0-9a-f]{2}/gi, '')
      .trim();
  }

  wrapText(text, font, fontSize, maxWidth) {
    const lines = [];
    const paragraphs = text.split('\n');
    
    for (const paragraph of paragraphs) {
      if (!paragraph.trim()) {
        lines.push('');
        continue;
      }
      
      const words = paragraph.split(' ');
      let currentLine = '';
      
      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const width = font.widthOfTextAtSize(testLine, fontSize);
        
        if (width > maxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      
      if (currentLine) {
        lines.push(currentLine);
      }
    }
    
    return lines;
  }

  /**
   * Get supported conversion options
   */
  getSupportedConversions() {
    return {
      pdf: ['txt', 'html', 'docx'],
      docx: ['pdf', 'html', 'txt'],
      doc: ['pdf', 'html', 'txt'],
      txt: ['pdf', 'html', 'docx'],
      html: ['pdf', 'txt', 'docx'],
      htm: ['pdf', 'txt', 'docx'],
      rtf: ['pdf', 'txt', 'html', 'docx']
    };
  }

  /**
   * Check if conversion is supported
   */
  isConversionSupported(inputFormat, outputFormat) {
    const supported = this.getSupportedConversions();
    const inputExt = inputFormat.toLowerCase().replace('.', '');
    return supported[inputExt]?.includes(outputFormat.toLowerCase());
  }
}

// Export singleton instance
const documentConverter = new DocumentConverterUtils();
export default documentConverter;
