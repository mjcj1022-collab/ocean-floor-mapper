
import { useSurveyStore } from '../store/surveyStore';
import { Card, SectionLabel, Btn, Stat, Badge, LiveDot, Slider, Toggle } from '../components/ui';
import { SideScanSonar } from '../components/sonar/SideScanSonar';
import { EchoSounder } from '../components/sonar/EchoSounder';
import { Play, Square, Crosshair, Ruler, Move, RotateCcw } from 'lucide-react';
import type { MeasureMode } from '../types';

const LOG=[
  {t:'12:04:02',l:'ok',m:'GPS lock acquired — 14 satellites, HDOP 0.9'},
  {t:'12:04:05',l:'ok',m:'Side-scan initialised at 100 kHz — range 200 m'},
  {t:'12:04:07',l:'ok',m:'Sub-bottom profiler initialised at 3.5 kHz'},
  {t:'12:04:10',l:'info',m:'Survey pass 1 started, heading 090° true'},
  {t:'12:06:42',l:'warn',m:'Hypack sync delayed 3.2s — retrying'},
  {t:'12:07:01',l:'ok',m:'Hypack reconnected — all channels nominal'},
  {t:'12:09:18',l:'info',m:'Pass 2 started, heading 092° true'},
  {t:'12:11:55',l:'ok',m:'TGT-001 flagged — high confidence 94%'},
  {t:'12:12:30',l:'info',m:'AI classification: Possible Shipwreck'},
  {t:'12:14:30',l:'info',m:'ArcGIS raster export queued'},
  {t:'12:16:44',l:'ok',m:'Mosaic slice 3/8 committed to disk'},
];
const LC:Record<string,string>={info:'var(--blue)',warn:'var(--amber)',error:'var(--red)',ok:'var(--green)'};

