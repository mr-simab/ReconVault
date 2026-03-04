import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const keyboardShortcuts = [
  {
    category: 'Navigation',
    shortcuts: [
      { keys: ['C'], description: 'Center view' },
      { keys: ['F'], description: 'Fit to screen' },
      { keys: ['+'], description: 'Zoom in' },
      { keys: ['-'], description: 'Zoom out' },
      { keys: ['←', '→', '↑', '↓'], description: 'Pan view' },
      { keys: ['Ctrl', 'A'], description: 'Select all nodes' },
      { keys: ['Esc'], description: 'Deselect all' }
    ]
  },
  {
    category: 'Search & Filter',
    shortcuts: [
      { keys: ['Ctrl', 'F'], description: 'Focus search' },
      { keys: ['Ctrl', 'Shift', 'F'], description: 'Advanced search' },
      { keys: ['Ctrl', 'K'], description: 'Filter menu' },
      { keys: ['/'], description: 'Quick search' }
    ]
  },
  {
    category: 'Export & Save',
    shortcuts: [
      { keys: ['Ctrl', 'E'], description: 'Export graph' },
      { keys: ['Ctrl', 'S'], description: 'Save snapshot' },
      { keys: ['Ctrl', 'L'], description: 'Share/copy link' }
    ]
  },
  {
    category: 'Help',
    shortcuts: [
      { keys: ['?'], description: 'Keyboard shortcuts' },
      { keys: ['H'], description: 'Help panel' }
    ]
  },
  {
    category: 'Other',
    shortcuts: [
      { keys: ['Delete'], description: 'Delete selected nodes' },
      { keys: ['Space'], description: 'Toggle simulation pause' },
      { keys: ['Ctrl', 'Shift', 'D'], description: 'Toggle debug overlay' }
    ]
  }
];

const features = [
  {
    icon: '🔍',
    title: 'Advanced Search',
    description: 'Search entities with powerful query syntax. Use type:DOMAIN, source:web, or regex patterns.',
    example: 'type:IP riskLevel:CRITICAL'
  },
  {
    icon: '🎯',
    title: 'Smart Filtering',
    description: 'Filter by entity type, risk level, confidence, date range, and more. Save filter presets.',
    example: 'Show only HIGH risk nodes'
  },
  {
    icon: '📊',
    title: 'Graph Analytics',
    description: 'Calculate centrality, detect communities, find paths, and identify anomalies.',
    example: 'Detect hub nodes and bridges'
  },
  {
    icon: '📸',
    title: 'Snapshots',
    description: 'Capture and restore graph states. Compare different time points to see changes.',
    example: 'Save before investigation'
  },
  {
    icon: '📤',
    title: 'Export Options',
    description: 'Export to JSON, CSV, PNG, SVG, Neo4j Cypher, GML, and GraphML formats.',
    example: 'Share with team'
  },
  {
    icon: '🎨',
    title: 'Themes',
    description: 'Choose from Cyber Dark, Neon Magenta, Hacker Green, Synthwave, and Minimal themes.',
    example: 'Customize your experience'
  }
];

