# Settings Schema

設定のバリデーションとJSON変換を提供するモジュールです。

## 概要

このモジュールは、TimeTracker設定の定義、バリデーション、JSON変換機能を提供します。
Zodを使用せず、カスタムバリデーションロジックで実装されています。

## 主な機能

### 1. 設定定義 (`SETTINGS_DEFINITION`)

全ての設定項目の定義を一元管理します。各フィールドには以下の情報が含まれます：

- `type`: データ型（string, number, boolean, array, object）
- `name`: 表示名（UI用）
- `description`: 説明文
- `required`: 必須かどうか
- `default`: デフォルト値（オプション）
- その他の制約（minLength, pattern, literals など）

### 2. バリデーション

#### `validateTimeTrackerSettings(settings)`

設定を検証します。

```typescript
import { validateTimeTrackerSettings } from './settingsDefinition';

const result = validateTimeTrackerSettings({
  userName: "test",
  baseUrl: "https://timetracker.example.com",
  baseProjectId: 123,
  // ... その他のフィールド
});

if (!result.isError) {
  console.log("Valid settings:", result.value);
} else {
  console.error("Validation error:", result.errorMessage);
}
```

**戻り値の型：**

```typescript
// 成功時
{
  isError: false,
  value: TimeTrackerSettings
}

// 失敗時
{
  isError: true,
  errorMessage: string
}
```

### 3. JSON変換とパース

#### `parseTimeTrackerSettings(jsonString)`

JSON文字列をパースし、不正な項目はデフォルト値で補完します。

```typescript
import { parseTimeTrackerSettings } from './settingsDefinition';

const jsonString = '{"userName":"test","baseUrl":"https://example.com",...}';
const result = parseTimeTrackerSettings(jsonString);

if (!result.isError) {
  console.log("Parsed settings:", result.value);
} else {
  // エラーがあったが、デフォルト値で補完されている
  console.log("Parsed with defaults:", result.value);
  console.log("Errors:", result.errorMessage);
}
```

#### `parseAndFixTimeTrackerSettings(obj)`

オブジェクトを検証し、不正な項目はデフォルト値で補完します。

```typescript
import { parseAndFixTimeTrackerSettings } from './settingsDefinition';

const result = parseAndFixTimeTrackerSettings({
  userName: "test",
  baseUrl: "invalid-url", // URLとして不正
  baseProjectId: -1,      // 正の整数でない
});

// 不正なフィールドはデフォルト値で置き換えられる
console.log(result.value);
```

#### `stringifyTimeTrackerSettings(settings, pretty?)`

設定をJSON文字列に変換します。

```typescript
import { stringifyTimeTrackerSettings } from './settingsDefinition';

const json = stringifyTimeTrackerSettings(settings, true); // インデント付き
console.log(json);
```

### 4. ユーティリティ関数

#### `getDefaultTimeTrackerSettings()`

デフォルト値を持つ全フィールドを取得します。

```typescript
import { getDefaultTimeTrackerSettings } from './settingsDefinition';

const defaults = getDefaultTimeTrackerSettings();
console.log(defaults);
// => {
//   enableAutoUpdate: true,
//   isHistoryAutoInput: true,
//   roundingTimeTypeOfEvent: "nonduplicate",
//   ...
// }
```

#### `isTimeTrackerSettingsComplete(settings)`

設定が完全（全必須フィールドが存在）かチェックします。

```typescript
import { isTimeTrackerSettingsComplete } from './settingsDefinition';

if (isTimeTrackerSettingsComplete(settings)) {
  // 型ガードとして機能: settings は TimeTrackerSettings 型
  console.log("Settings are complete");
}
```

#### `generateHelpText()`

設定のヘルプテキストを生成します。

```typescript
import { generateHelpText } from './settingsDefinition';

console.log(generateHelpText());
```

## バリデーションルール

### 文字列 (string)

- `minLength`: 最小文字数
- `isUrl`: URL形式のチェック
- `pattern`: 正規表現パターンマッチ
- `literals`: 許可される値のリスト（enum）

### 数値 (number)

- `integer`: 整数のみ許可
- `positive`: 正の数のみ許可
- `literals`: 許可される値のリスト

### 配列 (array)

- `itemType`: 要素の型（string または number）
- `minItems`: 最小要素数

### オブジェクト (object)

- `children`: 子フィールドの定義（再帰的）

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
2. `SETTINGS_DEFINITION` に定義を追加

```typescript
// 1. 型を追加
export interface TimeTrackerSettings {
  // ... 既存のフィールド
  newField: string;
}

// 2. 定義を追加
export const SETTINGS_DEFINITION = {
  timetracker: {
    // ...
    children: {
      // ...
      newField: {
        type: "string",
        name: "新しいフィールド",
        description: "説明",
        required: false,
        default: "デフォルト値",
      } as StringSettingValueInfo,
    },
  },
};
```

バリデーションロジックは自動的に適用されます。
