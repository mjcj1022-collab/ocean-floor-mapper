"""Smoke tests — no real sonar files needed."""
import numpy as np
import pytest
from core.processing.mosaic_creator import MosaicCreator
from automation.target_analysis import TargetAnalysis

def test_mosaic_simple_stack():
    scans = [np.random.rand(10, 100).astype(np.float32)]
    mosaic, bounds = MosaicCreator.create_mosaic(scans, [], resolution=1.0)
    assert mosaic.ndim == 2

def test_target_analysis_empty():
    mosaic = np.zeros((100, 200), dtype=np.float32)
    analyzer = TargetAnalysis(mosaic, {}, resolution_m=1.0)
    targets = analyzer.detect(intensity_threshold=0.5)
    assert targets == []

def test_target_analysis_detects():
    mosaic = np.zeros((100, 200), dtype=np.float32)
    mosaic[45:55, 95:105] = 0.9
    analyzer = TargetAnalysis(mosaic, {}, resolution_m=1.0)
    targets = analyzer.detect(intensity_threshold=0.75, min_blob_px=4)
    assert len(targets) >= 1
    assert targets[0].confidence > 0

def test_kml_exporter_saves(tmp_path):
    from integrations.google_earth.kml_exporter import KMLExporter
    exp = KMLExporter()
    exp.add_track([{"lat": 28.45, "lon": -92.83}])
    out = tmp_path / "test.kml"
    exp.save(str(out))
    assert out.exists()
    assert "<kml" in out.read_text()
