import datetime
from os import path
from typing import List

from .logger import CustomLogger
from .model import Event, Schedule, WorkItem
from .setting import get_data_path
from .util import open_file, write_file

config = {
    "file_path": path.join(get_data_path(), "history"),
    "history_max_size": 300,
}


class TimeTrackerHistory:
    def __init__(self):
        self._history = {}
        self._file_path = config["file_path"]
        self._history_max_size = config["history_max_size"]
        self._logger = CustomLogger(name="TimeTrackerHistory")

    def load(self):
        result = open_file(self._file_path)
        if result.is_error():
            self._logger.warn(
                f"{self._file_path}の読み込みに失敗しました。：{result.error_message}"
            )
            self.dump()
            return

        self._history = {}
        lines = result.text.splitlines()
        if lines:
            # lines.reverse()
            for line in lines[0 : self._history_max_size]:
                split = line.strip().split("=")
                if len(split) == 2:
                    self._history.update({split[0]: split[1]})
                else:
                    self._logger.warn(f"不正な文字列です。：{line}")

    def dump(self):
        text = "\n".join(f"{key}={value}" for key, value in self._history.items())
        success, error_message = write_file(self._file_path, text)
        if not success:
            self._logger.error(
                f"{self._file_path}の書き込みに失敗しました：{error_message}"
            )

    def check_work_item_id(self, work_items: List[WorkItem]):
        work_item_map = {item.id: item for item in work_items}
        for key, value in list(self._history.items()):
            if work_item_map.get(value) is None:
                self._logger.debug(f"Removing invalid entry: {key}={value}")
                del self._history[key]

    def get_work_item_id(self, event: Event) -> str:
        return self._history.get(self._get_key(event), None)

    def set_history(self, event: Event, item: WorkItem):
        if len(self._history) > self._history_max_size:
            oldest_key = next(iter(self._history))
            self._logger.debug(
                f"Removing oldest entry: {oldest_key}={self._history[oldest_key]}"
            )
            del self._history[oldest_key]
        self._history.update({self._get_key(event): item.id})

    def _get_key(self, event: Event):
        return event.get_key().replace("=", "%3D")


if __name__ == "__main__":
    h = TimeTrackerHistory()

    h.load()
    print(h._history)

    schedule = Schedule(start=datetime.datetime.now(), end=datetime.datetime.now())
    print(
        h.get_work_item_id(
            Event(
                name="1",
                uuid="123",
                organizer="2",
                location=None,
                is_private=False,
                is_cancelled=False,
                schedule=schedule,
                recurrence=None,
            )
        )
    )

    h.set_history(
        Event(
            name="1",
            uuid="123",
            organizer="2",
            location=None,
            is_private=False,
            is_cancelled=False,
            schedule=schedule,
            recurrence=None,
        ),
        WorkItem(id="123", name="aa", folder_name="bb", folder_path="cc"),
    )
    h.set_history(
        Event(
            name="2",
            uuid="123",
            organizer="2",
            location=None,
            is_private=False,
            is_cancelled=False,
            schedule=schedule,
            recurrence=None,
        ),
        WorkItem(id="456", name="aa", folder_name="bb", folder_path="cc"),
    )

    h.dump()
