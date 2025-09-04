import asyncio

import os
from dataclasses import dataclass
from datetime import datetime, time
from typing import List, Optional

from . import html
from . import input_ics
from . import input_pdf
from . import update_app
from .algorithm import EventInputInfo, ScheduleInputInfo, TimeTrackerAlgorithm
from .api import TimeTracker, TimeTrackerTask
from .history import TimeTrackerHistory
from .ignore import Ignore
from .logger import CustomLogger
from .message_handler_factory import MessageContext, MessageHandlerFactory
from .model import (
    DayTask,
    Event,
    EventWorkItemPair,
    Project,
    Schedule,
    TimeTrackerDayTask,
    WorkItem,
)
from .setting import Settings, get_desk_path
from .view import AppView

logger = CustomLogger("app")


@dataclass
class TimeTrackerInfo:
    project: Project
    work_items: List[WorkItem]


def get_events(view: AppView) -> List[Event]:
    """
    .icsまたは.ics_longファイルからイベントを取得する関数です。

    Args:
        view (AppView): アプリケーションビュー

    Raises:
        Exception: .icsまたは.ics_longファイルが見つからない場合に発生します。

    Returns:
        List[Event]: イベントのリスト
    """

    ics_directory = os.getcwd()
    ics_files = [f for f in os.listdir(ics_directory) if f.lower().endswith(".ics")]
    ics_long_files = [
        f for f in os.listdir(ics_directory) if f.lower().endswith(".ics_long")
    ]

    if len(ics_files) == 0 and len(ics_long_files) == 0:
        view.push(
            ".ics,.ics_longファイルが見つかりません。実行ファイルと同じディレクトリに配置してください。"
        )
        return []

    is_long, target_files = (
        (False, ics_files) if len(ics_files) > 0 else (True, ics_long_files)
    )
    if len(ics_files) > 0 and len(ics_long_files) > 0:
        view.push(
            ".icsファイルと.ics_longファイルが両方見つかりました。.icsファイルを優先して使用します。"
        )

    if len(target_files) > 1:
        view.push("対象のファイルが複数見つかりました。以下のファイルを使用します。")
        view.push(target_files[0])

    ics_file_path = os.path.join(ics_directory, target_files[0])
    if is_long:
        ics_file_path = input_ics.extract_recent_events(
            ics_file_path, ics_file_path.replace(".ics_long", "_recent.ics")
        )

    result = input_ics.execute(ics_file_path)

    if result.error_message:
        logger.error(result.error_message)
        # raise Exception(result.error_message)

    return result.events or []


def get_schedule() -> List[Schedule]:
    """
    PDFファイルからスケジュールを取得する関数です。

    Raises:
        Exception: PDFファイルが見つからない場合に発生します。

    Returns:
        List[Schedule]: スケジュールのリスト
    """

    pdf_directory = os.getcwd()
    pdf_files = [f for f in os.listdir(pdf_directory) if f.lower().endswith(".pdf")]

    if len(pdf_files) == 0:
        raise Exception("PDFファイルが見つかりません。")

    if len(pdf_files) > 1:
        logger.warn("PDFファイルが複数見つかりました。以下のファイルを使用します。")
        logger.warn(pdf_files[0])

    pdf_file_path = os.path.join(pdf_directory, pdf_files[0])

    result = input_pdf.execute(pdf_file_path)

    if result.error_message:
        logger.error(result.error_message)

    return [schedule for schedule in result.schedule]


async def get_time_tracker_info(api: TimeTracker, password: str) -> TimeTrackerInfo:
    """
    非同期でタイムトラッカー情報を取得する関数です。

    引数:
        api (TimeTracker): タイムトラッカーAPIオブジェクト
        password (str): パスワード

    戻り値:
        TimeTrackerInfo: タイムトラッカー情報
    """

    await api.connect_async(password)
    project = await api.get_projects_async()
    work_items = await api.get_work_items_async()
    return TimeTrackerInfo(project, work_items)


def get_enable_schedule(ignore: Ignore, schedules: List[Schedule]) -> List[Schedule]:
    """
    有効なスケジュールを取得する関数です。

    Args:
        ignore (Ignore): 無視リスト
        schedules (List[Schedule]): スケジュールのリスト

    Returns:
        List[Schedule]: 有効なスケジュールのリスト
    """

    def is_holiday(schedule: Schedule) -> bool:
        return schedule.is_holiday

    return [
        schedule
        for schedule in schedules
        if not is_holiday(schedule)
        and not schedule.error_message
        and not ignore.ignore_schdule(schedule)
    ]


