# Store

アプリケーション全体で共有される状態管理を提供するReact Context Providerを格納。

## 構造

- **content/**: コンテンツ表示の状態管理（ページ遷移やビュー管理）
- **navigation/**: ナビゲーションの状態管理（サイドバー、ヘッダー）
- **settings/**: アプリケーション設定の状態管理（永続化対応）

## 主要機能

### ContentProvider
- 現在表示中のページとビューを管理
- ビュー履歴の保持
- ビュー間の遷移制御

### NavigationProvider
- サイドバーの開閉状態
- ヘッダーの表示制御
- ナビゲーションメニューの状態

### SettingsProvider
- ユーザー設定の読み込み/保存
- localStorageへの永続化
- 設定の検証とデフォルト値の提供
- TimeTracker連携設定（baseUrl, userName, projectId等）

## 使用方法

```tsx
import { useSettings, useNavigation, useContent } from '@/store';

// 各Providerはsrc/main.tsxでApp全体をラップ
```

## テスト

各Providerにはユニットテストが存在し、状態管理ロジックを検証しています。
