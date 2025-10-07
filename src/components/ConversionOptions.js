import React from 'react';
import './ConversionOptions.css';

const ConversionOptions = ({ selectedFile, outputFormat, setOutputFormat, onConvert, isProcessing }) => {
  const getFileType = (file) => {
    if (file.type.startsWith('video/')) return 'video';
    if (file.type.startsWith('audio/')) return 'audio';
    if (file.type.startsWith('image/')) return 'image';
    return 'unknown';
  };

  const fileType = selectedFile ? getFileType(selectedFile) : null;

  const videoFormats = [
    { value: 'mp4', label: 'MP4' },
    { value: 'avi', label: 'AVI' },
    { value: 'mov', label: 'MOV' },
    { value: 'mkv', label: 'MKV' },
    { value: 'webm', label: 'WebM' },
    { value: 'mp3', label: 'MP3 (Audio Only)' },
    { value: 'wav', label: 'WAV (Audio Only)' }
  ];

  const audioFormats = [
    { value: 'mp3', label: 'MP3' },
    { value: 'wav', label: 'WAV' },
    { value: 'flac', label: 'FLAC' },
    { value: 'aac', label: 'AAC' },
    { value: 'ogg', label: 'OGG' },
    { value: 'm4a', label: 'M4A' }
  ];

  const imageFormats = [
    { value: 'jpg', label: 'JPEG' },
    { value: 'png', label: 'PNG' },
    { value: 'gif', label: 'GIF' },
    { value: 'bmp', label: 'BMP' },
    { value: 'webp', label: 'WebP' }
  ];

  const getFormats = () => {
    switch (fileType) {
      case 'video': return videoFormats;
      case 'audio': return audioFormats;
      case 'image': return imageFormats;
      default: return [];
    }
  };

  const formats = getFormats();

  if (!selectedFile) return null;

  return (
    <div className="conversion-options">
      <h3>Convert {selectedFile.name}</h3>
      <div className="file-info">
        <p><strong>File size:</strong> {(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
        <p><strong>File type:</strong> {selectedFile.type}</p>
      </div>
      
      <div className="format-selection">
        <label htmlFor="output-format">Convert to:</label>
        <select 
          id="output-format"
          value={outputFormat} 
          onChange={(e) => setOutputFormat(e.target.value)}
          disabled={isProcessing}
        >
          <option value="">Select output format</option>
          {formats.map(format => (
            <option key={format.value} value={format.value}>
              {format.label}
            </option>
          ))}
        </select>
      </div>

      <button 
        className="convert-btn"
        onClick={onConvert}
        disabled={!outputFormat || isProcessing}
      >
        {isProcessing ? 'Converting...' : 'Start Conversion'}
      </button>
    </div>
  );
};

export default ConversionOptions;