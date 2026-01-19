# Sankey Chart UI/UX Design Specification

## 概要

このドキュメントは、Sankey Chartライブラリの包括的なUI/UXデザイン仕様を定義します。
WCAG 2.1 AAレベルのアクセシビリティ基準に準拠し、モダンでプロフェッショナルな
可視化体験を提供することを目指しています。

---

## 1. カラースキーム

### 1.1 デフォルトパレット

データ可視化に最適化された12色のカラーパレットを採用しています。

```
Primary Colors (12色):
┌──────────────────────────────────────────────────────────────────┐
│ #4E79A7  #F28E2B  #E15759  #76B7B2  #59A14F  #EDC948            │
│ (Blue)   (Orange) (Red)    (Teal)   (Green)  (Yellow)           │
│                                                                  │
│ #B07AA1  #FF9DA7  #9C755F  #BAB0AC  #6B9AC4  #D4A6C8            │
│ (Purple) (Pink)   (Brown)  (Gray)   (L.Blue) (L.Purple)         │
└──────────────────────────────────────────────────────────────────┘
```

**設計原則:**
- 隣接色の彩度・明度に十分な差を確保
- 印刷時も識別可能なコントラスト
- 文化的に中立な色選定

### 1.2 カテゴリ別カラースキーム

#### 財務データ向け
```
収入: #2E7D32 (Green)  - 成長・利益を象徴
支出: #C62828 (Red)    - 注意を喚起
投資: #1565C0 (Blue)   - 信頼・安定
運営: #F57C00 (Orange) - アクティブな活動
その他: #7B1FA2 (Purple)
```

#### エネルギーフロー向け
```
太陽光: #FFC107 (Yellow)
再生可能: #4CAF50 (Green)
化石燃料: #795548 (Brown)
水力: #2196F3 (Blue)
損失: #9E9E9E (Gray)
```

#### プロセスフロー向け
```
入力: #3F51B5 (Indigo)
処理: #009688 (Teal)
変換: #FF5722 (Deep Orange)
出力: #8BC34A (Light Green)
廃棄: #607D8B (Blue Gray)
```

### 1.3 ダークモード対応

```css
/* Light Theme */
:root {
  --sankey-bg-primary: #FFFFFF;
  --sankey-bg-secondary: #F8F9FA;
  --sankey-text-primary: #212529;
  --sankey-text-secondary: #6C757D;
  --sankey-link-default: rgba(0, 0, 0, 0.15);
  --sankey-link-hover: rgba(0, 0, 0, 0.35);
}

/* Dark Theme */
[data-theme="dark"] {
  --sankey-bg-primary: #1A1A2E;
  --sankey-bg-secondary: #16213E;
  --sankey-text-primary: #E8E8E8;
  --sankey-text-secondary: #B0B0B0;
  --sankey-link-default: rgba(255, 255, 255, 0.2);
  --sankey-link-hover: rgba(255, 255, 255, 0.4);
}
```

**自動切り替えサポート:**
```css
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    /* ダークテーマの変数を適用 */
  }
}
```

---

## 2. インタラクションデザイン

### 2.1 ホバー時のハイライト効果

#### ノードホバー
```
┌─────────────────────────────────────────────────────────────────┐
│  [Default]           [Hover]             [Connected Flow]       │
│                                                                 │
│   ┌───┐              ┌───┐ ← stroke      ━━━━━━━━━━━━━         │
│   │   │    ───►      │   │   highlight   ┌───┐━━━━━━━┐         │
│   │   │              │   │               │   │━━━━━━━│ Target  │
│   └───┘              └───┘               └───┘━━━━━━━┘         │
│                      brightness: 1.1    (dimmed: 他要素)        │
└─────────────────────────────────────────────────────────────────┘
```

**CSS実装:**
```css
.sankey-node:hover rect {
  stroke: currentColor;
  stroke-width: 2px;
  filter: brightness(1.1);
}

.sankey-node.dimmed {
  opacity: 0.3;
}

.sankey-link.highlighted {
  stroke-opacity: 0.9;
}
```

#### リンクホバー
```
通常状態:    stroke-opacity: 0.5
ホバー状態:  stroke-opacity: 0.8
選択状態:    stroke-opacity: 1.0
薄暗い状態:  stroke-opacity: 0.1
```

