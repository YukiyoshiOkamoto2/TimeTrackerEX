# Setting Page

アプリケーションの設定画面を構成するコンポーネント群です。

## 📑 目次

- [ディレクトリ構造](#-ディレクトリ構造)
- [Layout Components](#-layout-components)
- [UI Components](#-ui-components)
- [View Components](#-view-components)
- [使用例](#-使用例)
- [デザインシステム](#-デザインシステム)
- [開発ガイドライン](#-開発ガイドライン)
- [ベストプラクティス](#-ベストプラクティス)

## 📁 ディレクトリ構造

```
setting/
├── README.md                    # このファイル
├── index.ts                     # SettingPageのエクスポート
├── SettingPage.tsx              # メイン設定ページ(タブナビゲーション)
└── components/                  # 設定画面のすべてのコンポーネント
    ├── index.ts                 # すべてをエクスポート (layout, ui, view)
    ├── layout/                  # レイアウトコンポーネント
    │   ├── index.ts
    │   ├── SettingNavigationPageLayout.tsx  # ナビゲーション用レイアウト(戻るボタン対応)
    │   ├── SettingSection.tsx               # セクションコンテナ
    │   └── SettingNavigationSection.tsx     # ナビゲーション用セクション
    ├── ui/                      # UIパーツコンポーネント
    │   ├── index.ts
    │   ├── AutoSettingItem.tsx          # スキーマ駆動の設定項目
    │   ├── SettingItem.tsx              # 手動設定項目
    │   ├── SettingNavigationItem.tsx    # ナビゲーション項目
    │   ├── SettingErrorsSummary.tsx     # エラーサマリー表示
    │   ├── SettingValidatedInput.tsx    # 検証機能付き入力フィールド
    │   └── EventPatternEditor.tsx       # パターンエディタ
    └── view/                    # 設定ページコンポーネント
        ├── index.ts
        ├── general/
        │   └── GeneralSettingsPage.tsx          # 一般設定ページ
        ├── appearance/
        │   └── AppearanceSettingsPage.tsx       # 外観設定ページ
        ├── timetracker/
        │   ├── TimeTrackerSettingsPage.tsx              # TimeTracker設定ページ
        │   ├── TimeOffEventsNavigationPage.tsx          # 休暇イベント設定ナビゲーションページ
        │   └── IgnorableEventsNavigationPage.tsx       # 無視可能イベント設定ナビゲーションページ
        └── shared/
            └── JsonEditorView.tsx               # JSON直接編集ビュー
```

## 🏗️ アーキテクチャ

### 命名規則

#### layout/ (レイアウトコンポーネント)
- **命名**: 後方に `Section` または `Layout` をつける
- **特徴**: 必ず `children` 要素を持つ
- **責務**: 画面全体のレイアウト、セクションの共通レイアウトを提供

**例:**
- `SettingSection` - セクションコンテナ
- `SettingNavigationSection` - ナビゲーションセクション
- `SettingNavigationPageLayout` - ナビゲーションページレイアウト

#### ui/ (UIパーツコンポーネント)
- **命名**: 機能を表す名前
- **責務**: 再利用可能なUIパーツ、共通コンポーネント

**例:**
- `AutoSettingItem` - 自動生成設定項目
- `SettingNavigationItem` - ナビゲーション項目
- `EventPatternEditor` - パターンエディタ

#### view/ (設定ページコンポーネント)
- **命名**: 
  - メインページ: 後方に `Page` をつける
  - サブページ(別ページからナビゲーション): 後方に `NavigationPage` をつける
- **責務**: 設定画面の項目的なページ、画面遷移を伴うページ

**例:**
- `GeneralSettingsPage` - 一般設定のメインページ
- `TimeTrackerSettingsPage` - TimeTracker設定のメインページ
- `TimeOffEventsNavigationPage` - 休暇イベント設定のナビゲーションページ
- `IgnorableEventsNavigationPage` - 無視可能イベント設定のナビゲーションページ

### ディレクトリの役割

#### **components/layout/** - レイアウトコンポーネント
画面全体のレイアウトやセクションの共通レイアウトを提供します。

- `SettingNavigationPageLayout`: ナビゲーションページ用のレイアウト(戻るボタン、JSON表示ボタン対応)
- `SettingSection`: カード形式のセクションコンテナ(折りたたみ機能付き)
- `SettingNavigationSection`: シンプルなナビゲーション用セクション
- **必ず `children` プロパティを持つ**
- Pageコンポーネントをラップし、一貫したレイアウトを提供

#### **components/ui/** - UIパーツコンポーネント
再利用可能なUIパーツや共通コンポーネントです。

- `AutoSettingItem`: スキーマ定義から自動生成される設定項目
- `SettingItem`: 手動で構築する設定項目(ラベル+コントロール)
- `SettingNavigationItem`: クリック可能なナビゲーション項目
- `SettingErrorsSummary`: エラーサマリー表示コンポーネント
- `SettingValidatedInput`: 検証機能付き入力フィールド
- `EventPatternEditor`: イベントパターンの編集用エディタ
- 複数のページ間で再利用可能

#### **components/view/** - 設定ページコンポーネント
各設定カテゴリの実装や、画面遷移を伴うページです。

- **カテゴリごとにディレクトリで分割**
- layoutとuiコンポーネントを組み合わせて画面を構成
- メインページ: `~Page` という命名
- ナビゲーションページ: `~NavigationPage` という命名
- 例: 
  - `TimeTrackerSettingsPage` - メイン設定ページ
  - `IgnorableEventsNavigationPage` - 別ページから遷移するナビゲーションページ

---

## 🎨 Layout Components (components/layout/)

画面全体のレイアウトやセクションの共通レイアウトを提供するコンポーネント。
**すべて `children` プロパティを持ちます。**

### SettingNavigationPageLayout

ナビゲーションページ用のレイアウトコンポーネント。戻るボタンやJSON表示ボタンを表示できます。

```tsx
import { SettingNavigationPageLayout } from "../components/layout";

// 戻るボタンとJSON表示ボタンあり
<SettingNavigationPageLayout 
    title="無視可能イベント設定" 
    subtitle="処理から除外するイベントを設定"
    onBack={() => navigate('back')}
    onShowJson={() => setShowJsonEditor(true)}
>
    <SettingSection>...</SettingSection>
</SettingNavigationPageLayout>
```

**Props:**
- `title`: ページタイトル (必須)
- `subtitle`: ページの説明文 (オプション)
- `onBack`: 戻るボタンのクリックハンドラ。指定すると戻るボタンが表示されます (オプション)
- `headerActions`: ヘッダー右側に表示する追加アクション (オプション)
- `onShowJson`: JSON表示ボタンのクリックハンドラ。指定するとJSON表示ボタンが表示されます (オプション)
- `children`: ページ内容 (必須)

**特徴:**
- Pageコンポーネントをラップ
- onBackが指定された場合のみ戻るボタンを表示
- onShowJsonが指定された場合のみJSON表示ボタンを表示
- 一貫した余白とレイアウト

---

### SettingSection

カード形式のセクションコンテナ。通常モードと折りたたみ可能モードをサポートします。

```tsx
import { SettingSection } from "../components/layout";

// 通常モード
<SettingSection title="基本設定" description="アプリケーションの基本的な設定">
    <AutoSettingItem ... />
    <SettingItem ... />
</SettingSection>

// 折りたたみ可能モード(有効/無効スイッチ付き)
<SettingSection
    title="有給休暇の自動入力"
    description="有給休暇を使用した日に自動でTimeTrackerに入力します"
    required={false}
    collapsible={true}
    enabled={settings.enabled}
    onEnabledChange={(enabled) => handleChange({ enabled })}
    defaultExpanded={false}
>
    <AutoSettingItem ... />
</SettingSection>
```

**Props:**
- `title`: セクションタイトル (必須)
- `description`: セクション説明 (オプション)
- `required`: 必須項目の場合true、省略可能の場合false、指定なしの場合はバッジを表示しない (オプション)
- `collapsible`: 折りたたみ可能モードを有効にする (オプション, デフォルト: false)
- `enabled`: 有効/無効の状態 (collapsibleがtrueの場合に使用) (オプション)
- `onEnabledChange`: 有効/無効が変更されたときのコールバック (collapsibleがtrueの場合に使用) (オプション)
- `defaultExpanded`: 初期表示時に展開するかどうか (collapsibleがtrueの場合に使用) (オプション, デフォルト: false)
- `children`: セクション内容

**特徴:**
- Card コンポーネントベース
- 影付き、角丸のデザイン
- 折りたたみ可能モード時: 有効/無効スイッチとシェブロンアイコン
- 必須/省略可バッジの表示
- 有効化すると自動的に展開

---

### SettingNavigationSection

ナビゲーション項目用のシンプルなセクション(Windows設定画面スタイル)。

```tsx
import { SettingNavigationSection } from "../components/layout";

<SettingNavigationSection title="詳細設定">
    <SettingNavigationItem ... />
</SettingNavigationSection>
```

**Props:**
- `title`: セクションタイトル (必須)
- `required`: 必須項目の場合true、省略可能の場合falseで、タイトル横に表示 (オプション)
- `children`: ナビゲーション項目 (通常は `SettingNavigationItem`)

**特徴:**
- **枠線なし** (タイトルのみのシンプルなヘッダー)
- 別画面への遷移項目に使用
- Windows設定画面のようなデザイン
- 必須/省略可のインラインテキスト表示

---

## 🧩 UI Components (components/ui/)

画面構成の基本単位となる再利用可能なUIパーツコンポーネント。

### AutoSettingItem

スキーマ定義から自動的にUIを生成する設定項目コンポーネント。**推奨される標準的な方法です。**

```tsx
import { AutoSettingItem } from "../components/ui";
import { APPEARANCE_SETTINGS_DEFINITION } from "@/schema/settings";

const themeDef = APPEARANCE_SETTINGS_DEFINITION.children!.theme;

<AutoSettingItem
    definition={themeDef}
    value={settings.theme}
    onChange={(value: unknown) => handleChange({ theme: value as string })}
/>
```

**Props:**
- `definition`: 設定項目のスキーマ定義 (必須)
- `value`: 現在の値 (必須)
- `onChange`: 値変更時のコールバック `(value: unknown) => void` (必須)
- `maxWidth`: コントロールの最大幅 (オプション)
- `minWidth`: コントロールの最小幅 (オプション)
- `placeholder`: 入力フィールドのプレースホルダー (オプション)

**特徴:**
- スキーマ定義から自動でUI生成
- 型に応じた適切なコントロール選択:
  - `string`: Dropdown (options指定時) または Input
  - `number`: Input (type="number")
  - `boolean`: Switch
  - `time`: Input (type="time") - `format: 'time'`指定時
  - `array`: 複数のコントロール
  - `object`: ネストされたコントロール群
- ラベル、説明、検証ルールをスキーマから取得
- 必須項目のマーク表示

**使用例:**
```tsx
// Dropdown (string with options)
<AutoSettingItem
    definition={themeDef} // options: ['light', 'dark', 'system']
    value="dark"
    onChange={(value: unknown) => handleChange({ theme: value as string })}
/>

// Switch (boolean)
<AutoSettingItem
    definition={accentColorDef} // type: 'boolean'
    value={true}
    onChange={(value: unknown) => handleChange({ accentColor: value as boolean })}
/>

// Number Input
<AutoSettingItem
    definition={workItemIdDef} // type: 'number'
    value={12345}
    onChange={(value: unknown) => handleChange({ workItemId: value as number })}
    maxWidth="150px"
/>

// Time Input
<AutoSettingItem
    definition={startTimeDef} // type: 'string', format: 'time'
    value="09:00"
    onChange={(value: unknown) => handleChange({ startTime: value as string })}
    maxWidth="150px"
/>
```

---

### SettingItem

個別の設定項目を手動で構築するコンポーネント。細かいカスタマイズが必要な場合に使用。

```tsx
import { SettingItem } from "../components/ui";
import { Dropdown, Switch } from "@fluentui/react-components";

<SettingItem
    label="テーマ"
    description="ライト、ダーク、またはシステム設定に従います"
    control={
        <Dropdown
            value={theme}
            onOptionSelect={(_, data) => setTheme(data.optionValue)}
        >
            <Option value="light">ライト</Option>
            <Option value="dark">ダーク</Option>
            <Option value="system">システム設定</Option>
        </Dropdown>
    }
/>
```

**Props:**
- `label`: 設定項目のラベル (必須)
- `description`: 説明文 (オプション)
- `required`: 必須項目かどうか (オプション)
- `control`: コントロール要素 (Switch, Dropdown, Input など) (オプション)

**特徴:**
- 左側: ラベルと説明
- 右側: コントロール要素
- 下部に境界線 (最後の項目を除く)
- 必須項目のマーク表示

**使い分け:**
- `AutoSettingItem`: スキーマ定義がある標準的な設定項目 ✅ **推奨**
- `SettingItem`: 複雑なカスタムコントロールが必要な場合のみ

---

### SettingNavigationItem

クリック可能なナビゲーション項目 (Windows設定画面スタイル)。

```tsx
import { SettingNavigationItem } from "../components/ui";
import { Badge } from "@fluentui/react-components";

<SettingNavigationItem
    title="無視可能イベント"
    description="処理から除外するイベント名のパターンとマッチモード"
    badge={<Badge appearance="filled" color="informative">3件</Badge>}
    onClick={() => navigate('ignorable-events')}
/>
```

**Props:**
- `title`: 項目タイトル (必須)
- `description`: 説明文 (オプション)
- `badge`: バッジ要素 (件数表示など) (オプション)
- `onClick`: クリック時のハンドラ (必須)

**特徴:**
- 項目全体がクリック可能
- ホバー時に背景色が変化
- 右側にバッジ + シェブロンアイコン
- Card コンポーネントベース

---

### EventPatternEditor

イベントパターンの追加・編集・削除を行うエディタコンポーネント。

```tsx
import { EventPatternEditor } from "../components/ui";

<EventPatternEditor 
    patterns={patterns}
    onChange={setPatterns}
    placeholder="パターン（例: MTG, 個人作業）"
    addButtonText="パターンを追加"
/>
```

**Props:**
- `patterns`: `EventPattern[]` - 現在のパターンリスト (必須)
- `onChange`: `(patterns: EventPattern[]) => void` - パターン変更時のコールバック (必須)
- `placeholder`: 入力フィールドのプレースホルダー (オプション)
- `addButtonText`: 追加ボタンのテキスト (オプション)

**機能:**
- パターン入力フィールド
- マッチモード選択 (部分一致/前方一致/後方一致)
- 行の追加・削除ボタン
- リアルタイムな入力検証

---

## 🎯 コンポーネントの使い分け

| コンポーネント | 用途 | 配置 | 例 |
|--------------|------|------|-----|
| **SettingSection** + **AutoSettingItem** | スキーマ定義がある標準的な設定項目 ✅ 推奨 | layout/ + ui/ | テーマ、言語、数値設定、時刻入力 |
| **SettingSection** + **SettingItem** | カスタムコントロールが必要な設定 | layout/ + ui/ | 複雑な入力フォーム、ボタン |
| **SettingSection** (collapsible) | 有効/無効切り替え可能な設定グループ | layout/ | オプション機能の設定 |
| **SettingNavigationSection** + **SettingNavigationItem** | 別画面への遷移 | layout/ + ui/ | サブ設定画面へのリンク |

---

## 📺 View Components (components/view/)

各設定カテゴリの実装。layoutとuiコンポーネントを組み合わせて画面を構成します。

### 命名規則

- **メインページ**: 後方に `Page` をつける (例: `GeneralSettingsPage`)
- **ナビゲーションページ**: 後方に `NavigationPage` をつける (例: `IgnorableEventsNavigationPage`)

---

### AppearanceSettingsPage.tsx

外観に関する設定のメインページ。

**設定項目:**
- テーマ (ライト/ダーク/システム設定)
- アクセントカラー
- アニメーション効果
- コンパクトモード

**使用コンポーネント:**
- `SettingSection` - 設定グループ
- `AutoSettingItem` - スキーマ駆動の設定項目

---

### GeneralSettingsPage.tsx

一般的なアプリケーション設定のメインページ。

**設定項目:**
- 起動設定 (自動起動、最小化で起動)
- 通知設定 (デスクトップ通知、サウンド)
- 言語設定

**使用コンポーネント:**
- `SettingSection` - 設定グループ
- `AutoSettingItem` / `SettingItem` - 設定項目

---

### TimeTrackerSettingsPage.tsx

TimeTracker固有の設定のメインページ。複雑な設定と画面遷移を含みます。

**設定項目:**
- 基本設定 (ユーザー名、URL、プロジェクトID等)
- 自動更新設定
- 丸め時間タイプ
- 休暇イベント設定 (別画面へのナビゲーション)
- 無視可能イベント設定 (別画面へのナビゲーション)
- イベント重複優先度
- 有給休暇の自動入力設定 (折りたたみ可能)

**使用コンポーネント:**
- `SettingSection` - 通常の設定グループ
- `SettingSection` (collapsible) - 折りたたみ可能な設定グループ
- `AutoSettingItem` - スキーマ駆動の設定項目
- `SettingNavigationSection` + `SettingNavigationItem` - サブ画面遷移

---

### TimeOffEventsNavigationPage.tsx

休暇イベント設定のナビゲーションページ (TimeTrackerSettingsPageから遷移)。

**機能:**
- 戻るボタン
- 休暇イベント名パターンの管理
- WorkItemID設定
- マッチモードの詳細説明

**使用コンポーネント:**
- `SettingNavigationPageLayout` (onBack指定) - 戻るボタン付きレイアウト
- `SettingSection` - コンテンツセクション
- `EventPatternEditor` - パターンエディタ
- `AutoSettingItem` - WorkItemID入力

---

### IgnorableEventsNavigationPage.tsx

無視可能イベント設定のナビゲーションページ (TimeTrackerSettingsPageから遷移)。

**機能:**
- 戻るボタン
- イベントパターンの管理
- マッチモードの詳細説明
- パターンの追加・編集・削除

**使用コンポーネント:**
- `SettingNavigationPageLayout` (onBack指定) - 戻るボタン付きレイアウト
- `SettingSection` - コンテンツセクション
- `EventPatternEditor` - パターンエディタ

---

### JsonEditorView.tsx

設定をJSON形式で直接編集するビュー。

**機能:**
- JSON形式での設定表示・編集
- Monaco Editorベースのシンタックスハイライト
- 不正なJSON形式の警告

**使用コンポーネント:**
- `SettingNavigationPageLayout` - ページレイアウト
- `SettingSection` - コンテンツセクション
- `Editor` - Monacoエディタ (src/components/editor)

---

## 📖 使用例

### スキーマ駆動の設定項目 (✅ 推奨)

```tsx
import { SettingSection, AutoSettingItem } from "../components";
import { APPEARANCE_SETTINGS_DEFINITION } from "@/schema/settings";

const appDef = APPEARANCE_SETTINGS_DEFINITION.children!;

<SettingSection title="外観設定" description="アプリケーションの見た目をカスタマイズ">
    <AutoSettingItem
        definition={appDef.theme}
        value={settings.theme}
        onChange={(value: unknown) => handleChange({ theme: value as string })}
    />
    <AutoSettingItem
        definition={appDef.accentColor}
        value={settings.accentColor}
        onChange={(value: unknown) => handleChange({ accentColor: value as boolean })}
    />
</SettingSection>
```

### 時刻入力の例

```tsx
<AutoSettingItem
    definition={startTimeDef} // type: 'string', format: 'time'
    value={settings.startTime || "09:00"}
    onChange={(value: unknown) => handleChange({ startTime: value as string })}
    maxWidth="150px"
/>
```

### 手動構築の設定項目 (特別な理由がある場合のみ)

```tsx
import { SettingSection, SettingItem } from "../components";
import { Button } from "@fluentui/react-components";

<SettingSection title="データ管理">
    <SettingItem
        label="データをエクスポート"
        description="すべてのデータをJSONファイルとしてエクスポートします"
        control={
            <Button size="small" appearance="secondary">
                エクスポート
            </Button>
        }
    />
</SettingSection>
```

### ナビゲーション項目 (別画面への遷移)

```tsx
import { Badge } from "@fluentui/react-components";
import { SettingNavigationSection, SettingNavigationItem } from "../components";

<SettingNavigationSection title="詳細設定">
    <SettingNavigationItem
        title="無視可能イベント"
        description="処理から除外するイベント名のパターンとマッチモード"
        badge={
            count > 0 ? (
                <Badge appearance="filled" color="informative">{count}件</Badge>
            ) : (
                <span style={{ color: "var(--colorNeutralForeground3)" }}>0件</span>
            )
        }
        onClick={() => setView('ignorable-events')}
    />
</SettingNavigationSection>
```

### 折りたたみ可能な設定グループ

```tsx
import { SettingSection, AutoSettingItem } from "../components";

<SettingSection
    title="有給休暇の自動入力"
    description="有給休暇を使用した日に自動でTimeTrackerに入力します"
    required={false}
    collapsible={true}
    enabled={settings.paidLeaveInputInfo.enabled}
    onEnabledChange={(enabled) => handleChange({ enabled })}
    defaultExpanded={false}
>
    <AutoSettingItem
        definition={workItemIdDef}
        value={settings.paidLeaveInputInfo.workItemId}
        onChange={(value: unknown) => handleChange({ workItemId: value as number })}
        maxWidth="150px"
    />
    <AutoSettingItem
        definition={startTimeDef}
        value={settings.paidLeaveInputInfo.startTime}
        onChange={(value: unknown) => handleChange({ startTime: value as string })}
        maxWidth="150px"
    />
</SettingSection>
```

### 戻るボタン付きナビゲーションページ

```tsx
import { SettingNavigationPageLayout, SettingSection } from "../components";
import { EventPatternEditor } from "../components";

<SettingNavigationPageLayout 
    title="無視可能イベント設定"
    subtitle="処理から除外するイベント名のパターンと一致モードを設定します。"
    onBack={() => setView('main')}
    onShowJson={() => setShowJsonEditor(true)}
>
    <SettingSection title="イベントパターン">
        <EventPatternEditor
            patterns={patterns}
            onChange={setPatterns}
            placeholder="パターン（例: MTG, 個人作業）"
            addButtonText="パターンを追加"
        />
    </SettingSection>
</SettingNavigationPageLayout>
```

---

## 🎨 デザインシステム

### Windows設定画面風デザイン

`SettingNavigationSection` + `SettingNavigationItem` の組み合わせは、Windows 11の設定画面のデザインを参考にしています。

**特徴:**
- タイトルが上部に表示 (枠なし、シンプル)
- クリック可能な項目だけがCard形式
- 項目全体がクリック可能
- ホバー時の視覚フィードバック
- 右側にバッジとシェブロンアイコン

### Fluent UI v9 トークン

すべてのコンポーネントはFluent UI v9のデザイントークンを使用しています。

- **色**: `colorNeutralForeground*`, `colorBrand*`
- **間隔**: `spacingVertical*`, `spacingHorizontal*`
- **タイポグラフィ**: `fontSize*`, `fontWeight*`, `lineHeight*`
- **その他**: `borderRadius*`, `shadow*`, `duration*`, `curve*`

---

## 🔧 開発ガイドライン

### 新しい設定項目の追加

#### 1. スキーマ定義がある場合 (✅ 推奨)

```tsx
// src/schema/settings/settingsDefinition.ts でスキーマを定義
export const NEW_SETTINGS_DEFINITION: SettingDefinition<NewSettings> = {
    type: 'object',
    label: '新しい設定',
    children: {
        myField: {
            type: 'string',
            label: 'フィールド名',
            description: '説明文',
            default: 'default',
            options: ['option1', 'option2'],
        },
        timeField: {
            type: 'string',
            format: 'time',
            label: '開始時刻',
            description: '処理を開始する時刻',
            default: '09:00',
        },
    },
};

// Viewで使用
<SettingSection title="新しいセクション">
    <AutoSettingItem
        definition={NEW_SETTINGS_DEFINITION.children!.myField}
        value={settings.myField}
        onChange={(value: unknown) => handleChange({ myField: value as string })}
    />
    <AutoSettingItem
        definition={NEW_SETTINGS_DEFINITION.children!.timeField}
        value={settings.timeField}
        onChange={(value: unknown) => handleChange({ timeField: value as string })}
        maxWidth="150px"
    />
</SettingSection>
```

#### 2. カスタムコントロールが必要な場合 (特別な理由がある場合のみ)

```tsx
<SettingSection title="新しいセクション">
    <SettingItem
        label="設定名"
        description="説明"
        control={<CustomControl />}
    />
</SettingSection>
```

#### 3. 別画面への遷移が必要な場合

```tsx
<SettingNavigationSection title="詳細設定">
    <SettingNavigationItem
        title="設定名"
        description="説明"
        badge={<Badge>{count}件</Badge>}
        onClick={() => navigate('sub-page')}
    />
</SettingNavigationSection>
```

### 新しい設定カテゴリ(View)の追加

1. **スキーマ定義を作成** (`src/schema/settings/`)
   ```tsx
   export const NEW_CATEGORY_DEFINITION: SettingDefinition<NewCategorySettings> = {
       type: 'object',
       label: '新カテゴリ',
       children: { /* fields */ },
   };
   ```

2. **Pageコンポーネントを作成** (`components/view/newcategory/NewCategorySettingsPage.tsx`)
   - **命名規則**: 後方に `Page` をつける
   ```tsx
   import { SettingSection, AutoSettingItem } from "../../layout";
   
   export function NewCategorySettingsPage() {
       const { settings, updateSettings } = useSettings();
       
       return (
           <>
               <SettingSection title="基本設定">
                   <AutoSettingItem ... />
               </SettingSection>
           </>
       );
   }
   ```

3. **エクスポートを追加** (`components/view/newcategory/index.ts`)
   ```tsx
   export { NewCategorySettingsPage } from "./NewCategorySettingsPage";
   ```

4. **タブを追加** (`SettingPage.tsx`)
   ```tsx
   const CATEGORY_COMPONENTS = {
       general: GeneralSettingsPage,
       appearance: AppearanceSettingsPage,
       timetracker: TimeTrackerSettingsPage,
       newcategory: NewCategorySettingsPage, // 追加
   };
   
   // タブリストに追加
   <Tab value="newcategory">新カテゴリ</Tab>
   ```

### ナビゲーションページの実装

**命名規則**: 後方に `NavigationPage` をつける

```tsx
// メインページでのナビゲーション項目
<SettingNavigationItem
    title="サブ設定"
    onClick={() => setView('sub-settings')}
/>

// ナビゲーションページ (SubSettingsNavigationPage.tsx)
{view === 'sub-settings' && (
    <SettingNavigationPageLayout
        title="サブ設定"
        onBack={() => setView('main')}
        onShowJson={() => setShowJsonEditor(true)}
    >
        <SettingSection title="詳細">
            {/* コンテンツ */}
        </SettingSection>
    </SettingNavigationPageLayout>
)}
```

---

## 📚 関連ファイル

- **設定スキーマ**: 
  - `src/schema/settings/settingsDefinition.ts` - メインスキーマ
  - `src/schema/settings/timetrackerDefinition.ts` - TimeTracker設定スキーマ
- **設定型定義**: `src/types/settings.ts`
- **設定プロバイダ**: `src/store/settings/SettingsProvider.tsx`
- **設定ユーティリティ**: `src/schema/settings/settingUtils.ts`
- **共通コンポーネント**: `src/components/`

---

## 🚀 ベストプラクティス

### 1. スキーマ駆動開発を優先 ✅

可能な限り`AutoSettingItem`を使用し、スキーマ定義から自動生成する。

```tsx
// ✅ 推奨: スキーマ駆動
<AutoSettingItem
    definition={schemaDef.field}
    value={value}
    onChange={(value: unknown) => handleChange({ field: value as Type })}
/>

// ⚠️ 避ける: 手動構築 (特別な理由がない限り)
<SettingItem
    label="フィールド"
    control={<Input ... />}
/>
```

### 2. 適切なコンポーネント選択

- 通常の設定 → `SettingSection` + `AutoSettingItem` ✅
- カスタムUI → `SettingSection` + `SettingItem`
- 画面遷移 → `SettingNavigationSection` + `SettingNavigationItem`
- 折りたたみ → `SettingSection` (collapsible)

### 3. レイアウトの統一

すべての設定画面で`SettingPageLayout`を使用し、一貫したレイアウトを保つ。

### 4. アクセシビリティ

- ラベルと説明を明確に記述
- 適切なARIA属性を使用
- キーボードナビゲーションを考慮

### 5. 型安全性

TypeScriptの型定義を活用し、型安全なコードを書く。

```tsx
// 型安全なonChange
onChange={(value: unknown) => handleChange({ field: value as FieldType })}
```

### 6. 設定の永続化

`useSettings`フックを使用して設定を管理・永続化する。

```tsx
const { settings, updateSettings } = useSettings();

const handleChange = (updates: Partial<Settings>) => {
    updateSettings(updates);
};
```

### 7. パフォーマンス最適化

- 不要な再レンダリングを避ける
- 大きな設定グループは折りたたみ可能にする
- 適切にコンポーネントをメモ化する

### 8. スキーマ定義のベストプラクティス

```tsx
// 時刻入力フィールドの定義
startTime: {
    type: 'string',
    format: 'time', // 時刻入力として扱う
    label: '開始時刻',
    description: '処理を開始する時刻',
    default: '09:00',
},

// ドロップダウンの定義
theme: {
    type: 'string',
    label: 'テーマ',
    description: 'アプリケーションのテーマ',
    options: ['light', 'dark', 'system'],
    default: 'system',
},
```

---

## 🎓 まとめ

- **Layout**: ページ構造を提供 (`SettingPageLayout`, `SettingSection`, `SettingNavigationSection`)
- **UI**: 再利用可能なパーツ (`AutoSettingItem`, `SettingItem`, `SettingNavigationItem`, `EventPatternEditor`)
- **View**: 設定カテゴリの実装 (各種Settings.tsx)
- **スキーマ駆動**: 可能な限り`AutoSettingItem`を使用 ✅
- **一貫性**: 同じレイアウトパターンを使用
- **型安全**: TypeScriptの型システムを活用
