# 営業日報システム

営業担当者が日々の顧客訪問記録・課題・翌日計画を報告し、上長がフィードバックを行う営業日報管理システムです。

## 技術スタック

| レイヤー | 技術 |
|----------|------|
| フロントエンド | React 18 / TypeScript / Vite / TanStack Query |
| バックエンド | Node.js / Express / TypeScript |
| ORM | Prisma |
| データベース | PostgreSQL 16 |
| 認証 | JWT (Bearer Token) |
| コンテナ | Docker / Docker Compose |

## 機能概要

- **ユーザー管理**: 営業（sales）・上長（manager）のロールベース認証
- **日報管理**: 日付ごとの日報作成・編集・提出（draft → submitted → reviewed）
- **訪問記録**: 1日報に複数の顧客訪問記録（ドラッグ＆ドロップで並び替え可能）
- **Problem / Plan**: 課題・翌日計画の記入
- **コメント機能**: 上長による日報へのフィードバック
- **マスタ管理**: 顧客・ユーザーの登録・編集・削除

## ディレクトリ構成

```
.
├── src/                  # バックエンド（Express）
│   ├── controllers/      # リクエスト処理
│   ├── services/         # ビジネスロジック
│   ├── middleware/       # 認証・認可ミドルウェア
│   ├── routes/           # ルーティング
│   └── types/            # 型定義
├── frontend/             # フロントエンド（React）
│   └── src/
├── prisma/               # DBスキーマ・シードデータ
├── tests/                # テストコード
├── doc/                  # 設計ドキュメント
└── docker-compose.yml
```

## セットアップ（Docker）

```bash
docker compose up --build
```

起動後:
- フロントエンド: http://localhost:5173
- バックエンド API: http://localhost:3000

シードデータのログイン情報:

| ロール | メールアドレス | パスワード |
|--------|--------------|-----------|
| sales | yamada@example.com | password123 |
| manager | sato@example.com | password123 |

## ローカル開発

```bash
# 依存パッケージインストール
npm install

# DB起動（Docker）
docker compose up db -d

# マイグレーション & シード
npm run db:migrate
npm run db:seed

# バックエンド起動
npm run dev

# フロントエンド起動（別ターミナル）
cd frontend && npm install && npm run dev
```

## テスト

```bash
npm test
```

## 環境変数

バックエンド（`.env`）:

| 変数名 | 説明 | デフォルト |
|--------|------|-----------|
| `DATABASE_URL` | PostgreSQL 接続 URL | - |
| `JWT_SECRET` | JWT 署名シークレット | - |
| `JWT_EXPIRES_IN` | JWT 有効期限 | `7d` |
| `PORT` | サーバーポート | `3000` |

## ドキュメント

- [ER図](doc/er_digram.mmd)
- [画面定義書](doc/screen_definition.md)
- [API仕様書](doc/api_spec.md)
- [テスト仕様書](doc/test_spec.md)
- [システム構成図](doc/system_architecture.md)