### 2.2 選択状態の表示

```
┌─────────────────────────────────────────────────────────────────┐
│  選択インジケーター                                             │
│                                                                 │
│   ┏━━━┓  ← 太いボーダー (3px)                                   │
│   ┃   ┃     フォーカスリング色: #4E79A7                         │
│   ┃   ┃                                                         │
│   ┗━━━┛                                                         │
│                                                                 │
│  複数選択: Ctrl+クリック で追加選択                             │
│  選択解除: Escape キー または 背景クリック                       │
└─────────────────────────────────────────────────────────────────┘
```

### 2.3 ツールチップデザイン

```
┌─────────────────────────────────────────────────────────────────┐
│  ノードツールチップ                リンクツールチップ            │
│                                                                 │
│   ┌──────────────────┐            ┌──────────────────┐          │
│   │ ● Category Name  │            │ Flow             │          │
│   │─────────────────│            │─────────────────│          │
│   │ Value: 1,234,567│            │ From: Source     │          │
│   └──────────────────┘            │ To:   Target     │          │
│          ▼                        │ Value: 500,000   │          │
│                                   └──────────────────┘          │
│                                          ▼                      │
└─────────────────────────────────────────────────────────────────┘
```

**スタイル仕様:**
- 最大幅: 280px
- パディング: 12px x 8px
- 角丸: 6px
- シャドウ: 0 10px 15px rgba(0, 0, 0, 0.15)
- 表示遅延: 200ms（誤ホバー防止）
- アニメーション: fade + translateY（150ms）

---

## 3. レイアウト

### 3.1 ノードの配置

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  ← margin.left: 120px →│←  Content Area  →│← margin.right: 120px│
│                                                                 │
│   Source        ━━━━━━━━━━━━━━━━━━━━►        Target             │
│   Nodes                                      Nodes              │
│                                                                 │
│   ┌───┐         ━━━━━━━━━━━━━━━━━━━━►        ┌───┐              │
│   │   │═════════════════════════════════════│   │              │
│   │   │─────────────────────────────────────│   │              │
│   └───┘         ━━━━━━━━━━━━━━━━━━━━►        └───┘              │
│                                                                 │
│   Node Width:                                                   │
│   - Small:  15px                                                │
│   - Medium: 20px (default)                                      │
│   - Large:  30px                                                │
│                                                                 │
│   Node Padding (垂直間隔):                                       │
│   - Small:  8px                                                 │
│   - Medium: 12px (default)                                      │
│   - Large:  16px                                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 ラベルの表示位置

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  左側ノード (text-anchor: end)                                   │
│                                                                 │
│       Category A ─┐                                             │
│                  ┌┴──┐                                          │
│                  │   │                                          │
│                  │   │                                          │
│                  └───┘                                          │
│            offset: 6px                                          │
│                                                                 │
│  右側ノード (text-anchor: start)                                 │
│                                                                 │
│                  ┌───┐                                          │
│                  │   │┌─ Category B                             │
│                  │   │                                          │
│                  └───┘                                          │
│                                                                 │
│  ノード内ラベル (幅が十分な場合)                                  │
│                                                                 │
│                  ┌─────────────┐                                │
│                  │  Category C │                                │
│                  └─────────────┘                                │
│                  (text-anchor: middle, fill: inverse)           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.3 凡例の設計

