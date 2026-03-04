// Graph Export Service
// Handles exporting graph data in various formats

class ExportService {
  constructor() {
    this.defaultConfig = {
      includeMetadata: true,
      timestamp: true,
      attribution: 'ReconVault Intelligence Platform'
    };
  }

  /**
   * Export graph data as JSON
   * @param {Object} data - Graph data {nodes, edges, metadata}
   * @param {String} filename - Output filename
   * @param {Object} options - Export options
   */
  exportJSON(data, filename = 'graph-export.json', options = {}) {
    const config = { ...this.defaultConfig, ...options };
    
    const exportData = {
      version: '1.0',
      format: 'ReconVault-JSON',
      exported: config.timestamp ? new Date().toISOString() : undefined,
      attribution: config.attribution,
      graph: {
        nodes: config.includeMetadata ? data.nodes : data.nodes.map(n => ({
          id: n.id,
          value: n.value,
          type: n.type,
          riskLevel: n.riskLevel,
          riskScore: n.riskScore
        })),
        edges: config.includeMetadata ? data.edges : data.edges.map(e => ({
          id: e.id,
          source: e.source,
          target: e.target,
          type: e.type,
          confidence: e.confidence
        })),
        metadata: data.metadata || {}
      },
      statistics: this.calculateStatistics(data)
    };
    
    this.downloadFile(
      JSON.stringify(exportData, null, 2),
      filename,
      'application/json'
    );
    
    return exportData;
  }

  /**
   * Export graph data as CSV
   * @param {Object} data - Graph data {nodes, edges}
   * @param {String} filename - Output filename
   */
  exportCSV(data, filename = 'graph-export', options = {}) {
    const config = { ...this.defaultConfig, ...options };
    
    // Export nodes CSV
    const nodesCSV = this.generateNodesCSV(data.nodes, config);
    this.downloadFile(nodesCSV, `${filename}-nodes.csv`, 'text/csv');
    
    // Export edges CSV
    const edgesCSV = this.generateEdgesCSV(data.edges, config);
    this.downloadFile(edgesCSV, `${filename}-edges.csv`, 'text/csv');
    
    return { nodesCSV, edgesCSV };
  }

  /**
   * Generate CSV for nodes
   */
  generateNodesCSV(nodes, config) {
    if (!nodes || nodes.length === 0) return '';
    
    // Define columns
    const columns = ['id', 'value', 'type', 'riskLevel', 'riskScore', 'confidence', 'source', 'connections'];
    
    if (config.includeMetadata) {
      columns.push('metadata', 'created_at', 'updated_at');
    }
    
    // Generate header
    let csv = columns.join(',') + '\n';
    
    // Generate rows
    nodes.forEach(node => {
      const row = columns.map(col => {
        let value = node[col];
        
        if (col === 'metadata' && config.includeMetadata) {
          value = JSON.stringify(node.metadata || {});
        }
        
        // Escape commas and quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          value = `"${value.replace(/"/g, '""')}"`;
        }
        
        return value !== undefined && value !== null ? value : '';
      });
      
      csv += row.join(',') + '\n';
    });
    
