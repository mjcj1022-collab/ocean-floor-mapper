"""SonarWiz connector — CLI/COM automation."""
import subprocess
from pathlib import Path
from utils.logger import get_logger
logger = get_logger(__name__)

DEFAULT_PATH = "C:/Program Files/SonarWiz/SonarWiz.exe"

class SonarWizConnector:
    def __init__(self, sonarwiz_path: str = DEFAULT_PATH):
        self.path = Path(sonarwiz_path)

    def process_file(self, input_path: str, output_path: str, script: str) -> bool:
        if not self.path.exists():
            logger.warning(f"SonarWiz not found at {self.path}")
            return False
        cmd = f'"{self.path}" /script "{script}" /input "{input_path}" /output "{output_path}"'
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        if result.returncode != 0:
            logger.error(f"SonarWiz error: {result.stderr}")
        return result.returncode == 0
