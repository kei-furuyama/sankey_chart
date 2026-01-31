/**
 * Sankey Chart データ変換パイプライン
 *
 * 機能:
 * - JSON/CSV/階層データからSankeyDataへの変換
 * - 集計、フィルタリング
 * - 欠損値の処理
 * - d3-sankey互換形式への変換
 */

import type {
  SankeyInputData,
  SankeyData,
  SankeyNodeDatum,
  SankeyLinkDatum,
  InputNode,
  InputLink,
  TableRow,
  HierarchicalNode,
  TransformOptions,
  FilterCriteria,
  AggregationConfig,
} from '../types';

// ============================================================
// メイン変換関数
// ============================================================

/**
 * 入力データをSankeyData形式に変換する
 *
 * @param input - 入力データ（JSON形式）
 * @param options - 変換オプション
 * @returns 変換されたSankeyData
 *
 * @example
 * ```ts
 * const data = transformToSankeyData({
 *   links: [
 *     { source: 'A', target: 'B', value: 100 },
 *     { source: 'B', target: 'C', value: 50 },
 *   ]
 * });
 * ```
 */
export function transformToSankeyData(
  input: SankeyInputData,
  options: Partial<TransformOptions> = {}
): SankeyData {
  const opts: TransformOptions = {
    missingValueStrategy: options.missingValueStrategy ?? 'error',
    defaultValue: options.defaultValue,
    minValue: options.minValue,
    aggregateDuplicates: options.aggregateDuplicates ?? true,
    aggregationMethod: options.aggregationMethod ?? 'sum',
    inferNodes: options.inferNodes ?? true,
    removeOrphanNodes: options.removeOrphanNodes ?? false,
    normalizeValues: options.normalizeValues ?? false,
    nodeNameResolver: options.nodeNameResolver,
  };

  // 1. リンクの処理
  let links = processLinks(input.links, opts);

  // 2. 重複リンクの集計
  if (opts.aggregateDuplicates) {
    links = aggregateDuplicateLinks(links, opts.aggregationMethod);
  }

  // 3. 最小値フィルタ
  if (opts.minValue !== undefined) {
    links = links.filter((link) => link.value >= opts.minValue!);
  }

  // 4. ノードの生成
  const nodes = generateNodes(input.nodes, links, opts);

  // 5. 孤立ノードの削除
  let finalNodes = nodes;
  if (opts.removeOrphanNodes) {
    const referencedIds = new Set<string>();
    links.forEach((link) => {
      referencedIds.add(link.source);
      referencedIds.add(link.target);
    });
    finalNodes = nodes.filter((node) => referencedIds.has(node.id));
  }

  // 6. 値の正規化
  if (opts.normalizeValues) {
    links = normalizeLinks(links);
  }

  return {
    nodes: finalNodes,
    links,
    metadata: input.metadata,
  };
}

// ============================================================
// リンク処理
// ============================================================

function processLinks(inputLinks: InputLink[], opts: TransformOptions): SankeyLinkDatum[] {
  const links: SankeyLinkDatum[] = [];

  for (const input of inputLinks) {
    const value = processValue(input.value, opts);

    if (value === null) {
      // skip戦略の場合、または無効な値
      continue;
    }

    links.push({
      source: input.source,
      target: input.target,
      value,
      category: input.category,
      color: input.color,
      metadata: extractMetadata(input, ['source', 'target', 'value', 'category', 'color']),
    });
  }

  return links;
}

function processValue(value: unknown, opts: TransformOptions): number | null {
  // 数値の場合
  if (typeof value === 'number') {
    if (!isFinite(value)) {
      if (opts.missingValueStrategy === 'error') {
        throw new Error(`無限大またはNaNの値が検出されました: ${value}`);
      }
      return handleMissingValue(opts);
    }

    if (value < 0) {
      if (opts.missingValueStrategy === 'error') {
        throw new Error(`負の値が検出されました: ${value}`);
      }
      return handleMissingValue(opts);
    }

    return value;
  }

  // 文字列の場合（数値に変換を試みる）
  if (typeof value === 'string') {
    const parsed = parseFloat(value.replace(/,/g, ''));
    if (!isNaN(parsed) && isFinite(parsed) && parsed >= 0) {
      return parsed;
    }
  }

  // 値が欠損している場合
  return handleMissingValue(opts);
}

