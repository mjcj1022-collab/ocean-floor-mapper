import { useState } from 'react';
import { useSurveyStore } from '../store/surveyStore';
import { Card, SectionLabel, Badge, Btn, Row, Progress } from '../components/ui';
import type { Target, TargetClass, TargetStatus } from '../types';
import { MapPin, Crosshair, Edit3 } from 'lucide-react';

const CLASS_COL:Record<TargetClass,string>={high:'var(--red)',medium:'var(--amber)',low:'var(--green)'};
const STAT_COL:Record<TargetStatus,string>={OPEN:'var(--amber)',REVIEWED:'var(--blue)',CONFIRMED:'var(--green)',ASSIGNED:'var(--purple)',CLOSED:'var(--t3)'};

export function TargetsPage() {
  const { targets, selectedTargetId, selectTarget, updateTarget } = useSurveyStore();
  const [filter, setFilter] = useState<'all'|TargetClass>('all');
  const [editNotes, setEditNotes] = useState(false);
  const [draftNotes, setDraftNotes] = useState('');

  const shown = filter==='all' ? targets : targets.filter(t=>t.classification===filter);
  const sel = targets.find(t=>t.id===selectedTargetId) ?? null;

  function cycleStatus(t: Target) {
    const order: TargetStatus[] = ['OPEN','REVIEWED','CONFIRMED','ASSIGNED','CLOSED'];
    const next = order[(order.indexOf(t.status)+1)%order.length];
    updateTarget(t.id, { status: next });
  }

  return (
    <div style={{ display:'flex', height:'100%', overflow:'hidden' }}>
      {/* Table */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0 }}>
        {/* Filter bar */}
        <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 16px', borderBottom:'1px solid var(--b2)', background:'var(--bg2)', flexShrink:0 }}>
          <span style={{ fontSize:12, color:'var(--t2)' }}>{shown.length} target{shown.length!==1?'s':''}</span>
          <div style={{ display:'flex', gap:4 }}>
            {(['all','high','medium','low'] as const).map(f=>(
              <button key={f} onClick={()=>setFilter(f)} style={{ padding:'4px 12px', borderRadius:'var(--r2)', fontSize:11, fontWeight:500, background:filter===f?'var(--green-lo)':'var(--surface)', color:filter===f?'var(--green)':'var(--t2)', border:`1px solid ${filter===f?'var(--green-bd)':'var(--b2)'}`, cursor:'pointer' }}>
                {f.charAt(0).toUpperCase()+f.slice(1)}
              </button>
            ))}
          </div>
          <div style={{ marginLeft:'auto', display:'flex', gap:6 }}>
            <Btn v="ghost" sz="sm">Export CSV</Btn>
            <Btn v="ghost" sz="sm">Export PDF</Btn>
          </div>
        </div>

        {/* Column headers */}
        <div style={{ display:'grid', gridTemplateColumns:'90px 80px 90px 1fr 80px 80px 80px 80px 90px', padding:'6px 12px', background:'var(--surface)', borderBottom:'1px solid var(--b2)', flexShrink:0 }}>
          {['ID','Class','Status','AI Label','Conf.','Depth','L (m)','H (m)','Actions'].map(h=>(
            <span key={h} style={{ fontSize:9, fontWeight:700, color:'var(--t3)', textTransform:'uppercase', letterSpacing:'0.08em' }}>{h}</span>
          ))}
        </div>

        {/* Rows */}
        <div style={{ flex:1, overflowY:'auto' }}>
          {shown.length===0 && <div style={{ padding:40, textAlign:'center', color:'var(--t3)', fontSize:12 }}>No targets yet — click on the sonar to mark one</div>}
          {shown.map(t=>(
            <div key={t.id} onClick={()=>selectTarget(t.id===selectedTargetId?null:t.id)}
              style={{ display:'grid', gridTemplateColumns:'90px 80px 90px 1fr 80px 80px 80px 80px 90px', padding:'9px 12px', borderBottom:'1px solid var(--b1)', cursor:'pointer', background:t.id===selectedTargetId?'rgba(0,200,150,0.05)':'transparent', transition:'background 0.1s', alignItems:'center' }}>
              <span style={{ fontFamily:'var(--font-mono)', fontSize:11, fontWeight:700, color:CLASS_COL[t.classification] }}>{t.id}</span>
              <span><Badge v={t.classification}>{t.classification.toUpperCase()}</Badge></span>
              <span><span style={{ fontSize:10, color:STAT_COL[t.status], fontWeight:600 }}>{t.status}</span></span>
              <span style={{ fontSize:11, color:'var(--t2)', paddingRight:8 }}>{t.ai_label??'Unknown Anomaly'}</span>
              <span>
                <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                  <div style={{ flex:1, height:3, background:'var(--surface2)', borderRadius:2, overflow:'hidden' }}>
                    <div style={{ width:`${t.confidence*100}%`, height:'100%', background:CLASS_COL[t.classification] }} />
                  </div>
                  <span style={{ fontSize:10, color:'var(--t2)', minWidth:28 }}>{Math.round(t.confidence*100)}%</span>
                </div>
              </span>
              <span style={{ fontSize:11, color:'var(--t2)', fontFamily:'var(--font-mono)' }}>{t.depth_m??'—'}</span>
              <span style={{ fontSize:11, color:'var(--t2)', fontFamily:'var(--font-mono)' }}>{t.dims.length_m??'—'}</span>
              <span style={{ fontSize:11, color:'var(--t2)', fontFamily:'var(--font-mono)' }}>{t.dims.height_m??'—'}</span>
              <span onClick={e=>{e.stopPropagation();cycleStatus(t);}}><Btn v="ghost" sz="xs">Advance</Btn></span>
            </div>
          ))}
        </div>
      </div>

      {/* Detail panel */}
      <div style={{ width:290, flexShrink:0, borderLeft:'1px solid var(--b2)', overflowY:'auto', background:'var(--bg2)' }}>
        {!sel && <div style={{ padding:24, textAlign:'center', color:'var(--t3)', fontSize:12 }}>Select a target to view details</div>}
        {sel && (
          <div style={{ padding:14, display:'flex', flexDirection:'column', gap:12 }}>
            {/* Header */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span style={{ fontFamily:'var(--font-mono)', fontSize:16, fontWeight:700, color:CLASS_COL[sel.classification] }}>{sel.id}</span>
              <div style={{ display:'flex', gap:4 }}>
                <Badge v={sel.classification}>{sel.classification.toUpperCase()}</Badge>
                {sel.manual && <Badge v="purple">MANUAL</Badge>}
              </div>
            </div>

            {/* AI classification */}
            <Card pad="10px" glow="var(--blue)">
              <SectionLabel>AI Classification</SectionLabel>
              <div style={{ fontSize:12, fontWeight:600, color:'var(--blue)', marginBottom:4 }}>{sel.ai_label??'Unknown'}</div>
              <div style={{ fontSize:11, color:'var(--t2)', lineHeight:1.5 }}>{sel.ai_description??'Manual target — no AI classification.'}</div>
              <div style={{ marginTop:8 }}><Progress value={sel.confidence*100} color={CLASS_COL[sel.classification]} label="Confidence" /></div>
            </Card>

            {/* Dimensions */}
            <Card pad="10px">
              <SectionLabel>Physical dimensions</SectionLabel>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:8 }}>
                {[['Length',sel.dims.length_m,'m'],['Width',sel.dims.width_m,'m'],['Height ↑',sel.dims.height_m,'m'],['Shadow',sel.dims.shadow_length_m,'m']].map(([l,v,u])=>(
                  <div key={l as string} style={{ background:'var(--surface)', borderRadius:'var(--r2)', padding:'8px 10px', border:'1px solid var(--b1)' }}>
                    <div style={{ fontSize:9, color:'var(--t3)', marginBottom:3, textTransform:'uppercase', letterSpacing:'0.06em' }}>{l}</div>
                    <div style={{ fontSize:18, fontWeight:700, color:'var(--t1)', fontFamily:'var(--font-mono)' }}>{v??'—'}<span style={{ fontSize:11, color:'var(--t3)' }}>{v?` ${u}`:''}</span></div>
                  </div>
                ))}
              </div>
              {sel.dims.area_m2 && <Row label="Area" value={`${sel.dims.area_m2} m²`} />}
              {sel.dims.volume_m3 && <Row label="Vol. estimate" value={`${sel.dims.volume_m3} m³`} />}
            </Card>

            {/* Status workflow */}
            <Card pad="10px">
              <SectionLabel>Status workflow</SectionLabel>
              <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                {(['OPEN','REVIEWED','CONFIRMED','ASSIGNED','CLOSED'] as TargetStatus[]).map(s=>(
                  <button key={s} onClick={()=>updateTarget(sel.id,{status:s})} style={{ padding:'4px 8px', borderRadius:4, fontSize:10, fontWeight:600, background:sel.status===s?STAT_COL[s]+'22':'var(--surface)', color:sel.status===s?STAT_COL[s]:'var(--t3)', border:`1px solid ${sel.status===s?STAT_COL[s]+'50':'var(--b1)'}`, cursor:'pointer' }}>{s}</button>
                ))}
              </div>
            </Card>

            {/* Location */}
            <Card pad="10px">
              <SectionLabel>Location</SectionLabel>
              <Row label="Latitude"  value={sel.lat?.toFixed(5)??'—'} mono />
              <Row label="Longitude" value={sel.lon!=null?Math.abs(sel.lon).toFixed(5)+'°W':'—'} mono />
              <Row label="Depth"     value={sel.depth_m!=null?`${sel.depth_m} m`:'—'} />
              <Row label="Intensity" value={`${Math.round(sel.intensity*100)}%`} />
            </Card>

            {/* Notes */}
            <Card pad="10px">
              <SectionLabel right={<button onClick={()=>{setEditNotes(!editNotes);setDraftNotes(sel.notes);}} style={{ fontSize:10, color:'var(--blue)', background:'none', border:'none', cursor:'pointer' }}><Edit3 size={11}/></button>}>Notes</SectionLabel>
              {editNotes ? (
                <div>
                  <textarea value={draftNotes} onChange={e=>setDraftNotes(e.target.value)} style={{ width:'100%', background:'var(--surface2)', border:'1px solid var(--b2)', borderRadius:'var(--r2)', padding:'6px 8px', color:'var(--t1)', fontSize:11, resize:'vertical', minHeight:70 }} />
                  <div style={{ display:'flex', gap:6, marginTop:6 }}>
                    <Btn v="primary" sz="xs" style={{ flex:1, justifyContent:'center' }} onClick={()=>{updateTarget(sel.id,{notes:draftNotes});setEditNotes(false);}}>Save</Btn>
                    <Btn v="ghost" sz="xs" onClick={()=>setEditNotes(false)}>Cancel</Btn>
                  </div>
                </div>
              ) : <p style={{ fontSize:11, color:sel.notes?'var(--t2)':'var(--t4)', lineHeight:1.6 }}>{sel.notes||'No notes added yet.'}</p>}
            </Card>

            <div style={{ display:'flex', gap:6 }}>
              <Btn v="primary" sz="sm" style={{ flex:1, justifyContent:'center' }} icon={<MapPin size={12}/>}>Pan to</Btn>
              <Btn v="secondary" sz="sm" style={{ flex:1, justifyContent:'center' }} icon={<Crosshair size={12}/>}>Inspect</Btn>
            </div>
            <Btn v="ghost" sz="sm" full>Schedule ROV dive</Btn>
          </div>
        )}
      </div>
    </div>
  );
}
