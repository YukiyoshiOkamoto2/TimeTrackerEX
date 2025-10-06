# Setting Page

アプリケーションの設定画面を構成するコンポーネント群です。

## 📁 ディレクトリ構造

```
setting/
├── README.md                    # このファイル
├── index.ts                     # SettingPageのエクスポート
├── SettingPage.tsx              # メイン設定ページ(タブナビゲーション)
├── components/                  # 個別の設定画面コンポーネント
│   ├── index.ts
│   ├── AppearanceSettings.tsx
│   ├── GeneralSettings.tsx
│   ├── TimeTrackerSettings.tsx
│   ├── IgnorableEventsSettings.tsx
│   ├── IgnorableEventsEditor.tsx
│   └── JsonEditorView.tsx
└── layout/                      # 再利用可能なレイアウトコンポーネント
    ├── index.ts
    ├── SettingPageLayout.tsx
    ├── SettingContentSection.tsx
    ├── SettingSection.tsx
    ├── SettingItem.tsx
    ├── SettingNavigationSection.tsx
    └── SettingNavigationItem.tsx
```

## 🎨 Layout Components

設定画面で使用する再利用可能なレイアウトコンポーネント。

### SettingPageLayout

ページ全体のレイアウトを提供します。

```tsx
import { SettingPageLayout } from "../layout";

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
import { SettingContentSection } from "../layout";

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

### SettingSection

通常の設定項目グループ用セクション。

```tsx
import { SettingSection } from "../layout";

<SettingSection title="基本設定" description="アプリケーションの基本的な設定">
    <SettingItem ... />
    <SettingItem ... />
</SettingSection>
```

**Props:**
- `title`: セクションタイトル (必須)
- `description`: セクション説明 (オプション)
- `children`: 設定項目 (通常は `SettingItem` の配列)

**特徴:**
- Card で囲まれた枠線あり
- 複数の `SettingItem` をグループ化

**使用例:**
- スイッチ、ドロップダウン、入力フィールドなどの通常の設定項目

---

### SettingItem

個別の設定項目を表示します。

```tsx
import { SettingItem } from "../layout";

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
import { SettingNavigationSection } from "../layout";

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
import { SettingNavigationItem } from "../layout";

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
| **SettingNavigationSection** + **SettingNavigationItem** | 別画面への遷移 | ❌ 枠なし | サブ設定画面へのリンク |

## 📖 使用例

### 通常の設定項目

```tsx
import { SettingSection, SettingItem } from "../layout";

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
import { SettingNavigationSection, SettingNavigationItem } from "../layout";

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
import { SettingPageLayout, SettingContentSection } from "../layout";

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

### SettingPage.tsx

メインの設定ページ。タブナビゲーションで各設定カテゴリを切り替えます。

**機能:**
- タブナビゲーション (一般、外観設定、TimeTracker)
- JSON設定エディタへの切り替え
- リンクベースのカテゴリ選択

---

### AppearanceSettings.tsx

外観に関する設定。

**設定項目:**
- テーマ (ライト/ダーク/システム設定)
- アクセントカラー
- アニメーション
- コンパクトモード

---

### GeneralSettings.tsx

一般的なアプリケーション設定。

**設定項目:**
- 起動設定 (自動起動、最小化で起動)
- 通知設定 (デスクトップ通知、サウンド)
- 言語設定

---

### TimeTrackerSettings.tsx

TimeTracker固有の設定。

**設定項目:**
- 基本設定 (ユーザー名、URL、プロジェクトID)
- 自動更新設定
- 丸め時間タイプ
- 休暇イベント設定
- 無視可能イベント (別画面)
- イベント重複優先度
- スケジュール自動入力設定

**特徴:**
- 画面遷移ロジックを含む (無視可能イベント設定)
- バッジで設定件数を表示

---

### IgnorableEventsSettings.tsx

無視可能イベントの専用設定ページ。

**機能:**
- 戻るボタン
- イベントパターンの管理
- マッチモードの説明

**使用コンポーネント:**
- `SettingPageLayout` - ページレイアウト
- `SettingContentSection` - コンテンツセクション
- `IgnorableEventsEditor` - パターンエディタ

---

### IgnorableEventsEditor.tsx

イベントパターンの追加・編集・削除を行うエディタ。

**機能:**
- パターン入力
- マッチモード選択 (部分一致/前方一致/後方一致)
- 行の追加・削除

**Props:**
- `patterns`: `IgnorableEventPattern[]`
- `onChange`: `(patterns: IgnorableEventPattern[]) => void`

---

### JsonEditorView.tsx

設定をJSON形式で編集するビュー。

**機能:**
- JSON形式での設定表示
- Monaco Editorベース
- 保存/キャンセルボタン

**使用コンポーネント:**
- `SettingPageLayout` - ページレイアウト
- `SettingContentSection` - コンテンツセクション
- `Editor` - Monacoエディタ

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

### 新しい設定カテゴリの追加

1. `components/` に新しいコンポーネントを作成
2. `SettingPage.tsx` の `CATEGORY_COMPONENTS` に追加
3. タブリストに新しいタブを追加

### レイアウトコンポーネントの拡張

レイアウトコンポーネントを拡張する場合は、`layout/` ディレクトリに追加し、`layout/index.ts` でエクスポートしてください。

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
