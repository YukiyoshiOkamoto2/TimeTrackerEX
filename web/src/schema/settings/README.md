# schema/settings/ - 設定スキーマ

アプリケーション設定のバリデーションとJSON変換。Zod不使用、カスタム実装。

## 特徴

- カスタムバリデーション実装 (Zod不使用)
- 再帰的ObjectSchema対応
- 完全バリデーション (validate) と部分バリデーション (validatePartial)
- デフォルト値自動補完
- 型安全 (ジェネリクス使用)

## モジュール構成

### settingsDefinition.ts
基底クラスと型定義。

**クラス**:
- `BaseSettingValueInfo<T>`: 基底
- `StringSettingValueInfo`: 文字列 (minLength, maxLength, pattern, literals, isUrl)
- `BooleanSettingValueInfo`: 真偽値
- `NumberSettingValueInfo`: 数値 (integer, positive, literals)
- `ArraySettingValueInfo<T>`: 配列 (itemType, minItems, maxItems)
- `ObjectSettingValueInfo<T>`: オブジェクト (properties, required)

### settingUtils.ts
ユーティリティ関数。

- `validateSetting()`: バリデーション実行
- `getDefaultSettings()`: デフォルト値取得
- `isPartialMatch()`: 部分一致判定

## サブディレクトリ

- **app/**: アプリ全体設定
- **appearance/**: 表示設定 (テーマ、言語)
- **timetracker/**: TimeTracker固有設定

**テスト**: 247 tests
