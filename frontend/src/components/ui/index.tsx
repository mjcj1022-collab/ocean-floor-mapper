import type { ReactNode, CSSProperties, ButtonHTMLAttributes } from 'react';

export function Card({ children, style, pad='14px', glow }: { children:ReactNode; style?:CSSProperties; pad?:string; glow?:string }) {
  return <div style={{ background:'var(--panel)', border:`1px solid ${glow ? glow+'40' : 'var(--b2)'}`, borderRadius:'var(--r3)', padding:pad, boxShadow: glow ? `0 0 20px ${glow}15` : undefined, ...style }}>{children}</div>;
}

export function SectionLabel({ children, right }: { children:ReactNode; right?:ReactNode }) {
  return <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
    <span style={{ fontSize:10, fontWeight:700, color:'var(--t3)', textTransform:'uppercase', letterSpacing:'0.1em' }}>{children}</span>
    {right}
  </div>;
}

type BV = 'high'|'medium'|'low'|'info'|'success'|'warning'|'neutral'|'purple'|'cyan';
const BD: Record<BV, CSSProperties> = {
  high:    { background:'var(--red-lo)',    color:'var(--red)',    border:'1px solid var(--red-bd)' },
  medium:  { background:'var(--amber-lo)',  color:'var(--amber)',  border:'1px solid var(--amber-bd)' },
  low:     { background:'var(--green-lo)',  color:'var(--green)',  border:'1px solid var(--green-bd)' },
  info:    { background:'var(--blue-lo)',   color:'var(--blue)',   border:'1px solid var(--blue-bd)' },
  success: { background:'var(--green-lo)',  color:'var(--green)',  border:'1px solid var(--green-bd)' },
  warning: { background:'var(--amber-lo)',  color:'var(--amber)',  border:'1px solid var(--amber-bd)' },
  neutral: { background:'rgba(255,255,255,0.04)', color:'var(--t2)', border:'1px solid var(--b2)' },
  purple:  { background:'var(--purple-lo)', color:'var(--purple)', border:'1px solid rgba(139,103,240,0.3)' },
  cyan:    { background:'var(--cyan-lo)',   color:'var(--cyan)',   border:'1px solid rgba(0,212,255,0.3)' },
};
export function Badge({ v='neutral', children, dot }: { v?:BV; children:ReactNode; dot?:boolean }) {
  return <span style={{ ...BD[v], fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:3, letterSpacing:'0.04em', display:'inline-flex', alignItems:'center', gap:4 }}>
    {dot && <span style={{ width:5, height:5, borderRadius:'50%', background:'currentColor' }} />}
    {children}
  </span>;
}

type BtnV = 'primary'|'secondary'|'ghost'|'danger'|'success'|'amber';
const BT: Record<BtnV, CSSProperties> = {
  primary:   { background:'var(--green)',    color:'#001a10', border:'none' },
  secondary: { background:'var(--surface2)', color:'var(--t1)', border:'1px solid var(--b2)' },
  ghost:     { background:'transparent',     color:'var(--t2)', border:'1px solid var(--b1)' },
  danger:    { background:'var(--red-lo)',   color:'var(--red)', border:'1px solid var(--red-bd)' },
  success:   { background:'var(--green-lo)', color:'var(--green)', border:'1px solid var(--green-bd)' },
  amber:     { background:'var(--amber-lo)', color:'var(--amber)', border:'1px solid var(--amber-bd)' },
};
interface BP extends ButtonHTMLAttributes<HTMLButtonElement> { v?:BtnV; sz?:'xs'|'sm'|'md'|'lg'; icon?:ReactNode; full?:boolean; }
export function Btn({ v='secondary', sz='md', icon, children, style, full, ...rest }: BP) {
  const pad = {xs:'3px 8px',sm:'5px 11px',md:'7px 14px',lg:'10px 20px'}[sz];
  const fs  = {xs:11,sm:12,md:13,lg:14}[sz];
  return <button style={{ ...BT[v], padding:pad, borderRadius:'var(--r2)', fontSize:fs, fontWeight:500, display:'inline-flex', alignItems:'center', gap:6, transition:'all 0.12s', width:full?'100%':undefined, justifyContent:full?'center':undefined, fontFamily:'var(--font-ui)', ...style }} {...rest}>
    {icon && <span style={{ display:'flex', flexShrink:0 }}>{icon}</span>}
    {children}
  </button>;
}

