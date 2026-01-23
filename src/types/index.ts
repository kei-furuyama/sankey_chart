/**
 * Sankey Chart 型定義
 * Power BI互換 + Web汎用
 */

import type { SankeyGraph, SankeyLink, SankeyNode } from 'd3-sankey';

// ============================================================
// 基本データ型
// ============================================================

// ============================================================
// 入力データ形式
// ============================================================

/**
 * JSON入力形式 - データセット全体の構造
 * ノードは明示的に指定するか、リンクから自動推論可能
 */
export interface SankeyInputData {
  /** データセットのメタデータ */
  metadata?: DatasetMetadata;
  /** ノード定義（省略時はリンクから自動生成） */
  nodes?: InputNode[];
  /** リンク/フロー定義 */
  links: InputLink[];
}

/** データセットメタデータ */
export interface DatasetMetadata {
  /** データセット名 */
  name?: string;
  /** 説明 */
  description?: string;
  /** 値の単位（例: "TWh", "USD", "kg"） */
  unit?: string;
  /** データソース */
  source?: string;
  /** タイムスタンプ */
  timestamp?: string;
}

/** 入力ノード（JSON形式） */
export interface InputNode {
  /** 一意の識別子 */
  id: string;
  /** 表示名（省略時はidを使用） */
  name?: string;
  /** カテゴリ/グループ（色分けに使用） */
  category?: string;
  /** 色のオーバーライド */
  color?: string;
  /** レイヤー/列位置の固定（0始まり） */
  layer?: number;
  /** カスタムプロパティ */
  [key: string]: unknown;
}

/** 入力リンク（JSON形式） */
export interface InputLink {
  /** ソースノードID */
  source: string;
  /** ターゲットノードID */
  target: string;
  /** フロー値（正の数） */
  value: number;
  /** リンクのカテゴリ */
  category?: string;
  /** 色のオーバーライド */
  color?: string;
  /** カスタムプロパティ */
  [key: string]: unknown;
}

/**
 * CSV/テーブル形式の行データ
 * スプレッドシート形式のデータ入力用
 */
export interface TableRow {
  source: string;
  target: string;
  value: number | string;
  /** 追加列 */
  [key: string]: string | number | boolean | null | undefined;
}

/**
 * 階層データ形式
 * 組織図、ファイルシステムなどのツリー構造用
 */
export interface HierarchicalNode {
  /** ノード識別子 */
  id: string;
  /** 表示名 */
  name?: string;
  /** このノードの値 */
  value?: number;
  /** 子ノード */
  children?: HierarchicalNode[];
  /** カスタムプロパティ */
  [key: string]: unknown;
}

// ============================================================
// 内部データ構造（d3-sankey互換）
// ============================================================

/** ノードの基本データ */
export interface SankeyNodeDatum {
  /** 一意の識別子 */
  id: string;
  /** 表示名 */
  name: string;
  /** カテゴリ/グループ */
  category?: string;
  /** 色 */
  color?: string;
  /** レイヤー位置の固定 */
  fixedLayer?: number;
  /** Power BI: カスタムプロパティ */
  metadata?: Record<string, unknown>;
}

/** リンクの基本データ */
export interface SankeyLinkDatum {
  source: string;  // ノードID
  target: string;  // ノードID
  value: number;
  /** リンクのカテゴリ */
  category?: string;
  color?: string;
  metadata?: Record<string, unknown>;
}

// ============================================================
// データ検証
// ============================================================

/** 検証の重大度 */
export type ValidationSeverity = 'error' | 'warning' | 'info';

