import { useRef, useEffect, useCallback } from 'react';
import { useSurveyStore } from '../store/surveyStore';
import { Stat, Badge, SectionLabel, Divider, Row } from '../components/ui';
import { Eye, EyeOff } from 'lucide-react';
import type { Target, ViewMode } from '../types';

const VIEW_MODES: Array<{ key: ViewMode; label: string }> = [
  { key: 'sonar',   label: 'Sonar' },
  { key: '3d',      label: '3D' },
  { key: 'heatmap', label: 'Heatmap' },
  { key: 'contour', label: 'Contours' },
];

const DEMO_TARGET_PX: Record<string, { x: number; y: number }> = {
  'TGT-001': { x: 0.42, y: 0.38 },
  'TGT-002': { x: 0.61, y: 0.55 },
  'TGT-003': { x: 0.28, y: 0.65 },
  'TGT-004': { x: 0.73, y: 0.29 },
};

export function DashboardPage() {
  const { mapView, setViewMode, targets, selectedTargetId, selectTarget,
    layers, toggleLayer, metrics } = useSurveyStore();

  return (
    <div style={styles.page}>
      {/* Map canvas area */}
      <div style={styles.mapWrap}>
        <MapCanvas mode={mapView.mode} targets={targets} selectedId={selectedTargetId} onSelect={selectTarget} />

        {/* View mode switcher — over map */}
        <div style={styles.viewSwitch}>
          {VIEW_MODES.map(m => (
            <button
              key={m.key}
              style={{ ...styles.viewBtn, ...(mapView.mode === m.key ? styles.viewBtnOn : {}) }}
              onClick={() => setViewMode(m.key)}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Depth legend */}
        <div style={styles.legend}>
          <span style={styles.legendLabel}>0 m</span>
          <div style={styles.legendGrad} />
          <span style={styles.legendLabel}>4500 m</span>
        </div>

        {/* Sonar sweep mini */}
        <SweepMini />

        {/* Scale bar */}
        <div style={styles.scalebar}>
          <div style={styles.scalebarLine} />
          <span style={styles.legendLabel}>500 m</span>
        </div>
      </div>

      {/* Right sidebar */}
      <div style={styles.sidebar}>
        {/* Live stats */}
        <div style={styles.statsGrid}>
          <Stat label="Coverage"  value={`${metrics.coverage_pct}%`}        accent="var(--teal)" />
          <Stat label="Speed"     value={metrics.vessel_speed_kts} unit="kts" />
          <Stat label="Depth"     value={metrics.depth_current_m}  unit="m"  accent="var(--blue)" />
          <Stat label="Targets"   value={targets.length}                     accent="var(--amber)" />
        </div>

        <Divider />

        {/* Layers */}
        <SectionLabel>Layers</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {layers.map(layer => (
            <div key={layer.name} style={styles.layerRow}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: layer.color, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: 'var(--text-md)' }}>{layer.label}</span>
              </div>
              <button style={styles.eyeBtn} onClick={() => toggleLayer(layer.name as any)}>
                {layer.visible
                  ? <Eye size={13} color="var(--teal)" />
                  : <EyeOff size={13} color="var(--text-lo)" />}
              </button>
            </div>
          ))}
        </div>

        <Divider />

        {/* Targets */}
        <SectionLabel>Detected targets ({targets.length})</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, overflowY: 'auto' }}>
          {targets.map(t => (
            <TargetRow
              key={t.id}
              target={t}
              selected={t.id === selectedTargetId}
              onSelect={() => selectTarget(t.id === selectedTargetId ? null : t.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function TargetRow({ target: t, selected, onSelect }: { target: Target; selected: boolean; onSelect: () => void }) {
  const cls = t.classification;
  return (
    <button onClick={onSelect} style={{
      ...styles.tRow,
      background: selected ? 'rgba(29,176,130,0.07)' : 'var(--surface)',
      borderColor: selected ? 'rgba(29,176,130,0.4)' : 'var(--border)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600, color: 'var(--text-hi)' }}>{t.id}</span>
        <Badge variant={cls as any}>{cls.toUpperCase()}</Badge>
      </div>
      <Row label="Confidence" value={`${Math.round(t.confidence * 100)}%`} />
      <Row label="Depth" value={t.depth_m != null ? `${t.depth_m} m` : '—'} />
    </button>
  );
}

// ─── Canvas ───────────────────────────────────────────────────────────────

function MapCanvas({ mode, targets, selectedId, onSelect }: {
  mode: ViewMode; targets: Target[]; selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef  = useRef(0);
  const rafRef    = useRef(0);

  const draw = useCallback(() => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext('2d'); if (!ctx) return;
    const W = c.width, H = c.height;
    frameRef.current++;
    const f = frameRef.current;

    ctx.fillStyle = '#010b14';
    ctx.fillRect(0, 0, W, H);

    drawBathy(ctx, W, H);
    if (mode !== '3d') drawContours(ctx, W, H);

    if (mode === '3d') draw3D(ctx, W, H, f);
    else if (mode === 'heatmap') drawHeatmap(ctx, W, H, targets);
    else drawSonar(ctx, W, H, f);

    if (mode !== '3d') {
      drawTrack(ctx, W, H, f);
      drawTargets(ctx, W, H, targets, selectedId, f);
    }

    rafRef.current = requestAnimationFrame(draw);
  }, [mode, targets, selectedId]);

  useEffect(() => {
    const resize = () => {
      const c = canvasRef.current; if (!c) return;
      const p = c.parentElement!;
      c.width = p.clientWidth; c.height = p.clientHeight;
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [draw]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const c = canvasRef.current; if (!c) return;
    const r = c.getBoundingClientRect();
    const mx = (e.clientX - r.left) * (c.width / r.width);
    const my = (e.clientY - r.top) * (c.height / r.height);
    for (const t of targets) {
      const pos = DEMO_TARGET_PX[t.id];
      if (!pos) continue;
      if (Math.hypot(mx - pos.x * c.width, my - pos.y * c.height) < 20) {
        onSelect(t.id === selectedId ? null : t.id);
        return;
      }
    }
    onSelect(null);
  };

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', inset: 0, cursor: 'crosshair' }}
      onClick={handleClick}
    />
  );
}

function SweepMini() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext('2d')!;
    let angle = 0, raf = 0;
    const tick = () => {
      ctx.clearRect(0, 0, 80, 80);
      ctx.fillStyle = 'rgba(1,11,20,0.8)';
      ctx.beginPath(); ctx.arc(40, 40, 38, 0, Math.PI * 2); ctx.fill();
      [10, 20, 30, 38].forEach(r => {
        ctx.strokeStyle = 'rgba(29,176,130,0.18)'; ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.arc(40, 40, r, 0, Math.PI * 2); ctx.stroke();
      });
      ctx.save(); ctx.translate(40, 40); ctx.rotate(angle);
      const g = ctx.createLinearGradient(0, 0, 36, 0);
      g.addColorStop(0, 'rgba(29,176,130,0.5)');
      g.addColorStop(1, 'rgba(29,176,130,0)');
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 34, -0.35, 0.35); ctx.closePath();
      ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = 'rgba(29,176,130,0.7)'; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(34, 0); ctx.stroke();
      ctx.restore();
      ctx.strokeStyle = 'rgba(29,176,130,0.35)'; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.arc(40, 40, 38, 0, Math.PI * 2); ctx.stroke();
      angle += 0.04;
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <canvas ref={ref} width={80} height={80}
      style={{ position: 'absolute', bottom: 32, right: 12, zIndex: 3 }} />
  );
}

// ─── Draw helpers ──────────────────────────────────────────────────────────

function seededRand(s: number) { const x = Math.sin(s) * 10000; return x - Math.floor(x); }
function getDepth(nx: number, ny: number) {
  let d = 0.5;
  d += 0.22 * Math.sin(nx * 3.1 + 1.2) * Math.cos(ny * 2.4 - 0.8);
  d += 0.14 * Math.sin(nx * 6.7 - 2.1) * Math.cos(ny * 5.2 + 1.0);
  d += 0.08 * Math.sin(nx * 11.3 + 0.5) * Math.cos(ny * 9.8 - 1.5);
  d -= Math.exp(-(Math.pow((nx - 0.5) * 3, 2)) - Math.pow((ny - 0.45) * 2.5, 2)) * 0.3;
  d += Math.exp(-(Math.pow((ny - 0.65) * 6, 2))) * 0.15 * (nx > 0.3 && nx < 0.7 ? 1 : 0);
  return Math.min(1, Math.max(0, d));
}
function bathyRGB(d: number): [number,number,number] {
  const stops: Array<[number,[number,number,number]]> = [
    [0,   [220,65,60]],  [0.15,[232,150,30]],
    [0.35,[28,155,115]], [0.6, [22,88,158]],  [1,  [4,40,78]],
  ];
  let lo = stops[0], hi = stops[stops.length-1];
  for (let i=0;i<stops.length-1;i++) if (d>=stops[i][0]&&d<=stops[i+1][0]){lo=stops[i];hi=stops[i+1];break;}
  const t=(d-lo[0])/(hi[0]-lo[0]);
  return [Math.round(lo[1][0]+(hi[1][0]-lo[1][0])*t),Math.round(lo[1][1]+(hi[1][1]-lo[1][1])*t),Math.round(lo[1][2]+(hi[1][2]-lo[1][2])*t)];
}

function drawBathy(ctx: CanvasRenderingContext2D, W: number, H: number) {
  const res=3, id=ctx.createImageData(W,H), dt=id.data;
  for (let py=0;py<H;py+=res) for (let px=0;px<W;px+=res) {
    const [r,g,b]=bathyRGB(getDepth(px/W,py/H));
    for(let dy=0;dy<res&&py+dy<H;dy++) for(let dx=0;dx<res&&px+dx<W;dx++){const i=((py+dy)*W+(px+dx))*4;dt[i]=r;dt[i+1]=g;dt[i+2]=b;dt[i+3]=230;}
  }
  ctx.putImageData(id,0,0);
}
function drawContours(ctx: CanvasRenderingContext2D, W: number, H: number) {
  const res=6;
  [0.15,0.3,0.45,0.6,0.75,0.9].forEach(level=>{
    ctx.strokeStyle='rgba(255,255,255,0.1)'; ctx.lineWidth=0.5; ctx.beginPath();
    for(let py=0;py<H-res;py+=res) for(let px=0;px<W-res;px+=res){
      const d00=getDepth(px/W,py/H),d10=getDepth((px+res)/W,py/H),d01=getDepth(px/W,(py+res)/H);
      if((d00<level)!==(d10<level)){const t=(level-d00)/(d10-d00);ctx.moveTo(px+t*res,py);ctx.lineTo(px+t*res,py+1);}
      if((d00<level)!==(d01<level)){const t=(level-d00)/(d01-d00);ctx.moveTo(px,py+t*res);ctx.lineTo(px+1,py+t*res);}
    }
    ctx.stroke();
  });
}
function drawSonar(ctx: CanvasRenderingContext2D, W: number, H: number, f: number) {
  const scanX=Math.round((f%240)/240*W);
  const id=ctx.getImageData(0,0,W,H),dt=id.data;
  for(let py=0;py<H;py++) for(let px=0;px<scanX;px++){
    const i=(py*W+px)*4;
    const noise=(seededRand(px*137+py*97+Math.floor(f/8)*3)-0.5)*18;
    const spec=seededRand(px*31+py*53)>0.97?32:0;
    dt[i]=Math.min(255,dt[i]+noise+spec); dt[i+1]=Math.min(255,dt[i+1]+noise*0.4+spec*0.6); dt[i+2]=Math.min(255,dt[i+2]+noise*0.2+spec*0.4);
  }
  ctx.putImageData(id,0,0);
  ctx.fillStyle='rgba(29,176,130,0.04)'; ctx.fillRect(0,0,scanX,H);
  ctx.strokeStyle='rgba(29,176,130,0.5)'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(scanX,0); ctx.lineTo(scanX,H); ctx.stroke();
}
function drawTrack(ctx: CanvasRenderingContext2D, W: number, H: number, f: number) {
  const rows=[0.12,0.3,0.5,0.68,0.86];
  ctx.strokeStyle='rgba(232,160,32,0.6)'; ctx.lineWidth=1.5; ctx.setLineDash([4,3]);
  ctx.beginPath();
  rows.forEach((ry,i)=>{const x1=i%2===0?0.04*W:0.96*W,x2=i%2===0?0.96*W:0.04*W,y=ry*H;if(i===0)ctx.moveTo(x1,y);else ctx.lineTo(x1,y);ctx.lineTo(x2,y);});
  ctx.stroke(); ctx.setLineDash([]);
  const progress=(f%240)/240;
  const rowIdx=Math.min(Math.floor(progress*rows.length),rows.length-1);
  ctx.fillStyle='#e8a020'; ctx.beginPath(); ctx.arc(progress*W,rows[rowIdx]*H,4,0,Math.PI*2); ctx.fill();
}
function drawTargets(ctx: CanvasRenderingContext2D, W: number, H: number, targets: Target[], selectedId: string|null, f: number) {
  const colors: Record<string,string>={high:'#d94f4f',medium:'#e8a020',low:'#1db082'};
  targets.forEach(t=>{
    const pos=DEMO_TARGET_PX[t.id]; if(!pos) return;
    const cx=pos.x*W,cy=pos.y*H,color=colors[t.classification]??'#fff';
    const pulse=0.5+0.5*Math.sin(f*0.08+targets.indexOf(t)*1.3);
    const sel=t.id===selectedId,r=sel?14:10;
    ctx.beginPath(); ctx.arc(cx,cy,r+7*pulse,0,Math.PI*2); ctx.strokeStyle=color+'30'; ctx.lineWidth=1; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.strokeStyle=color; ctx.lineWidth=sel?2.5:1.5; ctx.fillStyle=color+'25'; ctx.fill(); ctx.stroke();
    const cs=r+5; ctx.strokeStyle=color; ctx.lineWidth=1; ctx.beginPath();
    ctx.moveTo(cx-cs,cy);ctx.lineTo(cx+cs,cy);ctx.moveTo(cx,cy-cs);ctx.lineTo(cx,cy+cs);ctx.stroke();
    ctx.font='9px monospace'; ctx.fillStyle=color; ctx.fillText(t.id,cx+r+3,cy-3);
    if(sel){ctx.setLineDash([3,3]);ctx.beginPath();ctx.arc(cx,cy,r+14+4*pulse,0,Math.PI*2);ctx.strokeStyle=color;ctx.lineWidth=1.5;ctx.stroke();ctx.setLineDash([]);}
  });
}
function drawHeatmap(ctx: CanvasRenderingContext2D, W: number, H: number, targets: Target[]) {
  const res=4,id=ctx.createImageData(W,H),dt=id.data;
  for(let py=0;py<H;py+=res) for(let px=0;px<W;px+=res){
    const nx=px/W,ny=py/H;
    let heat=0;
    targets.forEach(t=>{const pos=DEMO_TARGET_PX[t.id];if(!pos)return;const dx=nx-pos.x,dy=ny-pos.y;heat+=0.8*Math.exp(-(dx*dx+dy*dy)*180)*t.confidence;});
    heat=Math.min(1,heat);
    if(heat>0.02){const r=Math.round(heat*220),g=Math.round((1-heat)*70),b=25;
      for(let dy=0;dy<res&&py+dy<H;dy++)for(let dx=0;dx<res&&px+dx<W;dx++){const i=((py+dy)*W+(px+dx))*4;dt[i]=r;dt[i+1]=g;dt[i+2]=b;dt[i+3]=Math.round(heat*200);}}
  }
  ctx.putImageData(id,0,0);
}
function draw3D(ctx: CanvasRenderingContext2D, W: number, H: number, f: number) {
  const slices=50;
  for(let row=0;row<slices;row++){
    const ny=row/slices,yS=H*0.15+row*(H*0.75/slices),persp=0.3+0.7*ny,alpha=0.12+ny*0.65;
    ctx.strokeStyle=`rgba(58,143,214,${alpha})`; ctx.lineWidth=0.8; ctx.beginPath();
    for(let col=0;col<=W;col+=2){const nx=col/W,d=getDepth(nx,ny+Math.sin(f*0.005)*0.01),relief=(d-0.5)*70*(1-ny*0.5)*persp,y=yS-relief;col===0?ctx.moveTo(col,y):ctx.lineTo(col,y);}
    ctx.stroke();
  }
}

// ─── Styles ───────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  page: { display: 'flex', height: '100%', overflow: 'hidden' },
  mapWrap: { flex: 1, position: 'relative', background: '#010b14', overflow: 'hidden' },
  sidebar: {
    width: 260, flexShrink: 0,
    borderLeft: '1px solid var(--border)',
    background: 'var(--panel)',
    padding: 16, overflowY: 'auto',
    display: 'flex', flexDirection: 'column', gap: 12,
  },
  statsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
  viewSwitch: {
    position: 'absolute', top: 12, left: 12, zIndex: 10,
    display: 'flex', gap: 4,
  },
  viewBtn: {
    padding: '5px 11px', borderRadius: 'var(--radius)',
    background: 'rgba(1,11,20,0.75)', backdropFilter: 'blur(4px)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: 'rgba(255,255,255,0.6)', fontSize: 12, transition: 'all 0.12s',
  },
  viewBtnOn: {
    background: 'rgba(29,176,130,0.2)',
    borderColor: 'rgba(29,176,130,0.5)',
    color: '#1db082',
  },
  legend: {
    position: 'absolute', bottom: 32, left: 12, zIndex: 3,
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
  },
  legendGrad: {
    width: 10, height: 70, borderRadius: 3,
    background: 'linear-gradient(to top, #04264e, #165fa5, #1db082, #e8a020, #d94f4f)',
    border: '0.5px solid rgba(255,255,255,0.15)',
  },
  legendLabel: { fontSize: 9, color: 'rgba(255,255,255,0.45)', fontFamily: 'monospace' },
  scalebar: { position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 },
  scalebarLine: { width: 80, height: 3, background: 'rgba(255,255,255,0.4)', borderLeft: '2px solid rgba(255,255,255,0.6)', borderRight: '2px solid rgba(255,255,255,0.6)' },
  layerRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 0' },
  eyeBtn: { background: 'none', border: 'none', display: 'flex', alignItems: 'center', padding: 2 },
  tRow: { width: '100%', textAlign: 'left', border: '1px solid', borderRadius: 'var(--radius-lg)', padding: '8px 10px', cursor: 'pointer', transition: 'all 0.12s', fontFamily: 'inherit' },
};
