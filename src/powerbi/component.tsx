/**
 * Power BI React Wrapper Component
 *
 * Wraps the SankeyChart component for use in Power BI environments.
 * Handles data updates, tooltips, and selection from Power BI.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { SankeyChart } from '../lib/components/SankeyChart';
import type {
  SankeyData,
  SankeyChartProps,
  ComputedNode,
  ComputedLink,
  PowerBIVisualHost,
  PowerBISelectionManager,
} from '../types';
import { VisualSettings } from './settings';

export interface PowerBISankeyChartProps {
  data: SankeyData | null;
  width: number;
  height: number;
  settings: VisualSettings;
  host: PowerBIVisualHost;
  selectionManager: PowerBISelectionManager;
}

export const PowerBISankeyChart: React.FC<PowerBISankeyChartProps> = ({
  data,
  width,
  height,
  settings,
  host,
  selectionManager,
}) => {
  const [selectedNodes, setSelectedNodes] = useState<Set<string>>(new Set());

  const chartProps = useMemo((): Partial<SankeyChartProps> => {
    const { nodeSettings, linkSettings, labelSettings } = settings;

    return {
      width,
      height,
      layout: {
        nodeWidth: nodeSettings.width,
        nodePadding: nodeSettings.padding,
        nodeAlign: 'justify',
        iterations: 32,
      },
      style: {
        node: {
          fill: nodeSettings.defaultColor,
          stroke: '#000',
          strokeWidth: 0,
          opacity: 1,
        },
        link: {
          fill: linkSettings.defaultColor,
          opacity: linkSettings.opacity / 100,
          colorMode: linkSettings.colorMode,
        },
        label: {
          fontSize: labelSettings.fontSize,
          fontFamily: labelSettings.fontFamily,
          fill: labelSettings.color,
        },
      },
      showLabels: labelSettings.show,
      showTooltips: false,
    };
  }, [width, height, settings]);

  const showTooltip = useCallback(
    (dataItems: Array<{ displayName: string; value: string }>, event: React.MouseEvent) => {
      host.tooltipService?.show({
        coordinates: [event.clientX, event.clientY],
        dataItems,
        isTouchEvent: false,
        identities: [],
      });
    },
    [host.tooltipService]
  );

  const hideTooltip = useCallback(() => {
    host.tooltipService?.hide({
      isTouchEvent: false,
      immediately: true,
    });
  }, [host.tooltipService]);

  const handleNodeMouseEnter = useCallback(
    (node: ComputedNode, event: React.MouseEvent) => {
      showTooltip(
        [{ displayName: node.name, value: formatValue(node.value ?? 0) }],
        event
      );
    },
    [showTooltip]
  );

  const handleLinkMouseEnter = useCallback(
    (link: ComputedLink, event: React.MouseEvent) => {
      const sourceName = typeof link.source === 'object' ? link.source.name : String(link.source);
      const targetName = typeof link.target === 'object' ? link.target.name : String(link.target);

      showTooltip(
        [
          { displayName: 'From', value: sourceName },
          { displayName: 'To', value: targetName },
          { displayName: 'Value', value: formatValue(link.value ?? 0) },
        ],
        event
      );
    },
    [showTooltip]
  );

  const handleNodeClick = useCallback(
    (node: ComputedNode, event: React.MouseEvent) => {
      const multiSelect = event.ctrlKey || event.metaKey;

      setSelectedNodes((prev) => {
        const newSelection = new Set(multiSelect ? prev : []);
        if (newSelection.has(node.id)) {
          newSelection.delete(node.id);
        } else {
          newSelection.add(node.id);
        }
        return newSelection;
      });

    },
    []
  );

  const handleLinkClick = useCallback(
    (_link: ComputedLink) => {
    },
    []
  );

  if (!data || data.nodes.length === 0) {
    return (
      <div className="sankey-no-data">
        Source、Target、Valueフィールドにデータを追加してください
      </div>
    );
  }

  return (
    <SankeyChart
      data={data}
      {...chartProps}
      events={{
        onNodeMouseEnter: handleNodeMouseEnter,
        onNodeMouseLeave: hideTooltip,
        onNodeClick: handleNodeClick,
        onLinkMouseEnter: handleLinkMouseEnter,
        onLinkMouseLeave: hideTooltip,
        onLinkClick: handleLinkClick,
      }}
      className="powerbi-sankey-chart"
    />
  );
};

/**
 * Manages React mounting/unmounting for Power BI visuals.
 */
export class ReactMountManager {
  private root: Root | null = null;
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  mount(props: PowerBISankeyChartProps): void {
    if (!this.root) {
      this.root = createRoot(this.container);
    }

    this.root.render(
      <React.StrictMode>
        <PowerBISankeyChart {...props} />
      </React.StrictMode>
    );
  }

  unmount(): void {
    if (this.root) {
      this.root.unmount();
      this.root = null;
    }
  }
}

function formatValue(value: number): string {
  if (value >= 1e9) return (value / 1e9).toFixed(1) + 'B';
  if (value >= 1e6) return (value / 1e6).toFixed(1) + 'M';
  if (value >= 1e3) return (value / 1e3).toFixed(1) + 'K';
  return value.toLocaleString();
}

export { PowerBISankeyChart as default };
