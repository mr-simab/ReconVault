// Recon Search Form Component - target input and collection controls
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { COLLECTION_TYPES } from '../../utils/constants';
import GlassIcon from '../Common/GlassIcon';

const collectionTypeIcons = {
  web: 'globe',
  social: 'user',
  domain: 'network',
  ip: 'link',
  email: 'email',
  media: 'media',
  darkweb: 'darkweb'
};

const collectionTypeDescriptions = {
  web: 'Web surface and content signals',
  social: 'Social profile and mention signals',
  domain: 'WHOIS, DNS, and domain posture',
  ip: 'IP reputation and geolocation',
  email: 'Mailbox and breach exposure',
  media: 'Image and media intelligence',
  darkweb: 'Dark web exposure checks'
};

const ReconSearchForm = ({
  onStartCollection = () => {},
  loading = false,
  className = ''
}) => {
  const [target, setTarget] = useState('');
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [options, setOptions] = useState({
    includeDarkWeb: false,
    includeMedia: false,
    deepScan: false,
    realTimeUpdates: true
  });
  const [customOptions, setCustomOptions] = useState({});

  const handleTypeToggle = (type) => {
    setSelectedTypes((prev) =>
      prev.includes(type)
        ? prev.filter((item) => item !== type)
        : [...prev, type]
    );
  };

  const handleOptionToggle = (option) => {
    setOptions((prev) => ({
      ...prev,
      [option]: !prev[option]
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!target.trim() || selectedTypes.length === 0) {
      return;
    }

    onStartCollection({
      target: target.trim(),
      types: selectedTypes,
      options: {
        ...options,
        ...customOptions
      }
    });
  };

  const isFormValid = target.trim() && selectedTypes.length > 0;

  const advancedOptions = [
    { key: 'includeDarkWeb', label: 'Dark web', icon: 'darkweb' },
    { key: 'includeMedia', label: 'Media analysis', icon: 'media' },
    { key: 'deepScan', label: 'Deep scan', icon: 'search' },
    { key: 'realTimeUpdates', label: 'Real-time updates', icon: 'websocket' }
  ];

  const presets = [
    { label: 'Domain Research', types: ['domain', 'web'], icon: 'network' },
    { label: 'Social Investigation', types: ['social', 'email'], icon: 'user' },
    { label: 'IP Analysis', types: ['ip', 'web'], icon: 'link' },
    { label: 'Full Profile', types: ['domain', 'social', 'email', 'ip'], icon: 'target' }
  ];

  return (
    <motion.form
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={handleSubmit}
      className={`space-y-5 ${className}`}
    >
      <div className="space-y-2">
        <label className="block text-sm font-medium text-neon-green">Target Entity</label>
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neon-cyan">
            <GlassIcon name="target" size="sm" bare />
          </div>
          <input
            type="text"
            value={target}
            onChange={(event) => setTarget(event.target.value)}
            placeholder="domain, email, IP, username"
            className="w-full pl-11 pr-4 py-3 rounded-lg bg-cyber-dark border border-cyber-border text-neon-green placeholder-cyber-gray font-mono text-sm focus:border-neon-cyan focus:outline-none transition-all duration-200"
            disabled={loading}
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-neon-green">Collectors</label>
          <span className="text-[10px] text-cyber-gray uppercase">{selectedTypes.length} selected</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {COLLECTION_TYPES.map((type) => {
            const selected = selectedTypes.includes(type);
            return (
              <button
                key={type}
                type="button"
                onClick={() => handleTypeToggle(type)}
                disabled={loading}
                className={`rv-command-button p-3 text-left ${selected ? 'is-active' : ''}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <GlassIcon name={collectionTypeIcons[type] || 'source'} size="xs" tone={selected ? 'green' : 'cyan'} />
                  <span className="font-mono text-sm font-medium capitalize">{type}</span>
                  {selected && <GlassIcon name="check" size="xs" tone="green" bare />}
                </div>
                <p className="text-[11px] text-cyber-gray leading-tight">{collectionTypeDescriptions[type]}</p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <label className="block text-sm font-medium text-neon-green">Collection Options</label>
        <div className="grid grid-cols-2 gap-2">
          {advancedOptions.map((option) => (
            <label
              key={option.key}
              className={`rv-command-button px-3 py-2 cursor-pointer flex items-center gap-2 ${options[option.key] ? 'is-active' : ''}`}
            >
              <input
                type="checkbox"
                checked={options[option.key]}
                onChange={() => handleOptionToggle(option.key)}
                disabled={loading}
                className="w-4 h-4 rounded border-cyber-border bg-cyber-dark text-neon-green focus:ring-neon-cyan focus:ring-2"
              />
              <GlassIcon name={option.icon} size="xs" tone={options[option.key] ? 'green' : 'cyan'} />
              <span className="text-xs text-cyber-gray">{option.label}</span>
            </label>
          ))}
        </div>
      </div>

      <details className="group">
        <summary className="rv-command-button cursor-pointer list-none p-3 text-sm font-medium text-neon-purple">
          <span className="flex items-center gap-2">
            <GlassIcon name="settings" size="xs" tone="purple" />
            <span>Advanced Configuration</span>
          </span>
        </summary>

        <div className="mt-3 rv-panel-section p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-neon-cyan mb-1">Max Results</label>
              <input
                type="number"
                min="1"
                max="1000"
                value={customOptions.maxResults || 100}
                onChange={(event) => setCustomOptions((prev) => ({
                  ...prev,
                  maxResults: parseInt(event.target.value, 10)
                }))}
                className="w-full px-3 py-2 rounded bg-cyber-black border border-cyber-border text-neon-green text-sm focus:border-neon-cyan focus:outline-none"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neon-cyan mb-1">Timeout (seconds)</label>
              <input
                type="number"
                min="30"
                max="3600"
                value={customOptions.timeout || 300}
                onChange={(event) => setCustomOptions((prev) => ({
                  ...prev,
                  timeout: parseInt(event.target.value, 10)
                }))}
                className="w-full px-3 py-2 rounded bg-cyber-black border border-cyber-border text-neon-green text-sm focus:border-neon-cyan focus:outline-none"
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neon-cyan mb-1">Case Tags</label>
            <input
              type="text"
              value={Array.isArray(customOptions.tags) ? customOptions.tags.join(', ') : ''}
              onChange={(event) => setCustomOptions((prev) => ({
                ...prev,
                tags: event.target.value.split(',').map((tag) => tag.trim()).filter(Boolean)
              }))}
              placeholder="brand, phishing, vip"
              className="w-full px-3 py-2 rounded bg-cyber-black border border-cyber-border text-neon-green text-sm focus:border-neon-cyan focus:outline-none"
              disabled={loading}
            />
          </div>
        </div>
      </details>

      <button
        type="submit"
        disabled={!isFormValid || loading}
        className={`w-full py-4 rounded-lg border font-mono font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
          isFormValid && !loading
            ? 'border-neon-green text-neon-green hover:bg-neon-green hover:text-cyber-black'
            : 'border-cyber-border text-cyber-gray cursor-not-allowed'
        }`}
      >
        {loading ? (
          <>
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            <span>Starting Collection...</span>
          </>
        ) : (
          <>
            <GlassIcon name="operations" size="xs" tone={isFormValid ? 'green' : 'muted'} />
            <span>Start Intelligence Collection</span>
          </>
        )}
      </button>

      {!isFormValid && (
        <div className="p-3 bg-warning-yellow bg-opacity-10 border border-warning-yellow rounded-lg">
          <div className="flex items-center gap-2 text-warning-yellow">
            <GlassIcon name="alert" size="xs" tone="yellow" />
            <span className="text-sm font-mono">Target and collector selection required</span>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <p className="text-xs font-medium text-cyber-gray">Presets</p>
        <div className="flex flex-wrap gap-2">
          {presets.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => setSelectedTypes(preset.types)}
              className="rv-command-button px-3 py-2 text-xs font-mono flex items-center gap-1"
              disabled={loading}
            >
              <GlassIcon name={preset.icon} size="xs" tone="cyan" />
              <span>{preset.label}</span>
            </button>
          ))}
        </div>
      </div>
    </motion.form>
  );
};

export default ReconSearchForm;
