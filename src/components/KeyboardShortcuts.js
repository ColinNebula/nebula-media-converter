import React, { useEffect, useState, useCallback } from 'react';
import './KeyboardShortcuts.css';

const SHORTCUTS = [
  { key: 'Ctrl+U', description: 'Upload files', action: 'upload' },
  { key: 'Ctrl+H', description: 'Show conversion history', action: 'history' },
  { key: 'Ctrl+K', description: 'Show keyboard shortcuts', action: 'shortcuts' },
  { key: 'Ctrl+D', description: 'Toggle dark mode', action: 'theme' },
  { key: 'Ctrl+I', description: 'Admin panel (hidden)', action: 'admin' },
  { key: 'Esc', description: 'Close modals/dialogs', action: 'escape' },
  { key: '?', description: 'Show help', action: 'help' },
];

export const useKeyboardShortcuts = (handlers = {}) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+U - Upload
      if (e.ctrlKey && e.key === 'u') {
        e.preventDefault();
        handlers.onUpload?.();
      }
      
      // Ctrl+H - History
      if (e.ctrlKey && e.key === 'h') {
        e.preventDefault();
        handlers.onHistory?.();
      }
      
      // Ctrl+K - Shortcuts
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        handlers.onShortcuts?.();
      }
      
      // Ctrl+D - Theme
      if (e.ctrlKey && e.key === 'd') {
        e.preventDefault();
        handlers.onTheme?.();
      }
      
      // Ctrl+I - Admin
      if (e.ctrlKey && e.key === 'i') {
        e.preventDefault();
        handlers.onAdmin?.();
      }
      
      // Esc - Close
      if (e.key === 'Escape') {
        handlers.onEscape?.();
      }
      
      // ? - Help
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        handlers.onHelp?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlers]);
};

const KeyboardShortcutsModal = ({ onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredShortcuts = SHORTCUTS.filter(shortcut =>
    shortcut.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    shortcut.key.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div className="shortcuts-overlay" onClick={onClose}>
      <div className="shortcuts-modal" onClick={(e) => e.stopPropagation()}>
        <div className="shortcuts-header">
          <h2>⌨️ Keyboard Shortcuts</h2>
          <button className="shortcuts-close" onClick={onClose}>×</button>
        </div>

        <div className="shortcuts-search">
          <input
            type="text"
            placeholder="Search shortcuts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoFocus
          />
        </div>

        <div className="shortcuts-list">
          {filteredShortcuts.map((shortcut, index) => (
            <div key={index} className="shortcut-item">
              <div className="shortcut-keys">
                {shortcut.key.split('+').map((key, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <span className="key-separator">+</span>}
                    <kbd className="key">{key}</kbd>
                  </React.Fragment>
                ))}
              </div>
              <div className="shortcut-description">{shortcut.description}</div>
            </div>
          ))}
        </div>

        <div className="shortcuts-footer">
          <p>💡 Press <kbd>?</kbd> or <kbd>Ctrl+K</kbd> to show this dialog anytime</p>
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcutsModal;
