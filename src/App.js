import React, { useState, useCallback, useEffect, lazy, Suspense } from 'react';
import './App.css';
import FileUpload from './components/FileUpload';
import ConversionOptions from './components/ConversionOptions';
import ProgressBar from './components/ProgressBar';
import DownloadResult from './components/DownloadResult';
import SplashScreen from './components/SplashScreen';
import PremiumFeatures from './components/PremiumFeatures';
import AdvancedSettings from './components/AdvancedSettings';
import NebulaLogo from './components/NebulaLogo';
import StorageStatus from './components/StorageStatus';
import MediaConverter from './utils/MediaConverter';
import CloudStorageService from './services/CloudStorageService';
import adminAuthService from './services/AdminAuthService';
import emailJSService from './services/EmailJSService';
import configValidator from './utils/ConfigValidator';
import ConnectionManager from './components/ConnectionManager';
import DynamicHeader from './components/DynamicHeader';
import { useTheme } from './contexts/ThemeContext';
import { useToast } from './components/Toast';
import { AdminDashboardSkeleton, ConversionCardSkeleton } from './components/LoadingSkeleton';
import securityManager from './security/SecurityManager';
import InstallPWA from './components/InstallPWA';
import UpdateNotification from './components/UpdateNotification';
import KeyboardShortcuts from './components/KeyboardShortcuts';
import ConversionHistory from './components/ConversionHistory';
import SignupPrompt from './components/SignupPrompt';
import UserDashboard from './components/UserDashboard';
import DonationPrompt from './components/DonationPrompt';
import userService from './services/UserService';
import donationService from './services/DonationService';

// New feature components
const CloudIntegration = lazy(() => import('./components/CloudIntegration'));
const PresetProfiles = lazy(() => import('./components/PresetProfiles'));
const MetadataEditor = lazy(() => import('./components/MetadataEditor'));
const PasswordProtection = lazy(() => import('./components/PasswordProtection'));

// Lazy load heavy components
const DocumentConverter = lazy(() => import('./components/DocumentConverter'));
const FileLifecycleManager = lazy(() => import('./components/FileLifecycleManager'));
const AdminLogin = lazy(() => import('./components/AdminLogin'));
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
const FFmpegTest = lazy(() => import('./components/FFmpegTest'));
const DesktopFeatures = lazy(() => import('./components/DesktopFeatures'));
const AuthScreen = lazy(() => import('./components/AuthScreen'));
const FilePreview = lazy(() => import('./components/FilePreview'));
const AdvancedTools = lazy(() => import('./components/AdvancedTools'));
const ThreeDConverter = lazy(() => import('./components/ThreeDConverter'));

// Sanitize user-controlled strings before inserting into innerHTML to prevent XSS
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

