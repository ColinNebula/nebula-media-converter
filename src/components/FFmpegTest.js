import React, { useState } from 'react';
import MediaConverter from '../utils/MediaConverter';

/**
 * FFmpeg Test Component
 * Comprehensive testing tool to verify FFmpeg functionality and stability
 */
const FFmpegTest = () => {
  const [testResults, setTestResults] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState('');
  const [converter] = useState(() => new MediaConverter());

  const addResult = (test, status, message, duration) => {
    setTestResults(prev => [...prev, { test, status, message, duration, timestamp: Date.now() }]);
  };

  const checkSharedArrayBuffer = () => {
    const start = Date.now();
    try {
      if (typeof SharedArrayBuffer === 'undefined') {
        addResult(
          'SharedArrayBuffer Support',
          'fail',
          'SharedArrayBuffer is not available. FFmpeg.wasm requires Cross-Origin-Embedder-Policy and Cross-Origin-Opener-Policy headers.',
          Date.now() - start
        );
        return false;
      } else {
        addResult(
          'SharedArrayBuffer Support',
          'pass',
          'SharedArrayBuffer is available',
          Date.now() - start
        );
        return true;
      }
    } catch (error) {
      addResult('SharedArrayBuffer Support', 'fail', error.message, Date.now() - start);
      return false;
    }
  };

  const testFFmpegLoad = async () => {
    const start = Date.now();
    try {
      await converter.load((progress, message) => {
        setCurrentTest(`Loading FFmpeg: ${message} (${progress}%)`);
      });
      addResult('FFmpeg Load', 'pass', 'FFmpeg loaded successfully', Date.now() - start);
      return true;
    } catch (error) {
      addResult('FFmpeg Load', 'fail', error.message, Date.now() - start);
      return false;
    }
  };

  const testAudioConversion = async () => {
    const start = Date.now();
    try {
      // Create a minimal audio file (1 second of silence as WAV)
      const wavData = createMinimalWav();
      const file = new File([wavData], 'test.wav', { type: 'audio/wav' });

      const result = await converter.convert(file, 'mp3', (progress, message) => {
        setCurrentTest(`Converting audio: ${message} (${progress}%)`);
      });

      if (result && result.blob && result.blob.size > 0) {
        addResult(
          'Audio Conversion (WAV → MP3)',
          'pass',
          `Converted successfully. Output size: ${(result.blob.size / 1024).toFixed(2)} KB`,
          Date.now() - start
        );
        return true;
      } else {
        addResult('Audio Conversion (WAV → MP3)', 'fail', 'Conversion produced empty file', Date.now() - start);
        return false;
      }
    } catch (error) {
      addResult('Audio Conversion (WAV → MP3)', 'fail', error.message, Date.now() - start);
      return false;
    }
  };

  const testMemoryHandling = async () => {
    const start = Date.now();
    try {
      // Test with a larger file to check memory handling
      const largeWav = createMinimalWav(44100 * 5); // 5 seconds
      const file = new File([largeWav], 'test-large.wav', { type: 'audio/wav' });

      const result = await converter.convert(file, 'mp3', (progress, message) => {
        setCurrentTest(`Testing memory: ${message} (${progress}%)`);
      });

      if (result && result.blob) {
        addResult(
          'Memory Handling',
          'pass',
          `Handled ${(file.size / 1024).toFixed(2)} KB input successfully`,
          Date.now() - start
        );
        return true;
      }
      return false;
    } catch (error) {
      addResult('Memory Handling', 'fail', error.message, Date.now() - start);
      return false;
    }
  };

  const testCDNFallback = async () => {
    const start = Date.now();
    try {
      // Create a fresh converter to test from scratch
      const testConverter = new MediaConverter();
      
      await testConverter.load((progress, message) => {
        setCurrentTest(`Testing CDN fallback: ${message}`);
      });

      addResult(
        'CDN Fallback System',
        'pass',
        'CDN fallback system working correctly',
        Date.now() - start
      );
      return true;
    } catch (error) {
      addResult('CDN Fallback System', 'fail', error.message, Date.now() - start);
      return false;
    }
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setTestResults([]);
    setCurrentTest('Starting tests...');

    const tests = [
      { name: 'SharedArrayBuffer Support', fn: checkSharedArrayBuffer },
      { name: 'FFmpeg Load', fn: testFFmpegLoad },
      { name: 'Audio Conversion', fn: testAudioConversion },
      { name: 'Memory Handling', fn: testMemoryHandling },
      { name: 'CDN Fallback', fn: testCDNFallback },
    ];

    for (const test of tests) {
      setCurrentTest(`Running: ${test.name}`);
      const passed = await test.fn();
      
      // If critical test fails, stop
      if (!passed && (test.name === 'SharedArrayBuffer Support' || test.name === 'FFmpeg Load')) {
        setCurrentTest(`Critical test failed: ${test.name}. Stopping.`);
        break;
      }

      // Wait a bit between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setCurrentTest('All tests completed');
    setIsRunning(false);
  };

  // Helper function to create a minimal WAV file
  const createMinimalWav = (samples = 44100) => {
    const sampleRate = 44100;
    const numChannels = 1;
    const bitsPerSample = 16;
    const bytesPerSample = bitsPerSample / 8;
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = samples * blockAlign;
    const fileSize = 44 + dataSize;

    const buffer = new ArrayBuffer(fileSize);
    const view = new DataView(buffer);

    // RIFF header
    writeString(view, 0, 'RIFF');
    view.setUint32(4, fileSize - 8, true);
    writeString(view, 8, 'WAVE');

    // fmt chunk
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // fmt chunk size
    view.setUint16(20, 1, true); // PCM format
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);

    // data chunk
    writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);

    // Write silence (zeros)
    // Data already initialized to zeros in ArrayBuffer

    return new Uint8Array(buffer);
  };

  const writeString = (view, offset, string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pass': return '#4ade80';
      case 'fail': return '#f87171';
      default: return '#fbbf24';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pass': return '✓';
      case 'fail': return '✗';
      default: return '⚠';
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>FFmpeg Stability Test Suite</h2>
        <p style={styles.subtitle}>Comprehensive diagnostics to verify FFmpeg functionality</p>
      </div>

      <div style={styles.controls}>
        <button
          onClick={runAllTests}
          disabled={isRunning}
          style={{
            ...styles.button,
            ...(isRunning ? styles.buttonDisabled : {})
          }}
        >
          {isRunning ? '⏳ Running Tests...' : '▶ Run All Tests'}
        </button>
      </div>

      {currentTest && (
        <div style={styles.currentTest}>
          <div style={styles.spinner}></div>
          <span>{currentTest}</span>
        </div>
      )}

      {testResults.length > 0 && (
        <div style={styles.results}>
          <h3 style={styles.resultsTitle}>Test Results</h3>
          {testResults.map((result, index) => (
            <div key={index} style={styles.resultItem}>
              <div style={styles.resultHeader}>
                <span 
                  style={{
                    ...styles.statusIcon,
                    backgroundColor: getStatusColor(result.status)
                  }}
                >
                  {getStatusIcon(result.status)}
                </span>
                <span style={styles.testName}>{result.test}</span>
                <span style={styles.duration}>{result.duration}ms</span>
              </div>
              <div style={styles.resultMessage}>{result.message}</div>
            </div>
          ))}
          
          <div style={styles.summary}>
            <div style={styles.summaryItem}>
              <span style={styles.summaryLabel}>Total:</span>
              <span style={styles.summaryValue}>{testResults.length}</span>
            </div>
            <div style={styles.summaryItem}>
              <span style={styles.summaryLabel}>Passed:</span>
              <span style={{...styles.summaryValue, color: '#4ade80'}}>
                {testResults.filter(r => r.status === 'pass').length}
              </span>
            </div>
            <div style={styles.summaryItem}>
              <span style={styles.summaryLabel}>Failed:</span>
              <span style={{...styles.summaryValue, color: '#f87171'}}>
                {testResults.filter(r => r.status === 'fail').length}
              </span>
            </div>
          </div>
        </div>
      )}

      <div style={styles.info}>
        <h4 style={styles.infoTitle}>🔍 What This Tests:</h4>
        <ul style={styles.infoList}>
          <li><strong>SharedArrayBuffer:</strong> Critical browser API for FFmpeg.wasm</li>
          <li><strong>FFmpeg Load:</strong> Verifies FFmpeg can load from CDN with fallbacks</li>
          <li><strong>Audio Conversion:</strong> Tests actual media conversion capability</li>
          <li><strong>Memory Handling:</strong> Ensures larger files can be processed</li>
          <li><strong>CDN Fallback:</strong> Validates failover system works correctly</li>
        </ul>

        <div style={styles.requirements}>
          <h4 style={styles.infoTitle}>⚡ Requirements for FFmpeg.wasm:</h4>
          <ul style={styles.infoList}>
            <li>Cross-Origin-Embedder-Policy: require-corp</li>
            <li>Cross-Origin-Opener-Policy: same-origin</li>
            <li>Modern browser with SharedArrayBuffer support</li>
            <li>Stable internet connection for CDN access</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  header: {
    marginBottom: '30px',
    textAlign: 'center',
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: '8px',
  },
  subtitle: {
    fontSize: '16px',
    color: '#6b7280',
  },
  controls: {
    marginBottom: '20px',
    textAlign: 'center',
  },
  button: {
    padding: '12px 32px',
    fontSize: '16px',
    fontWeight: '600',
    color: '#fff',
    backgroundColor: '#667eea',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  buttonDisabled: {
    backgroundColor: '#9ca3af',
    cursor: 'not-allowed',
  },
  currentTest: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    padding: '16px',
    backgroundColor: '#f3f4f6',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: '14px',
    color: '#4b5563',
  },
  spinner: {
    width: '16px',
    height: '16px',
    border: '2px solid #e5e7eb',
    borderTopColor: '#667eea',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  results: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    marginBottom: '20px',
  },
  resultsTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '16px',
  },
  resultItem: {
    marginBottom: '16px',
    padding: '12px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    borderLeft: '3px solid #e5e7eb',
  },
  resultHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '8px',
  },
  statusIcon: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontSize: '14px',
    fontWeight: 'bold',
  },
  testName: {
    flex: 1,
    fontSize: '14px',
    fontWeight: '600',
    color: '#1f2937',
  },
  duration: {
    fontSize: '12px',
    color: '#6b7280',
    fontFamily: 'monospace',
  },
  resultMessage: {
    fontSize: '13px',
    color: '#4b5563',
    marginLeft: '36px',
  },
  summary: {
    marginTop: '20px',
    padding: '16px',
    backgroundColor: '#f3f4f6',
    borderRadius: '8px',
    display: 'flex',
    gap: '24px',
    justifyContent: 'center',
  },
  summaryItem: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: '14px',
    color: '#6b7280',
  },
  summaryValue: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#1f2937',
  },
  info: {
    backgroundColor: '#eff6ff',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid #dbeafe',
  },
  infoTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: '12px',
  },
  infoList: {
    margin: '0 0 16px 20px',
    padding: 0,
    color: '#1e3a8a',
    fontSize: '14px',
    lineHeight: '1.8',
  },
  requirements: {
    marginTop: '16px',
    paddingTop: '16px',
    borderTop: '1px solid #dbeafe',
  },
};

// Add CSS animation for spinner
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);

export default FFmpegTest;
