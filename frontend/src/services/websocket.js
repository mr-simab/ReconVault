// WebSocket service for real-time updates
import { WEBSOCKET_CONFIG } from '../utils/constants';

class WebSocketService {
  constructor() {
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = WEBSOCKET_CONFIG.MAX_RECONNECT_ATTEMPTS;
    this.reconnectInterval = WEBSOCKET_CONFIG.RECONNECT_INTERVAL;
    this.heartbeatInterval = WEBSOCKET_CONFIG.HEARTBEAT_INTERVAL;
    this.reconnectTimer = null;
    this.heartbeatTimer = null;
    this.isConnecting = false;
    this.isIntentionallyClosed = false;
    
    // Event listeners storage
    this.listeners = new Map();
    
    // Connection state
    this.state = {
      connected: false,
      connecting: false,
      lastPing: null,
      lastPong: null,
      messageQueue: []
    };
    
    // URL construction
    this.baseUrl = WEBSOCKET_CONFIG.URL;
    this.path = WEBSOCKET_CONFIG.PATH;
    this.fullUrl = WebSocketService.joinUrl(this.baseUrl, this.path);

    console.log('[WebSocket] Service initialized:', this.fullUrl);
  }

  static joinUrl(baseUrl, path) {
    const base = String(baseUrl || '').replace(/\/+$/, '');
    const p = String(path || '').startsWith('/') ? String(path || '') : `/${path}`;

    // Common misconfiguration: both baseUrl and path include the '/ws' prefix.
    if (base.endsWith('/ws') && p.startsWith('/ws/')) {
      return `${base}${p.slice('/ws'.length)}`;
    }

    return `${base}${p}`;
  }