function handleMissingValue(opts: TransformOptions): number | null {
  switch (opts.missingValueStrategy) {
    case 'error':
      throw new Error('欠損値が検出されました');
    case 'skip':
      return null;
    case 'zero':
      return 0;
    case 'default':
      return opts.defaultValue ?? 0;
    default:
      throw new Error(`不明な欠損値戦略: ${opts.missingValueStrategy}`);
  }
}

function extractMetadata(
  obj: Record<string, unknown>,
  excludeKeys: string[]
): Record<string, unknown> | undefined {
  const excludeSet = new Set(excludeKeys);
  const metadata: Record<string, unknown> = {};
  let hasMetadata = false;

  for (const [key, value] of Object.entries(obj)) {
    if (!excludeSet.has(key)) {
      metadata[key] = value;
      hasMetadata = true;
    }
  }

  return hasMetadata ? metadata : undefined;
}

// ============================================================
// 重複リンクの集計
// ============================================================

type AggregationMethod = TransformOptions['aggregationMethod'];

function aggregateDuplicateLinks(
  links: SankeyLinkDatum[],
  method: AggregationMethod
): SankeyLinkDatum[] {
  const linkMap = new Map<string, SankeyLinkDatum[]>();

  // キーでグループ化
  links.forEach((link) => {
    const key = `${link.source}|${link.target}`;
    const group = linkMap.get(key) || [];
    group.push(link);
    linkMap.set(key, group);
  });

  // 集計
  const aggregated: SankeyLinkDatum[] = [];

  linkMap.forEach((group) => {
    if (group.length === 1) {
      aggregated.push(group.at(0)!);
      return;
    }

    const values = group.map((l) => l.value);
    const aggregatedValue = aggregateValues(values, method);
    const first = group.at(0)!;

    aggregated.push({
      ...first,
      value: aggregatedValue,
      metadata: {
        ...first.metadata,
        _aggregatedFrom: group.length,
        _originalValues: values,
      },
    });
  });

  return aggregated;
}

function aggregateValues(values: number[], method: AggregationMethod): number {
  switch (method) {
    case 'sum':
      return values.reduce((a, b) => a + b, 0);
    case 'average':
      return values.reduce((a, b) => a + b, 0) / values.length;
    case 'max':
      return Math.max(...values);
    case 'min':
      return Math.min(...values);
    case 'first':
      return values.at(0)!;
    case 'last':
      return values.at(-1)!;
    default:
      return values.reduce((a, b) => a + b, 0);
  }
}

// ============================================================
// ノード生成
// ============================================================

function generateNodes(
  inputNodes: InputNode[] | undefined,
  links: SankeyLinkDatum[],
  opts: TransformOptions
): SankeyNodeDatum[] {
  const nodeMap = new Map<string, SankeyNodeDatum>();

  // 明示的ノードを追加
  if (inputNodes) {
    inputNodes.forEach((input) => {
      const name = input.name || opts.nodeNameResolver?.(input.id) || input.id;

      nodeMap.set(input.id, {
        id: input.id,
        name,
        category: input.category,
        color: input.color,
        fixedLayer: input.layer,
        metadata: extractMetadata(input, ['id', 'name', 'category', 'color', 'layer']),
      });
    });
  }

  // リンクから暗黙的ノードを推論
  if (opts.inferNodes) {
    const implicitNodeIds = new Set<string>();

    links.forEach((link) => {
      if (!nodeMap.has(link.source)) {
        implicitNodeIds.add(link.source);
      }
      if (!nodeMap.has(link.target)) {
        implicitNodeIds.add(link.target);
      }
    });

    implicitNodeIds.forEach((id) => {
      const name = opts.nodeNameResolver?.(id) || id;

      nodeMap.set(id, {
        id,
        name,
        metadata: { _implicit: true },
      });
    });
  }

  return Array.from(nodeMap.values());
}

