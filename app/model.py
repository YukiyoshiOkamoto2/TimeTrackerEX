import uuid
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from typing import List, Literal, Optional

day_format = "%Y/%m/%d (%a)"
time_format = "%H:%M"


@dataclass
class Schedule:
    """
    スケジュールを表すクラス。
    Attributes:
        start (datetime): スケジュールの開始時間。
        is_holiday (bool): 休日であるかどうかを示すフラグ。デフォルトは False。
        is_paid_leave (bool): 有給休暇であるかどうかを示すフラグ。デフォルトは False。
        end (Optional[datetime]): スケジュールの終了時間。デフォルトは None。
        error_message (Optional[str]): エラーメッセージ。デフォルトは None。
    Methods:
        __post_init__():
            開始時間と終了時間のタイムゾーンを補正し、開始時間が終了時間より後の場合はエラーを発生させます。
        get_range() -> Optional[timedelta]:
            開始時間と終了時間の差を返します。範囲が設定されていない場合は None を返します。
        is_error() -> bool:
            エラーが存在するかどうかを判定します。
        get_base_date() -> date:
            スケジュールの基準日（開始時間または終了時間の日付）を返します。
        is_overlap(other: "Schedule") -> bool:
            他のスケジュールと重複しているかどうかを判定します。
        get_text() -> str:
            スケジュールの情報を文字列形式で取得します。
    """

    start: datetime
    is_holiday: bool = False
    is_paid_leave: bool = False
    end: Optional[datetime] = None
    error_message: Optional[str] = None

    def __post_init__(self):
        if self.is_paid_leave:
            if not self.is_holiday:
                raise ValueError(
                    f"有給休暇の場合は休日フラグを設定してください。{self}"
                )

        if self.end and self.start:
            if self.start.tzinfo is None:
                self.start = self.start.astimezone()
            if self.end.tzinfo is None:
                self.end = self.end.astimezone()
            if self.start > self.end:
                raise ValueError(f"終了時間が開始時間より前です。{self}")

            self._range = self.end - self.start

    def get_range(self) -> Optional[timedelta]:
        return self._range if self._range is not None else None

    def is_error(self) -> bool:
        return self.error is not None

    def get_base_date(self) -> date:
        return (
            self.start.date() if self.start else self.end.date() if self.end else None
        )

    def is_overlap(self, other: "Schedule") -> bool:
        if not self.start or not self.end or not other.start or not other.end:
            return False

        if self.get_base_date() != other.get_base_date():
            return False

        latest_start = max(self.start, other.start)
        earliest_end = min(self.end, other.end)

        return latest_start < earliest_end

    def get_text(self) -> str:
        text = []
        base_date = self.get_base_date()
        if base_date:
            text.append(base_date.strftime(day_format))
        else:
            text.append("日付未定")
        if self.is_paid_leave:
            text.append("<有給休暇>")
        if not self.is_paid_leave and self.is_holiday:
            text.append("【休日】")
        if self.start:
            text.append(self.start.strftime(time_format))
        else:
            text.append("開始時間未定")
        text.append("-")
        if self.end:
            if self.start and self.end.date() > base_date:
                text.append(self.end.date().strftime(day_format))
            text.append(self.end.strftime(time_format))
        else:
            text.append("終了時間未定")
        if self.error_message:
            text.append(f"※{self.error_message}")

        return " ".join(text)


