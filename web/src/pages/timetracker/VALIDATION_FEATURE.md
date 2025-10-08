# TimeTrackerPage バリデーション機能

## 概要

`TimeTrackerPage`にTimeTracker設定のバリデーションチェック機能を追加しました。設定に不正な項目がある場合、自動的にFileUploadViewに戻り、エラー内容を表示するダイアログが表示されます。

## 機能

### 1. 自動バリデーションチェック

`useEffect`を使用して、以下の条件でバリデーションを実行:

- `validationErrors.timeTracker`にエラーがある
- 現在のビューが`upload`以外(linking または completion)

### 2. エラー時の動作フロー

```
1. バリデーションエラー検出
   ↓
2. FileUploadViewに自動的に戻る
   - completion → upload (2ステップ戻る)
   - linking → upload (1ステップ戻る)
   ↓
3. エラーダイアログを表示
   - エラー内容を箇条書きで表示
   - 設定ページへの遷移を案内
   ↓
4. OKボタンを押すと設定ページ(TimeTracker)に遷移
```

## 実装コード

```tsx
// TimeTracker設定のバリデーションチェック
useEffect(() => {
    const hasTimeTrackerErrors = validationErrors.timeTracker.length > 0;
    if (hasTimeTrackerErrors && currentView !== "upload") {
        // エラーメッセージを作成
        const errorMessages = validationErrors.timeTracker
            .map((err) => `・${err.label}: ${err.message}`)
            .join("\n");

        // FileUploadViewに戻る
        if (currentView === "completion") {
            backTo(2);
        } else if (currentView === "linking") {
            backTo(1);
        }

        // ダイアログを表示
        appMessageDialogRef
            ?.showMessageAsync(
                "TimeTracker設定エラー",
                `TimeTracker設定に不正な項目があります。\n設定を修正してから再度お試しください。\n\n【エラー内容】\n${errorMessages}\n\nOKを押すと設定ページに移動します。`,
                "ERROR",
            )
            .then(() => {
                // ダイアログを閉じたら設定ページに遷移
                navigate("設定", "timetracker");
            });
    }
}, [validationErrors.timeTracker, currentView, navigate, backTo]);
```

## ダイアログの内容

### タイトル
```
TimeTracker設定エラー
```

### メッセージ例
```
TimeTracker設定に不正な項目があります。
設定を修正してから再度お試しください。

【エラー内容】
・API URL: URLの形式が正しくありません
・ユーザー名: 必須項目です

OKを押すと設定ページに移動します。
```

### レベル
```
ERROR (赤い警告アイコン)
```

## 依存関係

### Hooks
- `useSettings()` - `validationErrors.timeTracker`を取得
- `useNavigation()` - 設定ページへの遷移

### Components
- `appMessageDialogRef` - エラーダイアログの表示

### Types
- `ValidationErrorInfo` - バリデーションエラーの型

## ユースケース

### ケース1: API URL未設定でLinkingViewに進んだ場合

1. ユーザーがFileUploadViewからLinkingViewに進む
2. バリデーションエラーを検出
3. 自動的にFileUploadViewに戻る
4. ダイアログ表示: "API URL: 必須項目です"
5. OKを押すと設定ページ(TimeTracker)に遷移
6. ユーザーがAPI URLを設定
7. TimeTrackerPageに戻って再度操作

### ケース2: 複数のエラーがある場合

```
【エラー内容】
・API URL: URLの形式が正しくありません
・ユーザー名: 必須項目です
・パスワード: 8文字以上である必要があります
```

すべてのエラーが箇条書きで表示されます。

## メリット

1. **早期エラー検出**: 処理を進める前にエラーを検出
2. **ユーザー体験の向上**: 具体的なエラー内容を表示
3. **設定への誘導**: ワンクリックで設定ページに移動
4. **データ損失防止**: 処理が失敗する前にチェック

## 注意事項

- バリデーションは`upload`ビューでは実行されません(初回表示時のエラー防止)
- ダイアログのOKボタンを押すと、必ず設定ページに遷移します
- 設定ページのパラメータに`"timetracker"`を指定することで、TimeTracker設定タブが開きます

## 将来の拡張案

- [ ] ダイアログに「今回はスキップ」ボタンを追加(設定ページに遷移しない)
- [ ] エラー項目にリンクを付けて、該当項目に直接ジャンプ
- [ ] バリデーションエラーをトースト通知でも表示
- [ ] エラーログの保存と履歴表示
