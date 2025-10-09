# ValidatedInput - 遅延バリデーション入力コンポーネント

値確定時にのみバリデーションを実行する入力コンポーネント。

## 特徴

- 遅延バリデーション: 確定時のみ `onCommit` 呼び出し
- 確認キャンセルボタン: 値変更時に表示
- エラーポップオーバー: バリデーションエラー表示
- キーボードショートカット: Enter (確定), Escape (キャンセル)
- Fluent UI v9統合

## Props

- `value`: 現在値
- `onCommit`: 確定時コールバック
- `type?`: input type (例: "url")
- `placeholder?`: プレースホルダー
- その他 Fluent UI Input props

## 使用例

```typescript
<ValidatedInput
  value={url}
  onCommit={(newValue) => setUrl(newValue)}
  type="url"
  placeholder="https://example.com"
/>
```
