import React, { useRef, useLayoutEffect } from 'react';
import * as am5 from '@amcharts/amcharts5';
import * as am5plugins_forceDirected from '@amcharts/amcharts5/plugins/forceDirected';
import am5themes_Animated from '@amcharts/amcharts5/themes/Animated';
import type { GraphData, GraphNode } from '../types';

interface GraphProps {
  data: GraphData;
  onNodeClick: (node: GraphNode) => void;
  width: number;
  height: number;
}

const Graph: React.FC<GraphProps> = ({ data, onNodeClick }) => {
  const chartRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!chartRef.current) return;

    let root = am5.Root.new(chartRef.current);
    root.setThemes([am5themes_Animated.new(root)]);

    const chart = root.container.children.push(
      am5plugins_forceDirected.ForceDirected.new(root, {
        // Removed initialDepth and downDepth as they are for hierarchical data
      })
    );

    const series = chart.series.push(
      am5plugins_forceDirected.ForceDirectedSeries.new(root, {
        valueField: "value",
        idField: "id",
        nameField: "name",
        minRadius: 15,
        maxRadius: 50,
        nodePadding: 10,
        manyBodyStrength: -15,
        centerStrength: 0.8
      })
    );
    
    series.nodes.template.setAll({
        tooltipText: "{name}",
        cursorOverStyle: "pointer"
    });

    series.nodes.template.events.on("click", (e) => {
      if (e.target.dataItem && e.target.dataItem.dataContext) {
        const context = e.target.dataItem.dataContext as any;
        if(context.originalData) {
            onNodeClick(context.originalData);
        }
      }
    });

    series.links.template.set("strokeOpacity", 0.5);

    series.nodes.template.setup = (template) => {
        template.outerCircle.adapters.add("fill", (fill, target) => {
            const dataContext = target.dataItem?.dataContext as any;
            return dataContext?.color || fill;
        });
    };
    
    const transformedNodes = data.nodes.map(node => ({
        id: node.id,
        name: node.label,
        value: 100 - (node.depth * 15),
        color: node.color,
        nodeType: node.nodeType,
        originalData: node
    }));

    const transformedLinks = data.links.map(link => ({
        source: link.source,
        target: link.target
    }));

    series.data.setAll(transformedNodes);
    series.links.data.setAll(transformedLinks);

    series.appear(1000, 100);

    return () => {
      root.dispose();
    };
  }, [data, onNodeClick]);

  return <div ref={chartRef} style={{ width: '100%', height: '100%' }}></div>;
};

export default Graph;