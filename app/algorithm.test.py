import copy
import uuid
from datetime import datetime, timedelta

from .algorithm import EventInputInfo, ScheduleInputInfo, TimeTrackerAlgorithm
from .model import Event, Project, Schedule

now = datetime.now().astimezone()
now = now.replace(microsecond=0)

schedule_input_info = ScheduleInputInfo(
    rounding_time_type="backward",
    start_end_type="both",
    start_end_time=30,
)

event_input_info = EventInputInfo(
    event_duplicate_time_compare="small",
    rounding_time_type="nonduplicate",
)

project = Project(
    id="1",
    name="test-project",
    project_id="",
    project_name="",
    project_code="",
)


def _create_event(start, end, name="test-event"):
    return Event(
        uuid=uuid.uuid4().hex,
        name=name,
        schedule=Schedule(start=start, end=end),
        organizer="test-organizer-row",
        location="test-location",
        is_private=False,
        is_cancelled=False,
    )


def _euqal_date_time(
    act: datetime,
    expect: datetime,
    year=None,
    month=None,
    day=None,
    hour=None,
    minute=None,
    second=None,
    microsecond=None,
) -> bool:
    expect_rep = expect.replace(
        year=year if year is not None else expect.year,
        month=month if month is not None else expect.month,
        day=day if day is not None else expect.day,
        hour=hour if hour is not None else expect.hour,
        minute=minute if minute is not None else expect.minute,
        second=second if second is not None else expect.second,
        microsecond=microsecond if microsecond is not None else expect.microsecond,
    )
    result = act == expect_rep
    if not result:
        raise Exception(f"日付が違います。 src:{act}, expect:{expect_rep}")


def test_rounding_time():
    algorithm = TimeTrackerAlgorithm(project, event_input_info, schedule_input_info)

    result = algorithm._rounding_time(now.replace(hour=9, minute=15, second=0), True)
    _euqal_date_time(result, now, hour=9, minute=30, second=0)

    result = algorithm._rounding_time(now.replace(hour=9, minute=0, second=0), True)
    _euqal_date_time(result, now, hour=9, minute=0, second=0)

    result = algorithm._rounding_time(now.replace(hour=9, minute=45, second=0), True)
    _euqal_date_time(result, now, hour=10, minute=0, second=0)

    result = algorithm._rounding_time(now.replace(hour=9, minute=15, second=0), False)
    _euqal_date_time(result, now, hour=9, minute=0, second=0)

    result = algorithm._rounding_time(now.replace(hour=9, minute=0, second=0), False)
    _euqal_date_time(result, now, hour=9, minute=0, second=0)

    result = algorithm._rounding_time(now.replace(hour=9, minute=45, second=0), False)
    _euqal_date_time(result, now, hour=9, minute=30, second=0)

    result = algorithm._rounding_time(now.replace(hour=23, minute=45, second=0), True)
    _euqal_date_time(result, now, day=now.day + 1, hour=0, minute=0, second=0)


