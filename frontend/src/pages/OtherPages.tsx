import { useState } from 'react';
import { useSurveyStore } from '../store/surveyStore';
import { Card, SectionLabel, Btn, Badge, Row, Stat, Toggle, Slider, Progress, Input, LiveDot } from '../components/ui';
import { PIPELINE_STEPS } from '../types';
import type { PipelineStep } from '../types';
import { CheckCircle2, Circle, AlertCircle, Download, FileText, Map, Globe, Cpu, Navigation, Compass, Activity } from 'lucide-react';

// ─── Pipeline ─────────────────────────────────────────────────────────────

export function PipelinePage() {
  const { pipelineStep, pipelineRunning, setPipelineStep, setPipelineRunning, targets, telemetry } = useSurveyStore();

  function getState(key: PipelineStep): 'done'|'active'|'pending'|'error' {
    const order = PIPELINE_STEPS.map(s=>s.key);
    const ci = order.indexOf(pipelineStep as any);
    const si = order.indexOf(key);
    if(pipelineStep==='complete') return 'done';
    if(si<ci) return 'done';
    if(si===ci) return 'active';
    return 'pending';
  }

  async function run() {
    if(pipelineRunning)return;
    setPipelineRunning(true);
    for(const step of PIPELINE_STEPS){
      setPipelineStep(step.key);
      await new Promise(r=>setTimeout(r,700+Math.random()*500));
    }
    setPipelineStep('complete' as PipelineStep);
    setPipelineRunning(false);
  }

  return (
    <div style={{ padding:20, display:'flex', gap:16, height:'100%', overflow:'auto', alignItems:'flex-start' }}>
      <div style={{ flex:1, display:'flex', flexDirection:'column', gap:12 }}>
        <Card>
          <SectionLabel>Pipeline steps</SectionLabel>
          <div style={{ display:'flex', flexDirection:'column', gap:4, marginBottom:14 }}>
            {PIPELINE_STEPS.map(step=>{
              const state=getState(step.key);
              const Icon=state==='done'?CheckCircle2:state==='active'?Activity:state==='error'?AlertCircle:Circle;
              const col={done:'var(--green)',active:'var(--blue)',pending:'var(--t3)',error:'var(--red)'}[state];
              return (
                <div key={step.key} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', background:state==='active'?'var(--blue-lo)':'var(--surface)', borderRadius:'var(--r2)', border:`1px solid ${state==='active'?'var(--blue-bd)':'var(--b1)'}` }}>
                  <Icon size={15} color={col} style={{ flexShrink:0, animation:state==='active'?'spin 1.5s linear infinite':undefined }} />
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:12, fontWeight:500, color:state==='active'?'var(--t1)':'var(--t2)' }}>{step.label}</div>
                    <div style={{ fontSize:10, color:'var(--t3)' }}>{step.desc}</div>
                  </div>
                  <Badge v={state==='done'?'success':state==='active'?'info':state==='error'?'high':'neutral'}>{state}</Badge>
                </div>
              );
            })}
          </div>
          <Btn v="primary" full onClick={run} disabled={pipelineRunning} style={{ justifyContent:'center' }}>
            {pipelineRunning?'⟳ Running pipeline…':'▶ Run full pipeline'}
          </Btn>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </Card>
      </div>
      <div style={{ width:260, display:'flex', flexDirection:'column', gap:12 }}>
        <Card><SectionLabel>Results</SectionLabel>
          <Row label="Targets detected" value={targets.length} />
          <Row label="Coverage" value={`${telemetry.coverage}%`} />
          <Row label="Session ID" value="SES-2026-001" mono />
          <Row label="Status" value={pipelineRunning?'Running':'Ready'} accent={pipelineRunning?'var(--amber)':undefined} />
        </Card>
      </div>
    </div>
  );
}

// ─── Layers ───────────────────────────────────────────────────────────────