def get_enable_events(ignore: Ignore, events: List[Event]) -> List[Event]:
    """
    有効なイベントを取得する関数です。

    Args:
        ignore (Ignore): 無視リスト
        events (List[Event]): イベントのリスト

    Returns:
        List[Event]: 有効なイベントのリスト
    """

    return [
        event
        for event in events
        if not event.is_private
        and not event.is_cancelled
        and not ignore.ignore_event(event)
    ]


def linking_event_work_item(
    view: AppView,
    settings: Settings,
    history: TimeTrackerHistory,
    events: List[Event],
    work_item_children: List[WorkItem],
) -> List[EventWorkItemPair]:
    """
    イベントと作業項目をリンクする関数です。

    Args:
        view (AppView): アプリケーションビュー
        settings (Settings): 設定オブジェクト
        history (TimeTrackerHistory): タイムトラッカー履歴オブジェクト
        events (List[Event]): イベントのリスト
        work_item_children (List[WorkItem]): 作業項目の子リスト

    Returns:
        List[EventWorkItemPair]: イベントと作業項目のペアのリスト
    """

    is_history_auto_input = settings.get_setting_value("is_history_auto_input")
    time_off_event = settings.get_setting_value("time_off_event")

    # 休暇のイベント名とWorkItemを取得
    name_of_time_off_event = []
    time_off_work_item = None
    if time_off_event:
        name_of_time_off_event = time_off_event.get("name_of_event", [])
        time_off_work_item_id = time_off_event.get("work_item_id", None)
        if time_off_work_item_id:
            time_off_work_item = next(
                (
                    item
                    for item in work_item_children
                    if item.id == str(time_off_work_item_id)
                ),
                None,
            )

    result_list = []
    work_item_children_map = {item.id: item for item in work_item_children}

    # イベントと作業項目をリンク
    count = 1
    event_count = len(events)
    for event in events:
        view.push(event.get_text())
        view.push(f"({count}/{event_count})")
        view.space()

        history_work_item = work_item_children_map.get(history.get_work_item_id(event))

        work_item = None
        if time_off_work_item and event.name in name_of_time_off_event:
            view.push(
                f"休暇のイベントです。[{time_off_work_item.id}:{time_off_work_item.folder_path}/{time_off_work_item.name}]"
            )
            work_item = time_off_work_item
        elif is_history_auto_input and history_work_item:
            view.push(
                f"履歴から作業IDを取得しました。[{history_work_item.id}:{history_work_item.folder_path}/{history_work_item.name}]"
            )
            work_item = history_work_item
        else:
            work_item_id = input_work_item_id(
                view, work_item_children_map, history_work_item
            )
            if work_item_id:
                work_item = work_item_children_map[work_item_id]
                history.set_history(event, work_item)

        if work_item:
            result_list.append(EventWorkItemPair(event, work_item))

        count += 1
        view.space()

    # 履歴を保存
    history.dump()
    return result_list


def input_work_item_id(
    view: AppView, work_item_children_map: dict, history_work_item: Optional[WorkItem]
) -> str:
    """指定されたビューを使用して作業項目のIDを入力し、検証します。

    Args:
        view (AppView): ユーザー入力を取得するためのビューオブジェクト。
        work_item_children_map (dict): 作業項目IDをキーとし、作業項目オブジェクトを値とする辞書。
        history_work_item (Optional[WorkItem]): 履歴からの作業項目オブジェクト。省略可能。

    Returns:
        str: 入力された作業項目のID。入力がキャンセルされた場合はNoneを返します。
    """

    message = "WorkItemのIDを入力してください。"
    if history_work_item:
        message += f"[{history_work_item.id}:{history_work_item.folder_path}/{history_work_item.name}]"

    while True:
        btn, id = view.get_input(message)
        if btn == "Cancel":
            view.push("入力がキャンセルされました。")
            return None

        if id:
            target_work_item = work_item_children_map.get(id, None)
            if target_work_item:
                return target_work_item.id
        elif history_work_item:
            return history_work_item.id

        btn, _ = view.get_input(
            "入力されたIDが見つかりません。もう一度入力しますか？", yes_no=True
        )
        if btn != "Yes":
            view.push("入力がキャンセルされました。")
            return None


