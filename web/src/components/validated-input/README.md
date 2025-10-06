# ValidatedInput Component

確認・キャンセルボタン付きの入力コンポーネントです。

## 概要

`ValidatedInput`は、値の確定時にのみバリデーションが実行される入力コンポーネントです。URL入力など、入力途中でバリデーションエラーが発生するのを防ぎます。

## 特徴

- **遅延バリデーション**: 値の確定時にのみ`onCommit`が呼ばれるため、入力中のバリデーションエラーを防止
- **確認・キャンセルボタン**: 値が変更されると入力フィールドの下部右側に表示され、ユーザーが明示的に確定またはキャンセル可能
- **エラーポップオーバー**: バリデーションエラーが発生すると、確認ボタンの近くにPopoverでエラーメッセージを表示
- **キーボードショートカット**:
    - `Enter`: 値を確定
    - `Escape`: 変更をキャンセル
- **Fluent UI統合**: Fluent UI v9の`Input`コンポーネントをベースに構築

## 使用方法

### 基本的な使用例

```tsx
import { ValidatedInput } from "@/components/validated-input";

function MyComponent() {
    const [url, setUrl] = useState("https://example.com");

    return (
        <ValidatedInput
            value={url}
            onCommit={(newValue) => setUrl(newValue)}
            type="url"
            placeholder="https://example.com"
        />
    );
}
```

### URL入力フィールドとして使用

```tsx
<ValidatedInput
    value={settings.baseUrl}
    onCommit={(newUrl) => {
        updateSettings({ baseUrl: newUrl });
    }}
    type="url"
    placeholder="https://timetracker.example.com"
    style={{ minWidth: "400px" }}
/>
```

### 数値入力として使用

```tsx
<ValidatedInput
    value={String(projectId)}
    onCommit={(value) => {
        const numValue = parseInt(value, 10);
        if (!isNaN(numValue)) {
            updateProjectId(numValue);
        }
    }}
    type="number"
    placeholder="123"
/>
```

## Props

### ValidatedInputProps

| プロパティ  | 型                        | 必須 | 説明                                                                                    |
| ----------- | ------------------------- | ---- | --------------------------------------------------------------------------------------- |
| `value`     | `string`                  | ✅   | 現在の値                                                                                |
| `onCommit`  | `(value: string) => void` | ✅   | 値が確定されたときのコールバック（エラー時は例外をスローしてPopoverでメッセージを表示） |
| `className` | `string`                  | -    | カスタムクラス名                                                                        |
| その他      | `InputProps`              | -    | Fluent UIの`Input`コンポーネントのすべてのプロパティをサポート                          |

## 動作

1. **初期状態**: 現在の値が表示され、ボタンは非表示
2. **入力開始**: ユーザーが値を変更すると、入力フィールドの下部右側に確認(✓)とキャンセル(✕)ボタンが表示
3. **確定**:
    - チェックマークボタンをクリック、または`Enter`キーを押すと`onCommit`が呼ばれる
    - 値が元の値と異なる場合のみ`onCommit`が実行される
    - エラーが発生した場合は、確認ボタンの近くにPopoverでエラーメッセージが表示される
4. **キャンセル**:
    - キャンセルボタンをクリック、または`Escape`キーを押すと元の値に戻る

## バリデーションエラーの防止

従来の`Input`コンポーネントでは、`onChange`で即座に値が更新されるため、URL入力時に1文字入力しただけでバリデーションエラーが発生していました。

```tsx
// ❌ 問題のあるコード（1文字入力するとエラー）
<Input
    value={url}
    onChange={(_, data) => updateUrl(data.value)} // "h"でバリデーションエラー!
    type="url"
/>
```

`ValidatedInput`を使用すると、確定ボタンを押すまで値が更新されないため、入力中のエラーを防げます。

```tsx
// ✅ 改善されたコード（確定時のみバリデーション）
<ValidatedInput
    value={url}
    onCommit={(newValue) => updateUrl(newValue)} // 完全なURLが入力された後のみ実行
    type="url"
/>
```

## デザイン

- **コンテナ**: フレックスレイアウトで入力フィールドとボタンを横並び配置
- **入力フィールド**: `flexGrow: 1`で利用可能なスペースを占有
- **ボタングループ**: 小さなギャップで2つのボタンを配置
- **アイコン**: Fluent UI Iconsの`Checkmark20Regular`と`Dismiss20Regular`を使用

## アクセシビリティ

- ボタンに`title`属性でツールチップを提供
- キーボードショートカット(`Enter`, `Escape`)をサポート
- Fluent UIの`Input`コンポーネントのアクセシビリティ機能を継承

## 関連コンポーネント

- `Input` (Fluent UI): ベースとなる入力コンポーネント
- `Button` (Fluent UI): 確認・キャンセルボタン
- `SettingItem`: 設定項目の表示に使用
