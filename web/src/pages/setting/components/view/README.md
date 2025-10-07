# View Components

設定画面のビューコンポーネントを格納するディレクトリです。
各設定カテゴリごとにディレクトリを分けて管理しています。

## ディレクトリ構造

```
view/
├── appearance/          # 外観設定
│   ├── AppearanceSettings.tsx
│   └── index.ts
├── general/             # 一般設定
│   ├── GeneralSettings.tsx
│   └── index.ts
├── timetracker/         # タイムトラッカー設定
│   ├── TimeTrackerSettings.tsx
│   ├── IgnorableEventsSettings.tsx
│   ├── TimeOffEventsSettings.tsx
│   └── index.ts
├── shared/              # 共通コンポーネント
│   ├── JsonEditorView.tsx
│   └── index.ts
├── index.ts             # 全コンポーネントのエクスポート
└── README.md
```

## 各ディレクトリの説明

### `appearance/`
外観に関する設定画面を含みます。
- テーマ設定（ライト/ダーク/システム）

### `general/`
一般的な設定画面を含みます。
- 言語設定

### `timetracker/`
タイムトラッカー機能に関する設定画面を含みます。
- メイン設定画面（TimeTrackerSettings）
- 無視するイベントの設定（IgnorableEventsSettings）
- 休暇イベントの設定（TimeOffEventsSettings）

### `shared/`
複数の設定画面で共通して使用されるコンポーネントを含みます。
- JSON編集画面（JsonEditorView）

## 使用方法

各ディレクトリから直接インポートするか、`view/index.ts`経由でインポートできます。

```typescript
// 直接インポート
import { AppearanceSettings } from "@/pages/setting/components/view/appearance";

// index.ts経由でインポート
import { AppearanceSettings } from "@/pages/setting/components/view";
```

## 新しい設定画面の追加

1. 適切なカテゴリのディレクトリに`.tsx`ファイルを作成
2. そのディレクトリの`index.ts`にエクスポートを追加
3. `view/index.ts`は自動的に全体をエクスポート（`export * from "./カテゴリ名"`）

新しいカテゴリを追加する場合：
1. 新しいディレクトリを作成
2. コンポーネントファイルを追加
3. ディレクトリ内に`index.ts`を作成してエクスポート
4. `view/index.ts`に`export * from "./新カテゴリ名";`を追加
