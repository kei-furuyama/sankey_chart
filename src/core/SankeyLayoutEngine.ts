/**
 * Sankey Layout Engine
 * パフォーマンス最適化されたレイアウト計算エンジン
 *
 * 最適化ポイント:
 * - LRUキャッシュによるレイアウト結果の再利用
 * - データハッシュによる変更検出
 * - 段階的な計算（iteration数の動的調整）
 */

import {
  sankey,
  sankeyLeft,
  sankeyRight,
  sankeyCenter,
  sankeyJustify,
  sankeyLinkHorizontal,
} from 'd3-sankey';
import type { SankeyLayout } from 'd3-sankey';
import type {
  SankeyData,
  SankeyNodeDatum,
  SankeyLinkDatum,
  ComputedGraph,
  ComputedNode,
  ComputedLink,
  SankeyLayoutConfig,
  NodeAlignment,
  LayoutCacheKey,
  LayoutCacheEntry,
} from '../types';

// ============================================================
// LRU Cache 実装
// ============================================================

class LRUCache<K extends string, V> {
  private cache = new Map<K, { value: V; timestamp: number; accessCount: number }>();
  private maxSize: number;
  private maxAge: number;

  constructor(maxSize = 50, maxAge = 5 * 60 * 1000) { // 5分
    this.maxSize = maxSize;
    this.maxAge = maxAge;
  }

  get(key: K): V | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    // 期限切れチェック
    if (Date.now() - entry.timestamp > this.maxAge) {
      this.cache.delete(key);
      return undefined;
    }

    // アクセス記録を更新（LRU）
    entry.accessCount++;
    entry.timestamp = Date.now();
    return entry.value;
  }

  set(key: K, value: V): void {
    // サイズ制限を超える場合、最も古いエントリを削除
    if (this.cache.size >= this.maxSize) {
      let oldestKey: K | undefined;
      let oldestTime = Infinity;

      for (const [k, v] of this.cache) {
        if (v.timestamp < oldestTime) {
          oldestTime = v.timestamp;
          oldestKey = k;
        }
      }

      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      accessCount: 1,
    });
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }

  getStats(): { size: number; oldestAge: number } {
    let oldestTime = Date.now();
    for (const entry of this.cache.values()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
      }
    }
    return {
      size: this.cache.size,
      oldestAge: Date.now() - oldestTime,
    };
  }
}

// ============================================================
// ハッシュ関数
// ============================================================

/**
 * 高速なデータハッシュ生成
 * FNV-1a アルゴリズムベース
 */
function hashData(data: SankeyData): string {
  const str = JSON.stringify({
    nodes: data.nodes.map(n => ({ id: n.id, name: n.name })),
    links: data.links.map(l => ({ s: l.source, t: l.target, v: l.value })),
  });

  let hash = 2166136261; // FNV offset basis
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619); // FNV prime
  }

  return (hash >>> 0).toString(36);
}

function createCacheKey(
  dataHash: string,
  width: number,
  height: number,
  config: SankeyLayoutConfig
): string {
  return `${dataHash}_${width}_${height}_${config.nodeWidth}_${config.nodePadding}_${config.nodeAlignment}`;
}

// ============================================================
// Alignment マッピング
// ============================================================

const alignmentMap = {
  left: sankeyLeft,
  right: sankeyRight,
  center: sankeyCenter,
  justify: sankeyJustify,
};

// ============================================================
// メインクラス
// ============================================================

export interface LayoutEngineOptions {
  enableCache?: boolean;
  cacheMaxSize?: number;
  cacheMaxAge?: number;
}

export interface LayoutResult {
  graph: ComputedGraph;
  fromCache: boolean;
  computeTime: number;
}

export class SankeyLayoutEngine {
  private cache: LRUCache<string, ComputedGraph>;
  private enableCache: boolean;
  private sankeyGenerator: SankeyLayout<SankeyNodeDatum, SankeyLinkDatum>;

  // パフォーマンス計測用
  private cacheHits = 0;
  private cacheMisses = 0;

  constructor(options: LayoutEngineOptions = {}) {
    this.enableCache = options.enableCache ?? true;
    this.cache = new LRUCache(
      options.cacheMaxSize ?? 50,
      options.cacheMaxAge ?? 5 * 60 * 1000
    );

    // デフォルトジェネレーター
    this.sankeyGenerator = sankey<SankeyNodeDatum, SankeyLinkDatum>();
  }

