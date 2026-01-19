/**
 * React用 Sankey Chart コンポーネント
 *
 * 【ReactとD3の統合方法 - 設計議論】
 *
 * ■ アプローチ1: useEffect内でD3操作（Imperative）
 *   - D3がDOM操作を完全に制御
 *   - D3のフル機能（transition, drag等）を活用可能
 *   - React DevToolsでの可視性が低い
 *   - 本実装ではこのアプローチを採用
 *
 * ■ アプローチ2: Declarative D3（React Rendering）
 *   - D3はデータ計算のみ、ReactがDOM描画
 *   - Reactの仮想DOM差分更新の恩恵
 *   - React DevToolsで完全に可視化
 *   - ただしD3のtransitionが使えない（react-spring等で代替）
 *
 * ■ 本実装の選択理由:
 *   1. d3-sankeyのレイアウト計算はそのまま使いたい
 *   2. D3のenter/update/exitパターンでアニメーション制御
 *   3. Power BI互換のためパフォーマンス重視
 *   4. ツールチップ、ハイライト等の複雑なインタラクション
 *
 * ■ Declarativeアプローチの場合の代替案:
 *   - visx (@visx/sankey) - React用D3ラッパー
 *   - recharts-sankey
 *   - react-vis
 */

import React, {
  useRef,
  useEffect,
  useCallback,
  useMemo,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { SankeyChart, createSankeyChart, SankeyChartOptions } from '../core/SankeyChart';
import type {
  SankeyData,
  SankeyChartConfig,
  SankeyEventHandlers,
  ComputedNode,
  ComputedLink,
} from '../types';
import { TooltipFormatter } from '../core/Tooltip';

// ============================================================
// 型定義
// ============================================================

export interface SankeyChartReactProps {
  /** 描画データ */
  data: SankeyData;
  /** 幅（省略時はコンテナに合わせる） */
  width?: number;
  /** 高さ（省略時はコンテナに合わせる） */
  height?: number;
  /** チャート設定 */
  config?: Partial<SankeyChartConfig>;
  /** レスポンシブ対応 */
  responsive?: boolean;
  /** クラス名 */
  className?: string;
  /** スタイル */
  style?: React.CSSProperties;

  // イベントハンドラ
  onNodeHover?: (node: ComputedNode | null, event: MouseEvent) => void;
  onNodeClick?: (node: ComputedNode, event: MouseEvent) => void;
  onLinkHover?: (link: ComputedLink | null, event: MouseEvent) => void;
  onLinkClick?: (link: ComputedLink, event: MouseEvent) => void;
  onSelectionChange?: (nodes: ComputedNode[], links: ComputedLink[]) => void;

  // カスタムフォーマッタ
  nodeTooltipFormatter?: TooltipFormatter<ComputedNode>;
  linkTooltipFormatter?: TooltipFormatter<ComputedLink>;
}

export interface SankeyChartReactRef {
  /** 選択をクリア */
  clearSelection: () => void;
  /** 設定を更新 */
  updateConfig: (config: Partial<SankeyChartConfig>) => void;
  /** 現在のサイズを取得 */
  getSize: () => { width: number; height: number };
  /** 内部インスタンスを取得（高度な操作用） */
  getInstance: () => SankeyChart | null;
}

// ============================================================
// コンポーネント実装
// ============================================================

/**
 * React用 Sankey Chart コンポーネント
 *
 * @example
 * ```tsx
 * function App() {
 *   const chartRef = useRef<SankeyChartReactRef>(null);
 *
 *   const data = {
 *     nodes: [
 *       { id: 'a', name: 'Source A', color: '#4285f4' },
 *       { id: 'b', name: 'Target B', color: '#ea4335' },
 *     ],
 *     links: [
 *       { source: 'a', target: 'b', value: 100 },
 *     ],
 *   };
 *
 *   return (
 *     <SankeyChartReact
 *       ref={chartRef}
 *       data={data}
 *       responsive
 *       onNodeClick={(node) => console.log('Clicked:', node.name)}
 *     />
 *   );
 * }
 * ```
 */
export const SankeyChartReact = forwardRef<SankeyChartReactRef, SankeyChartReactProps>(
  function SankeyChartReact(props, ref) {
    const {
      data,
      width,
      height,
      config,
      responsive = true,
      className,
      style,
      onNodeHover,
      onNodeClick,
      onLinkHover,
      onLinkClick,
      onSelectionChange,
      nodeTooltipFormatter,
      linkTooltipFormatter,
    } = props;

    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<SankeyChart | null>(null);

    // イベントハンドラをメモ化
    const eventHandlers = useMemo<SankeyEventHandlers>(
      () => ({
        onNodeHover,
        onNodeClick,
        onLinkHover,
        onLinkClick,
        onSelectionChange,
      }),
      [onNodeHover, onNodeClick, onLinkHover, onLinkClick, onSelectionChange]
    );

    // 設定をメモ化
    const chartOptions = useMemo<SankeyChartOptions>(() => {
      const mergedConfig: Partial<SankeyChartConfig> = { ...config };
      if (width !== undefined) mergedConfig.width = width;
      if (height !== undefined) mergedConfig.height = height;

      return {
        config: mergedConfig,
        responsive,
        eventHandlers,
      };
    }, [config, width, height, responsive, eventHandlers]);

    // チャートの初期化
    useEffect(() => {
      if (!containerRef.current) return;

      // チャートインスタンスを作成
      chartRef.current = createSankeyChart(containerRef.current, chartOptions);

      // カスタムフォーマッタを設定
      if (nodeTooltipFormatter) {
        chartRef.current.setNodeTooltipFormatter(nodeTooltipFormatter);
      }
      if (linkTooltipFormatter) {
        chartRef.current.setLinkTooltipFormatter(linkTooltipFormatter);
      }

      // クリーンアップ
      return () => {
        chartRef.current?.destroy();
        chartRef.current = null;
      };
    }, []); // 初回のみ実行

    // データ更新時に再描画
    useEffect(() => {
      if (chartRef.current && data) {
        chartRef.current.render(data);
      }
    }, [data]);

    // 設定更新時に反映
    useEffect(() => {
      if (chartRef.current) {
        const mergedConfig: Partial<SankeyChartConfig> = { ...config };
        if (width !== undefined) mergedConfig.width = width;
        if (height !== undefined) mergedConfig.height = height;
        chartRef.current.updateConfig(mergedConfig);
      }
    }, [config, width, height]);

    // イベントハンドラ更新時に反映
    useEffect(() => {
      if (chartRef.current) {
        chartRef.current.setEventHandlers(eventHandlers);
      }
    }, [eventHandlers]);

    // フォーマッタ更新時に反映
    useEffect(() => {
      if (chartRef.current && nodeTooltipFormatter) {
        chartRef.current.setNodeTooltipFormatter(nodeTooltipFormatter);
      }
    }, [nodeTooltipFormatter]);

    useEffect(() => {
      if (chartRef.current && linkTooltipFormatter) {
        chartRef.current.setLinkTooltipFormatter(linkTooltipFormatter);
      }
    }, [linkTooltipFormatter]);

    // ref経由で公開するメソッド
    useImperativeHandle(
      ref,
      () => ({
        clearSelection: () => chartRef.current?.clearSelection(),
        updateConfig: (cfg) => chartRef.current?.updateConfig(cfg),
        getSize: () => chartRef.current?.getSize() ?? { width: 0, height: 0 },
        getInstance: () => chartRef.current,
      }),
      []
    );

    // コンテナスタイル
    const containerStyle = useMemo<React.CSSProperties>(
      () => ({
        width: responsive ? '100%' : width ?? 800,
        height: responsive ? '100%' : height ?? 600,
        minHeight: 200,
        position: 'relative',
        ...style,
      }),
      [responsive, width, height, style]
    );

    return <div ref={containerRef} className={className} style={containerStyle} />;
  }
);

// ============================================================
// Hooks
// ============================================================

/**
 * Sankey Chart のデータをメモ化するフック
 *
 * 大量データの場合、不要な再計算を避けるために使用
 */
export function useSankeyData(
  nodes: SankeyData['nodes'],
  links: SankeyData['links']
): SankeyData {
  return useMemo(() => ({ nodes, links }), [nodes, links]);
}

/**
 * Sankey Chart の設定をメモ化するフック
 */
export function useSankeyConfig(
  config: Partial<SankeyChartConfig>
): Partial<SankeyChartConfig> {
  return useMemo(() => config, [JSON.stringify(config)]);
}

// ============================================================
// デフォルトエクスポート
// ============================================================

export default SankeyChartReact;
