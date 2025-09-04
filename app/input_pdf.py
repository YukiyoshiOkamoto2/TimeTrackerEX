import re
import traceback
from dataclasses import dataclass
from datetime import datetime
from typing import List, Optional

import fitz

from .date import strptime
from .logger import CustomLogger
from .model import Schedule

logger = CustomLogger(name=__name__)


@dataclass
class InputPDFResult:
    schedule: List[Schedule] = None
    schedule_stamp: List[Schedule] = None
    error_message: str = None


def _text_from_pdf(file_path):
    pdf_document = fitz.open(file_path)
    text = ""
    for page_num in range(len(pdf_document)):
        page = pdf_document.load_page(page_num)
        text += page.get_text()
    pdf_document.close()
    return text


def _get_around_lines(lines, row, around=2):
    start = max(0, row - around)
    end = min(len(lines), row + around + 1)
    return lines[start:end]


def _get_day_info(row, lines) -> Optional[tuple[int, str, bool, bool]]:
    pattern_day1 = r"^\d+/\d+$"
    pattern_day2 = r"^[月火水木金土日]$"
    pattern_day3 = r"^所定休日$"
    pattern_day4 = r"^＜休暇＞$"

    day_str = None

    day_match = re.match(pattern_day1, lines[row].strip())
    if not day_match or len(lines) <= row + 1:
        return None
    
    day_str = day_match.group(0)
    
    row += 1
    day_match = re.match(pattern_day2, lines[row].strip())
    if not day_match:
        return None

    day_str = day_str + " " + day_match.group(0)
    is_holiday = False
    if day_str.endswith("土") or day_str.endswith("日"):
        is_holiday = True

    row += 1
    day_match = re.match(pattern_day3, lines[row].strip())
    if day_match:
        is_holiday = True

    day_match = re.match(pattern_day4, lines[row].strip())
    is_paid_leave = False
    if day_match:
        is_paid_leave = True   

    return (row, day_str, is_paid_leave, is_holiday)


def _analze_pdf_text(text):
    pattern_time = r".*(\d{2}時\d{2}分)\s+.\s+(\d{2}時\d{2}分)"
    pattern_time_stamp = r".*(\d{2}:\d{2})?\s*--\s*(\d{2}:\d{2})?"

    #print(text)

    lines = text.splitlines()
    schedule = []
    schedule_stamp = []
    row = 0

    while row < len(lines):
        info = _get_day_info(row, lines)
        # print(info)
        # print(lines[row])
        if not info:
            row += 1
            continue

        day_str = info[1]
        is_paid_leave = info[2]
        is_holiday = is_paid_leave or info[3]
        if is_paid_leave or is_holiday:
            # 7/21
            # 月
            # 所定休日        ←
            # （打刻情報なし）
            row = info[0] + 1
        else:
            # 7/22
            # 火
            # フレックス勤務   ←
            # 1
            # 09:45 -- 18:46
            # 09時45分 ～ 18時46分
            row = info[0] + 2

        time_start = None
        time_end = None
        error_message = None

        time_start_stamp = None
        time_end_stamp = None
        error_message_stamp = None

        # 打刻時間
        time_match_stamp = re.match(pattern_time_stamp, lines[row].strip())
        if time_match_stamp:
            time_start_stamp = time_match_stamp.group(1) or None
            time_end_stamp = time_match_stamp.group(2) or None
        else:
            error_message_stamp = "打刻時間が見つかりません。"

        # 勤務時間
        time_match = re.match(pattern_time, lines[row].strip())
        if time_match:
            time_start = time_match.group(1)
            time_end = time_match.group(2)
        elif len(lines) > row + 1:
            time_match = re.match(pattern_time, lines[row + 1].strip())
            if time_match:
                time_start = time_match.group(1)
                time_end = time_match.group(2)

        if not time_match:
            error_message = "勤務時間が見つかりません。"

        format_year_day = "%Y %m/%d"
        format_date = f"{format_year_day} %H時%M分"
        format_date_stamp = f"{format_year_day} %H:%M"
        year_day_str = f"{datetime.now().year} {day_str.split(' ')[0]}"

        #
        if error_message:
            err_line = _get_around_lines(lines, row)
            logger.debug("Schedule format error at line.\n" + "\n".join(err_line))
            schedule.append(
                Schedule(
                    start=strptime(year_day_str, format_year_day),
                    is_holiday=is_holiday,
                    error_message=error_message,
                    is_paid_leave=is_paid_leave,
                )
            )
        else:
            schedule.append(
                Schedule(
                    start=strptime(f"{year_day_str} {time_start}", format_date),
                    end=strptime(f"{year_day_str} {time_end}", format_date),
                    is_holiday=is_holiday,
                    is_paid_leave=is_paid_leave,
                )
            )

        #
        if error_message_stamp:
            err_line = _get_around_lines(lines, row)
            logger.debug("Schedule format error at line.\n" + "\n".join(err_line))
            schedule_stamp.append(
                Schedule(
                    start=strptime(year_day_str, format_year_day),
                    is_holiday=is_holiday,
                    error_message=error_message_stamp,
                    is_paid_leave=is_paid_leave,
                )
            )
        else:
            ds = (
                strptime(f"{year_day_str} {time_start_stamp}", format_date_stamp)
                if time_start_stamp
                else None
            )
            de = (
                strptime(f"{year_day_str} {time_end_stamp}", format_date_stamp)
                if time_end_stamp
                else None
            )
            schedule_stamp.append(
                Schedule(
                    start=ds, end=de, is_holiday=is_holiday, is_paid_leave=is_paid_leave
                )
            )

        row += 1
    return schedule, schedule_stamp


def execute(file_path) -> InputPDFResult:
    result = InputPDFResult()
    result.schedule = []
    result.schedule_stamp = []

    logger.debug(f"Start reading PDF file: {file_path}")

    try:
        text = _text_from_pdf(file_path)
    except Exception as e:
        result.error_message = f"{file_path}の読み取りに失敗しました。: {e}"
        return result

    try:
        schedule, schedule_stamp = _analze_pdf_text(text)
    except Exception as e:
        print(traceback.format_exc())
        result.error_message = f"{file_path}の解析に失敗しました。: {e}"
        return result

    logger.debug(f"End reading PDF file: {file_path}")

    result.schedule = schedule
    result.schedule_stamp = schedule_stamp
    return result


if __name__ == "__main__":
    # result = execute("勤務実績入力（期間入力用）.pdf")
    # result = execute("勤務実績入力（期間入力用）佐藤.pdf_")
    result = execute("勤務実績入力（本人用）.pdf")
    if result.error_message:
        print(f"Error: {result.error_message}")
    else:
        for s in result.schedule:
            print(s.get_text())
