import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GlassIcon from './GlassIcon';

const keyboardShortcuts = [
  { category: 'Navigation', shortcuts: [
    { keys: ['C'], description: 'Center view' },
    { keys: ['F'], description: 'Fit to screen' },
    { keys: ['+'], description: 'Zoom in' },
    { keys: ['-'], description: 'Zoom out' },
    { keys: ['Arrow keys'], description: 'Pan view' },
    { keys: ['Esc'], description: 'Deselect all' }
  ] },
  { category: 'Search & Filter', shortcuts: [
    { keys: ['Ctrl', 'F'], description: 'Focus search' },
    { keys: ['Ctrl', 'K'], description: 'Filter menu' },
    { keys: ['/'], description: 'Quick search' }
  ] },
  { category: 'Export & Save', shortcuts: [
    { keys: ['Ctrl', 'E'], description: 'Export graph' },
    { keys: ['Ctrl', 'S'], description: 'Save snapshot' },
    { keys: ['Ctrl', 'L'], description: 'Share link' }
  ] },
  { category: 'Graph', shortcuts: [
    { keys: ['Space'], description: 'Toggle simulation' },
    { keys: ['L'], description: 'Toggle labels' },
    { keys: ['E'], description: 'Toggle edges' }
  ] }
];

const features = [
  { icon: 'search', title: 'Advanced Search', description: 'Search entities with query terms and entity context.', example: 'type:IP riskLevel:CRITICAL' },
  { icon: 'target', title: 'Smart Filtering', description: 'Filter by entity type, risk level, confidence, date range, and source.', example: 'Show HIGH risk infrastructure' },
  { icon: 'graph', title: 'Graph Analytics', description: 'Inspect relationships, density, paths, and graph shape.', example: 'Select a hub node' },
  { icon: 'evidence', title: 'Evidence Review', description: 'Inspect metadata, source records, relationships, and policy context.', example: 'Open entity inspector' },
  { icon: 'export', title: 'Export Options', description: 'Generate reports and graph exports for handoff.', example: 'Export compliance report' },
  { icon: 'settings', title: 'Operator Settings', description: 'Tune graph, notification, API, and export behavior.', example: 'Balanced graph performance' }
];