  /**
   * レイアウト計算
   * キャッシュがあればそれを使用、なければ計算
   */
  compute(
    data: SankeyData,
    width: number,
    height: number,
    config: SankeyLayoutConfig
  ): LayoutResult {
    const startTime = performance.now();

    // データハッシュ生成
    const dataHash = hashData(data);
    const cacheKey = createCacheKey(dataHash, width, height, config);

    // キャッシュチェック
    if (this.enableCache) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        this.cacheHits++;
        return {
          graph: cached,
          fromCache: true,
          computeTime: performance.now() - startTime,
        };
      }
    }

    this.cacheMisses++;

    // レイアウト計算
    const graph = this.computeLayout(data, width, height, config);

    // キャッシュに保存
    if (this.enableCache) {
      this.cache.set(cacheKey, graph);
    }

    return {
      graph,
      fromCache: false,
      computeTime: performance.now() - startTime,
    };
  }

  /**
   * 実際のレイアウト計算
   */
  private computeLayout(
    data: SankeyData,
    width: number,
    height: number,
    config: SankeyLayoutConfig
  ): ComputedGraph {
    // ノードをIDでマッピング
    const nodeMap = new Map(data.nodes.map((n, i) => [n.id, i]));

    // リンクのsource/targetをインデックスに変換
    const links = data.links.map(link => ({
      ...link,
      source: nodeMap.get(link.source) ?? 0,
      target: nodeMap.get(link.target) ?? 0,
    }));

    // ジェネレーター設定
    const generator = sankey<SankeyNodeDatum, SankeyLinkDatum>()
      .nodeId((d: SankeyNodeDatum) => d.id)
      .nodeWidth(config.nodeWidth)
      .nodePadding(config.nodePadding)
      .nodeAlign(alignmentMap[config.nodeAlignment])
      .extent([[0, 0], [width, height]])
      .iterations(config.iterations);

    // 計算実行
    const graph = generator({
      nodes: data.nodes.map(n => ({ ...n })),
      links: links,
    });

    return graph;
  }

  /**
   * 増分更新（ノード位置のみ変更された場合用）
   * フルレイアウト再計算より高速
   */
  updateNodePositions(
    graph: ComputedGraph,
    updates: Map<string, { x?: number; y?: number }>
  ): ComputedGraph {
    const updatedNodes = graph.nodes.map(node => {
      const update = updates.get(node.id);
      if (update) {
        const newNode = { ...node };
        if (update.x !== undefined) {
          const width = (node.x1 ?? 0) - (node.x0 ?? 0);
          newNode.x0 = update.x;
          newNode.x1 = update.x + width;
        }
        if (update.y !== undefined) {
          const height = (node.y1 ?? 0) - (node.y0 ?? 0);
          newNode.y0 = update.y;
          newNode.y1 = update.y + height;
        }
        return newNode;
      }
      return node;
    });

    return {
      nodes: updatedNodes,
      links: graph.links,
    };
  }

  /**
   * リンクパス生成
   * パフォーマンス: d3-sankey の linkHorizontal を直接使用
   */
  generateLinkPath(link: ComputedLink): string {
    const pathGenerator = sankeyLinkHorizontal();
    return pathGenerator(link) ?? '';
  }

  /**
   * 全リンクのパスを一括生成
   */
  generateAllLinkPaths(links: ComputedLink[]): Map<number, string> {
    const paths = new Map<number, string>();
    const pathGenerator = sankeyLinkHorizontal();

    for (let i = 0; i < links.length; i++) {
      paths.set(i, pathGenerator(links[i]) ?? '');
    }

    return paths;
  }

  /**
   * キャッシュをクリア
   */
  clearCache(): void {
    this.cache.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }

  /**
   * パフォーマンス統計を取得
   */
  getStats(): {
    cacheHits: number;
    cacheMisses: number;
    hitRate: number;
    cacheSize: number;
  } {
    const total = this.cacheHits + this.cacheMisses;
    return {
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      hitRate: total > 0 ? this.cacheHits / total : 0,
      cacheSize: this.cache.size,
    };
  }
}

// ============================================================
// シングルトンインスタンス（オプション）
// ============================================================

let defaultEngine: SankeyLayoutEngine | null = null;

export function getDefaultLayoutEngine(): SankeyLayoutEngine {
  if (!defaultEngine) {
    defaultEngine = new SankeyLayoutEngine();
  }
  return defaultEngine;
}

export function resetDefaultLayoutEngine(): void {
  if (defaultEngine) {
    defaultEngine.clearCache();
    defaultEngine = null;
  }
}
