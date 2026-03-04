// Graph Snapshot Service
// Manages graph state snapshots for history and comparison

class SnapshotService {
  constructor() {
    this.storageKey = 'reconvault_snapshots';
    this.maxSnapshots = 50; // Maximum number of snapshots to keep
    this.db = null;
    this.initIndexedDB();
  }

  /**
   * Initialize IndexedDB for snapshot storage
   */
  async initIndexedDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('ReconVaultDB', 1);
      
      request.onerror = () => {
        console.error('[SnapshotService] IndexedDB error:', request.error);
        reject(request.error);
      };
      
      request.onsuccess = () => {
        this.db = request.result;
        console.log('[SnapshotService] IndexedDB initialized');
        resolve(this.db);
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create snapshots object store
        if (!db.objectStoreNames.contains('snapshots')) {
          const objectStore = db.createObjectStore('snapshots', { keyPath: 'id' });
          objectStore.createIndex('timestamp', 'timestamp', { unique: false });
          objectStore.createIndex('name', 'name', { unique: false });
        }
      };
    });
  }

  /**
   * Ensure IndexedDB is ready
   */
  async ensureDB() {
    if (!this.db) {
      await this.initIndexedDB();
    }
    return this.db;
  }

  /**
   * Capture current graph state as snapshot
   * @param {Object} graphData - Current graph data {nodes, edges, filters}
   * @param {String} name - Optional name for the snapshot
   * @param {String} description - Optional description
   * @returns {Object} - Snapshot object
   */
  async captureSnapshot(graphData, name = null, description = null) {
    try {
      await this.ensureDB();
      
      const snapshot = {
        id: this.generateSnapshotId(),
        name: name || `Snapshot ${new Date().toLocaleString()}`,
        description: description || '',
        timestamp: new Date().toISOString(),
        data: {
          nodes: JSON.parse(JSON.stringify(graphData.nodes)), // Deep clone
          edges: JSON.parse(JSON.stringify(graphData.edges)),
          filters: graphData.filters || {},
          metadata: graphData.metadata || {}
        },
        statistics: this.calculateSnapshotStats(graphData)
      };
      
      // Store in IndexedDB
      await this.storeSnapshot(snapshot);
      
      // Clean up old snapshots if necessary
      await this.cleanupOldSnapshots();
      
      console.log('[SnapshotService] Snapshot captured:', snapshot.id);
      
      return snapshot;
      
    } catch (error) {
      console.error('[SnapshotService] Error capturing snapshot:', error);
      throw error;
    }
  }

  /**
   * Store snapshot in IndexedDB
   */
  async storeSnapshot(snapshot) {
    await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['snapshots'], 'readwrite');
      const objectStore = transaction.objectStore('snapshots');
      const request = objectStore.add(snapshot);
      
      request.onsuccess = () => resolve(snapshot);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * List all snapshots
   * @param {Object} options - Listing options {limit, offset, sortBy}
   * @returns {Array} - Array of snapshot metadata
   */
  async listSnapshots(options = {}) {
    try {
      await this.ensureDB();
      
      const { limit = 20, offset = 0, sortBy = 'timestamp' } = options;
      
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction(['snapshots'], 'readonly');
        const objectStore = transaction.objectStore('snapshots');
        const request = objectStore.getAll();
        
        request.onsuccess = () => {
          let snapshots = request.result;
          
          // Sort
          snapshots.sort((a, b) => {
            if (sortBy === 'timestamp') {
              return new Date(b.timestamp) - new Date(a.timestamp);
            } else if (sortBy === 'name') {
              return a.name.localeCompare(b.name);
            }
            return 0;
          });
          
          // Apply pagination
          const paginated = snapshots.slice(offset, offset + limit);
          
          // Return metadata only (without full data)
          const metadata = paginated.map(s => ({
            id: s.id,
            name: s.name,
            description: s.description,
            timestamp: s.timestamp,
            statistics: s.statistics
          }));
          
          resolve(metadata);
        };
        
        request.onerror = () => reject(request.error);
      });
      
    } catch (error) {
      console.error('[SnapshotService] Error listing snapshots:', error);
      throw error;
    }
  }

  /**
   * Get snapshot by ID
   * @param {String} snapshotId - Snapshot ID
   * @returns {Object} - Full snapshot object
   */
  async getSnapshot(snapshotId) {
    try {
      await this.ensureDB();
      
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction(['snapshots'], 'readonly');
        const objectStore = transaction.objectStore('snapshots');
        const request = objectStore.get(snapshotId);
        
        request.onsuccess = () => {
          if (request.result) {
            resolve(request.result);
          } else {
            reject(new Error('Snapshot not found'));
          }
        };
        
        request.onerror = () => reject(request.error);
      });
      
    } catch (error) {
      console.error('[SnapshotService] Error getting snapshot:', error);
      throw error;
    }
  }

  /**
   * Load snapshot and restore graph state
   * @param {String} snapshotId - Snapshot ID to load
   * @returns {Object} - Graph data from snapshot
   */
  async loadSnapshot(snapshotId) {
    try {
      const snapshot = await this.getSnapshot(snapshotId);
      
      console.log('[SnapshotService] Snapshot loaded:', snapshotId);
      
      return {
        nodes: snapshot.data.nodes,
        edges: snapshot.data.edges,
        filters: snapshot.data.filters,
        metadata: snapshot.data.metadata,
        snapshotInfo: {
          id: snapshot.id,
          name: snapshot.name,
          timestamp: snapshot.timestamp
        }
      };
      
    } catch (error) {
      console.error('[SnapshotService] Error loading snapshot:', error);
      throw error;
    }
  }

  /**
   * Delete snapshot
   * @param {String} snapshotId - Snapshot ID to delete
   */
  async deleteSnapshot(snapshotId) {
    try {
      await this.ensureDB();
      
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction(['snapshots'], 'readwrite');
        const objectStore = transaction.objectStore('snapshots');
        const request = objectStore.delete(snapshotId);
        
        request.onsuccess = () => {
          console.log('[SnapshotService] Snapshot deleted:', snapshotId);
          resolve(true);
        };
        
        request.onerror = () => reject(request.error);
      });
      
    } catch (error) {
      console.error('[SnapshotService] Error deleting snapshot:', error);
      throw error;
    }
  }

  /**
   * Update snapshot metadata
   * @param {String} snapshotId - Snapshot ID
   * @param {Object} updates - Metadata updates {name, description}
   */
  async updateSnapshot(snapshotId, updates) {
    try {
      await this.ensureDB();
      
      const snapshot = await this.getSnapshot(snapshotId);
      
      // Update fields
      if (updates.name) snapshot.name = updates.name;
      if (updates.description !== undefined) snapshot.description = updates.description;
      
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction(['snapshots'], 'readwrite');
        const objectStore = transaction.objectStore('snapshots');
        const request = objectStore.put(snapshot);
        
        request.onsuccess = () => resolve(snapshot);
        request.onerror = () => reject(request.error);
      });
      
    } catch (error) {
      console.error('[SnapshotService] Error updating snapshot:', error);
      throw error;
    }
  }

  /**
   * Compare two snapshots
   * @param {String} snapshot1Id - First snapshot ID
   * @param {String} snapshot2Id - Second snapshot ID
   * @returns {Object} - Comparison result with differences
   */
  async compareSnapshots(snapshot1Id, snapshot2Id) {
    try {
      const snapshot1 = await this.getSnapshot(snapshot1Id);
      const snapshot2 = await this.getSnapshot(snapshot2Id);
      
      const comparison = {
        snapshot1: {
          id: snapshot1.id,
          name: snapshot1.name,
          timestamp: snapshot1.timestamp
        },
        snapshot2: {
          id: snapshot2.id,
          name: snapshot2.name,
          timestamp: snapshot2.timestamp
        },
        differences: {
          nodes: this.compareNodes(snapshot1.data.nodes, snapshot2.data.nodes),
          edges: this.compareEdges(snapshot1.data.edges, snapshot2.data.edges)
        },
        summary: {}
      };
      
      // Calculate summary
      comparison.summary = {
        nodesAdded: comparison.differences.nodes.added.length,
        nodesRemoved: comparison.differences.nodes.removed.length,
        nodesModified: comparison.differences.nodes.modified.length,
        edgesAdded: comparison.differences.edges.added.length,
        edgesRemoved: comparison.differences.edges.removed.length,
        edgesModified: comparison.differences.edges.modified.length
      };
      
      return comparison;
      
    } catch (error) {
      console.error('[SnapshotService] Error comparing snapshots:', error);
      throw error;
    }
  }

  /**
   * Compare nodes between snapshots
   */
  compareNodes(nodes1, nodes2) {
    const map1 = new Map(nodes1.map(n => [n.id, n]));
    const map2 = new Map(nodes2.map(n => [n.id, n]));
    
    const added = [];
    const removed = [];
    const modified = [];
    
    // Find added nodes
    map2.forEach((node, id) => {
      if (!map1.has(id)) {
        added.push(node);
      }
    });
    
    // Find removed nodes
    map1.forEach((node, id) => {
      if (!map2.has(id)) {
        removed.push(node);
      }
    });
    
    // Find modified nodes
    map1.forEach((node1, id) => {
      if (map2.has(id)) {
        const node2 = map2.get(id);
        if (JSON.stringify(node1) !== JSON.stringify(node2)) {
          modified.push({
            id,
            before: node1,
            after: node2,
            changes: this.getNodeChanges(node1, node2)
          });
        }
      }
    });
    
    return { added, removed, modified };
  }

  /**
   * Compare edges between snapshots
   */
  compareEdges(edges1, edges2) {
    const map1 = new Map(edges1.map(e => [e.id, e]));
    const map2 = new Map(edges2.map(e => [e.id, e]));
    
    const added = [];
    const removed = [];
    const modified = [];
    
    // Find added edges
    map2.forEach((edge, id) => {
      if (!map1.has(id)) {
        added.push(edge);
      }
    });
    
    // Find removed edges
    map1.forEach((edge, id) => {
      if (!map2.has(id)) {
        removed.push(edge);
      }
    });
    
    // Find modified edges
    map1.forEach((edge1, id) => {
      if (map2.has(id)) {
        const edge2 = map2.get(id);
        if (JSON.stringify(edge1) !== JSON.stringify(edge2)) {
          modified.push({
            id,
            before: edge1,
            after: edge2,
            changes: this.getEdgeChanges(edge1, edge2)
          });
        }
      }
    });
    
    return { added, removed, modified };
  }

  /**
   * Get specific changes between two nodes
   */
  getNodeChanges(node1, node2) {
    const changes = [];
    const keys = new Set([...Object.keys(node1), ...Object.keys(node2)]);
    
    keys.forEach(key => {
      if (JSON.stringify(node1[key]) !== JSON.stringify(node2[key])) {
        changes.push({
          field: key,
          before: node1[key],
          after: node2[key]
        });
      }
    });
    
    return changes;
  }

  /**
   * Get specific changes between two edges
   */
  getEdgeChanges(edge1, edge2) {
    const changes = [];
    const keys = new Set([...Object.keys(edge1), ...Object.keys(edge2)]);
    
    keys.forEach(key => {
      if (JSON.stringify(edge1[key]) !== JSON.stringify(edge2[key])) {
        changes.push({
          field: key,
          before: edge1[key],
          after: edge2[key]
        });
      }
    });
    
    return changes;
  }

  /**
   * Calculate statistics for snapshot
   */
  calculateSnapshotStats(graphData) {
    const nodeTypes = {};
    const riskLevels = {};
    
    graphData.nodes.forEach(node => {
      nodeTypes[node.type] = (nodeTypes[node.type] || 0) + 1;
      riskLevels[node.riskLevel] = (riskLevels[node.riskLevel] || 0) + 1;
    });
    
    return {
      totalNodes: graphData.nodes.length,
      totalEdges: graphData.edges.length,
      nodeTypes,
      riskLevels,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Generate unique snapshot ID
   */
  generateSnapshotId() {
    return `snapshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clean up old snapshots (keep only maxSnapshots)
   */
  async cleanupOldSnapshots() {
    try {
      const snapshots = await this.listSnapshots({ limit: 1000 });
      
      if (snapshots.length > this.maxSnapshots) {
        // Sort by timestamp (oldest first)
        snapshots.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        
        // Delete oldest snapshots
        const toDelete = snapshots.slice(0, snapshots.length - this.maxSnapshots);
        
        for (const snapshot of toDelete) {
          await this.deleteSnapshot(snapshot.id);
        }
        
        console.log(`[SnapshotService] Cleaned up ${toDelete.length} old snapshots`);
      }
      
    } catch (error) {
      console.error('[SnapshotService] Error cleaning up snapshots:', error);
    }
  }

  /**
   * Export snapshot to file
   * @param {String} snapshotId - Snapshot ID
   * @param {String} format - Export format ('json', 'csv')
   */
  async exportSnapshot(snapshotId, format = 'json') {
    try {
      const snapshot = await this.getSnapshot(snapshotId);
      
      if (format === 'json') {
        const json = JSON.stringify(snapshot, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `snapshot-${snapshot.id}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setTimeout(() => URL.revokeObjectURL(url), 100);
      }
      
      return true;
      
    } catch (error) {
      console.error('[SnapshotService] Error exporting snapshot:', error);
      throw error;
    }
  }

  /**
   * Import snapshot from file
   * @param {File} file - Snapshot file
   */
  async importSnapshot(file) {
    try {
      const text = await file.text();
      const snapshot = JSON.parse(text);
      
      // Validate snapshot structure
      if (!snapshot.id || !snapshot.data || !snapshot.data.nodes || !snapshot.data.edges) {
        throw new Error('Invalid snapshot file format');
      }
      
      // Store the imported snapshot
      await this.storeSnapshot(snapshot);
      
      console.log('[SnapshotService] Snapshot imported:', snapshot.id);
      
      return snapshot;
      
    } catch (error) {
      console.error('[SnapshotService] Error importing snapshot:', error);
      throw error;
    }
  }

  /**
   * Clear all snapshots
   */
  async clearAllSnapshots() {
    try {
      await this.ensureDB();
      
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction(['snapshots'], 'readwrite');
        const objectStore = transaction.objectStore('snapshots');
        const request = objectStore.clear();
        
        request.onsuccess = () => {
          console.log('[SnapshotService] All snapshots cleared');
          resolve(true);
        };
        
        request.onerror = () => reject(request.error);
      });
      
    } catch (error) {
      console.error('[SnapshotService] Error clearing snapshots:', error);
      throw error;
    }
  }
}

// Create singleton instance
const snapshotService = new SnapshotService();

export default snapshotService;