// ============================================================
// 値の正規化
// ============================================================

function normalizeLinks(links: SankeyLinkDatum[]): SankeyLinkDatum[] {
  const maxValue = Math.max(...links.map((l) => l.value));

  if (maxValue === 0) {
    return links;
  }

  return links.map((link) => ({
    ...link,
    value: link.value / maxValue,
    metadata: {
      ...link.metadata,
      _originalValue: link.value,
    },
  }));
}

// ============================================================
// CSV/テーブル形式からの変換
// ============================================================

/**
 * テーブル行データをSankeyInputDataに変換
 *
 * @example
 * ```ts
 * const rows = [
 *   { source: 'A', target: 'B', value: '100', category: 'Energy' },
 *   { source: 'B', target: 'C', value: '50', category: 'Energy' },
 * ];
 *
 * const inputData = fromTableRows(rows);
 * ```
 */
export function fromTableRows(
  rows: TableRow[],
  columnMapping?: {
    source?: string;
    target?: string;
    value?: string;
  }
): SankeyInputData {
  const sourceCol = columnMapping?.source || 'source';
  const targetCol = columnMapping?.target || 'target';
  const valueCol = columnMapping?.value || 'value';

  const links: InputLink[] = rows.map((row) => {
    const source = String(row[sourceCol] ?? '');
    const target = String(row[targetCol] ?? '');
    const rawValue = row[valueCol];
    const value = typeof rawValue === 'number' ? rawValue : parseFloat(String(rawValue));

    // その他のカラムをメタデータとして保持
    const metadata: Record<string, unknown> = {};
    Object.entries(row).forEach(([key, val]) => {
      if (key !== sourceCol && key !== targetCol && key !== valueCol) {
        metadata[key] = val;
      }
    });

    return {
      source,
      target,
      value: isNaN(value) ? 0 : value,
      ...metadata,
    };
  });

  return { links };
}

/**
 * CSV文字列をパースしてSankeyInputDataに変換
 *
 * @example
 * ```ts
 * const csv = `source,target,value
 * A,B,100
 * B,C,50`;
 *
 * const inputData = fromCSV(csv);
 * ```
 */
export function fromCSV(
  csvString: string,
  options?: {
    delimiter?: string;
    hasHeader?: boolean;
    columnMapping?: {
      source?: string | number;
      target?: string | number;
      value?: string | number;
    };
  }
): SankeyInputData {
  const delimiter = options?.delimiter || ',';
  const hasHeader = options?.hasHeader ?? true;
  const lines = csvString.trim().split('\n');

  if (lines.length === 0) {
    return { links: [] };
  }

  let headers: string[];
  let dataLines: string[];

  if (hasHeader) {
    headers = parseCsvLine(lines.at(0)!, delimiter);
    dataLines = lines.slice(1);
  } else {
    headers = ['source', 'target', 'value'];
    dataLines = lines;
  }

  const sourceIdx = resolveColumnIndex(options?.columnMapping?.source ?? 'source', headers);
  const targetIdx = resolveColumnIndex(options?.columnMapping?.target ?? 'target', headers);
  const valueIdx = resolveColumnIndex(options?.columnMapping?.value ?? 'value', headers);

  const rows: TableRow[] = dataLines.map((line) => {
    const values = parseCsvLine(line, delimiter);
    const row: TableRow = {
      source: values[sourceIdx] || '',
      target: values[targetIdx] || '',
      value: values[valueIdx] || '0',
    };

    // すべてのカラムを含める
    headers.forEach((header, idx) => {
      if (idx !== sourceIdx && idx !== targetIdx && idx !== valueIdx) {
        row[header] = values[idx];
      }
    });

    return row;
  });

  return fromTableRows(rows);
}

