/**
 * Sankey Chart Styles - Entry Point
 *
 * デザインシステムのすべてのエクスポートをまとめる
 */

// デザイントークン
export {
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
} from './design-tokens';

// 型定義
export type { default as DesignTokens } from './design-tokens';

/**
 * テーマを適用するヘルパー関数
 */
export function applyTheme(theme: 'light' | 'dark' | 'auto'): void {
  const root = document.documentElement;

  if (theme === 'auto') {
    root.removeAttribute('data-theme');
  } else {
    root.setAttribute('data-theme', theme);
  }
}

/**
 * CSSスタイルシートを動的に注入
 */
export function injectStyles(cssText: string): HTMLStyleElement {
  const style = document.createElement('style');
  style.textContent = cssText;
  document.head.appendChild(style);
  return style;
}

/**
 * デザイントークンをCSSカスタムプロパティとして注入
 */
export function initializeDesignSystem(theme: 'light' | 'dark' = 'light'): void {
  const { generateCSSVariables } = require('./design-tokens');
  injectStyles(generateCSSVariables(theme));
}
