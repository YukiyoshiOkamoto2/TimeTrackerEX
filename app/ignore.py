import json
import os
from dataclasses import dataclass
from typing import Literal, Optional, Union

from .logger import CustomLogger
from .model import Event, Schedule
from .setting import get_data_path
from .util import open_file, write_file


@dataclass
class IgnoreInfo:
    type: Union[Literal["event"]]
    name: str
    matchType: Optional[Union[Literal["contains", "exact"]]] = None


class Ignore:
    def __init__(self):
        self._ignore_items = []
        self._logger = CustomLogger(name="IgnoreEvent")
        self._file_path = os.path.join(get_data_path(), "ignore.json")

    def load(self):
        if not os.path.exists(self._file_path):
            self.dump()
            return

        if os.path.exists(self._file_path):
            result = open_file(self._file_path)
            if not result.is_error():
                try:
                    self._ignore_items = json.loads(result.text)
                except Exception as e:
                    self._logger.warn(f"無視ファイルの読み込みに失敗しました。: {e}")

        self.dump()

    def dump(self):
        success, message = write_file(
            self._file_path,
            json.dumps(
                self._ignore_items,
                indent=4,
                ensure_ascii=False,
                default=lambda x: x.__dict__,
            ),
        )
        if not success:
            raise Exception(f"無視ファイルの保存に失敗しました。: {message}")

    def ignore_event(self, event: Event) -> bool:
        ignore_events = [
            event for event in self._ignore_items if event["type"] == "event"
        ]
        return any(self._match(item, event.name) for item in ignore_events)

    def ignore_schdule(self, schdule: Schedule) -> bool:
        return False

    def _match(self, item: IgnoreInfo, name: str) -> bool:
        targetName = item.get("name")
        if targetName is None:
            return False

        matchType = item.get("matchType") or "exact"
        if matchType == "exact":
            return targetName == name
        else:
            return targetName in name
