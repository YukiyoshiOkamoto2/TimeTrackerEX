# Schema

TimeTrackerアプリケーションのスキーマ定義とバリデーション機能を提供するモジュールです。

## 概要

このディレクトリには、アプリケーションで使用されるデータモデルとバリデーションロジックが含まれています。

## ディレクトリ構成

```
schema/
├── settings/          # 設定関連のスキーマ定義
│   ├── settingsDefinition.ts
│   ├── timetracker/
│   └── ...
└── models/            # ドメインモデルのZodスキーマ定義
    ├── modelsSchema.ts
    ├── modelsSchema.test.ts
    ├── index.ts
    └── README.md
```

## モジュール

### settings/

設定値のカスタムバリデーションシステムです。

- **SettingValueType**: 設定値の型定義
- **ValidationResult**: バリデーション結果の型
- **SettingValueInfoTyped**: 型付き設定値情報

詳細は [settings/README.md](./settings/README.md) を参照してください。

### models/

ドメインモデルのZodスキーマ定義です。

- **スキーマ一覧**: Schedule, Event, Project, WorkItem, DayTask など
- **バリデーション機能**: 実行時の型チェックとカスタムバリデーション
- **型推論**: ZodスキーマからTypeScript型を自動生成

詳細は [models/README.md](./models/README.md) を参照してください。

## 使用方法

### settings スキーマの使用

```typescript
import { settingsDefinition } from "@/schema/settings";

// 設定値の取得
const value = settingsDefinition.getValue("timetracker.workingHours.startTime");

// バリデーション
const result = settingsDefinition.validate("timetracker.workingHours.startTime", "09:00");
if (result.success) {
    console.log("有効な値:", result.value);
} else {
    console.error("エラー:", result.message);
}
```

### models スキーマの使用

```typescript
import { EventSchema, type Event } from "@/schema/models";

// パース（バリデーション + 型変換）
const event = EventSchema.parse({
    uuid: "test-001",
    name: "ミーティング",
    // ... その他のフィールド
});

// セーフパース
const result = EventSchema.safeParse(data);
if (result.success) {
    console.log("有効なデータ:", result.data);
} else {
    console.error("バリデーションエラー:", result.error);
}
```

## テスト

```bash
# すべてのスキーマテストを実行
npm test -- schema

# 特定のスキーマテストのみを実行
npm test -- modelsSchema.test.ts
```

## 依存関係

- `zod`: Zodスキーマバリデーションライブラリ（models スキーマで使用）

## 関連ファイル

- `@/types/models.ts`: TypeScript型定義
- `@/types/settings.ts`: 設定関連の型定義
- `@/store/settings/`: 設定値のストア実装

## 設計思想

### 二つのバリデーションシステム

このプロジェクトでは、用途に応じて2つのバリデーションシステムを使用しています:

1. **カスタムバリデーションシステム (settings/)**
   - 設定値の管理に特化
   - 設定値の型情報とバリデーションルールを一元管理
   - UI表示情報（ラベル、説明文など）も含む

2. **Zodスキーマ (models/)**
   - ドメインモデルのバリデーションに特化
   - 実行時の型安全性を提供
   - 詳細なエラーメッセージとカスタムバリデーション
   - TypeScript型の自動推論

### 使い分けの指針

- **設定値の管理**: settings/ のカスタムバリデーション
- **ドメインモデルの検証**: models/ のZodスキーマ
- **API入出力の検証**: models/ のZodスキーマ
- **フォーム入力の検証**: models/ のZodスキーマ

## 今後の拡張

- [ ] スキーマのバージョニング管理
- [ ] より詳細なバリデーションルールの追加
- [ ] カスタムエラーメッセージのローカライゼーション対応
- [ ] パフォーマンス最適化
