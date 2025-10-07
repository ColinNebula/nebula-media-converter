import React, { useState, useCallback, useEffect } from 'react';
import './App.css';
import FileUpload from './components/FileUpload';
import ConversionOptions from './components/ConversionOptions';
import ProgressBar from './components/ProgressBar';
import DownloadResult from './components/DownloadResult';
import SplashScreen from './components/SplashScreen';
import PremiumFeatures from './components/PremiumFeatures';
import AdvancedSettings from './components/AdvancedSettings';
import DocumentConverter from './components/DocumentConverter';
import NebulaLogo from './components/NebulaLogo';
import StorageStatus from './components/StorageStatus';
import FileLifecycleManager from './components/FileLifecycleManager';
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';
import MediaConverter from './utils/MediaConverter';
import CloudStorageService from './services/CloudStorageService';
import adminAuthService from './services/AdminAuthService';

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isPremium, setIsPremium] = useState(false); // Premium status
  const [userSubscription, setUserSubscription] = useState(null); // User subscription data
  const [activeTab, setActiveTab] = useState('media'); // Tab state
  const [selectedFile, setSelectedFile] = useState(null);
  const [outputFormat, setOutputFormat] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [convertedFile, setConvertedFile] = useState(null);
  const [error, setError] = useState(null);
  const [advancedSettings, setAdvancedSettings] = useState({});
  const [converter] = useState(() => new MediaConverter());
  const [cloudStorage] = useState(() => new CloudStorageService({
    provider: 'aws',
    bucket: 'nebula-media-files',
    tempBucket: 'nebula-temp-files',
    maxFileSize: isPremium ? 5 * 1024 * 1024 * 1024 : 500 * 1024 * 1024, // 5GB premium, 500MB free
    retentionPeriod: 7 * 24 * 60 * 60 * 1000, // 7 days
    apiEndpoint: process.env.REACT_APP_API_ENDPOINT || 'https://api.nebula.com'
  }));
  const [uploadedFileKey, setUploadedFileKey] = useState(null);
  const [storageStats, setStorageStats] = useState({ used: 0, limit: 0 });

  // Check for admin mode on load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const adminParam = urlParams.get('admin');
    console.log('URL admin param:', adminParam); // Debug log
    if (adminParam === 'true') {
      console.log('Setting admin mode to true'); // Debug log
      setIsAdminMode(true);
    }
    
    // Check if admin is already logged in and restore privileges
    if (adminAuthService.isLoggedIn()) {
      const session = adminAuthService.getCurrentSession();
      if (session && session.isPremium) {
        setIsPremium(true);
        setUserSubscription({
          plan: session.subscriptionPlan || 'business',
          status: 'active',
          user: session.user,
          features: session.features,
          expiresAt: session.expiresAt
        });
        console.log('Admin session restored with business privileges');
      }
    }
  }, []);

  // Keyboard shortcut for admin access (Ctrl + I)
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Check if event.key exists and is a string
      if (!event || !event.key || typeof event.key !== 'string') {
        return;
      }

      // Only trigger if we're not in an input field or textarea
      const activeElement = document.activeElement;
      const isInputField = activeElement && (
        activeElement.tagName === 'INPUT' || 
        activeElement.tagName === 'TEXTAREA' || 
        activeElement.contentEditable === 'true'
      );
      
      // Ctrl + I to access admin
      if (!isInputField && event.ctrlKey && !event.altKey && !event.shiftKey && event.key.toLowerCase() === 'i') {
        event.preventDefault();
        console.log('Admin shortcut triggered'); // Debug log
        if (!isAdminMode) {
          setIsAdminMode(true);
          // Update URL to reflect admin mode
          const url = new URL(window.location);
          url.searchParams.set('admin', 'true');
          window.history.pushState({}, '', url);
          // Show toast notification
          setToastMessage('Admin mode activated');
          setShowToast(true);
          setTimeout(() => setShowToast(false), 3000);
        }
      }
      // Escape key to exit admin mode (if not logged in)
      else if (event.key === 'Escape' && isAdminMode && !adminAuthService.isLoggedIn()) {
        event.preventDefault();
        console.log('Exit admin shortcut triggered'); // Debug log
        setIsAdminMode(false);
        // Remove admin parameter from URL
        const url = new URL(window.location);
        url.searchParams.delete('admin');
        window.history.pushState({}, '', url);
        // Show toast notification
        setToastMessage('Exited admin mode');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      }
    };

    // Add listener to document instead of window for better compatibility
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isAdminMode]);

  // Check if admin is already logged in
  useEffect(() => {
    if (isAdminMode && adminAuthService.isLoggedIn()) {
      // Admin is already logged in, show dashboard
    }
  }, [isAdminMode]);

  // Debug effect to track isAdminMode changes
  useEffect(() => {
    console.log('isAdminMode changed to:', isAdminMode);
  }, [isAdminMode]);

  // Splash screen effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, isAdminMode ? 500 : 3000); // Shorter splash for admin mode

    return () => clearTimeout(timer);
  }, [isAdminMode]);

  // Restore subscription data on app load
  useEffect(() => {
    const savedPremium = localStorage.getItem('nebula_premium');
    const savedSubscription = localStorage.getItem('nebula_subscription');
    
    if (savedPremium === 'true') {
      setIsPremium(true);
    }
    
    if (savedSubscription) {
      try {
        const subscriptionData = JSON.parse(savedSubscription);
        setUserSubscription(subscriptionData);
      } catch (error) {
        console.error('Error parsing saved subscription data:', error);
      }
    }
  }, []);

  // Load storage statistics
  useEffect(() => {
    const loadStorageStats = async () => {
      if (userSubscription?.user?.id) {
        try {
          const stats = await cloudStorage.getStorageStats(userSubscription.user.id);
          setStorageStats(stats);
        } catch (error) {
          console.warn('Failed to load storage stats:', error);
        }
      }
    };

    loadStorageStats();
  }, [userSubscription, cloudStorage]);

  const handleFileSelect = useCallback(async (file) => {
    console.log('handleFileSelect called with:', file);
    setError(null);
    setProgress(0);
    setCurrentStep('Uploading file...');
    setIsProcessing(true);

    try {
      // Upload file to cloud storage
      const uploadResult = await cloudStorage.uploadFile(file, {
        userId: userSubscription?.user?.id || 'anonymous',
        folder: 'uploads',
        isTemporary: true,
        onProgress: (progress, message) => {
          setProgress(progress * 0.3); // Upload takes 30% of total progress
          setCurrentStep(message || 'Uploading...');
        },
        onError: (error) => {
          setError(`Upload failed: ${error.message}`);
        }
      });

      setUploadedFileKey(uploadResult.fileKey);
      setSelectedFile(file);
      setOutputFormat('');
      setConvertedFile(null);
      setProgress(30);
      setCurrentStep('File uploaded successfully');
    } catch (error) {
      console.error('File upload error:', error);
      setError(`Failed to upload file: ${error.message}`);
    } finally {
      setIsProcessing(false);
      setProgress(0);
      setCurrentStep('');
    }
  }, [cloudStorage, userSubscription]);

  const handleConvert = async () => {
    if (!selectedFile || !outputFormat || !uploadedFileKey) return;

    setIsProcessing(true);
    setProgress(0);
    setCurrentStep('Preparing conversion...');
    setError(null);

    try {
      // Download file from cloud storage for processing
      setCurrentStep('Downloading file for conversion...');
      setProgress(10);
      
      const fileBlob = await cloudStorage.downloadFile(uploadedFileKey, {
        onProgress: (progress) => {
          setProgress(10 + (progress * 0.2)); // Download: 10-30%
        }
      });

      // Create file object for conversion
      const fileForConversion = new File([fileBlob], selectedFile.name, {
        type: selectedFile.type
      });

      setCurrentStep('Converting file...');
      setProgress(30);

      const result = await converter.convert(
        fileForConversion,
        outputFormat,
        (progress, step) => {
          setProgress(30 + (progress * 0.5)); // Conversion: 30-80%
          setCurrentStep(step);
        }
      );

      // Upload converted file to cloud storage
      setCurrentStep('Uploading converted file...');
      setProgress(80);

      const convertedFile = new File([result.blob], result.filename, {
        type: result.blob.type
      });

      const uploadResult = await cloudStorage.uploadFile(convertedFile, {
        userId: userSubscription?.user?.id || 'anonymous',
        folder: 'converted',
        isTemporary: true,
        onProgress: (progress) => {
          setProgress(80 + (progress * 0.2)); // Upload: 80-100%
        }
      });

      // Generate CDN URL for download
      const downloadUrl = await cloudStorage.getDownloadUrl(uploadResult.fileKey, 3600); // 1 hour expiry
      
      setConvertedFile({
        ...result,
        cloudFileKey: uploadResult.fileKey,
        downloadUrl: downloadUrl
      });
      
      setProgress(100);
      setCurrentStep('Conversion complete!');
      
      // Schedule cleanup of temporary files
      await cloudStorage.scheduleCleanup(uploadedFileKey, 24 * 60 * 60 * 1000); // 24 hours
      await cloudStorage.scheduleCleanup(uploadResult.fileKey, 7 * 24 * 60 * 60 * 1000); // 7 days
      
    } catch (err) {
      console.error('Conversion error:', err);
      setError(err.message || 'Conversion failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = async () => {
    // Clean up uploaded files when resetting
    if (uploadedFileKey) {
      try {
        await cloudStorage.deleteFile(uploadedFileKey);
      } catch (error) {
        console.warn('Failed to delete uploaded file:', error);
      }
    }
    
    if (convertedFile?.cloudFileKey) {
      try {
        await cloudStorage.deleteFile(convertedFile.cloudFileKey);
      } catch (error) {
        console.warn('Failed to delete converted file:', error);
      }
    }

    setSelectedFile(null);
    setUploadedFileKey(null);
    setOutputFormat('');
    setConvertedFile(null);
    setError(null);
    setProgress(0);
    setCurrentStep('');
  };

  const handleUpgrade = (planName, subscriptionData) => {
    // Handle successful subscription upgrade
    console.log('Upgrading to:', planName, subscriptionData);
    setIsPremium(true);
    setUserSubscription(subscriptionData);
    
    // Store subscription data in localStorage for persistence
    localStorage.setItem('nebula_subscription', JSON.stringify(subscriptionData));
    localStorage.setItem('nebula_premium', 'true');
  };

  const handleAdvancedSettingsChange = (newSettings) => {
    setAdvancedSettings(newSettings);
  };

  const handleTabSwitch = (tab) => {
    setActiveTab(tab);
    // Reset states when switching tabs
    setSelectedFile(null);
    setOutputFormat('');
    setConvertedFile(null);
    setError(null);
    setProgress(0);
    setCurrentStep('');
  };

  return (
    <>
      {/* Debug info */}
      {console.log('Rendering App - isAdminMode:', isAdminMode, 'isLoading:', isLoading)}
      
      <SplashScreen isLoading={isLoading} />
      
      {/* Toast Notification */}
      {showToast && (
        <div className="toast-notification">
          <span>{toastMessage}</span>
        </div>
      )}
      
      {/* Admin Mode */}
      {isAdminMode && !isLoading && (
        <div className="admin-mode-wrapper">
          <header className="admin-header-minimal">
            <div className="admin-brand-minimal">
              <NebulaLogo size={30} />
              <div className="brand-text">
                <h2>⭐ Nebula Admin Console</h2>
                <p>System Management & Control Panel</p>
              </div>
            </div>
            {adminAuthService.isLoggedIn() && (
              <div className="admin-status">
                <span className="status-indicator">🟢 Connected</span>
                <span className="admin-user">admin</span>
              </div>
            )}
          </header>
          
          {!adminAuthService.isLoggedIn() ? (
            <AdminLogin onLoginSuccess={(session) => {
              console.log('Admin login successful:', session);
              // Set admin privileges
              if (session && session.isPremium) {
                setIsPremium(true);
                setUserSubscription({
                  plan: session.subscriptionPlan || 'business',
                  status: 'active',
                  user: session.user,
                  features: session.features,
                  expiresAt: session.expiresAt
                });
                // Store admin subscription data
                localStorage.setItem('nebula_premium', 'true');
                localStorage.setItem('nebula_subscription', JSON.stringify({
                  plan: session.subscriptionPlan || 'business',
                  status: 'active',
                  user: session.user,
                  features: session.features,
                  expiresAt: session.expiresAt
                }));
                console.log('Admin privileges activated - Business Plan');
              }
              // The component will re-render and show the dashboard
              // because adminAuthService.isLoggedIn() will now return true
            }} />
          ) : (
            <AdminDashboard onLogout={() => {
              console.log('Admin logout triggered');
              adminAuthService.logout();
              // Clear admin privileges
              setIsPremium(false);
              setUserSubscription(null);
              localStorage.removeItem('nebula_premium');
              localStorage.removeItem('nebula_subscription');
              // Force re-render by updating state
              setIsAdminMode(false);
              // Remove admin parameter from URL
              const url = new URL(window.location);
              url.searchParams.delete('admin');
              window.history.pushState({}, '', url);
              // Show toast notification
              setToastMessage('Logged out of admin mode');
              setShowToast(true);
              setTimeout(() => setShowToast(false), 3000);
              console.log('Admin privileges revoked');
            }} />
          )}
        </div>
      )}

      {/* Normal App Mode */}
      {!isAdminMode && (
        <div className="App" style={{ opacity: isLoading ? 0 : 1, transition: 'opacity 0.5s ease-in' }}>
          <header className="App-header">
            <div className="header-logo">
              <NebulaLogo size={50} />
            </div>
            <h1>⭐ Nebula Universal Converter</h1>
            <p>Convert media files and documents with ease</p>
            
            <div className="header-status">
              {isPremium ? (
                <span className="premium-badge">✨ Premium Active</span>
              ) : (
                <span className="free-badge">🆓 Free Version</span>
              )}
              {userSubscription && (
                <span className="user-info">Welcome, {userSubscription.user?.name || 'User'}!</span>
              )}
              {/* Admin access button hidden - only accessible via 'A' key shortcut */}
            </div>
          </header>

          <main className="App-main">
            <div className="converter-container">
              {/* Show premium features if not premium */}
              {!isPremium && (
                <PremiumFeatures
                  isPremium={isPremium}
                  onUpgrade={handleUpgrade}
                />
              )}

              {/* Storage Status for logged in users */}
              {userSubscription && (
                <StorageStatus 
                  storageStats={storageStats}
                  isPremium={isPremium}
                  userSubscription={userSubscription}
                />
              )}

              {/* File Lifecycle Manager for premium users */}
              {isPremium && userSubscription && (
                <FileLifecycleManager 
                  cloudStorage={cloudStorage}
                  userId={userSubscription.user?.id}
                  isPremium={isPremium}
                />
              )}            
              
              {/* Tab Navigation */}
              <div className="converter-tabs">
                <button 
                  className={`tab-btn ${activeTab === 'media' ? 'active' : ''}`}
                  onClick={() => handleTabSwitch('media')}
                >
                  🎵 Media Converter
                </button>
                <button 
                  className={`tab-btn ${activeTab === 'documents' ? 'active' : ''}`}
                  onClick={() => handleTabSwitch('documents')}
                >
                  📄 Document Converter
                </button>
              </div>

              {/* Media Converter Tab */}
              {activeTab === 'media' && (
                <>
                  <FileUpload 
                    onFileSelect={handleFileSelect} 
                    isProcessing={isProcessing}
                  />
                  
                  <ConversionOptions
                    selectedFile={selectedFile}
                    outputFormat={outputFormat}
                    setOutputFormat={setOutputFormat}
                    onConvert={handleConvert}
                    isProcessing={isProcessing}
                  />

                  <AdvancedSettings
                    isPremium={isPremium}
                    settings={advancedSettings}
                    onSettingsChange={handleAdvancedSettingsChange}
                  />

                  <ProgressBar
                    progress={progress}
                    isProcessing={isProcessing}
                    currentStep={currentStep}
                    error={error}
                  />

                  <DownloadResult
                    convertedFile={convertedFile}
                    onReset={handleReset}
                  />
                </>
              )}

              {/* Document Converter Tab */}
              {activeTab === 'documents' && (
                <DocumentConverter 
                  isPremium={isPremium} 
                  onUpgrade={handleUpgrade}
                />
              )}
            </div>
          </main>
          
          <footer className="App-footer">
            <p>Built with React and FFmpeg.wasm</p>
          </footer>
        </div>
      )}
    </>
  );
}

export default App;
