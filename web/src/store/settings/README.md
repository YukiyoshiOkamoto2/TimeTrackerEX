# store/settings/ - 設定状態管理

SettingsProvider: アプリ設定のグローバル状態管理。

## 機能

- React Context API使用
- localStorage自動同期
- バリデーション統合
- リアルタイム更新

## API

- `settings`: 現在の設定
- `updateSettings(partial)`: 設定更新 (部分更新対応)
- `resetSettings()`: デフォルトに戻す

## 使用例

```typescript
const { settings, updateSettings } = useSettings()
updateSettings({ appearance: { theme: 'dark' } })
```

関連: [VALIDATION_MIGRATION.md](./VALIDATION_MIGRATION.md)
