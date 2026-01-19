/**
 * Optimized Sankey Chart Component
 * パフォーマンス最適化されたReactコンポーネント
 *
 * 最適化ポイント:
 * - React.memo による不要な再レンダリング防止
 * - useMemo/useCallback の適切な使用
 * - 条件付きレンダラー切り替え（SVG/Canvas）
 * - イベントリスナーの適切なクリーンアップ
 */

import React, {
  useRef,
  useEffect,
  useMemo,
  useCallback,
  useState,
  forwardRef,
  useImperativeHandle,
} from 'react';
import type {
  SankeyData,
  SankeyChartConfig,
  SankeyEventHandlers,
  ComputedGraph,
  ComputedNode,
  ComputedLink,
  PerformanceMetrics,
  RendererType,
  DEFAULT_CONFIG,
} from '../types';
import {
  useSankeyLayout,
  useResizeObserver,
  useRendererSelection,
  usePerformanceMetrics,
  useEventHandlers,
} from '../hooks/useSankeyChart';
import { SVGRenderer } from '../renderers/SVGRenderer';
import { CanvasRenderer } from '../renderers/CanvasRenderer';

// ============================================================
// Types
// ============================================================

export interface SankeyChartProps extends Partial<SankeyEventHandlers> {
  /** 入力データ */
  data: SankeyData;
  /** 設定（部分的に上書き可能） */
  config?: Partial<SankeyChartConfig>;
  /** 幅（auto: 親要素に合わせる） */
  width?: number | 'auto';
  /** 高さ（auto: 親要素に合わせる） */
  height?: number | 'auto';
  /** クラス名 */
  className?: string;
  /** インラインスタイル */
  style?: React.CSSProperties;
  /** パフォーマンス計測コールバック */
  onPerformanceMetrics?: (metrics: PerformanceMetrics) => void;
  /** レンダリング完了コールバック */
  onRenderComplete?: () => void;
}

export interface SankeyChartRef {
  /** SVG要素を取得 */
  getSVGElement: () => SVGSVGElement | null;
  /** Canvas要素を取得 */
  getCanvasElement: () => HTMLCanvasElement | null;
  /** パフォーマンス計測値を取得 */
  getMetrics: () => PerformanceMetrics;
  /** 再レンダリングを強制 */
  forceRender: () => void;
  /** ハイライトを設定 */
  highlight: (nodeIds: string[], linkIndices: number[]) => void;
  /** ハイライトをクリア */
  clearHighlight: () => void;
}

// ============================================================
// Default Config (inline to avoid import issues)
// ============================================================

const DEFAULT_PERFORMANCE_CONFIG = {
  renderer: 'auto' as RendererType,
  canvasThreshold: 500,
  virtualizationThreshold: 200,
  webWorkerThreshold: 1000,
  enableLayoutCache: true,
  enablePathCache: true,
  debounceDelay: 16,
  targetFps: 60,
  enableProgressiveRendering: true,
  progressiveBatchSize: 50,
};

const DEFAULT_CHART_CONFIG: SankeyChartConfig = {
  width: 800,
  height: 600,
  margin: { top: 20, right: 120, bottom: 20, left: 120 },
  layout: {
    nodeWidth: 24,
    nodePadding: 16,
    nodeAlignment: 'justify',
    iterations: 32,
  },
  interaction: {
    enableHover: true,
    enableClick: true,
    enableTooltip: true,
    enableNodeDrag: false,
    fadeOpacity: 0.2,
  },
  animation: {
    enabled: true,
    duration: 500,
    easing: 'easeCubic',
    enterAnimation: true,
  },
  style: {
    nodeColor: '#1f77b4',
    nodeStroke: '#000',
    nodeStrokeWidth: 0,
    linkColor: '#aaa',
    linkOpacity: 0.5,
    linkColorMode: 'source',
    labelFontSize: 12,
    labelFontFamily: 'Segoe UI, sans-serif',
    labelColor: '#333',
  },
  performance: DEFAULT_PERFORMANCE_CONFIG,
};

