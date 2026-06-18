"""Configuration manager — loads and validates config.yaml."""
import yaml
from pathlib import Path
from typing import Any, Dict


class ConfigManager:
    DEFAULTS: Dict[str, Any] = {
        "data": {
            "raw": "./data/raw",
            "processed": "./data/processed",
            "outputs": "./data/outputs",
        },
        "survey": {
            "coordinate_system": "WGS84",
            "depth_unit": "meters",
        },
        "logging": {
            "level": "INFO",
            "file": "./logs/mapper.log",
        },
    }

    def __init__(self, path: str = "config.yaml"):
        self.path = Path(path)

    def load(self) -> Dict[str, Any]:
        config = dict(self.DEFAULTS)
        if self.path.exists():
            with open(self.path, "r") as f:
                user_config = yaml.safe_load(f) or {}
            config = self._deep_merge(config, user_config)
        return config

    @staticmethod
    def _deep_merge(base: Dict, override: Dict) -> Dict:
        result = dict(base)
        for k, v in override.items():
            if k in result and isinstance(result[k], dict) and isinstance(v, dict):
                result[k] = ConfigManager._deep_merge(result[k], v)
            else:
                result[k] = v
        return result
