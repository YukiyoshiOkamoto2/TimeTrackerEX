# Appearance Settings Definition

外観設定の定義を提供します。

## 概要

このモジュールは、アプリケーションの外観（テーマなど）に関する設定定義を提供します。

## エクスポート

### APPEARANCE_SETTINGS_DEFINITION

**型:** `ObjectSettingValueInfo`

**説明:**
外観設定の定義。テーマモードの設定を含みます。

**子要素:**
- `theme` (StringSettingValueInfo):
  - **説明:** アプリケーションのテーマモード
  - **必須:** はい
  - **デフォルト値:** `"system"`
  - **許可値:** `"light"`, `"dark"`, `"system"`

**使用例:**

```typescript
import { APPEARANCE_SETTINGS_DEFINITION } from "@/schema/settings";

// バリデーション
const result = APPEARANCE_SETTINGS_DEFINITION.validate({
    theme: "dark"
});

if (result.ok) {
    console.log("有効な外観設定");
} else {
    console.error("検証エラー:", result.errors);
}

// 部分バリデーション
const partialResult = APPEARANCE_SETTINGS_DEFINITION.validatePartial({
    theme: "light"
});
```

## テスト

`appearanceDefinition.test.ts`に包括的なテストが含まれています。

## 依存関係

- `../settingsDefinition` - 基底クラス（ObjectSettingValueInfo, StringSettingValueInfo）
