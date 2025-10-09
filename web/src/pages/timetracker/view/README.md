# view/ - TimeTracker View層

TimeTrackerページのビューコンポーネント。

## 構造

```
view/
├── components/          # View層共通コンポーネント
│   ├── ViewLayout.tsx   # レイアウトコンポーネント
│   ├── StatsDisplay.tsx # 統計表示コンポーネント
│   ├── InfoDisplay.tsx  # 情報表示コンポーネント
│   └── index.ts
├── styles/              # 共通スタイル
│   └── commonStyles.ts  # View層共通スタイル定義
├── FileUploadView.tsx   # ファイルアップロード画面
├── LinkingProcessView.tsx # 紐づけ処理画面
└── CompletionView.tsx   # 登録確認画面

```

## View層共通コンポーネント

### ViewLayout.tsx

レイアウト用の共通コンポーネント。

#### コンポーネント

- **ViewContainer**: メインコンテナ
- **ViewHeader**: ヘッダーコンテナ（左右2カラム）
- **ViewSection**: セクションコンテナ
- **SectionTitle**: セクションタイトル（アイコン + テキスト）
- **ActionButtonContainer**: アクションボタンコンテナ

#### 使用例

```tsx
import { ViewHeader, ViewSection, SectionTitle, ActionButtonContainer } from "./components";

<ViewHeader
  left={<PageHeader breadcrumbs={["TimeTracker", "紐づけ処理"]} />}
  right={<Button>履歴</Button>}
/>

<ViewSection>
  <SectionTitle icon={<DocumentIcon />}>スケジュール一覧</SectionTitle>
  {/* コンテンツ */}
</ViewSection>

<ActionButtonContainer align="right">
  <Button>キャンセル</Button>
  <Button appearance="primary">保存</Button>
</ActionButtonContainer>
```

### StatsDisplay.tsx

統計データ表示用の共通コンポーネント。

#### コンポーネント

- **StatsGrid**: 統計グリッドコンテナ（2カラム）
- **StatItem**: 統計項目

#### 使用例

```tsx
import { StatsGrid, StatItem } from "./components";

<StatsGrid>
  <StatItem
    label="✅ 紐づけ済み"
    value="15件"
    variant="success"
    subText="休暇: 2件 / 履歴: 13件"
  />
  <StatItem
    label="❌ 未紐づけ"
    value="3件"
    variant="warning"
    subText="手動で紐づけしてください"
  />
</StatsGrid>
```

#### StatItem variants

- `default`: デフォルト色
- `success`: 緑色（成功）
- `warning`: 黄色（警告）
- `error`: 赤色（エラー）

### InfoDisplay.tsx

情報表示用の共通コンポーネント。

#### コンポーネント

- **InfoItem**: 情報項目（アイコン + ラベル + 値）

#### 使用例

```tsx
import { InfoItem } from "./components";

<InfoItem
  icon={<DocumentIcon />}
  label="ファイル名"
  value="勤務実績入力.pdf"
/>

<InfoItem
  icon="📅"
  label="スケジュール情報"
  value={uploadInfo?.ics?.name || "未選択"}
/>
```

## 共通スタイル

### commonStyles.ts

View層で共通利用するスタイル定義。`makeStyles`を使用。

#### スタイルクラス

##### レイアウト
- `headerContainer`: ヘッダーコンテナ
- `headerLeft` / `headerRight`: ヘッダー内の左右配置
- `section`: セクションコンテナ
- `sectionTitle` / `sectionIcon`: セクションタイトル

##### ボタン
- `primaryButton`: プライマリボタン（大きめ）
- `secondaryButton`: セカンダリボタン

##### グリッド
- `gridContainer`: 自動フィットグリッド
- `statsGrid`: 統計用2カラムグリッド

##### 統計表示
- `statItem`: 統計項目コンテナ
- `statLabel`: 統計ラベル
- `statValue`: 統計値
- `statValueSuccess` / `statValueWarning` / `statValueError`: 統計値の色バリエーション
- `statSubText`: 統計サブテキスト

##### 情報表示
- `infoItem`: 情報項目
- `infoIcon` / `infoLabel`: アイコンとラベル

##### その他
- `cardContent`: カードコンテンツ
- `tableContainer`: テーブルコンテナ
- `actionButtonContainer`: アクションボタンコンテナ

#### 使用例

```tsx
import { useCommonViewStyles } from "./styles/commonStyles";

function MyView() {
  const styles = useCommonViewStyles();

  return (
    <div className={styles.section}>
      <div className={styles.gridContainer}>
        {/* グリッドアイテム */}
      </div>
    </div>
  );
}
```

## View層のリファクタリング指針

### 1. レイアウトは共通コンポーネントを使用

❌ **Before:**
```tsx
<div className={styles.headerContainer}>
  <div className={styles.headerLeft}>
    <PageHeader />
  </div>
  <Button>操作</Button>
</div>
```

✅ **After:**
```tsx
<ViewHeader
  left={<PageHeader />}
  right={<Button>操作</Button>}
/>
```

### 2. 統計表示は共通コンポーネントを使用

❌ **Before:**
```tsx
<div className={styles.statsGrid}>
  <div className={styles.statItem}>
    <span className={styles.statLabel}>ラベル</span>
    <span className={styles.statValue}>10件</span>
  </div>
</div>
```

✅ **After:**
```tsx
<StatsGrid>
  <StatItem label="ラベル" value="10件" />
</StatsGrid>
```

### 3. スタイルは共通スタイルを優先

❌ **Before:**
```tsx
const useStyles = makeStyles({
  section: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalL,
  },
});
```

✅ **After:**
```tsx
import { useCommonViewStyles } from "./styles/commonStyles";

const commonStyles = useCommonViewStyles();
// 必要に応じて拡張
const customStyles = makeStyles({ /* カスタムスタイルのみ */ });
```

### 4. ビジネスロジックはカスタムフックやサービスに分離

❌ **Before:**
```tsx
function MyView() {
  const [data, setData] = useState([]);
  
  useEffect(() => {
    // 複雑なビジネスロジック
    const result = calculateSomething();
    setData(result);
  }, []);
  
  return <div>{/* UI */}</div>;
}
```

✅ **After:**
```tsx
// hooks/useMyData.ts
export function useMyData() {
  const [data, setData] = useState([]);
  
  useEffect(() => {
    const result = calculateSomething();
    setData(result);
  }, []);
  
  return data;
}

// MyView.tsx
function MyView() {
  const data = useMyData();
  return <div>{/* UI */}</div>;
}
```

## メリット

- ✅ **コードの重複削減**: 共通レイアウトとスタイルを再利用
- ✅ **保守性向上**: 変更が必要な箇所を一箇所に集約
- ✅ **可読性向上**: UIコンポーネントが簡潔になる
- ✅ **テスタビリティ**: ビジネスロジックを分離することでテストが容易
- ✅ **一貫性**: デザインとレイアウトが統一される
