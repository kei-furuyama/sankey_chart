/**
 * Power BI DataView Transformer
 *
 * Converts Power BI DataView format to SankeyData with built-in
 * link aggregation and color scheme support. This is a simpler
 * alternative to dataConverter.ts for cases where Power BI host
 * APIs are not available.
 */

import type { SankeyData, SankeyNodeDatum, SankeyLinkDatum } from '../types';
import { aggregateNumbers } from '../utils/aggregation';

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

type AggregationMethod = 'sum' | 'average' | 'max' | 'min';

export interface TransformOptions {
  sourceRole?: string;
  targetRole?: string;
  valueRole?: string;
  colorScheme?: string[];
  filterNonPositive?: boolean;
  aggregation?: AggregationMethod;
}

const DEFAULT_COLOR_SCHEME = [
  '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
  '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf',
];

const DEFAULT_OPTIONS: Required<TransformOptions> = {
  sourceRole: 'Source',
  targetRole: 'Target',
  valueRole: 'Value',
  colorScheme: DEFAULT_COLOR_SCHEME,
  filterNonPositive: true,
  aggregation: 'sum',
};

/**
 * Convert a Power BI DataView to SankeyData with built-in aggregation.
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

  const sourceColumn = findCategoryByRole(categorical.categories, opts.sourceRole);
  const targetColumn = findCategoryByRole(categorical.categories, opts.targetRole);
  const valueColumn = findValueByRole(categorical.values, opts.valueRole);

  if (!sourceColumn || !targetColumn || !valueColumn) {
    console.warn('DataViewTransformer: Required columns not found', {
      hasSource: !!sourceColumn,
      hasTarget: !!targetColumn,
      hasValue: !!valueColumn,
    });
    return null;
  }

  const linkBuckets = new Map<string, { source: string; target: string; values: number[] }>();
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
    const existing = linkBuckets.get(linkKey);

    if (existing) {
      existing.values.push(value);
    } else {
      linkBuckets.set(linkKey, { source, target, values: [value] });
    }
  }

  const nodes: SankeyNodeDatum[] = Array.from(nodeSet).map((id, index) => ({
    id,
    name: id,
    color: opts.colorScheme[index % opts.colorScheme.length],
  }));

  const links: SankeyLinkDatum[] = Array.from(linkBuckets.values()).map((bucket) => ({
    source: bucket.source,
    target: bucket.target,
    value: aggregateNumbers(bucket.values, opts.aggregation),
  }));

  return { nodes, links };
}

function findCategoryByRole(
  categories: DataViewCategoryColumn[] | undefined,
  role: string
): DataViewCategoryColumn | undefined {
  return categories?.find((col) => col.source.roles?.[role]);
}

function findValueByRole(
  values: DataViewValueColumns | undefined,
  role: string
): DataViewValueColumn | undefined {
  if (!values) return undefined;
  return values.find((col) => col.source.roles?.[role]) ?? values[0];
}

/**
 * Detect rows with highlight values (when filters are applied).
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

/**
 * Convert Power BI selection state to node ID list.
 */
export function getSelectedNodeIds(
  _dataView: DataView | undefined,
  _selectionManager: any
): string[] {
  return [];
}
