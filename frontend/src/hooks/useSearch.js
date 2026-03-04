// Custom hook for search functionality
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useDebounce } from './useDebounce';
import graphService from '../services/graphService';
import { VALIDATION } from '../utils/constants';

export const useSearch = (initialQuery = '') => {
  // Search state
  const [query, setQuery] = useState(initialQuery);
  const [filters, setFilters] = useState({});
  const [results, setResults] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  
  // Debounced query for performance
  const debouncedQuery = useDebounce(query, VALIDATION.SEARCH_DEBOUNCE);
  
  // Search filters state
  const [activeFilters, setActiveFilters] = useState({
    entityTypes: [],
    riskLevels: [],
    confidenceRange: { min: 0, max: 1 },
    dateRange: null,
    sources: []
  });
  
  // Search history
  const [searchHistory, setSearchHistory] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  
  // Popular searches for suggestions
  const popularSearches = useMemo(() => [
    'malware',
    'phishing',
    'domain',
    'email',
    'ip address',
    'social media',
    'threat actor',
    'campaign',
    'vulnerability',
    'exploit'
  ], []);
  
  // Load search history from localStorage
  useEffect(() => {
    try {
      const history = localStorage.getItem('reconvault:search:history');
      const recent = localStorage.getItem('reconvault:search:recent');
      
      if (history) {
        setSearchHistory(JSON.parse(history));
      }
      
      if (recent) {
        setRecentSearches(JSON.parse(recent));
      }
    } catch (error) {
      console.warn('[useSearch] Error loading search history:', error);
    }
  }, []);
  
  // Save search to history
  const saveSearchToHistory = useCallback((searchQuery) => {
    if (!searchQuery.trim()) return;
    
    const searchEntry = {
      query: searchQuery.trim(),
      timestamp: new Date().toISOString(),
      filters: { ...activeFilters }
    };
    
    // Add to history
    const newHistory = [searchEntry, ...searchHistory.filter(h => h.query !== searchQuery)];
    const limitedHistory = newHistory.slice(0, 50); // Keep last 50 searches
    
    setSearchHistory(limitedHistory);
    
    // Add to recent searches (last 10 unique queries)
    const newRecent = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)];
    const limitedRecent = newRecent.slice(0, 10);
    
    setRecentSearches(limitedRecent);
    
    // Save to localStorage
    try {
      localStorage.setItem('reconvault:search:history', JSON.stringify(limitedHistory));
      localStorage.setItem('reconvault:search:recent', JSON.stringify(limitedRecent));
    } catch (error) {
      console.warn('[useSearch] Error saving search history:', error);
    }
  }, [searchHistory, recentSearches, activeFilters]);
  
  // Perform search
  const performSearch = useCallback(async (searchQuery = debouncedQuery, searchFilters = activeFilters) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setHasSearched(false);
      return;
    }
    
    // Validate query length
    if (searchQuery.length < VALIDATION.SEARCH_QUERY.MIN_LENGTH) {
      setError(`Query must be at least ${VALIDATION.SEARCH_QUERY.MIN_LENGTH} characters`);
      return;
    }
    
    if (searchQuery.length > VALIDATION.SEARCH_QUERY.MAX_LENGTH) {
      setError(`Query must be less than ${VALIDATION.SEARCH_QUERY.MAX_LENGTH} characters`);
      return;
    }
    
    setLoading(true);
    setError(null);
    setHasSearched(true);
    
    try {
      console.log('[useSearch] Performing search:', searchQuery, searchFilters);
      
      const searchResults = await graphService.searchEntities(searchQuery, searchFilters);
      
      setResults(searchResults);
      
      // Save to history
      saveSearchToHistory(searchQuery);
      
      console.log(`[useSearch] Found ${searchResults.length} results`);
      
    } catch (err) {
      console.error('[useSearch] Search error:', err);
      setError(err.message || 'Search failed');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, activeFilters, saveSearchToHistory]);
  
  // Generate search suggestions
  const generateSuggestions = useCallback(async (partialQuery) => {
    if (!partialQuery || partialQuery.length < 2) {
      setSuggestions([]);
      return;
    }
    
    const query = partialQuery.toLowerCase();
    
    // Combine recent searches, popular searches, and history
    const allSuggestions = [
      ...recentSearches,
      ...popularSearches,
      ...searchHistory.map(h => h.query)
    ];
    
    // Filter and deduplicate
    const uniqueSuggestions = [...new Set(allSuggestions)]
      .filter(suggestion => suggestion.toLowerCase().includes(query))
      .slice(0, 8); // Limit to 8 suggestions
    
    setSuggestions(uniqueSuggestions);
  }, [recentSearches, popularSearches, searchHistory]);
  
  // Update query and generate suggestions
  const updateQuery = useCallback((newQuery) => {
    setQuery(newQuery);
    generateSuggestions(newQuery);
  }, [generateSuggestions]);
  
  // Update filters
  const updateFilters = useCallback((newFilters) => {
    setActiveFilters(prev => ({ ...prev, ...newFilters }));
  }, []);
  
  // Clear all filters
  const clearFilters = useCallback(() => {
    const clearedFilters = {
      entityTypes: [],
      riskLevels: [],
      confidenceRange: { min: 0, max: 1 },
      dateRange: null,
      sources: []
    };
    setActiveFilters(clearedFilters);
    setFilters({});
  }, []);
  
  // Clear search
  const clearSearch = useCallback(() => {
    setQuery('');
    setResults([]);
    setSuggestions([]);
    setError(null);
    setHasSearched(false);
  }, []);
  
  // Search with specific query and filters
  const search = useCallback((searchQuery, searchFilters = null) => {
    const filtersToUse = searchFilters || activeFilters;
    return performSearch(searchQuery, filtersToUse);
  }, [performSearch, activeFilters]);
  
  // Get search statistics
  const getSearchStats = useCallback(() => {
    const entityTypes = {};
    const riskLevels = {};
    const avgConfidence = results.length > 0 ? 
      results.reduce((sum, result) => sum + (result.confidence || 0), 0) / results.length : 0;
    
    results.forEach(result => {
      const type = result.type || 'UNKNOWN';
      const riskLevel = result.riskLevel || 'INFO';
      
      entityTypes[type] = (entityTypes[type] || 0) + 1;
      riskLevels[riskLevel] = (riskLevels[riskLevel] || 0) + 1;
    });
    
    return {
      totalResults: results.length,
      entityTypes,
      riskLevels,
      avgConfidence: Math.round(avgConfidence * 100) / 100,
      searchTime: performance.now() // This would be calculated properly in a real implementation
    };
  }, [results]);
  
  // Export search results
  const exportResults = useCallback((format = 'json') => {
    if (results.length === 0) {
      throw new Error('No results to export');
    }
    
    const exportData = {
      query,
      filters: activeFilters,
      results,
      stats: getSearchStats(),
      exportedAt: new Date().toISOString()
    };
    
    if (format === 'json') {
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `search-results-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
    
    return exportData;
  }, [query, activeFilters, results, getSearchStats]);
  
  // Trigger search when debounced query changes
  useEffect(() => {
    if (debouncedQuery.trim()) {
      performSearch();
    } else {
      setResults([]);
      setHasSearched(false);
    }
  }, [debouncedQuery, performSearch]);
  
  // Memoized values
  const searchStats = useMemo(() => getSearchStats(), [getSearchStats]);
  
  const hasActiveFilters = useMemo(() => {
    return activeFilters.entityTypes.length > 0 ||
           activeFilters.riskLevels.length > 0 ||
           activeFilters.confidenceRange.min > 0 ||
           activeFilters.confidenceRange.max < 1 ||
           activeFilters.dateRange !== null ||
           activeFilters.sources.length > 0;
  }, [activeFilters]);
  
  const isValidQuery = useMemo(() => {
    return query.length >= VALIDATION.SEARCH_QUERY.MIN_LENGTH &&
           query.length <= VALIDATION.SEARCH_QUERY.MAX_LENGTH;
  }, [query]);
  
  return {
    // State
    query,
    filters: activeFilters,
    results,
    suggestions,
    loading,
    error,
    hasSearched,
    searchHistory,
    recentSearches,
    popularSearches,
    
    // Computed values
    searchStats,
    hasActiveFilters,
    isValidQuery,
    hasResults: results.length > 0,
    resultCount: results.length,
    
    // Actions
    updateQuery,
    updateFilters,
    clearFilters,
    clearSearch,
    search,
    performSearch,
    generateSuggestions,
    exportResults,
    
    // Utilities
    getSearchStats,
    saveSearchToHistory
  };
};