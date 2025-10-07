# pages

ページコンポーネント（画面単位）のディレクトリです。各ページは**自己完結型**として設計され、他のページや全体への影響を最小化します。

## 設計原則

### 🎯 自己完結型アーキテクチャ

各ページは独立したモジュールとして機能し、ページ固有のロジック・コンポーネント・型定義をページディレクトリ内に集約します。

**目的:**
- コードの変更が他のページに影響しない
- ページ単位でのメンテナンス・削除が容易
- 開発者が特定のページに集中できる

## ディレクトリ構造

```
pages/
├── Home/                     # ホーム画面
│   ├── index.tsx             # エントリーポイント
│   ├── HomePage.tsx          # メインコンポーネント
│   ├── HomePage.test.tsx     # テスト
│   ├── components/           # ページ固有のコンポーネント
│   │   ├── WelcomeCard.tsx
│   │   ├── QuickActions.tsx
│   │   └── *.test.tsx
│   ├── hooks/                # ページ固有のフック
│   │   ├── useHomeData.ts
│   │   └── *.test.ts
│   ├── types.ts              # ページ固有の型定義
│   ├── utils.ts              # ページ固有のユーティリティ
│   └── README.md             # ページのドキュメント
│
├── Settings/                 # 設定画面
│   ├── index.tsx
│   ├── SettingsPage.tsx
│   ├── components/
│   ├── hooks/
│   ├── types.ts
│   └── README.md
│
└── TimeEntry/                # 時刻入力画面
    ├── index.tsx
    ├── TimeEntryPage.tsx
    ├── components/
    ├── hooks/
    ├── types.ts
    └── README.md
```

## ファイル配置ルール

### 必須ファイル

1. **index.tsx** - ページのエントリーポイント
   ```typescript
   export { HomePage as default } from './HomePage'
   ```

2. **[PageName].tsx** - メインページコンポーネント
   ```typescript
   export function HomePage() {
     return <div>Home Page</div>
   }
   ```

3. **README.md** - ページの説明、使用方法、注意事項

### オプショナルファイル

- **components/** - ページ固有のコンポーネント
- **hooks/** - ページ固有のカスタムフック
- **types.ts** - ページ固有の型定義
- **utils.ts** - ページ固有のユーティリティ関数
- **constants.ts** - ページ固有の定数

## 実装ガイドライン

### 1ファイル1コンポーネント原則

**基本ルール**: 1つのファイルには1つのエクスポートされるコンポーネントのみを配置します。

```typescript
// ✅ Good: 1ファイル1コンポーネント
// SettingsForm.tsx
export function SettingsForm({ data, onSubmit }: SettingsFormProps) {
  // ヘルパー関数（同ファイル内はOK）
  const validateForm = (data: FormData) => { /* ... */ }
  
  return <form onSubmit={onSubmit}>...</form>
}

// FormHeader.tsx（別ファイル）
export function FormHeader({ title }: FormHeaderProps) {
  return <header>{title}</header>
}

// FormFooter.tsx（別ファイル）
export function FormFooter({ onCancel, onSubmit }: FormFooterProps) {
  return <footer>...</footer>
}
```

```typescript
// ❌ Bad: 複数コンポーネントを1ファイルに配置
// SettingsForm.tsx
export function SettingsForm() { /* ... */ }
export function FormHeader() { /* ... */ }      // ❌ 別ファイルに分離すべき
export function FormFooter() { /* ... */ }      // ❌ 別ファイルに分離すべき
function InternalHelper() { /* ... */ }         // ✅ エクスポートしないヘルパーはOK
```

**例外として許可されるもの:**
- 同じファイル内でのみ使用されるヘルパー関数（エクスポートしない）
- コンポーネントのProps型定義
- コンポーネント固有の定数
- ローカルで使用される小さな型定義

**分離の目安:**
- コンポーネントが他の場所で再利用される可能性がある → 別ファイル化
- コンポーネントが50行以上 → 別ファイル化を検討
- コンポーネントが独立したロジックを持つ → 別ファイル化

### ✅ Good: ページ内で完結

```typescript
// pages/Settings/SettingsPage.tsx
import { useSettings } from '@/store'  // ✅ グローバル状態の読み取りはOK
import { Button } from '@fluentui/react-components'  // ✅ 外部ライブラリはOK
import { SettingsForm } from './components/SettingsForm'  // ✅ ページ内コンポーネント
import { useSettingsValidation } from './hooks/useSettingsValidation'  // ✅ ページ内フック
import type { SettingsFormData } from './types'  // ✅ ページ内型定義

