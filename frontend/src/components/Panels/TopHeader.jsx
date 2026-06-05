// Top Header Component - command search, view routing, and platform status
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearch } from '../../hooks/useSearch';
import GlassIcon from '../Common/GlassIcon';

const TopHeader = ({
  onSearch = () => {},
  onMenuAction = () => {},
  className = '',
  activeView = 'graph',
  serviceStatus = {},
  backendConnected = true
}) => {
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

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    if (isValidQuery && query.trim()) {
      onSearch(query);
      search(query);
    }
  };

  const viewActions = [
    { id: 'graph', action: 'home', label: 'Graph', icon: 'graph' },
    { id: 'investigations', action: 'investigations', label: 'Investigation', icon: 'investigation' },
    { id: 'operations', action: 'operations', label: 'Intelligence Ops', icon: 'operations' },
    { id: 'compliance', action: 'compliance', label: 'Compliance', icon: 'shield' }
  ];

  const menuItems = [
    { id: 'profile', label: 'Profile', icon: 'user', action: () => onMenuAction('profile') },
    { id: 'help', label: 'Help & Docs', icon: 'help', action: () => onMenuAction('help') },
    { id: 'about', label: 'About', icon: 'info', action: () => onMenuAction('about') },
    { id: 'logout', label: 'Logout', icon: 'logout', action: () => onMenuAction('logout') }
  ];

  const toneForStatus = (status) => {
    const normalized = String(status || '').toLowerCase();
    if (['connected', 'healthy', 'ready', 'configured', 'live'].includes(normalized)) return 'green';
    if (['checking', 'available', 'empty', 'partial', 'degraded'].includes(normalized)) return 'yellow';
    if (['offline', 'disconnected', 'error', 'failed', 'unavailable'].includes(normalized)) return 'red';
    return 'cyan';
  };

  const statusDotClass = {
    green: 'text-safe-green',
    yellow: 'text-warning-yellow',
    red: 'text-danger-red',
    cyan: 'text-neon-cyan'
  };

  const serviceItems = [
    {
      id: 'database',
      label: 'DB',
      icon: 'database',
      status: serviceStatus.database?.status || 'checking',
      detail: serviceStatus.database?.detail || 'Checking',
      title: serviceStatus.database?.title || 'Database status'
    }
  ];

  const mcpTone = toneForStatus(serviceStatus.mcp?.status || 'checking');

  return (
    <motion.header
      initial={{ opacity: 0, y: -18 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rv-header relative z-[3000] overflow-visible px-5 py-2.5 flex items-center gap-2.5 ${className}`}
    >
      <button
        type="button"
        onClick={() => onMenuAction('home')}
        className="flex items-center gap-3 w-[240px] max-w-[24vw] text-left shrink-0"
      >
        <span className="w-10 h-10 rounded-lg border border-neon-green/30 bg-neon-green/10 flex items-center justify-center overflow-hidden shrink-0">
          <img
            src="/reconvault.png"
            alt="ReconVault"
            className="w-8 h-8 filter brightness-110"
            onError={(event) => {
              event.currentTarget.style.display = 'none';
              event.currentTarget.nextElementSibling.style.display = 'block';
            }}
          />
          <span className="hidden text-neon-green text-sm font-cyber">RV</span>
        </span>
        <span className="min-w-0">
          <span className="block text-lg font-cyber text-neon-green leading-tight truncate">RECONVAULT</span>
          <span className="block text-[10px] text-cyber-gray font-mono uppercase truncate">Cyber intelligence command</span>
        </span>
      </button>

      <div className="hidden xl:flex items-center gap-2 shrink-0">
        <div
          title={backendConnected ? 'Backend health endpoint is reachable' : 'Backend health endpoint is not reachable'}
          className="rv-panel-section h-10 px-2.5 flex items-center gap-2 min-w-[116px]"
        >
          <span className={`rv-status-dot ${backendConnected ? 'text-safe-green' : 'text-danger-red'}`} />
          <span className="text-[10px] text-cyber-gray uppercase">Backend</span>
          <span className={`text-[10px] uppercase ${backendConnected ? 'text-safe-green' : 'text-danger-red'}`}>
            {backendConnected ? 'Live' : 'Offline'}
          </span>
        </div>

        {serviceItems.map((item) => {
          const tone = toneForStatus(item.status);
          return (
            <div
              key={item.id}
              title={item.title}
              className="rv-panel-section h-10 px-2.5 flex items-center gap-2 min-w-[130px]"
            >
              <GlassIcon name={item.icon} size="xs" tone={tone} />
              <span className="text-[10px] text-cyber-gray uppercase">{item.label}</span>
              <span className={`rv-status-dot ${statusDotClass[tone] || statusDotClass.cyan}`} />
              <span className={`max-w-[92px] truncate text-[10px] uppercase ${tone === 'green' ? 'text-safe-green' : tone === 'red' ? 'text-danger-red' : 'text-warning-yellow'}`}>
                {item.detail}
              </span>
            </div>
          );
        })}

        <button
          type="button"
          onClick={() => onMenuAction('mcp')}
          title={serviceStatus.mcp?.title || 'Open MCP playground'}
          className={`rv-command-button h-10 px-2.5 text-xs font-mono flex items-center gap-2 whitespace-nowrap ${activeView === 'mcp' ? 'is-active' : ''}`}
        >
          <GlassIcon name="mcp" size="xs" tone={activeView === 'mcp' ? 'green' : mcpTone} />
          <span>MCP</span>
          <span className={`rv-status-dot ${statusDotClass[mcpTone] || statusDotClass.cyan}`} />
          <span className="text-[10px] text-cyber-gray">{serviceStatus.mcp?.detail || '0/0'}</span>
        </button>
      </div>

      <div className="flex-1 min-w-[180px] max-w-xs">
        <form onSubmit={handleSearchSubmit} className="relative">
          <motion.div
            animate={{
              boxShadow: searchFocused ? '0 0 24px rgba(0, 217, 255, 0.22)' : '0 0 0 rgba(0, 0, 0, 0)'
            }}
            className="relative"
          >
            <input
              type="text"
              value={query}
              onChange={(event) => updateQuery(event.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholder="Search entities, relationships, or intelligence notes..."
              className="w-full pl-9 pr-11 py-2.5 rounded-lg bg-cyber-darker/80 border border-cyber-border text-neon-green placeholder-cyber-gray font-mono text-sm focus:border-neon-cyan focus:outline-none transition-all duration-200"
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neon-cyan">
              <GlassIcon name="search" size="xs" tone={searchFocused ? 'cyan' : 'muted'} bare />
            </div>

            {hasResults && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute right-3 top-1/2 -translate-y-1/2 min-w-7 h-7 px-2 bg-neon-cyan text-cyber-black rounded-md flex items-center justify-center text-xs font-bold"
              >
                {results.length > 99 ? '99+' : results.length}
              </motion.div>
            )}
          </motion.div>

          <AnimatePresence>
            {searchFocused && query.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="absolute top-full mt-2 w-full glass-panel-dark p-2 z-[3200] max-h-60 overflow-y-auto"
              >
                <div className="text-[10px] text-cyber-gray mb-2 uppercase">Command suggestions</div>
                <div className="grid grid-cols-2 gap-1">
                  {['malware', 'phishing', 'domain', 'email', 'threat actor', 'infrastructure'].map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        updateQuery(suggestion);
                        onSearch(suggestion);
                        search(suggestion);
                      }}
                      className="rv-command-button px-3 py-2 text-left text-xs font-mono"
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

      <div className="flex items-center gap-2 shrink-0">
        <div className="rv-header-actions flex items-center gap-2">
          {viewActions.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onMenuAction(item.action)}
              title={item.label}
              className={`rv-command-button h-10 px-3 text-xs font-mono flex items-center gap-2 whitespace-nowrap ${activeView === item.id || (activeView === 'graph' && item.id === 'graph') ? 'is-active' : ''}`}
            >
              <GlassIcon name={item.icon} size="xs" tone={activeView === item.id ? 'green' : 'cyan'} />
              <span className="hidden xl:inline">{item.label}</span>
            </button>
          ))}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowUserMenu((value) => !value)}
            className="rv-icon-button w-10 h-10 flex items-center justify-center"
          >
            <GlassIcon name="user" size="sm" tone="green" />
          </button>

          <AnimatePresence>
            {showUserMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.94, y: -8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94, y: -8 }}
                className="absolute right-0 top-full mt-2 w-56 glass-panel-dark p-2 z-[3200]"
              >
                {menuItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      item.action();
                      setShowUserMenu(false);
                    }}
                    className="w-full rv-command-button px-3 py-2 text-sm font-mono text-left flex items-center gap-2 mb-1 last:mb-0"
                  >
                    <GlassIcon name={item.icon} size="xs" tone="cyan" />
                    <span>{item.label}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {showUserMenu && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[3100]"
            onClick={() => setShowUserMenu(false)}
          />
        )}
      </AnimatePresence>
    </motion.header>
  );
};

export default TopHeader;
