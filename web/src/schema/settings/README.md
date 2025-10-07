# Settings Schema

アプリケーション設定のバリデーションとJSON変換モジュール。Zod不使用、完全カスタム実装。

## Overview

TimeTracker設定の定義、バリデーション、JSON変換機能を提供。

特徴:
- カスタムバリデーション実装(Zod不使用)
- 再帰的ObjectSchema対応
- 完全バリデーション(validate)と部分バリデーション(validatePartial)
- Props パターンコンストラクタ
- デフォルト値自動補完
- 型安全な実装(ジェネリクス使用)

## Directory Structure

```
settings/
├── settingsDefinition.ts       # Base classes & types
├── settingsDefinition.test.ts  # Base tests (132 tests)
├── settingUtils.ts             # Utility functions
├── settingUtils.test.ts        # Utility tests (50 tests)
├── index.ts
├── README.md
├── app/                        # App-wide settings
│   ├── appDefinition.ts
│   └── index.ts
├── appearance/                 # Appearance settings
│   ├── appearanceDefinition.ts
│   ├── appearanceDefinition.test.ts (23 tests)
│   └── index.ts
└── timetracker/                # TimeTracker settings
    ├── timetrackerDefinition.ts
    ├── timetrackerDefinition.test.ts (42 tests)
    └── index.ts
```

## Module Structure

### settingsDefinition.ts
Base classes for validation.

**Exports:**
- `BaseSettingValueInfo<T>`: 基底クラス
- `StringSettingValueInfo`: 文字列バリデーション(minLength, maxLength, pattern, literals, isUrl)
- `BooleanSettingValueInfo`: 真偽値バリデーション
- `NumberSettingValueInfo`: 数値バリデーション(integer, positive, literals)
- `ArraySettingValueInfo<T>`: 配列バリデーション(itemType, itemSchema, minItems, maxItems)
- `ObjectSettingValueInfo<T>`: オブジェクトバリデーション(children, disableUnknownField, 再帰対応)
- `ValidationResult`, `ValidationSuccess`, `ValidationFailure`: バリデーション結果型

**Methods:**
- `validate(value)`: 完全バリデーション(必須チェック含む)
- `validatePartial(value)`: 部分バリデーション(必須チェックなし、UI更新用)

**Tests:** 132 tests ✅

### app/appDefinition.ts
アプリ全体設定定義。

**Exports:**
- `APP_SETTINGS_DEFINITION`: アプリ設定スキーマ(appearance + timetracker統合)

### appearance/appearanceDefinition.ts
外観設定定義。

**Exports:**
- `APPEARANCE_SETTINGS_DEFINITION`: 外観設定スキーマ(themeMode: light/dark/system)

**Tests:** 23 tests ✅

### timetracker/timetrackerDefinition.ts
TimeTracker設定定義。

**Exports:**
- `TIMETRACKER_SETTINGS_DEFINITION`: TimeTracker設定スキーマ
  - userName, baseUrl, baseProjectId
  - roundingTimeTypeOfEvent, isHistoryAutoInput
  - eventDuplicatePriority, scheduleAutoInputInfo
  - ignorableEventPatterns, timeOffEventPatterns
  - workItemIdOfPaidLeave, workItemIdOfAutoInput

**Tests:** 42 tests ✅

### settingUtils.ts
ユーティリティ関数。

**Exports:**
- `updateErrorValue(value, info)`: 不正フィールドのみデフォルト値置換(再帰)
- `getFieldDefaultValue(info)`: デフォルト値取得(再帰)

**Tests:** 50 tests ✅

## Core Features

### 1. Props Pattern Constructor
全クラスPropsパターン採用。IDEの補完効果、可読性向上。

```typescript
new StringSettingValueInfo({
  name: "フィールド名",
  description: "説明",
  required: true,
  defaultValue: "デフォルト",
  minLength: 3,
  maxLength: 100,
  pattern: /^[a-z]+$/,
  literals: ["value1", "value2"],
  isUrl: true
})
```

### 2. Complete Validation - validate()
全必須フィールド含む完全検証。ロード時、保存時に使用。

