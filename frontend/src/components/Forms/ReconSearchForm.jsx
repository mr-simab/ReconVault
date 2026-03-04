// Recon Search Form Component - Target input and collection controls
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { COLLECTION_TYPES } from '../../utils/constants';

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
    setSelectedTypes(prev => 
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const handleOptionToggle = (option) => {
    setOptions(prev => ({
      ...prev,
      [option]: !prev[option]
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!target.trim() || selectedTypes.length === 0) {
      return;
    }

    const collectionConfig = {
      target: target.trim(),
      types: selectedTypes,
      options: {
        ...options,
        ...customOptions
      }
    };

    onStartCollection(collectionConfig);
  };

  const isFormValid = target.trim() && selectedTypes.length > 0;

  const collectionTypeIcons = {
    web: '🌐',
    social: '📱',
    domain: '🌍',
    ip: '🔗',
    email: '✉️',
    media: '🖼️',
    darkweb: '🌑'
  };

  const collectionTypeDescriptions = {
    web: 'Web scraping and content analysis',
    social: 'Social media profiling and monitoring',
    domain: 'Domain research and DNS analysis',
    ip: 'IP address geolocation and reputation',
    email: 'Email address verification and analysis',
    media: 'Image and video reverse search',
    darkweb: 'Dark web monitoring and analysis'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`space-y-6 ${className}`}
    >
      {/* Target Input */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-neon-green">
          Target Entity *
        </label>
        <input
          type="text"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          placeholder="Enter domain, email, IP, username, etc."
          className="
            w-full px-4 py-3 rounded-lg
            bg-cyber-dark border border-cyber-border
            text-neon-green placeholder-cyber-gray
            font-mono text-sm
            focus:border-neon-cyan focus:outline-none
            transition-all duration-200
          "
          disabled={loading}
        />
        <p className="text-xs text-cyber-gray">
          Specify the entity you want to investigate
        </p>
      </div>

      {/* Collection Types */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-neon-green">
          Collection Types *
        </label>
        <div className="grid grid-cols-2 gap-2">
          {COLLECTION_TYPES.map((type) => (
            <motion.button
              key={type}
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleTypeToggle(type)}
              disabled={loading}
              className={`
                p-3 rounded-lg border text-left transition-all duration-200
                ${selectedTypes.includes(type)
                  ? 'border-neon-cyan bg-neon-cyan bg-opacity-10 text-neon-cyan'
                  : 'border-cyber-border bg-cyber-light text-cyber-gray hover:border-neon-green hover:text-neon-green'
                }
              `}
            >
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-lg">
                  {collectionTypeIcons[type]}
                </span>
                <span className="font-mono text-sm font-medium capitalize">
                  {type}
                </span>
                {selectedTypes.includes(type) && (
                  <span className="text-xs">✓</span>
                )}
              </div>
              <p className="text-xs opacity-75">
                {collectionTypeDescriptions[type]}
              </p>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Advanced Options */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-neon-green">
          Collection Options
        </label>
        <div className="space-y-2">
          {[
            { key: 'includeDarkWeb', label: 'Include Dark Web Search', icon: '🌑' },
            { key: 'includeMedia', label: 'Include Media Analysis', icon: '🖼️' },
            { key: 'deepScan', label: 'Deep Scan Mode', icon: '🔍' },
            { key: 'realTimeUpdates', label: 'Real-time Updates', icon: '⚡' }
          ].map((option) => (
            <motion.label
              key={option.key}
              whileHover={{ scale: 1.01 }}
              className="
                flex items-center space-x-3 p-3 rounded-lg
                border border-cyber-border bg-cyber-light
                hover:border-neon-green transition-colors cursor-pointer
              "
            >
              <input
                type="checkbox"
                checked={options[option.key]}
                onChange={() => handleOptionToggle(option.key)}
                disabled={loading}
                className="
                  w-4 h-4 rounded border-cyber-border
                  bg-cyber-dark text-neon-green
                  focus:ring-neon-cyan focus:ring-2
                "
              />
              <span className="text-lg">{option.icon}</span>
              <span className="text-sm text-cyber-gray">{option.label}</span>
            </motion.label>
          ))}
        </div>
      </div>

      {/* Custom Configuration */}
      <details className="group">
        <summary className="
          cursor-pointer list-none p-3 rounded-lg
          border border-cyber-border bg-cyber-light
          hover:border-neon-purple transition-colors
          text-sm font-medium text-neon-purple
        ">
          <span className="flex items-center space-x-2">
            <span>⚙️</span>
            <span>Advanced Configuration</span>
            <span className="text-xs opacity-75">
              (Expand for custom settings)
            </span>
          </span>
        </summary>
        
        <div className="mt-3 p-4 space-y-4 bg-cyber-dark rounded-lg border border-cyber-border">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-neon-cyan mb-1">
                Max Results
              </label>
              <input
                type="number"
                min="1"
                max="1000"
                value={customOptions.maxResults || 100}
                onChange={(e) => setCustomOptions(prev => ({
                  ...prev,
                  maxResults: parseInt(e.target.value)
                }))}
                className="
                  w-full px-3 py-2 rounded
                  bg-cyber-black border border-cyber-border
                  text-neon-green text-sm
                  focus:border-neon-cyan focus:outline-none
                "
                disabled={loading}
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-neon-cyan mb-1">
                Timeout (seconds)
              </label>
              <input
                type="number"
                min="30"
                max="3600"
                value={customOptions.timeout || 300}
                onChange={(e) => setCustomOptions(prev => ({
                  ...prev,
                  timeout: parseInt(e.target.value)
                }))}
                className="
                  w-full px-3 py-2 rounded
                  bg-cyber-black border border-cyber-border
                  text-neon-green text-sm
                  focus:border-neon-cyan focus:outline-none
                "
                disabled={loading}
              />
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-medium text-neon-cyan mb-1">
              Custom Tags
            </label>
            <input
              type="text"
              value={customOptions.tags || ''}
              onChange={(e) => setCustomOptions(prev => ({
                ...prev,
                tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
              }))}
              placeholder="tag1, tag2, tag3"
              className="
                w-full px-3 py-2 rounded
                bg-cyber-black border border-cyber-border
                text-neon-green text-sm
                focus:border-neon-cyan focus:outline-none
              "
              disabled={loading}
            />
            <p className="text-xs text-cyber-gray mt-1">
              Comma-separated tags for organizing results
            </p>
          </div>
        </div>
      </details>

      {/* Submit Button */}
      <motion.button
        type="submit"
        onClick={handleSubmit}
        disabled={!isFormValid || loading}
        whileHover={isFormValid ? { scale: 1.02 } : {}}
        whileTap={isFormValid ? { scale: 0.98 } : {}}
        className={`
          w-full py-4 rounded-lg border font-mono font-medium
          transition-all duration-200 flex items-center justify-center space-x-2
          ${isFormValid && !loading
            ? 'border-neon-green text-neon-green hover:bg-neon-green hover:text-cyber-black'
            : 'border-cyber-border text-cyber-gray cursor-not-allowed'
          }
        `}
      >
        {loading ? (
          <>
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            <span>Starting Collection...</span>
          </>
        ) : (
          <>
            <span>🚀</span>
            <span>Start Intelligence Collection</span>
          </>
        )}
      </motion.button>

      {/* Form Validation Messages */}
      {!isFormValid && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="p-3 bg-warning-yellow bg-opacity-10 border border-warning-yellow rounded-lg"
        >
          <div className="flex items-center space-x-2 text-warning-yellow">
            <span>⚠️</span>
            <span className="text-sm font-mono">
              Please provide a target and select at least one collection type
            </span>
          </div>
        </motion.div>
      )}

      {/* Quick Start Presets */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-cyber-gray">Quick Start Presets:</p>
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'Domain Research', types: ['domain', 'web'], icon: '🌍' },
            { label: 'Social Investigation', types: ['social', 'email'], icon: '📱' },
            { label: 'IP Analysis', types: ['ip', 'web'], icon: '🔗' },
            { label: 'Full Profile', types: ['domain', 'social', 'email', 'ip'], icon: '🎯' }
          ].map((preset) => (
            <motion.button
              key={preset.label}
              type="button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setTarget('');
                setSelectedTypes(preset.types);
              }}
              className="
                px-3 py-2 text-xs font-mono rounded border border-cyber-border
                bg-cyber-light text-cyber-gray hover:text-neon-green hover:border-neon-green
                transition-colors flex items-center space-x-1
              "
              disabled={loading}
            >
              <span>{preset.icon}</span>
              <span>{preset.label}</span>
            </motion.button>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default ReconSearchForm;