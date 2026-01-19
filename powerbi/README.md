# Sankey Chart - Power BI Custom Visual

Power BI用のSankey Chartカスタムビジュアルです。

## セットアップ

### 1. 依存関係のインストール

```bash
# powerbiディレクトリで実行
cd powerbi
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

### 4. アイコンの作成

`assets/icon.svg` を 20x20 の PNG に変換して `assets/icon.png` として保存してください。

オンラインツールや以下のコマンドで変換できます：

```bash
# ImageMagickを使用する場合
convert assets/icon.svg -resize 20x20 assets/icon.png

# またはresvgを使用する場合
resvg assets/icon.svg assets/icon.png -w 20 -h 20
```

## 開発

### 開発サーバーの起動

```bash
pbiviz start
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

## パッケージング

```bash
pbiviz package
```

`dist/` ディレクトリに `.pbiviz` ファイルが生成されます。

## Power BI Desktop へのインポート

1. Power BI Desktop でレポートを開く
2. ビジュアルパネルの「...」→「ファイルからビジュアルをインポート」
3. 生成された `.pbiviz` ファイルを選択

## ディレクトリ構造

```
powerbi/
├── pbiviz.json         # ビジュアルメタデータ
├── capabilities.json   # データロール定義
├── tsconfig.json       # TypeScript設定
├── package.json        # 依存関係
├── assets/
│   ├── icon.svg        # アイコン（SVG）
│   └── icon.png        # アイコン（PNG、要作成）
└── style/
    └── visual.less     # スタイル
```

## 設定オプション

### Nodes（ノード）
- **Width**: ノードの幅
- **Padding**: ノード間の間隔
- **Default Color**: デフォルトの色

### Links（リンク）
- **Color Mode**: 色のモード（Source/Target/Gradient/Fixed）
- **Opacity**: 透明度

### Labels（ラベル）
- **Show Labels**: ラベルの表示/非表示
- **Font Size**: フォントサイズ
- **Color**: ラベルの色

### Animation（アニメーション）
- **Enable Animation**: アニメーションの有効/無効
- **Duration**: アニメーション時間（ms）

## トラブルシューティング

### ビジュアルが表示されない
- 開発者ビジュアルが有効になっているか確認
- コンソールでエラーを確認
- `pbiviz start` が正常に実行されているか確認

### データが表示されない
- Source、Target、Valueの全フィールドがマッピングされているか確認
- データに null 値がないか確認
- Value が正の数値であることを確認

## ライセンス

MIT License
