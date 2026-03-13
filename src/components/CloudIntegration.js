import React, { useState, useEffect, useCallback } from 'react';
import './CloudIntegration.css';

// Google Drive API configuration
const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || '';
const GOOGLE_API_KEY = process.env.REACT_APP_GOOGLE_API_KEY || '';
const GOOGLE_SCOPES = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.readonly';

// Dropbox API configuration
const DROPBOX_APP_KEY = process.env.REACT_APP_DROPBOX_APP_KEY || '';

const CloudIntegration = ({ 
  onFileImport, 
  onSaveToCloud, 
  fileToSave,
  isPremium = false,
  onClose 
}) => {
  const [activeProvider, setActiveProvider] = useState('google');
  const [isAuthenticated, setIsAuthenticated] = useState({
    google: false,
    dropbox: false
  });
  const [files, setFiles] = useState([]);
  const [currentPath, setCurrentPath] = useState('/');
  const [breadcrumbs, setBreadcrumbs] = useState([{ name: 'Root', path: '/' }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [mode, setMode] = useState('import'); // 'import' or 'save'

  // Initialize Google API
  useEffect(() => {
    const loadGoogleAPI = () => {
      if (!window.gapi) {
        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.onload = () => initGoogleAPI();
        document.body.appendChild(script);
      } else {
        initGoogleAPI();
      }
    };

    const initGoogleAPI = () => {
      window.gapi.load('client:auth2', async () => {
        try {
          await window.gapi.client.init({
            apiKey: GOOGLE_API_KEY,
            clientId: GOOGLE_CLIENT_ID,
            scope: GOOGLE_SCOPES,
            discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest']
          });
          
          const authInstance = window.gapi.auth2.getAuthInstance();
          const isSignedIn = authInstance.isSignedIn.get();
          setIsAuthenticated(prev => ({ ...prev, google: isSignedIn }));
          
          authInstance.isSignedIn.listen((signedIn) => {
            setIsAuthenticated(prev => ({ ...prev, google: signedIn }));
          });
        } catch (err) {
          console.error('Google API initialization error:', err);
        }
      });
    };

    if (GOOGLE_CLIENT_ID && GOOGLE_API_KEY) {
      loadGoogleAPI();
    }
  }, []);

  // Initialize Dropbox
  useEffect(() => {
    if (!window.Dropbox && DROPBOX_APP_KEY) {
      const script = document.createElement('script');
      script.src = 'https://www.dropbox.com/static/api/2/dropins.js';
      script.id = 'dropboxjs';
      script.setAttribute('data-app-key', DROPBOX_APP_KEY);
      document.body.appendChild(script);
    }
  }, []);

  // Google Drive Authentication
  const handleGoogleAuth = async () => {
    try {
      const authInstance = window.gapi.auth2.getAuthInstance();
      if (isAuthenticated.google) {
        await authInstance.signOut();
      } else {
        await authInstance.signIn();
        await loadGoogleDriveFiles();
      }
    } catch (err) {
      setError('Google authentication failed: ' + err.message);
    }
  };

  // Dropbox Authentication using OAuth
  const handleDropboxAuth = () => {
    const redirectUri = window.location.origin + '/dropbox-callback';
    const authUrl = `https://www.dropbox.com/oauth2/authorize?client_id=${DROPBOX_APP_KEY}&response_type=token&redirect_uri=${encodeURIComponent(redirectUri)}`;
    
    const authWindow = window.open(authUrl, 'Dropbox Auth', 'width=600,height=600');
    
    const checkAuth = setInterval(() => {
      try {
        if (authWindow.closed) {
          clearInterval(checkAuth);
          const token = localStorage.getItem('dropbox_access_token');
          if (token) {
            setIsAuthenticated(prev => ({ ...prev, dropbox: true }));
            loadDropboxFiles();
          }
        }
      } catch (e) {
        // Cross-origin error - window still open
      }
    }, 500);
  };

  // Load Google Drive files
  const loadGoogleDriveFiles = useCallback(async (folderId = 'root') => {
    if (!isAuthenticated.google) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const query = folderId === 'root' 
        ? "'root' in parents and trashed = false"
        : `'${folderId}' in parents and trashed = false`;
      
      const response = await window.gapi.client.drive.files.list({
        q: searchQuery 
          ? `name contains '${searchQuery}' and trashed = false`
          : query,
        fields: 'files(id, name, mimeType, size, modifiedTime, thumbnailLink, webContentLink)',
        orderBy: 'folder,name',
        pageSize: 100
      });
      
      const driveFiles = response.result.files.map(file => ({
        id: file.id,
        name: file.name,
        type: file.mimeType === 'application/vnd.google-apps.folder' ? 'folder' : 'file',
        mimeType: file.mimeType,
        size: parseInt(file.size) || 0,
        modifiedTime: file.modifiedTime,
        thumbnail: file.thumbnailLink,
        downloadUrl: file.webContentLink
      }));
      
      setFiles(driveFiles);
    } catch (err) {
      setError('Failed to load Google Drive files: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated.google, searchQuery]);

  // Load Dropbox files
  const loadDropboxFiles = useCallback(async (path = '') => {
    const token = localStorage.getItem('dropbox_access_token');
    if (!token) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('https://api.dropboxapi.com/2/files/list_folder', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          path: path || '',
          recursive: false,
          include_media_info: true,
          include_deleted: false
        })
      });
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error_summary);
      }
      
      const dropboxFiles = data.entries.map(entry => ({
        id: entry.id,
        name: entry.name,
        type: entry['.tag'] === 'folder' ? 'folder' : 'file',
        path: entry.path_lower,
        size: entry.size || 0,
        modifiedTime: entry.client_modified
      }));
      
      setFiles(dropboxFiles);
    } catch (err) {
      setError('Failed to load Dropbox files: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Navigate to folder
  const handleFolderClick = (folder) => {
    const newPath = folder.path || folder.id;
    setCurrentPath(newPath);
    setBreadcrumbs(prev => [...prev, { name: folder.name, path: newPath }]);
    
    if (activeProvider === 'google') {
      loadGoogleDriveFiles(folder.id);
    } else {
      loadDropboxFiles(folder.path);
    }
  };

  // Navigate via breadcrumb
  const handleBreadcrumbClick = (index) => {
    const crumb = breadcrumbs[index];
    setCurrentPath(crumb.path);
    setBreadcrumbs(breadcrumbs.slice(0, index + 1));
    
    if (activeProvider === 'google') {
      loadGoogleDriveFiles(crumb.path === '/' ? 'root' : crumb.path);
    } else {
      loadDropboxFiles(crumb.path === '/' ? '' : crumb.path);
    }
  };

  // Toggle file selection
  const handleFileSelect = (file) => {
    if (file.type === 'folder') {
      handleFolderClick(file);
      return;
    }
    
    setSelectedFiles(prev => {
      const isSelected = prev.some(f => f.id === file.id);
      if (isSelected) {
        return prev.filter(f => f.id !== file.id);
      }
      return [...prev, file];
    });
  };

  // Download file from Google Drive
  const downloadGoogleDriveFile = async (file) => {
    try {
      const response = await window.gapi.client.drive.files.get({
        fileId: file.id,
        alt: 'media'
      });
      
      const blob = new Blob([response.body], { type: file.mimeType });
      return new File([blob], file.name, { type: file.mimeType });
    } catch (err) {
      throw new Error('Failed to download file from Google Drive');
    }
  };

  // Download file from Dropbox
  const downloadDropboxFile = async (file) => {
    const token = localStorage.getItem('dropbox_access_token');
    
    try {
      const response = await fetch('https://content.dropboxapi.com/2/files/download', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Dropbox-API-Arg': JSON.stringify({ path: file.path })
        }
      });
      
      const blob = await response.blob();
      return new File([blob], file.name, { type: blob.type });
    } catch (err) {
      throw new Error('Failed to download file from Dropbox');
    }
  };

  // Import selected files
  const handleImport = async () => {
    if (selectedFiles.length === 0) {
      setError('Please select at least one file');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const downloadedFiles = await Promise.all(
        selectedFiles.map(async (file) => {
          if (activeProvider === 'google') {
            return await downloadGoogleDriveFile(file);
          } else {
            return await downloadDropboxFile(file);
          }
        })
      );
      
      onFileImport?.(downloadedFiles);
      setSelectedFiles([]);
      onClose?.();
    } catch (err) {
      setError('Failed to import files: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Upload file to Google Drive
  const uploadToGoogleDrive = async (file, folderId = 'root') => {
    const metadata = {
      name: file.name,
      mimeType: file.type,
      parents: [folderId]
    };
    
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', file);
    
    const token = window.gapi.auth2.getAuthInstance().currentUser.get().getAuthResponse().access_token;
    
    const xhr = new XMLHttpRequest();
    
    return new Promise((resolve, reject) => {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          setUploadProgress(Math.round((e.loaded / e.total) * 100));
        }
      });
      
      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          resolve(JSON.parse(xhr.response));
        } else {
          reject(new Error('Upload failed'));
        }
      });
      
      xhr.addEventListener('error', () => reject(new Error('Upload failed')));
      
      xhr.open('POST', 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart');
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.send(form);
    });
  };

  // Upload file to Dropbox
  const uploadToDropbox = async (file, path = '/') => {
    const token = localStorage.getItem('dropbox_access_token');
    const filePath = path === '/' ? `/${file.name}` : `${path}/${file.name}`;
    
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          setUploadProgress(Math.round((e.loaded / e.total) * 100));
        }
      });
      
      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          resolve(JSON.parse(xhr.response));
        } else {
          reject(new Error('Upload failed'));
        }
      });
      
      xhr.addEventListener('error', () => reject(new Error('Upload failed')));
      
      xhr.open('POST', 'https://content.dropboxapi.com/2/files/upload');
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.setRequestHeader('Dropbox-API-Arg', JSON.stringify({
        path: filePath,
        mode: 'add',
        autorename: true
      }));
      xhr.setRequestHeader('Content-Type', 'application/octet-stream');
      xhr.send(file);
    });
  };

  // Save file to cloud
  const handleSaveToCloud = async () => {
    if (!fileToSave) {
      setError('No file to save');
      return;
    }
    
    setIsUploading(true);
    setUploadProgress(0);
    setError(null);
    
    try {
      if (activeProvider === 'google') {
        await uploadToGoogleDrive(fileToSave, currentPath === '/' ? 'root' : currentPath);
      } else {
        await uploadToDropbox(fileToSave, currentPath);
      }
      
      onSaveToCloud?.({ provider: activeProvider, path: currentPath });
      onClose?.();
    } catch (err) {
      setError('Failed to save file: ' + err.message);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Format file size
  const formatSize = (bytes) => {
    if (!bytes) return '-';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  // Get file icon
  const getFileIcon = (file) => {
    if (file.type === 'folder') return '📁';
    
    const mimeType = file.mimeType || '';
    if (mimeType.includes('image')) return '🖼️';
    if (mimeType.includes('video')) return '🎬';
    if (mimeType.includes('audio')) return '🎵';
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('document') || mimeType.includes('word')) return '📝';
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return '📊';
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return '📽️';
    if (mimeType.includes('zip') || mimeType.includes('archive')) return '📦';
    return '📄';
  };

  useEffect(() => {
    if (fileToSave) {
      setMode('save');
    }
  }, [fileToSave]);

  useEffect(() => {
    if (isAuthenticated.google && activeProvider === 'google') {
      loadGoogleDriveFiles();
    } else if (isAuthenticated.dropbox && activeProvider === 'dropbox') {
      loadDropboxFiles();
    }
  }, [activeProvider, isAuthenticated, loadGoogleDriveFiles, loadDropboxFiles]);

  return (
    <div className="cloud-integration-overlay" onClick={onClose}>
      <div className="cloud-integration-modal" onClick={e => e.stopPropagation()}>
        <div className="cloud-header">
          <h2>
            {mode === 'import' ? '☁️ Import from Cloud' : '💾 Save to Cloud'}
          </h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        {!isPremium && (
          <div className="premium-notice">
            <span>⭐</span>
            <p>Cloud integration is a premium feature. Upgrade to access unlimited cloud storage.</p>
          </div>
        )}

        <div className="provider-tabs">
          <button
            className={`provider-tab ${activeProvider === 'google' ? 'active' : ''}`}
            onClick={() => setActiveProvider('google')}
          >
            <span className="provider-icon">
              <svg viewBox="0 0 24 24" width="20" height="20">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            </span>
            Google Drive
            {isAuthenticated.google && <span className="connected-badge">✓</span>}
          </button>
          <button
            className={`provider-tab ${activeProvider === 'dropbox' ? 'active' : ''}`}
            onClick={() => setActiveProvider('dropbox')}
          >
            <span className="provider-icon">
              <svg viewBox="0 0 24 24" width="20" height="20">
                <path fill="#0061FF" d="M6 2L0 6l6 4-6 4 6 4 6-4-6-4 6-4-6-4zm12 0l-6 4 6 4-6 4 6 4 6-4-6-4 6-4-6-4z"/>
              </svg>
            </span>
            Dropbox
            {isAuthenticated.dropbox && <span className="connected-badge">✓</span>}
          </button>
        </div>

        {!isAuthenticated[activeProvider] ? (
          <div className="auth-prompt">
            <div className="auth-icon">
              {activeProvider === 'google' ? '🔗' : '📦'}
            </div>
            <h3>Connect to {activeProvider === 'google' ? 'Google Drive' : 'Dropbox'}</h3>
            <p>Sign in to access your cloud files</p>
            <button
              className="auth-button"
              onClick={activeProvider === 'google' ? handleGoogleAuth : handleDropboxAuth}
            >
              Connect {activeProvider === 'google' ? 'Google Drive' : 'Dropbox'}
            </button>
          </div>
        ) : (
          <>
            <div className="cloud-toolbar">
              <div className="breadcrumbs">
                {breadcrumbs.map((crumb, index) => (
                  <React.Fragment key={crumb.path}>
                    {index > 0 && <span className="separator">/</span>}
                    <button
                      className="breadcrumb"
                      onClick={() => handleBreadcrumbClick(index)}
                    >
                      {crumb.name}
                    </button>
                  </React.Fragment>
                ))}
              </div>
              <div className="search-box">
                <input
                  type="text"
                  placeholder="Search files..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (activeProvider === 'google') {
                        loadGoogleDriveFiles();
                      }
                    }
                  }}
                />
                <span className="search-icon">🔍</span>
              </div>
            </div>

            {error && (
              <div className="cloud-error">
                <span>⚠️</span> {error}
              </div>
            )}

            <div className="files-container">
              {loading ? (
                <div className="loading-state">
                  <div className="spinner"></div>
                  <p>Loading files...</p>
                </div>
              ) : files.length === 0 ? (
                <div className="empty-state">
                  <span>📂</span>
                  <p>No files found</p>
                </div>
              ) : (
                <div className="files-grid">
                  {files.map(file => (
                    <div
                      key={file.id}
                      className={`file-item ${selectedFiles.some(f => f.id === file.id) ? 'selected' : ''}`}
                      onClick={() => handleFileSelect(file)}
                    >
                      <div className="file-icon">{getFileIcon(file)}</div>
                      <div className="file-info">
                        <span className="file-name">{file.name}</span>
                        <span className="file-meta">
                          {file.type === 'folder' ? 'Folder' : formatSize(file.size)}
                        </span>
                      </div>
                      {selectedFiles.some(f => f.id === file.id) && (
                        <div className="selected-check">✓</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {isUploading && (
              <div className="upload-progress">
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <span>{uploadProgress}% uploaded</span>
              </div>
            )}

            <div className="cloud-actions">
              {mode === 'import' ? (
                <>
                  <span className="selected-count">
                    {selectedFiles.length} file(s) selected
                  </span>
                  <button
                    className="action-btn secondary"
                    onClick={() => setSelectedFiles([])}
                    disabled={selectedFiles.length === 0}
                  >
                    Clear Selection
                  </button>
                  <button
                    className="action-btn primary"
                    onClick={handleImport}
                    disabled={selectedFiles.length === 0 || loading}
                  >
                    Import Selected
                  </button>
                </>
              ) : (
                <>
                  <span className="save-info">
                    Saving: {fileToSave?.name}
                  </span>
                  <button
                    className="action-btn primary"
                    onClick={handleSaveToCloud}
                    disabled={isUploading}
                  >
                    {isUploading ? 'Saving...' : 'Save Here'}
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CloudIntegration;
