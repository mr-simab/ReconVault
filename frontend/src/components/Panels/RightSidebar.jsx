// Right Sidebar Component - Entity/Relationship inspector
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import EntityInspector from '../Inspector/EntityInspector';
import RelationshipInspector from '../Inspector/RelationshipInspector';
import CompliancePanel from '../Inspector/CompliancePanel';
import { formatStatus } from '../../utils/formatters';

const RightSidebar = ({
  selectedNode = null,
  selectedEdge = null,
  isCollapsed = false,
  onToggleCollapse,
  className = '',
  onEntityAction = () => {},
  onRelationshipAction = () => {}
}) => {
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'metadata', label: 'Metadata', icon: '📋' },
    { id: 'relationships', label: 'Relations', icon: '🔗' },
    { id: 'risk', label: 'Risk', icon: '⚠️' },
    { id: 'compliance', label: 'Policy', icon: '🛡️' },
    { id: 'history', label: 'History', icon: '📈' }
  ];

  const hasSelection = selectedNode || selectedEdge;
  const isEntity = !!selectedNode;
  const isRelationship = !!selectedEdge;

  const sidebarVariants = {
    expanded: { width: 350 },
    collapsed: { width: 60 }
  };

  const contentVariants = {
    expanded: { opacity: 1, x: 0 },
    collapsed: { opacity: 0, x: 20 }
  };

  return (
    <motion.div
      variants={sidebarVariants}
      animate={isCollapsed ? 'collapsed' : 'expanded'}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={`
        relative bg-cyber-dark border-l border-cyber-border h-full
        flex flex-col overflow-hidden ${className}
      `}
    >
      {/* Collapse Toggle */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onToggleCollapse}
        className="
          absolute -left-3 top-6 w-6 h-12 bg-cyber-dark border border-cyber-border
          rounded-l-lg flex items-center justify-center text-neon-green
          hover:text-neon-cyan transition-colors z-10
        "
      >
        <span className="text-sm">
          {isCollapsed ? '◀️' : '▶️'}
        </span>
      </motion.button>

      {/* Header */}
      <div className="p-4 border-b border-cyber-border">
        <motion.div
          variants={contentVariants}
          animate={isCollapsed ? 'collapsed' : 'expanded'}
          className="flex items-center space-x-3"
        >
          {!isCollapsed && (
            <>
              <div className="w-8 h-8 bg-neon-cyan bg-opacity-20 rounded-lg flex items-center justify-center">
                <span className="text-neon-cyan">
                  {isEntity ? '🎯' : isRelationship ? '🔗' : '📊'}
                </span>
              </div>
              <div>
                <h2 className="text-lg font-cyber text-neon-cyan">
                  {isEntity ? 'Entity Inspector' : 
                   isRelationship ? 'Relationship Inspector' : 
                   'Graph Inspector'}
                </h2>
                <p className="text-xs text-cyber-gray">
                  {hasSelection ? 'Details & Analysis' : 'No Selection'}
                </p>
              </div>
            </>
          )}
        </motion.div>
      </div>

      {/* Tabs */}
      {!isCollapsed && hasSelection && (
        <div className="flex border-b border-cyber-border">
          {tabs.map((tab) => (
            <motion.button
              key={tab.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex-1 px-2 py-3 text-xs font-mono transition-colors relative
                ${activeTab === tab.id 
                  ? 'text-neon-cyan bg-cyber-light' 
                  : 'text-cyber-gray hover:text-neon-cyan'
                }
              `}
            >
              <div className="flex flex-col items-center space-y-1">
                <span className="text-sm">{tab.icon}</span>
                <span>{tab.label}</span>
              </div>
              
              {/* Active indicator */}
              {activeTab === tab.id && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-neon-cyan"
                />
              )}
            </motion.button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollable-cyber">
        <AnimatePresence mode="wait">
          {!hasSelection ? (
            // No Selection State
            <motion.div
              key="no-selection"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center justify-center h-full p-8 text-center"
            >
              <div className="w-16 h-16 bg-cyber-light bg-opacity-50 rounded-full flex items-center justify-center mb-4">
                <span className="text-3xl text-cyber-gray">
                  {isCollapsed ? 'ℹ️' : '🎯'}
                </span>
              </div>
              
              {!isCollapsed && (
                <>
                  <h3 className="text-lg font-cyber text-cyber-gray mb-2">
                    No Selection
                  </h3>
                  <p className="text-sm text-cyber-gray">
                    Click on a node or edge in the graph to view detailed information
                  </p>
                  
                  {/* Quick Stats */}
                  <div className="mt-8 p-4 bg-cyber-light bg-opacity-50 rounded-lg w-full">
                    <h4 className="text-xs font-medium text-neon-cyan mb-3">Graph Statistics</h4>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-cyber-gray">Nodes:</span>
                        <span className="text-neon-green font-mono">0</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-cyber-gray">Edges:</span>
                        <span className="text-neon-green font-mono">0</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-cyber-gray">Density:</span>
                        <span className="text-neon-cyan font-mono">0.00</span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          ) : (
            // Selection Content
            <motion.div
              key={isEntity ? `entity-${selectedNode.id}` : `relationship-${selectedEdge.id}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="p-4"
            >
              {isEntity && activeTab !== 'compliance' && (
                <EntityInspector
                  entity={selectedNode}
                  activeTab={activeTab}
                  onAction={onEntityAction}
                />
              )}
              
              {isRelationship && activeTab !== 'compliance' && (
                <RelationshipInspector
                  relationship={selectedEdge}
                  activeTab={activeTab}
                  onAction={onRelationshipAction}
                />
              )}

              {activeTab === 'compliance' && (
                <CompliancePanel />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Action Footer */}
      {!isCollapsed && hasSelection && (
        <div className="p-4 border-t border-cyber-border">
          <motion.div
            variants={contentVariants}
            animate={isCollapsed ? 'collapsed' : 'expanded'}
            className="space-y-3"
          >
            {/* Quick Actions */}
            <div className="flex space-x-2">
              {isEntity && (
                <>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onEntityAction('copy', selectedNode)}
                    className="flex-1 px-3 py-2 text-xs font-mono rounded border border-cyber-border
                             bg-cyber-light text-cyber-gray hover:text-neon-green hover:border-neon-green
                             transition-colors"
                  >
                    📋 Copy
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onEntityAction('export', selectedNode)}
                    className="flex-1 px-3 py-2 text-xs font-mono rounded border border-cyber-border
                             bg-cyber-light text-cyber-gray hover:text-neon-cyan hover:border-neon-cyan
                             transition-colors"
                  >
                    💾 Export
                  </motion.button>
                </>
              )}
              
              {isRelationship && (
                <>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onRelationshipAction('edit', selectedEdge)}
                    className="flex-1 px-3 py-2 text-xs font-mono rounded border border-cyber-border
                             bg-cyber-light text-cyber-gray hover:text-neon-cyan hover:border-neon-cyan
                             transition-colors"
                  >
                    ✏️ Edit
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onRelationshipAction('delete', selectedEdge)}
                    className="flex-1 px-3 py-2 text-xs font-mono rounded border border-danger-red
                             bg-cyber-light text-danger-red hover:bg-danger-red hover:text-white
                             transition-colors"
                  >
                    🗑️ Delete
                  </motion.button>
                </>
              )}
            </div>

            {/* Selection Info */}
            <div className="text-xs text-cyber-gray space-y-1">
              <div className="flex justify-between">
                <span>Selected:</span>
                <span className="text-neon-cyan font-mono">
                  {isEntity ? selectedNode.type : selectedEdge.type}
                </span>
              </div>
              <div className="flex justify-between">
                <span>ID:</span>
                <span className="text-neon-green font-mono text-xs">
                  {isEntity ? selectedNode.id : selectedEdge.id}
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};

export default RightSidebar;