def test_rounding_schedule():
    algorithm = TimeTrackerAlgorithm(project, event_input_info, schedule_input_info)

    schedule = Schedule(
        start=now.replace(hour=9, minute=7, second=0),
        end=now.replace(hour=18, minute=49, second=0),
    )

    result = algorithm._rounding_schedule(schedule, "backward")
    _euqal_date_time(result.start, now, hour=9, minute=30, second=0)
    _euqal_date_time(result.end, now, hour=19, minute=0, second=0)

    result = algorithm._rounding_schedule(schedule, "forward")
    _euqal_date_time(result.start, now, hour=9, minute=0, second=0)
    _euqal_date_time(result.end, now, hour=18, minute=30, second=0)

    result = algorithm._rounding_schedule(schedule, "round")
    _euqal_date_time(result.start, now, hour=9, minute=30, second=0)
    _euqal_date_time(result.end, now, hour=18, minute=30, second=0)

    result = algorithm._rounding_schedule(schedule, "half")
    _euqal_date_time(result.start, now, hour=9, minute=0, second=0)
    _euqal_date_time(result.end, now, hour=19, minute=0, second=0)

    result = algorithm._rounding_schedule(schedule, "stretch")
    _euqal_date_time(result.start, now, hour=9, minute=0, second=0)
    _euqal_date_time(result.end, now, hour=19, minute=0, second=0)

    result = algorithm._rounding_schedule(schedule, "nonduplicate", [])
    _euqal_date_time(result.start, now, hour=9, minute=0, second=0)
    _euqal_date_time(result.end, now, hour=19, minute=0, second=0)

    schedule = Schedule(
        start=now.replace(hour=9, minute=7, second=0),
        end=now.replace(hour=9, minute=15, second=0),
    )

    result = algorithm._rounding_schedule(schedule, "backward")
    if result is not None:
        raise Exception(f"丸め処理が正しくありません。:{result}")

    result = algorithm._rounding_schedule(schedule, "forward")
    if result is not None:
        raise Exception(f"丸め処理が正しくありません。:{result}")

    result = algorithm._rounding_schedule(schedule, "round")
    if result is not None:
        raise Exception(f"丸め処理が正しくありません。:{result}")

    result = algorithm._rounding_schedule(schedule, "half")
    _euqal_date_time(result.start, now, hour=9, minute=0, second=0)
    _euqal_date_time(result.end, now, hour=9, minute=30, second=0)

    result = algorithm._rounding_schedule(schedule, "stretch")
    _euqal_date_time(result.start, now, hour=9, minute=0, second=0)
    _euqal_date_time(result.end, now, hour=9, minute=30, second=0)

    result = algorithm._rounding_schedule(schedule, "nonduplicate", [])
    _euqal_date_time(result.start, now, hour=9, minute=0, second=0)
    _euqal_date_time(result.end, now, hour=9, minute=30, second=0)

    schedule = Schedule(
        start=now.replace(hour=9, minute=7, second=0),
        end=now.replace(hour=9, minute=45, second=0),
    )

    result = algorithm._rounding_schedule(schedule, "backward")
    _euqal_date_time(result.start, now, hour=9, minute=30, second=0)
    _euqal_date_time(result.end, now, hour=10, minute=0, second=0)

    result = algorithm._rounding_schedule(schedule, "forward")
    _euqal_date_time(result.start, now, hour=9, minute=0, second=0)
    _euqal_date_time(result.end, now, hour=9, minute=30, second=0)

    result = algorithm._rounding_schedule(schedule, "round")
    if result is not None:
        raise Exception(f"丸め処理が正しくありません。:{result}")

    result = algorithm._rounding_schedule(schedule, "half")
    _euqal_date_time(result.start, now, hour=9, minute=0, second=0)
    _euqal_date_time(result.end, now, hour=10, minute=0, second=0)

    result = algorithm._rounding_schedule(schedule, "stretch")
    _euqal_date_time(result.start, now, hour=9, minute=0, second=0)
    _euqal_date_time(result.end, now, hour=10, minute=0, second=0)

    result = algorithm._rounding_schedule(schedule, "nonduplicate", [])
    _euqal_date_time(result.start, now, hour=9, minute=0, second=0)
    _euqal_date_time(result.end, now, hour=10, minute=0, second=0)

    schedule = Schedule(
        start=now.replace(hour=9, minute=7, second=0),
        end=now.replace(hour=23, minute=45, second=0),
    )

    result = algorithm._rounding_schedule(schedule, "backward")
    _euqal_date_time(result.start, now, hour=9, minute=30, second=0)
    _euqal_date_time(result.end, now, day=now.day + 1, hour=0, minute=0, second=0)

    result = algorithm._rounding_schedule(schedule, "forward")
    _euqal_date_time(result.start, now, hour=9, minute=0, second=0)
    _euqal_date_time(result.end, now, hour=23, minute=30, second=0)

    result = algorithm._rounding_schedule(schedule, "half")
    _euqal_date_time(result.start, now, hour=9, minute=0, second=0)
    _euqal_date_time(result.end, now, day=now.day + 1, hour=0, minute=0, second=0)

    result = algorithm._rounding_schedule(schedule, "round")
    _euqal_date_time(result.start, now, hour=9, minute=30, second=0)
    _euqal_date_time(result.end, now, hour=23, minute=30, second=0)

    result = algorithm._rounding_schedule(schedule, "stretch")
    _euqal_date_time(result.start, now, hour=9, minute=0, second=0)
    _euqal_date_time(result.end, now, day=now.day + 1, hour=0, minute=0, second=0)

    result = algorithm._rounding_schedule(schedule, "nonduplicate", [])
    _euqal_date_time(result.start, now, hour=9, minute=0, second=0)
    _euqal_date_time(result.end, now, day=now.day + 1, hour=0, minute=0, second=0)

    schedule = Schedule(
        start=now.replace(hour=9, minute=14, second=0),
        end=now.replace(hour=10, minute=14, second=0),
    )

    result = algorithm._rounding_schedule(schedule, "half")
    _euqal_date_time(result.start, now, hour=9, minute=0, second=0)
    _euqal_date_time(result.end, now, hour=10, minute=0, second=0)

    schedule = Schedule(
        start=now.replace(hour=9, minute=14, second=0),
        end=now.replace(hour=10, minute=1, second=0),
    )

    result = algorithm._rounding_schedule(schedule, "half")
    _euqal_date_time(result.start, now, hour=9, minute=0, second=0)
    _euqal_date_time(result.end, now, hour=10, minute=0, second=0)

    schedule = Schedule(
        start=now.replace(hour=9, minute=15, second=0),
        end=now.replace(hour=10, minute=15, second=0),
    )

    result = algorithm._rounding_schedule(schedule, "half")
    _euqal_date_time(result.start, now, hour=9, minute=30, second=0)
    _euqal_date_time(result.end, now, hour=10, minute=30, second=0)

    schedule = Schedule(
        start=now.replace(hour=9, minute=15, second=0),
        end=now.replace(hour=10, minute=15, second=0),
    )

    event1 = _create_event(
        now.replace(hour=9, minute=0, second=0),
        now.replace(hour=9, minute=30, second=0),
    )
    event2 = _create_event(
        now.replace(hour=10, minute=30, second=0),
        now.replace(hour=11, minute=0, second=0),
    )

    result = algorithm._rounding_schedule(schedule, "nonduplicate", [event1, event2])
    _euqal_date_time(result.start, now, hour=9, minute=30, second=0)
    _euqal_date_time(result.end, now, hour=10, minute=0, second=0)

    schedule = Schedule(
        start=now.replace(hour=9, minute=30, second=0),
        end=now.replace(hour=10, minute=45, second=0),
    )

    result = algorithm._rounding_schedule(schedule, "nonduplicate", [event1, event2])
    _euqal_date_time(result.start, now, hour=9, minute=30, second=0)
    _euqal_date_time(result.end, now, hour=10, minute=30, second=0)

    schedule = Schedule(
        start=now.replace(hour=9, minute=30, second=0),
        end=now.replace(hour=10, minute=15, second=0),
    )

    result = algorithm._rounding_schedule(schedule, "nonduplicate", [event1, event2])
    _euqal_date_time(result.start, now, hour=9, minute=30, second=0)
    _euqal_date_time(result.end, now, hour=10, minute=30, second=0)

    event1 = _create_event(
        now.replace(hour=9, minute=0, second=0),
        now.replace(hour=9, minute=30, second=0),
    )

    schedule = Schedule(
        start=now.replace(hour=9, minute=15, second=0),
        end=now.replace(hour=10, minute=00, second=0),
    )

    result = algorithm._rounding_schedule(schedule, "nonduplicate", [event1, event2])
    _euqal_date_time(result.start, now, hour=9, minute=30, second=0)
    _euqal_date_time(result.end, now, hour=10, minute=00, second=0)


