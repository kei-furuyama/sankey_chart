/**
 * Sankey Chart Design Tokens
 *
 * デザインシステムの基盤となるトークン定義
 * CSS Custom Properties としてエクスポート可能
 */

// =============================================================================
// 1. カラースキーム
// =============================================================================

/**
 * プライマリカラーパレット
 * - 視認性と美しさのバランスを重視
 * - WCAG 2.1 AA基準準拠
 */
export const colorPalette = {
  // デフォルトパレット（12色）- データ可視化に最適化
  default: [
    '#4E79A7', // ブルー（信頼性）
    '#F28E2B', // オレンジ（エネルギー）
    '#E15759', // レッド（注目）
    '#76B7B2', // ティール（落ち着き）
    '#59A14F', // グリーン（成長）
    '#EDC948', // イエロー（楽観）
    '#B07AA1', // パープル（創造性）
    '#FF9DA7', // ピンク（温かさ）
    '#9C755F', // ブラウン（安定）
    '#BAB0AC', // グレー（中立）
    '#6B9AC4', // ライトブルー
    '#D4A6C8', // ライトパープル
  ],

  // カテゴリ別カラースキーム
  categorical: {
    // 財務データ向け
    financial: [
      '#2E7D32', // 収入（グリーン）
      '#C62828', // 支出（レッド）
      '#1565C0', // 投資（ブルー）
      '#F57C00', // 運営（オレンジ）
      '#7B1FA2', // その他（パープル）
    ],
    // エネルギーフロー向け
    energy: [
      '#FFC107', // 太陽光（イエロー）
      '#4CAF50', // 再生可能（グリーン）
      '#795548', // 化石燃料（ブラウン）
      '#2196F3', // 水力（ブルー）
      '#9E9E9E', // 損失（グレー）
    ],
    // プロセスフロー向け
    process: [
      '#3F51B5', // 入力（インディゴ）
      '#009688', // 処理（ティール）
      '#FF5722', // 変換（ディープオレンジ）
      '#8BC34A', // 出力（ライトグリーン）
      '#607D8B', // 廃棄（ブルーグレー）
    ],
    // 顧客ジャーニー向け
    journey: [
      '#673AB7', // 認知（ディープパープル）
      '#03A9F4', // 興味（ライトブルー）
      '#4CAF50', // 検討（グリーン）
      '#FF9800', // 購入（オレンジ）
      '#E91E63', // 継続（ピンク）
    ],
  },

  // 色覚多様性対応パレット（CVD-Safe）
  colorBlindSafe: [
    '#000000', // ブラック
    '#E69F00', // オレンジ
    '#56B4E9', // スカイブルー
    '#009E73', // ブルーイッシュグリーン
    '#F0E442', // イエロー
    '#0072B2', // ブルー
    '#D55E00', // バーミリオン
    '#CC79A7', // レディッシュパープル
  ],

  // 順序データ向けグラデーション
  sequential: {
    blue: ['#EFF3FF', '#BDD7E7', '#6BAED6', '#3182BD', '#08519C'],
    green: ['#EDF8E9', '#BAE4B3', '#74C476', '#31A354', '#006D2C'],
    orange: ['#FEEDDE', '#FDBE85', '#FD8D3C', '#E6550D', '#A63603'],
    purple: ['#F2F0F7', '#CBC9E2', '#9E9AC8', '#756BB1', '#54278F'],
  },

  // 発散データ向け
  diverging: {
    redBlue: ['#B2182B', '#EF8A62', '#FDDBC7', '#F7F7F7', '#D1E5F0', '#67A9CF', '#2166AC'],
    brownGreen: ['#8C510A', '#D8B365', '#F6E8C3', '#F5F5F5', '#C7EAE5', '#5AB4AC', '#01665E'],
  },
} as const;

/**
 * ライトテーマ
 */
