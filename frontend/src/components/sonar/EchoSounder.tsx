/**
 * EchoSounder — vertical single-beam / sub-bottom profile display
 *
 * Shows the water column from surface (top) to seabed + sub-bottom
 * penetration (bottom).  Each new ping column is added at the right
 * edge and the history scrolls left — identical to how Hypack or
 * a Knudsen sub-bottom profiler displays data.
 *
 * Vertical axis = depth (0 at top → max depth at bottom)
 * Horizontal axis = time / ping history (newest at right)
 *
 * Layers rendered:
 *   0 – surface multiple (first bounce artifact)
 *   1 – water column (near-zero backscatter, dark)
 *   2 – seabed return (bright, undulating)
 *   3 – sub-bottom layering (dim parallel reflectors)
 *   4 – acoustic basement (diffuse bright band)
 */

import { useEffect, useRef, useState } from 'react';

interface Props {
  width?: number;
  height?: number;
  maxDepthM?: number;
  frequencyKhz?: number;
  gainDb?: number;
  running?: boolean;
}

// ─── Depth model ──────────────────────────────────────────────────────────

/** Seabed depth at a given horizontal ping index (0-1 of total width) */
function seabedDepth(pingNorm: number, maxDepth: number): number {
  // Slowly undulating seafloor with channel and ridge features
  const base = 0.55;
  const undulation = 0.08 * Math.sin(pingNorm * Math.PI * 3.2 + 0.5)
                   + 0.04 * Math.sin(pingNorm * Math.PI * 8.7 - 1.2)
                   + 0.02 * Math.sin(pingNorm * Math.PI * 19.3 + 2.1);
  // Canyon feature in the middle third
  const canyon = pingNorm > 0.38 && pingNorm < 0.62
    ? 0.12 * Math.sin((pingNorm - 0.38) / 0.24 * Math.PI)
    : 0;
  return Math.max(0.25, Math.min(0.85, base + undulation + canyon)) * maxDepth;
}

/** Generate one vertical ping column (H pixels) */
function generatePingColumn(
  H: number,
  pingIndex: number,
  pingNorm: number,
  frequencyKhz: number,
  gainDb: number,
): Uint8ClampedArray {
  const col = new Uint8ClampedArray(H);
  const seabedPx = Math.round(seabedDepth(pingNorm, 1.0) * H);
  const gainFactor = (gainDb - 20) / 60;
  const freqFactor = frequencyKhz / 100;

  for (let py = 0; py < H; py++) {
    // ── Surface multiple (faint band near top) ────────────────────────
    if (py < 4) { col[py] = Math.round(50 * (1 - py / 4)); continue; }

    // ── Water column ──────────────────────────────────────────────────
    if (py < seabedPx - 2) {
      // Volume reverberation — very faint random backscatter
      const volRev = (Math.sin(pingIndex * 0.17 + py * 0.31) * 0.5 + 0.5) * 6;
      col[py] = Math.round(volRev * gainFactor);
      continue;
    }

    // ── Seabed return ─────────────────────────────────────────────────
    const distFromSeabed = py - seabedPx;
    if (distFromSeabed >= -3 && distFromSeabed <= 4) {
      // Peak brightness depends on substrate type (hard=brighter)
      const hardness = 0.5 + 0.3 * Math.sin(pingNorm * 14.2 + pingIndex * 0.003);
      const profile = Math.exp(-Math.pow(distFromSeabed / 1.8, 2));
      const intensity = (0.6 + hardness * 0.35 + gainFactor * 0.1) * profile;
      col[py] = Math.round(Math.min(255, intensity * 255));
      continue;
    }

    // ── Sub-bottom reflectors ─────────────────────────────────────────
    if (distFromSeabed > 4 && distFromSeabed < H * 0.35) {
      const subDepth = distFromSeabed / H;
      // TWT (two-way travel) attenuation — signal weakens with depth
      const attenuation = Math.exp(-subDepth * freqFactor * 18);

      // Parallel sediment layers every ~8-12 pixels
      const layer1 = Math.exp(-Math.pow((distFromSeabed - 10) % 22 - 8, 2) / 4) * 0.45;
      const layer2 = Math.exp(-Math.pow((distFromSeabed - 18) % 28 - 12, 2) / 5) * 0.3;
      const layer3 = Math.exp(-Math.pow((distFromSeabed - 30) % 35 - 15, 2) / 6) * 0.2;

      // Unconformity / erosional surface at ~40px below seabed
      const unconformity = distFromSeabed > 38 && distFromSeabed < 44
        ? 0.25 * Math.sin(pingNorm * 8.5)
        : 0;

      const intensity = (layer1 + layer2 + layer3 + unconformity) * attenuation
                      + gainFactor * 0.05;
      col[py] = Math.round(Math.min(255, Math.max(0, intensity * 255)));
      continue;
    }

    // ── Acoustic basement ─────────────────────────────────────────────
    if (distFromSeabed >= H * 0.35) {
      const s = Math.sin(pingNorm * 11.3 + pingIndex * 0.002) * 0.15;
      col[py] = Math.round(Math.max(0, (8 + s * 30)));
    }
  }
  return col;
}

