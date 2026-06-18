import { useState } from 'react';
import { SideScanSonar } from '../components/sonar/SideScanSonar';
import { EchoSounder } from '../components/sonar/EchoSounder';
import { useSurveyStore } from '../store/surveyStore';
import { Card, SectionLabel, Badge, Row, Stat } from '../components/ui';
import type { ComparisonMode } from '../types';

const HISTORICAL = [
  { id:'h1', name:'Survey Jun 2024', date:'2024-06-12', vessel:'R/V Atlantic Explorer', targets:2, coverage:68, notes:'Pre-storm baseline survey' },
  { id:'h2', name:'Survey Dec 2024', date:'2024-12-08', vessel:'R/V Gulf Mapper',      targets:3, coverage:74, notes:'Post-hurricane re-survey' },
  { id:'h3', name:'Survey Mar 2025', date:'2025-03-21', vessel:'R/V Atlantic Explorer', targets:3, coverage:70, notes:'Spring seasonal survey' },
];

const DELTA_ITEMS = [
  { label:'TGT-001 shadow grown',  type:'change', detail:'+1.2 m shadow extension — object may have shifted', color:'var(--amber)' },
  { label:'New anomaly detected',  type:'new',    detail:'TGT-005 not present in 2024 baseline — possible new debris', color:'var(--green)' },
  { label:'Sediment accretion',    type:'change', detail:'+0.42 m seabed rise at 28.44°N — dune migration confirmed', color:'var(--amber)' },
  { label:'Scour increased',       type:'change', detail:'-1.25 m around TGT-003 monopile — structural risk elevated', color:'var(--red)' },
  { label:'TGT-003 buried deeper', type:'change', detail:'Burial depth increased 0.83 m — possible sediment infill', color:'var(--blue)' },
];