export const lightTheme = {
  // 背景色
  background: {
    primary: '#FFFFFF',
    secondary: '#F8F9FA',
    tertiary: '#E9ECEF',
  },
  // テキスト色
  text: {
    primary: '#212529',
    secondary: '#6C757D',
    tertiary: '#ADB5BD',
    inverse: '#FFFFFF',
  },
  // ボーダー色
  border: {
    default: '#DEE2E6',
    subtle: '#E9ECEF',
    strong: '#ADB5BD',
  },
  // リンク色（フロー）
  link: {
    default: 'rgba(0, 0, 0, 0.15)',
    hover: 'rgba(0, 0, 0, 0.35)',
    selected: 'rgba(0, 0, 0, 0.5)',
  },
  // シャドウ
  shadow: {
    small: '0 1px 2px rgba(0, 0, 0, 0.05)',
    medium: '0 4px 6px rgba(0, 0, 0, 0.1)',
    large: '0 10px 15px rgba(0, 0, 0, 0.15)',
  },
  // フォーカス
  focus: {
    ring: '#4E79A7',
    ringOffset: '#FFFFFF',
  },
};

/**
 * ダークテーマ
 */
export const darkTheme = {
  // 背景色
  background: {
    primary: '#1A1A2E',
    secondary: '#16213E',
    tertiary: '#0F3460',
  },
  // テキスト色
  text: {
    primary: '#E8E8E8',
    secondary: '#B0B0B0',
    tertiary: '#707070',
    inverse: '#1A1A2E',
  },
  // ボーダー色
  border: {
    default: '#2D2D44',
    subtle: '#252538',
    strong: '#404060',
  },
  // リンク色（フロー）- ダークモード用に調整
  link: {
    default: 'rgba(255, 255, 255, 0.2)',
    hover: 'rgba(255, 255, 255, 0.4)',
    selected: 'rgba(255, 255, 255, 0.6)',
  },
  // シャドウ
  shadow: {
    small: '0 1px 2px rgba(0, 0, 0, 0.3)',
    medium: '0 4px 6px rgba(0, 0, 0, 0.4)',
    large: '0 10px 15px rgba(0, 0, 0, 0.5)',
  },
  // フォーカス
  focus: {
    ring: '#6B9AC4',
    ringOffset: '#1A1A2E',
  },
};

// =============================================================================
// 2. タイポグラフィ
// =============================================================================

export const typography = {
  // フォントファミリー
  fontFamily: {
    primary: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    mono: '"SF Mono", "Fira Code", "Fira Mono", "Roboto Mono", monospace',
  },
  // フォントサイズ
  fontSize: {
    xs: '10px',
    sm: '12px',
    md: '14px',
    lg: '16px',
    xl: '18px',
    '2xl': '24px',
  },
  // フォントウェイト
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  // 行の高さ
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
};

// =============================================================================
// 3. スペーシング & レイアウト
// =============================================================================

export const spacing = {
  // 基本スペーシング（4pxベース）
  0: '0',
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
};

export const layout = {
  // ノード設定
  node: {
    width: {
      small: 15,
      medium: 20,
      large: 30,
    },
    padding: {
      small: 8,
      medium: 12,
      large: 16,
    },
    minHeight: 5,
    borderRadius: 2,
  },
  // リンク設定
  link: {
    curvature: 0.5, // 0-1の範囲
    minWidth: 1,
  },
  // マージン
  margin: {
    top: 20,
    right: 120,
    bottom: 20,
    left: 120,
  },
  // ラベル設定
  label: {
    offset: 6,
    maxWidth: 100,
  },
};

// =============================================================================
// 4. アニメーション & トランジション
// =============================================================================

export const animation = {
  // 持続時間
  duration: {
    instant: '0ms',
    fast: '150ms',
    normal: '300ms',
    slow: '500ms',
  },
  // イージング
  easing: {
    linear: 'linear',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  },
};

// =============================================================================
// 5. インタラクション状態
// =============================================================================

export const interactionStates = {
  // ノードの状態
  node: {
    default: {
      opacity: 1,
      strokeWidth: 0,
    },
    hover: {
      opacity: 1,
      strokeWidth: 2,
      strokeColor: 'currentColor',
      cursor: 'pointer',
    },
    selected: {
      opacity: 1,
      strokeWidth: 3,
      strokeColor: '#4E79A7',
    },
    dimmed: {
      opacity: 0.3,
    },
    disabled: {
      opacity: 0.2,
      cursor: 'not-allowed',
    },
    focus: {
      outlineWidth: 2,
      outlineOffset: 2,
      outlineStyle: 'solid',
    },
  },
  // リンクの状態
  link: {
    default: {
      opacity: 0.5,
    },
    hover: {
      opacity: 0.8,
    },
    selected: {
      opacity: 1,
    },
    dimmed: {
      opacity: 0.1,
    },
    highlighted: {
      opacity: 0.9,
    },
  },
};

