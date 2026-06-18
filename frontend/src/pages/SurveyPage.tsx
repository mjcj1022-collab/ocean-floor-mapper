import { useState, useRef } from 'react';
import { useSurveyStore } from '../store/surveyStore';
import { Card, SectionLabel, Btn, Stat, Badge } from '../components/ui';
import { SideScanSonar } from '../components/sonar/SideScanSonar';
import { EchoSounder }   from '../components/sonar/EchoSounder';
import { Upload, FileText, MapPin, Radio, Square, Play } from 'lucide-react';

interface UploadedFile {
  name: string; size: string; type: string;
  status: 'ready' | 'processing' | 'done' | 'error';
}

const LOG_ENTRIES = [
  { time: '12:04:02', level: 'ok',   msg: 'GPS lock acquired — 14 satellites' },
  { time: '12:04:05', level: 'ok',   msg: 'Side-scan initialised at 100 kHz' },
  { time: '12:04:07', level: 'ok',   msg: 'Sub-bottom profiler initialised at 3.5 kHz' },
  { time: '12:04:10', level: 'info', msg: 'Survey pass 1 started, heading 090°' },
  { time: '12:06:42', level: 'warn', msg: 'Hypack sync delayed — retrying' },
  { time: '12:07:01', level: 'ok',   msg: 'Hypack reconnected' },
  { time: '12:09:18', level: 'info', msg: 'Pass 2 started, heading 092°' },
  { time: '12:11:55', level: 'ok',   msg: 'TGT-001 flagged — high confidence' },
  { time: '12:14:30', level: 'info', msg: 'ArcGIS raster export queued' },
];
const LOG_COLORS: Record<string,string> = {
  info:'var(--blue)', warn:'var(--amber)', error:'var(--red)', ok:'var(--teal)'
};

