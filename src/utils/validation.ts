/**
 * Sankey Chart データ検証ユーティリティ
 *
 * 機能:
 * - 循環参照チェック
 * - 値の検証（負の値、ゼロ、非数値）
 * - 欠損データの処理
 * - 構造の整合性チェック
 */

import type {
  SankeyInputData,
  InputLink,
  InputNode,
  SankeyData,
  SankeyNodeDatum,
  SankeyLinkDatum,
  ValidationResult,
  ValidationIssue,
  ValidationSeverity,
  ValidationErrorCode,
} from '../types';

// ============================================================
// 検証結果ビルダー
// ============================================================

class ValidationResultBuilder {
  private issues: ValidationIssue[] = [];
  private nodeCount = 0;
  private linkCount = 0;
  private totalValue = 0;

  addIssue(
    severity: ValidationSeverity,
    code: ValidationErrorCode,
    message: string,
    options?: {
      path?: string;
      value?: unknown;
      suggestion?: string;
    }
  ): void {
    this.issues.push({
      severity,
      code,
      message,
      ...options,
    });
  }

  error(
    code: ValidationErrorCode,
    message: string,
    options?: { path?: string; value?: unknown; suggestion?: string }
  ): void {
    this.addIssue('error', code, message, options);
  }

  warning(
    code: ValidationErrorCode,
    message: string,
    options?: { path?: string; value?: unknown; suggestion?: string }
  ): void {
    this.addIssue('warning', code, message, options);
  }

  info(
    code: ValidationErrorCode,
    message: string,
    options?: { path?: string; value?: unknown; suggestion?: string }
  ): void {
    this.addIssue('info', code, message, options);
  }

  setStats(nodeCount: number, linkCount: number, totalValue: number): void {
    this.nodeCount = nodeCount;
    this.linkCount = linkCount;
    this.totalValue = totalValue;
  }

  build(): ValidationResult {
    const errors = this.issues.filter((i) => i.severity === 'error');
    const warnings = this.issues.filter((i) => i.severity === 'warning');

    return {
      isValid: errors.length === 0,
      issues: this.issues,
      errors,
      warnings,
      stats: {
        nodeCount: this.nodeCount,
        linkCount: this.linkCount,
        totalValue: this.totalValue,
      },
    };
  }
}

// ============================================================
// メイン検証関数
// ============================================================

/**
 * 入力データを検証する
 *
 * @param data - 検証する入力データ
 * @returns 検証結果
 *
 * @example
 * ```ts
 * const result = validateSankeyData({
 *   links: [
 *     { source: 'A', target: 'B', value: 100 },
 *     { source: 'B', target: 'C', value: 50 },
 *   ]
 * });
 *
 * if (!result.isValid) {
 *   console.error('Validation errors:', result.errors);
 * }
 * ```
 */