def test_get_recurrence_event():
    start = now.replace(hour=11, minute=0, second=0)
    end = now.replace(hour=12, minute=0, second=0)
    event = _create_event(start, end)

    recurrence = [now]
    recurrence.extend([now + timedelta(days=i * 7) for i in range(1, 5)])
    event.recurrence = recurrence

    algorithm = TimeTrackerAlgorithm(project, event_input_info, schedule_input_info)
    events = algorithm._get_recurrence_event(event)

    if len(events) != 4:
        raise Exception(f"繰り返しイベントが正しくありません。:{len(events)}")

    _euqal_date_time(
        events[0].schedule.start, now + timedelta(days=7), hour=11, minute=0, second=0
    )
    _euqal_date_time(
        events[0].schedule.end, now + timedelta(days=7), hour=12, minute=0, second=0
    )
    _euqal_date_time(
        events[1].schedule.start, now + timedelta(days=14), hour=11, minute=0, second=0
    )
    _euqal_date_time(
        events[1].schedule.end, now + timedelta(days=14), hour=12, minute=0, second=0
    )
    _euqal_date_time(
        events[2].schedule.start, now + timedelta(days=21), hour=11, minute=0, second=0
    )
    _euqal_date_time(
        events[2].schedule.end, now + timedelta(days=21), hour=12, minute=0, second=0
    )
    _euqal_date_time(
        events[3].schedule.start, now + timedelta(days=28), hour=11, minute=0, second=0
    )
    _euqal_date_time(
        events[3].schedule.end, now + timedelta(days=28), hour=12, minute=0, second=0
    )


def test_schedule_to_event():
    start = now.replace(hour=8, minute=52, second=0)
    end = now.replace(hour=18, minute=12, second=0)
    schedule = Schedule(start=start, end=end)
    algorithm = TimeTrackerAlgorithm(project, event_input_info, schedule_input_info)
    info = copy.deepcopy(schedule_input_info)

    info.start_end_type = "start"
    events = algorithm._schedule_to_event(schedule, info, [])
    if len(events) != 1:
        raise Exception(f"イベントが正しくありません。:{len(events)}")

    _euqal_date_time(events[0].schedule.start, now, hour=9, minute=0, second=0)
    _euqal_date_time(
        events[0].schedule.end, now, hour=9, minute=info.start_end_time, second=0
    )

    info.start_end_type = "end"
    events = algorithm._schedule_to_event(schedule, info, [])
    if len(events) != 1:
        raise Exception(f"イベントが正しくありません。:{len(events)}")

    _euqal_date_time(events[0].schedule.start, now, hour=18, minute=0, second=0)
    _euqal_date_time(
        events[0].schedule.end, now, hour=18, minute=info.start_end_time, second=0
    )

    info.start_end_type = "both"
    info.rounding_time_type = "backward"

    events = algorithm._schedule_to_event(schedule, info, [])
    if len(events) != 2:
        raise Exception(f"イベントが正しくありません。:{len(events)}")

    _euqal_date_time(events[0].schedule.start, now, hour=9, minute=0, second=0)
    _euqal_date_time(
        events[0].schedule.end, now, hour=9, minute=info.start_end_time, second=0
    )
    _euqal_date_time(events[1].schedule.start, now, hour=18, minute=0, second=0)
    _euqal_date_time(
        events[1].schedule.end, now, hour=18, minute=info.start_end_time, second=0
    )

    info.rounding_time_type = "forward"

    events = algorithm._schedule_to_event(schedule, info, [])
    if len(events) != 2:
        raise Exception(f"イベントが正しくありません。:{len(events)}")

    _euqal_date_time(
        events[0].schedule.start, now, hour=8, minute=info.start_end_time, second=0
    )
    _euqal_date_time(events[0].schedule.end, now, hour=9, minute=0, second=0)
    _euqal_date_time(
        events[1].schedule.start, now, hour=17, minute=info.start_end_time, second=0
    )
    _euqal_date_time(events[1].schedule.end, now, hour=18, minute=0, second=0)

    info.rounding_time_type = "round"

    events = algorithm._schedule_to_event(schedule, info, [])
    if len(events) != 2:
        raise Exception(f"イベントが正しくありません。:{len(events)}")

    _euqal_date_time(events[0].schedule.start, now, hour=9, minute=0, second=0)
    _euqal_date_time(
        events[0].schedule.end, now, hour=9, minute=info.start_end_time, second=0
    )
    _euqal_date_time(
        events[1].schedule.start, now, hour=17, minute=info.start_end_time, second=0
    )
    _euqal_date_time(events[1].schedule.end, now, hour=18, minute=0, second=0)

    info.rounding_time_type = "stretch"

    events = algorithm._schedule_to_event(schedule, info, [])
    if len(events) != 2:
        raise Exception(f"イベントが正しくありません。:{len(events)}")

    _euqal_date_time(
        events[0].schedule.start, now, hour=8, minute=info.start_end_time, second=0
    )
    _euqal_date_time(events[0].schedule.end, now, hour=9, minute=0, second=0)
    _euqal_date_time(events[1].schedule.start, now, hour=18, minute=0, second=0)
    _euqal_date_time(
        events[1].schedule.end, now, hour=18, minute=info.start_end_time, second=0
    )

    # 日付をまたいだ場合の確認
    start = now.replace(hour=21, minute=00, second=0)
    end = now.replace(day=now.day + 2, hour=3, minute=45, second=0)
    schedule = Schedule(start=start, end=end)

    info.start_end_type = "both"
    info.rounding_time_type = "backward"
    events = algorithm._schedule_to_event(schedule, info, [])

    if len(events) != 2:
        raise Exception(f"イベントが正しくありません。:{len(events)}")

    if (
        events[0].working_event_type != "start"
        and events[1].working_event_type != "end"
    ):
        raise Exception(f"スケジュール名が正しくありません。:{events}")

    _euqal_date_time(events[0].schedule.start, now, hour=21, minute=0, second=0)
    _euqal_date_time(
        events[0].schedule.end, now, hour=21, minute=info.start_end_time, second=0
    )
    _euqal_date_time(
        events[1].schedule.start,
        now,
        day=end.day,
        hour=3,
        minute=info.start_end_time,
        second=0,
    )
    _euqal_date_time(
        events[1].schedule.end, now, day=end.day, hour=4, minute=0, second=0
    )


