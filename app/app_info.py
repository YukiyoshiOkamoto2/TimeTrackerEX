import platform
from typing import Optional

os_name = platform.system()
_is_win = os_name == "Windows"

def is_win() -> bool:
    return _is_win

def app_name() -> str:
    return "Automation TimeTracker Tool"

def version() -> str:
    return "#version"

def app_file_name() -> str:
    return "at3.exe" if is_win else "at3"

def update_file_name() -> str:
    return "at3-update.exe" if is_win() else "at3-update"

def latest_url() -> str:
    return f"https://github.com/YukiyoshiOkamoto2/TimeTrackerEX/releases/download/TimeTrackerEX/latest.json"

def token() -> Optional[str]:
    return "#token"
