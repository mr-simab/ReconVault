// Custom hook for WebSocket connection management
import { useState, useEffect, useCallback, useRef } from 'react';
import webSocketService from '../services/websocket';

export const useWebSocket = (autoConnect = true) => {
  // Connection state
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [error, setError] = useState(null);
  const [lastPing, setLastPing] = useState(null);
  const [lastPong, setLastPong] = useState(null);
  
  // Event listeners state
  const [events, setEvents] = useState([]);
  const [messageCount, setMessageCount] = useState(0);
  
  // Refs
  const eventBufferRef = useRef([]);
  const maxBufferSize = 100;
  
  // Connect to WebSocket
  const connect = useCallback(() => {
    if (!connected && !connecting) {
      console.log('[useWebSocket] Connecting...');
      webSocketService.connect();
    }
  }, [connected, connecting]);
  
  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (connected || connecting) {
      console.log('[useWebSocket] Disconnecting...');
      webSocketService.disconnect();
    }
  }, [connected, connecting]);
  
  // Manually reconnect
  const reconnect = useCallback(() => {
    console.log('[useWebSocket] Manual reconnect requested');
    disconnect();
    setTimeout(() => connect(), 1000);
  }, [disconnect, connect]);
  
  // Send message through WebSocket
  const sendMessage = useCallback((data) => {
    if (connected) {
      return webSocketService.send(data);
    } else {
      console.warn('[useWebSocket] Cannot send message - not connected');
      return false;
    }
  }, [connected]);
  
  // Send JSON message
  const sendJSON = useCallback((type, payload = {}) => {
    return sendMessage({
      type,
      payload,
      timestamp: new Date().toISOString()
    });
  }, [sendMessage]);
  
  // Ping server
  const ping = useCallback(() => {
    if (connected) {
      webSocketService.ping();
      setLastPing(new Date());
      return true;
    }
    return false;
  }, [connected]);
  
  // Add event listener
  const addEventListener = useCallback((eventType, callback) => {
    const unsubscribe = webSocketService.addEventListener(eventType, (data) => {
      // Add to event buffer
      const event = {
        type: eventType,
        data,
        timestamp: new Date().toISOString()
      };
      
      eventBufferRef.current.push(event);
      
      // Maintain buffer size
      if (eventBufferRef.current.length > maxBufferSize) {
        eventBufferRef.current.shift();
      }
      
      // Update state
      setEvents([...eventBufferRef.current]);
      setMessageCount(prev => prev + 1);
      
      // Call callback
      if (callback) {
        callback(data);
      }
    });
    
    return unsubscribe;
  }, []);
  
  // Get recent events
  const getRecentEvents = useCallback((eventType = null, limit = 10) => {
    let filteredEvents = eventBufferRef.current;
    
    if (eventType) {
      filteredEvents = filteredEvents.filter(event => event.type === eventType);
    }
    
    return filteredEvents
      .slice(-limit)
      .reverse(); // Most recent first
  }, []);
  
  // Clear event buffer
  const clearEventBuffer = useCallback(() => {
    eventBufferRef.current = [];
    setEvents([]);
    setMessageCount(0);
  }, []);
  
  // Connection event listeners
  useEffect(() => {
    const unsubscribeConnected = webSocketService.onConnected(() => {
      console.log('[useWebSocket] Connected event received');
      setConnected(true);
      setConnecting(false);
      setError(null);
      setReconnectAttempts(0);
    });
    
    const unsubscribeDisconnected = webSocketService.onDisconnected(({ code, reason }) => {
      console.log('[useWebSocket] Disconnected event received:', code, reason);
      setConnected(false);
      setConnecting(false);
    });
    
    const unsubscribeConnecting = webSocketService.onReconnecting(({ attempt, delay }) => {
      console.log(`[useWebSocket] Reconnecting attempt ${attempt} in ${delay}ms`);
      setConnecting(true);
      setReconnectAttempts(attempt);
      setError(null);
    });
    
    const unsubscribeError = webSocketService.onError((errorData) => {
      console.error('[useWebSocket] WebSocket error:', errorData);
      setError(errorData.error || 'WebSocket error');
      setConnecting(false);
    });
    
    return () => {
      unsubscribeConnected();
      unsubscribeDisconnected();
      unsubscribeConnecting();
      unsubscribeError();
    };
  }, []);
  
  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }
    
    return () => {
      // Cleanup on unmount
      webSocketService.removeAllListeners();
    };
  }, [autoConnect, connect]);
  
  // Heartbeat monitoring
  useEffect(() => {
    let heartbeatInterval;
    
    if (connected) {
      heartbeatInterval = setInterval(() => {
        const state = webSocketService.getState();
        setLastPing(state.lastPing);
        setLastPong(state.lastPong);
        
        // Check if connection is stale
        const now = new Date();
        const timeSinceLastPong = state.lastPong ? 
          now - new Date(state.lastPong) : null;
        
        if (timeSinceLastPong && timeSinceLastPong > 60000) { // 1 minute
          console.warn('[useWebSocket] Connection appears stale, reconnecting...');
          reconnect();
        }
      }, 10000); // Check every 10 seconds
    }
    
    return () => {
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }
    };
  }, [connected, reconnect]);
  
  // Connection status object
  const connectionStatus = {
    connected,
    connecting,
    reconnectAttempts,
    error,
    lastPing,
    lastPong,
    messageCount,
    url: webSocketService.getState().url
  };
  
  return {
    // State
    ...connectionStatus,
    events,
    
    // Actions
    connect,
    disconnect,
    reconnect,
    sendMessage,
    sendJSON,
    ping,
    addEventListener,
    getRecentEvents,
    clearEventBuffer,
    
    // Computed values
    isConnected: connected,
    isConnecting: connecting,
    hasError: !!error,
    connectionQuality: getConnectionQuality(connectionStatus)
  };
};

// Helper function to determine connection quality
const getConnectionQuality = (status) => {
  if (!status.connected && !status.connecting) {
    return 'disconnected';
  }
  
  if (status.connecting) {
    return 'connecting';
  }
  
  if (status.error) {
    return 'error';
  }
  
  if (status.reconnectAttempts > 3) {
    return 'unstable';
  }
  
  // Check heartbeat latency
  if (status.lastPing && status.lastPong) {
    const pingTime = new Date(status.lastPong) - new Date(status.lastPing);
    if (pingTime > 5000) { // 5 seconds
      return 'poor';
    }
    if (pingTime > 1000) { // 1 second
      return 'fair';
    }
  }
  
  return 'good';
};