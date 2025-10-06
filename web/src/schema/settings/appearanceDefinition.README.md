# Appearance Settings Definition

外観設定(`AppearanceSettings`)の設定項目定義です。

## 概要

このモジュールは、アプリケーションの外観に関する設定を定義・バリデーションするための機能を提供します。

## エクスポート

- `APPEARANCE_SETTINGS_DEFINITION`: 外観設定の定義オブジェクト

## 設定定義

### APPEARANCE_SETTINGS_DEFINITION

外観設定全体を定義する`ObjectSettingValueInfo`です。

```typescript
export const APPEARANCE_SETTINGS_DEFINITION = new ObjectSettingValueInfo({
    name: "外観設定",
    description: "アプリケーションの外観に関する設定",
    required: true,
    disableUnknownField: true,
    children: {
        theme: new StringSettingValueInfo({
            name: "テーマモード",
            description: "アプリケーションのテーマ(light: ライトモード, dark: ダークモード, system: システム設定)",
            required: true,
            defaultValue: "system",
            literals: ["light", "dark", "system"],
        }),
    },
});
```

## 設定項目

### theme (必須)

- **型**: `"light" | "dark" | "system"`
- **説明**: アプリケーションのテーマモード
- **デフォルト値**: `"system"`
- **バリデーション**:
  - 指定された3つの値(`light`, `dark`, `system`)のいずれかである必要があります

#### 値の説明

- `light`: ライトモード - 明るい色調のテーマ
- `dark`: ダークモード - 暗い色調のテーマ
- `system`: システム設定 - OSのテーマ設定に従う

## 使用例

### 基本的な使用方法

```typescript
import { APPEARANCE_SETTINGS_DEFINITION } from "@/schema/settings";
import type { AppearanceSettings } from "@/types/settings";

// 有効な設定
const settings: AppearanceSettings = {
    theme: "dark",
};

// バリデーション
const result = APPEARANCE_SETTINGS_DEFINITION.validate(settings);
if (result.isError) {
    console.error("設定が無効です:", result.errorMessage);
} else {
    console.log("設定は有効です");
}
```

### 部分的なバリデーション

```typescript
// 部分的な設定の検証
const partialSettings = {
    theme: "light",
};

const result = APPEARANCE_SETTINGS_DEFINITION.validatePartial(partialSettings);
if (result.isError) {
    console.error("部分設定が無効です:", result.errorMessage);
}
```

### エラー訂正の使用

```typescript
import { updateErrorValue, getFieldDefaultValue } from "@/schema/settings";

// 不正な設定を修正
const invalidSettings = {
    theme: "invalid-theme",
};

const correctedSettings = updateErrorValue(
    invalidSettings,
    APPEARANCE_SETTINGS_DEFINITION
);

// デフォルト値の取得
const defaultSettings = getFieldDefaultValue(APPEARANCE_SETTINGS_DEFINITION);
// { theme: "system" }
```

## バリデーション

### 完全バリデーション (`validate()`)

すべての必須フィールドが存在し、正しい形式であることを確認します。

```typescript
// 成功例
const validSettings = {
    theme: "system",
};
APPEARANCE_SETTINGS_DEFINITION.validate(validSettings); // { isError: false }

// 失敗例
const invalidSettings = {
    theme: "invalid",
};
APPEARANCE_SETTINGS_DEFINITION.validate(invalidSettings); // { isError: true, errorMessage: "..." }

// 必須フィールド欠落
const incompleteSettings = {};
APPEARANCE_SETTINGS_DEFINITION.validate(incompleteSettings); // { isError: true, errorMessage: "..." }
```

### 部分バリデーション (`validatePartial()`)

存在するフィールドのみを検証します。必須フィールドが欠けていても問題ありません。

```typescript
// 空オブジェクトも許容
APPEARANCE_SETTINGS_DEFINITION.validatePartial({}); // { isError: false }

// 存在するフィールドのみ検証
APPEARANCE_SETTINGS_DEFINITION.validatePartial({ theme: "dark" }); // { isError: false }
APPEARANCE_SETTINGS_DEFINITION.validatePartial({ theme: "invalid" }); // { isError: true }
```

## テスト

テストファイル: `appearanceDefinition.test.ts`

### テスト統計