/** Echo sounder colour palette: dark water → bright returns */
function echoRGB(intensity: number): [number, number, number] {
  const t = intensity / 255;
  if (t < 0.08) return [0, Math.round(t / 0.08 * 6), Math.round(t / 0.08 * 15)];
  if (t < 0.3)  {
    const s = (t - 0.08) / 0.22;
    return [0, Math.round(6 + s * 30), Math.round(15 + s * 60)];
  }
  if (t < 0.6)  {
    const s = (t - 0.3) / 0.3;
    return [Math.round(s * 40), Math.round(36 + s * 100), Math.round(75 + s * 100)];
  }
  if (t < 0.85) {
    const s = (t - 0.6) / 0.25;
    return [Math.round(40 + s * 180), Math.round(136 + s * 100), Math.round(175 + s * 60)];
  }
  // Bright specular — white peak
  const s = (t - 0.85) / 0.15;
  return [Math.round(220 + s * 35), Math.round(236 + s * 19), Math.round(235 + s * 20)];
}

// ─── Component ─────────────────────────────────────────────────────────────

export function EchoSounder({
  width = 680,
  height = 280,
  maxDepthM = 2000,
  frequencyKhz = 12,
  gainDb = 40,
  running = true,
}: Props) {
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const bufferRef   = useRef<Uint8ClampedArray | null>(null);
  const pingRef     = useRef(0);
  const rafRef      = useRef(0);
  const lastTickRef = useRef(0);
  const [cursor, setCursor] = useState<{ y: number; depth: string } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const W = canvas.width, H = canvas.height;

    if (!bufferRef.current || bufferRef.current.length !== W * H * 4) {
      bufferRef.current = new Uint8ClampedArray(W * H * 4);
    }

    const PING_RATE_MS = 120;

    function tick(ts: number) {
      if (!running) { rafRef.current = requestAnimationFrame(tick); return; }
      if (ts - lastTickRef.current < PING_RATE_MS) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      lastTickRef.current = ts;

      const buf = bufferRef.current!;
      const pingIdx = pingRef.current++;
      // pingNorm cycles slowly — simulates vessel moving over terrain
      const pingNorm = (pingIdx % 600) / 600;

      const col = generatePingColumn(H, pingIdx, pingNorm, frequencyKhz, gainDb);

      // Scroll buffer LEFT by one column (shift all pixels left by 1 col)
      for (let row = 0; row < H; row++) {
        const rowStart = row * W * 4;
        buf.copyWithin(rowStart, rowStart + 4, rowStart + W * 4);
      }

      // Paint new column at the rightmost position
      const colX = W - 1;
      for (let py = 0; py < H; py++) {
        const i = (py * W + colX) * 4;
        const [r, g, b] = echoRGB(col[py]);
        buf[i] = r; buf[i + 1] = g; buf[i + 2] = b; buf[i + 3] = 255;
      }

      ctx.putImageData(new ImageData(new Uint8ClampedArray(buf), W, H), 0, 0);
      drawEchoOverlay(ctx, W, H, maxDepthM, pingNorm);

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [running, frequencyKhz, gainDb, maxDepthM]);

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const c = canvasRef.current!;
    const rect = c.getBoundingClientRect();
    const y = (e.clientY - rect.top) * (c.height / rect.height);
    const depthM = Math.round((y / c.height) * maxDepthM);
    setCursor({ y: e.clientY - rect.top, depth: `${depthM} m` });
  }

  return (
    <div style={{ position: 'relative', background: '#000', borderRadius: 6, overflow: 'hidden' }}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{ display: 'block', width: '100%', height: height }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setCursor(null)}
      />
      {/* Depth cursor */}
      {cursor && (
        <>
          <div style={{
            position: 'absolute', left: 0, right: 0, top: cursor.y,
            height: 1, background: 'rgba(29,176,130,0.3)', pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute', right: 48, top: cursor.y - 8,
            background: 'rgba(0,0,0,0.75)', color: '#1db082',
            fontSize: 10, fontFamily: 'monospace', padding: '1px 5px',
            borderRadius: 3, pointerEvents: 'none',
          }}>
            {cursor.depth}
          </div>
        </>
      )}
    </div>
  );
}

function drawEchoOverlay(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  maxDepthM: number,
  pingNorm: number,
) {
  // Depth scale on the left
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.font = '9px monospace';
  ctx.textAlign = 'left';

  const depthSteps = [200, 400, 600, 800, 1000, 1500, 2000];
  for (const d of depthSteps) {
    if (d >= maxDepthM) break;
    const py = Math.round((d / maxDepthM) * H);
    ctx.fillRect(0, py, 16, 0.5);
    ctx.fillText(`${d}m`, 18, py + 3);
  }

  // Current depth readout top-right
  const currentDepth = Math.round(seabedDepth(pingNorm, maxDepthM));
  ctx.fillStyle = 'rgba(29,176,130,0.8)';
  ctx.textAlign = 'right';
  ctx.font = 'bold 11px monospace';
  ctx.fillText(`⬇ ${currentDepth} m`, W - 6, 14);

  // Rightmost column active indicator
  ctx.fillStyle = 'rgba(29,176,130,0.5)';
  ctx.fillRect(W - 2, 0, 2, H);

  // Surface line
  ctx.strokeStyle = 'rgba(58,143,214,0.3)';
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);
  ctx.beginPath(); ctx.moveTo(0, 2); ctx.lineTo(W, 2); ctx.stroke();
  ctx.setLineDash([]);
}
