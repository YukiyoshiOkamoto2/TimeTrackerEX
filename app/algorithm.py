from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from typing import List, Literal, Optional, Union

from .date import combine_datetime
from .logger import CustomLogger
from .model import DayTask, Event, Project, Schedule


@dataclass
class EventInputInfo:
    event_duplicate_time_compare: Union[Literal["small", "large"]]
    rounding_time_type: Union[
        Literal["backward", "forward", "round", "stretch", "half", "nonduplicate"]
    ]


@dataclass
class ScheduleInputInfo:
    rounding_time_type: Union[
        Literal["backward", "forward", "round", "stretch", "half"]
    ]
    start_end_type: Union[Literal["both", "start", "end", "fill"]]
    start_end_time: int


class TimeTrackerAlgorithm:
    def __init__(
        self,
        project: Project,
        event_input_info: EventInputInfo,
        schedule_input_info: ScheduleInputInfo,
    ):
        """
        初期化処理

        Args:
            project (Project): プロジェクト情報
            event_input_info (EventInputInfo): イベント入力情報
            schedule_input_info (ScheduleInputInfo): スケジュール入力情報

        Raises:
            Exception: 勤務時間設定が未設定の場合に発生
            Exception: 勤務開始終了時間が丸め単位の倍数でない場合に発生
        """

        self._rounding_time_unit = 30
        self._project = project
        self._event_input_info = event_input_info
        self._schedule_input_info = schedule_input_info
        self._logger = CustomLogger(name="TimeTrackerAlgorithm")

        if self._schedule_input_info is None:
            raise Exception("勤務時間設定が未設定です。")

        if self._schedule_input_info.start_end_time % self._rounding_time_unit != 0:
            raise Exception(
                f"勤務開始終了時間は{self._rounding_time_unit}の倍数で設定してください。{self._schedule_input_info.start_end_time}"
            )

    def _is_duplicate_event_or_schedule(
        self, event_or_schedule: Union[Event, Schedule], events: List[Event]
    ) -> bool:
        """イベントまたはスケジュールが重複しているかを判定します。

        Args:
            event_or_schedule (Union[Event, Schedule]): 判定対象のイベントまたはスケジュール
            events (List[Event]): 比較対象のイベントリスト

        Returns:
            bool: 重複している場合はTrue、そうでない場合はFalse
        """

        is_type_event = isinstance(event_or_schedule, Event)
        target_schedule = (
            event_or_schedule.schedule if is_type_event else event_or_schedule
        )
        return any(
            [
                event.schedule.is_overlap(target_schedule)
                for event in events
                if not is_type_event or event.uuid != event_or_schedule.uuid
            ]
        )

    def _rounding_time(self, time: datetime, backward: bool) -> datetime:
        """時間を丸める処理

        Args:
            time (datetime): 丸め対象の時間
            backward (bool): Trueの場合は切り捨て、Falseの場合は切り上げ

        Returns:
            datetime: 丸め後の時間
        """

        mod = time.minute % self._rounding_time_unit
        if mod == 0:
            return time
        if backward:
            return time + timedelta(
                minutes=+self._rounding_time_unit - mod, seconds=0, microseconds=0
            )
        else:
            return time + timedelta(minutes=-mod, seconds=0, microseconds=0)

    def _rounding_schedule(
        self,
        schedule: Schedule,
        rounding_time_type: Union[
            Literal["backward", "forward", "round", "stretch", "half", "nonduplicate"]
        ],
        events: List[Event] = None,
    ) -> Optional[Schedule]:
        """スケジュールを指定された丸めタイプに基づいて丸める処理

        Args:
            schedule (Schedule): 丸め対象のスケジュール
            rounding_time_type (Union[Literal["backward", "forward", "round", "stretch", "half", "nonduplicate"]]): 丸めの種類
            events (List[Event], optional): 重複チェック用のイベントリスト. デフォルトはNone.

        Raises:
            Exception: 丸めタイプが"nonduplicate"の場合にイベントリストが未設定の場合に発生

        Returns:
            Optional[Schedule]: 丸め後のスケジュール. 丸め結果が不正な場合はNoneを返す
        """

        #
        if rounding_time_type == "nonduplicate" and events is None:
            raise Exception("イベントが未設定です。")

        #
        start_minute_mod = schedule.start.minute % self._rounding_time_unit
        end_minute_mod = schedule.end.minute % self._rounding_time_unit
        is_start_rounding = start_minute_mod != 0
        is_end_rounding = end_minute_mod != 0
        if not is_start_rounding and not is_end_rounding:
            return schedule

        start = schedule.start
        end = schedule.end

        if rounding_time_type == "backward":
            #
            if is_start_rounding:
                start = self._rounding_time(start, backward=True)
            if is_end_rounding:
                end = self._rounding_time(end, backward=True)
        elif rounding_time_type == "forward":
            #
            if is_start_rounding:
                start = self._rounding_time(start, backward=False)
            if is_end_rounding:
                end = self._rounding_time(end, backward=False)
        elif rounding_time_type == "round":
            #
            if is_start_rounding:
                start = self._rounding_time(start, backward=True)
            if is_end_rounding:
                end = self._rounding_time(end, backward=False)
        elif rounding_time_type == "stretch":
            #
            if is_start_rounding:
                start = self._rounding_time(start, backward=False)
            if is_end_rounding:
                end = self._rounding_time(end, backward=True)
        elif rounding_time_type == "half":
            #
            if is_start_rounding:
                start = self._rounding_time(
                    start, backward=start_minute_mod >= self._rounding_time_unit / 2
                )
            if is_end_rounding:
                end = self._rounding_time(
                    end, backward=end_minute_mod >= self._rounding_time_unit / 2
                )
        elif rounding_time_type == "nonduplicate":
            #
            if is_start_rounding:
                old_start = start
                start = self._rounding_time(start, backward=False)
                if self._is_duplicate_event_or_schedule(
                    Schedule(
                        is_holiday=schedule.is_holiday, start=start, end=schedule.end
                    ),
                    events,
                ):
                    start = self._rounding_time(old_start, backward=True)
            if is_end_rounding:
                old_end = end
                end = self._rounding_time(end, backward=True)
                if self._is_duplicate_event_or_schedule(
                    Schedule(
                        is_holiday=schedule.is_holiday, start=schedule.start, end=end
                    ),
                    events,
                ):
                    end = self._rounding_time(old_end, backward=False)

        if (
            start == end
            or start > end
            or (end - start) < timedelta(minutes=self._rounding_time_unit)
        ):
            # 丸めた結果、開始時間と終了時間が同じ、または開始時間が終了時間よりも後の場合、または丸めた結果が丸め単位よりも小さい場合はNoneを返す
            self._logger.info(
                f"スケジュールが削除されました。{schedule} -> {start} - {end}"
            )
            return None

        return Schedule(start=start, end=end)

    def _schedule_to_event(
        self,
        schedule: Schedule,
        schedule_input_info: ScheduleInputInfo,
        events: List[Event],
    ) -> List[Event]:
        """スケジュールをイベントに変換する処理

        Args:
            schedule (Schedule): 変換対象のスケジュール
            schedule_input_info (ScheduleInputInfo): スケジュール入力情報
            events (List[Event]): 既存のイベントリスト

        Raises:
            Exception: スケジュールが休日またはエラーの場合に発生

        Returns:
            List[Event]: 変換後のイベントリスト
        """

        if schedule.is_holiday or schedule.end is None or schedule.error_message:
            raise Exception(
                f"スケジュールが休日またはエラーのためイベントに変換できません。{schedule}"
            )

        def get_event(
            name: str,
            schedule: Schedule,
            working_type: Literal["start", "middle", "end"],
        ) -> Event:
            return Event(
                name=name,
                schedule=schedule,
                is_private=False,
                is_cancelled=False,
                location="",
                organizer="Autometic",
                working_event_type=working_type,
            )

        result = []

        start_end_type = schedule_input_info.start_end_type
        start_end_time = schedule_input_info.start_end_time
        rounding_time_type = schedule_input_info.rounding_time_type

        if start_end_type != "end":
            #
            start_schedule = Schedule(
                start=schedule.start,
                end=schedule.start + timedelta(minutes=start_end_time),
            )
            start_schedule = self._rounding_schedule(
                start_schedule, rounding_time_type, events
            )
            if start_schedule is None:
                start_schedule = Schedule(
                    start=schedule.start,
                    end=schedule.start + timedelta(minutes=start_end_time * 2),
                )
                start_schedule = self._rounding_schedule(
                    start_schedule, rounding_time_type, events
                )

            if start_schedule:
                # stretchの場合はstart_end_timeよりも大きい場合はstart_end_timeにする
                if start_schedule.get_range() > timedelta(minutes=start_end_time):
                    start_schedule.end = start_schedule.start + timedelta(
                        minutes=start_end_time
                    )
                result.append(get_event("勤務開始", start_schedule, "start"))
            else:
                self._logger.error(
                    f"勤務開始スケジュールが丸めに失敗しました。{schedule}"
                )

        if start_end_type != "start":
            #
            end_schedule = Schedule(
                start=schedule.end - timedelta(minutes=start_end_time),
                end=schedule.end,
            )
            end_schedule = self._rounding_schedule(
                end_schedule, rounding_time_type, events
            )
            if end_schedule is None:
                end_schedule = Schedule(
                    start=schedule.end - timedelta(minutes=start_end_time * 2),
                    end=schedule.end,
                )
                end_schedule = self._rounding_schedule(
                    end_schedule, rounding_time_type, events
                )
            if end_schedule:
                # stretchの場合はstart_end_timeよりも大きい場合はstart_end_timeにする
                if end_schedule.get_range() > timedelta(minutes=30):
                    end_schedule.start = end_schedule.end - timedelta(minutes=30)
                result.append(get_event("勤務終了", end_schedule, "end"))
            else:
                self._logger.error(
                    f"勤務終了スケジュールが丸めに失敗しました。{schedule}"
                )

        if start_end_type == "fill":
            #
            fill_schedules = []
            for i_day in range(
                0, (end_schedule.end.date() - start_schedule.start.date()).days + 1
            ):
                start_time = None
                end_time = None
                base_date = start_schedule.get_base_date() + timedelta(days=i_day)

                if i_day == 0:
                    start_time = start_schedule.end.time()
                else:
                    start_time = time(hour=0, minute=0, second=0)

                if base_date == end_schedule.get_base_date():
                    end_time = end_schedule.start.time()
                else:
                    # FIXME: 23:59:59にすると重複してしまうため、23:30:00に設定
                    end_time = time(hour=23, minute=self._rounding_time_unit, second=0)

                fill_start = combine_datetime(base_date, start_time)
                fill_end = combine_datetime(base_date, end_time)
                for i_time in range(
                    0,
                    (fill_end - fill_start).seconds // (self._rounding_time_unit * 60),
                ):
                    #
                    fill_schedule = Schedule(
                        is_holiday=schedule.is_holiday,
                        start=fill_start
                        + timedelta(minutes=i_time * self._rounding_time_unit),
                        end=fill_start
                        + timedelta(minutes=(i_time + 1) * self._rounding_time_unit),
                    )
                    # 重複していない場合のみ追加
                    if not self._is_duplicate_event_or_schedule(fill_schedule, events):
                        fill_schedules.append(fill_schedule)

            # 時間が連続している場合は結合する
            if fill_schedules:
                new_fill_schedules = []
                for index, fill_schedule in enumerate(fill_schedules):
                    if index == 0:
                        new_fill_schedules.append(fill_schedule)
                        continue
                    if new_fill_schedules[-1].end == fill_schedule.start:
                        new_fill_schedules[-1].end = fill_schedule.end
                    else:
                        new_fill_schedules.append(fill_schedule)

                fill_schedules = new_fill_schedules

            result.extend(
                [
                    get_event("勤務中", fill_schedule, "middle")
                    for fill_schedule in fill_schedules
                ]
            )

        return result

    def _get_recurrence_event(self, event: Event) -> List[Event]:
        """繰り返しイベントを取得する処理

        Args:
            event (Event): 対象のイベント

        Returns:
            List[Event]: 繰り返しイベントのリスト
        """

        if event.recurrence is None:
            return []

        result = []
        for recurrence in event.recurrence:
            #
            if event.schedule.get_base_date() == recurrence.date():
                continue

            # FIX ME: 繰り返しイベントの場合、初日の日時が変更されたら全部される？
            new_event = event.scheduled(
                Schedule(
                    start=event.schedule.start.replace(
                        year=recurrence.year, month=recurrence.month, day=recurrence.day
                    ),
                    end=event.schedule.end.replace(
                        year=recurrence.year, month=recurrence.month, day=recurrence.day
                    ),
                ),
                uniqe=True,
            )
            new_event.recurrence = None
            result.append(new_event)

        return result

    def _add_start_to_end_date(
        self, event_map: dict[date, List[Event]]
    ) -> dict[date, List[Event]]:
        """イベントの終了日が基準日と異なる場合、終了日までの日付毎に分割したイベントマップを作成します。

        Args:
            event_map (dict[date, List[Event]]): 基準日ごとに分類されたイベントマップ

        Returns:
            dict[date, List[Event]]: 分割後のイベントマップ
        """

        result_map: dict[date, List[Event]] = {}
        for event_date in list(event_map.keys()):
            events = event_map[event_date]
            for event in events:
                if event_date not in result_map:
                    result_map[event_date] = []

                if event_date == event.schedule.end.date():
                    # 終了日が基準日と同じ場合はそのまま追加
                    result_map[event_date].append(event)
                    continue

                # 初日のイベントを追加
                first_schedule = Schedule(
                    start=event.schedule.start,
                    # FIXME: 23:59:59にすると重複してしまうため、23:30:00に設定
                    end=event.schedule.start.replace(
                        hour=23, minute=self._rounding_time_unit, second=0
                    ),
                )
                result_map[event_date].append(event.scheduled(first_schedule))

                # 終了日のイベントを追加
                end_date = event.schedule.end.date()
                for i in range(1, (end_date - event_date).days + 1):
                    base_date = event_date + timedelta(days=i)

                    end_schedule = None
                    if base_date == end_date:
                        #
                        end_schedule = Schedule(
                            is_holiday=event.schedule.is_holiday,
                            start=combine_datetime(base_date, datetime.min.time()),
                            end=event.schedule.end,
                        )
                    else:
                        #
                        end_schedule = Schedule(
                            is_holiday=event.schedule.is_holiday,
                            start=combine_datetime(base_date, datetime.min.time()),
                            # FIXME: 23:59:59にすると重複してしまうため、23:30:00に設定
                            end=combine_datetime(
                                base_date,
                                time(
                                    hour=23, minute=self._rounding_time_unit, second=0
                                ),
                            ),
                        )
                    end_event = event.scheduled(end_schedule, uniqe=True)
                    end_event.recurrence = None
                    if base_date not in result_map:
                        result_map[base_date] = []
                    result_map[base_date].append(end_event)

        return result_map

    def _search_next_event(
        self,
        current_item: Optional[Event],
        events: List[Event],
        time_compare: Literal["small", "large"],
    ) -> Optional[Event]:
        """次のイベントを検索する処理

        Args:
            current_item (Event): 現在のイベント
            events (List[Event]): イベントリスト
            time_compare (Literal['small', 'large']): 時間比較の種類（短い順または長い順）

        Returns:
            Optional[Event]: 次のイベント（存在しない場合はNone）
        """

        if not events:
            return None

        if not current_item:
            next_events = events
            if time_compare == "small":
                # 時間が短い順にソート
                next_events.sort(
                    key=lambda x: (
                        x.schedule.start,
                        x.schedule.get_range().total_seconds(),
                    )
                )
            else:
                # 時間が長い順にソート
                next_events.sort(
                    key=lambda x: (
                        x.schedule.start,
                        -x.schedule.get_range().total_seconds(),
                    )
                )
        else:
            #
            next_events = [
                event
                for event in events
                if event.schedule.end > current_item.schedule.end
            ]

        if not next_events:
            return None

        next_target_events = next_events
        if current_item:
            #
            next_target_events = []
            for event in next_events:
                # 重複しているの場合、終了時間を開始時間に合わせる
                if current_item.schedule.is_overlap(event.schedule):
                    schedule = Schedule(
                        start=current_item.schedule.end, end=event.schedule.end
                    )
                    #
                    if schedule.start != schedule.end:
                        next_target_events.append(event.scheduled(schedule))
                else:
                    next_target_events.append(event)

        if time_compare == "small":
            # 時間が短い順にソート
            next_target_events.sort(
                key=lambda x: (x.schedule.start, x.schedule.get_range().total_seconds())
            )
        else:
            # 時間が長い順にソート
            next_target_events.sort(
                key=lambda x: (
                    x.schedule.start,
                    -x.schedule.get_range().total_seconds(),
                )
            )

        next_target = next_target_events[0]
        over_wrap_events = [
            event
            for event in next_target_events
            if event.schedule.is_overlap(next_target.schedule)
        ]
        if not over_wrap_events:
            return next_target

        if time_compare == "small":
            over_wrap_events.sort(key=lambda x: x.schedule.get_range().total_seconds())
        else:
            over_wrap_events.sort(key=lambda x: -x.schedule.get_range().total_seconds())

        compare_event = over_wrap_events[0]
        if (
            next_target.schedule.get_range().total_seconds()
            <= compare_event.schedule.get_range().total_seconds()
        ):
            return next_target
        new_schedule = Schedule(
            start=next_target.schedule.start, end=compare_event.schedule.start
        )
        return next_target.scheduled(new_schedule)

    def _marged_schedule_events(
        self,
        schedule_event_map: dict[date, List[Event]],
        event_map: dict[date, List[Event]],
    ) -> dict[date, List[Event]]:
        """勤務時間イベントと通常イベントを統合する処理

        Args:
            schedule_event_map (dict[date, List[Event]]): 勤務時間イベントを日付ごとに分類したマップ
            event_map (dict[date, List[Event]]): 通常イベントを日付ごとに分類したマップ

        Returns:
            dict[date, List[Event]]: 統合後の日付ごとのイベントマップ
        """

        result_map: dict["date", List[Event]] = {}

        for event_date, events in schedule_event_map.items():
            if len(events) < 2:
                self._logger.warn(
                    f"勤務時間イベントが2つ未満のため、処理をスキップします。{event_date}"
                )
                continue

            #
            sorted_schedule_events = sorted(events, key=lambda x: x.schedule.start)
            start_item = sorted_schedule_events[0]
            end_item = sorted_schedule_events[-1]

            if len(sorted_schedule_events) > 2:
                sorted_schedule_events = sorted_schedule_events[1:-1]
            else:
                sorted_schedule_events = []

            result_event = []

            events = event_map.get(event_date)
            if events:
                #
                is_start_schedule_overlap = False
                is_end_schedule_overlap = False

                #
                for event in events:
                    if (
                        start_item.schedule.start >= event.schedule.end
                        or end_item.schedule.end <= event.schedule.start
                    ):
                        # 勤務時間外のイベントは削除
                        continue

                    #
                    if start_item.schedule.is_overlap(event.schedule):
                        is_start_schedule_overlap = True
                        event = event.scheduled(
                            Schedule(
                                start=start_item.schedule.start, end=event.schedule.end
                            )
                        )
                    if end_item.schedule.is_overlap(event.schedule):
                        is_end_schedule_overlap = True
                        event = event.scheduled(
                            Schedule(
                                start=event.schedule.start, end=end_item.schedule.end
                            )
                        )

                    result_event.append(event)

                #
                if not is_start_schedule_overlap:
                    result_event.append(start_item)
                if not is_end_schedule_overlap:
                    result_event.append(end_item)

                result_event.extend(sorted_schedule_events)
                result_event.sort(key=lambda x: x.schedule.start)

            else:
                #
                result_event.append(start_item)
                result_event.extend(sorted_schedule_events)
                result_event.append(end_item)

            result_map[event_date] = result_event

        return result_map

    def _clean_duplicate_event(
        self,
        event_map: dict[date, List[Event]],
        time_compare: Literal["small", "large"],
    ) -> dict[date, List[Event]]:
        """イベントの重複を解消する処理

        Args:
            event_map (dict[date, List[Event]]): 日付ごとに分類されたイベントマップ
            time_compare (Literal['small', 'large']): 時間比較の種類（短い順または長い順）

        Returns:
            dict[date, List[Event]]: 重複解消後の日付ごとのイベントマップ
        """

        result_map: dict[date, List[Event]] = {}

        for event_date, events in event_map.items():
            if not events:
                self._logger.warn(
                    f"イベントが存在しないため、処理をスキップします。{event_date}"
                )
                continue

            if time_compare == "small":
                events.sort(
                    key=lambda x: (
                        x.schedule.start,
                        x.schedule.get_range().total_seconds(),
                    )
                )
            else:
                events.sort(
                    key=lambda x: (
                        x.schedule.start,
                        -x.schedule.get_range().total_seconds(),
                    )
                )

            #
            currnt_item = None
            result_list = []
            while True:
                currnt_item = self._search_next_event(currnt_item, events, time_compare)
                if currnt_item is None:
                    break
                result_list.append(currnt_item)
                events = [event for event in events if event.uuid != currnt_item.uuid]

            result_map[event_date] = result_list

        return result_map

    def _is_ignore_event(self, event: Event) -> bool:
        """イベントを無視するかどうかを判定します。

        Args:
            event (Event): 判定対象のイベント

        Returns:
            bool: 無視する場合はTrue、そうでない場合はFalse
        """

        return False

    def _check_event(self, events: List[Event]) -> List[Event]:
        """イベントのチェック処理

        Args:
            events (List[Event]): チェック対象のイベントリスト

        Returns:
            List[Event]: チェック後の有効なイベントリスト
        """

        max_time = 6 * 60 * 60
        max_old = 30

        now = datetime.now().astimezone()
        old = now - timedelta(days=max_old)

        result = []
        for event in events:
            # 6時間以上のイベントは削除
            if event.schedule.get_range().total_seconds() > max_time:
                self._logger.error(f"イベントが6時間以上のため、削除します。{event}")
                continue

            #
            if now < event.schedule.end:
                self._logger.error(f"イベントが未来のため、削除します。{event}")
                continue

            #
            if event.schedule.end < old:
                self._logger.error(
                    f"イベントが{max_old}日以上前のため、削除します。{event}"
                )
                continue

            #
            if (
                event.schedule.start == event.schedule.end
                or event.schedule.get_range().total_seconds()
                < self._rounding_time_unit * 60
            ):
                self._logger.error(
                    f"イベントの開始終了時間が不正なため、削除します。{event}"
                )
                continue

            result.append(event)

        return result

    def split_one_day_task(
        self, events: List[Event], schedules: List[Schedule]
    ) -> List[DayTask]:
        """1日のタスクを分割する処理

        Args:
            events (List[Event]): イベントリスト
            schedules (List[Schedule]): スケジュールリスト

        Returns:
            List[DayTask]: 分割された1日ごとのタスクリスト
        """

        if not events:
            self._logger.warn("イベントが存在しません。")
            # return []

        if not schedules:
            self._logger.warn("勤務時間が存在しません。")
            # return []

        events.sort(key=lambda x: x.schedule.get_base_date())

        day_map: dict[date, List[Event]] = {}
        for event in events:
            # イベントの無視設定がある場合、無視する
            if self._is_ignore_event(event):
                continue

            # イベントの基準日に分割
            event_date = event.schedule.get_base_date()
            if event_date not in day_map:
                day_map[event_date] = []
            day_map[event_date].append(event)

            # イベントの繰り返し設定がある場合、繰り返し日毎に分割したものを追加
            for recurrence_event in self._get_recurrence_event(event):
                event_date = recurrence_event.schedule.get_base_date()
                if event_date not in day_map:
                    day_map[event_date] = []
                day_map[event_date].append(recurrence_event)

        min_date = min([schedule.get_base_date() for schedule in schedules])
        max_date = max([schedule.get_base_date() for schedule in schedules])
        # 勤務時間範囲外のイベントは削除
        for event_date in list(day_map.keys()):
            if event_date < min_date or event_date > max_date:
                del day_map[event_date]

        # イベントの終了日が基準日と異なる場合、終了日までの日付毎に分割したものを追加
        day_map = self._add_start_to_end_date(day_map)

        # イベント丸め処理
        rounded_event_map: dict[date, List[Event]] = {}
        for event_date, events in day_map.items():
            rounded_events = []
            for event in events:
                schedule = self._rounding_schedule(
                    event.schedule, self._event_input_info.rounding_time_type, events
                )
                if schedule:
                    rounded_events.append(event.scheduled(schedule))

            rounded_event_map[event_date] = rounded_events

        # 勤務時間をイベントに変換And丸め処理
        schedule_event_map: dict[date, List[Event]] = {}
        events = [event for _, events in rounded_event_map.items() for event in events]
        for schedule in schedules:
            for event in self._schedule_to_event(
                schedule, self._schedule_input_info, events
            ):
                event_date = event.schedule.get_base_date()
                if event_date not in schedule_event_map:
                    schedule_event_map[event_date] = []
                schedule_event_map[event_date].append(event)

        # イベントを勤務開始終了時間に合わせるor勤務時間外を消す、重複した場合は勤務時間イベントを消す
        rounded_event_map = self._marged_schedule_events(
            schedule_event_map, rounded_event_map
        )

        # 重複を解消
        rounded_event_map = self._clean_duplicate_event(
            rounded_event_map, self._event_input_info.event_duplicate_time_compare
        )

        result = []
        # イベントを日毎に分割
        for event_date, events in rounded_event_map.items():
            # 不正なイベントを削除
            events = self._check_event(events)
            result.append(
                DayTask(
                    base_date=event_date,
                    project=self._project,
                    events=[
                        event for event in events if event.working_event_type is None
                    ],
                    schedule_events=[
                        event
                        for event in events
                        if event.working_event_type is not None
                    ],
                )
            )

        return result
