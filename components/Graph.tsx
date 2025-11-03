import { useEffect, useRef, useState } from 'react';
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
  const seriesRef = useRef<am5hierarchy.ForceDirected | null>(null);
  const onNodeClickRef = useRef(onNodeClick);
  const [isInitialized, setIsInitialized] = useState(false);

  // Keep the click handler ref up to date
  useEffect(() => {
    onNodeClickRef.current = onNodeClick;
  }, [onNodeClick]);

  // Convert flat node/link structure to hierarchical structure
  const convertToHierarchy = (nodes: GraphNode[], links: { source: string; target: string }[]): HierarchyNode => {
    const nodeMap = new Map<string, HierarchyNode>();
    
    // Create hierarchy nodes
    nodes.forEach(node => {
      // Calculate value based on text length to ensure proper node sizing
      const textLength = node.label.length;
      const baseValue = Math.max(textLength * 2, 50); // Minimum value of 50, scaled by text length
      
      nodeMap.set(node.id, {
        name: node.label,
        value: baseValue,
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

  // Initialize chart only once
  useEffect(() => {
    if (!chartRef.current || isInitialized || data.nodes.length === 0) return;

    console.log('Initializing chart with data:', data.nodes.length, 'nodes');

    // Create root element
    const root = am5.Root.new(chartRef.current);
    rootRef.current = root;

    // Set themes
    root.setThemes([am5themes_Animated.new(root)]);

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
        downDepth: 1,
        initialDepth: 10,
        nodePadding: 30,
        minRadius: 30, // Minimum node radius
        maxRadius: 120, // Maximum node radius
        valueField: 'value',
        categoryField: 'name',
        childDataField: 'children',
        idField: 'name',
        manyBodyStrength: -20,
        centerStrength: 0.5
      })
    );

    // Add animated bullets to links
    series.linkBullets.push(function(root, source, target) {
      const bullet = am5.Bullet.new(root, {
        locationX: 0.5,
        autoRotate: true,
        autoRotateAngle: 180,
        sprite: am5.Graphics.new(root, {
          fill: source.get("fill"),
          centerY: am5.percent(50),
          centerX: am5.percent(50),
          draw: function(display) {
            display.moveTo(0, -6);
            display.lineTo(16, 0);
            display.lineTo(0, 6);
            display.lineTo(3, 0);
            display.lineTo(0, -6);
          }
        })
      });

      bullet.animate({
        key: "locationX",
        to: -0.1,
        from: 1.1,
        duration: Math.random() * 500 + 1000,
        loops: Infinity,
        easing: am5.ease.quad
      });

      return bullet;
    });

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

    // Configure circle sizing to accommodate text
    series.circles.template.setAll({
      strokeWidth: 2,
      fillOpacity: 0.9
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
      minScale: 0,
      fontSize: 14,
      fontWeight: '500',
      fill: am5.color(0x1f2937),
      text: '{name}',
      oversizedBehavior: 'wrap', // Changed from truncate to wrap
      maxWidth: 200, // Increased from 100
      textAlign: 'center',
      paddingTop: 0,
      paddingBottom: 0,
      paddingLeft: 5,
      paddingRight: 5
    });

    // Add click handler
    series.nodes.template.events.on('click', (ev) => {
      const dataItem = ev.target.dataItem;
      if (dataItem) {
        const nodeData = (dataItem.dataContext as any)?.nodeData as GraphNode | undefined;
        if (nodeData) {
          onNodeClickRef.current(nodeData);
        }
      }
    });

    // Store series reference
    seriesRef.current = series;

    // Set initial data
    const hierarchyData = convertToHierarchy(data.nodes, data.links);
    series.data.setAll([hierarchyData]);

    // Select the root node initially
    if (series.dataItems.length > 0) {
      series.set('selectedDataItem', series.dataItems[0]);
    }

    // Animate on load (only once)
    series.appear(1000, 100);

    // Mark as initialized
    setIsInitialized(true);

    // Cleanup
    return () => {
      setIsInitialized(false);
      root.dispose();
    };
  }, []); // Empty dependency - only run once on mount

  // Update data when it changes (without re-initializing the chart)
  useEffect(() => {
    if (!seriesRef.current || !isInitialized) return;

    console.log('Updating chart data:', data.nodes.length, 'nodes');

    const hierarchyData = convertToHierarchy(data.nodes, data.links);
    
    // Update data without animation
    seriesRef.current.data.setAll([hierarchyData]);
  }, [data]);

  return (
    <div 
      ref={chartRef} 
      className="w-full h-full"
      style={{ width: '100%', height: '100%' }}
    />
  );
};

export default Graph;