def test_schedule_to_event_fill():
    start = now.replace(hour=8, minute=52, second=0)
    end = now.replace(day=now.day + 2, hour=20, minute=36, second=0)
    schedule = Schedule(start=start, end=end)
    algorithm = TimeTrackerAlgorithm(project, event_input_info, schedule_input_info)
    info = copy.deepcopy(schedule_input_info)

    info.start_end_type = "fill"
    info.rounding_time_type = "stretch"
    result = algorithm._schedule_to_event(schedule, info, [])
    if len(result) != 5:
        raise Exception(f"イベントが正しくありません。:{len(result)}")

    result.sort(key=lambda x: x.schedule.start)
    _euqal_date_time(result[0].schedule.start, now, hour=8, minute=30, second=0)
    _euqal_date_time(result[0].schedule.end, now, hour=9, minute=0, second=0)
    _euqal_date_time(result[1].schedule.start, now, hour=9, minute=0, second=0)
    _euqal_date_time(
        result[1].schedule.end,
        now,
        hour=23,
        minute=algorithm._rounding_time_unit,
        second=0,
    )
    _euqal_date_time(
        result[2].schedule.start, now, day=now.day + 1, hour=0, minute=0, second=0
    )
    _euqal_date_time(
        result[2].schedule.end,
        now,
        day=now.day + 1,
        hour=23,
        minute=algorithm._rounding_time_unit,
        second=0,
    )
    _euqal_date_time(
        result[3].schedule.start, now, day=now.day + 2, hour=0, minute=0, second=0
    )
    _euqal_date_time(
        result[3].schedule.end, now, day=now.day + 2, hour=20, minute=30, second=0
    )
    _euqal_date_time(
        result[4].schedule.start, now, day=now.day + 2, hour=20, minute=30, second=0
    )
    _euqal_date_time(
        result[4].schedule.end, now, day=now.day + 2, hour=21, minute=0, second=0
    )

    for event in result:
        if event.working_event_type is None:
            raise Exception(f"イベントが正しくありません。:{event}")

    start = now.replace(hour=8, minute=52, second=0)
    end = now.replace(hour=20, minute=36, second=0)
    schedule = Schedule(start=start, end=end)
    events = [
        _create_event(
            now.replace(hour=9, minute=0, second=0),
            now.replace(hour=9, minute=30, second=0),
        ),
        _create_event(
            now.replace(hour=10, minute=0, second=0),
            now.replace(hour=11, minute=00, second=0),
        ),
        _create_event(
            now.replace(hour=12, minute=30, second=0),
            now.replace(hour=13, minute=30, second=0),
        ),
        _create_event(
            now.replace(hour=13, minute=30, second=0),
            now.replace(hour=15, minute=00, second=0),
        ),
        _create_event(
            now.replace(hour=16, minute=30, second=0),
            now.replace(hour=17, minute=00, second=0),
        ),
        _create_event(
            now.replace(hour=16, minute=30, second=0),
            now.replace(hour=17, minute=30, second=0),
        ),
    ]

    result = algorithm._schedule_to_event(schedule, info, [])
    info.rounding_time_type = "round"
    result = algorithm._schedule_to_event(schedule, info, events)
    if len(result) != 6:
        raise Exception(f"イベントが正しくありません。:{len(result)}")

    for event in result:
        if event.working_event_type is None:
            raise Exception(f"イベントが正しくありません。:{event}")

    result.sort(key=lambda x: x.schedule.start)
    _euqal_date_time(result[0].schedule.start, now, hour=9, minute=0, second=0)
    _euqal_date_time(
        result[0].schedule.end, now, hour=9, minute=info.start_end_time, second=0
    )
    _euqal_date_time(result[1].schedule.start, now, hour=9, minute=30, second=0)
    _euqal_date_time(result[1].schedule.end, now, hour=10, minute=0, second=0)
    _euqal_date_time(result[2].schedule.start, now, hour=11, minute=0, second=0)
    _euqal_date_time(result[2].schedule.end, now, hour=12, minute=30, second=0)
    _euqal_date_time(result[3].schedule.start, now, hour=15, minute=00, second=0)
    _euqal_date_time(result[3].schedule.end, now, hour=16, minute=30, second=0)
    _euqal_date_time(result[4].schedule.start, now, hour=17, minute=30, second=0)
    _euqal_date_time(result[4].schedule.end, now, hour=20, minute=0, second=0)
    _euqal_date_time(result[5].schedule.start, now, hour=20, minute=0, second=0)
    _euqal_date_time(result[5].schedule.end, now, hour=20, minute=30, second=0)


