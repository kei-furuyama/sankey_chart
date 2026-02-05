/**
 * Event handler types for Sankey Chart
 */

import type { ComputedNode, ComputedLink } from './internal.js';

/**
 * Minimal React type stubs for type definitions.
 * Avoids a hard dependency on @types/react.
 */
declare namespace React {
  type ReactNode = unknown;
  type CSSProperties = Record<string, string | number | undefined>;
}

// ============================================================
// イベント型定義（詳細版）
// ============================================================

/**
 * 基本イベントデータ
 * すべてのSankeyイベントに共通する情報
 */
export interface SankeyBaseEvent {
  /** 元のDOMイベント */
  nativeEvent: MouseEvent | TouchEvent | PointerEvent;
  /** チャート座標系でのX位置 */
  chartX: number;
  /** チャート座標系でのY位置 */
  chartY: number;
  /** イベント発生時刻 */
  timestamp: number;
  /** 修飾キー */
  modifiers: {
    ctrl: boolean;
    shift: boolean;
    alt: boolean;
    meta: boolean;
  };
}

/**
 * ノードイベントデータ
 */
export interface SankeyNodeEvent extends SankeyBaseEvent {
  /** イベント種別 */
  type: 'node';
  /** 対象ノード */
  node: ComputedNode;
  /** ノードインデックス */
  nodeIndex: number;
}

/**
 * リンクイベントデータ
 */
export interface SankeyLinkEvent extends SankeyBaseEvent {
  /** イベント種別 */
  type: 'link';
  /** 対象リンク */
  link: ComputedLink;
  /** リンクインデックス */
  linkIndex: number;
}

/**
 * 背景クリックイベント
 */
export interface SankeyBackgroundEvent extends SankeyBaseEvent {
  /** イベント種別 */
  type: 'background';
}

/**
 * 選択変更イベント
 */
export interface SankeySelectionEvent {
  /** 選択されたノード */
  selectedNodes: ComputedNode[];
  /** 選択されたリンク */
  selectedLinks: ComputedLink[];
  /** 選択変更のトリガー */
  trigger: 'click' | 'api' | 'clear' | 'keyboard';
  /** 選択がクリアされたか */
  cleared: boolean;
}

/**
 * ドラッグイベント（ノードドラッグ用）
 */
export interface SankeyDragEvent extends SankeyBaseEvent {
  /** イベント種別 */
  type: 'drag';
  /** ドラッグ対象ノード */
  node: ComputedNode;
  /** ドラッグ開始位置からのオフセットX */
  deltaX: number;
  /** ドラッグ開始位置からのオフセットY */
  deltaY: number;
  /** ドラッグ状態 */
  phase: 'start' | 'move' | 'end';
}

/**
 * 要素イベントのユニオン型
 */
export type SankeyElementEvent =
  | SankeyNodeEvent
  | SankeyLinkEvent
  | SankeyBackgroundEvent
  | SankeyDragEvent;

/**
 * イベントハンドラー集約インターフェース
 */
export interface SankeyEventHandlers {
  /** ノードホバー（null = マウスアウト）*/
  onNodeHover?: (event: SankeyNodeEvent | null) => void;
  /** ノードクリック */
  onNodeClick?: (event: SankeyNodeEvent) => void;
  /** ノードダブルクリック */
  onNodeDoubleClick?: (event: SankeyNodeEvent) => void;
  /** ノードコンテキストメニュー */
  onNodeContextMenu?: (event: SankeyNodeEvent) => void;
  /** リンクホバー */
  onLinkHover?: (event: SankeyLinkEvent | null) => void;
  /** リンククリック */
  onLinkClick?: (event: SankeyLinkEvent) => void;
  /** リンクダブルクリック */
  onLinkDoubleClick?: (event: SankeyLinkEvent) => void;
  /** 選択変更 */
  onSelectionChange?: (event: SankeySelectionEvent) => void;
  /** 背景クリック */
  onBackgroundClick?: (event: SankeyBackgroundEvent) => void;
  /** ノードドラッグ */
  onNodeDrag?: (event: SankeyDragEvent) => void;
}

/**
 * レガシーイベントハンドラー（後方互換性のため）
 * @deprecated SankeyEventHandlersを使用してください
 */
export interface LegacyEventHandlers {
  onNodeHover?: (node: ComputedNode | null, event: MouseEvent) => void;
  onNodeClick?: (node: ComputedNode, event: MouseEvent) => void;
  onLinkHover?: (link: ComputedLink | null, event: MouseEvent) => void;
  onLinkClick?: (link: ComputedLink, event: MouseEvent) => void;
  onSelectionChange?: (selectedNodes: ComputedNode[], selectedLinks: ComputedLink[]) => void;
}