// =============================================================================
// 6. ツールチップスタイル
// =============================================================================

export const tooltip = {
  // サイズ
  maxWidth: 280,
  minWidth: 120,
  padding: {
    x: 12,
    y: 8,
  },
  // 外観
  borderRadius: 6,
  // タイポグラフィ
  title: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
  },
  body: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.normal,
  },
  // アニメーション
  animation: {
    duration: animation.duration.fast,
    delay: 200, // ホバー後の表示遅延（ms）
  },
  // 配置
  offset: 10,
  arrow: {
    size: 6,
  },
};

// =============================================================================
// 7. 凡例スタイル
// =============================================================================

export const legend = {
  // 配置オプション
  position: {
    top: 'top',
    bottom: 'bottom',
    left: 'left',
    right: 'right',
  } as const,
  // アイテム設定
  item: {
    spacing: 8,
    symbolSize: 12,
    symbolBorderRadius: 2,
  },
  // タイポグラフィ
  typography: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.normal,
  },
  // インタラクション
  interactive: true,
  hoverable: true,
};

// =============================================================================
// 8. アクセシビリティ設定
// =============================================================================

export const accessibility = {
  // フォーカス表示
  focusVisible: {
    outline: `2px solid ${lightTheme.focus.ring}`,
    outlineOffset: '2px',
  },
  // 最小タッチターゲット（44x44px - WCAG 2.5.5）
  minTouchTarget: 44,
  // 最小コントラスト比
  contrastRatio: {
    normal: 4.5, // WCAG AA
    large: 3, // 大きいテキスト
  },
  // アニメーション削減
  reducedMotion: {
    duration: '0ms',
    transition: 'none',
  },
  // キーボードナビゲーション
  keyboard: {
    tabIndex: 0,
    focusableElements: ['node', 'link', 'legend-item'],
  },
  // ARIAラベル
  ariaLabels: {
    chart: 'Sankey diagram',
    node: (name: string, value: number) => `Node: ${name}, Value: ${value}`,
    link: (source: string, target: string, value: number) =>
      `Flow from ${source} to ${target}, Value: ${value}`,
    legend: 'Chart legend',
    legendItem: (name: string) => `Toggle visibility of ${name}`,
  },
};

// =============================================================================
// 9. レスポンシブブレークポイント
// =============================================================================

export const breakpoints = {
  xs: 0,
  sm: 576,
  md: 768,
  lg: 992,
  xl: 1200,
  xxl: 1400,
};

// =============================================================================
// CSS Custom Properties としてエクスポート
// =============================================================================