- **合計**: 23テスト
  - **定義の構造**: 2テスト
  - **完全バリデーション**: 10テスト
  - **部分バリデーション**: 8テスト
  - **設定定義の構造**: 3テスト

### テストの実行

```bash
npm test -- appearanceDefinition.test.ts
```

## 関連型定義

`src/types/settings.ts`で定義されている型:

```typescript
/** テーマモード */
export type ThemeMode = "light" | "dark" | "system";

/** 外観設定 */
export interface AppearanceSettings {
    /** テーマモード */
    theme: ThemeMode;
}
```

## 関連ファイル

- `appearanceDefinition.ts` - 設定定義
- `appearanceDefinition.test.ts` - ユニットテスト
- `src/types/settings.ts` - 型定義
- `src/pages/setting/components/view/AppearanceSettings.tsx` - UI コンポーネント

## 設定の追加方法

新しい外観設定項目を追加する手順:

1. **型定義の追加** (`src/types/settings.ts`)

   ```typescript
   export interface AppearanceSettings {
       theme: ThemeMode;
       fontSize: number; // 新規追加
   }
   ```

2. **設定定義の追加** (`appearanceDefinition.ts`)

   ```typescript
   export const APPEARANCE_SETTINGS_DEFINITION = new ObjectSettingValueInfo({
       // ... 既存の設定 ...
       children: {
           theme: new StringSettingValueInfo({ ... }),
           fontSize: new NumberSettingValueInfo({
               name: "フォントサイズ",
               description: "アプリケーションのフォントサイズ(px)",
               required: true,
               defaultValue: 14,
               integer: true,
               positive: true,
           }),
       },
   });
   ```

3. **テストの追加** (`appearanceDefinition.test.ts`)

   ```typescript
   it("有効なフォントサイズを受け入れる", () => {
       const settings: AppearanceSettings = {
           theme: "system",
           fontSize: 16,
       };
       const result = APPEARANCE_SETTINGS_DEFINITION.validate(settings);
       expect(result.isError).toBe(false);
   });
   ```

## 設計の特徴

### Props パターン

すべてのクラスは、名前付きパラメータ(props)を使用したコンストラクタパターンを採用しています。

```typescript
// ✅ 推奨: Props パターン
new StringSettingValueInfo({
    name: "テーマモード",
    required: true,
    defaultValue: "system",
});

// ❌ 非推奨: 位置引数
new StringSettingValueInfo("テーマモード", true, "system");
```

### disableUnknownField

ルート定義で`disableUnknownField: true`を設定することで、定義されていないフィールドを持つオブジェクトを拒否します。

```typescript
const settings = {
    theme: "light",
    unknownField: "value", // これが原因で検証が失敗
};
APPEARANCE_SETTINGS_DEFINITION.validate(settings); // { isError: true }
```

### 型安全性

TypeScript の型システムを活用して、コンパイル時に多くのエラーを検出できます。

```typescript
// コンパイルエラー: "invalid" は ThemeMode 型ではない
const settings: AppearanceSettings = {
    theme: "invalid", // Error
};
```

## 実装の詳細

### バリデーション結果

すべてのバリデーションメソッドは`ValidationResult`型を返します:

```typescript
type ValidationResult =
    | { isError: false } // 成功
    | { isError: true; errorMessage: string }; // 失敗
```

### デフォルト値

設定項目にはデフォルト値を指定できます:

```typescript
theme: new StringSettingValueInfo({
    defaultValue: "system", // デフォルト値
});
```

デフォルト値は`getFieldDefaultValue()`関数で取得できます:

```typescript
import { getFieldDefaultValue } from "@/schema/settings";

const defaults = getFieldDefaultValue(APPEARANCE_SETTINGS_DEFINITION);
// { theme: "system" }
```

## ベストプラクティス

1. **型安全性を活用**: TypeScript の型を使用して、設定オブジェクトの型を明示する
2. **バリデーションの使い分け**: 完全な設定には`validate()`、部分的な更新には`validatePartial()`を使用
3. **エラーハンドリング**: バリデーション結果を常にチェックし、適切にエラーを処理する
4. **デフォルト値の活用**: すべての設定項目にデフォルト値を設定し、`getFieldDefaultValue()`で取得
5. **不明フィールドの拒否**: `disableUnknownField: true`を設定して、タイポや不正なフィールドを検出
