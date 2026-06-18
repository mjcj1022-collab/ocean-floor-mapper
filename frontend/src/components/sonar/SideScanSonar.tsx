/**
 * SideScanSonar — horizontal waterfall display
 *
 * Simulates a towed side-scan sonar head producing a classic
 * "paper roll" waterfall image.  Each new scan line is painted
 * at the top and older lines scroll down, exactly like SonarWiz
 * or EdgeTech software.
 *
 * Layout (W × H canvas):
 *   Left half  = port  swath  (flipped, nadir at centre)
 *   Right half = starboard swath (nadir at centre)
 *   Centre     = nadir (vessel track) — bright line
 *   Colour     = intensity: dark=soft mud, bright=hard/metal
 */

import { useEffect, useRef, useState } from 'react';

interface Props {
  width?: number;
  height?: number;
  rangeM?: number;          // total swath range metres (each side)
  frequencyKhz?: number;
  gainDb?: number;
  running?: boolean;
}

// ─── Seafloor texture model ───────────────────────────────────────────────

function seededRand(s: number) {
  const x = Math.sin(s + 1) * 73856.0932;
  return x - Math.floor(x);
}

/** Generate one ping line (W pixels) of side-scan intensity 0-255 */
function generatePingLine(
  W: number,
  pingIndex: number,
  frequencyKhz: number,
  gainDb: number,
  rangeM: number,
): Uint8ClampedArray {
  const line = new Uint8ClampedArray(W);
  const half = W / 2;
  const gainFactor = (gainDb - 20) / 60;   // normalise gain 20-80dB → 0-1

  for (let px = 0; px < W; px++) {
    // Distance from nadir (centre) 0-1
    const distFromNadir = Math.abs(px - half) / half;
    // Slant range for TVG
    const _slantM = distFromNadir * rangeM;  // used for future TVG curves
    void _slantM;
    // ── Spreading loss (TVG correction already applied) ───────────────
    const spreading = Math.max(0, 1 - distFromNadir * 0.6);

    // ── Seafloor texture ──────────────────────────────────────────────
    // Slow-varying geological structure
    const geoFreq = 0.008;
    const geo = 0.5 + 0.35 * Math.sin(pingIndex * geoFreq + distFromNadir * 4.2)
                     + 0.15 * Math.sin(pingIndex * geoFreq * 3.1 + distFromNadir * 9.7);

    // Fine-grained backscatter noise (frequency-dependent)
    const noiseScale = frequencyKhz / 100;
    const noise = seededRand(px * 137.3 + pingIndex * 97.1 * noiseScale) * 0.25;

    // ── Hard targets — metallic bright returns ────────────────────────
    const targetReturns = [
      { pingC: 320, sampleC: 0.42, r: 0.02, str: 1.0 },   // TGT-001
      { pingC: 520, sampleC: 0.61, r: 0.015, str: 0.8 },  // TGT-002
      { pingC: 680, sampleC: 0.28, r: 0.025, str: 0.5 },  // TGT-003
      { pingC: 210, sampleC: 0.73, r: 0.018, str: 0.95 }, // TGT-004
    ];
    let targetBoost = 0;
    const normPx = px / W;
    for (const t of targetReturns) {
      const dp = (pingIndex % 800 - t.pingC) / 800;
      const ds = normPx - t.sampleC;
      const dist2 = dp * dp * 0.3 + ds * ds;
      if (dist2 < t.r * t.r) {
        targetBoost = Math.max(targetBoost, t.str * (1 - dist2 / (t.r * t.r)));
      }
      // Acoustic shadow — dark zone behind target
      if (dp > 0 && dp < 0.04 && Math.abs(ds - t.sampleC * 0.05) < 0.03) {
        targetBoost = Math.min(targetBoost, -0.4);
      }
    }

    // ── Nadir band — specular reflection from directly below ──────────
    const nadirWidth = 0.04;
    const nadir = distFromNadir < nadirWidth
      ? (1 - distFromNadir / nadirWidth) * 0.8
      : 0;

    // ── Combine ───────────────────────────────────────────────────────
    let intensity = (geo * spreading + noise + nadir + gainFactor * 0.2 + targetBoost);
    intensity = Math.max(0, Math.min(1, intensity));

    line[px] = Math.round(intensity * 255);
  }
  return line;
}

/** Map intensity 0-255 to sonar colour (dark background, bright returns) */
function sonarRGB(intensity: number): [number, number, number] {
  // Classic side-scan palette: dark blue-grey → mid blue → bright cyan/white
  const t = intensity / 255;
  if (t < 0.15) return [Math.round(t / 0.15 * 8), Math.round(t / 0.15 * 12), Math.round(t / 0.15 * 20)];
  if (t < 0.4)  {
    const s = (t - 0.15) / 0.25;
    return [Math.round(s * 15), Math.round(12 + s * 40), Math.round(20 + s * 80)];
  }
  if (t < 0.7)  {
    const s = (t - 0.4) / 0.3;
    return [Math.round(15 + s * 60), Math.round(52 + s * 100), Math.round(100 + s * 80)];
  }
  // Very bright return — white/cyan highlight
  const s = (t - 0.7) / 0.3;
  return [
    Math.round(75 + s * 180),
    Math.round(152 + s * 103),
    Math.round(180 + s * 75),
  ];
}

