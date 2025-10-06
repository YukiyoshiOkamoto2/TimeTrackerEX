# Setting Page

アプリケーションの設定画面を構成するコンポーネント群です。

## � 目次

- [ディレクトリ構造](#-ディレクトリ構造)
- [Layout Components](#-layout-components)
- [使用例](#-使用例)
- [Components](#-components)
  - [SettingPage (ルート)](#-settingpagetsx-ルート)
  - [Layout Components (components/layout/)](#-layout-components-componentslayout)
  - [UI Components (components/ui/)](#-ui-components-componentsui)
  - [View Components (components/view/)](#-view-components-componentsview)
- [デザインシステム](#-デザインシステム)
- [開発ガイドライン](#-開発ガイドライン)
- [関連ファイル](#-関連ファイル)
- [ベストプラクティス](#-ベストプラクティス)

## �📁 ディレクトリ構造

```
setting/
├── README.md                    # このファイル
├── index.ts                     # SettingPageのエクスポート
├── SettingPage.tsx              # メイン設定ページ(タブナビゲーション)
└── components/                  # 設定画面のすべてのコンポーネント
    ├── index.ts                 # すべてをエクスポート (layout, ui, view)
    ├── layout/                  # ページレベルのレイアウトコンポーネント
    │   ├── index.ts
    │   ├── SettingPageLayout.tsx
    │   └── SettingContentSection.tsx
    ├── ui/                      # 再利用可能なUIパーツコンポーネント
    │   ├── index.ts
    │   ├── SettingSection.tsx
    │   ├── SettingItem.tsx
    │   ├── SettingNavigationSection.tsx
    │   ├── SettingNavigationItem.tsx
    │   └── EventPatternEditor.tsx
    └── view/                    # 設定画面コンテンツ
        ├── index.ts
        ├── AppearanceSettings.tsx
        ├── GeneralSettings.tsx
        ├── TimeTrackerSettings.tsx
        ├── IgnorableEventsSettings.tsx
        └── JsonEditorView.tsx
```

### ディレクトリの役割

- **components/layout/**: ページレベルのレイアウトコンポーネント
  - ページ全体の構造を提供する高レベルのコンポーネント
  - 例: SettingPageLayout, SettingContentSection
  - Pageコンポーネントをラップし、一貫したレイアウトを提供
  
- **components/ui/**: 再利用可能なUIパーツコンポーネント
  - 画面構成の基本単位となるコンポーネント
  - 例: SettingSection, SettingItem, SettingNavigationItem, EventPatternEditor
  - 設定セクション、設定項目、ナビゲーション項目など
  - 複数のview間で再利用可能
  
- **components/view/**: 設定画面のコンテンツ(メイン画面)
  - 各設定カテゴリの実装
  - layoutとuiコンポーネントを組み合わせて画面を構成
  - 例: TimeTrackerSettings, AppearanceSettings

## 🎨 Layout Components (components/layout/)

ページ全体の構造を提供する高レベルのレイアウトコンポーネント。

### SettingPageLayout

ページ全体のレイアウトを提供します。

```tsx
import { SettingPageLayout } from "../components/layout";

<SettingPageLayout 
    title="設定タイトル" 
    subtitle="設定の説明文"
>
    {/* コンテンツ */}
</SettingPageLayout>
```

**Props:**
- `title`: ページタイトル (必須)
- `subtitle`: ページの説明文 (オプション)
- `children`: ページ内容

---

### SettingContentSection

カードスタイルのコンテンツセクション。

```tsx
import { SettingContentSection } from "../components/layout";

<SettingContentSection title="セクション名" description="説明">
    {/* セクション内容 */}
</SettingContentSection>
```

**Props:**
- `title`: セクションタイトル (オプション)
- `description`: セクション説明 (オプション)
- `children`: セクション内容

**特徴:**
- Card コンポーネントベース
- 影付き、角丸のデザイン
- タイトルとコンテンツの間に適切な余白

---

## 🧩 UI Components (components/ui/)

画面構成の基本単位となる再利用可能なUIパーツコンポーネント。

### SettingSection

通常の設定項目グループ用セクション。オプションで折りたたみ可能なモードもサポートしています。

```tsx
import { SettingSection } from "../components/ui";

// 通常モード
<SettingSection title="基本設定" description="アプリケーションの基本的な設定">
    <SettingItem ... />
    <SettingItem ... />
</SettingSection>

// 折りたたみ可能モード
<SettingSection
    title="有給休暇の自動入力"
    description="有給休暇を使用した日に自動でTimeTrackerに入力します"
    collapsible={true}
    enabled={true}
    onEnabledChange={(enabled) => console.log(enabled)}
    defaultExpanded={false}
>
    <SettingItem ... />
    <SettingItem ... />
</SettingSection>
```

**Props:**
- `title`: セクションタイトル (必須)
- `description`: セクション説明 (オプション)
- `children`: 設定項目 (通常は `SettingItem` の配列)
- `collapsible`: 折りたたみ可能モードを有効にする (オプション, デフォルト: false)
- `enabled`: 有効/無効の状態 (collapsibleがtrueの場合に使用) (オプション)
- `onEnabledChange`: 有効/無効が変更されたときのコールバック (collapsibleがtrueの場合に使用) (オプション)
- `defaultExpanded`: 初期表示時に展開するかどうか (collapsibleがtrueの場合に使用) (オプション, デフォルト: false)

**特徴:**
- Card で囲まれた枠線あり
- 複数の `SettingItem` をグループ化
- **折りたたみ可能モード**: 有効/無効スイッチとシェブロンアイコン付き
- 有効化すると自動的に展開
- タイトルと説明がCard内に表示

**使用例:**
- スイッチ、ドロップダウン、入力フィールドなどの通常の設定項目
- オプション機能の有効/無効切り替えとその設定項目(折りたたみ可能モード)

---

### SettingItem

個別の設定項目を表示します。

```tsx
import { SettingItem } from "../components/ui";

<SettingItem
    label="設定名"
    description="設定の説明"
    control={<Switch />}
/>
```

**Props:**
- `label`: 設定項目のラベル (必須)
- `description`: 説明文 (オプション)
- `control`: コントロール要素 (Switch, Dropdown, Input など) (オプション)

**特徴:**
- 左側: ラベルと説明
- 右側: コントロール要素
- 下部に境界線 (最後の項目を除く)

---

### SettingNavigationSection

画面遷移する項目用のセクション (Windows設定画面スタイル)。

```tsx
import { SettingNavigationSection } from "../components/ui";

<SettingNavigationSection title="無視可能イベント" description="処理から除外するイベント...">
    <SettingNavigationItem ... />
</SettingNavigationSection>
```

**Props:**
- `title`: セクションタイトル (必須)
- `description`: セクション説明 (オプション)
- `children`: ナビゲーション項目 (通常は `SettingNavigationItem`)

**特徴:**
- **枠線なし** (タイトルと説明のみ)
- 別画面への遷移項目に使用
- Windows設定画面のようなシンプルなデザイン

---

### SettingNavigationItem

クリック可能なナビゲーション項目 (Windows設定画面スタイル)。

```tsx
import { SettingNavigationItem } from "../components/ui";

<SettingNavigationItem
    title="無視可能イベント"
    description="処理から除外するイベント名のパターンとマッチモード"
    badge={<Badge>3件</Badge>}
    onClick={() => navigate()}
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

## 🎯 コンポーネントの使い分け

| コンポーネント | 用途 | 枠線 | 例 |
|--------------|------|------|-----|
| **SettingSection** + **SettingItem** | 通常の設定項目 | ✅ Card枠あり | スイッチ、ドロップダウン、入力フィールド |
| **SettingSection** (collapsible) + **SettingItem** | 有効/無効切り替え可能な設定 | ✅ Card枠あり | 有給休暇の自動入力などのオプション機能 |
| **SettingNavigationSection** + **SettingNavigationItem** | 別画面への遷移 | ❌ 枠なし | サブ設定画面へのリンク |

## 📖 使用例

### 通常の設定項目

```tsx
import { SettingSection, SettingItem } from "../components/ui";

<SettingSection title="テーマ設定" description="アプリケーションの外観をカスタマイズ">
    <SettingItem
        label="テーマ"
        description="ライト、ダーク、またはシステム設定に従います"
        control={<Dropdown>...</Dropdown>}
    />
    <SettingItem
        label="アクセントカラー"
        description="システムのアクセントカラーを使用する"
        control={<Switch />}
    />
</SettingSection>
```

### ナビゲーション項目 (別画面への遷移)

```tsx
import { Badge } from "@fluentui/react-components";
import { SettingNavigationSection, SettingNavigationItem } from "../components/ui";

<SettingNavigationSection 
    title="無視可能イベント" 
    description="処理から除外するイベント名のパターンとマッチモード"
>
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
        onClick={() => setShowSubPage(true)}
    />
</SettingNavigationSection>
```

### 専用設定ページのレイアウト

```tsx
import { SettingPageLayout, SettingContentSection } from "../components/layout";

<SettingPageLayout 
    title="無視可能イベント設定"
    subtitle="処理から除外するイベント名のパターンとマッチモードを設定します。"
>
    <SettingContentSection title="イベントパターン">
        {/* エディタなどのコンテンツ */}
    </SettingContentSection>
</SettingPageLayout>
```

## 📦 Components

### 📄 SettingPage.tsx (ルート)

メインの設定ページ。タブナビゲーションで各設定カテゴリを切り替えます。

**機能:**
- タブナビゲーション (一般、外観設定、TimeTracker)
- JSON設定エディタへの切り替え
- リンクベースのカテゴリ選択

---

## 🎨 Layout Components (components/layout/)

レイアウトコンポーネントについては上記「Layout Components」セクションを参照してください。

---

## 🧩 UI Components (components/ui/)

### EventPatternEditor.tsx

イベントパターンの追加・編集・削除を行うエディタコンポーネント。

**場所:** `components/ui/EventPatternEditor.tsx`

**機能:**
- パターン入力フィールド
- マッチモード選択 (部分一致/前方一致/後方一致/正規表現)
- 行の追加・削除ボタン
- リアルタイムな入力検証

**Props:**
- `patterns`: `EventPattern[]` - 現在のパターンリスト
- `onChange`: `(patterns: EventPattern[]) => void` - パターン変更時のコールバック

**使用例:**
```tsx
import { EventPatternEditor } from "../components/ui";

<EventPatternEditor 
    patterns={patterns} 
    onChange={setPatterns} 
/>
```

---

## 📺 View Components (components/view/)

各設定カテゴリの実装。layoutとuiコンポーネントを組み合わせて画面を構成します。

### AppearanceSettings.tsx

外観に関する設定画面。

**場所:** `components/view/AppearanceSettings.tsx`

**設定項目:**
- テーマ (ライト/ダーク/システム設定)
- アクセントカラー
- アニメーション効果
- コンパクトモード

**使用レイアウト:**
- `SettingSection` - 設定グループ
- `SettingItem` - 個別設定項目

---

### GeneralSettings.tsx

一般的なアプリケーション設定画面。

**場所:** `components/view/GeneralSettings.tsx`

**設定項目:**
- 起動設定 (自動起動、最小化で起動)
- 通知設定 (デスクトップ通知、サウンド)
- 言語設定

**使用レイアウト:**
- `SettingSection` - 設定グループ
- `SettingItem` - 個別設定項目

---

### TimeTrackerSettings.tsx

TimeTracker固有の設定画面。複雑な設定と画面遷移を含みます。

**場所:** `components/view/TimeTrackerSettings.tsx`

**設定項目:**
- 基本設定 (ユーザー名、URL、プロジェクトID)
- 自動更新設定
- 丸め時間タイプ
- 休暇イベント設定
- 無視可能イベント (別画面へのナビゲーション)
- イベント重複優先度
- スケジュール自動入力設定

**特徴:**
- 画面遷移ロジックを含む (無視可能イベント設定)
- `SettingNavigationSection` + `SettingNavigationItem` でサブ画面への遷移
- バッジで設定件数を表示

**使用レイアウト:**
- `SettingSection` - 通常の設定グループ
- `SettingItem` - 個別設定項目
- `SettingNavigationSection` + `SettingNavigationItem` - サブ画面遷移

---

### IgnorableEventsSettings.tsx

無視可能イベントの専用設定画面。

**場所:** `components/view/IgnorableEventsSettings.tsx`

**機能:**
- 戻るボタン
- イベントパターンの管理
- マッチモードの詳細説明
- パターンの追加・編集・削除

**使用コンポーネント:**
- `SettingPageLayout` - ページ全体のレイアウト
- `SettingContentSection` - コンテンツセクション
- `EventPatternEditor` (ui) - パターンエディタ

---

### JsonEditorView.tsx

設定をJSON形式で直接編集するビュー。

**場所:** `components/view/JsonEditorView.tsx`

**機能:**
- JSON形式での設定表示・編集
- Monaco Editorベースのシンタックスハイライト
- 保存/キャンセルボタン
- 不正なJSON形式の警告

**使用コンポーネント:**
- `SettingPageLayout` - ページレイアウト
- `SettingContentSection` - コンテンツセクション
- `Editor` - Monacoエディタ (src/components/editor)

---

## 🎨 デザインシステム

### Windows設定画面風デザイン

`SettingNavigationSection` + `SettingNavigationItem` の組み合わせは、Windows 11の設定画面のデザインを参考にしています。

**特徴:**
- タイトルと説明が上部に表示 (枠なし)
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

## 🔧 開発ガイドライン

### 新しい設定項目の追加

1. **通常の設定項目の場合:**
   ```tsx
   <SettingSection title="新しいセクション">
       <SettingItem
           label="設定名"
           description="説明"
           control={<Switch />}
       />
   </SettingSection>
   ```

2. **別画面への遷移が必要な場合:**
   ```tsx
   <SettingNavigationSection title="新しいセクション">
       <SettingNavigationItem
           title="設定名"
           description="説明"
           badge={<Badge>表示</Badge>}
           onClick={handleNavigate}
       />
   </SettingNavigationSection>
   ```

### 新しい設定カテゴリ(View)の追加

1. `components/view/` に新しいコンポーネントを作成
   ```tsx
   // components/view/NewSettings.tsx
   import { SettingSection, SettingItem } from "../layout";
   
   export function NewSettings() {
       return (
           <>
               <SettingSection title="タイトル">
                   <SettingItem ... />
               </SettingSection>
           </>
       );
   }
   ```

2. `components/view/index.ts` でエクスポート
   ```tsx
   export { NewSettings } from "./NewSettings";
   ```

3. `SettingPage.tsx` の `CATEGORY_COMPONENTS` に追加
   ```tsx
   const CATEGORY_COMPONENTS = {
       general: GeneralSettings,
       appearance: AppearanceSettings,
       timetracker: TimeTrackerSettings,
       newCategory: NewSettings, // 追加
   };
   ```

4. タブリストに新しいタブを追加
   ```tsx
   <Tab value="newCategory">新カテゴリ</Tab>
   ```

### 新しいUIコンポーネントの追加

再利用可能なUIパーツを追加する場合:

1. `components/ui/` に新しいコンポーネントを作成
2. `components/ui/index.ts` でエクスポート
3. 必要なviewから `import { NewComponent } from "../ui"` で使用

### レイアウトコンポーネントの拡張

レイアウトコンポーネントを拡張する場合:

1. `components/layout/` に新しいコンポーネントを追加
2. `components/layout/index.ts` でエクスポート
3. viewコンポーネントから `import { NewLayout } from "../layout"` で使用

## 📚 関連ファイル

- **設定スキーマ**: `src/schema/settings/settingsDefinition.ts`
- **設定型定義**: `src/types/settings.ts`
- **設定プロバイダ**: `src/store/settings/SettingsProvider.tsx`
- **共通コンポーネント**: `src/components/`

## 🚀 ベストプラクティス

1. **一貫性を保つ**: 既存のレイアウトコンポーネントを使用して、デザインの一貫性を保ちます
2. **適切なコンポーネント選択**: 通常の設定は `SettingSection`、画面遷移は `SettingNavigationSection` を使用
3. **アクセシビリティ**: ラベルと説明を明確に記述し、適切なARIA属性を使用
4. **型安全性**: TypeScriptの型定義を活用し、型安全なコードを書く
5. **設定の永続化**: `useSettings` フックを使用して設定を管理・永続化