def get_paid_leave_work_item(
    settings: Settings, work_item_children: List[WorkItem]
) -> Optional[tuple[WorkItem, time, time]]:
    """有給休暇の作業項目を取得します。

    Args:
        settings (Settings): 設定オブジェクト。
        work_item_children (List[WorkItem]): 作業項目のリスト。

    Raises:
        Exception: 有給休暇の作業項目が見つからない場合に発生します。

    Returns:
        Optional[tuple[WorkItem, time, time]]: 有給休暇の作業項目、開始時間、終了時間のタプル。
    """

    paid_leave_input_info = settings.get_setting_value("paid_leave_input_info")
    if not paid_leave_input_info:
        return None

    paid_leave_work_item_id = paid_leave_input_info.get("work_item_id")
    if not paid_leave_work_item_id:
        raise Exception("有給休暇の作業IDが設定されていません。設定してください。")

    paid_leave_work_item = next(
        (
            item
            for item in work_item_children
            if item.id == str(paid_leave_work_item_id)
        ),
        None,
    )
    if not paid_leave_work_item:
        raise Exception("有給休暇の作業項目が見つかりません。")

    paid_leave_start_str = paid_leave_input_info.get("start_time")
    paid_leave_end_str = paid_leave_input_info.get("end_time")
    if not paid_leave_start_str or not paid_leave_end_str:
        raise Exception(
            "有給休暇の開始時間または終了時間が設定されていません。設定してください。"
        )

    # 有給休暇の開始時間と終了時間を取得
    paid_leave_start = time.fromisoformat(paid_leave_start_str)
    paid_leave_end = time.fromisoformat(paid_leave_end_str)

    return (paid_leave_work_item, paid_leave_start, paid_leave_end)


def get_day_task(
    settings: Settings,
    project: Project,
    schedules: List[Schedule],
    paid_leave_schedules: List[Schedule],
    event_work_item_pairs: List[EventWorkItemPair],
    work_item_children: list[WorkItem],
) -> List[DayTask]:
    """勤務時間の自動入力設定に基づいて、1日のタスクを取得します。

    Args:
        settings (Settings): 設定オブジェクト。
        project (Project): プロジェクトオブジェクト。
        schedule (List[Schedule]): スケジュールのリスト。
        event_work_item_pairs (List[EventWorkItemPair]): イベントのリスト。
        work_item_children (list[WorkItem]): 作業項目のリスト。

    Raises:
        Exception: 勤務時間の自動入力設定がされていない場合に発生します。
        Exception: その他のエラーが発生した場合に発生します。

    Returns:
        List[DayTask]: 1日のタスクリスト。
    """

    schedule_auto_input_info = settings.get_setting_value("schedule_auto_input_info")
    if not schedule_auto_input_info:
        raise Exception("勤務時間の自動入力設定がされていません。設定してください。")

    # スケジュールの設定を読み込み
    rounding_time_type = schedule_auto_input_info.get("rounding_time_type_of_schedule")
    start_end_type = schedule_auto_input_info.get("start_end_type")
    start_end_time = schedule_auto_input_info.get("start_end_time")
    schedule_input_info = ScheduleInputInfo(
        rounding_time_type=rounding_time_type,
        start_end_type=start_end_type,
        start_end_time=start_end_time,
    )
    work_item_id = schedule_auto_input_info.get("work_item_id")
    schedule_work_item = next(
        (item for item in work_item_children if item.id == str(work_item_id)),
        None,
    )
    if not schedule_work_item:
        raise Exception("勤務時間の作業項目が見つかりません。")

    # イベントの設定を読み込み
    event_duplicate_time_compare = settings.get_setting_value(
        "event_duplicate_priority"
    ).get("time_compare")
    rounding_time_type_of_event = settings.get_setting_value(
        "rounding_time_type_of_event"
    )
    event_input_info = EventInputInfo(
        event_duplicate_time_compare=event_duplicate_time_compare,
        rounding_time_type=rounding_time_type_of_event,
    )

    algorithm = TimeTrackerAlgorithm(
        project=project,
        event_input_info=event_input_info,
        schedule_input_info=schedule_input_info,
    )

    # 1日ごとのタスクを取得
    day_tasks = algorithm.split_one_day_task(
        schedules=schedules,
        events=[
            event_work_item_pair.event for event_work_item_pair in event_work_item_pairs
        ],
    )

    def get_event(name: str, schedule: Schedule) -> Event:
        return Event(
            name=name,
            schedule=schedule,
            is_private=False,
            is_cancelled=False,
            location="",
            organizer="Autometic",
        )

    # 1日ごとのタスクリストを作成
    time_tracker_day_tasks = []

    # 有給休暇の設定を読み込み
    paid_leave_work_item, paid_leave_start, paid_leave_end = get_paid_leave_work_item(
        settings, work_item_children
    )

    # 有給休暇のスケジュールを取得
    if paid_leave_work_item:
        for schdule in paid_leave_schedules:
            new_schdule = Schedule(
                is_holiday=schdule.is_holiday,
                is_paid_leave=schdule.is_paid_leave,
                start=schdule.start.replace(
                    hour=paid_leave_start.hour, minute=paid_leave_start.minute
                ),
                end=schdule.start.replace(
                    hour=paid_leave_end.hour, minute=paid_leave_end.minute
                ),
            )
            time_tracker_day_tasks.append(
                TimeTrackerDayTask(
                    base_date=schdule.get_base_date(),
                    project=project,
                    event_work_item_pair=[
                        EventWorkItemPair(
                            event=get_event("有給休暇", new_schdule),
                            work_item=paid_leave_work_item,
                        )
                    ],
                )
            )

    for day_task in day_tasks:
        evnt_work_item_list = []
        for event in day_task.events:
            # イベントに対応する作業項目を取得、なければ追加しない
            work_item = next(
                (
                    event_work_item_pair.work_item
                    for event_work_item_pair in event_work_item_pairs
                    if event_work_item_pair.event.same(event)
                ),
                None,
            )
            if work_item:
                evnt_work_item_list.append(EventWorkItemPair(event, work_item))

        # スケジュールに対応する作業項目を取得
        for schedule_event in day_task.schedule_events:
            evnt_work_item_list.append(
                EventWorkItemPair(schedule_event, schedule_work_item)
            )

        evnt_work_item_list.sort(key=lambda x: x.event.schedule.start)
        time_tracker_day_tasks.append(
            TimeTrackerDayTask(day_task.base_date, project, evnt_work_item_list)
        )

    time_tracker_day_tasks.sort(key=lambda x: x.base_date)
    return time_tracker_day_tasks


