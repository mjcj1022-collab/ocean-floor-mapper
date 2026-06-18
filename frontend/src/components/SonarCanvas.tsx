import { useEffect, useRef, useCallback } from 'react';
import type { Target, ViewMode } from '../types';
import { useSurveyStore } from '../store/surveyStore';

interface Props {
  width?: number;
  height?: number;
}

// ─── Seafloor depth model ─────────────────────────────────────────────────

function seededRand(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function getDepth(nx: number, ny: number): number {
  let d = 0.5;
  d += 0.22 * Math.sin(nx * 3.1 + 1.2) * Math.cos(ny * 2.4 - 0.8);
  d += 0.14 * Math.sin(nx * 6.7 - 2.1) * Math.cos(ny * 5.2 + 1.0);
  d += 0.08 * Math.sin(nx * 11.3 + 0.5) * Math.cos(ny * 9.8 - 1.5);
  const ridge = Math.exp(-(Math.pow((nx - 0.5) * 3, 2)) - Math.pow((ny - 0.45) * 2.5, 2));
  d -= ridge * 0.3;
  const canyon = Math.exp(-(Math.pow((ny - 0.65) * 6, 2)));
  d += canyon * 0.15 * (nx > 0.3 && nx < 0.7 ? 1 : 0);
  return Math.min(1, Math.max(0, d));
}

function bathyColor(depth: number): [number, number, number] {
  const stops: Array<[number, [number, number, number]]> = [
    [0.0,  [226, 75,  74]],
    [0.15, [239, 159, 39]],
    [0.35, [29,  158, 117]],
    [0.6,  [24,  95,  165]],
    [1.0,  [4,   44,  83]],
  ];
  let lo = stops[0], hi = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (depth >= stops[i][0] && depth <= stops[i + 1][0]) {
      lo = stops[i]; hi = stops[i + 1]; break;
    }
  }
  const t = (depth - lo[0]) / (hi[0] - lo[0]);
  return [
    Math.round(lo[1][0] + (hi[1][0] - lo[1][0]) * t),
    Math.round(lo[1][1] + (hi[1][1] - lo[1][1]) * t),
    Math.round(lo[1][2] + (hi[1][2] - lo[1][2]) * t),
  ];
}

// ─── Canvas renderer ──────────────────────────────────────────────────────

export function SonarCanvas({ width = 800, height = 520 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef  = useRef(0);
  const rafRef    = useRef<number>(0);

  const { layers, mapView, targets, selectedTargetId, selectTarget, setMetrics } =
    useSurveyStore();

  const layerMap = Object.fromEntries(layers.map((l) => [l.name, l]));

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = canvas.width, H = canvas.height;
    const frame = ++frameRef.current;
    const mode: ViewMode = mapView.mode;

    ctx.fillStyle = '#010B14';
    ctx.fillRect(0, 0, W, H);

    if (mode === '3d') {
      draw3D(ctx, W, H, frame);
    } else if (mode === 'heatmap') {
      if (layerMap.bathymetry?.visible) drawBathymetry(ctx, W, H);
      drawHeatmap(ctx, W, H, targets);
    } else if (mode === 'contour') {
      if (layerMap.bathymetry?.visible) drawBathymetry(ctx, W, H);
      drawContourLines(ctx, W, H);
    } else {
      // sonar mode
      if (layerMap.bathymetry?.visible) drawBathymetry(ctx, W, H);
      if (layerMap.contours?.visible)   drawContourLines(ctx, W, H);
      if (layerMap.sonar?.visible)      drawSonarSweep(ctx, W, H, frame,
                                           layerMap.sonar.opacity);
      if (layerMap.track?.visible)      drawTrack(ctx, W, H, frame);
    }

    if (layerMap.targets?.visible && mode !== '3d') {
      drawTargets(ctx, W, H, targets, selectedTargetId, frame);
    }

    // Update live depth metric
    const depth = 760 + Math.round(Math.sin(frame * 0.03) * 150);
    setMetrics({ depth_current_m: depth, elapsed_seconds: Math.floor(frame / 60) });

    rafRef.current = requestAnimationFrame(draw);
  }, [layers, mapView.mode, targets, selectedTargetId, setMetrics]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [draw]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;
    const W = canvas.width, H = canvas.height;

    // Hit test targets
    for (const t of targets) {
      // Use stored pixel positions from the demo targets array
      const pos = DEMO_TARGET_PX[t.id];
      const px = pos ? pos.x * W : 0;
      const py = pos ? pos.y * H : 0;
      if (Math.hypot(mx - px, my - py) < 18) {
        selectTarget(selectedTargetId === t.id ? null : t.id);
        return;
      }
    }
    selectTarget(null);
  }, [targets, selectedTargetId, selectTarget]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ width: '100%', height: '100%', display: 'block', cursor: 'crosshair' }}
      onClick={handleClick}
    />
  );
}

