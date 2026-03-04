// Bottom Stats Component - metrics dashboard
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useGraph } from '../../hooks/useGraph';
import { useToast } from '../Common/Toast';

const BottomStats = ({
  isCollapsed = false,
  onToggleCollapse,
  className = '',
  showPerformanceMetrics = true,
  refreshInterval = 5000
}) => {
  const { performance, graphStats, nodes, edges } = useGraph();
  const { success } = useToast();
  const [stats, setStats] = useState({
    totalNodes: 0,
    totalEdges: 0,
    graphDensity: 0,
    avgNodeDegree: 0,
    collectionTasks: 0,
    dataSources: 0,
    lastUpdate: null,
    criticalNodes: 0,
    highRiskNodes: 0
  });

  const handleStatClick = (item) => {
    success(`${item.label} metric: ${formatMetric(item.value, item.type)}`);
  };

  const [realTimeMetrics, setRealTimeMetrics] = useState({
    fps: 0,
    renderTime: 0,
    memoryUsage: 0,
    networkLatency: 0
  });

  // Update stats when data changes
  useEffect(() => {
    const calculatedStats = {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      graphDensity: calculateGraphDensity(nodes.length, edges.length),
      avgNodeDegree: calculateAverageNodeDegree(nodes, edges),
      collectionTasks: Math.floor(Math.random() * 10) + 1, // Mock data
      dataSources: 7, // Mock data
      lastUpdate: new Date(),
      criticalNodes: nodes.filter(n => n.riskLevel === 'CRITICAL').length,
      highRiskNodes: nodes.filter(n => n.riskLevel === 'HIGH').length
    };
    setStats(calculatedStats);
  }, [nodes, edges]);

  // Update real-time metrics
  useEffect(() => {
    setRealTimeMetrics({
      fps: performance.fps,
      renderTime: performance.renderTime,
      memoryUsage: calculateMemoryUsage(),
      networkLatency: Math.floor(Math.random() * 100) + 50 // Mock latency
    });
  }, [performance]);

  // Auto-refresh stats
  useEffect(() => {
    const interval = setInterval(() => {
      // Update timestamp
      setStats(prev => ({
        ...prev,
        lastUpdate: new Date()
      }));
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  const calculateGraphDensity = (nodeCount, edgeCount) => {
    if (nodeCount < 2) return 0;
    const maxEdges = (nodeCount * (nodeCount - 1)) / 2;
    return edgeCount / maxEdges;
  };

  const calculateAverageNodeDegree = (nodes, edges) => {
    if (nodes.length === 0) return 0;
    const totalDegree = edges.reduce((sum, edge) => {
      return sum + (nodes.find(n => n.id === edge.source) ? 1 : 0) +
             (nodes.find(n => n.id === edge.target) ? 1 : 0);
    }, 0);
    return totalDegree / nodes.length;
  };

  const calculateMemoryUsage = () => {
    if (performance.memory) {
      return Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
    }
    // Mock memory usage
    return Math.floor(Math.random() * 50) + 20;
  };

  const formatMetric = (value, type = 'number') => {
    switch (type) {
      case 'percentage':
        return `${(value * 100).toFixed(1)}%`;
      case 'time':
        return `${value.toFixed(1)}ms`;
      case 'bytes':
        return `${value}MB`;
      default:
        return value.toLocaleString();
    }
  };

  const statsItems = [
    {
      id: 'nodes',
      label: 'Nodes',
      value: stats.totalNodes,
      icon: '🎯',
      color: 'text-neon-green',
      trend: '+12%',
      trendUp: true
    },
    {
      id: 'edges',
      label: 'Edges',
      value: stats.totalEdges,
      icon: '🔗',
      color: 'text-neon-cyan',
      trend: '+8%',
      trendUp: true
    },
    {
      id: 'density',
      label: 'Density',
      value: stats.graphDensity,
      icon: '📊',
      color: 'text-neon-purple',
      type: 'percentage',
      trend: '+2.1%',
      trendUp: true
    },
    {
      id: 'degree',
      label: 'Avg Degree',
      value: stats.avgNodeDegree,
      icon: '🌐',
      color: 'text-warning-yellow',
      trend: '+0.5',
      trendUp: true
    },
    {
      id: 'critical',
      label: 'Critical',
      value: stats.criticalNodes,
      icon: '🚨',
      color: 'text-danger-red',
      trend: '-2',
      trendUp: false
    },
    {
      id: 'high-risk',
      label: 'High Risk',
      value: stats.highRiskNodes,
      icon: '⚠️',
      color: 'text-neon-orange',
      trend: '+1',
      trendUp: false
    },
    {
      id: 'tasks',
      label: 'Tasks',
      value: stats.collectionTasks,
      icon: '⚙️',
      color: 'text-neon-green',
      trend: '+3',
      trendUp: true
    },
    {
      id: 'sources',
      label: 'Sources',
      value: stats.dataSources,
      icon: '📡',
      color: 'text-neon-cyan',
      trend: '+1',
      trendUp: true
    }
  ];

  const performanceItems = [
    {
      label: 'FPS',
      value: realTimeMetrics.fps,
      color: realTimeMetrics.fps >= 55 ? 'text-safe-green' : 
             realTimeMetrics.fps >= 30 ? 'text-warning-yellow' : 'text-danger-red',
      icon: realTimeMetrics.fps >= 55 ? '🟢' : realTimeMetrics.fps >= 30 ? '🟡' : '🔴'
    },
    {
      label: 'Render',
      value: formatMetric(realTimeMetrics.renderTime, 'time'),
      color: realTimeMetrics.renderTime <= 16 ? 'text-safe-green' : 
             realTimeMetrics.renderTime <= 33 ? 'text-warning-yellow' : 'text-danger-red',
      icon: realTimeMetrics.renderTime <= 16 ? '🟢' : realTimeMetrics.renderTime <= 33 ? '🟡' : '🔴'
    },
    {
      label: 'Memory',
      value: formatMetric(realTimeMetrics.memoryUsage, 'bytes'),
      color: realTimeMetrics.memoryUsage < 40 ? 'text-safe-green' : 
             realTimeMetrics.memoryUsage < 80 ? 'text-warning-yellow' : 'text-danger-red',
      icon: realTimeMetrics.memoryUsage < 40 ? '🟢' : realTimeMetrics.memoryUsage < 80 ? '🟡' : '🔴'
    },
    {
      label: 'Network',
      value: `${realTimeMetrics.networkLatency}ms`,
      color: realTimeMetrics.networkLatency < 100 ? 'text-safe-green' : 
             realTimeMetrics.networkLatency < 300 ? 'text-warning-yellow' : 'text-danger-red',
      icon: realTimeMetrics.networkLatency < 100 ? '🟢' : realTimeMetrics.networkLatency < 300 ? '🟡' : '🔴'
    }
  ];

  const containerVariants = {
    expanded: { height: 120 },
    collapsed: { height: 40 }
  };

  const contentVariants = {
    expanded: { opacity: 1, y: 0 },
    collapsed: { opacity: 0, y: 10 }
  };

  return (
    <motion.div
      variants={containerVariants}
      animate={isCollapsed ? 'collapsed' : 'expanded'}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={`
        relative bg-cyber-darker border-t border-cyber-border 
        overflow-hidden ${className}
      `}
    >
      {/* Collapse Toggle */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onToggleCollapse}
        className="
          absolute -top-3 left-1/2 transform -translate-x-1/2
          w-8 h-6 bg-cyber-darker border border-cyber-border
          rounded-t-lg flex items-center justify-center text-cyber-gray
          hover:text-neon-green transition-colors z-10
        "
      >
        <span className="text-sm">
          {isCollapsed ? '▲' : '▼'}
        </span>
      </motion.button>

      <div className="h-full p-4">
        <motion.div
          variants={contentVariants}
          animate={isCollapsed ? 'collapsed' : 'expanded'}
          className="h-full flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 bg-neon-green bg-opacity-20 rounded flex items-center justify-center">
                <span className="text-neon-green text-sm">📈</span>
              </div>
              <div>
                <h3 className="text-sm font-cyber text-neon-green">System Metrics</h3>
                <p className="text-xs text-cyber-gray">
                  Last update: {stats.lastUpdate?.toLocaleTimeString()}
                </p>
              </div>
            </div>

            {/* Real-time indicator */}
            <div className="flex items-center space-x-2">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-2 h-2 bg-safe-green rounded-full"
              />
              <span className="text-xs text-safe-green font-mono">LIVE</span>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-8 gap-4 flex-1">
            {statsItems.map((item) => (
              <motion.div
                key={item.id}
                whileHover={{ scale: 1.05, y: -2 }}
                onClick={() => handleStatClick(item)}
                className="
                  bg-cyber-light bg-opacity-50 rounded-lg p-3
                  border border-cyber-border hover:border-neon-green
                  transition-all duration-200 cursor-pointer
                "
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">{item.icon}</span>
                  <div className={`
                    text-xs font-mono flex items-center space-x-1
                    ${item.trendUp ? 'text-safe-green' : 'text-danger-red'}
                  `}>
                    <span>{item.trendUp ? '↗️' : '↘️'}</span>
                    <span>{item.trend}</span>
                  </div>
                </div>
                
                <div className={`text-lg font-bold font-mono ${item.color}`}>
                  {formatMetric(item.value, item.type)}
                </div>
                
                <div className="text-xs text-cyber-gray font-mono">
                  {item.label}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Performance Metrics */}
          {showPerformanceMetrics && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: isCollapsed ? 0 : 1, height: isCollapsed ? 0 : 'auto' }}
              className="mt-4 pt-4 border-t border-cyber-border"
            >
              <h4 className="text-xs font-medium text-neon-cyan mb-2">Performance</h4>
              <div className="grid grid-cols-4 gap-4">
                {performanceItems.map((item, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <span className="text-xs">{item.icon}</span>
                    <div>
                      <div className={`text-xs font-mono ${item.color}`}>
                        {item.value}
                      </div>
                      <div className="text-xs text-cyber-gray">
                        {item.label}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Status Bar */}
      <motion.div
        variants={contentVariants}
        animate={isCollapsed ? 'collapsed' : 'expanded'}
        className={`
          absolute bottom-0 left-0 right-0 
          bg-cyber-black bg-opacity-50 px-4 py-1
          border-t border-cyber-border
        `}
      >
        <div className="flex justify-between items-center text-xs font-mono text-cyber-gray">
          <div className="flex space-x-4">
            <span>Graph: {stats.totalNodes} nodes, {stats.totalEdges} edges</span>
            <span>Density: {formatMetric(stats.graphDensity, 'percentage')}</span>
          </div>
          <div className="flex space-x-4">
            <span>FPS: {realTimeMetrics.fps}</span>
            <span>Memory: {formatMetric(realTimeMetrics.memoryUsage, 'bytes')}</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default BottomStats;