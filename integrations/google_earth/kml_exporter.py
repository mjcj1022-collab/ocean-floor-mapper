"""KML exporter for Google Earth Pro."""
from __future__ import annotations

import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Dict, List, Optional
from xml.dom import minidom

from utils.logger import get_logger

logger = get_logger(__name__)

CLASSIFICATION_COLORS = {
    "high":   "ff0000ff",  # red   (AABBGGRR)
    "medium": "ff00aaff",  # amber
    "low":    "ff00ff00",  # green
}


class KMLExporter:
    """
    Export survey tracks and anomaly targets to Google Earth KML.

    Example:
        exporter = KMLExporter()
        exporter.add_track(gps_points)
        exporter.add_target(target)
        exporter.save("survey.kml")
    """

    def __init__(self, name: str = "Ocean Floor Survey"):
        self._root = ET.Element("kml", xmlns="http://www.opengis.net/kml/2.2")
        self._doc = ET.SubElement(self._root, "Document")
        ET.SubElement(self._doc, "name").text = name
        self._add_styles()
        self._track_folder = ET.SubElement(self._doc, "Folder")
        ET.SubElement(self._track_folder, "name").text = "Survey Track"
        self._target_folder = ET.SubElement(self._doc, "Folder")
        ET.SubElement(self._target_folder, "name").text = "Detected Targets"

    def add_track(self, gps_points: List[Dict]) -> None:
        """Add survey vessel track as a LineString."""
        if not gps_points:
            return
        pm = ET.SubElement(self._track_folder, "Placemark")
        ET.SubElement(pm, "name").text = "Vessel track"
        ET.SubElement(pm, "styleUrl").text = "#trackStyle"
        ls = ET.SubElement(pm, "LineString")
        ET.SubElement(ls, "tessellate").text = "1"
        coords = " ".join(
            f"{p['lon']},{p['lat']},{p.get('altitude', 0) or 0}"
            for p in gps_points
            if p.get("lat") and p.get("lon")
        )
        ET.SubElement(ls, "coordinates").text = coords
        logger.debug(f"KML: added track with {len(gps_points)} points")

    def add_target(self, target) -> None:
        """Add an anomaly target as a Placemark with description."""
        if target.lat is None or target.lon is None:
            return
        classification = getattr(target, "classification", "low")
        pm = ET.SubElement(self._target_folder, "Placemark")
        ET.SubElement(pm, "name").text = target.id
        ET.SubElement(pm, "styleUrl").text = f"#{classification}TargetStyle"

        d = target.to_dict()
        desc_lines = [
            f"<b>{target.id}</b>",
            f"Classification: {d['classification'].upper()}",
            f"Confidence: {d['confidence']*100:.0f}%",
            f"Depth: {d['depth_m']} m" if d.get("depth_m") else "",
            f"Estimated height: {d['estimated_height_m']} m" if d.get("estimated_height_m") else "",
            f"Footprint: {d['footprint_px']} px",
        ]
        ET.SubElement(pm, "description").text = "<![CDATA[" + "<br/>".join(
            l for l in desc_lines if l
        ) + "]]>"

        pt = ET.SubElement(pm, "Point")
        ET.SubElement(pt, "coordinates").text = (
            f"{target.lon},{target.lat},{target.depth_m or 0}"
        )

    def save(self, path: str) -> None:
        out = Path(path)
        out.parent.mkdir(parents=True, exist_ok=True)
        raw = ET.tostring(self._root, encoding="unicode")
        pretty = minidom.parseString(raw).toprettyxml(indent="  ")
        with open(out, "w", encoding="utf-8") as f:
            f.write(pretty)
        logger.info(f"KML saved: {out}")

    def _add_styles(self) -> None:
        # Track style
        style = ET.SubElement(self._doc, "Style", id="trackStyle")
        ls = ET.SubElement(style, "LineStyle")
        ET.SubElement(ls, "color").text = "ff00d7ff"
        ET.SubElement(ls, "width").text = "2"

        # Target styles per classification
        for cls, color in CLASSIFICATION_COLORS.items():
            style = ET.SubElement(self._doc, "Style", id=f"{cls}TargetStyle")
            icon_style = ET.SubElement(style, "IconStyle")
            ET.SubElement(icon_style, "color").text = color
            ET.SubElement(icon_style, "scale").text = "1.2"
            icon = ET.SubElement(icon_style, "Icon")
            ET.SubElement(icon, "href").text = (
                "http://maps.google.com/mapfiles/kml/shapes/target.png"
            )
