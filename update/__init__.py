"""update package

Expose main() so package importers can call update.main or run via -m.
"""
from .update import main, execute  # re-export core functions from update.py

__all__ = ["main", "execute"]
