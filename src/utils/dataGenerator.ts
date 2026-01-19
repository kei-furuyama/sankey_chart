/**
 * Test Data Generator
 * ベンチマーク用のテストデータ生成ユーティリティ
 */

import type { SankeyData, SankeyNodeDatum, SankeyLinkDatum } from '../types';

// ============================================================
// Types
// ============================================================

export interface DataGeneratorOptions {
  /** ノード数 */
  nodeCount: number;
  /** レイヤー数（深さ） */
  layers?: number;
  /** 各レイヤーのノード数の変動係数 */
  layerVariance?: number;
  /** リンク密度 (0-1) */
  linkDensity?: number;
  /** 最大フロー値 */
  maxFlowValue?: number;
  /** ランダムシード（再現性用） */
  seed?: number;
}

// ============================================================
// Seeded Random
// ============================================================

class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    // Linear Congruential Generator
    this.seed = (this.seed * 1664525 + 1013904223) % 4294967296;
    return this.seed / 4294967296;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}

// ============================================================
// Color Palette
// ============================================================

const COLORS = [
  '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
  '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf',
  '#aec7e8', '#ffbb78', '#98df8a', '#ff9896', '#c5b0d5',
];

// ============================================================
// Data Generator
// ============================================================

/**
 * レイヤーベースのSankeyデータ生成
 */
export function generateLayeredSankeyData(options: DataGeneratorOptions): SankeyData {
  const {
    nodeCount,
    layers = 4,
    layerVariance = 0.3,
    linkDensity = 0.5,
    maxFlowValue = 100,
    seed = Date.now(),
  } = options;

  const random = new SeededRandom(seed);
  const nodes: SankeyNodeDatum[] = [];
  const links: SankeyLinkDatum[] = [];

  // 各レイヤーのノード数を決定
  const baseNodesPerLayer = Math.floor(nodeCount / layers);
  const layerSizes: number[] = [];
  let totalNodes = 0;

  for (let i = 0; i < layers; i++) {
    const variance = 1 + (random.next() - 0.5) * 2 * layerVariance;
    let size = Math.max(1, Math.floor(baseNodesPerLayer * variance));

    // 最後のレイヤーで調整
    if (i === layers - 1) {
      size = nodeCount - totalNodes;
    }

    layerSizes.push(size);
    totalNodes += size;
  }

  // ノード生成
  let nodeIndex = 0;
  const layerNodes: string[][] = [];

  for (let layer = 0; layer < layers; layer++) {
    const layerNodeIds: string[] = [];

    for (let i = 0; i < layerSizes[layer]; i++) {
      const id = `node-${nodeIndex}`;
      nodes.push({
        id,
        name: `Node ${nodeIndex}`,
        category: `Layer ${layer}`,
        color: COLORS[layer % COLORS.length],
      });
      layerNodeIds.push(id);
      nodeIndex++;
    }

    layerNodes.push(layerNodeIds);
  }

  // リンク生成
  for (let layer = 0; layer < layers - 1; layer++) {
    const sourceNodes = layerNodes[layer];
    const targetNodes = layerNodes[layer + 1];

    // 各ソースノードから少なくとも1つのリンク
    for (const source of sourceNodes) {
      const numLinks = Math.max(
        1,
        Math.floor(targetNodes.length * linkDensity * random.next() * 2)
      );

      const targets = random.shuffle(targetNodes).slice(0, numLinks);

      for (const target of targets) {
        links.push({
          source,
          target,
          value: random.nextInt(1, maxFlowValue),
        });
      }
    }

    // 孤立ターゲットノードの解消
    for (const target of targetNodes) {
      const hasIncoming = links.some(l => l.target === target);
      if (!hasIncoming) {
        const source = sourceNodes[random.nextInt(0, sourceNodes.length - 1)];
        links.push({
          source,
          target,
          value: random.nextInt(1, maxFlowValue),
        });
      }
    }
  }

  return { nodes, links };
}

/**
 * ランダムSankeyデータ生成（レイヤー制約なし）
 */
