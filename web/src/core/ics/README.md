# core/ics/ - ICSファイルパーサー

Outlook/GoogleカレンダーのICSファイル読み込み。

## 関数

**parseICS(text: string, options?: ParseOptions)**: ICS文字列をパースしてイベント配列取得。

**戻り値**: `InputICSResult`
- `events`: パース成功イベント配列
- `errorMessages`: パースエラーメッセージ配列

**ParseOptions**: `{ includePrivate?, startDate, endDate }`

## Event型

`{ uuid, name, organizer, schedule, recurrence?, isPrivate, isCancelled, location, workingEventType? }`

**テスト**: 13 tests

**使用ライブラリ**: ical.js v2.2.1
