import asyncio
import datetime
from dataclasses import dataclass
from os import path
from typing import List, Optional, cast

from .async_queue import HttpRequestQueue, HttpRequestQueueResponse
from .logger import CustomLogger
from .model import Project, WorkItem
from .setting import Settings
from .util import get_value_or_none, safe_json_dumps, safe_json_loads

@dataclass
class TimeTrackerTask:
    work_item_id: str
    start_time: datetime
    end_time: datetime
    memo: Optional[str] = None

    def __post_init__(self):
        if self.start_time >= self.end_time:
            raise ValueError("start_time is greater than end_time")
        if self.start_time.time().minute % 30 != 0:
            raise ValueError("start_time is not multiple of 30 minutes")
        if self.end_time.time().minute % 30 != 0:
            raise ValueError("end_time is not multiple of 30 minutes")


class TimeTracker:
    def __init__(self, base_url: str, user_name: str, project_id: str):
        """
        コンストラクタ

        Args:
            base_url (str): ベースURL
            user_name (str): ユーザー名
            project_id (str): プロジェクトID
        """

        self._token = None
        self._user_id = None
        self._user_name = user_name
        self._base_url = base_url
        self._project_id = project_id
        self._queue = HttpRequestQueue(100)
        self._logger = CustomLogger(name="TimeTracker")

    async def connect_async(self, password: str):
        """
        認証処理を行います。

        Args:
            password (str): ユーザーのパスワード
        """

        self._logger.debug("Start connect_async.")

        if self._token:
            self._logger.info("Already connected")
            self._token = None

        response = await self._request_async(
            uri="/auth/token",
            add_auth_header=False,
            json_data={"loginname": self._user_name, "password": password},
        )

        if response.status == 200:
            self._token = get_value_or_none(response.body, "token")

        if self._token is None:
            self._throw_error(
                f"TimeTrackerへの認証処理でエラー応答が返却されました。: {self._get_error_message(response)}"
            )

        response = await self._request_async(
            uri="/system/users/me", headers=self._get_auth_header()
        )

        if response.status == 200:
            response_login_name = get_value_or_none(response.body, "loginName")
            if response_login_name == self._user_name:
                self._user_id = get_value_or_none(response.body, "id")

        if self._user_id is None:
            self._throw_error("TimeTrackerへの認証処理で失敗しました。")

    async def get_projects_async(self) -> Project:
        """
        プロジェクト情報を取得します。

        Returns:
            Project: プロジェクト情報を表すオブジェクト
        """

        self._logger.debug("Start get_projects_async.")

        response = await self._request_async(
            uri=f"/workitem/workItems/{self._project_id}",
            headers=self._get_auth_header(),
        )

        if response.status == 200:
            if isinstance(response.body, str):
                project_dict = get_value_or_none(response.body, "[0][fields]")
                if project_dict:
                    return Project(
                        id=project_dict["Id"],
                        name=project_dict["Name"],
                        project_id=project_dict["ProjectId"],
                        project_name=project_dict["ProjectName"],
                        project_code=project_dict["ProjectCode"],
                    )

        self._throw_error(
            f"TimeTrackerへのProject取得処理でエラー応答が返却されました。: {self._get_error_message(response)}"
        )

    async def get_work_items_async(self) -> List[WorkItem]:
        """
        作業項目を取得します。

        Returns:
            List[WorkItem]: 作業項目のリスト
        """

        self._logger.debug("Start get_work_items_async")

        response = await self._request_async(
            uri=f"/workitem/workItems/{self._project_id}/subItems?fields=FolderName,Name&assignedUsers={self._user_name}&includeDeleted=false",
            headers=self._get_auth_header(),
        )

        if response.status == 200:
            response_dict = safe_json_loads(response.body)
            if response_dict and isinstance(response_dict, list):
                work_items = [
                    self._parse_work_item(work_item) for work_item in response_dict
                ]
                work_items.sort(key=lambda x: x.folder_path)
                return work_items

        self._throw_error(
            f"TimeTrackerへのWorkItem取得処理でエラー応答が返却されました。: {self._get_error_message(response)}"
        )

    async def register_task_async(self, task: TimeTrackerTask) -> str:
        """
        タスクを登録します。

        Args:
            task (TimeTrackerTask): 登録するタスク情報

        Returns:
            str: 登録ID
        """

        self._logger.debug("Start register_task_async")

        response = await self._request_async(
            uri=f"/system/users/{self._user_id}/timeEntries",
            headers=self._get_auth_header(),
            json_data={
                "workItemId": task.work_item_id,
                "startTime": task.start_time.strftime("%Y-%m-%dT%H:%M:%S"),
                "finishTime": task.end_time.strftime("%Y-%m-%dT%H:%M:%S"),
                "memo": task.memo,
            },
        )

        if response.status == 200:
            return response.body.__str__()

        self._throw_error(
            f"TimeTrackerへのタスクの登録処理でエラー応答が返却されました。: {self._get_error_message(response)}"
        )

    def _get_error_message(self, response: HttpRequestQueueResponse) -> str:
        if response is None:
            return "Response is None"

        msg = f"Status: {response.status}"
        if response.body:
            msg += ", Message: "
            msg += (
                get_value_or_none(response.body, "[0][message]")
                or f"Unknow response {response.body}"
            )
        return msg

    def _parse_work_item(
        self, work_item_dict: dict, parent_folder_path: str = None
    ) -> WorkItem:
        fields = get_value_or_none(work_item_dict, "fields")
        if fields is None:
            self._throw_error(f"Unknow response: {work_item_dict}")

        folder_path = (
            parent_folder_path + "/" + fields["FolderName"]
            if parent_folder_path
            else fields["FolderName"]
        )
        return WorkItem(
            id=fields["Id"],
            name=fields["Name"],
            folder_name=fields["FolderName"],
            folder_path=folder_path,
            sub_items=[
                self._parse_work_item(sub_item, folder_path)
                for sub_item in fields.get("SubItems", [])
            ],
        )

    async def _request_async(
        self,
        uri: str,
        add_auth_header: bool = True,
        json_data: dict = None,
        headers: dict = None,
    ) -> HttpRequestQueueResponse:
        req_headers = {}
        if add_auth_header:
            req_headers.update(self._get_auth_header())
        if headers is not None:
            req_headers.update(headers)

        try:
            row_response = await self._queue.enquere_async(
                {"url": self._base_url + uri, "headers": req_headers, "json": json_data}
            )
            return cast(HttpRequestQueueResponse, row_response)
        except Exception as e:
            self._throw_error(f"{uri}へのリクエスト処理に失敗しました。: {e}")

    def _get_auth_header(self) -> dict:
        if not self._token:
            raise Exception("Not connected.")
        return {"Authorization": f"Bearer {self._token}"}

    def _throw_error(self, message: str):
        self._logger.error(message)
        raise Exception(message)


if __name__ == "__main__":
    Settings().load()
    base_url = Settings().get_setting_value("base_url")
    user_name = Settings().get_setting_value("user_name")
    project_id = Settings().get_setting_value("base_project_id")

    async def get_api():
        tracker = TimeTracker(base_url, user_name, project_id)

        password = input("Password: ")
        response = await tracker.connect_async(password)
        print(response)

        project = await tracker.get_projects_async()
        print(project)

        work_items = await tracker.get_work_items_async()
        for child in work_items[0].get_most_nest_children():
            print(safe_json_dumps(child.__dict__, ensure_ascii=False))

    async def register():
        now = (
            datetime.datetime.now()
            .replace(minute=0, second=0, microsecond=0)
            .astimezone()
        )

        tracker = TimeTracker(base_url, user_name, project_id)

        await tracker.connect_async(input("Password: "))
        task = TimeTrackerTask(
            work_item_id="62418",
            start_time=now,
            end_time=now + datetime.timedelta(hours=1),
        )
        response = await tracker.register_task_async(task)
        print(response)

    main_loop = asyncio.get_event_loop()
    main_loop.run_until_complete(get_api())
    # main_loop.run_until_complete(register())
