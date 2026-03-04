// Advanced Graph Analytics Service
// Provides community detection, centrality analysis, pathfinding, and anomaly detection

class GraphAnalytics {
  constructor() {
    this.cache = {
      metrics: null,
      communities: null,
      centrality: new Map(),
      paths: new Map(),
      anomalies: null,
      lastUpdate: null
    };
  }

  /**
   * Calculate comprehensive graph metrics
   * @param {Array} nodes - Array of graph nodes
   * @param {Array} edges - Array of graph edges
   * @returns {Object} - Comprehensive metrics object
   */
  calculateGraphMetrics(nodes, edges) {
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const adjacencyList = this.buildAdjacencyList(nodes, edges);
    
    const metrics = {
      nodeCount: nodes.length,
      edgeCount: edges.length,
      density: this.calculateGraphDensity(nodes, edges),
      avgDegree: this.calculateAverageDegree(adjacencyList),
      diameter: this.calculateGraphDiameter(nodes, adjacencyList),
      avgShortestPath: this.calculateAverageShortestPath(nodes, adjacencyList),
      clusteringCoefficient: this.calculateClusteringCoefficient(nodes, adjacencyList),
      centrality: {
        degree: this.calculateDegreeCentrality(nodes, adjacencyList),
        betweenness: this.calculateBetweennessCentrality(nodes, adjacencyList),
        closeness: this.calculateClosenessCentrality(nodes, adjacencyList)
      },
      components: this.findConnectedComponents(nodes, adjacencyList),
      timestamp: new Date().toISOString()
    };

    this.cache.metrics = metrics;
    this.cache.lastUpdate = new Date();
    
    return metrics;
  }

  /**
   * Build adjacency list from nodes and edges
   */
  buildAdjacencyList(nodes, edges) {
    const adjacency = new Map();
    
    // Initialize with all nodes
    nodes.forEach(node => {
      adjacency.set(node.id, []);
    });
    
    // Add edges
    edges.forEach(edge => {
      if (adjacency.has(edge.source)) {
        adjacency.get(edge.source).push({
          target: edge.target,
          weight: edge.confidence || 1,
          edge
        });
      }
      
      // Add reverse for undirected graph analysis
      if (adjacency.has(edge.target)) {
        adjacency.get(edge.target).push({
          target: edge.source,
          weight: edge.confidence || 1,
          edge
        });
      }
    });
    
    return adjacency;
  }

  /**
   * Calculate graph density (actual edges / possible edges)
   */
  calculateGraphDensity(nodes, edges) {
    const n = nodes.length;
    if (n <= 1) return 0;
    
    const maxEdges = n * (n - 1);
    return edges.length / maxEdges;
  }

  /**
   * Calculate average degree (connections per node)
   */
  calculateAverageDegree(adjacencyList) {
    let totalDegree = 0;
    adjacencyList.forEach(neighbors => {
      totalDegree += neighbors.length;
    });
    
    return adjacencyList.size > 0 ? totalDegree / adjacencyList.size : 0;
  }

  /**
   * Calculate graph diameter (longest shortest path)
   */
  calculateGraphDiameter(nodes, adjacencyList) {
    let diameter = 0;
    
    nodes.forEach(node => {
      const distances = this.bfs(node.id, adjacencyList);
      const maxDistance = Math.max(...Array.from(distances.values()).filter(d => d !== Infinity));
      
      if (maxDistance !== -Infinity) {
        diameter = Math.max(diameter, maxDistance);
      }
    });
    
    return diameter;
  }

  /**
   * Calculate average shortest path length
   */
  calculateAverageShortestPath(nodes, adjacencyList) {
    let totalPath = 0;
    let pathCount = 0;
    
    nodes.forEach(node => {
      const distances = this.bfs(node.id, adjacencyList);
      distances.forEach((distance, targetId) => {
        if (distance !== Infinity && distance > 0) {
          totalPath += distance;
          pathCount++;
        }
      });
    });
    
    return pathCount > 0 ? totalPath / pathCount : 0;
  }

  /**
   * BFS for shortest path calculation
   */
  bfs(startId, adjacencyList) {
    const distances = new Map();
    const queue = [startId];
    
    adjacencyList.forEach((_, nodeId) => {
      distances.set(nodeId, Infinity);
    });
    
    distances.set(startId, 0);
    
    while (queue.length > 0) {
      const currentId = queue.shift();
      const currentDistance = distances.get(currentId);
      
      const neighbors = adjacencyList.get(currentId) || [];
      neighbors.forEach(({ target }) => {
        if (distances.get(target) === Infinity) {
          distances.set(target, currentDistance + 1);
          queue.push(target);
        }
      });
    }
    
    return distances;
  }

