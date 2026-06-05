// Left Sidebar Component - target collection controls and task context
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { COLLECTION_TYPES } from '../../utils/constants';
import ReconSearchForm from '../Forms/ReconSearchForm';
import FilterPanel from '../Forms/FilterPanel';
import GlassIcon from '../Common/GlassIcon';

const collectorIcon = {
  web: 'globe',
  social: 'user',
  domain: 'network',
  ip: 'link',
  email: 'email',
  media: 'media',
  darkweb: 'darkweb'
};

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
    { id: 'search', label: 'Search', icon: 'search' },
    { id: 'filters', label: 'Filters', icon: 'filter' },
    { id: 'history', label: 'History', icon: 'history' },
    { id: 'tasks', label: 'Tasks', icon: 'queue' }
  ];

  const handleTabChange = (tabId) => {
    setCurrentTab(tabId);
    onTabChange(tabId);
  };

  const sidebarVariants = {
    expanded: { width: 332 },
    collapsed: { width: 64 }
  };

  const contentVariants = {
    expanded: { opacity: 1, x: 0 },
    collapsed: { opacity: 0, x: -18 }
  };

  const runningCount = activeTasks.filter((task) => task.status === 'RUNNING').length;
  const completedCount = collectionHistory.filter((task) => task.status === 'COMPLETED').length;

  return (
    <motion.aside
      variants={sidebarVariants}
      animate={isCollapsed ? 'collapsed' : 'expanded'}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={`rv-side-panel relative border-r h-full flex flex-col flex-shrink-0 overflow-hidden ${className}`}
    >
      <button
        type="button"
        onClick={onToggleCollapse}
        className="rv-icon-button absolute -right-3 top-6 w-7 h-12 flex items-center justify-center text-neon-green hover:text-neon-cyan z-20"
        title={isCollapsed ? 'Expand controls' : 'Collapse controls'}
      >
        <GlassIcon name={isCollapsed ? 'collapse-right' : 'collapse-left'} size="xs" tone="cyan" bare />
      </button>

      <div className="p-4 border-b rv-soft-divider">
        <motion.div
          variants={contentVariants}
          animate={isCollapsed ? 'collapsed' : 'expanded'}
          className="flex items-center gap-3"
        >
          {!isCollapsed && (
            <>
              <GlassIcon name="target" size="lg" tone="green" />
              <div className="min-w-0">
                <h2 className="text-lg font-cyber text-neon-green leading-tight">Recon Controls</h2>
                <p className="text-xs text-cyber-gray uppercase">Collection and filtering</p>
              </div>
            </>
          )}
        </motion.div>
      </div>

      {!isCollapsed && (
        <div className="grid grid-cols-4 gap-1 p-2 border-b rv-soft-divider">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id)}
              className={`rv-tab-button relative px-2 py-2 text-xs font-mono flex flex-col items-center gap-1 ${currentTab === tab.id ? 'is-active' : ''}`}
            >
              <GlassIcon name={tab.icon} size="xs" tone={currentTab === tab.id ? 'green' : 'cyan'} />
              <span>{tab.label}</span>
              {currentTab === tab.id && (
                <motion.span
                  layoutId="leftActiveTab"
                  className="absolute bottom-0 left-2 right-2 h-0.5 bg-neon-green"
                />
              )}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto scrollable-cyber">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentTab}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.2 }}
            className="p-4 h-full"
          >
            {currentTab === 'search' && (
              <div className="space-y-4">
                <ReconSearchForm onStartCollection={onStartCollection} />

                <div className="rv-panel-section p-3">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-neon-green">Collector Matrix</h3>
                    <span className="text-[10px] text-cyber-gray uppercase">{COLLECTION_TYPES.length} sources</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {COLLECTION_TYPES.map((type) => (
                      <div key={type} className="rv-command-button px-3 py-2 flex items-center gap-2">
                        <GlassIcon name={collectorIcon[type] || 'source'} size="xs" tone="cyan" />
                        <span className="text-xs font-mono capitalize text-cyber-gray">{type}</span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-[11px] leading-relaxed text-cyber-gray">
                    Select collectors above with a target. Empty-target quick starts were removed to prevent invalid backend tasks.
                  </p>
                </div>
              </div>
            )}

            {currentTab === 'filters' && <FilterPanel />}

            {currentTab === 'history' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-neon-green">Collection History</h3>
                  <span className="text-xs text-cyber-gray">{collectionHistory.length} records</span>
                </div>

                {collectionHistory.length === 0 ? (
                  <div className="rv-panel-section text-center py-8 text-cyber-gray">
                    <div className="flex justify-center mb-2">
                      <GlassIcon name="history" size="lg" tone="muted" />
                    </div>
                    <p className="text-sm">No collection history</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {collectionHistory.slice(0, 12).map((item) => (
                      <motion.div
                        key={item.id || `${item.target}-${item.timestamp}`}
                        whileHover={{ y: -1 }}
                        className="rv-panel-section p-3 hover:border-neon-green/40 transition-colors cursor-pointer"
                      >
                        <div className="flex justify-between items-start gap-3 mb-1">
                          <span className="text-xs font-mono text-neon-green truncate">{item.target || 'Unknown target'}</span>
                          <span className="text-[10px] text-cyber-gray uppercase">{item.status}</span>
                        </div>
                        <div className="text-[11px] text-neon-cyan truncate">
                          {(item.types || []).join(', ') || item.type || 'collection'}
                        </div>
                        <div className="text-[10px] text-cyber-gray mt-1">
                          {item.timestamp ? new Date(item.timestamp).toLocaleString() : 'No timestamp'}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {currentTab === 'tasks' && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-medium text-neon-green">Active Tasks</h3>
                  <span className="text-xs text-cyber-gray">{activeTasks.length} running</span>
                </div>

                {activeTasks.length === 0 ? (
                  <div className="rv-panel-section text-center py-8 text-cyber-gray">
                    <div className="flex justify-center mb-2">
                      <GlassIcon name="queue" size="lg" tone="muted" />
                    </div>
                    <p className="text-sm">No active tasks</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {activeTasks.map((task) => (
                      <motion.div
                        key={task.id}
                        whileHover={{ y: -1 }}
                        className="rv-panel-section p-3 hover:border-neon-cyan/40 transition-colors"
                      >
                        <div className="flex justify-between items-start gap-3 mb-2">
                          <span className="text-xs font-mono text-neon-cyan truncate">{task.target || 'Unknown target'}</span>
                          <div className="flex gap-1">
                            {task.status === 'RUNNING' ? (
                              <button type="button" onClick={() => onPauseTask(task.id)} className="rv-icon-button w-7 h-7 flex items-center justify-center text-warning-yellow">
                                <GlassIcon name="pause" size="xs" tone="yellow" bare />
                              </button>
                            ) : (
                              <button type="button" onClick={() => onResumeTask(task.id)} className="rv-icon-button w-7 h-7 flex items-center justify-center text-safe-green">
                                <GlassIcon name="play" size="xs" tone="green" bare />
                              </button>
                            )}
                            <button type="button" onClick={() => onCancelTask(task.id)} className="rv-icon-button w-7 h-7 flex items-center justify-center text-danger-red">
                              <GlassIcon name="close" size="xs" tone="red" bare />
                            </button>
                          </div>
                        </div>

                        <div className="mb-2">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-cyber-gray">{task.completed}/{task.total}</span>
                            <span className="text-neon-green">{Math.round(task.progress)}%</span>
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

                        <div className="text-[10px] text-cyber-gray uppercase">
                          {task.status} / {task.type}
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

      {!isCollapsed && (
        <div className="p-4 border-t rv-soft-divider">
          <div className="text-xs text-cyber-gray space-y-2">
            <div className="flex justify-between">
              <span>Collection Queue</span>
              <span className="text-neon-green">{runningCount} active</span>
            </div>
            <div className="flex justify-between">
              <span>Completed Runs</span>
              <span className="text-safe-green">{completedCount}</span>
            </div>
            <div className="flex justify-between">
              <span>Collector Sources</span>
              <span className="text-neon-cyan">{COLLECTION_TYPES.length}</span>
            </div>
          </div>
        </div>
      )}
    </motion.aside>
  );
};

export default LeftSidebar;
