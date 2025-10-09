# ドキュメント整理・リネーム提案

**作成日**: 2025年10月9日

このドキュメントは、現在のドキュメント構造の分析と、ネーミングルール統一のための提案をまとめています。

---

## 📋 現在の状況サマリー

### ✅ 整理済み（問題なし）
- **plan/** - 9ファイル（Phase別に整理済み）
- **spec/** - 3ファイル（仕様書が整理済み）
- **src/** - 19個のREADME（ディレクトリごとにREADME配置済み）

### 📊 ドキュメント統計
| カテゴリ | ファイル数 | 状態 |
|---------|-----------|------|
| plan/ | 9 | ✅ 整理済み |
| spec/ | 3 | ✅ 整理済み |
| prompt/ | 2 | ✅ 問題なし |
| src/配下のREADME | 19 | ⚠️ 一部要検討 |
| **合計** | **33** | |

---

## 🎯 ネーミングルール（確定版）

### 1. plan/ ディレクトリ
```
命名パターン:
- メイン計画書: {機能名}_PLAN.md
- Phase計画書: PHASE{番号}_PLAN.md
- 進捗管理: PHASE{番号}_PROGRESS.md
- 完了レポート: PHASE{番号}_COMPLETION_REPORT.md
```

**現在の適合状況**: ✅ すべて準拠

### 2. spec/ ディレクトリ
```
命名パターン:
- 機能仕様書: {機能名}_SPEC.md
- 実装ステータス: {機能名}_IMPLEMENTATION_STATUS.md
- API仕様: {機能名}_API_SPEC.md
- データモデル: {機能名}_DATA_MODEL.md
```

**現在の適合状況**: ✅ すべて準拠

### 3. src/ 配下のREADME
```
命名パターン:
- 基本: README.md （各ディレクトリに1つ）
- 設計書: {目的}_DESIGN.md
- マイグレーション: {目的}_MIGRATION.md
```

---

## ⚠️ 要検討・改善提案

### 1. 特殊ドキュメントの統一

#### 現状:
```
src/components/validation-error-dialog/DESIGN.md
src/store/settings/VALIDATION_MIGRATION.md
```

#### 提案:
**Option A: 現状維持**
- 各モジュールの特殊ドキュメントはそのまま
- メリット: コードに近い場所に配置
- デメリット: 発見しにくい

**Option B: spec/ に集約**
```
spec/
├── design/
│   └── ValidationErrorDialog_DESIGN.md
└── migration/
    └── SettingsValidation_MIGRATION.md
```
- メリット: 設計書が一箇所に集約
- デメリット: コードから離れる

**推奨**: **Option A（現状維持）**  
理由: これらのドキュメントは実装者向けで、コードに近い方が便利

---

### 2. prompt/ ディレクトリの位置

#### 現状:
```
web/prompt/
├── coding-rules.md
└── copilot-instructions.md
```

#### 提案:
**Option A: 現状維持**
- prompt/ として独立
- メリット: AI関連ドキュメントが明確
- デメリット: 特に問題なし

**Option B: docs/ に移動**
```
web/docs/
├── coding-rules.md
└── copilot-instructions.md
```
- メリット: より一般的な構造
- デメリット: docs/ ディレクトリが新設される

**推奨**: **Option A（現状維持）**  
理由: prompt/ という名前で AI 指示書であることが明確

---

### 3. ルートREADMEの作成

#### 現状:
```
web/README.md - ❌ 存在しない
```

#### 提案:
```
web/README.md - ✅ 作成済み（本提案で作成）
```

**内容**:
- プロジェクト概要
- クイックスタート
- ドキュメントへのリンク
- 技術スタック
- 開発状況

**ステータス**: ✅ 完了

---

### 4. ドキュメントマップの作成

#### 提案:
```
web/DOCUMENT_MAP.md - ✅ 作成済み（本提案で作成）
```

**内容**:
- 全ドキュメントのツリー構造
- ネーミングルール定義
- ドキュメント管理フロー
- 品質ガイドライン

**ステータス**: ✅ 完了

---

## 📝 追加推奨ドキュメント

### 優先度: 高

#### 1. plan/ROADMAP.md
```markdown
# TimeTrackerEX ロードマップ

## 短期目標（1-3ヶ月）
- Phase 7完了（E2Eテスト実装）
- バックエンドAPI実装

## 中期目標（3-6ヶ月）
- パフォーマンス最適化
- アクセシビリティ改善

## 長期目標（6-12ヶ月）
- 多言語対応
- モバイル対応
```

#### 2. spec/ARCHITECTURE.md
```markdown
# TimeTrackerEX アーキテクチャ

## システム構成図
[図を追加]

## データフロー
FileUpload → Linking → Completion → API

## 技術スタック詳細
- フロントエンド
- バックエンド
- インフラ
```

#### 3. spec/TimeTracker_API_SPEC.md
```markdown
# TimeTracker API仕様書

## 認証
POST /auth/token

## プロジェクト取得
GET /workitem/workItems/{projectId}

## タスク登録
POST /system/users/{userId}/timeEntries
```

---

### 優先度: 中

#### 4. CHANGELOG.md
```markdown
# 変更履歴

## [Unreleased]
### Added
- Phase 7 Task 5: タスク登録API統合

## [0.0.1] - 2025-10-09
### Added
- Phase 1-6完了
- 134テスト実装
```

#### 5. CONTRIBUTING.md
```markdown
# コントリビューションガイド

## ブランチ戦略
## コミットメッセージ規約
## プルリクエストプロセス
## コーディング規約
```

---

## 🔄 実施済みアクション

### ✅ 完了
1. **ドキュメント移動**
   - `src/pages/timetracker/` 配下の計画書 → `plan/`
   - `src/pages/timetracker/` 配下の仕様書 → `spec/`

2. **README作成**
   - `plan/README.md` - planディレクトリの案内
   - `spec/README.md` - specディレクトリの案内

3. **ルートドキュメント作成**
   - `web/README.md` - プロジェクト全体の案内
   - `web/DOCUMENT_MAP.md` - ドキュメント構造マップ

### 📋 推奨アクション（未実施）
1. **追加ドキュメント作成**（優先度: 高）
   - [ ] `plan/ROADMAP.md`
   - [ ] `spec/ARCHITECTURE.md`
   - [ ] `spec/TimeTracker_API_SPEC.md`

2. **追加ドキュメント作成**（優先度: 中）
   - [ ] `CHANGELOG.md`
   - [ ] `CONTRIBUTING.md`

3. **既存ドキュメントのレビュー**
   - [ ] 各READMEの内容更新（古い情報の修正）
   - [ ] リンク切れチェック
   - [ ] 最終更新日の追記

---

## 📊 最終的なドキュメント構造（理想形）

```
web/
├── README.md                       ⭐ 新規作成済み
├── DOCUMENT_MAP.md                 ⭐ 新規作成済み
├── CHANGELOG.md                    📝 推奨（未作成）
├── CONTRIBUTING.md                 📝 推奨（未作成）
│
├── plan/                           ✅ 整理済み
│   ├── README.md
│   ├── ROADMAP.md                  📝 推奨（未作成）
│   ├── TimeTracker_PLAN.md
│   └── PHASE*.md (×7)
│
├── spec/                           ✅ 整理済み
│   ├── README.md
│   ├── ARCHITECTURE.md             📝 推奨（未作成）
│   ├── TimeTracker_SPEC.md
│   ├── TimeTracker_API_SPEC.md     📝 推奨（未作成）
│   └── TimeTracker_IMPLEMENTATION_STATUS.md
│
├── prompt/                         ✅ 問題なし
│   ├── coding-rules.md
│   └── copilot-instructions.md
│
└── src/                            ✅ 整理済み
    ├── README.md
    └── (各ディレクトリにREADME.md)
```

---

## ✅ 結論・次のステップ

### 完了事項
1. ✅ ドキュメント移動・整理完了
2. ✅ ネーミングルール確定
3. ✅ README作成（plan/, spec/, web/）
4. ✅ ドキュメントマップ作成

### 推奨される次のアクション
1. **高優先度**: `spec/TimeTracker_API_SPEC.md` 作成（バックエンド連携用）
2. **高優先度**: `plan/ROADMAP.md` 作成（今後の計画明確化）
3. **中優先度**: 既存README内容のレビュー・更新

### 判断が必要な事項
- なし（全て整理完了、または現状維持推奨）

---

**このドキュメントは整理作業の記録です。完了後は削除またはアーカイブ推奨。**
