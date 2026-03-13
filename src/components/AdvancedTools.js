import React, { useState, useRef } from 'react';
import batchConverter from '../utils/BatchConverter';
import pdfTools from '../utils/PDFTools';
import videoCompressor from '../utils/VideoCompressor';
import imageProcessor from '../utils/ImageProcessor';
import ocrProcessor from '../utils/OCRProcessor';
import watermarkProcessor from '../utils/WatermarkProcessor';
import audioProcessor from '../utils/AudioProcessor';
import gifCreator from '../utils/GIFCreator';
import imageSequenceConverter from '../utils/ImageSequenceConverter';
import MediaConverter from '../utils/MediaConverter';
import './AdvancedTools.css';

const AdvancedTools = () => {
  const [activeTab, setActiveTab] = useState('batch');
  const [files, setFiles] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ overall: 0, message: '' });
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);
  
  // Refs for file inputs
  const batchInputRef = useRef(null);
  const pdfInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const ocrInputRef = useRef(null);
  const watermarkInputRef = useRef(null);
  const watermarkImageRef = useRef(null);
  const audioInputRef = useRef(null);
  const gifInputRef = useRef(null);
  const gifImagesRef = useRef(null);
  const seqImagesRef = useRef(null);
  const seqVideoRef = useRef(null);

  // Batch conversion state
  const [batchFormat, setBatchFormat] = useState('mp3');
  
  // PDF tools state
  const [pdfOperation, setPdfOperation] = useState('merge');
  const [pdfRotation, setPdfRotation] = useState(90);
  const [pdfCompressQuality, setPdfCompressQuality] = useState('medium');
  
  // Video compression state
  const [videoPreset, setVideoPreset] = useState('medium');
  
  // Image processing state
  const [imageOperation, setImageOperation] = useState('resize');
  const [resizeWidth, setResizeWidth] = useState(800);
  const [resizeHeight, setResizeHeight] = useState(600);
  const [imageQuality, setImageQuality] = useState(80);
  const [rotationDegrees, setRotationDegrees] = useState(90);

  // OCR state
  const [ocrLanguage, setOcrLanguage] = useState('eng');
  const [ocrOutputFormat, setOcrOutputFormat] = useState('text');

  // Watermark state
  const [watermarkType, setWatermarkType] = useState('text');
  const [watermarkText, setWatermarkText] = useState('WATERMARK');
  const [watermarkPosition, setWatermarkPosition] = useState('center');
  const [watermarkOpacity, setWatermarkOpacity] = useState(50);
  const [watermarkImage, setWatermarkImage] = useState(null);
  const [watermarkRepeat, setWatermarkRepeat] = useState(false);

  // Audio state
  const [audioOperation, setAudioOperation] = useState('extract');
  const [audioBitrate, setAudioBitrate] = useState('192k');
  const [audioFormat, setAudioFormat] = useState('mp3');
  const [audioTrimStart, setAudioTrimStart] = useState(0);
  const [audioTrimEnd, setAudioTrimEnd] = useState(30);
  const [audioVolume, setAudioVolume] = useState(100);

  // Image sequence state
  const [seqMode, setSeqMode] = useState('import');       // 'import' | 'export'
  const [seqVideoFormat, setSeqVideoFormat] = useState('mp4');
  const [seqImageFormat, setSeqImageFormat] = useState('png');
  const [seqFps, setSeqFps] = useState(24);
  const [seqWidth, setSeqWidth] = useState(-1);
  const [seqQuality, setSeqQuality] = useState('medium');
  const [seqExtractFps, setSeqExtractFps] = useState('source');
  const [seqMaxFrames, setSeqMaxFrames] = useState(300);

  // GIF state
  const [gifOperation, setGifOperation] = useState('video');
  const [gifFps, setGifFps] = useState(10);
  const [gifWidth, setGifWidth] = useState(480);
  const [gifDuration, setGifDuration] = useState(5);
  const [gifQuality, setGifQuality] = useState('medium');
  const [gifSpeed, setGifSpeed] = useState(1.0);

  const handleFilesSelect = (e, type) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(selectedFiles);
    setResults([]);
    setError(null);
  };

  const handleWatermarkImageSelect = (e) => {
    if (e.target.files[0]) {
      setWatermarkImage(e.target.files[0]);
    }
  };

  const clearFiles = () => {
    setFiles([]);
    setResults([]);
    setError(null);
    setProgress({ overall: 0, message: '' });
    setWatermarkImage(null);
  };

  // ============ BATCH CONVERSION ============
  const handleBatchConvert = async () => {
    if (files.length === 0) return;
    
    setProcessing(true);
    setError(null);
    setResults([]);
    
    try {
      const converter = new MediaConverter();
      batchConverter.reset();
      batchConverter.addFiles(files, batchFormat, converter);
      
      const results = await batchConverter.processQueue(
        (info) => {
          setProgress({
            overall: info.overallProgress,
            message: `Processing ${info.currentFile}/${info.totalFiles}: ${info.fileName} (${info.fileProgress}%)`
          });
        },
        (item, index, total) => {
          console.log(`Completed ${index + 1}/${total}: ${item.file.name}`);
        },
        (allResults) => {
          setResults(allResults);
        }
      );
      
      setResults(results);
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleDownloadZip = async () => {
    if (results.length === 0) return;
    
    setProgress({ overall: 50, message: 'Creating ZIP file...' });
    
    try {
      await batchConverter.downloadAsZip(results, `converted_${Date.now()}.zip`);
      setProgress({ overall: 100, message: 'Download complete!' });
    } catch (err) {
      setError('Failed to create ZIP file');
    }
  };

  // ============ PDF TOOLS ============
  const handlePdfOperation = async () => {
    if (files.length === 0) return;
    
    setProcessing(true);
    setError(null);
    setResults([]);
    
    try {
      let result;
      
      switch (pdfOperation) {
        case 'merge':
          const mergedBlob = await pdfTools.mergePDFs(files, (p, m) => setProgress({ overall: p, message: m }));
          result = [{ blob: mergedBlob, filename: 'merged.pdf' }];
          break;
          
        case 'split':
          result = await pdfTools.splitPDF(files[0], (p, m) => setProgress({ overall: p, message: m }));
          break;
          
        case 'rotate':
          const rotatedBlob = await pdfTools.rotatePages(files[0], pdfRotation, null, (p, m) => setProgress({ overall: p, message: m }));
          result = [{ blob: rotatedBlob, filename: files[0].name.replace('.pdf', '_rotated.pdf') }];
          break;
          
        case 'compress':
          const compressed = await pdfTools.compressPDF(files[0], pdfCompressQuality, (p, m) => setProgress({ overall: p, message: m }));
          result = [{ 
            blob: compressed.blob, 
            filename: files[0].name.replace('.pdf', '_compressed.pdf'),
            info: `Reduced by ${compressed.reduction}`
          }];
          break;
          
        case 'pageNumbers':
          const numberedBlob = await pdfTools.addPageNumbers(files[0], 'bottom-center', (p, m) => setProgress({ overall: p, message: m }));
          result = [{ blob: numberedBlob, filename: files[0].name.replace('.pdf', '_numbered.pdf') }];
          break;
          
        default:
          throw new Error('Unknown operation');
      }
      
      setResults(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  // ============ VIDEO COMPRESSION ============
  const handleVideoCompress = async () => {
    if (files.length === 0) return;
    
    setProcessing(true);
    setError(null);
    setResults([]);
    
    try {
      const result = await videoCompressor.compress(
        files[0], 
        videoPreset,
        (p, m) => setProgress({ overall: p, message: m })
      );
      
      setResults([{
        blob: result.blob,
        filename: result.filename,
        info: `Reduced by ${result.reduction} (${formatSize(result.originalSize)} → ${formatSize(result.compressedSize)})`
      }]);
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  // ============ IMAGE PROCESSING ============
  const handleImageProcess = async () => {
    if (files.length === 0) return;
    
    setProcessing(true);
    setError(null);
    setResults([]);
    
    try {
      let processedResults = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setProgress({ 
          overall: (i / files.length) * 100, 
          message: `Processing ${file.name}...` 
        });
        
        let result;
        
        switch (imageOperation) {
          case 'resize':
            result = await imageProcessor.resize(
              file,
              { width: resizeWidth, height: resizeHeight, maintainAspect: true },
              (p, m) => setProgress({ overall: (i / files.length) * 100 + (p / files.length), message: m })
            );
            break;
            
          case 'compress':
            result = await imageProcessor.compress(
              file,
              imageQuality / 100,
              (p, m) => setProgress({ overall: (i / files.length) * 100 + (p / files.length), message: m })
            );
            result.info = `Reduced by ${result.reduction}`;
            break;
            
          case 'rotate':
            result = await imageProcessor.rotate(
              file,
              rotationDegrees,
              (p, m) => setProgress({ overall: (i / files.length) * 100 + (p / files.length), message: m })
            );
            break;
            
          case 'flipH':
            result = await imageProcessor.flip(
              file,
              'horizontal',
              (p, m) => setProgress({ overall: (i / files.length) * 100 + (p / files.length), message: m })
            );
            break;
            
          case 'flipV':
            result = await imageProcessor.flip(
              file,
              'vertical',
              (p, m) => setProgress({ overall: (i / files.length) * 100 + (p / files.length), message: m })
            );
            break;
            
          default:
            throw new Error('Unknown operation');
        }
        
        processedResults.push(result);
      }
      
      setResults(processedResults);
      setProgress({ overall: 100, message: 'Complete!' });
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  // ============ OCR PROCESSING ============
  const handleOcrProcess = async () => {
    if (files.length === 0) return;
    
    setProcessing(true);
    setError(null);
    setResults([]);
    
    try {
      const ocrResults = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setProgress({ 
          overall: (i / files.length) * 100, 
          message: `Processing ${file.name}...` 
        });
        
        const result = await ocrProcessor.extractTextFromImage(
          file,
          { language: ocrLanguage, outputFormat: ocrOutputFormat },
          (p, m) => setProgress({ overall: (i / files.length) * 100 + (p / files.length), message: m })
        );
        
        ocrResults.push({
          filename: result.filename,
          data: result.data,
          confidence: result.confidence,
          type: result.type,
          originalFile: file.name
        });
      }
      
      setResults(ocrResults);
      setProgress({ overall: 100, message: 'Complete!' });
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  // ============ WATERMARK PROCESSING ============
  const handleWatermarkProcess = async () => {
    if (files.length === 0) return;
    
    setProcessing(true);
    setError(null);
    setResults([]);
    
    try {
      const wmResults = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setProgress({ 
          overall: (i / files.length) * 100, 
          message: `Watermarking ${file.name}...` 
        });
        
        let result;
        const fileType = file.type;
        
        if (fileType === 'application/pdf') {
          // PDF watermarking
          if (watermarkType === 'text') {
            result = await watermarkProcessor.addWatermarkToPDF(
              file,
              { 
                text: watermarkText, 
                opacity: watermarkOpacity / 100,
                position: watermarkPosition 
              },
              (p, m) => setProgress({ overall: (i / files.length) * 100 + (p / files.length), message: m })
            );
          } else if (watermarkImage) {
            result = await watermarkProcessor.addImageWatermarkToPDF(
              file,
              watermarkImage,
              { opacity: watermarkOpacity / 100, position: watermarkPosition },
              (p, m) => setProgress({ overall: (i / files.length) * 100 + (p / files.length), message: m })
            );
          }
        } else if (fileType.startsWith('video/')) {
          // Video watermarking
          result = await watermarkProcessor.addWatermarkToVideo(
            file,
            {
              text: watermarkType === 'text' ? watermarkText : null,
              watermarkImage: watermarkType === 'image' ? watermarkImage : null,
              position: watermarkPosition,
              opacity: watermarkOpacity / 100
            },
            (p, m) => setProgress({ overall: (i / files.length) * 100 + (p / files.length), message: m })
          );
        } else {
          // Image watermarking
          if (watermarkType === 'text') {
            result = await watermarkProcessor.addTextWatermarkToImage(
              file,
              { 
                text: watermarkText, 
                opacity: watermarkOpacity / 100,
                position: watermarkPosition,
                repeat: watermarkRepeat
              },
              (p, m) => setProgress({ overall: (i / files.length) * 100 + (p / files.length), message: m })
            );
          } else if (watermarkImage) {
            result = await watermarkProcessor.addImageWatermarkToImage(
              file,
              watermarkImage,
              { opacity: watermarkOpacity / 100, position: watermarkPosition },
              (p, m) => setProgress({ overall: (i / files.length) * 100 + (p / files.length), message: m })
            );
          }
        }
        
        if (result) {
          wmResults.push(result);
        }
      }
      
      setResults(wmResults);
      setProgress({ overall: 100, message: 'Complete!' });
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  // ============ AUDIO PROCESSING ============
  const handleAudioProcess = async () => {
    if (files.length === 0) return;
    
    setProcessing(true);
    setError(null);
    setResults([]);
    
    try {
      let result;
      const file = files[0];
      
      switch (audioOperation) {
        case 'extract':
          result = await audioProcessor.extractFromVideo(
            file,
            { format: audioFormat, bitrate: audioBitrate },
            (p, m) => setProgress({ overall: p, message: m })
          );
          break;
          
        case 'normalize':
          result = await audioProcessor.normalize(
            file,
            { targetLevel: -16 },
            (p, m) => setProgress({ overall: p, message: m })
          );
          break;
          
        case 'trim':
          result = await audioProcessor.trim(
            file,
            { startTime: audioTrimStart, endTime: audioTrimEnd },
            (p, m) => setProgress({ overall: p, message: m })
          );
          break;
          
        case 'bitrate':
          result = await audioProcessor.changeBitrate(
            file,
            { bitrate: audioBitrate, format: audioFormat },
            (p, m) => setProgress({ overall: p, message: m })
          );
          break;
          
        case 'volume':
          result = await audioProcessor.adjustVolume(
            file,
            { volume: audioVolume / 100 },
            (p, m) => setProgress({ overall: p, message: m })
          );
          break;
          
        case 'convert':
          result = await audioProcessor.convert(
            file,
            { format: audioFormat, bitrate: audioBitrate },
            (p, m) => setProgress({ overall: p, message: m })
          );
          break;
          
        case 'merge':
          result = await audioProcessor.merge(
            files,
            { format: audioFormat },
            (p, m) => setProgress({ overall: p, message: m })
          );
          break;
          
        default:
          throw new Error('Unknown operation');
      }
      
      setResults([result]);
      setProgress({ overall: 100, message: 'Complete!' });
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  // ============ GIF CREATION ============
  const handleGifProcess = async () => {
    if (files.length === 0) return;
    
    setProcessing(true);
    setError(null);
    setResults([]);
    
    try {
      let result;
      
      switch (gifOperation) {
        case 'video':
          result = await gifCreator.videoToGif(
            files[0],
            { fps: gifFps, width: gifWidth, duration: gifDuration, quality: gifQuality },
            (p, m) => setProgress({ overall: p, message: m })
          );
          break;
          
        case 'images':
          result = await gifCreator.imagestoGif(
            files,
            { fps: gifFps, width: gifWidth, quality: gifQuality },
            (p, m) => setProgress({ overall: p, message: m })
          );
          break;
          
        case 'optimize':
          result = await gifCreator.optimizeGif(
            files[0],
            { width: gifWidth, quality: gifQuality },
            (p, m) => setProgress({ overall: p, message: m })
          );
          break;
          
        case 'reverse':
          result = await gifCreator.reverseGif(
            files[0],
            (p, m) => setProgress({ overall: p, message: m })
          );
          break;
          
        case 'speed':
          result = await gifCreator.changeSpeed(
            files[0],
            { speed: gifSpeed },
            (p, m) => setProgress({ overall: p, message: m })
          );
          break;
          
        case 'frames':
          const frameResult = await gifCreator.extractFrames(
            files[0],
            { format: 'png' },
            (p, m) => setProgress({ overall: p, message: m })
          );
          setResults(frameResult.frames);
          setProgress({ overall: 100, message: `Extracted ${frameResult.frameCount} frames!` });
          return;
          
        default:
          throw new Error('Unknown operation');
      }
      
      setResults([result]);
      setProgress({ overall: 100, message: 'Complete!' });
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  // ============ IMAGE SEQUENCE ============
  const handleSequenceProcess = async () => {
    if (files.length === 0) return;

    setProcessing(true);
    setError(null);
    setResults([]);

    try {
      let result;
      if (seqMode === 'import') {
        result = await imageSequenceConverter.sequenceToVideo(
          files,
          seqVideoFormat,
          { fps: seqFps, width: seqWidth, quality: seqQuality },
          (pct, msg) => setProgress({ overall: pct, message: msg })
        );
        setResults([{
          blob: result.blob,
          filename: result.filename,
          info: `${result.frameCount} frames → ${seqVideoFormat.toUpperCase()}`,
        }]);
      } else {
        result = await imageSequenceConverter.videoToSequence(
          files[0],
          seqImageFormat,
          { fps: seqExtractFps, maxFrames: seqMaxFrames },
          (pct, msg) => setProgress({ overall: pct, message: msg })
        );
        setResults([{
          blob: result.blob,
          filename: result.filename,
          info: `${result.frameCount} frames extracted as ${seqImageFormat.toUpperCase()}`,
        }]);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  // ============ DOWNLOAD HELPERS ============
  const downloadFile = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  // ============ RENDER ============
  return (
    <div className="advanced-tools">
      <div className="tools-header">
        <h2>🛠️ Advanced Tools</h2>
        <p>Batch conversion, PDF tools, video compression, and image processing</p>
      </div>

      {/* Tab Navigation */}
      <div className="tools-tabs">
        <button 
          className={`tool-tab ${activeTab === 'batch' ? 'active' : ''}`}
          onClick={() => { setActiveTab('batch'); clearFiles(); }}
        >
          📦 Batch Convert
        </button>
        <button 
          className={`tool-tab ${activeTab === 'pdf' ? 'active' : ''}`}
          onClick={() => { setActiveTab('pdf'); clearFiles(); }}
        >
          📄 PDF Tools
        </button>
        <button 
          className={`tool-tab ${activeTab === 'video' ? 'active' : ''}`}
          onClick={() => { setActiveTab('video'); clearFiles(); }}
        >
          🎬 Video Compress
        </button>
        <button 
          className={`tool-tab ${activeTab === 'image' ? 'active' : ''}`}
          onClick={() => { setActiveTab('image'); clearFiles(); }}
        >
          🖼️ Image Tools
        </button>
        <button 
          className={`tool-tab ${activeTab === 'ocr' ? 'active' : ''}`}
          onClick={() => { setActiveTab('ocr'); clearFiles(); }}
        >
          🔍 OCR
        </button>
        <button 
          className={`tool-tab ${activeTab === 'watermark' ? 'active' : ''}`}
          onClick={() => { setActiveTab('watermark'); clearFiles(); }}
        >
          💧 Watermark
        </button>
        <button 
          className={`tool-tab ${activeTab === 'audio' ? 'active' : ''}`}
          onClick={() => { setActiveTab('audio'); clearFiles(); }}
        >
          🎵 Audio Tools
        </button>
        <button 
          className={`tool-tab ${activeTab === 'gif' ? 'active' : ''}`}
          onClick={() => { setActiveTab('gif'); clearFiles(); }}
        >
          🎞️ GIF Creator
        </button>
        <button 
          className={`tool-tab ${activeTab === 'sequence' ? 'active' : ''}`}
          onClick={() => { setActiveTab('sequence'); clearFiles(); }}
        >
          📽️ Image Sequences
        </button>
      </div>

      {/* Tab Content */}
      <div className="tool-content">
        
        {/* BATCH CONVERSION */}
        {activeTab === 'batch' && (
          <div className="batch-section">
            <h3>📦 Batch File Conversion</h3>
            <p>Convert multiple files at once and download as ZIP</p>
            
            <div className="file-upload-area" onClick={() => batchInputRef.current?.click()}>
              <input
                ref={batchInputRef}
                type="file"
                multiple
                accept="video/*,audio/*,image/*"
                onChange={(e) => handleFilesSelect(e, 'batch')}
                style={{ display: 'none' }}
              />
              <div className="upload-icon">📁</div>
              <p>Click to select multiple files</p>
              <small>Supports: Video, Audio, Image files</small>
            </div>
            
            {files.length > 0 && (
              <div className="selected-files">
                <h4>{files.length} file(s) selected</h4>
                <ul>
                  {files.slice(0, 5).map((f, i) => (
                    <li key={i}>{f.name} ({formatSize(f.size)})</li>
                  ))}
                  {files.length > 5 && <li>...and {files.length - 5} more</li>}
                </ul>
                
                <div className="format-select">
                  <label>Convert to:</label>
                  <select value={batchFormat} onChange={(e) => setBatchFormat(e.target.value)}>
                    <optgroup label="Audio">
                      <option value="mp3">MP3</option>
                      <option value="wav">WAV</option>
                      <option value="aac">AAC</option>
                      <option value="flac">FLAC</option>
                      <option value="ogg">OGG</option>
                    </optgroup>
                    <optgroup label="Video">
                      <option value="mp4">MP4</option>
                      <option value="webm">WebM</option>
                      <option value="avi">AVI</option>
                      <option value="mkv">MKV</option>
                    </optgroup>
                    <optgroup label="Image">
                      <option value="jpg">JPG</option>
                      <option value="png">PNG</option>
                      <option value="webp">WebP</option>
                      <option value="gif">GIF</option>
                    </optgroup>
                  </select>
                </div>
                
                <button 
                  className="process-btn" 
                  onClick={handleBatchConvert}
                  disabled={processing}
                >
                  {processing ? 'Converting...' : `Convert ${files.length} Files`}
                </button>
              </div>
            )}
          </div>
        )}

        {/* PDF TOOLS */}
        {activeTab === 'pdf' && (
          <div className="pdf-section">
            <h3>📄 PDF Tools</h3>
            
            <div className="operation-select">
              <label>Operation:</label>
              <select value={pdfOperation} onChange={(e) => setPdfOperation(e.target.value)}>
                <option value="merge">Merge PDFs</option>
                <option value="split">Split PDF into Pages</option>
                <option value="rotate">Rotate Pages</option>
                <option value="compress">Compress PDF</option>
                <option value="pageNumbers">Add Page Numbers</option>
              </select>
            </div>
            
            {pdfOperation === 'rotate' && (
              <div className="option-group">
                <label>Rotation:</label>
                <select value={pdfRotation} onChange={(e) => setPdfRotation(Number(e.target.value))}>
                  <option value={90}>90° Clockwise</option>
                  <option value={180}>180°</option>
                  <option value={270}>90° Counter-clockwise</option>
                </select>
              </div>
            )}
            
            {pdfOperation === 'compress' && (
              <div className="option-group">
                <label>Quality:</label>
                <select value={pdfCompressQuality} onChange={(e) => setPdfCompressQuality(e.target.value)}>
                  <option value="high">High Quality</option>
                  <option value="medium">Balanced</option>
                  <option value="low">Maximum Compression</option>
                </select>
              </div>
            )}
            
            <div className="file-upload-area" onClick={() => pdfInputRef.current?.click()}>
              <input
                ref={pdfInputRef}
                type="file"
                multiple={pdfOperation === 'merge'}
                accept=".pdf"
                onChange={(e) => handleFilesSelect(e, 'pdf')}
                style={{ display: 'none' }}
              />
              <div className="upload-icon">📄</div>
              <p>Click to select PDF file(s)</p>
              <small>{pdfOperation === 'merge' ? 'Select multiple PDFs to merge' : 'Select a PDF file'}</small>
            </div>
            
            {files.length > 0 && (
              <div className="selected-files">
                <h4>{files.length} PDF(s) selected</h4>
                <ul>
                  {files.map((f, i) => <li key={i}>{f.name}</li>)}
                </ul>
                <button 
                  className="process-btn" 
                  onClick={handlePdfOperation}
                  disabled={processing}
                >
                  {processing ? 'Processing...' : `${pdfOperation.charAt(0).toUpperCase() + pdfOperation.slice(1)} PDF`}
                </button>
              </div>
            )}
          </div>
        )}

        {/* VIDEO COMPRESSION */}
        {activeTab === 'video' && (
          <div className="video-section">
            <h3>🎬 Video Compression</h3>
            <p>Reduce video file size with quality presets</p>
            
            <div className="preset-grid">
              {Object.entries(videoCompressor.getPresets()).map(([key, preset]) => (
                <div 
                  key={key}
                  className={`preset-card ${videoPreset === key ? 'selected' : ''}`}
                  onClick={() => setVideoPreset(key)}
                >
                  <h4>{preset.name}</h4>
                  <p>{preset.description}</p>
                  <small>Est. reduction: {preset.estimatedReduction}</small>
                </div>
              ))}
            </div>
            
            <div className="file-upload-area" onClick={() => videoInputRef.current?.click()}>
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                onChange={(e) => handleFilesSelect(e, 'video')}
                style={{ display: 'none' }}
              />
              <div className="upload-icon">🎬</div>
              <p>Click to select a video file</p>
              <small>Supports: MP4, AVI, MOV, MKV, WebM</small>
            </div>
            
            {files.length > 0 && (
              <div className="selected-files">
                <h4>Selected: {files[0].name}</h4>
                <p>Size: {formatSize(files[0].size)}</p>
                <button 
                  className="process-btn" 
                  onClick={handleVideoCompress}
                  disabled={processing}
                >
                  {processing ? 'Compressing...' : 'Compress Video'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* IMAGE TOOLS */}
        {activeTab === 'image' && (
          <div className="image-section">
            <h3>🖼️ Image Processing</h3>
            
            <div className="operation-select">
              <label>Operation:</label>
              <select value={imageOperation} onChange={(e) => setImageOperation(e.target.value)}>
                <option value="resize">Resize</option>
                <option value="compress">Compress for Web</option>
                <option value="rotate">Rotate</option>
                <option value="flipH">Flip Horizontal</option>
                <option value="flipV">Flip Vertical</option>
              </select>
            </div>
            
            {imageOperation === 'resize' && (
              <div className="resize-options">
                <div className="option-row">
                  <label>Width:</label>
                  <input 
                    type="number" 
                    value={resizeWidth} 
                    onChange={(e) => setResizeWidth(Number(e.target.value))}
                    min="1"
                    max="8000"
                  />
                  <span>px</span>
                </div>
                <div className="option-row">
                  <label>Height:</label>
                  <input 
                    type="number" 
                    value={resizeHeight} 
                    onChange={(e) => setResizeHeight(Number(e.target.value))}
                    min="1"
                    max="8000"
                  />
                  <span>px</span>
                </div>
                <div className="preset-buttons">
                  {Object.entries(imageProcessor.getResizePresets()).slice(0, 6).map(([key, preset]) => (
                    <button 
                      key={key}
                      className="preset-btn"
                      onClick={() => { setResizeWidth(preset.width); setResizeHeight(preset.height); }}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {imageOperation === 'compress' && (
              <div className="quality-slider">
                <label>Quality: {imageQuality}%</label>
                <input 
                  type="range" 
                  min="10" 
                  max="100" 
                  value={imageQuality}
                  onChange={(e) => setImageQuality(Number(e.target.value))}
                />
                <div className="quality-labels">
                  <span>Smaller File</span>
                  <span>Better Quality</span>
                </div>
              </div>
            )}
            
            {imageOperation === 'rotate' && (
              <div className="option-group">
                <label>Degrees:</label>
                <select value={rotationDegrees} onChange={(e) => setRotationDegrees(Number(e.target.value))}>
                  <option value={90}>90° Clockwise</option>
                  <option value={180}>180°</option>
                  <option value={270}>90° Counter-clockwise</option>
                  <option value={45}>45°</option>
                </select>
              </div>
            )}
            
            <div className="file-upload-area" onClick={() => imageInputRef.current?.click()}>
              <input
                ref={imageInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => handleFilesSelect(e, 'image')}
                style={{ display: 'none' }}
              />
              <div className="upload-icon">🖼️</div>
              <p>Click to select image(s)</p>
              <small>Supports: JPG, PNG, GIF, WebP, BMP</small>
            </div>
            
            {files.length > 0 && (
              <div className="selected-files">
                <h4>{files.length} image(s) selected</h4>
                <ul>
                  {files.slice(0, 3).map((f, i) => <li key={i}>{f.name}</li>)}
                  {files.length > 3 && <li>...and {files.length - 3} more</li>}
                </ul>
                <button 
                  className="process-btn" 
                  onClick={handleImageProcess}
                  disabled={processing}
                >
                  {processing ? 'Processing...' : 'Process Images'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* OCR - TEXT EXTRACTION */}
        {activeTab === 'ocr' && (
          <div className="ocr-section">
            <h3>🔍 OCR - Text Extraction</h3>
            <p>Extract text from images using Tesseract.js</p>
            
            <div className="option-row">
              <label>Language:</label>
              <select value={ocrLanguage} onChange={(e) => setOcrLanguage(e.target.value)}>
                {ocrProcessor.getSupportedLanguages().map(lang => (
                  <option key={lang.code} value={lang.code}>{lang.name}</option>
                ))}
              </select>
            </div>
            
            <div className="option-row">
              <label>Output Format:</label>
              <select value={ocrOutputFormat} onChange={(e) => setOcrOutputFormat(e.target.value)}>
                <option value="text">Plain Text</option>
                <option value="json">JSON (with confidence)</option>
                <option value="hocr">hOCR (HTML)</option>
              </select>
            </div>
            
            <div className="file-upload-area" onClick={() => ocrInputRef.current?.click()}>
              <input
                ref={ocrInputRef}
                type="file"
                multiple
                accept="image/*,.pdf"
                onChange={(e) => handleFilesSelect(e, 'ocr')}
                style={{ display: 'none' }}
              />
              <div className="upload-icon">🔍</div>
              <p>Click to select image(s)</p>
              <small>Supports: JPG, PNG, GIF, WebP, PDF</small>
            </div>
            
            {files.length > 0 && (
              <div className="selected-files">
                <h4>{files.length} file(s) selected</h4>
                <ul>
                  {files.slice(0, 3).map((f, i) => <li key={i}>{f.name}</li>)}
                  {files.length > 3 && <li>...and {files.length - 3} more</li>}
                </ul>
                <button 
                  className="process-btn" 
                  onClick={handleOcrProcess}
                  disabled={processing}
                >
                  {processing ? 'Extracting Text...' : 'Extract Text'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* WATERMARK */}
        {activeTab === 'watermark' && (
          <div className="watermark-section">
            <h3>💧 Add Watermark</h3>
            <p>Add text or image watermarks to images, PDFs, and videos</p>
            
            <div className="option-row">
              <label>Watermark Type:</label>
              <select value={watermarkType} onChange={(e) => setWatermarkType(e.target.value)}>
                <option value="text">Text Watermark</option>
                <option value="image">Image Watermark</option>
              </select>
            </div>
            
            {watermarkType === 'text' && (
              <>
                <div className="option-row">
                  <label>Text:</label>
                  <input 
                    type="text" 
                    value={watermarkText}
                    onChange={(e) => setWatermarkText(e.target.value)}
                    placeholder="Enter watermark text"
                  />
                </div>
                <div className="option-row">
                  <label>
                    <input 
                      type="checkbox" 
                      checked={watermarkRepeat}
                      onChange={(e) => setWatermarkRepeat(e.target.checked)}
                    />
                    Tile/Repeat watermark
                  </label>
                </div>
              </>
            )}
            
            {watermarkType === 'image' && (
              <div className="option-row">
                <label>Watermark Image:</label>
                <input
                  ref={watermarkImageRef}
                  type="file"
                  accept="image/*"
                  onChange={handleWatermarkImageSelect}
                />
                {watermarkImage && <span className="file-selected">✓ {watermarkImage.name}</span>}
              </div>
            )}
            
            <div className="option-row">
              <label>Position:</label>
              <select value={watermarkPosition} onChange={(e) => setWatermarkPosition(e.target.value)}>
                <option value="center">Center</option>
                <option value="top-left">Top Left</option>
                <option value="top-center">Top Center</option>
                <option value="top-right">Top Right</option>
                <option value="bottom-left">Bottom Left</option>
                <option value="bottom-center">Bottom Center</option>
                <option value="bottom-right">Bottom Right</option>
              </select>
            </div>
            
            <div className="quality-slider">
              <label>Opacity: {watermarkOpacity}%</label>
              <input 
                type="range" 
                min="10" 
                max="100" 
                value={watermarkOpacity}
                onChange={(e) => setWatermarkOpacity(Number(e.target.value))}
              />
            </div>
            
            <div className="file-upload-area" onClick={() => watermarkInputRef.current?.click()}>
              <input
                ref={watermarkInputRef}
                type="file"
                multiple
                accept="image/*,video/*,.pdf"
                onChange={(e) => handleFilesSelect(e, 'watermark')}
                style={{ display: 'none' }}
              />
              <div className="upload-icon">💧</div>
              <p>Click to select file(s) to watermark</p>
              <small>Supports: Images, Videos, PDFs</small>
            </div>
            
            {files.length > 0 && (
              <div className="selected-files">
                <h4>{files.length} file(s) selected</h4>
                <ul>
                  {files.slice(0, 3).map((f, i) => <li key={i}>{f.name}</li>)}
                  {files.length > 3 && <li>...and {files.length - 3} more</li>}
                </ul>
                <button 
                  className="process-btn" 
                  onClick={handleWatermarkProcess}
                  disabled={processing || (watermarkType === 'image' && !watermarkImage)}
                >
                  {processing ? 'Adding Watermark...' : 'Add Watermark'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* AUDIO TOOLS */}
        {activeTab === 'audio' && (
          <div className="audio-section">
            <h3>🎵 Audio Processing</h3>
            <p>Normalize, trim, convert, and extract audio</p>
            
            <div className="option-row">
              <label>Operation:</label>
              <select value={audioOperation} onChange={(e) => setAudioOperation(e.target.value)}>
                <option value="extract">Extract Audio from Video</option>
                <option value="normalize">Normalize Audio Levels</option>
                <option value="trim">Trim/Cut Audio</option>
                <option value="bitrate">Change Bitrate/Quality</option>
                <option value="volume">Adjust Volume</option>
                <option value="convert">Convert Format</option>
                <option value="merge">Merge Audio Files</option>
              </select>
            </div>
            
            {(audioOperation === 'extract' || audioOperation === 'bitrate' || audioOperation === 'convert') && (
              <>
                <div className="option-row">
                  <label>Output Format:</label>
                  <select value={audioFormat} onChange={(e) => setAudioFormat(e.target.value)}>
                    <option value="mp3">MP3</option>
                    <option value="wav">WAV</option>
                    <option value="aac">AAC</option>
                    <option value="ogg">OGG</option>
                    <option value="flac">FLAC</option>
                  </select>
                </div>
                <div className="option-row">
                  <label>Bitrate:</label>
                  <select value={audioBitrate} onChange={(e) => setAudioBitrate(e.target.value)}>
                    {audioProcessor.getBitratePresets().map(preset => (
                      <option key={preset.value} value={preset.value}>{preset.name}</option>
                    ))}
                  </select>
                </div>
              </>
            )}
            
            {audioOperation === 'trim' && (
              <div className="trim-options">
                <div className="option-row">
                  <label>Start Time (seconds):</label>
                  <input 
                    type="number" 
                    value={audioTrimStart}
                    onChange={(e) => setAudioTrimStart(Number(e.target.value))}
                    min="0"
                    step="0.1"
                  />
                </div>
                <div className="option-row">
                  <label>End Time (seconds):</label>
                  <input 
                    type="number" 
                    value={audioTrimEnd}
                    onChange={(e) => setAudioTrimEnd(Number(e.target.value))}
                    min="0"
                    step="0.1"
                  />
                </div>
              </div>
            )}
            
            {audioOperation === 'volume' && (
              <div className="quality-slider">
                <label>Volume: {audioVolume}%</label>
                <input 
                  type="range" 
                  min="10" 
                  max="200" 
                  value={audioVolume}
                  onChange={(e) => setAudioVolume(Number(e.target.value))}
                />
                <div className="quality-labels">
                  <span>Quieter</span>
                  <span>Louder</span>
                </div>
              </div>
            )}
            
            <div className="file-upload-area" onClick={() => audioInputRef.current?.click()}>
              <input
                ref={audioInputRef}
                type="file"
                multiple={audioOperation === 'merge'}
                accept={audioOperation === 'extract' ? 'video/*' : 'audio/*,video/*'}
                onChange={(e) => handleFilesSelect(e, 'audio')}
                style={{ display: 'none' }}
              />
              <div className="upload-icon">🎵</div>
              <p>Click to select {audioOperation === 'extract' ? 'video' : 'audio'} file(s)</p>
              <small>{audioOperation === 'extract' ? 'Select a video to extract audio from' : 'Supports: MP3, WAV, AAC, OGG, FLAC'}</small>
            </div>
            
            {files.length > 0 && (
              <div className="selected-files">
                <h4>{files.length} file(s) selected</h4>
                <ul>
                  {files.slice(0, 3).map((f, i) => <li key={i}>{f.name} ({formatSize(f.size)})</li>)}
                  {files.length > 3 && <li>...and {files.length - 3} more</li>}
                </ul>
                <button 
                  className="process-btn" 
                  onClick={handleAudioProcess}
                  disabled={processing}
                >
                  {processing ? 'Processing...' : 'Process Audio'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* GIF CREATOR */}
        {activeTab === 'gif' && (
          <div className="gif-section">
            <h3>🎞️ GIF Creator</h3>
            <p>Create, edit, and optimize GIFs</p>
            
            <div className="option-row">
              <label>Operation:</label>
              <select value={gifOperation} onChange={(e) => setGifOperation(e.target.value)}>
                <option value="video">Video → GIF</option>
                <option value="images">Image Sequence → GIF</option>
                <option value="optimize">Optimize/Compress GIF</option>
                <option value="reverse">Reverse GIF</option>
                <option value="speed">Change Speed</option>
                <option value="frames">Extract Frames</option>
              </select>
            </div>
            
            {(gifOperation === 'video' || gifOperation === 'images' || gifOperation === 'optimize') && (
              <>
                <div className="option-row">
                  <label>Width (px):</label>
                  <select value={gifWidth} onChange={(e) => setGifWidth(Number(e.target.value))}>
                    {gifCreator.getSizePresets().map(preset => (
                      <option key={preset.width} value={preset.width}>{preset.name}</option>
                    ))}
                  </select>
                </div>
                <div className="option-row">
                  <label>Quality:</label>
                  <select value={gifQuality} onChange={(e) => setGifQuality(e.target.value)}>
                    {gifCreator.getQualityPresets().map(preset => (
                      <option key={preset.value} value={preset.value}>{preset.name}</option>
                    ))}
                  </select>
                </div>
              </>
            )}
            
            {(gifOperation === 'video' || gifOperation === 'images') && (
              <div className="option-row">
                <label>Frame Rate (FPS):</label>
                <select value={gifFps} onChange={(e) => setGifFps(Number(e.target.value))}>
                  <option value={5}>5 FPS (small file)</option>
                  <option value={10}>10 FPS (standard)</option>
                  <option value={15}>15 FPS (smooth)</option>
                  <option value={20}>20 FPS (very smooth)</option>
                  <option value={30}>30 FPS (high quality)</option>
                </select>
              </div>
            )}
            
            {gifOperation === 'video' && (
              <div className="option-row">
                <label>Duration (seconds):</label>
                <input 
                  type="number" 
                  value={gifDuration}
                  onChange={(e) => setGifDuration(Number(e.target.value))}
                  min="1"
                  max="30"
                />
              </div>
            )}
            
            {gifOperation === 'speed' && (
              <div className="quality-slider">
                <label>Speed: {gifSpeed}x</label>
                <input 
                  type="range" 
                  min="0.25" 
                  max="4" 
                  step="0.25"
                  value={gifSpeed}
                  onChange={(e) => setGifSpeed(Number(e.target.value))}
                />
                <div className="quality-labels">
                  <span>Slower</span>
                  <span>Faster</span>
                </div>
              </div>
            )}
            
            <div className="file-upload-area" onClick={() => (gifOperation === 'images' ? gifImagesRef : gifInputRef).current?.click()}>
              <input
                ref={gifInputRef}
                type="file"
                accept={gifOperation === 'video' ? 'video/*' : 'image/gif'}
                onChange={(e) => handleFilesSelect(e, 'gif')}
                style={{ display: 'none' }}
              />
              <input
                ref={gifImagesRef}
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => handleFilesSelect(e, 'gif')}
                style={{ display: 'none' }}
              />
              <div className="upload-icon">🎞️</div>
              <p>Click to select {gifOperation === 'video' ? 'a video' : gifOperation === 'images' ? 'images' : 'a GIF'}</p>
              <small>
                {gifOperation === 'video' && 'Select a video to convert to GIF'}
                {gifOperation === 'images' && 'Select multiple images for animation'}
                {gifOperation !== 'video' && gifOperation !== 'images' && 'Select a GIF file'}
              </small>
            </div>
            
            {files.length > 0 && (
              <div className="selected-files">
                <h4>{files.length} file(s) selected</h4>
                <ul>
                  {files.slice(0, 3).map((f, i) => <li key={i}>{f.name}</li>)}
                  {files.length > 3 && <li>...and {files.length - 3} more</li>}
                </ul>
                <button 
                  className="process-btn" 
                  onClick={handleGifProcess}
                  disabled={processing}
                >
                  {processing ? 'Creating GIF...' : 'Create GIF'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* IMAGE SEQUENCES */}
        {activeTab === 'sequence' && (
          <div className="sequence-section">
            <h3>📽️ Image Sequence Converter</h3>
            <p>Import an image sequence into a video — or export a video as a ZIP of image frames.</p>

            <div className="option-row">
              <label>Mode:</label>
              <select value={seqMode} onChange={(e) => { setSeqMode(e.target.value); clearFiles(); }}>
                <option value="import">Import: Image sequence → Video / GIF</option>
                <option value="export">Export: Video → Image sequence (ZIP)</option>
              </select>
            </div>

            {seqMode === 'import' && (
              <>
                <div className="option-row">
                  <label>Output format:</label>
                  <select value={seqVideoFormat} onChange={(e) => setSeqVideoFormat(e.target.value)}>
                    {imageSequenceConverter.videoOutputFormats.map(f => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                </div>
                <div className="option-row">
                  <label>Frame rate (FPS):</label>
                  <select value={seqFps} onChange={(e) => setSeqFps(Number(e.target.value))}>
                    <option value={12}>12 FPS</option>
                    <option value={24}>24 FPS (film)</option>
                    <option value={25}>25 FPS (PAL)</option>
                    <option value={30}>30 FPS</option>
                    <option value={60}>60 FPS</option>
                  </select>
                </div>
                <div className="option-row">
                  <label>Resize width (px):</label>
                  <select value={seqWidth} onChange={(e) => setSeqWidth(Number(e.target.value))}>
                    <option value={-1}>Keep original</option>
                    <option value={1920}>1920 (1080p)</option>
                    <option value={1280}>1280 (720p)</option>
                    <option value={854}>854 (480p)</option>
                    <option value={640}>640 (360p)</option>
                  </select>
                </div>
                <div className="option-row">
                  <label>Quality:</label>
                  <select value={seqQuality} onChange={(e) => setSeqQuality(e.target.value)}>
                    <option value="low">Low (fast, smaller file)</option>
                    <option value="medium">Medium (balanced)</option>
                    <option value="high">High (slow, larger file)</option>
                  </select>
                </div>
                <div className="file-upload-area" onClick={() => seqImagesRef.current?.click()}>
                  <input
                    ref={seqImagesRef}
                    type="file"
                    multiple
                    accept="image/png,image/jpeg,image/webp,image/bmp"
                    onChange={(e) => handleFilesSelect(e, 'sequence')}
                    style={{ display: 'none' }}
                  />
                  <div className="upload-icon">🖼️</div>
                  <p>Click to select image frames</p>
                  <small>PNG, JPG, WebP, BMP — files are sorted by name automatically</small>
                </div>
              </>
            )}

            {seqMode === 'export' && (
              <>
                <div className="option-row">
                  <label>Frame image format:</label>
                  <select value={seqImageFormat} onChange={(e) => setSeqImageFormat(e.target.value)}>
                    {imageSequenceConverter.imageOutputFormats.map(f => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                </div>
                <div className="option-row">
                  <label>Extract frame rate:</label>
                  <select value={seqExtractFps} onChange={(e) => setSeqExtractFps(e.target.value)}>
                    <option value="source">Source (all frames)</option>
                    <option value={1}>1 FPS (1 per second)</option>
                    <option value={2}>2 FPS</option>
                    <option value={5}>5 FPS</option>
                    <option value={10}>10 FPS</option>
                    <option value={24}>24 FPS</option>
                    <option value={30}>30 FPS</option>
                  </select>
                </div>
                <div className="option-row">
                  <label>Max frames to extract:</label>
                  <select value={seqMaxFrames} onChange={(e) => setSeqMaxFrames(Number(e.target.value))}>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={300}>300</option>
                    <option value={500}>500</option>
                  </select>
                </div>
                <div className="file-upload-area" onClick={() => seqVideoRef.current?.click()}>
                  <input
                    ref={seqVideoRef}
                    type="file"
                    accept="video/*,image/gif"
                    onChange={(e) => handleFilesSelect(e, 'sequence')}
                    style={{ display: 'none' }}
                  />
                  <div className="upload-icon">🎬</div>
                  <p>Click to select a video or GIF</p>
                  <small>MP4, WebM, MKV, MOV, GIF supported</small>
                </div>
              </>
            )}

            {files.length > 0 && (
              <div className="selected-files">
                <h4>{seqMode === 'import' ? `${files.length} image(s) selected` : files[0].name}</h4>
                {seqMode === 'import' && (
                  <ul>
                    {files.slice(0, 5).map((f, i) => <li key={i}>{f.name}</li>)}
                    {files.length > 5 && <li>…and {files.length - 5} more</li>}
                  </ul>
                )}
                <button
                  className="process-btn"
                  onClick={handleSequenceProcess}
                  disabled={processing}
                >
                  {processing
                    ? (seqMode === 'import' ? 'Encoding…' : 'Extracting…')
                    : (seqMode === 'import' ? `Encode to ${seqVideoFormat.toUpperCase()}` : `Extract frames as ${seqImageFormat.toUpperCase()} ZIP`)}
                </button>
              </div>
            )}
          </div>
        )}

        {/* PROGRESS BAR */}
        {processing && (
          <div className="progress-section">
            <div className="progress-bar-container">
              <div className="progress-bar" style={{ width: `${progress.overall}%` }}></div>
            </div>
            <p className="progress-message">{progress.message}</p>
          </div>
        )}

        {/* ERROR MESSAGE */}
        {error && (
          <div className="error-message">
            <p>❌ {error}</p>
          </div>
        )}

        {/* RESULTS */}
        {results.length > 0 && (
          <div className="results-section">
            <h4>✅ Processing Complete!</h4>
            
            <div className="results-list">
              {results.map((result, index) => (
                <div key={index} className="result-item">
                  {/* OCR Results - Show extracted text */}
                  {result.type === 'text' && (
                    <div className="ocr-result">
                      <div className="ocr-header">
                        <span className="result-name">📄 {result.originalFile}</span>
                        {result.confidence && (
                          <span className="confidence-badge">
                            Confidence: {Math.round(result.confidence)}%
                          </span>
                        )}
                      </div>
                      <textarea 
                        className="ocr-text-output" 
                        value={result.data} 
                        readOnly 
                        rows={8}
                      />
                      <button 
                        className="download-btn"
                        onClick={() => {
                          const blob = new Blob([result.data], { type: 'text/plain' });
                          downloadFile(blob, result.filename);
                        }}
                      >
                        📥 Download as TXT
                      </button>
                      <button 
                        className="copy-btn"
                        onClick={() => {
                          navigator.clipboard.writeText(result.data);
                          alert('Text copied to clipboard!');
                        }}
                      >
                        📋 Copy Text
                      </button>
                    </div>
                  )}
                  
                  {/* Regular file results */}
                  {result.blob && (
                    <>
                      <span className="result-name">{result.filename}</span>
                      {result.info && <span className="result-info">{result.info}</span>}
                      {result.savings && <span className="result-info">Saved: {result.savings}</span>}
                      <button 
                        className="download-btn"
                        onClick={() => downloadFile(result.blob, result.filename)}
                      >
                        📥 Download
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
            
            {results.length > 1 && results[0].blob && (
              <button className="download-all-btn" onClick={handleDownloadZip}>
                📦 Download All as ZIP
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdvancedTools;
