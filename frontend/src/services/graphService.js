// Graph data service operations
import { graphAPI, entityAPI, relationshipAPI } from './api';
import { getRiskLevelFromScore, calculateRiskScore } from '../utils/riskLevelUtils';

class GraphService {
  constructor() {
    this.cache = {
      nodes: new Map(),
      edges: new Map(),
      graphStats: null,
      lastUpdate: null
    };
    this.listeners = new Map();
  }

  getEndpointId(endpoint) {
    if (endpoint && typeof endpoint === 'object') return endpoint.id;
    return endpoint;
  }

  // Graph Data Management
  async loadGraphData(filters = {}) {
    try {
      console.log('[GraphService] Loading graph data with filters:', filters);
      
      const data = await graphAPI.getGraph(filters);
      
      // Process and cache the data
      const processedData = this.processGraphData(data);
      
      this.cache.nodes.clear();
      this.cache.edges.clear();
      
      processedData.nodes.forEach(node => {
        this.cache.nodes.set(node.id, node);
      });
      
      processedData.edges.forEach(edge => {
        this.cache.edges.set(edge.id, edge);
      });
      
      this.cache.lastUpdate = new Date();
      
      // Emit data loaded event
      this.emit('graph_data_loaded', processedData);
      
      return processedData;
      
    } catch (error) {
      console.error('[GraphService] Error loading graph data:', error);
      throw error;
    }
  }

  // Process raw graph data into usable format
  processGraphData(data) {
    const nodes = (data.nodes || []).map(node => ({
      ...node,
      riskScore: node.risk_score || node.riskScore || 0.5,
      riskLevel: getRiskLevelFromScore(node.risk_score || node.riskScore || 0.5),
      connections: 0, // Will be calculated
      size: this.calculateNodeSize(node),
      color: this.getNodeColor(node)
    }));
    
    const edges = (data.edges || []).map(edge => ({
      ...edge,
      thickness: this.calculateEdgeThickness(edge),
      color: this.getEdgeColor(edge)
    }));
    
    // Calculate connection counts for nodes
    this.calculateNodeConnections(nodes, edges);
    
    return { nodes, edges, metadata: data.metadata || {} };
  }

  // Calculate node size based on connections and importance
  calculateNodeSize(node) {
    const baseSize = 8;
    const connectionMultiplier = 2;
    const riskMultiplier = 3;
    
    const connectionSize = Math.min(node.connections * connectionMultiplier, 15);
    const riskSize = (node.riskScore || 0.5) * riskMultiplier;
    
    return Math.min(baseSize + connectionSize + riskSize, 25);
  }

  // Calculate edge thickness based on confidence
  calculateEdgeThickness(edge) {
    const confidence = edge.confidence || 0.5;
    return Math.max(1, Math.min(5, confidence * 5));
  }

  // Get node color based on risk level
  getNodeColor(node) {
    const riskColors = {
      'CRITICAL': '#ff0033',
      'HIGH': '#ff6600', 
      'MEDIUM': '#ffaa00',
      'LOW': '#00dd00',
      'INFO': '#00d9ff'
    };
    
    return riskColors[node.riskLevel] || riskColors.INFO;
  }

  // Get edge color based on relationship type
  getEdgeColor(edge) {
    const relationshipColors = {
      'RELATED_TO': '#888888',
      'MENTIONS': '#00d9ff',
      'OWNS': '#ff006e',
      'OPERATES': '#00ff41',
      'COMMUNICATES_WITH': '#8f00ff',
      'LOCATED_AT': '#ffaa00',
      'PART_OF': '#ff6600',
      'SUBSIDIARY_OF': '#00d9ff',
      'DEPENDS_ON': '#ff0033',
      'PROVIDES': '#00ff41'
    };
    
    return relationshipColors[edge.type] || relationshipColors.RELATED_TO;
  }

  // Calculate connections for each node
  calculateNodeConnections(nodes, edges) {
    const connectionMap = new Map();
    
    // Initialize connection counts
    nodes.forEach(node => {
      connectionMap.set(node.id, 0);
    });
    
    // Count connections
    edges.forEach(edge => {
      const sourceId = this.getEndpointId(edge.source);
      const targetId = this.getEndpointId(edge.target);

      if (!sourceId || !targetId) return;

      const sourceCount = connectionMap.get(sourceId) || 0;
      const targetCount = connectionMap.get(targetId) || 0;

      connectionMap.set(sourceId, sourceCount + 1);
      connectionMap.set(targetId, targetCount + 1);
    });
    
    // Update nodes with connection counts
    nodes.forEach(node => {
      node.connections = connectionMap.get(node.id) || 0;
      node.size = this.calculateNodeSize(node);
    });
  }

