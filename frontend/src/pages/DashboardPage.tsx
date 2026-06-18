import { useRef, useEffect, useCallback } from 'react';
import { useSurveyStore } from '../store/surveyStore';
import { Stat, Badge, LiveDot } from '../components/ui';
import type { ViewMode } from '../types';

const DEMO_PX:Record<string,{x:number;y:number}>={
  'TGT-001':{x:0.42,y:0.38},'TGT-002':{x:0.61,y:0.55},
  'TGT-003':{x:0.28,y:0.65},'TGT-004':{x:0.73,y:0.29},
};

// ─── Terrain model ────────────────────────────────────────────────────────
// Returns depth 0-1 (0=shallow/peak, 1=deep/abyssal)
function terrain(nx:number,ny:number):number{
  let d=0.52;
  // Large-scale bathymetric structure
  d += 0.18*Math.sin(nx*2.8+0.9)*Math.cos(ny*2.1-0.6);
  d += 0.11*Math.sin(nx*5.9-1.7)*Math.cos(ny*4.8+1.1);
  d += 0.06*Math.sin(nx*11.2+0.4)*Math.cos(ny*9.6-1.4);
  d += 0.03*Math.sin(nx*22.1-0.8)*Math.cos(ny*18.4+2.1);
  // Seamount / ridge — peak near centre-left
  const rx=nx-0.35,ry=ny-0.42;
  d -= 0.38*Math.exp(-(rx*rx*8+ry*ry*7));
  // Secondary ridge
  const r2x=nx-0.72,r2y=ny-0.28;
  d -= 0.18*Math.exp(-(r2x*r2x*14+r2y*r2y*12));
  // Canyon cutting across middle
  const canyonDist=Math.abs(ny-0.62-0.06*Math.sin(nx*6));
  d += 0.14*Math.exp(-(canyonDist*canyonDist*120));
  // Abyssal plain — deeper in bottom-right
  d += 0.08*(nx+ny)*0.5;
  return Math.min(1,Math.max(0,d));
}


// ─── Colour ramps ─────────────────────────────────────────────────────────

// Topographic: warm peaks → greens → blues → abyssal purple
const TOPO_STOPS:[number,[number,number,number]][]=[
  [0.00,[255,248,220]], // summit — sand/cream
  [0.08,[210,185,130]], // shallow shelf
  [0.18,[140,200,160]], // upper slope green
  [0.30,[45,160,120]],  // mid slope teal
  [0.45,[22,110,160]],  // bathyal blue-teal
  [0.62,[18,75,140]],   // deep blue
  [0.78,[12,48,100]],   // abyssal blue
  [1.00,[6,20,55]],     // hadal dark
];

function topoRGB(d:number):[number,number,number]{
  let lo=TOPO_STOPS[0],hi=TOPO_STOPS[TOPO_STOPS.length-1];
  for(let i=0;i<TOPO_STOPS.length-1;i++){
    if(d>=TOPO_STOPS[i][0]&&d<=TOPO_STOPS[i+1][0]){lo=TOPO_STOPS[i];hi=TOPO_STOPS[i+1];break;}
  }
  const t=(d-lo[0])/(hi[0]-lo[0]);
  return[
    Math.round(lo[1][0]+(hi[1][0]-lo[1][0])*t),
    Math.round(lo[1][1]+(hi[1][1]-lo[1][1])*t),
    Math.round(lo[1][2]+(hi[1][2]-lo[1][2])*t),
  ];
}

// ─── Hillshade ────────────────────────────────────────────────────────────
// Simple Lambertian hillshade from NW sun
function hillshade(nx:number,ny:number,eps=0.003):number{
  const dzdx=(terrain(nx+eps,ny)-terrain(nx-eps,ny))/(2*eps);
  const dzdy=(terrain(nx,ny+eps)-terrain(nx,ny-eps))/(2*eps);
  // Sun azimuth 315° (NW), altitude 45°
  const lx=-0.707,ly=-0.707,lz=0.5;
  const slope=Math.sqrt(dzdx*dzdx+dzdy*dzdy);
  const nx_=(-dzdx)/Math.sqrt(1+slope*slope);
  const ny_=(-dzdy)/Math.sqrt(1+slope*slope);
  const nz_=1/Math.sqrt(1+slope*slope);
  return Math.max(0.15,lx*nx_+ly*ny_+lz*nz_);
}

