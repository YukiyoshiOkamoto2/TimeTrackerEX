# TimeTracker API 仕様書

**バージョン**: 1.0  
**最終更新**: 2025年10月9日  
**ベースURL**: `http://{host}/TimeTrackerNX/api`

このドキュメントは、TimeTrackerEX WebアプリケーションがバックエンドTimeTracker APIと連携するための仕様を定義します。

---

## 📋 目次

1. [認証](#認証)
2. [プロジェクト管理](#プロジェクト管理)
3. [作業項目管理](#作業項目管理)
4. [タスク登録](#タスク登録)
5. [エラーハンドリング](#エラーハンドリング)
6. [実装状況](#実装状況)

---

## 🔐 認証

### POST /auth/token

トークンベース認証を行います。

#### リクエスト
```http
POST /auth/token
Content-Type: application/json

{
  "loginname": "string",
  "password": "string"
}
```

#### リクエストボディ
| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| loginname | string | ✅ | ユーザーのログイン名 |
| password | string | ✅ | ユーザーのパスワード |

#### レスポンス (成功: 200 OK)
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresAt": "2025-10-09T11:42:55Z"
}
```

#### レスポンスボディ
| フィールド | 型 | 説明 |
|-----------|-----|------|
| token | string | 認証トークン（JWTなど） |
| expiresAt | string | トークンの有効期限（ISO 8601形式） |

#### エラーレスポンス
```json
// 401 Unauthorized
[
  {
    "message": "Invalid credentials"
  }
]
```

#### 使用例
```typescript
const response = await fetch(`${baseUrl}/auth/token`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    loginname: 'user@example.com',
    password: 'password123'
  })
});

const data = await response.json();
const token = data.token;
```

---

## 👤 ユーザー情報取得

### GET /system/users/me

認証済みユーザーの情報を取得します。

#### リクエスト
```http
GET /system/users/me
Authorization: Bearer {token}
```

#### ヘッダー
| ヘッダー | 値 | 必須 |
|---------|-----|------|
| Authorization | Bearer {token} | ✅ |

#### レスポンス (成功: 200 OK)
```json
{
  "id": "12345",
  "loginName": "user@example.com",
  "displayName": "山田 太郎",
  "email": "user@example.com"
}
```

#### レスポンスボディ
| フィールド | 型 | 説明 |
|-----------|-----|------|
| id | string | ユーザーID |
| loginName | string | ログイン名 |
| displayName | string | 表示名 |
| email | string | メールアドレス |

---

## 📁 プロジェクト管理

### GET /workitem/workItems/{projectId}

プロジェクト情報を取得します。

#### リクエスト
```http
GET /workitem/workItems/{projectId}
Authorization: Bearer {token}
```

#### パスパラメータ
| パラメータ | 型 | 説明 |
|-----------|-----|------|
| projectId | string | プロジェクトID |

#### レスポンス (成功: 200 OK)
```json
[
  {
    "fields": {
      "Id": "62368",
      "Name": "TimeTrackerプロジェクト",
      "ProjectId": "62368",
      "ProjectName": "TimeTrackerプロジェクト",
      "ProjectCode": "TT001"
    }
  }
]
```

#### レスポンスボディ (fields)
| フィールド | 型 | 説明 |
|-----------|-----|------|
| Id | string | プロジェクトID |
| Name | string | プロジェクト名 |
| ProjectId | string | プロジェクトID（Idと同じ） |
| ProjectName | string | プロジェクト名（Nameと同じ） |
| ProjectCode | string | プロジェクトコード |

---

## 📋 作業項目管理

### GET /workitem/workItems/{projectId}/subItems

プロジェクトの作業項目一覧を取得します。

#### リクエスト
```http
GET /workitem/workItems/{projectId}/subItems?fields=FolderName,Name&assignedUsers={userName}&includeDeleted=false
Authorization: Bearer {token}
```

#### パスパラメータ
| パラメータ | 型 | 説明 |
|-----------|-----|------|
| projectId | string | プロジェクトID |

#### クエリパラメータ
| パラメータ | 型 | 必須 | デフォルト | 説明 |
|-----------|-----|------|----------|------|
| fields | string | ✅ | - | 取得するフィールド（カンマ区切り） |
| assignedUsers | string | ❌ | - | 担当ユーザー名でフィルタ |
| includeDeleted | boolean | ❌ | false | 削除済み項目を含むか |

#### レスポンス (成功: 200 OK)
```json
[
  {
    "fields": {
      "Id": "62418",
      "Name": "開発タスク",
      "FolderName": "開発",
      "SubItems": [
        {
          "fields": {
            "Id": "62419",
            "Name": "フロントエンド開発",
            "FolderName": "開発/フロントエンド",
            "SubItems": []
          }
        }
      ]
    }
  }
]
```

#### レスポンスボディ (fields)
| フィールド | 型 | 説明 |
|-----------|-----|------|
| Id | string | 作業項目ID |
| Name | string | 作業項目名 |
| FolderName | string | フォルダ名（階層パス） |
| SubItems | array | 子作業項目の配列 |

---

## ✅ タスク登録

### POST /system/users/{userId}/timeEntries

ユーザーのタイムエントリ（タスク）を登録します。

#### リクエスト
```http
POST /system/users/{userId}/timeEntries
Authorization: Bearer {token}
Content-Type: application/json

{
  "workItemId": "62418",
  "startTime": "2024-01-15T09:00:00",
  "finishTime": "2024-01-15T10:30:00",
  "memo": "会議対応"
}
```

#### パスパラメータ
| パラメータ | 型 | 説明 |
|-----------|-----|------|
| userId | string | ユーザーID |

#### リクエストボディ
| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| workItemId | string | ✅ | 作業項目ID |
| startTime | string | ✅ | 開始時刻（ISO 8601形式: YYYY-MM-DDTHH:MM:SS） |
| finishTime | string | ✅ | 終了時刻（ISO 8601形式: YYYY-MM-DDTHH:MM:SS） |
| memo | string | ❌ | メモ（任意） |

#### 制約条件
- `startTime` < `finishTime` であること
- `startTime` と `finishTime` は30分単位であること（例: 09:00, 09:30, 10:00）
- 同一時間帯に重複したタスクは登録できない可能性あり（要確認）

#### レスポンス (成功: 200 OK)
```json
{
  "id": "12345",
  "message": "Task registered successfully"
}
```

#### レスポンスボディ
| フィールド | 型 | 説明 |
|-----------|-----|------|
| id | string | 登録されたタスクID |
| message | string | 成功メッセージ |

#### エラーレスポンス
```json
// 400 Bad Request - バリデーションエラー
[
  {
    "message": "start_time is greater than end_time"
  }
]

// 400 Bad Request - 時間が30分単位でない
[
  {
    "message": "start_time is not multiple of 30 minutes"
  }
]

// 409 Conflict - 重複エラー
[
  {
    "message": "Time entry already exists for this time period"
  }
]
```

---

## 🔄 タスク一括登録（Phase 7実装）

### POST /api/register-task

**注意**: このエンドポイントはフロントエンド側で定義したもので、バックエンド実装が必要です。

複数のスケジュールアイテムを一括でTimeTrackerに登録します。

#### リクエスト
```http
POST /api/register-task
Content-Type: application/json

{
  "password": "user_password",
  "schedules": [
    {
      "date": "2024/01/15",
      "startTime": "09:00",
      "endTime": "10:30",
      "itemCode": "62418",
      "title": "会議対応"
    },
    {
      "date": "2024/01/15",
      "startTime": "10:30",
      "endTime": "12:00",
      "itemCode": "62419",
      "title": "開発作業"
    }
  ]
}
```

#### リクエストボディ
| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| password | string | ✅ | ユーザーのパスワード（認証用） |
| schedules | array | ✅ | 登録するスケジュールの配列 |

#### schedules配列の要素
| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| date | string | ✅ | 日付（YYYY/MM/DD形式） |
| startTime | string | ✅ | 開始時刻（HH:MM形式、30分単位） |
| endTime | string | ✅ | 終了時刻（HH:MM形式、30分単位） |
| itemCode | string | ✅ | 作業項目ID |
| title | string | ✅ | タスクのタイトル（メモとして使用） |

#### レスポンス (成功: 200 OK)
```json
{
  "success": true,
  "registeredCount": 2,
  "message": "2件のタスクを登録しました"
}
```

#### レスポンスボディ
| フィールド | 型 | 説明 |
|-----------|-----|------|
| success | boolean | 成功フラグ |
| registeredCount | number | 登録成功件数 |
| message | string | 結果メッセージ |
| errors | array | エラー詳細（失敗時のみ） |

#### エラーレスポンス (部分成功含む)
```json
// 200 OK - 部分的に成功
{
  "success": false,
  "registeredCount": 1,
  "message": "一部のタスク登録に失敗しました",
  "errors": [
    {
      "date": "2024/01/15",
      "error": "Time entry already exists for this time period"
    }
  ]
}

// 400 Bad Request - リクエストエラー
{
  "success": false,
  "message": "Invalid request format",
  "errors": [
    {
      "field": "schedules[0].startTime",
      "error": "Invalid time format"
    }
  ]
}

// 401 Unauthorized - 認証エラー
{
  "success": false,
  "message": "Authentication failed"
}
```

#### バックエンド実装の推奨処理フロー
```
1. パスワードで認証 → tokenとuserIdを取得
2. 各scheduleをループ処理:
   a. date + startTime/endTime → ISO 8601形式に変換
   b. POST /system/users/{userId}/timeEntries を呼び出し
   c. 成功/失敗を記録
3. 結果をまとめてレスポンス返却
```

---

## ⚠️ エラーハンドリング

### HTTPステータスコード

| コード | 説明 | 対応方法 |
|-------|------|---------|
| 200 | 成功 | - |
| 400 | リクエストエラー | リクエストパラメータを確認 |
| 401 | 認証エラー | トークンを再取得（ログイン） |
| 403 | 権限エラー | ユーザーの権限を確認 |
| 404 | リソースが見つからない | プロジェクトID等を確認 |
| 409 | 競合エラー | 重複データの確認 |
| 500 | サーバーエラー | 後でリトライ |

### エラーレスポンス形式

TimeTracker APIは配列形式でエラーを返します:

```json
[
  {
    "message": "エラーメッセージ"
  }
]
```

または、単一オブジェクト:

```json
{
  "message": "エラーメッセージ",
  "code": "ERROR_CODE"
}
```

### 認証エラーの判定

```typescript
export function isAuthenticationError(error: unknown): boolean {
    if (!(error instanceof Error)) {
        return false;
    }
    return error.message.includes("StatusCode: 401") 
        || error.message.includes("Not connected");
}
```

401エラーの場合は、トークンが無効または期限切れのため、再認証が必要です。

---

## 📊 実装状況

### フロントエンド実装状況

| API | メソッド | エンドポイント | 実装状況 | テスト |
|-----|---------|---------------|---------|--------|
| 認証 | POST | /auth/token | ✅ | ✅ |
| ユーザー情報取得 | GET | /system/users/me | ✅ | ✅ |
| プロジェクト取得 | GET | /workitem/workItems/{projectId} | ✅ | ✅ |
| 作業項目取得 | GET | /workitem/workItems/{projectId}/subItems | ✅ | ✅ |
| タスク登録 | POST | /system/users/{userId}/timeEntries | ✅ | ❌ |
| タスク一括登録 | POST | /api/register-task | ✅ | ❌ |

### バックエンド実装状況

| API | 実装状況 | 備考 |
|-----|---------|------|
| 認証 | ✅ | 既存API |
| ユーザー情報取得 | ✅ | 既存API |
| プロジェクト取得 | ✅ | 既存API |
| 作業項目取得 | ✅ | 既存API |
| タスク登録 | ✅ | 既存API |
| タスク一括登録 | ❌ | **要実装** |

---

## 🔧 実装例

### TypeScript実装（フロントエンド）

#### 認証
```typescript
import { authenticateAsync } from '@/core/api';

const auth = await authenticateAsync(
  'http://example.com/TimeTrackerNX/api',
  'user@example.com',
  'password123'
);

console.log('Token:', auth.token);
console.log('User ID:', auth.userId);
```

#### プロジェクト・作業項目取得
```typescript
import { getProjectAsync, getWorkItemsAsync } from '@/core/api';

const project = await getProjectAsync(baseUrl, projectId, auth);
const workItems = await getWorkItemsAsync(baseUrl, projectId, auth, userName);

console.log('Project:', project.name);
console.log('Work Items:', workItems.length);
```

#### タスク登録
```typescript
import { registerTaskAsync, TimeTrackerTask } from '@/core/api';

const task: TimeTrackerTask = {
  workItemId: '62418',
  startTime: new Date('2024-01-15T09:00:00'),
  endTime: new Date('2024-01-15T10:30:00'),
  memo: '会議対応'
};

await registerTaskAsync(baseUrl, userId, task, auth);
```

#### タスク一括登録
```typescript
import { registerTasks, RegisterTasksRequest } from '@/core/api';

const request: RegisterTasksRequest = {
  password: 'user_password',
  schedules: [
    {
      date: '2024/01/15',
      startTime: '09:00',
      endTime: '10:30',
      itemCode: '62418',
      title: '会議対応'
    }
  ]
};

const response = await registerTasks(request);
console.log(`${response.registeredCount}件登録しました`);
```

### Python実装（バックエンド参考）

```python
from app.api import TimeTracker, TimeTrackerTask
import datetime

# 認証
tracker = TimeTracker(base_url, user_name, project_id)
await tracker.connect_async(password)

# プロジェクト取得
project = await tracker.get_projects_async()

# 作業項目取得
work_items = await tracker.get_work_items_async()

# タスク登録
task = TimeTrackerTask(
    work_item_id="62418",
    start_time=datetime.datetime(2024, 1, 15, 9, 0),
    end_time=datetime.datetime(2024, 1, 15, 10, 30),
    memo="会議対応"
)
await tracker.register_task_async(task)
```

---

## 📝 注意事項

### セキュリティ
- ⚠️ パスワードは平文で送信されるため、HTTPS通信必須
- ⚠️ トークンはsessionStorageに保存（60分有効期限）
- 🔄 将来的にOAuth2.0やJWT更新機能の実装を推奨

### パフォーマンス
- 📊 作業項目取得は階層構造のため、大規模プロジェクトでは応答時間が長くなる可能性
- 🔄 一括登録APIは順次処理のため、件数が多い場合は時間がかかる

### 制約
- ⏰ 時刻は30分単位のみ対応
- 📅 過去日付のタスク登録可否は要確認
- 🔁 同一時間帯の重複タスク登録可否は要確認

---

## 🔗 関連ドキュメント

- [TimeTracker機能仕様](./TimeTracker_SPEC.md)
- [実装ステータス](./TimeTracker_IMPLEMENTATION_STATUS.md)
- [全体計画](../plan/TimeTracker_PLAN.md)
- [Phase 7計画](../plan/PHASE7_PLAN.md)

---

## 📅 変更履歴

| 日付 | バージョン | 変更内容 |
|------|----------|---------|
| 2025-10-09 | 1.0 | 初版作成 |

---

**このドキュメントは定期的に見直し、API変更に合わせて更新してください。**
