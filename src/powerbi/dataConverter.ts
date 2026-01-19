/**
 * Power BI DataView -> SankeyData 変換モジュール
 *
 * Power BIのDataView形式から内部のSankeyData形式への変換を行う
 *
 * サポートするDataView形式:
 * - Categorical: カテゴリベースのデータ（推奨）
 * - Table: テーブル形式のデータ
 */

import type {
  SankeyData,
  SankeyNodeDatum,
  SankeyLinkDatum,
  PowerBIDataViewSimple,
  PowerBIColumnMapping,
  PowerBIVisualHost,
  PowerBISankeyNode,
  PowerBISankeyLink,
  PowerBISelectionId,
  DatasetMetadata,
} from '../types';

// ============================================================
// DataView変換オプション
// ============================================================

export interface DataViewConverterOptions {
  /** カラムマッピング */
  columnMapping?: PowerBIColumnMapping;
  /** Power BIのカラーパレットを使用して自動着色 */
  inferColors?: boolean;
  /** SelectionIdを生成（クロスフィルタリング用） */
  createSelectionIds?: boolean;
  /** 空値の処理方法 */
  emptyValueHandling?: 'skip' | 'zero' | 'error';
  /** ノード名のフォーマッター */
  nodeNameFormatter?: (value: string | number | null) => string;
  /** 値のフォーマッター */
  valueFormatter?: (value: number) => number;
}

const DEFAULT_OPTIONS: Required<DataViewConverterOptions> = {
  columnMapping: {
    source: 'Source',
    target: 'Target',
    value: 'Value',
  },
  inferColors: true,
  createSelectionIds: true,
  emptyValueHandling: 'skip',
  nodeNameFormatter: (value) => String(value ?? ''),
  valueFormatter: (value) => value,
};

// ============================================================
// メイン変換関数
// ============================================================

/**
 * Power BI DataViewをSankeyDataに変換
 *
 * @param dataView - Power BI DataView
 * @param host - Power BI Visual Host（色、選択ID生成用）
 * @param options - 変換オプション
 * @returns SankeyData（Power BI拡張）
 *
 * @example
 * ```ts
 * // Visual.update() 内で使用
 * const sankeyData = convertDataView(
 *   options.dataViews[0],
 *   this.host,
 *   { inferColors: true }
 * );
 * ```
 */
export function convertDataView(
  dataView: PowerBIDataViewSimple | undefined,
  host?: PowerBIVisualHost,
  options?: DataViewConverterOptions
): SankeyData & { nodes: PowerBISankeyNode[]; links: PowerBISankeyLink[] } {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // DataViewが空の場合
  if (!dataView) {
    return createEmptyResult();
  }

  // Categorical形式を優先
  if (dataView.categorical) {
    return convertCategoricalDataView(dataView, host, opts);
  }

  // Table形式
  if (dataView.table) {
    return convertTableDataView(dataView, host, opts);
  }

  return createEmptyResult();
}

// ============================================================
// Categorical DataView変換
// ============================================================

function convertCategoricalDataView(
  dataView: PowerBIDataViewSimple,
  host: PowerBIVisualHost | undefined,
  options: Required<DataViewConverterOptions>
): SankeyData & { nodes: PowerBISankeyNode[]; links: PowerBISankeyLink[] } {
  const categorical = dataView.categorical!;
  const categories = categorical.categories || [];
  const values = categorical.values || [];

  // ロールからカラムを特定
  const sourceCategory = categories.find((c) => c.source.roles['source']);
  const targetCategory = categories.find((c) => c.source.roles['target']);
  const valueColumn = values.find((v) => v.source.roles['value']);

  if (!sourceCategory || !targetCategory) {
    console.warn('Sankey: Source and Target categories are required');
    return createEmptyResult();
  }

  const nodeMap = new Map<string, PowerBISankeyNode>();
  const links: PowerBISankeyLink[] = [];
  const rowCount = sourceCategory.values.length;

  for (let i = 0; i < rowCount; i++) {
    const sourceValue = sourceCategory.values[i];
    const targetValue = targetCategory.values[i];
    const linkValue = valueColumn?.values[i];

    // 空値の処理
    if (sourceValue == null || targetValue == null) {
      if (options.emptyValueHandling === 'error') {
        throw new Error(`Row ${i} has null source or target`);
      }
      continue; // skip
    }

    const sourceId = options.nodeNameFormatter(sourceValue);
    const targetId = options.nodeNameFormatter(targetValue);
    const value = linkValue != null ? options.valueFormatter(Number(linkValue)) : 0;

    if (value <= 0 && options.emptyValueHandling === 'skip') {
      continue;
    }

    // ノードの登録
    if (!nodeMap.has(sourceId)) {
      const node = createNode(sourceId, host, options, i, 'source');
      nodeMap.set(sourceId, node);
    }

    if (!nodeMap.has(targetId)) {
      const node = createNode(targetId, host, options, i, 'target');
      nodeMap.set(targetId, node);
    }

    // SelectionId生成
    let selectionId: PowerBISelectionId | undefined;
    if (options.createSelectionIds && host) {
      selectionId = host
        .createSelectionIdBuilder()
        .withCategory(sourceCategory, i)
        .createSelectionId();
    }

    // リンク作成
    links.push({
      source: sourceId,
      target: targetId,
      value,
      selectionId,
      metadata: {
        rowIndex: i,
      },
    });
  }

  return {
    nodes: Array.from(nodeMap.values()),
    links,
    metadata: createMetadata(dataView),
  };
}

