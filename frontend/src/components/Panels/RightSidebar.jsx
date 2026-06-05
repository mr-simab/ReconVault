// Right Sidebar Component - contextual entity and relationship inspector
import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import EntityInspector from '../Inspector/EntityInspector';
import RelationshipInspector from '../Inspector/RelationshipInspector';
import CompliancePanel from '../Inspector/CompliancePanel';
import GlassIcon from '../Common/GlassIcon';

const entityTabs = [
  { id: 'overview', label: 'Overview', icon: 'density' },
  { id: 'metadata', label: 'Metadata', icon: 'docs' },
  { id: 'relationships', label: 'Relations', icon: 'relationship' },
  { id: 'risk', label: 'Risk', icon: 'risk' },
  { id: 'compliance', label: 'Policy', icon: 'shield' },
  { id: 'history', label: 'History', icon: 'history' }
];

const relationshipTabs = [
  { id: 'overview', label: 'Overview', icon: 'relationship' },
  { id: 'metadata', label: 'Metadata', icon: 'docs' },
  { id: 'properties', label: 'Properties', icon: 'settings' },
  { id: 'compliance', label: 'Policy', icon: 'shield' },
  { id: 'history', label: 'History', icon: 'history' }
];

const RightSidebar = ({
  selectedNode = null,
  selectedEdge = null,
  isCollapsed = false,
  onToggleCollapse,
  className = '',
  onEntityAction = () => {},
  onRelationshipAction = () => {},
  nodeCount = 0,
  edgeCount = 0
}) => {
  const [activeTab, setActiveTab] = useState('overview');

  const hasSelection = selectedNode || selectedEdge;
  const isEntity = !!selectedNode;
  const isRelationship = !!selectedEdge;
  const tabs = isRelationship ? relationshipTabs : entityTabs;

  useEffect(() => {
    if (!tabs.some((tab) => tab.id === activeTab)) {
      setActiveTab('overview');
    }
  }, [activeTab, tabs]);

  useEffect(() => {
    setActiveTab('overview');
  }, [selectedNode?.id, selectedEdge?.id]);

  const graphDensity = useMemo(() => {
    if (nodeCount < 2) return 0;
    return edgeCount / ((nodeCount * (nodeCount - 1)) / 2);
  }, [nodeCount, edgeCount]);

  const sidebarVariants = {
    expanded: { width: 360 },
    collapsed: { width: 64 }
  };

  const contentVariants = {
    expanded: { opacity: 1, x: 0 },
    collapsed: { opacity: 0, x: 18 }
  };

  const headerIcon = isEntity ? 'target' : isRelationship ? 'relationship' : 'graph';
  const headerTitle = isEntity ? 'Entity Inspector' : isRelationship ? 'Relationship Inspector' : 'Graph Inspector';

  return (
    <motion.aside
      variants={sidebarVariants}
      animate={isCollapsed ? 'collapsed' : 'expanded'}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={`rv-side-panel relative border-l h-full flex flex-col flex-shrink-0 overflow-hidden ${className}`}
    >
      <button
        type="button"
        onClick={onToggleCollapse}
        className="rv-icon-button absolute -left-3 top-6 w-7 h-12 flex items-center justify-center text-neon-green hover:text-neon-cyan z-20"
        title={isCollapsed ? 'Expand inspector' : 'Collapse inspector'}
      >
        <GlassIcon name={isCollapsed ? 'collapse-left' : 'collapse-right'} size="xs" tone="cyan" bare />
      </button>

      <div className="p-4 border-b rv-soft-divider">
        <motion.div
          variants={contentVariants}
          animate={isCollapsed ? 'collapsed' : 'expanded'}
          className="flex items-center gap-3"
        >
          {!isCollapsed && (
            <>
              <GlassIcon name={headerIcon} size="lg" tone="cyan" />
              <div className="min-w-0">
                <h2 className="text-lg font-cyber text-neon-cyan leading-tight">{headerTitle}</h2>
                <p className="text-xs text-cyber-gray uppercase">{hasSelection ? 'Details and analysis' : 'Awaiting graph selection'}</p>
              </div>
            </>
          )}
        </motion.div>
      </div>

      {!isCollapsed && hasSelection && (
        <div className="grid grid-cols-5 gap-1 p-2 border-b rv-soft-divider">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rv-tab-button relative px-2 py-2 text-[11px] font-mono flex flex-col items-center gap-1 ${activeTab === tab.id ? 'is-active' : ''}`}
            >
              <GlassIcon name={tab.icon} size="xs" tone={activeTab === tab.id ? 'green' : 'cyan'} />
              <span className="truncate max-w-full">{tab.label}</span>
              {activeTab === tab.id && (
                <motion.span
                  layoutId="rightActiveTab"
                  className="absolute bottom-0 left-2 right-2 h-0.5 bg-neon-cyan"
                />
              )}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto scrollable-cyber">
        <AnimatePresence mode="wait">
          {!hasSelection ? (
            <motion.div
              key="no-selection"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="flex flex-col items-center justify-center h-full p-8 text-center"
            >
              <GlassIcon name={isCollapsed ? 'info' : 'target'} size="xl" tone="muted" />

              {!isCollapsed && (
                <>
                  <h3 className="text-lg font-cyber text-cyber-gray mt-4 mb-2">No Selection</h3>
                  <p className="text-sm text-cyber-gray leading-relaxed">
                    Select a node or relationship in the graph to inspect evidence, metadata, risk, and policy context.
                  </p>

                  <div className="rv-panel-section mt-8 p-4 w-full">
                    <h4 className="text-xs font-medium text-neon-cyan mb-3 uppercase">Graph Statistics</h4>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-cyber-gray">Nodes</span>
                        <span className="text-neon-green font-mono">{nodeCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-cyber-gray">Edges</span>
                        <span className="text-neon-green font-mono">{edgeCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-cyber-gray">Density</span>
                        <span className="text-neon-cyan font-mono">{graphDensity.toFixed(3)}</span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          ) : (
            <motion.div
              key={isEntity ? `entity-${selectedNode.id}-${activeTab}` : `relationship-${selectedEdge.id}-${activeTab}`}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
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

              {activeTab === 'compliance' && <CompliancePanel />}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {!isCollapsed && hasSelection && (
        <div className="p-4 border-t rv-soft-divider">
          <motion.div
            variants={contentVariants}
            animate={isCollapsed ? 'collapsed' : 'expanded'}
            className="space-y-3"
          >
            <div className="flex gap-2">
              {isEntity && (
                <>
                  <button type="button" onClick={() => onEntityAction('copy', selectedNode)} className="rv-command-button flex-1 px-3 py-2 text-xs font-mono flex items-center justify-center gap-2">
                    <GlassIcon name="copy" size="xs" tone="green" />
                    <span>Copy</span>
                  </button>
                  <button type="button" onClick={() => onEntityAction('export', selectedNode)} className="rv-command-button flex-1 px-3 py-2 text-xs font-mono flex items-center justify-center gap-2">
                    <GlassIcon name="export" size="xs" tone="cyan" />
                    <span>Export</span>
                  </button>
                </>
              )}

              {isRelationship && (
                <>
                  <button type="button" onClick={() => onRelationshipAction('edit', selectedEdge)} className="rv-command-button flex-1 px-3 py-2 text-xs font-mono flex items-center justify-center gap-2">
                    <GlassIcon name="edit" size="xs" tone="cyan" />
                    <span>Edit</span>
                  </button>
                  <button type="button" onClick={() => onRelationshipAction('delete', selectedEdge)} className="rv-command-button flex-1 px-3 py-2 text-xs font-mono flex items-center justify-center gap-2 text-danger-red hover:border-danger-red hover:text-white">
                    <GlassIcon name="delete" size="xs" tone="red" />
                    <span>Delete</span>
                  </button>
                </>
              )}
            </div>

            <div className="text-xs text-cyber-gray space-y-1">
              <div className="flex justify-between gap-3">
                <span>Selected</span>
                <span className="text-neon-cyan font-mono truncate">{isEntity ? selectedNode.type : selectedEdge.type}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span>ID</span>
                <span className="text-neon-green font-mono rv-truncate-id">{isEntity ? selectedNode.id : selectedEdge.id}</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </motion.aside>
  );
};

export default RightSidebar;
