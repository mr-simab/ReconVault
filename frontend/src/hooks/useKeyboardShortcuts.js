import { useEffect } from 'react';

/**
 * Custom hook for keyboard shortcuts
 * @param {Object} shortcuts - Map of key combinations to callbacks
 * @param {Boolean} enabled - Whether shortcuts are enabled
 */
const useKeyboardShortcuts = (shortcuts, enabled = true) => {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event) => {
      // Build key combination string
      const keys = [];
      
      if (event.ctrlKey || event.metaKey) keys.push('ctrl');
      if (event.shiftKey) keys.push('shift');
      if (event.altKey) keys.push('alt');
      
      // Add main key (normalized)
      const mainKey = event.key.toLowerCase();
      if (!['control', 'shift', 'alt', 'meta'].includes(mainKey)) {
        keys.push(mainKey);
      }
      
      const combination = keys.join('+');
      
      // Check if this combination has a handler
      const handler = shortcuts[combination];
      
      if (handler) {
        // Prevent default behavior
        event.preventDefault();
        event.stopPropagation();
        
        // Execute handler
        try {
          handler(event);
        } catch (error) {
          console.error('[useKeyboardShortcuts] Error executing handler:', error);
        }
      }
    };

    // Add event listener
    window.addEventListener('keydown', handleKeyDown);
    
    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [shortcuts, enabled]);
};

export default useKeyboardShortcuts;

/**
 * Default keyboard shortcuts configuration
 */
export const defaultShortcuts = {
  // Navigation
  'c': 'centerView',
  'f': 'fitToScreen',
  '+': 'zoomIn',
  '-': 'zoomOut',
  'ctrl+a': 'selectAll',
  'escape': 'deselectAll',
  
  // Search & Filter
  'ctrl+f': 'focusSearch',
  'ctrl+shift+f': 'advancedSearch',
  'ctrl+k': 'filterMenu',
  '/': 'quickSearch',
  
  // Export & Save
  'ctrl+e': 'exportGraph',
  'ctrl+s': 'saveSnapshot',
  'ctrl+l': 'shareLink',
  
  // Help
  '?': 'keyboardShortcuts',
  'h': 'helpPanel',
  
  // Other
  'delete': 'deleteSelected',
  ' ': 'toggleSimulation',
  'ctrl+shift+d': 'toggleDebug'
};

/**
 * Convert action string to friendly name
 */
export const getShortcutName = (action) => {
  const names = {
    centerView: 'Center View',
    fitToScreen: 'Fit to Screen',
    zoomIn: 'Zoom In',
    zoomOut: 'Zoom Out',
    selectAll: 'Select All Nodes',
    deselectAll: 'Deselect All',
    focusSearch: 'Focus Search',
    advancedSearch: 'Advanced Search',
    filterMenu: 'Filter Menu',
    quickSearch: 'Quick Search',
    exportGraph: 'Export Graph',
    saveSnapshot: 'Save Snapshot',
    shareLink: 'Share/Copy Link',
    keyboardShortcuts: 'Keyboard Shortcuts',
    helpPanel: 'Help Panel',
    deleteSelected: 'Delete Selected',
    toggleSimulation: 'Toggle Simulation',
    toggleDebug: 'Toggle Debug Overlay'
  };
  
  return names[action] || action;
};
