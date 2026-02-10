# Sankey Chart - Power BI Custom Visual

Power BI用のSankey Chartカスタムビジュアルです。

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. Power BI 開発者ツールのインストール

グローバルにpbivizをインストール：

```bash
npm install -g powerbi-visuals-tools
```

### 3. 証明書の設定

初回のみ実行：

```bash
pbiviz --install-cert
```

## 開発

### 開発サーバーの起動

```bash
npm run start
```

### Power BI Desktop での確認

1. Power BI Desktop を起動
2. ファイル → オプションと設定 → オプション → セキュリティ
3. 「カスタムビジュアル」セクションで「開発者ビジュアルを有効にする」をオン
4. レポートを作成し、ビジュアルパネルから「開発者ビジュアル」を追加

### データフィールドのマッピング

- **Source**: フローの開始ノード
- **Target**: フローの終了ノード
- **Value**: フローの値（量）

## テスト

```bash
npm test
```

## パッケージング

```bash
npm run package
```

`dist/` ディレクトリに `.pbiviz` ファイルが生成されます。

## Power BI Desktop へのインポート

1. Power BI Desktop でレポートを開く
2. ビジュアルパネルの「...」→「ファイルからビジュアルをインポート」
3. 生成された `.pbiviz` ファイルを選択

## ディレクトリ構造

```
├── pbiviz.json          # ビジュアルメタデータ
├── capabilities.json    # データロール・フォーマット定義
├── tsconfig.json        # TypeScript設定
├── package.json         # 依存関係
├── README.md
├── assets/
│   ├── icon.svg         # アイコン（SVG）
│   └── icon.png         # アイコン（PNG）
├── src/
│   ├── visual.ts        # ビジュアル本体（全ロジック）
│   └── visual.test.ts   # テスト
├── style/
│   └── visual.less      # スタイル
└── stringResources/
    ├── en-US/resources.resjson
    └── ja-JP/resources.resjson
```

## 設定オプション

### Nodes（ノード）
- **Width**: ノードの幅
- **Padding**: ノード間の間隔
- **Layout Iterations**: レイアウト最適化の反復回数
- **Color Mode**: Category Colors / Single Color / By Layer
- **Default Color**: 単色モード時のデフォルト色

### Links（リンク）
- **Default Color**: デフォルトの色
- **Color Mode**: Source / Target / Gradient / Fixed / By Layer
- **Opacity**: 透明度（%）
- **Link Sort**: リンクの並び順

### Node Labels（ノードラベル）
- **Show**: 表示/非表示
- **Font Size**: フォントサイズ
- **Color**: ラベルの色
- **Color Mode**: Single Color / By Layer
- **Font**: フォントファミリー

### Node Data Labels（ノードデータラベル）
- **Show**: 表示/非表示
- **Font Size**: フォントサイズ
- **Color**: ラベルの色
- **Font**: フォントファミリー
- **Display Units**: 表示単位（Auto / None / Thousands / Millions / Billions）
- **Display Mode**: Value / Percentage / Value & Percentage
- **Decimal Places**: 小数点以下の桁数

### Link Labels（リンクラベル）
- **Show**: 表示/非表示
- **Font Size**: フォントサイズ

### Margins（マージン）
- **Top / Right / Bottom / Left**: 各方向のマージン

### Layer Colors
- ノード・リンク・ラベルそれぞれに最大10レイヤー分の色を設定可能

## トラブルシューティング

### ビジュアルが表示されない
- 開発者ビジュアルが有効になっているか確認
- コンソールでエラーを確認
- `npm run start` が正常に実行されているか確認

### データが表示されない
- Source、Target、Valueの全フィールドがマッピングされているか確認
- データに null 値がないか確認
- Value が正の数値であることを確認

## ライセンス

MIT License