    return csv;
  }

  /**
   * Generate CSV for edges
   */
  generateEdgesCSV(edges, config) {
    if (!edges || edges.length === 0) return '';
    
    // Define columns
    const columns = ['id', 'source', 'target', 'type', 'confidence', 'strength'];
    
    if (config.includeMetadata) {
      columns.push('metadata', 'created_at', 'updated_at');
    }
    
    // Generate header
    let csv = columns.join(',') + '\n';
    
    // Generate rows
    edges.forEach(edge => {
      const row = columns.map(col => {
        let value = edge[col];
        
        if (col === 'metadata' && config.includeMetadata) {
          value = JSON.stringify(edge.metadata || {});
        }
        
        // Escape commas and quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          value = `"${value.replace(/"/g, '""')}"`;
        }
        
        return value !== undefined && value !== null ? value : '';
      });
      
      csv += row.join(',') + '\n';
    });
    
    return csv;
  }

  /**
   * Export graph as image (PNG/SVG)
   * @param {HTMLElement} canvas - Canvas element or SVG element
   * @param {String} format - 'png' or 'svg'
   * @param {String} filename - Output filename
   * @param {Object} options - Export options
   */
  async exportImage(canvas, format = 'png', filename = 'graph-export', options = {}) {
    const config = { 
      ...this.defaultConfig, 
      watermark: true,
      backgroundColor: '#0a0e1a',
      ...options 
    };
    
    try {
      if (format === 'svg') {
        return await this.exportSVG(canvas, filename, config);
      } else {
        return await this.exportPNG(canvas, filename, config);
      }
    } catch (error) {
      console.error('[ExportService] Error exporting image:', error);
      throw error;
    }
  }

  /**
   * Export as PNG
   */
  async exportPNG(canvas, filename, config) {
    // Create a temporary canvas for rendering
    const tempCanvas = document.createElement('canvas');
    const ctx = tempCanvas.getContext('2d');
    
    // Set canvas size
    tempCanvas.width = canvas.width || 1920;
    tempCanvas.height = canvas.height || 1080;
    
    // Fill background
    ctx.fillStyle = config.backgroundColor;
    ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    
    // Draw the graph (this would need to be implemented based on your graph rendering)
    // For now, we'll capture the canvas directly
    if (canvas.toDataURL) {
      const dataURL = canvas.toDataURL('image/png');
      
      // Add watermark if enabled
      if (config.watermark) {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0);
          
          // Add watermark
          ctx.font = '16px monospace';
          ctx.fillStyle = 'rgba(0, 255, 65, 0.5)';
          ctx.fillText(config.attribution, 20, tempCanvas.height - 20);
          
          // Download
          const finalDataURL = tempCanvas.toDataURL('image/png');
          this.downloadDataURL(finalDataURL, `${filename}.png`);
        };
        img.src = dataURL;
      } else {
        this.downloadDataURL(dataURL, `${filename}.png`);
      }
    }
    
    return true;
  }

  /**
   * Export as SVG
   */
  async exportSVG(element, filename, config) {
    // Create SVG string
    const svgData = this.generateSVGString(element, config);
    
    // Download
    this.downloadFile(svgData, `${filename}.svg`, 'image/svg+xml');
    
    return svgData;
  }

  /**
   * Generate SVG string from element
   */
  generateSVGString(element, config) {
    // This is a simplified version - in production, you'd use a proper SVG serializer
    const width = element.width || 1920;
    const height = element.height || 1080;
    
    let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="${config.backgroundColor}"/>
  <!-- Graph content would be rendered here -->
`;
    
    if (config.watermark) {
      svg += `
  <text x="20" y="${height - 20}" font-family="monospace" font-size="16" fill="rgba(0, 255, 65, 0.5)">
    ${config.attribution}
  </text>`;
    }
    
    svg += '\n</svg>';
    
    return svg;
  }

  /**
   * Export as Neo4j Cypher format
   * @param {Object} data - Graph data {nodes, edges}
   * @param {String} filename - Output filename
   */
  exportNeo4j(data, filename = 'graph-export.cypher') {
    let cypher = '// ReconVault Graph Export to Neo4j Cypher\n';
    cypher += `// Generated: ${new Date().toISOString()}\n\n`;
    
    // Create nodes
    cypher += '// Create Nodes\n';
    data.nodes.forEach(node => {
      const props = {
        id: node.id,
        value: node.value,
        type: node.type,
        riskLevel: node.riskLevel,
        riskScore: node.riskScore,
        confidence: node.confidence,
        source: node.source
      };
      
      const propsStr = Object.entries(props)
        .filter(([_, v]) => v !== undefined && v !== null)
        .map(([k, v]) => `${k}: ${typeof v === 'string' ? `"${v}"` : v}`)
        .join(', ');
      
      cypher += `CREATE (n${node.id.replace(/[^a-zA-Z0-9]/g, '_')}:Entity {${propsStr}});\n`;
    });
    
    cypher += '\n// Create Relationships\n';
    data.edges.forEach(edge => {
      const sourceId = edge.source.replace(/[^a-zA-Z0-9]/g, '_');
      const targetId = edge.target.replace(/[^a-zA-Z0-9]/g, '_');
      const relType = edge.type.replace(/[^a-zA-Z0-9_]/g, '_');
      
      const props = {
        id: edge.id,
        confidence: edge.confidence,
        type: edge.type
      };
      
      const propsStr = Object.entries(props)
        .filter(([_, v]) => v !== undefined && v !== null)
        .map(([k, v]) => `${k}: ${typeof v === 'string' ? `"${v}"` : v}`)
        .join(', ');
      
      cypher += `MATCH (a:Entity {id: "${edge.source}"}), (b:Entity {id: "${edge.target}"})\n`;
      cypher += `CREATE (a)-[:${relType} {${propsStr}}]->(b);\n`;
    });
    
    this.downloadFile(cypher, filename, 'text/plain');
    
    return cypher;
  }

  /**
   * Export as GML (Graph Modelling Language)
   * @param {Object} data - Graph data {nodes, edges}
   * @param {String} filename - Output filename
   */
  exportGML(data, filename = 'graph-export.gml') {
    let gml = 'graph [\n';
    gml += '  directed 1\n';
    
    // Add nodes
    data.nodes.forEach(node => {
      gml += '  node [\n';
      gml += `    id ${node.id}\n`;
      gml += `    label "${node.value || node.id}"\n`;
      gml += `    type "${node.type}"\n`;
      gml += `    riskLevel "${node.riskLevel}"\n`;
      gml += `    riskScore ${node.riskScore || 0}\n`;
      gml += '  ]\n';
    });
    
    // Add edges
    data.edges.forEach(edge => {
      gml += '  edge [\n';
      gml += `    source ${edge.source}\n`;
      gml += `    target ${edge.target}\n`;
      gml += `    label "${edge.type}"\n`;
      gml += `    confidence ${edge.confidence || 0}\n`;
      gml += '  ]\n';
    });
    
    gml += ']\n';
    
    this.downloadFile(gml, filename, 'text/plain');
    
    return gml;
  }

  /**
   * Export as GraphML (XML-based)
   * @param {Object} data - Graph data {nodes, edges}
   * @param {String} filename - Output filename
   */
  exportGraphML(data, filename = 'graph-export.graphml') {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<graphml xmlns="http://graphml.graphdrawing.org/xmlns"\n';
    xml += '  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"\n';
    xml += '  xsi:schemaLocation="http://graphml.graphdrawing.org/xmlns\n';
    xml += '  http://graphml.graphdrawing.org/xmlns/1.0/graphml.xsd">\n';
    
    // Define keys (attributes)
    xml += '  <key id="value" for="node" attr.name="value" attr.type="string"/>\n';
    xml += '  <key id="type" for="node" attr.name="type" attr.type="string"/>\n';
    xml += '  <key id="riskLevel" for="node" attr.name="riskLevel" attr.type="string"/>\n';
    xml += '  <key id="riskScore" for="node" attr.name="riskScore" attr.type="double"/>\n';
    xml += '  <key id="relType" for="edge" attr.name="type" attr.type="string"/>\n';
    xml += '  <key id="confidence" for="edge" attr.name="confidence" attr.type="double"/>\n';
    
    xml += '  <graph id="G" edgedefault="directed">\n';
    
    // Add nodes
    data.nodes.forEach(node => {
      xml += `    <node id="${this.escapeXML(node.id)}">\n`;
      xml += `      <data key="value">${this.escapeXML(node.value || node.id)}</data>\n`;
      xml += `      <data key="type">${this.escapeXML(node.type)}</data>\n`;
      xml += `      <data key="riskLevel">${this.escapeXML(node.riskLevel)}</data>\n`;
      xml += `      <data key="riskScore">${node.riskScore || 0}</data>\n`;
      xml += '    </node>\n';
    });
    
    // Add edges
    data.edges.forEach((edge, idx) => {
      xml += `    <edge id="e${idx}" source="${this.escapeXML(edge.source)}" target="${this.escapeXML(edge.target)}">\n`;
      xml += `      <data key="relType">${this.escapeXML(edge.type)}</data>\n`;
      xml += `      <data key="confidence">${edge.confidence || 0}</data>\n`;
      xml += '    </edge>\n';
    });
    
    xml += '  </graph>\n';
    xml += '</graphml>\n';
    
    this.downloadFile(xml, filename, 'application/xml');
    
    return xml;
  }

  /**
   * Create shareable link (base64 encoded graph data)
   * @param {Object} data - Graph data {nodes, edges}
   * @returns {String} - Base64 encoded shareable link
   */
  shareGraphLink(data) {
    const compactData = {
      v: '1.0', // version
      n: data.nodes.map(n => ({
        i: n.id,
        v: n.value,
        t: n.type,
        r: n.riskScore
      })),
      e: data.edges.map(e => ({
        i: e.id,
        s: e.source,
        t: e.target,
        ty: e.type,
        c: e.confidence
      }))
    };
    
    const json = JSON.stringify(compactData);
    const base64 = btoa(unescape(encodeURIComponent(json)));
    
    const shareUrl = `${window.location.origin}${window.location.pathname}?share=${base64}`;
    
    // Copy to clipboard
    navigator.clipboard.writeText(shareUrl).catch(err => {
      console.error('[ExportService] Failed to copy to clipboard:', err);
    });
    
    return shareUrl;
  }

  /**
   * Load graph from shareable link
   * @param {String} base64Data - Base64 encoded graph data
   * @returns {Object} - Decoded graph data
   */
  loadFromShareLink(base64Data) {
    try {
      const json = decodeURIComponent(escape(atob(base64Data)));
      const compactData = JSON.parse(json);
      
      // Expand compact data
      return {
        nodes: compactData.n.map(n => ({
          id: n.i,
          value: n.v,
          type: n.t,
          riskScore: n.r
        })),
        edges: compactData.e.map(e => ({
          id: e.i,
          source: e.s,
          target: e.t,
          type: e.ty,
          confidence: e.c
        }))
      };
    } catch (error) {
      console.error('[ExportService] Error loading from share link:', error);
      throw new Error('Invalid share link');
    }
  }

  /**
   * Calculate statistics for export metadata
   */
  calculateStatistics(data) {
    const nodeTypes = {};
    const riskLevels = {};
    
    data.nodes.forEach(node => {
      nodeTypes[node.type] = (nodeTypes[node.type] || 0) + 1;
      riskLevels[node.riskLevel] = (riskLevels[node.riskLevel] || 0) + 1;
    });
    
    return {
      totalNodes: data.nodes.length,
      totalEdges: data.edges.length,
      nodeTypes,
      riskLevels,
      avgConnections: data.edges.length > 0 ? (data.edges.length * 2) / data.nodes.length : 0
    };
  }

  /**
   * Download file helper
   */
  downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }

  /**
   * Download data URL helper
   */
  downloadDataURL(dataURL, filename) {
    const link = document.createElement('a');
    link.href = dataURL;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Escape XML special characters
   */
  escapeXML(str) {
    if (typeof str !== 'string') return str;
    
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

// Create singleton instance
const exportService = new ExportService();

export default exportService;