// ─── Component ─────────────────────────────────────────────────────────────

export function SideScanSonar({
  width = 680,
  height = 280,
  rangeM = 200,
  frequencyKhz = 100,
  gainDb = 40,
  running = true,
}: Props) {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const bufferRef  = useRef<Uint8ClampedArray | null>(null);
  const pingRef    = useRef(0);
  const rafRef     = useRef(0);
  const lastTickRef = useRef(0);

  // Labels
  const [cursorInfo, setCursorInfo] = useState<{ x: number; dist: string } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const W = canvas.width, H = canvas.height;

    // Initialise pixel buffer (RGBA)
    if (!bufferRef.current || bufferRef.current.length !== W * H * 4) {
      bufferRef.current = new Uint8ClampedArray(W * H * 4);
      bufferRef.current.fill(0);
    }

    const PING_RATE_MS = 80;   // one new scan line every 80ms ≈ 12.5 Hz

    function tick(ts: number) {
      if (!running) { rafRef.current = requestAnimationFrame(tick); return; }
      if (ts - lastTickRef.current < PING_RATE_MS) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      lastTickRef.current = ts;

      const buf = bufferRef.current!;
      const pingLine = generatePingLine(W, pingRef.current++, frequencyKhz, gainDb, rangeM);

      // Scroll existing rows DOWN by one scan line (shift buffer up)
      buf.copyWithin(W * 4, 0, (H - 1) * W * 4);

      // Paint new ping line at the top (row 0)
      for (let px = 0; px < W; px++) {
        const i = px * 4;
        const [r, g, b] = sonarRGB(pingLine[px]);
        buf[i] = r; buf[i + 1] = g; buf[i + 2] = b; buf[i + 3] = 255;
      }

      // Commit to canvas
      const imgData = new ImageData(new Uint8ClampedArray(buf), W, H);
      ctx.putImageData(imgData, 0, 0);

      // Draw overlay: nadir line + range scale ticks
      drawOverlay(ctx, W, H, rangeM);

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [running, frequencyKhz, gainDb, rangeM]);

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const c = canvasRef.current!;
    const rect = c.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (c.width / rect.width);
    const half = c.width / 2;
    const distM = Math.round(Math.abs(x - half) / half * rangeM);
    const side = x < half ? 'PORT' : 'STBD';
    setCursorInfo({ x: e.clientX - rect.left, dist: `${side} ${distM} m` });
  }

  return (
    <div style={{ position: 'relative', background: '#000', borderRadius: 6, overflow: 'hidden' }}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{ display: 'block', width: '100%', height: height }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setCursorInfo(null)}
      />
      {/* Cursor readout */}
      {cursorInfo && (
        <div style={{
          position: 'absolute', top: 6, left: cursorInfo.x + 8,
          background: 'rgba(0,0,0,0.75)', color: '#1db082',
          fontSize: 10, fontFamily: 'monospace', padding: '2px 6px',
          borderRadius: 3, pointerEvents: 'none', whiteSpace: 'nowrap',
        }}>
          {cursorInfo.dist}
        </div>
      )}
      {/* Static port/starboard labels */}
      <div style={labelStyle(true)}>◀ PORT</div>
      <div style={labelStyle(false)}>STBD ▶</div>
    </div>
  );
}

function labelStyle(isPort: boolean): React.CSSProperties {
  return {
    position: 'absolute', top: 6,
    ...(isPort ? { left: 8 } : { right: 8 }),
    fontSize: 10, fontFamily: 'monospace',
    color: 'rgba(29,176,130,0.7)',
    letterSpacing: '0.06em', pointerEvents: 'none',
  };
}

function drawOverlay(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  rangeM: number,
) {
  const half = W / 2;

  // Nadir centre line
  ctx.strokeStyle = 'rgba(29,176,130,0.5)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(half, 0); ctx.lineTo(half, H);
  ctx.stroke();
  ctx.setLineDash([]);

  // Range tick marks every 50 m on both sides
  const tickInterval = 50;
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.font = '9px monospace';
  ctx.textAlign = 'center';
  for (let m = tickInterval; m < rangeM; m += tickInterval) {
    const pxOffset = (m / rangeM) * half;
    // Port side (left of nadir)
    ctx.fillRect(half - pxOffset, 0, 0.5, 6);
    ctx.fillText(`${m}`, half - pxOffset, 16);
    // Starboard side (right of nadir)
    ctx.fillRect(half + pxOffset, 0, 0.5, 6);
    ctx.fillText(`${m}`, half + pxOffset, 16);
  }

  // "Ping" flash indicator top-right
  ctx.fillStyle = 'rgba(29,176,130,0.6)';
  ctx.fillRect(W - 40, 0, 40, 2);
}