// ============================================================
// Table DataView変換
// ============================================================

function convertTableDataView(
  dataView: PowerBIDataViewSimple,
  host: PowerBIVisualHost | undefined,
  options: Required<DataViewConverterOptions>
): SankeyData & { nodes: PowerBISankeyNode[]; links: PowerBISankeyLink[] } {
  const table = dataView.table!;
  const columns = table.columns;
  const rows = table.rows;

  // カラムインデックスを特定
  const sourceIdx = findColumnIndex(columns, 'source', options.columnMapping.source);
  const targetIdx = findColumnIndex(columns, 'target', options.columnMapping.target);
  const valueIdx = findColumnIndex(columns, 'value', options.columnMapping.value);

  if (sourceIdx === -1 || targetIdx === -1) {
    console.warn('Sankey: Source and Target columns not found');
    return createEmptyResult();
  }

  const nodeMap = new Map<string, PowerBISankeyNode>();
  const links: PowerBISankeyLink[] = [];

  rows.forEach((row, i) => {
    const sourceValue = row[sourceIdx];
    const targetValue = row[targetIdx];
    const linkValue = valueIdx >= 0 ? row[valueIdx] : 1;

    if (sourceValue == null || targetValue == null) {
      if (options.emptyValueHandling === 'error') {
        throw new Error(`Row ${i} has null source or target`);
      }
      return;
    }

    const sourceId = options.nodeNameFormatter(sourceValue as string | number | null);
    const targetId = options.nodeNameFormatter(targetValue as string | number | null);
    const value = options.valueFormatter(Number(linkValue) || 0);

    if (value <= 0 && options.emptyValueHandling === 'skip') {
      return;
    }

    // ノードの登録
    if (!nodeMap.has(sourceId)) {
      nodeMap.set(sourceId, createNode(sourceId, host, options, i, 'source'));
    }

    if (!nodeMap.has(targetId)) {
      nodeMap.set(targetId, createNode(targetId, host, options, i, 'target'));
    }

    // リンク作成
    links.push({
      source: sourceId,
      target: targetId,
      value,
      metadata: {
        rowIndex: i,
        rowData: row,
      },
    });
  });

  return {
    nodes: Array.from(nodeMap.values()),
    links,
    metadata: createMetadata(dataView),
  };
}

// ============================================================
// ヘルパー関数
// ============================================================

function createEmptyResult(): SankeyData & {
  nodes: PowerBISankeyNode[];
  links: PowerBISankeyLink[];
} {
  return {
    nodes: [],
    links: [],
  };
}

function createNode(
  id: string,
  host: PowerBIVisualHost | undefined,
  options: Required<DataViewConverterOptions>,
  rowIndex: number,
  role: 'source' | 'target'
): PowerBISankeyNode {
  const node: PowerBISankeyNode = {
    id,
    name: id,
    metadata: {
      role,
      firstRowIndex: rowIndex,
    },
  };

  // 色の割り当て
  if (options.inferColors && host) {
    node.color = host.colorPalette.getColor(id).value;
  }

  return node;
}

function findColumnIndex(
  columns: Array<{ displayName: string; roles: Record<string, boolean> }>,
  role: string,
  fallbackName: string
): number {
  // まずロールで検索
  const roleIdx = columns.findIndex((c) => c.roles[role]);
  if (roleIdx >= 0) return roleIdx;

  // ロールが見つからない場合は名前で検索
  const nameIdx = columns.findIndex(
    (c) => c.displayName.toLowerCase() === fallbackName.toLowerCase()
  );
  return nameIdx;
}

function createMetadata(dataView: PowerBIDataViewSimple): DatasetMetadata {
  return {
    source: 'Power BI DataView',
    timestamp: new Date().toISOString(),
  };
}