// Demo pixel positions for click testing (normalised 0–1)
const DEMO_TARGET_PX: Record<string, { x: number; y: number }> = {
  'TGT-001': { x: 0.42, y: 0.38 },
  'TGT-002': { x: 0.61, y: 0.55 },
  'TGT-003': { x: 0.28, y: 0.65 },
  'TGT-004': { x: 0.73, y: 0.29 },
};

// ─── Draw functions ───────────────────────────────────────────────────────

function drawBathymetry(ctx: CanvasRenderingContext2D, W: number, H: number) {
  const res = 3;
  const id = ctx.createImageData(W, H);
  const data = id.data;
  for (let py = 0; py < H; py += res) {
    for (let px = 0; px < W; px += res) {
      const d = getDepth(px / W, py / H);
      const [r, g, b] = bathyColor(d);
      for (let dy = 0; dy < res && py + dy < H; dy++) {
        for (let dx = 0; dx < res && px + dx < W; dx++) {
          const i = ((py + dy) * W + (px + dx)) * 4;
          data[i] = r; data[i+1] = g; data[i+2] = b; data[i+3] = 235;
        }
      }
    }
  }
  ctx.putImageData(id, 0, 0);
}

function drawContourLines(ctx: CanvasRenderingContext2D, W: number, H: number) {
  const levels = [0.15, 0.3, 0.45, 0.6, 0.75, 0.9];
  const res = 6;
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 0.5;
  for (const level of levels) {
    ctx.beginPath();
    for (let py = 0; py < H - res; py += res) {
      for (let px = 0; px < W - res; px += res) {
        const d00 = getDepth(px / W, py / H);
        const d10 = getDepth((px + res) / W, py / H);
        const d01 = getDepth(px / W, (py + res) / H);
        if ((d00 < level) !== (d10 < level)) {
          const t = (level - d00) / (d10 - d00);
          ctx.moveTo(px + t * res, py); ctx.lineTo(px + t * res, py + 0.5);
        }
        if ((d00 < level) !== (d01 < level)) {
          const t = (level - d00) / (d01 - d00);
          ctx.moveTo(px, py + t * res); ctx.lineTo(px + 0.5, py + t * res);
        }
      }
    }
    ctx.stroke();
  }
}

function drawSonarSweep(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  frame: number,
  opacity: number,
) {
  const progress = (frame % 240) / 240;
  const scanX = Math.round(progress * W);
  const id = ctx.getImageData(0, 0, W, H);
  const data = id.data;
  for (let py = 0; py < H; py++) {
    for (let px = 0; px < scanX; px++) {
      const i = (py * W + px) * 4;
      const noise = (seededRand(px * 137 + py * 97 + Math.floor(frame / 8) * 3) - 0.5) * 20;
      const spec = seededRand(px * 31 + py * 53) > 0.97 ? 35 : 0;
      data[i]   = Math.min(255, data[i]   + noise + spec);
      data[i+1] = Math.min(255, data[i+1] + noise * 0.4 + spec * 0.6);
      data[i+2] = Math.min(255, data[i+2] + noise * 0.2 + spec * 0.4);
    }
  }
  ctx.putImageData(id, 0, 0);
  ctx.fillStyle = `rgba(29,158,117,${opacity * 0.05})`;
  ctx.fillRect(0, 0, scanX, H);
  ctx.strokeStyle = `rgba(29,158,117,${opacity * 0.6})`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(scanX, 0); ctx.lineTo(scanX, H);
  ctx.stroke();
}

