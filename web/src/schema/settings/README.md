# Settings Schema

設定のバリデーションとJSON変換を提供するモジュールです。

## 概要

このモジュールは、TimeTracker設定の定義、バリデーション、JSON変換機能を提供します。
Zodを使用せず、カスタムバリデーションロジックで実装されています。

## モジュール構成

### settingsDefinition.ts

コアとなる設定定義のクラスとバリデーション機能を提供します。

**エクスポート:**
- クラス定義: `BaseSettingValueInfo`, `StringSettingValueInfo`, `BooleanSettingValueInfo`, `NumberSettingValueInfo`, `ArraySettingValueInfo`, `ObjectSettingValueInfo`
- バリデーション型: `ValidationResult`, `ValidationSuccess`, `ValidationFailure`
- 各クラスは`validate()`メソッドでバリデーションを実行
- `ObjectSettingValueInfo`は`validatePartial()`メソッドで部分バリデーションをサポート

**主要機能:**
- Props パターンでのコンストラクタ: `new ClassName({ name, description, required, ... })`
- 型安全なバリデーション: ジェネリクスによる型推論
- 再帰的なオブジェクト検証: ネストされた構造に対応
- 部分バリデーション: UI更新時の個別フィールド検証

### timetrackerDefinition.ts

TimeTracker固有の設定定義を提供します。

**エクスポート:**
- `TIMETRACKER_SETTINGS_DEFINITION`: TimeTracker設定の定義（ObjectSettingValueInfoインスタンス）
  - `validate()`: 完全な設定のバリデーション
  - `validatePartial()`: 部分的な設定のバリデーション（必須チェックなし）

### settingUtils.ts

設定関連のユーティリティ関数を提供します。

**エクスポート:**
- `updateErrorValue()`: 不正なフィールドのみデフォルト値に置き換え（再帰的）
- `getFieldDefaultValue()`: フィールドのデフォルト値を取得（再帰的）

### テストファイル

- **settingsDefinition.test.ts**: 71個の包括的なテストケース
  - 基本バリデーション（各型ごと）
  - validatePartialメソッドのテスト（16件）
  - エラーハンドリング
  
- **timetrackerDefinition.test.ts**: 42個の包括的なテストケース
  - 定義の構造確認
  - 完全バリデーション
  - 部分バリデーション（29件）
  
- **settingUtils.test.ts**: 27個の包括的なテストケース
  - updateErrorValue（19件）
  - getFieldDefaultValue（8件）

## アーキテクチャ

### 依存関係

```
settingsDefinition.ts (基底クラス群)
  ↑ (imports)
timetrackerDefinition.ts (TimeTracker設定定義)
  ↑ (imports)
settingUtils.ts (ユーティリティ関数)
```

- `settingsDefinition.ts`: 基礎となるクラス定義とバリデーション機能
  - Props パターンのコンストラクタ
  - `validate()` と `validatePartial()` メソッド
  - 型安全な設計
  
- `timetrackerDefinition.ts`: TimeTracker固有の設定定義
  - settingsDefinition.tsのクラスを使用してインスタンス化
  - `TIMETRACKER_SETTINGS_DEFINITION` をエクスポート
  
- `settingUtils.ts`: ユーティリティ関数
  - デフォルト値の取得
  - エラー修正機能

## 主な機能

### 1. 設定定義クラス

各設定項目はクラスインスタンスとして定義されます。すべてのクラスは以下のpropsパターンを使用します：

```typescript
new StringSettingValueInfo({
    name: "フィールド名",
    description: "説明",
    required: true,
    defaultValue: "デフォルト値",  // オプション
    // 型固有のプロパティ
})
```

**共通プロパティ:**
- `name`: 表示名（UI用）
- `description`: 説明文
- `required`: 必須かどうか
- `defaultValue`: デフォルト値（オプション）

**型固有のプロパティ:**
- `StringSettingValueInfo`: `minLength`, `maxLength`, `pattern`, `literals`, `isUrl`
- `NumberSettingValueInfo`: `integer`, `positive`, `literals`
- `ArraySettingValueInfo`: `itemType`, `itemSchema`, `minItems`, `maxItems`
- `ObjectSettingValueInfo`: `children`, `disableUnknownField`

### 2. バリデーション

#### 完全バリデーション - `validate()`

すべての必須フィールドを含む完全な設定オブジェクトを検証します。