async def run_register_task_async(
    view: AppView, api: TimeTracker, day_tasks: List[TimeTrackerDayTask]
):
    """非同期でタスクを登録する関数。

    Args:
        view (AppView): アプリケーションのビューオブジェクト。
        api (TimeTracker): タイムトラッカーのAPIオブジェクト。
        day_tasks (List[TimeTrackerDayTask]): タイムトラッカーの日別タスクのリスト。
    """

    # メッセージハンドラーを取得
    factory = MessageHandlerFactory()
    factory.load()
    message_handler = factory.get_message_handler()

    for day_task in day_tasks:
        for event_work_item in day_task.event_work_item_pair:
            try:
                memo = (
                    message_handler.get_message(
                        event_work_item.event,
                        event_work_item.work_item,
                        MessageContext(),
                    )
                    if message_handler
                    else None
                )
                await api.register_task_async(
                    TimeTrackerTask(
                        work_item_id=event_work_item.work_item.id,
                        start_time=event_work_item.event.schedule.start,
                        end_time=event_work_item.event.schedule.end,
                        memo=memo,
                    )
                )
                view.push(
                    f"イベント登録完了: {event_work_item.event.schedule.start} - {event_work_item.event.schedule.end}"
                )
            except Exception as e:
                view.push(
                    f"イベント登録失敗: {event_work_item.event.schedule.start} - {event_work_item.event.schedule.end} エラー: {e}"
                )


