"""Centralized logging with Rich console output."""
import logging
import sys
from pathlib import Path

try:
    from rich.logging import RichHandler
    _RICH = True
except ImportError:
    _RICH = False

_configured = False


def get_logger(name: str, level: str = "INFO") -> logging.Logger:
    global _configured
    if not _configured:
        _configure_root(level)
        _configured = True
    return logging.getLogger(name)


def _configure_root(level: str = "INFO") -> None:
    root = logging.getLogger()
    root.setLevel(getattr(logging, level.upper(), logging.INFO))
    if _RICH:
        handler = RichHandler(rich_tracebacks=True, markup=True)
    else:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(
            logging.Formatter("%(asctime)s | %(levelname)-8s | %(name)s | %(message)s")
        )
    root.addHandler(handler)
    Path("logs").mkdir(exist_ok=True)
    file_handler = logging.FileHandler("logs/mapper.log")
    file_handler.setFormatter(
        logging.Formatter("%(asctime)s | %(levelname)-8s | %(name)s | %(message)s")
    )
    root.addHandler(file_handler)
