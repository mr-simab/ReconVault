// Export Service Tests

import exportService from '../services/exportService';

describe('ExportService', () => {
  // Sample test data
  const sampleData = {
    nodes: [
      { id: '1', value: 'example.com', type: 'DOMAIN', riskLevel: 'HIGH', riskScore: 0.8, confidence: 0.9 },
      { id: '2', value: '192.168.1.1', type: 'IP_ADDRESS', riskLevel: 'MEDIUM', riskScore: 0.6, confidence: 0.85 }
    ],
    edges: [
      { id: 'e1', source: '1', target: '2', type: 'COMMUNICATES_WITH', confidence: 0.9 }
    ],
    metadata: {
      timestamp: '2024-01-01T00:00:00Z',
      source: 'test'
    }
  };

  // Mock DOM methods
  beforeAll(() => {
    // Mock createElement and appendChild for downloads
    document.createElement = jest.fn((tag) => {
      if (tag === 'a') {
        return {
          href: '',
          download: '',
          click: jest.fn(),
          style: {}
        };
      }
      return {};
    });

    document.body.appendChild = jest.fn();
    document.body.removeChild = jest.fn();

    // Mock URL.createObjectURL and revokeObjectURL
    global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = jest.fn();

    // Mock Blob
    global.Blob = jest.fn((content, options) => ({
      content,
      options
    }));
  });

  describe('exportJSON', () => {
    test('should export data as JSON', () => {
      const result = exportService.exportJSON(sampleData, 'test.json');
      
      expect(result).toBeDefined();
      expect(result.version).toBe('1.0');
      expect(result.format).toBe('ReconVault-JSON');
      expect(result.graph.nodes).toHaveLength(2);
      expect(result.graph.edges).toHaveLength(1);
    });

    test('should include metadata when option is true', () => {
      const result = exportService.exportJSON(sampleData, 'test.json', { includeMetadata: true });
      
      expect(result.graph.nodes[0].confidence).toBeDefined();
      expect(result.graph.metadata).toBeDefined();
    });

    test('should exclude metadata when option is false', () => {
      const result = exportService.exportJSON(sampleData, 'test.json', { includeMetadata: false });
      
      // Nodes should have minimal fields
      expect(result.graph.nodes[0]).toHaveProperty('id');
      expect(result.graph.nodes[0]).toHaveProperty('value');
      expect(result.graph.nodes[0]).toHaveProperty('type');
    });

    test('should include timestamp when option is true', () => {
      const result = exportService.exportJSON(sampleData, 'test.json', { timestamp: true });
      
      expect(result.exported).toBeDefined();
    });

    test('should include statistics', () => {
      const result = exportService.exportJSON(sampleData, 'test.json');
      
      expect(result.statistics).toBeDefined();
      expect(result.statistics.totalNodes).toBe(2);
      expect(result.statistics.totalEdges).toBe(1);
    });
  });

  describe('exportCSV', () => {
    test('should export nodes as CSV', () => {
      const result = exportService.exportCSV(sampleData, 'test');
      
      expect(result.nodesCSV).toBeDefined();
      expect(result.edgesCSV).toBeDefined();
    });

    test('should generate valid CSV format', () => {
      exportService.exportCSV(sampleData, 'test', { includeMetadata: false });
      const nodesCSV = exportService.generateNodesCSV(sampleData.nodes, { includeMetadata: false });
      
      // Check CSV header
      expect(nodesCSV).toContain('id,value,type');
      
      // Check CSV has rows
      const rows = nodesCSV.split('\n');
      expect(rows.length).toBeGreaterThan(1);
    });

    test('should escape commas in values', () => {
      const dataWithCommas = {
        nodes: [
          { id: '1', value: 'test, with comma', type: 'DOMAIN' }
        ],
        edges: []
      };
      
      const nodesCSV = exportService.generateNodesCSV(dataWithCommas.nodes, {});
      
      expect(nodesCSV).toContain('"test, with comma"');
    });
  });

  describe('exportNeo4j', () => {
    test('should generate valid Cypher queries', () => {
      const cypher = exportService.exportNeo4j(sampleData, 'test.cypher');
      
      expect(cypher).toContain('CREATE (n');
      expect(cypher).toContain('MATCH (a:Entity');
      expect(cypher).toBeDefined();
    });

    test('should include node properties', () => {
      const cypher = exportService.exportNeo4j(sampleData, 'test.cypher');
      
      expect(cypher).toContain('id:');
      expect(cypher).toContain('value:');
      expect(cypher).toContain('type:');
    });

    test('should include relationships', () => {
      const cypher = exportService.exportNeo4j(sampleData, 'test.cypher');
      
      expect(cypher).toContain('CREATE (a)-[');
      expect(cypher).toContain('COMMUNICATES_WITH');
    });
  });

  describe('exportGML', () => {
    test('should generate valid GML format', () => {
      const gml = exportService.exportGML(sampleData, 'test.gml');
      
      expect(gml).toContain('graph [');
      expect(gml).toContain('node [');
      expect(gml).toContain('edge [');
      expect(gml).toContain(']');
    });

    test('should include node properties', () => {
      const gml = exportService.exportGML(sampleData, 'test.gml');
      
      expect(gml).toContain('id');
      expect(gml).toContain('label');
      expect(gml).toContain('type');
    });

    test('should include edge properties', () => {
      const gml = exportService.exportGML(sampleData, 'test.gml');
      
      expect(gml).toContain('source');
      expect(gml).toContain('target');
      expect(gml).toContain('confidence');
    });
  });

  describe('exportGraphML', () => {
    test('should generate valid GraphML XML', () => {
      const xml = exportService.exportGraphML(sampleData, 'test.graphml');
      
      expect(xml).toContain('<?xml version="1.0"');
      expect(xml).toContain('<graphml');
      expect(xml).toContain('<graph');
      expect(xml).toContain('<node');
      expect(xml).toContain('<edge');
    });

    test('should define attribute keys', () => {
      const xml = exportService.exportGraphML(sampleData, 'test.graphml');
      
      expect(xml).toContain('<key id="value"');
      expect(xml).toContain('<key id="type"');
      expect(xml).toContain('<key id="riskLevel"');
    });

    test('should escape XML special characters', () => {
      const dataWithSpecialChars = {
        nodes: [
          { id: '1', value: '<test> & "quoted"', type: 'DOMAIN' }
        ],
        edges: []
      };
      
      const xml = exportService.exportGraphML(dataWithSpecialChars, 'test.graphml');
      
      expect(xml).toContain('&lt;test&gt;');
      expect(xml).toContain('&amp;');
      expect(xml).toContain('&quot;');
    });
  });

  describe('shareGraphLink', () => {
    beforeAll(() => {
      // Mock clipboard API
      Object.assign(navigator, {
        clipboard: {
          writeText: jest.fn(() => Promise.resolve())
        }
      });

      // Mock window.location
      delete window.location;
      window.location = { origin: 'http://localhost', pathname: '/graph' };
    });

    test('should create shareable link', () => {
      const link = exportService.shareGraphLink(sampleData);
      
      expect(link).toBeDefined();
      expect(link).toContain('http://localhost');
      expect(link).toContain('?share=');
    });

    test('should encode data as base64', () => {
      const link = exportService.shareGraphLink(sampleData);
      
      const shareParam = link.split('?share=')[1];
      expect(shareParam).toBeDefined();
      expect(shareParam.length).toBeGreaterThan(0);
    });

    test('should copy to clipboard', () => {
      exportService.shareGraphLink(sampleData);
      
      expect(navigator.clipboard.writeText).toHaveBeenCalled();
    });
  });

  describe('loadFromShareLink', () => {
    test('should decode base64 data', () => {
      const link = exportService.shareGraphLink(sampleData);
      const base64Data = link.split('?share=')[1];
      
      const decoded = exportService.loadFromShareLink(base64Data);
      
      expect(decoded).toBeDefined();
      expect(decoded.nodes).toBeDefined();
      expect(decoded.edges).toBeDefined();
    });

    test('should throw error for invalid data', () => {
      expect(() => {
        exportService.loadFromShareLink('invalid-base64');
      }).toThrow();
    });

    test('should preserve node count', () => {
      const link = exportService.shareGraphLink(sampleData);
      const base64Data = link.split('?share=')[1];
      
      const decoded = exportService.loadFromShareLink(base64Data);
      
      expect(decoded.nodes.length).toBe(sampleData.nodes.length);
      expect(decoded.edges.length).toBe(sampleData.edges.length);
    });
  });

  describe('calculateStatistics', () => {
    test('should calculate node and edge counts', () => {
      const stats = exportService.calculateStatistics(sampleData);
      
      expect(stats.totalNodes).toBe(2);
      expect(stats.totalEdges).toBe(1);
    });

    test('should group by node types', () => {
      const stats = exportService.calculateStatistics(sampleData);
      
      expect(stats.nodeTypes).toBeDefined();
      expect(stats.nodeTypes.DOMAIN).toBe(1);
      expect(stats.nodeTypes.IP_ADDRESS).toBe(1);
    });

    test('should group by risk levels', () => {
      const stats = exportService.calculateStatistics(sampleData);
      
      expect(stats.riskLevels).toBeDefined();
      expect(stats.riskLevels.HIGH).toBe(1);
      expect(stats.riskLevels.MEDIUM).toBe(1);
    });

    test('should calculate average connections', () => {
      const stats = exportService.calculateStatistics(sampleData);
      
      expect(stats.avgConnections).toBeDefined();
      expect(stats.avgConnections).toBeGreaterThan(0);
    });
  });

  describe('escapeXML', () => {
    test('should escape ampersand', () => {
      const result = exportService.escapeXML('Test & More');
      expect(result).toBe('Test &amp; More');
    });

    test('should escape less than', () => {
      const result = exportService.escapeXML('Test < More');
      expect(result).toBe('Test &lt; More');
    });

    test('should escape greater than', () => {
      const result = exportService.escapeXML('Test > More');
      expect(result).toBe('Test &gt; More');
    });

    test('should escape quotes', () => {
      const result = exportService.escapeXML('Test "quoted" text');
      expect(result).toBe('Test &quot;quoted&quot; text');
    });

    test('should escape apostrophes', () => {
      const result = exportService.escapeXML("Test 'quoted' text");
      expect(result).toBe("Test &apos;quoted&apos; text");
    });

    test('should handle non-string input', () => {
      const result = exportService.escapeXML(123);
      expect(result).toBe(123);
    });

    test('should escape multiple characters', () => {
      const result = exportService.escapeXML('<test> & "quoted" & \'more\'');
      expect(result).toBe('&lt;test&gt; &amp; &quot;quoted&quot; &amp; &apos;more&apos;');
    });
  });
});
