# Sankey Chart Architecture Design

## 概要

Power BI互換のSankey Chartビジュアライゼーションのアーキテクチャ設計書です。
Web版（Next.js/React）とPower BI版で共有できるコア設計を採用しています。

---

## 1. 全体アーキテクチャ

### 設計原則: Platform-Agnostic Core

```
┌─────────────────────────────────────────────────────────────────┐
│                    Application Layer                            │
│  ┌─────────────────────┐      ┌─────────────────────┐          │
│  │   Next.js/React     │      │   Power BI Visual   │          │
│  │   (Web Platform)    │      │   (pbiviz)          │          │
│  └──────────┬──────────┘      └──────────┬──────────┘          │
│             │                            │                      │
│  ┌──────────▼──────────┐      ┌──────────▼──────────┐          │
│  │   Web Adapter       │      │   Power BI Adapter  │          │
│  │   (React Wrapper)   │      │   (IVisual impl)    │          │
│  └──────────┬──────────┘      └──────────┬──────────┘          │
└─────────────┼────────────────────────────┼──────────────────────┘
              │                            │
┌─────────────▼────────────────────────────▼──────────────────────┐
│                    Core Layer (Framework-Agnostic)              │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                  SankeyEngine                              │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │ │
│  │  │ DataParser  │  │ LayoutCalc  │  │ SVGRenderer        │ │ │
│  │  │             │  │ (d3-sankey) │  │ (Pure D3)          │ │ │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 重要な設計決定

| 決定事項 | 選択 | 理由 |
|---------|------|------|
| DOM操作 | Pure D3.js | React仮想DOMとの競合回避、Power BI互換 |
| 状態管理 | 外部委譲 | 各プラットフォームの仕組みを尊重 |
| 型システム | TypeScript strict | 型安全性、IDE補完、リファクタリング容易性 |
| レイアウト | d3-sankey | 業界標準、検証済みアルゴリズム |

---

## 2. レイヤー構造

### ディレクトリ構成

```
src/
├── types/                    # 型定義（全レイヤー共有）
│   └── index.ts              # SankeyData, SankeyConfig, etc.
│
├── core/                     # コアエンジン（フレームワーク非依存）
│   ├── index.ts              # Public exports
│   ├── SankeyEngine.ts       # メインエンジンクラス
│   ├── LayoutCalculator.ts   # d3-sankeyラッパー
│   └── SVGRenderer.ts        # Pure D3によるSVG描画
│
├── utils/                    # ユーティリティ
│   ├── colors.ts             # カラースキーム
│   ├── formatters.ts         # 数値・ラベルフォーマット
│   └── validators.ts         # データ検証
│
├── web/                      # Web版アダプター
│   ├── index.ts              # Public exports
│   ├── SankeyChart.tsx       # Reactコンポーネント
│   └── hooks/
│       ├── useSankey.ts      # カスタムフック
│       └── useResize.ts      # リサイズ対応
│
└── powerbi/                  # Power BI版アダプター
    ├── index.ts              # Public exports
    ├── visual.ts             # IVisual実装
    ├── capabilities.json     # PBI機能定義
    ├── settings.ts           # 設定パネル
    └── dataViewTransformer.ts # DataView変換
```

### 各レイヤーの責務

#### Types Layer
- 全てのインターフェース・型定義
- デフォルト設定値
- Power BI固有型の抽象化

#### Core Layer
- **SankeyEngine**: メインのオーケストレーター
  - mount/render/update/destroy のライフサイクル
  - イベントハンドリングの抽象化
- **LayoutCalculator**: d3-sankeyを使用したレイアウト計算
- **SVGRenderer**: D3 selectionによるSVG描画

#### Web Adapter Layer
- **SankeyChart.tsx**: 宣言的なReactコンポーネント
- **useSankey**: SankeyEngineをReactで使うためのフック
- **useResize**: ResizeObserverのラッパー

#### Power BI Adapter Layer
- **visual.ts**: IVisualインターフェース実装
- **dataViewTransformer.ts**: DataView→SankeyData変換
- **settings.ts**: Format Pane設定クラス
- **capabilities.json**: データロール・オブジェクト定義

---

## 3. 依存関係

### パッケージ依存

```json
{
  "dependencies": {
    "d3": "^7.8.5",
    "d3-sankey": "^0.12.3"
  },
  "peerDependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  },
  "optionalDependencies": {
    "powerbi-visuals-api": "^5.4.0"
  }
}
```

### レイヤー間の依存ルール

```
types ← core ← web
             ← powerbi

