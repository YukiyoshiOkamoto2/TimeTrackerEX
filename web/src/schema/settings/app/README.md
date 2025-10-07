# App Settings Definition

アプリケーション全体の設定定義を提供します。

## 概要

このモジュールは、アプリケーション全体の設定を統合した定義を提供します。
外観設定とTimeTracker設定を含む、最上位の設定オブジェクトです。

## エクスポート

### APP_SETTINGS_DEFINITION

**型:** `ObjectSettingValueInfo`

**説明:**
アプリケーション全体の設定定義。以下の子要素を持ちます:
- `appearance`: 外観設定（APPEARANCE_SETTINGS_DEFINITION）
- `timetracker`: TimeTracker設定（TIMETRACKER_SETTINGS_DEFINITION）

**使用例:**

```typescript
import { APP_SETTINGS_DEFINITION } from "@/schema/settings";

// バリデーション
const result = APP_SETTINGS_DEFINITION.validate(appSettings);
if (!result.ok) {
    console.error("検証エラー:", result.errors);
}

// 部分バリデーション（UI更新時など）
const partialResult = APP_SETTINGS_DEFINITION.validatePartial({
    appearance: { theme: "dark" }
});
```

## 構造

```typescript
{
    appearance: {
        theme: "light" | "dark" | "system"
    },
    timetracker: {
        // TimeTracker設定...
    }
}
```

## 依存関係

- `../settingsDefinition` - 基底クラス
- `../appearance` - 外観設定定義
- `../timetracker` - TimeTracker設定定義
