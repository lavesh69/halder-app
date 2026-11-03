# HALDER (हलधर) — 農家直結マーケットプレイス＆物流エコシステム

[![HALDER CI/CD Pipeline](https://github.com/lavesh69/halder-app/actions/workflows/ci.yml/badge.svg)](https://github.com/lavesh69/halder-app/actions/workflows/ci.yml)
[![Build Android APK & AAB](https://github.com/lavesh69/halder-app/actions/workflows/build-apk.yml/badge.svg)](https://github.com/lavesh69/halder-app/actions/workflows/build-apk.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/badge/Node.js-%E2%89%A522.5.0-brightgreen.svg)](https://nodejs.org/)

**HALDER** (हलधर) は、インド全土の小規模農家や商業農場と、消費者、大口購入者、外食産業を直接繋ぐエンタープライズグレードの農業マーケットプレイスです。中間マージンを排除することで、農家の収益性を向上させ、半径300km以内の地域に朝採れの新鮮な農産物を届けます。

---

## 🌾 主要モジュール

### 1. 購入者・消費者体験
- **近隣地域ジオロケーション探索:** ハーバーサイン公式による半径300kmの地域検索。
- **鮮度と収穫の透明性:** 朝採れ表示、有機認証、産地直送の透明性。
- **スマートカートと複数農家注文:** 農家直送、冷蔵配送、店頭受取のグループ会計。
- **安全な配送:** OTPによる受取確認とリアルタイム位置追跡。
- **リアルタイムチャット:** 5言語（英語、ヒンディー語、パンジャーブ語、ベンガル語、マラーティー語）に対応したWebSocketチャット。

### 2. 農家向けビジネス管理
- **農場プロファイルと土地管理:** 土壌、灌漑設備、認証、収穫スケジュール。
- **農産物と在庫管理:** 単価設定、単位換算（kg、束、箱、リットル）、在庫スイッチ。
- **マンディ（卸売市場）市況データ:** APMC市場価格の推移分析、指標データ、CSVエクスポート。
- **売上台帳と出金管理:** リアルタイム売上集計、10%手数料自動計算、出金リクエスト台帳。

### 3. 物流と Kisan 配送ネットワーク
- **車両登録とパートナー管理:** 2輪車、軽貨物、冷蔵車、トラクターの車両および運転免許証の審査。
- **位置情報テレメトリ:** GPS座標範囲検証（-90 <= lat <= 90, -180 <= lng <= 180）と本人権限確認。
- **配送アナリティクス:** データベース実績に基づく配送所要時間と時間内配送率の算出。
- **農家自社配送（Kisan Direct）:** 生産者が直接届けるゼロ手数料配送。

### 4. B2B 卸売・契約農業
- **大口見積（RFQ）:** 最低発注数量（MOQ）、ボリュームディスカウント、自動見積。
- **契約農業予約:** マイルストーン設定による先行買取契約。

### 5. 管理・ガバナンス
- **RBAC（ロールベースアクセス制御）:** 顧客、農家、配達員、管理者の権限分離。
- **IDOR防御:** 注文や商品、位置情報の不正アクセス防止。
- **農家KYC審査:** 身分証明書および土地権利証の確認。
- **監査ログ:** 変更不可の操作監査証跡。

---

## 🛠️ 技術スタック

- **フロントエンド:** React 19, TypeScript, Vite, Tailwind CSS v4, Lucide React
- **モバイル:** Capacitor 8 Android SDK
- **バックエンド:** Node.js (>=22.5.0), Express.js, TypeScript
- **データベース:** SQLite 3 (`node:sqlite` DatabaseSync, WALモード)
- **リアルタイム:** WebSocket (`ws`)
- **多言語対応:** 英語、ヒンディー語、パンジャーブ語、ベンガル語、マラーティー語

---

## 🚀 セットアップ

```bash
# 依存関係のインストール
npm install

# データベースの初期化とシード
npm run server:seed

# バックエンドの起動 (http://localhost:5000)
npm run server

# フロントエンド開発サーバーの起動 (http://localhost:5173)
npm run dev
```

## 📄 ライセンス

[MIT License](LICENSE) の下で提供されています。