const HelpPanel = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('shortcuts');
  const [searchQuery, setSearchQuery] = useState('');

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Filter shortcuts based on search
  const filteredShortcuts = keyboardShortcuts.map(category => ({
    ...category,
    shortcuts: category.shortcuts.filter(shortcut =>
      shortcut.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shortcut.keys.some(key => key.toLowerCase().includes(searchQuery.toLowerCase()))
    )
  })).filter(category => category.shortcuts.length > 0);

  const filteredFeatures = features.filter(feature =>
    feature.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    feature.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', duration: 0.4 }}
            className="fixed inset-4 md:inset-10 lg:inset-20 bg-cyber-dark border-2 border-neon-green rounded-lg shadow-2xl z-50 flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b border-neon-green/30 bg-cyber-darker">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-neon-green font-mono flex items-center">
                  <svg className="w-8 h-8 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  ReconVault Help
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

              {/* Tabs */}
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab('shortcuts')}
                  className={`px-4 py-2 rounded-lg font-mono transition-colors ${
                    activeTab === 'shortcuts'
                      ? 'bg-neon-green text-cyber-black'
                      : 'bg-cyber-dark text-gray-400 hover:text-neon-green'
                  }`}
                >
                  ⌨️ Shortcuts
                </button>
                <button
                  onClick={() => setActiveTab('features')}
                  className={`px-4 py-2 rounded-lg font-mono transition-colors ${
                    activeTab === 'features'
                      ? 'bg-neon-green text-cyber-black'
                      : 'bg-cyber-dark text-gray-400 hover:text-neon-green'
                  }`}
                >
                  ✨ Features
                </button>
                <button
                  onClick={() => setActiveTab('about')}
                  className={`px-4 py-2 rounded-lg font-mono transition-colors ${
                    activeTab === 'about'
                      ? 'bg-neon-green text-cyber-black'
                      : 'bg-cyber-dark text-gray-400 hover:text-neon-green'
                  }`}
                >
                  ℹ️ About
                </button>
              </div>

              {/* Search */}
              {(activeTab === 'shortcuts' || activeTab === 'features') && (
                <div className="mt-4">
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={activeTab === 'shortcuts' ? 'Search shortcuts...' : 'Search features...'}
                      className="w-full px-4 py-2 pl-10 bg-cyber-black border border-neon-green/30 rounded-lg text-neon-green placeholder-gray-500 focus:outline-none focus:border-neon-green font-mono"
                    />
                    <svg className="w-5 h-5 text-gray-500 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
              {/* Shortcuts Tab */}
              {activeTab === 'shortcuts' && (
                <div className="space-y-6">
                  {filteredShortcuts.length > 0 ? (
                    filteredShortcuts.map((category, idx) => (
                      <motion.div
                        key={category.category}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="bg-cyber-darker rounded-lg p-4 border border-neon-green/20"
                      >
                        <h3 className="text-neon-green font-mono font-bold mb-3 text-lg">
                          {category.category}
                        </h3>
                        <div className="space-y-2">
                          {category.shortcuts.map((shortcut, sIdx) => (
                            <div
                              key={sIdx}
                              className="flex items-center justify-between py-2 px-3 bg-cyber-black/50 rounded hover:bg-cyber-black transition-colors"
                            >
                              <span className="text-gray-300">{shortcut.description}</span>
                              <div className="flex gap-1">
                                {shortcut.keys.map((key, kIdx) => (
                                  <React.Fragment key={kIdx}>
                                    <kbd className="px-3 py-1 bg-cyber-dark border-2 border-neon-green/50 rounded text-neon-green font-mono text-sm font-bold shadow-lg">
                                      {key}
                                    </kbd>
                                    {kIdx < shortcut.keys.length - 1 && (
                                      <span className="text-gray-500 mx-1">+</span>
                                    )}
                                  </React.Fragment>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="text-center text-gray-500 py-8">
                      <p>No shortcuts found matching "{searchQuery}"</p>
                    </div>
                  )}
                </div>
              )}

              {/* Features Tab */}
              {activeTab === 'features' && (
                <div className="grid md:grid-cols-2 gap-4">
                  {filteredFeatures.length > 0 ? (
                    filteredFeatures.map((feature, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.05 }}
                        className="bg-cyber-darker rounded-lg p-4 border border-neon-green/20 hover:border-neon-green/50 transition-colors"
                      >
                        <div className="text-4xl mb-3">{feature.icon}</div>
                        <h3 className="text-neon-green font-mono font-bold mb-2">
                          {feature.title}
                        </h3>
                        <p className="text-gray-300 text-sm mb-2">
                          {feature.description}
                        </p>
                        <div className="mt-3 p-2 bg-cyber-black/50 rounded border-l-2 border-neon-green">
                          <p className="text-gray-400 text-xs font-mono">
                            <span className="text-neon-green">Example:</span> {feature.example}
                          </p>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="col-span-2 text-center text-gray-500 py-8">
                      <p>No features found matching "{searchQuery}"</p>
                    </div>
                  )}
                </div>
              )}

              {/* About Tab */}
              {activeTab === 'about' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-6"
                >
                  <div className="text-center mb-8">
                    <div className="text-6xl mb-4">🔒</div>
                    <h3 className="text-3xl font-bold text-neon-green font-mono mb-2">
                      ReconVault
                    </h3>
                    <p className="text-gray-400">Cyber Intelligence Platform</p>
                    <p className="text-gray-500 text-sm mt-2">Version 1.0.0</p>
                  </div>

                  <div className="bg-cyber-darker rounded-lg p-6 border border-neon-green/20">
                    <h4 className="text-neon-green font-mono font-bold mb-3">About ReconVault</h4>
                    <p className="text-gray-300 leading-relaxed">
                      ReconVault is a powerful cyber intelligence platform designed for security researchers,
                      threat analysts, and investigation teams. It provides advanced graph visualization,
                      entity relationship mapping, and comprehensive analytics for cyber reconnaissance operations.
                    </p>
                  </div>

                  <div className="bg-cyber-darker rounded-lg p-6 border border-neon-green/20">
                    <h4 className="text-neon-green font-mono font-bold mb-3">Key Capabilities</h4>
                    <ul className="space-y-2 text-gray-300">
                      <li className="flex items-start">
                        <span className="text-neon-green mr-2">▸</span>
                        <span>Real-time intelligence collection and graph visualization</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-neon-green mr-2">▸</span>
                        <span>Advanced entity relationship analysis and pattern detection</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-neon-green mr-2">▸</span>
                        <span>Community detection and network analysis algorithms</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-neon-green mr-2">▸</span>
                        <span>Multi-format export and data sharing capabilities</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-neon-green mr-2">▸</span>
                        <span>Historical snapshots and comparative analysis</span>
                      </li>
                    </ul>
                  </div>

                  <div className="bg-cyber-darker rounded-lg p-6 border border-neon-green/20">
                    <h4 className="text-neon-green font-mono font-bold mb-3">Resources</h4>
                    <div className="space-y-2">
                      <a
                        href="https://docs.reconvault.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-neon-cyan hover:text-neon-green transition-colors"
                      >
                        📚 Documentation →
                      </a>
                      <a
                        href="https://api.reconvault.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-neon-cyan hover:text-neon-green transition-colors"
                      >
                        🔌 API Reference →
                      </a>
                      <a
                        href="https://github.com/reconvault"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-neon-cyan hover:text-neon-green transition-colors"
                      >
                        💻 GitHub Repository →
                      </a>
                    </div>
                  </div>

                  <div className="text-center text-gray-500 text-sm">
                    <p>© 2024 ReconVault. All rights reserved.</p>
                    <p className="mt-2">Built with React, D3.js, Neo4j, and FastAPI</p>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-neon-green/30 bg-cyber-darker">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 font-mono">
                  Press <kbd className="px-2 py-1 bg-cyber-black border border-neon-green/50 rounded text-neon-green text-xs">Esc</kbd> to close
                </span>
                <span className="text-gray-500 font-mono">
                  Press <kbd className="px-2 py-1 bg-cyber-black border border-neon-green/50 rounded text-neon-green text-xs">?</kbd> anytime for help
                </span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default HelpPanel;
