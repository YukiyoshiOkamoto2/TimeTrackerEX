import asyncio
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

import aiohttp

from .logger import CustomLogger


class AsyncQueue(ABC):
    def __init__(self, wait_time_ms: int):
        self.queue = asyncio.Queue()
        self.wait_time = wait_time_ms / 1000.0  # Convert milliseconds to seconds
        self._loop_task = asyncio.create_task(self._process_queue())
        self._logger = CustomLogger(name=__name__)

    async def enquere_async(self, data: Any) -> Any:
        self._logger.debug(f"Enquere: {data}")
        result_future = asyncio.get_event_loop().create_future()
        await self.queue.put((data, result_future))
        return await result_future

    async def _process_queue(self):
        while True:
            await asyncio.sleep(self.wait_time)
            if not self.queue.empty():
                self._logger.debug(f"Start. Queue task: {self.queue.qsize()}")
                data, result_future = await self.queue.get()
                try:
                    result = await self.execute(data)
                    result_future.set_result(result)
                except Exception as e:
                    self._logger.error(f"Queue task error: {e}")
                    self._logger.error(f"traceBack: {e.__traceback__}")
                    result_future.set_exception(e)
                finally:
                    self._logger.debug("End Queue task.")

    @abstractmethod
    async def execute(self, data: Any) -> Any:
        pass


@dataclass
class HttpRequestQueueResponse:
    status: int
    body: str = None


class HttpRequestQueue(AsyncQueue):
    def __init__(self, wait_time_ms: int, retry_count: int = 2, headers: dict = None):
        super().__init__(wait_time_ms)
        self.headers = headers
        self.retry_count = retry_count

    async def execute(self, data: Any) -> Any:
        if not data["url"]:
            raise ValueError("url is required")

        url = data["url"]
        headers = data.get("headers", {})
        json_data = data.get("json", None)

        if headers is None:
            headers = {}
        if self.headers is not None:
            headers.update(self.headers)

        self._logger.debug(f"Request: {url}")
        self._logger.debug(f"Headers: {headers}")
        self._logger.debug(f"json: {json_data}")

        q_response = None
        count = 0
        while q_response is None:
            try:
                async with aiohttp.ClientSession() as session:
                    if json_data is None:
                        async with session.get(url, headers=headers) as response:
                            self._logger.debug(f"Response: {response}")
                            q_response = HttpRequestQueueResponse(
                                response.status, await response.text()
                            )
                    else:
                        headers["Content-Type"] = "application/json"
                        async with session.post(
                            url, json=json_data, headers=headers
                        ) as response:
                            self._logger.debug(f"Response: {response}")
                            q_response = HttpRequestQueueResponse(
                                response.status, await response.text()
                            )
            except Exception as e:
                self._logger.error(f"Request error: {e}")
                self._logger.error(f"traceBack: {e.__traceback__}")

                if not count < self.retry_count:
                    raise e

                count += 1
                self._logger.info(f"Retry count: {count}...")
                await asyncio.sleep(self.wait_time / 1000.0)

        self._logger.debug(f"Response: {q_response}")
        return q_response