/** 検証エラーコード */
export type ValidationErrorCode =
  // 構造エラー
  | 'EMPTY_DATA'
  | 'NO_LINKS'
  | 'INVALID_STRUCTURE'
  // ノードエラー
  | 'DUPLICATE_NODE_ID'
  | 'ORPHAN_NODE'
  | 'UNKNOWN_NODE_REFERENCE'
  // リンクエラー
  | 'SELF_LOOP'
  | 'CIRCULAR_REFERENCE'
  | 'DUPLICATE_LINK'
  // 値エラー
  | 'NEGATIVE_VALUE'
  | 'ZERO_VALUE'
  | 'NON_NUMERIC_VALUE'
  | 'MISSING_VALUE'
  | 'INFINITE_VALUE'
  // データ品質警告
  | 'MISSING_NODE_NAME'
  | 'IMPLICIT_NODE';

/** 検証問題 */
export interface ValidationIssue {
  /** 重大度 */
  severity: ValidationSeverity;
  /** エラーコード */
  code: ValidationErrorCode;
  /** 人間が読めるメッセージ */
  message: string;
  /** 問題のあるデータへのパス（例: "links[2].value"） */
  path?: string;
  /** 問題の値 */
  value?: unknown;
  /** 修正の提案 */
  suggestion?: string;
}

/** 検証結果 */
export interface ValidationResult {
  /** データが有効かどうか */
  isValid: boolean;
  /** 発見された全問題 */
  issues: ValidationIssue[];
  /** エラーのみ */
  errors: ValidationIssue[];
  /** 警告のみ */
  warnings: ValidationIssue[];
  /** 統計情報 */
  stats: {
    nodeCount: number;
    linkCount: number;
    totalValue: number;
    layerCount?: number;
  };
}

// ============================================================
// データ変換オプション
// ============================================================

/** 変換オプション */
export interface TransformOptions {
  /** 欠損値の処理方法 */
  missingValueStrategy: 'error' | 'skip' | 'zero' | 'default';
  /** デフォルト値（'default'戦略使用時） */
  defaultValue?: number;
  /** 最小値閾値（これ以下はフィルタ） */
  minValue?: number;
  /** 重複リンクを集計するか */
  aggregateDuplicates: boolean;
  /** 集計方法 */
  aggregationMethod: 'sum' | 'average' | 'max' | 'min' | 'first' | 'last';
  /** リンクからノードを推論するか */
  inferNodes: boolean;
  /** 孤立ノードを削除するか */
  removeOrphanNodes: boolean;
  /** 値を正規化するか（0-1範囲） */
  normalizeValues: boolean;
  /** ノード名の解決関数 */
  nodeNameResolver?: (id: string) => string;
}

/** デフォルト変換オプション */
export const DEFAULT_TRANSFORM_OPTIONS: TransformOptions = {
  missingValueStrategy: 'error',
  aggregateDuplicates: true,
  aggregationMethod: 'sum',
  inferNodes: true,
  removeOrphanNodes: false,
  normalizeValues: false,
};

// ============================================================
// Power BI統合
// ============================================================

/** Power BIカラムマッピング */
export interface PowerBIColumnMapping {
  /** ソースノード列 */
  source: string;
  /** ターゲットノード列 */
  target: string;
  /** 値列 */
  value: string;
  /** ソースノードカテゴリ列 */
  sourceCategory?: string;
  /** ターゲットノードカテゴリ列 */
  targetCategory?: string;
  /** リンクカテゴリ列 */
  linkCategory?: string;
  /** ツールチップ列 */
  tooltips?: string[];
}

/** Power BI DataView（簡略化） */
export interface PowerBIDataViewSimple {
  categorical?: {
    categories?: Array<{
      source: { displayName: string; roles: Record<string, boolean> };
      values: Array<string | number | null>;
    }>;
    values?: Array<{
      source: { displayName: string; roles: Record<string, boolean> };
      values: Array<number | null>;
    }>;
  };
  table?: {
    columns: Array<{
      displayName: string;
      roles: Record<string, boolean>;
    }>;
    rows: Array<Array<string | number | boolean | null>>;
  };
}

// ============================================================
// フィルタリング・集計
// ============================================================

