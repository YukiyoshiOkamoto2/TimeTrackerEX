# TimeTracker Web - 仕様書

**バージョン**: 2.0  
**最終更新**: 2025年10月9日 Phase 4完了時点  
**対応計画書**: PLAN.md v2.0

---

## 📋 目次
1. [データ処理仕様](#データ処理仕様)
2. [バリデーション機能](#バリデーション機能)
3. [セッション管理](#セッション管理)
4. [API仕様](#api仕様)
5. [設定項目](#設定項目)

---

## データ処理仕様

### 概要
TimeTracker Webアプリケーションは、勤怠情報（PDF）とスケジュール情報（ICS）を組み合わせて、TimeTrackerに登録するタスクを生成します。

---

### FileUploadViewでのデータフィルタリング

#### チェック状態によるデータの有効化

**前提条件**:
- PDFファイルがアップロードされていても、**全てのスケジュールのチェックが外れている場合は「勤怠情報なし」**として扱う
- ICSファイルがアップロードされていても、**全てのイベントのチェックが外れている場合は「スケジュール情報なし」**として扱う

**処理内容**:
- チェックされたスケジュール・イベントのみを抽出
- チェックが1つもない場合は`undefined`として扱う
- チェックされたデータが1つ以上あれば次画面へ遷移

#### 遷移条件

| PDFチェック状態 | ICSチェック状態 | newPdf | newIcs | 次画面へ遷移 |
|----------------|----------------|--------|--------|-------------|
| 全てOFF        | 全てOFF        | undefined | undefined | ❌ 遷移しない |
| 1つ以上ON      | 全てOFF        | 定義済み | undefined | ✅ 遷移する |
| 全てOFF        | 1つ以上ON      | undefined | 定義済み | ✅ 遷移する |
| 1つ以上ON      | 1つ以上ON      | 定義済み | 定義済み | ✅ 遷移する |

---

### LinkingProcessViewでの処理フロー

#### 初期チェック（Phase 4で修正済み）

**処理内容**:
- イベント（ICS）とスケジュール（PDF）の存在チェック
- どちらか一方でも存在すれば処理を継続
- 両方とも存在しない場合はエラー

**重要**: Phase 4の修正により、**PDF/ICS どちらか一方だけでも処理が実行**されるようになりました。

#### 処理ステップ

1. **無視可能イベントのフィルタリング**
   - 設定された無視パターンに一致するイベントを除外
   - プライベート・キャンセル済みイベントも除外

2. **スケジュールの有効化**
   - 休日・エラーのあるスケジュールを除外

3. **日ごとのタスク分割**
   - algorithm.tsを使用してイベントとスケジュールを日別タスクに変換

4. **有給休暇タスクの生成**
   - 有給休暇スケジュールを別フローで処理

5. **タスクの統合**
   - 通常タスクと有給休暇タスクを結合

---

### 処理パターン別の動作

#### パターン1: 勤怠情報のみ（PDFのみ）

**条件**: PDF存在、ICS未存在

**動作**: ✅ 正常に動作

**処理内容**:
- スケジュールから有効なものを抽出（休日・エラー除外）
- イベントは空配列として処理
- `scheduleAutoInputInfo`設定に基づいてスケジュールをイベントに変換
  - `startEndType`で勤務開始・終了イベントの生成パターンを決定

**結果**: 勤務時間イベントが自動生成されて登録される

---

#### パターン2: スケジュール情報のみ（ICSのみ）

**条件**: PDF未存在、ICS存在

**動作**: ✅ 正常に動作

**処理内容**:
- イベントを抽出（無視可能イベント除外）
- スケジュールは空配列として処理
- イベントをそのまま日別タスクに分割
- イベント丸め処理とWorkItem紐づけを実行

**結果**: ICSのイベントがそのまま登録対象（勤務時間イベントは生成されない）

---

#### パターン3: 両方の情報あり（PDF + ICS）

**条件**: PDF存在、ICS存在

**動作**: ✅ 正常に動作

**処理内容**:
- イベントを抽出（無視可能イベント除外）
- スケジュールを抽出（休日・エラー除外）
- 以下の順序で処理:
  1. イベントを日付ごとにマッピング・繰り返しイベント展開
  2. イベント時間を丸め処理
  3. スケジュールをイベントに変換（勤務開始・終了生成）
  4. 通常イベントと勤務時間イベントを統合
  5. 重複イベントを解消

**重複処理の動作**:
- 勤務時間外のイベントは除外
- 勤務開始・終了イベントと重複する場合、通常イベントの時刻を調整
- 重複する勤務時間イベントは削除

**結果**:
- 勤務開始・終了イベントが自動生成される
- 勤務時間内のイベントのみが登録される
- 通常イベント（ICS由来）が勤務時間イベントより優先される

---

### 処理パターン一覧表

| ケース | PDF (勤怠) | ICS (スケジュール) | Phase 4修正前 | Phase 4修正後 |
|--------|-----------|-------------------|--------------|-------------|
| **1** | ✅ あり | ❌ なし | ❌ 処理スキップ | ✅ 勤務時間イベント登録 |
| **2** | ❌ なし | ✅ あり | ✅ 正常動作 | ✅ スケジュールどおり登録 |
| **3** | ✅ あり | ✅ あり | ✅ 正常動作 | ✅ 勤務時間+スケジュール統合 |

---

### 特殊なイベント処理

#### 1. 無視可能イベント（Ignorable Events）

**設定**: `settings.timetracker.ignorableEvents`

**マッチモード**:
- `partial`: イベント名に部分一致
- `prefix`: イベント名の先頭一致
- `suffix`: イベント名の末尾一致

**効果**: 指定パターンにマッチするイベントは**完全に除外**される

---

#### 2. 休暇イベント（Time Off Events）

**設定**: `settings.timetracker.timeOffEvent`

**内容**:
- `namePatterns`: イベント名のパターンリスト
- `workItemId`: 紐づけ先WorkItem ID

**効果**:
- パターンにマッチするイベントは自動的に指定WorkItemに紐づけられる
- 他の自動紐づけより**優先**される（Phase 3-1で最初に処理）

---

#### 3. 有給休暇（Paid Leave）

**設定**: `settings.timetracker.paidLeaveInputInfo`

**内容**:
- `workItemId`: 有給休暇用WorkItem ID
- `startTime`: 開始時刻（例: "09:00"）
- `endTime`: 終了時刻（例: "18:00"）

**処理**:
- PDF内の`isPaidLeave: true`のスケジュールを抽出
- 設定の時刻を使用してイベント生成
- 通常スケジュールとは別フローで処理

**効果**: 有給休暇は自動的に専用WorkItemに紐づけられる

---

#### 4. 休日スケジュール（Holiday）

**処理**: Phase 1-2で除外

**除外条件**:
- `isHoliday: true`のスケジュール
- `errorMessage`が存在するスケジュール

**効果**: 勤務時間イベント生成の対象外（ただし有給休暇として処理される可能性あり）

---

## Algorithm.ts - 1日分タスク算出ロジック

### 概要
`TimeTrackerAlgorithm`クラスは、イベント（スケジュール情報）と勤怠スケジュールを統合し、TimeTrackerに登録する1日ごとのタスク（`DayTask`）を生成します。

### splitOneDayTask メソッド

**目的**: イベントとスケジュールを受け取り、日付ごとにタスク（`DayTask[]`）を生成

#### 1. 日付ごとにイベントをマッピング

**処理内容**:
- イベントを日付キー（"YYYY-MM-DD"）でグループ化
- 繰り返しイベント（`recurrence`）を各日付に展開
- 複数日にまたがるイベントは各日付に独立したイベントとして登録

#### 2. 勤務時間範囲外のイベント削除

**処理内容**:
- スケジュール（PDF）の最小日付～最大日付を算出
- 勤務期間外の日付を削除

**効果**: PDFに登録されている勤務日以外のイベント（ICSのみに存在）は除外される

#### 3. 複数日にまたがるイベントの分割

**処理内容**: イベントの終了日が開始日と異なる場合、日付ごとに分割

**分割ルール**:
- **初日**: 開始時刻 ～ 23:30
- **中間日**: 00:00 ～ 23:30
- **最終日**: 00:00 ～ 終了時刻

**例**: `2025-10-09 14:00 ～ 2025-10-11 10:00` → 3日分のイベントに分割

#### 4. イベント時間の丸め処理

**丸め方法** (`roundingTimeType`):
- `backward`: 切り上げ（9:22 → 9:30）
- `forward`: 切り捨て（9:22 → 9:00）
- `round`: 四捨五入（9:22 → 9:30）
- `stretch`: 開始は切り捨て、終了は切り上げ（9:12～10:22 → 9:00～10:30）
- `half`: 15分単位の半端処理
- `nonduplicate`: 重複回避（他イベントと重複しない方向に丸める）

**丸め単位**: 30分固定

**補足**: 丸めた結果30分未満になった場合、そのイベントは削除される

#### 5. スケジュールからイベント生成

**処理内容**: スケジュール（勤務時間）から勤務開始・終了イベントを生成

**生成パターン** (`startEndType`):
- `both`: 勤務開始 + 勤務終了の2イベント
- `start`: 勤務開始のみ
- `end`: 勤務終了のみ
- `fill`: 勤務開始 + 勤務終了 + 空き時間を埋めるイベント群

**fillモードの動作**:
- 勤務時間を30分単位で分割
- 既存イベントと重複しない時間帯のみ"勤務中"イベントを生成
- 連続する時間スロットは自動的に結合

#### 6. スケジュールイベントと通常イベントの統合

```typescript
const mergedEventMap = this.margedScheduleEvents(scheduleEventMap, roundedEventMap);
```

**margedScheduleEvents メソッド**:
1. 勤務時間外のイベントを削除
2. 勤務開始イベントとの重複チェック → 重複する場合は通常イベントが勤務開始時刻から開始
3. 勤務終了イベントとの重複チェック → 重複する場合は通常イベントが勤務終了時刻まで延長
4. 重複しない勤務開始・終了イベントを追加

**例**:
```
勤務時間: 09:00～18:00 (startEndType="both", startEndTime=30)
  → 勤務開始: 09:00～09:30
  → 勤務終了: 17:30～18:00

通常イベント: 09:15～10:00 "会議"

統合結果:
  - 会議: 09:00～10:00 (勤務開始と重複 → 開始時刻を09:00に調整)
  - 勤務終了: 17:30～18:00 (重複なし → そのまま追加)
```

#### 7. 重複イベントの解消

```typescript
const cleanedEventMap = this.cleanDuplicateEvent(mergedEventMap, this.eventInputInfo.eventDuplicateTimeCompare);
```

**cleanDuplicateEvent メソッド**:
1. `timeCompare`設定に基づいてイベントをソート
   - `"small"`: 時間が短いイベントを優先
   - `"large"`: 時間が長いイベントを優先
2. 時系列順に重複をチェック
3. 重複する場合、優先度の低いイベントを削除または切り詰め

**アルゴリズム**:
```typescript
// searchNextEvent を使って次の有効なイベントを探索
// 重複する場合、優先度の高いイベントを残し、低いイベントは:
//   - 完全に重複 → 削除
//   - 部分重複 → 時間を調整（開始時刻or終了時刻をずらす）
```

#### 8. イベントのフィルタリング

```typescript
const result: DayTask[] = [];

for (const [dateKey, eventsForDate] of cleanedEventMap.entries()) {
    const checkedEvents = this.checkEvent(eventsForDate);
    const baseDate = new Date(dateKey);
    
    result.push({
        baseDate,
        project: this.project,
        events: checkedEvents.filter((e) => !e.workingEventType),        // 通常イベント
        scheduleEvents: checkedEvents.filter((e) => e.workingEventType), // 勤務時間イベント
    });
}
```

**checkEvent メソッド**: 以下の条件でイベントを除外
- 6時間以上のイベント
- 未来のイベント（開始時刻が現在より未来）
- 30日以上前のイベント
- 開始=終了、または30分未満のイベント

**補足**: 
- `workingEventType`プロパティでイベント種別を区別
  - `"start"`: 勤務開始
  - `"end"`: 勤務終了
  - `"middle"`: 勤務中（fillモード）
  - `undefined`: 通常イベント（ICS由来）

### 処理まとめ

```
入力: Event[], Schedule[]
  ↓
1. 日付ごとにマッピング（繰り返しイベント展開）
  ↓
2. 勤務期間外のイベント削除
  ↓
3. 複数日イベントを日別に分割
  ↓
4. イベント時間を丸める（roundingTimeType）
  ↓
5. スケジュール→イベント変換（勤務開始・終了生成）
  ↓
6. 通常イベントと勤務時間イベントを統合
  ↓
7. 重複イベントを解消（eventDuplicateTimeCompare）
  ↓
8. 無効なイベントをフィルタリング
  ↓
出力: DayTask[] (日付ごとのタスク)
```

---

## LinkingProcessView - 全体処理フロー

### 概要
`LinkingProcessView`では、PDFとICSのデータを統合してTimeTrackerに登録するタスクを生成します。処理は大きく3つのフェーズに分かれます。

### 処理フェーズ

```
Phase 1: データフィルタリング
  → 無視可能イベント除外
  → 有効なスケジュール抽出
  
Phase 2: タスク算出 (algorithm.ts)
  → 勤務時間範囲外イベント除外
  → イベント分割・丸め処理
  → 勤務時間イベント生成
  → 重複解消
  
Phase 3: WorkItem紐づけ
  → 休暇イベント自動紐づけ
  → 履歴からの自動紐づけ
  → 手動入力
```

---

### Phase 1: データフィルタリング

**実装場所**: `LinkingProcessView.tsx` の `performAutoLinking` メソッド

**処理内容**:

```typescript
// 1-1. 無視可能イベントの除外
const ignorableEvents = settings.timetracker.ignorableEvents || [];
const enableEvents = hasEvents 
    ? getEnableEvents(uploadInfo.ics!.event, ignorableEvents)
    : [];

// getEnableEvents 内部処理:
//   - isPrivate: true → 除外
//   - isCancelled: true → 除外
//   - ignorableEvents パターンマッチ → 除外

// 1-2. 有効なスケジュールの抽出
const allSchedules = uploadInfo.pdf?.schedule || [];
const enableSchedules = getEnableSchedules(allSchedules);

// getEnableSchedules 内部処理:
//   - isHoliday: true → 除外
//   - errorMessage 存在 → 除外
```

**除外されるデータ**:
- プライベートイベント
- キャンセル済みイベント
- 無視パターンに一致するイベント
- 休日スケジュール
- エラーのあるスケジュール

**Phase 1の結果**:
- `enableEvents[]` - フィルタリング済みイベント
- `enableSchedules[]` - フィルタリング済みスケジュール

---

### Phase 2: タスク算出 (algorithm.ts)

**実装場所**: `eventLinkingService.ts` の `splitEventsByDay` → `algorithm.ts` の `splitOneDayTask`

**処理順序**:

#### 2-1. 日付ごとにイベントをマッピング
```typescript
// イベントを "YYYY-MM-DD" キーでグループ化
// 繰り返しイベントも展開
```

#### 2-2. 勤務時間範囲外のイベント除外 ★重要
```typescript
if (schedules.length > 0) {
    const minDate = new Date(Math.min(...scheduleDates));
    const maxDate = new Date(Math.max(...scheduleDates));
    
    // PDFの勤務期間外の日付を削除
    for (const dateKey of dayMap.keys()) {
        if (dateKey < minDateKey || dateKey > maxDateKey) {
            dayMap.delete(dateKey);
        }
    }
}
```

**効果**: PDFに登録されている勤務期間外のICSイベントが除外される

#### 2-3. 複数日イベントの分割
```typescript
// 初日: 開始時刻 ～ 23:30
// 中間日: 00:00 ～ 23:30
// 最終日: 00:00 ～ 終了時刻
```

#### 2-4. イベント時間の丸め処理

**処理内容**: イベントの開始・終了時刻を設定された丸め方法で調整

**丸め方法** (`roundingMethod`):
- `none`: 丸めなし（元の時刻）
- `round`: 四捨五入
- `floor`: 切り捨て
- `ceil`: 切り上げ

**丸め単位**: `roundingTime`（分）

#### 2-5. スケジュールからイベント生成

**処理内容**: スケジュール（勤務時間）から勤務開始・終了イベントを生成

**生成パターン** (`startEndType`):
- `both`: 勤務開始 + 勤務終了の2イベント
- `start`: 勤務開始のみ
- `end`: 勤務終了のみ
- `fill`: 勤務開始 + 勤務終了 + 空き時間を埋めるイベント群

**fillモードの動作**:
- 勤務時間を30分単位で分割
- 既存イベントと重複しない時間帯のみ"勤務中"イベントを生成
- 連続する時間スロットは自動的に結合

#### 2-6. スケジュール+通常イベントのマージ

**処理内容**: スケジュールから生成したイベントと通常イベントを時刻順にマージ

#### 2-7. 重複イベントの解消

**処理内容**: 同一時間帯の重複イベントを統合

**比較方法** (`timeCompare`):
- `small`: 短い方を優先
- `large`: 長い方を優先

#### 2-8. 無効なイベントのフィルタリング

**除外条件**:
- 6時間以上のイベント
- 未来のイベント
- 30日以上前のイベント
- 30分未満のイベント

#### 2-7. 重複イベントの解消
```typescript
// cleanDuplicateEvent() で重複を解消
// timeCompare: "small" | "large"
```

#### 2-8. 無効なイベントのフィルタリング
```typescript
// checkEvent() で以下を除外:
// - 6時間以上のイベント
// - 未来のイベント
// - 30日以上前のイベント
// - 30分未満のイベント
```

**Phase 2の結果**:
- `DayTask[]` - 日付ごとのタスク（events[] と scheduleEvents[] を含む）

---

### Phase 3: WorkItem紐づけ

**実装場所**: `eventLinkingService.ts` の `autoLinkEvents`

**処理順序**:

#### 3-1. 休暇イベントの自動紐づけ（優先度: 高）

**処理内容**: 休暇イベントを自動紐づけ

**マッチング条件**: `timeOffEvent.namePatterns` に一致するイベント名

#### 3-2. 履歴からの自動紐づけ（優先度: 中）

**処理内容**: 履歴から自動紐づけ（設定で有効化された場合のみ）

**マッチング条件**: `uuid|name|organizer` の組み合わせで履歴検索

#### 3-3. 手動入力（優先度: 低）

**処理内容**: ユーザーがUIで選択して紐づけ

**履歴保存**: 選択結果は次回の自動紐づけのために履歴に保存

**Phase 3の結果**:
- `EventWorkItemPair[]` - 紐づけ完了
- `Event[]` - 未紐づけイベント（手動入力待ち）

---

### 全体処理フロー図

```
FileUploadView
  ├─ PDF: Schedule[] (チェック済み)
  └─ ICS: Event[] (チェック済み)
         ↓
═══════════════════════════════════════════════
Phase 1: データフィルタリング (LinkingProcessView)
═══════════════════════════════════════════════
         ↓
  [1-1] 無視可能イベント除外 (getEnableEvents)
         - isPrivate: true → 除外
         - isCancelled: true → 除外
         - ignorableEvents パターンマッチ → 除外
         ↓
  enableEvents[] (フィルタリング済みイベント)
         ↓
  [1-2] 有効なスケジュール抽出 (getEnableSchedules)
         - isHoliday: true → 除外
         - errorMessage → 除外
         ↓
  enableSchedules[] (フィルタリング済みスケジュール)
         ↓
═══════════════════════════════════════════════
Phase 2: タスク算出 (algorithm.ts)
═══════════════════════════════════════════════
         ↓
  [2-1] 日付ごとにマッピング
         - 繰り返しイベント展開
         ↓
  [2-2] 勤務時間範囲外イベント除外 ★重要
         - PDFの勤務期間外 → 除外
         ↓
  [2-3] 複数日イベント分割
         - 初日/中間日/最終日に分割
         ↓
  [2-4] イベント時間丸め処理
         - roundingTimeType 適用
         ↓
  [2-5] スケジュール→イベント変換
         - 勤務開始・終了イベント生成
         ↓
  [2-6] スケジュールイベントと通常イベント統合
         - 勤務時間外イベント削除
         - 重複処理
         ↓
  [2-7] 重複イベント解消
         - timeCompare 適用
         ↓
  [2-8] 無効イベントフィルタリング
         - 6時間以上/未来/30日前/30分未満 → 除外
         ↓
  DayTask[] (日付ごとのタスク)
         ↓
═══════════════════════════════════════════════
Phase 3: WorkItem紐づけ (eventLinkingService)
═══════════════════════════════════════════════
         ↓
  [3-1] 休暇イベント自動紐づけ
         - timeOffEvent.namePatterns マッチ → 自動紐づけ
         ↓
  [3-2] 履歴からの自動紐づけ
         - uuid|name|organizer マッチ → 自動紐づけ
         ↓
  [3-3] 手動入力 (UI)
         - ユーザーが選択
         - 履歴に保存
         ↓
  EventWorkItemPair[] (紐づけ完了)
         ↓
CompletionView (登録確認・実行)
```

---

### 処理順序の重要ポイント

#### ポイント1: 無視可能イベント除外は最初

```
無視可能イベント除外 (Phase 1)
  ↓
勤務時間範囲外イベント除外 (Phase 2-2)
```

**理由**: 
- 無視可能イベントは**完全にシステムから除外**する必要がある
- algorithm.tsに渡す前に除外することで、不要な計算を回避

#### ポイント2: 勤務時間範囲外除外はalgorithm.ts内

```
Phase 1: enableEvents[] 生成
  ↓
Phase 2-1: 日付ごとマッピング
  ↓
Phase 2-2: 勤務時間範囲外除外 ★ここで実行
```

**理由**:
- 日付ごとのマッピング後でないと勤務期間が判断できない
- PDFの勤務日（minDate～maxDate）に基づいて除外

#### ポイント3: WorkItem紐づけは最後

```
Phase 2: タスク算出完了
  ↓
Phase 3: WorkItem紐づけ開始
```

**理由**:
- タスク算出で生成されたイベント（勤務開始・終了、有給休暇等）を含めて紐づけ
- 紐づけ結果を履歴に保存するため、確定したイベントのみを対象

---

### 除外処理のまとめ表

| Phase | 処理 | 除外条件 | 実装場所 | タイミング |
|-------|------|---------|---------|----------|
| **1-1** | 無視可能イベント除外 | isPrivate / isCancelled / ignorableEvents | `getEnableEvents` | 最初 |
| **1-2** | 無効スケジュール除外 | isHoliday / errorMessage | `getEnableSchedules` | 最初 |
| **2-2** | 勤務時間範囲外除外 | PDFの勤務期間外の日付 | `algorithm.ts` | 日付マッピング後 |
| **2-6** | 勤務時間外イベント削除 | 勤務開始～終了時刻外 | `margedScheduleEvents` | 統合処理時 |
| **2-8** | 無効イベント除外 | 6時間以上/未来/30日前/30分未満 | `checkEvent` | 最終フィルタ |

**注意**: 
- Phase 1の除外は**取り消し不可**（完全に対象外）
- Phase 2-2, 2-6, 2-8は**タスク算出ロジックの一部**
- Phase 2で除外されたイベントはPhase 3の紐づけ対象外

---

## WorkItemId紐づけの優先順位

### 概要
Phase 3（WorkItem紐づけ）では、以下の優先順位で処理されます。Phase 1で除外されたイベント、Phase 2で除外されたイベントは紐づけの対象外です。

### 優先順位

**前提**: Phase 1, Phase 2を通過したイベントのみが紐づけ対象

#### 1. 休暇イベントの自動紐づけ（優先度: 高）

**実装場所**: `autoLinkEvents`関数内、最初の自動紐づけ

**マッチング条件**:
- イベント名が `timeOffConfig.namePatterns` に一致
- 一致したイベントは `timeOffConfig.workItemId` に紐づけ

**設定項目**:
- `namePatterns`: マッチングパターンのリスト（例: ["有給", "休暇", "PTO"]）
- `workItemId`: 紐づけ先WorkItem ID

**処理結果**:
- マッチしたイベント → `linked[]` に追加
- マッチしなかったイベント → `remaining[]` として次の処理へ

#### 2. 履歴からの自動紐づけ（優先度: 中）

**実装場所**: `autoLinkEvents`関数内、休暇イベント紐づけの後

**有効条件**: `settings.isHistoryAutoInput === true`

**マッチング条件**:
- `uuid|name|organizer` の組み合わせで履歴検索
- 履歴に存在する場合、履歴の `workItemId` に紐づけ

**処理結果**:
- 履歴にマッチ → `linked[]` に追加
- マッチしなかった → `remaining[]` として手動入力待ち

#### 3. 手動入力（優先度: 低）

**実装場所**: LinkingProcessView UI

**処理**:
- ユーザーがUIでWorkItemを選択
- 選択結果を `pairs[]` に追加
- 選択結果は履歴に保存（次回の自動紐づけで使用）

---

## WorkItemId紐づけの詳細処理

### 休暇イベント紐づけ詳細

**効果**:
- パターンにマッチするイベントは**自動的に休暇用WorkItemに紐づけ**
- 履歴による自動紐づけより**優先**
- 設定が未設定の場合はスキップ

### 履歴紐づけ詳細

**有効条件**: `settings.isHistoryAutoInput === true`

**マッチングキー**: `uuid|name|organizer`

**履歴エントリ**:
- `eventName`: イベント名
- `itemId`: WorkItem ID
- `itemName`: WorkItem名
- `useCount`: 使用回数
- `lastUsedDate`: 最終使用日時

**履歴の永続化**:
- LocalStorageに保存（CSV形式）
- 最大300件、古いエントリから自動削除

**効果**:
- 過去に同じイベントを登録した場合、同じWorkItemに自動紐づけ
- `isHistoryAutoInput`設定で無効化可能
- 休暇イベント紐づけの後に処理

### 手動入力詳細

**処理**: ユーザーがUIでWorkItemを選択して紐づけ

**対象**: 自動紐づけで紐づかなかったイベント

**操作**:
1. 未紐づけイベント一覧表示
2. ドロップダウンからWorkItem選択
3. 「紐づけを確定」で次の画面へ

**補足**: 
- 自動紐づけ済みも手動で変更可能
- 手動紐づけ結果は履歴に保存

---

### 優先順位まとめ

| 優先度 | 処理 | 対象 | 設定 | 効果 |
|-------|------|------|------|------|
| **1** | 休暇イベント | Phase 2通過イベント | `timeOffEvent` | 自動紐づけ（最優先） |
| **2** | 履歴紐づけ | 残りイベント | `isHistoryAutoInput` | 自動紐づけ（2番目） |
| **3** | 手動入力 | 未紐づけイベント | なし | ユーザー選択 |

**重要**: 
- Phase 1, 2で除外されたイベントは紐づけ対象外
- 優先度1～2の自動紐づけは**手動で上書き可能**
- 手動紐づけ結果は履歴に保存

---

## バリデーション機能

### 概要
設定に不正な項目がある場合、自動的にFileUploadViewに戻り、エラーダイアログを表示します。

### 検証条件
- `validationErrors.timeTracker`にエラーがある
- 現在のビューが`upload`以外(linking または completion)

### エラー時の動作
1. バリデーションエラー検出
2. FileUploadViewに自動的に戻る
3. エラーダイアログ表示（エラー内容を箇条書き）
4. OKボタンで設定ページ(TimeTracker)に遷移

---

## セッション管理

### sessionStorage 永続化

**実装場所**: `src/pages/timetracker/hooks/sessionStorage.ts`

**ストレージキー**:
- `timetracker_auth`: 認証情報 + 有効期限
- `timetracker_project`: プロジェクト情報
- `timetracker_workitems`: 作業項目リスト

**主要関数**:
- `loadAuth()`, `saveAuth()`, `clearAuth()`: 認証管理
- `loadProject()`, `saveProject()`, `clearProject()`: プロジェクト管理
- `loadWorkItems()`, `saveWorkItems()`, `clearWorkItems()`: 作業項目管理
- `clearAllSession()`: 全クリア

**認証有効期限チェック**: `loadAuth()`で有効期限切れを自動削除

### useTimeTrackerSession カスタムフック

**実装場所**: `src/pages/timetracker/hooks/useTimeTrackerSession.ts`

**State**:
- `isAuthenticated`: 認証状態
- `auth`: 認証情報
- `project`: プロジェクト情報
- `workItems`: 作業項目リスト
- `isLoading`: ローディング状態
- `isAuthenticating`: 認証中
- `error`: エラーメッセージ
- `isPasswordDialogOpen`: パスワードダイアログ表示状態

**Actions**:
- `authenticateWithDialog()`: パスワードダイアログを開く
- `authenticateWithPassword(password)`: 認証実行
- `logout()`: ログアウト
- `fetchProjectAndWorkItems(projectId)`: データ取得
- `registerTask(task)`: タスク登録
- `clearError()`: エラークリア
}
```

#### 使用例

```typescript
const {
    isAuthenticated,
    project,
    workItems,
    isPasswordDialogOpen,
    authenticateWithDialog,
    authenticateWithPassword,
    fetchProjectAndWorkItems,
    registerTask,
    clearError,
} = useTimeTrackerSession({
    baseUrl: "https://timetracker.example.com",
    userName: "user@example.com",
    tokenExpirationMinutes: 60, // オプション（デフォルト60分）
});

// 認証チェック
if (!isAuthenticated) {
    authenticateWithDialog();
    return;
}

// データ取得
await fetchProjectAndWorkItems("12345");

// タスク登録
await registerTask({
    workItemId: "WI-001",
    startTime: new Date("2025-10-09 09:00"),
    endTime: new Date("2025-10-09 18:00"),
    memo: "作業内容",
});
```

#### 自動ログアウト機能

認証エラー（401 Unauthorized）が発生した場合、自動的にログアウトします。

```typescript
if (isAuthenticationError(error)) {
    logger.warn("認証エラーが発生したため、自動ログアウトします");
    clearAllSession();
    setAuth(null);
    setProject(null);
    setWorkItems(null);
    setIsAuthenticated(false);
    setError("認証が切れました。再度ログインしてください。");
}
```

---

## API仕様

### ステートレスAPI関数

**実装場所**: `src/core/api/timeTracker.ts`

**TimeTrackerAuth型**:
- `token`: 認証トークン
- `userId`: ユーザーID

**API関数**:

1. **authenticateAsync(baseUrl, userName, password)**: 認証
   - 戻り値: `TimeTrackerAuth`

2. **getProjectAsync(baseUrl, projectId, auth)**: プロジェクト取得
   - 戻り値: `Project`

3. **getWorkItemsAsync(baseUrl, projectId, auth)**: 作業項目取得
   - 戻り値: `WorkItem[]`

4. **registerTaskAsync(baseUrl, userId, task, auth)**: タスク登録
   - 戻り値: `void`

5. **isAuthenticationError(error)**: 認証エラー判定
   - 判定条件: HTTPステータス401 または エラーメッセージに「認証」を含む
   - 戻り値: `boolean`

---

## TimeTracker 設定仕様

### scheduleInputInfo（勤務時間の入力設定）

**パラメータ**:
- `startEndType`: `"both"` / `"start"` / `"end"` / `"fill"`（勤務開始・終了イベントの生成パターン）
- `startEndTime`: 勤務開始・終了イベントの所要時間（分）

**影響範囲**: 全ケースでスケジュールからイベント生成時に使用

### roundingSchedule（イベント時間の丸め処理）

**パラメータ**:
- `roundingMethod`: `"none"` / `"round"` / `"floor"` / `"ceil"`（丸め方法）
- `roundingTime`: 丸め単位（分）

**影響範囲**: ICS onlyケースで開始・終了時刻の丸め処理

### roundingTimeType（時間調整タイプ）

**種類**: `"backward"` / `"forward"` / `"round"` / `"stretch"` / `"half"` / `"nonduplicate"`

**影響範囲**: 全ケースのイベント時間調整

### eventDuplicatePriority（イベント重複時の優先判定）

**パラメータ**:
- `timeCompare`: `"small"`（短い方を優先） / `"large"`（長い方を優先）
- `startEndType`: StartEndType

**影響範囲**: 重複イベントの削除優先順位決定

### ignorableEvents（無視可能イベント）

**パラメータ**:
- `pattern`: パターン文字列
- `matchMode`: `"partial"` / `"prefix"` / `"suffix"`（マッチング方法）

**影響範囲**: Phase 1でイベント除外

### timeOffEvent（休暇イベント）

**パラメータ**:
- `namePatterns`: 休暇イベントのパターンリスト
- `workItemId`: 紐づけ先WorkItem ID

**処理優先順位**: 最高（Phase 3で最初に自動紐づけ）

### paidLeaveInputInfo（有給休暇）

**パラメータ**:
- `workItemId`: 有給休暇用WorkItem ID
- `startTime`: 開始時刻（"09:00"）
- `endTime`: 終了時刻（"18:00"）

**処理**: PDF内の`isPaidLeave: true`のスケジュールを別フローで処理

---

**ドキュメントバージョン**: 3.0  
**最終更新者**: GitHub Copilot  
**最終更新日**: 2025年10月9日
