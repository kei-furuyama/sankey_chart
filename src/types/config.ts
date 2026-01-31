/**
 * Configuration types and defaults for Sankey Chart
 */

import type { ComputedGraph } from './internal.js';

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
// デフォルト設定
// ============================================================

/** デフォルトパフォーマンス設定 */
export const DEFAULT_PERFORMANCE_CONFIG: SankeyPerformanceConfig = {
  renderer: 'auto',
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