  // Get cached graph data
  getCachedGraphData() {
    return {
      nodes: Array.from(this.cache.nodes.values()),
      edges: Array.from(this.cache.edges.values()),
      lastUpdate: this.cache.lastUpdate
    };
  }

  // Get graph statistics
  async getGraphStatistics() {
    try {
      const stats = await graphAPI.getGraphStats();
      this.cache.graphStats = stats;
      return stats;
    } catch (error) {
      console.error('[GraphService] Error getting graph statistics:', error);
      // Fallback to cached data
      return this.calculateGraphStatsFromCache();
    }
  }

  // Calculate statistics from cached data
  calculateGraphStatsFromCache() {
    const nodes = Array.from(this.cache.nodes.values());
    const edges = Array.from(this.cache.edges.values());
    
    const stats = {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      nodeTypes: {},
      riskLevels: {},
      avgConnections: 0,
      graphDensity: 0,
      lastUpdated: this.cache.lastUpdate
    };
    
    // Count node types
    nodes.forEach(node => {
      const type = node.type || 'UNKNOWN';
      stats.nodeTypes[type] = (stats.nodeTypes[type] || 0) + 1;
      
      const riskLevel = node.riskLevel || 'INFO';
      stats.riskLevels[riskLevel] = (stats.riskLevels[riskLevel] || 0) + 1;
    });
    
    // Calculate average connections
    const totalConnections = nodes.reduce((sum, node) => sum + (node.connections || 0), 0);
    stats.avgConnections = nodes.length > 0 ? totalConnections / nodes.length : 0;
    
    // Calculate graph density
    const maxPossibleEdges = nodes.length > 1 ? nodes.length * (nodes.length - 1) : 0;
    stats.graphDensity = maxPossibleEdges > 0 ? edges.length / maxPossibleEdges : 0;
    
    return stats;
  }

  // Entity Operations
  async createEntity(entityData) {
    try {
      const entity = await entityAPI.createEntity(entityData);
      
      // Add to cache
      const processedEntity = this.processEntity(entity);
      this.cache.nodes.set(processedEntity.id, processedEntity);
      
      // Emit entity created event
      this.emit('entity_created', processedEntity);
      
      return processedEntity;
    } catch (error) {
      console.error('[GraphService] Error creating entity:', error);
      throw error;
    }
  }

  // Update entity
  async updateEntity(id, entityData) {
    try {
      const entity = await entityAPI.updateEntity(id, entityData);
      
      // Update in cache
      const processedEntity = this.processEntity(entity);
      this.cache.nodes.set(id, processedEntity);
      
      // Emit entity updated event
      this.emit('entity_updated', processedEntity);
      
      return processedEntity;
    } catch (error) {
      console.error('[GraphService] Error updating entity:', error);
      throw error;
    }
  }

  // Delete entity
  async deleteEntity(id) {
    try {
      await entityAPI.deleteEntity(id);
      
      // Remove from cache
      this.cache.nodes.delete(id);
      
      // Remove related edges
      const edgesToRemove = Array.from(this.cache.edges.values()).filter(edge => {
        const sourceId = this.getEndpointId(edge.source);
        const targetId = this.getEndpointId(edge.target);
        return sourceId === id || targetId === id;
      });
      
      edgesToRemove.forEach(edge => {
        this.cache.edges.delete(edge.id);
      });
      
      // Emit entity deleted event
      this.emit('entity_deleted', { id, removedEdges: edgesToRemove });
      
      return { id, removedEdges: edgesToRemove };
    } catch (error) {
      console.error('[GraphService] Error deleting entity:', error);
      throw error;
    }
  }

  // Process entity data
  processEntity(entity) {
    const riskScore = entity.risk_score || entity.riskScore || 0.5;

    return {
      ...entity,
      riskScore,
      riskLevel: getRiskLevelFromScore(riskScore),
      connections: this.getEntityConnectionCount(entity.id),
      size: this.calculateNodeSize({
        ...entity,
        connections: this.getEntityConnectionCount(entity.id)
      }),
      color: this.getNodeColor({ riskLevel: getRiskLevelFromScore(riskScore) })
    };
  }

  // Apply incoming events (e.g., from WebSocket) to the local cache and re-emit
  handleEntityCreated(entity) {
    const processedEntity = this.processEntity(entity);
    this.cache.nodes.set(processedEntity.id, processedEntity);
    this.emit('entity_created', processedEntity);
    return processedEntity;
  }

