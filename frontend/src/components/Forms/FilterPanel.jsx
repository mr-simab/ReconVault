// Filter Panel Component - graph filtering controls
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ENTITY_TYPES, RELATIONSHIP_TYPES, RISK_LEVELS, SOURCE_TYPES } from '../../utils/constants';
import GlassIcon from '../Common/GlassIcon';

const entityTypeIcons = {
  USERNAME: 'user',
  EMAIL: 'email',
  DOMAIN: 'globe',
  IP_ADDRESS: 'link',
  ORG: 'org',
  PHONE: 'phone',
  HASH: 'hash',
  URL: 'link',
  SOCIAL_PROFILE: 'user',
  DOCUMENT: 'document',
  DEVICE: 'device',
  NETWORK: 'network'
};

const riskLevelColors = {
  CRITICAL: 'text-danger-red border-danger-red',
  HIGH: 'text-neon-orange border-neon-orange',
  MEDIUM: 'text-warning-yellow border-warning-yellow',
  LOW: 'text-safe-green border-safe-green',
  INFO: 'text-neon-cyan border-neon-cyan'
};

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
    dateRange: false
  });

  const filterSections = [
    { id: 'nodeTypes', title: 'Entity Types', icon: 'target', items: ENTITY_TYPES },
    { id: 'riskLevels', title: 'Risk Levels', icon: 'risk', items: RISK_LEVELS },
    { id: 'relationshipTypes', title: 'Relationships', icon: 'relationship', items: RELATIONSHIP_TYPES },
    { id: 'sources', title: 'Data Sources', icon: 'source', items: SOURCE_TYPES }
  ];

  const getFilterCount = () =>
    filters.nodeTypes.length +
    filters.riskLevels.length +
    filters.relationshipTypes.length +
    filters.sources.length +
    (filters.confidenceRange.min > 0 || filters.confidenceRange.max < 1 ? 1 : 0) +
    (filters.dateRange.start || filters.dateRange.end ? 1 : 0);

  const toggleSection = (section) => {
    setIsExpanded((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const updateFilters = (nextFilters) => {
    setFilters(nextFilters);
    onFiltersChange(nextFilters);
  };

  const handleFilterChange = (category, value, checked) => {
    const nextFilters = { ...filters };

    if (category === 'confidenceRange' || category === 'dateRange') {
      nextFilters[category] = value;
    } else {
      nextFilters[category] = checked
        ? [...nextFilters[category], value]
        : nextFilters[category].filter((item) => item !== value);
    }

    updateFilters(nextFilters);
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

  const applyPreset = (presetFilters) => {
    const nextFilters = {
      ...filters,
      ...presetFilters
    };
    updateFilters(nextFilters);
  };

  const activeCount = getFilterCount();

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className={`space-y-4 ${className}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <GlassIcon name="filter" size="sm" tone="green" />
          <h3 className="text-sm font-medium text-neon-green">Graph Filters</h3>
          {activeCount > 0 && (
            <span className="px-2 py-1 text-xs bg-neon-cyan text-cyber-black rounded-full font-mono">{activeCount}</span>
          )}
        </div>

        <div className="flex gap-2">
          <button type="button" onClick={() => onApplyFilters(filters)} className="rv-command-button px-3 py-1 text-xs font-mono text-neon-green">
            Apply
          </button>
          {activeCount > 0 && (
            <button type="button" onClick={handleClearFilters} className="rv-command-button px-3 py-1 text-xs font-mono text-danger-red hover:border-danger-red">
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <button
          type="button"
          onClick={() => toggleSection('confidence')}
          className="rv-command-button w-full flex items-center justify-between p-3"
        >
          <span className="flex items-center gap-2">
            <GlassIcon name="density" size="xs" tone="purple" />
            <span className="text-sm font-medium text-neon-purple">Confidence Range</span>
          </span>
          <span className="text-xs text-cyber-gray">
            {Math.round(filters.confidenceRange.min * 100)}% - {Math.round(filters.confidenceRange.max * 100)}%
          </span>
        </button>

        <AnimatePresence>
          {isExpanded.confidence && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="rv-panel-section p-3 space-y-3"
            >
              <RangeInput
                label={`Minimum Confidence: ${Math.round(filters.confidenceRange.min * 100)}%`}
                value={filters.confidenceRange.min}
                onChange={(value) => handleFilterChange('confidenceRange', { ...filters.confidenceRange, min: value })}
              />
              <RangeInput
                label={`Maximum Confidence: ${Math.round(filters.confidenceRange.max * 100)}%`}
                value={filters.confidenceRange.max}
                onChange={(value) => handleFilterChange('confidenceRange', { ...filters.confidenceRange, max: value })}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {filterSections.map((section) => (
        <FilterSection
          key={section.id}
          section={section}
          selectedValues={filters[section.id]}
          expanded={isExpanded[section.id]}
          onToggle={() => toggleSection(section.id)}
          onChange={(item, checked) => handleFilterChange(section.id, item, checked)}
        />
      ))}

      <div className="space-y-2">
        <button
          type="button"
          onClick={() => toggleSection('dateRange')}
          className="rv-command-button w-full flex items-center justify-between p-3"
        >
          <span className="flex items-center gap-2">
            <GlassIcon name="clock" size="xs" tone="yellow" />
            <span className="text-sm font-medium text-neon-orange">Date Range</span>
          </span>
          <span className="text-xs text-cyber-gray">{filters.dateRange.start ? 'Custom' : 'All Time'}</span>
        </button>

        <AnimatePresence>
          {isExpanded.dateRange && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="rv-panel-section p-3 space-y-3"
            >
              <DateInput
                label="Start Date"
                value={filters.dateRange.start || ''}
                onChange={(value) => handleFilterChange('dateRange', { ...filters.dateRange, start: value })}
              />
              <DateInput
                label="End Date"
                value={filters.dateRange.end || ''}
                onChange={(value) => handleFilterChange('dateRange', { ...filters.dateRange, end: value })}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="space-y-2">
        <h4 className="text-xs font-medium text-cyber-gray">Quick Presets</h4>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Critical Only', filters: { riskLevels: ['CRITICAL'] }, icon: 'alert' },
            { label: 'High Risk', filters: { riskLevels: ['CRITICAL', 'HIGH'] }, icon: 'risk' },
            { label: 'Social Media', filters: { nodeTypes: ['SOCIAL_PROFILE', 'EMAIL'] }, icon: 'user' },
            { label: 'Infrastructure', filters: { nodeTypes: ['IP_ADDRESS', 'DOMAIN', 'URL'] }, icon: 'network' }
          ].map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => applyPreset(preset.filters)}
              className="rv-command-button p-2 text-xs font-mono flex items-center gap-2"
            >
              <GlassIcon name={preset.icon} size="xs" tone="cyan" />
              <span>{preset.label}</span>
            </button>
          ))}
        </div>
      </div>

      {activeCount > 0 && (
        <div className="rv-panel-section p-3">
          <div className="text-xs text-neon-green space-y-1">
            <div className="font-medium">Active Filters</div>
            {filters.nodeTypes.length > 0 && <div>Entity Types: {filters.nodeTypes.join(', ')}</div>}
            {filters.riskLevels.length > 0 && <div>Risk Levels: {filters.riskLevels.join(', ')}</div>}
            {filters.relationshipTypes.length > 0 && <div>Relationships: {filters.relationshipTypes.join(', ')}</div>}
            {filters.sources.length > 0 && <div>Sources: {filters.sources.join(', ')}</div>}
          </div>
        </div>
      )}
    </motion.div>
  );
};

const FilterSection = ({ section, selectedValues, expanded, onToggle, onChange }) => (
  <div className="space-y-2">
    <button
      type="button"
      onClick={onToggle}
      className="rv-command-button w-full flex items-center justify-between p-3"
    >
      <span className="flex items-center gap-2">
        <GlassIcon name={section.icon} size="xs" tone="cyan" />
        <span className="text-sm font-medium text-neon-cyan">{section.title}</span>
        {selectedValues.length > 0 && (
          <span className="px-2 py-1 text-xs bg-neon-cyan text-cyber-black rounded-full font-mono">{selectedValues.length}</span>
        )}
      </span>
      <GlassIcon name={expanded ? 'collapse-up' : 'collapse-down'} size="xs" tone="muted" bare />
    </button>

    <AnimatePresence>
      {expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="grid grid-cols-2 gap-2 rv-panel-section p-3"
        >
          {section.items.map((item) => {
            const isSelected = selectedValues.includes(item);
            const isRiskLevel = section.id === 'riskLevels';
            const isEntityType = section.id === 'nodeTypes';

            return (
              <label
                key={item}
                className={`flex items-center gap-2 p-2 rounded cursor-pointer border transition-all duration-200 ${
                  isSelected
                    ? isRiskLevel
                      ? `${riskLevelColors[item]} bg-opacity-10`
                      : 'border-neon-cyan text-neon-cyan bg-neon-cyan bg-opacity-10'
                    : 'border-cyber-border text-cyber-gray hover:border-neon-green hover:text-neon-green'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(event) => onChange(item, event.target.checked)}
                  className="sr-only"
                />
                <GlassIcon name={isEntityType ? (entityTypeIcons[item] || 'info') : isSelected ? 'check' : section.icon} size="xs" tone={isSelected ? 'green' : 'cyan'} />
                <span className="text-xs font-mono truncate">{item.replace(/_/g, ' ')}</span>
              </label>
            );
          })}
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

const RangeInput = ({ label, value, onChange }) => (
  <div className="space-y-2">
    <label className="block text-xs font-medium text-neon-cyan">{label}</label>
    <input
      type="range"
      min="0"
      max="1"
      step="0.05"
      value={value}
      onChange={(event) => onChange(parseFloat(event.target.value))}
      className="w-full"
    />
  </div>
);

const DateInput = ({ label, value, onChange }) => (
  <div>
    <label className="block text-xs font-medium text-neon-orange mb-1">{label}</label>
    <input
      type="date"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full px-3 py-2 rounded bg-cyber-black border border-cyber-border text-neon-green text-sm focus:border-neon-orange focus:outline-none"
    />
  </div>
);

export default FilterPanel;