```typescript
import { TIMETRACKER_SETTINGS_DEFINITION } from "./timetrackerDefinition";

const result = TIMETRACKER_SETTINGS_DEFINITION.validate({
    userName: "test",
    baseUrl: "https://timetracker.example.com",
    baseProjectId: 123,
    roundingTimeTypeOfEvent: "nonduplicate",
    isHistoryAutoInput: true,
    eventDuplicatePriority: { timeCompare: "small" },
    scheduleAutoInputInfo: {
        startEndType: "both",
        roundingTimeTypeOfSchedule: "half",
        startEndTime: 30,
        workItemId: 456,
    },
});

if (!result.isError) {
    console.log("Valid settings");
} else {
    console.error("Validation error:", result.errorMessage);
}
```

#### 部分バリデーション - `validatePartial()`

部分的な設定を検証します（必須チェックなし）。UIでの個別フィールド更新時に使用します。

```typescript
import { TIMETRACKER_SETTINGS_DEFINITION } from "./timetrackerDefinition";

// ユーザー名のみ更新
const result = TIMETRACKER_SETTINGS_DEFINITION.validatePartial({ 
    userName: "newuser" 
});

if (result.isError) {
    console.error("Validation error:", result.errorMessage);
} else {
    // 更新を適用（型と制約のみ検証済み）
    updateSettings({ ...settings, ...{ userName: "newuser" } });
}
```

**部分バリデーションの特徴:**

- 必須チェックをスキップ（提供されたフィールドの型と制約のみチェック）
- ネストされたオブジェクトも部分的に更新可能
- UI での単一フィールド更新に最適
- 再帰的に動作（ネストされたオブジェクト内でも必須チェックなし）

**使用例 - ネストされたオブジェクトの部分更新:**

```typescript
// scheduleAutoInputInfoの一部のみ更新（workItemIdは必須だが省略可能）
const result = TIMETRACKER_SETTINGS_DEFINITION.validatePartial({
    scheduleAutoInputInfo: {
        startEndType: "start",  // これだけ更新
    }
});
// => 成功（workItemIdがなくてもエラーにならない）
```

**戻り値の型:**

```typescript
// 成功時
{
  isError: false
}

// 失敗時
{
  isError: true,
  errorMessage: string
}
```

### 3. ユーティリティ関数

#### `updateErrorValue(value, info)`

オブジェクトを検証し、不正なフィールドのみをデフォルト値に置き換えます（再帰的）。

```typescript
import { updateErrorValue } from "./settingUtils";
import { TIMETRACKER_SETTINGS_DEFINITION } from "./timetrackerDefinition";

const settings = {
    userName: "test",
    baseUrl: "invalid-url", // URLとして不正
    baseProjectId: -1, // 正の整数でない
    roundingTimeTypeOfEvent: "nonduplicate",
    isHistoryAutoInput: true,
    eventDuplicatePriority: { timeCompare: "small" },
    scheduleAutoInputInfo: {
        startEndType: "both",
        roundingTimeTypeOfSchedule: "half",
        startEndTime: 30,
        workItemId: 456,
    },
};

const fixed = updateErrorValue(settings, TIMETRACKER_SETTINGS_DEFINITION);
// 不正なフィールド（baseUrl, baseProjectId）のみデフォルト値に置き換えられる
// 正常なフィールド（userName, roundingTimeTypeOfEvent等）はそのまま保持される
console.log(fixed);
```

**機能:**
- 再帰的にネストされたオブジェクトを処理
- バリデーションエラーのあるフィールドのみ修正
- 正常なフィールドは保持
- 必須フィールドが欠落している場合はデフォルト値で補完
- 未定義のフィールドは結果に含めない

#### `getFieldDefaultValue(info)`

設定定義からデフォルト値を取得します（再帰的）。

```typescript
import { getFieldDefaultValue } from "./settingUtils";
import { StringSettingValueInfo } from "./settingsDefinition";

const fieldInfo = new StringSettingValueInfo({
    name: "テストフィールド",
    description: "説明",
    required: true,
    defaultValue: "デフォルト値",
});

const defaultValue = getFieldDefaultValue(fieldInfo);
console.log(defaultValue); // => "デフォルト値"
```

**機能:**
- 単純な型のデフォルト値を取得
- オブジェクト型の場合は再帰的に子要素のデフォルト値を収集
- デフォルト値がない場合はundefinedを返す

## バリデーションルール

### StringSettingValueInfo

```typescript
new StringSettingValueInfo({
    name: "フィールド名",
    description: "説明",
    required: true,
    defaultValue: "デフォルト",  // オプション
    minLength: 3,                 // 最小文字数
    maxLength: 100,               // 最大文字数
    pattern: /^[a-z]+$/,         // 正規表現パターン
    literals: ["value1", "value2"], // 許可される値（enum）
    isUrl: true,                  // URL形式チェック
})
```

### BooleanSettingValueInfo

```typescript
new BooleanSettingValueInfo({
    name: "フィールド名",
    description: "説明",
    required: true,
    defaultValue: true,  // オプション
})
```