/** フィルタ条件 */
export interface FilterCriteria {
  /** ノードIDでフィルタ */
  nodeIds?: string[];
  /** ノードカテゴリでフィルタ */
  nodeCategories?: string[];
  /** 最小リンク値 */
  minLinkValue?: number;
  /** 最大リンク値 */
  maxLinkValue?: number;
  /** リンクカテゴリでフィルタ */
  linkCategories?: string[];
  /** カスタムフィルタ関数 */
  customFilter?: (link: SankeyLinkDatum, source: SankeyNodeDatum, target: SankeyNodeDatum) => boolean;
}

/** 集計設定 */
export interface AggregationConfig {
  /** グループ化キー */
  groupBy: 'category' | 'layer' | ((node: SankeyNodeDatum) => string);
  /** 値の集計方法 */
  valueAggregation: 'sum' | 'average' | 'max' | 'min';
  /** 集計ノードの名前生成 */
  nameGenerator?: (groupKey: string, nodes: SankeyNodeDatum[]) => string;
}

/** 処理済みデータ形式 */
export interface SankeyData {
  nodes: SankeyNodeDatum[];
  links: SankeyLinkDatum[];
  metadata?: DatasetMetadata;
}

// ============================================================
// d3-sankey 計算後の型（レイアウト済み）
// ============================================================

/** レイアウト計算後のノード */
export type ComputedNode = SankeyNode<SankeyNodeDatum, SankeyLinkDatum>;

/** レイアウト計算後のリンク */
export type ComputedLink = SankeyLink<SankeyNodeDatum, SankeyLinkDatum>;

/** レイアウト計算後のグラフ */
export type ComputedGraph = SankeyGraph<SankeyNodeDatum, SankeyLinkDatum>;

// ============================================================
// 設定オプション
// ============================================================

/** ノード配置アルゴリズム */
export type NodeAlignment = 'left' | 'right' | 'center' | 'justify';

/**
 * リンクソートモード
 * - 'ascending': Y座標昇順（上から下へ、交差最小化）
 * - 'descending': Y座標降順（下から上へ）
 * - 'byValue': 値の昇順（細いリンクが上）
 * - 'byValueDesc': 値の降順（太いリンクが上）
 * - 'none': ソートなし（データ順）
 */
export type LinkSortMode = 'ascending' | 'descending' | 'byValue' | 'byValueDesc' | 'none';

/** レイアウト設定 */
export interface SankeyLayoutConfig {
  /** ノード幅 (px) */
  nodeWidth: number;
  /** ノード間の最小パディング (px) */
  nodePadding: number;
  /** ノード配置アルゴリズム */
  nodeAlignment: NodeAlignment;
  /** レイアウト反復回数（精度向上） */
  iterations: number;
  /** リンクソートモード（デフォルト: 'ascending'で交差最小化） */
  linkSort?: LinkSortMode;
}

/** インタラクション設定 */
export interface SankeyInteractionConfig {
  /** ホバー時のハイライト有効化 */
  enableHover: boolean;
  /** クリック選択有効化 */
  enableClick: boolean;
  /** ツールチップ有効化 */
  enableTooltip: boolean;
  /** ノードドラッグ有効化 */
  enableNodeDrag: boolean;
  /** ハイライト時の非選択要素の透明度 */
  fadeOpacity: number;
}

/** アニメーション設定 */
export interface SankeyAnimationConfig {
  /** アニメーション有効化 */
  enabled: boolean;
  /** トランジション時間 (ms) */
  duration: number;
  /** イージング関数名 */
  easing: 'linear' | 'easeInOut' | 'easeCubic' | 'easeElastic';
  /** 初期表示アニメーション */
  enterAnimation: boolean;
}

