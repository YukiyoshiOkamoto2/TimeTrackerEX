# core/pdf/ - PDFパーサー

TimeTracker勤怠PDFから勤務時間情報を抽出。

## 関数

**parsePDF(file: File)**: PDFファイルをパースして勤務スケジュール抽出。

**戻り値**: `InputPDFResult`
- `schedule`: 勤務時間スケジュール配列
- `scheduleStamp`: 打刻時間スケジュール配列
- `errorMessage`: エラーメッセージ (任意)

## PDFSchedule型

`{ start, end?, isHoliday, isPaidLeave, errorMessage? }`

**テスト**: 3 tests

**使用ライブラリ**: pdfjs-dist
