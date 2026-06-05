// Graph Controls Component
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GlassIcon from '../Common/GlassIcon';

const GraphControls = ({
  onZoomIn,
  onZoomOut,
  onFitToScreen,
  onCenterGraph,
  onToggleSimulation,
  onToggleLabels,
  onToggleEdges,
  onExport,
  simulationRunning = true,
  showLabels = true,
  showEdges = true,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showTooltip, setShowTooltip] = useState(null);

  const controls = [
    { id: 'zoom-in', icon: 'zoom-in', label: 'Zoom In', action: onZoomIn, shortcut: '+' },
    { id: 'zoom-out', icon: 'zoom-out', label: 'Zoom Out', action: onZoomOut, shortcut: '-' },
    { id: 'fit-screen', icon: 'fit', label: 'Fit to Screen', action: onFitToScreen, shortcut: 'F' },
    { id: 'center', icon: 'target', label: 'Center Graph', action: onCenterGraph, shortcut: 'C' },
    {
      id: 'simulation',
      icon: simulationRunning ? 'pause' : 'play',
      label: simulationRunning ? 'Pause Simulation' : 'Start Simulation',
      action: onToggleSimulation,
      shortcut: 'Space',
      active: simulationRunning
    },
    {
      id: 'labels',
      icon: showLabels ? 'labels' : 'hidden',
      label: showLabels ? 'Hide Labels' : 'Show Labels',
      action: onToggleLabels,
      shortcut: 'L',
      active: showLabels
    },
    {
      id: 'edges',
      icon: showEdges ? 'edges' : 'hidden',
      label: showEdges ? 'Hide Edges' : 'Show Edges',
      action: onToggleEdges,
      shortcut: 'E',
      active: showEdges
    },
    { id: 'export', icon: 'save', label: 'Export Graph', action: onExport, shortcut: 'S' }
  ];

  const handleControlClick = (control) => {
    control.action?.();
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  };

  return (
    <div className={`absolute top-4 right-4 z-10 ${className}`}>
      <div className="flex flex-col items-end gap-2">
        <button
          type="button"
          onClick={() => setIsExpanded((value) => !value)}
          className={`rv-icon-button w-12 h-12 flex items-center justify-center text-neon-green hover:text-neon-cyan ${isExpanded ? 'is-active' : ''}`}
          title={isExpanded ? 'Close graph controls' : 'Open graph controls'}
        >
          <GlassIcon name={isExpanded ? 'close' : 'settings'} size="sm" tone={isExpanded ? 'green' : 'cyan'} />
        </button>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, x: 40, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className="glass-panel p-2"
            >
              <div className="grid grid-cols-2 gap-2">
                {controls.map((control) => (
                  <button
                    key={control.id}
                    type="button"
                    onClick={() => handleControlClick(control)}
                    onMouseEnter={() => setShowTooltip(control.id)}
                    onMouseLeave={() => setShowTooltip(null)}
                    className={`rv-icon-button relative w-12 h-12 flex flex-col items-center justify-center gap-1 ${control.active ? 'is-active' : ''}`}
                  >
                    <GlassIcon name={control.icon} size="xs" tone={control.active ? 'green' : 'cyan'} />
                    <span className="text-[9px] font-mono opacity-75">{control.shortcut}</span>

                    <AnimatePresence>
                      {showTooltip === control.id && (
                        <motion.div
                          initial={{ opacity: 0, y: 8, scale: 0.9 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 8, scale: 0.9 }}
                          className="absolute right-full mr-2 top-1/2 -translate-y-1/2 glass-panel-dark px-2 py-1 text-xs font-mono text-neon-green whitespace-nowrap z-50"
                        >
                          {control.label}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </button>
                ))}
              </div>

              <div className="mt-3 pt-3 border-t rv-soft-divider">
                <div className="text-xs text-cyber-gray font-mono space-y-1">
                  <div className="flex justify-between gap-4">
                    <span>Mode</span>
                    <span className={simulationRunning ? 'text-neon-green' : 'text-warning-yellow'}>
                      {simulationRunning ? 'Dynamic' : 'Static'}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span>View</span>
                    <span className="text-neon-cyan">
                      {showLabels && showEdges ? 'Full' : 'Reduced'}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ delay: 0.15 }}
            className="mt-2 glass-panel p-3"
          >
            <h4 className="text-xs font-cyber text-neon-green mb-2">Keyboard Shortcuts</h4>
            <div className="text-xs font-mono text-cyber-gray space-y-1">
              <div className="flex justify-between gap-4"><span>+/-</span><span>Zoom</span></div>
              <div className="flex justify-between gap-4"><span>F</span><span>Fit</span></div>
              <div className="flex justify-between gap-4"><span>C</span><span>Center</span></div>
              <div className="flex justify-between gap-4"><span>Space</span><span>Play/Pause</span></div>
              <div className="flex justify-between gap-4"><span>L/E</span><span>Labels/Edges</span></div>
              <div className="flex justify-between gap-4"><span>S</span><span>Save</span></div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GraphControls;
