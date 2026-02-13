# Sankey Chart Power BI Custom Visual -- 実装ドキュメント

## 目次

1. [プロジェクト概要](#1-プロジェクト概要)
2. [アーキテクチャ](#2-アーキテクチャ)
3. [データフロー](#3-データフロー)
4. [循環参照対応](#4-循環参照対応)
5. [レイアウトアルゴリズム](#5-レイアウトアルゴリズム)
6. [設定システム](#6-設定システム)
7. [インタラクション](#7-インタラクション)
8. [型システム](#8-型システム)
9. [テスト方針](#9-テスト方針)
10. [定数・マジックナンバー](#10-定数マジックナンバー)

---

## 1. プロジェクト概要

本プロジェクトは、Power BI Desktop および Power BI Service 上で動作するカスタムビジュアル（Custom Visual）であり、Sankey Chart（サンキーダイアグラム）を描画する。フローの起点（Source）、終点（Target）、量（Value）の3つのデータロールを受け取り、ノードとリンクで構成されるサンキーダイアグラムとしてデータを可視化する。

### 技術スタック

| 技術 | 用途 |
|------|------|
| TypeScript | 型安全な実装言語 |
| D3.js (`d3`, `d3-sankey`) | DOM操作およびサンキーレイアウト計算 |
| Power BI Visuals API (`powerbi-visuals-api`) | Power BI ホストとの連携 |
| `powerbi-visuals-utils-formattingmodel` | Format Pane API による設定UI |
| `powerbi-visuals-utils-formattingutils` | 数値フォーマット（`valueFormatter`） |
| Vitest | 単体テストフレームワーク |

### 主な機能

- ノードの自動レイアウト（d3-sankey による）
- 循環参照（サイクル）を含むデータの自動処理
- ノード・リンクの選択とクロスフィルタリング
- ツールチップ表示
- キーボードナビゲーション
- ハイコントラストモード対応
- カテゴリ別/単一色/レイヤー別のカラーモード
- リンクラベル・ノードデータラベル表示
- ランディングページ（データ未設定時の案内表示）

---

## 2. アーキテクチャ

### 単一ファイル構成

全てのロジックは `src/visual.ts` の1ファイルに集約されている。これは Power BI Custom Visual のビルドシステム（pbiviz）との互換性を保つための設計判断である。Power BI のビルドパイプラインは単一エントリポイントを前提としており、モジュール分割を最小化することでビルドの安定性を確保している。

### 主要クラス・関数の関係

```
src/visual.ts
├── 型定義
│   ├── SankeyNodeDatum      -- ノードデータ
│   ├── SankeyLinkDatum      -- リンクデータ
│   ├── SankeyData           -- 変換済みデータ全体
│   ├── ComputedNode         -- d3-sankey レイアウト計算済みノード
│   ├── ComputedLink         -- d3-sankey レイアウト計算済みリンク
│   └── VisualSettings       -- 設定値
│
├── 定数
│   ├── DEFAULT_SETTINGS     -- デフォルト設定値
│   ├── DEFAULT_LAYER_PALETTE -- レイヤーカラーパレット（10色）
│   └── レンダリング定数      -- LABEL_OFFSET, MIN_LINK_WIDTH_FOR_LABEL 等
│
├── Formatting Settings Model（Format Pane 用クラス群）
│   ├── NodeSettingsCard
│   ├── LinkSettingsCard
│   ├── LinkLabelSettingsCard
│   ├── LabelSettingsCard
│   ├── DataLabelSettingsCard
│   ├── MarginSettingsCard
│   └── VisualFormattingSettingsModel
│
├── 純粋関数（エクスポート済み・テスト対象）
│   ├── extractDropdownValue()     -- ドロップダウン値の安全な抽出
│   ├── extractFillColor()         -- 色オブジェクトからの値抽出
│   ├── extractValidatedDropdown() -- バリデーション付きドロップダウン抽出
│   ├── parseSettings()            -- DataView から VisualSettings への変換
│   ├── getLinkSortFunction()      -- リンクソート関数の選択
│   ├── resolveNode()              -- ComputedNode の安全な取得
│   ├── resolveCycles()            -- 循環参照の解決
│   └── transformDataView()        -- DataView → SankeyData 変換
│
├── 内部関数
│   ├── findCycleFeedback()        -- DFS によるサイクル検出
│   └── linkDatum()                -- ComputedLink から元データアクセス
│
└── Visual クラス（IVisual 実装）
    ├── constructor()              -- 初期化・SVG 作成・イベント設定
    ├── update()                   -- Power BI からの更新コールバック
    ├── getFormattingModel()       -- Format Pane モデル構築
    ├── renderSankey()             -- メインレンダリング
    ├── renderLinks()              -- リンク描画
    ├── renderLinkLabels()         -- リンクラベル描画
    ├── renderNodes()              -- ノード描画
    ├── renderLabels()             -- ノードラベル描画
    ├── renderDataLabels()         -- ノードデータラベル描画
    ├── showLandingPage()          -- ランディングページ描画
    ├── setupKeyboardNavigation()  -- キーボードイベント設定
    ├── updateSelectionState()     -- 選択状態の反映
    └── destroy()                  -- クリーンアップ
```

### エクスポート構成

テスト可能性のため、純粋関数・型定義・定数はモジュールから直接エクスポートされている。`Visual` クラスは `SankeyVisual` としてもエクスポートされ、Power BI のビルドシステムが参照できるようになっている。

```typescript
export { Visual as SankeyVisual };
```

---

## 3. データフロー

Power BI から受け取った生データがサンキーダイアグラムとして描画されるまでの流れを以下に示す。

### 全体フロー

```
Power BI DataView
    │
    ▼
update(options)                    -- Power BI が呼び出すコールバック
    │
    ├── parseSettings(dataView)    -- metadata.objects → VisualSettings
    │
    ├── transformDataView(...)     -- categorical → SankeyData { nodes[], links[] }
    │
    ├── resolveCycles(nodes, links) -- サイクル検出・ノード複製による解決
    │
    └── renderSankey(data, viewport)
         │
         ├── d3-sankey layout       -- ノード位置・リンクパスの計算
         │
         ├── renderLinks()          -- SVG path 要素の描画
         │
         └── renderNodes()          -- SVG rect + text 要素の描画
```

### 3.1 DataView の構造

Power BI は `VisualUpdateOptions` を通じて `DataView` を渡す。`capabilities.json` で定義された3つのデータロールに対応するカラムを以下のように取得する。

| データロール | 種別 | 取得方法 |
|-------------|------|---------|
| `source` | Grouping | `categories.find(c => c.source.roles?.['source'])` |
| `target` | Grouping | `categories.find(c => c.source.roles?.['target'])` |
| `value` | Measure | `values.find(v => v.source.roles?.['value'])` |

`value` カラムが存在しない場合、各リンクの値は `1` にフォールバックする。

### 3.2 transformDataView() の処理

`transformDataView()` は以下の手順でデータを変換する。

1. **バリデーション**: `dataView.categorical` の存在確認、`source`/`target` カラムの存在確認。欠落時は `null` を返す。
2. **行の走査**: 各行について source, target, value を読み取り、以下の条件でスキップする。
   - source が空文字
   - target が空文字
   - source と target が同一（自己ループ）
   - value が 0 以下、非有限数（`Infinity`, `NaN`）
3. **リンクの集約**: 同一の source-target ペアは値を合算する。リンクキーは `\0`（ヌル文字）区切りで `${source}\0${target}` とすることで、ユーザーデータに含まれうる文字との衝突を回避している。
4. **ノード構築**: ノードは nodeMap から生成し、`ISelectionId` を付与する。カラーモードに応じて色を割り当てる。
5. **ユーザーカラーオーバーライド**: `category` モードでは、`nodeColors.fill` オブジェクトからノード個別のカスタムカラーを取得する。

### 3.3 settings の解析

`parseSettings()` は `dataView.metadata.objects` から各設定オブジェクトを読み取り、`VisualSettings` 型のオブジェクトとして返す。各プロパティには `??` 演算子でデフォルト値がフォールバックされる。ドロップダウン値は `extractValidatedDropdown()` によって許容値リストに対してバリデーションされる。

`update()` メソッド内では、`parseSettings()` の結果に対してさらに `FormattingSettingsService` から取得した値でオーバーライドを行う。これはドロップダウン値において `formattingSettings` 側の値がより信頼性が高いためである。

---

## 4. 循環参照対応

サンキーダイアグラムは本来、DAG（有向非巡回グラフ）を前提としたレイアウトアルゴリズムである。しかし、実データには A→B→C→A のような循環参照が含まれることがある。d3-sankey はサイクルを含むグラフでエラーを起こすため、レイアウト計算前にサイクルを解決する必要がある。

### 4.1 解決方針: ノード複製

本実装では**リンクの削除ではなくノードの複製**によってサイクルを解決する。これにより、全てのフローが通常のサンキーパスとして描画され、データの欠落が発生しない。

例: A→B→C→A のサイクルの場合

```
変換前:  A → B → C → A  (サイクル)
変換後:  A → B → C → A' (DAG)
```

ここで `A'` は `A` の複製ノードである。`A'` は `originalId` プロパティに元のノードID `'A'` を保持する。

### 4.2 resolveCycles() の処理

```typescript
export function resolveCycles(
  nodes: SankeyNodeDatum[],
  links: SankeyLinkDatum[],
): { nodes: SankeyNodeDatum[]; links: SankeyLinkDatum[] }
```

1. **ノード位置の割り当て**: 各ノードにリンクリストでの出現順に位置（`nodePos`）を割り当てる。source として先に現れるノードほど小さい位置値を持ち、これがユーザーの意図するフロー方向を反映する。
2. **サイクル検出ループ**: `findCycleFeedback()` を繰り返し呼び出し、サイクルが見つからなくなるまでループする。
3. **フィードバックリンクの特定**: サイクル内で最も「後方にジャンプする」リンク（source の位置が高く target の位置が低いリンク）をフィードバックリンクとして選択する。同順位の場合は値が小さいものを優先する。
4. **ノード複製**: フィードバックリンクの target ノードを複製し、一意なIDを付与する（`${targetId}\0dup${counter}`）。フィードバックリンクの target を複製ノードに差し替える。
5. **不変性**: 入力の `nodes` と `links` は一切変更しない。コピーを作成して操作する。

### 4.3 findCycleFeedback() の処理

```typescript
function findCycleFeedback(
  remaining: SankeyLinkDatum[],
  nodePos: ReadonlyMap<string, number>,
): number
```

DFS（深さ優先探索）でサイクルを検出する内部関数。3色アルゴリズム（WHITE/GRAY/BLACK）を使用する。

1. **隣接リストの構築**: `remaining` リンク配列から `source → [リンクインデックス]` のマップを構築する。
2. **DFS 走査**: 各ノードから DFS を実行し、GRAY（訪問中）ノードに到達した場合にサイクルと判定する。
3. **サイクル内のリンク収集**: `parentLink` マップを辿ってサイクル内の全リンクインデックスを収集する。
4. **フィードバックリンクの選択**: サイクル内で `(source位置 - target位置)` が最大のリンクをフィードバックリンクとする。タイブレークは値の小さいものを優先する。
5. **戻り値**: フィードバックリンクのインデックスを返す。サイクルが見つからない場合は `-1` を返す。

---

## 5. レイアウトアルゴリズム

### 5.1 d3-sankey の設定

`renderSankey()` 内で d3-sankey のジェネレータを以下のように構成する。

```typescript
const sankeyGenerator = sankey<SankeyNodeDatum, SankeyLinkDatum>()
  .nodeId(d => d.id)
  .nodeWidth(this.settings.nodeWidth)
  .nodePadding(this.settings.nodePadding)
  .iterations(this.settings.iterations)
  .extent([[0, 0], [width, height]]);
```

| パラメータ | デフォルト値 | 説明 |
|-----------|-------------|------|
| `nodeWidth` | 24px | ノード矩形の幅 |
| `nodePadding` | 16px | ノード間の縦方向のパディング |
| `iterations` | 6 | レイアウト最適化の反復回数（1--32） |

### 5.2 リンクソート

`getLinkSortFunction()` はユーザーの選択に応じて d3-sankey の `linkSort` に渡す関数を返す。d3-sankey の `linkSort` の挙動は以下のとおり。

| 戻り値 | d3-sankey の挙動 |
|--------|-----------------|
| `undefined` | 内部の交差最小化アルゴリズム（`reorderLinks`/`reorderNodeLinks`）を使用 |
| `null` | ソート無効化（入力順を保持、内部の並べ替えもスキップ） |
| 関数 | カスタム比較関数を `computeNodeLinks` 時に適用 |

各モードの対応:

| モード | 戻り値 | 説明 |
|--------|--------|------|
| `ascending` | `undefined` | d3-sankey のデフォルト交差最小化 |
| `descending` | `(a, b) => b.value - a.value` | 値の降順 |
| `byValue` | `(a, b) => a.value - b.value` | 値の昇順 |
| `byValueDesc` | `(a, b) => b.value - a.value` | 値の降順（`descending` と同じ結果） |
| `inputOrder` | `null` | データの入力順を保持。`nodeSort(null)` も併用 |
| `none` | `null` | ソート無効化 |

**重要**: `linkSort` が呼ばれる時点では `link.y0`/`link.y1` はまだ計算されていない。利用可能なプロパティは `link.value`, `link.source`, `link.target`, `link.index` のみである。

### 5.3 ノードソート

`inputOrder` モードのときのみ `sankeyGenerator.nodeSort(null)` を設定し、d3-sankey のノード並べ替えを無効化する。これによりデータの入力順がそのままノードの表示順となる。

---

## 6. 設定システム

### 6.1 VisualSettings インターフェース

`VisualSettings` はビジュアルの全設定を表す型である。全29プロパティを持つ。

```typescript
export interface VisualSettings {
  // ノード設定
  nodeWidth: number;           // ノード幅 (px)
  nodePadding: number;         // ノード間パディング (px)
  iterations: number;          // レイアウト反復回数
  nodeDefaultColor: string;    // デフォルトノード色
  nodeColorMode: NodeColorMode; // カラーモード

  // リンク設定
  linkOpacity: number;         // リンク不透明度 (0--1)
  linkColorMode: LinkColorMode; // リンクカラーモード
  linkDefaultColor: string;    // デフォルトリンク色
  linkSort: LinkSortMode;      // リンクソートモード

  // リンクラベル設定
  showLinkLabels: boolean;
  linkLabelFontSize: number;

  // ノードラベル設定
  labelFontSize: number;
  labelColor: string;
  labelColorMode: LabelColorMode;
  labelFontFamily: string;
  showLabels: boolean;

  // データラベル設定
  showDataLabels: boolean;
  dataLabelFontSize: number;
  dataLabelColor: string;
  dataLabelFontFamily: string;
  dataLabelDisplayMode: DataLabelDisplayMode;
  displayUnits: number;        // 表示単位 (0=Auto, 1=None, 1000=千, ...)
  decimalPlaces: number;       // 値の小数桁数
  percentDecimalPlaces: number; // パーセントの小数桁数

  // マージン設定
  marginTop: number;
  marginRight: number;
  marginBottom: number;
  marginLeft: number;
}
```

### 6.2 Format Pane API

Power BI の新しい Format Pane API に対応するため、`formattingSettings.SimpleCard` を継承した6つの設定カードクラスを定義している。

| カードクラス | 対応する Format Pane セクション | カテゴリ名 |
|-------------|-------------------------------|-----------|
| `NodeSettingsCard` | Nodes | `nodeSettings` |
| `LinkSettingsCard` | Links | `linkSettings` |
| `LinkLabelSettingsCard` | Link Labels | `linkLabelSettings` |
| `LabelSettingsCard` | Node Labels | `labelSettings` |
| `DataLabelSettingsCard` | Node Data Labels | `dataLabelSettings` |
| `MarginSettingsCard` | Margins | `marginSettings` |

`LinkLabelSettingsCard`, `LabelSettingsCard`, `DataLabelSettingsCard` は `topLevelSlice` として `ToggleSwitch` を設定し、カードヘッダーに表示/非表示トグルを配置している。

### 6.3 getFormattingModel() の動的制御

`getFormattingModel()` では、現在の設定状態に応じて表示するスライスを動的に切り替える。

- **ノード設定**: `nodeColorMode === 'single'` の場合のみ `defaultColor` ピッカーを表示
- **リンク設定**: `linkColorMode === 'fixed'` の場合のみ `defaultColor` ピッカーを表示
- **データラベル設定**: `displayMode` に応じて `decimalPlaces` / `percentDecimalPlaces` の表示を切り替え
- **ラベル設定**: `labelColorMode === 'single'` の場合のみ `color` ピッカーを表示
- **カテゴリモード時**: ノードごとの個別カラーピッカーを動的に追加
- **レイヤーモード時**: レイヤーごとのカラーピッカーを動的に追加

### 6.4 カラーモード

#### ノードカラーモード (`NodeColorMode`)

| モード | 説明 |
|--------|------|
| `category` | Power BI のカラーパレットからノードIDに基づいて自動割り当て。ノードごとのカスタムカラーも設定可能 |
| `single` | 全ノードを `nodeDefaultColor` で統一 |
| `layer` | ノードの `depth`（列位置）に応じて `DEFAULT_LAYER_PALETTE` から色を割り当て |

#### リンクカラーモード (`LinkColorMode`)

| モード | 説明 |
|--------|------|
| `source` | source ノードの色をリンクに使用 |
| `target` | target ノードの色をリンクに使用 |
| `gradient` | source → target へのグラデーション（SVG `linearGradient`） |
| `fixed` | 全リンクを `linkDefaultColor` で統一 |
| `layer` | source ノードの `depth` に基づくレイヤー色 |

#### ラベルカラーモード (`LabelColorMode`)

| モード | 説明 |
|--------|------|
| `single` | 全ラベルを `labelColor` で統一 |
| `layer` | ノードの `depth` に応じたレイヤー色 |

### 6.5 レイヤーカラーの管理

レイヤーカラーは最大10レイヤー（`MAX_LAYER_COLORS = 10`）まで対応する。`DEFAULT_LAYER_PALETTE` に固定の10色が定義されており、レイヤーモード選択時にデフォルト色として使用される。ユーザーが個別に変更した色は `capabilities.json` の `layerColors`, `nodeLayerColors`, `labelLayerColors` オブジェクトに保存される。

`populateLayerColorMap()` は、`metadata.objects` からユーザーが設定したレイヤー色を読み取り、`Map<number, string>` に格納する汎用ヘルパーである。3つのレイヤーカラーマップ（リンク用・ノード用・ラベル用）で共通して使用される。

---

## 7. インタラクション

### 7.1 選択（クロスフィルタリング）

Power BI の `ISelectionManager` を使用して、ノードおよびリンクの選択によるクロスフィルタリングを実装している。

- **ノードクリック**: `selectionManager.select(node.selectionId, ctrlKey)` を呼び出す
- **リンククリック**: リンクに紐づく `selectionIds`（複数行の場合は複数）を渡す
- **空白クリック**: `selectionManager.clear()` で選択解除
- **Ctrl/Cmd キー**: マルチ選択をサポート
- **右クリック**: `selectionManager.showContextMenu()` でコンテキストメニューを表示

選択状態は `updateSelectionState()` で視覚的に反映される。選択されていないノードとリンクは低い不透明度（ノード: 0.3、リンク: 0.2）で表示される。パフォーマンスのため、選択IDの比較には `Set` によるO(1)ルックアップを使用している。

`allowInteractions` フラグにより、ピン留めモードなどインタラクションが無効な環境ではクリックイベントを無視する。

### 7.2 ツールチップ

Power BI の `ITooltipService` を使用してネイティブツールチップを表示する。

**ノードのツールチップ**:
- Node 名
- 合計値（`valueFormatter` でフォーマット）

**リンクのツールチップ**:
- Flow: `{source} → {target}`
- 値（`valueFormatter` でフォーマット）

ツールチップのラベルはローカリゼーション対応しており、`ILocalizationManager` の `getDisplayName()` を通じてキー（`Visual_Tooltip_Flow`, `Visual_Tooltip_Node`）から表示名を取得する。

### 7.3 キーボードナビゲーション

`setupKeyboardNavigation()` で `keydown`, `focus`, `blur` イベントリスナーを設定する。コンテナ要素に `tabindex="0"` を設定してフォーカス可能にしている。

| キー | 動作 |
|------|------|
| `Tab` | 次のノードへ移動。最終ノードでは Tab でフォーカスがビジュアルから離脱 |
| `Shift+Tab` | 前のノードへ移動。最初のノードではフォーカスがビジュアルから離脱 |
| `ArrowRight` / `ArrowDown` | 次のノードへ移動 |
| `ArrowLeft` / `ArrowUp` | 前のノードへ移動 |
| `Enter` / `Space` | フォーカス中のノードを選択（Ctrl/Cmd でマルチ選択） |
| `Escape` | 選択解除・フォーカスクリア |

フォーカス中のノードには破線のストローク（`stroke-dasharray: '4,2'`, 色: `#0078d4`）が表示される。`updateNodeFocus()` と `clearNodeFocus()` がフォーカスインジケータの更新を担当する。

### 7.4 ハイコントラストモード

Power BI のカラーパレットから `isHighContrast` フラグを検出し、有効な場合は以下のヘルパーでカラーを切り替える。

| ヘルパー | 用途 |
|---------|------|
| `hcForeground(fallback)` | 前景色。ノードの枠線、リンク色、ラベル色に使用 |
| `hcBackground(fallback)` | 背景色。リンクラベルの背景に使用 |
| `hcForegroundSelected(fallback)` | 選択色。フォーカスインジケータ、ホバー時のハイライトに使用 |

ハイコントラストモードでは以下の変更が適用される。

- グラデーションモードが無効化される（代わりに `hcForeground` 単色を使用）
- ノード矩形にストローク（1px）が追加される
- リンクの基本不透明度が `0.8` に固定される
- レイヤーカラーモードのラベル色が無効化される

### 7.5 ブックマーク対応

`selectionManager.registerOnSelectCallback()` により、ブックマーク復元時の選択状態変更を検知し、`updateSelectionState()` を呼び出して視覚状態を更新する。

---

## 8. 型システム

### 8.1 主要な型定義

#### SankeyNodeDatum

d3-sankey に渡すノードの入力データ。

```typescript
export interface SankeyNodeDatum {
  id: string;               // ノードの一意識別子
  name: string;             // 表示名
  color?: string;           // ノード色
  selectionId?: ISelectionId; // Power BI 選択ID
  originalId?: string;      // 循環参照解決時の元ノードID
}
```

`originalId` はサイクル解決時にノードが複製された場合にのみ設定される。`getFormattingModel()` では `originalId` が設定されたノードをカラーピッカーの対象外にし、複製ノードのカラーピッカーが重複して表示されることを防ぐ。

#### SankeyLinkDatum

d3-sankey に渡すリンクの入力データ。

```typescript
export interface SankeyLinkDatum {
  source: string;              // source ノードID
  target: string;              // target ノードID
  value: number;               // フロー量
  selectionIds?: ISelectionId[]; // 関連する Power BI 選択ID（複数行の集約の場合）
}
```

`selectionIds` が配列なのは、同一の source-target ペアの複数行が1つのリンクに集約されるためである。クロスフィルタリング時には `selectionIds.some(...)` でいずれかの行が選択されているかを判定する。

#### ComputedNode / ComputedLink

d3-sankey のレイアウト計算後のノード・リンクデータ。`SankeyNode`/`SankeyLink` のジェネリクス型として定義される。

```typescript
export type ComputedNode = SankeyNode<SankeyNodeDatum, SankeyLinkDatum>;
export type ComputedLink = SankeyLink<SankeyNodeDatum, SankeyLinkDatum>;
```

計算後に追加されるプロパティ:
- `ComputedNode`: `x0`, `x1`, `y0`, `y1`, `depth`, `height`, `value`, `sourceLinks`, `targetLinks`
- `ComputedLink`: `y0`, `y1`, `width`, `source`（ComputedNode に解決済み）, `target`（ComputedNode に解決済み）

#### resolveNode() の必要性

d3-sankey は `link.source`/`link.target` の型を `string | number | ComputedNode` のユニオン型で定義する。レイアウト計算後は必ず `ComputedNode` に解決されているが、TypeScript の型上は依然としてユニオン型のままである。`resolveNode()` は型安全にオブジェクトへアクセスするためのヘルパーである。

```typescript
export function resolveNode(endpoint: string | number | ComputedNode): ComputedNode {
  if (typeof endpoint === 'object' && endpoint !== null && 'id' in endpoint) {
    return endpoint;
  }
  throw new Error(`Expected resolved ComputedNode but got ${typeof endpoint}`);
}
```

#### linkDatum()

`ComputedLink` から元の `SankeyLinkDatum` のプロパティ（特に `selectionIds`）にアクセスするためのヘルパー。d3-sankey は計算後に `source`/`target` をオブジェクト参照に置き換えるが、元のプロパティは保持されている。

```typescript
function linkDatum(link: ComputedLink): SankeyLinkDatum {
  return link as unknown as SankeyLinkDatum;
}
```

### 8.2 設定関連の型

```typescript
export type LinkSortMode = 'ascending' | 'descending' | 'byValue' | 'byValueDesc' | 'inputOrder' | 'none';
export type NodeColorMode = 'single' | 'category' | 'layer';
export type LinkColorMode = 'source' | 'target' | 'gradient' | 'fixed' | 'layer';
export type LabelColorMode = 'single' | 'layer';
export type DataLabelDisplayMode = 'value' | 'percentage' | 'both';
```

各型に対応するバリデーション配列が `VALID_*` 定数として定義されている。

### 8.3 TransformDataViewOptions

`transformDataView()` の引数をまとめたインターフェース。

```typescript
export interface TransformDataViewOptions {
  dataView: DataView | undefined;
  host: IVisualHost;
  nodeColorMode?: NodeColorMode;
  nodeDefaultColor?: string;
}
```

---

## 9. テスト方針

### 9.1 テスト戦略

テストは `src/visual.test.ts` に集約され、Vitest フレームワークで実行される。テスト対象はエクスポートされた純粋関数のみであり、DOM 操作や Power BI ホストとのインタラクションを含む `Visual` クラスのメソッドは直接テストしない。

テスト対象関数:
- `extractDropdownValue()`
- `extractFillColor()`
- `extractValidatedDropdown()`
- `getLinkSortFunction()`
- `resolveNode()`
- `parseSettings()`
- `transformDataView()`
- `resolveCycles()`
- エクスポートされた定数群

### 9.2 Power BI モジュールのモック

Power BI のフォーマットモジュールは DOM や Power BI ランタイムに依存するため、テスト開始時に `vi.mock()` でモック化する。

```typescript
vi.mock('powerbi-visuals-utils-formattingmodel', () => ({
  formattingSettings: {
    SimpleCard: class {},
    Model: class {},
    NumUpDown: class { constructor() {} },
    // ...
  },
  FormattingSettingsService: class {},
}));

vi.mock('powerbi-visuals-utils-formattingutils', () => ({
  valueFormatter: {
    create: () => ({ format: (v: number) => String(v) }),
  },
}));
```

### 9.3 テストの分類

| テスト対象 | テスト数の目安 | テストの内容 |
|-----------|-------------|------------|
| `extractDropdownValue` | 9 | null/undefined/string/object/{value: null} 等の入力パターン |
| `extractFillColor` | 8 | undefined/null/{}/{solid: {}}/{solid: {color: ...}} 等 |
| `extractValidatedDropdown` | 8 | バリデーション配列への照合、各 VALID_* 定数との結合テスト |
| `getLinkSortFunction` | 13 | 各モードの戻り値型・ソート結果の検証 |
| `resolveNode` | 9 | ComputedNode/string/number/null/undefined/配列等の入力検証 |
| `parseSettings` | 14 | 各設定プロパティの個別パース・デフォルトフォールバック・一括設定 |
| `transformDataView` | 18 | null/不正値/集約/自己ループスキップ/カラーモード/selectionId |
| `resolveCycles` | 9 | 非サイクル/空入力/2ノードサイクル/3ノードサイクル/複数サイクル/不変性 |
| エクスポート定数 | 6 | 各定数の値・配列長の検証 |

### 9.4 テスト実行

```bash
npm test          # Vitest 実行
npm run type-check # TypeScript 型チェック (tsc --noEmit)
```

---

## 10. 定数・マジックナンバー

全てのマジックナンバーは名前付き定数として定義されており、コード内にハードコードされた数値は存在しない。

### レンダリング定数

| 定数名 | 値 | 用途 |
|--------|-----|------|
| `LABEL_OFFSET` | `6` (px) | ノード矩形の端からラベルテキストまでのギャップ |
| `MIN_LINK_WIDTH_FOR_LABEL` | `8` (px) | リンクラベルを表示する最小リンク幅 |
| `LINK_LABEL_PADDING` | `4` (px) | リンクラベル背景矩形の内側パディング |
| `CHAR_WIDTH_RATIO` | `0.6` | フォントサイズに対する文字幅の概算比率 |
| `TEXT_LINE_HEIGHT` | `1.4` | テキスト要素の行高倍率 |
| `BG_LABEL_BORDER_RADIUS` | `3` (px) | リンクラベル背景の角丸半径 |
| `BG_LABEL_OPACITY` | `0.9` | リンクラベル背景の不透明度 |
| `FOCUS_STROKE_WIDTH` | `2` (px) | キーボードフォーカスインジケータのストローク幅 |
| `FOCUS_DASH_ARRAY` | `'4,2'` | キーボードフォーカスインジケータの破線パターン |

### カラー定数

| 定数名 | 値 | 用途 |
|--------|-----|------|
| `MAX_LAYER_COLORS` | `10` | サポートするレイヤー色の最大数 |
| `DEFAULT_LAYER_PALETTE` | 10色配列 | レイヤーモードのデフォルトカラーパレット |

`DEFAULT_LAYER_PALETTE` の色一覧:

| インデックス | 色コード | 色名（概要） |
|-------------|---------|------------|
| 0 | `#4e79a7` | ブルー |
| 1 | `#f28e2b` | オレンジ |
| 2 | `#e15759` | レッド |
| 3 | `#76b7b2` | ティール |
| 4 | `#59a14f` | グリーン |
| 5 | `#edc948` | イエロー |
| 6 | `#b07aa1` | パープル |
| 7 | `#ff9da7` | ピンク |
| 8 | `#9c755f` | ブラウン |
| 9 | `#bab0ac` | グレー |

このパレットは固定であり、あるレイヤーの色を変更しても他のレイヤーの色がシフトしないように設計されている（Tableau 10 パレットに基づく）。

### デフォルト設定値

| プロパティ | デフォルト値 | 備考 |
|-----------|-------------|------|
| `nodeWidth` | `24` (px) | |
| `nodePadding` | `16` (px) | |
| `iterations` | `6` | d3-sankey レイアウト反復回数 |
| `nodeDefaultColor` | `'#1f77b4'` | D3 カテゴリカラーの最初の色 |
| `nodeColorMode` | `'category'` | |
| `linkOpacity` | `0.5` | 50% |
| `linkColorMode` | `'source'` | |
| `linkDefaultColor` | `'#aaa'` | |
| `linkSort` | `'ascending'` | 交差最小化 |
| `showLinkLabels` | `false` | |
| `linkLabelFontSize` | `10` (px) | |
| `labelFontSize` | `12` (px) | |
| `labelColor` | `'#333333'` | |
| `labelColorMode` | `'single'` | |
| `labelFontFamily` | `"'Segoe UI', sans-serif"` | Power BI 標準フォント |
| `showLabels` | `true` | |
| `showDataLabels` | `false` | |
| `dataLabelFontSize` | `10` (px) | |
| `dataLabelColor` | `'#666666'` | |
| `dataLabelFontFamily` | `"'Segoe UI', sans-serif"` | |
| `dataLabelDisplayMode` | `'value'` | |
| `displayUnits` | `0` | Auto |
| `decimalPlaces` | `1` | |
| `percentDecimalPlaces` | `1` | |
| `marginTop` | `20` (px) | |
| `marginRight` | `120` (px) | ラベル表示領域確保のため大きめ |
| `marginBottom` | `20` (px) | |
| `marginLeft` | `120` (px) | ラベル表示領域確保のため大きめ |

### バリデーション配列

| 定数名 | 要素 |
|--------|------|
| `VALID_LINK_SORT_MODES` | `['ascending', 'descending', 'byValue', 'byValueDesc', 'inputOrder', 'none']` |
| `VALID_NODE_COLOR_MODES` | `['single', 'category', 'layer']` |
| `VALID_LINK_COLOR_MODES` | `['source', 'target', 'gradient', 'fixed', 'layer']` |
| `VALID_LABEL_COLOR_MODES` | `['single', 'layer']` |
| `VALID_DATA_LABEL_DISPLAY_MODES` | `['value', 'percentage', 'both']` |
