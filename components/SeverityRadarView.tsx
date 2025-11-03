import React, { useRef, useLayoutEffect } from 'react';
import * as am5 from '@amcharts/amcharts5';
import * as am5radar from '@amcharts/amcharts5/radar';
import * as am5xy from '@amcharts/amcharts5/xy';
import am5themes_Animated from '@amcharts/amcharts5/themes/Animated';
import type { SeverityScore } from '../types';

interface SeverityRadarViewProps {
  scores: SeverityScore[];
}

const SeverityRadarView: React.FC<SeverityRadarViewProps> = ({ scores }) => {
  const chartRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!chartRef.current || scores.length === 0) return;

    const root = am5.Root.new(chartRef.current);

    const theme = am5.Theme.new(root);
    theme.rule('Label').setAll({
      fill: am5.color(0xffffff),
      fontSize: '0.8rem',
    });

    root.setThemes([am5themes_Animated.new(root), theme]);

    const chart = root.container.children.push(
      am5radar.RadarChart.new(root, {
        panX: false,
        panY: false,
        innerRadius: am5.percent(20),
      })
    );

    const cursor = chart.set('cursor', am5radar.RadarCursor.new(root, { behavior: 'zoomX' }));
    cursor.lineY.set('visible', false);

    const xRenderer = am5radar.AxisRendererCircular.new(root, { minGridDistance: 30 });
    xRenderer.labels.template.setAll({ radius: 10, textAlign: 'center' });
    xRenderer.grid.template.setAll({ stroke: am5.color(0xffffff), strokeOpacity: 0.3 });

    const xAxis = chart.xAxes.push(
      am5xy.CategoryAxis.new(root, {
        categoryField: 'category',
        renderer: xRenderer,
        tooltip: am5.Tooltip.new(root, {}),
      })
    );

    const yRenderer = am5radar.AxisRendererRadial.new(root, { minGridDistance: 20 });
    yRenderer.grid.template.setAll({ stroke: am5.color(0xffffff), strokeOpacity: 0.3 });

    const yAxis = chart.yAxes.push(
      am5xy.ValueAxis.new(root, {
        renderer: yRenderer,
        min: 0,
        max: 10,
      })
    );

    const createSeries = (field: string, name: string, colorHex: string) => {
      const color = am5.color(colorHex);
      const series = chart.series.push(
        am5radar.RadarLineSeries.new(root, {
          name,
          xAxis,
          yAxis,
          valueYField: field,
          categoryXField: 'category',
          stroke: color,
          tooltip: am5.Tooltip.new(root, { labelText: '{name}: {valueY}' }),
        })
      );

      series.fills.template.setAll({ fill: color, fillOpacity: 0.2, visible: true });
      series.strokes.template.set('strokeWidth', 2);
      series.bullets.push(() =>
        am5.Bullet.new(root, {
          sprite: am5.Circle.new(root, { radius: 4, fill: color }),
        })
      );

      series.data.setAll(scores);
    };

    createSeries('institutional', 'Institutional Stress', '#fb923c'); // Orange
    createSeries('human', 'Human Impact', '#be185d'); // Pink

    const legend = chart.children.push(
      am5.Legend.new(root, {
        centerX: am5.percent(50),
        x: am5.percent(50),
        marginTop: 15,
        marginBottom: 15,
      })
    );

    legend.data.setAll(chart.series.values);

    xAxis.data.setAll(scores);
    chart.appear(1000, 100);

    return () => {
      if (root) root.dispose();
    };
  }, [scores]);

  return <div ref={chartRef} style={{ width: '100%', height: '350px' }} />;
};

export default SeverityRadarView;