// Left Sidebar Component - Target input and controls
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { COLLECTION_TYPES } from '../../utils/constants';
import ReconSearchForm from '../Forms/ReconSearchForm';
import FilterPanel from '../Forms/FilterPanel';

const LeftSidebar = ({
  isCollapsed = false,
  onToggleCollapse,
  className = '',
  activeTab = 'search',
  onTabChange = () => {},
  collectionHistory = [],
  activeTasks = [],
  onStartCollection = () => {},
  onPauseTask = () => {},
  onResumeTask = () => {},
  onCancelTask = () => {}
}) => {
  const [currentTab, setCurrentTab] = useState(activeTab);

  useEffect(() => {
    setCurrentTab(activeTab);
  }, [activeTab]);

  const tabs = [
    { id: 'search', label: 'Search', icon: '🔍' },
    { id: 'filters', label: 'Filters', icon: '🔧' },
    { id: 'history', label: 'History', icon: '📋' },
    { id: 'tasks', label: 'Tasks', icon: '⚙️' }
  ];

  const handleTabChange = (tabId) => {
    setCurrentTab(tabId);
    onTabChange(tabId);
  };

  const sidebarVariants = {
    expanded: { width: 320 },
    collapsed: { width: 60 }
  };

  const contentVariants = {
    expanded: { opacity: 1, x: 0 },
    collapsed: { opacity: 0, x: -20 }
  };

  return (
    <motion.div
      variants={sidebarVariants}
      animate={isCollapsed ? 'collapsed' : 'expanded'}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={`
        relative bg-cyber-dark border-r border-cyber-border h-full
        flex flex-col overflow-hidden ${className}
      `}
    >
      {/* Collapse Toggle */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onToggleCollapse}
        className="
          absolute -right-3 top-6 w-6 h-12 bg-cyber-dark border border-cyber-border
          rounded-r-lg flex items-center justify-center text-neon-green
          hover:text-neon-cyan transition-colors z-10
        "
      >
        <span className="text-sm">
          {isCollapsed ? '▶️' : '◀️'}
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
              <div className="w-8 h-8 bg-neon-green bg-opacity-20 rounded-lg flex items-center justify-center">
                <span className="text-neon-green">🎯</span>
              </div>
              <div>
                <h2 className="text-lg font-cyber text-neon-green">Recon Controls</h2>
                <p className="text-xs text-cyber-gray">Collection & Search</p>
              </div>
            </>
          )}
        </motion.div>
      </div>

      {/* Tabs */}
      {!isCollapsed && (
        <div className="flex border-b border-cyber-border">
          {tabs.map((tab) => (
            <motion.button
              key={tab.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleTabChange(tab.id)}
              className={`
                flex-1 px-3 py-3 text-xs font-mono transition-colors relative
                ${currentTab === tab.id 
                  ? 'text-neon-green bg-cyber-light' 
                  : 'text-cyber-gray hover:text-neon-green'
                }
              `}
            >
              <div className="flex flex-col items-center space-y-1">
                <span className="text-sm">{tab.icon}</span>
                <span>{tab.label}</span>
              </div>
              
              {/* Active indicator */}
              {currentTab === tab.id && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-neon-green"
                />
              )}
            </motion.button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollable-cyber">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="p-4 h-full"
          >
            {/* Search Tab */}
            {currentTab === 'search' && (
              <div className="space-y-4">
                <ReconSearchForm onStartCollection={onStartCollection} />
                
                {/* Quick Collection Types */}
                <div>
                  <h3 className="text-sm font-medium text-neon-green mb-2">Quick Collection</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {COLLECTION_TYPES.slice(0, 4).map((type) => (
                      <motion.button
                        key={type}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => onStartCollection('', [type])}
                        className="
                          px-3 py-2 text-xs font-mono rounded border border-cyber-border
                          bg-cyber-light text-cyber-gray hover:text-neon-green hover:border-neon-green
                          transition-colors
                        "
                      >
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </motion.button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Filters Tab */}
            {currentTab === 'filters' && (
              <FilterPanel />
            )}

            {/* History Tab */}
            {currentTab === 'history' && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-neon-green">Collection History</h3>
                
                {collectionHistory.length === 0 ? (
                  <div className="text-center py-8 text-cyber-gray">
                    <span className="text-2xl block mb-2">📋</span>
                    <p className="text-sm">No collection history</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {collectionHistory.slice(0, 10).map((item, index) => (
                      <motion.div
                        key={index}
                        whileHover={{ scale: 1.02 }}
                        className="
                          p-3 rounded border border-cyber-border bg-cyber-light
                          hover:border-neon-green transition-colors cursor-pointer
                        "
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-xs font-mono text-neon-green truncate">
                            {item.target}
                          </span>
                          <span className="text-xs text-cyber-gray">
                            {item.types.join(', ')}
                          </span>
                        </div>
                        <div className="text-xs text-cyber-gray">
                          {new Date(item.timestamp).toLocaleString()}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tasks Tab */}
            {currentTab === 'tasks' && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-medium text-neon-green">Active Tasks</h3>
                  <span className="text-xs text-cyber-gray">
                    {activeTasks.length} running
                  </span>
                </div>
                
                {activeTasks.length === 0 ? (
                  <div className="text-center py-8 text-cyber-gray">
                    <span className="text-2xl block mb-2">⚙️</span>
                    <p className="text-sm">No active tasks</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {activeTasks.map((task) => (
                      <motion.div
                        key={task.id}
                        whileHover={{ scale: 1.02 }}
                        className="
                          p-3 rounded border border-cyber-border bg-cyber-light
                          hover:border-neon-cyan transition-colors
                        "
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xs font-mono text-neon-cyan truncate">
                            {task.target}
                          </span>
                          <div className="flex space-x-1">
                            {task.status === 'RUNNING' ? (
                              <button
                                onClick={() => onPauseTask(task.id)}
                                className="text-xs text-warning-yellow hover:text-warning-yellow"
                              >
                                ⏸️
                              </button>
                            ) : (
                              <button
                                onClick={() => onResumeTask(task.id)}
                                className="text-xs text-safe-green hover:text-safe-green"
                              >
                                ▶️
                              </button>
                            )}
                            <button
                              onClick={() => onCancelTask(task.id)}
                              className="text-xs text-danger-red hover:text-danger-red"
                            >
                              ❌
                            </button>
                          </div>
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="mb-2">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-cyber-gray">
                              {task.completed}/{task.total}
                            </span>
                            <span className="text-neon-green">
                              {Math.round(task.progress)}%
                            </span>
                          </div>
                          <div className="progress-cyber">
                            <motion.div
                              className="progress-cyber-bar info"
                              initial={{ width: 0 }}
                              animate={{ width: `${task.progress}%` }}
                              transition={{ duration: 0.3 }}
                            />
                          </div>
                        </div>
                        
                        <div className="text-xs text-cyber-gray">
                          {task.status} • {task.type}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Status Footer */}
      {!isCollapsed && (
        <div className="p-4 border-t border-cyber-border">
          <motion.div
            variants={contentVariants}
            animate={isCollapsed ? 'collapsed' : 'expanded'}
            className="text-xs text-cyber-gray space-y-1"
          >
            <div className="flex justify-between">
              <span>Collection Queue:</span>
              <span className="text-neon-green">
                {activeTasks.filter(t => t.status === 'RUNNING').length} active
              </span>
            </div>
            <div className="flex justify-between">
              <span>Success Rate:</span>
              <span className="text-safe-green">94.2%</span>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};

export default LeftSidebar;