import React, { useEffect, useRef, useState } from "react";
import ForceGraph2D from "react-force-graph-2d";

export default function GraphView({ graph }) {
  const containerRef = useRef();
  const [dimensions, setDimensions] = useState({ width: 800, height: 400 });

  useEffect(() => {
    if (!containerRef.current) return;

    const resize = () => {
      setDimensions({
        width: containerRef.current.offsetWidth,
        height: containerRef.current.offsetHeight || 420
      });
    };

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  if (!graph?.nodes?.length) {
    return (
      <div className="text-cyan-400 p-4 border border-cyan-500 rounded-xl">
        No graph data available
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="border border-cyan-500 rounded-xl glow bg-black"
      style={{ height: "420px", width: "100%" }}
    >
      <ForceGraph2D
        width={dimensions.width}
        height={dimensions.height}
        graphData={graph}
        nodeAutoColorBy="group"
        nodeLabel={(node) => node.label}
        linkDirectionalParticles={2}
        linkDirectionalParticleSpeed={0.008}
        nodeVal={(node) => (node.type === "entity" ? 15 : 8)}
        linkWidth={(link) => 1.5}
        backgroundColor=" #020617"
        d3VelocityDecay={0.3} 
        cooldownTicks={200}   
               nodeCanvasObject={(node, ctx, globalScale) => {
          const label = node.label;
          const fontSize = 12 / globalScale;
          ctx.font = `${fontSize}px JetBrains Mono`;
          ctx.fillStyle = "#00ffd5";
          ctx.beginPath();
          ctx.arc(node.x, node.y, 5, 0, 2 * Math.PI, false);
          ctx.fill();
          ctx.fillStyle = "#00fff0";
          ctx.fillText(label, node.x + 8, node.y + 4);
        }}
        linkColor={() => "#0ff"}
        
      />
    </div>
  );
}