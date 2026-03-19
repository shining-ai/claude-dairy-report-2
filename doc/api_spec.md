# 営業日報システム API仕様書

## 基本仕様

| 項目 | 内容 |
|------|------|
| ベースURL | `/api/v1` |
| データ形式 | JSON |
| 認証方式 | Bearer Token（JWT） |
| 文字コード | UTF-8 |

### 共通リクエストヘッダー

```
Content-Type: application/json
Authorization: Bearer {token}
```

### 共通レスポンス形式

**成功時**
```json
{
  "data": { ... }
}
```

**エラー時**
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "エラーメッセージ"
  }
}
```

### HTTPステータスコード

| コード | 意味 |
|--------|------|
| 200 | OK |
| 201 | Created |
| 204 | No Content |
| 400 | Bad Request（バリデーションエラー） |
| 401 | Unauthorized（未認証） |
| 403 | Forbidden（権限なし） |
| 404 | Not Found |
| 409 | Conflict（重複登録など） |
| 500 | Internal Server Error |

---

## エンドポイント一覧

| # | メソッド | パス | 概要 | 権限 |
|---|----------|------|------|------|
| 1 | POST | `/auth/login` | ログイン | 全員 |
| 2 | POST | `/auth/logout` | ログアウト | 認証済み |
| 3 | GET | `/auth/me` | 自分の情報取得 | 認証済み |
| 4 | GET | `/reports` | 日報一覧取得 | sales / manager |
| 5 | POST | `/reports` | 日報作成 | sales |
| 6 | GET | `/reports/:id` | 日報詳細取得 | sales / manager |
| 7 | PUT | `/reports/:id` | 日報更新 | sales（自分・draft のみ） |
| 8 | PATCH | `/reports/:id/submit` | 日報提出 | sales（自分・draft のみ） |
| 9 | PATCH | `/reports/:id/review` | 日報確認済みにする | manager |
| 10 | POST | `/reports/:id/visits` | 訪問記録追加 | sales（自分・draft のみ） |
| 11 | PUT | `/reports/:id/visits/:visit_id` | 訪問記録更新 | sales（自分・draft のみ） |
| 12 | DELETE | `/reports/:id/visits/:visit_id` | 訪問記録削除 | sales（自分・draft のみ） |
| 13 | PATCH | `/reports/:id/visits/reorder` | 訪問記録並び替え | sales（自分・draft のみ） |
| 14 | GET | `/reports/:id/comments` | コメント一覧取得 | sales / manager |
| 15 | POST | `/reports/:id/comments` | コメント追加 | manager |
| 16 | DELETE | `/reports/:id/comments/:comment_id` | コメント削除 | manager（自分のコメントのみ） |
| 17 | GET | `/customers` | 顧客一覧取得 | sales / manager |
| 18 | POST | `/customers` | 顧客登録 | manager |
| 19 | GET | `/customers/:id` | 顧客詳細取得 | sales / manager |
| 20 | PUT | `/customers/:id` | 顧客更新 | manager |
| 21 | DELETE | `/customers/:id` | 顧客削除 | manager |
| 22 | GET | `/users` | ユーザー一覧取得 | manager |
| 23 | POST | `/users` | ユーザー登録 | manager |
| 24 | GET | `/users/:id` | ユーザー詳細取得 | manager |
| 25 | PUT | `/users/:id` | ユーザー更新 | manager |
| 26 | DELETE | `/users/:id` | ユーザー削除 | manager |

---

## 認証 API

### POST `/auth/login`

ログインしてトークンを取得する。

**リクエスト**
```json
{
  "email": "yamada@example.com",
  "password": "password123"
}
```

**レスポンス `200`**
```json
{
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "user_id": 1,
      "name": "山田 太郎",
      "email": "yamada@example.com",
      "role": "sales",
      "department": "東京営業部"
    }
  }
}
```

**エラー `401`**
```json
{
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "メールアドレスまたはパスワードが正しくありません"
  }
}
```

---

### POST `/auth/logout`

ログアウトしてトークンを無効化する。

**レスポンス `204`**
レスポンスボディなし

---

### GET `/auth/me`

ログイン中のユーザー情報を取得する。

**レスポンス `200`**
```json
{
  "data": {
    "user_id": 1,
    "name": "山田 太郎",
    "email": "yamada@example.com",
    "role": "sales",
    "department": "東京営業部"
  }
}
```

---

## 日報 API

### GET `/reports`

日報一覧を取得する。sales は自分の日報のみ、manager は全員の日報を取得できる。

**クエリパラメーター**

| パラメーター | 型 | 必須 | 説明 |
|-------------|-----|------|------|
| `date_from` | string (YYYY-MM-DD) | - | 日付範囲（開始） |
| `date_to` | string (YYYY-MM-DD) | - | 日付範囲（終了） |
| `user_id` | integer | - | 担当者ID（manager のみ有効） |
| `status` | string | - | `draft` / `submitted` / `reviewed` |
| `page` | integer | - | ページ番号（デフォルト: 1） |
| `per_page` | integer | - | 1ページの件数（デフォルト: 20） |

**レスポンス `200`**
```json
{
  "data": {
    "reports": [
      {
        "report_id": 10,
        "report_date": "2026-03-20",
        "user": {
          "user_id": 1,
          "name": "山田 太郎"
        },
        "status": "submitted",
        "visit_count": 3,
        "comment_count": 1
      }
    ],
    "pagination": {
      "total": 50,
      "page": 1,
      "per_page": 20,
      "total_pages": 3
    }
  }
}
```

---

### POST `/reports`

日報を新規作成する。同一ユーザー・同一日付の日報が既に存在する場合は 409 を返す。

**リクエスト**
```json
{
  "report_date": "2026-03-20",
  "problem": "A社でシステム移行の懸念が出た。次回提案資料が必要。",
  "plan": "A社向け移行提案資料を作成する。B社にフォロー電話をする。",
  "visits": [
    {
      "customer_id": 5,
      "visit_content": "新システムの提案を実施。先方は概ね好印象だが、移行コストの懸念あり。",
      "sort_order": 1
    },
    {
      "customer_id": 12,
      "visit_content": "定期訪問。現行契約の更新について確認。来月までに回答をもらえることになった。",
      "sort_order": 2
    }
  ]
}
```

**バリデーション**
- `report_date`: 必須
- `visits`: 1件以上必須
- `visits[].customer_id`: 必須
- `visits[].visit_content`: 必須

**レスポンス `201`**
```json
{
  "data": {
    "report_id": 11,
    "report_date": "2026-03-20",
    "status": "draft",
    "user": {
      "user_id": 1,
      "name": "山田 太郎"
    },
    "problem": "A社でシステム移行の懸念が出た。次回提案資料が必要。",
    "plan": "A社向け移行提案資料を作成する。B社にフォロー電話をする。",
    "visits": [
      {
        "visit_id": 21,
        "customer": {
          "customer_id": 5,
          "company_name": "株式会社A商事",
          "contact_name": "鈴木 一郎"
        },
        "visit_content": "新システムの提案を実施。先方は概ね好印象だが、移行コストの懸念あり。",
        "sort_order": 1
      },
      {
        "visit_id": 22,
        "customer": {
          "customer_id": 12,
          "company_name": "B株式会社",
          "contact_name": "田中 花子"
        },
        "visit_content": "定期訪問。現行契約の更新について確認。来月までに回答をもらえることになった。",
        "sort_order": 2
      }
    ],
    "comments": [],
    "created_at": "2026-03-20T18:00:00+09:00",
    "updated_at": "2026-03-20T18:00:00+09:00"
  }
}
```

**エラー `409`**
```json
{
  "error": {
    "code": "REPORT_ALREADY_EXISTS",
    "message": "この日付の日報は既に作成されています"
  }
}
```

---

### GET `/reports/:id`

日報の詳細を取得する。sales は自分の日報のみ取得可能。

**レスポンス `200`**
```json
{
  "data": {
    "report_id": 11,
    "report_date": "2026-03-20",
    "status": "submitted",
    "user": {
      "user_id": 1,
      "name": "山田 太郎",
      "department": "東京営業部"
    },
    "problem": "A社でシステム移行の懸念が出た。次回提案資料が必要。",
    "plan": "A社向け移行提案資料を作成する。B社にフォロー電話をする。",
    "visits": [
      {
        "visit_id": 21,
        "customer": {
          "customer_id": 5,
          "company_name": "株式会社A商事",
          "contact_name": "鈴木 一郎"
        },
        "visit_content": "新システムの提案を実施。先方は概ね好印象だが、移行コストの懸念あり。",
        "sort_order": 1
      }
    ],
    "comments": [
      {
        "comment_id": 3,
        "user": {
          "user_id": 2,
          "name": "佐藤 部長"
        },
        "comment_text": "提案資料は木曜までに共有してください。一緒にレビューします。",
        "created_at": "2026-03-20T20:15:00+09:00"
      }
    ],
    "created_at": "2026-03-20T18:00:00+09:00",
    "updated_at": "2026-03-20T19:30:00+09:00"
  }
}
```

---

### PUT `/reports/:id`

日報の基本情報（problem / plan）を更新する。draft 状態の自分の日報のみ更新可能。

**リクエスト**
```json
{
  "problem": "更新した課題内容",
  "plan": "更新した明日の計画"
}
```

**レスポンス `200`**
```json
{
  "data": {
    "report_id": 11,
    "problem": "更新した課題内容",
    "plan": "更新した明日の計画",
    "updated_at": "2026-03-20T18:30:00+09:00"
  }
}
```

---

### PATCH `/reports/:id/submit`

日報を提出する（status を `submitted` に変更）。draft 状態の自分の日報のみ実行可能。

**リクエスト**
リクエストボディなし

**レスポンス `200`**
```json
{
  "data": {
    "report_id": 11,
    "status": "submitted",
    "updated_at": "2026-03-20T19:00:00+09:00"
  }
}
```

**エラー `400`**
```json
{
  "error": {
    "code": "INVALID_STATUS_TRANSITION",
    "message": "提出できない状態の日報です"
  }
}
```

---

### PATCH `/reports/:id/review`

日報を確認済みにする（status を `reviewed` に変更）。manager のみ実行可能。submitted 状態の日報のみ対象。

**リクエスト**
リクエストボディなし

**レスポンス `200`**
```json
{
  "data": {
    "report_id": 11,
    "status": "reviewed",
    "updated_at": "2026-03-20T21:00:00+09:00"
  }
}
```

---

## 訪問記録 API

### POST `/reports/:id/visits`

訪問記録を追加する。draft 状態の自分の日報のみ追加可能。

**リクエスト**
```json
{
  "customer_id": 7,
  "visit_content": "新規開拓訪問。担当者と名刺交換。次回アポを取得。",
  "sort_order": 3
}
```

**レスポンス `201`**
```json
{
  "data": {
    "visit_id": 25,
    "customer": {
      "customer_id": 7,
      "company_name": "C工業株式会社",
      "contact_name": "高橋 次郎"
    },
    "visit_content": "新規開拓訪問。担当者と名刺交換。次回アポを取得。",
    "sort_order": 3,
    "created_at": "2026-03-20T18:10:00+09:00"
  }
}
```

---

### PUT `/reports/:id/visits/:visit_id`

訪問記録を更新する。

**リクエスト**
```json
{
  "customer_id": 7,
  "visit_content": "更新した訪問内容",
  "sort_order": 3
}
```

**レスポンス `200`**
```json
{
  "data": {
    "visit_id": 25,
    "customer": {
      "customer_id": 7,
      "company_name": "C工業株式会社",
      "contact_name": "高橋 次郎"
    },
    "visit_content": "更新した訪問内容",
    "sort_order": 3,
    "updated_at": "2026-03-20T18:20:00+09:00"
  }
}
```

---

### DELETE `/reports/:id/visits/:visit_id`

訪問記録を削除する。訪問記録が1件のみの場合は削除不可（日報に最低1件必須）。

**レスポンス `204`**
レスポンスボディなし

**エラー `400`**
```json
{
  "error": {
    "code": "MINIMUM_VISIT_REQUIRED",
    "message": "訪問記録は最低1件必要です"
  }
}
```

---

### PATCH `/reports/:id/visits/reorder`

訪問記録の表示順を更新する。

**リクエスト**
```json
{
  "visits": [
    { "visit_id": 22, "sort_order": 1 },
    { "visit_id": 21, "sort_order": 2 },
    { "visit_id": 25, "sort_order": 3 }
  ]
}
```

**レスポンス `200`**
```json
{
  "data": {
    "visits": [
      { "visit_id": 22, "sort_order": 1 },
      { "visit_id": 21, "sort_order": 2 },
      { "visit_id": 25, "sort_order": 3 }
    ]
  }
}
```

---

## コメント API

### GET `/reports/:id/comments`

日報のコメント一覧を取得する。

**レスポンス `200`**
```json
{
  "data": {
    "comments": [
      {
        "comment_id": 3,
        "user": {
          "user_id": 2,
          "name": "佐藤 部長"
        },
        "comment_text": "提案資料は木曜までに共有してください。一緒にレビューします。",
        "created_at": "2026-03-20T20:15:00+09:00"
      }
    ]
  }
}
```

---

### POST `/reports/:id/comments`

コメントを追加する。manager のみ実行可能。

**リクエスト**
```json
{
  "comment_text": "提案資料は木曜までに共有してください。一緒にレビューします。"
}
```

**バリデーション**
- `comment_text`: 必須

**レスポンス `201`**
```json
{
  "data": {
    "comment_id": 4,
    "user": {
      "user_id": 2,
      "name": "佐藤 部長"
    },
    "comment_text": "提案資料は木曜までに共有してください。一緒にレビューします。",
    "created_at": "2026-03-20T20:15:00+09:00"
  }
}
```

---

### DELETE `/reports/:id/comments/:comment_id`

コメントを削除する。manager かつ自分が投稿したコメントのみ削除可能。

**レスポンス `204`**
レスポンスボディなし

---

## 顧客マスタ API

### GET `/customers`

顧客一覧を取得する。

**クエリパラメーター**

| パラメーター | 型 | 必須 | 説明 |
|-------------|-----|------|------|
| `q` | string | - | 会社名・担当者名での部分一致検索 |
| `page` | integer | - | ページ番号（デフォルト: 1） |
| `per_page` | integer | - | 1ページの件数（デフォルト: 20） |

**レスポンス `200`**
```json
{
  "data": {
    "customers": [
      {
        "customer_id": 5,
        "company_name": "株式会社A商事",
        "contact_name": "鈴木 一郎",
        "phone": "03-1234-5678",
        "email": "suzuki@a-shoji.example.com"
      }
    ],
    "pagination": {
      "total": 80,
      "page": 1,
      "per_page": 20,
      "total_pages": 4
    }
  }
}
```

---

### POST `/customers`

顧客を登録する。manager のみ実行可能。

**リクエスト**
```json
{
  "company_name": "D株式会社",
  "contact_name": "山本 三郎",
  "phone": "06-9876-5432",
  "email": "yamamoto@d-corp.example.com",
  "address": "大阪府大阪市中央区1-1-1",
  "notes": "年間契約見込み先"
}
```

**バリデーション**
- `company_name`: 必須

**レスポンス `201`**
```json
{
  "data": {
    "customer_id": 30,
    "company_name": "D株式会社",
    "contact_name": "山本 三郎",
    "phone": "06-9876-5432",
    "email": "yamamoto@d-corp.example.com",
    "address": "大阪府大阪市中央区1-1-1",
    "notes": "年間契約見込み先",
    "created_at": "2026-03-20T10:00:00+09:00",
    "updated_at": "2026-03-20T10:00:00+09:00"
  }
}
```

---

### GET `/customers/:id`

顧客の詳細を取得する。

**レスポンス `200`**
```json
{
  "data": {
    "customer_id": 5,
    "company_name": "株式会社A商事",
    "contact_name": "鈴木 一郎",
    "phone": "03-1234-5678",
    "email": "suzuki@a-shoji.example.com",
    "address": "東京都千代田区2-2-2",
    "notes": "",
    "created_at": "2025-01-10T09:00:00+09:00",
    "updated_at": "2025-06-15T14:30:00+09:00"
  }
}
```

---

### PUT `/customers/:id`

顧客情報を更新する。manager のみ実行可能。

**リクエスト**
```json
{
  "company_name": "株式会社A商事",
  "contact_name": "鈴木 一郎",
  "phone": "03-1234-9999",
  "email": "suzuki-new@a-shoji.example.com",
  "address": "東京都千代田区2-2-2",
  "notes": "2026年より担当者変更予定"
}
```

**レスポンス `200`**
```json
{
  "data": {
    "customer_id": 5,
    "company_name": "株式会社A商事",
    "contact_name": "鈴木 一郎",
    "phone": "03-1234-9999",
    "email": "suzuki-new@a-shoji.example.com",
    "address": "東京都千代田区2-2-2",
    "notes": "2026年より担当者変更予定",
    "updated_at": "2026-03-20T11:00:00+09:00"
  }
}
```

---

### DELETE `/customers/:id`

顧客を削除する。manager のみ実行可能。訪問記録に紐づく顧客は削除不可。

**レスポンス `204`**
レスポンスボディなし

**エラー `409`**
```json
{
  "error": {
    "code": "CUSTOMER_IN_USE",
    "message": "訪問記録に使用されている顧客は削除できません"
  }
}
```

---

## ユーザーマスタ API

### GET `/users`

ユーザー一覧を取得する。manager のみ実行可能。

**クエリパラメーター**

| パラメーター | 型 | 必須 | 説明 |
|-------------|-----|------|------|
| `role` | string | - | `sales` / `manager` で絞り込み |

**レスポンス `200`**
```json
{
  "data": {
    "users": [
      {
        "user_id": 1,
        "name": "山田 太郎",
        "email": "yamada@example.com",
        "role": "sales",
        "department": "東京営業部"
      }
    ]
  }
}
```

---

### POST `/users`

ユーザーを登録する。manager のみ実行可能。

**リクエスト**
```json
{
  "name": "新田 次郎",
  "email": "nitta@example.com",
  "password": "initial_password",
  "role": "sales",
  "department": "大阪営業部"
}
```

**バリデーション**
- `name`: 必須
- `email`: 必須・メール形式・重複不可
- `password`: 必須・8文字以上
- `role`: 必須（`sales` または `manager`）

**レスポンス `201`**
```json
{
  "data": {
    "user_id": 10,
    "name": "新田 次郎",
    "email": "nitta@example.com",
    "role": "sales",
    "department": "大阪営業部",
    "created_at": "2026-03-20T09:00:00+09:00"
  }
}
```

**エラー `409`**
```json
{
  "error": {
    "code": "EMAIL_ALREADY_EXISTS",
    "message": "このメールアドレスは既に使用されています"
  }
}
```

---

### GET `/users/:id`

ユーザーの詳細を取得する。manager のみ実行可能。

**レスポンス `200`**
```json
{
  "data": {
    "user_id": 1,
    "name": "山田 太郎",
    "email": "yamada@example.com",
    "role": "sales",
    "department": "東京営業部",
    "created_at": "2025-04-01T09:00:00+09:00",
    "updated_at": "2025-04-01T09:00:00+09:00"
  }
}
```

---

### PUT `/users/:id`

ユーザー情報を更新する。manager のみ実行可能。パスワードを空文字または省略した場合は変更しない。

**リクエスト**
```json
{
  "name": "山田 太郎",
  "email": "yamada@example.com",
  "password": "",
  "role": "sales",
  "department": "名古屋営業部"
}
```

**レスポンス `200`**
```json
{
  "data": {
    "user_id": 1,
    "name": "山田 太郎",
    "email": "yamada@example.com",
    "role": "sales",
    "department": "名古屋営業部",
    "updated_at": "2026-03-20T10:00:00+09:00"
  }
}
```

---

### DELETE `/users/:id`

ユーザーを削除する。manager のみ実行可能。自分自身は削除不可。

**レスポンス `204`**
レスポンスボディなし

**エラー `400`**
```json
{
  "error": {
    "code": "CANNOT_DELETE_SELF",
    "message": "自分自身を削除することはできません"
  }
}
```