def test_add_start_to_end_date():
    algorithm = TimeTrackerAlgorithm(project, event_input_info, schedule_input_info)

    start = now.replace(hour=11, minute=0, second=0)
    end = now.replace(hour=12, minute=0, second=0) + timedelta(days=1)
    event = _create_event(start, end)
    event2 = event.scheduled(
        Schedule(
            start=now.replace(hour=13, minute=0, second=0),
            end=now.replace(hour=14, minute=0, second=0) + timedelta(days=3),
        )
    )

    event_map = {now.date(): [event, event2]}

    now_date = now.date()
    next_date = (now + timedelta(days=1)).date()
    result = algorithm._add_start_to_end_date(event_map)

    result_keys = result.keys()
    date_list = [
        now_date,
        (now + timedelta(days=1)).date(),
        (now + timedelta(days=2)).date(),
        (now + timedelta(days=3)).date(),
    ]
    if (
        len(result_keys) != len(date_list)
        and date_list[0] not in result_keys
        and date_list[1] not in result_keys
        and date_list[2] not in result_keys
        and date_list[3] not in result_keys
    ):
        raise Exception(f"日付が正しくありません。:{len(result)}")

    print(result[date_list[0]])

    data_count_exp = [2, 2, 1, 1, 1]
    for index, date in enumerate(date_list):
        if len(result[date]) != data_count_exp[index]:
            raise Exception(
                f"{index}:日付に対するイベント数が正しくありません。:{len(result[date])}"
            )

    _euqal_date_time(
        result[now_date][0].schedule.start, now, hour=11, minute=0, second=0
    )
    _euqal_date_time(
        result[now_date][0].schedule.end,
        now,
        hour=23,
        minute=algorithm._rounding_time_unit,
        second=0,
    )
    _euqal_date_time(
        result[next_date][0].schedule.start,
        now,
        day=next_date.day,
        hour=0,
        minute=0,
        second=0,
    )
    _euqal_date_time(
        result[next_date][0].schedule.end,
        now,
        day=next_date.day,
        hour=12,
        minute=0,
        second=0,
    )

    _euqal_date_time(
        result[date_list[0]][1].schedule.start, now, hour=13, minute=0, second=0
    )
    _euqal_date_time(
        result[date_list[0]][1].schedule.end,
        now,
        hour=23,
        minute=algorithm._rounding_time_unit,
        second=0,
    )
    _euqal_date_time(
        result[date_list[1]][1].schedule.start,
        now,
        day=date_list[1].day,
        hour=0,
        minute=0,
        second=0,
    )
    _euqal_date_time(
        result[date_list[1]][1].schedule.end,
        now,
        day=date_list[1].day,
        hour=23,
        minute=algorithm._rounding_time_unit,
        second=0,
    )
    _euqal_date_time(
        result[date_list[2]][0].schedule.start,
        now,
        day=date_list[2].day,
        hour=0,
        minute=0,
        second=0,
    )
    _euqal_date_time(
        result[date_list[2]][0].schedule.end,
        now,
        day=date_list[2].day,
        hour=23,
        minute=algorithm._rounding_time_unit,
        second=0,
    )
    _euqal_date_time(
        result[date_list[3]][0].schedule.start,
        now,
        day=date_list[3].day,
        hour=0,
        minute=0,
        second=0,
    )
    _euqal_date_time(
        result[date_list[3]][0].schedule.end,
        now,
        day=date_list[3].day,
        hour=14,
        minute=0,
        second=0,
    )


def test_search_next_event():
    algorithm = TimeTrackerAlgorithm(project, event_input_info, schedule_input_info)

    events = [
        _create_event(
            now.replace(hour=10, minute=0, second=0),
            now.replace(hour=10, minute=30, second=0),
            "1",
        ),
        _create_event(
            now.replace(hour=10, minute=0, second=0),
            now.replace(hour=11, minute=30, second=0),
            "2",
        ),
        _create_event(
            now.replace(hour=11, minute=0, second=0),
            now.replace(hour=11, minute=30, second=0),
            "3",
        ),
        _create_event(
            now.replace(hour=10, minute=0, second=0),
            now.replace(hour=12, minute=0, second=0),
            "4",
        ),
        _create_event(
            now.replace(hour=13, minute=30, second=0),
            now.replace(hour=15, minute=0, second=0),
            "5",
        ),
        _create_event(
            now.replace(hour=13, minute=0, second=0),
            now.replace(hour=14, minute=0, second=0),
            "6",
        ),
        _create_event(
            now.replace(hour=12, minute=30, second=0),
            now.replace(hour=14, minute=0, second=0),
            "7",
        ),
    ]

    events.sort(key=lambda x: x.schedule.start)

    #
    event = None

    time_compare = "small"
    result = algorithm._search_next_event(event, events, time_compare)
    if result.name != "1":
        raise Exception(f"イベントが正しくありません。:{result.name}")
    _euqal_date_time(result.schedule.start, now, hour=10, minute=0, second=0)
    _euqal_date_time(result.schedule.end, now, hour=10, minute=30, second=0)

    time_compare = "large"
    result = algorithm._search_next_event(event, events, time_compare)
    if result.name != "4":
        raise Exception(f"イベントが正しくありません。:{result.name}")
    _euqal_date_time(result.schedule.start, now, hour=10, minute=0, second=0)
    _euqal_date_time(result.schedule.end, now, hour=12, minute=0, second=0)

    #
    event = _create_event(
        now.replace(hour=10, minute=0, second=0),
        now.replace(hour=10, minute=30, second=0),
    )

    time_compare = "small"
    result = algorithm._search_next_event(event, events, time_compare)
    if result.name != "2":
        raise Exception(f"イベントが正しくありません。:{result.name}")
    _euqal_date_time(result.schedule.start, now, hour=10, minute=30, second=0)
    _euqal_date_time(result.schedule.end, now, hour=11, minute=0, second=0)

    time_compare = "large"
    result = algorithm._search_next_event(event, events, time_compare)
    if result.name != "4":
        raise Exception(f"イベントが正しくありません。:{result.name}")
    _euqal_date_time(result.schedule.start, now, hour=10, minute=30, second=0)
    _euqal_date_time(result.schedule.end, now, hour=12, minute=0, second=0)

    #
    event = _create_event(
        now.replace(hour=10, minute=0, second=0),
        now.replace(hour=13, minute=30, second=0),
    )

    time_compare = "small"
    result = algorithm._search_next_event(event, events, time_compare)
    if result.name != "7":
        raise Exception(f"イベントが正しくありません。:{result.name}")
    _euqal_date_time(result.schedule.start, now, hour=13, minute=30, second=0)
    _euqal_date_time(result.schedule.end, now, hour=14, minute=0, second=0)

    time_compare = "large"
    result = algorithm._search_next_event(event, events, time_compare)
    if result.name != "5":
        raise Exception(f"イベントが正しくありません。:{result.name}")
    _euqal_date_time(result.schedule.start, now, hour=13, minute=30, second=0)
    _euqal_date_time(result.schedule.end, now, hour=15, minute=0, second=0)

    #
    event = _create_event(
        now.replace(hour=10, minute=0, second=0),
        now.replace(hour=14, minute=0, second=0),
    )

    time_compare = "small"
    result = algorithm._search_next_event(event, events, time_compare)
    if result.name != "5":
        raise Exception(f"イベントが正しくありません。:{result.name}")
    _euqal_date_time(result.schedule.start, now, hour=14, minute=0, second=0)
    _euqal_date_time(result.schedule.end, now, hour=15, minute=0, second=0)

    time_compare = "large"
    result = algorithm._search_next_event(event, events, time_compare)
    if result.name != "5":
        raise Exception(f"イベントが正しくありません。:{result.name}")
    _euqal_date_time(result.schedule.start, now, hour=14, minute=0, second=0)
    _euqal_date_time(result.schedule.end, now, hour=15, minute=0, second=0)

    #
    event = _create_event(
        now.replace(hour=9, minute=0, second=0),
        now.replace(hour=9, minute=30, second=0),
    )

    time_compare = "small"
    result = algorithm._search_next_event(event, events, time_compare)
    if result.name != "1":
        raise Exception(f"イベントが正しくありません。:{result.name}")
    _euqal_date_time(result.schedule.start, now, hour=10, minute=0, second=0)
    _euqal_date_time(result.schedule.end, now, hour=10, minute=30, second=0)

    time_compare = "large"
    result = algorithm._search_next_event(event, events, time_compare)
    if result.name != "4":
        raise Exception(f"イベントが正しくありません。:{result.name}")
    _euqal_date_time(result.schedule.start, now, hour=10, minute=0, second=0)
    _euqal_date_time(result.schedule.end, now, hour=12, minute=0, second=0)