export function ComparisonPage() {
  const { sonarParams, subParams, sonarRunning } = useSurveyStore();
  const [mode, setMode] = useState<ComparisonMode>('side-by-side');
  const [selectedHist, setSelectedHist] = useState(HISTORICAL[0]);
  const [sliderPos, setSliderPos] = useState(50);
  const [activeView, setActiveView] = useState<'sidescan'|'subbottom'>('sidescan');

  return (
    <div style={{ display:'flex', height:'100%', overflow:'hidden', gap:0 }}>
      {/* Left controls */}
      <div style={{ width:230, flexShrink:0, borderRight:'1px solid var(--b2)', overflowY:'auto', padding:12, display:'flex', flexDirection:'column', gap:10 }}>
        <Card pad="12px">
          <SectionLabel>Comparison mode</SectionLabel>
          <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
            {([['side-by-side','Side by Side'],['slider','Drag Slider'],['delta','Delta / Change']] as [ComparisonMode,string][]).map(([m,label])=>(
              <button key={m} onClick={()=>setMode(m)} style={{ padding:'7px 10px', borderRadius:'var(--r2)', textAlign:'left', fontSize:12, fontWeight:500, background:mode===m?'var(--green-lo)':'var(--surface)', color:mode===m?'var(--green)':'var(--t2)', border:`1px solid ${mode===m?'var(--green-bd)':'var(--b2)'}`, cursor:'pointer' }}>{label}</button>
            ))}
          </div>
        </Card>

        <Card pad="12px">
          <SectionLabel>Sonar view</SectionLabel>
          <div style={{ display:'flex', gap:4 }}>
            <button onClick={()=>setActiveView('sidescan')} style={{ flex:1, padding:'6px', borderRadius:'var(--r2)', fontSize:11, background:activeView==='sidescan'?'var(--blue-lo)':'var(--surface)', color:activeView==='sidescan'?'var(--blue)':'var(--t2)', border:`1px solid ${activeView==='sidescan'?'var(--blue-bd)':'var(--b2)'}`, cursor:'pointer' }}>Side-scan</button>
            <button onClick={()=>setActiveView('subbottom')} style={{ flex:1, padding:'6px', borderRadius:'var(--r2)', fontSize:11, background:activeView==='subbottom'?'var(--purple-lo)':'var(--surface)', color:activeView==='subbottom'?'var(--purple)':'var(--t2)', border:`1px solid ${activeView==='subbottom'?'rgba(139,103,240,0.3)':'var(--b2)'}`, cursor:'pointer' }}>Sub-bottom</button>
          </div>
        </Card>

        <Card pad="12px">
          <SectionLabel>Historical survey</SectionLabel>
          <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
            {HISTORICAL.map(h=>(
              <button key={h.id} onClick={()=>setSelectedHist(h)} style={{ padding:'8px 10px', borderRadius:'var(--r2)', textAlign:'left', background:selectedHist.id===h.id?'var(--blue-lo)':'var(--surface)', border:`1px solid ${selectedHist.id===h.id?'var(--blue-bd)':'var(--b2)'}`, cursor:'pointer' }}>
                <div style={{ fontSize:11, fontWeight:600, color:'var(--t1)' }}>{h.name}</div>
                <div style={{ fontSize:10, color:'var(--t3)', marginTop:2 }}>{h.date} · {h.vessel.split(' ').pop()}</div>
              </button>
            ))}
          </div>
        </Card>

        {mode==='slider' && (
          <Card pad="12px">
            <SectionLabel>Slider position</SectionLabel>
            <input type="range" min={5} max={95} value={sliderPos} onChange={e=>setSliderPos(Number(e.target.value))} style={{ width:'100%', accentColor:'var(--green)' }} />
            <div style={{ fontSize:10, color:'var(--t3)', textAlign:'center', marginTop:4 }}>Historical {sliderPos}% | Current {100-sliderPos}%</div>
          </Card>
        )}

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
          <Stat label="Hist. date"  value={selectedHist.date.slice(0,7)} />
          <Stat label="Coverage Δ" value={`+${(useSurveyStore.getState().telemetry.coverage - selectedHist.coverage)}%`} accent="var(--green)" />
          <Stat label="Hist. TGTs" value={selectedHist.targets} />
          <Stat label="New TGTs"   value={useSurveyStore.getState().targets.length - selectedHist.targets} accent="var(--amber)" />
        </div>
      </div>

      {/* Main sonar comparison area */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0 }}>
        {mode==='side-by-side' && (
          <div style={{ flex:1, display:'grid', gridTemplateColumns:'1fr 1fr', overflow:'hidden' }}>
            <div style={{ borderRight:'2px solid var(--amber)', display:'flex', flexDirection:'column', overflow:'hidden' }}>
              <div style={{ padding:'6px 12px', background:'var(--bg2)', borderBottom:'1px solid var(--b1)', display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:'var(--t3)' }} />
                <span style={{ fontSize:11, fontWeight:600, color:'var(--t2)' }}>HISTORICAL — {selectedHist.name}</span>
                <Badge v="neutral">{selectedHist.date}</Badge>
              </div>
              <div style={{ flex:1, overflow:'hidden' }}>
                {activeView==='sidescan'
                  ? <SideScanSonar width={600} height={500} rangeM={sonarParams.range_m} freqKhz={sonarParams.frequency_khz} gainDb={sonarParams.gain_db} running={sonarRunning} historical showTargets={false} />
                  : <EchoSounder   width={600} height={500} maxDepthM={subParams.max_depth_m} freqKhz={subParams.frequency_khz} gainDb={subParams.gain_db} running={sonarRunning} historical />}
              </div>
            </div>
            <div style={{ display:'flex', flexDirection:'column', overflow:'hidden' }}>
              <div style={{ padding:'6px 12px', background:'var(--bg2)', borderBottom:'1px solid var(--b1)', display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:'var(--green)', boxShadow:'0 0 0 3px rgba(0,200,150,0.2)' }} />
                <span style={{ fontSize:11, fontWeight:600, color:'var(--t1)' }}>CURRENT — Survey Jun 2026</span>
                <Badge v="success" dot>LIVE</Badge>
              </div>
              <div style={{ flex:1, overflow:'hidden' }}>
                {activeView==='sidescan'
                  ? <SideScanSonar width={600} height={500} rangeM={sonarParams.range_m} freqKhz={sonarParams.frequency_khz} gainDb={sonarParams.gain_db} running={sonarRunning} showTargets />
                  : <EchoSounder   width={600} height={500} maxDepthM={subParams.max_depth_m} freqKhz={subParams.frequency_khz} gainDb={subParams.gain_db} running={sonarRunning} />}
              </div>
            </div>
          </div>
        )}

        {mode==='slider' && (
          <div style={{ flex:1, position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', inset:0 }}>
              {activeView==='sidescan'
                ? <SideScanSonar width={1200} height={600} rangeM={sonarParams.range_m} freqKhz={sonarParams.frequency_khz} gainDb={sonarParams.gain_db} running={sonarRunning} historical showTargets={false} />
                : <EchoSounder   width={1200} height={600} maxDepthM={subParams.max_depth_m} freqKhz={subParams.frequency_khz} gainDb={subParams.gain_db} running={sonarRunning} historical />}
            </div>
            <div style={{ position:'absolute', inset:0, overflow:'hidden', width:`${sliderPos}%` }}>
              {activeView==='sidescan'
                ? <SideScanSonar width={1200} height={600} rangeM={sonarParams.range_m} freqKhz={sonarParams.frequency_khz} gainDb={sonarParams.gain_db} running={sonarRunning} showTargets />
                : <EchoSounder   width={1200} height={600} maxDepthM={subParams.max_depth_m} freqKhz={subParams.frequency_khz} gainDb={subParams.gain_db} running={sonarRunning} />}
            </div>
            <div style={{ position:'absolute', top:0, bottom:0, left:`${sliderPos}%`, width:3, background:'var(--amber)', transform:'translateX(-50%)', zIndex:10, cursor:'ew-resize' }}>
              <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:24, height:24, borderRadius:'50%', background:'var(--amber)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, color:'#000', fontWeight:700 }}>↔</div>
            </div>
            <div style={{ position:'absolute', top:8, left:12, background:'rgba(0,0,0,0.7)', color:'var(--t3)', fontSize:10, padding:'3px 8px', borderRadius:4 }}>{selectedHist.date}</div>
            <div style={{ position:'absolute', top:8, right:12, background:'rgba(0,0,0,0.7)', color:'var(--green)', fontSize:10, padding:'3px 8px', borderRadius:4 }}>Jun 2026 — LIVE</div>
          </div>
        )}

        {mode==='delta' && (
          <div style={{ flex:1, display:'flex', flexDirection:'column', gap:0, overflow:'hidden' }}>
            <div style={{ padding:'8px 16px', background:'var(--bg2)', borderBottom:'1px solid var(--b2)', fontSize:11, color:'var(--t2)', flexShrink:0 }}>
              Delta analysis: <span style={{ color:'var(--amber)', fontWeight:600 }}>{selectedHist.name}</span> vs <span style={{ color:'var(--green)', fontWeight:600 }}>Current Jun 2026</span>
            </div>
            <div style={{ flex:1, padding:16, overflowY:'auto', display:'flex', flexDirection:'column', gap:10 }}>
              {DELTA_ITEMS.map((item,i)=>(
                <div key={i} style={{ background:'var(--panel)', border:`1px solid ${item.color}30`, borderLeft:`3px solid ${item.color}`, borderRadius:'var(--r3)', padding:'10px 14px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                    <span style={{ fontSize:12, fontWeight:600, color:item.color }}>{item.type==='new'?'+ NEW':'Δ CHANGE'}</span>
                    <span style={{ fontSize:12, fontWeight:600, color:'var(--t1)' }}>{item.label}</span>
                  </div>
                  <div style={{ fontSize:11, color:'var(--t2)' }}>{item.detail}</div>
                </div>
              ))}
              <div style={{ background:'var(--surface)', border:'1px solid var(--b2)', borderRadius:'var(--r3)', padding:'14px' }}>
                <div style={{ fontSize:12, fontWeight:600, color:'var(--t1)', marginBottom:8 }}>Seabed change summary</div>
                {[['Max accretion','+0.42 m','var(--green)'],['Max scour','-1.25 m','var(--red)'],['Mean change','+0.08 m','var(--amber)'],['Changed area','14.2 km²','var(--blue)']].map(([l,v,c])=>(
                  <Row key={l} label={l} value={v} accent={c as string} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Status bar */}
        <div style={{ padding:'4px 14px', background:'var(--bg2)', borderTop:'1px solid var(--b1)', fontSize:9, color:'var(--t3)', fontFamily:'var(--font-mono)', display:'flex', justifyContent:'space-between', flexShrink:0 }}>
          <span>Comparison: {selectedHist.name} → Jun 2026</span>
          <span>Mode: {mode.toUpperCase()} · View: {activeView.toUpperCase()}</span>
        </div>
      </div>
    </div>
  );
}
