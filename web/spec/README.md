# TimeTrackerEX Web - 仕様書

このディレクトリには、TimeTrackerEX Webアプリケーションの仕様書・設計ドキュメントが格納されています。

---

## 📁 ドキュメント一覧

### 機能仕様書
- **[TimeTracker_SPEC.md](./TimeTracker_SPEC.md)** - TimeTracker機能の詳細仕様
  - 画面仕様
  - データモデル
  - API仕様
  - ユーザーフロー

### API仕様書
- **[TimeTracker_API_SPEC.md](./TimeTracker_API_SPEC.md)** - バックエンドAPI仕様の完全ドキュメント
  - 全APIエンドポイント (認証、プロジェクト管理、作業項目管理、タスク登録)
  - リクエスト/レスポンス形式の詳細
  - エラーハンドリング仕様
  - `/api/register-task` 完全仕様 (Phase 7実装)
  - TypeScript/Python実装例

### 実装ステータス
- **[TimeTracker_IMPLEMENTATION_STATUS.md](./TimeTracker_IMPLEMENTATION_STATUS.md)** - 各機能の実装状況
  - サービス層の実装状況
  - テスト実装状況
  - 既知の問題

---

## 🔗 関連ドキュメント

### 計画・進捗
計画書・進捗管理ドキュメントは `/plan/` ディレクトリを参照してください:
- [TimeTracker_PLAN.md](../plan/TimeTracker_PLAN.md) - 全体計画書
- [Phase別計画書](../plan/) - 各Phaseの詳細計画

### コード内ドキュメント
実装の詳細は、ソースコード内のREADMEとコメントを参照してください:
- `/src/pages/timetracker/` - TimeTrackerページの実装
- `/src/core/` - コアライブラリの実装

### 外部リソース
- **[TimeTracker公式 Web API リファレンス](https://www.timetracker.jp/support/help/web-api/webAPIList.html)** - TimeTracker公式のAPI仕様書

---

## 📝 ドキュメント更新ガイドライン

### 仕様書の更新
- 機能追加・変更時は `TimeTracker_SPEC.md` を更新してください
- API追加・変更時は `TimeTracker_API_SPEC.md` を更新してください
- バックエンド実装時もAPI仕様書に実装状況を反映してください
- スクリーンショットがある場合は `/spec/images/` に格納してください

### 実装ステータスの更新
- 新機能実装時は `TimeTracker_IMPLEMENTATION_STATUS.md` を更新してください
- テスト完了時はテストステータスを更新してください
- 既知の問題が解決した場合は記載を削除してください

---

## 🎯 現在の実装状況

### 完了済み機能
- ✅ FileUploadView（PDF/ICSアップロード）
- ✅ LinkingProcessView（自動/手動紐付け）
- ✅ CompletionView（スケジュール確認・登録）
- ✅ データ変換サービス
- ✅ タスク登録API統合

### 実装中/未完了
- ⏳ E2Eテスト（Vitest/Playwright）
- ⏳ 統合テスト完全実装
- ⏳ バックエンドAPI実装

---

**最終更新**: 2025年10月9日
