import re
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from typing import List, Optional

from dateutil.rrule import rrulestr
from icalendar import Calendar

from .date import now, strptime
from .logger import CustomLogger
from .model import Event, Schedule
from .util import open_file

logger = CustomLogger(name=__name__)

now_date = now()
start_date = now_date - timedelta(days=30)


@dataclass
class InputICSResult:
    events: List[Event] = None
    error_message: str = None

    def start_date(self) -> date:
        return self.events[0].schedule.get_base_date() if self.events else None

    def end_date(self) -> date:
        return self.events[-1].schedule.get_base_date() if self.events else None


def _parse_recurrence(event) -> Optional[List[datetime]]:
    if event.get("RRULE") is None or event.get("DTSTART") is None:
        return None
    # print(event.get("SUMMARY"), ":", event.get("DTSTART"), ":", event.get("RRULE"))
    rrule = event.get("RRULE").to_ical().decode("utf-8")
    dtstart = event.get("DTSTART")
    recurrence = list(rrulestr(rrule, dtstart=dtstart.dt))
    return [rec for rec in recurrence if rec <= now_date]


def _parse_event(event) -> tuple[List[Event], str]:
    try:
        # イベントの名前、開始日時、終了日時を取得
        name = str(event.get("SUMMARY")) if event.get("SUMMARY") else None

        start = None
        dtstart = event.get("DTSTART")
        if dtstart and isinstance(dtstart.dt, datetime):
            start = dtstart.dt.astimezone()

        end = None
        dtend = event.get("DTEND")
        if dtend and isinstance(dtend.dt, datetime):
            end = dtend.dt.astimezone()

        if not name or not start or not end:
            return None, f"不正な日付イベントです。：{event}"

        if start > end:
            return None, f"終了日時が開始日時より前です。：{event}"

        # イベントの情報を取得
        uuid = str(event.get("UID"))
        organizer = str(event.get("ORGANIZER"))
        location = str(event.get("LOCATION"))
        is_private = str(event.get("CLASS")) == "PRIVATE"
        is_cancelled = (
            str(event.get("TRANSP")) == "TRANSPARENT"
            or name.startswith("Canceled:")
            or name.startswith("キャンセル済み:")
        )

        # 繰り返しイベントの場合、繰り返しの日付を取得
        recurrence = _parse_recurrence(event)

        # イベントのスケジュールを作成
        event_schedule = Schedule(start=start, end=end)

        # イベントが過去の場合かつ繰り返しイベントもない場合、スキップ
        if event_schedule.get_base_date() < start_date.date() and not recurrence:
            return None, f"過去のイベントです。：{event.get('SUMMARY')}"

        return Event(
            name=name,
            uuid=uuid,
            organizer=organizer,
            location=location,
            is_private=is_private,
            is_cancelled=is_cancelled,
            schedule=Schedule(start=start, end=end),
            recurrence=recurrence,
        ), None
    except Exception as e:
        print(e)
        return None, e.__repr__()


def _parse_event_from_lines(event_lines):
    """Parse the event lines into a dictionary."""
    event = {}
    for line in event_lines:
        if line.startswith("DTSTART"):
            event["DTSTART"] = line.strip()
        elif line.startswith("DTEND"):
            event["DTEND"] = line.strip()
        elif line.startswith("SUMMARY"):
            event["SUMMARY"] = line.strip()
    return event


def _is_recent_event(event):
    dtstart_match = re.match(r"DTSTART.*:(\d+)", event["DTSTART"])
    if not dtstart_match:
        return False

    dtstart_str = dtstart_match.group(1)
    try:
        dtstart_date = strptime(dtstart_str, "%Y%m%dT%H%M%S")
    except ValueError:
        dtstart_date = strptime(dtstart_str, "%Y%m%d")
    return dtstart_date >= start_date


def extract_recent_events(input_file, output_file) -> str:
    recent_events = []
    current_event = []
    in_event = False

    with open(input_file, "r", encoding="utf-8") as file:
        first_event_none = True
        for line in file:
            if not line.startswith(" "):
                line = line.strip()
            if line == "BEGIN:VEVENT":
                in_event = True
                first_event_none = False
                current_event = [line]
            elif line == "END:VEVENT":
                if in_event:
                    current_event.append(line)
                    event = _parse_event_from_lines(current_event)
                    if _is_recent_event(event):
                        recent_events.extend(current_event)
                in_event = False
            elif in_event:
                current_event.append(line)
            elif first_event_none:
                recent_events.append(line)

    # Write the recent events to the output file
    with open(output_file, "w", encoding="utf-8") as file:
        # file.write('BEGIN:VCALENDAR\n')
        for line in recent_events:
            if not line.endswith("\n"):
                line += "\n"
            file.write(line)
        file.write("END:VCALENDAR\n")

    return output_file


def execute(file_path) -> InputICSResult:
    result = InputICSResult()
    result.events = []

    logger.debug(f"Start reading ICS file: {file_path}")

    # ファイルを開く
    open_file_result = open_file(file_path)
    if open_file_result.is_error():
        result.error_message = (
            f"{file_path}の読み取りに失敗しました。: {open_file_result.error_message}"
        )
        return result

    # ICSファイルを読み込む
    try:
        calendar = Calendar.from_ical(open_file_result.text)
    except Exception as e:
        result.error_message = (
            f"{file_path}の解析に失敗しました。:  {e}\nstacktrace: {e.__traceback__}"
        )
        return result

    # ICSファイルのイベントを解析
    events = []
    error_messages = []
    for comp in calendar.walk():
        if comp.name == "VEVENT":
            event, error_message = _parse_event(comp)
            if event:
                events.append(event)
            else:
                error_messages.append(f"【SKIP】 {error_message}")

    # イベントをソート
    events.sort(key=lambda x: (x.schedule.start, (x.schedule.end - x.schedule.start)))

    result.events = events
    result.error_message = "\n".join(error_messages)

    logger.debug(f"End reading ICS file: {file_path}")
    return result


if __name__ == "__main__":
    # Execute the ICS parsing
    result = execute(r"web\src\core\ics\岡本 行欽 の予定表.ics")
    
    print(f"=== Python ICS解析結果 ===")
    print(f"総イベント数: {len(result.events) if result.events else 0}")
    
    if result.error_message:
        error_lines = result.error_message.split("\n")
        print(f"エラーメッセージ数: {len(error_lines)}")
        # print(result.error_message)
        pass

    if result.events:
        visible_events = [e for e in result.events if not e.is_cancelled and not e.is_private]
        print(f"表示イベント数: {len(visible_events)}")
        print(f"\n最初のイベント: {result.events[0].name}")
        print(f"  開始: {result.events[0].schedule.start.isoformat()}")
        print(f"  終了: {result.events[0].schedule.end.isoformat()}")
        print(f"  繰り返し: {len(result.events[0].recurrence) if result.events[0].recurrence else 0}回")
        
        print(f"\n=== 全イベントリスト（非キャンセル・非プライベート） ===")
        for i, event in enumerate(visible_events, 1):
            print(f"{i}. {event.get_text()}")
