import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const AdvancedSearch = ({ onSearch, onClose, isOpen }) => {
  const [searchMode, setSearchMode] = useState('simple'); // simple or advanced
  const [simpleQuery, setSimpleQuery] = useState('');
  const [advancedQuery, setAdvancedQuery] = useState('');
  const [searchHistory, setSearchHistory] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const inputRef = useRef(null);

  // Load search history from localStorage
  useEffect(() => {
    const history = localStorage.getItem('reconvault_search_history');
    if (history) {
      try {
        setSearchHistory(JSON.parse(history));
      } catch (error) {
        console.error('[AdvancedSearch] Error loading history:', error);
      }
    }
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current.focus(), 100);
    }
  }, [isOpen]);

  // Generate search suggestions
  useEffect(() => {
    const query = searchMode === 'simple' ? simpleQuery : advancedQuery;
    
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    const newSuggestions = [];

    // Entity type suggestions
    if (query.includes('type:')) {
      newSuggestions.push(
        { text: 'type:DOMAIN', description: 'Search for domain entities' },
        { text: 'type:IP_ADDRESS', description: 'Search for IP addresses' },
        { text: 'type:EMAIL', description: 'Search for email entities' },
        { text: 'type:USERNAME', description: 'Search for usernames' },
        { text: 'type:URL', description: 'Search for URLs' }
      );
    }

    // Risk level suggestions
    if (query.includes('risk:') || query.includes('riskLevel:')) {
      newSuggestions.push(
        { text: 'riskLevel:CRITICAL', description: 'Critical risk entities' },
        { text: 'riskLevel:HIGH', description: 'High risk entities' },
        { text: 'riskLevel:MEDIUM', description: 'Medium risk entities' },
        { text: 'riskLevel:LOW', description: 'Low risk entities' }
      );
    }

    // Source suggestions
    if (query.includes('source:')) {
      newSuggestions.push(
        { text: 'source:VIRUSTOTAL', description: 'From VirusTotal' },
        { text: 'source:SHODAN', description: 'From Shodan' },
        { text: 'source:WEB_SCRAPER', description: 'From web scraping' },
        { text: 'source:SOCIAL_MEDIA', description: 'From social media' }
      );
    }

    setSuggestions(newSuggestions.slice(0, 5));
  }, [simpleQuery, advancedQuery, searchMode]);

  const handleSearch = async () => {
    const query = searchMode === 'simple' ? simpleQuery : advancedQuery;
    
    if (!query.trim()) return;

    setIsSearching(true);

    try {
      // Parse search query
      const parsedQuery = parseSearchQuery(query);
      
      // Execute search
      if (onSearch) {
        await onSearch(parsedQuery);
      }

      // Add to history
      addToHistory(query);

      // Mock results for demo
      setResults([
        {
          id: '1',
          value: 'malware-c2.example.com',
          type: 'DOMAIN',
          riskLevel: 'CRITICAL',
          match: 'Value match'
        },
        {
          id: '2',
          value: '192.168.1.100',
          type: 'IP_ADDRESS',
          riskLevel: 'HIGH',
          match: 'Metadata match'
        }
      ]);

    } catch (error) {
      console.error('[AdvancedSearch] Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const parseSearchQuery = (query) => {
    const parsed = {
      text: '',
      filters: {},
      operators: []
    };

    // Check for advanced query syntax
    if (query.includes(':')) {
      // Parse field:value pairs
      const fieldRegex = /(\w+):([^\s]+)/g;
      let match;
      
      while ((match = fieldRegex.exec(query)) !== null) {
        const [, field, value] = match;
        parsed.filters[field] = value;
      }

      // Extract remaining text
      parsed.text = query.replace(fieldRegex, '').trim();
    } else {
      // Simple text search
      parsed.text = query;
    }

    // Parse operators (AND, OR, NOT)
    if (query.includes(' AND ')) parsed.operators.push('AND');
    if (query.includes(' OR ')) parsed.operators.push('OR');
    if (query.includes(' NOT ')) parsed.operators.push('NOT');

    // Parse regex patterns
    const regexMatch = query.match(/\/(.+)\//);
    if (regexMatch) {
      parsed.regex = regexMatch[1];
    }

    // Parse date ranges
    const dateRangeMatch = query.match(/\[(.+) TO (.+)\]/);
    if (dateRangeMatch) {
      parsed.dateRange = {
        from: dateRangeMatch[1],
        to: dateRangeMatch[2]
      };
    }

    return parsed;
  };

  const addToHistory = (query) => {
    const newHistory = [
      query,
      ...searchHistory.filter(h => h !== query)
    ].slice(0, 10);
    
    setSearchHistory(newHistory);
    localStorage.setItem('reconvault_search_history', JSON.stringify(newHistory));
  };

  const clearHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem('reconvault_search_history');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSearch();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Search Panel */}
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            transition={{ type: 'spring', duration: 0.4 }}
            className="fixed top-20 left-1/2 transform -translate-x-1/2 w-full max-w-4xl bg-cyber-dark border-2 border-neon-green rounded-lg shadow-2xl z-50 max-h-[80vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b border-neon-green/30 bg-cyber-darker">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-neon-green font-mono flex items-center">
                  <svg className="w-8 h-8 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Advanced Search
                </h2>
                
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg bg-danger-red/20 text-danger-red hover:bg-danger-red/30 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Mode Toggle */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setSearchMode('simple')}
                  className={`px-4 py-2 rounded-lg font-mono transition-colors ${
                    searchMode === 'simple'
                      ? 'bg-neon-green text-cyber-black'
                      : 'bg-cyber-dark text-gray-400 hover:text-neon-green'
                  }`}
                >
                  Simple Search
                </button>
                <button
                  onClick={() => setSearchMode('advanced')}
                  className={`px-4 py-2 rounded-lg font-mono transition-colors ${
                    searchMode === 'advanced'
                      ? 'bg-neon-green text-cyber-black'
                      : 'bg-cyber-dark text-gray-400 hover:text-neon-green'
                  }`}
                >
                  Advanced Query
                </button>
              </div>

              {/* Search Input */}
              <div className="relative">
                {searchMode === 'simple' ? (
                  <input
                    ref={inputRef}
                    type="text"
                    value={simpleQuery}
                    onChange={(e) => setSimpleQuery(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Search entities by value, type, or metadata..."
                    className="w-full px-4 py-3 pl-12 bg-cyber-black border border-neon-green/30 rounded-lg text-neon-green placeholder-gray-500 focus:outline-none focus:border-neon-green font-mono"
                  />
                ) : (
                  <textarea
                    ref={inputRef}
                    value={advancedQuery}
                    onChange={(e) => setAdvancedQuery(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="type:DOMAIN source:web value:*.example.com riskLevel:HIGH&#10;Use AND, OR, NOT operators&#10;Regex: /pattern/&#10;Date range: [2024-01-01 TO 2024-12-31]"
                    rows="3"
                    className="w-full px-4 py-3 pl-12 bg-cyber-black border border-neon-green/30 rounded-lg text-neon-green placeholder-gray-500 focus:outline-none focus:border-neon-green font-mono resize-none"
                  />
                )}
                
                <svg className="w-6 h-6 text-gray-500 absolute left-3 top-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              {/* Search Button */}
              <button
                onClick={handleSearch}
                disabled={isSearching}
                className="w-full mt-3 px-4 py-3 bg-neon-green text-cyber-black rounded-lg font-mono font-bold hover:bg-neon-green/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSearching ? 'Searching...' : 'Search'}
              </button>

              {/* Query Syntax Help */}
              {searchMode === 'advanced' && (
                <div className="mt-3 p-3 bg-cyber-black/50 rounded border-l-2 border-neon-green">
                  <p className="text-gray-400 text-sm font-mono mb-2">
                    <span className="text-neon-green">Query Syntax:</span>
                  </p>
                  <div className="text-xs text-gray-500 space-y-1 font-mono">
                    <div><span className="text-neon-cyan">type:</span>DOMAIN | <span className="text-neon-cyan">source:</span>web | <span className="text-neon-cyan">value:</span>*.com</div>
                    <div><span className="text-neon-cyan">riskLevel:</span>HIGH | <span className="text-neon-cyan">confidence:</span>[0.8 TO 1.0]</div>
                    <div><span className="text-neon-cyan">AND</span> | <span className="text-neon-cyan">OR</span> | <span className="text-neon-cyan">NOT</span> operators</div>
                    <div><span className="text-neon-cyan">/regex/</span> for pattern matching</div>
                  </div>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
              {/* Suggestions */}
              {suggestions.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-neon-green font-mono font-bold mb-2">Suggestions</h3>
                  <div className="space-y-2">
                    {suggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          if (searchMode === 'simple') {
                            setSimpleQuery(suggestion.text);
                          } else {
                            setAdvancedQuery(suggestion.text);
                          }
                        }}
                        className="w-full p-3 bg-cyber-darker rounded-lg border border-neon-green/20 hover:border-neon-green/50 transition-colors text-left"
                      >
                        <div className="font-mono text-neon-green">{suggestion.text}</div>
                        <div className="text-sm text-gray-400">{suggestion.description}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Search Results */}
              {results.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-neon-green font-mono font-bold mb-2">
                    Results ({results.length})
                  </h3>
                  <div className="space-y-2">
                    {results.map((result) => (
                      <div
                        key={result.id}
                        className="p-4 bg-cyber-darker rounded-lg border border-neon-green/20 hover:border-neon-green/50 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-mono text-neon-green font-bold">{result.value}</span>
                          <span className={`px-2 py-1 rounded text-xs font-mono ${
                            result.riskLevel === 'CRITICAL' ? 'bg-danger-red/20 text-danger-red' :
                            result.riskLevel === 'HIGH' ? 'bg-warning-yellow/20 text-warning-yellow' :
                            'bg-neon-green/20 text-neon-green'
                          }`}>
                            {result.riskLevel}
                          </span>
                        </div>
                        <div className="flex items-center text-sm text-gray-400">
                          <span className="mr-4">Type: {result.type}</span>
                          <span>Match: {result.match}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Search History */}
              {searchHistory.length > 0 && results.length === 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-neon-green font-mono font-bold">Recent Searches</h3>
                    <button
                      onClick={clearHistory}
                      className="text-sm text-gray-500 hover:text-danger-red transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="space-y-2">
                    {searchHistory.map((query, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          if (searchMode === 'simple') {
                            setSimpleQuery(query);
                          } else {
                            setAdvancedQuery(query);
                          }
                        }}
                        className="w-full p-3 bg-cyber-darker rounded-lg border border-neon-green/20 hover:border-neon-green/50 transition-colors text-left font-mono text-gray-300"
                      >
                        {query}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty State */}
              {results.length === 0 && suggestions.length === 0 && searchHistory.length === 0 && (
                <div className="text-center text-gray-500 py-12">
                  <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <p>Start typing to search entities...</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-neon-green/30 bg-cyber-darker">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 font-mono">
                  Press <kbd className="px-2 py-1 bg-cyber-black border border-neon-green/50 rounded text-neon-green text-xs">Enter</kbd> to search
                </span>
                <span className="text-gray-500 font-mono">
                  Press <kbd className="px-2 py-1 bg-cyber-black border border-neon-green/50 rounded text-neon-green text-xs">Esc</kbd> to close
                </span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default AdvancedSearch;