/** スタイル設定 */
export interface SankeyStyleConfig {
  /** ノードのデフォルト色 */
  nodeColor: string;
  /** ノードの枠線色 */
  nodeStroke: string;
  /** ノードの枠線幅 */
  nodeStrokeWidth: number;
  /** リンクのデフォルト色 */
  linkColor: string;
  /** リンクの透明度 */
  linkOpacity: number;
  /** リンクの色モード */
  linkColorMode: 'source' | 'target' | 'gradient' | 'fixed';
  /** ラベルフォントサイズ */
  labelFontSize: number;
  /** ラベルフォントファミリー */
  labelFontFamily: string;
  /** ラベル色 */
  labelColor: string;
}

/** Power BI固有設定 */
export interface PowerBIConfig {
  /** Power BIテーマ互換 */
  useThemeColors: boolean;
  /** 選択状態の同期 */
  syncSelection: boolean;
  /** ドリルダウン対応 */
  enableDrilldown: boolean;
}

// ============================================================
// パフォーマンス設定
// ============================================================

/** レンダラータイプ */
export type RendererType = 'svg' | 'canvas' | 'auto';

/** パフォーマンス設定 */
export interface SankeyPerformanceConfig {
  /** レンダラータイプ（auto: ノード数で自動切替） */
  renderer: RendererType;
  /** Canvas切り替え閾値（ノード数） */
  canvasThreshold: number;
  /** 仮想化有効化閾値（ノード数） */
  virtualizationThreshold: number;
  /** Web Worker使用閾値（ノード数） */
  webWorkerThreshold: number;
  /** レイアウトキャッシュ有効化 */
  enableLayoutCache: boolean;
  /** パスキャッシュ有効化 */
  enablePathCache: boolean;
  /** リサイズデバウンス遅延 (ms) */
  debounceDelay: number;
  /** 目標FPS */
  targetFps: number;
  /** プログレッシブレンダリング有効化 */
  enableProgressiveRendering: boolean;
  /** プログレッシブレンダリングのバッチサイズ */
  progressiveBatchSize: number;
}

// ============================================================
// パフォーマンス計測型
// ============================================================

/** パフォーマンスメトリクス */
export interface PerformanceMetrics {
  /** レイアウト計算時間 (ms) */
  layoutTime: number;
  /** レンダリング時間 (ms) */
  renderTime: number;
  /** 合計時間 (ms) */
  totalTime: number;
  /** ノード数 */
  nodeCount: number;
  /** リンク数 */
  linkCount: number;
  /** 現在のFPS */
  fps: number;
  /** メモリ使用量 (bytes) */
  memoryUsage?: number;
  /** キャッシュヒット数 */
  cacheHits: number;
  /** キャッシュミス数 */
  cacheMisses: number;
  /** 使用レンダラー */
  rendererUsed: RendererType;
  /** 仮想化が有効か */
  virtualizationActive: boolean;
  /** Web Workerが使用されたか */
  webWorkerUsed: boolean;
}

/** ベンチマーク結果 */
export interface BenchmarkResult {
  /** テスト名 */
  name: string;
  /** 実行回数 */
  iterations: number;
  /** 平均時間 (ms) */
  mean: number;
  /** 中央値 (ms) */
  median: number;
  /** 最小時間 (ms) */
  min: number;
  /** 最大時間 (ms) */
  max: number;
  /** 標準偏差 */
  stdDev: number;
  /** 95パーセンタイル */
  p95: number;
  /** 99パーセンタイル */
  p99: number;
}

// ============================================================
// キャッシュ関連型
// ============================================================

/** レイアウトキャッシュキー */
export interface LayoutCacheKey {
  /** データのハッシュ値 */
  dataHash: string;
  /** 幅 */
  width: number;
  /** 高さ */
  height: number;
  /** ノード幅 */
  nodeWidth: number;
  /** ノードパディング */
  nodePadding: number;
  /** ノード配置 */
  nodeAlignment: NodeAlignment;
}

