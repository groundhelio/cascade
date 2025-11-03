export interface NodeMemory {
  context: string;
  reflections: string[];
  affectedEntities: string[];
}

export interface SeverityScore {
  category: string;
  institutional: number;
  human: number;
}

export type NodeType = 'root' | 'primary_effect' | 'consequence' | 'response';

export interface GraphNode {
  id: string;
  label: string;
  parentId?: string;
  depth: number;
  isExpanded?: boolean;
  memory?: NodeMemory | null; // null indicates fetching
  severityScores?: SeverityScore[] | null; // null indicates fetching
  color: string;
  nodeType: NodeType;
  // D3-specific properties are no longer needed
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface GraphLink {
  source: string;
  target: string;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}