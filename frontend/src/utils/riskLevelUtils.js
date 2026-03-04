// Risk level calculation utilities

// Risk level constants
export const RISK_LEVELS = {
  CRITICAL: 'CRITICAL',
  HIGH: 'HIGH', 
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
  INFO: 'INFO'
};

// Risk score ranges (0-1)
export const RISK_SCORE_RANGES = {
  [RISK_LEVELS.CRITICAL]: { min: 0.8, max: 1.0 },
  [RISK_LEVELS.HIGH]: { min: 0.6, max: 0.79 },
  [RISK_LEVELS.MEDIUM]: { min: 0.4, max: 0.59 },
  [RISK_LEVELS.LOW]: { min: 0.2, max: 0.39 },
  [RISK_LEVELS.INFO]: { min: 0.0, max: 0.19 }
};

// Entity type risk weights
export const ENTITY_TYPE_RISK_WEIGHTS = {
  USERNAME: 0.3,
  EMAIL: 0.4,
  DOMAIN: 0.5,
  IP_ADDRESS: 0.6,
  ORG: 0.4,
  PHONE: 0.3,
  HASH: 0.7,
  URL: 0.5,
  SOCIAL_PROFILE: 0.4,
  DOCUMENT: 0.6,
  DEVICE: 0.5,
  NETWORK: 0.6,
  UNKNOWN: 0.5
};

// Source reliability weights
export const SOURCE_RELIABILITY_WEIGHTS = {
  'HIGH': 0.9,
  'MEDIUM': 0.7,
  'LOW': 0.5,
  'UNKNOWN': 0.5
};

// Calculate risk score based on multiple factors
export const calculateRiskScore = ({
  entityType = 'UNKNOWN',
  confidence = 0.5,
  source = 'UNKNOWN',
  connections = [],
  metadata = {}
}) => {
  const typeWeight = ENTITY_TYPE_RISK_WEIGHTS[entityType?.toUpperCase()] || 0.5;
  const sourceWeight = SOURCE_RELIABILITY_WEIGHTS[source?.toUpperCase()] || 0.5;
  
  // Base score from entity type and confidence
  let score = typeWeight * confidence;
  
  // Adjust based on source reliability
  score *= sourceWeight;
  
  // Consider connection risk
  if (connections.length > 0) {
    const avgConnectionRisk = connections.reduce((sum, conn) => {
      return sum + (conn.riskScore || 0.5);
    }, 0) / connections.length;
    
    // Boost score if connected to high-risk entities
    score = Math.min(1.0, score + (avgConnectionRisk * 0.3));
  }
  
  // Special handling for certain metadata
  if (metadata.isMalicious === true) {
    score = Math.max(score, 0.9);
  }
  
  if (metadata.isSuspicious === true) {
    score = Math.min(1.0, score + 0.2);
  }
  
  // Ensure score is within bounds
  return Math.max(0, Math.min(1, score));
};

// Determine risk level from score
export const getRiskLevelFromScore = (score) => {
  for (const [level, range] of Object.entries(RISK_SCORE_RANGES)) {
    if (score >= range.min && score <= range.max) {
      return level;
    }
  }
  return RISK_LEVELS.INFO;
};

// Calculate risk score with detailed breakdown
export const calculateDetailedRiskScore = (entityData) => {
  const baseScore = calculateRiskScore(entityData);
  const riskLevel = getRiskLevelFromScore(baseScore);
  
  const breakdown = {
    baseScore,
    riskLevel,
    factors: []
  };
  
  // Add contributing factors
  if (entityData.entityType) {
    breakdown.factors.push({
      factor: 'Entity Type',
      value: entityData.entityType,
      weight: ENTITY_TYPE_RISK_WEIGHTS[entityData.entityType?.toUpperCase()] || 0.5,
      contribution: (ENTITY_TYPE_RISK_WEIGHTS[entityData.entityType?.toUpperCase()] || 0.5) * 0.3
    });
  }
  
  if (entityData.confidence !== undefined) {
    breakdown.factors.push({
      factor: 'Confidence',
      value: entityData.confidence,
      weight: entityData.confidence,
      contribution: entityData.confidence * 0.4
    });
  }
  
  if (entityData.source) {
    breakdown.factors.push({
      factor: 'Source Reliability',
      value: entityData.source,
      weight: SOURCE_RELIABILITY_WEIGHTS[entityData.source?.toUpperCase()] || 0.5,
      contribution: (SOURCE_RELIABILITY_WEIGHTS[entityData.source?.toUpperCase()] || 0.5) * 0.2
    });
  }
  
  if (entityData.connections?.length > 0) {
    const avgConnectionRisk = entityData.connections.reduce((sum, conn) => {
      return sum + (conn.riskScore || 0.5);
    }, 0) / entityData.connections.length;
    
    breakdown.factors.push({
      factor: 'Connected Entities',
      value: `${entityData.connections.length} connections`,
      weight: avgConnectionRisk,
      contribution: avgConnectionRisk * 0.1
    });
  }
  
  return breakdown;
};

