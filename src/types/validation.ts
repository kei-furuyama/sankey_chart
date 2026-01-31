/**
 * Validation types for Sankey Chart
 */

// ============================================================
// データ検証
// ============================================================

/** 検証の重大度 */
export type ValidationSeverity = 'error' | 'warning' | 'info';

/** 検証エラーコード */
export type ValidationErrorCode =
  // 構造エラー
  | 'EMPTY_DATA'
  | 'NO_LINKS'
  | 'INVALID_STRUCTURE'
  // ノードエラー
  | 'DUPLICATE_NODE_ID'
  | 'ORPHAN_NODE'
  | 'UNKNOWN_NODE_REFERENCE'
  // リンクエラー
  | 'SELF_LOOP'
  | 'CIRCULAR_REFERENCE'
  | 'DUPLICATE_LINK'
  // 値エラー
  | 'NEGATIVE_VALUE'
  | 'ZERO_VALUE'
  | 'NON_NUMERIC_VALUE'
  | 'MISSING_VALUE'
  | 'INFINITE_VALUE'
  // データ品質警告
  | 'MISSING_NODE_NAME'
  | 'IMPLICIT_NODE';

/** 検証問題 */
export interface ValidationIssue {
  /** 重大度 */
  severity: ValidationSeverity;
  /** エラーコード */
  code: ValidationErrorCode;
  /** 人間が読めるメッセージ */
  message: string;
  /** 問題のあるデータへのパス（例: "links[2].value"） */
  path?: string;
  /** 問題の値 */
  value?: unknown;
  /** 修正の提案 */
  suggestion?: string;
}

/** 検証結果 */
export interface ValidationResult {
  /** データが有効かどうか */
  isValid: boolean;
  /** 発見された全問題 */
  issues: ValidationIssue[];
  /** エラーのみ */
  errors: ValidationIssue[];
  /** 警告のみ */
  warnings: ValidationIssue[];
  /** 統計情報 */
  stats: {
    nodeCount: number;
    linkCount: number;
    totalValue: number;
    layerCount?: number;
  };
}
