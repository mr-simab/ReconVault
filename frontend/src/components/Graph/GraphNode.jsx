// Graph Node Renderer Component
import { getEntityTypeConfig, getRiskLevelConfig } from '../../utils/colorMap';

const GraphNode = ({ 
  node, 
  ctx, 
  globalScale, 
  showLabels = true, 
  selectedNode = null, 
  hoverNode = null,
  highlightNodes = new Set()
}) => {
  if (!node) return null;

  // Get node configuration
  const entityConfig = getEntityTypeConfig(node.type);
  const riskConfig = getRiskLevelConfig(node.riskLevel);
  
  // Calculate node properties
  const size = node.size || 8;
  const isSelected = selectedNode?.id === node.id;
  const isHovered = hoverNode?.id === node.id;
  const isHighlighted = highlightNodes.has(node.id);
  
  // Node colors
  const nodeColor = node.color || riskConfig.color;
  const borderColor = isSelected
    ? '#00d9ff'
    : (isHighlighted ? '#00ff41' : nodeColor);

  // Save context state
  ctx.save();

  // Apply glow effect for high-risk or highlighted nodes
  if (riskConfig.priority >= 4 || isHighlighted) {
    ctx.shadowColor = isHighlighted ? borderColor : nodeColor;
    ctx.shadowBlur = isSelected ? 25 : (isHovered ? 20 : (isHighlighted ? 12 : 15));
  }

  // Draw main node circle
  ctx.beginPath();
  ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false);
  ctx.fillStyle = nodeColor;
  ctx.fill();
  
  // Draw border
  ctx.lineWidth = isSelected ? 3 : (isHovered || isHighlighted ? 2 : 1);
  ctx.strokeStyle = borderColor;
  ctx.stroke();

  // Draw inner circle for entity type
  if (size > 10) {
    ctx.beginPath();
    ctx.arc(node.x, node.y, size * 0.6, 0, 2 * Math.PI, false);
    ctx.fillStyle = '#0a0e27';
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = nodeColor;
    ctx.stroke();
  }

  // Draw entity type icon (simplified for canvas)
  if (size > 12) {
    const glyph = String(entityConfig.icon || '?');
    ctx.fillStyle = nodeColor;
    ctx.font = `${glyph.length > 2 ? size * 0.42 : size * 0.56}px "Share Tech Mono", Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(glyph, node.x, node.y);
  }

  // Draw selection ring
  if (isSelected) {
    ctx.beginPath();
    ctx.arc(node.x, node.y, size + 4, 0, 2 * Math.PI, false);
    ctx.strokeStyle = '#00d9ff';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Draw hover highlight
  if (isHovered) {
    ctx.beginPath();
    ctx.arc(node.x, node.y, size + 2, 0, 2 * Math.PI, false);
    ctx.strokeStyle = nodeColor;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Draw contextual labels without carpeting dense graphs.
  const rawLabel = node.label || node.value || node.val || node.name || node.id;
  const shouldDrawLabel = showLabels && rawLabel && (isSelected || isHovered || isHighlighted || globalScale > 1.35);

  if (shouldDrawLabel) {
    const label = rawLabel.length > 28 ? `${rawLabel.slice(0, 25)}...` : rawLabel;
    const fontSize = Math.max(8, Math.min(11, 11 / globalScale));
    const labelY = node.y + size + fontSize + 4;
    
    // Background for better readability
    ctx.font = `${fontSize}px "Share Tech Mono", monospace`;
    const textMetrics = ctx.measureText(label);
    const textWidth = textMetrics.width;
    const padding = 4;
    
    ctx.fillStyle = 'rgba(10, 14, 39, 0.8)';
    ctx.fillRect(
      node.x - textWidth / 2 - padding,
      labelY - fontSize / 2 - padding / 2,
      textWidth + padding * 2,
      fontSize + padding
    );
    
    // Draw label text
    ctx.fillStyle = '#00ff41';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, node.x, labelY);
  }

  // Draw risk level indicator
  if (riskConfig.priority >= 3) {
    const indicatorSize = Math.max(2, size * 0.2);
    const indicatorX = node.x + size * 0.7;
    const indicatorY = node.y - size * 0.7;
    
    ctx.beginPath();
    ctx.arc(indicatorX, indicatorY, indicatorSize, 0, 2 * Math.PI, false);
    ctx.fillStyle = nodeColor;
    ctx.fill();
    
    // Add pulsing effect for critical nodes
    if (riskConfig.priority === 5) {
      ctx.beginPath();
      ctx.arc(indicatorX, indicatorY, indicatorSize + 1, 0, 2 * Math.PI, false);
      ctx.strokeStyle = nodeColor;
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  // Draw connection count indicator
  if (node.connections && node.connections > 1) {
    const countText = node.connections.toString();
    const countSize = Math.max(6, size * 0.4);
    const countX = node.x - size * 0.8;
    const countY = node.y - size * 0.8;
    
    // Background circle
    ctx.beginPath();
    ctx.arc(countX, countY, countSize, 0, 2 * Math.PI, false);
    ctx.fillStyle = 'rgba(10, 14, 39, 0.9)';
    ctx.fill();
    ctx.strokeStyle = '#00d9ff';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // Count text
    ctx.fillStyle = '#00d9ff';
    ctx.font = `${countSize * 0.8}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(countText, countX, countY);
  }

  // Restore context state
  ctx.restore();
};

export default GraphNode;
