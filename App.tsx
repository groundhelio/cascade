import React, { useState, useEffect, useCallback, useRef } from 'react';
import Graph from './components/Graph';
import NodeDetailPanel from './components/NodeDetailPanel';
import CountrySelectionModal from './components/CountrySelectionModal';
import Loader from './components/Loader';
import { generateInitialBranches, expandNode, getNodeMemory, getSeverityScores, clearNodeCache, clearAllCaches } from './services/geminiService';
import { loadGraphState, saveGraphState } from './services/firebaseService';
import type { GraphData, GraphNode } from './types';
import { v4 as uuidv4 } from 'uuid';
import { useIsMobile, useIsTablet, useIsPortrait, useBreakpoint } from './hooks/useMediaQuery';

const colors = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#6366f1", "#14b8a6"];
const responseColor = '#10b981'; // A hopeful green for responses

// Helper to generate a darker/lighter shade of a color
const shadeColor = (color: string, percent: number): string => {
    let R = parseInt(color.substring(1,3),16);
    let G = parseInt(color.substring(3,5),16);
    let B = parseInt(color.substring(5,7),16);

    R = Math.floor(R * (100 + percent) / 100);
    G = Math.floor(G * (100 + percent) / 100);
    B = Math.floor(B * (100 + percent) / 100);

    R = Math.min(255, Math.max(0, R));
    G = Math.min(255, Math.max(0, G));
    B = Math.min(255, Math.max(0, B));

    const RR = R.toString(16).padStart(2, '0');
    const GG = G.toString(16).padStart(2, '0');
    const BB = B.toString(16).padStart(2, '0');

    return "#"+RR+GG+BB;
}

