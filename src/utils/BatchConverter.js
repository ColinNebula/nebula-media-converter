/**
 * BatchConverter - Handle multiple file conversions with queue system
 * Features:
 * - Multi-file selection
 * - Conversion queue with priority
 * - Progress tracking per file
 * - ZIP download of all results
 */

class BatchConverter {
  constructor() {
    this.queue = [];
    this.results = [];
    this.isProcessing = false;
    this.currentIndex = 0;
    this.onProgressCallback = null;
    this.onFileCompleteCallback = null;
    this.onAllCompleteCallback = null;
  }

  /**
   * Add files to the conversion queue
   */
  addFiles(files, outputFormat, converter) {
    const newItems = files.map((file, index) => ({
      id: `${Date.now()}-${index}`,
      file,
      outputFormat,
      converter,
      status: 'pending', // pending, processing, completed, error
      progress: 0,
      result: null,
      error: null
    }));
    
    this.queue.push(...newItems);
    return newItems;
  }

  /**
   * Remove a file from the queue
   */
  removeFile(id) {
    const index = this.queue.findIndex(item => item.id === id);
    if (index !== -1 && this.queue[index].status === 'pending') {
      this.queue.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Clear all pending items from queue
   */
  clearPending() {
    this.queue = this.queue.filter(item => 
      item.status !== 'pending'
    );
  }

  /**
   * Start processing the queue
   */
  async processQueue(onProgress, onFileComplete, onAllComplete) {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    this.onProgressCallback = onProgress;
    this.onFileCompleteCallback = onFileComplete;
    this.onAllCompleteCallback = onAllComplete;
    this.results = [];

    const pendingItems = this.queue.filter(item => item.status === 'pending');
    
    for (let i = 0; i < pendingItems.length; i++) {
      const item = pendingItems[i];
      this.currentIndex = i;
      
      try {
        item.status = 'processing';
        this.notifyProgress(i, pendingItems.length, item, 0, 'Starting...');
        
        // Perform the conversion
        const result = await item.converter.convert(
          item.file,
          item.outputFormat,
          (percent, message) => {
            item.progress = percent;
            this.notifyProgress(i, pendingItems.length, item, percent, message);
          }
        );
        
        item.status = 'completed';
        item.result = result;
        item.progress = 100;
        this.results.push({
          id: item.id,
          filename: result.filename,
          blob: result.blob,
          originalName: item.file.name
        });
        
        onFileComplete?.(item, i, pendingItems.length);
        
      } catch (error) {
        item.status = 'error';
        item.error = error.message;
        onFileComplete?.(item, i, pendingItems.length);
      }
    }

    this.isProcessing = false;
    onAllComplete?.(this.results);
    
    return this.results;
  }

  /**
   * Notify progress update
   */
  notifyProgress(fileIndex, totalFiles, item, percent, message) {
    const overallProgress = ((fileIndex + (percent / 100)) / totalFiles) * 100;
    
    this.onProgressCallback?.({
      currentFile: fileIndex + 1,
      totalFiles,
      fileName: item.file.name,
      fileProgress: percent,
      overallProgress,
      message
    });
  }

  /**
   * Get queue status
   */
  getStatus() {
    return {
      total: this.queue.length,
      pending: this.queue.filter(i => i.status === 'pending').length,
      processing: this.queue.filter(i => i.status === 'processing').length,
      completed: this.queue.filter(i => i.status === 'completed').length,
      errors: this.queue.filter(i => i.status === 'error').length,
      isProcessing: this.isProcessing
    };
  }

  /**
   * Create ZIP file from all results
   */
  async createZip(results) {
    // Load JSZip
    if (!window.JSZip) {
      await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');
    }
    
    const zip = new window.JSZip();
    
    // Add each file to the ZIP
    for (const result of results) {
      const arrayBuffer = await result.blob.arrayBuffer();
      zip.file(result.filename, arrayBuffer);
    }
    
    // Generate the ZIP file
    const zipBlob = await zip.generateAsync({ 
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });
    
    return zipBlob;
  }

  /**
   * Download ZIP file
   */
  async downloadAsZip(results, zipName = 'converted-files.zip') {
    const zipBlob = await this.createZip(results);
    
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = zipName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    return zipBlob;
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
   * Reset the converter
   */
  reset() {
    this.queue = [];
    this.results = [];
    this.isProcessing = false;
    this.currentIndex = 0;
  }
}

// Export singleton instance
const batchConverter = new BatchConverter();
export default batchConverter;
