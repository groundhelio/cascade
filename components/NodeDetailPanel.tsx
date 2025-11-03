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

  const maxDepth = 30;

  return (
    <div className="h-full w-full bg-white p-6 flex flex-col overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">{node.label}</h2>
        <button 
          onClick={onClose} 
          className="text-gray-500 hover:text-gray-900 transition-colors flex-shrink-0 ml-2"
          title="Close panel"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2 border-b border-gray-200 pb-1">Cascading Severity Radar</h3>
        {node.severityScores === undefined || node.severityScores === null ? (
             <div className="flex justify-center items-center h-48">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gray-900"></div>
            </div>
        ) : (
            <SeverityRadarView scores={node.severityScores} />
        )}
      </div>

      {node.memory === null && (
        <div className="flex justify-center items-center h-48">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gray-900"></div>
        </div>
      )}

      {node.memory && (
        <div className="space-y-6 flex-grow">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2 border-b border-gray-200 pb-1">Context</h3>
            <p className="text-gray-700 leading-relaxed">{node.memory.context}</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2 border-b border-gray-200 pb-1">Reflections</h3>
            <ul className="space-y-3 list-inside">
              {node.memory.reflections.map((reflection, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-gray-900 mr-3 mt-1">•</span>
                  <p className="text-gray-700 flex-1">{reflection}</p>
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
          className="w-full bg-gray-900 hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-50"
        >
          {isExpanding ? 'Expanding...' : (node.isExpanded ? 'Effects Expanded' : (node.depth >= maxDepth ? 'Max Depth Reached' : 'Expand Effects'))}
        </button>
      </div>
    </div>
  );
};

export default NodeDetailPanel;