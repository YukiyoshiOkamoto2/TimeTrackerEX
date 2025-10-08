# Settings Provider

アプリケーション設定を管理するReact Context Providerです。

## 機能

- **設定の永続化**: LocalStorageを使用して設定を保存・読み込み
- **バリデーション**: 各設定セクションのエラーを自動的に検出
- **設定の更新**: Reactの状態管理で設定を動的に変更
- **設定のリセット**: デフォルト設定に戻す機能

## 使用方法

### 基本的な使い方

```tsx
import { useSettings } from "@/store";

function MyComponent() {
    const { settings, updateSettings, validationErrors } = useSettings();

    // 設定の読み取り
    const theme = settings.appearance?.theme;

    // 設定の更新
    const handleThemeChange = (newTheme: string) => {
        updateSettings({
            appearance: {
                ...settings.appearance,
                theme: newTheme,
            },
        });
    };

    // バリデーションエラーの確認
    const hasErrors = validationErrors.appearance.length > 0;

    return (
        <div>
            <p>Theme: {theme}</p>
            {hasErrors && <p>設定にエラーがあります</p>}
        </div>
    );
}
```

### バリデーションエラーの使用

`validationErrors`は各設定セクションのエラー情報を含みます:

```tsx
type ValidationErrorInfo = {
    general: SettingError[];      // 一般設定のエラー
    appearance: SettingError[];   // 外観設定のエラー
    timeTracker: SettingError[];  // TimeTracker設定のエラー
};

type SettingError = {
    id: string;      // エラーID
    label: string;   // 項目名
    message: string; // エラーメッセージ
};
```

### 設定ページでの使用例

```tsx
export function AppearanceSettingsPage() {
    const { settings, updateSettings, validationErrors } = useSettings();
    const appearance = settings.appearance;
    const errors = validationErrors.appearance;

    return (
        <SettingPageLayout errors={errors}>
            {/* 設定項目 */}
        </SettingPageLayout>
    );
}
```

## 変更履歴

### 2025年10月9日
- バリデーション機能を`SettingsProvider`に統合
- `ValidationErrorInfo`型を追加
- 各設定ページで個別に`getSettingErrors`を呼ぶ代わりに、Providerから`validationErrors`を取得するように変更
- バリデーションエラーは設定が変更されるたびに自動的に再計算される

## メリット

1. **一元管理**: バリデーションロジックが一箇所に集約
2. **自動更新**: 設定変更時に自動的にバリデーションが実行される
3. **パフォーマンス**: `useMemo`により不要な再計算を防止
4. **型安全性**: TypeScriptによる型チェック
5. **再利用性**: 複数のコンポーネントで同じバリデーション結果を共有

## 注意事項

- `JsonEditorView`のような汎用コンポーネントでは、引き続き`getSettingErrors`を直接使用します(任意の設定オブジェクトに対応するため)
- バリデーションエラーは設定の`general`、`appearance`、`timetracker`フィールドの変更を監視します
- 設定が変更されると自動的にLocalStorageに保存されます
