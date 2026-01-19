/**
 * SankeyChart React Component
 *
 * SankeyEngineをラップした宣言的なReactコンポーネント。
 * Next.js/React環境で使用します。
 *
 * 使用例:
 * ```tsx
 * <SankeyChart
 *   data={sankeyData}
 *   width={800}
 *   height={600}
 *   onNodeClick={(node) => console.log('Clicked:', node.name)}
 * />
 * ```
 */

import React, { useEffect, useMemo, forwardRef, useImperativeHandle } from 'react';
import { useSankey } from './hooks/useSankey';
import type { SankeyData, SankeyChartConfig, SankeyEventHandlers, ComputedNode, ComputedLink } from '../types';

// =============================================================================
// Props Interface
// =============================================================================

export interface SankeyChartProps {
  /** チャートデータ */
  data: SankeyData;

  /** SVG幅（undefinedの場合はコンテナに合わせる） */
  width?: number;

  /** SVG高さ（undefinedの場合はコンテナに合わせる） */
  height?: number;

  /** 自動リサイズを有効にする */
  autoResize?: boolean;

  /** 追加のCSSクラス */
  className?: string;

  /** インラインスタイル */
  style?: React.CSSProperties;

  // --- Layout Options ---
  /** ノード幅 */
  nodeWidth?: number;

  /** ノード間パディング */
  nodePadding?: number;

  /** ノード配置アルゴリズム */
  nodeAlignment?: 'left' | 'right' | 'center' | 'justify';

  // --- Style Options ---
  /** ノードのデフォルト色 */
  nodeColor?: string;

  /** リンクの色モード */
  linkColorMode?: 'source' | 'target' | 'gradient' | 'fixed';

  /** リンクの透明度 */
  linkOpacity?: number;

  // --- Animation Options ---
  /** アニメーション有効化 */
  animated?: boolean;

  /** アニメーション時間 (ms) */
  animationDuration?: number;

  // --- Event Handlers ---
  /** ノードクリック時 */
  onNodeClick?: (node: ComputedNode, event: MouseEvent) => void;

  /** ノードホバー時 */
  onNodeHover?: (node: ComputedNode | null, event: MouseEvent) => void;

  /** リンククリック時 */
  onLinkClick?: (link: ComputedLink, event: MouseEvent) => void;

  /** リンクホバー時 */
  onLinkHover?: (link: ComputedLink | null, event: MouseEvent) => void;

  /** 選択変更時 */
  onSelectionChange?: (nodes: ComputedNode[], links: ComputedLink[]) => void;
}

// =============================================================================
// Ref Interface (Imperative Handle)
// =============================================================================

export interface SankeyChartRef {
  /** 特定ノードをハイライト */
  highlight: (nodeIds: string[]) => void;

  /** ハイライト解除 */
  clearHighlight: () => void;

  /** SVGをエクスポート */
  exportSVG: () => string | null;

  /** 再描画を強制 */
  forceUpdate: () => void;
}

// =============================================================================
// Component Implementation
// =============================================================================

export const SankeyChart = forwardRef<SankeyChartRef, SankeyChartProps>(
  function SankeyChart(props, ref) {
    const {
      data,
      width,
      height,
      autoResize = true,
      className,
      style,
      // Layout
      nodeWidth = 24,
      nodePadding = 16,
      nodeAlignment = 'justify',
      // Style
      nodeColor = '#1f77b4',
      linkColorMode = 'source',
      linkOpacity = 0.5,
      // Animation
      animated = true,
      animationDuration = 500,
      // Events
      onNodeClick,
      onNodeHover,
      onLinkClick,
      onLinkHover,
      onSelectionChange,
    } = props;

    // Build config from props
    const config = useMemo<Partial<SankeyChartConfig>>(() => ({
      width: width ?? 800,
      height: height ?? 600,
      layout: {
        nodeWidth,
        nodePadding,
        nodeAlignment,
        iterations: 32,
      },
      style: {
        nodeColor,
        nodeStroke: '#000',
        nodeStrokeWidth: 0,
        linkColor: '#aaa',
        linkOpacity,
        linkColorMode,
        labelFontSize: 12,
        labelFontFamily: 'Segoe UI, sans-serif',
        labelColor: '#333',
      },
      animation: {
        enabled: animated,
        duration: animationDuration,
        easing: 'easeCubic',
        enterAnimation: true,
      },
    }), [
      width, height, nodeWidth, nodePadding, nodeAlignment,
      nodeColor, linkColorMode, linkOpacity, animated, animationDuration,
    ]);

    // Build event handlers from props
    const handlers = useMemo<SankeyEventHandlers>(() => ({
      onNodeClick,
      onNodeHover,
      onLinkClick,
      onLinkHover,
      onSelectionChange,
    }), [onNodeClick, onNodeHover, onLinkClick, onLinkHover, onSelectionChange]);

    // Use the sankey hook
    const {
      containerRef,
      render,
      update,
      highlight,
      clearHighlight,
      exportSVG,
    } = useSankey({ config, handlers, autoResize });

    // Initial render and updates
    useEffect(() => {
      if (data) {
        render(data);
      }
    }, [data, render]);

    // Expose imperative methods via ref
    useImperativeHandle(ref, () => ({
      highlight,
      clearHighlight,
      exportSVG,
      forceUpdate: () => {
        if (data) {
          update(data);
        }
      },
    }), [highlight, clearHighlight, exportSVG, update, data]);

    // Container styles
    const containerStyle: React.CSSProperties = {
      width: width ? `${width}px` : '100%',
      height: height ? `${height}px` : '100%',
      minHeight: '200px',
      ...style,
    };

    return (
      <div
        ref={containerRef}
        className={`sankey-chart-container ${className ?? ''}`}
        style={containerStyle}
        data-testid="sankey-chart"
      />
    );
  }
);

// =============================================================================
// Default Export
// =============================================================================

export default SankeyChart;