export function generateCSSVariables(theme: 'light' | 'dark' = 'light'): string {
  const currentTheme = theme === 'light' ? lightTheme : darkTheme;

  return `
:root {
  /* Background Colors */
  --sankey-bg-primary: ${currentTheme.background.primary};
  --sankey-bg-secondary: ${currentTheme.background.secondary};
  --sankey-bg-tertiary: ${currentTheme.background.tertiary};

  /* Text Colors */
  --sankey-text-primary: ${currentTheme.text.primary};
  --sankey-text-secondary: ${currentTheme.text.secondary};
  --sankey-text-tertiary: ${currentTheme.text.tertiary};
  --sankey-text-inverse: ${currentTheme.text.inverse};

  /* Border Colors */
  --sankey-border-default: ${currentTheme.border.default};
  --sankey-border-subtle: ${currentTheme.border.subtle};
  --sankey-border-strong: ${currentTheme.border.strong};

  /* Link (Flow) Colors */
  --sankey-link-default: ${currentTheme.link.default};
  --sankey-link-hover: ${currentTheme.link.hover};
  --sankey-link-selected: ${currentTheme.link.selected};

  /* Shadows */
  --sankey-shadow-sm: ${currentTheme.shadow.small};
  --sankey-shadow-md: ${currentTheme.shadow.medium};
  --sankey-shadow-lg: ${currentTheme.shadow.large};

  /* Focus */
  --sankey-focus-ring: ${currentTheme.focus.ring};
  --sankey-focus-ring-offset: ${currentTheme.focus.ringOffset};

  /* Typography */
  --sankey-font-family: ${typography.fontFamily.primary};
  --sankey-font-mono: ${typography.fontFamily.mono};
  --sankey-font-size-xs: ${typography.fontSize.xs};
  --sankey-font-size-sm: ${typography.fontSize.sm};
  --sankey-font-size-md: ${typography.fontSize.md};
  --sankey-font-size-lg: ${typography.fontSize.lg};

  /* Spacing */
  --sankey-spacing-1: ${spacing[1]};
  --sankey-spacing-2: ${spacing[2]};
  --sankey-spacing-3: ${spacing[3]};
  --sankey-spacing-4: ${spacing[4]};
  --sankey-spacing-6: ${spacing[6]};
  --sankey-spacing-8: ${spacing[8]};

  /* Animation */
  --sankey-duration-fast: ${animation.duration.fast};
  --sankey-duration-normal: ${animation.duration.normal};
  --sankey-easing-default: ${animation.easing.easeInOut};

  /* Layout */
  --sankey-node-width: ${layout.node.width.medium}px;
  --sankey-node-padding: ${layout.node.padding.medium}px;
  --sankey-node-border-radius: ${layout.node.borderRadius}px;
  --sankey-label-offset: ${layout.label.offset}px;

  /* Tooltip */
  --sankey-tooltip-max-width: ${tooltip.maxWidth}px;
  --sankey-tooltip-border-radius: ${tooltip.borderRadius}px;
  --sankey-tooltip-padding-x: ${tooltip.padding.x}px;
  --sankey-tooltip-padding-y: ${tooltip.padding.y}px;
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --sankey-bg-primary: ${darkTheme.background.primary};
    --sankey-bg-secondary: ${darkTheme.background.secondary};
    --sankey-bg-tertiary: ${darkTheme.background.tertiary};
    --sankey-text-primary: ${darkTheme.text.primary};
    --sankey-text-secondary: ${darkTheme.text.secondary};
    --sankey-text-tertiary: ${darkTheme.text.tertiary};
    --sankey-text-inverse: ${darkTheme.text.inverse};
    --sankey-border-default: ${darkTheme.border.default};
    --sankey-border-subtle: ${darkTheme.border.subtle};
    --sankey-border-strong: ${darkTheme.border.strong};
    --sankey-link-default: ${darkTheme.link.default};
    --sankey-link-hover: ${darkTheme.link.hover};
    --sankey-link-selected: ${darkTheme.link.selected};
    --sankey-shadow-sm: ${darkTheme.shadow.small};
    --sankey-shadow-md: ${darkTheme.shadow.medium};
    --sankey-shadow-lg: ${darkTheme.shadow.large};
    --sankey-focus-ring: ${darkTheme.focus.ring};
    --sankey-focus-ring-offset: ${darkTheme.focus.ringOffset};
  }
}

[data-theme="dark"] {
  --sankey-bg-primary: ${darkTheme.background.primary};
  --sankey-bg-secondary: ${darkTheme.background.secondary};
  --sankey-bg-tertiary: ${darkTheme.background.tertiary};
  --sankey-text-primary: ${darkTheme.text.primary};
  --sankey-text-secondary: ${darkTheme.text.secondary};
  --sankey-text-tertiary: ${darkTheme.text.tertiary};
  --sankey-text-inverse: ${darkTheme.text.inverse};
  --sankey-border-default: ${darkTheme.border.default};
  --sankey-border-subtle: ${darkTheme.border.subtle};
  --sankey-border-strong: ${darkTheme.border.strong};
  --sankey-link-default: ${darkTheme.link.default};
  --sankey-link-hover: ${darkTheme.link.hover};
  --sankey-link-selected: ${darkTheme.link.selected};
  --sankey-shadow-sm: ${darkTheme.shadow.small};
  --sankey-shadow-md: ${darkTheme.shadow.medium};
  --sankey-shadow-lg: ${darkTheme.shadow.large};
  --sankey-focus-ring: ${darkTheme.focus.ring};
  --sankey-focus-ring-offset: ${darkTheme.focus.ringOffset};
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  :root {
    --sankey-duration-fast: 0ms;
    --sankey-duration-normal: 0ms;
  }
}
`.trim();
}

// デフォルトエクスポート
export default {
  colorPalette,
  lightTheme,
  darkTheme,
  typography,
  spacing,
  layout,
  animation,
  interactionStates,
  tooltip,
  legend,
  accessibility,
  breakpoints,
  generateCSSVariables,
};
