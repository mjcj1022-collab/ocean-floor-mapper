"""Sonar data loader — supports .xyx, .s7k, .all, .jsf formats."""
from __future__ import annotations

import os
import struct
from pathlib import Path
from typing import Dict, List, Optional

import numpy as np

from utils.logger import get_logger

logger = get_logger(__name__)

SUPPORTED_FORMATS = {".xyx", ".s7k", ".all", ".jsf", ".xtf"}


class SonarLoader:
    """
    Load and preprocess sonar data from multiple file formats.

    Supported formats:
        .xyx  — EdgeTech side-scan
        .s7k  — Teledyne Reson multibeam
        .all  — Kongsberg multibeam (.all / .wcd)
        .jsf  — EdgeTech sub-bottom / side-scan
        .xtf  — Triton XTF side-scan

    Example:
        loader = SonarLoader("data/raw/scan1.xyx")
        data = loader.load()
        meta = loader.get_metadata()
    """

    def __init__(self, file_path: str):
        self.file_path = Path(file_path)
        self.ext = self.file_path.suffix.lower()
        self.data: Optional[np.ndarray] = None
        self.metadata: Dict = {}

        if self.ext not in SUPPORTED_FORMATS:
            raise ValueError(
                f"Unsupported format '{self.ext}'. "
                f"Supported: {', '.join(SUPPORTED_FORMATS)}"
            )

    def load(self) -> np.ndarray:
        """Load sonar data into a 2-D numpy array (pings × samples)."""
        if not self.file_path.exists():
            raise FileNotFoundError(f"Sonar file not found: {self.file_path}")

        logger.info(f"Loading sonar file: {self.file_path.name} ({self.ext})")

        dispatch = {
            ".xyx": self._load_xyx,
            ".s7k": self._load_s7k,
            ".all": self._load_all,
            ".jsf": self._load_jsf,
            ".xtf": self._load_xtf,
        }
        self.data = dispatch[self.ext]()
        logger.info(f"Loaded {self.data.shape[0]} pings × {self.data.shape[1]} samples")
        return self.data

    def get_metadata(self) -> Dict:
        return self.metadata

    # ------------------------------------------------------------------
    # Format-specific loaders
    # ------------------------------------------------------------------

    def _load_xyx(self) -> np.ndarray:
        """EdgeTech .xyx — tab-delimited ping/range/intensity text."""
        rows = []
        with open(self.file_path, "r") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                parts = line.split()
                if len(parts) >= 3:
                    rows.append([float(p) for p in parts[:3]])
        arr = np.array(rows, dtype=np.float32)
        self.metadata.update({
            "format": "XYX",
            "pings": len(arr),
            "columns": ["x", "y", "intensity"],
        })
        # Reshape to (pings × 1) intensity column for pipeline compatibility
        return arr[:, 2:3]

    def _load_s7k(self) -> np.ndarray:
        """Teledyne Reson .s7k — binary packet stream (stub)."""
        logger.warning(".s7k: full packet parser not yet implemented — returning zeros")
        size = os.path.getsize(self.file_path)
        pings = max(1, size // 4096)
        self.metadata.update({"format": "S7K", "file_bytes": size, "pings": pings})
        return np.zeros((pings, 512), dtype=np.float32)

    def _load_all(self) -> np.ndarray:
        """Kongsberg .all — binary datagram stream (stub)."""
        logger.warning(".all: full datagram parser not yet implemented — returning zeros")
        size = os.path.getsize(self.file_path)
        pings = max(1, size // 8192)
        self.metadata.update({"format": "ALL", "file_bytes": size, "pings": pings})
        return np.zeros((pings, 1024), dtype=np.float32)

    def _load_jsf(self) -> np.ndarray:
        """EdgeTech .jsf — binary JSF format (stub)."""
        logger.warning(".jsf: JSF parser not yet implemented — returning zeros")
        size = os.path.getsize(self.file_path)
        pings = max(1, size // 2048)
        self.metadata.update({"format": "JSF", "file_bytes": size, "pings": pings})
        return np.zeros((pings, 512), dtype=np.float32)

    def _load_xtf(self) -> np.ndarray:
        """Triton .xtf — binary XTF format (stub)."""
        logger.warning(".xtf: XTF parser not yet implemented — returning zeros")
        size = os.path.getsize(self.file_path)
        pings = max(1, size // 4096)
        self.metadata.update({"format": "XTF", "file_bytes": size, "pings": pings})
        return np.zeros((pings, 512), dtype=np.float32)
