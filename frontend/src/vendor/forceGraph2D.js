import fromKapsule from 'react-kapsule';
import ForceGraph2DKapsule from 'force-graph';

export const ForceGraph2D = fromKapsule(ForceGraph2DKapsule, {
  methodNames: [
    'emitParticle',
    'd3Force',
    'd3ReheatSimulation',
    'stopAnimation',
    'pauseAnimation',
    'resumeAnimation',
    'centerAt',
    'zoom',
    'zoomToFit',
    'getGraphBbox',
    'screen2GraphCoords',
    'graph2ScreenCoords',
    'canvas'
  ]
});

ForceGraph2D.displayName = 'ForceGraph2D';