// Get risk factors for an entity
export const getRiskFactors = (entityData) => {
  const factors = [];
  
  // Entity type based risks
  if (['HASH', 'IP_ADDRESS'].includes(entityData.entityType?.toUpperCase())) {
    factors.push({
      type: 'technical',
      severity: 'medium',
      description: 'Technical identifier with potential for malicious use'
    });
  }
  
  // Low confidence risks
  if (entityData.confidence < 0.5) {
    factors.push({
      type: 'reliability',
      severity: 'low',
      description: 'Low confidence score - data may be unreliable'
    });
  }
  
  // Unknown source risks
  if (entityData.source === 'UNKNOWN') {
    factors.push({
      type: 'source',
      severity: 'medium',
      description: 'Unknown or unverified data source'
    });
  }
  
  // Malicious indicators
  if (entityData.metadata?.isMalicious === true) {
    factors.push({
      type: 'security',
      severity: 'critical',
      description: 'Flagged as potentially malicious'
    });
  }
  
  if (entityData.metadata?.isSuspicious === true) {
    factors.push({
      type: 'security',
      severity: 'high',
      description: 'Flagged as suspicious activity'
    });
  }
  
  // High connection count to risky entities
  if (entityData.connections?.length > 10) {
    const highRiskConnections = entityData.connections.filter(conn => 
      getRiskLevelFromScore(conn.riskScore || 0.5) === 'HIGH' ||
      getRiskLevelFromScore(conn.riskScore || 0.5) === 'CRITICAL'
    );
    
    if (highRiskConnections.length > 3) {
      factors.push({
        type: 'network',
        severity: 'medium',
        description: 'Connected to multiple high-risk entities'
      });
    }
  }
  
  return factors;
};

// Compare risk levels
export const compareRiskLevels = (level1, level2) => {
  const priorities = {
    [RISK_LEVELS.CRITICAL]: 5,
    [RISK_LEVELS.HIGH]: 4,
    [RISK_LEVELS.MEDIUM]: 3,
    [RISK_LEVELS.LOW]: 2,
    [RISK_LEVELS.INFO]: 1
  };
  
  const priority1 = priorities[level1?.toUpperCase()] || 1;
  const priority2 = priorities[level2?.toUpperCase()] || 1;
  
  return priority1 - priority2;
};

// Sort entities by risk level
export const sortEntitiesByRisk = (entities, ascending = false) => {
  return [...entities].sort((a, b) => {
    const riskA = getRiskLevelFromScore(a.riskScore || 0.5);
    const riskB = getRiskLevelFromScore(b.riskScore || 0.5);
    const comparison = compareRiskLevels(riskA, riskB);
    return ascending ? comparison : -comparison;
  });
};

// Get risk level color
export const getRiskLevelColor = (level) => {
  const colorMap = {
    [RISK_LEVELS.CRITICAL]: '#ff0033',
    [RISK_LEVELS.HIGH]: '#ff6600',
    [RISK_LEVELS.MEDIUM]: '#ffaa00',
    [RISK_LEVELS.LOW]: '#00dd00',
    [RISK_LEVELS.INFO]: '#00d9ff'
  };
  
  return colorMap[level?.toUpperCase()] || colorMap[RISK_LEVELS.INFO];
};

// Get risk level display name
export const getRiskLevelDisplayName = (level) => {
  const displayNames = {
    [RISK_LEVELS.CRITICAL]: 'Critical',
    [RISK_LEVELS.HIGH]: 'High',
    [RISK_LEVELS.MEDIUM]: 'Medium',
    [RISK_LEVELS.LOW]: 'Low',
    [RISK_LEVELS.INFO]: 'Info'
  };
  
  return displayNames[level?.toUpperCase()] || 'Info';
};

// Generate risk timeline data
export const generateRiskTimeline = (entity, days = 30) => {
  const timeline = [];
  const baseScore = entity.riskScore || 0.5;
  
  for (let i = days; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    // Simulate some variation in risk over time
    const variation = (Math.random() - 0.5) * 0.2; // ±0.1 variation
    const score = Math.max(0, Math.min(1, baseScore + variation));
    
    timeline.push({
      date: date.toISOString().split('T')[0],
      score,
      level: getRiskLevelFromScore(score)
    });
  }
  
  return timeline;
};

// Export all utilities
export default {
  RISK_LEVELS,
  RISK_SCORE_RANGES,
  ENTITY_TYPE_RISK_WEIGHTS,
  SOURCE_RELIABILITY_WEIGHTS,
  calculateRiskScore,
  getRiskLevelFromScore,
  calculateDetailedRiskScore,
  getRiskFactors,
  compareRiskLevels,
  sortEntitiesByRisk,
  getRiskLevelColor,
  getRiskLevelDisplayName,
  generateRiskTimeline
};