export function LayersPage() {
  const { layers, toggleLayer, setLayerOpacity } = useSurveyStore();
  return (
    <div style={{ padding:20, display:'flex', flexDirection:'column', gap:12, height:'100%', overflowY:'auto' }}>
      <Card>
        <SectionLabel>Map layers</SectionLabel>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {layers.map(layer=>(
            <div key={layer.name} style={{ background:'var(--surface2)', borderRadius:'var(--r2)', padding:'10px 12px', border:'1px solid var(--b1)' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:layer.visible?8:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ width:11, height:11, borderRadius:3, background:layer.color, flexShrink:0 }} />
                  <span style={{ fontSize:12, fontWeight:500, color:'var(--t1)' }}>{layer.label}</span>
                </div>
                <Toggle on={layer.visible} onChange={()=>toggleLayer(layer.name as any)} />
              </div>
              {layer.visible && <Slider label="Opacity" value={Math.round(layer.opacity*100)} min={0} max={100} step={1} unit="%" onChange={v=>setLayerOpacity(layer.name as any,v/100)} color={layer.color} />}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────

export function ExportPage() {
  const [exporting, setExporting] = useState<string|null>(null);
  async function doExport(f:string){setExporting(f);await new Promise(r=>setTimeout(r,1600));setExporting(null);}
  const exports=[
    {format:'GeoTIFF',     icon:<Map size={18}/>,      desc:'Georeferenced mosaic raster for GIS software',       ext:'.tif',     cat:'Raster'},
    {format:'GeoJSON',     icon:<Globe size={18}/>,     desc:'Contour lines and target locations (WGS 84)',         ext:'.geojson', cat:'Vector'},
    {format:'KML',         icon:<Globe size={18}/>,     desc:'Survey track and targets for Google Earth',           ext:'.kml',     cat:'Vector'},
    {format:'Shapefile',   icon:<Map size={18}/>,       desc:'ESRI Shapefile for ArcGIS / QGIS',                   ext:'.shp',     cat:'Vector'},
    {format:'LAS/LAZ',     icon:<FileText size={18}/>,  desc:'3D point cloud for LiDAR workflows',                  ext:'.laz',     cat:'LiDAR'},
    {format:'CSV Targets', icon:<FileText size={18}/>,  desc:'Target table with coordinates, dims and confidence',  ext:'.csv',     cat:'Data'},
    {format:'SEG-Y',       icon:<FileText size={18}/>,  desc:'Sub-bottom profiler data for seismic interpretation', ext:'.sgy',     cat:'Sonar'},
    {format:'PDF Report',  icon:<FileText size={18}/>,  desc:'Full survey report with maps and target summary',     ext:'.pdf',     cat:'Report'},
  ];
  return (
    <div style={{ padding:20, display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:12, height:'100%', overflowY:'auto', alignContent:'start' }}>
      {exports.map(ex=>(
        <Card key={ex.format} pad="14px">
          <div style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
            <div style={{ color:'var(--green)', marginTop:2 }}>{ex.icon}</div>
            <div style={{ flex:1 }}>
              <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
                <span style={{ fontSize:13, fontWeight:600, color:'var(--t1)' }}>{ex.format}</span>
                <Badge v="neutral">{ex.cat}</Badge>
              </div>
              <div style={{ fontSize:11, color:'var(--t3)', marginBottom:12, lineHeight:1.5 }}>{ex.desc}</div>
              <Btn v="secondary" sz="sm" icon={<Download size={12}/>} full onClick={()=>doExport(ex.format)} disabled={exporting===ex.format}>
                {exporting===ex.format?'Exporting…':`Export ${ex.ext}`}
              </Btn>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ─── LiDAR ────────────────────────────────────────────────────────────────

export function LidarPage() {
  const { lidarLayers, toggleLidar } = useSurveyStore();
  const [uploading, setUploading] = useState(false);
  async function handleUpload(){setUploading(true);await new Promise(r=>setTimeout(r,2000));setUploading(false);}
  return (
    <div style={{ padding:20, display:'flex', gap:16, height:'100%', overflow:'auto', alignItems:'flex-start' }}>
      <div style={{ flex:1, display:'flex', flexDirection:'column', gap:12 }}>
        <Card>
          <SectionLabel>LiDAR fusion layers</SectionLabel>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {lidarLayers.map(l=>(
              <div key={l.id} style={{ background:'var(--surface2)', border:'1px solid var(--b1)', borderRadius:'var(--r2)', padding:'12px 14px' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <div style={{ width:10, height:10, borderRadius:2, background:l.color }} />
                    <span style={{ fontSize:12, fontWeight:600, color:'var(--t1)' }}>{l.name}</span>
                    <Badge v={l.type==='above'?'info':l.type==='below'?'purple':'success'}>{l.type.toUpperCase()}</Badge>
                  </div>
                  <Toggle on={l.visible} onChange={()=>toggleLidar(l.id)} />
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
                  <Row label="Points" value={`${(l.points/1e6).toFixed(1)}M`} />
                  <Row label="Source" value={l.source} />
                  <Row label="Date" value={l.date} />
                </div>
                {l.visible&&<Progress value={75} color={l.color} h={3} />}
              </div>
            ))}
          </div>
        </Card>
        <Card pad="12px">
          <SectionLabel>Import LiDAR dataset</SectionLabel>
          <div style={{ border:'1.5px dashed var(--b2)', borderRadius:'var(--r2)', padding:'20px', textAlign:'center', cursor:'pointer', background:'var(--surface)' }} onClick={handleUpload}>
            <div style={{ fontSize:13, color:'var(--t2)', marginBottom:6 }}>Drop LAS / LAZ / E57 / COPC files</div>
            <div style={{ fontSize:11, color:'var(--t3)', marginBottom:12 }}>Above-water drone LiDAR + Below-water MBES point clouds</div>
            <Btn v="ghost" sz="sm" disabled={uploading}>{uploading?'Processing…':'Browse files'}</Btn>
          </div>
        </Card>
      </div>
      <div style={{ width:260, display:'flex', flexDirection:'column', gap:12 }}>
        <Card><SectionLabel>Fusion capabilities</SectionLabel>
          {[['Above-water LiDAR','Drone, terrestrial, mobile'],['Below-water MBES','Multibeam echo sounder'],['Side-scan sonar','Acoustic backscatter'],['Photogrammetry','Drone imagery SfM'],['Combined surface','Unified digital twin']].map(([k,v])=><Row key={k} label={k} value={v} />)}
        </Card>
        <Card><SectionLabel>Supported formats</SectionLabel>
          {[['LAS/LAZ','Lidar Exchange Format'],['E57','ISO 14778-7 point cloud'],['COPC','Cloud Optimized PC'],['XYZ','ASCII point list'],['PLY','Polygon file format']].map(([k,v])=><Row key={k} label={k} value={v} />)}
        </Card>
      </div>
    </div>
  );
}

// ─── ROV ──────────────────────────────────────────────────────────────────

export function ROVPage() {
  const { rovs, setROVs } = useSurveyStore();
  const [selectedROV, setSelectedROV] = useState(rovs[0]);
  const [missionRunning, setMissionRunning] = useState(false);

  async function deployROV(){
    setMissionRunning(true);
    setROVs(rovs.map(r=>r.id===selectedROV.id?{...r,status:'DIVING'}:r));
    await new Promise(res=>setTimeout(res,3000));
    setROVs(rovs.map(r=>r.id===selectedROV.id?{...r,status:'SURVEYING',depth_m:450}:r));
    setSelectedROV(prev=>({...prev,status:'SURVEYING',depth_m:450}));
  }

  const statusColor:Record<string,string>={IDLE:'var(--t3)',DIVING:'var(--amber)',SURVEYING:'var(--green)',SURFACING:'var(--blue)',OFFLINE:'var(--red)'};
  const battColor=(b:number)=>b>50?'var(--green)':b>25?'var(--amber)':'var(--red)';

  return (
    <div style={{ padding:20, display:'flex', gap:16, height:'100%', overflow:'auto', alignItems:'flex-start' }}>
      <div style={{ flex:1, display:'flex', flexDirection:'column', gap:12 }}>
        {rovs.map(rov=>(
          <Card key={rov.id} glow={selectedROV.id===rov.id?'var(--green)':undefined}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12, cursor:'pointer' }} onClick={()=>setSelectedROV(rov)}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <Cpu size={18} color={statusColor[rov.status]} />
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color:'var(--t1)' }}>{rov.name}</div>
                  <div style={{ fontSize:10, color:'var(--t3)' }}>{rov.type} · ID: {rov.id}</div>
                </div>
              </div>
              <Badge v={rov.status==='SURVEYING'?'success':rov.status==='DIVING'?'warning':rov.status==='OFFLINE'?'high':'neutral'} dot>{rov.status}</Badge>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:10 }}>
              <Stat label="Depth"   value={rov.depth_m} unit="m" accent="var(--blue)" />
              <Stat label="Heading" value={`${rov.heading}°`} />
              <Stat label="Speed"   value={rov.speed_kts} unit="kts" />
              <Stat label="Battery" value={`${rov.battery}%`} accent={battColor(rov.battery)} />
            </div>
            <Progress value={rov.battery} color={battColor(rov.battery)} label="Battery" />
            {rov.tether_m!==undefined && <div style={{ marginTop:8 }}><Progress value={Math.min(100,rov.tether_m/5)} color="var(--blue)" label={`Tether: ${rov.tether_m} m`} /></div>}
            {selectedROV.id===rov.id && (
              <div style={{ display:'flex', gap:8, marginTop:12 }}>
                <Btn v={missionRunning?'danger':'primary'} sz="sm" style={{ flex:1, justifyContent:'center' }} icon={<Navigation size={12}/>} onClick={deployROV} disabled={rov.status==='OFFLINE'||missionRunning}>
                  {missionRunning?'Mission active':'Deploy ROV'}
                </Btn>
                <Btn v="secondary" sz="sm" icon={<Compass size={12}/>}>Waypoints</Btn>
                <Btn v="ghost" sz="sm" icon={<Activity size={12}/>}>Telemetry</Btn>
              </div>
            )}
          </Card>
        ))}
        <Card pad="12px">
          <SectionLabel>Autonomous mission planner</SectionLabel>
          <div style={{ fontSize:11, color:'var(--t2)', marginBottom:12, lineHeight:1.6 }}>Generate optimised lawnmower survey patterns around high-confidence targets for AUV/ROV execution.</div>
          {[['TGT-001','High — Possible Wreck','var(--red)'],['TGT-004','High — Metallic Return','var(--red)']].map(([id,desc,col])=>(
            <div key={id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid var(--b1)' }}>
              <div><div style={{ fontSize:11, fontWeight:600, color:col as string }}>{id}</div><div style={{ fontSize:10, color:'var(--t3)' }}>{desc}</div></div>
              <Btn v="amber" sz="xs">Plan resurvey</Btn>
            </div>
          ))}
        </Card>
      </div>
      <div style={{ width:260, display:'flex', flexDirection:'column', gap:12 }}>
        <Card><SectionLabel>Fleet status</SectionLabel>
          {rovs.map(r=>(
            <div key={r.id} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid var(--b1)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <LiveDot active={r.status!=='OFFLINE'} color={statusColor[r.status]} pulse={r.status==='SURVEYING'} />
                <span style={{ fontSize:11, color:'var(--t2)' }}>{r.name}</span>
              </div>
              <span style={{ fontSize:11, color:statusColor[r.status], fontWeight:600 }}>{r.status}</span>
            </div>
          ))}
        </Card>
        <Card><SectionLabel>Supported protocols</SectionLabel>
          {[['NMEA 0183','Navigation sentences'],['ROS/ROS2','Robot OS integration'],['JAUS','Joint Architecture UAS'],['DVL','Doppler Velocity Log'],['USBL','Underwater positioning']].map(([k,v])=><Row key={k} label={k} value={v} />)}
        </Card>
      </div>
    </div>
  );
}

// ─── Assets ───────────────────────────────────────────────────────────────

export function AssetsPage() {
  const ASSETS = [
    { id:'A-001', name:'Pipeline Seg. B-12',  type:'PIPELINE', risk:'HIGH',     last_insp:'2025-12-01', status:'DEGRADED',     length_km:8.4 },
    { id:'A-002', name:'Power Cable C-3',     type:'CABLE',    risk:'MEDIUM',   last_insp:'2026-01-15', status:'OPERATIONAL',  length_km:24.1 },
    { id:'A-003', name:'Wind Turbine WT-07',  type:'TURBINE',  risk:'LOW',      last_insp:'2026-03-20', status:'OPERATIONAL' },
    { id:'A-004', name:'Platform Alpha',      type:'PLATFORM', risk:'CRITICAL', last_insp:'2025-06-10', status:'CRITICAL' },
    { id:'A-005', name:'Mooring Buoy M-4',   type:'MOORING',  risk:'LOW',      last_insp:'2026-02-08', status:'OPERATIONAL' },
  ];
  const [sel, setSel] = useState(ASSETS[0]);
  const riskV:Record<string,any>={LOW:'low',MEDIUM:'medium',HIGH:'high',CRITICAL:'high'};
  return (
    <div style={{ padding:20, display:'flex', gap:16, height:'100%', overflow:'auto', alignItems:'flex-start' }}>
      <div style={{ flex:1, display:'flex', flexDirection:'column', gap:8 }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:4 }}>
          <Stat label="Total assets"  value={ASSETS.length} />
          <Stat label="Critical"      value={ASSETS.filter(a=>a.risk==='CRITICAL').length} accent="var(--red)" />
          <Stat label="Degraded"      value={ASSETS.filter(a=>a.status==='DEGRADED').length} accent="var(--amber)" />
          <Stat label="Operational"   value={ASSETS.filter(a=>a.status==='OPERATIONAL').length} accent="var(--green)" />
        </div>
        {ASSETS.map(a=>(
          <div key={a.id} onClick={()=>setSel(a)} style={{ background:sel.id===a.id?'var(--surface2)':'var(--panel)', border:`1px solid ${sel.id===a.id?'var(--green-bd)':'var(--b2)'}`, borderRadius:'var(--r3)', padding:'12px 14px', cursor:'pointer', display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ flex:1 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                <span style={{ fontSize:12, fontWeight:600, color:'var(--t1)' }}>{a.name}</span>
                <Badge v={riskV[a.risk]}>{a.risk}</Badge>
                <Badge v={a.status==='OPERATIONAL'?'success':a.status==='CRITICAL'?'high':'warning'}>{a.status}</Badge>
              </div>
              <div style={{ fontSize:11, color:'var(--t3)' }}>{a.type}{a.length_km?` · ${a.length_km} km`:''} · Last insp: {a.last_insp}</div>
            </div>
            <Btn v="ghost" sz="xs">Inspect</Btn>
          </div>
        ))}
      </div>
      <div style={{ width:260, display:'flex', flexDirection:'column', gap:12 }}>
        <Card><SectionLabel>Selected asset</SectionLabel>
          <div style={{ fontSize:13, fontWeight:700, color:'var(--t1)', marginBottom:8 }}>{sel.name}</div>
          <Row label="Type"       value={sel.type} />
          <Row label="Risk score" value={sel.risk} accent={riskV[sel.risk]==='high'?'var(--red)':riskV[sel.risk]==='medium'?'var(--amber)':'var(--green)'} />
          <Row label="Status"     value={sel.status} />
          <Row label="Last insp." value={sel.last_insp} />
          {sel.length_km && <Row label="Length" value={`${sel.length_km} km`} />}
          <div style={{ marginTop:12, display:'flex', flexDirection:'column', gap:6 }}>
            <Btn v="primary" sz="sm" full>View inspection history</Btn>
            <Btn v="secondary" sz="sm" full>Schedule inspection</Btn>
            <Btn v="ghost" sz="sm" full>Generate risk report</Btn>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─── Settings ─────────────────────────────────────────────────────────────

export function SettingsPage() {
  const { nightMode, toggleNightMode, telemetry } = useSurveyStore();
  const [vessel, setVessel] = useState('R/V Surveyor');
  const [operator, setOperator] = useState('Michael Jeffreys');
  const [threshold, setThreshold] = useState(75);
  const [joystick, setJoystick] = useState(false);

  return (
    <div style={{ padding:20, display:'flex', gap:16, height:'100%', overflowY:'auto', alignItems:'flex-start' }}>
      <div style={{ flex:1, display:'flex', flexDirection:'column', gap:12 }}>
        <Card><SectionLabel>Survey configuration</SectionLabel>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <Input label="Vessel name" value={vessel} onChange={e=>setVessel(e.target.value)} />
            <Input label="Operator" value={operator} onChange={e=>setOperator(e.target.value)} />
            <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
              <label style={{ fontSize:10, color:'var(--t3)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em' }}>Coordinate reference system</label>
              <select style={{ background:'var(--surface2)', border:'1px solid var(--b2)', borderRadius:'var(--r2)', padding:'6px 10px', color:'var(--t1)' }}>
                <option>WGS 84 (EPSG:4326)</option>
                <option>NAD83 (EPSG:4269)</option>
                <option>UTM Zone 15N (EPSG:32615)</option>
              </select>
            </div>
          </div>
        </Card>
        <Card><SectionLabel>Detection thresholds</SectionLabel>
          <Slider label="Anomaly intensity threshold" value={threshold} min={50} max={99} unit="%" onChange={setThreshold} />
          <Row label="Min blob size" value="4 px" />
          <Row label="Max targets / survey" value="50" />
          <Row label="Shadow ratio min" value="1.2" />
          <Row label="CUBE algorithm" value="Enabled" accent="var(--green)" />
        </Card>
        <Card><SectionLabel>Display & hardware</SectionLabel>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <Toggle on={nightMode} onChange={toggleNightMode} label="Night / bridge mode (red overlay)" />
            <Toggle on={joystick} onChange={()=>setJoystick(!joystick)} label="Joystick / HOTAS support (Gamepad API)" />
            <Toggle on label="Motion compensation (heave/pitch/roll)" onChange={()=>{}} />
            <Toggle on label="TVG auto-correction" onChange={()=>{}} />
          </div>
        </Card>
      </div>
      <div style={{ width:260, display:'flex', flexDirection:'column', gap:12 }}>
        <Card><SectionLabel>Software connections</SectionLabel>
          {[['ArcGIS Pro','connected'],['QGIS 3.28','connected'],['SonarWiz','connected'],['Hypack','warning'],['Google Earth','connected'],['ROS Bridge','disconnected']].map(([n,s])=>(
            <div key={n} style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', borderBottom:'1px solid var(--b1)' }}>
              <span style={{ fontSize:11, color:'var(--t2)' }}>{n}</span>
              <Badge v={s==='connected'?'success':s==='warning'?'warning':'neutral'}>{s}</Badge>
            </div>
          ))}
        </Card>
        <Card><SectionLabel>Live telemetry</SectionLabel>
          <Row label="Heave" value={`${telemetry.heave_m} m`} accent={Math.abs(telemetry.heave_m)>0.5?'var(--amber)':undefined} />
          <Row label="Pitch" value={`${telemetry.pitch_deg}°`} />
          <Row label="Roll"  value={`${telemetry.roll_deg}°`} />
          <Row label="SVP"   value={`${telemetry.svp_ms} m/s`} />
          <Row label="Tide"  value={`${telemetry.tide_m} m`} />
          <Row label="Wind"  value={`${telemetry.wind_kts} kts`} />
        </Card>
        <Card><SectionLabel>About</SectionLabel>
          <Row label="OFMapper" value="v2.0.0" accent="var(--green)" />
          <Row label="Engine"   value="React 18 + Vite" />
          <Row label="Backend"  value="Python 3.11" />
          <Row label="Repo"     value="mjcj1022-collab" mono />
          <Row label="ODEN"     value="Optical Design Eng." />
        </Card>
      </div>
    </div>
  );
}
