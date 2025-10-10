# PageHeader Component

ページヘッダーとパンくずナビゲーションを提供するコンポーネント。

## 概要

`PageHeader`は、アプリケーション内でのページ間のナビゲーションを提供するコンポーネントです。パンくずリストを表示し、ユーザーが現在の位置を把握し、前のページに戻ることができます。

## 使用例

### 基本的な使用

```tsx
import { PageHeader } from "@/components/page-header";

function MyPage() {
    return (
        <div>
            <PageHeader
                breadcrumbs={["ホーム", "設定", "プロファイル"]}
                onBreadcrumbClick={(index) => {
                    console.log(`Breadcrumb clicked: ${index}`);
                }}
            />
            {/* ページコンテンツ */}
        </div>
    );
}
```

### 戻るボタン付き

```tsx
import { PageHeader } from "@/components/page-header";
import { useNavigation } from "@/store";

function DetailPage() {
    const { goBack } = useNavigation();

    return (
        <div>
            <PageHeader
                breadcrumbs={["一覧", "詳細"]}
                onBack={goBack}
            />
            {/* ページコンテンツ */}
        </div>
    );
}
```

### カスタムクリックハンドラ

```tsx
import { PageHeader } from "@/components/page-header";

function MultiStepPage() {
    const [currentStep, setCurrentStep] = useState(2);

    const handleBreadcrumbClick = (index: number) => {
        setCurrentStep(index);
    };

    return (
        <div>
            <PageHeader
                breadcrumbs={["ステップ1", "ステップ2", "ステップ3"]}
                onBreadcrumbClick={handleBreadcrumbClick}
            />
            {/* ステップコンテンツ */}
        </div>
    );
}
```

## Props

| プロパティ | 型 | 必須 | 説明 |
|-----------|------|------|------|
| `breadcrumbs` | `string[]` | いいえ | パンくずリストの項目。空の場合は何も表示されない |
| `onBack` | `() => void` | いいえ | 戻るボタンのコールバック。最初の項目クリック時に実行 |
| `onBreadcrumbClick` | `(index: number) => void` | いいえ | パンくず項目クリック時のコールバック。indexは0始まり |

## 機能

### パンくずナビゲーション
- Fluent UI の`Breadcrumb`コンポーネントを使用
- 最後の項目は現在のページとして表示され、クリック不可
- 項目間に区切り線を自動表示

### クリックハンドリング
- `onBreadcrumbClick`が提供されている場合、すべての項目（現在ページを除く）で実行
- `onBreadcrumbClick`がない場合、最初の項目クリック時に`onBack`を実行
- 現在のページ（最後の項目）はクリックしても何も起こらない

## スタイリング

- `marginBottom: "16px"`でコンテンツとの間隔を確保
- Fluent UIのテーマシステムに従った外観
- `size="large"`で大きめのパンくず表示

## 注意事項

- `breadcrumbs`が空配列または未定義の場合、何も表示されません
- 最後の項目は自動的に`current`状態になります
- インデックスは0から始まります
