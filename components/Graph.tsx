import { useEffect, useRef } from 'react';
import * as am5 from '@amcharts/amcharts5';
import * as am5hierarchy from '@amcharts/amcharts5/hierarchy';
import am5themes_Animated from '@amcharts/amcharts5/themes/Animated';
import type { GraphData, GraphNode } from '../types';

interface GraphProps {
  data: GraphData;
  onNodeClick: (node: GraphNode) => void;
  width: number;
  height: number;
}

interface HierarchyNode {
  name: string;
  value?: number;
  children?: HierarchyNode[];
  nodeData?: GraphNode; // Store original node data
}

const Graph = ({ data, onNodeClick, width, height }: GraphProps) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<am5.Root | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    // Create root element
    const root = am5.Root.new(chartRef.current);
    rootRef.current = root;

    // Set themes
    root.setThemes([am5themes_Animated.new(root)]);

    // Convert flat node/link structure to hierarchical structure
    const convertToHierarchy = (nodes: GraphNode[], links: { source: string; target: string }[]): HierarchyNode => {
      const nodeMap = new Map<string, HierarchyNode>();
      
      // Create hierarchy nodes
      nodes.forEach(node => {
        nodeMap.set(node.id, {
          name: node.label,
          value: node.nodeType === 'response' ? 2 : 1, // Give responses slightly more weight
          children: [],
          nodeData: node
        });
      });

      // Build parent-child relationships
      const rootNode = nodeMap.get('root');
      if (!rootNode) {
        return { name: 'Root', value: 0, children: [] };
      }

      links.forEach(link => {
        const parent = nodeMap.get(link.source);
        const child = nodeMap.get(link.target);
        if (parent && child) {
          if (!parent.children) parent.children = [];
          parent.children.push(child);
        }
      });

      return rootNode;
    };

    const hierarchyData = convertToHierarchy(data.nodes, data.links);

    // Create zoomable container
    const zoomableContainer = root.container.children.push(
      am5.ZoomableContainer.new(root, {
        width: am5.p100,
        height: am5.p100,
        wheelable: true,
        pinchZoom: true
      })
    );

    // Create zoom tools
    const zoomTools = zoomableContainer.children.push(
      am5.ZoomTools.new(root, {
        target: zoomableContainer
      })
    );

    // Create series
    const series = zoomableContainer.contents.children.push(
      am5hierarchy.ForceDirected.new(root, {
        maskContent: false, // Important with zoomable containers
        singleBranchOnly: false,
        downDepth: 2,
        topDepth: 1,
        initialDepth: 3,
        valueField: 'value',
        categoryField: 'name',
        childDataField: 'children',
        idField: 'name',
        manyBodyStrength: -15,
        centerStrength: 0.6
      })
    );

    // Configure link strength
    series.links.template.setAll({
      strength: 0.5,
      strokeWidth: 2
    });

    // Configure node circles
    series.nodes.template.setAll({
      tooltipText: '{name}',
      cursorOverStyle: 'pointer'
    });

    // Configure node circle colors
    series.circles.template.adapters.add('fill', (fill, target) => {
      const dataItem = target.dataItem;
      if (dataItem) {
        const nodeData = (dataItem.dataContext as any)?.nodeData as GraphNode | undefined;
        if (nodeData?.color) {
          return am5.color(nodeData.color);
        }
      }
      return fill;
    });

    series.circles.template.adapters.add('stroke', (stroke, target) => {
      const dataItem = target.dataItem;
      if (dataItem) {
        const nodeData = (dataItem.dataContext as any)?.nodeData as GraphNode | undefined;
        if (nodeData?.color) {
          return am5.color(nodeData.color);
        }
      }
      return stroke;
    });

    // Configure labels
    series.labels.template.setAll({
      minScale: 0.3,
      fontSize: 12,
      fill: am5.color(0x1f2937),
      text: '{name}',
      oversizedBehavior: 'truncate',
      maxWidth: 100,
      textAlign: 'center'
    });

    // Add click handler
    series.nodes.template.events.on('click', (ev) => {
      const dataItem = ev.target.dataItem;
      if (dataItem) {
        const nodeData = (dataItem.dataContext as any)?.nodeData as GraphNode | undefined;
        if (nodeData) {
          onNodeClick(nodeData);
        }
      }
    });

    // Set data
    series.data.setAll([hierarchyData]);

    // Select the root node initially
    if (series.dataItems.length > 0) {
      series.set('selectedDataItem', series.dataItems[0]);
    }

    // Animate on load
    series.appear(1000, 100);

    // Cleanup
    return () => {
      root.dispose();
    };
  }, [data, onNodeClick]);

  return (
    <div 
      ref={chartRef} 
      className="w-full h-full"
      style={{ width: '100%', height: '100%' }}
    />
  );
};

export default Graph;