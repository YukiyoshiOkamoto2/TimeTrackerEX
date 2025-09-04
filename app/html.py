import json
import os
import webbrowser
from datetime import date, datetime, time, timedelta
from typing import List

from jinja2 import Template

from .model import TimeTrackerDayTask, WorkItem
from .setting import get_desk_path
from .util import write_file

html_template_work_item_tree = """
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Treeview Example</title>
    <style>
      body {
        font-family: Arial, sans-serif;
      }
      ul {
        list-style-type: none; /* デフォルトのリストスタイルを削除 */
        padding-left: 20px; /* インデント */
      }
      li {
        margin-bottom: 5px; /* 下にマージンを追加 */
        padding-left: 20px; /* インデント */
        border-left: 1px solid #ddd; /* 左側にボーダーを追加 */
      }
      li.leaf {
        cursor: pointer; /* クリック可能な要素にするためのクラス */
        position: relative; /* ツールチップの位置を相対的にする */
        padding: 5px; /* パディングを追加 */
        margin-bottom: 5px; /* 下にマージンを追加 */
        border-radius: 5px; /* 角を丸くする */
        border-left: 0px;
      }
      li.leaf:hover {
        background-color: #f0f0f0; /* マウスオーバー時の背景色 */
      }
      li.leaf:active {
        background-color: #e0e0e0; /* クリック時の背景色 */
      }
      button {
        background-color: #4caf50; /* ボタンの背景色 */
        color: white; /* ボタンの文字色 */
        border: none; /* ボーダーを削除 */
        padding: 10px 20px; /* パディング */
        text-align: center; /* テキストを中央揃え */
        text-decoration: none; /* テキストの装飾を削除 */
        display: inline-block; /* インラインブロック要素にする */
        font-size: 16px; /* フォントサイズ */
        margin: 4px 2px; /* マージン */
        cursor: pointer; /* カーソルをポインターにする */
        border-radius: 12px; /* 角を丸くする */
      }
      button:hover {
        background-color: #45a049; /* マウスオーバー時の背景色 */
      }
      button:active {
        background-color: #3e8e41; /* クリック時の背景色 */
      }
      .hidden {
        display: none; /* 非表示にするためのクラス */
      }
      .tooltip {
        display: none; /* 初期状態では非表示 */
        position: absolute;
        top: -100%;
        left: 0;
        background-color: #333;
        color: #fff;
        padding: 5px;
        border-radius: 3px;
        white-space: nowrap;
        z-index: 1;
      }
      li.leaf:hover .tooltip.open {
        display: block;
      }
    </style>
  </head>
  <body>
    <button id="close-all">Close All</button>
    <ul id="treeview"></ul>

    <script>
      function generateTreeView(items, parentElement) {
        if (!Array.isArray(items)) {
          items = [items];
        }

        for (const item of items) {
          const li = document.createElement("li");
          if (item.sub_items && item.sub_items.length > 0) {
            const span = document.createElement("span");
            span.textContent = "▶" + item.name;

            li.appendChild(span);

            const ul = document.createElement("ul");
            ul.classList.add("hidden"); // 初期状態では隠す

            item.sub_items.forEach((sub) => generateTreeView(sub, ul));
            li.appendChild(ul);

            // クリックイベントで展開・折りたたみを切り替える
            li.addEventListener("click", (e) => {
              e.stopPropagation(); // イベントのバブリングを防ぐ
              if (ul.classList.toggle("hidden")) {
                span.textContent = "▶" + item.name;
              } else {
                span.textContent = "▼" + item.name;
              }
            });
          } else {
            li.classList.add("leaf");
            li.textContent = item.name + " [" + item.id + "]";

            const tooltip = document.createElement("div");
            tooltip.classList.add("tooltip");
            tooltip.textContent = "Copied!";

            li.appendChild(tooltip);

            li.addEventListener("click", (e) => {
              e.stopPropagation(); // イベントのバブリングを防ぐ
              navigator.clipboard.writeText(item.id); // クリップボードにコピー
              tooltip.classList.add("open"); // ツールチップを表示
              setTimeout(() => tooltip.classList.remove("open"), 1000); // 1秒後に非表示にする
            });
          }
          parentElement.appendChild(li);
        }
      }

      document.addEventListener("DOMContentLoaded", () => {
        // Treeviewを生成
        const treeContainer = document.getElementById("treeview");
        generateTreeView(data, treeContainer);

        const btn = document.getElementById("close-all");
        btn.addEventListener("click", () => {
          const ulElements = treeContainer.querySelectorAll("ul");
          ulElements.forEach((ulElement) => {
            ulElement.classList.add("hidden");
          });
          const liElements = treeContainer.querySelectorAll("li");
          liElements.forEach((liElement) => {
            liElement.firstChild.textContent =
              liElement.firstChild.textContent.replace("▼", "▶");
          });
        });
      });
      
    const data = {{ data }};
    </script>
  </body>
</html>
"""

