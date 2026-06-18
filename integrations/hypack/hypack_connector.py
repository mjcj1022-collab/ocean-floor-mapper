"""Hypack connector stub."""
from utils.logger import get_logger
logger = get_logger(__name__)

class HypackConnector:
    def __init__(self, hypack_path: str = "C:/Program Files/HYPACK/HYPACK.exe"):
        self.path = hypack_path
        logger.info(f"Hypack connector initialized (path: {self.path})")

    def import_raw(self, raw_file: str) -> dict:
        raise NotImplementedError("Hypack raw file import not yet implemented")

    def export_xyz(self, project_path: str, output_path: str) -> str:
        raise NotImplementedError("Hypack XYZ export not yet implemented")
