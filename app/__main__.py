from argparse import ArgumentParser
import asyncio

import app

if __name__ == "__main__":
    parser = ArgumentParser()
    parser.add_argument(
        "-r",
        action="store_true",
        help="登録モードで起動します。TimeTrackerへの登録されます。",
    )
    args = parser.parse_args()

    # 登録モードかどうか
    is_register = args.r
    asyncio.run(app.execute(is_register=is_register))