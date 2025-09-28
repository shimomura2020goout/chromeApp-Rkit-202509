# R kit - Chrome Extension

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

### Phase 1: MVP版（完了）
- [x] プロジェクト構造設計
- [x] manifest.json作成
- [x] DevToolsパネル基盤作成
- [x] リソース情報収集機能
- [x] タイムラインUI実装
- [x] フィルタリング・ソート機能
- [x] CDNリソース判定機能
- [x] エクスポート機能
- [x] テスト・デバッグ
- [x] Chrome Web Store申請

### Phase 2: 高度なパフォーマンス分析機能（有料版）
- [ ] 詳細パフォーマンス分析機能
  - [ ] PC/モバイル表示パフォーマンス比較
  - [ ] Core Web Vitals測定（LCP、FID、CLS）
  - [ ] Network waterfall分析
  - [ ] バンドルサイズ分析
- [ ] 履歴比較機能
  - [ ] 前回測定値との比較表示
  - [ ] リソース数・サイズ・読み込み時間の変化トレンド
  - [ ] パフォーマンススコアの推移
  - [ ] 改善・悪化項目のハイライト
- [ ] サブスクリプション機能
  - [ ] 無料版制限（基本機能のみ）
  - [ ] 有料版（月額課金）
  - [ ] ライセンス認証システム
  - [ ] ユーザーアカウント管理

### Phase 3: エンタープライズ機能（将来計画）
- [ ] チーム機能
- [ ] CI/CD統合
- [ ] レポート自動生成
- [ ] API提供

## 📦 インストール方法

### Chrome Web Store版（推奨）
1. Chrome Web Storeで「R kit」を検索
2. 「Chromeに追加」をクリック
3. DevToolsを開き「R kit」タブを使用

### 開発版
1. Chrome で `chrome://extensions/` を開く
2. 「デベロッパーモード」を有効化
3. 「パッケージ化されていない拡張機能を読み込む」をクリック
4. このディレクトリを選択

## 💰 料金プラン

### 無料版
- ✅ 基本リソース監視
- ✅ タイムライン表示
- ✅ フィルタリング・ソート
- ✅ 基本エクスポート機能
- ❌ 履歴比較機能
- ❌ 詳細パフォーマンス分析

### Pro版（月額 ¥980）
- ✅ 無料版すべての機能
- ✅ 詳細パフォーマンス分析
- ✅ PC/モバイル比較
- ✅ Core Web Vitals測定
- ✅ 履歴比較・トレンド分析
- ✅ 高度なレポート機能
- ✅ 優先サポート

## 🎯 技術ロードマップ

### 短期（3ヶ月）
- TypeScript移行
- ユーザー認証システム実装
- 基本的な履歴保存機能

### 中期（6ヶ月）
- React/Vue導入によるUI刷新
- 詳細パフォーマンス分析機能
- モバイル対応強化

### 長期（1年）
- ビルドツール（Webpack/Rollup）導入
- エンタープライズ機能
- API提供開始

## 📄 ライセンス

MIT License

---

開発開始日: 2025年9月28日
