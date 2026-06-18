import { useEffect, useRef, useState } from 'react';
import { useSurveyStore } from '../../store/surveyStore';
import { classifyTarget } from '../../utils/aiClassify';
import { shadowToHeight } from '../../utils/coords';
import type { Target } from '../../types';

interface Props { width?:number; height?:number; rangeM?:number; freqKhz?:number; gainDb?:number; running?:boolean; historical?:boolean; showTargets?:boolean; }

function seededRand(s:number){const x=Math.sin(s+1)*73856;return x-Math.floor(x);}

function generatePingLine(W:number,ping:number,freqKhz:number,gainDb:number,rangeM:number,historical:boolean):Uint8ClampedArray{
  const line=new Uint8ClampedArray(W),half=W/2,gain=(gainDb-20)/60;
  const historicalOffset=historical?180:0;
  for(let px=0;px<W;px++){
    const dist=Math.abs(px-half)/half;void(rangeM);
    const spread=Math.max(0,1-dist*0.55);
    const geo=0.5+0.32*Math.sin((ping+historicalOffset)*0.009+dist*4.1)+0.14*Math.sin((ping+historicalOffset)*0.028+dist*9.4)+0.06*Math.sin((ping+historicalOffset)*0.055+dist*18);
    const noise=seededRand(px*137+(ping+historicalOffset)*97*(freqKhz/100))*0.2;
    const TARGETS=[
      {pc:320,sc:0.42,r:0.022,str:1.0,shad:0.06},
      {pc:520,sc:0.61,r:0.016,str:0.75,shad:0.04},
      {pc:680,sc:0.28,r:0.026,str:0.45,shad:0.07},
      {pc:210,sc:0.73,r:0.018,str:0.92,shad:0.05},
    ];
    let tgt=0; const np=px/W;
    for(const t of TARGETS){
      const dp=(ping%800-t.pc)/800,ds=np-t.sc,d2=dp*dp*0.25+ds*ds;
      if(d2<t.r*t.r)tgt=Math.max(tgt,t.str*(1-d2/(t.r*t.r)));
      if(!historical&&dp>0&&dp<0.045&&Math.abs(ds-t.sc*0.06)<0.032)tgt=Math.min(tgt,-0.35);
    }
    const nadir=dist<0.035?(1-dist/0.035)*0.75:0;
    let v=Math.max(0,Math.min(1,(geo*spread+noise+nadir+gain*0.18+tgt)));
    if(historical)v=v*0.85;
    line[px]=Math.round(v*255);
  }
  return line;
}

function sonarRGB(i:number,historical:boolean):[number,number,number]{
  const t=i/255;
  if(historical){
    if(t<0.1)return[0,Math.round(t/0.1*5),Math.round(t/0.1*12)];
    if(t<0.4){const s=(t-0.1)/0.3;return[Math.round(s*15),Math.round(5+s*30),Math.round(12+s*60)];}
    if(t<0.7){const s=(t-0.4)/0.3;return[Math.round(15+s*40),Math.round(35+s*60),Math.round(72+s*50)];}
    const s=(t-0.7)/0.3;return[Math.round(55+s*80),Math.round(95+s*80),Math.round(122+s*60)];
  }
  if(t<0.12)return[0,Math.round(t/0.12*8),Math.round(t/0.12*18)];
  if(t<0.38){const s=(t-0.12)/0.26;return[Math.round(s*12),Math.round(8+s*38),Math.round(18+s*80)];}
  if(t<0.68){const s=(t-0.38)/0.3;return[Math.round(12+s*55),Math.round(46+s*110),Math.round(98+s*100)];}
  const s=(t-0.68)/0.32;return[Math.round(67+s*180),Math.round(156+s*99),Math.round(198+s*57)];
}

const DEMO_TGT_PX: Record<string,{x:number;y:number}> = {
  'TGT-001':{x:0.42,y:0.22},'TGT-002':{x:0.61,y:0.38},'TGT-003':{x:0.28,y:0.55},'TGT-004':{x:0.73,y:0.15},
};