export function Stat({ label, value, unit, accent, sub }: { label:string; value:string|number; unit?:string; accent?:string; sub?:string }) {
  return <div style={{ background:'var(--surface)', border:'1px solid var(--b1)', borderRadius:'var(--r3)', padding:'10px 12px' }}>
    <div style={{ fontSize:9, color:'var(--t3)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:5 }}>{label}</div>
    <div style={{ display:'flex', alignItems:'baseline', gap:3 }}>
      <span style={{ fontSize:20, fontWeight:700, color:accent??'var(--t1)', fontVariantNumeric:'tabular-nums', fontFamily:'var(--font-mono)' }}>{value}</span>
      {unit && <span style={{ fontSize:11, color:'var(--t3)' }}>{unit}</span>}
    </div>
    {sub && <div style={{ fontSize:10, color:'var(--t3)', marginTop:3 }}>{sub}</div>}
  </div>;
}

export function Toggle({ on, onChange, label }: { on:boolean; onChange:()=>void; label?:string }) {
  return <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer' }}>
    <button onClick={onChange} style={{ width:32, height:18, borderRadius:9, background:on?'var(--green)':'var(--surface3)', border:'1px solid '+(on?'transparent':'var(--b2)'), position:'relative', transition:'all 0.15s', flexShrink:0 }}>
      <span style={{ position:'absolute', width:12, height:12, borderRadius:'50%', background:'#fff', top:2, left:on?16:2, transition:'left 0.15s' }} />
    </button>
    {label && <span style={{ fontSize:12, color:'var(--t2)' }}>{label}</span>}
  </label>;
}

export function Slider({ label, value, min, max, step=1, unit, onChange, color='var(--green)' }: { label:string; value:number; min:number; max:number; step?:number; unit:string; onChange:(v:number)=>void; color?:string }) {
  return <div style={{ marginBottom:10 }}>
    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
      <span style={{ fontSize:11, color:'var(--t2)' }}>{label}</span>
      <span style={{ fontSize:11, color:'var(--t1)', fontVariantNumeric:'tabular-nums', fontFamily:'var(--font-mono)' }}>{value} {unit}</span>
    </div>
    <input type="range" min={min} max={max} step={step} value={value} onChange={e=>onChange(Number(e.target.value))}
      style={{ width:'100%', accentColor:color }} />
  </div>;
}

export function Progress({ value, color='var(--green)', h=4, label }: { value:number; color?:string; h?:number; label?:string }) {
  return <div>
    {label && <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'var(--t3)', marginBottom:3 }}>
      <span>{label}</span><span>{Math.round(value)}%</span>
    </div>}
    <div style={{ height:h, background:'var(--surface2)', borderRadius:h/2, overflow:'hidden' }}>
      <div style={{ width:`${Math.min(100,value)}%`, height:'100%', background:color, borderRadius:h/2, transition:'width 0.4s' }} />
    </div>
  </div>;
}

export function Divider({ m='10px 0', label }: { m?:string; label?:string }) {
  if (label) return <div style={{ display:'flex', alignItems:'center', gap:8, margin:m }}>
    <div style={{ flex:1, height:1, background:'var(--b1)' }} /><span style={{ fontSize:9, color:'var(--t3)', textTransform:'uppercase', letterSpacing:'0.1em' }}>{label}</span><div style={{ flex:1, height:1, background:'var(--b1)' }} />
  </div>;
  return <div style={{ height:1, background:'var(--b1)', margin:m }} />;
}

export function Row({ label, value, mono, accent }: { label:string; value:string|number; mono?:boolean; accent?:string }) {
  return <div style={{ display:'flex', justifyContent:'space-between', padding:'4px 0', borderBottom:'1px solid var(--b1)' }}>
    <span style={{ fontSize:11, color:'var(--t2)' }}>{label}</span>
    <span style={{ fontSize:11, color:accent??'var(--t1)', fontFamily:mono?'var(--font-mono)':undefined, fontVariantNumeric:'tabular-nums' }}>{value}</span>
  </div>;
}

export function LiveDot({ active=true, color, pulse=true }: { active?:boolean; color?:string; pulse?:boolean }) {
  const c = color ?? (active ? 'var(--green)' : 'var(--t4)');
  return <span style={{ width:7, height:7, borderRadius:'50%', background:c, display:'inline-block', flexShrink:0,
    boxShadow: active && pulse ? `0 0 0 3px ${c}30` : 'none',
    animation: active && pulse ? 'pulse-dot 2s ease-in-out infinite' : 'none' }} />;
}

export function Input({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label?:string }) {
  return <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
    {label && <label style={{ fontSize:10, color:'var(--t3)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em' }}>{label}</label>}
    <input {...props} style={{ background:'var(--surface2)', border:'1px solid var(--b2)', borderRadius:'var(--r2)', padding:'6px 10px', color:'var(--t1)', width:'100%', ...props.style }} />
  </div>;
}
