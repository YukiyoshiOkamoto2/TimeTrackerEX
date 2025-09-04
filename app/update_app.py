import os
import subprocess
from .app_info import app_file_name, latest_url, update_file_name, version, token

def update(): 

    current_directory = os.getcwd()

    pid = os.getpid()
    app = os.path.join(current_directory, update_file_name())
    path = os.path.join(current_directory, app_file_name())

    args = [
        app,
        "--latest",
        latest_url(),
        "--token",
        token(),
        "--pid",
        str(pid),
        "--ver",
        version(),
        "--path",
        path
    ]
    print(f"更新を確認します。：{app}")

    if not os.path.exists(app):
        print("アプリケーションの自動更新処理は未対応です。")
        return

    try:
        update_process = subprocess.Popen(args,
                                          #stdout=subprocess.PIPE,
                                          #stderr=subprocess.PIPE,
                                          start_new_session=True)
        print(f"更新が実行中です。プロセスID：{update_process.pid}")
    except Exception as e:
        print(f"更新確認でエラーが発生しました。: {e}")