export function validateSankeyData(data: SankeyInputData): ValidationResult {
  const builder = new ValidationResultBuilder();

  // 1. 基本構造チェック
  if (!data) {
    builder.error('EMPTY_DATA', 'データがnullまたはundefinedです');
    return builder.build();
  }

  if (!data.links || !Array.isArray(data.links)) {
    builder.error('INVALID_STRUCTURE', 'linksプロパティが必要です');
    return builder.build();
  }

  if (data.links.length === 0) {
    builder.error('NO_LINKS', 'リンクが1つも定義されていません', {
      suggestion: 'links配列に少なくとも1つのリンクを追加してください',
    });
    return builder.build();
  }

  // 2. ノードの収集と検証
  const nodeMap = new Map<string, InputNode>();
  const implicitNodes = new Set<string>();

  // 明示的なノードを収集
  if (data.nodes && Array.isArray(data.nodes)) {
    const seenIds = new Set<string>();

    data.nodes.forEach((node, index) => {
      if (!node.id) {
        builder.error('INVALID_STRUCTURE', `ノード[${index}]にidがありません`, {
          path: `nodes[${index}]`,
          value: node,
        });
        return;
      }

      if (seenIds.has(node.id)) {
        builder.error('DUPLICATE_NODE_ID', `ノードID "${node.id}" が重複しています`, {
          path: `nodes[${index}].id`,
          value: node.id,
          suggestion: '各ノードには一意のIDを設定してください',
        });
      } else {
        seenIds.add(node.id);
        nodeMap.set(node.id, node);
      }

      // 名前の欠落を警告
      if (!node.name) {
        builder.warning('MISSING_NODE_NAME', `ノード "${node.id}" に名前がありません`, {
          path: `nodes[${index}].name`,
          suggestion: 'nameプロパティを設定するか、idが表示名として使用されます',
        });
      }
    });
  }

  // 3. リンクの検証
  let totalValue = 0;
  const linkKeys = new Set<string>();

  data.links.forEach((link, index) => {
    const path = `links[${index}]`;

    // source/target の存在チェック
    if (!link.source) {
      builder.error('INVALID_STRUCTURE', `リンク[${index}]にsourceがありません`, {
        path: `${path}.source`,
        value: link,
      });
      return;
    }

    if (!link.target) {
      builder.error('INVALID_STRUCTURE', `リンク[${index}]にtargetがありません`, {
        path: `${path}.target`,
        value: link,
      });
      return;
    }

    // 自己ループチェック
    if (link.source === link.target) {
      builder.error('SELF_LOOP', `リンク[${index}]が自己ループです: "${link.source}" -> "${link.target}"`, {
        path,
        value: link,
        suggestion: 'sourceとtargetは異なるノードを指定してください',
      });
    }

    // 重複リンクチェック
    const linkKey = `${link.source}->${link.target}`;
    if (linkKeys.has(linkKey)) {
      builder.warning('DUPLICATE_LINK', `重複リンク: "${link.source}" -> "${link.target}"`, {
        path,
        suggestion: '重複リンクは集計オプションで合算されます',
      });
    } else {
      linkKeys.add(linkKey);
    }

    // 暗黙的ノードの収集
    if (!nodeMap.has(link.source)) {
      implicitNodes.add(link.source);
    }
    if (!nodeMap.has(link.target)) {
      implicitNodes.add(link.target);
    }

    // 値の検証
    validateLinkValue(link.value, index, builder);

    if (typeof link.value === 'number' && isFinite(link.value) && link.value > 0) {
      totalValue += link.value;
    }
  });

  // 4. 暗黙的ノードの情報
  implicitNodes.forEach((nodeId) => {
    builder.info('IMPLICIT_NODE', `ノード "${nodeId}" はリンクから自動生成されます`, {
      value: nodeId,
    });
  });

  // 5. 孤立ノードチェック（明示的ノードがリンクで参照されていない場合）
  if (data.nodes) {
    const referencedNodes = new Set<string>();
    data.links.forEach((link) => {
      referencedNodes.add(link.source);
      referencedNodes.add(link.target);
    });

    data.nodes.forEach((node) => {
      if (!referencedNodes.has(node.id)) {
        builder.warning('ORPHAN_NODE', `ノード "${node.id}" はどのリンクからも参照されていません`, {
          value: node.id,
          suggestion: 'このノードは表示されない可能性があります',
        });
      }
    });
  }

  // 6. 循環参照チェック
  const allNodeIds = new Set([...nodeMap.keys(), ...implicitNodes]);
  const cycles = detectCycles(data.links, allNodeIds);

  cycles.forEach((cycle) => {
    builder.error('CIRCULAR_REFERENCE', `循環参照が検出されました: ${cycle.join(' -> ')}`, {
      value: cycle,
      suggestion: 'Sankeyチャートは有向非循環グラフ(DAG)である必要があります',
    });
  });

  // 統計情報を設定
  builder.setStats(nodeMap.size + implicitNodes.size, data.links.length, totalValue);

  return builder.build();
}

// ============================================================
// 値の検証
// ============================================================