def detail_dump(view: AppView):
    """
    現在のビューと1日のタスクの詳細情報をダンプする関数です。

    Args:
        view (AppView): 現在のアプリケーションビュー
    """

    # 現在の日時を文字列に変換
    now_str = datetime.now().strftime("%Y-%m-%d%H%M%S")

    # ディレクトリを作成
    desk_dir = os.path.join(get_desk_path(), f"{now_str}")
    os.makedirs(desk_dir, exist_ok=True)

    # ビューのログをファイルにダンプ
    file = os.path.join(desk_dir, "view-log.log")
    view.dump(file)

    # work_item.htmlをコピー
    source_file = os.path.join(get_desk_path(), "work_item.html")
    destination_file = os.path.join(desk_dir, "work_item.html")
    try:
        with open(source_file, "rb") as src, open(destination_file, "wb") as dst:
            dst.write(src.read())
    except Exception as e:
        logger.warn(f"work_item.htmlのコピーに失敗しました。エラー: {e}")

    # schedule.htmlをコピー
    source_file = os.path.join(get_desk_path(), "schedule.html")
    destination_file = os.path.join(desk_dir, "schedule.html")
    try:
        with open(source_file, "rb") as src, open(destination_file, "wb") as dst:
            dst.write(src.read())
    except Exception as e:
        logger.warn(f"schedule.htmlのコピーに失敗しました。エラー: {e}")

async def execute(is_register: bool = False):
    view = AppView()
    view.print_app_info()

    # 登録モードで起動しない場合は、説明を表示
    if not is_register:
        view.print_not_register_mode()

    # 履歴を読み込む
    history = TimeTrackerHistory()
    history.load()
    # 無視リストを読み込む
    ignore = Ignore()
    ignore.load()
    # 設定を読み込む
    settings = Settings(view)
    settings.load()

    # タイムトラッカーの設定を読み込む
    base_url = settings.get_setting_value("base_url")
    user_name = settings.get_setting_value("user_name")
    project_id = settings.get_setting_value("base_project_id")
    api = TimeTracker(base_url, user_name, project_id)
    events_task = asyncio.create_task(asyncio.to_thread(get_events, view))
    schedule_task = asyncio.create_task(asyncio.to_thread(get_schedule))
    # パスワードを取得
    password = view.get_password()
    if not password:
        raise Exception("パスワードが入力されていません。")
    
    timer_tracker_task = asyncio.create_task(get_time_tracker_info(api, password))
    view.push("必要な情報を取得中...")
    schedules = await schedule_task
    events = await events_task
    time_tracker_info = await timer_tracker_task
    view.push("必要な情報を取得中...完了")
    view.space()

    work_item_children = [
        child
        for item in time_tracker_info.work_items
        for child in item.get_most_nest_children()
    ]
    view.push("設定・履歴データを更新中...")
    settings.check_setting_work_item(work_item_children)
    history.check_work_item_id(work_item_children)
    history.dump()
    view.push("設定・履歴データを更新中...完了")
    view.space()

    view.push("WorkItemの一覧を作成中...")
    html.flush_work_item_tree(time_tracker_info.work_items)
    view.push("WorkItemの一覧を作成中...完了")
    view.space()
    view.line()

    view.push("以下の日程にスケジュールを登録します。")
    enable_schedules = get_enable_schedule(ignore, schedules)
    for schedule in enable_schedules:
        view.push(schedule.get_text())
    view.line()
    view.space()

    view.push("作業IDの入力を開始...")
    # 有効なイベントを取得
    enable_events = get_enable_events(ignore, events)
    event_work_item_pairs = linking_event_work_item(
        view, settings, history, enable_events, work_item_children
    )
    view.push("作業IDの入力を開始...完了")
    view.space()

    view.push("イベント時間調整を開始...")
    # 有給休暇のスケジュールを取得
    paid_leave_schedules = [
        schedule for schedule in schedules if schedule.is_paid_leave
    ]
    # 有効なスケジュールを取得
    time_tracker_day_tasks = get_day_task(
        settings=settings,
        project=time_tracker_info.project,
        schedules=enable_schedules,
        paid_leave_schedules=paid_leave_schedules,
        event_work_item_pairs=event_work_item_pairs,
        work_item_children=work_item_children,
    )
    view.push("イベント時間調整を開始...完了")
    view.space()

    view.push("イベント登録処理を開始...")
    html.flush_schedule(time_tracker_day_tasks)
    if is_register:
        await run_register_task_async(view, api, time_tracker_day_tasks)
    view.push("イベント登録処理を開始...完了")
    view.space()

    view.push("後処理を開始...")
    detail_dump(view)
    view.push("後処理を開始...完了")
    view.space()
    view.push("処理が完了しました。")
    view.wait()

    # 更新確認
    enable_auto_update = settings.get_setting_value("enable_auto_update")
    if enable_auto_update:
        update_app.update()
