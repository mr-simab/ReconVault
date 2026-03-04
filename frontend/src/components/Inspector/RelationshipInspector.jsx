// Relationship Inspector Component - Relationship details
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RiskBadge, EntityTypeBadge } from '../Common/Badge';
import { 
  formatDate, 
  formatConfidence, 
  formatRelationshipType,
  formatJSON 
} from '../../utils/formatters';

const RelationshipInspector = ({
  relationship,
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

  const handleEdit = () => {
    onAction('edit', relationship);
  };

  const handleDelete = () => {
    onAction('delete', relationship);
  };

  const renderOverview = () => (
    <div className="space-y-4">
      {/* Relationship Header */}
      <div className="p-4 bg-cyber-light bg-opacity-50 rounded-lg border border-cyber-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <EntityTypeBadge type={relationship.source_type || 'UNKNOWN'} size="sm" />
              <span className="text-neon-green">→</span>
              <EntityTypeBadge type={relationship.target_type || 'UNKNOWN'} size="sm" />
            </div>
          </div>
          <div className="flex space-x-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleCopy(relationship.id, 'id')}
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
            <label className="text-xs text-cyber-gray">Relationship ID</label>
            <div className="font-mono text-sm text-neon-green break-all">
              {relationship.id}
            </div>
          </div>
          
          <div>
            <label className="text-xs text-cyber-gray">Type</label>
            <div className="font-mono text-sm text-neon-cyan">
              {formatRelationshipType(relationship.type)}
            </div>
          </div>
        </div>
      </div>

      {/* Connected Entities */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-neon-green">Connected Entities</h4>
        
        <div className="grid grid-cols-2 gap-4">
          {/* Source Entity */}
          <div className="p-3 bg-cyber-dark rounded-lg border border-cyber-border">
            <div className="text-xs text-cyber-gray mb-2">Source Entity</div>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <EntityTypeBadge type={relationship.source_type} size="sm" />
                <RiskBadge level={relationship.source_risk_level} score={relationship.source_risk_score} size="sm" />
              </div>
              <div className="font-mono text-xs text-neon-green break-all">
                {relationship.source_value || relationship.source_id}
              </div>
              <div className="text-xs text-cyber-gray">
                ID: {relationship.source_id}
              </div>
            </div>
          </div>
          
          {/* Target Entity */}
          <div className="p-3 bg-cyber-dark rounded-lg border border-cyber-border">
            <div className="text-xs text-cyber-gray mb-2">Target Entity</div>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <EntityTypeBadge type={relationship.target_type} size="sm" />
                <RiskBadge level={relationship.target_risk_level} score={relationship.target_risk_score} size="sm" />
              </div>
              <div className="font-mono text-xs text-neon-green break-all">
                {relationship.target_value || relationship.target_id}
              </div>
              <div className="text-xs text-cyber-gray">
                ID: {relationship.target_id}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-3 bg-cyber-dark rounded-lg border border-cyber-border">
          <div className="text-xs text-cyber-gray mb-1">Confidence</div>
          <div className="text-lg font-mono text-neon-green">
            {formatConfidence(relationship.confidence)}
          </div>
          <div className="text-xs text-cyber-gray mt-1">
            {relationship.confidence ? relationship.confidence.toFixed(3) : 'N/A'}
          </div>
        </div>
        
        <div className="p-3 bg-cyber-dark rounded-lg border border-cyber-border">
          <div className="text-xs text-cyber-gray mb-1">Strength</div>
          <div className="text-lg font-mono text-neon-cyan">
            {relationship.strength || 'N/A'}
          </div>
          <div className="text-xs text-cyber-gray mt-1">
            Relationship Weight
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
              {relationship.source || 'Unknown'}
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-xs text-cyber-gray">Discovered:</span>
            <span className="text-xs font-mono text-neon-green">
              {formatDate(relationship.created_at, 'relative')}
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-xs text-cyber-gray">Last Updated:</span>
            <span className="text-xs font-mono text-neon-green">
              {formatDate(relationship.updated_at, 'relative')}
            </span>
          </div>
        </div>
      </div>

      {/* Relationship Properties */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-neon-green">Properties</h4>
        
        {[
          { key: 'bidirectional', label: 'Bidirectional', value: relationship.bidirectional },
          { key: 'verified', label: 'Verified', value: relationship.verified },
          { key: 'last_verified', label: 'Last Verified', value: relationship.last_verified },
          { key: 'evidence_count', label: 'Evidence Count', value: relationship.evidence_count }
        ].filter(prop => prop.value !== undefined && prop.value !== null).map((prop) => (
          <div key={prop.key} className="flex justify-between items-center p-2 bg-cyber-dark rounded border border-cyber-border">
            <span className="text-xs text-cyber-gray">{prop.label}:</span>
            <span className="text-xs font-mono text-neon-cyan">
              {typeof prop.value === 'boolean' ? (prop.value ? 'Yes' : 'No') : 
               typeof prop.value === 'string' && prop.value.includes('T') ? 
                 formatDate(prop.value, 'short') : String(prop.value)}
            </span>
          </div>
        ))}
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
          onClick={() => handleCopy(formatJSON(relationship.metadata), 'metadata')}
          className="px-3 py-1 text-xs font-mono rounded border border-cyber-border
                   bg-cyber-dark text-cyber-gray hover:text-neon-cyan hover:border-neon-cyan
                   transition-colors"
        >
          {copiedField === 'metadata' ? '✓ Copied' : '📋 Copy JSON'}
        </motion.button>
      </div>
      
      <div className="p-4 bg-cyber-black rounded-lg border border-cyber-border overflow-x-auto">
        <pre className="text-xs font-mono text-neon-green whitespace-pre-wrap">
          {formatJSON(relationship.metadata || {}, 2)}
        </pre>
      </div>

      {/* Evidence */}
      {relationship.evidence && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-neon-green">Evidence</h4>
          <div className="space-y-2">
            {relationship.evidence.map((evidence, index) => (
              <div key={index} className="p-3 bg-cyber-dark rounded border border-cyber-border">
                <div className="text-xs font-mono text-neon-cyan mb-1">
                  {evidence.type || 'Evidence'}
                </div>
                <div className="text-xs text-cyber-gray">
                  {evidence.description || evidence.content}
                </div>
                {evidence.date && (
                  <div className="text-xs text-cyber-gray mt-1">
                    {formatDate(evidence.date, 'relative')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderProperties = () => (
    <div className="space-y-4">
      <h4 className="text-sm font-medium text-neon-green">All Properties</h4>
      
      <div className="space-y-2">
        {Object.entries(relationship)
          .filter(([key]) => !['metadata', 'evidence'].includes(key))
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

  const renderHistory = () => (
    <div className="space-y-4">
      <h4 className="text-sm font-medium text-neon-green">Relationship Timeline</h4>
      
      <div className="space-y-3">
        <div className="flex items-center space-x-3 p-3 bg-cyber-dark rounded-lg border border-cyber-border">
          <div className="w-3 h-3 bg-neon-green rounded-full"></div>
          <div className="flex-1">
            <div className="text-xs font-mono text-neon-green">Relationship Discovered</div>
            <div className="text-xs text-cyber-gray">
              {formatDate(relationship.created_at, 'datetime')}
            </div>
          </div>
        </div>
        
        {relationship.updated_at !== relationship.created_at && (
          <div className="flex items-center space-x-3 p-3 bg-cyber-dark rounded-lg border border-cyber-border">
            <div className="w-3 h-3 bg-neon-cyan rounded-full"></div>
            <div className="flex-1">
              <div className="text-xs font-mono text-neon-cyan">Last Updated</div>
              <div className="text-xs text-cyber-gray">
                {formatDate(relationship.updated_at, 'datetime')}
              </div>
            </div>
          </div>
        )}
        
        {/* Mock history entries */}
        {[
          { action: 'Confidence score updated', date: relationship.updated_at, type: 'update' },
          { action: 'Evidence added', date: relationship.updated_at, type: 'evidence' },
          { action: 'Relationship verified', date: relationship.updated_at, type: 'verify' }
        ].map((entry, index) => (
          <div key={index} className="flex items-center space-x-3 p-3 bg-cyber-light bg-opacity-30 rounded border border-cyber-border">
            <div className={`w-3 h-3 rounded-full ${
              entry.type === 'update' ? 'bg-neon-cyan' :
              entry.type === 'evidence' ? 'bg-neon-purple' :
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
    properties: renderProperties,
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

export default RelationshipInspector;