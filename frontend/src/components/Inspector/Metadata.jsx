// Metadata Viewer Component
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatJSON } from '../../utils/formatters';

const Metadata = ({
  metadata = {},
  title = 'Metadata',
  collapsible = true,
  showCopyButton = true,
  className = '',
  onExport = () => {},
  onImport = () => {}
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [copied, setCopied] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredMetadata, setFilteredMetadata] = useState(metadata);

  // Filter metadata based on search term
  React.useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredMetadata(metadata);
    } else {
      const filtered = {};
      Object.entries(metadata).forEach(([key, value]) => {
        if (
          key.toLowerCase().includes(searchTerm.toLowerCase()) ||
          JSON.stringify(value).toLowerCase().includes(searchTerm.toLowerCase())
        ) {
          filtered[key] = value;
        }
      });
      setFilteredMetadata(filtered);
    }
  }, [metadata, searchTerm]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formatJSON(metadata));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy metadata:', error);
    }
  };

  const handleExport = () => {
    const dataStr = formatJSON(metadata);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `metadata-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    onExport(metadata);
  };

  const getMetadataStats = () => {
    const keys = Object.keys(filteredMetadata);
    const valueTypes = {};
    
    keys.forEach(key => {
      const value = filteredMetadata[key];
      const type = Array.isArray(value) ? 'array' : 
                   value === null ? 'null' : 
                   typeof value;
      valueTypes[type] = (valueTypes[type] || 0) + 1;
    });
    
    return {
      totalKeys: keys.length,
      valueTypes,
      hasNestedObjects: keys.some(key => 
        typeof filteredMetadata[key] === 'object' && 
        filteredMetadata[key] !== null && 
        !Array.isArray(filteredMetadata[key])
      )
    };
  };

  const stats = getMetadataStats();

  // Render metadata value with syntax highlighting
  const renderValue = (value, key) => {
    if (value === null) {
      return <span className="text-cyber-gray italic">null</span>;
    }
    
    if (typeof value === 'boolean') {
      return (
        <span className={value ? 'text-safe-green' : 'text-danger-red'}>
          {value.toString()}
        </span>
      );
    }
    
    if (typeof value === 'number') {
      return <span className="text-neon-cyan">{value}</span>;
    }
    
    if (typeof value === 'string') {
      // Check if it's a date string
      if (value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
        return (
          <span className="text-neon-purple" title={value}>
            {new Date(value).toLocaleString()}
          </span>
        );
      }
      // Check if it's a URL
      if (value.startsWith('http://') || value.startsWith('https://')) {
        return (
          <a 
            href={value} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-neon-cyan hover:text-neon-green underline"
          >
            {value}
          </a>
        );
      }
      return <span className="text-neon-green">"{value}"</span>;
    }
    
    if (Array.isArray(value)) {
      return (
        <div className="ml-4">
          <span className="text-warning-yellow">Array[{value.length}]</span>
          {value.length > 0 && (
            <div className="mt-1 space-y-1">
              {value.slice(0, 3).map((item, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <span className="text-cyber-gray text-xs">[{index}]</span>
                  <span className="text-neon-green">{typeof item === 'string' ? `"${item}"` : JSON.stringify(item)}</span>
                </div>
              ))}
              {value.length > 3 && (
                <div className="text-xs text-cyber-gray">... and {value.length - 3} more</div>
              )}
            </div>
          )}
        </div>
      );
    }
    
    if (typeof value === 'object') {
      const keys = Object.keys(value);
      return (
        <div className="ml-4">
          <span className="text-neon-purple">Object</span>
          {keys.length > 0 && (
            <div className="mt-1 space-y-1">
              {keys.slice(0, 3).map((subKey) => (
                <div key={subKey} className="flex items-center space-x-2">
                  <span className="text-neon-cyan">{subKey}:</span>
                  <span className="text-neon-green">{typeof value[subKey] === 'string' ? `"${value[subKey]}"` : JSON.stringify(value[subKey])}</span>
                </div>
              ))}
              {keys.length > 3 && (
                <div className="text-xs text-cyber-gray">... and {keys.length - 3} more properties</div>
              )}
            </div>
          )}
        </div>
      );
    }
    
    return <span className="text-neon-green">{JSON.stringify(value)}</span>;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {collapsible && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-neon-green hover:text-neon-cyan transition-colors"
            >
              <span className="text-sm">
                {isExpanded ? '▼' : '▶️'}
              </span>
            </motion.button>
          )}
          <div className="flex items-center space-x-2">
            <span className="text-neon-green">📋</span>
            <h4 className="text-sm font-medium text-neon-green">{title}</h4>
            <span className="px-2 py-1 text-xs bg-neon-cyan text-cyber-black rounded-full font-mono">
              {stats.totalKeys}
            </span>
          </div>
        </div>
        
        <div className="flex space-x-2">
          {showCopyButton && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleCopy}
              className="
                px-3 py-1 text-xs font-mono rounded border border-cyber-border
                bg-cyber-dark text-cyber-gray hover:text-neon-cyan hover:border-neon-cyan
                transition-colors
              "
            >
              {copied ? '✓ Copied' : '📋 Copy'}
            </motion.button>
          )}
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleExport}
            className="
              px-3 py-1 text-xs font-mono rounded border border-cyber-border
              bg-cyber-dark text-cyber-gray hover:text-neon-green hover:border-neon-green
              transition-colors
            "
          >
            💾 Export
          </motion.button>
        </div>
      </div>

      {/* Stats */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="grid grid-cols-4 gap-4 p-3 bg-cyber-dark rounded-lg border border-cyber-border"
          >
            {Object.entries(stats.valueTypes).map(([type, count]) => (
              <div key={type} className="text-center">
                <div className="text-lg font-mono text-neon-cyan">{count}</div>
                <div className="text-xs text-cyber-gray capitalize">{type}</div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search */}
      {isExpanded && (
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search metadata..."
            className="
              w-full px-4 py-2 pr-10 rounded-lg
              bg-cyber-dark border border-cyber-border
              text-neon-green placeholder-cyber-gray
              font-mono text-sm
              focus:border-neon-cyan focus:outline-none
              transition-all duration-200
            "
          />
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <span className="text-cyber-gray">🔍</span>
          </div>
        </div>
      )}

      {/* Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2 max-h-96 overflow-y-auto scrollable-cyber"
          >
            {Object.keys(filteredMetadata).length === 0 ? (
              <div className="text-center py-8 text-cyber-gray">
                <span className="text-2xl block mb-2">📋</span>
                <p className="text-sm">
                  {searchTerm ? 'No metadata matches your search' : 'No metadata available'}
                </p>
              </div>
            ) : (
              Object.entries(filteredMetadata)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([key, value]) => (
                  <motion.div
                    key={key}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="
                      p-3 bg-cyber-dark rounded-lg border border-cyber-border
                      hover:border-neon-green transition-colors
                    "
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-sm font-mono text-neon-cyan font-medium">
                            {key}
                          </span>
                          <span className="text-xs text-cyber-gray">
                            {typeof value}
                          </span>
                        </div>
                        <div className="text-sm">
                          {renderValue(value, key)}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Raw JSON View */}
      {isExpanded && (
        <details className="group">
          <summary className="
            cursor-pointer list-none p-3 rounded-lg
            border border-cyber-border bg-cyber-light
            hover:border-neon-purple transition-colors
            text-sm font-medium text-neon-purple
          ">
            <span className="flex items-center space-x-2">
              <span>🔧</span>
              <span>Raw JSON</span>
              <span className="text-xs opacity-75">
                (Advanced users)
              </span>
            </span>
          </summary>
          
          <div className="mt-3 p-4 bg-cyber-black rounded-lg border border-cyber-border overflow-x-auto">
            <pre className="text-xs font-mono text-neon-green whitespace-pre-wrap">
              {formatJSON(metadata, 2)}
            </pre>
          </div>
        </details>
      )}
    </div>
  );
};

export default Metadata;