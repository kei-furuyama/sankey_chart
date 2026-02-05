/**
 * Power BI DataView -> SankeyData conversion module
 *
 * Converts Power BI DataView format to internal SankeyData format.
 * Supports Categorical and Table DataView formats.
 */

import type {
  SankeyData,
  PowerBIDataViewSimple,
  PowerBIColumnMapping,
  PowerBIVisualHost,
  PowerBISankeyNode,
  PowerBISankeyLink,
  PowerBISelectionId,
  DatasetMetadata,
} from '../types';
import { aggregateNumbers, type AggregationMethod } from '../utils/aggregation';

type PowerBISankeyData = SankeyData & {
  nodes: PowerBISankeyNode[];
  links: PowerBISankeyLink[];
};

export interface DataViewConverterOptions {
  columnMapping?: PowerBIColumnMapping;
  inferColors?: boolean;
  createSelectionIds?: boolean;
  emptyValueHandling?: 'skip' | 'zero' | 'error';
  nodeNameFormatter?: (value: string | number | null) => string;
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

/**
 * Convert a Power BI DataView to SankeyData.
 */
export function convertDataView(
  dataView: PowerBIDataViewSimple | undefined,
  host?: PowerBIVisualHost,
  options?: DataViewConverterOptions
): PowerBISankeyData {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  if (!dataView) {
    return { nodes: [], links: [] };
  }

  if (dataView.categorical) {
    return convertCategoricalDataView(dataView, host, opts);
  }

  if (dataView.table) {
    return convertTableDataView(dataView, host, opts);
  }

  return { nodes: [], links: [] };
}

function convertCategoricalDataView(
  dataView: PowerBIDataViewSimple,
  host: PowerBIVisualHost | undefined,
  options: Required<DataViewConverterOptions>
): PowerBISankeyData {
  const categorical = dataView.categorical!;
  const categories = categorical.categories || [];
  const values = categorical.values || [];

  const sourceCategory = categories.find((c) => c.source.roles['source']);
  const targetCategory = categories.find((c) => c.source.roles['target']);
  const valueColumn = values.find((v) => v.source.roles['value']);

  if (!sourceCategory || !targetCategory) {
    console.warn('Sankey: Source and Target categories are required');
    return { nodes: [], links: [] };
  }

  const nodeMap = new Map<string, PowerBISankeyNode>();
  const links: PowerBISankeyLink[] = [];
  const rowCount = sourceCategory.values.length;

  for (let i = 0; i < rowCount; i++) {
    const sourceValue = sourceCategory.values[i];
    const targetValue = targetCategory.values[i];
    const linkValue = valueColumn?.values[i];

    if (sourceValue == null || targetValue == null) {
      if (options.emptyValueHandling === 'error') {
        throw new Error(`Row ${i} has null source or target`);
      }
      continue;
    }

    const sourceId = options.nodeNameFormatter(sourceValue);
    const targetId = options.nodeNameFormatter(targetValue);
    const value = linkValue != null ? options.valueFormatter(Number(linkValue)) : 0;

    if (value <= 0 && options.emptyValueHandling === 'skip') {
      continue;
    }

    if (!nodeMap.has(sourceId)) {
      nodeMap.set(sourceId, createNode(sourceId, host, options, i, 'source'));
    }

    if (!nodeMap.has(targetId)) {
      nodeMap.set(targetId, createNode(targetId, host, options, i, 'target'));
    }

    let selectionId: PowerBISelectionId | undefined;
    if (options.createSelectionIds && host) {
      selectionId = host
        .createSelectionIdBuilder()
        .withCategory(sourceCategory, i)
        .createSelectionId();
    }

    links.push({
      source: sourceId,
      target: targetId,
      value,
      selectionId,
      metadata: { rowIndex: i },
    });
  }

  return {
    nodes: Array.from(nodeMap.values()),
    links,
    metadata: createMetadata(),
  };
}

function convertTableDataView(
  dataView: PowerBIDataViewSimple,
  host: PowerBIVisualHost | undefined,
  options: Required<DataViewConverterOptions>
): PowerBISankeyData {
  const table = dataView.table!;
  const { columns, rows } = table;

  const sourceIdx = findColumnIndex(columns, 'source', options.columnMapping.source);
  const targetIdx = findColumnIndex(columns, 'target', options.columnMapping.target);
  const valueIdx = findColumnIndex(columns, 'value', options.columnMapping.value);

  if (sourceIdx === -1 || targetIdx === -1) {
    console.warn('Sankey: Source and Target columns not found');
    return { nodes: [], links: [] };
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

    if (!nodeMap.has(sourceId)) {
      nodeMap.set(sourceId, createNode(sourceId, host, options, i, 'source'));
    }

    if (!nodeMap.has(targetId)) {
      nodeMap.set(targetId, createNode(targetId, host, options, i, 'target'));
    }

    links.push({
      source: sourceId,
      target: targetId,
      value,
      metadata: { rowIndex: i, rowData: row },
    });
  });

