"""GPS / navigation data loader — supports .gpx, .csv, .nmea."""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

from utils.logger import get_logger

logger = get_logger(__name__)


@dataclass
class GPSPoint:
    lat: float
    lon: float
    timestamp: Optional[datetime] = None
    altitude: Optional[float] = None
    heading: Optional[float] = None
    speed: Optional[float] = None
    fix_quality: int = 1

    def to_dict(self) -> Dict:
        return {
            "lat": self.lat,
            "lon": self.lon,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "altitude": self.altitude,
            "heading": self.heading,
            "speed": self.speed,
            "fix_quality": self.fix_quality,
        }


class GPSLoader:
    """
    Load GPS/navigation data from various formats.

    Supported formats:
        .gpx   — GPS Exchange Format (XML)
        .csv   — Comma-separated: lat, lon [, timestamp, alt, heading, speed]
        .nmea  — NMEA 0183 sentence stream

    Example:
        loader = GPSLoader("data/raw/track.gpx")
        points = loader.load()
        bounds = loader.get_bounds()
    """

    def __init__(self, file_path: str):
        self.file_path = Path(file_path)
        self.ext = self.file_path.suffix.lower()
        self.points: List[GPSPoint] = []
        self._bounds: Optional[Dict] = None

    def load(self) -> List[GPSPoint]:
        if not self.file_path.exists():
            raise FileNotFoundError(f"GPS file not found: {self.file_path}")

        logger.info(f"Loading GPS file: {self.file_path.name}")

        dispatch = {
            ".gpx": self._load_gpx,
            ".csv": self._load_csv,
            ".nmea": self._load_nmea,
            ".txt": self._load_nmea,
        }
        loader_fn = dispatch.get(self.ext)
        if loader_fn is None:
            raise ValueError(f"Unsupported GPS format: {self.ext}")

        self.points = loader_fn()
        logger.info(f"Loaded {len(self.points)} GPS points")
        return self.points

    def get_bounds(self) -> Dict[str, float]:
        """Return min/max lat/lon bounding box."""
        if not self.points:
            raise RuntimeError("No GPS data loaded — call load() first")
        lats = [p.lat for p in self.points]
        lons = [p.lon for p in self.points]
        self._bounds = {
            "min_lat": min(lats), "max_lat": max(lats),
            "min_lon": min(lons), "max_lon": max(lons),
        }
        return self._bounds

    def to_dict_list(self) -> List[Dict]:
        return [p.to_dict() for p in self.points]

    # ------------------------------------------------------------------
    # Format-specific loaders
    # ------------------------------------------------------------------

    def _load_gpx(self) -> List[GPSPoint]:
        try:
            import gpxpy
            with open(self.file_path, "r") as f:
                gpx = gpxpy.parse(f)
            points = []
            for track in gpx.tracks:
                for segment in track.segments:
                    for pt in segment.points:
                        points.append(GPSPoint(
                            lat=pt.latitude,
                            lon=pt.longitude,
                            timestamp=pt.time,
                            altitude=pt.elevation,
                        ))
            return points
        except ImportError:
            logger.warning("gpxpy not installed — install with: pip install gpxpy")
            return []

    def _load_csv(self) -> List[GPSPoint]:
        import csv
        points = []
        with open(self.file_path, "r", newline="") as f:
            reader = csv.DictReader(f)
            headers = [h.lower().strip() for h in (reader.fieldnames or [])]
            for row in reader:
                row_lower = {k.lower().strip(): v for k, v in row.items()}
                try:
                    lat = float(row_lower.get("lat") or row_lower.get("latitude", 0))
                    lon = float(row_lower.get("lon") or row_lower.get("longitude", 0))
                    ts_str = row_lower.get("timestamp") or row_lower.get("time") or row_lower.get("datetime")
                    ts = None
                    if ts_str:
                        try:
                            ts = datetime.fromisoformat(ts_str)
                        except ValueError:
                            pass
                    points.append(GPSPoint(
                        lat=lat,
                        lon=lon,
                        timestamp=ts,
                        altitude=float(row_lower["alt"]) if "alt" in row_lower else None,
                        heading=float(row_lower["heading"]) if "heading" in row_lower else None,
                        speed=float(row_lower["speed"]) if "speed" in row_lower else None,
                    ))
                except (ValueError, KeyError) as e:
                    logger.debug(f"Skipping CSV row: {e}")
        return points

    def _load_nmea(self) -> List[GPSPoint]:
        """Parse NMEA 0183 GGA/RMC sentences."""
        points = []
        with open(self.file_path, "r", errors="ignore") as f:
            for line in f:
                line = line.strip()
                if line.startswith("$GPGGA") or line.startswith("$GNGGA"):
                    pt = self._parse_gga(line)
                    if pt:
                        points.append(pt)
        return points

    @staticmethod
    def _parse_gga(sentence: str) -> Optional[GPSPoint]:
        try:
            parts = sentence.split(",")
            if len(parts) < 10:
                return None
            lat_raw = float(parts[2]) if parts[2] else None
            lat_dir = parts[3]
            lon_raw = float(parts[4]) if parts[4] else None
            lon_dir = parts[5]
            fix_q = int(parts[6]) if parts[6] else 0
            alt = float(parts[9]) if parts[9] else None
            if lat_raw is None or lon_raw is None or fix_q == 0:
                return None
            lat_deg = int(lat_raw / 100) + (lat_raw % 100) / 60.0
            lon_deg = int(lon_raw / 100) + (lon_raw % 100) / 60.0
            if lat_dir == "S":
                lat_deg = -lat_deg
            if lon_dir == "W":
                lon_deg = -lon_deg
            return GPSPoint(lat=lat_deg, lon=lon_deg, altitude=alt, fix_quality=fix_q)
        except (ValueError, IndexError):
            return None
