# core/pdf

勤怠PDFファイルのパーサーモジュールです。TimeTrackerの「勤務実績入力（本人用）」PDFから勤務時間情報を抽出します。

## 機能

### parsePDF

PDFファイルから勤務スケジュール情報を抽出します。

```typescript
import { parsePDF } from '@/core/pdf'
import type { PDFSchedule, InputPDFResult } from '@/core/pdf'

// ファイルアップロードから使用
function handleFileUpload(file: File) {
  parsePDF(file).then(result => {
    if (result.errorMessage) {
      console.error(result.errorMessage)
      return
    }
    
    // 勤務時間スケジュール
    result.schedule.forEach(sch => {
      console.log(`${sch.start} - ${sch.end}`)
    })
    
    // 打刻時間スケジュール
    result.scheduleStamp.forEach(stamp => {
      console.log(`打刻: ${stamp.start} - ${stamp.end}`)
    })
  })
}
```

## データ構造

### PDFSchedule

```typescript
interface PDFSchedule {
  /** 開始日時 */
  start: Date
  /** 終了日時（オプション） */
  end?: Date
  /** 休日フラグ */
  isHoliday: boolean
  /** 有給休暇フラグ */
  isPaidLeave: boolean
  /** エラーメッセージ（パースエラー時） */
  errorMessage?: string
}
```

### InputPDFResult

```typescript
interface InputPDFResult {
  /** 勤務時間スケジュール */
  schedule: PDFSchedule[]
  /** 打刻時間スケジュール */
  scheduleStamp: PDFSchedule[]
  /** エラーメッセージ（全体エラー時） */
  errorMessage?: string
}
```

## PDFフォーマット

### 通常勤務日

```
7/22
火
フレックス勤務
1
09:45 -- 18:46
09時45分 ～ 18時46分
```

### 休日（所定休日）

```
7/21
月
所定休日
（打刻情報なし）
```

### 有給休暇

```
7/23
水
＜休暇＞
（打刻情報なし）
```

## 処理フロー

1. **PDFテキスト抽出**: PDF.jsを使用してPDFからテキストを抽出
2. **日付情報の解析**: 日付パターン（例: "7/22 火"）を検出
3. **勤務区分判定**: 
   - 所定休日: `isHoliday = true`
   - 有給休暇: `isPaidLeave = true`, `isHoliday = true`
   - 土日: `isHoliday = true`
4. **時刻情報の抽出**:
   - 勤務時間: "09時45分 ～ 18時46分" 形式
   - 打刻時間: "09:45 -- 18:46" 形式
5. **スケジュール生成**: 抽出した情報からスケジュールオブジェクトを生成

## 依存ライブラリ

- **pdfjs-dist** - Mozillaが提供するPDFパーサー
  - ブラウザ環境で動作
  - Worker対応

### PDF.js 設定

```typescript
import * as pdfjsLib from 'pdfjs-dist'

// Workerの設定
pdfjsLib.GlobalWorkerOptions.workerSrc = 
  `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`
```

## 実装状況

🔄 **実装中**

### 実装済み

- [x] PDF.jsを使用したPDFテキスト抽出
- [x] 日付情報のパース
- [x] 休日・有給休暇の判定
- [x] 勤務時間・打刻時間の抽出
- [x] 基本的なエラーハンドリング

### 未完了

- [ ] テストの完全実装（PDF.jsモックが複雑）
- [ ] 複数ページ対応の詳細テスト
- [ ] エッジケースの処理

## 使用例

### React コンポーネントでの使用

```typescript
import { useState } from 'react'
import { parsePDF } from '@/core/pdf'
import type { InputPDFResult } from '@/core/pdf'

function PDFUploader() {
  const [result, setResult] = useState<InputPDFResult | null>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const parseResult = await parsePDF(file)
    setResult(parseResult)
  }

  return (
    <div>
      <input type="file" accept=".pdf" onChange={handleFileChange} />
      {result && (
        <div>
          {result.errorMessage && <p>エラー: {result.errorMessage}</p>}
          <h3>勤務時間</h3>
          {result.schedule.map((sch, i) => (
            <div key={i}>
              {sch.start.toLocaleString()} - {sch.end?.toLocaleString()}
              {sch.isHoliday && ' (休日)'}
              {sch.isPaidLeave && ' (有給)'}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

## 注意事項

1. **ブラウザ環境のみ**: PDF.jsはブラウザ環境で動作
2. **PDFフォーマット依存**: TimeTrackerの特定のPDFフォーマットに依存
3. **年の扱い**: 現在年を使用（年をまたぐ場合は要調整）
4. **文字エンコーディング**: 日本語（UTF-8）を想定

## 関連

- Python実装: `app/input_pdf.py`
- ICSパーサー: `core/ics/`
- 型定義: コンポーネント内で定義

## 今後の改善

- [ ] 年をまたぐ場合の処理
- [ ] PDFフォーマットのバリエーション対応
- [ ] パフォーマンス最適化
- [ ] より詳細なエラーメッセージ
