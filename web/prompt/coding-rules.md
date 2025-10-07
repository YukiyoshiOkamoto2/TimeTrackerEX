# コーディング・デザインルール

TimeTracker EX プロジェクトの開発ガイドラインです。

## 基本方針

**デザインシステム優先**: Fluent UI v9を基盤とし、一貫性のあるUIを実現する

## コーディングルール（概要）

### TypeScript
- **型安全性**: `any`型を避け、明示的な型定義を使用
- **Optional Chaining**: `user?.name ?? 'Unknown'` を活用
- **型エクスポート**: `export type { User, Settings }`

### React
- **関数コンポーネント**: 名前付きエクスポート + Props型定義
- **1ファイル1コンポーネント**: 1つのファイルには1つのコンポーネントのみを配置（ヘルパー関数・型定義は例外）
- **Hooks**: `useCallback`, `useMemo` で最適化
- **Context API**: グローバル状態管理に使用

### ファイル構成
- **Pages**: 各ページは独立し、ページ固有のコンポーネントは `pages/*/components/` に配置
- **Components**: 複数ページで共有されるコンポーネントのみ `src/components/` に配置
- **1ファイル1コンポーネント原則**:
  - ✅ 1つのファイルには1つのエクスポートされるコンポーネントのみ
  - ✅ 例外: 同じファイル内のヘルパー関数、型定義、定数はOK
  - ❌ 複数のコンポーネントを1ファイルに配置しない
- **命名**: コンポーネント=PascalCase、Hooks=camelCase+useプレフィックス

---

## デザインルール ⭐ 最重要

### 1. Fluent UI v9 コンポーネント必須

**ネイティブHTML要素の使用を禁止**。すべてFluent UIコンポーネントを使用すること。

```typescript
// ✅ Good: Fluent UIコンポーネント
import { Button, Input, Label } from '@fluentui/react-components'

<Label>ユーザー名</Label>
<Input type="text" />
<Button appearance="primary">保存</Button>

// ❌ Bad: ネイティブHTML要素（禁止）
<label>ユーザー名</label>
<input type="text" />
<button>保存</button>
```

### 2. スタイリング: makeStyles 必須

**インラインスタイル（`style={{...}}`）の使用を禁止**。すべて `makeStyles` でクラス化すること。

```typescript
import { makeStyles, tokens } from '@fluentui/react-components'

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
    padding: tokens.spacingHorizontalL,
  },
})

// ✅ Good
<div className={styles.container}>...</div>

// ❌ Bad（禁止）
<div style={{ display: 'flex', gap: '12px' }}>...</div>
```

### 3. デザイントークン必須 ⚠️ 厳守

**ハードコードされた数値・色の使用を禁止**。すべてFluent UIデザイントークンを使用すること。

