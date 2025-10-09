# Phase 7 実装計画: 統合テスト & API統合

**作成日**: 2025年10月9日  
**Phase**: 7  
**目的**: E2Eテスト実装とタスク登録API統合

---

## 📋 概要

Phase 7では、TimeTrackerページの完全なフローをテストするE2Eテストスイートを作成し、CompletionViewからバックエンドAPIへのタスク登録機能を実装します。

---

## 🎯 実装タスク

### Task 1: E2Eテストセットアップ
**目的**: Playwrightのセットアップと基本設定

**実装内容**:
1. Playwright依存関係インストール
2. `playwright.config.ts`作成
3. テストヘルパー関数作成
4. CI/CD用のGitHub Actions設定（オプション）

**完了条件**:
- [ ] Playwright正常インストール
- [ ] 設定ファイル作成完了
- [ ] `npm run test:e2e`コマンド動作確認

---

### Task 2: FileUploadView E2Eテスト
**目的**: ファイルアップロード機能のE2Eテスト

**実装ファイル**: `src/pages/timetracker/__e2e__/FileUploadView.e2e.test.ts`

**テストケース**:
```typescript
describe('FileUploadView E2E', () => {
  test('PDFとICSファイルをアップロードできる', async ({ page }) => {
    // 1. TimeTrackerページに移動
    // 2. PDFファイル選択・アップロード
    // 3. ICSファイル選択・アップロード
    // 4. パスワード入力
    // 5. アップロード成功確認
    // 6. LinkingProcessViewへ遷移確認
  });

  test('PDFのみアップロード可能', async ({ page }) => {
    // PDFのみアップロードして成功することを確認
  });

  test('ICSのみアップロード可能', async ({ page }) => {
    // ICSのみアップロードして成功することを確認
  });

  test('ファイル未選択時はエラー表示', async ({ page }) => {
    // ファイル未選択で送信するとエラーメッセージ表示を確認
  });
});
```

**完了条件**:
- [ ] 4つのテストケース実装
- [ ] 全テスト成功

---

### Task 3: LinkingProcessView E2Eテスト
**目的**: イベント紐付け機能のE2Eテスト

**実装ファイル**: `src/pages/timetracker/__e2e__/LinkingProcessView.e2e.test.ts`

**テストケース**:
```typescript
describe('LinkingProcessView E2E', () => {
  test('自動紐付け結果が表示される', async ({ page }) => {
    // 1. ファイルアップロード完了後
    // 2. 統計情報表示確認（総イベント数、紐付け済み数等）
    // 3. 紐付け済みテーブル表示確認
    // 4. 未紐付けテーブル表示確認
  });

  test('手動紐付けが可能', async ({ page }) => {
    // 1. 未紐付けイベントのドロップダウンを開く
    // 2. 作業項目を選択
    // 3. 紐付けボタンクリック
    // 4. 紐付け済みテーブルに移動確認
    // 5. 統計情報更新確認
  });

  test('CompletionViewへ遷移可能', async ({ page }) => {
    // 1. 送信ボタンクリック
    // 2. CompletionViewへ遷移確認
  });
});
```

**完了条件**:
- [ ] 3つのテストケース実装
- [ ] 全テスト成功

---

### Task 4: CompletionView E2Eテスト
**目的**: タスク確認・登録機能のE2Eテスト

**実装ファイル**: `src/pages/timetracker/__e2e__/CompletionView.e2e.test.ts`

**テストケース**:
```typescript
describe('CompletionView E2E', () => {
  test('スケジュールアイテムが表示される', async ({ page }) => {
    // 1. LinkingProcessViewから遷移後
    // 2. CheckedTable表示確認
    // 3. スケジュールアイテム数確認
    // 4. 各項目の内容確認
  });

  test('作業項目コードを選択可能', async ({ page }) => {
    // 1. ドロップダウンを開く
    // 2. 作業項目を選択
    // 3. 選択状態が反映される
  });

  test('バックボタンでLinkingProcessViewへ戻れる', async ({ page }) => {
    // 1. バックボタンクリック
    // 2. LinkingProcessViewへ遷移確認
  });

  test('タスク登録が成功する', async ({ page }) => {
    // このテストはTask 5でAPI統合後に実装
  });
});
```

**完了条件**:
- [ ] 3つのテストケース実装（タスク登録は後で）
- [ ] 全テスト成功

---

### Task 5: /api/register-task API統合
**目的**: CompletionViewからタスク登録APIを呼び出す

#### 5-1: API型定義

**実装ファイル**: `src/core/api/timeTracker.ts`

**追加型定義**:
```typescript
// リクエスト型
export interface RegisterTaskRequest {
  password: string;
  schedules: Array<{
    date: string;        // "2024/01/15"
    startTime: string;   // "09:00"
    endTime: string;     // "10:30"
    itemCode: string;    // "PROJ001-001"
    title: string;       // イベントタイトル
  }>;
}

// レスポンス型
export interface RegisterTaskResponse {
  success: boolean;
  message?: string;
  registeredCount?: number;
  errors?: Array<{
    date: string;
    error: string;
  }>;
}
```

#### 5-2: API関数実装

**実装ファイル**: `src/core/api/timeTracker.ts`

```typescript
export async function registerTask(
  request: RegisterTaskRequest
): Promise<RegisterTaskResponse> {
  try {
    const response = await fetch('/api/register-task', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data: RegisterTaskResponse = await response.json();
    return data;
  } catch (error) {
    logger.error('タスク登録APIエラー', { error });
    throw error;
  }
}
```

#### 5-3: CompletionView統合

