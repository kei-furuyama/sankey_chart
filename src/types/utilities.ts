/**
 * Utility types and type guards for Sankey Chart
 */

import type { InputLink, SankeyInputData } from './input.js';
import type { ComputedNode } from './internal.js';
import type {
  SankeyChartConfig,
  SankeyLayoutConfig,
  SankeyInteractionConfig,
  SankeyAnimationConfig,
  SankeyStyleConfig,
  SankeyPerformanceConfig,
} from './config.js';
import type { PowerBIConfig } from './config.js';
import type {
  SankeyElementEvent,
  SankeyNodeEvent,
  SankeyLinkEvent,
  SankeyBackgroundEvent,
  SankeyDragEvent,
} from './events.js';

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
