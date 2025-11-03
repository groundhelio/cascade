import React, { useState, useEffect, useCallback } from 'react';
import Graph from './components/Graph';
import NodeDetailPanel from './components/NodeDetailPanel';
import Loader from './components/Loader';
import { generateInitialBranches, expandNode, getNodeMemory, getSeverityScores } from './services/geminiService';
import type { GraphData, GraphNode } from './types';
import { v4 as uuidv4 } from 'uuid';

const colors = ["#0891b2", "#0d9488", "#65a30d", "#ca8a04", "#c2410c", "#be185d", "#86198f"];
const responseColor = '#34d399'; // A hopeful green for responses

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
        const rootNode: GraphNode = {
          id: 'root',
          label: 'National Riots for Democracy',
          depth: 0,
          isExpanded: true,
          color: "#e11d48",
          nodeType: 'root',
        };

        const initialBranches = await generateInitialBranches();

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

        setGraphData({ nodes: newNodes, links: newLinks });
      } catch (err) {
        console.error("Failed to initialize graph:", err);
        setError(err instanceof Error ? err.message : "An unknown error occurred during initialization.");
      } finally {
        setIsLoading(false);
      }
    };

    initializeGraph();
  }, []);

  const handleNodeClick = useCallback(async (node: GraphNode) => {
    setSelectedNode(node);

    // Fetch memory if not already fetched
    if (node.memory === undefined) {
        setGraphData(prevData => ({
            ...prevData,
            nodes: prevData.nodes.map(n => n.id === node.id ? { ...n, memory: null } : n)
        }));
        try {
            const memory = await getNodeMemory(node.label);
            setGraphData(prevData => ({
                ...prevData,
                nodes: prevData.nodes.map(n => n.id === node.id ? { ...n, memory } : n)
            }));
            setSelectedNode(prev => prev ? { ...prev, memory } : null);
        } catch(error) {
            console.error("Failed to get node memory", error);
             setGraphData(prevData => ({
                ...prevData,
                nodes: prevData.nodes.map(n => n.id === node.id ? { ...n, memory: { context: "Error loading content.", reflections: []} } : n)
            }));
        }
    }

    // Fetch severity scores if not already fetched
    if (node.severityScores === undefined) {
        setGraphData(prevData => ({
            ...prevData,
            nodes: prevData.nodes.map(n => n.id === node.id ? { ...n, severityScores: null } : n)
        }));
        try {
            const scores = await getSeverityScores(node.label);
            setGraphData(prevData => ({
                ...prevData,
                nodes: prevData.nodes.map(n => n.id === node.id ? { ...n, severityScores: scores } : n)
            }));
            setSelectedNode(prev => prev ? { ...prev, severityScores: scores } : null);
        } catch(error) {
            console.error("Failed to get severity scores", error);
             setGraphData(prevData => ({
                ...prevData,
                nodes: prevData.nodes.map(n => n.id === node.id ? { ...n, severityScores: [] } : n)
            }));
        }
    }
  }, []);

  const handleExpandNode = useCallback(async (nodeToExpand: GraphNode) => {
    if (nodeToExpand.isExpanded || nodeToExpand.depth >= 4) return;
    
    setIsExpanding(true);
    try {
      const { consequences, responses } = await expandNode(nodeToExpand.label);
      
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
  }, []);

  const handleClosePanel = () => {
    setSelectedNode(null);
  };
  
  const selectedNodeData = graphData.nodes.find(n => n.id === selectedNode?.id) || null;

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-gray-900">
       <div className="absolute top-4 left-4 z-10 p-4 bg-black bg-opacity-50 rounded-lg">
        <h1 className="text-3xl font-extrabold text-white" style={{textShadow: '0 0 8px rgba(255, 255, 255, 0.5)'}}>
          The Cascading Effect
        </h1>
        <p className="text-gray-300 max-w-md">A living graph of democracy and disruption.</p>
      </div>
      
      {error ? (
        <div className="absolute inset-0 bg-red-900 bg-opacity-80 flex flex-col justify-center items-center z-50 p-8 text-center">
            <h2 className="text-3xl text-white font-bold mb-4">Application Error</h2>
            <p className="text-xl text-red-200 mb-6">Failed to initialize the application. Please check the details below.</p>
            <pre className="bg-gray-800 text-red-300 p-4 rounded-lg w-full max-w-2xl overflow-x-auto text-left whitespace-pre-wrap">
                <code>{error}</code>
            </pre>
            <button
                onClick={() => window.location.reload()}
                className="mt-8 bg-cyan-500 hover:bg-cyan-400 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 shadow-lg hover:shadow-cyan-500/50"
            >
                Reload Application
            </button>
        </div>
      ) : isLoading ? (
        <Loader text="Generating Initial Crisis..." />
      ) : (
        <Graph 
            data={graphData} 
            onNodeClick={handleNodeClick} 
            width={windowSize.width} 
            height={windowSize.height}
        />
      )}
      
      {selectedNodeData && (
         <NodeDetailPanel 
            node={selectedNodeData} 
            onClose={handleClosePanel} 
            onExpand={handleExpandNode}
            isExpanding={isExpanding}
         />
      )}
    </main>
  );
};

export default App;