export function SettingsPage() {
  const { settings, updateSettings } = useSettings()
  const { validate, errors } = useSettingsValidation()
  
  const handleSubmit = (data: SettingsFormData) => {
    if (validate(data)) {
      updateSettings(data)  // ✅ グローバル状態の更新（Provider経由）
    }
  }
  
  return <SettingsForm data={settings} errors={errors} onSubmit={handleSubmit} />
}
```

### ❌ Bad: ページ外への依存・影響

```typescript
// ❌ Bad: 他ページのコンポーネントに依存
import { TimeEntryList } from '@/pages/TimeEntry/components/TimeEntryList'

// ❌ Bad: ページ固有のコンポーネントをcomponents/に配置
import { SettingsForm } from '@/components/features/SettingsForm'

// ❌ Bad: グローバルスコープを直接変更
function SettingsPage() {
  window.globalConfig = { theme: 'dark' }  // 副作用が大きい
  document.body.style.backgroundColor = 'black'  // 他ページに影響
}

// ❌ Bad: 他ページのグローバル状態を直接変更
import { timeEntryStore } from '@/pages/TimeEntry/store'
function SettingsPage() {
  timeEntryStore.clearAll()  // 他ページの状態を破壊
}
```

## 依存関係のルール

### 許可される依存

✅ **グローバルリソース（読み取り・更新）**
- `@/store/*` - Context APIによるグローバル状態管理
- `@/core/*` - ビジネスロジック・API
- `@/types/*` - 共通型定義
- `@/schema/*` - バリデーションスキーマ
- `@/lib/*` - 共有ライブラリ
- `@/hooks/*` - 共通カスタムフック
- `@/utils/*` - 共通ユーティリティ
- `@/components/common/*` - 共通コンポーネント
- `@/components/layout/*` - レイアウトコンポーネント

✅ **外部ライブラリ**
- `@fluentui/react-components` - UIコンポーネント
- `react`, `react-router-dom` など

### 禁止される依存

❌ **他ページへの依存**
- `@/pages/OtherPage/components/*` - 他ページのコンポーネント
- `@/pages/OtherPage/hooks/*` - 他ページのフック
- `@/pages/OtherPage/types` - 他ページの型定義

❌ **グローバルスコープの直接変更**
- `window.*` への直接代入
- `document.body.*` への直接変更
- グローバル変数の定義

## 共通化の判断基準

ページ固有のコードを共通コンポーネント化するタイミング:

### 3ページルール

**3つ以上のページで使用** → 共通化を検討

```typescript
// 1つのページでのみ使用 → pages/Settings/ に配置
// 2つのページで使用 → まだ pages/ 内に配置（様子見）
// 3つ以上のページで使用 → components/common/ に移動
```

### 共通化の手順

1. **コンポーネント**: `pages/*/components/` → `components/common/`
2. **フック**: `pages/*/hooks/` → `hooks/`
3. **型定義**: `pages/*/types.ts` → `types/`
4. **ユーティリティ**: `pages/*/utils.ts` → `utils/`

## テスト

各ページには対応するテストファイルを作成してください。

```typescript
// pages/Settings/SettingsPage.test.tsx
import { render, screen } from '@testing-library/react'
import { SettingsPage } from './SettingsPage'

describe('SettingsPage', () => {
  it('設定フォームが表示される', () => {
    render(<SettingsPage />)
    expect(screen.getByRole('form')).toBeInTheDocument()
  })
})
```

## ページREADMEのテンプレート

各ページディレクトリには `README.md` を作成してください。

```markdown
# [ページ名]

## 概要
[ページの目的と機能の簡単な説明]

## 主な機能
- [機能1]
- [機能2]

## 使用している技術
- [特別なライブラリやパターン]

## ページ固有のコンポーネント
- `ComponentName` - [説明]

## ページ固有のフック
- `useCustomHook` - [説明]

## 注意事項
- [開発時の注意点]
```

## まとめ

### 重要なポイント

1. ✅ **ページ固有の機能はページ内で完結**
2. ✅ **グローバルリソースの使用はOK（Context API、core、共通コンポーネント等）**
3. ❌ **他ページへの依存は禁止**
4. ❌ **グローバルスコープの直接変更は禁止**
5. 📊 **3ページルール: 3つ以上で使う場合のみ共通化**

この設計により、各ページは独立性を保ちつつ、必要なグローバルリソースは活用できます。

