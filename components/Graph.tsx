import React from 'react';
import type { GraphData, GraphNode } from '../types';

interface GraphProps {
  data: GraphData;
  onNodeClick: (node: GraphNode) => void;
  width: number;
  height: number;
}

// Lightweight fallback graph renderer using CSS grid.
// This keeps the project runnable without bundling amcharts.
const Graph: React.FC<GraphProps> = ({ data, onNodeClick }) => {
  return (
    <div className="w-full h-full p-6 overflow-auto">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {data.nodes.map((node) => (
          <button
            key={node.id}
            onClick={() => onNodeClick(node)}
            className="text-left p-4 rounded-lg shadow-lg transform hover:scale-105 transition-all duration-150 bg-opacity-10"
            style={{ backgroundColor: node.color }}
            aria-label={`Open ${node.label}`}
          >
            <div className="font-semibold text-white truncate" style={{ textShadow: '0 0 6px rgba(0,0,0,0.5)' }}>{node.label}</div>
            <div className="text-sm text-gray-200 mt-2">Depth: {node.depth}</div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default Graph;