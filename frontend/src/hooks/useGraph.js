// Custom hook for graph state management
import { useState, useEffect, useCallback, useRef } from 'react';
import graphService from '../services/graphService';
import webSocketService from '../services/websocket';
import { PERFORMANCE } from '../utils/constants';

const getNow = () => {
  const perf = globalThis?.performance;
  if (perf?.now instanceof Function) return perf.now();
  return Date.now();
};

const getEndpointId = (endpoint) => {
  if (endpoint && typeof endpoint === 'object') return endpoint.id;
  return endpoint;
};

export const useGraph = (initialFilters = {}) => {
  // Graph state
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedEdge, setSelectedEdge] = useState(null);
  const [filters, setFilters] = useState(initialFilters);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [graphStats, setGraphStats] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  // Performance tracking
  const [perfMetrics, setPerfMetrics] = useState({
    fps: 0,
    renderTime: 0,
    nodeCount: 0,
    edgeCount: 0,
  });

  // Refs for performance optimization
  const animationFrameRef = useRef();
  const lastFrameTimeRef = useRef();
  const frameCountRef = useRef(0);
  const nodeCountRef = useRef(0);
  const edgeCountRef = useRef(0);
  const filtersRef = useRef(filters);
  const perfMetricsRef = useRef({
    fps: 0,
    renderTime: 0,
    nodeCount: 0,
    edgeCount: 0,
  });

  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  // Load graph data
  const loadGraphData = useCallback(async (newFilters) => {
    const effectiveFilters = newFilters ?? filtersRef.current;

    setLoading(true);
    setError(null);

    try {
      const data = await graphService.loadGraphData(effectiveFilters);

      setNodes(data.nodes);
      setEdges(data.edges);
      setLastUpdate(data.lastUpdate || new Date());

      nodeCountRef.current = data.nodes.length;
      edgeCountRef.current = data.edges.length;

      console.log(
        `[useGraph] Loaded ${data.nodes.length} nodes and ${data.edges.length} edges`
      );
    } catch (err) {
      console.error('[useGraph] Error loading graph data:', err);
      setError(err.message || 'Failed to load graph data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Performance monitoring
  useEffect(() => {
    const measurePerformance = () => {
      const now = getNow();
      const lastFrameTime = lastFrameTimeRef.current;

      if (lastFrameTime) {
        const deltaTime = now - lastFrameTime;
        const fps = deltaTime > 0 ? 1000 / deltaTime : 0;

        // Update ref immediately for accurate tracking
        perfMetricsRef.current = {
          fps: Math.round(fps),
          renderTime: Math.round(deltaTime),
          nodeCount: nodeCountRef.current,
          edgeCount: edgeCountRef.current,
        };

        // Only update state every 60 frames (~1 second at 60fps) to avoid excessive re-renders
        frameCountRef.current++;
        if (frameCountRef.current >= 60) {
          setPerfMetrics({ ...perfMetricsRef.current });
          frameCountRef.current = 0;
        }
      }

      lastFrameTimeRef.current = now;
      animationFrameRef.current = requestAnimationFrame(measurePerformance);
    };

    animationFrameRef.current = requestAnimationFrame(measurePerformance);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Graph data event listeners
  useEffect(() => {
    const unsubscribeGraphDataLoaded = graphService.onGraphDataLoaded((data) => {
      setNodes(data.nodes);
      setEdges(data.edges);
      setLastUpdate(data.lastUpdate || new Date());
      nodeCountRef.current = data.nodes.length;
      edgeCountRef.current = data.edges.length;
    });

    const unsubscribeEntityCreated = graphService.onEntityCreated((entity) => {
      setNodes((prev) => {
        const exists = prev.some((n) => n.id === entity.id);
        const next = exists
          ? prev.map((n) => (n.id === entity.id ? entity : n))
          : [...prev, entity];

        nodeCountRef.current = next.length;
        return next;
      });
    });

    const unsubscribeEntityUpdated = graphService.onEntityUpdated((entity) => {
      setNodes((prev) => prev.map((n) => (n.id === entity.id ? entity : n)));
    });

    const unsubscribeEntityDeleted = graphService.onEntityDeleted((payload) => {
      const id = payload?.id;
      if (!id) return;

      setNodes((prev) => {
        const next = prev.filter((n) => n.id !== id);
        nodeCountRef.current = next.length;
        return next;
      });

      setEdges((prev) => {
        const next = prev.filter((e) => {
          const sourceId = getEndpointId(e.source);
          const targetId = getEndpointId(e.target);
          return sourceId !== id && targetId !== id;
        });

        edgeCountRef.current = next.length;
        return next;
      });

      if (selectedNode?.id === id) {
        setSelectedNode(null);
      }
    });

    const unsubscribeRelationshipCreated = graphService.onRelationshipCreated(
      (relationship) => {
        setEdges((prev) => {
          const exists = prev.some((e) => e.id === relationship.id);
          const next = exists
            ? prev.map((e) => (e.id === relationship.id ? relationship : e))
            : [...prev, relationship];

          edgeCountRef.current = next.length;
          return next;
        });
      }
    );

    const unsubscribeRelationshipDeleted = graphService.onRelationshipDeleted(
      (relationship) => {
        const id = relationship?.id;
        if (!id) return;

        setEdges((prev) => {
          const next = prev.filter((e) => e.id !== id);
          edgeCountRef.current = next.length;
          return next;
        });

        if (selectedEdge?.id === id) {
          setSelectedEdge(null);
        }
      }
    );

    const unsubscribeCacheCleared = graphService.onCacheCleared(() => {
      setNodes([]);
      setEdges([]);
      setSelectedNode(null);
      setSelectedEdge(null);
      setGraphStats(null);
      setLastUpdate(null);
      nodeCountRef.current = 0;
      edgeCountRef.current = 0;
    });

    // Subscribe to WebSocket events
    const unsubscribeWSConnected = webSocketService.onConnected(() => {
      console.log('[useGraph] WebSocket connected, reloading data');
      loadGraphData();
    });

    const unsubscribeWSEntityCreated = webSocketService.onEntityCreated(
      (entity) => {
        graphService.handleEntityCreated(entity);
      }
    );

    const unsubscribeWSEntityUpdated = webSocketService.onEntityUpdated(
      (entity) => {
        graphService.handleEntityUpdated(entity);
      }
    );

    const unsubscribeWSEntityDeleted = webSocketService.onEntityDeleted(
      (payload) => {
        graphService.handleEntityDeleted(payload);
      }
    );

    const unsubscribeWSRelationshipCreated =
      webSocketService.onRelationshipCreated((relationship) => {
        graphService.handleRelationshipCreated(relationship);
      });

    const unsubscribeWSRelationshipDeleted =
      webSocketService.onRelationshipDeleted((relationship) => {
        graphService.handleRelationshipDeleted(relationship);
      });

    return () => {
      unsubscribeGraphDataLoaded?.();
      unsubscribeEntityCreated?.();
      unsubscribeEntityUpdated?.();
      unsubscribeEntityDeleted?.();
      unsubscribeRelationshipCreated?.();
      unsubscribeRelationshipDeleted?.();
      unsubscribeCacheCleared?.();
      unsubscribeWSConnected?.();
      unsubscribeWSEntityCreated?.();
      unsubscribeWSEntityUpdated?.();
      unsubscribeWSEntityDeleted?.();
      unsubscribeWSRelationshipCreated?.();
      unsubscribeWSRelationshipDeleted?.();
    };
  }, [loadGraphData]);

  // Load data on mount
  useEffect(() => {
    loadGraphData();
  }, [loadGraphData]);

  // Filter management
  const updateFilters = useCallback((newFilters) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  }, []);

  const applyFilters = useCallback(() => {
    loadGraphData(filters);
  }, [filters, loadGraphData]);

  const clearFilters = useCallback(() => {
    const clearedFilters = {};
    setFilters(clearedFilters);
    loadGraphData(clearedFilters);
  }, [loadGraphData]);

  // Node selection
  const selectNode = useCallback((node) => {
    setSelectedNode(node);
    setSelectedEdge(null);
  }, []);

  const clearNodeSelection = useCallback(() => {
    setSelectedNode(null);
  }, []);

  // Edge selection
  const selectEdge = useCallback((edge) => {
    setSelectedEdge(edge);
    setSelectedNode(null);
  }, []);

  const clearEdgeSelection = useCallback(() => {
    setSelectedEdge(null);
  }, []);

  // Graph operations
  const refreshGraph = useCallback(() => {
    loadGraphData();
  }, [loadGraphData]);

  const exportGraph = useCallback(async (format = 'json') => {
    try {
      const data = await graphService.exportGraphData(format);
      return data;
    } catch (err) {
      console.error('[useGraph] Error exporting graph:', err);
      setError(err.message || 'Failed to export graph');
      throw err;
    }
  }, []);

  const clearGraph = useCallback(() => {
    graphService.clearCache();
  }, []);

  // Get filtered data
  const filteredData = useCallback(() => {
    if (!filters || Object.keys(filters).length === 0) {
      return { nodes, edges };
    }

    return graphService.filterGraphData(filters);
  }, [nodes, edges, filters]);

  // Get performance warnings
  const getPerformanceWarnings = useCallback(() => {
    const warnings = [];

    if (perfMetrics.nodeCount > PERFORMANCE.MAX_NODES * 0.8) {
      warnings.push(`High node count: ${perfMetrics.nodeCount} nodes`);
    }

    if (perfMetrics.edgeCount > PERFORMANCE.MAX_EDGES * 0.8) {
      warnings.push(`High edge count: ${perfMetrics.edgeCount} edges`);
    }

    if (perfMetrics.fps < PERFORMANCE.FPS_TARGET * 0.8) {
      warnings.push(`Low frame rate: ${perfMetrics.fps} FPS`);
    }

    if (perfMetrics.renderTime > 16) {
      warnings.push(`Slow render time: ${perfMetrics.renderTime}ms`);
    }

    return warnings;
  }, [perfMetrics]);

  // Memoized values for performance
  const memoizedData = {
    nodes,
    edges,
    selectedNode,
    selectedEdge,
    filters,
    loading,
    error,
    graphStats,
    lastUpdate,
    performance: perfMetrics,
    filteredData: filteredData(),
    performanceWarnings: getPerformanceWarnings(),
  };

  return {
    // Data
    ...memoizedData,

    // Actions
    loadGraphData,
    updateFilters,
    applyFilters,
    clearFilters,
    selectNode,
    clearNodeSelection,
    selectEdge,
    clearEdgeSelection,
    refreshGraph,
    exportGraph,
    clearGraph,

    // Computed values
    hasData: nodes.length > 0,
    hasSelection: selectedNode || selectedEdge,
    isPerformanceOptimized: perfMetrics.fps >= PERFORMANCE.FPS_TARGET,
  };
};
