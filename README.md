# Resource Monitor - Chrome Extension

ウェブページのリソース読み込み状況をリアルタイムで監視・分析するChrome拡張機能

## 📋 機能概要

### MVP機能
- ✅ ページロード時のリソース一覧取得
- ✅ URL、タイプ、開始・終了時刻、サイズの詳細情報
- ✅ DevTools パネル内での表示
- ✅ タイムライン表示（縦軸：リソース、横軸：時間）
- ✅ タイプ別フィルタリング（stylesheet, script, image, font, xhr, other）
- ✅ ソート機能（開始時刻 / サイズ / タイプ）

## 🛠️ 技術スタック

- **言語**: JavaScript (ES6+)
- **フレームワーク**: プレーンJS + HTML/CSS
- **APIs**: Chrome Extension APIs, Performance API, Resource Timing API
- **バージョン管理**: GitHub

## 📁 プロジェクト構造

```
resource-monitor-extension/
├── manifest.json           # 拡張機能設定ファイル
├── devtools.html          # DevTools統合ポイント
├── devtools.js            # DevTools設定
├── panel.html             # メインパネルUI
├── panel.js               # パネルロジック
├── panel.css              # パネルスタイル
├── content.js             # コンテンツスクリプト
├── background.js          # バックグラウンド処理
├── icons/                 # アイコンファイル
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md              # このファイル
```

## 🚀 開発進行状況

- [x] プロジェクト構造設計
- [ ] manifest.json作成
- [ ] DevToolsパネル基盤作成
- [ ] リソース情報収集機能
- [ ] タイムラインUI実装
- [ ] フィルタリング・ソート機能
- [ ] テスト・デバッグ
- [ ] Chrome Web Store公開

## 📦 インストール方法（開発版）

1. Chrome で `chrome://extensions/` を開く
2. 「デベロッパーモード」を有効化
3. 「パッケージ化されていない拡張機能を読み込む」をクリック
4. このディレクトリを選択

## 🎯 将来の拡張計画

- TypeScript移行
- React/Vue導入
- ビルドツール（Webpack/Rollup）導入
- 詳細なパフォーマンス分析機能
- エクスポート機能
- カスタムフィルター

## 📄 ライセンス

MIT License

---

開発開始日: 2024年9月27日