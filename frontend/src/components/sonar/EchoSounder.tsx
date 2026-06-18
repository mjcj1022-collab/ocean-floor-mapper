import { useEffect, useRef, useState } from 'react';

interface Props { width?:number; height?:number; maxDepthM?:number; freqKhz?:number; gainDb?:number; running?:boolean; historical?:boolean; }

function seabedDepth(n:number,max:number,hist:boolean):number{
  const off=hist?0.15:0,base=hist?0.6:0.55;
  const u=0.08*Math.sin((n+off)*Math.PI*3.2+0.5)+0.04*Math.sin((n+off)*Math.PI*8.7-1.2)+0.02*Math.sin((n+off)*Math.PI*19-2.1);
  const c=(n>0.38&&n<0.62)?0.12*Math.sin((n-0.38)/0.24*Math.PI):0;
  return Math.max(0.25,Math.min(0.88,base+u+c+(hist?0.05:0)))*max;
}

function generateCol(H:number,pingIdx:number,pingNorm:number,freqKhz:number,gainDb:number,historical:boolean):Uint8ClampedArray{
  const col=new Uint8ClampedArray(H);
  const sbPx=Math.round(seabedDepth(pingNorm,1.0,historical)*H);
  const gain=(gainDb-20)/60;
  const ff=freqKhz/100;
  for(let py=0;py<H;py++){
    if(py<3){col[py]=Math.round(45*(1-py/3));continue;}
    if(py<sbPx-2){col[py]=Math.round((Math.sin(pingIdx*0.17+py*0.31)*0.5+0.5)*5*gain);continue;}
    const d=py-sbPx;
    if(d>=-3&&d<=5){
      const hard=0.5+0.28*Math.sin(pingNorm*14+pingIdx*0.003);
      const dv=d/1.9;
      const prof=Math.exp(-(dv*dv));
      col[py]=Math.round(Math.min(255,(0.6+hard*0.35+gain*0.08)*prof*255));
      continue;
    }
    if(d>5&&d<H*0.38){
      const sub=d/H;
      const att=Math.exp(-sub*ff*16);
      const r1=((d-10)%22)-8;
      const r2=((d-18)%28)-12;
      const r3=((d-30)%35)-15;
      const l1=Math.exp(-(r1*r1)/4)*0.42;
      const l2=Math.exp(-(r2*r2)/5)*0.28;
      const l3=Math.exp(-(r3*r3)/6)*0.18;
      const unc=d>38&&d<44?0.22*Math.sin(pingNorm*8.5):0;
      col[py]=Math.round(Math.min(255,Math.max(0,(l1+l2+l3+unc)*att*255+gain*12)));
      continue;
    }
    col[py]=Math.round(Math.max(0,7+Math.sin(pingNorm*11+pingIdx*0.002)*12));
  }
  return col;
}

function echoRGB(i:number,hist:boolean):[number,number,number]{
  const t=i/255;
  if(hist){
    if(t<0.1)return[0,Math.round(t/0.1*4),Math.round(t/0.1*10)];
    if(t<0.35){const s=(t-0.1)/0.25;return[0,Math.round(4+s*20),Math.round(10+s*40)];}
    if(t<0.65){const s=(t-0.35)/0.3;return[Math.round(s*20),Math.round(24+s*60),Math.round(50+s*80)];}
    const s=(t-0.65)/0.35;return[Math.round(20+s*60),Math.round(84+s*80),Math.round(130+s*60)];
  }
  if(t<0.08)return[0,Math.round(t/0.08*5),Math.round(t/0.08*14)];
  if(t<0.3){const s=(t-0.08)/0.22;return[0,Math.round(5+s*28),Math.round(14+s*58)];}
  if(t<0.6){const s=(t-0.3)/0.3;return[Math.round(s*35),Math.round(33+s*105),Math.round(72+s*108)];}
  if(t<0.85){const s=(t-0.6)/0.25;return[Math.round(35+s*185),Math.round(138+s*100),Math.round(180+s*60)];}
  const s=(t-0.85)/0.15;return[Math.round(220+s*35),Math.round(238+s*17),Math.round(240+s*15)];
}

