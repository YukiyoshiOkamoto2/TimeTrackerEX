import json
import os
from dataclasses import dataclass
from typing import Any, List, Optional, Union

from .logger import CustomLogger
from .model import WorkItem
from .util import open_file, write_file
from .view import AppView


def get_desk_path() -> str:
    return ".desk"


def get_data_path() -> str:
    return ".data"


class SingletonMeta(type):
    """シングルトンメタクラス"""

    _instances = {}

    def __call__(cls, *args, **kwargs):
        if cls not in cls._instances:
            cls._instances[cls] = super().__call__(*args, **kwargs)
        return cls._instances[cls]


SettingValueClass = Union[str, bool, int, dict, List[str]]


@dataclass
class SettingsValueInfo:
    name: str
    required: bool
    type: SettingValueClass
    description: str = None
    default: SettingValueClass = None
    type_literals: Union[List[str], List[int]] = None
    dict_children: dict["SettingsValueInfo"] = None

    def __post_init__(self):
        if not self.description:
            self.description = self.name

        if self.default is not None:
            if self.type is not type(self.default):
                raise Exception(
                    f"typeとdefaultの値の型を合わせる必要があります。{self}"
                )

        if self.dict_children and self.type is not dict:
            raise Exception(f"dict_childrenはdict型の場合のみ使用できます。{self}")

        if self.type_literals and self.type not in [str, int]:
            raise Exception(f"type_literalsはstr, int型の場合のみ使用できます。{self}")

        if self.type is dict:
            if self.type is dict and self.dict_children is None:
                raise Exception(f"dict型の場合、dict_childrenは必須です。{self}")
            if self.required:
                if not any(c.required for c in self.dict_children.values()):
                    raise Exception(
                        f"必須のdict型の場合、dict_childrenのいずれかはrequired=Trueにする必要があります。{self}"
                    )

    def __repr__(self):
        return f"""
name: {self.name}
description: {self.description}
"""


