# TimeTracker API 仕様書

**バージョン**: 1.0  
**ベースURL**: `http://{host}/TimeTrackerNX/api`

##  公式ドキュメント
 **[TimeTracker Web API リファレンス](https://www.timetracker.jp/support/help/web-api/webAPIList.html)**

---

##  認証

### POST /auth/token
トークンベース認証。

**リクエスト**: `{ loginname, password }`  
**レスポンス**: `{ token, expiresAt }`  
**エラー**: 401 Unauthorized

---

##  ユーザー情報

### GET /system/users/me
認証済みユーザー情報取得。

**ヘッダー**: `Authorization: Bearer {token}`  
**レスポンス**: `{ id, loginName, displayName, email }`

---

##  プロジェクト管理

### GET /workitem/workItems/{projectId}
プロジェクト情報取得。

**パラメータ**: `projectId`  
**レスポンス**: `[{ fields: { Id, Name, ProjectId, ProjectName, ProjectCode } }]`

---

##  作業項目管理

### GET /workitem/workItems/{projectId}/subItems
作業項目一覧取得。

**パラメータ**:
- `projectId` (path)
- `fields` (query, 必須): 例 "FolderName,Name"
- `assignedUsers` (query, 任意)
- `includeDeleted` (query, デフォルト false)

**レスポンス**: 階層構造の作業項目配列  
`[{ fields: { Id, Name, FolderName, SubItems[] } }]`

---

##  タスク登録

### POST /system/users/{userId}/timeEntries
単一タスク登録。

**パラメータ**: `userId` (path)  
**リクエスト**: `{ workItemId, startTime, finishTime, memo? }`  
**制約**:
- 時刻はISO 8601形式 (YYYY-MM-DDTHH:MM:SS)
- 30分単位必須
- startTime < finishTime

**レスポンス**: `{ id, message }`  
**エラー**: 400 (バリデーション), 409 (重複)

---

##  タスク一括登録 (Phase 7)

### POST /api/register-task
**注意**: バックエンド実装が必要。

複数スケジュールを一括登録。

**リクエスト**:
```json
{
  "password": "string",
  "schedules": [
    {
      "date": "YYYY/MM/DD",
      "startTime": "HH:MM",
      "endTime": "HH:MM",
      "itemCode": "string",
      "title": "string"
    }
  ]
}
```

**レスポンス**: `{ success, registeredCount, message, errors? }`

**推奨実装フロー**:
1. パスワード認証  token取得
2. 各scheduleをループ: ISO 8601変換  POST /system/users/{userId}/timeEntries
3. 結果を集約してレスポンス

---

##  エラーハンドリング

### HTTPステータスコード
| コード | 説明 |
|-------|------|
| 200 | 成功 |
| 400 | リクエストエラー |
| 401 | 認証エラー (再ログイン必要) |
| 403 | 権限エラー |
| 404 | リソース未存在 |
| 409 | 競合 |
| 500 | サーバーエラー |

### エラーレスポンス形式
配列形式: `[{ message }]`  
または: `{ message, code? }`

---

##  実装状況

### フロントエンド
| API | エンドポイント | 実装 | テスト |
|-----|---------------|------|--------|
| 認証 | POST /auth/token |  |  |
| ユーザー情報 | GET /system/users/me |  |  |
| プロジェクト | GET /workitem/workItems/{projectId} |  |  |
| 作業項目 | GET /workitem/workItems/{projectId}/subItems |  |  |
| タスク登録 | POST /system/users/{userId}/timeEntries |  |  |
| 一括登録 | POST /api/register-task |  |  |

### バックエンド
| API | 実装状況 |
|-----|---------|
| 認証～タスク登録 |  既存API |
| 一括登録 |  **要実装** |

---

##  注意事項

-  HTTPS通信必須 (パスワード平文送信)
-  トークン有効期限: 60分
-  時刻は30分単位のみ
-  大規模プロジェクトは応答時間に注意

---

##  関連ドキュメント

- [TimeTracker機能仕様](./TimeTracker_SPEC.md)
- [実装ステータス](./TimeTracker_IMPLEMENTATION_STATUS.md)
- [全体計画](../plan/TimeTracker_PLAN.md)
- [Phase 7計画](../plan/PHASE7_PLAN.md)
