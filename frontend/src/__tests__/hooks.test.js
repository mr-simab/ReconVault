/**
 * React Hooks Tests
 */

import { renderHook, act } from '@testing-library/react';
import { useState } from 'react';

// Mock hooks for testing
const useGraph = () => {
  const [graphData, setGraphData] = useState({ nodes: [], edges: [] });
  const [selectedNode, setSelectedNode] = useState(null);
  
  const addNode = (node) => {
    setGraphData(prev => ({
      ...prev,
      nodes: [...prev.nodes, node]
    }));
  };
  
  return { graphData, selectedNode, setSelectedNode, addNode };
};

const useWebSocket = (url) => {
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  
  const connect = () => setConnected(true);
  const disconnect = () => setConnected(false);
  const sendMessage = (msg) => setMessages(prev => [...prev, msg]);
  
  return { connected, messages, connect, disconnect, sendMessage };
};

const useKeyboardShortcuts = (shortcuts) => {
  const [triggeredShortcut, setTriggeredShortcut] = useState(null);
  
  const handleKeyPress = (key) => {
    const shortcut = shortcuts.find(s => s.key === key);
    if (shortcut) {
      setTriggeredShortcut(shortcut);
      shortcut.callback && shortcut.callback();
    }
  };
  
  return { triggeredShortcut, handleKeyPress };
};

const useCompliance = () => {
  const [complianceData, setComplianceData] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const fetchCompliance = async () => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setComplianceData({ score: 95, violations: [] });
      setLoading(false);
    }, 100);
  };
  
  return { complianceData, loading, fetchCompliance };
};


describe('useGraph Hook', () => {
  test('initializes with empty graph', () => {
    const { result } = renderHook(() => useGraph());
    expect(result.current.graphData.nodes).toEqual([]);
    expect(result.current.graphData.edges).toEqual([]);
  });

  test('adds node to graph', () => {
    const { result } = renderHook(() => useGraph());
    
    act(() => {
      result.current.addNode({ id: '1', type: 'domain', value: 'example.com' });
    });
    
    expect(result.current.graphData.nodes).toHaveLength(1);
    expect(result.current.graphData.nodes[0].value).toBe('example.com');
  });

  test('sets selected node', () => {
    const { result } = renderHook(() => useGraph());
    const node = { id: '1', type: 'domain', value: 'example.com' };
    
    act(() => {
      result.current.setSelectedNode(node);
    });
    
    expect(result.current.selectedNode).toEqual(node);
  });
});


describe('useWebSocket Hook', () => {
  test('initializes disconnected', () => {
    const { result } = renderHook(() => useWebSocket('ws://localhost:8000'));
    expect(result.current.connected).toBe(false);
  });

  test('connects to WebSocket', () => {
    const { result } = renderHook(() => useWebSocket('ws://localhost:8000'));
    
    act(() => {
      result.current.connect();
    });
    
    expect(result.current.connected).toBe(true);
  });

  test('disconnects from WebSocket', () => {
    const { result } = renderHook(() => useWebSocket('ws://localhost:8000'));
    
    act(() => {
      result.current.connect();
      result.current.disconnect();
    });
    
    expect(result.current.connected).toBe(false);
  });

  test('sends messages', () => {
    const { result } = renderHook(() => useWebSocket('ws://localhost:8000'));
    
    act(() => {
      result.current.sendMessage({ type: 'test', data: 'hello' });
    });
    
    expect(result.current.messages).toHaveLength(1);
  });
});


describe('useKeyboardShortcuts Hook', () => {
  test('handles keyboard shortcuts', () => {
    const mockCallback = jest.fn();
    const shortcuts = [
      { key: 'ctrl+f', callback: mockCallback, description: 'Search' }
    ];
    
    const { result } = renderHook(() => useKeyboardShortcuts(shortcuts));
    
    act(() => {
      result.current.handleKeyPress('ctrl+f');
    });
    
    expect(mockCallback).toHaveBeenCalled();
    expect(result.current.triggeredShortcut.key).toBe('ctrl+f');
  });

  test('ignores unregistered shortcuts', () => {
    const shortcuts = [
      { key: 'ctrl+f', callback: jest.fn() }
    ];
    
    const { result } = renderHook(() => useKeyboardShortcuts(shortcuts));
    
    act(() => {
      result.current.handleKeyPress('ctrl+x');
    });
    
    expect(result.current.triggeredShortcut).toBeNull();
  });
});


describe('useCompliance Hook', () => {
  test('initializes with null data', () => {
    const { result } = renderHook(() => useCompliance());
    expect(result.current.complianceData).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  test('fetches compliance data', async () => {
    const { result } = renderHook(() => useCompliance());
    
    await act(async () => {
      await result.current.fetchCompliance();
    });
    
    expect(result.current.complianceData).toBeTruthy();
    expect(result.current.complianceData.score).toBe(95);
  });

  test('sets loading state', async () => {
    const { result } = renderHook(() => useCompliance());
    
    act(() => {
      result.current.fetchCompliance();
    });
    
    expect(result.current.loading).toBe(true);
  });
});
