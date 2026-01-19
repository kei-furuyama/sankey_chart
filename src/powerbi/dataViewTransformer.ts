/**
 * Power BI DataView Transformer
 *
 * Power BIのDataView形式をSankeyEngineが受け付けるSankeyData形式に変換します。
 * これがPower BI互換性の核となる変換レイヤーです。
 *
 * Power BI DataViewの構造:
 * - categorical: カテゴリデータ（Source, Target列）
 * - values: 数値データ（Value列）
 */

import type { SankeyData, SankeyNodeDatum, SankeyLinkDatum } from '../types';

// =============================================================================
// Power BI Type Definitions (powerbi-visuals-api から抜粋)
// =============================================================================

/**
 * 簡略化したDataView型定義
 * 実際のPower BI開発時は powerbi-visuals-api パッケージの型を使用
 */
export interface DataView {
  categorical?: DataViewCategorical;
  metadata?: DataViewMetadata;
}

export interface DataViewCategorical {
  categories?: DataViewCategoryColumn[];
  values?: DataViewValueColumns;
}

export interface DataViewCategoryColumn {
  source: DataViewMetadataColumn;
  values: (string | number | boolean | null)[];
  identity?: any[];
}

export interface DataViewValueColumns extends Array<DataViewValueColumn> {
  grouped?: () => DataViewValueColumnGroup[];
}

export interface DataViewValueColumn {
  source: DataViewMetadataColumn;
  values: (number | null)[];
  highlights?: (number | null)[];
}

export interface DataViewValueColumnGroup {
  name?: string;
  values: DataViewValueColumn[];
}

export interface DataViewMetadata {
  columns: DataViewMetadataColumn[];
}

export interface DataViewMetadataColumn {
  displayName: string;
  queryName?: string;
  roles?: { [name: string]: boolean };
  type?: any;
  format?: string;
  objects?: any;
}

// =============================================================================
// Transformer Options
// =============================================================================

export interface TransformOptions {
  /** ソース列の役割名 */
  sourceRole?: string;
  /** ターゲット列の役割名 */
  targetRole?: string;
  /** 値列の役割名 */
  valueRole?: string;
  /** ノード色の取得方法 */
  colorScheme?: string[];
  /** 0以下の値を除外 */
  filterNonPositive?: boolean;
  /** 重複リンクの集約方法 */
  aggregation?: 'sum' | 'average' | 'max' | 'min';
}

const DEFAULT_OPTIONS: Required<TransformOptions> = {
  sourceRole: 'Source',
  targetRole: 'Target',
  valueRole: 'Value',
  colorScheme: [
    '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
    '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf',
  ],
  filterNonPositive: true,
  aggregation: 'sum',
};

// =============================================================================
// Main Transformer Function
// =============================================================================

/**
 * Power BI DataViewをSankeyDataに変換
 */
export function transformDataView(
  dataView: DataView | undefined,
  options: TransformOptions = {}
): SankeyData | null {
  if (!dataView?.categorical) {
    return null;
  }

  const opts = { ...DEFAULT_OPTIONS, ...options };
  const { categorical } = dataView;

  // カテゴリ列を取得
  const sourceColumn = findColumnByRole(categorical.categories, opts.sourceRole);
  const targetColumn = findColumnByRole(categorical.categories, opts.targetRole);

  // 値列を取得
  const valueColumn = findValueColumnByRole(categorical.values, opts.valueRole);

  if (!sourceColumn || !targetColumn || !valueColumn) {
    console.warn('DataViewTransformer: Required columns not found', {
      hasSource: !!sourceColumn,
      hasTarget: !!targetColumn,
      hasValue: !!valueColumn,
    });
    return null;
  }

  // リンクを構築
  const linkMap = new Map<string, SankeyLinkDatum>();
  const nodeSet = new Set<string>();

  for (let i = 0; i < sourceColumn.values.length; i++) {
    const source = String(sourceColumn.values[i] ?? '');
    const target = String(targetColumn.values[i] ?? '');
    const value = valueColumn.values[i] ?? 0;

    if (!source || !target) continue;
    if (opts.filterNonPositive && value <= 0) continue;

    nodeSet.add(source);
    nodeSet.add(target);

    const linkKey = `${source}||${target}`;
    const existing = linkMap.get(linkKey);

    if (existing) {
      // 重複リンクの集約
      existing.value = aggregateValues(existing.value, value, opts.aggregation);
    } else {
      linkMap.set(linkKey, { source, target, value });
    }
  }

  // ノードを構築
  const nodes: SankeyNodeDatum[] = Array.from(nodeSet).map((id, index) => ({
    id,
    name: id,
    color: opts.colorScheme[index % opts.colorScheme.length],
  }));

  const links: SankeyLinkDatum[] = Array.from(linkMap.values());

  return { nodes, links };
}

// =============================================================================
// Helper Functions
// =============================================================================

function findColumnByRole(
  categories: DataViewCategoryColumn[] | undefined,
  role: string
): DataViewCategoryColumn | undefined {
  return categories?.find(col => col.source.roles?.[role]);
}

function findValueColumnByRole(
  values: DataViewValueColumns | undefined,
  role: string
): DataViewValueColumn | undefined {
  if (!values) return undefined;

  for (const col of values) {
    if (col.source.roles?.[role]) {
      return col;
    }
  }
  return values[0]; // フォールバック: 最初の値列
}

function aggregateValues(
  existing: number,
  newValue: number,
  method: 'sum' | 'average' | 'max' | 'min'
): number {
  switch (method) {
    case 'sum':
      return existing + newValue;
    case 'max':
      return Math.max(existing, newValue);
    case 'min':
      return Math.min(existing, newValue);
    case 'average':
      // Note: 正確な平均には件数の追跡が必要
      return (existing + newValue) / 2;
    default:
      return existing + newValue;
  }
}

// =============================================================================
// Selection Helper (Power BI Selection)
// =============================================================================

/**
 * Power BIの選択状態をノードIDリストに変換
 */
export function getSelectedNodeIds(
  dataView: DataView | undefined,
  selectionManager: any // ISelectionManager
): string[] {
  // Power BI選択APIとの連携（実装は実際のPBI環境で）
  return [];
}

/**
 * ハイライト値がある行を検出（フィルター適用時）
 */
export function getHighlightedRows(dataView: DataView | undefined): Set<number> {
  const highlighted = new Set<number>();

  const valueColumn = dataView?.categorical?.values?.[0];
  if (valueColumn?.highlights) {
    valueColumn.highlights.forEach((h, i) => {
      if (h !== null) {
        highlighted.add(i);
      }
    });
  }

  return highlighted;
}