@dataclass
class Event:
    """
    イベントを表すクラス。
    Attributes:
        name (str): イベント名。
        organizer (str): イベントの主催者。
        is_private (bool): イベントが非公開かどうか。
        is_cancelled (bool): イベントがキャンセルされているかどうか。
        location (str): イベントの場所。
        schedule (Schedule): イベントのスケジュール。
        uuid (Optional[str]): イベントの一意識別子。デフォルトは None。
        recurrence (Optional[List[datetime]]): イベントの繰り返し日程。デフォルトは None。
        working_event_type (Optional[Literal["start", "middle", "end"]]): 勤務時間を示すタイプ。デフォルトは None。
    Methods:
        __post_init__():
            初期化後に呼び出されるメソッド。UUIDが設定されていない場合は新規に生成し、
            スケジュールの開始時間または終了時間が未設定の場合は例外をスローします。
        same(other: "Event") -> bool:
            他のイベントとキーが一致するかどうかを比較します。
        get_key() -> str:
            イベントを一意に識別するためのキーを生成します。
        scheduled(new_schedule: Schedule, uniqe=False) -> "Event":
            新しいスケジュールを持つイベントを生成します。
            uniqe が True の場合、新しい UUID を生成します。
        get_text() -> str:
            イベントの詳細をテキスト形式で取得します。
            非公開やキャンセルの情報、スケジュール、繰り返し日程などを含みます。
    """

    name: str
    organizer: str
    is_private: bool
    is_cancelled: bool
    location: str
    schedule: Schedule
    uuid: Optional[str] = None
    recurrence: Optional[List[datetime]] = None
    working_event_type: Optional[Literal["start", "middle", "end"]] = None

    def __post_init__(self):
        if self.uuid is None:
            self.uuid = uuid.uuid4().hex
        if self.schedule.start is None or self.schedule.end is None:
            raise ValueError(f"イベントの開始時間または終了時間が未設定です。{self}")

    def same(self, other: "Event") -> bool:
        return self.get_key() == other.get_key()

    def get_key(self) -> str:
        return f"{self.name or ''}_{self.organizer or ''}_{self.working_event_type or ''}_{self.is_private or 'False'}"

    def scheduled(self, new_schedule: Schedule, uniqe=False) -> "Event":
        return Event(
            name=self.name,
            uuid=uuid.uuid4().hex if uniqe else self.uuid,
            organizer=self.organizer,
            is_private=self.is_private,
            is_cancelled=self.is_cancelled,
            location=self.location,
            schedule=new_schedule,
            recurrence=self.recurrence,
        )

    def get_text(self) -> str:
        text = []
        if self.is_private:
            text.append("【非公開】")
        if self.is_cancelled:
            text.append("【キャンセル】")
        if self.name:
            text.append(self.name)
        if self.organizer:
            text.append(f"（{self.organizer}）")

        text.append(" ")
        if not self.recurrence:
            text.append(self.schedule.get_text())
        else:
            if self.schedule.start:
                text.append(self.schedule.start.strftime(time_format))
            else:
                text.append("開始時間未定")
            text.append("-")
            if self.schedule.end:
                text.append(self.schedule.end.strftime(time_format))
            else:
                text.append("終了時間未定")
            text.append(" ")
            text.append("[")
            text.append(",".join([dt.strftime("%m/%d") for dt in self.recurrence]))
            text.append("]")

        return "".join(text)


@dataclass
class Project:
    id: str
    name: str
    project_id: str
    project_name: str
    project_code: str


@dataclass
class WorkItem:
    """
    WorkItem クラスは、作業項目を表現するためのデータモデルです。
    Attributes:
        id (str): 作業項目の一意の識別子。
        name (str): 作業項目の名前。
        folder_name (str): 作業項目が属するフォルダの名前。
        folder_path (str): 作業項目が属するフォルダのパス。
        sub_items (Optional[List[WorkItem]]): サブ作業項目のリスト。デフォルトは None。
    Methods:
        get_most_nest_children() -> List[WorkItem]:
            最も深い階層にある子作業項目を取得します。
            サブ作業項目が存在しない場合は、自身をリストとして返します。
    """

    id: str
    name: str
    folder_name: str
    folder_path: str
    sub_items: Optional[List["WorkItem"]] = None

    def get_most_nest_children(self) -> List["WorkItem"]:
        if not self.sub_items:
            return [self]
        nested_items = []
        for sub_item in self.sub_items:
            nested_items.extend(sub_item.get_most_nest_children())
        return nested_items


@dataclass
class DayTask:
    base_date: date
    project: Project
    events: List[Event]
    schedule_events: List[Event]


@dataclass
class EventWorkItemPair:
    event: Event
    work_item: WorkItem


@dataclass
class TimeTrackerDayTask:
    base_date: date
    project: Project
    event_work_item_pair: List[EventWorkItemPair]
