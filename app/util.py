import json
import os
from dataclasses import dataclass
from typing import Any, Optional, Tuple, Union

from .logger import CustomLogger

logger = CustomLogger(name=__name__)


@dataclass
class OpenFileResult:
    text: str = ""
    error_message: str = None

    def is_error(self) -> bool:
        return self.error_message is not None


def safe_json_dumps(data: Any, ensure_ascii=False, indent=4) -> Optional[str]:
    try:
        return json.dumps(data, ensure_ascii=ensure_ascii, indent=indent)
    except Exception as e:
        logger.warn(f"JSON dumps error: {e}")
        return None


def safe_json_loads(json_str: str) -> Optional[dict]:
    try:
        return json.loads(json_str)
    except Exception as e:
        logger.warn(f"JSON loads error: {e}")
        return None


def open_file(file_path: str, encoding="utf-8") -> OpenFileResult:
    result = OpenFileResult()
    try:
        with open(file_path, "r", encoding=encoding) as file:
            result.text = file.read()
    except FileNotFoundError:
        result.error_message = f"File not found: {file_path}"
    except Exception as e:
        result.error_message = f"Open filr error: {e}"

    return result


def write_file(file_path: str, text: str, encoding="utf-8") -> Tuple[bool, str]:
    try:
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        with open(file_path, "w", encoding=encoding) as file:
            file.write(text)
    except Exception as e:
        return False, f"Write file error: {e}"

    return True, ""


def get_value_or_none(json_data: Union[str, dict, list], path: str) -> Any:
    try:
        if isinstance(json_data, str):
            value = json.loads(json_data)
        else:
            value = json_data

        # パスを分割してリストに変換
        keys = path.strip("][").split("][")
        for key in keys:
            # 数字であればリストインデックスとして処理
            if key.isdigit():
                value = value[int(key)]
            else:
                value = value[key]
        return value
    except (KeyError, IndexError, TypeError):
        logger.warn(f"KeyError or IndexError or TypeError: {path} to {json_data}")
        return None
