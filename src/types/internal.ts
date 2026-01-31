/**
 * Internal data structures (d3-sankey compatible)
 */

import type { SankeyGraph, SankeyLink, SankeyNode } from 'd3-sankey';

import type { DatasetMetadata, InputLink, InputNode } from './input.js';

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
  source: string;
  target: string;
  value: number;
  /** リンクのカテゴリ */
  category?: string;
  color?: string;
  metadata?: Record<string, unknown>;
}

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