def test_marged_schedule_events():
    algorithm = TimeTrackerAlgorithm(project, event_input_info, schedule_input_info)

    events1 = [
        _create_event(
            now.replace(hour=8, minute=0, second=0),
            now.replace(hour=8, minute=30, second=0),
            "1",
        ),  # ×
        _create_event(
            now.replace(hour=8, minute=0, second=0),
            now.replace(hour=9, minute=0, second=0),
            "2",
        ),  # ×
        _create_event(
            now.replace(hour=8, minute=0, second=0),
            now.replace(hour=11, minute=30, second=0),
            "3",
        ),
        _create_event(
            now.replace(hour=9, minute=30, second=0),
            now.replace(hour=11, minute=30, second=0),
            "4",
        ),
        _create_event(
            now.replace(hour=19, minute=30, second=0),
            now.replace(hour=21, minute=0, second=0),
            "5",
        ),
        _create_event(
            now.replace(hour=20, minute=0, second=0),
            now.replace(hour=20, minute=30, second=0),
            "6",
        ),
        _create_event(
            now.replace(hour=20, minute=30, second=0),
            now.replace(hour=21, minute=0, second=0),
            "7",
        ),  # ×
    ]
    events2 = [
        _create_event(
            now.replace(hour=7, minute=0, second=0),
            now.replace(hour=8, minute=30, second=0),
            "1",
        ),  # ×
        _create_event(
            now.replace(hour=6, minute=0, second=0),
            now.replace(hour=8, minute=0, second=0),
            "2",
        ),  # ×
        _create_event(
            now.replace(hour=9, minute=0, second=0),
            now.replace(hour=9, minute=30, second=0),
            "3",
        ),
        _create_event(
            now.replace(hour=9, minute=0, second=0),
            now.replace(hour=11, minute=30, second=0),
            "4",
        ),
        _create_event(
            now.replace(hour=16, minute=30, second=0),
            now.replace(hour=17, minute=0, second=0),
            "5",
        ),
        _create_event(
            now.replace(hour=17, minute=0, second=0),
            now.replace(hour=17, minute=30, second=0),
            "6",
        ),
        _create_event(
            now.replace(hour=18, minute=0, second=0),
            now.replace(hour=21, minute=0, second=0),
            "7",
        ),  # ×
    ]
    events3 = [
        _create_event(
            now.replace(hour=10, minute=0, second=0),
            now.replace(hour=11, minute=30, second=0),
            "1",
        ),
        _create_event(
            now.replace(hour=15, minute=0, second=0),
            now.replace(hour=16, minute=30, second=0),
            "2",
        ),
    ]

    schedule_events1 = [
        _create_event(
            now.replace(hour=9, minute=0, second=0),
            now.replace(hour=9, minute=30, second=0),
            "勤務開始",
        ),
        _create_event(
            now.replace(hour=20, minute=0, second=0),
            now.replace(hour=20, minute=30, second=0),
            "勤務終了",
        ),
    ]
    schedule_events2 = [
        _create_event(
            now.replace(hour=8, minute=30, second=0),
            now.replace(hour=9, minute=0, second=0),
            "勤務開始",
        ),
        _create_event(
            now.replace(hour=17, minute=30, second=0),
            now.replace(hour=18, minute=0, second=0),
            "勤務終了",
        ),
    ]
    schedule_events3 = [
        _create_event(
            now.replace(hour=9, minute=0, second=0),
            now.replace(hour=9, minute=30, second=0),
            "勤務開始",
        ),
        _create_event(
            now.replace(hour=18, minute=30, second=0),
            now.replace(hour=19, minute=0, second=0),
            "勤務終了",
        ),
    ]

    now_date = now.date()
    next_date1 = (now + timedelta(days=1)).date()

    schedule_only_date = (now + timedelta(days=2)).date()
    event_only_date = (now + timedelta(days=3)).date()

    event_map = {
        now_date: events1,
        next_date1: events2,
        event_only_date: events3,
    }
    schedule_map = {
        now_date: schedule_events1,
        next_date1: schedule_events2,
        schedule_only_date: schedule_events3,
    }

    result = algorithm._marged_schedule_events(schedule_map, event_map)

    result_keys = result.keys()
    if (
        len(result_keys) != 3
        or now_date not in result_keys
        or next_date1 not in result_keys
        or schedule_only_date not in result_keys
    ):
        raise Exception(f"日付が正しくありません。:{result_keys}")

    result_event = result[now_date]
    if len(result_event) != 4:
        for i in result_event:
            print(i.name + i.schedule.start.strftime("%Y-%m-%d %H:%M:%S"))
        raise Exception(f"イベントが正しくありません。:{len(result_event)}")

    if result_event[0].name != "3":
        raise Exception(f"イベントが正しくありません。:{result_event[0].name}")
    _euqal_date_time(result_event[0].schedule.start, now, hour=9, minute=0, second=0)
    _euqal_date_time(result_event[0].schedule.end, now, hour=11, minute=30, second=0)
    if result_event[1].name != "4":
        raise Exception(f"イベントが正しくありません。:{result_event[0].name}")
    _euqal_date_time(result_event[1].schedule.start, now, hour=9, minute=30, second=0)
    _euqal_date_time(result_event[1].schedule.end, now, hour=11, minute=30, second=0)
    if result_event[2].name != "5":
        raise Exception(f"イベントが正しくありません。:{result_event[0].name}")
    _euqal_date_time(result_event[2].schedule.start, now, hour=19, minute=30, second=0)
    _euqal_date_time(result_event[2].schedule.end, now, hour=20, minute=30, second=0)
    if result_event[3].name != "6":
        raise Exception(f"イベントが正しくありません。:{result_event[0].name}")
    _euqal_date_time(result_event[3].schedule.start, now, hour=20, minute=0, second=0)
    _euqal_date_time(result_event[3].schedule.end, now, hour=20, minute=30, second=0)

    result_event = result[next_date1]
    if len(result_event) != 6:
        for i in result_event:
            print(i.name + i.schedule.start.strftime("%Y-%m-%d %H:%M:%S"))
        raise Exception(f"イベントが正しくありません。:{len(result_event)}")

    if result_event[0].name != "勤務開始":
        raise Exception(f"イベントが正しくありません。:{result_event[0].name}")
    _euqal_date_time(result_event[0].schedule.start, now, hour=8, minute=30, second=0)
    _euqal_date_time(result_event[0].schedule.end, now, hour=9, minute=0, second=0)
    if result_event[1].name != "3":
        raise Exception(f"イベントが正しくありません。:{result_event[1].name}")
    _euqal_date_time(result_event[1].schedule.start, now, hour=9, minute=0, second=0)
    _euqal_date_time(result_event[1].schedule.end, now, hour=9, minute=30, second=0)
    if result_event[2].name != "4":
        raise Exception(f"イベントが正しくありません。:{result_event[2].name}")
    _euqal_date_time(result_event[2].schedule.start, now, hour=9, minute=0, second=0)
    _euqal_date_time(result_event[2].schedule.end, now, hour=11, minute=30, second=0)
    if result_event[3].name != "5":
        raise Exception(f"イベントが正しくありません。:{result_event[3].name}")
    _euqal_date_time(result_event[3].schedule.start, now, hour=16, minute=30, second=0)
    _euqal_date_time(result_event[3].schedule.end, now, hour=17, minute=0, second=0)
    if result_event[4].name != "6":
        raise Exception(f"イベントが正しくありません。:{result_event[4].name}")
    _euqal_date_time(result_event[4].schedule.start, now, hour=17, minute=0, second=0)
    _euqal_date_time(result_event[4].schedule.end, now, hour=17, minute=30, second=0)
    if result_event[5].name != "勤務終了":
        raise Exception(f"イベントが正しくありません。:{result_event[5].name}")
    _euqal_date_time(result_event[5].schedule.start, now, hour=17, minute=30, second=0)
    _euqal_date_time(result_event[5].schedule.end, now, hour=18, minute=0, second=0)

    result_event = result[schedule_only_date]
    if len(result_event) != 2:
        for i in result_event:
            print(i.name + i.schedule.start.strftime("%Y-%m-%d %H:%M:%S"))
        raise Exception(f"イベントが正しくありません。:{len(result_event)}")

    if result_event[0].name != "勤務開始":
        raise Exception(f"イベントが正しくありません。:{result_event[0].name}")
    _euqal_date_time(result_event[0].schedule.start, now, hour=9, minute=0, second=0)
    _euqal_date_time(result_event[0].schedule.end, now, hour=9, minute=30, second=0)

    if result_event[1].name != "勤務終了":
        raise Exception(f"イベントが正しくありません。:{result_event[1].name}")
    _euqal_date_time(result_event[1].schedule.start, now, hour=18, minute=30, second=0)
    _euqal_date_time(result_event[1].schedule.end, now, hour=19, minute=0, second=0)


