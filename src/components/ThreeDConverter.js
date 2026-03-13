import React, { useState } from 'react';
import './ThreeDConverter.css';
import paymentService from '../services/PaymentService';
import CheckoutModal from './CheckoutModal';
import threeDConverter from '../utils/ThreeDConverter';

const FORMAT_ICONS = {
  obj:  '📦',
  fbx:  '🎬',
  gltf: '🌐',
  glb:  '🌐',
  stl:  '🖨️',
  ply:  '☁️',
  dae:  '🎨',
};

const INPUT_FORMATS = [
  { ext: 'obj',  label: 'OBJ',          desc: 'Wavefront Object' },
  { ext: 'fbx',  label: 'FBX',          desc: 'Autodesk FBX' },
  { ext: 'gltf', label: 'glTF',         desc: 'GL Transmission Format' },
  { ext: 'glb',  label: 'GLB',          desc: 'glTF Binary' },
  { ext: 'stl',  label: 'STL',          desc: '3D Print / Stereolithography' },
  { ext: 'dae',  label: 'DAE',          desc: 'COLLADA' },
  { ext: 'ply',  label: 'PLY',          desc: 'Stanford Polygon' },
];

const OUTPUT_FORMAT_LABELS = {
  obj:  'Wavefront OBJ',
  gltf: 'glTF 2.0 (JSON)',
  glb:  'glTF Binary (GLB)',
  stl:  'STL (3D Print)',
  ply:  'Stanford PLY',
};