export function SurveyPage() {
  const { sonarParams, setSonarParam, metrics } = useSurveyStore();

  // Sonar state
  const [running, setRunning]   = useState(true);
  const [sonarFiles, setSonarFiles] = useState<UploadedFile[]>([]);
  const [gpsFile, setGpsFile]   = useState<UploadedFile | null>(null);
  const [processing, setProcessing] = useState(false);

  // Sub-bottom has separate frequency
  const [subFreq, setSubFreq]   = useState(3.5);
  const [subGain, setSubGain]   = useState(45);
  const [subDepth, setSubDepth] = useState(2000);


  function handleSonarFiles(e: React.ChangeEvent<HTMLInputElement>) {
    setSonarFiles(Array.from(e.target.files ?? []).map(f => ({
      name: f.name, size: formatSize(f.size),
      type: f.name.split('.').pop()?.toUpperCase() ?? 'RAW',
      status: 'ready',
    })));
  }

  function handleGpsFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setGpsFile({ name: f.name, size: formatSize(f.size),
      type: f.name.split('.').pop()?.toUpperCase() ?? 'GPX', status: 'ready' });
  }

  async function startSurvey() {
    setProcessing(true);
    setSonarFiles(fs => fs.map(f => ({ ...f, status: 'processing' })));
    await sleep(1400);
    setSonarFiles(fs => fs.map(f => ({ ...f, status: 'done' })));
    if (gpsFile) setGpsFile(f => f ? { ...f, status: 'done' } : null);
    setProcessing(false);
  }

  return (
    <div style={s.page}>

      {/* ── Left column: controls ─────────────────────────────────────── */}
      <div style={s.controls}>

        {/* File upload */}
        <Card pad="14px">
          <SectionLabel>Data files</SectionLabel>
          <DropZone
            accept=".xyx,.s7k,.all,.jsf,.xtf"
            multiple
            label="Sonar data"
            sublabel=".xyx · .s7k · .all · .jsf"
            icon={<Radio size={16} color="var(--teal)" />}
            onChange={handleSonarFiles}
          />
          {sonarFiles.map((f,i) => <FileRow key={i} file={f} />)}

          <div style={{ height: 8 }} />

          <DropZone
            accept=".gpx,.csv,.nmea"
            label="GPS track"
            sublabel=".gpx · .csv · .nmea"
            icon={<MapPin size={16} color="var(--blue)" />}
            onChange={handleGpsFile}
          />
          {gpsFile && <FileRow file={gpsFile} />}
        </Card>

        {/* Side-scan params */}
        <Card pad="14px">
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
            <SectionLabel>Side-scan sonar</SectionLabel>
            <div style={{ width:8, height:8, borderRadius:'50%', background:'var(--teal)',
              boxShadow:'0 0 0 3px rgba(29,176,130,0.2)', flexShrink:0 }} />
          </div>
          <Slider label="Frequency" value={sonarParams.frequency_khz} min={50} max={400} step={50} unit="kHz"
            onChange={v => setSonarParam('frequency_khz', v)} />
          <Slider label="Gain"      value={sonarParams.gain_db}       min={20} max={80}  step={1}  unit="dB"
            onChange={v => setSonarParam('gain_db', v)} />
          <Slider label="Range"     value={sonarParams.range_m}       min={50} max={500} step={50} unit="m"
            onChange={v => setSonarParam('range_m', v)} />
        </Card>

        {/* Sub-bottom params */}
        <Card pad="14px">
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
            <SectionLabel>Sub-bottom profiler</SectionLabel>
            <div style={{ width:8, height:8, borderRadius:'50%', background:'var(--blue)',
              boxShadow:'0 0 0 3px rgba(58,143,214,0.2)', flexShrink:0 }} />
          </div>
          <Slider label="Frequency" value={subFreq} min={1} max={24} step={0.5} unit="kHz"
            onChange={setSubFreq} />
          <Slider label="Gain"      value={subGain} min={20} max={80} step={1}  unit="dB"
            onChange={setSubGain} />
          <Slider label="Max depth" value={subDepth} min={500} max={5000} step={500} unit="m"
            onChange={setSubDepth} />
        </Card>

        {/* Start / stop */}
        <div style={{ display:'flex', gap:8 }}>
          <Btn
            variant={running ? 'danger' : 'primary'}
            style={{ flex:1, justifyContent:'center' }}
            icon={running ? <Square size={13}/> : <Play size={13}/>}
            onClick={() => setRunning(r => !r)}
          >
            {running ? 'Pause sonar' : 'Resume sonar'}
          </Btn>
          <Btn
            variant="secondary"
            style={{ flex:1, justifyContent:'center' }}
            onClick={startSurvey}
            disabled={processing}
          >
            {processing ? 'Processing…' : '▶ Run pipeline'}
          </Btn>
        </div>

        {/* Live metrics */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
          <Stat label="Speed"   value={metrics.vessel_speed_kts} unit="kts" />
          <Stat label="Depth"   value={metrics.depth_current_m}  unit="m" accent="var(--blue)" />
          <Stat label="Pings"   value={metrics.pings_recorded.toLocaleString()} />
          <Stat label="Coverage" value={`${metrics.coverage_pct}%`} accent="var(--teal)" />
        </div>
      </div>

      {/* ── Right column: dual sonar displays ────────────────────────── */}
      <div style={s.displays}>

        {/* Side-scan */}
        <div style={s.sonarBlock}>
          <div style={s.sonarHeader}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ width:8, height:8, borderRadius:'50%',
                background: running ? 'var(--teal)' : '#444',
                boxShadow: running ? '0 0 0 3px rgba(29,176,130,0.2)' : 'none' }} />
              <span style={s.sonarTitle}>Side-Scan Sonar</span>
              <Badge variant="info">{sonarParams.frequency_khz} kHz</Badge>
            </div>
            <div style={s.sonarMeta}>
              <span>Swath ±{sonarParams.range_m} m</span>
              <span>Gain {sonarParams.gain_db} dB</span>
              <span style={{ color: running ? 'var(--teal)' : 'var(--text-lo)' }}>
                {running ? '● REC' : '■ PAUSED'}
              </span>
            </div>
          </div>
          <SideScanSonar
            width={900}
            height={260}
            rangeM={sonarParams.range_m}
            frequencyKhz={sonarParams.frequency_khz}
            gainDb={sonarParams.gain_db}
            running={running}
          />
          <div style={s.sonarFooter}>
            <span>Waterfall scroll — newest ping at top</span>
            <span>Port ◀ Nadir ▶ Starboard</span>
          </div>
        </div>

        {/* Echo sounder */}
        <div style={s.sonarBlock}>
          <div style={s.sonarHeader}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ width:8, height:8, borderRadius:'50%',
                background: running ? 'var(--blue)' : '#444',
                boxShadow: running ? '0 0 0 3px rgba(58,143,214,0.2)' : 'none' }} />
              <span style={s.sonarTitle}>Sub-Bottom Profiler</span>
              <Badge variant="neutral">{subFreq} kHz</Badge>
            </div>
            <div style={s.sonarMeta}>
              <span>Max {subDepth} m</span>
              <span>Gain {subGain} dB</span>
              <span style={{ color: running ? 'var(--blue)' : 'var(--text-lo)' }}>
                {running ? '● REC' : '■ PAUSED'}
              </span>
            </div>
          </div>
          <EchoSounder
            width={900}
            height={260}
            maxDepthM={subDepth}
            frequencyKhz={subFreq}
            gainDb={subGain}
            running={running}
          />
          <div style={s.sonarFooter}>
            <span>Profile scroll — newest ping at right</span>
            <span>Surface ▲  |  Seabed  |  Sub-bottom ▼</span>
          </div>
        </div>

        {/* Event log */}
        <Card pad="12px" style={{ flex:1 }}>
          <SectionLabel>Event log</SectionLabel>
          <div style={s.log}>
            {LOG_ENTRIES.map((e,i) => (
              <div key={i} style={s.logRow}>
                <span style={s.logTime}>{e.time}</span>
                <span style={{ color: LOG_COLORS[e.level], minWidth:36, fontWeight:600 }}>
                  {e.level.toUpperCase()}
                </span>
                <span style={{ color:'var(--text-md)', flex:1 }}>{e.msg}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────

function DropZone({ accept, multiple, label, sublabel, icon, onChange }: {
  accept: string; multiple?: boolean; label: string; sublabel: string;
  icon: React.ReactNode;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div style={s.dropzone} onClick={() => ref.current?.click()}>
      {icon}
      <div style={{ flex:1 }}>
        <div style={{ color:'var(--text-hi)', fontSize:12 }}>{label}</div>
        <div style={{ color:'var(--text-lo)', fontSize:10 }}>{sublabel}</div>
      </div>
      <Btn variant="ghost" size="sm" icon={<Upload size={11}/>} style={{ flexShrink:0 }}>Browse</Btn>
      <input ref={ref as any} type="file" accept={accept} multiple={multiple}
        style={{ display:'none' }} onChange={onChange} />
    </div>
  );
}

function FileRow({ file }: { file: UploadedFile }) {
  return (
    <div style={s.fileRow}>
      <FileText size={12} color="var(--text-lo)" />
      <span style={{ flex:1, fontSize:11, color:'var(--text-hi)', overflow:'hidden',
        textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{file.name}</span>
      <span style={{ fontSize:10, color:'var(--text-lo)' }}>{file.size}</span>
      <Badge variant={file.status==='done'?'success':file.status==='error'?'high':'neutral'}>
        {file.type}
      </Badge>
    </div>
  );
}

function Slider({ label, value, min, max, step, unit, onChange }: {
  label:string; value:number; min:number; max:number; step:number;
  unit:string; onChange:(v:number)=>void;
}) {
  return (
    <div style={{ marginBottom:10 }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
        <span style={{ fontSize:11, color:'var(--text-md)' }}>{label}</span>
        <span style={{ fontSize:11, color:'var(--text-hi)', fontVariantNumeric:'tabular-nums' }}>
          {value} {unit}
        </span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width:'100%', accentColor:'var(--teal)' }} />
    </div>
  );
}

function formatSize(b:number):string {
  if (b<1024) return `${b} B`;
  if (b<1024*1024) return `${(b/1024).toFixed(1)} KB`;
  return `${(b/1024/1024).toFixed(1)} MB`;
}
function sleep(ms:number){ return new Promise(r=>setTimeout(r,ms)); }

// ─── Styles ────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  page: {
    display:'flex', gap:16, padding:16,
    height:'100%', overflow:'hidden',
  },
  controls: {
    width:240, flexShrink:0,
    display:'flex', flexDirection:'column', gap:10,
    overflowY:'auto',
  },
  displays: {
    flex:1, display:'flex', flexDirection:'column', gap:12,
    overflow:'hidden', minWidth:0,
  },
  sonarBlock: {
    background:'var(--panel)',
    border:'1px solid var(--border)',
    borderRadius:10,
    overflow:'hidden',
    flexShrink:0,
  },
  sonarHeader: {
    display:'flex', alignItems:'center',
    justifyContent:'space-between',
    padding:'8px 14px',
    borderBottom:'1px solid var(--border)',
    background:'var(--surface)',
  },
  sonarTitle: {
    fontSize:13, fontWeight:600, color:'var(--text-hi)',
  },
  sonarMeta: {
    display:'flex', gap:14,
    fontSize:10, color:'var(--text-lo)', fontFamily:'monospace',
    letterSpacing:'0.04em',
  },
  sonarFooter: {
    display:'flex', justifyContent:'space-between',
    padding:'4px 12px',
    fontSize:9, color:'var(--text-lo)', fontFamily:'monospace',
    background:'var(--surface)', borderTop:'1px solid var(--border)',
  },
  dropzone: {
    display:'flex', alignItems:'center', gap:8,
    padding:'8px 10px',
    border:'1px dashed var(--border2)',
    borderRadius:'var(--radius)',
    cursor:'pointer', marginBottom:6,
    background:'var(--surface)',
  },
  fileRow: {
    display:'flex', alignItems:'center', gap:6,
    padding:'4px 6px', background:'var(--surface2)',
    borderRadius:'var(--radius)', marginBottom:4,
  },
  log: {
    display:'flex', flexDirection:'column', gap:3,
    fontFamily:'monospace', fontSize:11,
    overflowY:'auto', maxHeight:140,
  },
  logRow: { display:'flex', gap:10, alignItems:'baseline' },
  logTime: { color:'var(--text-lo)', flexShrink:0, minWidth:55 },
};
