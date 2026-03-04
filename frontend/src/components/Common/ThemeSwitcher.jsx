import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const themes = {
  'cyber-dark': {
    name: 'Cyber Dark',
    description: 'Neon green on dark (default)',
    colors: {
      primary: '#00ff41',
      secondary: '#00d9ff',
      accent: '#ff006e',
      background: '#0a0e1a',
      surface: '#14181f',
      text: '#00ff41',
      textSecondary: '#a0a0a0'
    },
    icon: '💚'
  },
  'neon-magenta': {
    name: 'Neon Magenta',
    description: 'Pink and magenta focus',
    colors: {
      primary: '#ff006e',
      secondary: '#ff3399',
      accent: '#8f00ff',
      background: '#0a0414',
      surface: '#14091f',
      text: '#ff006e',
      textSecondary: '#a09090'
    },
    icon: '💗'
  },
  'hacker-green': {
    name: 'Hacker Green',
    description: 'Classic Matrix green',
    colors: {
      primary: '#00ff00',
      secondary: '#00cc00',
      accent: '#00ff41',
      background: '#000000',
      surface: '#001100',
      text: '#00ff00',
      textSecondary: '#009900'
    },
    icon: '💻'
  },
  'synthwave': {
    name: 'Synthwave',
    description: '80s pink and purple',
    colors: {
      primary: '#ff00ff',
      secondary: '#00ffff',
      accent: '#ffff00',
      background: '#1a0033',
      surface: '#2d0055',
      text: '#ff00ff',
      textSecondary: '#cc00cc'
    },
    icon: '🌆'
  },
  'minimal': {
    name: 'Minimal',
    description: 'Subtle colors',
    colors: {
      primary: '#4a9eff',
      secondary: '#6db3ff',
      accent: '#ff6b6b',
      background: '#0f1419',
      surface: '#1a1f2e',
      text: '#e0e0e0',
      textSecondary: '#808080'
    },
    icon: '⚪'
  }
};

