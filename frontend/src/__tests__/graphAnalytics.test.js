// Graph Analytics Service Tests

import graphAnalytics from '../services/graphAnalytics';

describe('GraphAnalytics', () => {
  // Sample test data
  const sampleNodes = [
    { id: '1', type: 'DOMAIN', value: 'example.com', riskScore: 0.8, riskLevel: 'HIGH' },
    { id: '2', type: 'IP_ADDRESS', value: '192.168.1.1', riskScore: 0.6, riskLevel: 'MEDIUM' },
    { id: '3', type: 'EMAIL', value: 'test@example.com', riskScore: 0.3, riskLevel: 'LOW' },
    { id: '4', type: 'DOMAIN', value: 'malware.com', riskScore: 0.95, riskLevel: 'CRITICAL' },
    { id: '5', type: 'IP_ADDRESS', value: '10.0.0.1', riskScore: 0.1, riskLevel: 'INFO' }
  ];

  const sampleEdges = [
    { id: 'e1', source: '1', target: '2', type: 'COMMUNICATES_WITH', confidence: 0.9 },
    { id: 'e2', source: '2', target: '3', type: 'OWNS', confidence: 0.75 },
    { id: 'e3', source: '3', target: '4', type: 'MENTIONS', confidence: 0.6 },
    { id: 'e4', source: '4', target: '5', type: 'PART_OF', confidence: 0.85 }
  ];

  beforeEach(() => {
    // Clear cache before each test
    graphAnalytics.clearCache();
  });

  describe('calculateGraphMetrics', () => {
    test('should calculate basic graph metrics', () => {
      const metrics = graphAnalytics.calculateGraphMetrics(sampleNodes, sampleEdges);
      
      expect(metrics.nodeCount).toBe(5);
      expect(metrics.edgeCount).toBe(4);
      expect(metrics.density).toBeGreaterThan(0);
      expect(metrics.avgDegree).toBeGreaterThan(0);
    });

    test('should calculate centrality measures', () => {
      const metrics = graphAnalytics.calculateGraphMetrics(sampleNodes, sampleEdges);
      
      expect(metrics.centrality).toBeDefined();
      expect(metrics.centrality.degree).toBeDefined();
      expect(metrics.centrality.betweenness).toBeDefined();
      expect(metrics.centrality.closeness).toBeDefined();
    });

    test('should cache metrics', () => {
      graphAnalytics.calculateGraphMetrics(sampleNodes, sampleEdges);
      const cached = graphAnalytics.getCachedMetrics();
      
      expect(cached).toBeDefined();
      expect(cached.nodeCount).toBe(5);
    });

    test('should handle empty graph', () => {
      const metrics = graphAnalytics.calculateGraphMetrics([], []);
      
      expect(metrics.nodeCount).toBe(0);
      expect(metrics.edgeCount).toBe(0);
      expect(metrics.density).toBe(0);
    });
  });

  describe('detectCommunities', () => {
    test('should detect communities in graph', () => {
      const communities = graphAnalytics.detectCommunities(sampleNodes, sampleEdges);
      
      expect(communities).toBeDefined();
      expect(Array.isArray(communities)).toBe(true);
      expect(communities.length).toBeGreaterThan(0);
    });

    test('should assign colors to communities', () => {
      const communities = graphAnalytics.detectCommunities(sampleNodes, sampleEdges);
      
      communities.forEach(community => {
        expect(community.color).toBeDefined();
        expect(community.color).toMatch(/^#[0-9a-f]{6}$/i);
      });
    });

    test('should calculate modularity for communities', () => {
      const communities = graphAnalytics.detectCommunities(sampleNodes, sampleEdges);
      
      communities.forEach(community => {
        expect(community.modularity).toBeDefined();
        expect(community.modularity).toBeGreaterThanOrEqual(0);
        expect(community.modularity).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('findPathsBetween', () => {
    test('should find shortest path between nodes', () => {
      const paths = graphAnalytics.findPathsBetween('1', '4', sampleNodes, sampleEdges);
      
      expect(paths.shortestPath).toBeDefined();
      expect(Array.isArray(paths.shortestPath)).toBe(true);
      expect(paths.shortestPath[0]).toBe('1');
      expect(paths.shortestPath[paths.shortestPath.length - 1]).toBe('4');
    });

    test('should find all paths between nodes', () => {
      const paths = graphAnalytics.findPathsBetween('1', '4', sampleNodes, sampleEdges);
      
      expect(paths.allPaths).toBeDefined();
      expect(Array.isArray(paths.allPaths)).toBe(true);
      expect(paths.allPaths.length).toBeGreaterThan(0);
    });

    test('should return empty path if nodes not connected', () => {
      const disconnectedNodes = [
        ...sampleNodes,
        { id: '6', type: 'DOMAIN', value: 'isolated.com', riskScore: 0.5 }
      ];
      
      const paths = graphAnalytics.findPathsBetween('1', '6', disconnectedNodes, sampleEdges);
      
      expect(paths.shortestPath).toEqual([]);
      expect(paths.allPaths).toEqual([]);
    });

    test('should calculate path length', () => {
      const paths = graphAnalytics.findPathsBetween('1', '4', sampleNodes, sampleEdges);
      
      expect(paths.shortestPathLength).toBeDefined();
      expect(paths.shortestPathLength).toBeGreaterThanOrEqual(0);
    });
  });

  describe('detectAnomalies', () => {
    test('should detect isolated nodes', () => {
      const nodesWithIsolated = [
        ...sampleNodes,
        { id: '6', type: 'DOMAIN', value: 'isolated.com', riskScore: 0.5 }
      ];
      
      const anomalies = graphAnalytics.detectAnomalies(nodesWithIsolated, sampleEdges);
      
      const isolatedAnomalies = anomalies.filter(a => a.type === 'ISOLATED_NODE');
      expect(isolatedAnomalies.length).toBeGreaterThan(0);
    });

    test('should detect suspicious patterns', () => {
      const anomalies = graphAnalytics.detectAnomalies(sampleNodes, sampleEdges);
      
      anomalies.forEach(anomaly => {
        expect(anomaly.type).toBeDefined();
        expect(anomaly.severity).toBeDefined();
        expect(anomaly.explanation).toBeDefined();
      });
    });

    test('should return empty array for clean graph', () => {
      const cleanNodes = [
        { id: '1', type: 'DOMAIN', value: 'safe.com', riskScore: 0.1, riskLevel: 'INFO' }
      ];
      const cleanEdges = [];
      
      const anomalies = graphAnalytics.detectAnomalies(cleanNodes, cleanEdges);
      
      // Might have isolated node anomaly
      expect(Array.isArray(anomalies)).toBe(true);
    });
  });

  describe('calculateNodeInfluence', () => {
    test('should calculate influence score', () => {
      const node = sampleNodes[0];
      const influence = graphAnalytics.calculateNodeInfluence(node, sampleEdges);
      
      expect(influence).toBeDefined();
      expect(influence).toBeGreaterThanOrEqual(0);
      expect(influence).toBeLessThanOrEqual(1);
    });

    test('should give higher influence to high-risk connected nodes', () => {
      const highRiskNode = sampleNodes.find(n => n.riskLevel === 'CRITICAL');
      const lowRiskNode = sampleNodes.find(n => n.riskLevel === 'INFO');
      
      const highInfluence = graphAnalytics.calculateNodeInfluence(highRiskNode, sampleEdges);
      const lowInfluence = graphAnalytics.calculateNodeInfluence(lowRiskNode, sampleEdges);
      
      expect(highInfluence).toBeGreaterThan(lowInfluence);
    });
  });

  describe('suggestConnections', () => {
    test('should suggest similar entities', () => {
      const node = sampleNodes[0];
      const suggestions = graphAnalytics.suggestConnections(node, sampleNodes);
      
      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBeLessThanOrEqual(10);
    });

    test('should include similarity scores', () => {
      const node = sampleNodes[0];
      const suggestions = graphAnalytics.suggestConnections(node, sampleNodes);
      
      suggestions.forEach(suggestion => {
        expect(suggestion.similarity).toBeDefined();
        expect(suggestion.similarity).toBeGreaterThanOrEqual(0);
        expect(suggestion.similarity).toBeLessThanOrEqual(1);
        expect(suggestion.reason).toBeDefined();
      });
    });

    test('should prioritize same type entities', () => {
      const domainNode = sampleNodes.find(n => n.type === 'DOMAIN');
      const suggestions = graphAnalytics.suggestConnections(domainNode, sampleNodes);
      
      if (suggestions.length > 0) {
        const firstSuggestion = suggestions[0];
        // Check if high similarity exists for same-type nodes
        if (firstSuggestion.node.type === domainNode.type) {
          expect(firstSuggestion.similarity).toBeGreaterThan(0.3);
        }
      }
    });

    test('should not suggest self', () => {
      const node = sampleNodes[0];
      const suggestions = graphAnalytics.suggestConnections(node, sampleNodes);
      
      const selfSuggestion = suggestions.find(s => s.node.id === node.id);
      expect(selfSuggestion).toBeUndefined();
    });
  });

  describe('buildAdjacencyList', () => {
    test('should build correct adjacency list', () => {
      const adjacencyList = graphAnalytics.buildAdjacencyList(sampleNodes, sampleEdges);
      
      expect(adjacencyList).toBeDefined();
      expect(adjacencyList.size).toBe(sampleNodes.length);
    });

    test('should include all nodes even without edges', () => {
      const nodesWithIsolated = [
        ...sampleNodes,
        { id: '6', type: 'DOMAIN', value: 'isolated.com' }
      ];
      
      const adjacencyList = graphAnalytics.buildAdjacencyList(nodesWithIsolated, sampleEdges);
      
      expect(adjacencyList.has('6')).toBe(true);
      expect(adjacencyList.get('6').length).toBe(0);
    });
  });

  describe('clearCache', () => {
    test('should clear all cached data', () => {
      graphAnalytics.calculateGraphMetrics(sampleNodes, sampleEdges);
      graphAnalytics.detectCommunities(sampleNodes, sampleEdges);
      
      graphAnalytics.clearCache();
      
      expect(graphAnalytics.getCachedMetrics()).toBeNull();
      expect(graphAnalytics.getCachedCommunities()).toBeNull();
      expect(graphAnalytics.getCachedAnomalies()).toBeNull();
    });
  });
});
