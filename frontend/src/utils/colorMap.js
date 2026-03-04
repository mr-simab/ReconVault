// Entity type to color and icon mapping
export const ENTITY_TYPE_MAP = {
  USERNAME: { 
    color: '#00d9ff', 
    icon: '👤',
    glow: 'glow-cyan'
  },
  EMAIL: { 
    color: '#ff006e', 
    icon: '✉️',
    glow: 'glow-red'
  },
  DOMAIN: { 
    color: '#00ff41', 
    icon: '🌐',
    glow: 'glow-green'
  },
  IP_ADDRESS: { 
    color: '#ffaa00', 
    icon: '🔗',
    glow: 'glow-yellow'
  },
  ORG: { 
    color: '#8f00ff', 
    icon: '🏢',
    glow: 'glow-purple'
  },
  PHONE: { 
    color: '#ff6600', 
    icon: '☎️',
    glow: 'glow-orange'
  },
  HASH: { 
    color: '#ff0033', 
    icon: '#️⃣',
    glow: 'glow-red'
  },
  URL: { 
    color: '#00ff41', 
    icon: '🔗',
    glow: 'glow-green'
  },
  SOCIAL_PROFILE: { 
    color: '#00d9ff', 
    icon: '📱',
    glow: 'glow-cyan'
  },
  DOCUMENT: { 
    color: '#8f00ff', 
    icon: '📄',
    glow: 'glow-purple'
  },
  DEVICE: { 
    color: '#ff6600', 
    icon: '💻',
    glow: 'glow-orange'
  },
  NETWORK: { 
    color: '#ffaa00', 
    icon: '🌐',
    glow: 'glow-yellow'
  },
  UNKNOWN: { 
    color: '#888888', 
    icon: '❓',
    glow: 'glow-gray'
  }
};

// Risk level to color mapping
export const RISK_LEVEL_MAP = {
  CRITICAL: { 
    color: '#ff0033', 
    glow: 'glow-red',
    priority: 5
  },
  HIGH: { 
    color: '#ff6600', 
    glow: 'glow-orange',
    priority: 4
  },
  MEDIUM: { 
    color: '#ffaa00', 
    glow: 'glow-yellow',
    priority: 3
  },
  LOW: { 
    color: '#00dd00', 
    glow: 'glow-green',
    priority: 2
  },
  INFO: { 
    color: '#00d9ff', 
    glow: 'glow-cyan',
    priority: 1
  }
};

// Relationship type to color mapping
export const RELATIONSHIP_TYPE_MAP = {
  'RELATED_TO': { 
    color: '#888888', 
    icon: '↔️' 
  },
  'MENTIONS': { 
    color: '#00d9ff', 
    icon: '💬' 
  },
  'OWNS': { 
    color: '#ff006e', 
    icon: '👑' 
  },
  'OPERATES': { 
    color: '#00ff41', 
    icon: '⚙️' 
  },
  'COMMUNICATES_WITH': { 
    color: '#8f00ff', 
    icon: '📡' 
  },
  'LOCATED_AT': { 
    color: '#ffaa00', 
    icon: '📍' 
  },
  'PART_OF': { 
    color: '#ff6600', 
    icon: '🏗️' 
  },
  'SUBSIDIARY_OF': { 
    color: '#00d9ff', 
    icon: '🏢' 
  },
  'DEPENDS_ON': { 
    color: '#ff0033', 
    icon: '🔗' 
  },
  'PROVIDES': { 
    color: '#00ff41', 
    icon: '🛠️' 
  }
};

// Get entity type configuration
export const getEntityTypeConfig = (type) => {
  return ENTITY_TYPE_MAP[type?.toUpperCase()] || ENTITY_TYPE_MAP.UNKNOWN;
};

// Get risk level configuration
export const getRiskLevelConfig = (level) => {
  return RISK_LEVEL_MAP[level?.toUpperCase()] || RISK_LEVEL_MAP.INFO;
};

// Get relationship type configuration
export const getRelationshipTypeConfig = (type) => {
  return RELATIONSHIP_TYPE_MAP[type?.toUpperCase()] || RELATIONSHIP_TYPE_MAP.RELATED_TO;
};

// Calculate node size based on connections
export const calculateNodeSize = (connections = 0) => {
  const baseSize = 8;
  const sizePerConnection = 2;
  const maxSize = 25;
  return Math.min(baseSize + (connections * sizePerConnection), maxSize);
};

// Calculate edge thickness based on confidence
export const calculateEdgeThickness = (confidence = 0) => {
  return Math.max(1, Math.min(5, confidence * 5));
};

// Get confidence level text
export const getConfidenceLevel = (confidence) => {
  if (confidence >= 0.9) return 'Very High';
  if (confidence >= 0.8) return 'High';
  if (confidence >= 0.6) return 'Medium';
  if (confidence >= 0.4) return 'Low';
  return 'Very Low';
};

// Generate color variations for better visualization
export const generateColorVariations = (baseColor, count = 5) => {
  const colors = [];
  for (let i = 0; i < count; i++) {
    const opacity = Math.max(0.3, 1 - (i * 0.15));
    colors.push(`${baseColor}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`);
  }
  return colors;
};

// Get accessible color for text on background
export const getAccessibleTextColor = (backgroundColor) => {
  // Remove # if present
  const color = backgroundColor.replace('#', '');
  
  // Convert to RGB
  const r = parseInt(color.substr(0, 2), 16);
  const g = parseInt(color.substr(2, 2), 16);
  const b = parseInt(color.substr(4, 2), 16);
  
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  return luminance > 0.5 ? '#000000' : '#ffffff';
};

// Generate gradient for risk levels
export const generateRiskGradient = (fromLevel, toLevel) => {
  const fromColor = getRiskLevelConfig(fromLevel).color;
  const toColor = getRiskLevelConfig(toLevel).color;
  
  return `linear-gradient(45deg, ${fromColor}, ${toColor})`;
};

// Export all utilities
export default {
  ENTITY_TYPE_MAP,
  RISK_LEVEL_MAP,
  RELATIONSHIP_TYPE_MAP,
  getEntityTypeConfig,
  getRiskLevelConfig,
  getRelationshipTypeConfig,
  calculateNodeSize,
  calculateEdgeThickness,
  getConfidenceLevel,
  generateColorVariations,
  getAccessibleTextColor,
  generateRiskGradient
};