  /**
   * Calculate clustering coefficient (how connected neighbors are)
   */
  calculateClusteringCoefficient(nodes, adjacencyList) {
    let totalCoefficient = 0;
    let nodeCount = 0;
    
    nodes.forEach(node => {
      const neighbors = adjacencyList.get(node.id) || [];
      if (neighbors.length < 2) return;
      
      const neighborIds = new Set(neighbors.map(n => n.target));
      let edgesBetweenNeighbors = 0;
      
      neighbors.forEach(({ target }) => {
        const targetNeighbors = adjacencyList.get(target) || [];
        targetNeighbors.forEach(({ target: t }) => {
          if (neighborIds.has(t)) {
            edgesBetweenNeighbors++;
          }
        });
      });
      
      const k = neighbors.length;
      const possibleEdges = k * (k - 1);
      
      if (possibleEdges > 0) {
        totalCoefficient += edgesBetweenNeighbors / possibleEdges;
        nodeCount++;
      }
    });
    
    return nodeCount > 0 ? totalCoefficient / nodeCount : 0;
  }

  /**
   * Calculate degree centrality for all nodes
   */
  calculateDegreeCentrality(nodes, adjacencyList) {
    const centrality = {};
    const n = nodes.length;
    
    nodes.forEach(node => {
      const degree = (adjacencyList.get(node.id) || []).length;
      centrality[node.id] = n > 1 ? degree / (n - 1) : 0;
    });
    
    return centrality;
  }

  /**
   * Calculate betweenness centrality (how often node is on shortest paths)
   */
  calculateBetweennessCentrality(nodes, adjacencyList) {
    const betweenness = {};
    nodes.forEach(node => {
      betweenness[node.id] = 0;
    });
    
    nodes.forEach(source => {
      const stack = [];
      const paths = new Map();
      const sigma = new Map();
      const distance = new Map();
      const delta = new Map();
      
      nodes.forEach(node => {
        paths.set(node.id, []);
        sigma.set(node.id, 0);
        distance.set(node.id, -1);
        delta.set(node.id, 0);
      });
      
      sigma.set(source.id, 1);
      distance.set(source.id, 0);
      
      const queue = [source.id];
      
      while (queue.length > 0) {
        const v = queue.shift();
        stack.push(v);
        
        const neighbors = adjacencyList.get(v) || [];
        neighbors.forEach(({ target: w }) => {
          if (distance.get(w) < 0) {
            queue.push(w);
            distance.set(w, distance.get(v) + 1);
          }
          
          if (distance.get(w) === distance.get(v) + 1) {
            sigma.set(w, sigma.get(w) + sigma.get(v));
            paths.get(w).push(v);
          }
        });
      }
      
      while (stack.length > 0) {
        const w = stack.pop();
        paths.get(w).forEach(v => {
          delta.set(v, delta.get(v) + (sigma.get(v) / sigma.get(w)) * (1 + delta.get(w)));
        });
        
        if (w !== source.id) {
          betweenness[w] += delta.get(w);
        }
      }
    });
    
    // Normalize
    const n = nodes.length;
    const normalizationFactor = n > 2 ? 1 / ((n - 1) * (n - 2)) : 1;
    
    Object.keys(betweenness).forEach(nodeId => {
      betweenness[nodeId] *= normalizationFactor;
    });
    
    return betweenness;
  }

  /**
   * Calculate closeness centrality (inverse of average distance to all nodes)
   */
  calculateClosenessCentrality(nodes, adjacencyList) {
    const closeness = {};
    
    nodes.forEach(node => {
      const distances = this.bfs(node.id, adjacencyList);
      let totalDistance = 0;
      let reachableNodes = 0;
      
      distances.forEach((distance, targetId) => {
        if (distance !== Infinity && distance > 0) {
          totalDistance += distance;
          reachableNodes++;
        }
      });
      
      closeness[node.id] = reachableNodes > 0 ? reachableNodes / totalDistance : 0;
    });
    
    return closeness;
  }

  /**
   * Find connected components in the graph
   */
  findConnectedComponents(nodes, adjacencyList) {
    const visited = new Set();
    const components = [];
    
    nodes.forEach(node => {
      if (!visited.has(node.id)) {
        const component = [];
        const queue = [node.id];
        
        while (queue.length > 0) {
          const currentId = queue.shift();
          
          if (!visited.has(currentId)) {
            visited.add(currentId);
            component.push(currentId);
            
            const neighbors = adjacencyList.get(currentId) || [];
            neighbors.forEach(({ target }) => {
              if (!visited.has(target)) {
                queue.push(target);
              }
            });
          }
        }
        
        components.push(component);
      }
    });
    
    return components;
  }