const HelpPanel = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('shortcuts');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const filteredShortcuts = keyboardShortcuts.map((category) => ({
    ...category,
    shortcuts: category.shortcuts.filter((shortcut) =>
      shortcut.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shortcut.keys.some((key) => key.toLowerCase().includes(searchQuery.toLowerCase()))
    )
  })).filter((category) => category.shortcuts.length > 0);

  const filteredFeatures = features.filter((feature) =>
    feature.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    feature.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 20 }}
            transition={{ type: 'spring', duration: 0.4 }}
            className="fixed inset-4 md:inset-10 lg:inset-20 glass-panel-dark border border-neon-green/40 shadow-2xl z-50 flex flex-col overflow-hidden"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="p-6 border-b border-neon-green/30 bg-cyber-darker">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-neon-green font-mono flex items-center gap-3">
                  <GlassIcon name="help" size="lg" tone="green" />
                  ReconVault Help
                </h2>

                <button
                  type="button"
                  onClick={onClose}
                  className="rv-icon-button p-2 text-danger-red hover:border-danger-red"
                >
                  <GlassIcon name="close" size="sm" tone="red" />
                </button>
              </div>

              <div className="flex gap-2">
                <TabButton active={activeTab === 'shortcuts'} onClick={() => setActiveTab('shortcuts')} icon="keyboard" label="Shortcuts" />
                <TabButton active={activeTab === 'features'} onClick={() => setActiveTab('features')} icon="operations" label="Features" />
                <TabButton active={activeTab === 'about'} onClick={() => setActiveTab('about')} icon="info" label="About" />
              </div>

              {(activeTab === 'shortcuts' || activeTab === 'features') && (
                <div className="mt-4 relative">
                  <GlassIcon name="search" size="xs" tone="muted" bare className="absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder={activeTab === 'shortcuts' ? 'Search shortcuts...' : 'Search features...'}
                    className="w-full px-4 py-2 pl-10 bg-cyber-black border border-neon-green/30 rounded-lg text-neon-green placeholder-gray-500 focus:outline-none focus:border-neon-green font-mono"
                  />
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto scrollable-cyber p-6">
              {activeTab === 'shortcuts' && (
                <div className="space-y-6">
                  {filteredShortcuts.length > 0 ? filteredShortcuts.map((category, index) => (
                    <motion.div
                      key={category.category}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="rv-panel-section p-4"
                    >
                      <h3 className="text-neon-green font-mono font-bold mb-3 text-lg">{category.category}</h3>
                      <div className="space-y-2">
                        {category.shortcuts.map((shortcut) => (
                          <div key={`${category.category}-${shortcut.description}`} className="flex items-center justify-between gap-4 py-2 px-3 bg-cyber-black/50 rounded">
                            <span className="text-gray-300">{shortcut.description}</span>
                            <div className="flex gap-1 flex-wrap justify-end">
                              {shortcut.keys.map((key, keyIndex) => (
                                <React.Fragment key={key}>
                                  <kbd className="px-3 py-1 bg-cyber-dark border border-neon-green/50 rounded text-neon-green font-mono text-sm font-bold">
                                    {key}
                                  </kbd>
                                  {keyIndex < shortcut.keys.length - 1 && <span className="text-gray-500 mx-1">+</span>}
                                </React.Fragment>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )) : (
                    <div className="text-center text-gray-500 py-8">No shortcuts found matching "{searchQuery}"</div>
                  )}
                </div>
              )}

              {activeTab === 'features' && (
                <div className="grid md:grid-cols-2 gap-4">
                  {filteredFeatures.length > 0 ? filteredFeatures.map((feature, index) => (
                    <motion.div
                      key={feature.title}
                      initial={{ opacity: 0, scale: 0.94 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.04 }}
                      className="rv-panel-section p-4"
                    >
                      <GlassIcon name={feature.icon} size="lg" tone="green" />
                      <h3 className="text-neon-green font-mono font-bold mt-3 mb-2">{feature.title}</h3>
                      <p className="text-gray-300 text-sm mb-2">{feature.description}</p>
                      <div className="mt-3 p-2 bg-cyber-black/50 rounded border-l-2 border-neon-green">
                        <p className="text-gray-400 text-xs font-mono">
                          <span className="text-neon-green">Example:</span> {feature.example}
                        </p>
                      </div>
                    </motion.div>
                  )) : (
                    <div className="col-span-2 text-center text-gray-500 py-8">No features found matching "{searchQuery}"</div>
                  )}
                </div>
              )}

              {activeTab === 'about' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                  <div className="text-center mb-8">
                    <div className="flex justify-center mb-4">
                      <GlassIcon name="shield" size="xl" tone="green" />
                    </div>
                    <h3 className="text-3xl font-bold text-neon-green font-mono mb-2">ReconVault</h3>
                    <p className="text-gray-400">Cyber Intelligence Platform</p>
                    <p className="text-gray-500 text-sm mt-2">Version 1.0.0</p>
                  </div>

                  <InfoBlock title="About ReconVault">
                    ReconVault is a cyber intelligence platform for security researchers, threat analysts, and investigation teams. It combines collection workflows, graph visualization, entity inspection, and compliance controls for reconnaissance operations.
                  </InfoBlock>

                  <div className="rv-panel-section p-6">
                    <h4 className="text-neon-green font-mono font-bold mb-3">Key Capabilities</h4>
                    <ul className="space-y-2 text-gray-300">
                      {[
                        'Real-source intelligence collection and graph visualization',
                        'Entity relationship analysis and evidence inspection',
                        'Operation workflows, cases, timelines, IOCs, and reports',
                        'Firebase Realtime Database persistence with Node.js backend APIs',
                        'MCP gateway and AI orchestration support'
                      ].map((item) => (
                        <li key={item} className="flex items-start gap-2">
                          <GlassIcon name="check" size="xs" tone="green" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="rv-panel-section p-6">
                    <h4 className="text-neon-green font-mono font-bold mb-3">Resources</h4>
                    <div className="space-y-2">
                      <ResourceLink href="https://docs.reconvault.com" icon="docs" label="Documentation" />
                      <ResourceLink href="https://api.reconvault.com" icon="server" label="API Reference" />
                      <ResourceLink href="https://github.com/reconvault" icon="terminal" label="Repository" />
                    </div>
                  </div>

                  <div className="text-center text-gray-500 text-sm">
                    <p>Built with React, Node.js, Firebase Realtime Database, and MCP-ready orchestration.</p>
                  </div>
                </motion.div>
              )}
            </div>

            <div className="p-4 border-t border-neon-green/30 bg-cyber-darker">
              <div className="flex items-center justify-between text-sm gap-4">
                <span className="text-gray-500 font-mono">Press <kbd className="px-2 py-1 bg-cyber-black border border-neon-green/50 rounded text-neon-green text-xs">Esc</kbd> to close</span>
                <span className="text-gray-500 font-mono">Press <kbd className="px-2 py-1 bg-cyber-black border border-neon-green/50 rounded text-neon-green text-xs">?</kbd> for help</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

const TabButton = ({ active, onClick, icon, label }) => (
  <button
    type="button"
    onClick={onClick}
    className={`px-4 py-2 rounded-lg font-mono transition-colors inline-flex items-center gap-2 ${
      active ? 'bg-neon-green text-cyber-black' : 'bg-cyber-dark text-gray-400 hover:text-neon-green'
    }`}
  >
    <GlassIcon name={icon} size="xs" tone={active ? 'green' : 'cyan'} />
    <span>{label}</span>
  </button>
);

const InfoBlock = ({ title, children }) => (
  <div className="rv-panel-section p-6">
    <h4 className="text-neon-green font-mono font-bold mb-3">{title}</h4>
    <p className="text-gray-300 leading-relaxed">{children}</p>
  </div>
);

const ResourceLink = ({ href, icon, label }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="flex items-center gap-2 text-neon-cyan hover:text-neon-green transition-colors"
  >
    <GlassIcon name={icon} size="xs" tone="cyan" />
    <span>{label} -&gt;</span>
  </a>
);

export default HelpPanel;