**実装ファイル**: `src/pages/timetracker/components/CompletionView.tsx`

**変更内容**:
1. `registerTask` API関数インポート
2. 登録ボタンクリックハンドラ追加
3. ローディング状態管理
4. エラーハンドリング
5. 成功時のメッセージ表示

```typescript
const handleRegister = async () => {
  setIsLoading(true);
  try {
    // ScheduleItemからAPIリクエスト形式に変換
    const schedules = scheduleItems.map(item => ({
      date: item.date,
      startTime: item.startTime,
      endTime: item.endTime,
      itemCode: item.itemCode || '',
      title: item.title,
    }));

    // 作業項目コード未設定チェック
    const missingCodes = schedules.filter(s => !s.itemCode);
    if (missingCodes.length > 0) {
      throw new Error(`${missingCodes.length}件の作業項目コードが未設定です`);
    }

    // API呼び出し
    const response = await registerTask({
      password: uploadInfo.password,
      schedules,
    });

    if (response.success) {
      // 成功メッセージ表示
      showMessage({
        type: 'success',
        title: 'タスク登録完了',
        message: `${response.registeredCount}件のタスクを登録しました`,
      });
      // FileUploadViewへ戻る
      onBack(); // または onReset()
    } else {
      throw new Error(response.message || 'タスク登録に失敗しました');
    }
  } catch (error) {
    logger.error('タスク登録エラー', { error });
    showMessage({
      type: 'error',
      title: 'タスク登録エラー',
      message: error instanceof Error ? error.message : '不明なエラー',
    });
  } finally {
    setIsLoading(false);
  }
};
```

#### 5-4: E2Eテスト追加

**実装ファイル**: `src/pages/timetracker/__e2e__/CompletionView.e2e.test.ts`

```typescript
test('タスク登録が成功する', async ({ page }) => {
  // 1. 全てのスケジュールアイテムに作業項目コードを設定
  // 2. 登録ボタンクリック
  // 3. API呼び出し待機（モック使用）
  // 4. 成功メッセージ表示確認
  // 5. FileUploadViewへ遷移確認
});

test('作業項目コード未設定時はエラー表示', async ({ page }) => {
  // 1. 一部の作業項目コードを未設定のまま
  // 2. 登録ボタンクリック
  // 3. エラーメッセージ表示確認
});
```

**完了条件**:
- [ ] API型定義追加
- [ ] registerTask関数実装
- [ ] CompletionView統合
- [ ] E2Eテスト追加（2ケース）
- [ ] 全テスト成功

---

### Task 6: 統合テスト実装
**目的**: Vitestでの統合テスト（コンポーネント統合）

**実装ファイル**: `src/pages/timetracker/__tests__/TimeTrackerPage.integration.test.tsx`

**テストケース**:
```typescript
describe('TimeTrackerPage Integration', () => {
  test('FileUpload → Linking → Completionの完全フロー', async () => {
    // 1. TimeTrackerPageをレンダリング
    // 2. FileUploadView表示確認
    // 3. ファイルアップロード実行（モック）
    // 4. LinkingProcessView遷移確認
    // 5. 送信ボタンクリック
    // 6. CompletionView遷移確認
    // 7. タスク登録実行（APIモック）
    // 8. FileUploadViewへ戻る確認
  });

  test('バックボタンで前の画面へ戻れる', async () => {
    // 各ビュー間のナビゲーションテスト
  });

  test('エラー時は適切なメッセージが表示される', async () => {
    // APIエラー、変換エラー等のハンドリング確認
  });
});
```

**完了条件**:
- [ ] 3つのテストケース実装
- [ ] 全テスト成功

---

## 📊 完了基準

### コード品質
- [ ] TypeScriptコンパイルエラー: 0件
- [ ] Lintワーニング: 0件
- [ ] 全E2Eテスト成功
- [ ] 全統合テスト成功

### 機能要件
- [ ] E2Eテストスイート完成（10+テストケース）
- [ ] タスク登録API統合完了
- [ ] エラーハンドリング完全実装
- [ ] ローディング状態管理実装

### ドキュメント
- [ ] PHASE7_PROGRESS.md作成・更新
- [ ] PLAN.md更新
- [ ] README.md（テスト実行方法追記）

---

## 🚧 実装順序

1. **Task 1**: Playwrightセットアップ（30分）
2. **Task 2**: FileUploadView E2E（1時間）
3. **Task 3**: LinkingProcessView E2E（1時間）
4. **Task 4**: CompletionView E2E（30分、API統合前）
5. **Task 5**: API統合（2時間）
   - 5-1: API型定義（15分）
   - 5-2: API関数実装（30分）
   - 5-3: CompletionView統合（1時間）
   - 5-4: E2Eテスト追加（15分）
6. **Task 6**: 統合テスト（1時間）

**合計見積もり時間**: 6時間

---

## 🎯 成功指標

- ✅ E2Eテスト: 10+ケース、全て成功
- ✅ 統合テスト: 3+ケース、全て成功
- ✅ API統合: 完全動作確認
- ✅ エラーカバレッジ: 100%
- ✅ TypeScript/Lintエラー: 0件

---

## 📝 備考

### API仕様確認事項
- `/api/register-task`のエンドポイントURL確認
- リクエスト/レスポンス形式の最終確認
- 認証方式（パスワードのみでOK?）
- エラーコード一覧

### テスト用モックデータ
- PDFサンプルファイル
- ICSサンプルファイル
- モックAPIレスポンス

### Phase 8（将来）
- パフォーマンス最適化
- アクセシビリティ改善
- 多言語対応