// ============================================================
// リンク重複集計
// ============================================================

type AggregationMethod = 'sum' | 'average' | 'max' | 'min';

function computeAggregatedValue(values: number[], method: AggregationMethod): number {
  if (method === 'sum') return values.reduce((a, b) => a + b, 0);
  if (method === 'average') return values.reduce((a, b) => a + b, 0) / values.length;
  if (method === 'max') return Math.max(...values);
  return Math.min(...values);
}

/**
 * 同じsource-targetの組み合わせを持つリンクを集計
 */
export function aggregateLinks(
  links: PowerBISankeyLink[],
  method: AggregationMethod = 'sum'
): PowerBISankeyLink[] {
  const linkMap = new Map<string, PowerBISankeyLink[]>();

  for (const link of links) {
    const key = `${link.source}|${link.target}`;
    const group = linkMap.get(key);
    if (group) {
      group.push(link);
    } else {
      linkMap.set(key, [link]);
    }
  }

  const aggregated: PowerBISankeyLink[] = [];

  for (const group of linkMap.values()) {
    if (group.length === 1) {
      aggregated.push(group[0]);
      continue;
    }

    const values = group.map((l) => l.value);
    aggregated.push({
      ...group[0],
      value: computeAggregatedValue(values, method),
      metadata: {
        ...group[0].metadata,
        aggregatedFrom: group.length,
        originalValues: values,
      },
    });
  }

  return aggregated;
}

// ============================================================
// ハイライト値の適用
// ============================================================

/**
 * Power BIのハイライト値（フィルタ適用後の値）を適用
 */
export function applyHighlights(
  data: SankeyData & { nodes: PowerBISankeyNode[]; links: PowerBISankeyLink[] },
  highlights: Map<string, number>
): SankeyData & { nodes: PowerBISankeyNode[]; links: PowerBISankeyLink[] } {
  return {
    ...data,
    links: data.links.map((link) => {
      const key = `${link.source}|${link.target}`;
      const highlightValue = highlights.get(key);

      if (highlightValue !== undefined) {
        return {
          ...link,
          highlightValue,
        };
      }

      return link;
    }),
  };
}

// ============================================================
// カラー割り当てユーティリティ
// ============================================================

/**
 * カテゴリベースの色割り当て
 */
export function assignColorsByCategory(
  nodes: PowerBISankeyNode[],
  colorPalette: PowerBIVisualHost['colorPalette']
): PowerBISankeyNode[] {
  const categoryColors = new Map<string, string>();

  return nodes.map((node) => {
    const category = node.category || node.id;

    if (!categoryColors.has(category)) {
      categoryColors.set(category, colorPalette.getColor(category).value);
    }

    return {
      ...node,
      color: node.color || categoryColors.get(category),
    };
  });
}

/**
 * レイヤーベースの色割り当て
 * ソースとターゲットで異なる色スキームを使用
 */
export function assignColorsByLayer(
  nodes: PowerBISankeyNode[],
  colorPalette: PowerBIVisualHost['colorPalette']
): PowerBISankeyNode[] {
  return nodes.map((node) => {
    const role = node.metadata?.role as string;
    const colorKey = role ? `${role}_${node.id}` : node.id;

    return {
      ...node,
      color: node.color || colorPalette.getColor(colorKey).value,
    };
  });
}

// ============================================================
// SelectionId ユーティリティ
// ============================================================

/**
 * SelectionIdからリンクを検索
 */
export function findLinkBySelectionId(
  links: PowerBISankeyLink[],
  selectionId: PowerBISelectionId
): PowerBISankeyLink | undefined {
  return links.find((link) => link.selectionId?.equals(selectionId));
}

/**
 * SelectionIdからノードを検索
 */
export function findNodeBySelectionId(
  nodes: PowerBISankeyNode[],
  selectionId: PowerBISelectionId
): PowerBISankeyNode | undefined {
  return nodes.find((node) => node.selectionId?.equals(selectionId));
}

/**
 * 選択されたノードに接続されたリンクを取得
 */
export function getConnectedLinks(
  nodeId: string,
  links: PowerBISankeyLink[]
): PowerBISankeyLink[] {
  return links.filter((link) => link.source === nodeId || link.target === nodeId);
}

/**
 * 選択されたノードのSelectionIdを収集
 */
export function collectSelectionIds(
  links: PowerBISankeyLink[],
  nodeId: string
): PowerBISelectionId[] {
  return links
    .filter((link) => link.source === nodeId || link.target === nodeId)
    .map((link) => link.selectionId)
    .filter((id): id is PowerBISelectionId => id !== undefined);
}

