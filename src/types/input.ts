/**
 * Input data types for Sankey Chart
 */

export interface SankeyInputData {
  metadata?: DatasetMetadata;
  nodes?: InputNode[];
  links: InputLink[];
}

export interface DatasetMetadata {
  name?: string;
  description?: string;
  unit?: string;
  source?: string;
  timestamp?: string;
}

export interface InputNode {
  id: string;
  name?: string;
  category?: string;
  color?: string;
  layer?: number;
  [key: string]: unknown;
}

export interface InputLink {
  source: string;
  target: string;
  value: number;
  category?: string;
  color?: string;
  [key: string]: unknown;
}

export interface TableRow {
  source: string;
  target: string;
  value: number | string;
  [key: string]: string | number | boolean | null | undefined;
}

export interface HierarchicalNode {
  id: string;
  name?: string;
  value?: number;
  children?: HierarchicalNode[];
  [key: string]: unknown;
}

export interface TransformOptions {
  missingValueStrategy: 'error' | 'skip' | 'zero' | 'default';
  defaultValue?: number;
  minValue?: number;
  aggregateDuplicates: boolean;
  aggregationMethod: 'sum' | 'average' | 'max' | 'min' | 'first' | 'last';
  inferNodes: boolean;
  removeOrphanNodes: boolean;
  normalizeValues: boolean;
  nodeNameResolver?: (id: string) => string;
}

export const DEFAULT_TRANSFORM_OPTIONS: TransformOptions = {
  missingValueStrategy: 'error',
  aggregateDuplicates: true,
  aggregationMethod: 'sum',
  inferNodes: true,
  removeOrphanNodes: false,
  normalizeValues: false,
};
