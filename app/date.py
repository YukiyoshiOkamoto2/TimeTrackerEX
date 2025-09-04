from datetime import date, datetime, time


def now() -> datetime:
    return datetime.now().astimezone()


def strptime(date_str: str, format: str) -> datetime:
    return datetime.strptime(date_str, format).astimezone()


def combine_datetime(date: date, time: time) -> datetime:
    return datetime.combine(date, time).astimezone()
