"""
Heatmap generator — renders sonar intensity and target density heatmaps
as PNG images, matplotlib figures, or plotly interactive HTML.
"""
from __future__ import annotations

from pathlib import Path
from typing import Dict, List, Optional, Tuple

import numpy as np

from utils.logger import get_logger

logger = get_logger(__name__)

# Colormaps: name → matplotlib colormap string
COLORMAPS = {
    "ocean":    "Blues_r",
    "thermal":  "RdYlBu_r",
    "sonar":    "Greys_r",
    "anomaly":  "hot",
    "depth":    "terrain",
}


class HeatmapGenerator:
    """
    Generate publication-quality heatmap visualizations from sonar mosaics.

    Example:
        gen = HeatmapGenerator(mosaic, bounds)
        gen.save_png("heatmap.png", colormap="ocean", dpi=150)
        gen.save_interactive_html("heatmap.html")
    """

    def __init__(
        self,
        mosaic: np.ndarray,
        bounds: Optional[Dict] = None,
        depth_range: Tuple[float, float] = (0.0, 4500.0),
    ):
        self.mosaic = mosaic.astype(np.float32)
        self.bounds = bounds or {}
        self.depth_min, self.depth_max = depth_range

    def save_png(
        self,
        path: str,
        colormap: str = "ocean",
        dpi: int = 150,
        figsize: Tuple[float, float] = (12, 8),
        title: str = "Sonar Intensity Heatmap",
        show_colorbar: bool = True,
        overlay_targets: Optional[List] = None,
    ) -> str:
        """Render mosaic as a PNG with matplotlib."""
        try:
            import matplotlib.pyplot as plt
            import matplotlib.patches as mpatches

            cmap_name = COLORMAPS.get(colormap, colormap)
            fig, ax = plt.subplots(figsize=figsize, dpi=dpi)
            ax.set_facecolor("#010B14")

            extent = None
            xlabel, ylabel = "Sample (column)", "Ping (row)"
            if self.bounds:
                extent = [
                    self.bounds["min_lon"], self.bounds["max_lon"],
                    self.bounds["min_lat"], self.bounds["max_lat"],
                ]
                xlabel, ylabel = "Longitude (°)", "Latitude (°)"

            # Map 0–1 intensity to depth_min–depth_max for colorbar
            depth_data = self.mosaic * (self.depth_max - self.depth_min) + self.depth_min

            im = ax.imshow(
                depth_data,
                cmap=cmap_name,
                aspect="auto",
                extent=extent,
                origin="upper",
                vmin=self.depth_min,
                vmax=self.depth_max,
                interpolation="bilinear",
            )

            if show_colorbar:
                cbar = fig.colorbar(im, ax=ax, fraction=0.03, pad=0.02)
                cbar.set_label("Depth (m)", fontsize=11)

            # Overlay targets
            if overlay_targets:
                for t in overlay_targets:
                    if t.lat is None or t.lon is None:
                        # Fall back to pixel coords
                        x = t.col / self.mosaic.shape[1]
                        y = t.row / self.mosaic.shape[0]
                        if extent:
                            continue
                        x = t.col
                        y = t.row
                    else:
                        x, y = t.lon, t.lat
                    color = {
                        "high": "#FF4444",
                        "medium": "#FFB300",
                        "low": "#44FF88",
                    }.get(t.classification, "#FFFFFF")
                    ax.plot(x, y, "o", color=color, markersize=8,
                            markeredgecolor="white", markeredgewidth=0.8)
                    ax.annotate(
                        t.id, (x, y),
                        textcoords="offset points", xytext=(6, 4),
                        fontsize=7, color=color,
                    )

            ax.set_title(title, fontsize=13, fontweight="bold", pad=12)
            ax.set_xlabel(xlabel, fontsize=10)
            ax.set_ylabel(ylabel, fontsize=10)
            ax.tick_params(labelsize=8)

            out = Path(path)
            out.parent.mkdir(parents=True, exist_ok=True)
            fig.savefig(str(out), bbox_inches="tight", facecolor="#0A1520")
            plt.close(fig)
            logger.info(f"Heatmap PNG saved: {out}")
            return str(out)

        except ImportError:
            logger.warning("matplotlib not installed — PNG heatmap skipped")
            return ""

    def save_interactive_html(
        self,
        path: str,
        colormap: str = "Blues",
        title: str = "Ocean Floor Survey — Interactive Heatmap",
        overlay_targets: Optional[List] = None,
    ) -> str:
        """Render as an interactive plotly HTML file."""
        try:
            import plotly.graph_objects as go

            depth_data = self.mosaic * (self.depth_max - self.depth_min) + self.depth_min

            x_axis = y_axis = None
            if self.bounds:
                x_axis = np.linspace(
                    self.bounds["min_lon"], self.bounds["max_lon"],
                    self.mosaic.shape[1],
                )
                y_axis = np.linspace(
                    self.bounds["max_lat"], self.bounds["min_lat"],
                    self.mosaic.shape[0],
                )

            fig = go.Figure()
            fig.add_trace(go.Heatmap(
                z=depth_data,
                x=x_axis,
                y=y_axis,
                colorscale=colormap,
                colorbar=dict(title="Depth (m)"),
                hovertemplate="Lon: %{x:.4f}<br>Lat: %{y:.4f}<br>Depth: %{z:.0f} m<extra></extra>",
            ))

            if overlay_targets:
                for t in overlay_targets:
                    if t.lat is None and self.bounds:
                        continue
                    lon = t.lon or (t.col / self.mosaic.shape[1])
                    lat = t.lat or (t.row / self.mosaic.shape[0])
                    color = {"high": "red", "medium": "orange", "low": "green"}.get(
                        t.classification, "white"
                    )
                    fig.add_trace(go.Scatter(
                        x=[lon], y=[lat],
                        mode="markers+text",
                        name=t.id,
                        marker=dict(size=12, color=color, symbol="x",
                                    line=dict(width=2, color="white")),
                        text=[t.id],
                        textposition="top center",
                        hovertemplate=(
                            f"<b>{t.id}</b><br>"
                            f"Class: {t.classification}<br>"
                            f"Confidence: {t.confidence*100:.0f}%<br>"
                            f"Lat: {lat:.4f} Lon: {lon:.4f}<extra></extra>"
                        ),
                    ))

            fig.update_layout(
                title=dict(text=title, font=dict(size=16)),
                paper_bgcolor="#0A1520",
                plot_bgcolor="#010B14",
                font=dict(color="white"),
                xaxis=dict(title="Longitude (°)" if self.bounds else "Sample"),
                yaxis=dict(title="Latitude (°)" if self.bounds else "Ping"),
                height=600,
            )

            out = Path(path)
            out.parent.mkdir(parents=True, exist_ok=True)
            fig.write_html(str(out), include_plotlyjs="cdn")
            logger.info(f"Interactive heatmap saved: {out}")
            return str(out)

        except ImportError:
            logger.warning("plotly not installed — interactive heatmap skipped")
            return ""

    def target_density_map(
        self,
        targets: List,
        sigma: float = 20.0,
    ) -> np.ndarray:
        """
        Generate a 2-D Gaussian kernel density map of target locations.

        Returns a float32 array (same shape as mosaic) with density values.
        """
        density = np.zeros(self.mosaic.shape, dtype=np.float64)
        h, w = density.shape
        for t in targets:
            r, c = t.row, t.col
            if 0 <= r < h and 0 <= c < w:
                # Place a 2-D Gaussian centred on the target
                y, x = np.ogrid[:h, :w]
                gauss = np.exp(-((x - c) ** 2 + (y - r) ** 2) / (2 * sigma ** 2))
                density += gauss * t.confidence
        mx = density.max()
        if mx > 0:
            density /= mx
        return density.astype(np.float32)
