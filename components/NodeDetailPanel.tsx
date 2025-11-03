import React from 'react';
import type { GraphNode } from '../types';
import SeverityRadarView from './SeverityRadarView';

interface NodeDetailPanelProps {
  node: GraphNode | null;
  onClose: () => void;
  onExpand: (node: GraphNode) => void;
  isExpanding: boolean;
}

const NodeDetailPanel: React.FC<NodeDetailPanelProps> = ({ node, onClose, onExpand, isExpanding }) => {
  if (!node) return null;

  const maxDepth = 4;

  return (
    <div className="absolute top-0 right-0 h-full w-full md:w-1/3 max-w-lg bg-gray-800 bg-opacity-80 backdrop-blur-md shadow-2xl p-6 flex flex-col transition-transform transform translate-x-0 duration-500 ease-in-out z-10 overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-cyan-300" style={{ textShadow: '0 0 5px rgba(105, 255, 255, 0.7)' }}>{node.label}</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-300 mb-2 border-b border-gray-600 pb-1">Cascading Severity Radar</h3>
        {node.severityScores === undefined || node.severityScores === null ? (
             <div className="flex justify-center items-center h-48">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-cyan-300"></div>
            </div>
        ) : (
            <SeverityRadarView scores={node.severityScores} />
        )}
      </div>

      {node.memory === null && (
        <div className="flex justify-center items-center h-48">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-cyan-300"></div>
        </div>
      )}

      {node.memory && (
        <div className="space-y-6 flex-grow">
          <div>
            <h3 className="text-lg font-semibold text-gray-300 mb-2 border-b border-gray-600 pb-1">Context</h3>
            <p className="text-gray-400 leading-relaxed">{node.memory.context}</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-300 mb-2 border-b border-gray-600 pb-1">Reflections</h3>
            <ul className="space-y-3 list-inside">
              {node.memory.reflections.map((reflection, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-cyan-400 mr-3 mt-1">&#8227;</span>
                  <p className="text-gray-400 flex-1">{reflection}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="mt-8">
        <button
          onClick={() => onExpand(node)}
          disabled={node.isExpanded || isExpanding || node.depth >= maxDepth}
          className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 shadow-lg hover:shadow-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-opacity-50"
        >
          {isExpanding ? 'Expanding...' : (node.isExpanded ? 'Effects Expanded' : (node.depth >= maxDepth ? 'Max Depth Reached' : 'Expand Effects'))}
        </button>
      </div>
    </div>
  );
};

export default NodeDetailPanel;