// Graph Edge Renderer Component
import { getRelationshipTypeConfig } from '../../utils/colorMap';
import { formatConfidence } from '../../utils/formatters';

const GraphEdge = ({ 
  link, 
  ctx, 
  selectedEdge = null, 
  highlightLinks = new Set() 
}) => {
  if (!link) return null;

  // Get relationship configuration
  const relationshipConfig = getRelationshipTypeConfig(link.type);
  
  const getNodePosition = (node) => {
    if (node && typeof node === 'object') {
      return { x: node.x, y: node.y };
    }
    return { x: undefined, y: undefined };
  };

  // Calculate edge properties (force-graph may provide source/target as ids initially)
  const { x: sourceX, y: sourceY } = getNodePosition(link.source);
  const { x: targetX, y: targetY } = getNodePosition(link.target);

  if (![sourceX, sourceY, targetX, targetY].every(Number.isFinite)) {
    return null;
  }

  const isSelected = selectedEdge?.id === link.id;
  const isHighlighted = highlightLinks.has(link) || highlightLinks.has(link.id);
  
  // Edge styling
  const edgeColor = link.color || relationshipConfig.color;
  const lineWidth = link.thickness || 1;
  const opacity = isSelected ? 1 : (isHighlighted ? 0.8 : 0.6);
  
  // Calculate control points for curved edge
  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const dr = Math.sqrt(dx * dx + dy * dy) || 1;
  
  // Curvature control point
  const curvature = 0.3;
  const controlPointX = (sourceX + targetX) / 2 + (-dy * curvature);
  const controlPointY = (sourceY + targetY) / 2 + (dx * curvature);

  // Save context state
  ctx.save();

  // Set edge styles
  ctx.globalAlpha = opacity;
  ctx.strokeStyle = edgeColor;
  ctx.lineWidth = isSelected ? lineWidth + 1 : lineWidth;
  
  // Set line dash for certain relationship types
  if (link.type === 'RELATED_TO' || link.type === 'MENTIONS') {
    ctx.setLineDash([5, 5]);
  } else {
    ctx.setLineDash([]);
  }

  // Draw curved edge path
  ctx.beginPath();
  ctx.moveTo(sourceX, sourceY);
  ctx.quadraticCurveTo(controlPointX, controlPointY, targetX, targetY);
  ctx.stroke();

  // Draw animated flow effect for high-confidence relationships
  if (link.confidence > 0.8) {
    const gradient = ctx.createLinearGradient(sourceX, sourceY, targetX, targetY);
    gradient.addColorStop(0, 'rgba(0, 255, 65, 0.8)');
    gradient.addColorStop(0.5, 'rgba(0, 217, 255, 0.6)');
    gradient.addColorStop(1, 'rgba(0, 255, 65, 0.8)');
    
    ctx.strokeStyle = gradient;
    ctx.lineWidth = lineWidth * 0.5;
    ctx.setLineDash([10, 10]);
    
    // Animate by offsetting the dash
    const time = Date.now() * 0.005;
    ctx.lineDashOffset = -time % 20;
    
    ctx.beginPath();
    ctx.moveTo(sourceX, sourceY);
    ctx.quadraticCurveTo(controlPointX, controlPointY, targetX, targetY);
    ctx.stroke();
  }

  // Draw arrowhead at target
  const arrowSize = Math.max(3, lineWidth * 2);
  const angle = Math.atan2(targetY - controlPointY, targetX - controlPointX);
  
  ctx.fillStyle = edgeColor;
  ctx.beginPath();
  ctx.moveTo(targetX, targetY);
  ctx.lineTo(
    targetX - arrowSize * Math.cos(angle - Math.PI / 6),
    targetY - arrowSize * Math.sin(angle - Math.PI / 6)
  );
  ctx.lineTo(
    targetX - arrowSize * Math.cos(angle + Math.PI / 6),
    targetY - arrowSize * Math.sin(angle + Math.PI / 6)
  );
  ctx.closePath();
  ctx.fill();

  // Draw selection highlight
  if (isSelected) {
    ctx.strokeStyle = '#00d9ff';
    ctx.lineWidth = lineWidth + 2;
    ctx.setLineDash([3, 3]);
    ctx.globalAlpha = 0.8;
    
    ctx.beginPath();
    ctx.moveTo(sourceX, sourceY);
    ctx.quadraticCurveTo(controlPointX, controlPointY, targetX, targetY);
    ctx.stroke();
  }

  // Draw edge label for high-confidence or selected edges
  if ((link.confidence > 0.7 || isSelected) && link.label) {
    const midX = (sourceX + targetX) / 2;
    const midY = (sourceY + targetY) / 2;
    
    // Background for label
    const labelText = link.label;
    const fontSize = Math.max(8, 10);
    
    ctx.font = `${fontSize}px "Share Tech Mono", monospace`;
    const textMetrics = ctx.measureText(labelText);
    const textWidth = textMetrics.width;
    const padding = 3;
    
    // Position label slightly offset from edge
    const offsetX = (-dy / dr) * 10;
    const offsetY = (dx / dr) * 10;
    
    const labelX = midX + offsetX;
    const labelY = midY + offsetY;
    
    // Background rectangle
    ctx.fillStyle = 'rgba(10, 14, 39, 0.9)';
    ctx.fillRect(
      labelX - textWidth / 2 - padding,
      labelY - fontSize / 2 - padding / 2,
      textWidth + padding * 2,
      fontSize + padding
    );
    
    // Border
    ctx.strokeStyle = edgeColor;
    ctx.lineWidth = 1;
    ctx.strokeRect(
      labelX - textWidth / 2 - padding,
      labelY - fontSize / 2 - padding / 2,
      textWidth + padding * 2,
      fontSize + padding
    );
    
    // Label text
    ctx.fillStyle = '#00ff41';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(labelText, labelX, labelY);
  }

  // Draw confidence indicator for selected or important edges
  if (isSelected || link.confidence > 0.8) {
    const confidence = formatConfidence(link.confidence, false);
    const confX = (sourceX + targetX) / 2;
    const confY = (sourceY + targetY) / 2 + 15;
    
    // Confidence text
    ctx.font = '8px "Share Tech Mono", monospace';
    ctx.fillStyle = edgeColor;
    ctx.textAlign = 'center';
    ctx.fillText(confidence, confX, confY);
  }

  // Draw relationship type indicator
  if (link.type && (isSelected || link.confidence > 0.6)) {
    const typeX = (sourceX + targetX) / 2;
    const typeY = (sourceY + targetY) / 2 - 15;
    
    // Background circle
    ctx.beginPath();
    ctx.arc(typeX, typeY, 8, 0, 2 * Math.PI, false);
    ctx.fillStyle = 'rgba(10, 14, 39, 0.9)';
    ctx.fill();
    ctx.strokeStyle = edgeColor;
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // Type icon/text
    ctx.fillStyle = edgeColor;
    ctx.font = '6px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Use first letter of relationship type or icon
    const typeText = relationshipConfig.icon || link.type.charAt(0);
    ctx.fillText(typeText, typeX, typeY);
  }

  // Restore context state
  ctx.restore();
};

export default GraphEdge;