export function SurveyPage() {
  const { sonarParams, setSonarParam, subParams, setSubParam, sonarRunning, setSonarRunning,
    telemetry, measureMode, setMeasureMode, measurements, clearMeasurements } = useSurveyStore();

  return (
    <div style={{ display:'flex', gap:0, height:'100%', overflow:'hidden' }}>
      {/* Controls */}
      <div style={{ width:230, flexShrink:0, borderRight:'1px solid var(--b2)', overflowY:'auto', padding:12, display:'flex', flexDirection:'column', gap:10 }}>

        <Card pad="12px">
          <SectionLabel>Sonar control</SectionLabel>
          <div style={{ display:'flex', gap:6, marginBottom:10 }}>
            <Btn v={sonarRunning?'danger':'primary'} sz="sm" full icon={sonarRunning?<Square size={12}/>:<Play size={12}/>} onClick={()=>setSonarRunning(!sonarRunning)} style={{ flex:1 }}>
              {sonarRunning?'Pause':'Resume'}
            </Btn>
            <Btn v="ghost" sz="sm" icon={<RotateCcw size={12}/>} onClick={()=>{}}>Reset</Btn>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8, padding:'6px 8px', background:'var(--surface)', borderRadius:'var(--r2)' }}>
            <LiveDot active={sonarRunning} />
            <span style={{ fontSize:11, color:'var(--t2)' }}>{sonarRunning?'Recording active':'Sonar paused'}</span>
          </div>
        </Card>

        <Card pad="12px">
          <SectionLabel right={<Badge v="info">{sonarParams.frequency_khz} kHz</Badge>}>Side-scan</SectionLabel>
          <Slider label="Frequency" value={sonarParams.frequency_khz} min={50} max={400} step={50} unit="kHz" onChange={v=>setSonarParam('frequency_khz',v)} />
          <Slider label="Gain"      value={sonarParams.gain_db}       min={20} max={80} step={1}  unit="dB"  onChange={v=>setSonarParam('gain_db',v)} />
          <Slider label="Range"     value={sonarParams.range_m}       min={50} max={500} step={50} unit="m"  onChange={v=>setSonarParam('range_m',v)} color="var(--green)" />
          <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
            <Toggle on={sonarParams.tvg_enabled}    onChange={()=>setSonarParam('tvg_enabled',!sonarParams.tvg_enabled)}    label="TVG correction" />
            <Toggle on={sonarParams.filter_noise}   onChange={()=>setSonarParam('filter_noise',!sonarParams.filter_noise)}   label="Noise filter" />
          </div>
        </Card>

        <Card pad="12px">
          <SectionLabel right={<Badge v="purple">{subParams.frequency_khz} kHz</Badge>}>Sub-bottom</SectionLabel>
          <Slider label="Frequency" value={subParams.frequency_khz} min={1} max={24} step={0.5} unit="kHz" onChange={v=>setSubParam('frequency_khz',v)} color="var(--purple)" />
          <Slider label="Gain"      value={subParams.gain_db}       min={20} max={80} step={1}  unit="dB"  onChange={v=>setSubParam('gain_db',v)}       color="var(--purple)" />
          <Slider label="Max depth" value={subParams.max_depth_m}   min={500} max={5000} step={500} unit="m" onChange={v=>setSubParam('max_depth_m',v)} color="var(--purple)" />
        </Card>

        {/* Measurement tools */}
        <Card pad="12px">
          <SectionLabel>Measurement tools</SectionLabel>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:5, marginBottom:8 }}>
            {([['none','Select',<Move size={12}/>],['length','Length',<Ruler size={12}/>],['width','Width',<Ruler size={12}/>],['height','Height ↑',<Crosshair size={12}/>]] as [MeasureMode,string,React.ReactNode][]).map(([mode,label,icon])=>(
              <Btn key={mode} v={measureMode===mode?'amber':'ghost'} sz="sm" icon={icon} onClick={()=>setMeasureMode(mode)} style={{ justifyContent:'center' }}>{label}</Btn>
            ))}
          </div>
          <div style={{ fontSize:10, color:'var(--t3)', marginBottom:6 }}>{measurements.length} measurement{measurements.length!==1?'s':''} saved</div>
          {measurements.slice(-3).map(m=>(
            <div key={m.id} style={{ display:'flex', justifyContent:'space-between', fontSize:11, padding:'3px 0', borderBottom:'1px solid var(--b1)' }}>
              <span style={{ color:'var(--t2)' }}>{m.mode}</span>
              <span style={{ color:'var(--amber)', fontFamily:'var(--font-mono)' }}>{m.result} {m.unit}</span>
            </div>
          ))}
          {measurements.length>0&&<Btn v="ghost" sz="xs" onClick={clearMeasurements} style={{ marginTop:6, width:'100%', justifyContent:'center' }}>Clear all</Btn>}
        </Card>

        {/* Click-to-create tip */}
        <Card pad="10px" glow="var(--green)">
          <div style={{ fontSize:10, color:'var(--green)', fontWeight:700, marginBottom:4 }}>💡 Click on sonar to mark target</div>
          <div style={{ fontSize:10, color:'var(--t2)' }}>AI classifies automatically. Use measurement tools to extract dimensions.</div>
        </Card>

        {/* Live metrics */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
          <Stat label="Speed"   value={telemetry.speed_kts} unit="kts" />
          <Stat label="Depth"   value={telemetry.depth_m}   unit="m" accent="var(--blue)" />
          <Stat label="Pings"   value={telemetry.pings.toLocaleString()} />
          <Stat label="Cover"   value={`${telemetry.coverage}%`} accent="var(--green)" />
        </div>
      </div>

      {/* Sonar displays */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0 }}>
        {/* Side-scan */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', borderBottom:'1px solid var(--b2)', minHeight:0 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'6px 14px', background:'var(--bg2)', borderBottom:'1px solid var(--b1)', flexShrink:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <LiveDot active={sonarRunning} />
              <span style={{ fontSize:12, fontWeight:600, color:'var(--t1)' }}>Side-Scan Sonar</span>
              <Badge v="info">{sonarParams.frequency_khz} kHz</Badge>
              <Badge v="neutral">Swath ±{sonarParams.range_m} m</Badge>
              <Badge v="neutral">Gain {sonarParams.gain_db} dB</Badge>
            </div>
            <div style={{ fontSize:10, color:'var(--t3)', fontFamily:'var(--font-mono)' }}>
              Waterfall — newest ping at top · click to mark target · {measureMode!=='none'?`📏 ${measureMode} mode`:'select mode'}
            </div>
          </div>
          <div style={{ flex:1, position:'relative', minHeight:0, overflow:'hidden' }}>
            <SideScanSonar width={1200} height={260} rangeM={sonarParams.range_m} freqKhz={sonarParams.frequency_khz} gainDb={sonarParams.gain_db} running={sonarRunning} showTargets />
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', padding:'3px 12px', background:'var(--bg2)', borderTop:'1px solid var(--b1)', fontSize:9, color:'var(--t3)', fontFamily:'var(--font-mono)', flexShrink:0 }}>
            <span>Port ◀ Nadir ▶ Starboard</span>
            <span>TVG: {sonarParams.tvg_enabled?'ON':'OFF'} · Filter: {sonarParams.filter_noise?'ON':'OFF'} · Pulse: {sonarParams.pulse_length_us} µs</span>
          </div>
        </div>

        {/* Sub-bottom */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', minHeight:0 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'6px 14px', background:'var(--bg2)', borderBottom:'1px solid var(--b1)', flexShrink:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <LiveDot active={sonarRunning} color="var(--purple)" />
              <span style={{ fontSize:12, fontWeight:600, color:'var(--t1)' }}>Sub-Bottom Profiler</span>
              <Badge v="purple">{subParams.frequency_khz} kHz</Badge>
              <Badge v="neutral">Max {subParams.max_depth_m} m</Badge>
            </div>
            <div style={{ fontSize:10, color:'var(--t3)', fontFamily:'var(--font-mono)' }}>Profile scroll — newest ping at right · Seabed + stratigraphy layers</div>
          </div>
          <div style={{ flex:1, minHeight:0, overflow:'hidden' }}>
            <EchoSounder width={1200} height={260} maxDepthM={subParams.max_depth_m} freqKhz={subParams.frequency_khz} gainDb={subParams.gain_db} running={sonarRunning} />
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', padding:'3px 12px', background:'var(--bg2)', borderTop:'1px solid var(--b1)', fontSize:9, color:'var(--t3)', fontFamily:'var(--font-mono)', flexShrink:0 }}>
            <span>Surface ▲ · Seabed · Sub-bottom ▼</span>
            <span>Pen. est. {Math.round(subParams.max_depth_m * 0.06)} m · TWT attenuation active</span>
          </div>
        </div>
      </div>

      {/* Event log */}
      <div style={{ width:240, flexShrink:0, borderLeft:'1px solid var(--b2)', display:'flex', flexDirection:'column' }}>
        <div style={{ padding:'8px 12px', borderBottom:'1px solid var(--b2)', fontSize:10, fontWeight:700, color:'var(--t3)', textTransform:'uppercase', letterSpacing:'0.1em' }}>Event Log</div>
        <div style={{ flex:1, overflowY:'auto', padding:'6px 10px', display:'flex', flexDirection:'column', gap:3 }}>
          {LOG.map((e,i)=>(
            <div key={i} style={{ display:'flex', gap:6, fontSize:10, fontFamily:'var(--font-mono)', padding:'3px 0', borderBottom:'1px solid var(--b1)' }}>
              <span style={{ color:'var(--t3)', flexShrink:0 }}>{e.t}</span>
              <span style={{ color:LC[e.l], flexShrink:0, minWidth:28, fontWeight:700 }}>{e.l.toUpperCase()}</span>
              <span style={{ color:'var(--t2)', flex:1, lineHeight:1.3 }}>{e.m}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
