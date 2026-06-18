"""ArcGIS Pro connector — wraps arcpy for spatial analysis automation."""
import numpy as np
from utils.logger import get_logger
logger = get_logger(__name__)

class ArcGISConnector:
    def __init__(self, license_level="Advanced"):
        self.license_level = license_level
        try:
            import arcpy
            self._arcpy = arcpy
            logger.info("ArcGIS arcpy loaded")
        except ImportError:
            self._arcpy = None
            logger.warning("arcpy not available — ArcGIS features disabled")

    def export_raster(self, array: np.ndarray, name: str, bounds: dict) -> str:
        if self._arcpy is None:
            logger.warning("ArcGIS export skipped (arcpy not installed)")
            return name
        logger.info(f"Exporting raster to ArcGIS: {name}")
        raise NotImplementedError("Implement with arcpy.NumPyArrayToRaster()")

    def run_spatial_analysis(self, raster_path: str, analysis_type: str, **kwargs) -> str:
        if self._arcpy is None:
            return raster_path
        if analysis_type == "contour":
            return self._generate_contours(raster_path, **kwargs)
        elif analysis_type == "slope":
            return self._generate_slope(raster_path)
        raise ValueError(f"Unknown analysis type: {analysis_type}")

    def _generate_contours(self, raster: str, interval: float = 1.0) -> str:
        out = f"{raster}_contours"
        self._arcpy.sa.Contour(raster, out, interval).save()
        return out

    def _generate_slope(self, raster: str) -> str:
        out = f"{raster}_slope"
        self._arcpy.sa.Slope(raster, out).save()
        return out