```
┌─────────────────────────────────────────────────────────────────┐
│  Position Variants                                              │
│                                                                 │
│  [Top]                                                          │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ ■ Category A   ■ Category B   ■ Category C   ■ More...  │    │
│  └─────────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                      Chart                               │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  [Right]                                                        │
│  ┌────────────────────────────────────┐┌───────────────────┐    │
│  │                                    ││ ■ Category A      │    │
│  │              Chart                 ││ ■ Category B      │    │
│  │                                    ││ ■ Category C      │    │
│  └────────────────────────────────────┘│ ■ Category D      │    │
│                                        └───────────────────┘    │
│                                                                 │
│  Legend Item:                                                   │
│  ┌──────────────────┐                                           │
│  │ ■ Label (Value)  │  ← hover: bg-secondary                    │
│  └──────────────────┘  ← click: toggle visibility               │
│   │                                                             │
│   └─ 12x12px symbol, 2px border-radius                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. アクセシビリティ

### 4.1 キーボードナビゲーション

```
┌─────────────────────────────────────────────────────────────────┐
│  Keyboard Shortcuts                                             │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Key              Action                                  │    │
│  ├─────────────────────────────────────────────────────────┤    │
│  │ Tab              チャートにフォーカス移動                │    │
│  │ →/↓             次の要素にフォーカス                    │    │
│  │ ←/↑             前の要素にフォーカス                    │    │
│  │ Home             最初の要素にフォーカス                  │    │
│  │ End              最後の要素にフォーカス                  │    │
│  │ Enter/Space      要素を選択                              │    │
│  │ Escape           選択を解除                              │    │
│  │ Shift+?          ヘルプを表示                            │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  Focus Indicator:                                               │
│  ┏━━━━━━━━━━━━━━━━━━━━━━━┓                                      │
│  ┃  outline: 2px solid  ┃ ← offset: 2px                        │
│  ┃  #4E79A7 (focus-ring)┃                                      │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━┛                                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 スクリーンリーダー対応

**ARIA属性:**
```html
<!-- Chart container -->
<svg role="img"
     aria-label="Sankey diagram"
     tabindex="0">
  <title>Sankey Diagram</title>
  <desc>Sankey diagram with 8 nodes and 12 connections.
        Total flow value: 1,234,567.</desc>

  <!-- Node -->
  <g class="sankey-node"
     role="button"
     aria-label="Node: Category A, Value: 500,000"
     tabindex="0">
    <rect />
  </g>

  <!-- Link -->
  <path class="sankey-link"
        role="img"
        aria-label="Flow from Category A to Category B, Value: 250,000"
        tabindex="0" />
</svg>

<!-- Live region for announcements -->
<div role="status"
     aria-live="polite"
     aria-atomic="true"
     class="sankey-sr-only">
  <!-- Dynamic announcements -->
</div>
```

### 4.3 色覚多様性への配慮

#### 色覚対応パレット (CVD-Safe)
```
┌─────────────────────────────────────────────────────────────────┐
│  Color Blind Safe Palette (8色)                                 │
│                                                                 │
│  #000000  #E69F00  #56B4E9  #009E73                             │
│  (Black)  (Orange) (Sky)    (Bluish Green)                      │
│                                                                 │
│  #F0E442  #0072B2  #D55E00  #CC79A7                             │
│  (Yellow) (Blue)   (Vermilion) (Reddish Purple)                 │
│                                                                 │
│  このパレットは以下の色覚タイプで識別可能:                        │
│  - 1型色覚（Protanopia）                                        │
│  - 2型色覚（Deuteranopia）                                      │
│  - 3型色覚（Tritanopia）                                        │
└─────────────────────────────────────────────────────────────────┘
```

#### パターンによる識別
```
┌─────────────────────────────────────────────────────────────────┐
│  色に依存しない識別パターン                                      │
│                                                                 │
│  ╱╱╱╱╱    ● ● ●    ═════    │││││    ╳╳╳╳╳    ∿∿∿∿∿            │
│  Diagonal  Dots    Horiz.   Vert.   Cross    Waves             │
│                                                                 │
│  使用例: 色覚モード設定時に自動適用                              │
└─────────────────────────────────────────────────────────────────┘
```

#### コントラスト要件
```
WCAG 2.1 AA 基準:
- 通常テキスト: 4.5:1 以上
- 大きなテキスト (18px以上): 3:1 以上
- UI要素・グラフィック: 3:1 以上
```

---

## 5. アニメーション & トランジション

### 5.1 タイミング設定

```typescript
animation = {
  duration: {
    instant: '0ms',      // 即座
    fast: '150ms',       // ホバー効果
    normal: '300ms',     // 標準トランジション
    slow: '500ms',       // 強調アニメーション
  },
  easing: {
    linear: 'linear',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  },
}
```

### 5.2 初期表示アニメーション

