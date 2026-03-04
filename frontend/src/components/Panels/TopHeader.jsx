// Top Header Component - Status, search, filters
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useSearch } from '../../hooks/useSearch';
import { ConnectionBadge, StatusBadge } from '../Common/Badge';

const TopHeader = ({
  onSearch = () => {},
  onFilterToggle = () => {},
  onMenuAction = () => {},
  className = '',
  systemStatus = {},
  showAdvancedFilters = false,
  onAdvancedFiltersToggle = () => {}
}) => {
  const { 
    connected: wsConnected, 
    connecting: wsConnecting,
    connectionQuality 
  } = useWebSocket();
  
  const { 
    query, 
    updateQuery, 
    search,
    results,
    hasResults,
    isValidQuery
  } = useSearch();

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  // Handle search submit
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (isValidQuery && query.trim()) {
      onSearch(query);
      search(query);
    }
  };

  // Handle search input change
  const handleSearchChange = (e) => {
    updateQuery(e.target.value);
  };

  // System status indicators
  const statusIndicators = [
    {
      key: 'backend',
      label: 'Backend',
      status: systemStatus.backend || 'unknown',
      color: systemStatus.backend === 'healthy' ? 'safe-green' : 'danger-red'
    },
    {
      key: 'database',
      label: 'Database',
      status: systemStatus.database || 'unknown',
      color: systemStatus.database === 'connected' ? 'safe-green' : 'danger-red'
    },
    {
      key: 'neo4j',
      label: 'Neo4j',
      status: systemStatus.neo4j || 'unknown',
      color: systemStatus.neo4j === 'connected' ? 'safe-green' : 'warning-yellow'
    },
    {
      key: 'redis',
      label: 'Redis',
      status: systemStatus.redis || 'unknown',
      color: systemStatus.redis === 'connected' ? 'safe-green' : 'warning-yellow'
    }
  ];

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        relative bg-cyber-darker border-b border-cyber-border 
        px-6 py-4 flex items-center justify-between
        backdrop-blur-sm ${className}
      `}
    >
      {/* Left Section - Logo & Branding */}
      <div className="flex items-center space-x-4">
        {/* Logo */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          className="flex items-center space-x-3 cursor-pointer"
          onClick={() => onMenuAction('home')}
        >
          <div className="w-10 h-10 bg-neon-green bg-opacity-20 rounded-lg flex items-center justify-center">
            <img 
              src="/reconvault.png" 
              alt="ReconVault" 
              className="w-8 h-8 filter brightness-110"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'block';
              }}
            />
            <span 
              className="text-neon-green text-lg font-cyber hidden"
              style={{ display: 'none' }}
            >
              RV
            </span>
          </div>
          <div>
            <h1 className="text-xl font-cyber text-neon-green">
              RECONVAULT
            </h1>
            <p className="text-xs text-cyber-gray font-mono">
              Cyber Intelligence Platform
            </p>
          </div>
        </motion.div>

        {/* System Status Indicators */}
        <div className="hidden lg:flex items-center space-x-3 ml-8">
          {statusIndicators.map((indicator) => (
            <div key={indicator.key} className="flex items-center space-x-2">
              <StatusBadge
                variant={indicator.color}
                size="xs"
              >
                {indicator.status}
              </StatusBadge>
              <span className="text-xs text-cyber-gray font-mono">
                {indicator.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Center Section - Search */}
      <div className="flex-1 max-w-2xl mx-8">
        <form onSubmit={handleSearchSubmit} className="relative">
          <motion.div
            animate={{
              scale: searchFocused ? 1.02 : 1,
              boxShadow: searchFocused 
                ? '0 0 20px rgba(0, 255, 65, 0.3)' 
                : '0 0 0px rgba(0, 255, 65, 0)'
            }}
            className="relative"
          >
            <input
              type="text"
              value={query}
              onChange={handleSearchChange}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholder="Search entities, relationships, or run intelligence queries..."
              className="
                w-full px-4 py-3 pr-12 rounded-lg
                bg-cyber-dark border border-cyber-border
                text-neon-green placeholder-cyber-gray
                font-mono text-sm
                focus:border-neon-green focus:outline-none
                transition-all duration-200
              "
            />
            
            {/* Search Icon */}
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <span className="text-cyber-gray">
                {searchFocused ? '🔍' : '🔎'}
              </span>
            </div>

            {/* Search Results Indicator */}
            {hasResults && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute -bottom-2 -right-2 w-6 h-6 bg-neon-cyan rounded-full flex items-center justify-center"
              >
                <span className="text-xs font-bold text-cyber-black">
                  {results.length > 99 ? '99+' : results.length}
                </span>
              </motion.div>
            )}
          </motion.div>

          {/* Quick Search Suggestions */}
          <AnimatePresence>
            {searchFocused && query.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="
                  absolute top-full mt-2 w-full
                  glass-panel-dark border border-cyber-border
                  rounded-lg p-2 z-50 max-h-60 overflow-y-auto
                "
              >
                <div className="text-xs text-cyber-gray mb-2 font-mono">
                  Quick searches:
                </div>
                <div className="space-y-1">
                  {['malware', 'phishing', 'domain', 'email', 'threat actor'].map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => {
                        updateQuery(suggestion);
                        onSearch(suggestion);
                        search(suggestion);
                      }}
                      className="
                        w-full text-left px-3 py-2 text-sm font-mono
                        text-cyber-gray hover:text-neon-green hover:bg-cyber-light
                        rounded transition-colors
                      "
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </div>

      {/* Right Section - Controls & Status */}
      <div className="flex items-center space-x-4">
        {/* WebSocket Status */}
        <div className="flex items-center space-x-2">
          <ConnectionBadge connected={wsConnected} />
          <span className="text-xs text-cyber-gray font-mono hidden lg:inline">
            {wsConnected ? 'Real-time' : wsConnecting ? 'Connecting...' : 'Offline'}
          </span>
        </div>

        {/* Advanced Filters Toggle */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onAdvancedFiltersToggle}
          className={`
            px-3 py-2 rounded-lg border text-xs font-mono transition-all
            ${showAdvancedFilters 
              ? 'border-neon-cyan text-neon-cyan bg-neon-cyan bg-opacity-10' 
              : 'border-cyber-border text-cyber-gray hover:text-neon-cyan hover:border-neon-cyan'
            }
          `}
        >
          🔧 Filters
        </motion.button>

        {/* Quick Actions */}
        <div className="flex space-x-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onMenuAction('compliance')}
            className="
              px-3 py-2 rounded-lg border border-cyber-border
              text-cyber-gray hover:text-neon-cyan hover:border-neon-cyan
              text-xs font-mono transition-all
            "
          >
            🛡️ Compliance
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onMenuAction('settings')}
            className="
              px-3 py-2 rounded-lg border border-cyber-border
              text-cyber-gray hover:text-neon-green hover:border-neon-green
              text-xs font-mono transition-all
            "
          >
            ⚙️ Settings
          </motion.button>
        </div>

        {/* User Menu */}
        <div className="relative">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="
              w-10 h-10 rounded-lg border border-cyber-border
              bg-cyber-light flex items-center justify-center
              text-neon-green hover:text-neon-cyan hover:border-neon-cyan
              transition-all
            "
          >
            👤
          </motion.button>

          {/* User Menu Dropdown */}
          <AnimatePresence>
            {showUserMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -10 }}
                className="
                  absolute right-0 top-full mt-2 w-48
                  glass-panel-dark border border-cyber-border
                  rounded-lg p-2 z-50
                "
              >
                <div className="space-y-1">
                  {[
                    { id: 'profile', label: '👤 Profile', action: () => onMenuAction('profile') },
                    { id: 'preferences', label: '⚙️ Preferences', action: () => onMenuAction('preferences') },
                    { id: 'help', label: '❓ Help & Docs', action: () => onMenuAction('help') },
                    { id: 'about', label: 'ℹ️ About', action: () => onMenuAction('about') },
                    { id: 'logout', label: '🚪 Logout', action: () => onMenuAction('logout') }
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        item.action();
                        setShowUserMenu(false);
                      }}
                      className="
                        w-full text-left px-3 py-2 text-sm font-mono
                        text-cyber-gray hover:text-neon-green hover:bg-cyber-light
                        rounded transition-colors
                      "
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Close menu on outside click */}
        <AnimatePresence>
          {showUserMenu && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setShowUserMenu(false)}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Performance Monitor (Dev Mode) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute bottom-0 left-0 right-0 bg-cyber-black bg-opacity-50 p-2">
          <div className="flex justify-between text-xs font-mono text-cyber-gray">
            <span>FPS: 60</span>
            <span>Memory: 45.2MB</span>
            <span>Nodes: 0</span>
            <span>Edges: 0</span>
          </div>
        </div>
      )}
    </motion.header>
  );
};

export default TopHeader;