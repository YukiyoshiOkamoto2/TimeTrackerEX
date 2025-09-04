from argparse import ArgumentParser
from dataclasses import dataclass
import importlib
from typing import List, Literal, Optional, Union
import requests
import os
import json
import time
from os import path
import platform
import shutil
from datetime import datetime
import psutil
import re
import zipfile

WIN_EXT = ".exe"
APP_EXIT_SPIN_WAIT = 5

BACK_UP_DIR = ".bk"
DOWNLOAD_DIR = ".download"
LATEST_OUTPUT = path.join(DOWNLOAD_DIR, "latest.json")
NEW_APP_OUTPUT = path.join(DOWNLOAD_DIR, "new-app")
NEW_ZIP_OUTPUT = path.join(DOWNLOAD_DIR, "new-zip.zip")
NEW_ZIP_EXTRACT_OUTPUT = path.join(DOWNLOAD_DIR, "new-zip-extract")
NEW_SCRIPT_OUTPUT = path.join(DOWNLOAD_DIR, "new-script.py")

@dataclass
class LatestUrl:
    os: str
    url: str

@dataclass
class Latest:
    name: str
    version: str
    level: Literal["system", "fix", "better"]
    type: Literal["app", "zip", "script"]
    urls: List[LatestUrl]

def is_win():
    os_name = platform.system()
    return os_name == "Windows"

def log(msg: str):
    print(msg)
    
def post(url: str, headers: dict, data = None):
    return requests.post(url, headers=headers, data=data, verify=False) 

def fetch(url: str, headers: dict):
    return requests.get(url, headers=headers, stream=True, verify=False) 

def check_app_exit(pid):
    try:
        process = psutil.Process(pid)
        return process.is_running()
    except psutil.NoSuchProcess:
        return False

def safe_remove(path: str) -> bool:
    try:
        if os.path.exists(path):
            if os.path.isfile(path):
                os.remove(path)
            else:
                shutil.rmtree(path)
            return True
    except Exception as e:
        log(f"ファイルの削除に失敗しました。： {e}")
    
    return False

def extract_zip(zip_path: str, extract_to: str): 
    try:
        log(f"Extract ZIP -> {zip_path}")
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(extract_to)
    except Exception as e:
        raise Exception(f"ZIPファイルの展開に失敗しました。： {e}")