function parseCsvLine(line: string, delimiter: string): string[] {
  // 簡易CSV パーサー（クォートを考慮）
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

function resolveColumnIndex(col: string | number, headers: string[]): number {
  if (typeof col === 'number') {
    return col;
  }
  const idx = headers.indexOf(col);
  return idx >= 0 ? idx : 0;
}

// ============================================================
// 階層データからの変換
// ============================================================

/**
 * 階層データをSankeyInputDataに変換
 *
 * @example
 * ```ts
 * const hierarchical = {
 *   id: 'root',
 *   children: [
 *     { id: 'A', value: 100 },
 *     { id: 'B', value: 50, children: [
 *       { id: 'B1', value: 30 },
 *       { id: 'B2', value: 20 },
 *     ]},
 *   ]
 * };
 *
 * const inputData = fromHierarchical(hierarchical);
 * ```
 */
export function fromHierarchical(
  root: HierarchicalNode,
  options?: {
    /** 値を子から親に集計するか */
    aggregateValues?: boolean;
    /** ルートノードを含めるか */
    includeRoot?: boolean;
  }
): SankeyInputData {
  const links: InputLink[] = [];
  const nodes: InputNode[] = [];
  const opts = {
    aggregateValues: options?.aggregateValues ?? true,
    includeRoot: options?.includeRoot ?? false,
  };

  function traverse(node: HierarchicalNode, parent?: HierarchicalNode): number {
    // ノードを追加
    if (opts.includeRoot || parent) {
      nodes.push({
        id: node.id,
        name: node.name,
        ...extractMetadata(node, ['id', 'name', 'value', 'children']),
      });
    }

    let totalValue = node.value ?? 0;

    // 子ノードを処理
    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        const childValue = traverse(child, node);

        // 親子間のリンクを作成
        if (opts.includeRoot || parent) {
          links.push({
            source: node.id,
            target: child.id,
            value: child.value ?? childValue,
          });
        } else {
          // ルートをスキップする場合、最初の子はリンクを作成しない
        }

        if (opts.aggregateValues) {
          totalValue += childValue;
        }
      }
    }

    return totalValue;
  }

  traverse(root);

  return { nodes, links };
}

// ============================================================
// フィルタリング
// ============================================================

/**
 * SankeyDataをフィルタリング
 *
 * @example
 * ```ts
 * const filtered = filterSankeyData(data, {
 *   minLinkValue: 10,
 *   nodeCategories: ['Energy', 'Transport'],
 * });
 * ```
 */
export function filterSankeyData(data: SankeyData, criteria: FilterCriteria): SankeyData {
  const nodeMap = new Map(data.nodes.map((n) => [n.id, n]));

  // リンクをフィルタ
  let filteredLinks = data.links.filter((link) => {
    const sourceNode = nodeMap.get(link.source);
    const targetNode = nodeMap.get(link.target);

    if (!sourceNode || !targetNode) {
      return false;
    }

    // 値の範囲チェック
    if (criteria.minLinkValue !== undefined && link.value < criteria.minLinkValue) {
      return false;
    }
    if (criteria.maxLinkValue !== undefined && link.value > criteria.maxLinkValue) {
      return false;
    }

    // リンクカテゴリチェック
    if (criteria.linkCategories && link.category) {
      if (!criteria.linkCategories.includes(link.category)) {
        return false;
      }
    }

    // ノードカテゴリチェック
    if (criteria.nodeCategories) {
      const sourceMatch = sourceNode.category && criteria.nodeCategories.includes(sourceNode.category);
      const targetMatch = targetNode.category && criteria.nodeCategories.includes(targetNode.category);
      if (!sourceMatch && !targetMatch) {
        return false;
      }
    }

    // カスタムフィルタ
    if (criteria.customFilter) {
      if (!criteria.customFilter(link, sourceNode, targetNode)) {
        return false;
      }
    }

    return true;
  });

  // ノードIDフィルタ（接続されたリンクのみ残す）
  if (criteria.nodeIds) {
    const allowedNodes = new Set(criteria.nodeIds);
    filteredLinks = filteredLinks.filter(
      (link) => allowedNodes.has(link.source) || allowedNodes.has(link.target)
    );
  }

  // 使用されているノードのみを残す
  const usedNodeIds = new Set<string>();
  filteredLinks.forEach((link) => {
    usedNodeIds.add(link.source);
    usedNodeIds.add(link.target);
  });

  const filteredNodes = data.nodes.filter((node) => usedNodeIds.has(node.id));

  return {
    nodes: filteredNodes,
    links: filteredLinks,
    metadata: data.metadata,
  };
}

