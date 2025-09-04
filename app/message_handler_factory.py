import importlib.util
import os
from dataclasses import dataclass
from datetime import datetime
from typing import Optional

from .model import Event, Schedule, WorkItem
from .setting import get_data_path


@dataclass
class MessageContext:
    dummy: str = "dummy"


class MessageHandler:
    def __init__(self, instance):
        self._instance = instance

    def get_message(
        self, event: Event, work_item: WorkItem, context: MessageContext
    ) -> Optional[str]:
        if not self._instance:
            raise Exception("MessageHandlerのインスタンスが存在しません。")

        result = self._instance.get_message(
            event.__dict__, work_item.__dict__, context.__dict__
        )

        if result is None:
            return None

        if not isinstance(result, str):
            raise Exception(f"get_messageの返り値が不正です。: {result}")

        return result


class MessageHandlerFactory:
    _instance = None

    def load(self):
        message_handler_path = os.path.join(get_data_path(), "message_handler.py")
        if not os.path.exists(message_handler_path):
            return

        # 動的にモジュールをロード
        spec = importlib.util.spec_from_file_location(
            "message_handler", message_handler_path
        )
        message_handler = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(message_handler)

        # get_message 関数が存在するか確認
        if hasattr(message_handler, "get_message"):
            # callable(getattr(message_handler, "get_message"))
            self._instance = message_handler
        else:
            raise Exception(f"get_message 関数が存在しません。: {message_handler_path}")

    def get_message_handler(self) -> Optional[MessageHandler]:
        if not self._instance:
            return None
        return MessageHandler(self._instance)


if __name__ == "__main__":
    factory = MessageHandlerFactory()
    factory.load()

    event = Event(
        name="example",
        organizer="example",
        is_private=False,
        is_cancelled=False,
        location="example",
        schedule=Schedule(
            start=datetime.now(),
            end=datetime.now(),
        ),
    )

    work_item = WorkItem(
        id="example",
        name="example",
        folder_path="example",
        folder_name="example",
    )

    context = MessageContext()

    message_handler = factory.get_message_handler()

    print(message_handler.get_message(event, work_item, context))