  return {
    nodes: Array.from(nodeMap.values()),
    links,
    metadata: createMetadata(),
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
    metadata: { role, firstRowIndex: rowIndex },
  };

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
  const roleIdx = columns.findIndex((c) => c.roles[role]);
  if (roleIdx >= 0) return roleIdx;

  return columns.findIndex(
    (c) => c.displayName.toLowerCase() === fallbackName.toLowerCase()
  );
}

function createMetadata(): DatasetMetadata {
  return {
    source: 'Power BI DataView',
    timestamp: new Date().toISOString(),
  };
}

/**
 * Aggregate links that share the same source-target pair.
 */
export function aggregateLinks(
  links: PowerBISankeyLink[],
  method: AggregationMethod = 'sum'
): PowerBISankeyLink[] {
  const linkMap = new Map<string, PowerBISankeyLink[]>();

  for (const link of links) {
    const key = `${link.source}\0${link.target}`;
    const group = linkMap.get(key);
    if (group) {
      group.push(link);
    } else {
      linkMap.set(key, [link]);
    }
  }

  const aggregated: PowerBISankeyLink[] = [];

  for (const group of linkMap.values()) {
    const first = group[0]!;
    if (group.length === 1) {
      aggregated.push(first);
      continue;
    }

    const values = group.map((l) => l.value);
    aggregated.push({
      ...first,
      value: aggregateNumbers(values, method),
      metadata: {
        ...first.metadata,
        aggregatedFrom: group.length,
        originalValues: values,
      },
    });
  }

  return aggregated;
}

/**
 * Apply Power BI highlight values (post-filter values) to links.
 */
export function applyHighlights(
  data: PowerBISankeyData,
  highlights: Map<string, number>
): PowerBISankeyData {
  return {
    ...data,
    links: data.links.map((link) => {
      const key = `${link.source}\0${link.target}`;
      const highlightValue = highlights.get(key);
      if (highlightValue === undefined) return link;
      return { ...link, highlightValue };
    }),
  };
}


/**
 * Assign colors based on category.
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
 * Assign colors based on layer role (source vs target).
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

/**
 * Find a link by its Power BI SelectionId.
 */
export function findLinkBySelectionId(
  links: PowerBISankeyLink[],
  selectionId: PowerBISelectionId
): PowerBISankeyLink | undefined {
  return links.find((link) => link.selectionId?.equals(selectionId));
}

/**
 * Find a node by its Power BI SelectionId.
 */
export function findNodeBySelectionId(
  nodes: PowerBISankeyNode[],
  selectionId: PowerBISelectionId
): PowerBISankeyNode | undefined {
  return nodes.find((node) => node.selectionId?.equals(selectionId));
}

/**
 * Get all links connected to a given node.
 */
export function getConnectedLinks(
  nodeId: string,
  links: PowerBISankeyLink[]
): PowerBISankeyLink[] {
  return links.filter((link) => link.source === nodeId || link.target === nodeId);
}

/**
 * Collect SelectionIds for all links connected to a given node.
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
