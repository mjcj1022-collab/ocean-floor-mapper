"""
Survey pipeline — orchestrates the full sonar → mosaic → GIS → report workflow.
"""
from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

from core.data_io.sonar_loader import SonarLoader
from core.data_io.gps_loader import GPSLoader
from core.processing.mosaic_creator import MosaicCreator
from automation.target_analysis import TargetAnalysis
from utils.logger import get_logger

logger = get_logger(__name__)


class SurveyPipeline:
    """
    End-to-end survey orchestrator.

    Steps:
      1. Load sonar files
      2. Load GPS track
      3. Noise reduction (optional)
      4. Mosaic stitching
      5. Target detection
      6. ArcGIS export (optional)
      7. QGIS visualization (optional)
      8. Google Earth KML export
      9. PDF report generation (optional)

    Example:
        pipeline = SurveyPipeline(config=config, output_dir="./data/outputs")
        results = pipeline.run(sonar_files=["scan1.xyx"], gps_file="track.gpx")
    """

    def __init__(
        self,
        config: Dict,
        output_dir: str = "./data/outputs",
        use_arcgis: bool = True,
        use_qgis: bool = True,
        generate_report: bool = True,
        contour_interval: float = 0.5,
        target_threshold: float = 0.75,
        mosaic_resolution: float = 0.5,
    ):
        self.config = config
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.use_arcgis = use_arcgis
        self.use_qgis = use_qgis
        self.generate_report = generate_report
        self.contour_interval = contour_interval
        self.target_threshold = target_threshold
        self.mosaic_resolution = mosaic_resolution

        self._session_id = datetime.now().strftime("%Y%m%d_%H%M%S")
        self._session_dir = self.output_dir / self._session_id
        self._session_dir.mkdir(parents=True, exist_ok=True)
        logger.info(f"Session: {self._session_id} → {self._session_dir}")

    def run(self, sonar_files: List[str], gps_file: str) -> Dict:
        """Run the full pipeline and return a results dict."""
        results: Dict = {"session_id": self._session_id, "steps": {}}

        # ── Step 1: Load sonar ─────────────────────────────────────────
        logger.info("Step 1/7 — Loading sonar data")
        scans, sonar_meta = self._load_sonar(sonar_files)
        results["steps"]["sonar_load"] = {"files": len(sonar_files), "meta": sonar_meta}

        # ── Step 2: Load GPS ───────────────────────────────────────────
        logger.info("Step 2/7 — Loading GPS data")
        gps_loader = GPSLoader(gps_file)
        gps_points = gps_loader.load()
        gps_points_dicts = gps_loader.to_dict_list()
        bounds = gps_loader.get_bounds() if gps_points else {}
        results["steps"]["gps_load"] = {"points": len(gps_points), "bounds": bounds}

        # ── Step 3: Mosaic ─────────────────────────────────────────────
        logger.info("Step 3/7 — Creating sonar mosaic")
        mosaic, mosaic_bounds = MosaicCreator.create_mosaic(
            scans,
            gps_points_dicts,
            resolution=self.mosaic_resolution,
        )
        mosaic_path = self._session_dir / "mosaic.npy"
        import numpy as np
        np.save(mosaic_path, mosaic)
        results["mosaic"] = str(mosaic_path)
        results["steps"]["mosaic"] = {
            "shape": list(mosaic.shape),
            "resolution_m": self.mosaic_resolution,
            "bounds": mosaic_bounds,
        }

        # ── Step 4: Target detection ────────────────────────────────────
        logger.info("Step 4/7 — Detecting targets")
        analyzer = TargetAnalysis(
            mosaic,
            mosaic_bounds,
            resolution_m=self.mosaic_resolution,
        )
        targets = analyzer.detect(intensity_threshold=self.target_threshold)
        targets_path = self._session_dir / "targets.json"
        with open(targets_path, "w") as f:
            json.dump([t.to_dict() for t in targets], f, indent=2)
        results["targets"] = str(targets_path)
        results["targets_count"] = len(targets)
        results["steps"]["target_detection"] = {"count": len(targets)}
        logger.info(f"Detected {len(targets)} targets")

        # ── Step 5: ArcGIS export ───────────────────────────────────────
        if self.use_arcgis:
            logger.info("Step 5/7 — Exporting to ArcGIS")
            arcgis_path = self._export_arcgis(mosaic, mosaic_bounds)
            results["arcgis"] = arcgis_path
        else:
            logger.info("Step 5/7 — ArcGIS export skipped")

        # ── Step 6: QGIS export ─────────────────────────────────────────
        if self.use_qgis:
            logger.info("Step 6/7 — Exporting to QGIS / GeoTIFF")
            geotiff_path = self._export_geotiff(mosaic, mosaic_bounds)
            results["geotiff"] = geotiff_path

        # ── Step 7: Google Earth KML ────────────────────────────────────
        kml_path = self._export_kml(targets, gps_points_dicts, mosaic_bounds)
        results["kml"] = kml_path

        # ── Step 8: Report ──────────────────────────────────────────────
        if self.generate_report:
            logger.info("Step 7/7 — Generating survey report")
            report_path = self._generate_report(results, targets)
            results["report"] = report_path
        else:
            logger.info("Step 7/7 — Report skipped")

        # ── Save full results JSON ──────────────────────────────────────
        results_path = self._session_dir / "results.json"
        with open(results_path, "w") as f:
            json.dump(results, f, indent=2, default=str)
        results["results_json"] = str(results_path)

        logger.info(f"Pipeline complete — outputs in {self._session_dir}")
        return results

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _load_sonar(self, sonar_files: List[str]):
        scans = []
        meta = []
        for f in sonar_files:
            loader = SonarLoader(f)
            scans.append(loader.load())
            meta.append(loader.get_metadata())
        return scans, meta

    def _export_arcgis(self, mosaic, bounds: Dict) -> str:
        try:
            from integrations.arcgis.arcgis_connector import ArcGISConnector
            arcgis_cfg = self.config.get("arcgis", {})
            connector = ArcGISConnector(arcgis_cfg.get("license", "Advanced"))
            out_path = str(self._session_dir / "arcgis_raster")
            connector.export_raster(mosaic, out_path, bounds)
            return out_path
        except Exception as e:
            logger.warning(f"ArcGIS export failed: {e}")
            return "skipped"

    def _export_geotiff(self, mosaic, bounds: Dict) -> str:
        try:
            import rasterio
            from rasterio.transform import from_bounds

            out_path = self._session_dir / "mosaic.tif"
            if bounds:
                transform = from_bounds(
                    bounds["min_lon"], bounds["min_lat"],
                    bounds["max_lon"], bounds["max_lat"],
                    mosaic.shape[1], mosaic.shape[0],
                )
                with rasterio.open(
                    out_path, "w", driver="GTiff",
                    height=mosaic.shape[0], width=mosaic.shape[1],
                    count=1, dtype="float32",
                    crs="EPSG:4326", transform=transform,
                ) as dst:
                    dst.write(mosaic[None, :, :])
            else:
                with rasterio.open(
                    out_path, "w", driver="GTiff",
                    height=mosaic.shape[0], width=mosaic.shape[1],
                    count=1, dtype="float32",
                ) as dst:
                    dst.write(mosaic[None, :, :])
            logger.info(f"GeoTIFF saved: {out_path}")
            return str(out_path)
        except ImportError:
            logger.warning("rasterio not installed — GeoTIFF export skipped")
            return "skipped"
        except Exception as e:
            logger.warning(f"GeoTIFF export failed: {e}")
            return "error"

    def _export_kml(self, targets, gps_points, bounds: Dict) -> str:
        from integrations.google_earth.kml_exporter import KMLExporter
        out_path = self._session_dir / "survey.kml"
        exporter = KMLExporter()
        exporter.add_track(gps_points)
        for t in targets:
            exporter.add_target(t)
        exporter.save(str(out_path))
        return str(out_path)

    def _generate_report(self, results: Dict, targets) -> str:
        from automation.report_generator import ReportGenerator
        rg = ReportGenerator(self._session_dir)
        out_path = rg.generate(results, targets)
        return out_path
