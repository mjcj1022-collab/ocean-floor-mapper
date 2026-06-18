"""
Noise reduction for raw sonar ping arrays.

Filters:
  - Median filter          — spike/impulse noise from gas bubbles, fish
  - Gaussian smoothing     — sensor thermal noise
  - TVG correction         — time-varying gain (compensates spreading loss)
  - Bottom-track removal   — strips the nadir (straight-down) return artifact
  - Despeckle              — Lee filter for coherent speckle in multibeam data
"""
from __future__ import annotations

import math
from typing import Optional, Tuple

import numpy as np

from utils.logger import get_logger

logger = get_logger(__name__)


class NoiseReducer:
    """
    Apply a configurable noise-reduction chain to a sonar ping array.

    The array shape is (N_pings, N_samples). Each row is one ping;
    each column is one slant-range sample from port to starboard.

    Example:
        reducer = NoiseReducer(median_kernel=5, tvg=True, despeckle=True)
        clean = reducer.process(raw_array)
    """

    def __init__(
        self,
        median_kernel: int = 5,
        gaussian_sigma: float = 1.0,
        tvg: bool = True,
        tvg_alpha: float = 40.0,          # dB/km spreading loss coefficient
        bottom_track_removal: bool = True,
        despeckle: bool = True,
        despeckle_window: int = 7,
        clip_percentile: float = 99.5,
    ):
        if median_kernel % 2 == 0:
            raise ValueError("median_kernel must be odd")
        self.median_kernel = median_kernel
        self.gaussian_sigma = gaussian_sigma
        self.tvg = tvg
        self.tvg_alpha = tvg_alpha
        self.bottom_track_removal = bottom_track_removal
        self.despeckle = despeckle
        self.despeckle_window = despeckle_window
        self.clip_percentile = clip_percentile

    def process(self, data: np.ndarray) -> np.ndarray:
        """
        Run the full noise-reduction chain.

        Parameters
        ----------
        data : float32 array (N_pings, N_samples)

        Returns
        -------
        cleaned : float32 array, same shape, values in [0, 1]
        """
        if data.ndim == 1:
            data = data[:, np.newaxis]

        logger.info(
            f"Noise reduction: {data.shape[0]} pings × {data.shape[1]} samples"
        )

        arr = data.astype(np.float64)

        # 1. Clip extreme values before any filtering
        arr = self._clip(arr)

        # 2. TVG correction — amplify far-range returns
        if self.tvg:
            arr = self._apply_tvg(arr)
            logger.debug("TVG correction applied")

        # 3. Median filter — kills impulse noise
        arr = self._median_filter(arr)
        logger.debug(f"Median filter ({self.median_kernel}×1) applied")

        # 4. Gaussian smoothing — reduces thermal noise
        if self.gaussian_sigma > 0:
            arr = self._gaussian_filter(arr)
            logger.debug(f"Gaussian smoothing (σ={self.gaussian_sigma}) applied")

        # 5. Bottom-track (nadir) removal
        if self.bottom_track_removal:
            arr = self._remove_nadir(arr)
            logger.debug("Nadir artifact removed")

        # 6. Lee despeckle filter
        if self.despeckle:
            arr = self._lee_filter(arr)
            logger.debug(f"Lee despeckle (window={self.despeckle_window}) applied")

        # 7. Normalise to [0, 1]
        arr = self._normalise(arr)

        return arr.astype(np.float32)

    # ------------------------------------------------------------------
    # Individual filter implementations
    # ------------------------------------------------------------------

    def _clip(self, arr: np.ndarray) -> np.ndarray:
        """Clip top percentile to remove extreme outliers."""
        hi = np.percentile(arr, self.clip_percentile)
        lo = np.percentile(arr, 100 - self.clip_percentile)
        return np.clip(arr, lo, hi)

    def _apply_tvg(self, arr: np.ndarray) -> np.ndarray:
        """
        Time-Varying Gain correction.

        Models spherical spreading + absorption:
            gain(r) = 20·log10(r) + α·r   (dB, r in km)

        Converts back to linear and divides out the gain curve so
        all ranges have the same expected return level.
        """
        n_samples = arr.shape[1]
        if n_samples < 2:
            return arr
        # Assume sample index maps linearly to 0–500 m slant range
        ranges_m = np.linspace(1.0, 500.0, n_samples)
        ranges_km = ranges_m / 1000.0
        gain_db = 20.0 * np.log10(ranges_m) + self.tvg_alpha * ranges_km
        gain_linear = 10.0 ** (gain_db / 20.0)
        gain_linear /= gain_linear.mean()           # keep overall level
        return arr / gain_linear[np.newaxis, :]

    def _median_filter(self, arr: np.ndarray) -> np.ndarray:
        """Apply median filter along the sample (range) axis per ping."""
        try:
            from scipy.ndimage import median_filter  # type: ignore
            return median_filter(arr, size=(1, self.median_kernel))
        except ImportError:
            # Pure-numpy fallback using stride tricks
            k = self.median_kernel
            pad = k // 2
            padded = np.pad(arr, ((0, 0), (pad, pad)), mode="reflect")
            result = np.empty_like(arr)
            for i in range(arr.shape[1]):
                result[:, i] = np.median(padded[:, i:i + k], axis=1)
            return result

    def _gaussian_filter(self, arr: np.ndarray) -> np.ndarray:
        """Gaussian smoothing along both axes."""
        try:
            from scipy.ndimage import gaussian_filter  # type: ignore
            return gaussian_filter(arr, sigma=(self.gaussian_sigma * 0.5,
                                               self.gaussian_sigma))
        except ImportError:
            # Simple box filter as fallback
            k = max(3, int(self.gaussian_sigma * 3) | 1)
            pad = k // 2
            padded = np.pad(arr, pad, mode="reflect")
            kernel = np.ones((k, k), dtype=np.float64) / (k * k)
            result = np.empty_like(arr)
            for r in range(arr.shape[0]):
                for c in range(arr.shape[1]):
                    result[r, c] = padded[r:r+k, c:c+k].mean()
            return result

    def _remove_nadir(self, arr: np.ndarray) -> np.ndarray:
        """
        Remove nadir artifact — the bright vertical stripe in the mosaic
        caused by the direct bottom return directly below the vessel.

        Replaces the centre ±3% of samples with the local column mean.
        """
        n_samples = arr.shape[1]
        centre = n_samples // 2
        half_w = max(1, int(n_samples * 0.03))
        col_start = max(0, centre - half_w)
        col_end = min(n_samples, centre + half_w + 1)

        result = arr.copy()
        left_mean = arr[:, max(0, col_start - 10):col_start].mean(axis=1, keepdims=True)
        right_mean = arr[:, col_end:min(n_samples, col_end + 10)].mean(axis=1, keepdims=True)
        fill = (left_mean + right_mean) / 2.0
        result[:, col_start:col_end] = fill
        return result

    def _lee_filter(self, arr: np.ndarray) -> np.ndarray:
        """
        Lee filter for speckle reduction in coherent sonar data.

        Each pixel is replaced by a weighted combination of the local
        neighbourhood mean and the original pixel value, weighted by
        the ratio of estimated signal variance to total variance.
        """
        try:
            from scipy.ndimage import uniform_filter  # type: ignore
            w = self.despeckle_window
            mean = uniform_filter(arr, w)
            mean_sq = uniform_filter(arr ** 2, w)
            var = mean_sq - mean ** 2
            var = np.maximum(var, 0)
            # Noise variance estimated from the whole image
            noise_var = var.mean()
            weight = var / np.maximum(var + noise_var, 1e-12)
            return mean + weight * (arr - mean)
        except ImportError:
            logger.debug("scipy not available — Lee filter skipped")
            return arr

    @staticmethod
    def _normalise(arr: np.ndarray) -> np.ndarray:
        mn, mx = arr.min(), arr.max()
        if mx > mn:
            return (arr - mn) / (mx - mn)
        return np.zeros_like(arr)
