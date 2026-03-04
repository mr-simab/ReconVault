// ReconVault Main Application Component - Cyber Graph Visualization Interface
import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useGraph } from './hooks/useGraph';
import { useWebSocket } from './hooks/useWebSocket';
import { useToast } from './components/Common/Toast';

// Layout Components
import TopHeader from './components/Panels/TopHeader';
import LeftSidebar from './components/Panels/LeftSidebar';
import RightSidebar from './components/Panels/RightSidebar';
import BottomStats from './components/Panels/BottomStats';
import GraphCanvas from './components/Graph/GraphCanvas';
import ComplianceDashboard from './components/Dashboard/ComplianceDashboard';

// Form Components
import ReconSearchForm from './components/Forms/ReconSearchForm';

// Import styles
import './styles/main.css';

function App() {
  // State management
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState(false);
  const [bottomStatsCollapsed, setBottomStatsCollapsed] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedEdge, setSelectedEdge] = useState(null);
  const [graphContainerSize, setGraphContainerSize] = useState({ width: 800, height: 600 });
  const [activeView, setActiveView] = useState('graph'); // 'graph' or 'compliance'

  // Hooks
  const {
    nodes,
    edges,
    loading,
    error,
    filters,
    updateFilters,
    selectNode,
    selectEdge,
    refreshGraph,
    performance
  } = useGraph();

  const { connected: wsConnected, connecting: wsConnecting, addEventListener } = useWebSocket();
  const { success, error: showError, loading: showLoading } = useToast();

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

  // Sample data for demonstration
  const [sampleData] = useState({
    nodes: [
      {
        id: '1',
        value: 'malware-c2.example.com',
        type: 'DOMAIN',
        riskLevel: 'CRITICAL',
        riskScore: 0.95,
        confidence: 0.9,
        source: 'VIRUSTOTAL',
        connections: 5,
        size: 20,
        color: '#ff0033',
        metadata: {
          firstSeen: '2024-01-15T10:30:00Z',
          lastSeen: '2024-01-20T14:22:00Z',
          categories: ['malware', 'command-and-control'],
          threatIntel: {
            score: 95,
            sources: ['VT', 'Shodan', 'AlienVault']
          }
        },
        created_at: '2024-01-15T10:30:00Z',
        updated_at: '2024-01-20T14:22:00Z'
      },
      {
        id: '2',
        value: '192.168.1.100',
        type: 'IP_ADDRESS',
        riskLevel: 'HIGH',
        riskScore: 0.75,
        confidence: 0.85,
        source: 'SHODAN',
        connections: 8,
        size: 16,
        color: '#ff6600',
        metadata: {
          geo: { country: 'US', city: 'New York' },
          openPorts: [22, 80, 443, 8080],
          org: 'Suspicious Organization'
        },
        created_at: '2024-01-18T09:15:00Z',
        updated_at: '2024-01-20T12:00:00Z'
      },
      {
        id: '3',
        value: 'phishing@malicious.net',
        type: 'EMAIL',
        riskLevel: 'MEDIUM',
        riskScore: 0.65,
        confidence: 0.8,
        source: 'WEB_SCRAPER',
        connections: 3,
        size: 12,
        color: '#ffaa00',
        metadata: {
          domain: 'malicious.net',
          associatedCampaigns: ['Phish-2024-001'],
          reports: 12
        },
        created_at: '2024-01-16T16:45:00Z',
        updated_at: '2024-01-19T11:30:00Z'
      },
      {
        id: '4',
        value: 'suspicious-user',
        type: 'USERNAME',
        riskLevel: 'LOW',
        riskScore: 0.35,
        confidence: 0.7,
        source: 'SOCIAL_MEDIA',
        connections: 2,
        size: 10,
        color: '#00dd00',
        metadata: {
          platforms: ['Twitter', 'LinkedIn'],
          followers: 1250,
          verified: false
        },
        created_at: '2024-01-17T14:20:00Z',
        updated_at: '2024-01-18T08:45:00Z'
      },
      {
        id: '5',
        value: 'secure-corp.com',
        type: 'DOMAIN',
        riskLevel: 'INFO',
        riskScore: 0.15,
        confidence: 0.95,
        source: 'MANUAL',
        connections: 4,
        size: 8,
        color: '#00d9ff',
        metadata: {
          legitimate: true,
          sslCertificate: true,
          whoisInfo: 'Registered 2020'
        },
        created_at: '2024-01-10T12:00:00Z',
        updated_at: '2024-01-20T16:00:00Z'
      }
    ],
    edges: [
      {
        id: 'e1',
        source: '1',
        target: '2',
        type: 'COMMUNICATES_WITH',
        confidence: 0.9,
        strength: 0.8,
        metadata: {
          protocols: ['HTTP', 'HTTPS'],
          frequency: 'daily',
          dataVolume: '2.3MB'
        },
        created_at: '2024-01-15T10:30:00Z',
        updated_at: '2024-01-20T14:22:00Z'
      },
      {
        id: 'e2',
        source: '2',
        target: '3',
        type: 'OWNS',
        confidence: 0.75,
        strength: 0.6,
        metadata: {
          evidence: ['Email headers', 'Server logs'],
          timeframe: '2024-01-16 to 2024-01-19'
        },
        created_at: '2024-01-16T16:45:00Z',
        updated_at: '2024-01-19T11:30:00Z'
      },
      {
        id: 'e3',
        source: '3',
        target: '4',
        type: 'MENTIONS',
        confidence: 0.6,
        strength: 0.4,
        metadata: {
          platform: 'Twitter',
          mentions: 5,
          sentiment: 'negative'
        },
        created_at: '2024-01-17T14:20:00Z',
        updated_at: '2024-01-18T08:45:00Z'
      },
      {
        id: 'e4',
        source: '5',
        target: '2',
        type: 'PART_OF',
        confidence: 0.85,
        strength: 0.7,
        metadata: {
          relationship: 'infrastructure',
          dnsRecords: ['A', 'MX', 'NS']
        },
        created_at: '2024-01-10T12:00:00Z',
        updated_at: '2024-01-20T16:00:00Z'
      }
    ]
  });

  // System status
  const [systemStatus, setSystemStatus] = useState({
    backend: 'healthy',
    database: 'connected',
    neo4j: 'connected',
    redis: 'connected'
  });

  // Collection history and active tasks
  const [collectionHistory] = useState([
    {
      target: 'suspicious-domain.com',
      types: ['domain', 'web'],
      timestamp: '2024-01-20T15:30:00Z',
      status: 'completed'
    },
    {
      target: 'phishing-campaign.net',
      types: ['email', 'social'],
      timestamp: '2024-01-19T10:15:00Z',
      status: 'completed'
    },
    {
      target: 'malware-c2.example.com',
      types: ['domain', 'ip'],
      timestamp: '2024-01-18T14:22:00Z',
      status: 'completed'
    }
  ]);

  const [activeTasks] = useState([
    {
      id: 'task-1',
      target: 'new-threat-domain.com',
      type: 'domain',
      status: 'RUNNING',
      progress: 65,
      completed: 13,
      total: 20
    },
    {
      id: 'task-2',
      target: 'suspicious-ip-range',
      type: 'ip',
      status: 'RUNNING',
      progress: 30,
      completed: 6,
      total: 20
    }
  ]);

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
    try {
      showLoading('Starting intelligence collection...');
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      success(`Collection started for ${config.target}`);
      
      // In real app, this would start the actual collection process
      console.log('Collection started:', config);
      
    } catch (error) {
      showError('Failed to start collection: ' + error.message);
    }
  }, [success, showError, showLoading]);

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

  // Update graph container size on window resize
  useEffect(() => {
    const handleResize = () => {
      const headerHeight = 80; // TopHeader height
      const bottomHeight = bottomStatsCollapsed ? 40 : 120; // BottomStats height
      const sidebarWidth = sidebarCollapsed ? 60 : 320; // LeftSidebar width
      const rightSidebarWidth = rightSidebarCollapsed ? 60 : 350; // RightSidebar width
      
      setGraphContainerSize({
        width: window.innerWidth - sidebarWidth - rightSidebarWidth,
        height: window.innerHeight - headerHeight - bottomHeight
      });
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [sidebarCollapsed, rightSidebarCollapsed, bottomStatsCollapsed]);

  // Backend connection monitoring
  const [backendConnected, setBackendConnected] = useState(true);

  useEffect(() => {
    const checkBackendConnection = async () => {
      try {
        const response = await fetch('http://localhost:8000/health');
        if (!response.ok) throw new Error('Backend not responding');
        setBackendConnected(true);
      } catch (error) {
        console.warn('Backend connection failed, using mock data');
        setBackendConnected(false);
      }
    };

    checkBackendConnection();
    const interval = setInterval(checkBackendConnection, 30000); // Check every 30 seconds
    
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
    <div className="min-h-screen bg-cyber-black text-neon-green font-mono overflow-y-auto">
      {/* Background Effects */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-cyber-dark via-cyber-black to-cyber-darker"></div>
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2300ff41' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }}
        ></div>
      </div>

      {/* Backend Connection Warning */}
      {!backendConnected && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-warning-yellow text-cyber-black px-4 py-2 rounded-lg border border-warning-yellow shadow-lg font-mono text-sm">
          ⚠️ Backend connection failed - using mock data
        </div>
      )}

      {/* Main Layout */}
      <motion.div
        variants={layoutVariants}
        initial="hidden"
        animate="visible"
        className="h-screen flex flex-col"
      >
        {/* Top Header */}
        <TopHeader
          onSearch={handleSearch}
          onFilterToggle={() => setShowAdvancedFilters(!showAdvancedFilters)}
          onMenuAction={handleMenuAction}
          systemStatus={systemStatus}
          showAdvancedFilters={showAdvancedFilters}
          onAdvancedFiltersToggle={() => setShowAdvancedFilters(!showAdvancedFilters)}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-y-auto">
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
          <div className="flex-1 relative">
            {activeView === 'graph' ? (
              <GraphCanvas
                nodes={sampleData.nodes}
                edges={sampleData.edges}
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
                className="absolute inset-0 bg-danger-red bg-opacity-80 flex items-center justify-center z-50"
              >
                <div className="text-center">
                  <div className="text-4xl mb-4">⚠️</div>
                  <p className="text-white font-mono">Error: {error}</p>
                  <button
                    onClick={refreshGraph}
                    className="mt-4 px-4 py-2 bg-white text-danger-red rounded font-mono hover:bg-gray-100"
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
          />
        </div>

        {/* Bottom Stats */}
        <BottomStats
          isCollapsed={bottomStatsCollapsed}
          onToggleCollapse={() => setBottomStatsCollapsed(!bottomStatsCollapsed)}
        />
      </motion.div>

      {/* Background Animation Elements */}
      <div className="fixed inset-0 pointer-events-none -z-20">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.6, 0.3]
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-20 left-20 w-2 h-2 bg-neon-green rounded-full"
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.2, 0.5, 0.2]
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1
          }}
          className="absolute top-40 right-32 w-1 h-1 bg-neon-cyan rounded-full"
        />
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.4, 0.7, 0.4]
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2
          }}
          className="absolute bottom-32 left-40 w-1.5 h-1.5 bg-neon-purple rounded-full"
        />
        <motion.div
          animate={{
            scale: [1, 1.4, 1],
            opacity: [0.3, 0.6, 0.3]
          }}
          transition={{
            duration: 3.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.5
          }}
          className="absolute bottom-20 right-20 w-2 h-2 bg-neon-magenta rounded-full"
        />
      </div>
    </div>
  );
}

export default App;