html_template_schedule = """
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>スケジュール</title>
    <style>
        body {
            font-family: Arial, sans-serif;
        }
        table {
            width: 100%;
            border-collapse: collapse;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 8px;
        }
        th {
            background-color: #f2f2f2;
            text-align: left;
        }
        tr:nth-child(even) {
            background-color: #f9f9f9;
        }
        tr:hover {
            background-color: #ddd;
        }
    </style>
</head>
<body>
    <h1>スケジュール</h1>
    <table>
        <thead>
            <tr>
                <th>日付</th>
                <th>イベント名</th>
                <th>開始時間</th>
                <th>終了時間</th>
                <th>TimeTrackerアイテムID</th>
                <th>TimeTrackerアイテム名</th>
                <th>主催者</th>
            </tr>
        </thead>
        <tbody id="schedule-body">
        </tbody>
    </table>
    <script>
        const data = {{ data }};

        const tbody = document.getElementById('schedule-body');

        data.forEach(day => {
            day.event_work_item_pair.forEach(pair => {
                const event = pair.event;
                const work_item = pair.work_item;
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${day.base_date}</td>
                    <td>${event.name}</td>
                    <td>${new Date(event.schedule.start).toLocaleTimeString()}</td>
                    <td>${new Date(event.schedule.end).toLocaleTimeString()}</td>
                    <td>${work_item.id}</td>
                    <td>${work_item.folder_path + "/" + work_item.name}</td>
                    <td>${event.organizer}</td>
                `;
                tbody.appendChild(tr);
            });
        });
    </script>
</body>
</html>
"""


def flush_work_item_tree(work_items: List[WorkItem]):
    # テンプレートにデータを埋め込む
    template = Template(html_template_work_item_tree)
    rendered_html = template.render(
        data=json.dumps(work_items, default=lambda x: x.__dict__)
    )

    file_path = os.path.join(get_desk_path(), "work_item.html")

    # HTMLをファイルに書き込む
    success, error_message = write_file(file_path, rendered_html)
    if not success:
        raise Exception(f"{file_path}の書き込みに失敗しました：{error_message}")

    # HTMLファイルをPCのデフォルトで開く
    webbrowser.open(file_path, new=2)


def flush_schedule(day_tasks: List[TimeTrackerDayTask]):
    def default_serializer(obj):
        if type(obj) is datetime or type(obj) is date or type(obj) is time:
            return obj.isoformat()
        if type(obj) is timedelta:
            return obj.total_seconds()
        return obj.__dict__

    # テンプレートにデータを埋め込む
    template = Template(html_template_schedule)
    rendered_html = template.render(
        data=json.dumps(day_tasks, default=default_serializer)
    )

    file_path = os.path.join(get_desk_path(), "schedule.html")

    # HTMLをファイルに書き込む
    success, error_message = write_file(file_path, rendered_html)
    if not success:
        raise Exception(f"{file_path}の書き込みに失敗しました：{error_message}")

    # HTMLファイルをPCのデフォルトで開く
    webbrowser.open(file_path, new=2)


if __name__ == "__main__":
    work_items = [
        WorkItem(
            1,
            "Root",
            "Root",
            "Root",
            [
                WorkItem(2, "Sub1", "Sub1", "Root/Sub1", []),
                WorkItem(3, "Sub2", "Sub2", "Root/Sub2", []),
            ],
        )
    ]

    flush_work_item_tree(work_items)
