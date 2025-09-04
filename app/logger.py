import logging

level = logging.INFO
log_file = None
log_word_size = 1000

log_format = "%(asctime)s [%(levelname)s] %(message)s : %(name)s at %(lineno)d"
date_format = "%Y-%m-%d %H:%M:%S"

formatter = logging.Formatter(fmt=log_format, datefmt=date_format)


class CustomLogger:
    def __init__(self, name: str = None):
        self.logger = logging.getLogger(name)
        self.logger.setLevel(level)

        # ハンドラの設定
        if log_file:
            handler = logging.FileHandler(log_file)
        else:
            handler = logging.StreamHandler()

        handler.setFormatter(formatter)
        self.logger.addHandler(handler)

    def debug(self, obj: any):
        self.logger.debug(self._log(obj))

    def info(self, obj: any):
        self.logger.info(self._log(obj))

    def warn(self, obj: any):
        self.logger.warning(self._log(obj))

    def error(self, obj: any):
        self.logger.error(self._log(obj))

    def _log(self, obj: any) -> str:
        message = str(obj or "None")
        if len(message) > log_word_size:
            return message[:log_word_size] + "..."
        return message
