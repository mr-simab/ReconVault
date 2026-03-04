import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const defaultSettings = {
  // Graph Settings
  graphSimulationSpeed: 'normal', // slow, normal, fast
  nodeLabelDensity: 'hover', // always, hover, never
  glowIntensity: 0.7, // 0-1
  animationIntensity: 0.8, // 0-1
  performanceMode: 'balanced', // high-quality, balanced, performance
  autoSave: true,
  
  // Notification Settings
  notificationDuration: 5000, // ms
  notificationPosition: 'top-right', // top-right, top-left, bottom-right, bottom-left
  notificationSound: false,
  showProgressNotifications: true,
  showSuccessNotifications: true,
  showErrorNotifications: true,
  showWarningNotifications: true,
  showInfoNotifications: true,
  
  // API Settings
  backendURL: process.env.REACT_APP_API_URL || 'http://localhost:8000',
  websocketURL: process.env.REACT_APP_WS_URL || 'ws://localhost:8000',
  requestTimeout: 30000, // ms
  retryCount: 3,
  
  // Export Settings
  defaultExportFormat: 'json',
  includeMetadataInExport: true,
  watermarkOnExports: true,
  attributionText: 'ReconVault Intelligence Platform',
  
  // Theme
  theme: 'cyber-dark',
  useSystemTheme: false
};

