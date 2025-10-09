# ValidationErrorDialog - バリデーションエラーダイアログ

設定バリデーションエラーを表示する専用ダイアログ。

## 特徴

- パス別エラー表示 (settings.appearance.theme 形式)
- 複数エラー対応
- Fluent UI Dialog使用

## Props

- `open`: 開閉状態
- `errors`: バリデーションエラー配列 `{ path, message }[]`
- `onClose`: 閉じるコールバック

## 使用例

```typescript
<ValidationErrorDialog
  open={isOpen}
  errors={[
    { path: 'settings.baseUrl', message: 'Invalid URL' }
  ]}
  onClose={() => setIsOpen(false)}
/>
```

詳細設計: [DESIGN.md](./DESIGN.md)
