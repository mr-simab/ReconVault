// Application constants

const isBrowser = typeof window !== 'undefined';

const resolveApiBaseUrl = () => {
  if (import.meta.env.VITE_API_BASE_URL) return import.meta.env.VITE_API_BASE_URL;
  return '/api/v1';
};

const resolveWsBaseUrl = () => {
  if (import.meta.env.VITE_WS_URL) return import.meta.env.VITE_WS_URL;
  if (!isBrowser) return 'ws://localhost:8000';
  const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${wsProto}//${window.location.host}`;
};

// API Configuration
export const API_CONFIG = {
  BASE_URL: resolveApiBaseUrl(),
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000
};

// WebSocket Configuration
export const WEBSOCKET_CONFIG = {
  // Base origin only. Path is appended below.
  URL: resolveWsBaseUrl(),
  PATH: '/ws/intelligence',
  RECONNECT_INTERVAL: 5000,
  MAX_RECONNECT_ATTEMPTS: 10,
  HEARTBEAT_INTERVAL: 30000
};

// Graph Configuration
export const GRAPH_CONFIG = {
  NODE_SIZE: {
    MIN: 8,
    MAX: 25,
    SCALE_FACTOR: 2
  },
  EDGE_THICKNESS: {
    MIN: 1,
    MAX: 5,
    SCALE_FACTOR: 5
  },
  FORCE_SIMULATION: {
    LINK_DISTANCE: 80,
    CHARGE_STRENGTH: -300,
    CENTER_STRENGTH: 0.1,
    COLLISION_RADIUS: 20
  },
  COLORS: {
    CRITICAL: '#ff0033',
    HIGH: '#ff6600',
    MEDIUM: '#ffaa00',
    LOW: '#00dd00',
    INFO: '#00d9ff'
  }
};

// Entity Types
export const ENTITY_TYPES = [
  'USERNAME',
  'EMAIL', 
  'DOMAIN',
  'IP_ADDRESS',
  'ORG',
  'PHONE',
  'HASH',
  'URL',
  'SOCIAL_PROFILE',
  'DOCUMENT',
  'DEVICE',
  'NETWORK',
  'UNKNOWN'
];

// Relationship Types
export const RELATIONSHIP_TYPES = [
  'RELATED_TO',
  'MENTIONS',
  'OWNS',
  'OPERATES',
  'COMMUNICATES_WITH',
  'LOCATED_AT',
  'PART_OF',
  'SUBSIDIARY_OF',
  'DEPENDS_ON',
  'PROVIDES'
];

// Collection Types
export const COLLECTION_TYPES = [
  'web',
  'social',
  'domain',
  'ip',
  'email',
  'media',
  'darkweb'
];

// Risk Levels
export const RISK_LEVELS = [
  'CRITICAL',
  'HIGH',
  'MEDIUM',
  'LOW',
  'INFO'
];

// Source Types
export const SOURCE_TYPES = [
  'MANUAL',
  'WEB_SCRAPER',
  'SOCIAL_MEDIA',
  'DNS_LOOKUP',
  'WHOIS',
  'SHODAN',
  'CENSYS',
  'VIRUSTOTAL',
  'UNKNOWN'
];

// Task Status
export const TASK_STATUS = [
  'PENDING',
  'RUNNING',
  'COMPLETED',
  'FAILED',
  'CANCELLED'
];

// UI Constants
export const UI_CONFIG = {
  SIDEBAR_WIDTH: {
    COLLAPSED: 60,
    EXPANDED: 300,
    MOBILE: '100vw'
  },
  PANEL_HEIGHT: {
    HEADER: 64,
    FOOTER: 80,
    MIN_CONTENT: 400
  },
  ANIMATION_DURATION: {
    FAST: 150,
    NORMAL: 300,
    SLOW: 500
  },
  BREAKPOINTS: {
    MOBILE: 768,
    TABLET: 1024,
    DESKTOP: 1920
  },
  Z_INDEX: {
    MODAL: 1000,
    DROPDOWN: 999,
    TOOLTIP: 1001,
    GRAPH_CONTROLS: 1000,
    FULLSCREEN: 9999
  }
};

// Storage Keys
export const STORAGE_KEYS = {
  USER_PREFERENCES: 'reconvault:user:preferences',
  GRAPH_SETTINGS: 'reconvault:graph:settings',
  SIDEBAR_STATE: 'reconvault:ui:sidebar',
  THEME: 'reconvault:ui:theme',
  API_TOKEN: 'reconvault:auth:token',
  CACHE: {
    GRAPH_DATA: 'reconvault:cache:graph',
    ENTITIES: 'reconvault:cache:entities',
    RELATIONSHIPS: 'reconvault:cache:relationships'
  }
};

// Performance Thresholds
export const PERFORMANCE = {
  MAX_NODES: 1000,
  MAX_EDGES: 5000,
  FPS_TARGET: 60,
  RENDER_DEBOUNCE: 100,
  SEARCH_DEBOUNCE: 300,
  RESIZE_THROTTLE: 250
};

// Validation Rules
export const VALIDATION = {
  ENTITY_VALUE: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 500
  },
  COLLECTION_TARGET: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 200
  },
  SEARCH_QUERY: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 100
  }
};

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK: 'Network error occurred',
  UNAUTHORIZED: 'You are not authorized to perform this action',
  NOT_FOUND: 'The requested resource was not found',
  SERVER_ERROR: 'Server error occurred',
  VALIDATION: 'Validation error occurred',
  TIMEOUT: 'Request timeout',
  UNKNOWN: 'An unknown error occurred'
};

// Success Messages
export const SUCCESS_MESSAGES = {
  ENTITY_CREATED: 'Entity created successfully',
  ENTITY_UPDATED: 'Entity updated successfully',
  ENTITY_DELETED: 'Entity deleted successfully',
  COLLECTION_STARTED: 'Collection task started',
  COLLECTION_COMPLETED: 'Collection task completed',
  GRAPH_EXPORTED: 'Graph data exported successfully',
  SETTINGS_SAVED: 'Settings saved successfully'
};

// Local Storage Helpers
export const getLocalStorageItem = (key, defaultValue = null) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.warn('Error reading from localStorage:', error);
    return defaultValue;
  }
};

export const setLocalStorageItem = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.warn('Error writing to localStorage:', error);
    return false;
  }
};

export const removeLocalStorageItem = (key) => {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.warn('Error removing from localStorage:', error);
    return false;
  }
};

// Export all constants
export default {
  API_CONFIG,
  WEBSOCKET_CONFIG,
  GRAPH_CONFIG,
  ENTITY_TYPES,
  RELATIONSHIP_TYPES,
  COLLECTION_TYPES,
  RISK_LEVELS,
  SOURCE_TYPES,
  TASK_STATUS,
  UI_CONFIG,
  STORAGE_KEYS,
  PERFORMANCE,
  VALIDATION,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  getLocalStorageItem,
  setLocalStorageItem,
  removeLocalStorageItem
};
