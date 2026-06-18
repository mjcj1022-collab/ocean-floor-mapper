"""
Depth contour generator — produces vector contour lines from a raster mosaic.

Outputs:
  - GeoJSON FeatureCollection of LineString contours
  - Shapefile via geopandas (optional)
  - ArcGIS-ready format via arcpy (optional)
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import numpy as np

from utils.logger import get_logger

logger = get_logger(__name__)


class ContourGenerator:
    """
    Generate depth contour lines from a 2-D sonar/bathymetric mosaic.

    Uses the marching-squares algorithm to trace iso-intensity contours,
    then optionally reprojects them to geographic coordinates.

    Example:
        gen = ContourGenerator(mosaic, bounds, depth_range=(0, 4500))
        geojson = gen.generate(interval=250)
        gen.save_geojson(geojson, "contours.geojson")
    """

    def __init__(
        self,
        mosaic: np.ndarray,
        bounds: Optional[Dict] = None,
        depth_range: Tuple[float, float] = (0.0, 4500.0),
    ):
        """
        Parameters
        ----------
        mosaic      : 2-D float32 array, values 0–1 (0 = shallow, 1 = deep)
        bounds      : dict with min_lat/max_lat/min_lon/max_lon
        depth_range : (min_depth_m, max_depth_m) corresponding to mosaic 0–1
        """
        self.mosaic = mosaic.astype(np.float64)
        self.bounds = bounds or {}
        self.depth_min, self.depth_max = depth_range
        self._h, self._w = mosaic.shape

    def generate(
        self,
        interval: float = 250.0,
        smooth: bool = True,
    ) -> Dict:
        """
        Trace contour lines at every `interval` metres of depth.

        Returns a GeoJSON FeatureCollection.
        """
        depth_span = self.depth_max - self.depth_min
        levels_depth = np.arange(
            self.depth_min + interval,
            self.depth_max,
            interval,
        )
        # Convert depth levels to mosaic intensity values
        levels_intensity = (levels_depth - self.depth_min) / depth_span

        logger.info(
            f"Generating contours: {len(levels_depth)} levels, "
            f"interval={interval} m"
        )

        features = []
        for depth, intensity in zip(levels_depth, levels_intensity):
            segments = self._marching_squares(float(intensity))
            if not segments:
                continue
            chains = self._chain_segments(segments, smooth=smooth)
            for chain in chains:
                coords = self._pixels_to_coords(chain)
                if len(coords) < 2:
                    continue
                features.append({
                    "type": "Feature",
                    "geometry": {
                        "type": "LineString",
                        "coordinates": coords,
                    },
                    "properties": {
                        "depth_m": round(depth, 1),
                        "intensity": round(intensity, 4),
                    },
                })

        logger.info(f"Generated {len(features)} contour features")
        return {
            "type": "FeatureCollection",
            "features": features,
            "metadata": {
                "interval_m": interval,
                "depth_range": [self.depth_min, self.depth_max],
                "bounds": self.bounds,
                "contour_count": len(features),
            },
        }

    def save_geojson(self, geojson: Dict, path: str) -> str:
        out = Path(path)
        out.parent.mkdir(parents=True, exist_ok=True)
        with open(out, "w") as f:
            json.dump(geojson, f, indent=2)
        logger.info(f"Contours saved: {out} ({len(geojson['features'])} features)")
        return str(out)

    def save_shapefile(self, geojson: Dict, path: str) -> Optional[str]:
        """Save contours as an ESRI Shapefile via geopandas."""
        try:
            import geopandas as gpd
            from shapely.geometry import shape

            features = geojson.get("features", [])
            if not features:
                return None
            gdf = gpd.GeoDataFrame.from_features(features, crs="EPSG:4326")
            out = Path(path).with_suffix(".shp")
            out.parent.mkdir(parents=True, exist_ok=True)
            gdf.to_file(str(out))
            logger.info(f"Shapefile saved: {out}")
            return str(out)
        except ImportError:
            logger.warning("geopandas not installed — shapefile export skipped")
            return None
        except Exception as e:
            logger.error(f"Shapefile export failed: {e}")
            return None

    # ------------------------------------------------------------------
    # Marching squares implementation
    # ------------------------------------------------------------------

    def _marching_squares(self, level: float) -> List[Tuple]:
        """
        Trace all iso-contour segments at `level` using marching squares.

        Returns a list of ((x1,y1),(x2,y2)) pixel-coordinate segment pairs.
        """
        segments = []
        m = self.mosaic
        h, w = self._h, self._w

        for r in range(h - 1):
            for c in range(w - 1):
                # Corners: top-left, top-right, bottom-right, bottom-left
                v = [
                    m[r,   c],
                    m[r,   c+1],
                    m[r+1, c+1],
                    m[r+1, c],
                ]
                case = sum(1 << i for i, vi in enumerate(v) if vi >= level)

                if case in (0, 15):
                    continue  # all inside or all outside

                segs = self._lookup(case, v, level, r, c)
                segments.extend(segs)

        return segments

    @staticmethod
    def _interp(va: float, vb: float, level: float, a: float, b: float) -> float:
        """Linear interpolation of crossing point between a and b."""
        if abs(vb - va) < 1e-10:
            return (a + b) / 2
        t = (level - va) / (vb - va)
        return a + t * (b - a)

    def _lookup(self, case: int, v: List[float], level: float,
                r: int, c: int) -> List[Tuple]:
        """
        Given a marching-squares case index and corner values,
        return the edge segment(s) in pixel coordinates.
        """
        # Edge midpoints by linear interpolation
        top    = (self._interp(v[0], v[1], level, c, c+1), r)
        right  = (c+1, self._interp(v[1], v[2], level, r, r+1))
        bottom = (self._interp(v[3], v[2], level, c, c+1), r+1)
        left   = (c,   self._interp(v[0], v[3], level, r, r+1))

        table = {
            1:  [(left,   top)],
            2:  [(top,    right)],
            3:  [(left,   right)],
            4:  [(right,  bottom)],
            5:  [(left,   top),   (right, bottom)],
            6:  [(top,    bottom)],
            7:  [(left,   bottom)],
            8:  [(bottom, left)],
            9:  [(top,    bottom)],
            10: [(top,    left),  (bottom, right)],
            11: [(top,    right)],
            12: [(right,  left)],
            13: [(right,  top)],
            14: [(bottom, top)],
        }
        return table.get(case, [])

    @staticmethod
    def _chain_segments(segments: List[Tuple], smooth: bool = True) -> List[List]:
        """
        Connect individual segments into polylines by endpoint matching.
        Returns list of coordinate chains (each a list of (x,y) tuples).
        """
        if not segments:
            return []

        eps = 0.6  # pixels — snap tolerance
        adjacency: Dict[Tuple, List] = {}

        def key(pt):
            return (round(pt[0] / eps), round(pt[1] / eps))

        for seg in segments:
            a, b = seg
            ka, kb = key(a), key(b)
            adjacency.setdefault(ka, []).append((kb, b, seg))
            adjacency.setdefault(kb, []).append((ka, a, seg))

        visited = set()
        chains = []

        for seg in segments:
            if id(seg) in visited:
                continue
            visited.add(id(seg))
            chain = [seg[0], seg[1]]
            # Extend forward
            while True:
                k = key(chain[-1])
                neighbors = [
                    (nk, pt, s)
                    for nk, pt, s in adjacency.get(k, [])
                    if id(s) not in visited
                ]
                if not neighbors:
                    break
                nk, pt, s = neighbors[0]
                visited.add(id(s))
                chain.append(pt)
            chains.append(chain)

        if smooth:
            chains = [_smooth_chain(c) for c in chains]

        return chains

    def _pixels_to_coords(self, chain: List) -> List[List[float]]:
        """Convert pixel (col, row) pairs to [lon, lat] geographic coordinates."""
        if not self.bounds:
            return [[round(float(x), 2), round(float(y), 2)] for x, y in chain]

        lat_range = self.bounds.get("max_lat", 0) - self.bounds.get("min_lat", 0)
        lon_range = self.bounds.get("max_lon", 0) - self.bounds.get("min_lon", 0)
        coords = []
        for col, row in chain:
            lon = self.bounds["min_lon"] + (col / self._w) * lon_range
            lat = self.bounds["max_lat"] - (row / self._h) * lat_range
            coords.append([round(lon, 6), round(lat, 6)])
        return coords


def _smooth_chain(chain: List, window: int = 3) -> List:
    """Simple moving-average smoothing of a coordinate chain."""
    if len(chain) <= window:
        return chain
    half = window // 2
    smoothed = list(chain[:half])
    for i in range(half, len(chain) - half):
        xs = [chain[j][0] for j in range(i - half, i + half + 1)]
        ys = [chain[j][1] for j in range(i - half, i + half + 1)]
        smoothed.append((sum(xs) / len(xs), sum(ys) / len(ys)))
    smoothed.extend(chain[-half:])
    return smoothed
