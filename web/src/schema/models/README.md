# Models Schema

`models.ts`の型定義に対応するZodスキーマ定義です。

## 概要

このディレクトリには、TimeTrackerアプリケーションで使用されるドメインモデルのZodスキーマ定義が含まれています。Zodを使用することで、実行時のバリデーション、型安全性、自動型推論が提供されます。

## 主な機能

### バリデーション機能

- **型チェック**: 各フィールドの型が正しいことを検証
- **必須フィールドチェック**: 必須フィールドが存在することを検証
- **カスタムバリデーション**: ビジネスロジックに基づく検証ルール
- **詳細なエラーメッセージ**: バリデーションエラー時に日本語のエラーメッセージを提供

### スキーマ一覧

#### 基本スキーマ

- **WorkingEventTypeSchema**: 勤務イベントタイプ (`"start"` | `"middle"` | `"end"`)
- **RoundingMethodSchema**: 時間の丸め処理タイプ
- **TimeCompareSchema**: 時間比較方法 (`"small"` | `"large"`)

#### エンティティスキーマ

- **ScheduleSchema**: スケジュール情報
  - 開始/終了時間のバリデーション
  - 有給休暇と休日フラグの整合性チェック
  - 時間の前後関係のチェック

- **EventSchema**: イベント情報
  - UUID、名前、主催者などの必須フィールド
  - スケジュール情報の検証
  - 繰り返しイベントのサポート

- **ProjectSchema**: プロジェクト情報
  - プロジェクトID、名前、コードの検証

- **WorkItemSchema**: 作業項目情報
  - 再帰的なサブ項目の構造をサポート
  - フォルダパス情報の管理

#### 複合スキーマ

- **DayTaskSchema**: 日次タスク情報
  - 基準日とイベントリストの検証

- **EventInputInfoSchema**: イベント入力情報
  - 重複時の処理方法の設定

- **EventWorkItemPairSchema**: イベントと作業項目のペア

- **TimeTrackerDayTaskSchema**: TimeTracker日次タスク
  - プロジェクト、日付、イベント/作業項目ペアの統合検証

## 使用方法

### 基本的な使い方

```typescript
import { EventSchema, type Event } from "@/schema/models";

// パース（バリデーション + 型変換）
const event = EventSchema.parse({
    uuid: "test-001",
    name: "ミーティング",
    organizer: "user@example.com",
    isPrivate: false,
    isCancelled: false,
    location: "会議室A",
    schedule: {
        start: new Date("2024-01-01T09:00:00"),
        end: new Date("2024-01-01T10:00:00"),
        isHoliday: false,
        isPaidLeave: false,
    },
});

// セーフパース（エラーを例外として投げない）
const result = EventSchema.safeParse(data);
if (result.success) {
    console.log("有効なデータ:", result.data);
} else {
    console.error("バリデーションエラー:", result.error);
}
```

### 部分的なバリデーション

```typescript
import { EventSchema } from "@/schema/models";

// 一部のフィールドのみをバリデーション
const PartialEventSchema = EventSchema.partial();

// 特定のフィールドのみを取得
const EventNameSchema = EventSchema.pick({ name: true });
```

### カスタムバリデーション

```typescript
import { EventSchema } from "@/schema/models";

// 追加のバリデーションルールを適用
const StrictEventSchema = EventSchema.refine(
    (data) => data.name.length <= 100,
    {
        message: "イベント名は100文字以内である必要があります",
    },
);
```

## バリデーションルール

### ScheduleSchema

1. **時間の前後関係**: 終了時間は開始時間より後である必要があります
2. **有給休暇の整合性**: 有給休暇の場合、休日フラグも設定する必要があります
3. **必須フィールド**: 開始時間は必須です

### EventSchema

1. **UUID**: 空文字列不可
2. **名前**: 空文字列不可
3. **スケジュール**: ScheduleSchemaのルールに従う

### ProjectSchema

1. **ID**: 空文字列不可
2. **名前**: 空文字列不可
3. **プロジェクトコード**: 空文字列不可

### WorkItemSchema

1. **ID**: 空文字列不可
2. **名前**: 空文字列不可
3. **サブ項目**: 再帰的な構造をサポート

## テスト

テストファイル: `modelsSchema.test.ts`

テストケース数: 58テスト

### テストカバレッジ

- ✅ WorkingEventTypeSchema: 2テスト
- ✅ ScheduleSchema: 8テスト
- ✅ EventSchema: 8テスト
- ✅ ProjectSchema: 4テスト
- ✅ WorkItemChildrenSchema: 3テスト
- ✅ WorkItemSchema: 3テスト
- ✅ DayTaskSchema: 3テスト
- ✅ RoundingMethodSchema: 2テスト
- ✅ TimeCompareSchema: 2テスト
- ✅ EventInputInfoSchema: 2テスト
- ✅ EventWorkItemPairSchema: 2テスト
- ✅ TimeTrackerDayTaskSchema: 3テスト

### テスト実行

```bash
# すべてのテストを実行
npm test

# modelsスキーマのテストのみを実行
npm test -- modelsSchema.test.ts

# ウォッチモードで実行
npm test -- --watch modelsSchema.test.ts
```

## 型推論

ZodスキーマからTypeScriptの型を自動生成できます:

```typescript
import { z } from "zod";
import { EventSchema } from "@/schema/models";

// Zodスキーマから型を推論
type Event = z.infer<typeof EventSchema>;

// または、エクスポートされた型を直接使用
import { type Event } from "@/schema/models";
```

## エラーハンドリング

```typescript
import { EventSchema } from "@/schema/models";
import { ZodError } from "zod";

try {
    const event = EventSchema.parse(data);
} catch (error) {
    if (error instanceof ZodError) {
        // 詳細なエラー情報を取得
        error.errors.forEach((err) => {
            console.error(`フィールド: ${err.path.join(".")}`);
            console.error(`エラー: ${err.message}`);
        });
    }
}
```

## 依存関係

- `zod`: スキーマバリデーションライブラリ

## 関連ファイル

- `@/types/models.ts`: TypeScript型定義（Zodスキーマの元となる型）
- `@/types/settings.ts`: RoundingMethod、TimeCompareの型定義

## 今後の拡張

- [ ] より詳細なバリデーションルールの追加
- [ ] パフォーマンス最適化（必要に応じて）
- [ ] カスタムエラーメッセージのローカライゼーション対応
- [ ] スキーマのバージョニング管理
