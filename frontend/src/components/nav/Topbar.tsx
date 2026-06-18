import { useSurveyStore } from '../../store/surveyStore';
import { formatLat, formatLon } from '../../utils/coords';
import { LiveDot } from '../ui';
import { Bell } from 'lucide-react';

const PAGE_TITLES: Record<string,string> = {
  dashboard:'Map View', sonar:'Sonar Survey', targets:'Target Management',
  comparison:'Historical Comparison', lidar:'LiDAR Fusion', rov:'ROV / AUV Control',
  assets:'Subsea Assets', pipeline:'Processing Pipeline', export:'Export & Reports', settings:'Settings',
};

export function Topbar({ page }: { page: string }) {
  const { telemetry, coordFormat, setCoordFormat } = useSurveyStore();

  return (
    <header style={{ height:50, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 16px', borderBottom:'1px solid var(--b2)', background:'var(--bg2)', flexShrink:0, gap:12 }}>
      <div style={{ display:'flex', alignItems:'baseline', gap:10, minWidth:160 }}>
        <h1 style={{ fontSize:14, fontWeight:600, color:'var(--t1)' }}>{PAGE_TITLES[page] ?? page}</h1>
        <span style={{ fontSize:10, color:'var(--t3)' }}>Gulf of Mexico · Block 42</span>
      </div>

      {/* Telemetry pills */}
      <div style={{ display:'flex', gap:6, flex:1, justifyContent:'center', flexWrap:'wrap' }}>
        {[
          { l:'LAT',   v: formatLat(telemetry.lat, coordFormat) },
          { l:'LON',   v: formatLon(telemetry.lon, coordFormat) },
          { l:'DEPTH', v: `${telemetry.depth_m} m`,   accent:'var(--blue)' },
          { l:'HDG',   v: `${telemetry.heading}°` },
          { l:'HEAVE', v: `${telemetry.heave_m} m`,   accent: Math.abs(telemetry.heave_m) > 0.5 ? 'var(--amber)' : undefined },
          { l:'PITCH', v: `${telemetry.pitch_deg}°` },
          { l:'ROLL',  v: `${telemetry.roll_deg}°` },
          { l:'SVP',   v: `${telemetry.svp_ms} m/s`,  accent:'var(--green)' },
        ].map(p => (
          <div key={p.l} style={{ background:'var(--surface)', border:'1px solid var(--b2)', borderRadius:'var(--r2)', padding:'3px 9px', display:'flex', alignItems:'center', gap:5 }}>
            <span style={{ fontSize:9, color:'var(--t3)', fontWeight:700, letterSpacing:'0.08em' }}>{p.l}</span>
            <span style={{ fontSize:11, color:p.accent??'var(--t1)', fontFamily:'var(--font-mono)', fontVariantNumeric:'tabular-nums' }}>{p.v}</span>
          </div>
        ))}
      </div>

      <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
        {/* Coord format toggle */}
        <div style={{ display:'flex', background:'var(--surface)', border:'1px solid var(--b2)', borderRadius:'var(--r2)', overflow:'hidden' }}>
          {(['DD','DMS','UTM'] as const).map(f => (
            <button key={f} onClick={() => setCoordFormat(f)} style={{ padding:'3px 8px', fontSize:10, fontWeight:600, background: coordFormat===f ? 'var(--green)' : 'transparent', color: coordFormat===f ? '#001' : 'var(--t3)', border:'none', letterSpacing:'0.04em', transition:'all 0.1s' }}>{f}</button>
          ))}
        </div>
        <button style={{ width:28, height:28, background:'var(--surface)', border:'1px solid var(--b2)', borderRadius:'var(--r2)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--t2)' }}>
          <Bell size={13} />
        </button>
        <div style={{ display:'flex', alignItems:'center', gap:6, background:'var(--surface)', border:'1px solid var(--b2)', borderRadius:'var(--r2)', padding:'4px 10px' }}>
          <LiveDot />
          <span style={{ fontSize:11, color:'var(--t2)', fontFamily:'var(--font-mono)' }}>LIVE</span>
        </div>
        <div style={{ width:28, height:28, borderRadius:'50%', background:'var(--green-lo)', border:'1px solid var(--green-bd)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'var(--green)' }}>MJ</div>
      </div>
    </header>
  );
}