  // Connect to WebSocket
  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('[WebSocket] Already connected');
      return;
    }
    
    if (this.isConnecting) {
      console.log('[WebSocket] Connection attempt already in progress');
      return;
    }
    
    this.isConnecting = true;
    this.isIntentionallyClosed = false;
    this.state.connecting = true;
    
    console.log(`[WebSocket] Connecting to ${this.fullUrl}...`);
    
    try {
      this.ws = new WebSocket(this.fullUrl);
      
      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
      this.ws.onerror = this.handleError.bind(this);
      
    } catch (error) {
      console.error('[WebSocket] Connection error:', error);
      this.isConnecting = false;
      this.state.connecting = false;
      this.scheduleReconnect();
    }
  }

  // Handle connection open
  handleOpen(event) {
    console.log('[WebSocket] Connected successfully');
    
    this.isConnecting = false;
    this.state.connected = true;
    this.state.connecting = false;
    this.reconnectAttempts = 0;
    
    // Clear any existing reconnection timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    // Start heartbeat
    this.startHeartbeat();
    
    // Process any queued messages
    this.processMessageQueue();
    
    // Emit connected event
    this.emit('connected', { timestamp: new Date().toISOString() });
    
    // Send initial handshake if needed
    this.sendHandshake();
  }

  // Handle incoming messages
  handleMessage(event) {
    try {
      const data = JSON.parse(event.data);
      
      // Update last pong time for heartbeat
      if (data.type === 'pong') {
        this.state.lastPong = new Date();
        return;
      }
      
      console.log('[WebSocket] Received message:', data);
      
      // Handle different message types
      switch (data.type) {
        case 'entity_created':
          this.emit('entity_created', data.payload);
          break;
        case 'entity_updated':
          this.emit('entity_updated', data.payload);
          break;
        case 'entity_deleted':
          this.emit('entity_deleted', data.payload);
          break;
        case 'relationship_created':
          this.emit('relationship_created', data.payload);
          break;
        case 'relationship_deleted':
          this.emit('relationship_deleted', data.payload);
          break;
        case 'collection_progress':
          this.emit('collection_progress', data.payload);
          break;
        case 'collection_completed':
          this.emit('collection_completed', data.payload);
          break;
        case 'collection_failed':
          this.emit('collection_failed', data.payload);
          break;
        case 'graph_snapshot':
          this.emit('graph_snapshot', data.payload);
          break;
        case 'graph_stats':
          this.emit('graph_stats', data.payload);
          break;
        case 'system_alert':
          this.emit('system_alert', data.payload);
          break;
        case 'error':
          console.error('[WebSocket] Server error:', data.payload);
          this.emit('error', data.payload);
          break;
        default:
          console.warn('[WebSocket] Unknown message type:', data.type);
          this.emit('message', data);
      }
      
    } catch (error) {
      console.error('[WebSocket] Error parsing message:', error, event.data);
    }
  }

  // Handle connection close
  handleClose(event) {
    console.log('[WebSocket] Connection closed:', event.code, event.reason);
    
    this.isConnecting = false;
    this.state.connected = false;
    this.state.connecting = false;
    
    // Stop heartbeat
    this.stopHeartbeat();
    
    // Emit disconnected event
    this.emit('disconnected', { 
      code: event.code, 
      reason: event.reason,
      timestamp: new Date().toISOString() 
    });
    
    // Attempt reconnection if not intentional
    if (!this.isIntentionallyClosed && this.reconnectAttempts < this.maxReconnectAttempts) {
      this.scheduleReconnect();
    } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[WebSocket] Max reconnection attempts reached');
      this.emit('max_reconnect_attempts_reached', { attempts: this.reconnectAttempts });
    }
  }

  // Handle connection errors
  handleError(error) {
    console.error('[WebSocket] Connection error:', error);
    this.isConnecting = false;
    this.state.connecting = false;
    
    this.emit('error', { 
      error: error.message || 'WebSocket error',
      timestamp: new Date().toISOString() 
    });
  }

  // Send message through WebSocket
  send(data) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      try {
        const message = typeof data === 'string' ? data : JSON.stringify(data);
        this.ws.send(message);
        console.log('[WebSocket] Message sent:', data);
        return true;
      } catch (error) {
        console.error('[WebSocket] Error sending message:', error);
        return false;
      }
    } else {
      console.warn('[WebSocket] Cannot send message - not connected');
      // Queue message for later
      this.state.messageQueue.push(data);
      return false;
    }
  }

  // Send JSON message
  sendJSON(type, payload = {}) {
    return this.send({
      type,
      payload,
      timestamp: new Date().toISOString()
    });
  }

  // Send ping for heartbeat
  ping() {
    if (this.isConnected()) {
      this.sendJSON('ping');
      this.state.lastPing = new Date();
    }
  }

  // Start heartbeat mechanism
  startHeartbeat() {
    this.stopHeartbeat(); // Clear any existing heartbeat
    
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected()) {
        this.ping();
        
        // Check if we haven't received a pong in a while
        const now = new Date();
        const timeSinceLastPong = this.state.lastPong ? 
          now - this.state.lastPong : this.heartbeatInterval * 2;
        
        if (timeSinceLastPong > this.heartbeatInterval * 2) {
          console.warn('[WebSocket] Heartbeat timeout - reconnecting');
          this.reconnect();
        }
      }
    }, this.heartbeatInterval);
  }

  // Stop heartbeat mechanism
  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  // Schedule reconnection attempt
  scheduleReconnect() {
    if (this.reconnectTimer) {
      return;
    }
    
    this.reconnectAttempts++;
    // Cap max delay at 30 seconds to prevent excessive wait times
    const baseDelay = this.reconnectInterval * Math.pow(1.5, this.reconnectAttempts - 1);
    const delay = Math.min(baseDelay, 30000);
    
    console.log(`[WebSocket] Scheduling reconnection attempt ${this.reconnectAttempts} in ${delay}ms`);
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
    
    this.emit('reconnecting', { 
      attempt: this.reconnectAttempts, 
      delay,
      timestamp: new Date().toISOString() 
    });
  }

  // Manually reconnect
  reconnect() {
    console.log('[WebSocket] Manual reconnection requested');
    this.disconnect();
    setTimeout(() => this.connect(), 1000);
  }

  // Disconnect WebSocket
  disconnect() {
    console.log('[WebSocket] Disconnecting...');
    
    this.isIntentionallyClosed = true;
    this.stopHeartbeat();
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    
    this.state.connected = false;
    this.state.connecting = false;
  }

  // Process queued messages
  processMessageQueue() {
    if (this.state.messageQueue.length > 0) {
      console.log(`[WebSocket] Processing ${this.state.messageQueue.length} queued messages`);
      
      const queue = [...this.state.messageQueue];
      this.state.messageQueue = [];
      
      queue.forEach(message => {
        this.send(message);
      });
    }
  }

  // Send initial handshake
  sendHandshake() {
    this.sendJSON('hello', {
      client: 'reconvault-frontend',
      version: '1.0.0',
      capabilities: ['graph-updates', 'collection-progress', 'real-time-events']
    });
  }

  // Check if connected
  isConnected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  // Check if connecting
  isConnectingState() {
    return this.state.connecting || this.isConnecting;
  }

  // Get connection state
  getState() {
    return {
      connected: this.isConnected(),
      connecting: this.isConnectingState(),
      reconnectAttempts: this.reconnectAttempts,
      lastPing: this.state.lastPing,
      lastPong: this.state.lastPong,
      url: this.fullUrl
    };
  }

  // Add event listener
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

  // Remove event listener
  removeEventListener(event, callback) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(callback);
      if (eventListeners.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  // Emit event to listeners
  emit(event, data) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[WebSocket] Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  // Subscribe to specific event types with convenience methods
  onConnected(callback) {
    return this.addEventListener('connected', callback);
  }

  onDisconnected(callback) {
    return this.addEventListener('disconnected', callback);
  }

  onError(callback) {
    return this.addEventListener('error', callback);
  }

  onReconnecting(callback) {
    return this.addEventListener('reconnecting', callback);
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

  onCollectionProgress(callback) {
    return this.addEventListener('collection_progress', callback);
  }

  onCollectionCompleted(callback) {
    return this.addEventListener('collection_completed', callback);
  }

  onGraphSnapshot(callback) {
    return this.addEventListener('graph_snapshot', callback);
  }

  onSystemAlert(callback) {
    return this.addEventListener('system_alert', callback);
  }

  // Cleanup all listeners
  removeAllListeners() {
    this.listeners.clear();
  }
}

// Create singleton instance
const webSocketService = new WebSocketService();

export default webSocketService;