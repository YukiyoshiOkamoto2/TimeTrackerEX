# ValidationErrorDialog Component

## 概要

TimeTracker設定のバリデーションエラーを表示するリッチなダイアログコンポーネントです。

## デザイン特徴

### 1. **視覚的に優れたレイアウト**
- エラーアイコンとタイトルを目立たせる
- エラーリストを見やすくスクロール可能なコンテナで表示
- 設定ページへの誘導を明確に示す

### 2. **カラースキーム**
- エラーアイコン: 赤色 (`colorPaletteRedForeground1`)
- エラーラベル: 赤色で強調
- 背景: ニュートラルな背景色で見やすさを確保
- 設定アイコン: ブランドカラー

### 3. **インタラクティブ要素**
- 「閉じる」ボタン: セカンダリスタイル
- 「設定ページを開く」ボタン: プライマリスタイル
- 両方にアイコン付き

## コンポーネント構造

```tsx
<ValidationErrorDialog
    open={showErrorDialog}
    errors={validationErrors.timeTracker}
    onClose={handleCloseErrorDialog}
    onOpenSettings={handleOpenSettings}
/>
```

## Props

| プロパティ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `open` | `boolean` | ✅ | ダイアログの表示状態 |
| `errors` | `SettingError[]` | ✅ | 表示するエラーリスト |
| `onClose` | `() => void` | ✅ | 閉じるボタンのコールバック |
| `onOpenSettings` | `() => void` | ✅ | 設定ページを開くボタンのコールバック |

## SettingError型

```tsx
interface SettingError {
    id: string;      // エラーID
    label: string;   // 項目名
    message: string; // エラーメッセージ
}
```

## ダイアログの内容

### タイトルセクション
- エラーアイコン (赤色)
- "TimeTracker設定エラー"

### コンテンツセクション

1. **説明文**
   ```
   TimeTracker設定に不正な項目があります。
   設定を修正してから再度お試しください。
   ```

2. **エラーリスト** (スクロール可能)
   ```
   エラー内容
   • API URL: URLの形式が正しくありません
   • ユーザー名: 必須項目です
   • パスワード: 8文字以上である必要があります
   ```

3. **アクションヒント** (背景色付き)
   ```
   [設定アイコン] 設定ページでこれらの項目を修正できます
   ```

### アクションセクション
- 「閉じる」ボタン (セカンダリ)
- 「設定ページを開く」ボタン (プライマリ)

## 使用例

### TimeTrackerPageでの実装

```tsx
import { ValidationErrorDialog } from "./components";
import { useNavigation, useSettings } from "@/store";

export function TimeTrackerPage() {
    const { validationErrors } = useSettings();
    const { navigate } = useNavigation();
    const [showErrorDialog, setShowErrorDialog] = useState(false);

    // バリデーションチェック
    useEffect(() => {
        const hasErrors = validationErrors.timeTracker.length > 0;
        if (hasErrors && currentView !== "upload") {
            // ビューを戻す処理
            // ...
            
            // エラーダイアログを表示
            setShowErrorDialog(true);
        }
    }, [validationErrors.timeTracker, currentView]);

    const handleCloseErrorDialog = () => {
        setShowErrorDialog(false);
    };

    const handleOpenSettings = () => {
        navigate("Settings", "timetracker");
    };

    return (
        <>
            <Page>
                {/* メインコンテンツ */}
            </Page>

            <ValidationErrorDialog
                open={showErrorDialog}
                errors={validationErrors.timeTracker}
                onClose={handleCloseErrorDialog}
                onOpenSettings={handleOpenSettings}
            />
        </>
    );
}
```

## スタイル詳細

### エラーリストコンテナ
- 背景色: `colorNeutralBackground3`
- 角丸: `borderRadiusMedium`
- 最大高さ: `300px` (スクロール可能)
- パディング: `spacingVerticalM`

### エラーアイテム
- マージン: `spacingVerticalS`
- 行の高さ: `1.6`
- ラベル: 太字 + 赤色
- メッセージ: ニュートラルカラー

### アクションヒント
- 背景色: `colorNeutralBackground4`
- フレックスレイアウト
- アイコン + テキスト

## アクセシビリティ

- ダイアログのタイトルとコンテンツが適切に設定
- キーボードナビゲーション対応
- Escキーでダイアログを閉じることが可能
- フォーカス管理が自動的に行われる

## appMessageDialogRefとの比較

### 従来 (appMessageDialogRef)
```tsx
appMessageDialogRef.showMessageAsync(
    "TimeTracker設定エラー",
    `エラー内容:\n・${error1}\n・${error2}\n\nOKを押すと設定ページに移動します。`,
    "ERROR"
)
```

**問題点:**
- プレーンテキストのみ
- デザインのカスタマイズ不可
- ボタンのカスタマイズ不可
- 複数エラーの表示が見にくい

### 新しい方法 (ValidationErrorDialog)
```tsx
<ValidationErrorDialog
    open={showErrorDialog}
    errors={validationErrors.timeTracker}
    onClose={handleCloseErrorDialog}
    onOpenSettings={handleOpenSettings}
/>
```

**メリット:**
- リッチなデザイン
- エラーリストを構造化して表示
- スクロール可能
- 2つのアクションボタン
- 設定アイコンで視覚的に誘導
- カスタマイズ可能

## 今後の拡張案

- [ ] エラー項目をクリックして該当設定にジャンプ
- [ ] アニメーション効果の追加
- [ ] ダークモード対応の強化
- [ ] エラーの重要度に応じた色分け
- [ ] エラー履歴の表示機能