```typescript
const result = TIMETRACKER_SETTINGS_DEFINITION.validate(settings)
if (result.isError) {
  console.error(result.errorMessage)
}
```

### 3. Partial Validation - validatePartial()
部分的検証、必須チェックスキップ。UI個別フィールド更新時に使用。

```typescript
// ユーザー名のみ更新(他フィールド不要)
const result = TIMETRACKER_SETTINGS_DEFINITION.validatePartial({ 
  userName: "newuser" 
})

// ネストオブジェクトも部分更新可能
const result2 = TIMETRACKER_SETTINGS_DEFINITION.validatePartial({
  scheduleAutoInputInfo: {
    startEndType: "start" // workItemIdなくてもOK
  }
})
```

### 4. Recursive Object Schema
ObjectSettingValueInfo再帰対応。無限ネスト可能。validatePartialも再帰動作。

### 5. Error Auto-Fix
updateErrorValue()で不正フィールドのみデフォルト値置換。正常フィールド保持。

```typescript
const fixed = updateErrorValue(corruptedSettings, TIMETRACKER_SETTINGS_DEFINITION)
// 不正フィールドのみ修正、正常フィールドそのまま
```

## Validation Rules Summary

| Class | Common Props | Type-Specific Props |
|-------|-------------|-------------------|
| String | name, description, required, defaultValue | minLength, maxLength, pattern, literals, isUrl |
| Boolean | 同上 | - |
| Number | 同上 | integer, positive, literals |
| Array | 同上 | itemType, itemSchema, minItems, maxItems |
| Object | 同上 | children, disableUnknownField |

## Error Response Format

```typescript
// Success
{ isError: false }

// Error (single)
{ 
  isError: true, 
  errorMessage: "timetracker.userName (ユーザー名) は必須です" 
}

// Error (multiple, \n separated)
{ 
  isError: true, 
  errorMessage: "timetracker.userName (ユーザー名) は必須です\ntimetracker.baseUrl (ベースURL) は有効なURLである必要があります" 
}
```

## Dependencies

```
settingsDefinition.ts (base classes)
  ↑
├─ app/appDefinition.ts
├─ appearance/appearanceDefinition.ts
└─ timetracker/timetrackerDefinition.ts
  ↑
settingUtils.ts (utilities)
```

- settingsDefinition.ts → types/settings.ts
- appDefinition.ts → appearance + timetracker
- settingUtils.ts → settingsDefinition.ts

## Test Status

```
settingsDefinition.test.ts: 132 tests ✅
settingUtils.test.ts: 50 tests ✅
appearance/appearanceDefinition.test.ts: 23 tests ✅
timetracker/timetrackerDefinition.test.ts: 42 tests ✅

Total: 247 tests ✅
```

## Design Principles

### 1. No Zod Dependency
完全カスタム実装。Zod不要。軽量。

### 2. Type-Safe with Generics
ジェネリクスによる型推論。型安全なバリデーション。

### 3. Recursive Support
ObjectSettingValueInfo無限ネスト対応。validatePartialも再帰。

### 4. Props Pattern
全クラスPropsパターン。可読性、保守性向上。

### 5. Comprehensive Testing
247 tests全パス。エッジケース完全カバレッジ。

## Adding New Settings

1. `types/settings.ts`に型追加
2. `timetrackerDefinition.ts`(or appearance)にスキーマ追加
3. テスト追加
4. 自動的にバリデーション適用される

## Usage in Store

SettingsProviderで使用:
- load時: validate()で完全検証
- 保存時: validate()で完全検証
- UI更新時: validatePartial()で部分検証
- エラー修正: updateErrorValue()で自動修正

## Related Modules

- **types/settings.ts**: 型定義(AppSettings, TimeTrackerSettings, AppearanceSettings)
- **store/SettingsProvider.tsx**: 状態管理、localStorage連携
- **pages/setting/**: 設定UI、スキーマ駆動コンポーネント

**テストカバレッジ:**
- settingsDefinition.test.ts: 71テスト（基本バリデーション + validatePartial）
- timetrackerDefinition.test.ts: 42テスト（完全 + 部分バリデーション）
- settingUtils.test.ts: 27テスト（ユーティリティ関数）
- **合計: 140テスト**