export function generateRandomSankeyData(
  nodeCount: number,
  linkCount: number,
  seed = Date.now()
): SankeyData {
  const random = new SeededRandom(seed);
  const nodes: SankeyNodeDatum[] = [];
  const links: SankeyLinkDatum[] = [];

  // ノード生成
  for (let i = 0; i < nodeCount; i++) {
    nodes.push({
      id: `node-${i}`,
      name: `Node ${i}`,
      color: COLORS[i % COLORS.length],
    });
  }

  // リンク生成（循環を避けるため source < target）
  const possibleLinks: Array<[number, number]> = [];
  for (let i = 0; i < nodeCount; i++) {
    for (let j = i + 1; j < nodeCount; j++) {
      possibleLinks.push([i, j]);
    }
  }

  const selectedLinks = random.shuffle(possibleLinks).slice(0, linkCount);

  for (const [sourceIdx, targetIdx] of selectedLinks) {
    links.push({
      source: `node-${sourceIdx}`,
      target: `node-${targetIdx}`,
      value: random.nextInt(1, 100),
    });
  }

  return { nodes, links };
}

/**
 * 現実的なビジネスデータ風のSankeyデータ生成
 */
export function generateBusinessFlowData(scale = 1): SankeyData {
  const stages = [
    { prefix: 'Source', count: Math.ceil(5 * scale), color: '#1f77b4' },
    { prefix: 'Process', count: Math.ceil(8 * scale), color: '#ff7f0e' },
    { prefix: 'Category', count: Math.ceil(6 * scale), color: '#2ca02c' },
    { prefix: 'Output', count: Math.ceil(4 * scale), color: '#d62728' },
  ];

  const nodes: SankeyNodeDatum[] = [];
  const links: SankeyLinkDatum[] = [];
  const layerNodes: string[][] = [];

  let nodeIndex = 0;

  // ノード生成
  for (const stage of stages) {
    const layerNodeIds: string[] = [];
    for (let i = 0; i < stage.count; i++) {
      const id = `${stage.prefix.toLowerCase()}-${i}`;
      nodes.push({
        id,
        name: `${stage.prefix} ${i + 1}`,
        category: stage.prefix,
        color: stage.color,
      });
      layerNodeIds.push(id);
      nodeIndex++;
    }
    layerNodes.push(layerNodeIds);
  }

  // リンク生成（典型的なビジネスフロー）
  const random = new SeededRandom(42);

  for (let layer = 0; layer < layerNodes.length - 1; layer++) {
    const sources = layerNodes[layer];
    const targets = layerNodes[layer + 1];

    for (const source of sources) {
      // 各ソースから1-3のターゲットへ
      const numTargets = random.nextInt(1, Math.min(3, targets.length));
      const selectedTargets = random.shuffle([...targets]).slice(0, numTargets);

      for (const target of selectedTargets) {
        links.push({
          source,
          target,
          value: random.nextInt(10, 500),
        });
      }
    }
  }

  return { nodes, links };
}

// ============================================================
// Benchmark Data Sets
// ============================================================

/**
 * ベンチマーク用のプリセットデータセット
 */
export const BENCHMARK_DATASETS = {
  /** 小規模: 50ノード */
  small: () => generateLayeredSankeyData({ nodeCount: 50, layers: 4, seed: 1 }),

  /** 中規模: 200ノード */
  medium: () => generateLayeredSankeyData({ nodeCount: 200, layers: 5, seed: 2 }),

  /** 大規模: 500ノード */
  large: () => generateLayeredSankeyData({ nodeCount: 500, layers: 6, seed: 3 }),

  /** 超大規模: 1000ノード */
  xlarge: () => generateLayeredSankeyData({ nodeCount: 1000, layers: 7, seed: 4 }),

  /** 極大規模: 2000ノード */
  xxlarge: () => generateLayeredSankeyData({ nodeCount: 2000, layers: 8, seed: 5 }),

  /** ストレステスト: 5000ノード */
  stress: () => generateLayeredSankeyData({ nodeCount: 5000, layers: 10, seed: 6 }),
};

/**
 * サイズ別データセット生成
 */
export function generateBenchmarkDataset(nodeCount: number): SankeyData {
  const layers = Math.max(3, Math.min(10, Math.ceil(Math.log2(nodeCount))));
  return generateLayeredSankeyData({
    nodeCount,
    layers,
    seed: nodeCount,
  });
}
