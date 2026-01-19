/**
 * Power BI React Wrapper Component
 *
 * 既存のSankeyChartコンポーネントをPower BI環境でラップします。
 * Power BIからのデータ更新とイベント処理を行います。
 */

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { SankeyChart } from '../lib/components/SankeyChart';
import type {
  SankeyData,
  SankeyChartProps,
  ComputedNode,
  ComputedLink,
} from '../types';
import type {
  IVisualHost,
  ISelectionManager,
  ITooltipService,
  TooltipDataItem,
} from './visual';
import { VisualSettings } from './settings';

// =============================================================================
// Props Definition
// =============================================================================

export interface PowerBISankeyChartProps {
  /** Sankey data */
  data: SankeyData | null;
  /** Chart width */
  width: number;
  /** Chart height */
  height: number;
  /** Visual settings */
  settings: VisualSettings;
  /** Power BI host */
  host: IVisualHost;
  /** Selection manager */
  selectionManager: ISelectionManager;
}

// =============================================================================
// Power BI Sankey Chart Component
// =============================================================================

export const PowerBISankeyChart: React.FC<PowerBISankeyChartProps> = ({
  data,
  width,
  height,
  settings,
  host,
  selectionManager,
}) => {
  const [selectedNodes, setSelectedNodes] = useState<Set<string>>(new Set());

  // Map settings to SankeyChart props
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
      showTooltips: false, // Power BIのツールチップを使用
    };
  }, [width, height, settings]);

  // Tooltip handlers
  const handleNodeMouseEnter = useCallback(
    (node: ComputedNode, event: React.MouseEvent) => {
      const tooltipData: TooltipDataItem[] = [
        {
          displayName: node.name,
          value: formatValue(node.value ?? 0),
        },
      ];

      host.tooltipService?.show({
        coordinates: [event.clientX, event.clientY],
        dataItems: tooltipData,
        isTouchEvent: false,
      });
    },
    [host.tooltipService]
  );

  const handleNodeMouseLeave = useCallback(() => {
    host.tooltipService?.hide({
      isTouchEvent: false,
      immediately: true,
    });
  }, [host.tooltipService]);

  const handleLinkMouseEnter = useCallback(
    (link: ComputedLink, event: React.MouseEvent) => {
      const sourceName = typeof link.source === 'object' ? link.source.name : String(link.source);
      const targetName = typeof link.target === 'object' ? link.target.name : String(link.target);

      const tooltipData: TooltipDataItem[] = [
        { displayName: 'From', value: sourceName },
        { displayName: 'To', value: targetName },
        { displayName: 'Value', value: formatValue(link.value ?? 0) },
      ];

      host.tooltipService?.show({
        coordinates: [event.clientX, event.clientY],
        dataItems: tooltipData,
        isTouchEvent: false,
      });
    },
    [host.tooltipService]
  );

  const handleLinkMouseLeave = useCallback(() => {
    host.tooltipService?.hide({
      isTouchEvent: false,
      immediately: true,
    });
  }, [host.tooltipService]);

  // Click handlers for selection
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

      // Power BI選択API連携（実装は実際のPBI環境で）
      console.log('Node selected:', node.name);
    },
    []
  );

  const handleLinkClick = useCallback(
    (link: ComputedLink, event: React.MouseEvent) => {
      const sourceName = typeof link.source === 'object' ? link.source.name : String(link.source);
      const targetName = typeof link.target === 'object' ? link.target.name : String(link.target);
      console.log('Link selected:', sourceName, '→', targetName);
    },
    []
  );

  // Empty state
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
        onNodeMouseLeave: handleNodeMouseLeave,
        onNodeClick: handleNodeClick,
        onLinkMouseEnter: handleLinkMouseEnter,
        onLinkMouseLeave: handleLinkMouseLeave,
        onLinkClick: handleLinkClick,
      }}
      className="powerbi-sankey-chart"
    />
  );
};

// =============================================================================
// React Mount Manager
// =============================================================================

/**
 * Power BI Visual用のReactマウント管理
 */
export class ReactMountManager {
  private root: Root | null = null;
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  /**
   * Reactコンポーネントをマウント
   */
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

  /**
   * Reactコンポーネントをアンマウント
   */
  unmount(): void {
    if (this.root) {
      this.root.unmount();
      this.root = null;
    }
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * 数値を読みやすい形式にフォーマット
 */
function formatValue(value: number): string {
  if (value >= 1e9) {
    return (value / 1e9).toFixed(1) + 'B';
  }
  if (value >= 1e6) {
    return (value / 1e6).toFixed(1) + 'M';
  }
  if (value >= 1e3) {
    return (value / 1e3).toFixed(1) + 'K';
  }
  return value.toLocaleString();
}

// =============================================================================
// Export
// =============================================================================

export { PowerBISankeyChart as default };
