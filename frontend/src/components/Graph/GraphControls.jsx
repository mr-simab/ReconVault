// Graph Controls Component
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const GraphControls = ({
  onZoomIn,
  onZoomOut,
  onFitToScreen,
  onCenterGraph,
  onToggleSimulation,
  onToggleLabels,
  onToggleEdges,
  onExport,
  onFullscreen,
  simulationRunning = true,
  showLabels = true,
  showEdges = true,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showTooltip, setShowTooltip] = useState(null);

  const controls = [
    {
      id: 'zoom-in',
      icon: '🔍+',
      label: 'Zoom In',
      action: onZoomIn,
      shortcut: '+'
    },
    {
      id: 'zoom-out',
      icon: '🔍-',
      label: 'Zoom Out',
      action: onZoomOut,
      shortcut: '-'
    },
    {
      id: 'fit-screen',
      icon: '📐',
      label: 'Fit to Screen',
      action: onFitToScreen,
      shortcut: 'F'
    },
    {
      id: 'center',
      icon: '🎯',
      label: 'Center Graph',
      action: onCenterGraph,
      shortcut: 'C'
    },
    {
      id: 'simulation',
      icon: simulationRunning ? '⏸️' : '▶️',
      label: simulationRunning ? 'Pause Simulation' : 'Start Simulation',
      action: onToggleSimulation,
      shortcut: 'Space',
      active: simulationRunning
    },
    {
      id: 'labels',
      icon: showLabels ? '🏷️' : '🚫',
      label: showLabels ? 'Hide Labels' : 'Show Labels',
      action: onToggleLabels,
      shortcut: 'L',
      active: showLabels
    },
    {
      id: 'edges',
      icon: showEdges ? '🔗' : '🚫',
      label: showEdges ? 'Hide Edges' : 'Show Edges',
      action: onToggleEdges,
      shortcut: 'E',
      active: showEdges
    },
    {
      id: 'export',
      icon: '💾',
      label: 'Export Graph',
      action: onExport,
      shortcut: 'S'
    }
  ];

  const handleControlClick = (control) => {
    control.action();
    
    // Add haptic feedback if available
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  };

  return (
    <div className={`absolute top-4 right-4 z-10 ${className}`}>
      <div className="flex flex-col items-end space-y-2">
        {/* Toggle Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsExpanded(!isExpanded)}
          className={`
            w-12 h-12 rounded-lg border backdrop-blur-sm
            bg-cyber-dark bg-opacity-90 border-cyber-border
            text-neon-green hover:text-neon-cyan hover:border-neon-cyan
            transition-all duration-200 flex items-center justify-center
            ${isExpanded ? 'rotate-45' : 'rotate-0'}
          `}
        >
          <span className="text-lg">
            {isExpanded ? '✕' : '⚙️'}
          </span>
        </motion.button>

        {/* Controls Panel */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, x: 50, scale: 0.8 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.8 }}
              transition={{ 
                type: "spring", 
                stiffness: 500, 
                damping: 30 
              }}
              className="glass-panel p-2 border border-cyber-border rounded-lg"
            >
              <div className="grid grid-cols-2 gap-2">
                {controls.map((control) => (
                  <motion.button
                    key={control.id}
                    whileHover={{ 
                      scale: 1.05,
                      boxShadow: '0 0 10px rgba(0, 255, 65, 0.3)'
                    }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleControlClick(control)}
                    onMouseEnter={() => setShowTooltip(control.id)}
                    onMouseLeave={() => setShowTooltip(null)}
                    className={`
                      w-12 h-12 rounded-lg border backdrop-blur-sm
                      bg-cyber-light bg-opacity-80 border-cyber-border
                      text-cyber-gray hover:text-neon-green hover:border-neon-green
                      transition-all duration-200 flex flex-col items-center justify-center
                      ${control.active ? 'text-neon-cyan border-neon-cyan' : ''}
                      relative group
                    `}
                  >
                    <span className="text-xs font-mono">{control.icon}</span>
                    <span className="text-xs mt-1 opacity-75">{control.shortcut}</span>
                    
                    {/* Tooltip */}
                    <AnimatePresence>
                      {showTooltip === control.id && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.8 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.8 }}
                          className="
                            absolute right-full mr-2 top-1/2 transform -translate-y-1/2
                            bg-cyber-darker border border-cyber-border rounded px-2 py-1
                            text-xs font-mono text-neon-green whitespace-nowrap z-50
                            shadow-lg backdrop-blur-sm
                          "
                        >
                          {control.label}
                          <div className="
                            absolute left-full top-1/2 transform -translate-y-1/2
                            border-4 border-transparent border-l-cyber-border
                          " />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.button>
                ))}
              </div>
              
              {/* Quick Stats */}
              <div className="mt-3 pt-3 border-t border-cyber-border">
                <div className="text-xs text-cyber-gray font-mono space-y-1">
                  <div className="flex justify-between">
                    <span>Mode:</span>
                    <span className={simulationRunning ? 'text-neon-green' : 'text-warning-yellow'}>
                      {simulationRunning ? 'Dynamic' : 'Static'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>View:</span>
                    <span className="text-neon-cyan">
                      {showLabels && showEdges ? 'Full' : 'Simplified'}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Keyboard Shortcuts Help */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ delay: 0.2 }}
            className="mt-2 glass-panel p-3 border border-cyber-border rounded-lg"
          >
            <h4 className="text-xs font-cyber text-neon-green mb-2">Keyboard Shortcuts</h4>
            <div className="text-xs font-mono text-cyber-gray space-y-1">
              <div className="flex justify-between">
                <span>+/-</span>
                <span>Zoom</span>
              </div>
              <div className="flex justify-between">
                <span>F</span>
                <span>Fit Screen</span>
              </div>
              <div className="flex justify-between">
                <span>C</span>
                <span>Center</span>
              </div>
              <div className="flex justify-between">
                <span>Space</span>
                <span>Play/Pause</span>
              </div>
              <div className="flex justify-between">
                <span>L/E</span>
                <span>Labels/Edges</span>
              </div>
              <div className="flex justify-between">
                <span>S</span>
                <span>Save</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GraphControls;