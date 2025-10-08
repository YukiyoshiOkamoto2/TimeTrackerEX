# バリデーションエラーの一元管理

## 概要

設定のバリデーションチェックを`SettingsProvider`に統合し、各設定ページで個別に`getSettingErrors`を呼ぶ必要がなくなりました。

## 変更前

```tsx
// 各設定ページで個別にバリデーションを実行
export function AppearanceSettingsPage() {
    const { settings, updateSettings } = useSettings();
    const appearance = settings.appearance;
    const errors = useMemo(
        () => getSettingErrors(appearance, APPEARANCE_SETTINGS_DEFINITION),
        [appearance]
    );

    return <SettingPageLayout errors={errors}>...</SettingPageLayout>;
}
```

## 変更後

```tsx
// SettingsProviderから直接バリデーションエラーを取得
export function AppearanceSettingsPage() {
    const { settings, updateSettings, validationErrors } = useSettings();
    const appearance = settings.appearance;
    const errors = validationErrors.appearance;

    return <SettingPageLayout errors={errors}>...</SettingPageLayout>;
}
```

## ValidationErrorInfo型

```tsx
export type ValidationErrorInfo = {
    /** 一般設定のエラー */
    general: SettingError[];
    /** 外観設定のエラー */
    appearance: SettingError[];
    /** TimeTracker設定のエラー */
    timeTracker: SettingError[];
};
```

## メリット

1. **コードの簡素化**: `useMemo`や`getSettingErrors`のインポートが不要
2. **一元管理**: バリデーションロジックが`SettingsProvider`に集約
3. **自動更新**: 設定変更時に自動的に再計算
4. **パフォーマンス**: 複数コンポーネントで同じ結果を共有

## 対象ファイル

以下のファイルが更新されました:

- ✅ `src/store/settings/SettingsProvider.tsx` - バリデーション機能を追加
- ✅ `src/store/index.ts` - `ValidationErrorInfo`型をエクスポート
- ✅ `src/pages/setting/components/view/appearance/AppearanceSettingsPage.tsx`
- ✅ `src/pages/setting/components/view/general/GeneralSettingsPage.tsx`
- ✅ `src/pages/setting/components/view/timetracker/TimeTrackerSettingsPage.tsx`

## 例外

以下のコンポーネントは汎用的なため、引き続き`getSettingErrors`を直接使用します:

- `JsonEditorView`: 任意の設定オブジェクトに対応するため

## TimeTrackerPageでの使用例

```tsx
import { useSettings } from "@/store";

export function TimeTrackerPage() {
    const { settings, validationErrors } = useSettings();
    
    // TimeTracker設定のエラーをチェック
    const hasTimeTrackerErrors = validationErrors.timeTracker.length > 0;
    
    if (hasTimeTrackerErrors) {
        console.warn("TimeTracker設定にエラーがあります:", validationErrors.timeTracker);
    }
    
    // 設定を使用
    const apiUrl = settings.timetracker?.apiUrl;
    
    return <div>...</div>;
}
```

## 実装の詳細

`SettingsProvider`内で`useMemo`を使用してバリデーションエラーを計算:

```tsx
const validationErrors = useMemo<ValidationErrorInfo>(() => {
    const general = settings.general
        ? getSettingErrors(settings.general, GENERAL_SETTINGS_DEFINITION)
        : [];
    const appearance = settings.appearance
        ? getSettingErrors(settings.appearance, APPEARANCE_SETTINGS_DEFINITION)
        : [];
    const timeTracker = settings.timetracker
        ? getSettingErrors(settings.timetracker, TIMETRACKER_SETTINGS_DEFINITION)
        : [];

    return {
        general,
        appearance,
        timeTracker,
    };
}, [settings.general, settings.appearance, settings.timetracker]);
```

依存配列に各設定セクションを指定することで、該当セクションが変更されたときのみ再計算されます。