  /**
   * Detect communities using Louvain-like algorithm
   * @param {Array} nodes - Array of graph nodes
   * @param {Array} edges - Array of graph edges
   * @returns {Array} - Array of communities with assigned colors
   */
  detectCommunities(nodes, edges) {
    const adjacencyList = this.buildAdjacencyList(nodes, edges);
    
    // Initialize: each node in its own community
    const communityMap = new Map();
    nodes.forEach((node, idx) => {
      communityMap.set(node.id, idx);
    });
    
    let improved = true;
    let iterations = 0;
    const maxIterations = 100;
    
    // Iterative optimization
    while (improved && iterations < maxIterations) {
      improved = false;
      iterations++;
      
      nodes.forEach(node => {
        const currentCommunity = communityMap.get(node.id);
        const neighborCommunities = new Map();
        
        // Count connections to each community
        const neighbors = adjacencyList.get(node.id) || [];
        neighbors.forEach(({ target, weight }) => {
          const targetCommunity = communityMap.get(target);
          neighborCommunities.set(
            targetCommunity,
            (neighborCommunities.get(targetCommunity) || 0) + weight
          );
        });
        
        // Find best community
        let bestCommunity = currentCommunity;
        let bestWeight = neighborCommunities.get(currentCommunity) || 0;
        
        neighborCommunities.forEach((weight, community) => {
          if (weight > bestWeight) {
            bestWeight = weight;
            bestCommunity = community;
          }
        });
        
        // Move to best community if different
        if (bestCommunity !== currentCommunity) {
          communityMap.set(node.id, bestCommunity);
          improved = true;
        }
      });
    }
    
    // Group nodes by community
    const communities = new Map();
    communityMap.forEach((communityId, nodeId) => {
      if (!communities.has(communityId)) {
        communities.set(communityId, []);
      }
      communities.get(communityId).push(nodeId);
    });
    
    // Assign colors to communities
    const colors = [
      '#ff0033', '#00ff41', '#00d9ff', '#ff006e', '#8f00ff',
      '#ffaa00', '#ff6600', '#00dd00', '#00aaff', '#ff3366'
    ];
    
    const result = Array.from(communities.entries()).map(([id, members], idx) => ({
      id,
      members,
      size: members.length,
      color: colors[idx % colors.length],
      modularity: this.calculateModularity(members, adjacencyList, communityMap)
    }));
    
    this.cache.communities = result;
    
    return result;
  }

  /**
   * Calculate modularity score for a community
   */
  calculateModularity(members, adjacencyList, communityMap) {
    const memberSet = new Set(members);
    let internalEdges = 0;
    let externalEdges = 0;
    
    members.forEach(nodeId => {
      const neighbors = adjacencyList.get(nodeId) || [];
      neighbors.forEach(({ target }) => {
        if (memberSet.has(target)) {
          internalEdges++;
        } else {
          externalEdges++;
        }
      });
    });
    
    const totalEdges = internalEdges + externalEdges;
    return totalEdges > 0 ? internalEdges / totalEdges : 0;
  }