def test_clean_duplicate_event():
    algorithm = TimeTrackerAlgorithm(project, event_input_info, schedule_input_info)

    events1 = [
        _create_event(
            now.replace(hour=9, minute=0, second=0),
            now.replace(hour=9, minute=30, second=0),
            "1",
        ),
        _create_event(
            now.replace(hour=9, minute=0, second=0),
            now.replace(hour=10, minute=30, second=0),
            "2",
        ),
        _create_event(
            now.replace(hour=10, minute=0, second=0),
            now.replace(hour=10, minute=30, second=0),
            "3",
        ),
        _create_event(
            now.replace(hour=10, minute=0, second=0),
            now.replace(hour=10, minute=30, second=0),
            "4",
        ),
        _create_event(
            now.replace(hour=10, minute=0, second=0),
            now.replace(hour=11, minute=0, second=0),
            "5",
        ),
        _create_event(
            now.replace(hour=11, minute=30, second=0),
            now.replace(hour=12, minute=30, second=0),
            "6",
        ),
        _create_event(
            now.replace(hour=12, minute=0, second=0),
            now.replace(hour=13, minute=30, second=0),
            "7",
        ),
    ]

    events2 = [
        _create_event(
            now.replace(hour=8, minute=0, second=0),
            now.replace(hour=8, minute=30, second=0),
            "1",
        ),
        _create_event(
            now.replace(hour=12, minute=0, second=0),
            now.replace(hour=13, minute=0, second=0),
            "2",
        ),
        _create_event(
            now.replace(hour=13, minute=0, second=0),
            now.replace(hour=15, minute=30, second=0),
            "3",
        ),
    ]

    now_date = now.date()
    next_date1 = (now + timedelta(days=1)).date()

    event_map = {
        now_date: events1,
        next_date1: events2,
    }

    result = algorithm._clean_duplicate_event(event_map, "small")
    result_event = result[now_date]
    # for i in result_event:
    #     print(f"{i.event.name} : {i.event.schedule.start.strftime('%Y-%m-%d %H:%M:%S')} : {i.event.schedule.end.strftime('%Y-%m-%d %H:%M:%S')}")

    if len(result_event) != 6:
        raise Exception(f"イベントが正しくありません。:{len(result_event)}")

    if result_event[0].name != "1":
        raise Exception(f"イベントが正しくありません。:{result_event[0].name}")
    _euqal_date_time(result_event[0].schedule.start, now, hour=9, minute=0, second=0)
    _euqal_date_time(result_event[0].schedule.end, now, hour=9, minute=30, second=0)

    if result_event[1].name != "2":
        raise Exception(f"イベントが正しくありません。:{result_event[1].name}")
    _euqal_date_time(result_event[1].schedule.start, now, hour=9, minute=30, second=0)
    _euqal_date_time(result_event[1].schedule.end, now, hour=10, minute=0, second=0)

    if result_event[2].name != "3":
        raise Exception(f"イベントが正しくありません。:{result_event[2].name}")
    _euqal_date_time(result_event[2].schedule.start, now, hour=10, minute=0, second=0)
    _euqal_date_time(result_event[2].schedule.end, now, hour=10, minute=30, second=0)

    if result_event[3].name != "5":
        raise Exception(f"イベントが正しくありません。:{result_event[3].name}")
    _euqal_date_time(result_event[3].schedule.start, now, hour=10, minute=30, second=0)
    _euqal_date_time(result_event[3].schedule.end, now, hour=11, minute=0, second=0)

    if result_event[4].name != "6":
        raise Exception(f"イベントが正しくありません。:{result_event[4].name}")
    _euqal_date_time(result_event[4].schedule.start, now, hour=11, minute=30, second=0)
    _euqal_date_time(result_event[4].schedule.end, now, hour=12, minute=30, second=0)

    if result_event[5].name != "7":
        raise Exception(f"イベントが正しくありません。:{result_event[5].name}")
    _euqal_date_time(result_event[5].schedule.start, now, hour=12, minute=30, second=0)
    _euqal_date_time(result_event[5].schedule.end, now, hour=13, minute=30, second=0)

    result_event = result[next_date1]
    if len(result_event) != 3:
        raise Exception(f"イベントが正しくありません。:{len(result_event)}")

    if result_event[0].name != "1":
        raise Exception(f"イベントが正しくありません。:{result_event[0].name}")
    _euqal_date_time(result_event[0].schedule.start, now, hour=8, minute=0, second=0)
    _euqal_date_time(result_event[0].schedule.end, now, hour=8, minute=30, second=0)

    if result_event[1].name != "2":
        raise Exception(f"イベントが正しくありません。:{result_event[1].name}")
    _euqal_date_time(result_event[1].schedule.start, now, hour=12, minute=0, second=0)
    _euqal_date_time(result_event[1].schedule.end, now, hour=13, minute=0, second=0)

    if result_event[2].name != "3":
        raise Exception(f"イベントが正しくありません。:{result_event[2].name}")
    _euqal_date_time(result_event[2].schedule.start, now, hour=13, minute=0, second=0)
    _euqal_date_time(result_event[2].schedule.end, now, hour=15, minute=30, second=0)

    result = algorithm._clean_duplicate_event(event_map, "large")
    result_event = result[now_date]
    if len(result_event) != 4:
        raise Exception(f"イベントが正しくありません。:{len(result_event)}")

    if result_event[0].name != "2":
        raise Exception(f"イベントが正しくありません。:{result_event[0].name}")
    _euqal_date_time(result_event[0].schedule.start, now, hour=9, minute=0, second=0)
    _euqal_date_time(result_event[0].schedule.end, now, hour=10, minute=30, second=0)

    if result_event[1].name != "5":
        raise Exception(f"イベントが正しくありません。:{result_event[1].name}")
    _euqal_date_time(result_event[1].schedule.start, now, hour=10, minute=30, second=0)
    _euqal_date_time(result_event[1].schedule.end, now, hour=11, minute=0, second=0)

    if result_event[2].name != "6":
        raise Exception(f"イベントが正しくありません。:{result_event[2].name}")
    _euqal_date_time(result_event[2].schedule.start, now, hour=11, minute=30, second=0)
    _euqal_date_time(result_event[2].schedule.end, now, hour=12, minute=30, second=0)

    if result_event[3].name != "7":
        raise Exception(f"イベントが正しくありません。:{result_event[3].name}")
    _euqal_date_time(result_event[3].schedule.start, now, hour=12, minute=30, second=0)
    _euqal_date_time(result_event[3].schedule.end, now, hour=13, minute=30, second=0)

    result_event = result[next_date1]
    if len(result_event) != 3:
        raise Exception(f"イベントが正しくありません。:{len(result_event)}")

    if result_event[0].name != "1":
        raise Exception(f"イベントが正しくありません。:{result_event[0].name}")
    _euqal_date_time(result_event[0].schedule.start, now, hour=8, minute=0, second=0)
    _euqal_date_time(result_event[0].schedule.end, now, hour=8, minute=30, second=0)

    if result_event[1].name != "2":
        raise Exception(f"イベントが正しくありません。:{result_event[1].name}")
    _euqal_date_time(result_event[1].schedule.start, now, hour=12, minute=0, second=0)
    _euqal_date_time(result_event[1].schedule.end, now, hour=13, minute=0, second=0)

    if result_event[2].name != "3":
        raise Exception(f"イベントが正しくありません。:{result_event[2].name}")
    _euqal_date_time(result_event[2].schedule.start, now, hour=13, minute=0, second=0)
    _euqal_date_time(result_event[2].schedule.end, now, hour=15, minute=30, second=0)


if __name__ == "__main__":
    test_rounding_time()
    test_rounding_schedule()
    test_schedule_to_event()
    test_get_recurrence_event()
    test_add_start_to_end_date()
    test_schedule_to_event_fill()
    test_search_next_event()
    test_marged_schedule_events()
    test_clean_duplicate_event()
    print("全てのテストが正常に完了しました。")