// ─── Contour levels (depth in metres, 0–4500 m) ──────────────────────────
const MAX_DEPTH=4500;
const MAJOR_CONTOURS=[500,1000,1500,2000,2500,3000,3500,4000]; // every 500m
const MINOR_CONTOURS=[250,750,1250,1750,2250,2750,3250,3750];  // every 250m (minor)

function depthToNorm(m:number):number{return m/MAX_DEPTH;}

// ─── Draw functions ───────────────────────────────────────────────────────

function drawTopo(ctx:CanvasRenderingContext2D,W:number,H:number){
  const res=2;
  const id=ctx.createImageData(W,H);
  const dt=id.data;
  for(let py=0;py<H;py+=res){
    for(let px=0;px<W;px+=res){
      const nx=px/W,ny=py/H;
      const d=terrain(nx,ny);
      const hs=hillshade(nx,ny);
      let[r,g,b]=topoRGB(d);
      // Blend hillshade
      r=Math.min(255,Math.round(r*hs*1.1));
      g=Math.min(255,Math.round(g*hs*1.1));
      b=Math.min(255,Math.round(b*hs*1.1));
      for(let dy=0;dy<res&&py+dy<H;dy++)
        for(let dx=0;dx<res&&px+dx<W;dx++){
          const i=((py+dy)*W+(px+dx))*4;
          dt[i]=r;dt[i+1]=g;dt[i+2]=b;dt[i+3]=255;
        }
    }
  }
  ctx.putImageData(id,0,0);
}

function drawContours(
  ctx:CanvasRenderingContext2D,W:number,H:number,
  major:boolean,labelDepths:boolean,
){
  const res=4;
  const levels = major
    ? MAJOR_CONTOURS.map(m=>({norm:depthToNorm(m),depth:m,isMajor:true}))
    : MINOR_CONTOURS.map(m=>({norm:depthToNorm(m),depth:m,isMajor:false}));

  levels.forEach(({norm,depth,isMajor})=>{
    const segments:{x1:number;y1:number;x2:number;y2:number}[]=[];

    for(let gy=0;gy<H-res;gy+=res){
      for(let gx=0;gx<W-res;gx+=res){
        const d00=terrain(gx/W,gy/H);
        const d10=terrain((gx+res)/W,gy/H);
        const d01=terrain(gx/W,(gy+res)/H);
              // Top edge
        if((d00<norm)!==(d10<norm)){
          const t=(norm-d00)/(d10-d00);
          const x=gx+t*res;
          segments.push({x1:x,y1:gy,x2:x,y2:gy+1});
        }
        // Left edge
        if((d00<norm)!==(d01<norm)){
          const t=(norm-d00)/(d01-d00);
          const y=gy+t*res;
          segments.push({x1:gx,y1:y,x2:gx+1,y2:y});
        }
      }
    }

    // Draw segments
    ctx.strokeStyle=isMajor
      ? 'rgba(255,255,255,0.55)'
      : 'rgba(255,255,255,0.22)';
    ctx.lineWidth=isMajor?1.2:0.6;
    ctx.beginPath();
    segments.forEach(s=>{ctx.moveTo(s.x1,s.y1);ctx.lineTo(s.x2,s.y2);});
    ctx.stroke();

    // Depth labels on major contours
    if(labelDepths&&isMajor){
      ctx.fillStyle='rgba(255,255,255,0.7)';
      ctx.font=`bold 10px monospace`;
      ctx.textAlign='center';
      // Place label every ~220px along the top band of segments
      const labelSegs=segments.filter((_,i)=>i%40===20);
      labelSegs.forEach(s=>{
        ctx.save();
        ctx.fillStyle='rgba(0,0,0,0.45)';
        ctx.fillRect(s.x1-22,s.y1-8,44,13);
        ctx.fillStyle='rgba(255,255,255,0.85)';
        ctx.fillText(`${depth}m`,s.x1,s.y1+3);
        ctx.restore();
      });
    }
  });
}

