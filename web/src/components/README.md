# Components

共通コンポーネント集

## 📦 コンポーネント一覧

### DataTable
統合テーブルコンポーネント。基本的なテーブル表示に加え、選択機能も統合。

**機能:**
- ソート対応
- 列リサイズ対応
- 行選択機能（selectable mode）
- カスタマイズ可能な列定義

**使用例:**
```typescript
// 基本的な使用
<DataTable
    items={data}
    columns={columns}
    getRowId={(item) => item.id}
    sortable
    resizableColumns
/>

// 選択機能付き
<DataTable
    items={data}
    columns={columns}
    getRowId={(item) => item.id}
    selectable
    selectedKeys={selectedKeys}
    onSelectionChange={setSelectedKeys}
/>
```

### StatCard
統計情報表示用のカードコンポーネント。

**機能:**
- アイコン付き統計表示
- ラベル、値、単位の表示
- ホバーエフェクト

**使用例:**
```typescript
<StatCard 
    icon={<History24Regular />} 
    label="総件数" 
    value={100} 
    unit="件" 
/>
```

### PageHeader
ページヘッダーとパンくずナビゲーション。

**機能:**
- パンくずリスト表示
- ページ間のナビゲーション
- 現在位置の表示

**使用例:**
```typescript
<PageHeader
    breadcrumbs={["ホーム", "設定", "プロファイル"]}
    onBreadcrumbClick={(index) => handleNavigate(index)}
/>
```

### Card
汎用カードコンポーネント。

### InteractiveCard
ユーザー操作を伴うカードコンポーネント。

### その他
- Editor: コードエディター
- MessageDialog: メッセージダイアログ
- Page: ページコンテナ
- ValidatedInput: バリデーション付き入力

---

## 🔄 最近のリファクタリング

詳細は [REFACTORING.md](./REFACTORING.md) を参照。