// ============================================================
// React レンダラー型
// ============================================================

/**
 * ツールチップレンダラー型
 */
export type TooltipRenderer = (
  element:
    | { type: 'node'; data: ComputedNode }
    | { type: 'link'; data: ComputedLink }
) => React.ReactNode | string;

/**
 * カスタムノードレンダラー型
 */
export type NodeRenderer = (
  node: ComputedNode,
  props: {
    x: number;
    y: number;
    width: number;
    height: number;
    fill: string;
    stroke: string;
    opacity: number;
    isSelected: boolean;
    isHighlighted: boolean;
    isFaded: boolean;
  }
) => React.ReactNode;

/**
 * カスタムリンクレンダラー型
 */
export type LinkRenderer = (
  link: ComputedLink,
  props: {
    path: string;
    fill: string;
    opacity: number;
    isSelected: boolean;
    isHighlighted: boolean;
    isFaded: boolean;
  }
) => React.ReactNode;

/**
 * ラベルレンダラー型
 */
export type LabelRenderer = (
  node: ComputedNode,
  position: 'left' | 'right',
  props: {
    x: number;
    y: number;
    textAnchor: 'start' | 'end';
    value: number;
    formattedValue: string;
  }
) => React.ReactNode;

// ============================================================
// React Props型定義
// ============================================================

import type { SankeyInputData } from './input.js';
import type {
  SankeyChartConfig,
  PerformanceMetrics,
  ExportOptions,
} from './config.js';
import type { ComputedGraph } from './internal.js';
import type { DeepPartial } from './utilities.js';

/**
 * Reactコンポーネント用Props
 */
export interface SankeyChartProps extends SankeyEventHandlers {
  /** 入力データ */
  data: SankeyInputData;
  /** 設定オプション（部分適用可能）*/
  options?: DeepPartial<SankeyChartConfig>;
  /** CSSクラス名 */
  className?: string;
  /** インラインスタイル */
  style?: React.CSSProperties;
  /** アクセシビリティラベル */
  ariaLabel?: string;
  /** アクセシビリティ説明 */
  ariaDescription?: string;
  /** レスポンシブモード */
  responsive?: boolean;
  /** 親コンテナのサイズを自動検出 */
  autoSize?: boolean;
  /** ローディング状態 */
  loading?: boolean;
  /** カスタムローディングコンポーネント */
  loadingComponent?: React.ReactNode;
  /** エラー状態 */
  error?: Error | null;
  /** カスタムエラーコンポーネント */
  errorComponent?: React.ReactNode;
  /** 空データ時のメッセージ */
  emptyMessage?: string;
  /** カスタム空データコンポーネント */
  emptyComponent?: React.ReactNode;
  /** カスタムツールチップレンダラー */
  renderTooltip?: TooltipRenderer;
  /** カスタムノードレンダラー */
  renderNode?: NodeRenderer;
  /** カスタムリンクレンダラー */
  renderLink?: LinkRenderer;
  /** カスタムラベルレンダラー */
  renderLabel?: LabelRenderer;
  /** パフォーマンスコールバック */
  onPerformanceMetrics?: (metrics: PerformanceMetrics) => void;
  /** レンダリング完了コールバック */
  onRenderComplete?: (graph: ComputedGraph) => void;
}

/**
 * チャートRef（命令型API）
 */
export interface SankeyChartRef {
  /** SVG要素を取得 */
  getSvgElement: () => SVGSVGElement | null;
  /** Canvas要素を取得（Canvas レンダラー使用時）*/
  getCanvasElement: () => HTMLCanvasElement | null;
  /** PNG形式でエクスポート */
  exportPng: (options?: ExportOptions) => Promise<string>;
  /** SVG形式でエクスポート */
  exportSvg: () => string;
  /** 現在のグラフデータを取得 */
  getGraphData: () => ComputedGraph | null;
  /** 現在の設定を取得 */
  getConfig: () => SankeyChartConfig;
  /** プログラムでノードをハイライト */
  highlightNode: (nodeId: string | null) => void;
  /** プログラムでリンクをハイライト */
  highlightLink: (linkIndex: number | null) => void;
  /** プログラムでノードを選択 */
  selectNode: (nodeId: string, append?: boolean) => void;
  /** プログラムでリンクを選択 */
  selectLink: (linkIndex: number, append?: boolean) => void;
  /** すべてのハイライト・選択をリセット */
  resetState: () => void;
  /** 再描画を強制 */
  forceUpdate: () => void;
  /** ノードIDで検索 */
  findNodeById: (id: string) => ComputedNode | undefined;
  /** パフォーマンスメトリクスを取得 */
  getPerformanceMetrics: () => PerformanceMetrics;
}
