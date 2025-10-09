# TimeTrackerEX Web - ドキュメントマップ

**最終更新**: 2025年10月9日

このドキュメントは、プロジェクト全体のドキュメント構造とネーミングルールを定義します。

---

## 📁 ドキュメント構造の全体像

```
web/
├── plan/                           # 📋 実行計画・進捗管理
│   ├── README.md                   # planディレクトリの案内
│   ├── TimeTracker_PLAN.md         # メイン計画書
│   ├── PHASE5_PLAN.md              # Phase 5実装計画
│   ├── PHASE5_PROGRESS.md          # Phase 5進捗管理
│   ├── PHASE6_PLAN.md              # Phase 6実装計画
│   ├── PHASE6_PROGRESS.md          # Phase 6進捗管理
│   ├── PHASE7_PLAN.md              # Phase 7実装計画
│   ├── PHASE7_PROGRESS.md          # Phase 7進捗管理
│   └── PHASE7_PARTIAL_COMPLETION_REPORT.md  # Phase 7部分完了レポート
│
├── spec/                           # 📖 仕様書・設計書
│   ├── README.md                   # specディレクトリの案内
│   ├── TimeTracker_SPEC.md         # TimeTracker機能仕様書
│   └── TimeTracker_IMPLEMENTATION_STATUS.md  # 実装ステータス
│
├── prompt/                         # 🤖 AI指示書
│   ├── coding-rules.md             # コーディング規約
│   └── copilot-instructions.md     # Copilot用指示
│
└── src/                            # 💻 ソースコード + README
    ├── README.md                   # srcディレクトリ全体の説明
    │
    ├── components/                 # UIコンポーネント
    │   ├── README.md               # コンポーネント一覧・使い方
    │   ├── validated-input/
    │   │   └── README.md
    │   └── validation-error-dialog/
    │       ├── README.md
    │       └── DESIGN.md
    │
    ├── core/                       # コアライブラリ
    │   ├── README.md               # コアモジュール全体の説明
    │   ├── algorithm/
    │   │   └── README.md
    │   ├── api/
    │   │   └── README.md
    │   ├── history/
    │   │   └── README.md
    │   ├── ics/
    │   │   └── README.md
    │   ├── ignore/
    │   │   └── README.md
    │   └── pdf/
    │       └── README.md
    │
    ├── lib/                        # ユーティリティライブラリ
    │   └── README.md
    │
    ├── pages/                      # ページコンポーネント
    │   ├── README.md               # ページ一覧・ルーティング
    │   ├── setting/
    │   │   └── README.md
    │   └── timetracker/
    │       └── services/
    │           └── README.md
    │
    ├── schema/                     # データスキーマ
    │   └── settings/
    │       ├── README.md
    │       ├── app/
    │       │   └── README.md
    │       ├── appearance/
    │       │   └── README.md
    │       └── timetracker/
    │           └── README.md
    │
    ├── store/                      # 状態管理
    │   └── settings/
    │       ├── README.md
    │       └── VALIDATION_MIGRATION.md
    │
    └── types/                      # TypeScript型定義
        └── README.md
```

---

## 📋 ネーミングルール

### 1️⃣ plan/ ディレクトリ

**用途**: 実行計画、進捗管理、レポート

#### ルール:
- **メイン計画書**: `{機能名}_PLAN.md`
  - 例: `TimeTracker_PLAN.md`
  
- **Phase計画書**: `PHASE{番号}_PLAN.md`
  - 例: `PHASE5_PLAN.md`, `PHASE6_PLAN.md`
  
- **進捗管理**: `PHASE{番号}_PROGRESS.md`
  - 例: `PHASE5_PROGRESS.md`
  
- **完了レポート**: `PHASE{番号}_COMPLETION_REPORT.md` または `PHASE{番号}_PARTIAL_COMPLETION_REPORT.md`
  - 例: `PHASE7_PARTIAL_COMPLETION_REPORT.md`

#### 推奨される追加ドキュメント:
- `ROADMAP.md` - プロジェクト全体のロードマップ
- `CHANGELOG.md` - 変更履歴
- `MILESTONES.md` - マイルストーン管理

---

### 2️⃣ spec/ ディレクトリ

**用途**: 機能仕様、設計書、実装ステータス

#### ルール:
- **機能仕様書**: `{機能名}_SPEC.md`
  - 例: `TimeTracker_SPEC.md`
  
- **実装ステータス**: `{機能名}_IMPLEMENTATION_STATUS.md`
  - 例: `TimeTracker_IMPLEMENTATION_STATUS.md`
  
