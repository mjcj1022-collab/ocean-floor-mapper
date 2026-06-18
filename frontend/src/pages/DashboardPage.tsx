import { useRef, useEffect, useCallback } from 'react';
import { useSurveyStore } from '../store/surveyStore';
import { Stat, Badge, LiveDot } from '../components/ui';
import type { ViewMode } from '../types';

const DEMO_PX:Record<string,{x:number;y:number}>={'TGT-001':{x:0.42,y:0.38},'TGT-002':{x:0.61,y:0.55},'TGT-003':{x:0.28,y:0.65},'TGT-004':{x:0.73,y:0.29}};

function gd(nx:number,ny:number){let d=0.5;d+=0.22*Math.sin(nx*3.1+1.2)*Math.cos(ny*2.4-0.8);d+=0.14*Math.sin(nx*6.7-2.1)*Math.cos(ny*5.2+1);d+=0.08*Math.sin(nx*11.3+0.5)*Math.cos(ny*9.8-1.5);d-=Math.exp(-(Math.pow((nx-0.5)*3,2))-Math.pow((ny-0.45)*2.5,2))*0.3;return Math.min(1,Math.max(0,d));}
function bRGB(d:number):[number,number,number]{const st:Array<[number,[number,number,number]]>=[[0,[220,65,60]],[0.15,[232,150,30]],[0.35,[28,155,115]],[0.6,[22,88,158]],[1,[4,40,78]]];let lo=st[0],hi=st[st.length-1];for(let i=0;i<st.length-1;i++)if(d>=st[i][0]&&d<=st[i+1][0]){lo=st[i];hi=st[i+1];break;}const t=(d-lo[0])/(hi[0]-lo[0]);return[Math.round(lo[1][0]+(hi[1][0]-lo[1][0])*t),Math.round(lo[1][1]+(hi[1][1]-lo[1][1])*t),Math.round(lo[1][2]+(hi[1][2]-lo[1][2])*t)];}