const ThreeDConverterComponent = ({ isPremium, onUpgrade }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [outputFormat, setOutputFormat] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [convertedFile, setConvertedFile] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);

  // ─── Locked state for non-premium users ─────────────────────────────────────

  if (!isPremium) {
    return (
      <div className="threed-converter locked">
        <div className="locked-overlay">
          <div className="lock-icon">🔒</div>
          <h3>3D Model Converter</h3>
          <p>Convert between OBJ, FBX, glTF/GLB, STL, DAE, and PLY formats</p>
          <ul className="locked-features">
            <li>✓ OBJ → glTF / GLB / STL / PLY</li>
            <li>✓ FBX → glTF / GLB / OBJ / STL</li>
            <li>✓ STL → glTF / GLB / OBJ (3D printing workflow)</li>
            <li>✓ COLLADA (DAE) → glTF / GLB / OBJ</li>
            <li>✓ PLY point cloud ↔  mesh formats</li>
          </ul>
          <button className="upgrade-btn" onClick={() => {
            const plans = paymentService.getAllPlans();
            const pro = plans.find(p => p.id === 'pro');
            if (pro) { setSelectedPlan(pro); setCheckoutModalOpen(true); }
          }}>
            🚀 Upgrade to Pro
          </button>
        </div>

        {checkoutModalOpen && selectedPlan && (
          <CheckoutModal
            plan={selectedPlan}
            onSuccess={(sub) => {
              setCheckoutModalOpen(false);
              if (onUpgrade) onUpgrade(sub.planId, sub);
            }}
            onClose={() => setCheckoutModalOpen(false)}
          />
        )}
      </div>
    );
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  const inputExt = selectedFile
    ? selectedFile.name.split('.').pop().toLowerCase()
    : null;

  const availableOutputs = inputExt
    ? threeDConverter.getSupportedOutputFormats(inputExt)
    : [];

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // ─── Event handlers ─────────────────────────────────────────────────────────

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    acceptFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    acceptFile(file);
  };

  const acceptFile = (file) => {
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!threeDConverter.acceptedExtensions.includes(ext)) {
      setError(`Unsupported format "${ext}". Accepted: ${threeDConverter.acceptedExtensions.join(', ')}`);
      return;
    }
    setSelectedFile(file);
    setOutputFormat('');
    setConvertedFile(null);
    setError(null);
  };

  const handleDragOver = (e) => e.preventDefault();

  const performConversion = async () => {
    if (!selectedFile || !outputFormat) return;

    setIsProcessing(true);
    setError(null);
    setProgress(0);
    setProgressMessage('Starting...');

    try {
      const result = await threeDConverter.convert(
        selectedFile,
        outputFormat,
        (pct, msg) => { setProgress(pct); setProgressMessage(msg); }
      );
      setConvertedFile(result);
    } catch (err) {
      console.error('3D conversion error:', err);
      setError(err.message || 'Conversion failed. Please try again.');
    } finally {
      setIsProcessing(false);
      setProgress(0);
      setProgressMessage('');
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

  const reset = () => {
    setSelectedFile(null);
    setOutputFormat('');
    setConvertedFile(null);
    setError(null);
    setIsProcessing(false);
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="threed-converter">
      <div className="converter-header">
        <h3>🗿 3D Model Converter <span className="pro-badge">PRO</span></h3>
        <p>Convert between OBJ, FBX, glTF/GLB, STL, COLLADA, and PLY — entirely in your browser</p>
      </div>

      {/* Supported formats legend */}
      <div className="format-legend">
        {INPUT_FORMATS.map(f => (
          <div
            key={f.ext}
            className={`format-chip ${inputExt === f.ext ? 'active' : ''}`}
            title={f.desc}
          >
            {FORMAT_ICONS[f.ext]} {f.label}
          </div>
        ))}
      </div>

      {/* Drop zone */}
      <div
        className={`threed-dropzone ${selectedFile ? 'has-file' : ''} ${isProcessing ? 'disabled' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => !isProcessing && document.getElementById('threed-file-input').click()}
      >
        <input
          id="threed-file-input"
          type="file"
          accept={threeDConverter.acceptAttribute}
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />

        {selectedFile ? (
          <div className="selected-file">
            <div className="file-icon-large">{FORMAT_ICONS[inputExt] || '📦'}</div>
            <div className="file-details">
              <h4>{selectedFile.name}</h4>
              <p>{formatFileSize(selectedFile.size)} &nbsp;•&nbsp; {inputExt?.toUpperCase()}</p>
            </div>
            <button
              className="remove-file"
              onClick={(e) => { e.stopPropagation(); reset(); }}
              disabled={isProcessing}
            >
              ×
            </button>
          </div>
        ) : (
          <div className="upload-prompt">
            <div className="upload-icon">🗿</div>
            <p>Drop a 3D file here or <span className="browse-link">click to browse</span></p>
            <p className="supported-formats">
              OBJ • FBX • glTF • GLB • STL • DAE • PLY
            </p>
          </div>
        )}
      </div>

      {/* Output format selection */}
      {selectedFile && !convertedFile && (
        <div className="format-selection">
          <h4>Convert to:</h4>
          {availableOutputs.length === 0 ? (
            <p className="no-formats">No output formats available for this file type.</p>
          ) : (
            <div className="format-grid">
              {availableOutputs.map(fmt => (
                <button
                  key={fmt}
                  className={`format-option ${outputFormat === fmt ? 'selected' : ''}`}
                  onClick={() => setOutputFormat(fmt)}
                  disabled={isProcessing}
                >
                  <span className="format-icon">{FORMAT_ICONS[fmt] || '📄'}</span>
                  <span className="format-label">{fmt.toUpperCase()}</span>
                  <span className="format-desc">{OUTPUT_FORMAT_LABELS[fmt] || ''}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Convert button */}
      {selectedFile && outputFormat && !convertedFile && (
        <div className="convert-section">
          <button
            className="convert-3d-btn"
            onClick={performConversion}
            disabled={isProcessing}
          >
            {isProcessing ? 'Converting...' : `Convert to ${outputFormat.toUpperCase()}`}
          </button>
        </div>
      )}

      {/* Progress */}
      {isProcessing && (
        <div className="conversion-progress">
          <div className="progress-bar-container">
            <div className="progress-bar" style={{ width: `${progress}%` }} />
          </div>
          <div className="progress-info">
            <span>{progressMessage}</span>
            <span>{progress}%</span>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="error-display">
          <p>❌ {error}</p>
          <button className="dismiss-error" onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      {/* Result */}
      {convertedFile && (
        <div className="conversion-result">
          <div className="result-header">
            <h4>✅ Conversion Complete!</h4>
          </div>
          <div className="result-details">
            <p><strong>Output file:</strong> {convertedFile.filename}</p>
            <p>
              <strong>Original size:</strong> {formatFileSize(convertedFile.originalSize)}
              &nbsp;→&nbsp;
              <strong>Converted:</strong> {formatFileSize(convertedFile.convertedSize)}
            </p>
          </div>
          <div className="result-actions">
            <button className="download-btn" onClick={downloadFile}>
              📥 Download {convertedFile.filename.split('.').pop().toUpperCase()}
            </button>
            <button className="convert-another-btn" onClick={reset}>
              🔄 Convert Another
            </button>
          </div>
        </div>
      )}

      {/* Notes */}
      <div className="converter-notes">
        <details>
          <summary>ℹ️ Format notes & limitations</summary>
          <ul>
            <li><strong>FBX input</strong> — animations and skinned meshes are preserved where supported; FBX export is not available (proprietary format).</li>
            <li><strong>glTF / GLB</strong> — the recommended open standard for real-time 3D; GLB is the binary (single-file) variant.</li>
            <li><strong>STL</strong> — geometry only, no materials or colours; ideal for 3D printing workflows.</li>
            <li><strong>PLY</strong> — supports vertex colours (point clouds); exported as ASCII PLY.</li>
            <li><strong>OBJ</strong> — geometry and UV data exported; material library (.mtl) is not bundled.</li>
            <li>All conversion happens in your browser — no files are uploaded to a server.</li>
          </ul>
        </details>
      </div>
    </div>
  );
};

export default ThreeDConverterComponent;
