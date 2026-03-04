// Main Graph Canvas Component using react-force-graph
import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { ForceGraph2D } from '../../vendor/forceGraph2D';
import { motion } from 'framer-motion';
import GraphNode from './GraphNode';
import GraphEdge from './GraphEdge';
import GraphControls from './GraphControls';

const GraphCanvas = ({
  nodes = [],
  edges = [],
  selectedNode = null,
  selectedEdge = null,
  onNodeSelect = () => {},
  onNodeHover = () => {},
  onEdgeSelect = () => {},
  onEdgeHover = () => {},
  filters = {},
  width = 800,
  height = 600,
  className = '',
  enableControls = true,
  enablePhysics = true,
  onGraphReady = () => {},
  ...props
}) => {
  const fgRef = useRef();
  const [graphReady, setGraphReady] = useState(false);
  const [simulationRunning, setSimulationRunning] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [showEdges, setShowEdges] = useState(true);
  const [highlightNodes, setHighlightNodes] = useState(new Set());
  const [highlightLinks, setHighlightLinks] = useState(new Set());
  const [hoverNode, setHoverNode] = useState(null);

  // Filtered data based on active filters
  const filteredData = useMemo(() => {
    let filteredNodes = [...nodes];
    let filteredEdges = [...edges];

    // Apply node type filters
    if (filters.nodeTypes?.length > 0) {
      filteredNodes = filteredNodes.filter(node => 
        filters.nodeTypes.includes(node.type)
      );
    }

    // Apply risk level filters
    if (filters.riskLevels?.length > 0) {
      filteredNodes = filteredNodes.filter(node => 
        filters.riskLevels.includes(node.riskLevel)
      );
    }

    // Apply confidence range filters
    if (filters.minConfidence !== undefined) {
      filteredNodes = filteredNodes.filter(node => 
        (node.confidence || 0) >= filters.minConfidence
      );
    }

    if (filters.maxConfidence !== undefined) {
      filteredNodes = filteredNodes.filter(node => 
        (node.confidence || 1) <= filters.maxConfidence
      );
    }

    // Filter edges by relationship types
    if (filters.relationshipTypes?.length > 0) {
      filteredEdges = filteredEdges.filter(edge => 
        filters.relationshipTypes.includes(edge.type)
      );
    }

    // Only include edges that connect to filtered nodes
    const nodeIds = new Set(filteredNodes.map((node) => node.id));
    const getEndpointId = (endpoint) =>
      endpoint && typeof endpoint === 'object' ? endpoint.id : endpoint;

    filteredEdges = filteredEdges.filter((edge) => {
      const sourceId = getEndpointId(edge.source);
      const targetId = getEndpointId(edge.target);
      return nodeIds.has(sourceId) && nodeIds.has(targetId);
    });

    return { nodes: filteredNodes, links: filteredEdges };
  }, [nodes, edges, filters]);

  // Handle graph ready
  const handleGraphReady = useCallback(() => {
    setGraphReady(true);

    if (!fgRef.current) return;

    onGraphReady(fgRef.current);

    // Initial zoom to fit
    if (filteredData.nodes.length > 0) {
      setTimeout(() => {
        fgRef.current?.zoomToFit?.(400, 50);
      }, 750);
    }
  }, [onGraphReady, filteredData.nodes.length]);

  // Node rendering
  const renderNode = useCallback((node, ctx, globalScale) => {
    if (!showLabels && !selectedNode && !hoverNode) {
      // Simple circle for better performance when no interaction needed
      const size = node.size || 8;
      ctx.beginPath();
      ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false);
      ctx.fillStyle = node.color || '#00ff41';
      ctx.fill();
      return;
    }

    return GraphNode({
      node,
      ctx,
      globalScale,
      showLabels,
      selectedNode,
      hoverNode,
      highlightNodes
    });
  }, [showLabels, selectedNode, hoverNode, highlightNodes]);

  // Edge rendering
  const renderLink = useCallback((link, ctx) => {
    if (!showEdges) return;
    
    return GraphEdge({ link, ctx, selectedEdge, highlightLinks });
  }, [showEdges, selectedEdge, highlightLinks]);

  // Node click handler
  const handleNodeClick = useCallback((node, event) => {
    event.stopPropagation();
    
    // Deselect if clicking the same node
    if (selectedNode?.id === node.id) {
      onNodeSelect(null);
    } else {
      onNodeSelect(node);
    }
    
    // Zoom to node
    if (fgRef.current && node) {
      const distance = 40;
      const distRatio = 1 + distance / Math.hypot(node.x, node.y);
      
      fgRef.current.centerAt(node.x, node.y, 1000);
      fgRef.current.zoom(
        fgRef.current.zoom() * distRatio, 
        1000
      );
    }
  }, [selectedNode, onNodeSelect]);

  // Node hover handler
  const handleNodeHover = useCallback((node) => {
    setHoverNode(node);
    onNodeHover(node);
    
    // Highlight connected nodes and links
    if (node) {
      const connectedNodes = new Set([node.id]);
      const connectedLinks = new Set();
      
      filteredData.links.forEach(link => {
        if (link.source === node.id || link.source.id === node.id) {
          connectedNodes.add(link.target);
          connectedNodes.add(link.target.id);
          connectedLinks.add(link);
        }
        if (link.target === node.id || link.target.id === node.id) {
          connectedNodes.add(link.source);
          connectedNodes.add(link.source.id);
          connectedLinks.add(link);
        }
      });
      
      setHighlightNodes(connectedNodes);
      setHighlightLinks(connectedLinks);
    } else {
      setHighlightNodes(new Set());
      setHighlightLinks(new Set());
    }
  }, [filteredData.links, onNodeHover]);

  // Edge click handler
  const handleLinkClick = useCallback((link, event) => {
    event.stopPropagation();
    
    // Deselect if clicking the same edge
    if (selectedEdge?.id === link.id) {
      onEdgeSelect(null);
    } else {
      onEdgeSelect(link);
    }
  }, [selectedEdge, onEdgeSelect]);

  // Edge hover handler
  const handleLinkHover = useCallback((link) => {
    onEdgeHover(link);
  }, [onEdgeHover]);

  // Background click handler
  const handleBackgroundClick = useCallback(() => {
    onNodeSelect(null);
    onEdgeSelect(null);
  }, [onNodeSelect, onEdgeSelect]);

  // Graph controls
  const handleZoomIn = useCallback(() => {
    if (fgRef.current) {
      fgRef.current.zoom(fgRef.current.zoom() * 1.2, 400);
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    if (fgRef.current) {
      fgRef.current.zoom(fgRef.current.zoom() / 1.2, 400);
    }
  }, []);

  const handleFitToScreen = useCallback(() => {
    if (fgRef.current) {
      fgRef.current.zoomToFit(400, 50);
    }
  }, []);

  const handleCenterGraph = useCallback(() => {
    if (fgRef.current) {
      fgRef.current.centerAt(0, 0, 1000);
    }
  }, []);

  const toggleSimulation = useCallback(() => {
    if (fgRef.current) {
      const newState = !simulationRunning;
      setSimulationRunning(newState);
      fgRef.current.d3Force('charge').strength(newState ? -300 : 0);
    }
  }, [simulationRunning]);

  const toggleLabels = useCallback(() => {
    setShowLabels(!showLabels);
  }, [showLabels]);

  const toggleEdges = useCallback(() => {
    setShowEdges(!showEdges);
  }, [showEdges]);

  const exportGraph = useCallback(() => {
    const canvas = fgRef.current?.canvas?.();
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `reconvault-graph-${new Date().toISOString().split('T')[0]}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, []);

  // Force simulation configuration
  const d3ForceConfig = useMemo(() => ({
    link: {
      distance: 80,
      strength: 0.1
    },
    charge: {
      strength: enablePhysics ? -300 : 0
    },
    center: {
      strength: 0.1
    },
    collision: {
      radius: 20
    }
  }), [enablePhysics]);

  useEffect(() => {
    if (!graphReady || !fgRef.current) return;

    const { link, charge, collision } = d3ForceConfig;

    const linkForce = fgRef.current.d3Force?.('link');
    if (linkForce) {
      if (linkForce.distance instanceof Function && link?.distance !== undefined) {
        linkForce.distance(link.distance);
      }
      if (linkForce.strength instanceof Function && link?.strength !== undefined) {
        linkForce.strength(link.strength);
      }
    }

    const chargeForce = fgRef.current.d3Force?.('charge');
    if (chargeForce?.strength instanceof Function && charge?.strength !== undefined) {
      chargeForce.strength(charge.strength);
    }

    const collideForce = fgRef.current.d3Force?.('collide');
    if (collideForce?.radius instanceof Function && collision?.radius !== undefined) {
      collideForce.radius(collision.radius);
    }

    fgRef.current.d3ReheatSimulation?.();
  }, [graphReady, d3ForceConfig]);

  return (
    <div className={`relative bg-cyber-black ${className}`}>
      {/* Graph Canvas */}
      <ForceGraph2D
        ref={fgRef}
        graphData={{ nodes: filteredData.nodes, links: filteredData.links }}
        width={width}
        height={height}
        nodeCanvasObject={renderNode}
        linkCanvasObject={renderLink}
        onNodeClick={handleNodeClick}
        onNodeHover={handleNodeHover}
        onLinkHover={handleLinkHover}
        onLinkClick={handleLinkClick}
        onBackgroundClick={handleBackgroundClick}
        onEngineStop={handleGraphReady}
        nodeRelSize={4}
        linkColor={() => '#3a3f5a'}
        linkWidth={1}
        linkDirectionalParticles={2}
        linkDirectionalParticleWidth={2}
        backgroundColor="#0a0e27"
        enableNodeDrag={true}
        enableZoomInteraction={true}
        enablePanInteraction={true}
        cooldownTicks={100}
        {...props}
      />

      {/* Loading Overlay */}
      {!graphReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-cyber-black bg-opacity-80">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <div className="loading-spinner mb-4" />
            <p className="text-neon-green font-mono">Initializing graph...</p>
          </motion.div>
        </div>
      )}

      {/* Graph Controls */}
      {enableControls && graphReady && (
        <GraphControls
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onFitToScreen={handleFitToScreen}
          onCenterGraph={handleCenterGraph}
          onToggleSimulation={toggleSimulation}
          onToggleLabels={toggleLabels}
          onToggleEdges={toggleEdges}
          onExport={exportGraph}
          simulationRunning={simulationRunning}
          showLabels={showLabels}
          showEdges={showEdges}
        />
      )}

      {/* Performance Info */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute bottom-4 left-4 bg-cyber-dark bg-opacity-90 p-2 rounded text-xs font-mono text-cyber-gray">
          <div>Nodes: {filteredData.nodes.length}</div>
          <div>Edges: {filteredData.links.length}</div>
          <div>Simulation: {simulationRunning ? 'Running' : 'Paused'}</div>
        </div>
      )}
    </div>
  );
};

export default GraphCanvas;