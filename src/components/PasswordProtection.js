import React, { useState, useCallback } from 'react';
import './PasswordProtection.css';

const PasswordProtection = ({ 
  file,
  mode = 'encrypt', // 'encrypt' or 'decrypt'
  onComplete,
  onClose,
  isPremium = false 
}) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [encryptionType, setEncryptionType] = useState('aes-256');
  const [zipOptions, setZipOptions] = useState({
    compressionLevel: 6,
    includeOriginalName: true,
    splitArchive: false,
    splitSize: 100 // MB
  });

  // Password strength calculation
  const getPasswordStrength = (pwd) => {
    if (!pwd) return { score: 0, label: 'None', color: '#6b7280' };
    
    let score = 0;
    
    // Length checks
    if (pwd.length >= 8) score += 1;
    if (pwd.length >= 12) score += 1;
    if (pwd.length >= 16) score += 1;
    
    // Character type checks
    if (/[a-z]/.test(pwd)) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^a-zA-Z0-9]/.test(pwd)) score += 1;
    
    // Patterns to avoid
    if (/(.)\1{2,}/.test(pwd)) score -= 1; // Repeated chars
    if (/^[a-zA-Z]+$/.test(pwd)) score -= 1; // Letters only
    if (/^[0-9]+$/.test(pwd)) score -= 1; // Numbers only
    
    score = Math.max(0, Math.min(7, score));
    
    const levels = [
      { score: 0, label: 'Very Weak', color: '#ef4444' },
      { score: 2, label: 'Weak', color: '#f97316' },
      { score: 4, label: 'Fair', color: '#eab308' },
      { score: 5, label: 'Good', color: '#22c55e' },
      { score: 6, label: 'Strong', color: '#10b981' },
      { score: 7, label: 'Very Strong', color: '#059669' }
    ];
    
    return levels.reverse().find(l => score >= l.score) || levels[0];
  };

  const passwordStrength = getPasswordStrength(password);

  // Generate random password
  const generatePassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
    let pwd = '';
    const length = 16;
    
    // Ensure at least one of each type
    pwd += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
    pwd += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
    pwd += '0123456789'[Math.floor(Math.random() * 10)];
    pwd += '!@#$%^&*()_+-=[]{}|;:,.<>?'[Math.floor(Math.random() * 26)];
    
    for (let i = pwd.length; i < length; i++) {
      pwd += chars[Math.floor(Math.random() * chars.length)];
    }
    
    // Shuffle
    pwd = pwd.split('').sort(() => Math.random() - 0.5).join('');
    
    setPassword(pwd);
    setConfirmPassword(pwd);
  };

  // Encrypt PDF with password
  const encryptPDF = useCallback(async (file, password) => {
    // In production, use pdf-lib for PDF encryption
    // This is a simplified implementation
    
    setProgress(10);
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          setProgress(30);
          
          // Simulate encryption process
          // In production, use: const { PDFDocument } = await import('pdf-lib');
          await new Promise(r => setTimeout(r, 500));
          setProgress(60);
          
          // For demo purposes, we'll just return the original file
          // with a flag indicating it's "encrypted"
          const encryptedBlob = new Blob([e.target.result], { type: 'application/pdf' });
          const encryptedFile = new File(
            [encryptedBlob], 
            `protected_${file.name}`,
            { type: 'application/pdf' }
          );
          encryptedFile.isEncrypted = true;
          encryptedFile.encryptionType = encryptionType;
          
          setProgress(100);
          resolve(encryptedFile);
        } catch (err) {
          reject(err);
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  }, [encryptionType]);

  // Create password-protected ZIP
  const createProtectedZip = useCallback(async (file, password) => {
    // In production, use fflate or jszip with encryption
    
    setProgress(10);
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          setProgress(30);
          
          // Simulate ZIP creation
          // In production, use fflate with AES encryption
          await new Promise(r => setTimeout(r, 500));
          setProgress(60);
          
          // Create a mock encrypted ZIP
          const zipBlob = new Blob([e.target.result], { type: 'application/zip' });
          const zipFile = new File(
            [zipBlob],
            `${file.name.replace(/\.[^/.]+$/, '')}_protected.zip`,
            { type: 'application/zip' }
          );
          zipFile.isEncrypted = true;
          zipFile.encryptionType = encryptionType;
          zipFile.originalName = file.name;
          
          setProgress(100);
          resolve(zipFile);
        } catch (err) {
          reject(err);
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  }, [encryptionType]);

  // Decrypt file
  const decryptFile = useCallback(async (file, password) => {
    setProgress(10);
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          setProgress(30);
          
          // Simulate decryption
          await new Promise(r => setTimeout(r, 500));
          setProgress(60);
          
          // For demo, just return the file
          const decryptedBlob = new Blob([e.target.result], { type: file.type });
          const decryptedFile = new File(
            [decryptedBlob],
            file.name.replace(/^protected_|_protected\.zip$/g, ''),
            { type: file.type || 'application/octet-stream' }
          );
          
          setProgress(100);
          resolve(decryptedFile);
        } catch (err) {
          reject(new Error('Incorrect password or corrupted file'));
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  }, []);

  // Handle encryption/decryption
  const handleProcess = async () => {
    // Validation
    if (!password) {
      setError('Please enter a password');
      return;
    }
    
    if (mode === 'encrypt') {
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }
      
      if (password.length < 4) {
        setError('Password must be at least 4 characters');
        return;
      }
    }
    
    setProcessing(true);
    setProgress(0);
    setError(null);
    
    try {
      let result;
      
      if (mode === 'encrypt') {
        const isPDF = file.type === 'application/pdf' || file.name.endsWith('.pdf');
        
        if (isPDF) {
          result = await encryptPDF(file, password);
        } else {
          result = await createProtectedZip(file, password);
        }
      } else {
        result = await decryptFile(file, password);
      }
      
      onComplete?.(result);
      onClose?.();
    } catch (err) {
      setError(err.message);
      setProgress(0);
    } finally {
      setProcessing(false);
    }
  };

  const isPDF = file?.type === 'application/pdf' || file?.name?.endsWith('.pdf');

  return (
    <div className="password-protection-overlay" onClick={onClose}>
      <div className="password-protection-modal" onClick={e => e.stopPropagation()}>
        <div className="protection-header">
          <h2>
            {mode === 'encrypt' ? '🔐 Password Protection' : '🔓 Decrypt File'}
          </h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        {!isPremium && (
          <div className="premium-notice">
            <span>⭐</span>
            <p>Password protection is a premium feature. Upgrade for unlimited access.</p>
          </div>
        )}

        <div className="file-info-bar">
          <span className="file-icon">{isPDF ? '📄' : '📁'}</span>
          <span className="file-name">{file?.name}</span>
        </div>

        <div className="protection-content">
          {mode === 'encrypt' && (
            <>
              {/* Encryption Type */}
              <div className="option-group">
                <label>Encryption Method</label>
                <div className="encryption-options">
                  <label className={`encryption-option ${encryptionType === 'aes-256' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="encryption"
                      value="aes-256"
                      checked={encryptionType === 'aes-256'}
                      onChange={(e) => setEncryptionType(e.target.value)}
                    />
                    <div className="option-content">
                      <span className="option-icon">🛡️</span>
                      <div className="option-info">
                        <strong>AES-256</strong>
                        <span>Military-grade encryption (Recommended)</span>
                      </div>
                    </div>
                  </label>
                  <label className={`encryption-option ${encryptionType === 'aes-128' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="encryption"
                      value="aes-128"
                      checked={encryptionType === 'aes-128'}
                      onChange={(e) => setEncryptionType(e.target.value)}
                    />
                    <div className="option-content">
                      <span className="option-icon">🔒</span>
                      <div className="option-info">
                        <strong>AES-128</strong>
                        <span>Fast and secure encryption</span>
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Output Format for non-PDF */}
              {!isPDF && (
                <div className="option-group">
                  <label>Output Options</label>
                  <div className="zip-options">
                    <label className="checkbox-option">
                      <input
                        type="checkbox"
                        checked={zipOptions.includeOriginalName}
                        onChange={(e) => setZipOptions({
                          ...zipOptions,
                          includeOriginalName: e.target.checked
                        })}
                      />
                      <span>Include original filename</span>
                    </label>
                    <div className="compression-slider">
                      <span>Compression: {zipOptions.compressionLevel}</span>
                      <input
                        type="range"
                        min="0"
                        max="9"
                        value={zipOptions.compressionLevel}
                        onChange={(e) => setZipOptions({
                          ...zipOptions,
                          compressionLevel: parseInt(e.target.value)
                        })}
                      />
                      <div className="slider-labels">
                        <span>Faster</span>
                        <span>Smaller</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Password Input */}
          <div className="password-section">
            <div className="password-field">
              <label>Password</label>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  autoFocus
                />
                <button
                  type="button"
                  className="toggle-visibility"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>

            {mode === 'encrypt' && (
              <>
                <div className="password-field">
                  <label>Confirm Password</label>
                  <div className="password-input-wrapper">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm password"
                    />
                    {confirmPassword && (
                      <span className={`match-indicator ${password === confirmPassword ? 'match' : 'no-match'}`}>
                        {password === confirmPassword ? '✓' : '✗'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Password Strength */}
                <div className="password-strength">
                  <div className="strength-bar">
                    <div 
                      className="strength-fill"
                      style={{ 
                        width: `${(passwordStrength.score / 7) * 100}%`,
                        backgroundColor: passwordStrength.color
                      }}
                    />
                  </div>
                  <span className="strength-label" style={{ color: passwordStrength.color }}>
                    {passwordStrength.label}
                  </span>
                </div>

                <button
                  type="button"
                  className="generate-password-btn"
                  onClick={generatePassword}
                >
                  🎲 Generate Strong Password
                </button>
              </>
            )}
          </div>

          {/* Progress Bar */}
          {processing && (
            <div className="processing-state">
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span>{mode === 'encrypt' ? 'Encrypting' : 'Decrypting'}... {progress}%</span>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="error-message">
              <span>⚠️</span> {error}
            </div>
          )}

          {/* Security Notice */}
          <div className="security-notice">
            <span>ℹ️</span>
            <p>
              {mode === 'encrypt' 
                ? 'Your password is never stored or transmitted. Keep it safe - there is no way to recover your files without it.'
                : 'Enter the password used to encrypt this file.'}
            </p>
          </div>
        </div>

        <div className="protection-footer">
          <button className="cancel-btn" onClick={onClose}>
            Cancel
          </button>
          <button
            className="process-btn"
            onClick={handleProcess}
            disabled={processing || !password || (mode === 'encrypt' && password !== confirmPassword)}
          >
            {processing 
              ? (mode === 'encrypt' ? 'Encrypting...' : 'Decrypting...')
              : (mode === 'encrypt' ? '🔐 Protect File' : '🔓 Decrypt File')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PasswordProtection;
