# Setting Page

アプリケーション設定画面の全コンポーネント。3層アーキテクチャ(layout/ui/view)採用。

## Directory Structure

```
setting/
 index.ts                  # Export SettingPage
 SettingPage.tsx           # Main settings (tab navigation)
 components/
     index.ts              # Export all (layout, ui, view)
     layout/               # Layout components (children prop必須)
        SettingNavigationPageLayout.tsx  # Page layout (戻るボタン対応)
        SettingSection.tsx               # Section container
        SettingNavigationSection.tsx     # Navigation section
     ui/                   # UI parts (reusable)
        AutoSettingItem.tsx          # Schema-driven setting item
        SettingItem.tsx              # Manual setting item
        SettingNavigationItem.tsx    # Navigation item
        SettingErrorsSummary.tsx     # Error summary display
        SettingValidatedInput.tsx    # Validated input
        EventPatternEditor.tsx       # Pattern editor
     view/                 # Setting page components
         general/
            GeneralSettingsPage.tsx
         appearance/
            AppearanceSettingsPage.tsx
         timetracker/
            TimeTrackerSettingsPage.tsx
            TimeOffEventsNavigationPage.tsx
            IgnorableEventsNavigationPage.tsx
         shared/
             JsonEditorView.tsx
```

## 3-Layer Architecture

### Naming Convention

**layout/** - Suffix: `Section` or `Layout`
- 必ず`children` prop持つ
- 画面全体/セクションレイアウト提供
- 例: `SettingSection`, `SettingNavigationPageLayout`

**ui/** - Function name
- 再利用可能UIパーツ
- 例: `AutoSettingItem`, `SettingNavigationItem`, `EventPatternEditor`

**view/** - Suffix: `Page` or `NavigationPage`
- メインページ: `~Page`
- サブページ(別ページから遷移): `~NavigationPage`
- 例: `TimeTrackerSettingsPage`, `IgnorableEventsNavigationPage`

### Layer Responsibilities

**layout/**: 画面/セクションレイアウト
- SettingNavigationPageLayout: 戻るボタン、JSON表示ボタン、共通レイアウト
- SettingSection: Card形式セクション、折りたたみ機能
- SettingNavigationSection: シンプルナビゲーションセクション

**ui/**: 再利用可能UIパーツ
- AutoSettingItem: スキーマから自動生成(name/description/control)  推奨
- SettingItem: 手動構築(label+control)
- SettingNavigationItem: クリック可能アイテム
- SettingErrorsSummary: エラーサマリー
- SettingValidatedInput: バリデーション付き入力
- EventPatternEditor: パターン編集

**view/**: ページ実装
- カテゴリ別ディレクトリ分割
- layout + ui組み合わせ
- メインページとナビゲーションページ分離

## Layout Components

### SettingNavigationPageLayout
**Props:** title, subtitle, onBack, onShowJson, headerActions, children

**機能:** 戻るボタン(onBack指定時)、JSON表示ボタン(onShowJson指定時)、一貫したレイアウト

### SettingSection
**Props:** title, description, required, collapsible, enabled, onEnabledChange, defaultExpanded, children

**機能:** Card形式、通常/折りたたみモード、有効/無効スイッチ

### SettingNavigationSection
**Props:** title, children

**機能:** ナビゲーション項目用シンプルセクション

## UI Components

### AutoSettingItem  推奨
**Props:** definition(BaseSettingValueInfo), value, onChange, maxWidth

**機能:** スキーマから自動生成、type自動判定(string/boolean/number/enum)、format対応(time/url)、バリデーション

**対応型:**
- string: Input(text/url), 時刻入力(format: time), Dropdown(literals指定時)
- boolean: Switch
- number: Input(number)

### SettingItem
**Props:** label, description, required, control

**機能:** 手動構築設定項目、カスタムコントロール用

**使い分け:**
- AutoSettingItem: スキーマ定義ある標準項目 
- SettingItem: カスタムコントロール必要時のみ

### SettingNavigationItem
**Props:** title, description, badge, onClick

**機能:** クリック可能ナビゲーション項目、ホバー背景変化

### EventPatternEditor
**Props:** patterns, onChange, placeholder, addButtonText

**機能:** パターン追加/編集/削除、マッチモード選択(部分/前方/後方一致)

### SettingErrorsSummary
**Props:** errors

**機能:** エラーメッセージリスト表示

### SettingValidatedInput
**Props:** value, onChange, validate, placeholder, type

**機能:** リアルタイムバリデーション、エラー表示

## View Components

### GeneralSettingsPage
一般設定メインページ。起動設定、通知設定、言語設定。

### AppearanceSettingsPage
外観設定メインページ。テーマ(light/dark/system)、アクセントカラー。

### TimeTrackerSettingsPage
TimeTracker設定メインページ。基本設定、丸め時間、サブ画面遷移(休暇/無視イベント)、折りたたみセクション(有給休暇)。

### TimeOffEventsNavigationPage
休暇イベント設定ナビゲーションページ。戻るボタン、パターン管理、WorkItemID設定。

### IgnorableEventsNavigationPage
無視可能イベント設定ナビゲーションページ。戻るボタン、無視パターン管理。

### JsonEditorView
JSON直接編集ビュー。Monaco Editor、シンタックスハイライト。

## Component Selection Guide

| Component | Use Case | Location | Example |
|-----------|----------|----------|---------|
| SettingSection + AutoSettingItem | スキーマ定義ある標準項目  | layout/ + ui/ | テーマ、数値、時刻 |
| SettingSection + SettingItem | カスタムコントロール | layout/ + ui/ | 複雑フォーム |
| SettingSection(collapsible) | 有効/無効切替グループ | layout/ | オプション機能 |
| SettingNavigationSection + SettingNavigationItem | 別画面遷移 | layout/ + ui/ | サブ設定画面 |

## Design Principles

1. **Schema-Driven UI**: AutoSettingItemでスキーマから自動生成。SettingItemは特別な理由ある時のみ。
2. **3-Layer Separation**: layout(構造)  ui(パーツ)  view(ページ)の明確な分離。
3. **Consistent Navigation**: 戻るボタンはonBack prop、JSON表示はonShowJson prop使用。
4. **Collapsible Sections**: 有効/無効切替可能機能はcollapsible mode使用。
5. **Fluent UI v9**: 全コンポーネントFluent UI v9ベース。

## State Management

**SettingsProvider**: useSettingsフック使用
- settings, updateSettings(validatePartial使用), errors, hasErrors

**NavigationProvider**: useNavigationフック使用
- currentPage, navigate, goBack

## Development Guidelines

### Adding New Setting Item
1. types/settings.tsに型追加
2. schema/settings/で定義追加
3. view/でAutoSettingItem使用
4. テスト追加

### Adding New Page
1. view/にディレクトリ作成(category/)
2. XxxPage.tsx or XxxNavigationPage.tsx作成
3. layout + ui組み合わせ
4. SettingPage.tsxにタブ追加(メインページの場合)

### Component Naming
- layout/: *Section, *Layout
- ui/: 機能名
- view/: *Page, *NavigationPage

## Related Modules

- **schema/settings/**: バリデーションスキーマ定義
- **store/SettingsProvider.tsx**: 設定状態管理
- **store/NavigationProvider.tsx**: 画面遷移管理
- **components/editor/**: Monaco Editorラッパー
- **types/settings.ts**: 設定型定義