// ============================================================
// Helper: Deep Merge Config
// ============================================================

function mergeConfig(
  base: SankeyChartConfig,
  overrides?: Partial<SankeyChartConfig>
): SankeyChartConfig {
  if (!overrides) return base;

  return {
    ...base,
    ...overrides,
    margin: { ...base.margin, ...overrides.margin },
    layout: { ...base.layout, ...overrides.layout },
    interaction: { ...base.interaction, ...overrides.interaction },
    animation: { ...base.animation, ...overrides.animation },
    style: { ...base.style, ...overrides.style },
    performance: { ...base.performance, ...overrides.performance },
  };
}

// ============================================================
// Main Component
// ============================================================

export const SankeyChart = React.memo(
  forwardRef<SankeyChartRef, SankeyChartProps>((props, ref) => {
    const {
      data,
      config: configOverrides,
      width: propWidth = 'auto',
      height: propHeight = 'auto',
      className,
      style,
      onNodeHover,
      onNodeClick,
      onLinkHover,
      onLinkClick,
      onSelectionChange,
      onPerformanceMetrics,
      onRenderComplete,
    } = props;

    // Refs
    const containerRef = useRef<HTMLDivElement>(null);
    const svgRendererRef = useRef<SVGRenderer | null>(null);
    const canvasRendererRef = useRef<CanvasRenderer | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // State
    const [renderKey, setRenderKey] = useState(0);

    // マージされた設定（メモ化）
    const config = useMemo(
      () => mergeConfig(DEFAULT_CHART_CONFIG, configOverrides),
      [configOverrides]
    );

    // サイズ検出
    const observedSize = useResizeObserver(containerRef, config.performance.debounceDelay);
    const width = propWidth === 'auto' ? observedSize.width : propWidth;
    const height = propHeight === 'auto' ? observedSize.height : propHeight;

    // レイアウト計算
    const { graph, layoutTime, fromCache } = useSankeyLayout({
      data,
      config,
      width,
      height,
    });

    // レンダラー選択
    const rendererType = useRendererSelection(data.nodes.length, config);

    // パフォーマンス計測
    const performanceHook = usePerformanceMetrics(
      data.nodes.length,
      data.links.length
    );

    // イベントハンドラー
    const eventHandlers = useEventHandlers({
      graph,
      onNodeHover,
      onNodeClick,
      onLinkHover,
      onLinkClick,
    });

    // ============================================
    // SVG レンダラー初期化・更新
    // ============================================

    useEffect(() => {
      if (rendererType !== 'svg' || !containerRef.current || width <= 0 || height <= 0) {
        return;
      }

      // 既存のCanvasレンダラーを破棄
      if (canvasRendererRef.current) {
        canvasRendererRef.current.dispose();
        canvasRendererRef.current = null;
      }

      // SVGレンダラーの初期化または更新
      if (!svgRendererRef.current) {
        svgRendererRef.current = new SVGRenderer({
          container: containerRef.current,
          width,
          height,
          margin: config.margin,
          style: config.style,
          performance: config.performance,
          animation: config.animation,
        });
      } else {
        svgRendererRef.current.setSize(width, height);
      }

      // レンダリング
      if (graph) {
        performanceHook.startMeasure();
        const stats = svgRendererRef.current.render(graph);
        performanceHook.endMeasure('render');

        // パフォーマンス通知
        if (onPerformanceMetrics) {
          onPerformanceMetrics({
            ...performanceHook.metrics,
            layoutTime,
            renderTime: stats.totalTime,
            totalTime: layoutTime + stats.totalTime,
            rendererUsed: 'svg',
            virtualizationActive: stats.nodesSkipped > 0,
          });
        }

        onRenderComplete?.();
      }

      return () => {
        // コンポーネントアンマウント時のみ破棄
      };
    }, [graph, rendererType, width, height, config, renderKey]);

    // ============================================
    // Canvas レンダラー初期化・更新
    // ============================================

    useEffect(() => {
      if (rendererType !== 'canvas' || !canvasRef.current || width <= 0 || height <= 0) {
        return;
      }

      // 既存のSVGレンダラーを破棄
      if (svgRendererRef.current) {
        svgRendererRef.current.dispose();
        svgRendererRef.current = null;
      }

      // Canvasレンダラーの初期化または更新
      if (!canvasRendererRef.current) {
        canvasRendererRef.current = new CanvasRenderer({
          canvas: canvasRef.current,
          style: config.style,
          performance: config.performance,
        });
      }

      canvasRendererRef.current.setSize(width, height);

      // レンダリング
      if (graph) {
        performanceHook.startMeasure();

        if (config.performance.enableProgressiveRendering && data.nodes.length > 100) {
          canvasRendererRef.current.renderProgressive(
            graph,
            undefined,
            (stats) => {
              performanceHook.endMeasure('render');

              if (onPerformanceMetrics) {
                onPerformanceMetrics({
                  ...performanceHook.metrics,
                  layoutTime,
                  renderTime: stats.totalTime,
                  totalTime: layoutTime + stats.totalTime,
                  rendererUsed: 'canvas',
                  virtualizationActive: false,
                });
              }

              onRenderComplete?.();
            }
          );
        } else {
          const stats = canvasRendererRef.current.render(graph);
          performanceHook.endMeasure('render');

          if (onPerformanceMetrics) {
            onPerformanceMetrics({
              ...performanceHook.metrics,
              layoutTime,
              renderTime: stats.totalTime,
              totalTime: layoutTime + stats.totalTime,
              rendererUsed: 'canvas',
              virtualizationActive: false,
            });
          }

          onRenderComplete?.();
        }
      }
    }, [graph, rendererType, width, height, config, renderKey]);

    // ============================================
    // Canvas マウスイベント
    // ============================================

    useEffect(() => {
      if (rendererType !== 'canvas' || !canvasRef.current || !canvasRendererRef.current) {
        return;
      }

      const canvas = canvasRef.current;
      const renderer = canvasRendererRef.current;

      const handleMouseMove = (e: MouseEvent) => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const hit = renderer.hitTest(x, y);

        if (hit.type === 'node' && hit.data) {
          eventHandlers.handleNodeHover(hit.data as ComputedNode, e);
        } else if (hit.type === 'link' && hit.data) {
          eventHandlers.handleLinkHover(hit.data as ComputedLink, e);
        } else {
          eventHandlers.handleNodeHover(null, e);
          eventHandlers.handleLinkHover(null, e);
        }
      };

      const handleClick = (e: MouseEvent) => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const hit = renderer.hitTest(x, y);

        if (hit.type === 'node' && hit.data) {
          eventHandlers.handleNodeClick(hit.data as ComputedNode, e);
        } else if (hit.type === 'link' && hit.data) {
          eventHandlers.handleLinkClick(hit.data as ComputedLink, e);
        }
      };

      const handleMouseLeave = (e: MouseEvent) => {
        eventHandlers.handleNodeHover(null, e);
        eventHandlers.handleLinkHover(null, e);
      };

      canvas.addEventListener('mousemove', handleMouseMove);
      canvas.addEventListener('click', handleClick);
      canvas.addEventListener('mouseleave', handleMouseLeave);

      return () => {
        canvas.removeEventListener('mousemove', handleMouseMove);
        canvas.removeEventListener('click', handleClick);
        canvas.removeEventListener('mouseleave', handleMouseLeave);
      };
    }, [rendererType, eventHandlers]);

    // ============================================
    // クリーンアップ
    // ============================================

    useEffect(() => {
      return () => {
        svgRendererRef.current?.dispose();
        canvasRendererRef.current?.dispose();
      };
    }, []);

    // ============================================
    // Imperative Handle (Ref API)
    // ============================================

    useImperativeHandle(ref, () => ({
      getSVGElement: () => svgRendererRef.current?.getSVGElement() ?? null,
      getCanvasElement: () => canvasRef.current,
      getMetrics: () => performanceHook.metrics,
      forceRender: () => setRenderKey((k) => k + 1),
      highlight: (nodeIds: string[], linkIndices: number[]) => {
        if (!graph) return;

        const nodeIndices = nodeIds
          .map((id) => graph.nodes.findIndex((n) => n.id === id))
          .filter((i) => i >= 0);

        if (svgRendererRef.current) {
          svgRendererRef.current.highlight(
            nodeIndices,
            linkIndices,
            true,
            config.interaction.fadeOpacity
          );
        }
      },
      clearHighlight: () => {
        svgRendererRef.current?.clearHighlight();
      },
    }));

    // ============================================
    // Render
    // ============================================

    const containerStyle: React.CSSProperties = useMemo(
      () => ({
        width: propWidth === 'auto' ? '100%' : propWidth,
        height: propHeight === 'auto' ? '100%' : propHeight,
        position: 'relative' as const,
        ...style,
      }),
      [propWidth, propHeight, style]
    );

    return (
      <div
        ref={containerRef}
        className={className}
        style={containerStyle}
        role="figure"
        aria-label="Sankey Diagram"
      >
        {/* Canvas レンダラー用 */}
        {rendererType === 'canvas' && (
          <canvas
            ref={canvasRef}
            style={{
              display: 'block',
              width: '100%',
              height: '100%',
            }}
          />
        )}

        {/* SVG レンダラーは containerRef に直接描画 */}
      </div>
    );
  })
);

