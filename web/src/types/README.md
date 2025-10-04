# types

TimeTracker EXの型定義モジュール

## 概要

このディレクトリには、アプリケーション全体で使用される型定義が含まれています。
Pythonの`model.py`をTypeScriptに移植したものです。

## 主な型

### Schedule（スケジュール）
勤務時間や予定を表す基本的なデータ構造です。

```typescript
interface Schedule {
  start: Date
  end: Date | null
  isHoliday?: boolean
  isPaidLeave?: boolean
  errorMessage?: string | null
}
```

### Event（イベント）
カレンダーイベントを表すデータ構造です。

```typescript
interface Event {
  uuid: string
  name: string
  organizer: string
  isPrivate: boolean
  isCancelled: boolean
  location: string
  schedule: Schedule
  recurrence?: Date[] | null
  workingEventType?: WorkingEventType | null
}
```

### Project（プロジェクト）
作業を行うプロジェクトの情報を表します。

```typescript
interface Project {
  id: string
  name: string
  projectId: string
  projectName: string
  projectCode: string
}
```

### WorkItem（作業項目）
作業項目を階層構造で表します。

```typescript
interface WorkItem {
  id: string
  name: string
  folderName: string
  folderPath: string
  subItems?: WorkItem[] | null
}
```

### DayTask（日次タスク）
1日分の作業タスクを表します。

```typescript
interface DayTask {
  baseDate: Date
  project: Project
  events: Event[]
  scheduleEvents: Event[]
}
```

## 使用例

```typescript
import type { Schedule, Event, Project } from '@/types'

const schedule: Schedule = {
  start: new Date('2025-10-04T09:00:00'),
  end: new Date('2025-10-04T18:00:00'),
  isHoliday: false,
}

const event: Event = {
  uuid: crypto.randomUUID(),
  name: '会議',
  organizer: '山田太郎',
  isPrivate: false,
  isCancelled: false,
  location: '会議室A',
  schedule,
}
```

## 型の拡張

新しい型を追加する場合は、`index.ts`に定義を追加し、適切なドキュメントコメントを記載してください。