✓ types は他に依存しない
✓ core は types のみに依存
✓ web/powerbi は core と types に依存
✗ core は web/powerbi に依存しない（逆依存禁止）
```

### D3.js使用方針

| モジュール | 使用箇所 | 目的 |
|-----------|---------|------|
| d3-selection | SVGRenderer | DOM操作 |
| d3-sankey | LayoutCalculator | レイアウト計算 |
| d3-scale | Colors utility | カラースケール |
| d3-transition | Animation | トランジション |
| d3-shape | Renderer | パス生成 |

---

## 4. Power BI互換性戦略

### DataView変換

Power BI DataViewの構造:
```
DataView
├── categorical
│   ├── categories[] (Source, Target列)
│   └── values[] (Value列)
└── metadata
    └── objects (設定値)
```

変換後のSankeyData:
```typescript
interface SankeyData {
  nodes: SankeyNodeDatum[];
  links: SankeyLinkDatum[];
}
```

### 移植手順

1. **コアライブラリをnpmパッケージ化**
   ```bash
   npm run build:lib
   npm publish --access public
   ```

2. **pbivizプロジェクト作成**
   ```bash
   pbiviz new sankey-visual
   cd sankey-visual
   npm install sankey-chart-core
   ```

3. **visual.tsでSankeyEngineを使用**
   ```typescript
   import { SankeyEngine, transformDataView } from 'sankey-chart-core/powerbi';
   ```

4. **capabilities.jsonを配置**
   - src/powerbi/capabilities.jsonをコピー

### Power BI固有の考慮事項

| 機能 | 対応方法 |
|------|---------|
| Selection | ISelectionManager連携 |
| Tooltip | ITooltipService使用 |
| Theme Colors | IColorPalette使用 |
| Highlight | DataViewのhighlightsプロパティ |
| Drilldown | expandCollapseを将来実装 |

---

## 5. 他エージェントとの議論ポイント

### UI/UXエージェントへの質問

1. **ラベル配置**: ノードが密集した場合のラベル重複回避アルゴリズム
2. **カラーパレット**: アクセシビリティ（色覚多様性）対応の配色
3. **インタラクション**: タッチデバイスでのジェスチャー対応
4. **レスポンシブ**: モバイル表示時のノード・ラベル最小サイズ

### パフォーマンスエージェントへの質問

1. **大規模データ**: 1000ノード/5000リンク以上の処理戦略
   - Canvas vs SVG の判断基準
   - WebWorkerでのレイアウト計算の分離
2. **アニメーション**: 60fps維持のための最適化
   - requestAnimationFrame vs transition
3. **メモリ**: D3 selectionのメモリリーク対策

### Power BI専門家エージェントへの質問

1. **認証**: Power BI Certifiedビジュアルの要件
2. **データ制限**: dataReductionAlgorithmの最適設定
3. **設定永続化**: ユーザーのフォーマット設定の保存方法
4. **バージョニング**: 既存レポートとの互換性維持

### バックエンドエージェントへの質問

1. **データ前処理**: サーバーサイドでのSankeyレイアウト計算
2. **キャッシュ戦略**: 計算済みレイアウトのキャッシュ
3. **APIデザイン**: Sankey用データエンドポイントの設計

---

## 6. 将来の拡張計画

### Phase 1 (MVP)
- [x] コアエンジン実装
- [x] Reactコンポーネント
- [ ] 基本的なPower BIビジュアル

### Phase 2 (機能拡張)
- [ ] ノードドラッグ対応
- [ ] マルチレベルSankey（階層）
- [ ] アニメーション強化
- [ ] エクスポート機能（PNG/SVG）

### Phase 3 (最適化)
- [ ] Canvas描画モード（大規模データ用）
- [ ] WebWorkerレイアウト計算
- [ ] ストリーミングデータ対応

---

## 7. テスト戦略

### ユニットテスト
- `src/core/`: Vitest + Testing Library
- レイアウト計算の正確性
- イベントハンドリング

### 統合テスト
- `src/web/`: React Testing Library
- コンポーネントのレンダリング
- フック動作確認

### E2Eテスト
- Playwright
- 実際のブラウザでの描画確認

### Power BIテスト
- Power BI Playground
- TestUtils provided by Power BI
