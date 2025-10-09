# TimeTracker リファクタリング計画

**作成日**: 2025年10月9日  
**対象**: `src/pages/timetracker` ディレクトリ

---

## 📋 目的

1. **不要なログの削除** - debug/冗長なinfoログを整理
2. **ロジックの分離** - コンポーネントからビジネスロジックを切り出し
3. **コードクリーンアップ** - 未使用コードとCSS定義の削除

---

## 🎯 フェーズ1: ログの整理

### 削除対象のログ

#### timeTrackerService.ts
- ✅ `logger.info('無効なスケジュール: X件')` - 削除済み
- ✅ `logger.info('1日ごとのタスク分割開始')` - 削除済み
- ✅ `logger.info('1日ごとのタスク分割完了')` - 削除済み
- ⏳ `logger.debug('有給休暇設定が未設定です')` - 削除予定
- ⏳ `logger.warn('有給休暇WorkItem(ID: X)が見つかりません')` - 削除予定
- ⏳ `logger.debug('有給休暇タスク作成')` - 削除予定
- ⏳ `logger.debug('休暇イベント設定が未設定です')` - 削除予定
- ⏳ `logger.debug('休暇イベントとして紐付け')` - 削除予定
- ⏳ `logger.debug('履歴から紐付け')` - 削除予定
- ⏳ `logger.info('自動紐付け開始')` - 削除予定
- ⏳ `logger.debug('履歴からの自動入力が無効です')` - 削除予定
- ⏳ `logger.debug('有効なイベント数')` - 削除予定
- ⏳ `logger.debug('有効なスケジュール数')` - 削除予定
- ⏳ `logger.info('日ごとのタスク分割を開始')` - 削除予定
- ⏳ `logger.info('分割結果: X日分のタスク')` - 削除予定
- ⏳ `logger.debug('履歴に保存')` - 削除予定

**保持するログ** (エラーハンドリング):
- `logger.error()` - すべて保持

#### LinkingProcessView.tsx
- ⏳ `logger.info('手動紐付けを履歴に保存しました')` - 削除予定
- ⏳ `logger.warn('イベントもスケジュールも存在しません')` - 削除予定
- ⏳ `logger.warn('TimeTracker設定が未設定です')` - 削除予定
- ⏳ `logger.info('CompletionViewへ遷移')` - 削除予定

**保持するログ**:
- `logger.error('履歴保存エラー')` - エラーハンドリング
- `logger.error('プロジェクト情報がuploadInfoに含まれていません')` - エラーハンドリング
- `logger.error('自動紐付けエラー')` - エラーハンドリング

#### FileUploadView.tsx
- ⏳ `logger.info('Not authenticated. Opening password dialog...')` - 削除予定
- ⏳ `logger.warn('Authentication cancelled or failed')` - 削除予定
- ⏳ `logger.info('Fetching project and work items...')` - 削除予定
- ⏳ `logger.warn('Invalid project ID. Clearing settings...')` - 削除予定

**保持するログ**:
- `logger.error('PDFのパースに失敗しました')` - エラーハンドリング
- `logger.error('ICSのパースに失敗しました')` - エラーハンドリング
- `logger.error('Error in handleLinkedClick')` - エラーハンドリング

#### CompletionView.tsx
- ⏳ `logger.info('タスク登録開始')` - 削除予定
- ⏳ `logger.debug('API呼び出し開始')` - 削除予定
- ⏳ `logger.info('タスク登録成功')` - 削除予定

**保持するログ**:
- `logger.warn('作業項目コード未設定エラー')` - ビジネスロジックエラー
- `logger.warn('無効な作業項目コード')` - ビジネスロジックエラー
- `logger.error('タスク登録失敗')` - エラーハンドリング
- `logger.error('タスク登録エラー詳細')` - エラーハンドリング

---

## 🎯 フェーズ2: ロジックの分離

### 2.1 LinkingProcessView.tsx

**現状の問題**:
- 1400行超の巨大コンポーネント
- UI表示とビジネスロジックが混在
- テストが困難

**提案する構造**:

```
services/
  ├── linkingViewLogic.ts          # NEW - ビジネスロジック
  │   ├── handleWorkItemSelect()
  │   ├── processAutoLinking()
  │   └── validateLinking()
  │
  └── linkingViewDataTransform.ts  # NEW - データ変換
      ├── transformToTargetEventRows()
      ├── transformToLinkedEventRows()
      ├── transformToUnlinkedEventRows()
      └── transformToExcludedEventRows()

view/
  └── LinkingProcessView.tsx        # REFACTOR - UI表示のみ
```

**切り出すロジック**:

1. **handleWorkItemSelect** (手動紐づけロジック)
   - 現在: 745-780行
   - 移動先: `services/linkingViewLogic.ts`

2. **runAutoLinking** (自動紐づけ実行)
   - 現在: useEffect内 (783-841行)
   - 移動先: `services/linkingViewLogic.ts`

