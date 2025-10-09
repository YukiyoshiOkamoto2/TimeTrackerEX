# StatCard Component

統計情報を表示するための共通カードコンポーネント。

## 概要

`StatCard`は、統計データを視覚的に魅力的な形で表示するためのカードコンポーネントです。アイコン、ラベル、値を組み合わせて、ユーザーに重要な情報を効果的に伝えます。

## 特徴

- 📊 統計データの視覚的な表示
- 🎨 ホバーエフェクト（浮き上がり + シャドウ）
- 🎯 アイコンとラベルの明確な配置
- 💪 大きく見やすい数値表示
- 🎭 Fluent UI デザインシステムとの統合
- ♻️ 再利用可能な設計

## 使用方法

```tsx
import { StatCard } from "@/components/stat-card";
import { Calendar24Regular } from "@fluentui/react-icons";

function MyComponent() {
    return (
        <StatCard
            icon={<Calendar24Regular />}
            label="有給日数"
            value={12}
            unit="日"
        />
    );
}
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `icon` | `ReactNode` | Yes | 表示するアイコン要素 |
| `label` | `string` | Yes | カードのラベルテキスト |
| `value` | `string \| number` | Yes | 表示する統計値 |
| `unit` | `string` | No | 値の単位（例: "件"、"日"） |
| `className` | `string` | No | 追加のカスタムクラス名 |

## 使用例

### 基本的な使用

```tsx
<StatCard
    icon={<History24Regular />}
    label="総件数"
    value={150}
    unit="件"
/>
```

### グリッドレイアウトで複数表示

```tsx
<div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
    <StatCard
        icon={<History24Regular />}
        label="総件数"
        value={historyData.length}
        unit="件"
    />
    <StatCard
        icon={<CheckmarkCircle24Regular />}
        label="選択中"
        value={selectedKeys.size}
        unit="件"
    />
    <StatCard
        icon={<Calendar24Regular />}
        label="最終更新"
        value="最新"
    />
</div>
```

### 条件付き表示

```tsx
<div className={styles.dialogStats}>
    <StatCard
        icon={<CheckmarkCircle24Regular />}
        label="合計"
        value={stats.totalLinked}
        unit="件"
    />
    {stats.manualCount > 0 && (
        <StatCard
            icon={<Info24Regular />}
            label="手動"
            value={stats.manualCount}
            unit="件"
        />
    )}
</div>
```

## スタイリング

コンポーネントには以下のビルトインスタイルが含まれています：

- **ホバー効果**: マウスオーバー時に上に浮き上がり、シャドウが表示される
- **レスポンシブ**: `auto-fit`グリッドで自動的に調整
- **アニメーション**: 0.2秒のスムーズなトランジション
- **カラー**: Fluent UIのブランドカラーを使用

## デザインガイドライン

### 推奨されるアイコンサイズ
- 20px（デフォルト）

### 推奨されるラベル
- 短く簡潔に（2-4単語）
- 大文字（UPPERCASE）で表示
- 0.5pxのレタースペーシング

### 推奨される値
- 数値は大きく（28px、太字）
- 必要に応じて単位を追加

## アクセシビリティ

- セマンティックなHTML構造
- 適切なカラーコントラスト
- ホバー状態の明確な視覚的フィードバック

## 使用されている場所

- `HistoryDrawer.tsx` - 履歴統計の表示
- `DetailDialog.tsx` - 詳細ダイアログの統計情報

## 関連コンポーネント

- `Card` - 基本的なカードコンポーネント
- `InteractiveCard` - インタラクティブなカードコンポーネント
