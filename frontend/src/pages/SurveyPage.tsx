import { useState, useRef } from 'react';
import { useSurveyStore } from '../store/surveyStore';
import { Card, SectionLabel, Btn, Stat, Divider, Row, ProgressBar, Badge } from '../components/ui';
import { Upload, FileText, MapPin, Radio } from 'lucide-react';

interface UploadedFile { name: string; size: string; type: string; status: 'ready' | 'processing' | 'done' | 'error'; }

export function SurveyPage() {
  const { sonarParams, setSonarParam, metrics } = useSurveyStore();
  const [sonarFiles, setSonarFiles] = useState<UploadedFile[]>([]);
  const [gpsFile, setGpsFile] = useState<UploadedFile | null>(null);
  const [processing, setProcessing] = useState(false);
  const sonarRef = useRef<HTMLInputElement>(null);
  const gpsRef   = useRef<HTMLInputElement>(null);

  function handleSonarDrop(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    setSonarFiles(files.map(f => ({
      name: f.name, size: formatSize(f.size),
      type: f.name.split('.').pop()?.toUpperCase() ?? 'RAW',
      status: 'ready',
    })));
  }

  function handleGpsDrop(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setGpsFile({ name: f.name, size: formatSize(f.size), type: f.name.split('.').pop()?.toUpperCase() ?? 'GPX', status: 'ready' });
  }

  async function startProcessing() {
    if (sonarFiles.length === 0 && gpsFile === null) return;
    setProcessing(true);
    // Simulate processing
    setSonarFiles(fs => fs.map(f => ({ ...f, status: 'processing' })));
    await sleep(1200);
    setSonarFiles(fs => fs.map(f => ({ ...f, status: 'done' })));
    if (gpsFile) setGpsFile(f => f ? { ...f, status: 'done' } : null);
    setProcessing(false);
  }

  return (
    <div style={styles.page}>
      {/* Left column: file upload + params */}
      <div style={styles.col}>
        {/* Sonar upload */}
        <Card>
          <SectionLabel>Sonar data files</SectionLabel>
          <DropZone
            accept=".xyx,.s7k,.all,.jsf,.xtf"
            multiple
            label="Drop sonar files here"
            sublabel=".xyx · .s7k · .all · .jsf · .xtf"
            icon={<Radio size={22} color="var(--teal)" />}
            inputRef={sonarRef}
            onChange={handleSonarDrop}
          />
          {sonarFiles.length > 0 && (
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {sonarFiles.map((f, i) => <FileRow key={i} file={f} />)}
            </div>
          )}
        </Card>

        {/* GPS upload */}
        <Card>
          <SectionLabel>Navigation / GPS track</SectionLabel>
          <DropZone
            accept=".gpx,.csv,.nmea,.txt"
            label="Drop GPS file here"
            sublabel=".gpx · .csv · .nmea"
            icon={<MapPin size={22} color="var(--blue)" />}
            inputRef={gpsRef}
            onChange={handleGpsDrop}
          />
          {gpsFile && (
            <div style={{ marginTop: 12 }}><FileRow file={gpsFile} /></div>
          )}
        </Card>

        {/* Sonar parameters */}
        <Card>
          <SectionLabel>Sonar parameters</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <ParamSlider
              label="Frequency"
              value={sonarParams.frequency_khz}
              min={50} max={400} step={50} unit="kHz"
              onChange={v => setSonarParam('frequency_khz', v)}
            />
            <ParamSlider
              label="Gain"
              value={sonarParams.gain_db}
              min={20} max={80} step={1} unit="dB"
              onChange={v => setSonarParam('gain_db', v)}
            />
            <ParamSlider
              label="Swath range"
              value={sonarParams.range_m}
              min={50} max={500} step={50} unit="m"
              onChange={v => setSonarParam('range_m', v)}
            />
            <ParamSlider
              label="Pulse length"
              value={sonarParams.pulse_length_us}
              min={10} max={500} step={10} unit="µs"
              onChange={v => setSonarParam('pulse_length_us', v)}
            />
          </div>
          <div style={{ marginTop: 16 }}>
            <Btn
              variant="primary"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={startProcessing}
              disabled={processing}
            >
              {processing ? 'Processing…' : '▶ Start survey'}
            </Btn>
          </div>
        </Card>
      </div>

      {/* Right column: live metrics + log */}
      <div style={styles.col}>
        {/* Live stats */}
        <Card>
          <SectionLabel>Live metrics</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <Stat label="Coverage"  value={`${metrics.coverage_pct}%`}         accent="var(--teal)" />
            <Stat label="Speed"     value={metrics.vessel_speed_kts}  unit="kts" />
            <Stat label="Data rate" value={metrics.data_rate_mbps}    unit="MB/s" />
            <Stat label="Depth"     value={metrics.depth_current_m}   unit="m"  accent="var(--blue)" />
            <Stat label="Pings"     value={metrics.pings_recorded.toLocaleString()} />
            <Stat label="Elapsed"   value={formatElapsed(metrics.elapsed_seconds)} />
          </div>
        </Card>

        {/* Survey config summary */}
        <Card>
          <SectionLabel>Session configuration</SectionLabel>
          <Row label="Vessel"          value="R/V Surveyor" />
          <Row label="Survey area"     value="Gulf of Mexico Blk 42" />
          <Row label="Coordinate sys." value="WGS 84" />
          <Row label="Depth unit"      value="Metres" />
          <Row label="Sonar type"      value="Side-scan 100 kHz" />
          <Row label="Track pattern"   value="Lawnmower (8 passes)" />
          <Divider />
          <Row label="Files loaded"    value={`${sonarFiles.length} sonar + ${gpsFile ? 1 : 0} GPS`} />
          <Row label="Status"          value={processing ? 'Processing…' : 'Ready'} />
          {processing && (
            <div style={{ marginTop: 8 }}>
              <ProgressBar value={65} />
            </div>
          )}
        </Card>

        {/* Live event log */}
        <Card style={{ flex: 1 }}>
          <SectionLabel>Event log</SectionLabel>
          <div style={styles.log}>
            {LOG_ENTRIES.map((entry, i) => (
              <div key={i} style={styles.logRow}>
                <span style={styles.logTime}>{entry.time}</span>
                <span style={{ color: LOG_COLORS[entry.level] }}>{entry.level.toUpperCase()}</span>
                <span style={{ color: 'var(--text-md)', flex: 1 }}>{entry.msg}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────

function DropZone({ accept, multiple, label, sublabel, icon, inputRef, onChange }: {
  accept: string; multiple?: boolean; label: string; sublabel: string;
  icon: React.ReactNode; inputRef: React.RefObject<HTMLInputElement | null>;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div
      style={styles.dropzone}
      onClick={() => inputRef.current?.click()}
    >
      {icon}
      <div style={{ textAlign: 'center' }}>
        <div style={{ color: 'var(--text-hi)', fontSize: 13, marginBottom: 3 }}>{label}</div>
        <div style={{ color: 'var(--text-lo)', fontSize: 11 }}>{sublabel}</div>
      </div>
      <Btn variant="ghost" size="sm" icon={<Upload size={13} />}>Browse files</Btn>
      <input ref={inputRef} type="file" accept={accept} multiple={multiple}
        style={{ display: 'none' }} onChange={onChange} />
    </div>
  );
}

function FileRow({ file }: { file: UploadedFile }) {

  return (
    <div style={styles.fileRow}>
      <FileText size={14} color="var(--text-lo)" />
      <span style={{ flex: 1, fontSize: 12, color: 'var(--text-hi)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {file.name}
      </span>
      <span style={{ fontSize: 10, color: 'var(--text-lo)', marginRight: 6 }}>{file.size}</span>
      <Badge variant={file.status === 'done' ? 'success' : file.status === 'error' ? 'high' : 'neutral'}>
        {file.type}
      </Badge>
    </div>
  );
}

function ParamSlider({ label, value, min, max, step, unit, onChange }: {
  label: string; value: number; min: number; max: number; step: number;
  unit: string; onChange: (v: number) => void;
}) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: 12, color: 'var(--text-md)' }}>{label}</span>
        <span style={{ fontSize: 12, color: 'var(--text-hi)', fontVariantNumeric: 'tabular-nums' }}>
          {value} {unit}
        </span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: 'var(--teal)' }}
      />
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatElapsed(s: number): string {
  const m = Math.floor(s / 60), sec = s % 60;
  return `${m}m ${String(sec).padStart(2, '0')}s`;
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

const LOG_COLORS: Record<string, string> = { info: 'var(--blue)', warn: 'var(--amber)', error: 'var(--red)', ok: 'var(--teal)' };
const LOG_ENTRIES = [
  { time: '12:04:02', level: 'ok',   msg: 'GPS lock acquired — 14 satellites' },
  { time: '12:04:05', level: 'ok',   msg: 'Sonar initialised at 100 kHz' },
  { time: '12:04:10', level: 'info', msg: 'Survey pass 1 started' },
  { time: '12:06:42', level: 'warn', msg: 'Hypack sync delayed — retrying' },
  { time: '12:07:01', level: 'ok',   msg: 'Hypack reconnected' },
  { time: '12:09:18', level: 'info', msg: 'Pass 2 started, heading 092°' },
  { time: '12:11:55', level: 'ok',   msg: 'Mosaic slice 3/8 committed' },
  { time: '12:14:30', level: 'info', msg: 'ArcGIS raster export queued' },
];

const styles: Record<string, React.CSSProperties> = {
  page: { display: 'flex', gap: 16, padding: 20, height: '100%', overflowY: 'auto' },
  col:  { flex: 1, display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 },
  dropzone: {
    border: '1.5px dashed var(--border2)',
    borderRadius: 'var(--radius-lg)',
    padding: '20px 16px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
    cursor: 'pointer', transition: 'border-color 0.15s',
    background: 'var(--surface)',
  },
  fileRow: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '6px 8px',
    background: 'var(--surface2)',
    borderRadius: 'var(--radius)',
  },
  log: {
    display: 'flex', flexDirection: 'column', gap: 4,
    fontFamily: 'monospace', fontSize: 11, overflowY: 'auto', maxHeight: 280,
  },
  logRow: { display: 'flex', gap: 10, alignItems: 'baseline' },
  logTime: { color: 'var(--text-lo)', flexShrink: 0 },
};
