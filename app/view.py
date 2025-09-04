import getpass
from typing import Literal

from .app_info import app_name, version
from .logger import CustomLogger
from .util import write_file

class AppView:
    def __init__(self):
        self._view_lines = []
        self._logger = CustomLogger(name="AppView")

    def line(self):
        self._write("------------------------------------------------")

    def space(self):
        self._write("")

    def push(self, message: str, warn: bool = False):
        if warn:
            message = f"\033[91m{message}\033[0m"  # ANSI escape code for red text
        self._write(message)

    def wait(self):
        input("続行するには何かキーを押してください")

    def get_password(self) -> str:
        try:
            pwd = getpass.getpass("パスワードを入力してください: ")
            self._view_lines.append("パスワードを入力してください: ********")
            return pwd
        except KeyboardInterrupt:
            self.push("パスワード入力がキャンセルされました")
            return ""

    def get_input(
        self, message: str, /, yes_no=False, history=False
    ) -> tuple[Literal["Cancel", "Yes", "No", ""], str]:
        if yes_no:
            message += "(y/n)"
            _, str = self._input(message, history)
            if str:
                if str.lower() == "y":
                    return "Yes", str
                elif str.lower() == "n":
                    return "No", str
            return "Cancel", ""
        else:
            _, str = self._input(message, history)
            return "", str

    def dump(self, file_path: str):
        success, _ = write_file(file_path, "\r\n".join(self._view_lines))
        if not success:
            self._logger.error(f"ファイルの書き込みに失敗しました。{file_path}")

    def print_app_info(self):
        self.line()
        self.space()
        self.push(f"{app_name()} {version()}")
        self.space()
        self.push(
            "https://github.com/askul/trylion-customer-tools/tree/main/TimeTrackerEX"
        )
        self.space()
        self.space()
        self.line()

    def print_not_register_mode(self):
        self.space()
        self.push("TimeTrackerへの登録は行いません。", warn=True)
        self.push(
            "登録モードで起動する場合は、-rオプションを指定してください。",
            warn=True,
        )
        self.space()

    def _input(self, message: str, history: bool) -> tuple[Literal["Cancel", ""], str]:
        try:
            str = input(
                message + " : ",
            )
            self._view_lines.append(message + " : ")
            if not history:
                self._view_lines.append(str)
            return "", str
        except KeyboardInterrupt:
            return "Cancel", ""
        except EOFError:
            return "Cancel", ""
        finally:
            self._write("")

    def _write(self, message: str):
        print(message)
        self._view_lines.append(message)