export function SideScanSonar({ width=900, height=260, rangeM=200, freqKhz=100, gainDb=40, running=true, historical=false, showTargets=true }: Props) {
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const bufRef=useRef<Uint8ClampedArray|null>(null);
  const pingRef=useRef(0);
  const rafRef=useRef(0);
  const lastRef=useRef(0);
  const [cursor,setCursor]=useState<{x:number;info:string}|null>(null);
  const [markStart,setMarkStart]=useState<{x:number;y:number}|null>(null);
  const [markEnd,setMarkEnd]=useState<{x:number;y:number}|null>(null);
  const [hoveredTargetId,setHoveredTargetId]=useState<string|null>(null);
  // Track pixel positions of targets for HTML overlay positioning
  const [targetPixels,setTargetPixels]=useState<Record<string,{px:number;py:number}>>({});

  const { targets, selectedTargetId, selectTarget, addTarget, setTargets: _setTargets, removeTarget, measureMode, setMeasureMode, addMeasurement } = useSurveyStore();

  useEffect(()=>{
    const c=canvasRef.current; if(!c)return;
    const ctx=c.getContext('2d')!;
    const W=c.width,H=c.height;
    if(!bufRef.current||bufRef.current.length!==W*H*4)bufRef.current=new Uint8ClampedArray(W*H*4);

    function tick(ts:number){
      if(!running){rafRef.current=requestAnimationFrame(tick);return;}
      if(ts-lastRef.current<85){rafRef.current=requestAnimationFrame(tick);return;}
      lastRef.current=ts;
      const buf=bufRef.current!;
      const line=generatePingLine(W,pingRef.current++,freqKhz,gainDb,rangeM,historical);
      buf.copyWithin(W*4,0,(H-1)*W*4);
      for(let px=0;px<W;px++){const i=px*4;const[r,g,b]=sonarRGB(line[px],historical);buf[i]=r;buf[i+1]=g;buf[i+2]=b;buf[i+3]=255;}
      ctx.putImageData(new ImageData(new Uint8ClampedArray(buf),W,H),0,0);
      // Overlay
      const half=W/2;
      ctx.strokeStyle='rgba(0,200,150,0.45)';ctx.lineWidth=1;ctx.setLineDash([4,4]);
      ctx.beginPath();ctx.moveTo(half,0);ctx.lineTo(half,H);ctx.stroke();ctx.setLineDash([]);
      ctx.fillStyle='rgba(255,255,255,0.18)';ctx.font='9px var(--font-mono)';ctx.textAlign='center';
      for(let m=50;m<rangeM;m+=50){const pxO=m/rangeM*half;ctx.fillRect(half-pxO,0,0.5,5);ctx.fillText(`${m}`,half-pxO,14);ctx.fillRect(half+pxO,0,0.5,5);ctx.fillText(`${m}`,half+pxO,14);}
      // Active marker
      ctx.fillStyle='rgba(0,200,150,0.5)';ctx.fillRect(W-36,0,36,2);
      // Target overlays
      if(showTargets&&!historical){
        targets.forEach(t=>{
          const pos=t.pixel_x!=null?{x:t.pixel_x*W,y:t.pixel_y!*H}:(DEMO_TGT_PX[t.id]?{x:DEMO_TGT_PX[t.id].x*W,y:DEMO_TGT_PX[t.id].y*H}:null);
          if(!pos)return;
          const sel=t.id===selectedTargetId,r=sel?14:10;
          const col=t.classification==='high'?'#e05050':t.classification==='medium'?'#f0a500':'#00c896';
          const pulse=0.5+0.5*Math.sin(pingRef.current*0.06+targets.indexOf(t)*1.3);
          ctx.beginPath();ctx.arc(pos.x,pos.y,r+6*pulse,0,Math.PI*2);ctx.strokeStyle=col+'40';ctx.lineWidth=1;ctx.stroke();
          ctx.beginPath();ctx.arc(pos.x,pos.y,r,0,Math.PI*2);ctx.strokeStyle=col;ctx.lineWidth=sel?2.5:1.5;ctx.fillStyle=col+'25';ctx.fill();ctx.stroke();
          const cs=r+5;ctx.strokeStyle=col;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(pos.x-cs,pos.y);ctx.lineTo(pos.x+cs,pos.y);ctx.moveTo(pos.x,pos.y-cs);ctx.lineTo(pos.x,pos.y+cs);ctx.stroke();
          // Dimension label
          if(t.dims.length_m){
            ctx.fillStyle='rgba(0,0,0,0.7)';ctx.fillRect(pos.x+r+3,pos.y-20,70,34);
            ctx.fillStyle=col;ctx.font='bold 10px var(--font-mono)';ctx.textAlign='left';
            ctx.fillText(t.id,pos.x+r+6,pos.y-8);
            ctx.fillStyle='rgba(255,255,255,0.8)';ctx.font='9px var(--font-mono)';
            ctx.fillText(`L:${t.dims.length_m}m H:${t.dims.height_m??'?'}m`,pos.x+r+6,pos.y+4);
            if(t.ai_label)ctx.fillText(t.ai_label.slice(0,16),pos.x+r+6,pos.y+14);
          } else {
            ctx.fillStyle=col;ctx.font='9px var(--font-mono)';ctx.textAlign='left';ctx.fillText(t.id,pos.x+r+3,pos.y-3);
            if(t.ai_label)ctx.fillText(t.ai_label.slice(0,12),pos.x+r+3,pos.y+8);
          }
          if(sel){ctx.setLineDash([3,3]);ctx.beginPath();ctx.arc(pos.x,pos.y,r+14+4*pulse,0,Math.PI*2);ctx.strokeStyle=col;ctx.lineWidth=1.5;ctx.stroke();ctx.setLineDash([]);}
        });
      }
      // Measurement line
      if(markStart&&markEnd){
        ctx.strokeStyle='#f0a500';ctx.lineWidth=2;ctx.setLineDash([5,3]);
        ctx.beginPath();ctx.moveTo(markStart.x,markStart.y);ctx.lineTo(markEnd.x,markEnd.y);ctx.stroke();
        ctx.setLineDash([]);
        const dist=Math.hypot(markEnd.x-markStart.x,markEnd.y-markStart.y)/W*rangeM*2;
        ctx.fillStyle='rgba(0,0,0,0.8)';ctx.fillRect((markStart.x+markEnd.x)/2-30,(markStart.y+markEnd.y)/2-10,60,18);
        ctx.fillStyle='#f0a500';ctx.font='bold 10px var(--font-mono)';ctx.textAlign='center';
        ctx.fillText(`${dist.toFixed(1)} m`,(markStart.x+markEnd.x)/2,(markStart.y+markEnd.y)/2+3);
        ctx.fillStyle='#f0a500';ctx.beginPath();ctx.arc(markStart.x,markStart.y,3,0,Math.PI*2);ctx.fill();
        ctx.beginPath();ctx.arc(markEnd.x,markEnd.y,3,0,Math.PI*2);ctx.fill();
      }
      rafRef.current=requestAnimationFrame(tick);
    }
    rafRef.current=requestAnimationFrame(tick);
    return()=>cancelAnimationFrame(rafRef.current);
  },[running,freqKhz,gainDb,rangeM,historical,targets,selectedTargetId,markStart,markEnd,showTargets]);

  const handleMouseMove=(e:React.MouseEvent<HTMLCanvasElement>)=>{
    const c=canvasRef.current!;const rect=c.getBoundingClientRect();
    const mx=(e.clientX-rect.left)*(c.width/rect.width);
    const my=(e.clientY-rect.top)*(c.height/rect.height);
    const W=c.width,H=c.height;
    const x=mx;
    const half=c.width/2;const dist=Math.round(Math.abs(x-half)/half*rangeM);
    const side=x<half?'PORT':'STBD';
    setCursor({x:e.clientX-rect.left,info:`${side} ${dist} m`});
    if(measureMode!=='none'&&markStart)setMarkEnd({x:mx,y:my});

    // Detect which target is hovered — update HTML overlay positions
    const newPixels:Record<string,{px:number;py:number}>={}; 
    let hoveredId:string|null=null;
    for(const t of targets){
      const pos=t.pixel_x!=null?{x:t.pixel_x*W,y:t.pixel_y!*H}:(DEMO_TGT_PX[t.id]?{x:DEMO_TGT_PX[t.id].x*W,y:DEMO_TGT_PX[t.id].y*H}:null);
      if(!pos)continue;
      // Convert canvas px → CSS px for overlay
      const cssX=(pos.x/c.width)*rect.width;
      const cssY=(pos.y/c.height)*rect.height;
      newPixels[t.id]={px:cssX,py:cssY};
      if(Math.hypot(mx-pos.x,my-pos.y)<22)hoveredId=t.id;
    }
    setTargetPixels(newPixels);
    setHoveredTargetId(hoveredId);
  };

  const handleClick=(e:React.MouseEvent<HTMLCanvasElement>)=>{
    const c=canvasRef.current!;const rect=c.getBoundingClientRect();
    const mx=(e.clientX-rect.left)*(c.width/rect.width);
    const my=(e.clientY-rect.top)*(c.height/rect.height);
    const W=c.width,H=c.height;

    if(measureMode!=='none'){
      if(!markStart){setMarkStart({x:mx,y:my});setMarkEnd(null);}
      else{
        const dist=+(Math.hypot(mx-markStart.x,my-markStart.y)/W*rangeM*2).toFixed(2);
        addMeasurement({id:`M-${Date.now()}`,mode:measureMode,points:[markStart,{x:mx,y:my}],result:dist,unit:'m',label:`${measureMode}: ${dist} m`});
        setMarkStart(null);setMarkEnd(null);setMeasureMode('none');
      }
      return;
    }

    // Hit-test targets
    for(const t of targets){
      const pos=t.pixel_x!=null?{x:t.pixel_x*W,y:t.pixel_y!*H}:(DEMO_TGT_PX[t.id]?{x:DEMO_TGT_PX[t.id].x*W,y:DEMO_TGT_PX[t.id].y*H}:null);
      if(pos&&Math.hypot(mx-pos.x,my-pos.y)<18){selectTarget(t.id===selectedTargetId?null:t.id);return;}
    }

    // Create new target on click
    if(!historical){
      const intensity=0.6+Math.random()*0.35;
      const conf=0.4+Math.random()*0.55;
      const {type,ai_label,ai_description}=classifyTarget(conf,intensity);
      const shadowPx=Math.round(10+Math.random()*20);
      const shadowM=+(shadowPx/W*rangeM*2).toFixed(1);
      const height=shadowToHeight(shadowM);
      const newT:Target={
        id:`TGT-${String(targets.length+1).padStart(3,'0')}`,
        lat:28.45+Math.random()*0.02,lon:-92.84+Math.random()*0.04,
        depth_m:Math.round(600+Math.random()*1200),intensity,confidence:conf,
        classification:conf>0.75?'high':conf>0.5?'medium':'low',
        type,status:'OPEN',notes:'',
        dims:{length_m:+(Math.random()*20+3).toFixed(1),width_m:+(Math.random()*6+1).toFixed(1),height_m:height,shadow_length_m:shadowM},
        ai_label,ai_description,created_at:new Date().toISOString(),created_by:'MJ',
        pixel_x:mx/W,pixel_y:my/H,manual:true,
      };
      addTarget(newT);selectTarget(newT.id);
    }
  };

  const cursor_style = measureMode!=='none' ? 'crosshair' : hoveredTargetId ? 'default' : 'pointer';

  return (
    <div style={{ position:'relative', background:'#000', overflow:'hidden' }}>
      <canvas ref={canvasRef} width={width} height={height}
        style={{ display:'block', width:'100%', height, cursor:cursor_style }}
        onMouseMove={handleMouseMove}
        onMouseLeave={()=>{ setCursor(null); setHoveredTargetId(null); }}
        onClick={handleClick} />

      {/* Cursor distance readout */}
      {cursor && !hoveredTargetId && (
        <div style={{ position:'absolute', top:6, left:cursor.x+10, background:'rgba(0,0,0,0.8)', color:'var(--green)', fontSize:10, fontFamily:'var(--font-mono)', padding:'2px 7px', borderRadius:3, pointerEvents:'none', whiteSpace:'nowrap' }}>{cursor.info}</div>
      )}

      {/* Delete X buttons — one per target, shown on hover */}
      {showTargets && !historical && targets.map(t => {
        const pos = targetPixels[t.id];
        if (!pos) return null;
        const isHovered = hoveredTargetId === t.id;
        const isSelected = selectedTargetId === t.id;
        if (!isHovered && !isSelected) return null;
        const col = t.classification==='high' ? '#e05050' : t.classification==='medium' ? '#f0a500' : '#00c896';
        return (
          <button
            key={t.id}
            onClick={(e) => { e.stopPropagation(); removeTarget(t.id); }}
            onMouseEnter={() => setHoveredTargetId(t.id)}
            title={`Delete ${t.id}`}
            style={{
              position:'absolute',
              left: pos.px + 14,
              top:  pos.py - 20,
              width: 18, height: 18,
              borderRadius: '50%',
              background: 'rgba(0,0,0,0.85)',
              border: `1.5px solid ${col}`,
              color: col,
              fontSize: 11,
              fontWeight: 700,
              lineHeight: '16px',
              textAlign: 'center',
              cursor: 'pointer',
              zIndex: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.12s',
              boxShadow: `0 0 6px ${col}60`,
            }}
          >
            ✕
          </button>
        );
      })}

      {/* Port / starboard labels */}
      <div style={{ position:'absolute', top:4, left:8, fontSize:9, fontFamily:'var(--font-mono)', color:'rgba(0,200,150,0.6)', pointerEvents:'none' }}>◀ PORT</div>
      <div style={{ position:'absolute', top:4, right:8, fontSize:9, fontFamily:'var(--font-mono)', color:'rgba(0,200,150,0.6)', pointerEvents:'none' }}>STBD ▶</div>

      {/* Measurement mode hint */}
      {measureMode!=='none' && (
        <div style={{ position:'absolute', bottom:6, left:'50%', transform:'translateX(-50%)', background:'rgba(240,165,0,0.9)', color:'#000', fontSize:10, fontWeight:700, padding:'3px 10px', borderRadius:10, pointerEvents:'none' }}>
          📏 {measureMode.toUpperCase()} — click to set point {markStart ? '2' : '1'}
        </div>
      )}
    </div>
  );
}
