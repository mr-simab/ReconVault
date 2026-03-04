// Playlist/Collection Service
// Manages entity collections, playlists, and bookmarks

class PlaylistService {
  constructor() {
    this.storageKey = 'reconvault_playlists';
    this.bookmarksKey = 'reconvault_bookmarks';
    this.db = null;
    this.initIndexedDB();
  }

  /**
   * Initialize IndexedDB for persistent storage
   */
  async initIndexedDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('ReconVaultDB', 1);
      
      request.onerror = () => {
        console.error('[PlaylistService] IndexedDB error:', request.error);
        reject(request.error);
      };
      
      request.onsuccess = () => {
        this.db = request.result;
        console.log('[PlaylistService] IndexedDB initialized');
        resolve(this.db);
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create playlists object store
        if (!db.objectStoreNames.contains('playlists')) {
          const playlistStore = db.createObjectStore('playlists', { keyPath: 'id' });
          playlistStore.createIndex('name', 'name', { unique: false });
          playlistStore.createIndex('created', 'created', { unique: false });
        }
        
        // Create bookmarks object store
        if (!db.objectStoreNames.contains('bookmarks')) {
          const bookmarkStore = db.createObjectStore('bookmarks', { keyPath: 'entityId' });
          bookmarkStore.createIndex('timestamp', 'timestamp', { unique: false });
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
   * Create new playlist/collection
   * @param {String} name - Playlist name
   * @param {String} description - Playlist description
   * @param {Object} options - Additional options
   */
  async createPlaylist(name, description = '', options = {}) {
    try {
      await this.ensureDB();
      
      const playlist = {
        id: this.generateId(),
        name,
        description,
        entities: [],
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        color: options.color || this.getRandomColor(),
        tags: options.tags || [],
        metadata: options.metadata || {}
      };
      
      await this.storePlaylist(playlist);
      
      console.log('[PlaylistService] Playlist created:', playlist.id);
      
      return playlist;
      
    } catch (error) {
      console.error('[PlaylistService] Error creating playlist:', error);
      throw error;
    }
  }

  /**
   * Store playlist in IndexedDB
   */
  async storePlaylist(playlist) {
    await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['playlists'], 'readwrite');
      const objectStore = transaction.objectStore('playlists');
      const request = objectStore.put(playlist);
      
      request.onsuccess = () => resolve(playlist);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all playlists
   */
  async getAllPlaylists() {
    try {
      await this.ensureDB();
      
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction(['playlists'], 'readonly');
        const objectStore = transaction.objectStore('playlists');
        const request = objectStore.getAll();
        
        request.onsuccess = () => {
          const playlists = request.result;
          // Sort by updated date (most recent first)
          playlists.sort((a, b) => new Date(b.updated) - new Date(a.updated));
          resolve(playlists);
        };
        
        request.onerror = () => reject(request.error);
      });
      
    } catch (error) {
      console.error('[PlaylistService] Error getting playlists:', error);
      throw error;
    }
  }