function drawTrack(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  frame: number,
) {
  const rows = [0.12, 0.3, 0.5, 0.68, 0.86];
  ctx.strokeStyle = 'rgba(239,159,39,0.65)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  rows.forEach((ry, i) => {
    const x1 = i % 2 === 0 ? 0.04 * W : 0.96 * W;
    const x2 = i % 2 === 0 ? 0.96 * W : 0.04 * W;
    const y  = ry * H;
    if (i === 0) ctx.moveTo(x1, y);
    else ctx.lineTo(x1, y);
    ctx.lineTo(x2, y);
  });
  ctx.stroke();
  ctx.setLineDash([]);
  const progress = (frame % 240) / 240;
  const rowIdx = Math.floor(progress * 4);
  const rowY = rows[rowIdx] * H;
  const scanX = progress * W;
  ctx.fillStyle = '#EF9F27';
  ctx.beginPath();
  ctx.arc(scanX, rowY, 4, 0, Math.PI * 2);
  ctx.fill();
}

function drawTargets(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  targets: Target[],
  selectedId: string | null,
  frame: number,
) {
  const colors: Record<string, string> = {
    high: '#E24B4A', medium: '#BA7517', low: '#1D9E75',
  };
  targets.forEach((t) => {
    const pos = DEMO_TARGET_PX[t.id] ?? { x: 0.5, y: 0.5 };
    const cx = pos.x * W, cy = pos.y * H;
    const color = colors[t.classification] ?? '#ffffff';
    const pulse = 0.5 + 0.5 * Math.sin(frame * 0.08 + targets.indexOf(t) * 1.3);
    const isSelected = t.id === selectedId;
    const r = 10 + (isSelected ? 4 : 0);

    ctx.beginPath();
    ctx.arc(cx, cy, r + 8 * pulse, 0, Math.PI * 2);
    ctx.strokeStyle = color + '33';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = color;
    ctx.lineWidth = isSelected ? 2.5 : 1.5;
    ctx.fillStyle = color + '28';
    ctx.fill();
    ctx.stroke();

    const cs = r + 5;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - cs, cy); ctx.lineTo(cx + cs, cy);
    ctx.moveTo(cx, cy - cs); ctx.lineTo(cx, cy + cs);
    ctx.stroke();

    ctx.font = '9px monospace';
    ctx.fillStyle = color;
    ctx.fillText(t.id, cx + r + 4, cy - 3);

    if (isSelected) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.arc(cx, cy, r + 14 + 4 * pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  });
}

function drawHeatmap(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  targets: Target[],
) {
  const res = 4;
  const id = ctx.createImageData(W, H);
  const data = id.data;
  for (let py = 0; py < H; py += res) {
    for (let px = 0; px < W; px += res) {
      const nx = px / W, ny = py / H;
      let heat = 0;
      targets.forEach((t) => {
        const pos = DEMO_TARGET_PX[t.id] ?? { x: 0.5, y: 0.5 };
        const dx = nx - pos.x, dy = ny - pos.y;
        heat += 0.8 * Math.exp(-(dx * dx + dy * dy) * 180) * t.confidence;
      });
      heat = Math.min(1, heat);
      if (heat > 0.02) {
        const r = Math.round(heat * 226), g = Math.round((1 - heat) * 80), b = 30;
        for (let dy = 0; dy < res && py + dy < H; dy++) {
          for (let dx = 0; dx < res && px + dx < W; dx++) {
            const i = ((py + dy) * W + (px + dx)) * 4;
            data[i] = r; data[i+1] = g; data[i+2] = b;
            data[i+3] = Math.round(heat * 200);
          }
        }
      }
    }
  }
  ctx.putImageData(id, 0, 0);
}

function draw3D(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  frame: number,
) {
  const slices = 50;
  for (let row = 0; row < slices; row++) {
    const ny = row / slices;
    const yScreen = H * 0.15 + row * (H * 0.75 / slices);
    const perspective = 0.3 + 0.7 * ny;
    const alpha = 0.12 + ny * 0.65;
    ctx.strokeStyle = `rgba(55,138,221,${alpha})`;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    for (let col = 0; col <= W; col += 2) {
      const nx = col / W;
      const d = getDepth(nx, ny + Math.sin(frame * 0.005) * 0.01);
      const relief = (d - 0.5) * 70 * (1 - ny * 0.5) * perspective;
      const y = yScreen - relief;
      col === 0 ? ctx.moveTo(col, y) : ctx.lineTo(col, y);
    }
    ctx.stroke();
  }
}