// ============================================================
// 集計
// ============================================================

/**
 * ノードをグループ化して集計
 *
 * @example
 * ```ts
 * const aggregated = aggregateSankeyData(data, {
 *   groupBy: 'category',
 *   valueAggregation: 'sum',
 * });
 * ```
 */
export function aggregateSankeyData(data: SankeyData, config: AggregationConfig): SankeyData {
  // グループ化関数を決定
  const getGroupKey: (node: SankeyNodeDatum) => string =
    typeof config.groupBy === 'function'
      ? config.groupBy
      : config.groupBy === 'category'
        ? (node) => node.category || 'uncategorized'
        : (node) => String(node.fixedLayer ?? 'unknown');

  // ノードをグループ化
  const nodeGroups = new Map<string, SankeyNodeDatum[]>();

  data.nodes.forEach((node) => {
    const key = getGroupKey(node);
    const group = nodeGroups.get(key) || [];
    group.push(node);
    nodeGroups.set(key, group);
  });

  // 新しいノードを作成
  const newNodes: SankeyNodeDatum[] = [];
  const nodeIdMapping = new Map<string, string>(); // oldId -> newGroupId

  nodeGroups.forEach((nodes, groupKey) => {
    const groupId = `group_${groupKey}`;
    const groupName = config.nameGenerator
      ? config.nameGenerator(groupKey, nodes)
      : `${groupKey} (${nodes.length})`;

    newNodes.push({
      id: groupId,
      name: groupName,
      category: groupKey,
      metadata: {
        _aggregatedNodes: nodes.map((n) => n.id),
        _nodeCount: nodes.length,
      },
    });

    nodes.forEach((node) => {
      nodeIdMapping.set(node.id, groupId);
    });
  });

  // リンクを再マッピングして集計
  const linkMap = new Map<string, number[]>();

  data.links.forEach((link) => {
    const newSource = nodeIdMapping.get(link.source) || link.source;
    const newTarget = nodeIdMapping.get(link.target) || link.target;

    // 同じグループ内のリンクはスキップ
    if (newSource === newTarget) {
      return;
    }

    const key = `${newSource}|${newTarget}`;
    const values = linkMap.get(key) || [];
    values.push(link.value);
    linkMap.set(key, values);
  });

  const newLinks: SankeyLinkDatum[] = [];

  linkMap.forEach((values, key) => {
    const parts = key.split('|');
    const source = parts.at(0)!;
    const target = parts.at(1)!;
    const aggregatedValue = aggregateValues(values, config.valueAggregation);

    newLinks.push({
      source,
      target,
      value: aggregatedValue,
      metadata: {
        _aggregatedFrom: values.length,
        _originalValues: values,
      },
    });
  });

  return {
    nodes: newNodes,
    links: newLinks,
    metadata: data.metadata,
  };
}

// ============================================================
// d3-sankey互換形式への変換
// ============================================================

/**
 * SankeyDataをd3-sankeyが期待する形式に変換
 * （ノードインデックスベースのリンク参照）
 */
export function toD3SankeyFormat(data: SankeyData): {
  nodes: Array<SankeyNodeDatum & { index: number }>;
  links: Array<{ source: number; target: number; value: number } & Omit<SankeyLinkDatum, 'source' | 'target'>>;
} {
  // ノードにインデックスを割り当て
  const nodeIndexMap = new Map<string, number>();
  const nodes = data.nodes.map((node, index) => {
    nodeIndexMap.set(node.id, index);
    return { ...node, index };
  });

  // リンクのsource/targetをインデックスに変換
  const links = data.links.map((link) => {
    const sourceIndex = nodeIndexMap.get(link.source);
    const targetIndex = nodeIndexMap.get(link.target);

    if (sourceIndex === undefined || targetIndex === undefined) {
      throw new Error(
        `リンクが参照するノードが見つかりません: ${link.source} -> ${link.target}`
      );
    }

    return {
      ...link,
      source: sourceIndex,
      target: targetIndex,
    };
  });

  return { nodes, links };
}