  /**
   * Get playlist by ID
   */
  async getPlaylist(playlistId) {
    try {
      await this.ensureDB();
      
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction(['playlists'], 'readonly');
        const objectStore = transaction.objectStore('playlists');
        const request = objectStore.get(playlistId);
        
        request.onsuccess = () => {
          if (request.result) {
            resolve(request.result);
          } else {
            reject(new Error('Playlist not found'));
          }
        };
        
        request.onerror = () => reject(request.error);
      });
      
    } catch (error) {
      console.error('[PlaylistService] Error getting playlist:', error);
      throw error;
    }
  }

  /**
   * Update playlist
   */
  async updatePlaylist(playlistId, updates) {
    try {
      const playlist = await this.getPlaylist(playlistId);
      
      // Apply updates
      Object.assign(playlist, updates);
      playlist.updated = new Date().toISOString();
      
      await this.storePlaylist(playlist);
      
      console.log('[PlaylistService] Playlist updated:', playlistId);
      
      return playlist;
      
    } catch (error) {
      console.error('[PlaylistService] Error updating playlist:', error);
      throw error;
    }
  }

  /**
   * Delete playlist
   */
  async deletePlaylist(playlistId) {
    try {
      await this.ensureDB();
      
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction(['playlists'], 'readwrite');
        const objectStore = transaction.objectStore('playlists');
        const request = objectStore.delete(playlistId);
        
        request.onsuccess = () => {
          console.log('[PlaylistService] Playlist deleted:', playlistId);
          resolve(true);
        };
        
        request.onerror = () => reject(request.error);
      });
      
    } catch (error) {
      console.error('[PlaylistService] Error deleting playlist:', error);
      throw error;
    }
  }

  /**
   * Add entity to playlist
   */
  async addToPlaylist(playlistId, entityId, entityData = {}) {
    try {
      const playlist = await this.getPlaylist(playlistId);
      
      // Check if entity already exists
      if (playlist.entities.find(e => e.id === entityId)) {
        console.log('[PlaylistService] Entity already in playlist');
        return playlist;
      }
      
      // Add entity
      playlist.entities.push({
        id: entityId,
        addedAt: new Date().toISOString(),
        ...entityData
      });
      
      playlist.updated = new Date().toISOString();
      
      await this.storePlaylist(playlist);
      
      console.log('[PlaylistService] Entity added to playlist:', entityId);
      
      return playlist;
      
    } catch (error) {
      console.error('[PlaylistService] Error adding to playlist:', error);
      throw error;
    }
  }

  /**
   * Remove entity from playlist
   */
  async removeFromPlaylist(playlistId, entityId) {
    try {
      const playlist = await this.getPlaylist(playlistId);
      
      // Remove entity
      playlist.entities = playlist.entities.filter(e => e.id !== entityId);
      playlist.updated = new Date().toISOString();
      
      await this.storePlaylist(playlist);
      
      console.log('[PlaylistService] Entity removed from playlist:', entityId);
      
      return playlist;
      
    } catch (error) {
      console.error('[PlaylistService] Error removing from playlist:', error);
      throw error;
    }
  }

  /**
   * Check if entity is in playlist
   */
  async isInPlaylist(playlistId, entityId) {
    try {
      const playlist = await this.getPlaylist(playlistId);
      return playlist.entities.some(e => e.id === entityId);
    } catch (error) {
      return false;
    }
  }

  /**
   * Get playlists containing entity
   */
  async getPlaylistsForEntity(entityId) {
    try {
      const playlists = await this.getAllPlaylists();
      return playlists.filter(playlist => 
        playlist.entities.some(e => e.id === entityId)
      );
    } catch (error) {
      console.error('[PlaylistService] Error getting playlists for entity:', error);
      return [];
    }
  }

  /**
   * Export playlist
   */
  async exportPlaylist(playlistId, format = 'json') {
    try {
      const playlist = await this.getPlaylist(playlistId);
      
      if (format === 'json') {
        const json = JSON.stringify(playlist, null, 2);
        this.downloadFile(json, `playlist-${playlist.name}.json`, 'application/json');
      } else if (format === 'csv') {
        const csv = this.playlistToCSV(playlist);
        this.downloadFile(csv, `playlist-${playlist.name}.csv`, 'text/csv');
      }
      
      return true;
      
    } catch (error) {
      console.error('[PlaylistService] Error exporting playlist:', error);
      throw error;
    }
  }

  /**
   * Convert playlist to CSV
   */
  playlistToCSV(playlist) {
    let csv = 'Entity ID,Added At,Value,Type,Risk Level\n';
    
    playlist.entities.forEach(entity => {
      const row = [
        entity.id,
        entity.addedAt,
        entity.value || '',
        entity.type || '',
        entity.riskLevel || ''
      ].map(v => {
        const str = String(v);
        return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
      });
      
      csv += row.join(',') + '\n';
    });
    
    return csv;
  }

  /**
   * Share playlist (create shareable link)
   */
  async sharePlaylist(playlistId) {
    try {
      const playlist = await this.getPlaylist(playlistId);
      
      // Create compact data for sharing
      const shareData = {
        name: playlist.name,
        description: playlist.description,
        entities: playlist.entities.map(e => e.id),
        created: playlist.created
      };
      
      const json = JSON.stringify(shareData);
      const base64 = btoa(unescape(encodeURIComponent(json)));
      
      const shareUrl = `${window.location.origin}${window.location.pathname}?playlist=${base64}`;
      
      // Copy to clipboard
      await navigator.clipboard.writeText(shareUrl);
      
      return shareUrl;
      
    } catch (error) {
      console.error('[PlaylistService] Error sharing playlist:', error);
      throw error;
    }
  }

  /**
   * Load playlist from share link
   */
  async loadFromShareLink(base64Data) {
    try {
      const json = decodeURIComponent(escape(atob(base64Data)));
      const shareData = JSON.parse(json);
      
      // Create new playlist from shared data
      const playlist = await this.createPlaylist(
        `${shareData.name} (shared)`,
        shareData.description
      );
      
      // Add entities (IDs only, actual data would need to be fetched)
      shareData.entities.forEach(entityId => {
        playlist.entities.push({
          id: entityId,
          addedAt: new Date().toISOString()
        });
      });
      
      await this.storePlaylist(playlist);
      
      return playlist;
      
    } catch (error) {
      console.error('[PlaylistService] Error loading from share link:', error);
      throw error;
    }
  }

  // ========== Bookmarks ==========

  /**
   * Add bookmark
   */
  async addBookmark(entityId, entityData = {}) {
    try {
      await this.ensureDB();
      
      const bookmark = {
        entityId,
        timestamp: new Date().toISOString(),
        ...entityData
      };
      
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction(['bookmarks'], 'readwrite');
        const objectStore = transaction.objectStore('bookmarks');
        const request = objectStore.put(bookmark);
        
        request.onsuccess = () => {
          console.log('[PlaylistService] Bookmark added:', entityId);
          resolve(bookmark);
        };
        
        request.onerror = () => reject(request.error);
      });
      
    } catch (error) {
      console.error('[PlaylistService] Error adding bookmark:', error);
      throw error;
    }
  }

  /**
   * Remove bookmark
   */
  async removeBookmark(entityId) {
    try {
      await this.ensureDB();
      
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction(['bookmarks'], 'readwrite');
        const objectStore = transaction.objectStore('bookmarks');
        const request = objectStore.delete(entityId);
        
        request.onsuccess = () => {
          console.log('[PlaylistService] Bookmark removed:', entityId);
          resolve(true);
        };
        
        request.onerror = () => reject(request.error);
      });
      
    } catch (error) {
      console.error('[PlaylistService] Error removing bookmark:', error);
      throw error;
    }
  }

  /**
   * Get all bookmarks
   */
  async getAllBookmarks() {
    try {
      await this.ensureDB();
      
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction(['bookmarks'], 'readonly');
        const objectStore = transaction.objectStore('bookmarks');
        const request = objectStore.getAll();
        
        request.onsuccess = () => {
          const bookmarks = request.result;
          // Sort by timestamp (most recent first)
          bookmarks.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
          resolve(bookmarks);
        };
        
        request.onerror = () => reject(request.error);
      });
      
    } catch (error) {
      console.error('[PlaylistService] Error getting bookmarks:', error);
      throw error;
    }
  }

  /**
   * Check if entity is bookmarked
   */
  async isBookmarked(entityId) {
    try {
      await this.ensureDB();
      
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction(['bookmarks'], 'readonly');
        const objectStore = transaction.objectStore('bookmarks');
        const request = objectStore.get(entityId);
        
        request.onsuccess = () => resolve(!!request.result);
        request.onerror = () => reject(request.error);
      });
      
    } catch (error) {
      console.error('[PlaylistService] Error checking bookmark:', error);
      return false;
    }
  }

  /**
   * Toggle bookmark (add if not exists, remove if exists)
   */
  async toggleBookmark(entityId, entityData = {}) {
    try {
      const isBookmarked = await this.isBookmarked(entityId);
      
      if (isBookmarked) {
        await this.removeBookmark(entityId);
        return { bookmarked: false };
      } else {
        await this.addBookmark(entityId, entityData);
        return { bookmarked: true };
      }
      
    } catch (error) {
      console.error('[PlaylistService] Error toggling bookmark:', error);
      throw error;
    }
  }

  /**
   * Clear all bookmarks
   */
  async clearBookmarks() {
    try {
      await this.ensureDB();
      
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction(['bookmarks'], 'readwrite');
        const objectStore = transaction.objectStore('bookmarks');
        const request = objectStore.clear();
        
        request.onsuccess = () => {
          console.log('[PlaylistService] All bookmarks cleared');
          resolve(true);
        };
        
        request.onerror = () => reject(request.error);
      });
      
    } catch (error) {
      console.error('[PlaylistService] Error clearing bookmarks:', error);
      throw error;
    }
  }

  /**
   * Search bookmarks
   */
  async searchBookmarks(query) {
    try {
      const bookmarks = await this.getAllBookmarks();
      
      const lowerQuery = query.toLowerCase();
      
      return bookmarks.filter(bookmark => {
        return (
          (bookmark.value && bookmark.value.toLowerCase().includes(lowerQuery)) ||
          (bookmark.type && bookmark.type.toLowerCase().includes(lowerQuery)) ||
          (bookmark.id && bookmark.id.toLowerCase().includes(lowerQuery))
        );
      });
      
    } catch (error) {
      console.error('[PlaylistService] Error searching bookmarks:', error);
      return [];
    }
  }

  // ========== Utility Methods ==========

  /**
   * Generate unique ID
   */
  generateId() {
    return `pl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get random color for playlist
   */
  getRandomColor() {
    const colors = [
      '#ff0033', '#00ff41', '#00d9ff', '#ff006e', '#8f00ff',
      '#ffaa00', '#ff6600', '#00dd00', '#00aaff', '#ff3366'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  /**
   * Download file helper
   */
  downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }
}

// Create singleton instance
const playlistService = new PlaylistService();

export default playlistService;
