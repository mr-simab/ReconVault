// Entity Inspector Component - Entity details and analysis
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RiskBadge, EntityTypeBadge } from '../Common/Badge';
import { 
  formatDate, 
  formatEntityValue, 
  formatConfidence, 
  formatSourceName,
  formatJSON 
} from '../../utils/formatters';

const EntityInspector = ({
  entity,
  activeTab = 'overview',
  onAction = () => {},
  className = ''
}) => {
  const [copiedField, setCopiedField] = useState(null);

  const handleCopy = async (value, field) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleExport = () => {
    onAction('export', entity);
  };

  const handleEdit = () => {
    onAction('edit', entity);
  };

  const handleDelete = () => {
    onAction('delete', entity);
  };

  const renderOverview = () => (
    <div className="space-y-4">
      {/* Entity Header */}
      <div className="p-4 bg-cyber-light bg-opacity-50 rounded-lg border border-cyber-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <EntityTypeBadge type={entity.type} size="md" />
            <RiskBadge level={entity.riskLevel} score={entity.riskScore} />
          </div>
          <div className="flex space-x-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleCopy(entity.id, 'id')}
              className="px-3 py-1 text-xs font-mono rounded border border-cyber-border
                       bg-cyber-dark text-cyber-gray hover:text-neon-cyan hover:border-neon-cyan
                       transition-colors"
            >
              {copiedField === 'id' ? '✓ Copied' : '📋 Copy ID'}
            </motion.button>
          </div>
        </div>
        
        <div className="space-y-2">
          <div>
            <label className="text-xs text-cyber-gray">Entity ID</label>
            <div className="font-mono text-sm text-neon-green break-all">
              {entity.id}
            </div>
          </div>
          
          <div>
            <label className="text-xs text-cyber-gray">Value</label>
            <div className="font-mono text-sm text-neon-cyan break-all">
              {formatEntityValue(entity.value, entity.type)}
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              onClick={() => handleCopy(entity.value, 'value')}
              className="mt-1 text-xs text-cyber-gray hover:text-neon-cyan transition-colors"
            >
              {copiedField === 'value' ? '✓ Copied' : '📋 Copy Value'}
            </motion.button>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-3 bg-cyber-dark rounded-lg border border-cyber-border">
          <div className="text-xs text-cyber-gray mb-1">Confidence</div>
          <div className="text-lg font-mono text-neon-green">
            {formatConfidence(entity.confidence)}
          </div>
        </div>
        
        <div className="p-3 bg-cyber-dark rounded-lg border border-cyber-border">
          <div className="text-xs text-cyber-gray mb-1">Connections</div>
          <div className="text-lg font-mono text-neon-cyan">
            {entity.connections || 0}
          </div>
        </div>
      </div>

      {/* Source & Discovery Info */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-neon-green">Discovery Information</h4>
        
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-cyber-gray">Source:</span>
            <span className="text-xs font-mono text-neon-cyan">
              {formatSourceName(entity.source)}
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-xs text-cyber-gray">Discovered:</span>
            <span className="text-xs font-mono text-neon-green">
              {formatDate(entity.created_at, 'relative')}
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-xs text-cyber-gray">Last Updated:</span>
            <span className="text-xs font-mono text-neon-green">
              {formatDate(entity.updated_at, 'relative')}
            </span>
          </div>
        </div>
      </div>

      {/* Risk Assessment Preview */}
      <div className="p-3 bg-cyber-dark rounded-lg border border-cyber-border">
        <h4 className="text-sm font-medium text-neon-green mb-2">Risk Assessment</h4>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-cyber-gray">Risk Score:</span>
            <RiskBadge level={entity.riskLevel} score={entity.riskScore} size="sm" />
          </div>
          
          {entity.riskFactors && entity.riskFactors.length > 0 && (
            <div>
              <div className="text-xs text-cyber-gray mb-1">Risk Factors:</div>
              <div className="space-y-1">
                {entity.riskFactors.slice(0, 3).map((factor, index) => (
                  <div key={index} className="text-xs text-warning-yellow">
                    • {factor.description || factor}
                  </div>
                ))}
                {entity.riskFactors.length > 3 && (
                  <div className="text-xs text-cyber-gray">
                    +{entity.riskFactors.length - 3} more factors
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderMetadata = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="text-sm font-medium text-neon-green">Metadata</h4>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => handleCopy(formatJSON(entity.metadata), 'metadata')}
          className="px-3 py-1 text-xs font-mono rounded border border-cyber-border
                   bg-cyber-dark text-cyber-gray hover:text-neon-cyan hover:border-neon-cyan
                   transition-colors"
        >
          {copiedField === 'metadata' ? '✓ Copied' : '📋 Copy JSON'}
        </motion.button>
      </div>
      
      <div className="p-4 bg-cyber-black rounded-lg border border-cyber-border overflow-x-auto">
        <pre className="text-xs font-mono text-neon-green whitespace-pre-wrap">
          {formatJSON(entity.metadata || {}, 2)}
        </pre>
      </div>

      {/* Additional Entity Properties */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-neon-green">Properties</h4>
        
        {Object.entries(entity)
          .filter(([key]) => !['id', 'value', 'type', 'source', 'confidence', 'riskLevel', 'riskScore', 'metadata', 'created_at', 'updated_at'].includes(key))
          .map(([key, value]) => (
            <div key={key} className="flex justify-between items-center p-2 bg-cyber-dark rounded border border-cyber-border">
              <span className="text-xs text-cyber-gray">{key.replace(/_/g, ' ')}:</span>
              <span className="text-xs font-mono text-neon-cyan">
                {typeof value === 'object' ? formatJSON(value) : String(value)}
              </span>
            </div>
          ))}
      </div>
    </div>
  );

  const renderRelationships = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="text-sm font-medium text-neon-green">Connected Entities</h4>
        <span className="text-xs text-cyber-gray">
          {entity.connections || 0} connections
        </span>
      </div>

      {entity.relationships && entity.relationships.length > 0 ? (
        <div className="space-y-2">
          {entity.relationships.slice(0, 10).map((rel, index) => (
            <motion.div
              key={index}
              whileHover={{ scale: 1.02 }}
              className="p-3 bg-cyber-dark rounded-lg border border-cyber-border hover:border-neon-cyan transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <EntityTypeBadge type={rel.type} size="sm" />
                  <span className="text-xs font-mono text-neon-cyan">
                    {formatEntityValue(rel.value, rel.type)}
                  </span>
                </div>
                <RiskBadge level={rel.riskLevel} score={rel.riskScore} size="sm" />
              </div>
              
              <div className="flex justify-between text-xs text-cyber-gray">
                <span>{rel.relationship_type}</span>
                <span>Confidence: {formatConfidence(rel.confidence)}</span>
              </div>
            </motion.div>
          ))}
          
          {entity.relationships.length > 10 && (
            <div className="text-center text-xs text-cyber-gray">
              +{entity.relationships.length - 10} more connections
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8 text-cyber-gray">
          <span className="text-2xl block mb-2">🔗</span>
          <p className="text-sm">No connections found</p>
        </div>
      )}
    </div>
  );

  const renderRisk = () => (
    <div className="space-y-4">
      <div className="p-4 bg-cyber-dark rounded-lg border border-cyber-border">
        <div className="text-center mb-4">
          <div className="text-2xl font-bold text-neon-green mb-2">
            {Math.round((entity.riskScore || 0) * 100)}%
          </div>
          <RiskBadge level={entity.riskLevel} score={entity.riskScore} />
        </div>
        
        {/* Risk Score Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-cyber-gray">
            <span>Risk Score</span>
            <span>{entity.riskScore?.toFixed(3) || 'N/A'}</span>
          </div>
          <div className="progress-cyber">
            <motion.div
              className={`progress-cyber-bar ${entity.riskLevel?.toLowerCase() || 'info'}`}
              initial={{ width: 0 }}
              animate={{ width: `${(entity.riskScore || 0) * 100}%` }}
              transition={{ duration: 1 }}
            />
          </div>
        </div>
      </div>

      {/* Risk Factors */}
      {entity.riskFactors && entity.riskFactors.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-neon-green">Risk Factors</h4>
          <div className="space-y-2">
            {entity.riskFactors.map((factor, index) => (
              <div key={index} className="p-3 bg-cyber-light bg-opacity-30 rounded border border-cyber-border">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-xs">
                    {factor.severity === 'critical' ? '🚨' :
                     factor.severity === 'high' ? '⚠️' :
                     factor.severity === 'medium' ? '⚡' : 'ℹ️'}
                  </span>
                  <span className="text-xs font-medium text-neon-cyan">
                    {factor.type || 'General'}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded ${
                    factor.severity === 'critical' ? 'bg-danger-red text-white' :
                    factor.severity === 'high' ? 'bg-neon-orange text-cyber-black' :
                    factor.severity === 'medium' ? 'bg-warning-yellow text-cyber-black' :
                    'bg-neon-cyan text-cyber-black'
                  }`}>
                    {factor.severity?.toUpperCase() || 'INFO'}
                  </span>
                </div>
                <p className="text-xs text-cyber-gray">
                  {factor.description || factor}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Risk Timeline */}
      {entity.riskHistory && entity.riskHistory.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-neon-green">Risk History</h4>
          <div className="space-y-2">
            {entity.riskHistory.slice(0, 5).map((entry, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-cyber-light bg-opacity-30 rounded border border-cyber-border">
                <span className="text-xs text-cyber-gray">
                  {formatDate(entry.date, 'short')}
                </span>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-mono text-neon-green">
                    {Math.round(entry.score * 100)}%
                  </span>
                  <RiskBadge level={entry.level} size="sm" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderHistory = () => (
    <div className="space-y-4">
      <h4 className="text-sm font-medium text-neon-green">Discovery Timeline</h4>
      
      <div className="space-y-3">
        <div className="flex items-center space-x-3 p-3 bg-cyber-dark rounded-lg border border-cyber-border">
          <div className="w-3 h-3 bg-neon-green rounded-full"></div>
          <div className="flex-1">
            <div className="text-xs font-mono text-neon-green">Entity Discovered</div>
            <div className="text-xs text-cyber-gray">
              {formatDate(entity.created_at, 'datetime')}
            </div>
          </div>
        </div>
        
        {entity.updated_at !== entity.created_at && (
          <div className="flex items-center space-x-3 p-3 bg-cyber-dark rounded-lg border border-cyber-border">
            <div className="w-3 h-3 bg-neon-cyan rounded-full"></div>
            <div className="flex-1">
              <div className="text-xs font-mono text-neon-cyan">Last Updated</div>
              <div className="text-xs text-cyber-gray">
                {formatDate(entity.updated_at, 'datetime')}
              </div>
            </div>
          </div>
        )}
        
        {/* Mock history entries */}
        {[
          { action: 'Risk assessment updated', date: entity.updated_at, type: 'update' },
          { action: 'New connections discovered', date: entity.updated_at, type: 'connection' },
          { action: 'Source verification', date: entity.created_at, type: 'verify' }
        ].map((entry, index) => (
          <div key={index} className="flex items-center space-x-3 p-3 bg-cyber-light bg-opacity-30 rounded border border-cyber-border">
            <div className={`w-3 h-3 rounded-full ${
              entry.type === 'update' ? 'bg-neon-cyan' :
              entry.type === 'connection' ? 'bg-neon-purple' :
              'bg-warning-yellow'
            }`}></div>
            <div className="flex-1">
              <div className="text-xs font-mono text-neon-green">{entry.action}</div>
              <div className="text-xs text-cyber-gray">
                {formatDate(entry.date, 'relative')}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const tabContent = {
    overview: renderOverview,
    metadata: renderMetadata,
    relationships: renderRelationships,
    risk: renderRisk,
    history: renderHistory
  };

  const CurrentTabContent = tabContent[activeTab] || tabContent.overview;

  return (
    <div className={className}>
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
        >
          <CurrentTabContent />
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default EntityInspector;