class Settings(metaclass=SingletonMeta):
    _key_name_map: dict[str, SettingsValueInfo] = {
        "user_name": SettingsValueInfo(
            name="ユーザー名(ログイン名)",
            required=True,
            type=str,
        ),
        "base_url": SettingsValueInfo(
            name="TimeTrackerのベースURL",
            required=True,
            type=str,
        ),
        "base_project_id": SettingsValueInfo(
            name="プロジェクトID", required=True, type=int
        ),
        "enable_auto_update": SettingsValueInfo(
            name="自動更新の有効",
            required=False,
            type=bool,
            default=True,
        ),
        "is_history_auto_input": SettingsValueInfo(
            name="履歴からのスケジュール自動入力",
            required=False,
            type=bool,
            default=True,
        ),
        "rounding_time_type_of_event": SettingsValueInfo(
            name="イベント時間の丸め方法",
            required=True,
            type=str,
            type_literals=[
                "backward",
                "forward",
                "round",
                "half",
                "stretch",
                "nonduplicate",
            ],
            default="nonduplicate",
            description="""
30分単位でのイベント時間の丸め方法を設定します。
backward: 開始終了時間を切り上げる
　→開始：9時15分 → 9時30分
　→終了：17時45分 → 18時00分
forward: 開始終了時間を切り捨て丸める
　→開始：9時15分 → 9時00分
　→終了：17時45分 → 17時30分
half: 開始終了時間が15分未満の場合、0分に丸めます。
　→開始：9時15分 → 9時30分
　→終了：17時44分 → 17時30分
round: 開始終了時間を短くなるように丸めます。
　→開始：10時15分 → 10時30分
　→終了：11時15分 → 11時00分
※開始・終了時間が同じ場合は、イベントを削除します。
stretch: 開始終了時間を長くなるように丸めます。
　→開始：10時15分 → 10時00分
　→終了：11時15分 → 11時30分
nonduplicate: 開始・終了時間それぞれ重複しない場合、長くなるように丸めます。
              重複する場合、短くなるように丸めます。
""",
        ),
        "time_off_event": SettingsValueInfo(
            name="休暇イベントの設定",
            required=False,
            type=dict,
            description="""
休暇イベントの設定を行います。
""",
            dict_children={
                "name_of_event": SettingsValueInfo(
                    name="イベント名",
                    required=True,
                    type=List[str],
                    description="""
休暇イベントのイベント名を設定します。
例：['有給', 'ランチ', '休暇', 'お休み']
""",
                ),
                #                 "start_time": SettingsValueInfo(
                #                     name="休憩の開始時間(HH:MM)",
                #                     required=False,
                #                     type=List[str],
                #                     description="""
                # 休憩の開始時間を設定します。
                # """,
                #                 ),
                #                 "end_time": SettingsValueInfo(
                #                     name="休憩の終了時間(HH:MM)",
                #                     required=False,
                #                     type=List[str],
                #                     description="""
                # 休憩の終了時間を設定します。
                # """,
                #                 ),
                "work_item_id": SettingsValueInfo(
                    name="休暇WorkItemID",
                    required=True,
                    type=int,
                ),
            },
        ),
        "event_duplicate_priority": SettingsValueInfo(
            name="イベント重複時の優先判定",
            required=True,
            type=dict,
            dict_children={
                "time_compare": SettingsValueInfo(
                    name="時間の比較による優先度判定",
                    required=True,
                    type=str,
                    type_literals=["small", "large"],
                    default="small",
                    description="""
イベントの時間の比較による優先度判定を設定します。
small: 時間が短いイベントを優先します。
       より細かくイベントが登録されます。
large: 時間が長いイベントを優先します。
       より大きなイベントが登録されます。
""",
                ),
                # 'recurrence_emphasis': SettingsValueInfo(
                #     name='繰り返し設定の優先',
                #     required=False,
                #     type=bool,
                # )
            },
        ),
        "schedule_auto_input_info": SettingsValueInfo(
            name="勤務時間の自動入力設定",
            required=True,
            type=dict,
            description="""
勤務時間の自動入力設定を行います。
""",
            dict_children={
                "start_end_type": SettingsValueInfo(
                    name="開始終了時間の自動入力タイプ",
                    required=True,
                    type=str,
                    type_literals=["both", "start", "end", "fill"],
                    default="both",
                    description="""
勤務時間の開始終了時間の自動入力タイプを設定します。
both: 開始・終了時間を自動入力します。
start: 開始時間のみ自動入力します。
end: 終了時間のみ自動入力します。
fill: 開始・終了時間の間でイベントと重複しない時間を自動入力します。
""",
                ),
                "rounding_time_type_of_schedule": SettingsValueInfo(
                    name="勤務時間の丸め方法",
                    required=True,
                    type=str,
                    type_literals=["backward", "forward", "half", "round", "stretch"],
                    default="half",
                    description="""
30分単位での勤務時間の丸め方法を設定します。
backward: 開始終了時間を切り上げる
　→開始：9時15分 → 9時30分
　→終了：17時45分 → 18時00分
forward: 開始終了時間を切り捨て丸める
　→開始：9時15分 → 9時00分
　→終了：17時45分 → 17時30分
half: 開始終了時間が15分未満の場合、0分に丸めます。
　→開始：9時15分 → 9時30分
　→終了：17時44分 → 17時30分
round: 開始終了時間を短くなるように丸めます。
　→開始：10時15分 → 10時30分
　→終了：11時15分 → 11時00分
※開始・終了時間が同じ場合は、イベントを削除します。
stretch: 開始終了時間を長くなるように丸めます。
　→開始：10時15分 → 10時00分
　→終了：11時15分 → 11時30分
""",
                ),
                "start_end_time": SettingsValueInfo(
                    name="自動入力時間（分）",
                    required=True,
                    type=int,
                    type_literals=[30, 60, 90],
                    default=30,
                    description="""
勤務時間の開始終了時間の自動入力時間を設定します。
""",
                ),
                "work_item_id": SettingsValueInfo(
                    name="自動入力WorkItemID",
                    required=True,
                    type=int,
                ),
            },
        ),
        "paid_leave_input_info": SettingsValueInfo(
            name="有給休暇の自動入力設定",
            required=False,
            type=dict,
            description="""
有給休暇の自動入力設定を行います。
""",
            dict_children={
                "work_item_id": SettingsValueInfo(
                    name="有給休暇のWorkItemID",
                    required=True,
                    type=int,
                ),
                "start_time": SettingsValueInfo(
                    name="有給休暇の開始時間",
                    required=True,
                    type=str,
                    default="09:00",
                    description="""
有給休暇の開始時間を設定します。
""",
                ),
                "end_time": SettingsValueInfo(
                    name="有給休暇の終了時間",
                    required=True,
                    type=str,
                    default="17:30",
                    description="""
有給休暇の終了時間を設定します。
""",
                ),
            },
        ),
    }

    def __init__(self, view: AppView):
        self._settings = None
        self._view = view
        self._logger = CustomLogger(name="Settings")
        self._file_path = os.path.join(get_data_path(), "settings.json")

    def get_help_text(self) -> str:
        return "\n".join(
            [
                f"{key_info.name} : {key_info.description}"
                for key_info in self._key_name_map.values()
            ]
        )

    def load(self) -> dict:
        if self._settings is not None:
            return self._settings

        self._settings = None
        if os.path.exists(self._file_path):
            result = open_file(self._file_path)
            if not result.is_error():
                try:
                    self._settings = json.loads(result.text)
                except Exception:
                    pass

        self._settings = self._request_input(settings=self._settings)
        self.save()
        return self._settings

    def save(self):
        self._request_input(settings=self._settings, check_only=True)
        success, message = write_file(
            self._file_path, json.dumps(self._settings, ensure_ascii=False, indent=4)
        )
        if not success:
            raise Exception(f"設定ファイルの保存に失敗しました。: {message}")

    def get_setting_value(self, key: str) -> SettingValueClass:
        if self._settings is None:
            raise Exception("設定値が読み込まれていません。")

        value = self._settings.get(key)
        key_info = self._key_name_map.get(key)
        if key_info is None:
            raise Exception(f"設定値が見つかりません。: {key}")

        result, message = self._check_setting_value(value, key_info)
        if not result:
            raise Exception(message)

        if value is None:
            return key_info.default
        
        return value

    def set_setting_value(
        self, key: str, value: SettingValueClass
    ) -> Union[str, bool, int, dict]:
        if self._settings is None:
            raise Exception("設定値が読み込まれていません。")

        key_info = self._key_name_map.get(key)
        if key_info is None:
            raise Exception(f"設定値が見つかりません。: {key}")

        result, message = self._check_setting_value(value, key_info)
        if not result:
            raise Exception(message)

        self._settings[key] = value
        return value

    def check_setting_work_item(self, work_item_children: List[WorkItem]):
        # 勤務時間の自動入力設定のWorkItemIDを確認
        schedule_auto_input_info = self.get_setting_value("schedule_auto_input_info")
        if schedule_auto_input_info:
            work_item_id = schedule_auto_input_info.get("work_item_id", None)
            if work_item_id:
                if not any(
                    [item.id == str(work_item_id) for item in work_item_children]
                ):
                    raise Exception(
                        f"勤務時間の自動入力設定の指定されたWorkItemIDが見つかりません。{work_item_id}"
                    )

        # 休暇の自動入力設定のWorkItemIDを確認
        time_off_event = self.get_setting_value("time_off_event")
        if time_off_event:
            work_item_id = time_off_event.get("work_item_id", None)
            if work_item_id:
                if not any(
                    [item.id == str(work_item_id) for item in work_item_children]
                ):
                    raise Exception(
                        f"休暇の自動入力設定の指定されたWorkItemIDが見つかりません。{work_item_id}"
                    )

        # 有給休暇の自動入力設定のWorkItemIDを確認
        paid_leave_input_info = self.get_setting_value("paid_leave_input_info")
        if paid_leave_input_info:
            work_item_id = paid_leave_input_info.get("work_item_id", None)
            if work_item_id:
                if not any(
                    [item.id == str(work_item_id) for item in work_item_children]
                ):
                    raise Exception(
                        f"有給休暇の自動入力設定の指定されたWorkItemIDが見つかりません。{work_item_id}"
                    )

    def _request_input(
        self,
        settings: Optional[dict],
        check_only: bool = False,
        key_name_map: dict[str, SettingsValueInfo] = None,
    ) -> dict[str, Union[dict, str, bool, int, None]]:
        result_settings = {}
        key_name_map = key_name_map or self._key_name_map
        for key, key_info in key_name_map.items():
            name = key_info.name
            value = None
            if settings:
                value = settings.get(key)
            value_type_err_msg = f"{name}の値が不正です。: required_type: {key_info.type}, current_type: {type(value)}, value: {value}"

            check_result, message = self._check_setting_value(value, key_info)
            if settings and check_result:
                result_settings[key] = value
                continue
            else:
                if check_only:
                    raise Exception(message)
                elif settings:
                    self._logger.warn(message)

            if key_info.type is bool:
                input_result = self._view.get_input(
                    f"{name}を有効にしますか？", yes_no=True
                )
                if input_result[0] in ["Yes", "No"]:
                    value = input_result[0] == "Yes"
                else:
                    value = key_info.default or False

            elif key_info.type == List[str]:
                value = self._input_or_default(
                    f"{name}を入力してください。（「,」カンマ区切りで複数指定できます）",
                    key_info.default,
                )
                value = value.split(",")

            elif key_info.type is dict:
                need_child = True
                if not key_info.required:
                    input_result = self._view.get_input(
                        f"{name}を入力しますか？", yes_no=True
                    )
                    if input_result[0] != "Yes":
                        need_child = False

                if need_child:
                    self._view.push(f"{name}を入力してください。各項目を入力します。")
                    value = self._request_input({}, check_only, key_info.dict_children)
                else:
                    value = key_info.default

            else:
                literal_range = ""
                if key_info.type_literals:
                    literal_str = []
                    for literal in key_info.type_literals:
                        if literal == key_info.default:
                            literal_str.append(f"{literal}(default)")
                        else:
                            literal_str.append(str(literal))
                    literal_range = f"入力範囲 : [{','.join(literal_str)}]"

                value = self._input_or_default(
                    f"{name}を入力してください。{literal_range}", key_info.default
                )

            if not self._check_type(value, key_info.type):
                try:
                    value = key_info.type(value)
                except Exception:
                    raise Exception(value_type_err_msg)

            check_result, message = self._check_setting_value(value, key_info)
            if not check_result:
                raise Exception(message)

            result_settings[key] = value

        return result_settings

    def _check_type(self, value: Any, value_type: SettingValueClass) -> bool:
        if value is None:
            return True

        if value_type == List[str]:
            if not all(type(v) is str for v in value):
                return False
            else:
                return True

        if type(value) is not value_type:
            return False

        return True

    def _check_setting_value(
        self, value: Any, key_info: SettingsValueInfo
    ) -> tuple[bool, str]:
        name = key_info.name
        value_type = key_info.type
        value_literals = key_info.type_literals
        required = key_info.required
        value_type_err_msg = f"{name}の値が不正です。: required_type: {value_type}, current_type: {type(value)}, value: {value}"
        # print(value_type_err_msg)

        if value is None:
            if required:
                return False, f"{name}は省略できません。"
            else:
                return True, ""

        if not self._check_type(value, value_type):
            return False, value_type_err_msg

        if value_literals and value not in value_literals:
            return (
                False,
                f"{name}の値が不正です。入力範囲 : [{','.join(value_literals)}], 設定値 : {value}",
            )

        if key_info.dict_children:
            for child_key, child_info in key_info.dict_children.items():
                child_value = value.get(child_key)
                result, message = self._check_setting_value(child_value, child_info)
                if not result:
                    return result, message

        return True, ""

    def _input_or_default(self, message: str, default: str = None) -> str:
        result = self._view.get_input(message)
        return result[1] or default


if __name__ == "__main__":
    print(Settings().get_help_text())