SankeyChart.displayName = 'SankeyChart';

// ============================================================
// Memoized Sub-Components (将来の拡張用)
// ============================================================

/**
 * ノードコンポーネント（SVG用、個別最適化）
 */
export const SankeyNode = React.memo<{
  node: ComputedNode;
  style: SankeyChartConfig['style'];
  onClick?: (node: ComputedNode, event: React.MouseEvent) => void;
  onHover?: (node: ComputedNode | null, event: React.MouseEvent) => void;
}>(({ node, style, onClick, onHover }) => {
  const handleClick = useCallback(
    (e: React.MouseEvent) => onClick?.(node, e),
    [node, onClick]
  );

  const handleMouseEnter = useCallback(
    (e: React.MouseEvent) => onHover?.(node, e),
    [node, onHover]
  );

  const handleMouseLeave = useCallback(
    (e: React.MouseEvent) => onHover?.(null, e),
    [onHover]
  );

  return (
    <rect
      x={node.x0}
      y={node.y0}
      width={(node.x1 ?? 0) - (node.x0 ?? 0)}
      height={(node.y1 ?? 0) - (node.y0 ?? 0)}
      fill={node.color ?? style.nodeColor}
      stroke={style.nodeStroke}
      strokeWidth={style.nodeStrokeWidth}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    />
  );
});