/** レイアウトキャッシュエントリ */
export interface LayoutCacheEntry {
  /** キー */
  key: LayoutCacheKey;
  /** 計算済みグラフ */
  graph: ComputedGraph;
  /** 作成タイムスタンプ */
  timestamp: number;
  /** アクセス回数 */
  accessCount: number;
}

/** 全体設定 */
export interface SankeyChartConfig {
  /** SVG幅 */
  width: number;
  /** SVG高さ */
  height: number;
  /** マージン */
  margin: { top: number; right: number; bottom: number; left: number };
  /** レイアウト設定 */
  layout: SankeyLayoutConfig;
  /** インタラクション設定 */
  interaction: SankeyInteractionConfig;
  /** アニメーション設定 */
  animation: SankeyAnimationConfig;
  /** スタイル設定 */
  style: SankeyStyleConfig;
  /** パフォーマンス設定 */
  performance: SankeyPerformanceConfig;
  /** Power BI設定（オプション） */
  powerbi?: PowerBIConfig;
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
// ジェネリクスを活用した拡張可能型
// ============================================================

/**
 * カスタムメタデータを持つノード
 * @template TMeta カスタムメタデータの型
 */
export interface SankeyNodeWithMeta<TMeta = Record<string, unknown>>
  extends Omit<SankeyNodeDatum, 'metadata'> {
  metadata?: TMeta;
}

/**
 * カスタムメタデータを持つリンク
 * @template TMeta カスタムメタデータの型
 */
export interface SankeyLinkWithMeta<TMeta = Record<string, unknown>>
  extends Omit<SankeyLinkDatum, 'metadata'> {
  metadata?: TMeta;
}

/**
 * ジェネリック入力データ
 * @template TNodeMeta ノードのカスタムメタデータ
 * @template TLinkMeta リンクのカスタムメタデータ
 */
export interface SankeyInputDataGeneric<
  TNodeMeta = Record<string, unknown>,
  TLinkMeta = Record<string, unknown>
> {
  metadata?: DatasetMetadata;
  nodes?: Array<SankeyNodeWithMeta<TNodeMeta> & InputNode>;
  links: Array<SankeyLinkWithMeta<TLinkMeta> & InputLink>;
}

/**
 * ジェネリック計算済みグラフ
 */
export type ComputedGraphGeneric<
  TNodeMeta = Record<string, unknown>,
  TLinkMeta = Record<string, unknown>
> = SankeyGraph<SankeyNodeWithMeta<TNodeMeta>, SankeyLinkWithMeta<TLinkMeta>>;

// ============================================================
// React Props型定義
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

/**
 * エクスポートオプション
 */
export interface ExportOptions {
  /** スケール倍率 */
  scale?: number;
  /** 背景色 */
  backgroundColor?: string;
  /** ファイル名 */
  filename?: string;
  /** 品質 (JPEG用, 0-1) */
  quality?: number;
  /** フォーマット */
  format?: 'png' | 'jpeg' | 'webp';
  /** パディング */
  padding?: number;
}

// ============================================================
// Power BI DataView変換型
// ============================================================

/**
 * Power BI SelectionId
 */
export interface PowerBISelectionId {
  getSelector: () => unknown;
  getKey: () => string;
  equals: (other: PowerBISelectionId) => boolean;
}

/**
 * Power BI SelectionId Builder
 */
export interface PowerBISelectionIdBuilder {
  withCategory: (category: unknown, index: number) => PowerBISelectionIdBuilder;
  withMeasure: (measureId: string) => PowerBISelectionIdBuilder;
  withMatrix: (matrix: unknown, rowIndex: number) => PowerBISelectionIdBuilder;
  createSelectionId: () => PowerBISelectionId;
}

/**
 * Power BI Visual Host
 */
export interface PowerBIVisualHost {
  createSelectionIdBuilder: () => PowerBISelectionIdBuilder;
  createSelectionManager: () => PowerBISelectionManager;
  colorPalette: {
    getColor: (key: string) => { value: string };
    reset: () => void;
  };
  tooltipService: PowerBITooltipService;
  locale: string;
}

/**
 * Power BI Selection Manager
 */
export interface PowerBISelectionManager {
  select: (selectionId: PowerBISelectionId | PowerBISelectionId[], multiSelect?: boolean) => Promise<void>;
  clear: () => Promise<void>;
  getSelectionIds: () => PowerBISelectionId[];
  hasSelection: () => boolean;
  registerOnSelectCallback: (callback: (ids: PowerBISelectionId[]) => void) => void;
}

/**
 * Power BI Tooltip Service
 */
export interface PowerBITooltipService {
  show: (options: PowerBITooltipShowOptions) => void;
  move: (options: PowerBITooltipMoveOptions) => void;
  hide: (options: PowerBITooltipHideOptions) => void;
}

export interface PowerBITooltipShowOptions {
  coordinates: [number, number];
  isTouchEvent: boolean;
  dataItems: Array<{ displayName: string; value: string }>;
  identities: PowerBISelectionId[];
}

export interface PowerBITooltipMoveOptions {
  coordinates: [number, number];
  isTouchEvent: boolean;
}

export interface PowerBITooltipHideOptions {
  immediately: boolean;
  isTouchEvent: boolean;
}

/**
 * Power BI拡張ノード
 */
export interface PowerBISankeyNode extends SankeyNodeDatum {
  /** Power BI選択ID */
  selectionId?: PowerBISelectionId;
  /** ドリルダウン対象かどうか */
  drillable?: boolean;
  /** ハイライト値 */
  highlightValue?: number;
}

/**
 * Power BI拡張リンク
 */
export interface PowerBISankeyLink extends SankeyLinkDatum {
  /** Power BI選択ID */
  selectionId?: PowerBISelectionId;
  /** ハイライト値 */
  highlightValue?: number;
}

/**
 * Power BI DataView変換関数型
 */
export type PowerBIDataViewConverter = (
  dataView: PowerBIDataViewSimple,
  host: PowerBIVisualHost,
  options?: {
    columnMapping?: PowerBIColumnMapping;
    inferColors?: boolean;
    createSelectionIds?: boolean;
  }
) => SankeyData & {
  nodes: PowerBISankeyNode[];
  links: PowerBISankeyLink[];
};

/**
 * Power BI Visual Settings（capabilities.jsonに対応）
 */
export interface PowerBIVisualSettings {
  /** データポイント設定 */
  dataPoint: {
    defaultColor: string;
    showAllDataPoints: boolean;
    fill: string;
    fillRule?: string;
  };
  /** Sankey固有設定 */
  sankeySettings: {
    nodeWidth: number;
    nodePadding: number;
    nodeAlignment: NodeAlignment;
    iterations: number;
  };
  /** ラベル設定 */
  labels: {
    show: boolean;
    color: string;
    fontSize: number;
    fontFamily: string;
    showValue: boolean;
  };
  /** リンク設定 */
  links: {
    colorMode: 'source' | 'target' | 'gradient' | 'fixed';
    fixedColor: string;
    opacity: number;
  };
}

// ============================================================
// ユーティリティ型
// ============================================================

/**
 * 深いPartial（ネストされたオブジェクトも部分適用可能に）
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object
    ? T[P] extends Array<infer U>
      ? Array<DeepPartial<U>>
      : DeepPartial<T[P]>
    : T[P];
};

/**
 * 深いRequired（ネストされたオブジェクトも必須に）
 */
export type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object
    ? T[P] extends Array<infer U>
      ? Array<DeepRequired<U>>
      : DeepRequired<T[P]>
    : T[P];
};