  /**
   * Find all paths between two nodes
   * @param {String} sourceId - Source node ID
   * @param {String} targetId - Target node ID
   * @param {Array} nodes - Array of nodes
   * @param {Array} edges - Array of edges
   * @returns {Object} - Paths information with shortest and all paths
   */
  findPathsBetween(sourceId, targetId, nodes, edges) {
    const adjacencyList = this.buildAdjacencyList(nodes, edges);
    
    // Find shortest path using BFS
    const shortestPath = this.findShortestPath(sourceId, targetId, adjacencyList);
    
    // Find all paths using DFS (limited to avoid explosion)
    const allPaths = this.findAllPaths(sourceId, targetId, adjacencyList, 10);
    
    return {
      source: sourceId,
      target: targetId,
      shortestPath,
      shortestPathLength: shortestPath.length - 1,
      allPaths,
      pathCount: allPaths.length,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Find shortest path using BFS
   */
  findShortestPath(sourceId, targetId, adjacencyList) {
    const queue = [[sourceId]];
    const visited = new Set([sourceId]);
    
    while (queue.length > 0) {
      const path = queue.shift();
      const current = path[path.length - 1];
      
      if (current === targetId) {
        return path;
      }
      
      const neighbors = adjacencyList.get(current) || [];
      neighbors.forEach(({ target }) => {
        if (!visited.has(target)) {
          visited.add(target);
          queue.push([...path, target]);
        }
      });
    }
    
    return []; // No path found
  }

  /**
   * Find all paths using DFS (limited)
   */
  findAllPaths(sourceId, targetId, adjacencyList, maxPaths = 10) {
    const paths = [];
    const visited = new Set();
    
    const dfs = (currentId, path) => {
      if (paths.length >= maxPaths) return;
      
      if (currentId === targetId) {
        paths.push([...path]);
        return;
      }
      
      visited.add(currentId);
      
      const neighbors = adjacencyList.get(currentId) || [];
      neighbors.forEach(({ target }) => {
        if (!visited.has(target)) {
          dfs(target, [...path, target]);
        }
      });
      
      visited.delete(currentId);
    };
    
    dfs(sourceId, [sourceId]);
    
    return paths;
  }

  /**
   * Detect anomalies in the graph
   * @param {Array} nodes - Array of nodes
   * @param {Array} edges - Array of edges
   * @returns {Array} - Array of anomalies with explanations
   */
  detectAnomalies(nodes, edges) {
    const adjacencyList = this.buildAdjacencyList(nodes, edges);
    const anomalies = [];
    
    // Detect isolated nodes (no connections)
    const isolatedNodes = nodes.filter(node => {
      const connections = adjacencyList.get(node.id) || [];
      return connections.length === 0;
    });
    
    isolatedNodes.forEach(node => {
      anomalies.push({
        type: 'ISOLATED_NODE',
        nodeId: node.id,
        severity: 'MEDIUM',
        explanation: `Node "${node.value || node.id}" has no connections`,
        node
      });
    });
    
    // Detect bridge nodes (articulation points)
    const bridgeNodes = this.findBridgeNodes(nodes, adjacencyList);
    bridgeNodes.forEach(node => {
      anomalies.push({
        type: 'BRIDGE_NODE',
        nodeId: node.id,
        severity: 'HIGH',
        explanation: `Node "${node.value || node.id}" is a critical connection point`,
        node
      });
    });
    
    // Detect high-degree hubs (unusually connected)
    const avgDegree = this.calculateAverageDegree(adjacencyList);
    const threshold = avgDegree * 3;
    
    const hubNodes = nodes.filter(node => {
      const connections = adjacencyList.get(node.id) || [];
      return connections.length > threshold;
    });
    
    hubNodes.forEach(node => {
      anomalies.push({
        type: 'HUB_NODE',
        nodeId: node.id,
        severity: 'INFO',
        explanation: `Node "${node.value || node.id}" is a highly connected hub (${(adjacencyList.get(node.id) || []).length} connections)`,
        node
      });
    });
    
    // Detect suspicious patterns (high-risk nodes with many connections)
    const suspiciousNodes = nodes.filter(node => {
      const isHighRisk = node.riskLevel === 'CRITICAL' || node.riskLevel === 'HIGH';
      const connections = adjacencyList.get(node.id) || [];
      return isHighRisk && connections.length > 5;
    });
    
    suspiciousNodes.forEach(node => {
      anomalies.push({
        type: 'SUSPICIOUS_PATTERN',
        nodeId: node.id,
        severity: 'CRITICAL',
        explanation: `High-risk node "${node.value || node.id}" with ${(adjacencyList.get(node.id) || []).length} connections may indicate active threat`,
        node
      });
    });
    
    this.cache.anomalies = anomalies;
    
    return anomalies;
  }

  /**
   * Find bridge nodes (articulation points)
   */
  findBridgeNodes(nodes, adjacencyList) {
    const bridges = [];
    const visited = new Set();
    const disc = new Map();
    const low = new Map();
    const parent = new Map();
    let time = 0;
    
    const dfs = (u) => {
      visited.add(u);
      disc.set(u, time);
      low.set(u, time);
      time++;
      
      let children = 0;
      const neighbors = adjacencyList.get(u) || [];
      
      neighbors.forEach(({ target: v }) => {
        if (!visited.has(v)) {
          children++;
          parent.set(v, u);
          dfs(v);
          
          low.set(u, Math.min(low.get(u), low.get(v)));
          
          // u is articulation point if:
          // 1. u is root and has 2+ children, or
          // 2. u is not root and low[v] >= disc[u]
          if (!parent.has(u) && children > 1) {
            const node = nodes.find(n => n.id === u);
            if (node && !bridges.find(b => b.id === u)) {
              bridges.push(node);
            }
          } else if (parent.has(u) && low.get(v) >= disc.get(u)) {
            const node = nodes.find(n => n.id === u);
            if (node && !bridges.find(b => b.id === u)) {
              bridges.push(node);
            }
          }
        } else if (v !== parent.get(u)) {
          low.set(u, Math.min(low.get(u), disc.get(v)));
        }
      });
    };
    
    nodes.forEach(node => {
      if (!visited.has(node.id)) {
        parent.set(node.id, null);
        dfs(node.id);
      }
    });
    
    return bridges;
  }

  /**
   * Calculate node influence score
   * @param {Object} node - Node to analyze
   * @param {Array} edges - Array of edges
   * @returns {Number} - Influence score (0-1)
   */
  calculateNodeInfluence(node, edges) {
    // Count direct dependencies
    const outgoingEdges = edges.filter(e => e.source === node.id);
    const incomingEdges = edges.filter(e => e.target === node.id);
    
    // Calculate propagation score
    const outgoingWeight = outgoingEdges.reduce((sum, e) => sum + (e.confidence || 0.5), 0);
    const incomingWeight = incomingEdges.reduce((sum, e) => sum + (e.confidence || 0.5), 0);
    
    // Combine factors
    const connectionScore = (outgoingEdges.length + incomingEdges.length) / 20; // Normalize to 0-1
    const weightScore = (outgoingWeight + incomingWeight) / 10; // Normalize
    const riskScore = node.riskScore || 0.5;
    
    // Weighted average
    const influence = (connectionScore * 0.4 + weightScore * 0.3 + riskScore * 0.3);
    
    return Math.min(1, Math.max(0, influence));
  }

  /**
   * Suggest potential connections based on similarity
   * @param {Object} node - Node to find suggestions for
   * @param {Array} allNodes - All nodes in the graph
   * @returns {Array} - Array of suggested entities with similarity scores
   */
  suggestConnections(node, allNodes) {
    const suggestions = [];
    
    allNodes.forEach(otherNode => {
      if (otherNode.id === node.id) return;
      
      let similarityScore = 0;
      
      // Same type
      if (node.type === otherNode.type) {
        similarityScore += 0.3;
      }
      
      // Similar risk level
      if (node.riskLevel === otherNode.riskLevel) {
        similarityScore += 0.2;
      }
      
      // Similar source
      if (node.source === otherNode.source) {
        similarityScore += 0.2;
      }
      
      // Similar metadata tags
      const nodeTags = new Set(Object.keys(node.metadata || {}));
      const otherTags = new Set(Object.keys(otherNode.metadata || {}));
      const commonTags = new Set([...nodeTags].filter(t => otherTags.has(t)));
      
      if (nodeTags.size > 0 || otherTags.size > 0) {
        const tagSimilarity = commonTags.size / Math.max(nodeTags.size, otherTags.size);
        similarityScore += tagSimilarity * 0.3;
      }
      
      // Only suggest if similarity is above threshold
      if (similarityScore > 0.4) {
        suggestions.push({
          node: otherNode,
          similarity: similarityScore,
          reason: this.getSuggestionReason(node, otherNode, similarityScore)
        });
      }
    });
    
    // Sort by similarity and return top 10
    return suggestions
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 10);
  }

  /**
   * Get human-readable reason for suggestion
   */
  getSuggestionReason(node, otherNode, score) {
    const reasons = [];
    
    if (node.type === otherNode.type) {
      reasons.push('same type');
    }
    if (node.riskLevel === otherNode.riskLevel) {
      reasons.push('similar risk level');
    }
    if (node.source === otherNode.source) {
      reasons.push('same source');
    }
    
    return reasons.length > 0 
      ? `Similar: ${reasons.join(', ')}` 
      : 'Potentially related';
  }

  /**
   * Clear analytics cache
   */
  clearCache() {
    this.cache.metrics = null;
    this.cache.communities = null;
    this.cache.centrality.clear();
    this.cache.paths.clear();
    this.cache.anomalies = null;
    this.cache.lastUpdate = null;
  }

  /**
   * Get cached metrics
   */
  getCachedMetrics() {
    return this.cache.metrics;
  }

  /**
   * Get cached communities
   */
  getCachedCommunities() {
    return this.cache.communities;
  }

  /**
   * Get cached anomalies
   */
  getCachedAnomalies() {
    return this.cache.anomalies;
  }
}

// Create singleton instance
const graphAnalytics = new GraphAnalytics();

export default graphAnalytics;