const ThemeSwitcher = ({ className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentTheme, setCurrentTheme] = useState('cyber-dark');
  const [systemTheme, setSystemTheme] = useState(false);

  useEffect(() => {
    // Load saved theme from localStorage
    const savedTheme = localStorage.getItem('reconvault_theme');
    const savedSystemTheme = localStorage.getItem('reconvault_system_theme') === 'true';
    
    if (savedTheme && themes[savedTheme]) {
      setCurrentTheme(savedTheme);
      applyTheme(savedTheme);
    }
    
    setSystemTheme(savedSystemTheme);
    
    // Listen for system theme changes
    if (savedSystemTheme) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      handleSystemThemeChange(mediaQuery);
      
      mediaQuery.addEventListener('change', handleSystemThemeChange);
      return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
    }
  }, []);

  const handleSystemThemeChange = (e) => {
    if (systemTheme) {
      const theme = e.matches ? 'cyber-dark' : 'minimal';
      setCurrentTheme(theme);
      applyTheme(theme);
    }
  };

  const applyTheme = (themeKey) => {
    const theme = themes[themeKey];
    if (!theme) return;

    // Apply CSS variables
    const root = document.documentElement;
    root.style.setProperty('--color-primary', theme.colors.primary);
    root.style.setProperty('--color-secondary', theme.colors.secondary);
    root.style.setProperty('--color-accent', theme.colors.accent);
    root.style.setProperty('--color-background', theme.colors.background);
    root.style.setProperty('--color-surface', theme.colors.surface);
    root.style.setProperty('--color-text', theme.colors.text);
    root.style.setProperty('--color-text-secondary', theme.colors.textSecondary);

    // Update data attribute for CSS selectors
    document.documentElement.setAttribute('data-theme', themeKey);
  };

  const handleThemeChange = (themeKey) => {
    setCurrentTheme(themeKey);
    applyTheme(themeKey);
    localStorage.setItem('reconvault_theme', themeKey);
    setIsOpen(false);
  };

  const handleSystemThemeToggle = () => {
    const newValue = !systemTheme;
    setSystemTheme(newValue);
    localStorage.setItem('reconvault_system_theme', newValue.toString());
    
    if (newValue) {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const theme = isDark ? 'cyber-dark' : 'minimal';
      handleThemeChange(theme);
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Theme Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg bg-cyber-dark/50 border border-neon-green/30 hover:border-neon-green/60 transition-colors"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        title="Change Theme"
      >
        <svg 
          className="w-5 h-5 text-neon-green" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" 
          />
        </svg>
      </motion.button>

      {/* Theme Selector Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ type: 'spring', duration: 0.3 }}
              className="absolute right-0 mt-2 w-80 bg-cyber-dark border-2 border-neon-green/50 rounded-lg shadow-2xl z-50 overflow-hidden"
            >
              {/* Header */}
              <div className="p-4 border-b border-neon-green/30 bg-cyber-darker">
                <h3 className="text-neon-green font-mono font-bold flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 2a2 2 0 00-2 2v11a3 3 0 106 0V4a2 2 0 00-2-2H4zm1 14a1 1 0 100-2 1 1 0 000 2zm5-1.757l4.9-4.9a2 2 0 000-2.828L13.485 5.1a2 2 0 00-2.828 0L10 5.757v8.486zM16 18H9.071l6-6H16a2 2 0 012 2v2a2 2 0 01-2 2z" clipRule="evenodd" />
                  </svg>
                  Theme Selector
                </h3>
                <p className="text-gray-400 text-sm mt-1">Choose your visual style</p>
              </div>

              {/* System Theme Toggle */}
              <div className="p-4 border-b border-neon-green/30 bg-cyber-darker/50">
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-neon-green mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.804A1 1 0 0113 18H7a1 1 0 01-.707-1.707l.804-.804L7.22 15H5a2 2 0 01-2-2V5zm5.771 7H5V5h10v7H8.771z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-300 text-sm font-mono">Use System Theme</span>
                  </div>
                  <div 
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      systemTheme ? 'bg-neon-green' : 'bg-gray-600'
                    }`}
                    onClick={handleSystemThemeToggle}
                  >
                    <motion.div
                      className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full"
                      animate={{ x: systemTheme ? 24 : 0 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  </div>
                </label>
              </div>

              {/* Theme Options */}
              <div className="p-2 max-h-96 overflow-y-auto custom-scrollbar">
                {Object.entries(themes).map(([key, theme]) => (
                  <motion.button
                    key={key}
                    onClick={() => handleThemeChange(key)}
                    className={`w-full p-3 mb-2 rounded-lg transition-all ${
                      currentTheme === key
                        ? 'bg-neon-green/20 border-2 border-neon-green'
                        : 'bg-cyber-darker border-2 border-transparent hover:border-neon-green/50'
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-center">
                      {/* Theme Icon */}
                      <div className="text-2xl mr-3">{theme.icon}</div>
                      
                      {/* Theme Info */}
                      <div className="flex-1 text-left">
                        <div className="font-mono font-bold text-neon-green text-sm">
                          {theme.name}
                        </div>
                        <div className="text-gray-400 text-xs">
                          {theme.description}
                        </div>
                      </div>
                      
                      {/* Color Preview */}
                      <div className="flex gap-1">
                        <div 
                          className="w-4 h-4 rounded-full border border-gray-600"
                          style={{ backgroundColor: theme.colors.primary }}
                        />
                        <div 
                          className="w-4 h-4 rounded-full border border-gray-600"
                          style={{ backgroundColor: theme.colors.secondary }}
                        />
                        <div 
                          className="w-4 h-4 rounded-full border border-gray-600"
                          style={{ backgroundColor: theme.colors.accent }}
                        />
                      </div>
                      
                      {/* Check Mark */}
                      {currentTheme === key && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="ml-2"
                        >
                          <svg className="w-5 h-5 text-neon-green" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </motion.div>
                      )}
                    </div>
                  </motion.button>
                ))}
              </div>

              {/* Footer */}
              <div className="p-3 border-t border-neon-green/30 bg-cyber-darker">
                <p className="text-gray-500 text-xs text-center font-mono">
                  Theme will be saved automatically
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ThemeSwitcher;