export function EchoSounder({ width=900, height=260, maxDepthM=2000, freqKhz=3.5, gainDb=45, running=true, historical=false }: Props) {
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const bufRef=useRef<Uint8ClampedArray|null>(null);
  const pingRef=useRef(0);
  const rafRef=useRef(0);
  const lastRef=useRef(0);
  const [cursor,setCursor]=useState<{y:number;depth:string}|null>(null);

  useEffect(()=>{
    const c=canvasRef.current;if(!c)return;
    const ctx=c.getContext('2d')!;
    const W=c.width,H=c.height;
    if(!bufRef.current||bufRef.current.length!==W*H*4)bufRef.current=new Uint8ClampedArray(W*H*4);

    function tick(ts:number){
      if(!running){rafRef.current=requestAnimationFrame(tick);return;}
      if(ts-lastRef.current<110){rafRef.current=requestAnimationFrame(tick);return;}
      lastRef.current=ts;
      const buf=bufRef.current!;
      const pi=pingRef.current++;
      const pn=(pi%600)/600;
      const col=generateCol(H,pi,pn,freqKhz,gainDb,historical);
      for(let row=0;row<H;row++){const rs=row*W*4;buf.copyWithin(rs,rs+4,rs+W*4);}
      const cx=W-1;
      for(let py=0;py<H;py++){const i=(py*W+cx)*4;const[r,g,b]=echoRGB(col[py],historical);buf[i]=r;buf[i+1]=g;buf[i+2]=b;buf[i+3]=255;}
      ctx.putImageData(new ImageData(new Uint8ClampedArray(buf),W,H),0,0);
      // Depth scale
      ctx.fillStyle='rgba(255,255,255,0.2)';ctx.font='9px var(--font-mono)';ctx.textAlign='left';
      [200,400,600,800,1000,1400,1800,2000].filter(d=>d<maxDepthM).forEach(d=>{
        const py=Math.round(d/maxDepthM*H);ctx.fillRect(0,py,14,0.5);ctx.fillText(`${d}m`,16,py+3);
      });
      const cd=Math.round(seabedDepth(pn,maxDepthM,historical));
      ctx.fillStyle=historical?'rgba(100,160,200,0.8)':'rgba(0,200,150,0.8)';
      ctx.textAlign='right';ctx.font='bold 11px var(--font-mono)';
      ctx.fillText(`⬇ ${cd} m`,W-6,13);
      ctx.fillStyle=historical?'rgba(100,160,200,0.45)':'rgba(0,200,150,0.45)';
      ctx.fillRect(W-2,0,2,H);
      ctx.strokeStyle='rgba(58,143,212,0.25)';ctx.lineWidth=1;ctx.setLineDash([3,3]);
      ctx.beginPath();ctx.moveTo(0,2);ctx.lineTo(W,2);ctx.stroke();ctx.setLineDash([]);
      rafRef.current=requestAnimationFrame(tick);
    }
    rafRef.current=requestAnimationFrame(tick);
    return()=>cancelAnimationFrame(rafRef.current);
  },[running,freqKhz,gainDb,maxDepthM,historical]);

  return (
    <div style={{ position:'relative', background:'#000', overflow:'hidden' }}>
      <canvas ref={canvasRef} width={width} height={height}
        style={{ display:'block', width:'100%', height }}
        onMouseMove={e=>{const c=canvasRef.current!,rect=c.getBoundingClientRect();const y=(e.clientY-rect.top)*(c.height/rect.height);setCursor({y:e.clientY-rect.top,depth:`${Math.round(y/c.height*maxDepthM)} m`});}}
        onMouseLeave={()=>setCursor(null)} />
      {cursor&&<>
        <div style={{ position:'absolute', left:0, right:0, top:cursor.y, height:1, background:'rgba(0,200,150,0.25)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', right:50, top:cursor.y-8, background:'rgba(0,0,0,0.8)', color:'var(--green)', fontSize:10, fontFamily:'var(--font-mono)', padding:'1px 6px', borderRadius:3, pointerEvents:'none' }}>{cursor.depth}</div>
      </>}
    </div>
  );
}