const App: React.FC = () => {
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanding, setIsExpanding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [isCountryModalOpen, setIsCountryModalOpen] = useState(false);
  const [isPanelVisible, setIsPanelVisible] = useState(false);
  
  // Responsive hooks
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const isPortrait = useIsPortrait();
  const breakpoint = useBreakpoint();
  
  // Use ref to track save timeout for debouncing
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load country from localStorage on mount
  useEffect(() => {
    const savedCountry = localStorage.getItem('cascadeCountryContext');
    if (savedCountry && savedCountry !== 'null') {
      setSelectedCountry(savedCountry);
    }
  }, []);

  // Handle country selection change
  const handleCountryChange = useCallback((newCountry: string | null) => {
    console.log('[Country] Changing context from', selectedCountry, 'to', newCountry);
    
    // Save to localStorage
    if (newCountry) {
      localStorage.setItem('cascadeCountryContext', newCountry);
    } else {
      localStorage.removeItem('cascadeCountryContext');
    }
    
    setSelectedCountry(newCountry);
    
    // Clear all caches since context has changed
    clearAllCaches();
    
    // Remove all nodes at depth >= 2 (keep root and primary effects)
    setGraphData(prevData => {
      const nodesToKeep = prevData.nodes.filter(n => n.depth <= 1);
      const nodeIdsToKeep = new Set(nodesToKeep.map(n => n.id));
      
      // Reset isExpanded for all kept nodes
      const resetNodes = nodesToKeep.map(n => ({ ...n, isExpanded: n.depth === 0 }));
      
      // Filter links to only those between kept nodes
      const linksToKeep = prevData.links.filter(l =>
        nodeIdsToKeep.has(l.source) && nodeIdsToKeep.has(l.target)
      );
      
      console.log(`[Country] Kept ${resetNodes.length} nodes (depth <= 1), removed ${prevData.nodes.length - resetNodes.length} nodes`);
      
      return {
        nodes: resetNodes,
        links: linksToKeep,
      };
    });
    
    // Close selected node panel if it was at depth >= 2
    setSelectedNode(prev => {
      if (prev && prev.depth >= 2) {
        return null;
      }
      return prev;
    });
  }, [selectedCountry]);

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const initializeGraph = async () => {
      try {
        // Try to load graph state from Firebase first
        console.log('[App] Attempting to load graph state from Firebase...');
        const cachedGraphState = await loadGraphState();
        
        if (cachedGraphState && cachedGraphState.nodes.length > 0) {
          console.log('[App] Loaded graph state from Firebase');
          setGraphData(cachedGraphState);
          setIsLoading(false);
          return;
        }
        
        // If no cached state, initialize from API
        console.log('[App] No cached state, initializing from API...');
        const rootNode: GraphNode = {
          id: 'root',
          label: 'National Riots for Democracy',
          depth: 0,
          isExpanded: true,
          color: "#e11d48",
          nodeType: 'root',
        };

        const initialBranches = await generateInitialBranches(selectedCountry);

        const newNodes: GraphNode[] = [
          rootNode,
          ...initialBranches.map((label, index) => ({
            id: uuidv4(),
            label,
            parentId: 'root',
            depth: 1,
            color: colors[index % colors.length],
            nodeType: 'primary_effect' as const,
          })),
        ];

        const newLinks = newNodes
          .filter(n => n.parentId)
          .map(n => ({ source: n.parentId!, target: n.id }));

        const newGraphData = { nodes: newNodes, links: newLinks };
        setGraphData(newGraphData);
        
        // Save initial state to Firebase
        saveGraphState(newGraphData).catch(console.error);
        
        // Don't auto-select root - let info panel show first
        // setSelectedNode(rootNode);
      } catch (err) {
        console.error("Failed to initialize graph:", err);
        setError(err instanceof Error ? err.message : "An unknown error occurred during initialization.");
      } finally {
        setIsLoading(false);
      }
    };

    initializeGraph();
  }, []);

  // Debounced save to Firebase whenever graph data changes
  useEffect(() => {
    // Skip saving during initial load
    if (isLoading) return;
    
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Set new timeout to save after 2 seconds of inactivity
    saveTimeoutRef.current = setTimeout(() => {
      if (graphData.nodes.length > 0) {
        console.log('[App] Saving graph state to Firebase (debounced)...');
        saveGraphState(graphData).catch(console.error);
      }
    }, 2000);
    
    // Cleanup timeout on unmount
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [graphData, isLoading]);

  // Helper function to build the parent chain for a node
  const buildParentChain = useCallback((nodeId: string): string[] => {
    const chain: string[] = [];
    let currentId = nodeId;
    
    // Walk up the tree to build the chain
    while (currentId) {
      const currentNode = graphData.nodes.find(n => n.id === currentId);
      if (!currentNode || currentId === 'root') break;
      
      chain.unshift(currentNode.label); // Add to beginning
      currentId = currentNode.parentId || '';
    }
    
    return chain;
  }, [graphData.nodes]);

  const handleExpandNode = useCallback(async (nodeToExpand: GraphNode) => {
    if (nodeToExpand.isExpanded || nodeToExpand.depth >= 50) return;
    
    setIsExpanding(true);
    try {
      // Build parent chain for context
      const parentChain = buildParentChain(nodeToExpand.id);
      
      // Extract affected entities from the node's memory if available
      const affectedEntities = nodeToExpand.memory?.affectedEntities || [];
      
      const { consequences, responses } = await expandNode(
        nodeToExpand.label, 
        parentChain, 
        selectedCountry,
        affectedEntities
      );
      
      const consequenceNodes: GraphNode[] = consequences.map(label => ({
        id: uuidv4(),
        label,
        parentId: nodeToExpand.id,
        depth: nodeToExpand.depth + 1,
        color: shadeColor(nodeToExpand.color, -20),
        nodeType: 'consequence',
      }));

      const responseNodes: GraphNode[] = responses.map(label => ({
        id: uuidv4(),
        label,
        parentId: nodeToExpand.id,
        depth: nodeToExpand.depth + 1,
        color: responseColor,
        nodeType: 'response',
      }));

      const newNodes = [...consequenceNodes, ...responseNodes];
      const newLinks = newNodes.map(n => ({ source: n.parentId!, target: n.id }));
      
      setGraphData(prevData => ({
        nodes: [...prevData.nodes.map(n => n.id === nodeToExpand.id ? {...n, isExpanded: true} : n), ...newNodes],
        links: [...prevData.links, ...newLinks],
      }));
      // Update selected node state as well
      setSelectedNode(prev => prev ? { ...prev, isExpanded: true } : null);

    } catch (error) {
      console.error("Failed to expand node:", error);
    } finally {
        setIsExpanding(false);
    }
  }, [buildParentChain]);

  const handleRefreshNode = useCallback(async (nodeToRefresh: GraphNode) => {
    if (!nodeToRefresh.isExpanded) return;
    
    setIsExpanding(true);
    try {
      // Find all descendant nodes (children, grandchildren, etc.)
      const getDescendants = (nodeId: string): string[] => {
        const children = graphData.nodes.filter(n => n.parentId === nodeId);
        const descendants = [...children.map(c => c.id)];
        children.forEach(child => {
          descendants.push(...getDescendants(child.id));
        });
        return descendants;
      };
      
      const descendantIds = getDescendants(nodeToRefresh.id);
      
      // Remove all descendant nodes and their links
      setGraphData(prevData => ({
        nodes: prevData.nodes
          .filter(n => !descendantIds.includes(n.id))
          .map(n => n.id === nodeToRefresh.id ? {...n, isExpanded: false} : n),
        links: prevData.links.filter(l => 
          !descendantIds.includes(l.source) && !descendantIds.includes(l.target)
        ),
      }));
      
      // Update selected node state
      setSelectedNode(prev => prev ? { ...prev, isExpanded: false } : null);
      
      // Wait a bit for UI to update, then fetch fresh data
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Build parent chain for context
      const parentChain = buildParentChain(nodeToRefresh.id);
      
      // Clear cache for this node to force fresh API call
      clearNodeCache(nodeToRefresh.label, parentChain);
      
      // Extract affected entities from the node's memory if available
      const affectedEntities = nodeToRefresh.memory?.affectedEntities || [];
      
      const { consequences, responses } = await expandNode(
        nodeToRefresh.label, 
        parentChain, 
        selectedCountry,
        affectedEntities
      );
      
      const consequenceNodes: GraphNode[] = consequences.map(label => ({
        id: uuidv4(),
        label,
        parentId: nodeToRefresh.id,
        depth: nodeToRefresh.depth + 1,
        color: shadeColor(nodeToRefresh.color, -20),
        nodeType: 'consequence',
      }));

      const responseNodes: GraphNode[] = responses.map(label => ({
        id: uuidv4(),
        label,
        parentId: nodeToRefresh.id,
        depth: nodeToRefresh.depth + 1,
        color: responseColor,
        nodeType: 'response',
      }));

      const newNodes = [...consequenceNodes, ...responseNodes];
      const newLinks = newNodes.map(n => ({ source: n.parentId!, target: n.id }));
      
      setGraphData(prevData => ({
        nodes: [...prevData.nodes.map(n => n.id === nodeToRefresh.id ? {...n, isExpanded: true} : n), ...newNodes],
        links: [...prevData.links, ...newLinks],
      }));
      
      // Update selected node state
      setSelectedNode(prev => prev ? { ...prev, isExpanded: true } : null);
      
      console.log(`[Refresh] Refreshed node "${nodeToRefresh.label}" with new data`);

    } catch (error) {
      console.error("Failed to refresh node:", error);
    } finally {
      setIsExpanding(false);
    }
  }, [graphData.nodes, buildParentChain]);

  const handleNodeClick = useCallback(async (node: GraphNode) => {
    console.log('Node clicked:', node.id, node.label);
    setSelectedNode(node);
    
    // On mobile, show the panel when a node is clicked
    if (isMobile) {
      setIsPanelVisible(true);
    }

    // Start fetching memory and severity scores in parallel
    const fetchPromises: Promise<any>[] = [];

    // Fetch memory if not already fetched
    if (node.memory === undefined) {
        setGraphData(prevData => ({
            ...prevData,
            nodes: prevData.nodes.map(n => n.id === node.id ? { ...n, memory: null } : n)
        }));
        
        // Build parent chain for context-aware memory
        const parentChain = buildParentChain(node.id);
        
        const memoryPromise = getNodeMemory(node.label, parentChain, selectedCountry)
            .then(memory => {
                setGraphData(prevData => ({
                    ...prevData,
                    nodes: prevData.nodes.map(n => n.id === node.id ? { ...n, memory } : n)
                }));
                setSelectedNode(prev => prev ? { ...prev, memory } : null);
            })
            .catch(error => {
                console.error("Failed to get node memory", error);
                setGraphData(prevData => ({
                    ...prevData,
                    nodes: prevData.nodes.map(n => n.id === node.id ? { ...n, memory: { context: "Error loading content.", reflections: [], affectedEntities: [] } } : n)
                }));
            });
        
        fetchPromises.push(memoryPromise);
    }

    // Fetch severity scores if not already fetched
    if (node.severityScores === undefined) {
        setGraphData(prevData => ({
            ...prevData,
            nodes: prevData.nodes.map(n => n.id === node.id ? { ...n, severityScores: null } : n)
        }));
        
        const scoresPromise = getSeverityScores(node.label, [], selectedCountry)
            .then(scores => {
                setGraphData(prevData => ({
                    ...prevData,
                    nodes: prevData.nodes.map(n => n.id === node.id ? { ...n, severityScores: scores } : n)
                }));
                setSelectedNode(prev => prev ? { ...prev, severityScores: scores } : null);
            })
            .catch(error => {
                console.error("Failed to get severity scores", error);
                setGraphData(prevData => ({
                    ...prevData,
                    nodes: prevData.nodes.map(n => n.id === node.id ? { ...n, severityScores: [] } : n)
                }));
            });
        
        fetchPromises.push(scoresPromise);
    }

    // Auto-expand the node if not already expanded and not at max depth
    if (!node.isExpanded && node.depth < 50) {
        // Don't wait for data fetching - expand in parallel
        handleExpandNode(node);
    }
  }, [handleExpandNode, isMobile]);

  const handleClosePanel = () => {
    setSelectedNode(null);
    setIsPanelVisible(false);
  };
  
  // Use selectedNode directly and sync it with graphData for updates
  const selectedNodeData = selectedNode 
    ? graphData.nodes.find(n => n.id === selectedNode.id) || selectedNode
    : null;

  console.log('Render - Selected node:', selectedNode?.id, 'Selected node data:', selectedNodeData?.id, 'Graph nodes:', graphData.nodes.length);

  // Calculate panel width based on breakpoint
  const getPanelWidth = () => {
    if (isMobile) return '100vw';
    if (isTablet) return isPortrait ? '100vw' : '360px';
    if (breakpoint === 'desktop') return '400px';
    return '480px'; // large-desktop
  };

  // Determine if panel should be overlay (mobile/tablet-portrait)
  const isPanelOverlay = isMobile || (isTablet && isPortrait);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-white">
      {error ? (
        <div className="absolute inset-0 bg-white flex flex-col justify-center items-center z-50 p-4 sm:p-8 text-center">
            <h2 className="text-2xl sm:text-3xl text-gray-900 font-bold mb-4">Application Error</h2>
            <p className="text-lg sm:text-xl text-red-600 mb-6">Failed to initialize the application. Please check the details below.</p>
            <pre className="bg-gray-50 text-red-800 p-4 rounded-lg w-full max-w-2xl overflow-x-auto text-left whitespace-pre-wrap border border-gray-200 text-sm">
                <code>{error}</code>
            </pre>
            <button
                onClick={() => window.location.reload()}
                className="mt-8 bg-gray-900 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 shadow-md hover:shadow-lg"
            >
                Reload Application
            </button>
        </div>
      ) : isLoading ? (
        <Loader text="Generating Initial Crisis..." />
      ) : (
        <>
          {/* Main content area with graph */}
          <div className={`relative h-screen overflow-hidden ${isPanelOverlay ? 'w-full' : 'flex'}`}>
            {/* Header - Compact on mobile */}
            <div className={`absolute ${isMobile ? 'top-2 left-2' : 'top-4 left-4'} z-10 ${isMobile ? 'p-3' : 'p-4'} bg-white bg-opacity-90 rounded-lg border border-gray-200 shadow-sm`}>
              <h1 
                className={`${isMobile ? 'text-xl' : 'text-3xl'} font-extrabold text-gray-900 cursor-pointer hover:text-blue-600 transition-colors`}
                onClick={() => setIsCountryModalOpen(true)}
                title="Click to set country context"
              >
                The Cascade
              </h1>
              {!isMobile && (
                <p className="text-gray-600 max-w-md">A living graph of democracy and disruption.</p>
              )}
            </div>
            
            {/* Graph - Full screen on mobile, flexible on desktop */}
            <div className={`relative ${isPanelOverlay ? 'w-full' : 'flex-1'} h-screen overflow-hidden`}>
              <Graph 
                data={graphData} 
                onNodeClick={handleNodeClick} 
                width={windowSize.width} 
                height={windowSize.height}
                breakpoint={breakpoint}
              />
            </div>

            {/* Detail Panel - Desktop side-by-side */}
            {!isPanelOverlay && (
              <div 
                className="h-screen border-l-2 border-gray-300 bg-white shadow-lg overflow-y-auto smooth-scroll" 
                style={{ 
                  width: getPanelWidth(), 
                  minWidth: getPanelWidth(), 
                  maxWidth: getPanelWidth(), 
                  flexShrink: 0 
                }}
              >
                {selectedNodeData && selectedNodeData.id !== 'root' ? (
                  <NodeDetailPanel 
                    node={selectedNodeData} 
                    onClose={handleClosePanel} 
                    onExpand={handleExpandNode}
                    onRefresh={handleRefreshNode}
                    isExpanding={isExpanding}
                    selectedCountry={selectedCountry}
                    breakpoint={breakpoint}
                  />
                ) : (
                  <div className="h-full flex flex-col justify-center p-8">
                    <div className="space-y-6">
                      <div>
                        <h2 className="text-3xl font-bold text-gray-900 mb-2">The Cascading Effect</h2>
                        <p className="text-lg text-gray-600">A living graph of democracy and disruption</p>
                      </div>
                      
                      <div className="border-t border-gray-200 pt-6">
                        <h3 className="text-xl font-semibold text-gray-900 mb-3">About This Visualization</h3>
                        <p className="text-gray-700 leading-relaxed mb-4">
                          Explore how a single event—National Riots for Democracy—cascades through society, 
                          creating ripples across governance, economy, security, and human wellbeing.
                        </p>
                        <p className="text-gray-700 leading-relaxed">
                          Each node represents an effect or consequence. The animated arrows show the flow 
                          of causation from root cause to cascading impacts.
                        </p>
                      </div>

                      <div className="border-t border-gray-200 pt-6">
                        <h3 className="text-xl font-semibold text-gray-900 mb-3">How to Explore</h3>
                        <ul className="space-y-3">
                          <li className="flex items-start">
                            <span className="text-blue-600 font-bold mr-3 mt-1">→</span>
                            <span className="text-gray-700">
                              <strong>Click any node</strong> to view detailed context, reflections, and severity analysis
                            </span>
                          </li>
                          <li className="flex items-start">
                            <span className="text-blue-600 font-bold mr-3 mt-1">→</span>
                            <span className="text-gray-700">
                              <strong>Expand nodes</strong> to reveal consequences and societal responses
                            </span>
                          </li>
                          <li className="flex items-start">
                            <span className="text-blue-600 font-bold mr-3 mt-1">→</span>
                            <span className="text-gray-700">
                              <strong>Zoom & pan</strong> the graph to navigate complex relationships
                            </span>
                          </li>
                        </ul>
                      </div>

                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
                        <p className="text-blue-900 font-medium text-center">
                          👆 Select a node to begin exploring
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mobile/Tablet Portrait - Bottom Sheet Overlay */}
          {isPanelOverlay && isPanelVisible && selectedNodeData && selectedNodeData.id !== 'root' && (
            <>
              {/* Backdrop */}
              <div 
                className="fixed inset-0 bg-black bg-opacity-50 z-40 mobile-overlay"
                onClick={handleClosePanel}
              />
              
              {/* Bottom Sheet */}
              <div 
                className="fixed bottom-0 left-0 right-0 bg-white z-50 slide-up rounded-t-2xl shadow-2xl"
                style={{ 
                  height: '85vh',
                  maxHeight: '85vh'
                }}
              >
                {/* Drag handle */}
                <div className="flex justify-center pt-3 pb-2">
                  <div className="w-12 h-1 bg-gray-300 rounded-full" />
                </div>
                
                {/* Panel content */}
                <div className="h-full overflow-y-auto smooth-scroll pb-4">
                  <NodeDetailPanel 
                    node={selectedNodeData} 
                    onClose={handleClosePanel} 
                    onExpand={handleExpandNode}
                    onRefresh={handleRefreshNode}
                    isExpanding={isExpanding}
                    selectedCountry={selectedCountry}
                    breakpoint={breakpoint}
                  />
                </div>
              </div>
            </>
          )}

          {/* Country Selection Modal */}
          <CountrySelectionModal
            isOpen={isCountryModalOpen}
            currentCountry={selectedCountry}
            onClose={() => setIsCountryModalOpen(false)}
            onSelect={handleCountryChange}
            breakpoint={breakpoint}
          />
        </>
      )}
    </main>
  );
};

export default App;