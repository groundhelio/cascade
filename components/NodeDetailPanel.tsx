import React from 'react';
import type { GraphNode } from '../types';
import SeverityRadarView from './SeverityRadarView';

interface NodeDetailPanelProps {
  node: GraphNode | null;
  onClose: () => void;
  onExpand: (node: GraphNode) => void;
  onRefresh: (node: GraphNode) => void;
  isExpanding: boolean;
}

const NodeDetailPanel: React.FC<NodeDetailPanelProps> = ({ node, onClose, onExpand, onRefresh, isExpanding }) => {
  const [showColorLegend, setShowColorLegend] = React.useState(false);
  
  if (!node) return null;

  const maxDepth = 50;

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

      <div className="mt-8 space-y-3">
        {/* Expand Button */}
        <button
          onClick={() => onExpand(node)}
          disabled={node.isExpanded || isExpanding || node.depth >= maxDepth}
          className="w-full bg-gray-900 hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-50"
        >
          {isExpanding ? 'Expanding...' : (node.isExpanded ? 'Effects Expanded' : (node.depth >= maxDepth ? 'Max Depth Reached' : 'Expand Effects'))}
        </button>
        
        {/* Refresh Button - Only show if node is expanded */}
        {node.isExpanded && (
          <button
            onClick={() => onRefresh(node)}
            disabled={isExpanding}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50 flex items-center justify-center space-x-2"
            title="Remove children and generate fresh data"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{isExpanding ? 'Refreshing...' : 'Refresh Node Effects'}</span>
          </button>
        )}
      </div>

      {/* Color Legend Footer */}
      <div className="mt-6 border-t border-gray-200 pt-4">
        <button
          onClick={() => setShowColorLegend(!showColorLegend)}
          className="w-full flex items-center justify-between text-sm text-gray-600 hover:text-gray-900 transition-colors py-2"
        >
          <span className="font-medium">Color Legend</span>
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className={`h-5 w-5 transition-transform duration-200 ${showColorLegend ? 'rotate-180' : ''}`}
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {showColorLegend && (
          <div className="mt-3 space-y-3 text-sm">
            {/* Root Node */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 rounded-full flex-shrink-0 mt-0.5" style={{ backgroundColor: '#e11d48' }}></div>
                <div className="flex-1">
                  <div className="font-bold text-gray-900">Root Event (Crisis)</div>
                  <div className="text-gray-700 text-xs mt-1">
                    The initial triggering event that starts the cascade. Represents the primary crisis or disruption.
                  </div>
                </div>
              </div>
            </div>
            
            {/* Primary Effects */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 rounded-full flex-shrink-0 mt-0.5 bg-gradient-to-br from-blue-500 to-purple-500"></div>
                <div className="flex-1">
                  <div className="font-bold text-gray-900">Primary Effects (Neutral/Mixed)</div>
                  <div className="text-gray-700 text-xs mt-1">
                    Direct first-level impacts across 7 categories: Politics, Economy, Security, Infrastructure, Communication, Health, and Education. Not inherently good or bad—depends on context.
                  </div>
                </div>
              </div>
            </div>
            
            {/* Consequences */}
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 rounded-full flex-shrink-0 mt-0.5" style={{ backgroundColor: '#b45309' }}></div>
                <div className="flex-1">
                  <div className="font-bold text-gray-900">Consequences (Negative)</div>
                  <div className="text-gray-700 text-xs mt-1">
                    Darker shades indicate negative cascading effects—problems that compound and worsen. These represent deterioration, harm, or disruption.
                  </div>
                </div>
              </div>
            </div>
            
            {/* Responses */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 rounded-full flex-shrink-0 mt-0.5" style={{ backgroundColor: '#10b981' }}></div>
                <div className="flex-1">
                  <div className="font-bold text-gray-900">Responses (Positive)</div>
                  <div className="text-gray-700 text-xs mt-1">
                    Green represents hope—adaptive responses, interventions, community actions, and policy measures that mitigate harm and build resilience.
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-200 mt-3">
              <div className="text-xs text-gray-600 italic">
                💡 <strong>Tip:</strong> As you expand deeper into the cascade, darker colors indicate worsening consequences, while green nodes show where positive interventions occur.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NodeDetailPanel;