SankeyNode.displayName = 'SankeyNode';

/**
 * リンクコンポーネント（SVG用、個別最適化）
 */
export const SankeyLink = React.memo<{
  link: ComputedLink;
  path: string;
  style: SankeyChartConfig['style'];
  onClick?: (link: ComputedLink, event: React.MouseEvent) => void;
  onHover?: (link: ComputedLink | null, event: React.MouseEvent) => void;
}>(({ link, path, style, onClick, onHover }) => {
  const handleClick = useCallback(
    (e: React.MouseEvent) => onClick?.(link, e),
    [link, onClick]
  );

  const handleMouseEnter = useCallback(
    (e: React.MouseEvent) => onHover?.(link, e),
    [link, onHover]
  );

  const handleMouseLeave = useCallback(
    (e: React.MouseEvent) => onHover?.(null, e),
    [onHover]
  );

  const color = useMemo(() => {
    if (link.color) return link.color;
    const sourceNode = link.source as ComputedNode;
    return sourceNode.color ?? style.linkColor;
  }, [link, style.linkColor]);

  return (
    <path
      d={path}
      fill="none"
      stroke={color}
      strokeWidth={Math.max(1, link.width ?? 1)}
      strokeOpacity={style.linkOpacity}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    />
  );
});

SankeyLink.displayName = 'SankeyLink';