### NumberSettingValueInfo

```typescript
new NumberSettingValueInfo({
    name: "フィールド名",
    description: "説明",
    required: true,
    defaultValue: 10,              // オプション
    integer: true,                 // 整数のみ許可
    positive: true,                // 正の数のみ許可
    literals: [1, 2, 3],          // 許可される値
})
```

### ArraySettingValueInfo

```typescript
new ArraySettingValueInfo({
    name: "フィールド名",
    description: "説明",
    required: true,
    defaultValue: [],              // 空配列のみ許可
    itemType: "string",            // 要素の型（プリミティブ型の場合）
    itemSchema: new ObjectSettingValueInfo({...}), // オブジェクト型の場合
    minItems: 1,                   // 最小要素数
    maxItems: 10,                  // 最大要素数
})
```

### ObjectSettingValueInfo

```typescript
new ObjectSettingValueInfo({
    name: "フィールド名",
    description: "説明",
    required: true,
    defaultValue: { ... },         // オプション
    disableUnknownField: true,     // 未定義フィールドを拒否
    children: {
        field1: new StringSettingValueInfo({...}),
        field2: new NumberSettingValueInfo({...}),
        // ... 再帰的に定義可能
    },
})
```

## エラーハンドリング

バリデーションエラーは以下の形式で返されます：

```typescript
{
  isError: true,
  errorMessage: "timetracker.userName (ユーザー名(ログイン名)) は必須です"
}
```

複数のエラーがある場合は、改行で結合されます：

```typescript
{
  isError: true,
  errorMessage: "timetracker.userName (ユーザー名(ログイン名)) は必須です\n" +
                "timetracker.baseUrl (TimeTrackerのベースURL) は有効なURLである必要があります"
}
```

## 型定義

型定義は `src/types/index.ts` に配置されています：

- `TimeTrackerSettings`: TimeTracker設定の型
- `AppSettings`: アプリケーション全体の設定の型
- `RoundingMethod`: 丸め方法の型
- `StartEndType`: 開始終了タイプの型
- など

## 設定の追加・変更

新しい設定項目を追加する場合：

1. `src/types/index.ts` に型を追加
2. `timetrackerDefinition.ts`の`TIMETRACKER_SETTINGS_DEFINITION`に定義を追加

```typescript
// 1. 型を追加 (src/types/index.ts)
export interface TimeTrackerSettings {
    // ... 既存のフィールド
    newField: string;
}

// 2. 定義を追加 (timetrackerDefinition.ts)
export const TIMETRACKER_SETTINGS_DEFINITION = new ObjectSettingValueInfo({
    name: "TimeTracker設定",
    description: "TimeTrackerに関する設定",
    required: true,
    disableUnknownField: true,
    children: {
        // ...既存のフィールド
        newField: new StringSettingValueInfo({
            name: "新しいフィールド",
            description: "説明",
            required: false,
            defaultValue: "デフォルト値",
        }),
    },
});
```

バリデーションロジックは自動的に適用されます。

## 実装の特徴

### Props パターン

すべてのクラスは、コンストラクタでpropsオブジェクトを受け取ります。これにより：

- 引数の順序を気にする必要がない
- オプション引数を明示的に指定できる
- IDEの補完が効く
- コードの可読性が向上

```typescript
// ❌ 悪い例（位置引数）
new StringSettingValueInfo("name", "description", true, "default", undefined, /pattern/, 3, 100)

// ✅ 良い例（propsパターン）
new StringSettingValueInfo({
    name: "name",
    description: "description",
    required: true,
    defaultValue: "default",
    pattern: /pattern/,
    minLength: 3,
    maxLength: 100,
})
```

### 型安全性

- ジェネリクスによる型推論
- 各クラスは適切な型パラメータを持つ
- `validateSub`メソッドで型安全なバリデーション

### 再帰的構造

- `ObjectSettingValueInfo`は子要素として他の設定値情報を持つ
- ネストされたオブジェクトを無限に定義可能
- `validatePartial`も再帰的に動作

## テスト

すべての機能は包括的なテストでカバーされています：

```bash
# すべてのテストを実行
npm test

# 特定のテストファイルを実行
npm test -- settingsDefinition.test.ts
npm test -- timetrackerDefinition.test.ts
npm test -- settingUtils.test.ts
```

**テストカバレッジ:**
- settingsDefinition.test.ts: 71テスト（基本バリデーション + validatePartial）
- timetrackerDefinition.test.ts: 42テスト（完全 + 部分バリデーション）
- settingUtils.test.ts: 27テスト（ユーティリティ関数）
- **合計: 140テスト**
