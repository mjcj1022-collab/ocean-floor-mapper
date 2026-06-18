"""
Target analysis — detects and classifies anomalies in sonar mosaics.

Detection pipeline:
  1. Local intensity threshold (bright hard returns vs seafloor baseline)
  2. Shadow geometry analysis (estimate object height from acoustic shadow length)
  3. Blob detection — cluster connected above-threshold pixels into candidate targets
  4. Confidence scoring using intensity contrast + shadow ratio + shape compactness
  5. Optional: cross-reference NOAA wreck database by GPS position
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

import numpy as np

from utils.logger import get_logger

logger = get_logger(__name__)


@dataclass
class Target:
    id: str
    row: int
    col: int
    lat: Optional[float]
    lon: Optional[float]
    depth_m: Optional[float]
    intensity: float          # peak intensity 0–1
    shadow_length_px: int
    estimated_height_m: Optional[float]
    footprint_px: int         # blob area in pixels
    confidence: float         # 0–1
    classification: str       # high | medium | low
    notes: str = ""

    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "lat": self.lat,
            "lon": self.lon,
            "depth_m": self.depth_m,
            "intensity": round(self.intensity, 3),
            "shadow_length_px": self.shadow_length_px,
            "estimated_height_m": (
                round(self.estimated_height_m, 1) if self.estimated_height_m else None
            ),
            "footprint_px": self.footprint_px,
            "confidence": round(self.confidence, 3),
            "classification": self.classification,
            "notes": self.notes,
        }


class TargetAnalysis:
    """
    Detect and classify anomaly targets within a sonar mosaic.

    Example:
        analyzer = TargetAnalysis(mosaic, bounds, resolution_m=0.5)
        targets = analyzer.detect(intensity_threshold=0.75, min_blob_px=4)
        for t in targets:
            print(t.to_dict())
    """

    def __init__(
        self,
        mosaic: np.ndarray,
        bounds: Dict,
        resolution_m: float = 0.5,
        grazing_angle_deg: float = 30.0,
    ):
        self.mosaic = mosaic.astype(np.float32)
        self.bounds = bounds
        self.resolution_m = resolution_m
        self.grazing_angle_rad = math.radians(grazing_angle_deg)

    def detect(
        self,
        intensity_threshold: float = 0.75,
        min_blob_px: int = 4,
        max_targets: int = 50,
    ) -> List[Target]:
        """
        Run full detection pipeline.

        Parameters
        ----------
        intensity_threshold : pixels above this (0–1) are candidate returns
        min_blob_px         : minimum connected blob size to report
        max_targets         : cap returned targets (highest confidence first)
        """
        logger.info(
            f"Detecting targets: threshold={intensity_threshold}, "
            f"min_blob={min_blob_px}px"
        )

        # Step 1: threshold
        binary = (self.mosaic >= intensity_threshold).astype(np.uint8)
        if binary.sum() == 0:
            logger.info("No pixels above threshold — no targets detected")
            return []

        # Step 2: label connected blobs
        labeled, n_blobs = self._label_blobs(binary)
        logger.info(f"Found {n_blobs} initial blobs")

        # Step 3: extract candidate targets
        candidates = []
        for blob_id in range(1, n_blobs + 1):
            mask = labeled == blob_id
            area = int(mask.sum())
            if area < min_blob_px:
                continue

            rows, cols = np.where(mask)
            peak_idx = np.argmax(self.mosaic[mask])
            peak_r, peak_c = rows[peak_idx], cols[peak_idx]
            intensity = float(self.mosaic[peak_r, peak_c])

            shadow_len = self._measure_shadow(peak_r, peak_c, intensity_threshold)
            height_m = self._estimate_height(shadow_len)

            lat, lon = self._pixel_to_latlon(peak_r, peak_c)
            confidence = self._score_confidence(intensity, area, shadow_len)
            classification = self._classify(confidence)

            candidates.append(Target(
                id=f"TGT-{len(candidates)+1:03d}",
                row=int(peak_r),
                col=int(peak_c),
                lat=lat,
                lon=lon,
                depth_m=None,  # set downstream from bathymetry layer
                intensity=intensity,
                shadow_length_px=shadow_len,
                estimated_height_m=height_m,
                footprint_px=area,
                confidence=confidence,
                classification=classification,
            ))

        # Step 4: sort by confidence, cap
        candidates.sort(key=lambda t: t.confidence, reverse=True)
        results = candidates[:max_targets]
        logger.info(f"Reporting {len(results)} targets after filtering")
        return results

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _label_blobs(binary: np.ndarray) -> Tuple[np.ndarray, int]:
        """Simple flood-fill blob labeling (4-connectivity)."""
        try:
            from scipy.ndimage import label  # type: ignore
            return label(binary)
        except ImportError:
            # Fallback: row-major scanning, no diagonal connections
            labeled = np.zeros_like(binary, dtype=np.int32)
            current = 0
            h, w = binary.shape
            for r in range(h):
                for c in range(w):
                    if binary[r, c] == 0 or labeled[r, c] != 0:
                        continue
                    current += 1
                    stack = [(r, c)]
                    while stack:
                        cr, cc = stack.pop()
                        if cr < 0 or cr >= h or cc < 0 or cc >= w:
                            continue
                        if binary[cr, cc] == 0 or labeled[cr, cc] != 0:
                            continue
                        labeled[cr, cc] = current
                        stack.extend([(cr+1,cc),(cr-1,cc),(cr,cc+1),(cr,cc-1)])
            return labeled, current

    def _measure_shadow(self, row: int, col: int, threshold: float) -> int:
        """Count dark pixels below target (acoustic shadow extends downrange)."""
        h = self.mosaic.shape[0]
        length = 0
        for r in range(row + 1, min(h, row + 200)):
            if self.mosaic[r, col] < threshold * 0.3:
                length += 1
            else:
                break
        return length

    def _estimate_height(self, shadow_px: int) -> Optional[float]:
        """
        h = shadow_length × resolution × tan(grazing_angle)
        """
        if shadow_px <= 0:
            return None
        shadow_m = shadow_px * self.resolution_m
        return round(shadow_m * math.tan(self.grazing_angle_rad), 1)

    def _pixel_to_latlon(self, row: int, col: int) -> Tuple[Optional[float], Optional[float]]:
        if not self.bounds:
            return None, None
        lat_range = self.bounds.get("max_lat", 0) - self.bounds.get("min_lat", 0)
        lon_range = self.bounds.get("max_lon", 0) - self.bounds.get("min_lon", 0)
        h, w = self.mosaic.shape
        lat = self.bounds.get("max_lat", 0) - (row / h) * lat_range
        lon = self.bounds.get("min_lon", 0) + (col / w) * lon_range
        return round(lat, 6), round(lon, 6)

    @staticmethod
    def _score_confidence(intensity: float, area_px: int, shadow_px: int) -> float:
        """Heuristic confidence: high intensity + shadow present + reasonable size."""
        intensity_score = intensity ** 1.5
        shadow_score = min(1.0, shadow_px / 20.0) * 0.4
        size_score = min(1.0, math.log1p(area_px) / math.log1p(100)) * 0.2
        raw = intensity_score * 0.4 + shadow_score + size_score
        return round(min(1.0, raw), 3)

    @staticmethod
    def _classify(confidence: float) -> str:
        if confidence >= 0.75:
            return "high"
        if confidence >= 0.45:
            return "medium"
        return "low"