```css
/* ノードのフェードイン */
@keyframes sankey-node-enter {
  from { opacity: 0; transform: scaleY(0); }
  to { opacity: 1; transform: scaleY(1); }
}

/* リンクの描画アニメーション */
@keyframes sankey-link-draw {
  from { stroke-dashoffset: 1000; }
  to { stroke-dashoffset: 0; }
}
```

### 5.3 動作軽減設定対応

```css
@media (prefers-reduced-motion: reduce) {
  .sankey-node,
  .sankey-link,
  .sankey-tooltip {
    transition: none !important;
    animation: none !important;
  }
}
```

---

## 6. レスポンシブデザイン

### 6.1 ブレークポイント

```typescript
breakpoints = {
  xs: 0,      // スマートフォン
  sm: 576,    // 小型タブレット
  md: 768,    // タブレット
  lg: 992,    // デスクトップ
  xl: 1200,   // 大型デスクトップ
  xxl: 1400,  // 超大型画面
}
```

### 6.2 適応ルール

```
┌─────────────────────────────────────────────────────────────────┐
│  Screen Size        Adaptations                                 │
│─────────────────────────────────────────────────────────────────│
│  < 576px (xs)       - ラベルサイズ: 10px                        │
│                     - ツールチップ最大幅: 200px                  │
│                     - 凡例: 横スクロール可能                     │
│                                                                 │
│  < 768px (sm)       - マージン縮小                              │
│                     - ノード幅: small (15px)                    │
│                                                                 │
│  タッチデバイス      - タッチターゲット: 44x44px以上              │
│  (hover: none)       - ツールチップ: 長押しで表示                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. 印刷対応

```css
@media print {
  .sankey-chart {
    background-color: white !important;
    color: black !important;
  }

  .sankey-tooltip {
    display: none !important;
  }

  .sankey-node rect {
    stroke: #000 !important;
    stroke-width: 0.5px !important;
  }

  .sankey-link {
    stroke-opacity: 0.6 !important;
  }
}
```

---

## 8. 実装ファイル構成

```
src/
├── styles/
│   ├── design-tokens.ts     # デザイントークン定義
│   └── sankey-chart.css     # メインスタイルシート
├── components/
│   └── Legend.ts            # 凡例コンポーネント
├── interactions/
│   └── InteractionManager.ts # インタラクション管理
└── accessibility/
    └── AccessibilityManager.ts # アクセシビリティ管理
```

---

## 9. 使用例

```typescript
import { InteractionManager } from './interactions/InteractionManager';
import { AccessibilityManager } from './accessibility/AccessibilityManager';
import { Legend } from './components/Legend';
import { generateCSSVariables, colorPalette } from './styles/design-tokens';

// CSSカスタムプロパティを注入
const styleElement = document.createElement('style');
styleElement.textContent = generateCSSVariables('light');
document.head.appendChild(styleElement);

// チャート作成後
const svg = d3.select('#chart').append('svg');
const interactionManager = new InteractionManager(svg);
const accessibilityManager = new AccessibilityManager(container, svg);

// ノード・リンクにインタラクションをバインド
interactionManager.bindNodeInteractions(nodes);
interactionManager.bindLinkInteractions(links);

// 凡例を作成
const legend = new Legend(legendContainer, legendItems, {
  position: 'bottom',
  interactive: true,
  onToggle: (item) => {
    // フィルタリング処理
  },
});

// 色覚対応モードを有効化
accessibilityManager.setColorBlindMode('deuteranopia');
```

---

## 付録: デザイントークンクイックリファレンス

| Token | Light | Dark |
|-------|-------|------|
| `--sankey-bg-primary` | #FFFFFF | #1A1A2E |
| `--sankey-bg-secondary` | #F8F9FA | #16213E |
| `--sankey-text-primary` | #212529 | #E8E8E8 |
| `--sankey-text-secondary` | #6C757D | #B0B0B0 |
| `--sankey-border-default` | #DEE2E6 | #2D2D44 |
| `--sankey-focus-ring` | #4E79A7 | #6B9AC4 |
| `--sankey-duration-fast` | 150ms | 150ms |
| `--sankey-duration-normal` | 300ms | 300ms |
| `--sankey-node-width` | 20px | 20px |
| `--sankey-tooltip-max-width` | 280px | 280px |