export function DashboardPage() {
  const { layers, toggleLayer, targets, selectedTargetId, selectTarget, telemetry, viewMode, setViewMode } = useSurveyStore();
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const frameRef=useRef(0);
  const rafRef=useRef(0);

  const draw=useCallback(()=>{
    const c=canvasRef.current;if(!c)return;
    const ctx=c.getContext('2d')!;
    const W=c.width,H=c.height;
    frameRef.current++;const f=frameRef.current;
    ctx.fillStyle='#010b14';ctx.fillRect(0,0,W,H);
    // Bathymetry
    const res=3,id=ctx.createImageData(W,H),dt=id.data;
    for(let py=0;py<H;py+=res)for(let px=0;px<W;px+=res){const[r,g,b]=bRGB(gd(px/W,py/H));for(let dy=0;dy<res&&py+dy<H;dy++)for(let dx=0;dx<res&&px+dx<W;dx++){const i=((py+dy)*W+(px+dx))*4;dt[i]=r;dt[i+1]=g;dt[i+2]=b;dt[i+3]=220;}}
    ctx.putImageData(id,0,0);
    // Contours
    if(layers.find(l=>l.name==='contours')?.visible)[0.15,0.3,0.45,0.6,0.75,0.9].forEach(lv=>{
      ctx.strokeStyle='rgba(255,255,255,0.08)';ctx.lineWidth=0.5;ctx.beginPath();
      for(let py=0;py<H-6;py+=6)for(let px=0;px<W-6;px+=6){const d00=gd(px/W,py/H),d10=gd((px+6)/W,py/H),d01=gd(px/W,(py+6)/H);if((d00<lv)!==(d10<lv)){const t=(lv-d00)/(d10-d00);ctx.moveTo(px+t*6,py);ctx.lineTo(px+t*6,py+1);}if((d00<lv)!==(d01<lv)){const t=(lv-d00)/(d01-d00);ctx.moveTo(px,py+t*6);ctx.lineTo(px+1,py+t*6);}}ctx.stroke();
    });
    if(viewMode==='3d'){
      for(let row=0;row<50;row++){const ny=row/50,yS=H*0.15+row*(H*0.75/50),p=0.3+0.7*ny,a=0.12+ny*0.65;ctx.strokeStyle=`rgba(30,143,212,${a})`;ctx.lineWidth=0.8;ctx.beginPath();for(let col=0;col<=W;col+=2){const nx=col/W,d=gd(nx,ny+Math.sin(f*0.005)*0.01),relief=(d-0.5)*70*(1-ny*0.5)*p,y=yS-relief;col===0?ctx.moveTo(col,y):ctx.lineTo(col,y);}ctx.stroke();}
    }
    if(viewMode==='heatmap'&&layers.find(l=>l.name==='heatmap')?.visible){
      const hi=ctx.createImageData(W,H),hd=hi.data;
      for(let py=0;py<H;py+=4)for(let px=0;px<W;px+=4){const nx=px/W,ny=py/H;let heat=0;targets.forEach(t=>{const pos=DEMO_PX[t.id]??{x:0.5,y:0.5};const dx=nx-pos.x,dy=ny-pos.y;heat+=0.8*Math.exp(-(dx*dx+dy*dy)*180)*t.confidence;});heat=Math.min(1,heat);if(heat>0.02){const r=Math.round(heat*220),g=Math.round((1-heat)*70),b=25;for(let dy=0;dy<4&&py+dy<H;dy++)for(let dx=0;dx<4&&px+dx<W;dx++){const i=((py+dy)*W+(px+dx))*4;hd[i]=r;hd[i+1]=g;hd[i+2]=b;hd[i+3]=Math.round(heat*180);}}}
      ctx.putImageData(hi,0,0);
    }
    // Track
    if(layers.find(l=>l.name==='track')?.visible){
      const rows=[0.12,0.3,0.5,0.68,0.86];ctx.strokeStyle='rgba(240,165,0,0.55)';ctx.lineWidth=1.5;ctx.setLineDash([4,3]);ctx.beginPath();
      rows.forEach((ry,i)=>{const x1=i%2===0?0.04*W:0.96*W,x2=i%2===0?0.96*W:0.04*W,y=ry*H;if(i===0)ctx.moveTo(x1,y);else ctx.lineTo(x1,y);ctx.lineTo(x2,y);});ctx.stroke();ctx.setLineDash([]);
      const p=(f%240)/240,ri=Math.min(Math.floor(p*rows.length),rows.length-1);ctx.fillStyle='#f0a500';ctx.beginPath();ctx.arc(p*W,rows[ri]*H,4,0,Math.PI*2);ctx.fill();
    }
    // Targets
    if(layers.find(l=>l.name==='targets')?.visible)targets.forEach(t=>{
      const pos=t.pixel_x!=null?{x:t.pixel_x*W,y:t.pixel_y!*H}:(DEMO_PX[t.id]??null);if(!pos)return;
      const col=t.classification==='high'?'#e05050':t.classification==='medium'?'#f0a500':'#00c896';
      const pulse=0.5+0.5*Math.sin(f*0.08+targets.indexOf(t)*1.3);
      const sel=t.id===selectedTargetId,r=sel?14:10;
      ctx.beginPath();ctx.arc(pos.x,pos.y,r+6*pulse,0,Math.PI*2);ctx.strokeStyle=col+'35';ctx.lineWidth=1;ctx.stroke();
      ctx.beginPath();ctx.arc(pos.x,pos.y,r,0,Math.PI*2);ctx.strokeStyle=col;ctx.lineWidth=sel?2.5:1.5;ctx.fillStyle=col+'22';ctx.fill();ctx.stroke();
      const cs=r+5;ctx.strokeStyle=col;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(pos.x-cs,pos.y);ctx.lineTo(pos.x+cs,pos.y);ctx.moveTo(pos.x,pos.y-cs);ctx.lineTo(pos.x,pos.y+cs);ctx.stroke();
      ctx.fillStyle=col;ctx.font='bold 9px monospace';ctx.textAlign='left';ctx.fillText(t.id,pos.x+r+3,pos.y-3);
      if(t.ai_label&&sel)ctx.fillText(t.ai_label.slice(0,16),pos.x+r+3,pos.y+8);
      if(sel){ctx.setLineDash([3,3]);ctx.beginPath();ctx.arc(pos.x,pos.y,r+14+4*pulse,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);}
    });
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
    const mx=(e.clientX-rect.left)*(c.width/rect.width);const my=(e.clientY-rect.top)*(c.height/rect.height);
    for(const t of targets){const pos=t.pixel_x!=null?{x:t.pixel_x*c.width,y:t.pixel_y!*c.height}:(DEMO_PX[t.id]?{x:DEMO_PX[t.id].x*c.width,y:DEMO_PX[t.id].y*c.height}:null);if(pos&&Math.hypot(mx-pos.x,my-pos.y)<20){selectTarget(t.id===selectedTargetId?null:t.id);return;}}
    selectTarget(null);
  };

  const selectedTarget = targets.find(t=>t.id===selectedTargetId);

  return (
    <div style={{ display:'flex', height:'100%', overflow:'hidden' }}>
      {/* Map */}
      <div style={{ flex:1, position:'relative', background:'#010b14', overflow:'hidden' }}>
        <canvas ref={canvasRef} style={{ position:'absolute', inset:0, cursor:'crosshair' }} onClick={handleClick} />
        {/* View mode switcher */}
        <div style={{ position:'absolute', top:10, left:10, zIndex:5, display:'flex', gap:4 }}>
          {(['sonar','3d','heatmap','contour'] as ViewMode[]).map(m=>(
            <button key={m} onClick={()=>setViewMode(m)} style={{ padding:'5px 11px', borderRadius:'var(--r2)', background:viewMode===m?'rgba(0,200,150,0.2)':'rgba(1,11,20,0.8)', backdropFilter:'blur(4px)', border:`1px solid ${viewMode===m?'rgba(0,200,150,0.5)':'rgba(255,255,255,0.1)'}`, color:viewMode===m?'var(--green)':'rgba(255,255,255,0.5)', fontSize:11, cursor:'pointer' }}>{m.toUpperCase()}</button>
          ))}
        </div>
        {/* Depth legend */}
        <div style={{ position:'absolute', bottom:30, left:10, zIndex:3, display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
          <span style={{ fontSize:9, color:'rgba(255,255,255,0.4)', fontFamily:'var(--font-mono)' }}>0 m</span>
          <div style={{ width:10, height:70, borderRadius:3, background:'linear-gradient(to top,#042c53,#165fa5,#1c9e73,#e8a020,#dc4141)', border:'0.5px solid rgba(255,255,255,0.15)' }} />
          <span style={{ fontSize:9, color:'rgba(255,255,255,0.4)', fontFamily:'var(--font-mono)' }}>4500 m</span>
        </div>
        {/* Scale bar */}
        <div style={{ position:'absolute', bottom:12, left:'50%', transform:'translateX(-50%)', zIndex:3, display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
          <div style={{ width:80, height:3, background:'rgba(255,255,255,0.35)', borderLeft:'2px solid rgba(255,255,255,0.6)', borderRight:'2px solid rgba(255,255,255,0.6)' }} />
          <span style={{ fontSize:9, color:'rgba(255,255,255,0.4)' }}>500 m</span>
        </div>
        {/* Radar sweep */}
        <div style={{ position:'absolute', bottom:28, right:12, zIndex:3 }}><SweepMini /></div>
        {/* Selected target tooltip */}
        {selectedTarget && (
          <div style={{ position:'absolute', top:50, right:10, zIndex:5, background:'rgba(1,11,20,0.9)', border:'1px solid var(--green-bd)', borderRadius:'var(--r3)', padding:'10px 12px', minWidth:200 }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
              <LiveDot active color={selectedTarget.classification==='high'?'var(--red)':selectedTarget.classification==='medium'?'var(--amber)':'var(--green)'} />
              <span style={{ fontFamily:'var(--font-mono)', fontSize:12, fontWeight:700, color:'var(--t1)' }}>{selectedTarget.id}</span>
              <Badge v={selectedTarget.classification}>{selectedTarget.type}</Badge>
            </div>
            <div style={{ fontSize:11, color:'var(--blue)', marginBottom:6 }}>{selectedTarget.ai_label}</div>
            {[['Depth',`${selectedTarget.depth_m??'—'} m`],['Length',`${selectedTarget.dims.length_m??'—'} m`],['Height',`${selectedTarget.dims.height_m??'—'} m`],['Conf.',`${Math.round(selectedTarget.confidence*100)}%`]].map(([l,v])=>(
              <div key={l} style={{ display:'flex', justifyContent:'space-between', fontSize:10, padding:'2px 0' }}>
                <span style={{ color:'var(--t3)' }}>{l}</span><span style={{ color:'var(--t1)', fontFamily:'var(--font-mono)' }}>{v}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right panel */}
      <div style={{ width:240, flexShrink:0, borderLeft:'1px solid var(--b2)', background:'var(--bg2)', overflowY:'auto', display:'flex', flexDirection:'column', gap:0 }}>
        {/* Live stats */}
        <div style={{ padding:12, borderBottom:'1px solid var(--b2)' }}>
          <div style={{ fontSize:10, fontWeight:700, color:'var(--t3)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:10 }}>Live telemetry</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
            <Stat label="Coverage"    value={`${telemetry.coverage}%`} accent="var(--green)" />
            <Stat label="Speed"       value={telemetry.speed_kts} unit="kts" />
            <Stat label="Depth"       value={telemetry.depth_m} unit="m" accent="var(--blue)" />
            <Stat label="SVP"         value={telemetry.svp_ms} unit="m/s" />
          </div>
        </div>

        {/* Layers */}
        <div style={{ padding:12, borderBottom:'1px solid var(--b2)' }}>
          <div style={{ fontSize:10, fontWeight:700, color:'var(--t3)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:8 }}>Layers</div>
          {layers.map(l=>(
            <div key={l.name} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'5px 0' }}>
              <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                <div style={{ width:9, height:9, borderRadius:2, background:l.color }} />
                <span style={{ fontSize:11, color:'var(--t2)' }}>{l.label}</span>
              </div>
              <button onClick={()=>toggleLayer(l.name as any)} style={{ fontSize:10, color:l.visible?'var(--green)':'var(--t4)', background:'none', border:'none', cursor:'pointer', fontWeight:600 }}>{l.visible?'ON':'OFF'}</button>
            </div>
          ))}
        </div>

        {/* Target list */}
        <div style={{ padding:12, flex:1 }}>
          <div style={{ fontSize:10, fontWeight:700, color:'var(--t3)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:8 }}>Targets ({targets.length})</div>
          {targets.map(t=>(
            <button key={t.id} onClick={()=>selectTarget(t.id===selectedTargetId?null:t.id)} style={{ width:'100%', textAlign:'left', padding:'8px 10px', borderRadius:'var(--r2)', background:t.id===selectedTargetId?'rgba(0,200,150,0.07)':'var(--surface)', border:`1px solid ${t.id===selectedTargetId?'var(--green-bd)':'var(--b1)'}`, marginBottom:5, cursor:'pointer', display:'block' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                <span style={{ fontFamily:'var(--font-mono)', fontSize:11, fontWeight:700, color:t.classification==='high'?'var(--red)':t.classification==='medium'?'var(--amber)':'var(--green)' }}>{t.id}</span>
                <Badge v={t.classification}>{t.classification.toUpperCase()}</Badge>
              </div>
              <div style={{ fontSize:10, color:'var(--t3)' }}>{t.ai_label??t.type} · {Math.round(t.confidence*100)}%</div>
              {t.dims.height_m && <div style={{ fontSize:10, color:'var(--blue)', marginTop:2 }}>↑ {t.dims.height_m} m above seabed</div>}
            </button>
          ))}
          {targets.length===0&&<div style={{ fontSize:11, color:'var(--t4)', textAlign:'center', paddingTop:20 }}>No targets — go to Sonar Survey and click the sonar to mark one</div>}
        </div>
      </div>
    </div>
  );
}

function SweepMini(){
  const ref=useRef<HTMLCanvasElement>(null);
  useEffect(()=>{
    const c=ref.current;if(!c)return;const ctx=c.getContext('2d')!;let angle=0,raf=0;
    function tick(){
      ctx.clearRect(0,0,80,80);ctx.fillStyle='rgba(1,11,20,0.8)';ctx.beginPath();ctx.arc(40,40,38,0,Math.PI*2);ctx.fill();
      [10,20,30,38].forEach(r=>{ctx.strokeStyle='rgba(0,200,150,0.15)';ctx.lineWidth=0.5;ctx.beginPath();ctx.arc(40,40,r,0,Math.PI*2);ctx.stroke();});
      ctx.save();ctx.translate(40,40);ctx.rotate(angle);const g=ctx.createLinearGradient(0,0,36,0);g.addColorStop(0,'rgba(0,200,150,0.5)');g.addColorStop(1,'rgba(0,200,150,0)');ctx.beginPath();ctx.moveTo(0,0);ctx.arc(0,0,34,-0.35,0.35);ctx.closePath();ctx.fillStyle=g;ctx.fill();
      ctx.strokeStyle='rgba(0,200,150,0.65)';ctx.lineWidth=0.8;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(34,0);ctx.stroke();ctx.restore();
      ctx.strokeStyle='rgba(0,200,150,0.3)';ctx.lineWidth=0.8;ctx.beginPath();ctx.arc(40,40,38,0,Math.PI*2);ctx.stroke();
      angle+=0.04;raf=requestAnimationFrame(tick);
    }
    tick();return()=>cancelAnimationFrame(raf);
  },[]);
  return <canvas ref={ref} width={80} height={80} style={{ display:'block' }} />;
}