function drawGrid(ctx:CanvasRenderingContext2D,W:number,H:number){
  ctx.strokeStyle='rgba(255,255,255,0.05)';
  ctx.lineWidth=0.5;
  ctx.setLineDash([2,6]);
  for(let x=0;x<=W;x+=W/8){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
  for(let y=0;y<=H;y+=H/6){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
  ctx.setLineDash([]);
}

function draw3DWireframe(ctx:CanvasRenderingContext2D,W:number,H:number,f:number){
  // Oblique relief wireframe — looks like hillshaded 3D
  const slices=60;
  for(let row=0;row<slices;row++){
    const ny=row/slices;
    const yS=H*0.08+row*(H*0.85/slices);
    const persp=0.4+0.6*ny;
    const alpha=0.1+ny*0.7;
    const d=terrain(0.5,ny);
    const[r,g,b]=topoRGB(d);
    ctx.strokeStyle=`rgba(${r},${g},${b},${alpha})`;
    ctx.lineWidth=0.9;
    ctx.beginPath();
    for(let col=0;col<=W;col+=2){
      const nx=col/W;
      const depth=terrain(nx,ny+Math.sin(f*0.003)*0.005);
      const relief=(0.5-depth)*110*(1-ny*0.3)*persp;
      const y=yS-relief;
      col===0?ctx.moveTo(col,y):ctx.lineTo(col,y);
    }
    ctx.stroke();
  }
  // Overlay contours on 3D
  drawContours(ctx,W,H,true,false);
}

function drawTopoLegend(ctx:CanvasRenderingContext2D,_W:number,H:number){
  const x=14,y=H-160,bw=18,bh=130;
  // Gradient bar
  for(let i=0;i<bh;i++){
    const d=i/bh;
    const[r,g,b]=topoRGB(d);
    ctx.fillStyle=`rgb(${r},${g},${b})`;
    ctx.fillRect(x,y+i,bw,1);
  }
  ctx.strokeStyle='rgba(255,255,255,0.3)';
  ctx.lineWidth=0.5;
  ctx.strokeRect(x,y,bw,bh);
  // Tick labels
  ctx.fillStyle='rgba(255,255,255,0.7)';
  ctx.font='9px monospace';
  ctx.textAlign='left';
  [0,1000,2000,3000,4500].forEach(m=>{
    const ty=y+Math.round((m/4500)*bh);
    ctx.fillRect(x+bw,ty,5,0.5);
    ctx.fillText(`${m}m`,x+bw+7,ty+3);
  });
  ctx.fillStyle='rgba(255,255,255,0.5)';
  ctx.font='bold 9px monospace';
  ctx.fillText('DEPTH',x,y-5);
}

// ─── Page component ───────────────────────────────────────────────────────

export function DashboardPage(){
  const { layers, toggleLayer, targets, selectedTargetId, selectTarget, telemetry, viewMode, setViewMode } = useSurveyStore();
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const frameRef=useRef(0);
  const rafRef=useRef(0);

  const draw=useCallback(()=>{
    const c=canvasRef.current;if(!c)return;
    const ctx=c.getContext('2d')!;
    const W=c.width,H=c.height;
    frameRef.current++;
    const f=frameRef.current;

    ctx.fillStyle='#06101c';
    ctx.fillRect(0,0,W,H);

    if(viewMode==='3d'){
      // Dark base for wireframe
      ctx.fillStyle='#04090f';ctx.fillRect(0,0,W,H);
      draw3DWireframe(ctx,W,H,f);
    } else {
      // Topographic base (all modes)
      drawTopo(ctx,W,H);
      // Grid
      drawGrid(ctx,W,H);
      // Contours — always draw on topo/sonar/heatmap
      drawContours(ctx,W,H,false,false); // minor
      drawContours(ctx,W,H,true,true);   // major + labels
    }

    // Survey track
    if(layers.find(l=>l.name==='track')?.visible){
      const rows=[0.12,0.3,0.5,0.68,0.86];
      ctx.strokeStyle='rgba(240,165,0,0.7)';ctx.lineWidth=1.5;ctx.setLineDash([5,3]);ctx.beginPath();
      rows.forEach((ry,i)=>{
        const x1=i%2===0?0.04*W:0.96*W,x2=i%2===0?0.96*W:0.04*W,y=ry*H;
        if(i===0)ctx.moveTo(x1,y);else ctx.lineTo(x1,y);ctx.lineTo(x2,y);
      });
      ctx.stroke();ctx.setLineDash([]);
      // Vessel dot
      const p=(f%300)/300;
      const ri=Math.min(Math.floor(p*rows.length),rows.length-1);
      ctx.fillStyle='#f0a500';
      ctx.beginPath();ctx.arc(p*W,rows[ri]*H,5,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='rgba(240,165,0,0.2)';
      ctx.beginPath();ctx.arc(p*W,rows[ri]*H,12,0,Math.PI*2);ctx.fill();
      // Direction arrow
      ctx.strokeStyle='#f0a500';ctx.lineWidth=1.5;
      const ax=p*W,ay=rows[ri]*H,dir=ri%2===0?0:Math.PI;
      ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(ax+Math.cos(dir)*14,ay+Math.sin(dir)*14);ctx.stroke();
    }

    // Target markers
    if(layers.find(l=>l.name==='targets')?.visible){
      targets.forEach(t=>{
        const pos=t.pixel_x!=null
          ?{x:t.pixel_x*W,y:t.pixel_y!*H}
          :(DEMO_PX[t.id]??null);
        if(!pos)return;
        const col=t.classification==='high'?'#e05050':t.classification==='medium'?'#f0a500':'#00c896';
        const pulse=0.4+0.6*Math.sin(f*0.07+targets.indexOf(t)*1.5);
        const sel=t.id===selectedTargetId,r=sel?15:11;

        // Outer pulse ring
        ctx.beginPath();ctx.arc(pos.x,pos.y,r+8*pulse,0,Math.PI*2);
        ctx.strokeStyle=col+'30';ctx.lineWidth=1;ctx.stroke();

        // Filled circle
        ctx.beginPath();ctx.arc(pos.x,pos.y,r,0,Math.PI*2);
        ctx.fillStyle=col+'30';ctx.fill();
        ctx.strokeStyle=col;ctx.lineWidth=sel?2.5:1.8;ctx.stroke();

        // Crosshair
        const cs=r+7;ctx.strokeStyle=col;ctx.lineWidth=1.2;ctx.beginPath();
        ctx.moveTo(pos.x-cs,pos.y);ctx.lineTo(pos.x+cs,pos.y);
        ctx.moveTo(pos.x,pos.y-cs);ctx.lineTo(pos.x,pos.y+cs);ctx.stroke();

        // Label box
        const lx=pos.x+r+5,ly=pos.y-8;
        ctx.fillStyle='rgba(0,0,0,0.75)';
        const lw=sel?94:60;
        ctx.fillRect(lx-2,ly-10,lw,sel?38:20);
        ctx.fillStyle=col;ctx.font='bold 10px monospace';ctx.textAlign='left';
        ctx.fillText(t.id,lx,ly);
        if(sel&&t.ai_label){ctx.font='9px monospace';ctx.fillStyle='rgba(255,255,255,0.7)';ctx.fillText(t.ai_label.slice(0,14),lx,ly+10);}
        if(sel&&t.dims.height_m){ctx.fillStyle=col;ctx.fillText(`↑${t.dims.height_m}m`,lx,ly+22);}

        // Selected outer ring
        if(sel){
          ctx.setLineDash([4,3]);ctx.strokeStyle=col;ctx.lineWidth=1.5;
          ctx.beginPath();ctx.arc(pos.x,pos.y,r+16+5*pulse,0,Math.PI*2);ctx.stroke();
          ctx.setLineDash([]);
        }

        // Depth label pin — shows actual depth on topo
        const depthNorm=t.depth_m?t.depth_m/MAX_DEPTH:0.5;
        const[dr,dg,db]=topoRGB(depthNorm);
        ctx.fillStyle=`rgb(${dr},${dg},${db})`;
        ctx.fillRect(pos.x-1,pos.y+r+2,2,10);
      });
    }

    // Depth legend
    drawTopoLegend(ctx,W,H);

    // Scale bar bottom-centre
    const sbW=100,sbX=(W-sbW)/2,sbY=H-18;
    ctx.fillStyle='rgba(255,255,255,0.4)';
    ctx.fillRect(sbX,sbY,sbW,2);
    ctx.fillRect(sbX,sbY-3,1,8);ctx.fillRect(sbX+sbW,sbY-3,1,8);
    ctx.fillStyle='rgba(255,255,255,0.6)';ctx.font='9px monospace';ctx.textAlign='center';
    ctx.fillText('500 m',sbX+sbW/2,sbY-5);

    // North arrow top-right
    const nax=W-36,nay=36;
    ctx.strokeStyle='rgba(255,255,255,0.6)';ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(nax,nay-14);ctx.lineTo(nax,nay+14);ctx.stroke();
    ctx.beginPath();ctx.moveTo(nax,nay-14);ctx.lineTo(nax-5,nay-4);ctx.lineTo(nax+5,nay-4);ctx.closePath();
    ctx.fillStyle='rgba(255,255,255,0.7)';ctx.fill();
    ctx.fillStyle='rgba(255,255,255,0.7)';ctx.font='bold 10px monospace';ctx.textAlign='center';
    ctx.fillText('N',nax,nay+24);

    rafRef.current=requestAnimationFrame(draw);
  },[layers,viewMode,targets,selectedTargetId]);

  useEffect(()=>{
    const c=canvasRef.current;if(!c)return;
    const resize=()=>{const p=c.parentElement!;c.width=p.clientWidth;c.height=p.clientHeight;};
    resize();window.addEventListener('resize',resize);return()=>window.removeEventListener('resize',resize);
  },[]);
  useEffect(()=>{rafRef.current=requestAnimationFrame(draw);return()=>cancelAnimationFrame(rafRef.current);},[draw]);

  const handleClick=(e:React.MouseEvent<HTMLCanvasElement>)=>{
    const c=canvasRef.current!;const rect=c.getBoundingClientRect();
    const mx=(e.clientX-rect.left)*(c.width/rect.width);
    const my=(e.clientY-rect.top)*(c.height/rect.height);
    for(const t of targets){
      const pos=t.pixel_x!=null?{x:t.pixel_x*c.width,y:t.pixel_y!*c.height}:(DEMO_PX[t.id]?{x:DEMO_PX[t.id].x*c.width,y:DEMO_PX[t.id].y*c.height}:null);
      if(pos&&Math.hypot(mx-pos.x,my-pos.y)<20){selectTarget(t.id===selectedTargetId?null:t.id);return;}
    }
    selectTarget(null);
  };

  const selectedTarget=targets.find(t=>t.id===selectedTargetId);

  return(
    <div style={{ display:'flex', height:'100%', overflow:'hidden' }}>
      {/* Map */}
      <div style={{ flex:1, position:'relative', background:'#06101c', overflow:'hidden' }}>
        <canvas ref={canvasRef} style={{ position:'absolute', inset:0, cursor:'crosshair' }} onClick={handleClick} />

        {/* View mode buttons */}
        <div style={{ position:'absolute', top:10, left:10, zIndex:5, display:'flex', gap:4 }}>
          {(['sonar','3d','heatmap','contour'] as ViewMode[]).map(m=>(
            <button key={m} onClick={()=>setViewMode(m)} style={{
              padding:'5px 12px', borderRadius:4,
              background: viewMode===m ? 'rgba(0,200,150,0.25)' : 'rgba(6,16,28,0.85)',
              backdropFilter:'blur(4px)',
              border:`1px solid ${viewMode===m?'rgba(0,200,150,0.6)':'rgba(255,255,255,0.12)'}`,
              color: viewMode===m ? '#00c896' : 'rgba(255,255,255,0.55)',
              fontSize:11, fontWeight:600, cursor:'pointer', letterSpacing:'0.04em',
            }}>
              {m==='sonar'?'TOPO':m==='heatmap'?'TOPO+HEAT':m.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Selected target tooltip */}
        {selectedTarget&&(
          <div style={{ position:'absolute', top:50, right:10, zIndex:5, background:'rgba(6,16,28,0.92)', border:'1px solid rgba(0,200,150,0.3)', borderRadius:8, padding:'10px 12px', minWidth:200 }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
              <LiveDot active color={selectedTarget.classification==='high'?'var(--red)':selectedTarget.classification==='medium'?'var(--amber)':'var(--green)'} />
              <span style={{ fontFamily:'var(--font-mono)', fontSize:12, fontWeight:700 }}>{selectedTarget.id}</span>
              <Badge v={selectedTarget.classification}>{selectedTarget.type}</Badge>
            </div>
            <div style={{ fontSize:11, color:'var(--blue)', marginBottom:6 }}>{selectedTarget.ai_label}</div>
            {[['Depth',`${selectedTarget.depth_m??'—'} m`],['Length',`${selectedTarget.dims.length_m??'—'} m`],['Height ↑',`${selectedTarget.dims.height_m??'—'} m above seabed`],['Confidence',`${Math.round(selectedTarget.confidence*100)}%`]].map(([l,v])=>(
              <div key={l} style={{ display:'flex', justifyContent:'space-between', fontSize:10, padding:'2px 0', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ color:'var(--t3)' }}>{l}</span>
                <span style={{ color:'var(--t1)', fontFamily:'var(--font-mono)' }}>{v}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right panel */}
      <div style={{ width:240, flexShrink:0, borderLeft:'1px solid var(--b2)', background:'var(--bg2)', overflowY:'auto' }}>
        <div style={{ padding:12, borderBottom:'1px solid var(--b2)' }}>
          <div style={{ fontSize:10, fontWeight:700, color:'var(--t3)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:10 }}>Live telemetry</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
            <Stat label="Coverage"  value={`${telemetry.coverage}%`} accent="var(--green)" />
            <Stat label="Speed"     value={telemetry.speed_kts} unit="kts" />
            <Stat label="Depth"     value={telemetry.depth_m}   unit="m"   accent="var(--blue)" />
            <Stat label="SVP"       value={telemetry.svp_ms}    unit="m/s" />
          </div>
        </div>

        <div style={{ padding:12, borderBottom:'1px solid var(--b2)' }}>
          <div style={{ fontSize:10, fontWeight:700, color:'var(--t3)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:8 }}>Layers</div>
          {layers.map(l=>(
            <div key={l.name} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'5px 0' }}>
              <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                <div style={{ width:9, height:9, borderRadius:2, background:l.color }} />
                <span style={{ fontSize:11, color:'var(--t2)' }}>{l.label}</span>
              </div>
              <button onClick={()=>toggleLayer(l.name as any)} style={{ fontSize:10, color:l.visible?'var(--green)':'var(--t4)', background:'none', border:'none', cursor:'pointer', fontWeight:600 }}>
                {l.visible?'ON':'OFF'}
              </button>
            </div>
          ))}
        </div>

        <div style={{ padding:12 }}>
          <div style={{ fontSize:10, fontWeight:700, color:'var(--t3)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:8 }}>Targets ({targets.length})</div>
          {targets.length===0&&<div style={{ fontSize:11, color:'var(--t4)', paddingTop:12 }}>No targets — go to Sonar Survey and click the sonar</div>}
          {targets.map(t=>(
            <button key={t.id} onClick={()=>selectTarget(t.id===selectedTargetId?null:t.id)} style={{ width:'100%', textAlign:'left', padding:'8px 10px', borderRadius:6, background:t.id===selectedTargetId?'rgba(0,200,150,0.07)':'var(--surface)', border:`1px solid ${t.id===selectedTargetId?'var(--green-bd)':'var(--b1)'}`, marginBottom:5, cursor:'pointer', display:'block' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                <span style={{ fontFamily:'var(--font-mono)', fontSize:11, fontWeight:700, color:t.classification==='high'?'var(--red)':t.classification==='medium'?'var(--amber)':'var(--green)' }}>{t.id}</span>
                <Badge v={t.classification}>{t.classification.toUpperCase()}</Badge>
              </div>
              <div style={{ fontSize:10, color:'var(--t3)' }}>{t.ai_label??t.type}</div>
              {t.depth_m&&<div style={{ fontSize:10, color:'var(--blue)', marginTop:2, fontFamily:'var(--font-mono)' }}>{t.depth_m} m depth</div>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

