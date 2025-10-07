import React, { useState } from 'react';
import './DocumentConverter.css';
import paymentService from '../services/PaymentService';
import CheckoutModal from './CheckoutModal';

const DocumentConverter = ({ isPremium, onUpgrade }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [outputFormat, setOutputFormat] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [convertedFile, setConvertedFile] = useState(null);
  const [error, setError] = useState(null);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);

  const documentFormats = [
    { value: 'pdf', label: 'PDF', icon: '📄' },
    { value: 'docx', label: 'Word Document (DOCX)', icon: '📝' },
    { value: 'txt', label: 'Text File (TXT)', icon: '📃' },
    { value: 'rtf', label: 'Rich Text Format (RTF)', icon: '📋' },
    { value: 'html', label: 'HTML', icon: '🌐' },
    { value: 'epub', label: 'EPUB (eBook)', icon: '📚', premium: true },
    { value: 'mobi', label: 'MOBI (Kindle)', icon: '📖', premium: true },
    { value: 'odt', label: 'OpenDocument Text', icon: '📄', premium: true }
  ];

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      setOutputFormat('');
      setConvertedFile(null);
      setError(null);
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) {
      // Check if it's a document file
      const supportedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'application/rtf',
        'text/html',
        'application/epub+zip'
      ];
      
      if (supportedTypes.includes(file.type) || 
          file.name.match(/\.(pdf|doc|docx|txt|rtf|html|epub|mobi|odt)$/i)) {
        setSelectedFile(file);
        setOutputFormat('');
        setConvertedFile(null);
        setError(null);
      } else {
        setError('Please select a supported document format');
      }
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  const getAvailableFormats = () => {
    if (!selectedFile) return [];
    
    const inputExtension = selectedFile.name.split('.').pop().toLowerCase();
    
    // Filter out the current format and premium formats if not premium user
    return documentFormats.filter(format => {
      if (format.value === inputExtension) return false;
      if (format.premium && !isPremium) return false;
      return true;
    });
  };

  const simulateConversion = async () => {
    if (!selectedFile || !outputFormat) return;

    setIsProcessing(true);
    setError(null);

    try {
      // Simulate conversion process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Create a mock converted file
      const originalName = selectedFile.name.split('.').slice(0, -1).join('.');
      const mockContent = `Converted ${selectedFile.name} to ${outputFormat.toUpperCase()} format\n\nThis is a demo conversion.`;
      
      const blob = new Blob([mockContent], { 
        type: outputFormat === 'pdf' ? 'application/pdf' : 'text/plain' 
      });
      
      setConvertedFile({
        blob,
        filename: `${originalName}.${outputFormat}`,
        originalSize: selectedFile.size,
        convertedSize: blob.size
      });
    } catch (err) {
      setError('Conversion failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadFile = () => {
    if (!convertedFile) return;
    
    const url = URL.createObjectURL(convertedFile.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = convertedFile.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const resetConverter = () => {
    setSelectedFile(null);
    setOutputFormat('');
    setConvertedFile(null);
    setError(null);
    setIsProcessing(false);
  };

  const handleUpgradeClick = () => {
    // Get Pro plan from payment service
    const servicePlans = paymentService.getAllPlans();
    const proPlan = servicePlans.find(p => p.id === 'pro');
    
    if (proPlan) {
      setSelectedPlan(proPlan);
      setCheckoutModalOpen(true);
    }
  };

  const handleCheckoutSuccess = (subscription) => {
    setCheckoutModalOpen(false);
    
    // Call the parent onUpgrade function if provided
    if (onUpgrade) {
      onUpgrade(subscription.planId, subscription);
    }
    
    // Show success message or reload page
    alert('Upgrade successful! You now have access to all premium document formats.');
  };

  return (
    <div className="document-converter">
      <div className="converter-header">
        <h3>📄 Document Converter</h3>
        <p>Convert between PDF, Word, Text, and other document formats</p>
      </div>

      {/* File Upload Area */}
      <div 
        className={`doc-dropzone ${selectedFile ? 'has-file' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => document.getElementById('doc-file-input').click()}
      >
        <input
          id="doc-file-input"
          type="file"
          accept=".pdf,.doc,.docx,.txt,.rtf,.html,.epub,.mobi,.odt"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
        
        {selectedFile ? (
          <div className="selected-file">
            <div className="file-icon">
              {selectedFile.name.endsWith('.pdf') ? '📄' : 
               selectedFile.name.match(/\.(doc|docx)$/i) ? '📝' : 
               selectedFile.name.endsWith('.txt') ? '📃' : '📋'}
            </div>
            <div className="file-details">
              <h4>{selectedFile.name}</h4>
              <p>{(selectedFile.size / 1024).toFixed(1)} KB</p>
            </div>
            <button className="remove-file" onClick={(e) => {
              e.stopPropagation();
              resetConverter();
            }}>×</button>
          </div>
        ) : (
          <div className="upload-prompt">
            <div className="upload-icon">📄</div>
            <p>Drop document files here or click to browse</p>
            <p className="supported-formats">
              Supports: PDF, DOC, DOCX, TXT, RTF, HTML, EPUB, ODT
            </p>
          </div>
        )}
      </div>

      {/* Format Selection */}
      {selectedFile && (
        <div className="format-selection">
          <h4>Convert to:</h4>
          <div className="format-grid">
            {getAvailableFormats().map((format) => (
              <button
                key={format.value}
                className={`format-option ${outputFormat === format.value ? 'selected' : ''} ${format.premium ? 'premium' : ''}`}
                onClick={() => setOutputFormat(format.value)}
                disabled={format.premium && !isPremium}
              >
                <span className="format-icon">{format.icon}</span>
                <span className="format-label">{format.label}</span>
                {format.premium && !isPremium && <span className="premium-badge">PRO</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Convert Button */}
      {selectedFile && outputFormat && (
        <div className="convert-section">
          <button
            className="convert-document-btn"
            onClick={simulateConversion}
            disabled={isProcessing}
          >
            {isProcessing ? 'Converting...' : `Convert to ${outputFormat.toUpperCase()}`}
          </button>
        </div>
      )}

      {/* Progress Indicator */}
      {isProcessing && (
        <div className="conversion-progress">
          <div className="progress-spinner"></div>
          <p>Converting your document...</p>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="error-display">
          <p>❌ {error}</p>
        </div>
      )}

      {/* Download Result */}
      {convertedFile && (
        <div className="conversion-result">
          <div className="result-header">
            <h4>✅ Conversion Complete!</h4>
          </div>
          <div className="result-details">
            <p><strong>Output:</strong> {convertedFile.filename}</p>
            <p><strong>Size:</strong> {(convertedFile.convertedSize / 1024).toFixed(1)} KB</p>
          </div>
          <div className="result-actions">
            <button className="download-btn" onClick={downloadFile}>
              📥 Download File
            </button>
            <button className="convert-another-btn" onClick={resetConverter}>
              🔄 Convert Another
            </button>
          </div>
        </div>
      )}

      {/* Premium Upsell */}
      {!isPremium && (
        <div className="premium-upsell">
          <h4>🌟 Unlock More Formats</h4>
          <p>Upgrade to Premium for EPUB, MOBI, ODT, and advanced conversion options</p>
          <button className="upgrade-cta" onClick={handleUpgradeClick}>
            Upgrade Now - $9.99/month
          </button>
        </div>
      )}

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={checkoutModalOpen}
        onClose={() => setCheckoutModalOpen(false)}
        selectedPlan={selectedPlan}
        onSuccess={handleCheckoutSuccess}
      />
    </div>
  );
};

export default DocumentConverter;