参考: [Fluent UI Design Tokens](https://storybooks.fluentui.dev/react/?path=/docs/theme-spacing--docs)

```typescript
import { tokens } from '@fluentui/react-components'

// ✅ Good: デザイントークン使用
const styles = makeStyles({
  container: {
    padding: tokens.spacingVerticalL,              // ✅ 16px
    gap: tokens.spacingHorizontalM,                // ✅ 12px
    fontSize: tokens.fontSizeBase300,              // ✅ 14px
    fontWeight: tokens.fontWeightSemibold,         // ✅ 600
    backgroundColor: tokens.colorNeutralBackground1,
    color: tokens.colorNeutralForeground1,
    borderTopWidth: tokens.strokeWidthThin,        // ✅ 1px
    borderTopStyle: "solid",
    borderTopColor: tokens.colorNeutralStroke1,
    borderRadius: tokens.borderRadiusMedium,       // ✅ 4px
    transitionDuration: tokens.durationNormal,     // ✅ 200ms
  },
})

// ❌ Bad: ハードコード（使用禁止）
const styles = makeStyles({
  container: {
    padding: '16px',           // ❌ 禁止
    gap: '12px',               // ❌ 禁止
    fontSize: '14px',          // ❌ 禁止
    backgroundColor: '#fff',   // ❌ 禁止
    borderRadius: '4px',       // ❌ 禁止
  },
})
```

#### 主要トークン一覧

| カテゴリ | トークン例 | 用途 |
|---------|-----------|------|
| **スペーシング（垂直）** | `spacingVerticalXXS` ~ `spacingVerticalXXXL` | padding, margin, gap |
| **スペーシング（水平）** | `spacingHorizontalXXS` ~ `spacingHorizontalXXXL` | padding, margin, gap |
| **フォントサイズ** | `fontSizeBase200` ~ `fontSizeBase500` | fontSize |
| **フォントウェイト** | `fontWeightRegular`, `fontWeightMedium`, `fontWeightSemibold`, `fontWeightBold` | fontWeight |
| **行間** | `lineHeightBase200` ~ `lineHeightBase400` | lineHeight |
| **ボーダー幅** | `strokeWidthThin`, `strokeWidthThick`, `strokeWidthThicker` | borderWidth |
| **角丸** | `borderRadiusSmall` ~ `borderRadiusXLarge` | borderRadius |
| **カラー（背景）** | `colorNeutralBackground1` ~ `colorNeutralBackground3` | backgroundColor |
| **カラー（前景）** | `colorNeutralForeground1` ~ `colorNeutralForeground3` | color |
| **カラー（ブランド）** | `colorBrandBackground`, `colorBrandForeground1` | ブランドカラー |
| **カラー（ステータス）** | `colorStatusSuccessBackground1`, `colorStatusDangerForeground1` | 成功・警告・エラー |
| **アニメーション** | `durationFast`, `durationNormal`, `durationSlow` | transitionDuration |
| **イージング** | `curveEasyEase`, `curveAccelerateMax` | transitionTimingFunction |
| **シャドウ** | `shadow2`, `shadow4`, `shadow8`, `shadow16` | boxShadow |

### 4. Griffel CSS-in-JS 制約

**重要な制約事項:**

1. **ショートハンドプロパティ非サポート** - 個別プロパティに展開すること
   ```typescript
   // ❌ Bad: ショートハンド（動作しない）
   border: "1px solid red"
   padding: "10px 20px"
   margin: "10px auto"
   
   // ✅ Good: 個別プロパティ
   borderTopWidth: tokens.strokeWidthThin,
   borderTopStyle: "solid",
   borderTopColor: tokens.colorNeutralStroke1,
   borderBottomWidth: tokens.strokeWidthThin,
   borderBottomStyle: "solid",
   borderBottomColor: tokens.colorNeutralStroke1,
   // ... 他の辺も同様
   
   paddingTop: tokens.spacingVerticalM,
   paddingBottom: tokens.spacingVerticalM,
   paddingLeft: tokens.spacingHorizontalL,
   paddingRight: tokens.spacingHorizontalL,
   ```

2. **レイアウト値は例外として許可**
   - `width: "100%"`, `maxWidth: "1400px"` など、レイアウトに必要な特定値は使用可

### 5. カラーパレット

**セマンティックカラートークンを使用**

```typescript
// Primary（アクション・ブランド）
tokens.colorBrandBackground
tokens.colorBrandForeground1

// Neutral（通常のUI）
tokens.colorNeutralBackground1
tokens.colorNeutralForeground1

// ステータス
tokens.colorStatusSuccessBackground1   // 成功
tokens.colorStatusWarningBackground1   // 警告
tokens.colorStatusDangerBackground1    // エラー
```

### 6. アクセシビリティ

ARIA属性を適切に使用すること

```typescript
<Button aria-label="設定を保存" disabled={!isValid}>
  保存
</Button>

<Input
  aria-label="ユーザー名"
  aria-required={true}
  aria-invalid={!!error}
  aria-describedby={error ? 'error-id' : undefined}
/>
```

---

**バージョン**: 1.0  
**最終更新**: 2025年10月4日
