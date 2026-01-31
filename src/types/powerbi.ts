/**
 * Power BI specific types for Sankey Chart
 */

import type { SankeyNodeDatum, SankeyLinkDatum, SankeyData } from './internal.js';
import type { NodeAlignment } from './config.js';

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