/**
 * 読み取り専用の深い型
 */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object
    ? T[P] extends Array<infer U>
      ? ReadonlyArray<DeepReadonly<U>>
      : DeepReadonly<T[P]>
    : T[P];
};

/**
 * 設定のマージ結果型
 */
export type MergedConfig<T extends DeepPartial<SankeyChartConfig>> =
  SankeyChartConfig & T;

/**
 * 設定ビルダーインターフェース
 */
export interface SankeyConfigBuilder {
  setWidth(width: number): SankeyConfigBuilder;
  setHeight(height: number): SankeyConfigBuilder;
  setMargin(margin: Partial<SankeyChartConfig['margin']>): SankeyConfigBuilder;
  setLayout(config: Partial<SankeyLayoutConfig>): SankeyConfigBuilder;
  setInteraction(config: Partial<SankeyInteractionConfig>): SankeyConfigBuilder;
  setAnimation(config: Partial<SankeyAnimationConfig>): SankeyConfigBuilder;
  setStyle(config: Partial<SankeyStyleConfig>): SankeyConfigBuilder;
  setPerformance(config: Partial<SankeyPerformanceConfig>): SankeyConfigBuilder;
  setPowerBI(config: Partial<PowerBIConfig>): SankeyConfigBuilder;
  build(): SankeyChartConfig;
  clone(): SankeyConfigBuilder;
}

