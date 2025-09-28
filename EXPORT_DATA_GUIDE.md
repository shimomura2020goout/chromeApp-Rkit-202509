# R kit エクスポートデータ仕様書

## 概要
R kit（Resource Monitor Extension）からエクスポートされるJSONファイルの構造と項目について説明します。

## JSONファイル構造

### トップレベル構造
```json
{
  "metadata": { ... },
  "timeUnit": "seconds",
  "fieldDescriptions": { ... },
  "resources": [ ... ]
}
```

## 詳細項目説明

### metadata（メタデータ）
エクスポートファイルの基本情報

| 項目 | 説明 |
|------|------|
| `tool` | 使用ツール名（"R kit - Resource Monitor Extension"） |
| `version` | ツールのバージョン |
| `exportedAt` | エクスポート実行日時（ISO 8601形式） |
| `resourceCount` | 収集されたリソースの総数 |
| `description` | データの説明 |

### timeUnit（時間単位）
すべての時間関連データの単位（"seconds"固定）

### resources（リソースデータ配列）
各リソースの詳細情報

#### 基本情報
| 項目 | データ型 | 説明 |
|------|----------|------|
| `name` | string | リソースファイル名（URLから抽出されたファイル名） |
| `url` | string | リソースの完全URL |
| `domain` | string | リソースのドメイン名 |
| `type` | string | リソースタイプ（下記参照） |

#### タイミング情報
| 項目 | データ型 | 説明 |
|------|----------|------|
| `startTime` | number | リソース読み込み開始時刻（秒、小数点3桁） |
| `endTime` | number | リソース読み込み終了時刻（秒、小数点3桁） |
| `duration` | number | 読み込み所要時間（endTime - startTime）（秒、小数点3桁） |

**重要**: すべての時間は Performance API の `performance.timing.navigationStart` を基準とした相対時間です。

#### サイズ情報
| 項目 | データ型 | 説明 |
|------|----------|------|
| `size` | number | リソースサイズ（バイト）※1 |
| `transferSize` | number | ネットワーク転送サイズ（バイト）※2 |
| `encodedBodySize` | number | エンコード済みボディサイズ（バイト）※3 |
| `decodedBodySize` | number | デコード済みボディサイズ（バイト）※4 |

**※1 size算出ルール**: `transferSize > encodedBodySize > decodedBodySize` の優先順位で取得  
**※2 transferSize**: HTTPヘッダー含むネットワーク転送量  
**※3 encodedBodySize**: 圧縮後のレスポンスボディサイズ  
**※4 decodedBodySize**: 圧縮前のレスポンスボディサイズ  
**※5 isCachedResource**: すべてのサイズ情報が0で実際にレスポンスが返ってきている場合（CORS制限によるCDNリソース等）  

#### ステータス情報
| 項目 | データ型 | 説明 |
|------|----------|------|
| `status` | string | 読み込み状態（"success" または "error"） |
| `cookies` | number | 関連するCookieの数 |
| `cookieDetails` | string/null | Cookie詳細文字列（document.cookieから取得） |
| `isCachedResource` | boolean | CDN/クロスオリジンリソース判定フラグ※5 |

## リソースタイプ一覧

| タイプ | 説明 | 判定基準 |
|--------|------|----------|
| `document` | HTMLドキュメント | ナビゲーションエントリ |
| `stylesheet` | CSS スタイルシート | .css拡張子またはlinkタグ |
| `script` | JavaScript | .js拡張子またはscriptタグ |
| `image` | 画像ファイル | .png, .jpg, .jpeg, .gif, .svg, .webp, .ico |
| `font` | フォントファイル | .woff, .woff2, .ttf, .otf, .eot |
| `xmlhttprequest` | AJAX/Fetch通信 | XMLHttpRequestまたはFetch API |
| `other` | その他 | 上記以外のすべてのリソース |

## データ取得の制限事項

### Performance API制限
- ブラウザのデフォルト制限により、通常150-250個のリソースまでが取得対象
- 大量リソースのサイトでは一部のリソースが欠落する可能性があります

### CDN/クロスオリジンリソース
- クロスオリジンポリシーにより、一部のサイズ情報が取得できない場合があります
- 特にCDNからのリソース（例：r.r10s.jp）ではサイズが0になることがあります
- このような場合、UI上では「cache」と表示され、エクスポートデータでは`isCachedResource: true`が設定されます
- これはセキュリティ上の制限であり、ツールの制約ではありません

### Cookie情報
- Cookieデータはページロード時の`document.cookie`から取得
- HttpOnlyクッキーやSecureクッキーの一部は取得できません
- 個別リソースごとのCookie情報は技術的制限により取得困難

## 使用例

### データ分析
```javascript
// エクスポートファイルを読み込み
const data = JSON.parse(exportedJson);

// 最も時間のかかったリソースを検索
const slowestResource = data.resources
  .sort((a, b) => b.duration - a.duration)[0];

// ドメイン別サイズ集計
const sizeByDomain = data.resources.reduce((acc, resource) => {
  acc[resource.domain] = (acc[resource.domain] || 0) + resource.size;
  return acc;
}, {});
```

### パフォーマンス監視
- 読み込み時間の分析
- リソースサイズの最適化検討
- CDN効果の測定
- サードパーティリソースの影響調査

## 更新履歴
- v1.0.0: 初期版作成、時間単位を秒に変更、詳細メタデータ追加