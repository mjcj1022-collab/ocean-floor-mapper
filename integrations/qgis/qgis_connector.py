"""QGIS connector — wraps PyQGIS for visualization and analysis."""
from utils.logger import get_logger
logger = get_logger(__name__)

class QGISConnector:
    def __init__(self):
        try:
            from qgis.core import QgsApplication, QgsProject, QgsRasterLayer
            self._qgs = QgsApplication([], False)
            self._qgs.initQgis()
            self._project = QgsProject.instance()
            logger.info("QGIS initialized")
        except ImportError:
            self._qgs = None
            self._project = None
            logger.warning("PyQGIS not available — QGIS features disabled")

    def load_raster(self, file_path: str):
        if self._qgs is None:
            return None
        from qgis.core import QgsRasterLayer, QgsProject
        layer = QgsRasterLayer(file_path, "Sonar Mosaic")
        if layer.isValid():
            QgsProject.instance().addMapLayer(layer)
        return layer if layer.isValid() else None

    def run_analysis(self, layer_name: str, analysis_type: str, **kwargs) -> str:
        raise NotImplementedError(f"QGIS analysis '{analysis_type}' not yet implemented")

    def __del__(self):
        if self._qgs:
            self._qgs.exitQgis()
