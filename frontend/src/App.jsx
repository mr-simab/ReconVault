// ReconVault Main Application Component - Cyber Graph Visualization Interface
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { useGraph } from './hooks/useGraph';
import { useWebSocket } from './hooks/useWebSocket';
import { useToast } from './components/Common/Toast';
import { collectionAPI } from './services/api';
import { API_CONFIG } from './utils/constants';

// Layout Components
import TopHeader from './components/Panels/TopHeader';
import LeftSidebar from './components/Panels/LeftSidebar';
import RightSidebar from './components/Panels/RightSidebar';
import GraphCanvas from './components/Graph/GraphCanvas';
import ComplianceDashboard from './components/Dashboard/ComplianceDashboard';
import InvestigationDashboard from './components/Dashboard/InvestigationDashboard';
import IntelligenceOpsDashboard from './components/Dashboard/IntelligenceOpsDashboard';
import MCPPlayground from './components/Dashboard/MCPPlayground';
import GlassIcon from './components/Common/GlassIcon';

// Import styles
import './styles/main.css';

function App() {
  // State management
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedEdge, setSelectedEdge] = useState(null);
  const [graphContainerSize, setGraphContainerSize] = useState({ width: 800, height: 600 });
  const graphPanelRef = useRef(null);
  const [activeView, setActiveView] = useState('graph'); // graph, investigations, operations, mcp, or compliance
  const [collectionStarting, setCollectionStarting] = useState(false);
  const [serviceStatus, setServiceStatus] = useState({
    database: {
      status: 'checking',
      detail: 'Checking',
      title: 'Firebase Realtime Database status'
    },
    mcp: {
      status: 'checking',
      detail: 'Checking',
      title: 'MCP gateway status'
    }
  });

  // Hooks
  const {
    nodes,
    edges,
    loading,
    error,
    filters,
    updateFilters,
    refreshGraph,
  } = useGraph();

  const { connected: wsConnected, addEventListener } = useWebSocket();
  const { success, error: showError, loading: showLoading } = useToast();

  // Collection history and active tasks come from the backend only.
  const [collectionHistory, setCollectionHistory] = useState([]);
  const [activeTasks, setActiveTasks] = useState([]);

  const normalizeCollectionTask = useCallback((task) => {
    const id = task.taskId || task.task_id || task.id;
    const collectorsCompleted = task.collectorsCompleted || task.collectors_completed || [];
    const collectorsFailed = task.collectorsFailed || task.collectors_failed || [];
    const collectorsRequested = task.collectorsRequested || task.collectors_requested || task.types || [];
    const progress = task.progress ?? task.progress_percent ?? 0;
    const total = collectorsRequested.length || collectorsCompleted.length + collectorsFailed.length || 1;

    return {
      id,
      taskId: id,
      target: task.target || '',
      types: collectorsRequested,
      type: collectorsRequested.join(', ') || 'collection',
      status: task.status || 'UNKNOWN',
      progress,
      completed: collectorsCompleted.length,
      failed: collectorsFailed.length,
      total,
      timestamp: task.startTime || task.start_time || task.createdAt || new Date().toISOString()
    };
  }, []);

  const refreshCollectionTasks = useCallback(async () => {
    try {
      const response = await collectionAPI.getCollectionTasks();
      const tasks = (response.tasks || response.data || []).map(normalizeCollectionTask);
      setCollectionHistory(tasks.filter((task) => task.status !== 'RUNNING'));
      setActiveTasks(tasks.filter((task) => task.status === 'RUNNING'));
    } catch (error) {
      console.warn('Collection task refresh failed:', error.message);
    }
  }, [normalizeCollectionTask]);

  // WebSocket Event Listeners
  useEffect(() => {
    if (wsConnected) {
      const unsubscribeViolation = addEventListener('compliance_violation', (data) => {
        showError(`Compliance Violation: ${data.message} (${data.severity.toUpperCase()})`);
      });
      
      return () => {
        unsubscribeViolation();
      };
    }
  }, [wsConnected, addEventListener, showError]);

  useEffect(() => {
    if (!wsConnected) return undefined;

    const upsertActiveTask = (payload) => {
      const task = normalizeCollectionTask(payload);
      setActiveTasks((prev) => {
        const withoutCurrent = prev.filter((item) => item.id !== task.id);
        return task.status === 'RUNNING' ? [task, ...withoutCurrent] : withoutCurrent;
      });
    };

    const unsubscribeProgress = addEventListener('collection_progress', upsertActiveTask);
    const unsubscribeCompleted = addEventListener('collection_completed', (payload) => {
      upsertActiveTask({ ...payload, status: payload?.status || 'COMPLETED' });
      refreshCollectionTasks();
      refreshGraph();
      success(`Collection completed for ${payload?.target || 'target'}`);
    });
    const unsubscribeFailed = addEventListener('collection_failed', (payload) => {
      upsertActiveTask({ ...payload, status: payload?.status || 'FAILED' });
      refreshCollectionTasks();
      refreshGraph();
    });

    return () => {
      unsubscribeProgress();
      unsubscribeCompleted();
      unsubscribeFailed();
    };
  }, [wsConnected, addEventListener, normalizeCollectionTask, refreshCollectionTasks, refreshGraph, success]);

  useEffect(() => {
    refreshCollectionTasks();
    const interval = setInterval(refreshCollectionTasks, 15000);
    return () => clearInterval(interval);
  }, [refreshCollectionTasks]);

  // Graph event handlers
  const handleNodeSelect = useCallback((node) => {
    setSelectedNode(node);
    setSelectedEdge(null);
  }, []);

  const handleEdgeSelect = useCallback((edge) => {
    setSelectedEdge(edge);
    setSelectedNode(null);
  }, []);

  const handleNodeHover = useCallback((node) => {
    // Could show tooltip or highlight connections
    console.log('Node hovered:', node?.id);
  }, []);

  const handleEdgeHover = useCallback((edge) => {
    // Could show edge details tooltip
    console.log('Edge hovered:', edge?.id);
  }, []);

  // Collection handlers
  const handleStartCollection = useCallback(async (config) => {
    if (collectionStarting) return;
    try {
      const target = String(config?.target || '').trim();
      const types = Array.isArray(config?.types) ? config.types : [];
      if (!target || types.length === 0) {
        showError('Target and at least one collection type are required.');
        return;
      }

      setCollectionStarting(true);
      showLoading('Starting intelligence collection...');

      const payload = {
        target,
        types,
        includeDarkWeb: Boolean(config?.options?.includeDarkWeb),
        includeMedia: Boolean(config?.options?.includeMedia),
        collectors: types
      };

      const result = await collectionAPI.startCollection(payload.target, payload.types, payload);
      const taskId = result?.task_id || result?.taskId;
      if (taskId) {
        setActiveTasks((prev) => [
          normalizeCollectionTask({
            task_id: taskId,
            target,
            status: result?.status || 'RUNNING',
            progress_percent: 0,
            types
          }),
          ...prev.filter((task) => task.id !== taskId)
        ]);
      }
      success(`Collection started for ${target} (task: ${result?.task_id || result?.taskId || 'unknown'})`);
      console.log('Collection started:', { config, result });
      refreshCollectionTasks();

    } catch (error) {
      showError('Failed to start collection: ' + error.message);
    } finally {
      setCollectionStarting(false);
    }
  }, [collectionStarting, normalizeCollectionTask, refreshCollectionTasks, success, showError, showLoading]);

  const handleEntityAction = useCallback((action, entity) => {
    console.log('Entity action:', action, entity);
    
    switch (action) {
      case 'copy':
        navigator.clipboard.writeText(entity.value || entity.id);
        success('Entity copied to clipboard');
        break;
      case 'export':
        success('Entity exported successfully');
        break;
      case 'edit':
        showError('Edit functionality not implemented yet');
        break;
      case 'delete':
        showError('Delete functionality not implemented yet');
        break;
      default:
        console.log('Unknown entity action:', action);
    }
  }, [success, showError]);

  const handleRelationshipAction = useCallback((action, relationship) => {
    console.log('Relationship action:', action, relationship);
    
    switch (action) {
      case 'edit':
        showError('Edit functionality not implemented yet');
        break;
      case 'delete':
        showError('Delete functionality not implemented yet');
        break;
      default:
        console.log('Unknown relationship action:', action);
    }
  }, [showError]);

  // Header menu handlers
  const handleMenuAction = useCallback((action) => {
    console.log('Menu action:', action);
    
    switch (action) {
      case 'compliance':
        setActiveView(activeView === 'compliance' ? 'graph' : 'compliance');
        break;
      case 'investigations':
        setActiveView(activeView === 'investigations' ? 'graph' : 'investigations');
        break;
      case 'operations':
        setActiveView(activeView === 'operations' ? 'graph' : 'operations');
        break;
      case 'mcp':
        setActiveView(activeView === 'mcp' ? 'graph' : 'mcp');
        break;
      case 'home':
        setActiveView('graph');
        break;
      case 'export':
        success('Graph export functionality initiated');
        break;
      case 'settings':
        showError('Settings panel not implemented yet');
        break;
      case 'help':
        window.open('https://docs.reconvault.com', '_blank');
        break;
      case 'about':
        alert('ReconVault v1.0.0 - Cyber Intelligence Platform');
        break;
      default:
        console.log('Unknown menu action:', action);
    }
  }, [success, showError]);

  // Search handlers
  const handleSearch = useCallback((query) => {
    console.log('Search query:', query);
    success(`Searching for: ${query}`);
    
    // In real app, this would trigger actual search
    updateFilters({ searchQuery: query });
  }, [success, updateFilters]);

  // Keep graph canvas inside the exact available center panel.
  useEffect(() => {
    const panel = graphPanelRef.current;
    if (!panel) return undefined;

    const updateSize = () => {
      const rect = panel.getBoundingClientRect();
      setGraphContainerSize({
        width: Math.max(320, Math.floor(rect.width)),
        height: Math.max(280, Math.floor(rect.height))
      });
    };

    updateSize();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateSize) : null;
    observer?.observe(panel);
    window.addEventListener('resize', updateSize);

    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, [activeView, sidebarCollapsed, rightSidebarCollapsed]);

  // Backend connection monitoring
  const [backendConnected, setBackendConnected] = useState(true);

  useEffect(() => {
    const apiBase = API_CONFIG.BASE_URL.replace(/\/$/, '');
    const fetchApiJson = async (path) => {
      const response = await fetch(`${apiBase}${path}`);
      if (!response.ok) {
        throw new Error(`${path} returned ${response.status}`);
      }
      return response.json();
    };

    const refreshServiceStatus = async () => {
      const [databaseResult, mcpResult] = await Promise.allSettled([
        fetchApiJson('/health/database'),
        fetchApiJson('/mcp/servers')
      ]);

      const nextStatus = {
        database: {
          status: 'disconnected',
          detail: 'Not connected',
          title: 'Firebase Realtime Database is not reachable'
        },
        mcp: {
          status: 'disconnected',
          detail: '0/0',
          title: 'MCP gateway is not reachable'
        }
      };

      if (databaseResult.status === 'fulfilled') {
        const database = databaseResult.value || {};
        const connected = String(database.status || '').toLowerCase() === 'connected';
        nextStatus.database = {
          status: connected ? 'connected' : database.status || 'disconnected',
          detail: connected ? 'Connected' : 'Not connected',
          title: database.provider
            ? `Database provider: ${database.provider}`
            : 'Firebase Realtime Database status'
        };
      }

      if (mcpResult.status === 'fulfilled') {
        const servers = Array.isArray(mcpResult.value?.servers) ? mcpResult.value.servers : [];
        const configuredCount = servers.filter((server) => server.configured).length;
        nextStatus.mcp = {
          status: configuredCount > 0 ? 'configured' : 'disconnected',
          detail: `${configuredCount}/${servers.length}`,
          title: `${configuredCount} connected and ${Math.max(servers.length - configuredCount, 0)} not connected MCP servers`
        };
      }

      setServiceStatus(nextStatus);
    };

    const checkBackendConnection = async () => {
      try {
        const healthBase = API_CONFIG.BASE_URL.replace(/\/api\/v1\/?$/, '');
        const response = await fetch(`${healthBase}/health`);
        if (!response.ok) throw new Error('Backend not responding');
        setBackendConnected(true);
      } catch (error) {
        console.warn('Backend connection failed; live data is unavailable');
        setBackendConnected(false);
      }
    };

    const refreshPlatformStatus = () => {
      checkBackendConnection();
      refreshServiceStatus();
    };

    refreshPlatformStatus();
    const interval = setInterval(refreshPlatformStatus, 30000); // Check every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  // Animation variants
  const layoutVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  return (
    <div className="rv-shell h-screen text-neon-green font-mono overflow-hidden">
      {/* Backend Connection Warning */}
      {!backendConnected && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-warning-yellow text-cyber-black px-4 py-2 rounded-lg border border-warning-yellow shadow-lg font-mono text-sm flex items-center gap-2">
          <GlassIcon name="alert" size="sm" tone="red" />
          <span>Backend connection failed - live data unavailable</span>
        </div>
      )}

      {/* Main Layout */}
      <motion.div
        variants={layoutVariants}
        initial="hidden"
        animate="visible"
        className="h-full min-h-0 flex flex-col overflow-hidden"
      >
        {/* Top Header */}
        <TopHeader
          onSearch={handleSearch}
          onMenuAction={handleMenuAction}
          activeView={activeView}
          serviceStatus={serviceStatus}
          backendConnected={backendConnected}
        />

        {/* Main Content Area */}
        <div className="flex-1 min-h-0 flex overflow-hidden">
          {/* Left Sidebar */}
          <LeftSidebar
            isCollapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
            activeTab="search"
            collectionHistory={collectionHistory}
            activeTasks={activeTasks}
            onStartCollection={handleStartCollection}
          />

          {/* Graph Container or Compliance Dashboard */}
          <div ref={graphPanelRef} className="flex-1 min-w-0 min-h-0 relative overflow-hidden">
            {activeView === 'graph' ? (
              <GraphCanvas
                nodes={nodes}
                edges={edges}
                selectedNode={selectedNode}
                selectedEdge={selectedEdge}
                onNodeSelect={handleNodeSelect}
                onNodeHover={handleNodeHover}
                onEdgeSelect={handleEdgeSelect}
                onEdgeHover={handleEdgeHover}
                filters={filters}
                width={graphContainerSize.width}
                height={graphContainerSize.height}
                className="w-full h-full"
              />
            ) : activeView === 'investigations' ? (
              <InvestigationDashboard />
            ) : activeView === 'operations' ? (
              <IntelligenceOpsDashboard />
            ) : activeView === 'mcp' ? (
              <MCPPlayground />
            ) : (
              <ComplianceDashboard />
            )}

            {/* Loading Overlay */}
            {loading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 bg-cyber-black bg-opacity-80 flex items-center justify-center z-50"
              >
                <div className="text-center">
                  <div className="loading-spinner mb-4" />
                  <p className="text-neon-green font-mono">Loading graph data...</p>
                </div>
              </motion.div>
            )}

            {/* Error Overlay */}
            {error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 bg-cyber-black bg-opacity-85 flex items-center justify-center z-50"
              >
                <div className="text-center glass-panel-dark p-6 max-w-md mx-4">
                  <div className="flex justify-center mb-4">
                    <GlassIcon name="alert" size="xl" tone="red" />
                  </div>
                  <p className="text-white font-mono">Error: {error}</p>
                  <button
                    onClick={refreshGraph}
                    className="rv-command-button mt-4 px-4 py-2 text-danger-red font-mono hover:text-white hover:border-danger-red"
                  >
                    Retry
                  </button>
                </div>
              </motion.div>
            )}
          </div>

          {/* Right Sidebar */}
          <RightSidebar
            selectedNode={selectedNode}
            selectedEdge={selectedEdge}
            isCollapsed={rightSidebarCollapsed}
            onToggleCollapse={() => setRightSidebarCollapsed(!rightSidebarCollapsed)}
            onEntityAction={handleEntityAction}
            onRelationshipAction={handleRelationshipAction}
            nodeCount={nodes.length}
            edgeCount={edges.length}
          />
        </div>

      </motion.div>
    </div>
  );
}

export default App;