def download(url:str, dest: str, token: Optional[str]):

    headers = {
        'content-type': 'application/json',
    }

    if token:
        headers['Authorization'] = f'token {token}'

    response = None
    try:
        response = fetch(url, headers) 
    except requests.exceptions.RequestException as e:
        raise Exception(f"リクエスト（{url}）の送信に失敗しました。： {e}")

    if response.status_code != 200:
        raise Exception(f"リクエスト（{url}）の送信に失敗しました。ステータスコード： {response.status_code}")
  
    safe_remove(dest)
    try:
        with open(dest, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
    except IOError as e:
        safe_remove(dest)
        raise Exception(f"ファイルの作成に失敗しました。： {e}")

def execute_script(path: str):
    # 動的にモジュールをロード
    updater = None
    try:
        spec = importlib.util.spec_from_file_location(
            "new_app", NEW_SCRIPT_OUTPUT
        )
        updater = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(updater)
    except Exception as e:
        raise Exception(f"Scriptのロードに失敗しました。：{e}")

    # update 関数が存在するか確認
    if not hasattr(updater, "update"):
        raise Exception(f"update関数が存在しません。: {NEW_SCRIPT_OUTPUT}")
    
    args = {}
    args["path"] = path
    log(f"Execute Script -> {NEW_SCRIPT_OUTPUT}, args: {args}")
    
    try:
        updater.update(args)
    except Exception as e:
        raise Exception(f"Scriptの実行にに失敗しました。：{e}")

def load_target(latest: Latest, token: Optional[str], path: str, pid: Optional[int]) :
    pf = "win" if is_win() else "mac"
    urls = [url.url for url in latest.urls if url.os == pf]

    url = urls[0] if urls else None
    if not url:
        log(f"対象のプラットフォームに対応する最新のアプリケーションはありません。: {pf}")
        return

    target = None
    if latest.type == "app":
        target = NEW_APP_OUTPUT
    elif latest.type == "zip":
        target = NEW_ZIP_OUTPUT
    else:
        target = NEW_SCRIPT_OUTPUT

    try:
        download(url, target, token)
    except Exception as e:
        raise Exception(f"アプリケーションのダウンロードに失敗しました。： {e}")
    log(f"Download New App -> size: {os.path.getsize(target)}")
    
    # 更新対象のアプリケーションの終了待ち
    if pid:
        count = 0
        while check_app_exit(pid):
            log("アプリケーションの終了を待機しています。")
            time.sleep(5) 
            count = count + 1
            if APP_EXIT_SPIN_WAIT < count:
                raise Exception("アプリケーションが実行中です。")
    
    bk = BACK_UP_DIR
    os.makedirs(bk, exist_ok=True)
    now = datetime.now()
    dest_path = os.path.join(bk, f"{os.path.basename(path)}_{now.strftime("%Y%m%d")}")

    try:
        safe_remove(dest_path)
        if latest.type == "script":
            shutil.copytree(path, dest_path)
        else:
            shutil.move(path, dest_path)
    except Exception as e:
        raise Exception(f"アプリケーションのバックアップに失敗しました。： {e}")
    log(f"Backup -> {dest_path}")

    try:
        if latest.type == "app":
            shutil.move(target, path)
        elif latest.type == "zip":
            extract_zip(target, NEW_ZIP_EXTRACT_OUTPUT)
            shutil.move(NEW_ZIP_EXTRACT_OUTPUT, path)
        elif latest.type == "script":
            execute_script(path)
    except Exception as e:
        raise Exception(f"アプリケーションの配置に失敗しました。： {e}")
    log(f"Update -> {path}")

def load_latest(latest: str, token: Optional[str]) -> Latest:
    file_path = LATEST_OUTPUT

    try:
        download(latest, file_path, token)
    except Exception as e:
        raise Exception(f"latestのダウンロードに失敗しました。： {e}")

    json_data = None
    try:
        with open(file_path, 'r', encoding='utf-8-sig') as f:
            json_data = json.load(f)
    except Exception as e:
        raise Exception(f"latestの読み込みに失敗しました。：{e}")

    # 必須項目とその型を定義
    required_fields = {
        'name': str,
        'version': str,
        'level': str,
        'type': str,
        'urls': list
    }
    required_sub_fields = {
        'os': str,
        'url': str,
    }
    allowed_levels = ["system", "fix", "better"]
    allowed_types = ["app", "zip", "script"]

    # フィールドの存在チェックと型チェック
    for field, expected_type in required_fields.items():
        if field not in json_data:
            raise KeyError(f"必須フィールドが見つかりません: {field}")
        if not isinstance(json_data[field], expected_type):
            raise TypeError(f"{field} の型が正しくありません。期待される型: {expected_type}, 実際の型: {type(json_data[field])}")
        
    # 許可される値のチェック
    if json_data['level'] not in allowed_levels:
        raise ValueError(f"level の値が正しくありません。許可される値: {allowed_levels}, 実際の値: {json_data['level']}")
    if json_data['type'] not in allowed_types:
        raise ValueError(f"type の値が正しくありません。許可される値: {allowed_types}, 実際の値: {json_data['type']}")
    
     # urls フィールド内の各要素のチェック
    urls = []
    for url_info in json_data['urls']:
        if not isinstance(url_info, dict):
            raise TypeError("urls の要素は辞書である必要があります。")

        for subfield, expected_type in required_sub_fields.items():
            if subfield not in url_info:
                raise KeyError(f"urls の要素に必須フィールドが見つかりません: {subfield}")
            if not isinstance(url_info[subfield], expected_type):
                raise TypeError(f"{subfield} の型が正しくありません。期待される型: {expected_type}, 実際の型: {type(json_data[subfield])}")
            
        urls.append(LatestUrl(**url_info))
    
    return Latest(
        name=json_data['name'],
        version=json_data['version'],
        level=json_data['level'],
        type=json_data['type'],
        urls=urls
    )

def check_args(latest: str, path: Optional[str], ver: Optional[str], pid: Optional[str]):
    
    if not latest:
        raise ValueError("最新バージョンのURLを指定してください。")
    if not re.match(r'^https?://', latest):
        raise ValueError(f"最新バージョンのURLが正しくありません。：{latest}")

    version_pattern = r'^\d+\.\d+\.\d+$'
    if ver and not re.match(version_pattern, ver):
        raise ValueError(f"バージョンを正しく指定してください。：{ver}")

    if path and not os.path.exists(path):
        raise ValueError(f"更新対象のアプリケーションが存在しません。：{path}")
     
    if pid:
        try:
            int(pid)
        except ValueError:
            raise ValueError(f"pidは整数値で入力してください。：{pid}")

def compare_versions(version1, version2):
    # バージョンをドットで分割して整数のリストに変換
    parts1 = list(map(int, version1.split('.')))
    parts2 = list(map(int, version2.split('.')))

    # 比較する部分の数を取得
    length = max(len(parts1), len(parts2))
    parts1.extend([0] * (length - len(parts1)))
    parts2.extend([0] * (length - len(parts2)))

    # 各部分を比較
    for i in range(length):
        if parts1[i] > parts2[i]:
            return 1  # version1がversion2より大きい
        elif parts1[i] < parts2[i]:
            return -1  # version1がversion2より小さい

    return 0  # バージョンが同じ

def create_path(path: Optional[str], latest: Latest):
    target = path
    if not target:
        target = latest.name
    
    if latest.type == "app":
        if is_win():
            target = target + WIN_EXT 
    
    if not os.path.exists(target):
        raise ValueError(f"更新対象が存在しません。： {target}")
    
    if latest.type == "app" and not os.path.isfile(target):
        raise ValueError(f"アプリケーションのパスを指定してください。： {target}, type -> {latest.type}")
    
    if latest.type == "zip" and not os.path.isdir(target):
        raise ValueError(f"フォルダのパスを指定してください。： {target}, type -> {latest.type}")

    return target

def execute(latest: str, token: Optional[str], path: Optional[str], ver: Optional[str], pid: Optional[str], check: bool = False):

    check_args(latest, path, ver, pid)
    os.makedirs(DOWNLOAD_DIR, exist_ok=True)

    latest = load_latest(latest, token)
    log(f"Download latest -> {latest}")

    if ver and compare_versions(latest.version, ver) != 1:
        log(f"Nothing Update. currnt:{ver}")
        return
    
    log(f"Exist Update! currnt:{ver}, new:{latest.version}")

    update = True
    if check:
        if latest.level == "system":
            log("\033[91mExist critical issue, forced update.\033[0m")
        else:
            update = False
            if latest.level == "fix":
                log("★There is a release to fix the problem★")

    if not update:
        return
    
    target_path = create_path(path, latest)
    load_target(latest, token, target_path, int(pid) if pid else None)
    log("DONE")
    return

def main():
    parser = ArgumentParser()
    parser.add_argument(
        "--latest",
        help="最新バージョンのURLです。",
    )
    parser.add_argument(
        "--token",
        help="アクセストークンです。",
    )
    parser.add_argument(
        "--path",
        help="現在のアプリケーションのフルパスです。"
    )
    parser.add_argument(
        "--ver",
        help="現在のアプリケーションのバージョンです。",
    )
    parser.add_argument(
        "--pid",
        help="アプリケーションのプロセスIDです。",
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="更新可能かチェックします。",
    )

    args = parser.parse_args()
    execute(
        args.latest,
        args.token,
        args.path,
        args.ver,
        args.pid,
        args.check,
    )

    input("続行するには何かキーを押してください")

    