const SettingsPanel = ({ isOpen, onClose, onSettingsChange }) => {
  const [settings, setSettings] = useState(defaultSettings);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeSection, setActiveSection] = useState('graph');

  useEffect(() => {
    // Load settings from localStorage
    const savedSettings = localStorage.getItem('reconvault_settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings({ ...defaultSettings, ...parsed });
      } catch (error) {
        console.error('[SettingsPanel] Error loading settings:', error);
      }
    }
  }, []);

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    localStorage.setItem('reconvault_settings', JSON.stringify(settings));
    setHasChanges(false);
    
    if (onSettingsChange) {
      onSettingsChange(settings);
    }
  };

  const handleReset = () => {
    if (window.confirm('Reset all settings to default values?')) {
      setSettings(defaultSettings);
      setHasChanges(true);
    }
  };

  const handleExport = () => {
    const json = JSON.stringify(settings, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'reconvault-settings.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setTimeout(() => URL.revokeObjectURL(url), 100);
  };

  const sections = [
    { id: 'graph', name: 'Graph', icon: '📊' },
    { id: 'notifications', name: 'Notifications', icon: '🔔' },
    { id: 'api', name: 'API', icon: '🔌' },
    { id: 'export', name: 'Export', icon: '📤' }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ type: 'spring', duration: 0.4 }}
            className="fixed right-0 top-0 bottom-0 w-full md:w-[600px] bg-cyber-dark border-l-2 border-neon-green shadow-2xl z-50 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b border-neon-green/30 bg-cyber-darker">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-neon-green font-mono flex items-center">
                  <svg className="w-8 h-8 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Settings
                </h2>
                
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg bg-danger-red/20 text-danger-red hover:bg-danger-red/30 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Section Tabs */}
              <div className="flex gap-2 overflow-x-auto">
                {sections.map(section => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`px-4 py-2 rounded-lg font-mono whitespace-nowrap transition-colors ${
                      activeSection === section.id
                        ? 'bg-neon-green text-cyber-black'
                        : 'bg-cyber-dark text-gray-400 hover:text-neon-green'
                    }`}
                  >
                    {section.icon} {section.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
              {/* Graph Settings */}
              {activeSection === 'graph' && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-neon-green font-mono mb-2">
                      Simulation Speed
                    </label>
                    <select
                      value={settings.graphSimulationSpeed}
                      onChange={(e) => handleSettingChange('graphSimulationSpeed', e.target.value)}
                      className="w-full px-4 py-2 bg-cyber-black border border-neon-green/30 rounded-lg text-neon-green focus:outline-none focus:border-neon-green"
                    >
                      <option value="slow">Slow</option>
                      <option value="normal">Normal</option>
                      <option value="fast">Fast</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-neon-green font-mono mb-2">
                      Node Label Display
                    </label>
                    <select
                      value={settings.nodeLabelDensity}
                      onChange={(e) => handleSettingChange('nodeLabelDensity', e.target.value)}
                      className="w-full px-4 py-2 bg-cyber-black border border-neon-green/30 rounded-lg text-neon-green focus:outline-none focus:border-neon-green"
                    >
                      <option value="always">Always Show</option>
                      <option value="hover">Show on Hover</option>
                      <option value="never">Never Show</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-neon-green font-mono mb-2">
                      Glow Intensity: {(settings.glowIntensity * 100).toFixed(0)}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={settings.glowIntensity}
                      onChange={(e) => handleSettingChange('glowIntensity', parseFloat(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-neon-green font-mono mb-2">
                      Animation Intensity: {(settings.animationIntensity * 100).toFixed(0)}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={settings.animationIntensity}
                      onChange={(e) => handleSettingChange('animationIntensity', parseFloat(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-neon-green font-mono mb-2">
                      Performance Mode
                    </label>
                    <select
                      value={settings.performanceMode}
                      onChange={(e) => handleSettingChange('performanceMode', e.target.value)}
                      className="w-full px-4 py-2 bg-cyber-black border border-neon-green/30 rounded-lg text-neon-green focus:outline-none focus:border-neon-green"
                    >
                      <option value="high-quality">High Quality</option>
                      <option value="balanced">Balanced</option>
                      <option value="performance">Performance</option>
                    </select>
                  </div>

                  <div>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.autoSave}
                        onChange={(e) => handleSettingChange('autoSave', e.target.checked)}
                        className="mr-3"
                      />
                      <span className="text-gray-300">Auto-save graph state</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Notification Settings */}
              {activeSection === 'notifications' && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-neon-green font-mono mb-2">
                      Duration (seconds)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={settings.notificationDuration / 1000}
                      onChange={(e) => handleSettingChange('notificationDuration', parseInt(e.target.value) * 1000)}
                      className="w-full px-4 py-2 bg-cyber-black border border-neon-green/30 rounded-lg text-neon-green focus:outline-none focus:border-neon-green"
                    />
                  </div>

                  <div>
                    <label className="block text-neon-green font-mono mb-2">
                      Position
                    </label>
                    <select
                      value={settings.notificationPosition}
                      onChange={(e) => handleSettingChange('notificationPosition', e.target.value)}
                      className="w-full px-4 py-2 bg-cyber-black border border-neon-green/30 rounded-lg text-neon-green focus:outline-none focus:border-neon-green"
                    >
                      <option value="top-right">Top Right</option>
                      <option value="top-left">Top Left</option>
                      <option value="bottom-right">Bottom Right</option>
                      <option value="bottom-left">Bottom Left</option>
                    </select>
                  </div>

                  <div className="space-y-3">
                    <label className="block text-neon-green font-mono mb-2">
                      Show Notifications For:
                    </label>
                    
                    {[
                      { key: 'showProgressNotifications', label: 'Progress' },
                      { key: 'showSuccessNotifications', label: 'Success' },
                      { key: 'showErrorNotifications', label: 'Error' },
                      { key: 'showWarningNotifications', label: 'Warning' },
                      { key: 'showInfoNotifications', label: 'Info' }
                    ].map(item => (
                      <label key={item.key} className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings[item.key]}
                          onChange={(e) => handleSettingChange(item.key, e.target.checked)}
                          className="mr-3"
                        />
                        <span className="text-gray-300">{item.label}</span>
                      </label>
                    ))}
                  </div>

                  <div>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.notificationSound}
                        onChange={(e) => handleSettingChange('notificationSound', e.target.checked)}
                        className="mr-3"
                      />
                      <span className="text-gray-300">Play sound for notifications</span>
                    </label>
                  </div>
                </div>
              )}

              {/* API Settings */}
              {activeSection === 'api' && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-neon-green font-mono mb-2">
                      Backend URL
                    </label>
                    <input
                      type="text"
                      value={settings.backendURL}
                      onChange={(e) => handleSettingChange('backendURL', e.target.value)}
                      className="w-full px-4 py-2 bg-cyber-black border border-neon-green/30 rounded-lg text-neon-green focus:outline-none focus:border-neon-green font-mono"
                      placeholder="http://localhost:8000"
                    />
                  </div>

                  <div>
                    <label className="block text-neon-green font-mono mb-2">
                      WebSocket URL
                    </label>
                    <input
                      type="text"
                      value={settings.websocketURL}
                      onChange={(e) => handleSettingChange('websocketURL', e.target.value)}
                      className="w-full px-4 py-2 bg-cyber-black border border-neon-green/30 rounded-lg text-neon-green focus:outline-none focus:border-neon-green font-mono"
                      placeholder="ws://localhost:8000"
                    />
                  </div>

                  <div>
                    <label className="block text-neon-green font-mono mb-2">
                      Request Timeout (seconds)
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="300"
                      value={settings.requestTimeout / 1000}
                      onChange={(e) => handleSettingChange('requestTimeout', parseInt(e.target.value) * 1000)}
                      className="w-full px-4 py-2 bg-cyber-black border border-neon-green/30 rounded-lg text-neon-green focus:outline-none focus:border-neon-green"
                    />
                  </div>

                  <div>
                    <label className="block text-neon-green font-mono mb-2">
                      Retry Count
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      value={settings.retryCount}
                      onChange={(e) => handleSettingChange('retryCount', parseInt(e.target.value))}
                      className="w-full px-4 py-2 bg-cyber-black border border-neon-green/30 rounded-lg text-neon-green focus:outline-none focus:border-neon-green"
                    />
                  </div>
                </div>
              )}

              {/* Export Settings */}
              {activeSection === 'export' && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-neon-green font-mono mb-2">
                      Default Format
                    </label>
                    <select
                      value={settings.defaultExportFormat}
                      onChange={(e) => handleSettingChange('defaultExportFormat', e.target.value)}
                      className="w-full px-4 py-2 bg-cyber-black border border-neon-green/30 rounded-lg text-neon-green focus:outline-none focus:border-neon-green"
                    >
                      <option value="json">JSON</option>
                      <option value="csv">CSV</option>
                      <option value="png">PNG</option>
                      <option value="svg">SVG</option>
                      <option value="neo4j">Neo4j Cypher</option>
                      <option value="gml">GML</option>
                      <option value="graphml">GraphML</option>
                    </select>
                  </div>

                  <div>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.includeMetadataInExport}
                        onChange={(e) => handleSettingChange('includeMetadataInExport', e.target.checked)}
                        className="mr-3"
                      />
                      <span className="text-gray-300">Include metadata in exports</span>
                    </label>
                  </div>

                  <div>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.watermarkOnExports}
                        onChange={(e) => handleSettingChange('watermarkOnExports', e.target.checked)}
                        className="mr-3"
                      />
                      <span className="text-gray-300">Add watermark to image exports</span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-neon-green font-mono mb-2">
                      Attribution Text
                    </label>
                    <input
                      type="text"
                      value={settings.attributionText}
                      onChange={(e) => handleSettingChange('attributionText', e.target.value)}
                      className="w-full px-4 py-2 bg-cyber-black border border-neon-green/30 rounded-lg text-neon-green focus:outline-none focus:border-neon-green font-mono"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-neon-green/30 bg-cyber-darker">
              {hasChanges && (
                <div className="mb-3 p-2 bg-warning-yellow/20 border border-warning-yellow/50 rounded text-warning-yellow text-sm text-center">
                  You have unsaved changes
                </div>
              )}
              
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={!hasChanges}
                  className={`flex-1 px-4 py-2 rounded-lg font-mono font-bold transition-colors ${
                    hasChanges
                      ? 'bg-neon-green text-cyber-black hover:bg-neon-green/80'
                      : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  Save Settings
                </button>
                
                <button
                  onClick={handleReset}
                  className="px-4 py-2 bg-danger-red/20 text-danger-red rounded-lg font-mono hover:bg-danger-red/30 transition-colors"
                >
                  Reset
                </button>
                
                <button
                  onClick={handleExport}
                  className="px-4 py-2 bg-cyber-purple/20 text-cyber-purple rounded-lg font-mono hover:bg-cyber-purple/30 transition-colors"
                  title="Export settings to file"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default SettingsPanel;