// ============================================================
// 型ガード関数
// ============================================================

/**
 * ノードイベントかどうかを判定
 */
export function isNodeEvent(event: SankeyElementEvent): event is SankeyNodeEvent {
  return event.type === 'node';
}

/**
 * リンクイベントかどうかを判定
 */
export function isLinkEvent(event: SankeyElementEvent): event is SankeyLinkEvent {
  return event.type === 'link';
}

/**
 * 背景イベントかどうかを判定
 */
export function isBackgroundEvent(event: SankeyElementEvent): event is SankeyBackgroundEvent {
  return event.type === 'background';
}

/**
 * ドラッグイベントかどうかを判定
 */
export function isDragEvent(event: SankeyElementEvent): event is SankeyDragEvent {
  return event.type === 'drag';
}

/**
 * 有効な入力リンクかどうかを検証
 */
export function isValidInputLink(value: unknown): value is InputLink {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.source === 'string' &&
    obj.source.length > 0 &&
    typeof obj.target === 'string' &&
    obj.target.length > 0 &&
    typeof obj.value === 'number' &&
    obj.value > 0 &&
    isFinite(obj.value)
  );
}

/**
 * 有効な入力データかどうかを検証
 */
export function isValidInputData(value: unknown): value is SankeyInputData {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  if (!Array.isArray(obj.links) || obj.links.length === 0) return false;
  return obj.links.every(isValidInputLink);
}

/**
 * ComputedNodeかどうかを判定
 */
export function isComputedNode(value: unknown): value is ComputedNode {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    typeof obj.x0 === 'number' &&
    typeof obj.y0 === 'number' &&
    typeof obj.x1 === 'number' &&
    typeof obj.y1 === 'number'
  );
}

// ============================================================
// デフォルト設定
// ============================================================

/** デフォルトパフォーマンス設定 */
export const DEFAULT_PERFORMANCE_CONFIG: SankeyPerformanceConfig = {
  renderer: 'auto',
  canvasThreshold: 500,           // 500ノード以上でCanvas
  virtualizationThreshold: 200,   // 200ノード以上で仮想化
  webWorkerThreshold: 1000,       // 1000ノード以上でWebWorker
  enableLayoutCache: true,
  enablePathCache: true,
  debounceDelay: 16,              // ~60fps
  targetFps: 60,
  enableProgressiveRendering: true,
  progressiveBatchSize: 50,
};

export const DEFAULT_CONFIG: SankeyChartConfig = {
  width: 800,
  height: 600,
  margin: { top: 20, right: 120, bottom: 20, left: 120 },
  layout: {
    nodeWidth: 24,
    nodePadding: 16,
    nodeAlignment: 'justify',
    iterations: 32,
    linkSort: 'ascending',
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