  handleEntityUpdated(entity) {
    const processedEntity = this.processEntity(entity);
    this.cache.nodes.set(processedEntity.id, processedEntity);
    this.emit('entity_updated', processedEntity);
    return processedEntity;
  }

  handleEntityDeleted(payload) {
    const id = payload?.id;
    if (!id) return null;

    const getEndpointId = (endpoint) => {
      if (endpoint && typeof endpoint === 'object') return endpoint.id;
      return endpoint;
    };

    this.cache.nodes.delete(id);

    const removedEdges = Array.from(this.cache.edges.values()).filter((edge) => {
      const sourceId = getEndpointId(edge.source);
      const targetId = getEndpointId(edge.target);
      return sourceId === id || targetId === id;
    });

    removedEdges.forEach((edge) => {
      this.cache.edges.delete(edge.id);
    });

    // Update connections for the remaining nodes that were connected to the removed entity
    removedEdges.forEach((edge) => {
      const sourceId = getEndpointId(edge.source);
      const targetId = getEndpointId(edge.target);
      const otherId = sourceId === id ? targetId : sourceId;

      if (!otherId) return;

      this.updateEntityConnections(otherId);
      const updated = this.cache.nodes.get(otherId);
      if (updated) {
        this.emit('entity_updated', updated);
      }
    });

    this.emit('entity_deleted', { id, removedEdges });

    return { id, removedEdges };
  }

  handleRelationshipCreated(relationship) {
    const processedRelationship = this.processRelationship(relationship);
    this.cache.edges.set(processedRelationship.id, processedRelationship);

    const sourceId = processedRelationship?.source?.id ?? processedRelationship?.source;
    const targetId = processedRelationship?.target?.id ?? processedRelationship?.target;

    if (sourceId) this.updateEntityConnections(sourceId);
    if (targetId) this.updateEntityConnections(targetId);

    this.emit('relationship_created', processedRelationship);

    const updatedSource = sourceId ? this.cache.nodes.get(sourceId) : null;
    const updatedTarget = targetId ? this.cache.nodes.get(targetId) : null;
    if (updatedSource) this.emit('entity_updated', updatedSource);
    if (updatedTarget) this.emit('entity_updated', updatedTarget);

    return processedRelationship;
  }

  handleRelationshipDeleted(relationship) {
    const id = relationship?.id;
    if (!id) return null;

    const existing = this.cache.edges.get(id) || relationship;
    this.cache.edges.delete(id);

    const sourceId = existing?.source?.id ?? existing?.source;
    const targetId = existing?.target?.id ?? existing?.target;

    if (sourceId) {
      this.updateEntityConnections(sourceId);
      const updated = this.cache.nodes.get(sourceId);
      if (updated) this.emit('entity_updated', updated);
    }

    if (targetId) {
      this.updateEntityConnections(targetId);
      const updated = this.cache.nodes.get(targetId);
      if (updated) this.emit('entity_updated', updated);
    }

    this.emit('relationship_deleted', existing);

    return existing;
  }

  // Get entity connection count
  getEntityConnectionCount(entityId) {
    const id = this.getEndpointId(entityId);
    if (!id) return 0;

    return Array.from(this.cache.edges.values()).filter(edge => {
      const sourceId = this.getEndpointId(edge.source);
      const targetId = this.getEndpointId(edge.target);
      return sourceId === id || targetId === id;
    }).length;
  }

  // Relationship Operations
  async createRelationship(relationshipData) {
    try {
      const relationship = await relationshipAPI.createRelationship(relationshipData);
      
      // Add to cache
      const processedRelationship = this.processRelationship(relationship);
      this.cache.edges.set(processedRelationship.id, processedRelationship);
      
      // Update connected entities
      this.updateEntityConnections(processedRelationship.source);
      this.updateEntityConnections(processedRelationship.target);
      
      // Emit relationship created event
      this.emit('relationship_created', processedRelationship);
      
      return processedRelationship;
    } catch (error) {
      console.error('[GraphService] Error creating relationship:', error);
      throw error;
    }
  }

  // Delete relationship
  async deleteRelationship(id) {
    try {
      const relationship = this.cache.edges.get(id);
      if (!relationship) {
        throw new Error('Relationship not found in cache');
      }
      
      await relationshipAPI.deleteRelationship(id);
      
      // Remove from cache
      this.cache.edges.delete(id);
      
      // Update connected entities
      this.updateEntityConnections(relationship.source);
      this.updateEntityConnections(relationship.target);
      
      // Emit relationship deleted event
      this.emit('relationship_deleted', relationship);
      
      return relationship;
    } catch (error) {
      console.error('[GraphService] Error deleting relationship:', error);
      throw error;
    }
  }