- **API仕様**: `{機能名}_API_SPEC.md`
  - 例: `TimeTracker_API_SPEC.md` (将来追加)
  
- **データモデル**: `{機能名}_DATA_MODEL.md`
  - 例: `TimeTracker_DATA_MODEL.md` (将来追加)

#### 推奨される追加ドキュメント:
- `ARCHITECTURE.md` - アーキテクチャ設計書
- `DATABASE_SCHEMA.md` - データベーススキーマ（必要に応じて）
- `UI_DESIGN.md` - UI設計書

---

### 3️⃣ src/ 配下のREADME

**用途**: コードの説明、使い方、API リファレンス

#### ルール:
- 各ディレクトリに **必ず1つのREADME.md** を配置
- サブディレクトリにも必要に応じてREADME.md を配置
- 特殊なドキュメント（設計書など）は `{目的}_DESIGN.md` や `{目的}_MIGRATION.md` などの名前を使用

#### READMEの必須セクション:
```markdown
# {ディレクトリ名}

## 概要
このディレクトリの目的と役割

## 構造
ファイル・サブディレクトリの説明

## 使い方
基本的な使用例

## API（該当する場合）
公開API・関数の説明

## 関連ドキュメント
他のREADMEや仕様書へのリンク
```

---

## 🎯 現在のドキュメント状況

### ✅ 整理済み
- **plan/** - 9ファイル（計画・進捗が整理されている）
- **spec/** - 3ファイル（仕様書が整理されている）
- **src/** - 19個のREADME（ほぼ全てのディレクトリにREADMEがある）

### ⚠️ 要検討・改善
1. **prompt/** - コーディング規約とCopilot指示
   - 現在の場所でOK、または `/docs/` に移動を検討
   
2. **src/components/validation-error-dialog/DESIGN.md**
   - 設計書が個別にある（他にも同様のDESIGN.mdがあるか確認）
   
3. **src/store/settings/VALIDATION_MIGRATION.md**
   - マイグレーションガイドが個別にある（今後も増える可能性）

### 📝 追加推奨ドキュメント
1. **web/README.md** - プロジェクト全体の案内（ルートREADME）
2. **plan/ROADMAP.md** - 中長期的な計画
3. **spec/ARCHITECTURE.md** - システムアーキテクチャ
4. **spec/TimeTracker_API_SPEC.md** - API詳細仕様（バックエンド連携用）

---

## 📊 ドキュメント統計

| カテゴリ | ファイル数 | 備考 |
|---------|-----------|------|
| plan/ | 9 | 計画・進捗管理 |
| spec/ | 3 | 仕様書 |
| prompt/ | 2 | AI指示書 |
| src/配下のREADME | 19 | コード説明 |
| **合計** | **33** | |

---

## 🔄 ドキュメント管理フロー

### 新機能開発時
1. **spec/{機能名}_SPEC.md** を作成（仕様を定義）
2. **plan/PHASE{N}_PLAN.md** を作成（実装計画）
3. **plan/PHASE{N}_PROGRESS.md** で進捗管理
4. **src/{該当ディレクトリ}/README.md** を更新（実装説明）
5. **plan/PHASE{N}_COMPLETION_REPORT.md** で完了報告

### ドキュメント更新タイミング
- **spec/** - 仕様変更時に即座に更新
- **plan/** - Phase開始時・完了時に更新
- **src/README** - コード変更と同時に更新

---

## 🎨 ドキュメント品質ガイドライン

### 良いドキュメントの特徴
- ✅ 目的が明確
- ✅ 構造化されている（見出しを活用）
- ✅ 例・図・コードスニペットがある
- ✅ 最終更新日が記載されている
- ✅ 関連ドキュメントへのリンクがある

### 避けるべきこと
- ❌ 古い情報のまま放置
- ❌ 曖昧な説明
- ❌ コードとドキュメントの不一致
- ❌ ドキュメントの重複

---

## 📚 参考: 類似プロジェクトのベストプラクティス

### ディレクトリ構成の参考
- **docs/** - GitHub標準（全ドキュメントを集約）
- **plan/** + **spec/** - 本プロジェクトの採用方式（用途別分離）
- **wiki/** - GitHub Wiki（外部ドキュメント）

### 本プロジェクトの選択理由
- 計画と仕様を明確に分離したい
- プロジェクト規模が中規模（大規模ではない）
- コード内READMEを重視（開発者体験向上）

---

**このドキュメントは定期的に見直し、プロジェクトの成長に合わせて更新してください。**