function validateLinkValue(value: unknown, index: number, builder: ValidationResultBuilder): void {
  const path = `links[${index}].value`;

  // 値が存在しない
  if (value === undefined || value === null) {
    builder.error('MISSING_VALUE', `リンク[${index}]のvalueが未定義です`, {
      path,
      suggestion: 'valueに正の数値を設定してください',
    });
    return;
  }

  // 数値でない
  if (typeof value !== 'number') {
    builder.error('NON_NUMERIC_VALUE', `リンク[${index}]のvalueが数値ではありません`, {
      path,
      value,
      suggestion: `現在の値: ${typeof value} = ${JSON.stringify(value)}`,
    });
    return;
  }

  // 無限大
  if (!isFinite(value)) {
    builder.error('INFINITE_VALUE', `リンク[${index}]のvalueが無限大またはNaNです`, {
      path,
      value,
      suggestion: '有限の数値を設定してください',
    });
    return;
  }

  // 負の値
  if (value < 0) {
    builder.error('NEGATIVE_VALUE', `リンク[${index}]のvalueが負の値です: ${value}`, {
      path,
      value,
      suggestion: 'Sankeyチャートの値は正の数である必要があります',
    });
    return;
  }

  // ゼロ
  if (value === 0) {
    builder.warning('ZERO_VALUE', `リンク[${index}]のvalueが0です`, {
      path,
      value,
      suggestion: 'ゼロ値のリンクは表示されない可能性があります',
    });
  }
}

// ============================================================
// 循環参照検出（Tarjanのアルゴリズム）
// ============================================================

function detectCycles(links: InputLink[], nodeIds: Set<string>): string[][] {
  // 隣接リストを構築
  const adjacency = new Map<string, string[]>();

  nodeIds.forEach((id) => {
    adjacency.set(id, []);
  });

  links.forEach((link) => {
    const targets = adjacency.get(link.source);
    if (targets && !targets.includes(link.target)) {
      targets.push(link.target);
    }
  });

  const cycles: string[][] = [];
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const path: string[] = [];

  function dfs(node: string): void {
    visited.add(node);
    recursionStack.add(node);
    path.push(node);

    const neighbors = adjacency.get(node) || [];

    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        dfs(neighbor);
      } else if (recursionStack.has(neighbor)) {
        // 循環を検出
        const cycleStart = path.indexOf(neighbor);
        const cycle = [...path.slice(cycleStart), neighbor];
        cycles.push(cycle);
      }
    }

    path.pop();
    recursionStack.delete(node);
  }

  nodeIds.forEach((nodeId) => {
    if (!visited.has(nodeId)) {
      dfs(nodeId);
    }
  });

  return cycles;
}

// ============================================================
// 処理済みデータの検証
// ============================================================

/**
 * 処理済みSankeyDataを検証する
 */
export function validateProcessedData(data: SankeyData): ValidationResult {
  const builder = new ValidationResultBuilder();

  if (!data || !data.nodes || !data.links) {
    builder.error('INVALID_STRUCTURE', '処理済みデータの構造が不正です');
    return builder.build();
  }

  // ノードIDのマップを作成
  const nodeIds = new Set(data.nodes.map((n) => n.id));

  // 各リンクが有効なノードを参照しているか確認
  data.links.forEach((link, index) => {
    if (!nodeIds.has(link.source)) {
      builder.error('UNKNOWN_NODE_REFERENCE', `リンク[${index}]のsource "${link.source}" が存在しません`, {
        path: `links[${index}].source`,
        value: link.source,
      });
    }

    if (!nodeIds.has(link.target)) {
      builder.error('UNKNOWN_NODE_REFERENCE', `リンク[${index}]のtarget "${link.target}" が存在しません`, {
        path: `links[${index}].target`,
        value: link.target,
      });
    }
  });

  const totalValue = data.links.reduce((sum, link) => sum + link.value, 0);
  builder.setStats(data.nodes.length, data.links.length, totalValue);

  return builder.build();
}

// ============================================================
// クイック検証（高速、エラーのみ）
// ============================================================

/**
 * データの基本的な有効性を高速にチェック
 * 詳細な検証が不要な場合に使用
 */
export function quickValidate(data: SankeyInputData): boolean {
  if (!data?.links?.length) return false;

  const nodeIds = new Set<string>();

  for (const link of data.links) {
    if (!link.source || !link.target) return false;
    if (link.source === link.target) return false;
    if (typeof link.value !== 'number' || !isFinite(link.value) || link.value < 0) {
      return false;
    }
    nodeIds.add(link.source);
    nodeIds.add(link.target);
  }

  // 簡易循環チェック（完全ではない）
  const hasSimpleCycle = data.links.some((link) =>
    data.links.some((other) => other.source === link.target && other.target === link.source)
  );

  return !hasSimpleCycle;
}

// ============================================================
// エクスポート
// ============================================================

export { ValidationResultBuilder };