  // Process relationship data
  processRelationship(relationship) {
    return {
      ...relationship,
      thickness: this.calculateEdgeThickness(relationship),
      color: this.getEdgeColor(relationship)
    };
  }

  // Update entity connections after relationship change
  updateEntityConnections(entityRef) {
    const entityId = this.getEndpointId(entityRef);
    if (!entityId) return;

    const entity = this.cache.nodes.get(entityId);
    if (entity) {
      entity.connections = this.getEntityConnectionCount(entityId);
      entity.size = this.calculateNodeSize(entity);
      this.cache.nodes.set(entityId, entity);
    }
  }

  // Search and Filter Operations
  async searchEntities(query, filters = {}) {
    try {
      const results = await entityAPI.searchEntities(query, filters);
      return results.map(entity => this.processEntity(entity));
    } catch (error) {
      console.error('[GraphService] Error searching entities:', error);
      throw error;
    }
  }

  // Filter graph data
  filterGraphData(filters = {}) {
    let nodes = Array.from(this.cache.nodes.values());
    let edges = Array.from(this.cache.edges.values());
    
    // Filter by node types
    if (filters.nodeTypes && filters.nodeTypes.length > 0) {
      nodes = nodes.filter(node => filters.nodeTypes.includes(node.type));
    }
    
    // Filter by risk levels
    if (filters.riskLevels && filters.riskLevels.length > 0) {
      nodes = nodes.filter(node => filters.riskLevels.includes(node.riskLevel));
    }
    
    // Filter by confidence range
    if (filters.minConfidence !== undefined) {
      nodes = nodes.filter(node => (node.confidence || 0) >= filters.minConfidence);
    }
    
    if (filters.maxConfidence !== undefined) {
      nodes = nodes.filter(node => (node.confidence || 1) <= filters.maxConfidence);
    }
    
    // Filter edges by relationship types
    if (filters.relationshipTypes && filters.relationshipTypes.length > 0) {
      edges = edges.filter(edge => filters.relationshipTypes.includes(edge.type));
    }
    
    // Filter edges by confidence
    if (filters.minEdgeConfidence !== undefined) {
      edges = edges.filter(edge => (edge.confidence || 0) >= filters.minEdgeConfidence);
    }
    
    // Only include edges that connect to filtered nodes
    const nodeIds = new Set(nodes.map(node => node.id));
    edges = edges.filter(edge => {
      const sourceId = this.getEndpointId(edge.source);
      const targetId = this.getEndpointId(edge.target);
      return nodeIds.has(sourceId) && nodeIds.has(targetId);
    });
    
    return { nodes, edges };
  }

  // Export graph data
  async exportGraphData(format = 'json') {
    try {
      const data = await graphAPI.exportGraph(format);
      return data;
    } catch (error) {
      console.error('[GraphService] Error exporting graph data:', error);
      throw error;
    }
  }

  // Clear graph cache
  clearCache() {
    this.cache.nodes.clear();
    this.cache.edges.clear();
    this.cache.graphStats = null;
    this.cache.lastUpdate = null;
    
    this.emit('cache_cleared');
  }

  // Event listener management
  addEventListener(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    
    // Return unsubscribe function
    return () => {
      const eventListeners = this.listeners.get(event);
      if (eventListeners) {
        eventListeners.delete(callback);
        if (eventListeners.size === 0) {
          this.listeners.delete(event);
        }
      }
    };
  }

  // Emit event to listeners
  emit(event, data) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[GraphService] Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  // Convenience methods for common events
  onGraphDataLoaded(callback) {
    return this.addEventListener('graph_data_loaded', callback);
  }

  onEntityCreated(callback) {
    return this.addEventListener('entity_created', callback);
  }

  onEntityUpdated(callback) {
    return this.addEventListener('entity_updated', callback);
  }

  onEntityDeleted(callback) {
    return this.addEventListener('entity_deleted', callback);
  }

  onRelationshipCreated(callback) {
    return this.addEventListener('relationship_created', callback);
  }

  onRelationshipDeleted(callback) {
    return this.addEventListener('relationship_deleted', callback);
  }

  onCacheCleared(callback) {
    return this.addEventListener('cache_cleared', callback);
  }
}

// Create singleton instance
const graphService = new GraphService();

export default graphService;