function App() {
  const { theme, toggleTheme, isDark } = useTheme();
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false); // Splash screen disabled for faster load
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [isPremium, setIsPremium] = useState(false); // Premium status
  const [userSubscription, setUserSubscription] = useState(null); // User subscription data
  const [activeTab, setActiveTab] = useState('media'); // Tab state
  const [showFFmpegTest, setShowFFmpegTest] = useState(false); // FFmpeg test panel
  const [selectedFile, setSelectedFile] = useState(null);
  const [outputFormat, setOutputFormat] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [convertedFile, setConvertedFile] = useState(null);
  const [error, setError] = useState(null);
  const [advancedSettings, setAdvancedSettings] = useState({});
  const [showConnectionManager, setShowConnectionManager] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [showFilePreview, setShowFilePreview] = useState(false);
  const [showConversionHistory, setShowConversionHistory] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [showSignupPrompt, setShowSignupPrompt] = useState(false);
  const [signupTrigger, setSignupTrigger] = useState('default');
  const [showUserDashboard, setShowUserDashboard] = useState(false);
  const [showDonationPrompt, setShowDonationPrompt] = useState(false);
  
  // New feature states
  const [showCloudIntegration, setShowCloudIntegration] = useState(false);
  const [showPresetProfiles, setShowPresetProfiles] = useState(false);
  const [showMetadataEditor, setShowMetadataEditor] = useState(false);
  const [showPasswordProtection, setShowPasswordProtection] = useState(false);
  const [cloudSaveFile, setCloudSaveFile] = useState(null);
  const [passwordProtectionMode, setPasswordProtectionMode] = useState('encrypt');
  const [fileForMetadata, setFileForMetadata] = useState(null);
  
  const [converter] = useState(() => new MediaConverter());
  const [cloudStorage] = useState(() => new CloudStorageService({
    provider: 'aws',
    bucket: 'nebula-media-files',
    tempBucket: 'nebula-temp-files',
    maxFileSize: isPremium ? 5 * 1024 * 1024 * 1024 : 500 * 1024 * 1024, // 5GB premium, 500MB free
    retentionPeriod: 7 * 24 * 60 * 60 * 1000, // 7 days
    apiEndpoint: process.env.REACT_APP_API_BASE_URL || 'https://api.nebula.com'
  }));
  const [storageStats, setStorageStats] = useState({ used: 0, limit: 0 });

  // Emergency fallback removed - isLoading starts as false
  // No splash screen delay needed

  // Listen for custom events
  useEffect(() => {
    const handleOpenDashboard = () => setShowUserDashboard(true);
    const handleOpenDonation = () => setShowDonationPrompt(true);

    window.addEventListener('open-user-dashboard', handleOpenDashboard);
    window.addEventListener('open-donation-modal', handleOpenDonation);
    
    return () => {
      window.removeEventListener('open-user-dashboard', handleOpenDashboard);
      window.removeEventListener('open-donation-modal', handleOpenDonation);
    };
  }, []);

  // Check for admin mode on load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const adminParam = urlParams.get('admin');
    if (adminParam === 'true') {
      setIsAdminMode(true);
    }
    
    // Initialize security manager
    try {
      securityManager.initSecurity();
    } catch (error) {
      console.warn('Security Manager initialization failed:', error);
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

  // Keyboard shortcuts handler
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
      
      if (isInputField) return;

      // Ctrl + I to access admin
      if (event.ctrlKey && !event.altKey && !event.shiftKey && event.key.toLowerCase() === 'i') {
        event.preventDefault();
        console.log('🔑 Admin shortcut triggered (Ctrl+I)');
        if (!isAdminMode) {
          setIsAdminMode(true);
          const url = new URL(window.location);
          url.searchParams.set('admin', 'true');
          window.history.pushState({}, '', url);
          showToast('Admin mode activated - Press Ctrl+Shift+I for DevTools', 'info');
        }
      }
      // Escape key to exit admin mode (if not logged in) or close modals
      else if (event.key === 'Escape') {
        event.preventDefault();
        if (showFilePreview) setShowFilePreview(false);
        else if (showConversionHistory) setShowConversionHistory(false);
        else if (showKeyboardShortcuts) setShowKeyboardShortcuts(false);
        else if (isAdminMode && !adminAuthService.isLoggedIn()) {
          setIsAdminMode(false);
          const url = new URL(window.location);
          url.searchParams.delete('admin');
          window.history.pushState({}, '', url);
          showToast('Exited admin mode', 'info');
        }
      }
      // Ctrl + U to toggle file upload
      else if (event.ctrlKey && !event.altKey && !event.shiftKey && event.key.toLowerCase() === 'u') {
        event.preventDefault();
        document.querySelector('input[type="file"]')?.click();
      }
      // Ctrl + H to toggle conversion history
      else if (event.ctrlKey && !event.altKey && !event.shiftKey && event.key.toLowerCase() === 'h') {
        event.preventDefault();
        setShowConversionHistory(prev => !prev);
      }
      // Ctrl + K to toggle keyboard shortcuts
      else if (event.ctrlKey && !event.altKey && !event.shiftKey && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setShowKeyboardShortcuts(prev => !prev);
      }
      // Ctrl + D to toggle dark mode
      else if (event.ctrlKey && !event.altKey && !event.shiftKey && event.key.toLowerCase() === 'd') {
        event.preventDefault();
        toggleTheme();
        showToast(`Switched to ${isDark ? 'light' : 'dark'} mode`, 'success');
      }
      // ? to show keyboard shortcuts
      else if (event.key === '?' && !event.ctrlKey && !event.altKey && !event.shiftKey) {
        event.preventDefault();
        setShowKeyboardShortcuts(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isAdminMode, showFilePreview, showConversionHistory, showKeyboardShortcuts, toggleTheme, isDark, showToast]);

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

  // Scroll tracking effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Splash screen effect
  useEffect(() => {
    console.log('🚀 App initialization started');
    
    // Validate environment configuration on startup
    try {
      configValidator.logConfigStatus();
    } catch (error) {
      console.warn('⚠️ Config validation failed:', error);
    }
    
    // Check for existing session
    const checkSession = () => {
      try {
        const session = localStorage.getItem('nebula_session');
        if (session) {
          const sessionData = JSON.parse(session);
          // Check if session is still valid
          if (new Date(sessionData.expiresAt) > new Date()) {
            setIsAuthenticated(true);
            setCurrentUser({
              id: sessionData.userId,
              email: sessionData.email,
              name: sessionData.name
            });
            console.log('✅ Session restored for user:', sessionData.email);
          } else {
            // Session expired
            localStorage.removeItem('nebula_session');
            console.log('⏱️ Session expired');
          }
        }
      } catch (error) {
        console.error('❌ Session check failed:', error);
        try {
          localStorage.removeItem('nebula_session');
        } catch (e) {
          console.error('❌ Failed to remove invalid session:', e);
        }
      }
    };

    checkSession();
    
    console.log('⏳ Starting splash screen timer...');
    const timer = setTimeout(() => {
      console.log('✅ Splash screen complete, loading app');
      setIsLoading(false);
    }, isAdminMode ? 500 : 2000); // Reduced to 2 seconds for better UX

    return () => {
      console.log('🧹 Cleaning up splash screen timer');
      clearTimeout(timer);
    };
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
    setCurrentStep('File selected');
    setIsProcessing(false);

    // Check file size limit based on user status
    if (!userService.canUploadFile(file.size)) {
      const limitMB = userService.getFileSizeLimitMB();
      const fileSizeMB = Math.round(file.size / (1024 * 1024));
      setSignupTrigger('file-size');
      setShowSignupPrompt(true);
      setError(`File too large (${fileSizeMB}MB). ${userService.isSignedUp() ? `Max: ${limitMB}MB` : `Sign up for ${limitMB * 5}MB limit!`}`);
      return;
    }

    try {
      // Validate file with security manager (optional, continue if fails)
      let safeFile = file;
      try {
        const validation = securityManager.validateFileUpload(file);
        if (!validation.valid) {
          console.warn('⚠️ File validation warning:', validation.reason);
          showToast(validation.reason, 'warning');
          // Continue anyway but with warning
        } else {
          // Sanitize filename
          safeFile = new File([file], securityManager.sanitizeFilename(file.name), {
            type: file.type,
            lastModified: file.lastModified
          });
          console.log('✅ File validated and sanitized:', safeFile.name);
        }
      } catch (secError) {
        console.warn('⚠️ Security validation skipped:', secError);
        // Continue with original file if security check fails
      }

      // Set file directly for immediate conversion
      setSelectedFile(safeFile);
      setOutputFormat('');
      setConvertedFile(null);
      setProgress(0);
      setCurrentStep('File ready for conversion');
    } catch (error) {
      console.error('File selection error:', error);
      setError(`Failed to select file: ${error.message}`);
      showToast(`File selection failed: ${error.message}`, 'error');
    }
  }, [showToast]);

  const handleConvert = async () => {
    console.log('🚀 handleConvert called!', { selectedFile: selectedFile?.name, outputFormat, isProcessing });
    
    if (!selectedFile || !outputFormat) {
      const errorMsg = 'Please select a file and output format';
      console.error('❌ Validation failed:', errorMsg);
      setError(errorMsg);
      return;
    }

    // Check daily conversion limit
    if (!userService.canConvertToday()) {
      const remaining = userService.getRemainingConversions();
      setSignupTrigger('daily-limit');
      setShowSignupPrompt(true);
      setError(`Daily conversion limit reached. ${userService.isSignedUp() ? 'Come back tomorrow!' : 'Sign up for 4x more conversions!'}`);
      return;
    }

    console.log('✅ Starting conversion...');
    setIsProcessing(true);
    setProgress(0);
    setCurrentStep('Preparing conversion...');
    setError(null);

    try {
      setCurrentStep('Loading FFmpeg...');
      setProgress(10);

      const result = await converter.convert(
        selectedFile,
        outputFormat,
        (progress, step) => {
          setProgress(10 + (progress * 0.9)); // Conversion: 10-100%
          setCurrentStep(step);
        }
      );

      setConvertedFile({
        blob: result.blob,
        filename: result.filename,
        downloadUrl: URL.createObjectURL(result.blob)
      });
      
      setProgress(100);
      setCurrentStep('Conversion complete!');
      
      // Save to conversion history
      const historyEntry = {
        id: Date.now(),
        inputFile: selectedFile.name,
        outputFormat,
        fileSize: selectedFile.size,
        timestamp: new Date().toISOString(),
        status: 'success'
      };
      
      const history = JSON.parse(localStorage.getItem('nebula_conversion_history') || '[]');
      history.unshift(historyEntry);
      // Keep only last 50 conversions
      if (history.length > 50) history.splice(50);
      localStorage.setItem('nebula_conversion_history', JSON.stringify(history));
      
      // Show success toast
      showToast(`Successfully converted ${selectedFile.name} to ${outputFormat}`, 'success');
      
      // Check if we should show donation prompt after successful conversion
      setTimeout(() => {
        if (donationService.shouldShowPrompt()) {
          setShowDonationPrompt(true);
        }
      }, 3000); // Show 3 seconds after conversion completes
      
      // Send conversion completion email if user has provided email
      try {
        const userEmail = userSubscription?.user?.email;
        if (userEmail && emailJSService.isConfigured()) {
          await emailJSService.sendConversionNotification(
            userEmail,
            selectedFile.name,
            outputFormat
          );
          console.log('Conversion notification email sent');
        }
      } catch (emailError) {
        console.warn('Failed to send conversion notification:', emailError);
        // Don't fail the conversion if email fails
      }
      
    } catch (err) {
      console.error('Conversion error:', err);
      
      // Check if it's a connection error
      if (err.message.includes('Failed to fetch') || 
          err.message.includes('Failed to load FFmpeg') ||
          err.message.includes('network') ||
          err.message.includes('CDN') ||
          err.message.includes('timeout') ||
          err.message.includes('internet connection')) {
        setConnectionError(err.message);
        setShowConnectionManager(true);
      } else {
        setError(err.message || 'Conversion failed');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    // Clean up blob URLs to prevent memory leaks
    if (convertedFile?.downloadUrl) {
      URL.revokeObjectURL(convertedFile.downloadUrl);
    }

    setSelectedFile(null);
    setOutputFormat('');
    setConvertedFile(null);
    setError(null);
    setConnectionError(null);
    setProgress(0);
    setCurrentStep('');
    setShowConnectionManager(false);
  };

  const handleAuthSuccess = (session) => {
    setIsAuthenticated(true);
    setCurrentUser({
      id: session.userId,
      email: session.email,
      name: session.name
    });
    console.log('User authenticated:', session.email);
  };

  const handleLogout = () => {
    localStorage.removeItem('nebula_session');
    setIsAuthenticated(false);
    setCurrentUser(null);
    setIsPremium(false);
    setUserSubscription(null);
    handleReset();
    console.log('User logged out');
  };

  const handleConnectionReady = (isReady) => {
    if (isReady) {
      setConnectionError(null);
      setShowConnectionManager(false);
      showToast('FFmpeg connection restored!', 'success');
    }
  };

  const handleConnectionFailed = (error) => {
    setConnectionError(error.message);
    setShowConnectionManager(true);
  };

  const handleUpgrade = async (planName, subscriptionData) => {
    // Handle successful subscription upgrade
    console.log('Upgrading to:', planName, subscriptionData);
    setIsPremium(true);
    setUserSubscription(subscriptionData);
    
    // Store subscription data in localStorage for persistence
    localStorage.setItem('nebula_subscription', JSON.stringify(subscriptionData));
    localStorage.setItem('nebula_premium', 'true');
    
    // Send upgrade confirmation email
    try {
      const userEmail = subscriptionData?.user?.email;
      if (userEmail && emailJSService.isConfigured()) {
        const features = [
          'Unlimited file conversions',
          'Larger file size limits (up to 5GB)',
          'Priority processing speed',
          'Advanced conversion settings',
          'Premium customer support',
          'Batch processing capabilities'
        ];
        
        await emailJSService.sendUpgradeConfirmation(userEmail, planName, features);
        console.log('Upgrade confirmation email sent');
      }
    } catch (emailError) {
      console.warn('Failed to send upgrade confirmation:', emailError);
      // Don't fail the upgrade if email fails
    }
  };

  const handleAdvancedSettingsChange = (newSettings) => {
    setAdvancedSettings(newSettings);
  };

  // New feature handlers
  const handleCloudImport = (files) => {
    console.log('☁️ Files imported from cloud:', files);
    if (files && files.length > 0) {
      setSelectedFile(files[0]);
      showToast(`Imported ${files.length} file(s) from cloud`, 'success');
    }
  };

  const handleCloudSave = (result) => {
    console.log('💾 File saved to cloud:', result);
    showToast(`File saved to ${result.provider}`, 'success');
    setCloudSaveFile(null);
  };

  const handleSaveToCloud = (file) => {
    setCloudSaveFile(file);
    setShowCloudIntegration(true);
  };

  const handleApplyPreset = (settings, preset) => {
    console.log('📋 Applying preset:', preset.name, settings);
    setAdvancedSettings(prev => ({ ...prev, ...settings }));
    showToast(`Applied preset: ${preset.name}`, 'success');
    setShowPresetProfiles(false);
  };

  const handleEditMetadata = (file) => {
    setFileForMetadata(file || selectedFile);
    setShowMetadataEditor(true);
  };

  const handleMetadataSaved = (updatedFile, metadata) => {
    console.log('📝 Metadata saved:', metadata);
    if (selectedFile) {
      setSelectedFile(updatedFile);
    }
    showToast('Metadata saved successfully', 'success');
  };

  const handleProtectFile = (file, mode = 'encrypt') => {
    setFileForMetadata(file || convertedFile || selectedFile);
    setPasswordProtectionMode(mode);
    setShowPasswordProtection(true);
  };

  const handleProtectionComplete = (protectedFile) => {
    console.log('🔐 File protection complete:', protectedFile);
    if (passwordProtectionMode === 'encrypt') {
      setConvertedFile(protectedFile);
      showToast('File protected successfully', 'success');
    } else {
      setSelectedFile(protectedFile);
      showToast('File decrypted successfully', 'success');
    }
  };

  const handleTabSwitch = (tab, e) => {
    // Simply update the React state - React will handle re-rendering
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
      <SplashScreen isLoading={isLoading} />
      
      {/* Show authentication screen only if explicitly requested (not by default) */}
      {!isLoading && !isAuthenticated && !isAdminMode && false && (
        <Suspense fallback={<div className="suspense-loading">Loading...</div>}>
          <AuthScreen onAuthSuccess={handleAuthSuccess} />
        </Suspense>
      )}
      
      {/* Global Modals */}
      {showFilePreview && selectedFile && (
        <Suspense fallback={<div className="modal-loading">Loading preview...</div>}>
          <FilePreview
            file={selectedFile}
            onClose={() => setShowFilePreview(false)}
          />
        </Suspense>
      )}
      
      {showConversionHistory && (
        <>
          <ConversionHistory onClose={() => setShowConversionHistory(false)} />
        </>
      )}

      {/* Cloud Integration Modal */}
      {showCloudIntegration && (
        <Suspense fallback={<div className="modal-loading">Loading cloud integration...</div>}>
          <CloudIntegration
            onFileImport={handleCloudImport}
            onSaveToCloud={handleCloudSave}
            fileToSave={cloudSaveFile}
            isPremium={isPremium}
            onClose={() => {
              setShowCloudIntegration(false);
              setCloudSaveFile(null);
            }}
          />
        </Suspense>
      )}

      {/* Preset Profiles Modal */}
      {showPresetProfiles && (
        <Suspense fallback={<div className="modal-loading">Loading presets...</div>}>
          <PresetProfiles
            onApplyPreset={handleApplyPreset}
            currentSettings={advancedSettings}
            fileType={selectedFile?.type?.split('/')[0] || 'video'}
            isPremium={isPremium}
            onClose={() => setShowPresetProfiles(false)}
          />
        </Suspense>
      )}

      {/* Metadata Editor Modal */}
      {showMetadataEditor && fileForMetadata && (
        <Suspense fallback={<div className="modal-loading">Loading metadata editor...</div>}>
          <MetadataEditor
            file={fileForMetadata}
            onSave={handleMetadataSaved}
            isPremium={isPremium}
            onClose={() => {
              setShowMetadataEditor(false);
              setFileForMetadata(null);
            }}
          />
        </Suspense>
      )}

      {/* Password Protection Modal */}
      {showPasswordProtection && fileForMetadata && (
        <Suspense fallback={<div className="modal-loading">Loading protection...</div>}>
          <PasswordProtection
            file={fileForMetadata}
            mode={passwordProtectionMode}
            onComplete={handleProtectionComplete}
            isPremium={isPremium}
            onClose={() => {
              setShowPasswordProtection(false);
              setFileForMetadata(null);
            }}
          />
        </Suspense>
      )}
      
      {showKeyboardShortcuts && (
        <>
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(255, 0, 0, 0.5)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div style={{ background: 'white', padding: '40px', borderRadius: '10px' }}>
              <h1>SHORTCUTS MODAL TEST</h1>
              <button onClick={() => setShowKeyboardShortcuts(false)}>Close</button>
            </div>
          </div>
          <KeyboardShortcuts onClose={() => setShowKeyboardShortcuts(false)} />
        </>
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
            <Suspense fallback={<div className="admin-loading">Loading admin panel...</div>}>
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
            </Suspense>
          ) : (
            <Suspense fallback={<AdminDashboardSkeleton />}>
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
              showToast('Logged out of admin mode', 'info');
              console.log('Admin privileges revoked');
            }} />
            </Suspense>
          )}
        </div>
      )}

      {/* Normal App Mode - Show for all users (authenticated or not) */}
      {!isAdminMode && !isLoading && (
        <div className="App" style={{ 
          opacity: isLoading ? 0 : 1, 
          transition: 'opacity 0.5s ease-in, background-color 0.3s ease, color 0.3s ease',
          backgroundColor: isDark ? '#1a202c' : '#ffffff',
          color: isDark ? '#f7fafc' : '#1a202c',
          minHeight: '100vh'
        }}>
          <DynamicHeader 
            isPremium={isPremium}
            userSubscription={userSubscription}
            onAccountClick={() => {
              console.log('👤 Account button clicked via prop!');
              // Use DOM manipulation to bypass React state issues
              const userInfo = userService.getUserInfo();
              const usageStats = userService.getUsageStats();
              
              const modal = document.createElement('div');
              modal.id = 'account-modal-container';
              modal.innerHTML = `
                <div class="account-overlay" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); z-index: 99999; display: flex; align-items: center; justify-content: center; padding: 20px;">
                  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 3px; border-radius: 16px; max-width: 450px; width: 100%; max-height: 90vh; overflow-y: auto;">
                    <div style="background: white; border-radius: 14px; padding: 30px; position: relative;">
                      <button id="close-account" style="position: absolute; top: 15px; right: 15px; background: none; border: none; font-size: 24px; cursor: pointer; color: #666; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">✕</button>
                      
                      <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 24px;">
                        <div style="width: 64px; height: 64px; border-radius: 50%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; color: white; font-size: 28px; font-weight: bold;">
                          ${escapeHtml(userInfo.name.charAt(0).toUpperCase())}
                        </div>
                        <div>
                          <h2 style="margin: 0; font-size: 22px; color: #333;">${escapeHtml(userInfo.name)}</h2>
                          <p style="margin: 4px 0 8px; color: #666; font-size: 14px;">${escapeHtml(userInfo.email || 'Guest User')}</p>
                          <span style="background: ${usageStats.accountType === 'Premium' ? 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' : '#e8e8e8'}; color: ${usageStats.accountType === 'Premium' ? 'white' : '#666'}; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">
                            ${escapeHtml(usageStats.accountType)}
                          </span>
                        </div>
                      </div>
                      
                      <div style="display: grid; gap: 16px; margin-bottom: 24px;">
                        <div style="background: #f8f9fa; padding: 16px; border-radius: 12px; display: flex; align-items: center; gap: 12px;">
                          <div style="font-size: 24px;">📊</div>
                          <div style="flex: 1;">
                            <div style="font-size: 12px; color: #666; margin-bottom: 4px;">Conversions Today</div>
                            <div style="font-size: 18px; font-weight: bold; color: #333;">${usageStats.conversionsToday} / ${usageStats.conversionsLimit}</div>
                            <div style="background: #e0e0e0; height: 6px; border-radius: 3px; margin-top: 8px; overflow: hidden;">
                              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); height: 100%; width: ${usageStats.conversionsPercentage}%; border-radius: 3px;"></div>
                            </div>
                            <div style="font-size: 11px; color: #888; margin-top: 4px;">${usageStats.conversionsRemaining} remaining</div>
                          </div>
                        </div>
                        
                        <div style="background: #f8f9fa; padding: 16px; border-radius: 12px; display: flex; align-items: center; gap: 12px;">
                          <div style="font-size: 24px;">📁</div>
                          <div style="flex: 1;">
                            <div style="font-size: 12px; color: #666; margin-bottom: 4px;">Max File Size</div>
                            <div style="font-size: 18px; font-weight: bold; color: #333;">${usageStats.maxFileSizeMB}MB</div>
                            <div style="font-size: 11px; color: #888; margin-top: 4px;">
                              ${userInfo.type === 'guest' ? 'Sign up for 500MB' : 'Upload large files'}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div style="margin-bottom: 24px;">
                        <h3 style="font-size: 14px; color: #333; margin: 0 0 12px;">Your Features</h3>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                          <div style="display: flex; align-items: center; gap: 8px; padding: 8px; background: #e8f5e9; border-radius: 8px; font-size: 13px;">
                            <span style="color: #4caf50;">✓</span> All formats
                          </div>
                          <div style="display: flex; align-items: center; gap: 8px; padding: 8px; background: #e8f5e9; border-radius: 8px; font-size: 13px;">
                            <span style="color: #4caf50;">✓</span> No watermarks
                          </div>
                          <div style="display: flex; align-items: center; gap: 8px; padding: 8px; background: #e8f5e9; border-radius: 8px; font-size: 13px;">
                            <span style="color: #4caf50;">✓</span> Local processing
                          </div>
                          <div style="display: flex; align-items: center; gap: 8px; padding: 8px; background: #e8f5e9; border-radius: 8px; font-size: 13px;">
                            <span style="color: #4caf50;">✓</span> Offline mode
                          </div>
                          ${userInfo.type !== 'guest' ? `
                            <div style="display: flex; align-items: center; gap: 8px; padding: 8px; background: #e8f5e9; border-radius: 8px; font-size: 13px;">
                              <span style="color: #4caf50;">✓</span> Batch processing
                            </div>
                            <div style="display: flex; align-items: center; gap: 8px; padding: 8px; background: #e8f5e9; border-radius: 8px; font-size: 13px;">
                              <span style="color: #4caf50;">✓</span> Custom presets
                            </div>
                          ` : `
                            <div style="display: flex; align-items: center; gap: 8px; padding: 8px; background: #f5f5f5; border-radius: 8px; font-size: 13px; color: #999;">
                              <span>🔒</span> Batch processing
                            </div>
                            <div style="display: flex; align-items: center; gap: 8px; padding: 8px; background: #f5f5f5; border-radius: 8px; font-size: 13px; color: #999;">
                              <span>🔒</span> Custom presets
                            </div>
                          `}
                        </div>
                      </div>
                      
                      <div style="display: flex; gap: 12px;">
                        <button id="donate-btn-account" style="flex: 1; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; padding: 14px; border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer;">
                          💜 Support Development
                        </button>
                        ${userInfo.type === 'guest' ? `
                          <button id="signup-btn-account" style="flex: 1; background: #4caf50; color: white; border: none; padding: 14px; border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer;">
                            🚀 Sign Up Free
                          </button>
                        ` : `
                          <button id="logout-btn-account" style="flex: 1; background: #f5f5f5; color: #666; border: none; padding: 14px; border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer;">
                            Logout
                          </button>
                        `}
                      </div>
                    </div>
                  </div>
                </div>
              `;
              document.body.appendChild(modal);
              
              // Close button
              document.getElementById('close-account').onclick = () => modal.remove();
              
              // Donate button
              const donateBtn = document.getElementById('donate-btn-account');
              if (donateBtn) {
                donateBtn.onclick = () => {
                  modal.remove();
                  window.dispatchEvent(new CustomEvent('open-donation-modal'));
                };
              }
              
              // Signup button (for guests)
              const signupBtn = document.getElementById('signup-btn-account');
              if (signupBtn) {
                signupBtn.onclick = () => {
                  modal.remove();
                  window.dispatchEvent(new CustomEvent('open-auth-modal'));
                };
              }
              
              // Logout button
              const logoutBtn = document.getElementById('logout-btn-account');
              if (logoutBtn) {
                logoutBtn.onclick = () => {
                  if (window.confirm('Are you sure you want to logout?')) {
                    userService.logout();
                    modal.remove();
                    window.location.reload();
                  }
                };
              }
              
              // Click outside to close
              modal.querySelector('.account-overlay').onclick = (e) => {
                if (e.target.classList.contains('account-overlay')) {
                  modal.remove();
                }
              };
            }}
            onContactClick={() => {
              // Same DOM modal as footer Contact button
              const modal = document.createElement('div');
              modal.id = 'contact-modal-container';
              modal.innerHTML = `
                <div class="contact-overlay" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); z-index: 99999; display: flex; align-items: center; justify-content: center; padding: 20px;">
                  <div style="background: white; padding: 40px; border-radius: 12px; max-width: 500px; width: 100%;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                      <h2 style="margin: 0;">📧 Contact Us</h2>
                      <button id="close-contact" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #666;">✕</button>
                    </div>
                    <form id="contact-form" style="display: grid; gap: 16px;">
                      <div>
                        <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333;">Name</label>
                        <input type="text" name="name" required style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; box-sizing: border-box;" placeholder="Your name">
                      </div>
                      <div>
                        <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333;">Email</label>
                        <input type="email" name="email" required style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; box-sizing: border-box;" placeholder="your@email.com">
                      </div>
                      <div>
                        <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333;">Subject</label>
                        <input type="text" name="subject" required style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; box-sizing: border-box;" placeholder="What's this about?">
                      </div>
                      <div>
                        <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333;">Message</label>
                        <textarea name="message" required rows="5" style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; resize: vertical; box-sizing: border-box;" placeholder="Tell us how we can help..."></textarea>
                      </div>
                      <button type="submit" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; padding: 14px; border-radius: 6px; font-size: 16px; font-weight: 600; cursor: pointer; margin-top: 8px;">Send Message</button>
                    </form>
                    <div id="contact-status" style="margin-top: 16px; padding: 12px; border-radius: 6px; display: none;"></div>
                  </div>
                </div>
              `;
              document.body.appendChild(modal);
              document.getElementById('close-contact').onclick = () => modal.remove();
              document.getElementById('contact-form').onsubmit = (e) => {
                e.preventDefault();
                const status = document.getElementById('contact-status');
                status.style.display = 'block';
                status.style.background = '#4caf50';
                status.style.color = 'white';
                status.textContent = '✓ Message sent! (Demo)';
                setTimeout(() => modal.remove(), 2000);
              };
              modal.querySelector('.contact-overlay').onclick = (e) => {
                if (e.target.classList.contains('contact-overlay')) modal.remove();
              };
            }}
            isScrolled={isScrolled}
          />

          {/* User Info Bar - Show for all users */}
          <div className="user-info-bar">
            {isAuthenticated && currentUser ? (
              <div className="user-welcome">
                <span className="welcome-icon">👋</span>
                Welcome back, <strong>{currentUser?.name || currentUser?.email}</strong>!
              </div>
            ) : (
              <div className="user-welcome">
                <span className="welcome-icon">🎬</span>
                <strong>Nebula Media Converter</strong> - Convert your media files instantly
              </div>
            )}
            <div className="user-actions">
              <button 
                onClick={() => {
                  console.log('📜 History clicked - creating DOM modal');
                  
                  // Get history from localStorage
                  const saved = localStorage.getItem('nebula_conversion_history');
                  const history = saved ? JSON.parse(saved) : [];
                  
                  // Create modal HTML
                  const modal = document.createElement('div');
                  modal.id = 'history-modal-container';
                  modal.innerHTML = `
                    <div class="history-overlay" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); z-index: 99999; display: flex; align-items: center; justify-content: center; padding: 20px;">
                      <div style="background: white; padding: 30px; border-radius: 12px; max-width: 800px; width: 100%; max-height: 80vh; overflow-y: auto;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                          <h2 style="margin: 0;">📜 Conversion History</h2>
                          <button id="close-history" style="background: #667eea; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 16px;">✕ Close</button>
                        </div>
                        ${history.length === 0 ? 
                          '<p style="text-align: center; color: #666; padding: 40px;">No conversion history yet. Start converting files!</p>' :
                          `<div style="display: grid; gap: 12px;">
                            ${history.slice(0, 20).map(item => `
                              <div style="padding: 16px; background: #f5f5f5; border-radius: 8px; border-left: 4px solid ${item.status === 'success' ? '#4caf50' : '#f44336'};">
                                <div style="display: flex; justify-content: space-between; align-items: start;">
                                  <div style="flex: 1;">
                                    <div style="font-weight: bold; margin-bottom: 4px;">${item.fileName || 'Unknown file'}</div>
                                    <div style="font-size: 14px; color: #666;">
                                      ${item.inputFormat ? item.inputFormat.toUpperCase() : '?'} → ${item.outputFormat ? item.outputFormat.toUpperCase() : '?'}
                                    </div>
                                    <div style="font-size: 12px; color: #999; margin-top: 4px;">
                                      ${item.timestamp ? new Date(item.timestamp).toLocaleString() : 'Unknown date'}
                                    </div>
                                  </div>
                                  <div style="text-align: right;">
                                    <span style="display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold; 
                                      background: ${item.status === 'success' ? '#4caf50' : '#f44336'}; color: white;">
                                      ${item.status === 'success' ? '✓ Success' : '✗ Failed'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            `).join('')}
                          </div>
                          ${history.length > 20 ? `<p style="text-align: center; color: #666; margin-top: 16px; font-size: 14px;">Showing 20 of ${history.length} conversions</p>` : ''}`
                        }
                        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; display: flex; gap: 10px; justify-content: flex-end;">
                          <button id="clear-history" style="background: #f44336; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer;">
                            🗑️ Clear History
                          </button>
                        </div>
                      </div>
                    </div>
                  `;
                  document.body.appendChild(modal);
                  
                  // Close button
                  document.getElementById('close-history').onclick = () => modal.remove();
                  
                  // Clear history button
                  document.getElementById('clear-history').onclick = () => {
                    if (window.confirm('Are you sure you want to clear all conversion history?')) {
                      localStorage.removeItem('nebula_conversion_history');
                      modal.remove();
                    }
                  };
                  
                  // Click outside to close
                  modal.querySelector('.history-overlay').onclick = (e) => {
                    if (e.target.classList.contains('history-overlay')) {
                      modal.remove();
                    }
                  };
                }}
                className="history-btn" 
                title="View Conversion History (Ctrl+H)"
              >
                📜 History
              </button>
              <button 
                onClick={() => {
                  console.log('⌨️ Shortcuts button clicked');
                  // Bypass React - render directly to DOM
                  const modal = document.createElement('div');
                  modal.id = 'shortcuts-modal-container';
                  modal.innerHTML = `
                    <div class="shortcuts-overlay" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); z-index: 99999; display: flex; align-items: center; justify-content: center;">
                      <div style="background: white; padding: 40px; border-radius: 10px; max-width: 600px; max-height: 80vh; overflow-y: auto;">
                        <h2 style="margin: 0 0 20px 0;">⌨️ Keyboard Shortcuts</h2>
                        <div style="display: grid; gap: 15px;">
                          <div style="display: flex; justify-content: space-between; padding: 10px; background: #f5f5f5; border-radius: 5px;">
                            <kbd style="background: #fff; padding: 5px 10px; border: 1px solid #ccc; border-radius: 3px;">Ctrl+U</kbd>
                            <span>Upload files</span>
                          </div>
                          <div style="display: flex; justify-content: space-between; padding: 10px; background: #f5f5f5; border-radius: 5px;">
                            <kbd style="background: #fff; padding: 5px 10px; border: 1px solid #ccc; border-radius: 3px;">Ctrl+H</kbd>
                            <span>Show conversion history</span>
                          </div>
                          <div style="display: flex; justify-content: space-between; padding: 10px; background: #f5f5f5; border-radius: 5px;">
                            <kbd style="background: #fff; padding: 5px 10px; border: 1px solid #ccc; border-radius: 3px;">Ctrl+K</kbd>
                            <span>Show keyboard shortcuts</span>
                          </div>
                          <div style="display: flex; justify-content: space-between; padding: 10px; background: #f5f5f5; border-radius: 5px;">
                            <kbd style="background: #fff; padding: 5px 10px; border: 1px solid #ccc; border-radius: 3px;">Ctrl+D</kbd>
                            <span>Toggle dark mode</span>
                          </div>
                          <div style="display: flex; justify-content: space-between; padding: 10px; background: #f5f5f5; border-radius: 5px;">
                            <kbd style="background: #fff; padding: 5px 10px; border: 1px solid #ccc; border-radius: 3px;">Esc</kbd>
                            <span>Close modals/dialogs</span>
                          </div>
                        </div>
                        <button id="close-shortcuts" style="margin-top: 20px; padding: 10px 20px; background: #667eea; color: white; border: none; border-radius: 5px; cursor: pointer; width: 100%;">Close</button>
                      </div>
                    </div>
                  `;
                  document.body.appendChild(modal);
                  
                  // Close button handler
                  document.getElementById('close-shortcuts').onclick = () => {
                    modal.remove();
                  };
                  
                  // Click outside to close
                  modal.querySelector('.shortcuts-overlay').onclick = (e) => {
                    if (e.target.classList.contains('shortcuts-overlay')) {
                      modal.remove();
                    }
                  };
                }}
                className="shortcuts-btn" 
                title="Keyboard Shortcuts (?)"
              >
                ⌨️ Shortcuts
              </button>
              {isAuthenticated && (
                <button onClick={handleLogout} className="logout-btn" title="Logout">
                  🚪 Logout
                </button>
              )}
            </div>
          </div>

          <main className="App-main" style={{
            backgroundColor: isDark ? '#1a202c' : '#f8f9fa',
            transition: 'background-color 0.3s ease'
          }}>
            <div className="converter-container" style={{
              backgroundColor: isDark ? '#2d3748' : '#ffffff',
              color: isDark ? '#e2e8f0' : '#1a202c',
              transition: 'background-color 0.3s ease, color 0.3s ease'
            }}>
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
                <Suspense fallback={<ConversionCardSkeleton />}>
                  <FileLifecycleManager 
                    cloudStorage={cloudStorage}
                    userId={userSubscription.user?.id}
                    isPremium={isPremium}
                  />
                </Suspense>
              )}            
              
              {/* Tab Navigation */}
              <div className="converter-tabs" style={{
                backgroundColor: isDark ? '#2d3748' : '#f0f0f0',
                borderColor: isDark ? '#4a5568' : '#e0e0e0'
              }}>
                <button 
                  className={`tab-btn ${activeTab === 'media' ? 'active' : ''}`}
                  data-tab="media"
                  onClick={(e) => handleTabSwitch('media', e)}
                  style={{
                    backgroundColor: activeTab === 'media' 
                      ? (isDark ? '#667eea' : '#667eea')
                      : (isDark ? '#4a5568' : '#e0e0e0'),
                    color: activeTab === 'media' ? '#ffffff' : (isDark ? '#e2e8f0' : '#333333')
                  }}
                >
                  🎵 Media Converter
                </button>
                <button 
                  className={`tab-btn ${activeTab === 'documents' ? 'active' : ''}`}
                  data-tab="documents"
                  onClick={(e) => handleTabSwitch('documents', e)}
                  style={{
                    backgroundColor: activeTab === 'documents' 
                      ? (isDark ? '#667eea' : '#667eea')
                      : (isDark ? '#4a5568' : '#e0e0e0'),
                    color: activeTab === 'documents' ? '#ffffff' : (isDark ? '#e2e8f0' : '#333333')
                  }}
                >
                  📄 Document Converter
                </button>
                {window.electron && (
                  <button 
                    className={`tab-btn ${activeTab === 'desktop' ? 'active' : ''}`}
                    data-tab="desktop"
                    onClick={(e) => handleTabSwitch('desktop', e)}
                    style={{
                      backgroundColor: activeTab === 'desktop' 
                        ? (isDark ? '#667eea' : '#667eea')
                        : (isDark ? '#4a5568' : '#e0e0e0'),
                      color: activeTab === 'desktop' ? '#ffffff' : (isDark ? '#e2e8f0' : '#333333')
                    }}
                  >
                    🖥️ Desktop Features
                  </button>
                )}
                <button 
                  className={`tab-btn ${activeTab === 'test' ? 'active' : ''}`}
                  data-tab="test"
                  onClick={(e) => handleTabSwitch('test', e)}
                  style={{
                    backgroundColor: activeTab === 'test' 
                      ? (isDark ? '#667eea' : '#667eea')
                      : (isDark ? '#4a5568' : '#e0e0e0'),
                    color: activeTab === 'test' ? '#ffffff' : (isDark ? '#e2e8f0' : '#333333')
                  }}
                >
                  🔬 FFmpeg Test
                </button>
                <button 
                  className={`tab-btn ${activeTab === 'tools' ? 'active' : ''}`}
                  data-tab="tools"
                  onClick={(e) => handleTabSwitch('tools', e)}
                  style={{
                    backgroundColor: activeTab === 'tools' 
                      ? (isDark ? '#667eea' : '#667eea')
                      : (isDark ? '#4a5568' : '#e0e0e0'),
                    color: activeTab === 'tools' ? '#ffffff' : (isDark ? '#e2e8f0' : '#333333')
                  }}
                >
                  🛠️ Advanced Tools
                </button>
                <button 
                  className={`tab-btn ${activeTab === '3d' ? 'active' : ''}`}
                  data-tab="3d"
                  onClick={(e) => handleTabSwitch('3d', e)}
                  style={{
                    backgroundColor: activeTab === '3d' 
                      ? (isDark ? '#667eea' : '#667eea')
                      : (isDark ? '#4a5568' : '#e0e0e0'),
                    color: activeTab === '3d' ? '#ffffff' : (isDark ? '#e2e8f0' : '#333333')
                  }}
                >
                  🗿 3D Converter
                </button>
              </div>

              {/* Tab Content Container - Always render but show/hide with CSS */}
              <div className="tab-contents">
                {/* Media Converter Tab */}
                <div 
                  className="tab-content"
                  style={{ display: activeTab === 'media' ? 'block' : 'none' }}
                >
                  {/* Connection Manager */}
                  {(showConnectionManager || connectionError) && (
                    <ConnectionManager
                      mediaConverter={converter}
                      onConnectionReady={handleConnectionReady}
                      onConnectionFailed={handleConnectionFailed}
                    />
                  )}

                  {/* Quick Action Toolbar */}
                  <div className="quick-actions-toolbar">
                    <button 
                      className="quick-action-btn"
                      onClick={() => setShowCloudIntegration(true)}
                      title="Import from Cloud"
                    >
                      ☁️ Cloud Import
                    </button>
                    <button 
                      className="quick-action-btn"
                      onClick={() => setShowPresetProfiles(true)}
                      title="Use Preset Profile"
                    >
                      📋 Presets
                    </button>
                    {selectedFile && (
                      <button 
                        className="quick-action-btn"
                        onClick={() => handleEditMetadata(selectedFile)}
                        title="Edit File Metadata"
                      >
                        🏷️ Edit Metadata
                      </button>
                    )}
                    {convertedFile && (
                      <>
                        <button 
                          className="quick-action-btn"
                          onClick={() => handleSaveToCloud(convertedFile)}
                          title="Save to Cloud"
                        >
                          💾 Save to Cloud
                        </button>
                        <button 
                          className="quick-action-btn"
                          onClick={() => handleProtectFile(convertedFile)}
                          title="Password Protect"
                        >
                          🔐 Protect
                        </button>
                      </>
                    )}
                  </div>
                  
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
                    connectionError={connectionError}
                  />

                  <DownloadResult
                    convertedFile={convertedFile}
                    onReset={handleReset}
                    onSaveToCloud={handleSaveToCloud}
                    onEditMetadata={handleEditMetadata}
                    onProtectFile={handleProtectFile}
                  />
                </div>

                {/* Document Converter Tab */}
                <div 
                  className="tab-content"
                  style={{ display: activeTab === 'documents' ? 'block' : 'none' }}
                >
                  <Suspense fallback={<ConversionCardSkeleton />}>
                    <DocumentConverter 
                      isPremium={isPremium} 
                      onUpgrade={handleUpgrade}
                    />
                  </Suspense>
                </div>

                {/* Desktop Features Tab */}
                <div 
                  className="tab-content"
                  style={{ display: activeTab === 'desktop' ? 'block' : 'none' }}
                >
                  {window.electron && (
                    <Suspense fallback={<ConversionCardSkeleton />}>
                      <DesktopFeatures currentUser={currentUser} onLogout={handleLogout} />
                    </Suspense>
                  )}
                </div>

                {/* FFmpeg Test Tab */}
                <div 
                  className="tab-content"
                  style={{ display: activeTab === 'test' ? 'block' : 'none' }}
                >
                  <Suspense fallback={<ConversionCardSkeleton />}>
                    <FFmpegTest />
                  </Suspense>
                </div>

                {/* Advanced Tools Tab */}
                <div 
                  className="tab-content"
                  style={{ display: activeTab === 'tools' ? 'block' : 'none' }}
                >
                  <Suspense fallback={<ConversionCardSkeleton />}>
                    <AdvancedTools isPremium={isPremium} />
                  </Suspense>
                </div>

                {/* 3D Converter Tab */}
                <div 
                  className="tab-content"
                  style={{ display: activeTab === '3d' ? 'block' : 'none' }}
                >
                  <Suspense fallback={<ConversionCardSkeleton />}>
                    <ThreeDConverter isPremium={isPremium} onUpgrade={handleUpgrade} />
                  </Suspense>
                </div>
              </div>
            </div>
          </main>
          
          <footer className="App-footer">
            <p>Built with React and FFmpeg.wasm • Made with 💜 by the community</p>
            <div className="footer-buttons">
              <button 
                className="donate-btn-footer"
                onClick={() => setShowDonationPrompt(true)}
                title="Support development"
              >
                💜 Donate
              </button>
              <button 
                className="contact-btn"
                onClick={() => {
                console.log('📧 Contact Us clicked');
                
                const modal = document.createElement('div');
                modal.id = 'contact-modal-container';
                modal.innerHTML = `
                  <div class="contact-overlay" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); z-index: 99999; display: flex; align-items: center; justify-content: center; padding: 20px;">
                    <div style="background: white; padding: 40px; border-radius: 12px; max-width: 500px; width: 100%;">
                      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                        <h2 style="margin: 0;">📧 Contact Us</h2>
                        <button id="close-contact" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #666;">✕</button>
                      </div>
                      
                      <form id="contact-form" style="display: grid; gap: 16px;">
                        <div>
                          <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333;">Name</label>
                          <input type="text" name="name" required 
                            style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; box-sizing: border-box;"
                            placeholder="Your name">
                        </div>
                        
                        <div>
                          <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333;">Email</label>
                          <input type="email" name="email" required 
                            style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; box-sizing: border-box;"
                            placeholder="your@email.com">
                        </div>
                        
                        <div>
                          <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333;">Subject</label>
                          <input type="text" name="subject" required 
                            style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; box-sizing: border-box;"
                            placeholder="What's this about?">
                        </div>
                        
                        <div>
                          <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333;">Message</label>
                          <textarea name="message" required rows="5"
                            style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; resize: vertical; box-sizing: border-box;"
                            placeholder="Tell us how we can help..."></textarea>
                        </div>
                        
                        <button type="submit" 
                          style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; padding: 14px; border-radius: 6px; font-size: 16px; font-weight: 600; cursor: pointer; margin-top: 8px;">
                          Send Message
                        </button>
                      </form>
                      
                      <div id="contact-status" style="margin-top: 16px; padding: 12px; border-radius: 6px; display: none;"></div>
                    </div>
                  </div>
                `;
                document.body.appendChild(modal);
                
                // Close button
                document.getElementById('close-contact').onclick = () => modal.remove();
                
                // Form submit
                document.getElementById('contact-form').onsubmit = (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.target);
                  const data = {
                    name: formData.get('name'),
                    email: formData.get('email'),
                    subject: formData.get('subject'),
                    message: formData.get('message')
                  };
                  
                  const status = document.getElementById('contact-status');
                  status.style.display = 'block';
                  status.style.background = '#4caf50';
                  status.style.color = 'white';
                  status.textContent = '✓ Message sent! (Note: This is a demo - implement actual email service)';
                  
                  console.log('Contact form data:', data);
                  
                  setTimeout(() => modal.remove(), 2000);
                };
                
                // Click outside to close
                modal.querySelector('.contact-overlay').onclick = (e) => {
                  if (e.target.classList.contains('contact-overlay')) {
                    modal.remove();
                  }
                };
              }}
              title="Contact us for support or feedback"
            >
              📧 Contact Us
            </button>
            </div>
          </footer>
        </div>
      )}
      
      {/* PWA Install Prompt */}
      <InstallPWA />

      {/* PWA Update Notification */}
      <UpdateNotification />

      {/* Signup Prompt */}
      {showSignupPrompt && (
        <SignupPrompt
          trigger={signupTrigger}
          onSignup={() => {
            setShowSignupPrompt(false);
            // Open auth screen with signup mode
            window.dispatchEvent(new CustomEvent('open-auth-modal', { detail: { mode: 'signup' } }));
          }}
          onDismiss={() => setShowSignupPrompt(false)}
        />
      )}

      {/* User Dashboard */}
      {showUserDashboard && (
        <UserDashboard onClose={() => setShowUserDashboard(false)} />
      )}

      {/* Donation Prompt */}
      {showDonationPrompt && (
        <DonationPrompt onClose={() => setShowDonationPrompt(false)} />
      )}
    </>
  );
}

export default App;
