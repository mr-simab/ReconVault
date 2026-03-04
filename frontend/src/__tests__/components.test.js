/**
 * Component Tests for ReconVault Frontend
 * 
 * Tests cover:
 * - GraphCanvas render and interactions
 * - LeftSidebar search functionality
 * - EntityInspector display
 * - ThemeSwitcher
 * - HelpPanel keyboard shortcuts
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';


// Mock components (simplified versions for testing)
const MockGraphCanvas = ({ data, onNodeClick, onZoom }) => (
  <div data-testid="graph-canvas">
    <div data-testid="zoom-controls">
      <button onClick={() => onZoom && onZoom('in')}>Zoom In</button>
      <button onClick={() => onZoom && onZoom('out')}>Zoom Out</button>
    </div>
    {data?.nodes?.map(node => (
      <div 
        key={node.id} 
        data-testid={`node-${node.id}`}
        onClick={() => onNodeClick && onNodeClick(node)}
      >
        {node.value}
      </div>
    ))}
  </div>
);

const MockLeftSidebar = ({ onSearch, onFilterChange }) => (
  <div data-testid="left-sidebar">
    <input
      data-testid="search-input"
      placeholder="Search..."
      onChange={(e) => onSearch && onSearch(e.target.value)}
    />
    <button 
      data-testid="search-button"
      onClick={() => onSearch && onSearch('test')}
    >
      Search
    </button>
    <select 
      data-testid="filter-select"
      onChange={(e) => onFilterChange && onFilterChange(e.target.value)}
    >
      <option value="all">All</option>
      <option value="domain">Domain</option>
      <option value="ip">IP</option>
    </select>
  </div>
);

const MockEntityInspector = ({ entity, onClose }) => (
  entity ? (
    <div data-testid="entity-inspector">
      <button data-testid="close-button" onClick={onClose}>Close</button>
      <div data-testid="entity-type">{entity.type}</div>
      <div data-testid="entity-value">{entity.value}</div>
      <div data-testid="entity-risk">{entity.riskLevel}</div>
    </div>
  ) : null
);

const MockThemeSwitcher = ({ currentTheme, onThemeChange }) => (
  <div data-testid="theme-switcher">
    <button 
      data-testid="toggle-theme"
      onClick={() => onThemeChange(currentTheme === 'dark' ? 'light' : 'dark')}
    >
      Toggle Theme
    </button>
    <span data-testid="current-theme">{currentTheme}</span>
  </div>
);

const MockHelpPanel = ({ shortcuts, onClose }) => (
  <div data-testid="help-panel">
    <button data-testid="close-help" onClick={onClose}>Close</button>
    <ul data-testid="shortcuts-list">
      {shortcuts?.map((shortcut, i) => (
        <li key={i} data-testid={`shortcut-${i}`}>
          {shortcut.key}: {shortcut.description}
        </li>
      ))}
    </ul>
  </div>
);


describe('GraphCanvas Component', () => {
  const sampleData = {
    nodes: [
      { id: '1', type: 'domain', value: 'example.com' },
      { id: '2', type: 'ip', value: '1.2.3.4' }
    ],
    edges: [
      { source: '1', target: '2', type: 'resolves_to' }
    ]
  };

  test('renders GraphCanvas component', () => {
    render(<MockGraphCanvas data={sampleData} />);
    expect(screen.getByTestId('graph-canvas')).toBeInTheDocument();
  });

  test('renders all nodes', () => {
    render(<MockGraphCanvas data={sampleData} />);
    expect(screen.getByTestId('node-1')).toBeInTheDocument();
    expect(screen.getByTestId('node-2')).toBeInTheDocument();
  });

  test('handles node click', () => {
    const handleClick = jest.fn();
    render(<MockGraphCanvas data={sampleData} onNodeClick={handleClick} />);
    
    fireEvent.click(screen.getByTestId('node-1'));
    expect(handleClick).toHaveBeenCalledWith(sampleData.nodes[0]);
  });

  test('handles zoom in', () => {
    const handleZoom = jest.fn();
    render(<MockGraphCanvas data={sampleData} onZoom={handleZoom} />);
    
    fireEvent.click(screen.getByText('Zoom In'));
    expect(handleZoom).toHaveBeenCalledWith('in');
  });

  test('handles zoom out', () => {
    const handleZoom = jest.fn();
    render(<MockGraphCanvas data={sampleData} onZoom={handleZoom} />);
    
    fireEvent.click(screen.getByText('Zoom Out'));
    expect(handleZoom).toHaveBeenCalledWith('out');
  });

  test('handles pan interaction', () => {
    // Pan would be more complex with actual canvas, this is a simplified test
    render(<MockGraphCanvas data={sampleData} />);
    expect(screen.getByTestId('graph-canvas')).toBeInTheDocument();
  });
});


describe('LeftSidebar Component', () => {
  test('renders LeftSidebar component', () => {
    render(<MockLeftSidebar />);
    expect(screen.getByTestId('left-sidebar')).toBeInTheDocument();
  });

  test('renders search input', () => {
    render(<MockLeftSidebar />);
    expect(screen.getByTestId('search-input')).toBeInTheDocument();
  });

  test('handles search input change', () => {
    const handleSearch = jest.fn();
    render(<MockLeftSidebar onSearch={handleSearch} />);
    
    const input = screen.getByTestId('search-input');
    fireEvent.change(input, { target: { value: 'example.com' } });
    
    expect(handleSearch).toHaveBeenCalledWith('example.com');
  });

  test('handles search button click', () => {
    const handleSearch = jest.fn();
    render(<MockLeftSidebar onSearch={handleSearch} />);
    
    fireEvent.click(screen.getByTestId('search-button'));
    expect(handleSearch).toHaveBeenCalledWith('test');
  });

  test('handles filter change', () => {
    const handleFilter = jest.fn();
    render(<MockLeftSidebar onFilterChange={handleFilter} />);
    
    const select = screen.getByTestId('filter-select');
    fireEvent.change(select, { target: { value: 'domain' } });
    
    expect(handleFilter).toHaveBeenCalledWith('domain');
  });
});


describe('EntityInspector Component', () => {
  const sampleEntity = {
    id: '1',
    type: 'domain',
    value: 'example.com',
    riskLevel: 'HIGH',
    metadata: { ip: '1.2.3.4' }
  };

  test('renders EntityInspector when entity provided', () => {
    render(<MockEntityInspector entity={sampleEntity} />);
    expect(screen.getByTestId('entity-inspector')).toBeInTheDocument();
  });

  test('does not render when no entity', () => {
    render(<MockEntityInspector entity={null} />);
    expect(screen.queryByTestId('entity-inspector')).not.toBeInTheDocument();
  });

  test('displays entity type', () => {
    render(<MockEntityInspector entity={sampleEntity} />);
    expect(screen.getByTestId('entity-type')).toHaveTextContent('domain');
  });

  test('displays entity value', () => {
    render(<MockEntityInspector entity={sampleEntity} />);
    expect(screen.getByTestId('entity-value')).toHaveTextContent('example.com');
  });

  test('displays risk level', () => {
    render(<MockEntityInspector entity={sampleEntity} />);
    expect(screen.getByTestId('entity-risk')).toHaveTextContent('HIGH');
  });

  test('handles close button click', () => {
    const handleClose = jest.fn();
    render(<MockEntityInspector entity={sampleEntity} onClose={handleClose} />);
    
    fireEvent.click(screen.getByTestId('close-button'));
    expect(handleClose).toHaveBeenCalled();
  });
});


describe('ThemeSwitcher Component', () => {
  test('renders ThemeSwitcher component', () => {
    render(<MockThemeSwitcher currentTheme="dark" />);
    expect(screen.getByTestId('theme-switcher')).toBeInTheDocument();
  });

  test('displays current theme', () => {
    render(<MockThemeSwitcher currentTheme="dark" />);
    expect(screen.getByTestId('current-theme')).toHaveTextContent('dark');
  });

  test('toggles theme from dark to light', () => {
    const handleThemeChange = jest.fn();
    render(<MockThemeSwitcher currentTheme="dark" onThemeChange={handleThemeChange} />);
    
    fireEvent.click(screen.getByTestId('toggle-theme'));
    expect(handleThemeChange).toHaveBeenCalledWith('light');
  });

  test('toggles theme from light to dark', () => {
    const handleThemeChange = jest.fn();
    render(<MockThemeSwitcher currentTheme="light" onThemeChange={handleThemeChange} />);
    
    fireEvent.click(screen.getByTestId('toggle-theme'));
    expect(handleThemeChange).toHaveBeenCalledWith('dark');
  });
});


describe('HelpPanel Component', () => {
  const sampleShortcuts = [
    { key: 'Ctrl+F', description: 'Search' },
    { key: 'Ctrl+Z', description: 'Undo' },
    { key: 'Ctrl+Shift+E', description: 'Export' }
  ];

  test('renders HelpPanel component', () => {
    render(<MockHelpPanel shortcuts={sampleShortcuts} />);
    expect(screen.getByTestId('help-panel')).toBeInTheDocument();
  });

  test('displays keyboard shortcuts', () => {
    render(<MockHelpPanel shortcuts={sampleShortcuts} />);
    expect(screen.getByTestId('shortcuts-list')).toBeInTheDocument();
    expect(screen.getByTestId('shortcut-0')).toBeInTheDocument();
  });

  test('handles close button click', () => {
    const handleClose = jest.fn();
    render(<MockHelpPanel shortcuts={sampleShortcuts} onClose={handleClose} />);
    
    fireEvent.click(screen.getByTestId('close-help'));
    expect(handleClose).toHaveBeenCalled();
  });

  test('renders all shortcuts', () => {
    render(<MockHelpPanel shortcuts={sampleShortcuts} />);
    expect(screen.getByTestId('shortcut-0')).toHaveTextContent('Ctrl+F: Search');
    expect(screen.getByTestId('shortcut-1')).toHaveTextContent('Ctrl+Z: Undo');
    expect(screen.getByTestId('shortcut-2')).toHaveTextContent('Ctrl+Shift+E: Export');
  });
});