3. **Data Transform関数群**
   - `targetEventRows` (useMemo)
   - `linkedEventsRows` (useMemo)
   - `unlinkedEventsRows` (useMemo)
   - `excludedEventRows` (useMemo)
   - 移動先: `services/linkingViewDataTransform.ts`

**期待される効果**:
- コンポーネントサイズ: 1400行 → 800行
- テスタビリティ向上
- 再利用性向上

---

### 2.2 FileUploadView.tsx

**現状の問題**:
- ファイル処理ロジックとUI表示が混在
- PDF/ICSパースロジックがコンポーネント内

**提案する構造**:

```
services/
  ├── fileProcessing.ts             # NEW - ファイル処理
  │   ├── processPdfFile()
  │   ├── processIcsFile()
  │   └── validateFileData()
  │
  └── authenticationLogic.ts        # NEW - 認証ロジック
      ├── handleAuthentication()
      └── fetchProjectData()

view/
  └── FileUploadView.tsx             # REFACTOR - UI表示のみ
```

**切り出すロジック**:

1. **handlePdfFileChange** (PDFファイル処理)
   - 現在: 165-186行
   - 移動先: `services/fileProcessing.ts`

2. **handleIcsFileChange** (ICSファイル処理)
   - 現在: 193-214行
   - 移動先: `services/fileProcessing.ts`

3. **認証・データ取得ロジック**
   - 現在: useEffect内 (343-384行)
   - 移動先: `services/authenticationLogic.ts`

---

### 2.3 CompletionView.tsx

**現状の問題**:
- バリデーションロジックがコンポーネント内
- API呼び出しロジックとUI表示が混在

**提案する構造**:

```
services/
  └── completionLogic.ts            # NEW - 完了処理ロジック
      ├── validateSchedules()
      ├── registerTasks()
      └── buildApiRequest()

view/
  └── CompletionView.tsx             # REFACTOR - UI表示のみ
```

**切り出すロジック**:

1. **handleSubmit** (登録処理)
   - 現在: 120-212行
   - 移動先: `services/completionLogic.ts`

2. **バリデーション処理**
   - 作業項目コードの検証
   - スケジュールの検証

---

## 🎯 フェーズ3: コードクリーンアップ

### 3.1 未使用import削除

実行コマンド:
```bash
npx eslint --fix "src/pages/timetracker/**/*.{ts,tsx}"
```

### 3.2 CSS定義の整理

**確認項目**:
- `commonStyles.ts` - 重複定義のチェック
- 各コンポーネントの`makeStyles` - 未使用スタイルの削除

**手順**:
1. CSS使用状況の解析
2. 未使用定義の特定
3. 削除実施

### 3.3 未使用変数・関数の削除

**確認ツール**:
```bash
npx ts-prune
```

---

## 📝 実装順序

### Phase 1: ログ削除 (優先度: 高)
**所要時間**: 30分  
**影響範囲**: 小

1. ✅ timeTrackerService.ts - 一部完了
2. ⏳ timeTrackerService.ts - 残りのdebug/info削除
3. ⏳ LinkingProcessView.tsx
4. ⏳ FileUploadView.tsx
5. ⏳ CompletionView.tsx

### Phase 2: ロジック分離 (優先度: 中)
**所要時間**: 2-3時間  
**影響範囲**: 中

1. ⏳ LinkingProcessView.tsx - データ変換ロジック分離
2. ⏳ LinkingProcessView.tsx - ビジネスロジック分離
3. ⏳ FileUploadView.tsx - ファイル処理分離
4. ⏳ CompletionView.tsx - バリデーション分離

### Phase 3: クリーンアップ (優先度: 低)
**所要時間**: 1時間  
**影響範囲**: 小

1. ⏳ 未使用import削除
2. ⏳ CSS定義整理
3. ⏳ 未使用変数・関数削除

---

## ✅ 完了基準

- [ ] debug/info ログが適切に削除されている
- [ ] errorログは保持されている
- [ ] コンポーネントサイズが削減されている (目標: 各800行以下)
- [ ] ビジネスロジックがservices層に分離されている
- [ ] 既存のテストがすべてパスする
- [ ] 新しい分離ロジックのテストが追加されている
- [ ] ESLintエラーがない
- [ ] 未使用コードが削除されている

---

## 🚨 注意事項

1. **段階的実施**: 一度にすべて実施せず、フェーズごとに実施
2. **テスト実行**: 各フェーズ後に必ずテスト実行
3. **コミット**: フェーズごとにコミット
4. **レビュー**: 大きな変更は別ブランチで実施

---

## 📊 期待される効果

### コード品質
- **可読性**: ↑↑ (コンポーネントサイズ削減)
- **保守性**: ↑↑ (ロジック分離)
- **テスタビリティ**: ↑↑ (ビジネスロジック分離)

### パフォーマンス
- **ビルド時間**: → (ほぼ変化なし)
- **実行速度**: → (ほぼ変化なし)

### 開発効率
- **デバッグ**: ↑ (ロジック分離により特定しやすい)
- **機能追加**: ↑ (責任分離により影響範囲が明確)

---

**作成者**: GitHub Copilot  
**最終更新**: 2025年10月9日
