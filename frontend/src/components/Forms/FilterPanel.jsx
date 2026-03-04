// Filter Panel Component - Graph filtering controls
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ENTITY_TYPES, RELATIONSHIP_TYPES, RISK_LEVELS, SOURCE_TYPES } from '../../utils/constants';

const FilterPanel = ({
  activeFilters = {},
  onFiltersChange = () => {},
  onApplyFilters = () => {},
  onClearFilters = () => {},
  className = ''
}) => {
  const [filters, setFilters] = useState({
    nodeTypes: activeFilters.nodeTypes || [],
    riskLevels: activeFilters.riskLevels || [],
    relationshipTypes: activeFilters.relationshipTypes || [],
    sources: activeFilters.sources || [],
    confidenceRange: activeFilters.confidenceRange || { min: 0, max: 1 },
    dateRange: activeFilters.dateRange || { start: null, end: null },
    customFilters: activeFilters.customFilters || {}
  });

  const [isExpanded, setIsExpanded] = useState({
    nodeTypes: false,
    riskLevels: false,
    relationshipTypes: false,
    sources: false,
    confidence: false,
    dateRange: false,
    custom: false
  });

  const handleFilterChange = (category, value, checked) => {
    const newFilters = { ...filters };
    
    if (category === 'confidenceRange') {
      newFilters.confidenceRange = value;
    } else if (category === 'dateRange') {
      newFilters.dateRange = value;
    } else {
      if (checked) {
        newFilters[category] = [...newFilters[category], value];
      } else {
        newFilters[category] = newFilters[category].filter(item => item !== value);
      }
    }
    
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleApplyFilters = () => {
    onApplyFilters(filters);
  };

  const handleClearFilters = () => {
    const clearedFilters = {
      nodeTypes: [],
      riskLevels: [],
      relationshipTypes: [],
      sources: [],
      confidenceRange: { min: 0, max: 1 },
      dateRange: { start: null, end: null },
      customFilters: {}
    };
    
    setFilters(clearedFilters);
    onClearFilters();
  };

  const toggleSection = (section) => {
    setIsExpanded(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const getFilterCount = () => {
    return filters.nodeTypes.length + 
           filters.riskLevels.length + 
           filters.relationshipTypes.length + 
           filters.sources.length +
           (filters.confidenceRange.min > 0 || filters.confidenceRange.max < 1 ? 1 : 0);
  };

  const filterSections = [
    {
      id: 'nodeTypes',
      title: 'Entity Types',
      icon: '🎯',
      items: ENTITY_TYPES,
      type: 'multi-select'
    },
    {
      id: 'riskLevels',
      title: 'Risk Levels',
      icon: '⚠️',
      items: RISK_LEVELS,
      type: 'multi-select'
    },
    {
      id: 'relationshipTypes',
      title: 'Relationships',
      icon: '🔗',
      items: RELATIONSHIP_TYPES,
      type: 'multi-select'
    },
    {
      id: 'sources',
      title: 'Data Sources',
      icon: '📡',
      items: SOURCE_TYPES,
      type: 'multi-select'
    }
  ];

  const riskLevelColors = {
    CRITICAL: 'text-danger-red border-danger-red',
    HIGH: 'text-neon-orange border-neon-orange',
    MEDIUM: 'text-warning-yellow border-warning-yellow',
    LOW: 'text-safe-green border-safe-green',
    INFO: 'text-neon-cyan border-neon-cyan'
  };

  const entityTypeIcons = {
    USERNAME: '👤',
    EMAIL: '✉️',
    DOMAIN: '🌐',
    IP_ADDRESS: '🔗',
    ORG: '🏢',
    PHONE: '☎️',
    HASH: '#️⃣',
    URL: '🔗',
    SOCIAL_PROFILE: '📱',
    DOCUMENT: '📄',
    DEVICE: '💻',
    NETWORK: '🌐'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`space-y-4 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-neon-green">🔧</span>
          <h3 className="text-sm font-medium text-neon-green">Graph Filters</h3>
          {getFilterCount() > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="px-2 py-1 text-xs bg-neon-cyan text-cyber-black rounded-full font-mono"
            >
              {getFilterCount()}
            </motion.span>
          )}
        </div>
        
        <div className="flex space-x-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleApplyFilters}
            className="
              px-3 py-1 text-xs font-mono rounded border border-neon-green
              text-neon-green hover:bg-neon-green hover:text-cyber-black
              transition-colors
            "
          >
            Apply
          </motion.button>
          {getFilterCount() > 0 && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleClearFilters}
              className="
                px-3 py-1 text-xs font-mono rounded border border-cyber-border
                text-cyber-gray hover:text-danger-red hover:border-danger-red
                transition-colors
              "
            >
              Clear
            </motion.button>
          )}
        </div>
      </div>

      {/* Confidence Range */}
      <div className="space-y-2">
        <motion.button
          whileHover={{ scale: 1.01 }}
          onClick={() => toggleSection('confidence')}
          className="
            w-full flex items-center justify-between p-3 rounded-lg
            border border-cyber-border bg-cyber-light
            hover:border-neon-purple transition-colors
          "
        >
          <div className="flex items-center space-x-2">
            <span>📊</span>
            <span className="text-sm font-medium text-neon-purple">Confidence Range</span>
          </div>
          <span className="text-xs text-cyber-gray">
            {Math.round(filters.confidenceRange.min * 100)}% - {Math.round(filters.confidenceRange.max * 100)}%
          </span>
        </motion.button>
        
        <AnimatePresence>
          {isExpanded.confidence && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-3 bg-cyber-dark rounded border border-cyber-border space-y-3"
            >
              <div className="space-y-2">
                <label className="block text-xs font-medium text-neon-cyan">
                  Minimum Confidence: {Math.round(filters.confidenceRange.min * 100)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={filters.confidenceRange.min}
                  onChange={(e) => handleFilterChange('confidenceRange', 
                    { ...filters.confidenceRange, min: parseFloat(e.target.value) })}
                  className="w-full"
                />
              </div>
              
              <div className="space-y-2">
                <label className="block text-xs font-medium text-neon-cyan">
                  Maximum Confidence: {Math.round(filters.confidenceRange.max * 100)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={filters.confidenceRange.max}
                  onChange={(e) => handleFilterChange('confidenceRange', 
                    { ...filters.confidenceRange, max: parseFloat(e.target.value) })}
                  className="w-full"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Filter Sections */}
      {filterSections.map((section) => (
        <div key={section.id} className="space-y-2">
          <motion.button
            whileHover={{ scale: 1.01 }}
            onClick={() => toggleSection(section.id)}
            className="
              w-full flex items-center justify-between p-3 rounded-lg
              border border-cyber-border bg-cyber-light
              hover:border-neon-cyan transition-colors
            "
          >
            <div className="flex items-center space-x-2">
              <span>{section.icon}</span>
              <span className="text-sm font-medium text-neon-cyan">{section.title}</span>
              {filters[section.id].length > 0 && (
                <span className="px-2 py-1 text-xs bg-neon-cyan text-cyber-black rounded-full font-mono">
                  {filters[section.id].length}
                </span>
              )}
            </div>
            <span className="text-xs text-cyber-gray">
              {isExpanded[section.id] ? '▼' : '▶️'}
            </span>
          </motion.button>
          
          <AnimatePresence>
            {isExpanded[section.id] && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="grid grid-cols-2 gap-2 p-3 bg-cyber-dark rounded border border-cyber-border"
              >
                {section.items.map((item) => {
                  const isSelected = filters[section.id].includes(item);
                  const isRiskLevel = section.id === 'riskLevels';
                  const isEntityType = section.id === 'nodeTypes';
                  
                  return (
                    <motion.label
                      key={item}
                      whileHover={{ scale: 1.02 }}
                      className={`
                        flex items-center space-x-2 p-2 rounded cursor-pointer
                        border transition-all duration-200
                        ${isSelected 
                          ? isRiskLevel 
                            ? `${riskLevelColors[item]} bg-opacity-10`
                            : 'border-neon-cyan text-neon-cyan bg-neon-cyan bg-opacity-10'
                          : 'border-cyber-border text-cyber-gray hover:border-neon-green hover:text-neon-green'
                        }
                      `}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => handleFilterChange(section.id, item, e.target.checked)}
                        className="sr-only"
                      />
                      
                      <span className="text-sm">
                        {isEntityType ? (entityTypeIcons[item] || '❓') : '✓'}
                      </span>
                      
                      <span className="text-xs font-mono truncate">
                        {item.replace(/_/g, ' ')}
                      </span>
                      
                      {isSelected && (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="ml-auto text-xs"
                        >
                          ✓
                        </motion.span>
                      )}
                    </motion.label>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}

      {/* Date Range Filter */}
      <div className="space-y-2">
        <motion.button
          whileHover={{ scale: 1.01 }}
          onClick={() => toggleSection('dateRange')}
          className="
            w-full flex items-center justify-between p-3 rounded-lg
            border border-cyber-border bg-cyber-light
            hover:border-neon-orange transition-colors
          "
        >
          <div className="flex items-center space-x-2">
            <span>📅</span>
            <span className="text-sm font-medium text-neon-orange">Date Range</span>
          </div>
          <span className="text-xs text-cyber-gray">
            {filters.dateRange.start ? 'Custom' : 'All Time'}
          </span>
        </motion.button>
        
        <AnimatePresence>
          {isExpanded.dateRange && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-3 bg-cyber-dark rounded border border-cyber-border space-y-3"
            >
              <div>
                <label className="block text-xs font-medium text-neon-orange mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={filters.dateRange.start || ''}
                  onChange={(e) => handleFilterChange('dateRange', 
                    { ...filters.dateRange, start: e.target.value })}
                  className="
                    w-full px-3 py-2 rounded
                    bg-cyber-black border border-cyber-border
                    text-neon-green text-sm
                    focus:border-neon-orange focus:outline-none
                  "
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-neon-orange mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={filters.dateRange.end || ''}
                  onChange={(e) => handleFilterChange('dateRange', 
                    { ...filters.dateRange, end: e.target.value })}
                  className="
                    w-full px-3 py-2 rounded
                    bg-cyber-black border border-cyber-border
                    text-neon-green text-sm
                    focus:border-neon-orange focus:outline-none
                  "
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Quick Filter Presets */}
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-cyber-gray">Quick Presets:</h4>
        <div className="grid grid-cols-2 gap-2">
          {[
            { 
              label: 'Critical Only', 
              filters: { riskLevels: ['CRITICAL'] },
              icon: '🚨'
            },
            { 
              label: 'High Risk', 
              filters: { riskLevels: ['CRITICAL', 'HIGH'] },
              icon: '⚠️'
            },
            { 
              label: 'Social Media', 
              filters: { nodeTypes: ['SOCIAL_PROFILE', 'EMAIL'] },
              icon: '📱'
            },
            { 
              label: 'Infrastructure', 
              filters: { nodeTypes: ['IP_ADDRESS', 'DOMAIN', 'URL'] },
              icon: '🌐'
            }
          ].map((preset) => (
            <motion.button
              key={preset.label}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                const newFilters = { ...filters };
                Object.entries(preset.filters).forEach(([key, values]) => {
                  newFilters[key] = values;
                });
                setFilters(newFilters);
                onFiltersChange(newFilters);
              }}
              className="
                p-2 text-xs font-mono rounded border border-cyber-border
                bg-cyber-light text-cyber-gray hover:text-neon-green hover:border-neon-green
                transition-colors flex items-center space-x-2
              "
            >
              <span>{preset.icon}</span>
              <span>{preset.label}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Filter Summary */}
      {getFilterCount() > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 bg-neon-green bg-opacity-10 border border-neon-green rounded-lg"
        >
          <div className="text-xs text-neon-green space-y-1">
            <div className="font-medium">Active Filters:</div>
            {filters.nodeTypes.length > 0 && (
              <div>Entities: {filters.nodeTypes.length} types</div>
            )}
            {filters.riskLevels.length > 0 && (
              <div>Risk: {filters.riskLevels.length} levels</div>
            )}
            {filters.relationshipTypes.length > 0 && (
              <div>Relations: {filters.relationshipTypes.length} types</div>
            )}
            {filters.sources.length > 0 && (
              <div>Sources: {filters.sources.length} types</div>
            )}
            {(filters.confidenceRange.min > 0 || filters.confidenceRange.max < 1) && (
              <div>Confidence: {Math.round(filters.confidenceRange.min * 100)}%-{Math.round(filters.confidenceRange.max * 100)}%</div>
            )}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default FilterPanel;