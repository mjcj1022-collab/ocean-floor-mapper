"""Mosaic creator — stitches multiple sonar scans into a georeferenced mosaic."""
from __future__ import annotations

from pathlib import Path
from typing import Dict, List, Optional, Tuple

import numpy as np

from utils.logger import get_logger

logger = get_logger(__name__)


class MosaicCreator:
    """
    Stitch multiple sonar ping arrays into a single 2-D georeferenced mosaic.

    The mosaicking process:
      1. Georeference each ping using its GPS position + vessel heading
      2. Project all pings onto a common UTM grid at target resolution
      3. Blend overlapping regions using a weighted average (nadir-down weighting)
      4. Fill gaps via nearest-neighbour interpolation

    Example:
        scans = [SonarLoader(f).load() for f in files]
        gps   = GPSLoader("track.gpx").load()
        mosaic, bounds = MosaicCreator.create_mosaic(scans, gps, resolution=0.5)
    """

    @staticmethod
    def create_mosaic(
        scans: List[np.ndarray],
        gps_points: List[Dict],
        resolution: float = 0.5,          # metres per pixel
        swath_width: float = 200.0,       # total swath width in metres
        overlap_blend: bool = True,
    ) -> Tuple[np.ndarray, Dict]:
        """
        Parameters
        ----------
        scans       : list of (N_pings, N_samples) arrays
        gps_points  : list of dicts with keys lat, lon, [heading, timestamp]
        resolution  : output grid resolution in metres per pixel
        swath_width : total sonar swath width in metres
        overlap_blend : average overlapping regions (vs last-writer-wins)

        Returns
        -------
        mosaic : 2-D float32 array  (intensity 0–1)
        meta   : dict with grid bounds and resolution
        """
        logger.info(
            f"Creating mosaic from {len(scans)} scan(s), "
            f"resolution={resolution}m, swath={swath_width}m"
        )

        if not scans:
            raise ValueError("No scans provided")

        if len(gps_points) < 2:
            logger.warning("Fewer than 2 GPS points — producing uncorrected mosaic")
            return MosaicCreator._simple_stack(scans), {}

        # Determine output grid dimensions from GPS track bounding box
        lats = [p["lat"] for p in gps_points]
        lons = [p["lon"] for p in gps_points]
        lat_c = (max(lats) + min(lats)) / 2.0

        metres_per_deg_lat = 111_319.5
        metres_per_deg_lon = 111_319.5 * np.cos(np.radians(lat_c))

        track_height_m = (max(lats) - min(lats)) * metres_per_deg_lat + swath_width
        track_width_m  = (max(lons) - min(lons)) * metres_per_deg_lon + swath_width

        grid_h = max(1, int(np.ceil(track_height_m / resolution)))
        grid_w = max(1, int(np.ceil(track_width_m  / resolution)))

        # Cap to reasonable size for memory safety
        MAX_PIXELS = 8000
        if grid_h > MAX_PIXELS or grid_w > MAX_PIXELS:
            scale = MAX_PIXELS / max(grid_h, grid_w)
            grid_h = int(grid_h * scale)
            grid_w = int(grid_w * scale)
            resolution /= scale
            logger.warning(f"Grid capped to {grid_h}×{grid_w} px at {resolution:.2f} m/px")

        accumulator = np.zeros((grid_h, grid_w), dtype=np.float64)
        weight_map  = np.zeros((grid_h, grid_w), dtype=np.float64)

        bounds = {
            "min_lat": min(lats), "max_lat": max(lats),
            "min_lon": min(lons), "max_lon": max(lons),
            "resolution_m": resolution,
            "grid_shape": (grid_h, grid_w),
        }

        samples_per_ping = scans[0].shape[1] if scans[0].ndim > 1 else 1
        half_swath_px = int((swath_width / 2) / resolution)

        for scan_idx, scan in enumerate(scans):
            if scan.ndim == 1:
                scan = scan[:, np.newaxis]

            ping_count = scan.shape[0]
            gps_step = max(1, len(gps_points) // max(1, ping_count))

            for ping_i in range(ping_count):
                gps_i = min(ping_i * gps_step, len(gps_points) - 1)
                pt = gps_points[gps_i]

                # Convert GPS to grid pixel coordinates
                row_f = ((max(lats) - pt["lat"]) * metres_per_deg_lat / resolution)
                col_f = ((pt["lon"] - min(lons)) * metres_per_deg_lon / resolution)
                row_c = int(np.clip(row_f, 0, grid_h - 1))

                ping_data = scan[ping_i].astype(np.float64)
                # Normalize ping to 0–1
                p_min, p_max = ping_data.min(), ping_data.max()
                if p_max > p_min:
                    ping_data = (ping_data - p_min) / (p_max - p_min)

                # Map samples across swath
                for s_i, intensity in enumerate(ping_data):
                    col_offset = int((s_i / len(ping_data) - 0.5) * 2 * half_swath_px)
                    col_c = int(np.clip(col_f + col_offset, 0, grid_w - 1))
                    nadir_weight = 1.0 - abs(s_i / len(ping_data) - 0.5) * 2.0 * 0.5
                    accumulator[row_c, col_c] += intensity * nadir_weight
                    weight_map[row_c, col_c]  += nadir_weight

        # Normalise
        with np.errstate(invalid="ignore", divide="ignore"):
            mosaic = np.where(weight_map > 0, accumulator / weight_map, 0.0)

        # Fill small gaps with nearest-neighbour
        mosaic = MosaicCreator._fill_gaps(mosaic, weight_map)

        logger.info(f"Mosaic complete: {mosaic.shape[0]}×{mosaic.shape[1]} px")
        return mosaic.astype(np.float32), bounds

    @staticmethod
    def _simple_stack(scans: List[np.ndarray]) -> np.ndarray:
        """Fallback: vertically concatenate all scans."""
        arrays = []
        for s in scans:
            if s.ndim == 1:
                s = s[:, np.newaxis]
            arrays.append(s)
        stacked = np.vstack(arrays).astype(np.float32)
        mn, mx = stacked.min(), stacked.max()
        if mx > mn:
            stacked = (stacked - mn) / (mx - mn)
        return stacked

    @staticmethod
    def _fill_gaps(mosaic: np.ndarray, weight_map: np.ndarray) -> np.ndarray:
        """Simple 3×3 mean filter to fill zero-weight pixels."""
        from scipy.ndimage import uniform_filter  # type: ignore
        try:
            filled = uniform_filter(mosaic, size=3, mode="reflect")
            return np.where(weight_map > 0, mosaic, filled)
        except ImportError:
            return mosaic
