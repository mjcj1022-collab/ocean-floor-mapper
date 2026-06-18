import { useSurveyStore } from '../../store/surveyStore';
import type { Page } from '../../types';
import { Map, Radio, Target, Layers, GitBranch, Download, Settings, Cpu, Waves, Database, Moon, Sun, ChevronLeft, ChevronRight } from 'lucide-react';

interface Props { active: Page; onChange: (p: Page) => void; }

const NAV: Array<{ key: Page; icon: any; label: string; divBefore?: boolean; badge?: string }> = [
  { key:'dashboard',   icon:Map,      label:'Map View' },
  { key:'sonar',       icon:Radio,    label:'Sonar Survey' },
  { key:'targets',     icon:Target,   label:'Targets',      badge:'4' },
  { key:'comparison',  icon:Layers,   label:'Historical Compare', divBefore:true },
  { key:'lidar',       icon:Waves,    label:'LiDAR Fusion' },
  { key:'rov',         icon:Cpu,      label:'ROV / AUV' },
  { key:'assets',      icon:Database, label:'Subsea Assets', divBefore:true },
  { key:'pipeline',    icon:GitBranch,label:'Pipeline' },
  { key:'export',      icon:Download, label:'Export' },
  { key:'settings',    icon:Settings, label:'Settings',     divBefore:true },
];

export function Sidebar({ active, onChange }: Props) {
  const { nightMode, toggleNightMode, sidebarCollapsed, toggleSidebar, targets } = useSurveyStore();
  const w = sidebarCollapsed ? 52 : 220;

  return (
    <nav style={{ width:w, height:'100%', background:'var(--bg2)', borderRight:'1px solid var(--b2)', display:'flex', flexDirection:'column', flexShrink:0, transition:'width 0.2s', overflow:'hidden' }}>
      {/* Logo */}
      <div style={{ height:50, display:'flex', alignItems:'center', gap:10, padding:'0 12px', borderBottom:'1px solid var(--b2)', flexShrink:0 }}>
        <img src="/ocean-floor-mapper/oden-logo.svg" alt="ODEN" style={{ height:32, flexShrink:0 }} />
        {!sidebarCollapsed && <div>
          <div style={{ fontSize:12, fontWeight:700, color:'var(--t1)', letterSpacing:'-0.01em' }}>ODEN</div>
          <div style={{ fontSize:8, color:'var(--t3)', letterSpacing:'0.06em' }}>OFMapper v2.0</div>
        </div>}
      </div>

      {/* Nav */}
      <div style={{ flex:1, padding:'8px 0', overflowY:'auto' }}>
        {NAV.map(item => {
          const Icon = item.icon;
          const isActive = active === item.key;
          const count = item.key === 'targets' ? targets.length : undefined;
          return (
            <div key={item.key}>
              {item.divBefore && <div style={{ height:1, background:'var(--b1)', margin:'6px 10px' }} />}
              <button onClick={() => onChange(item.key)} title={item.label} style={{
                width:'100%', display:'flex', alignItems:'center', gap:10,
                padding: sidebarCollapsed ? '9px 0' : '9px 14px',
                justifyContent: sidebarCollapsed ? 'center' : undefined,
                background: isActive ? 'rgba(0,200,150,0.08)' : 'none',
                border:'none', position:'relative', transition:'background 0.12s',
              }}>
                {isActive && <div style={{ position:'absolute', left:0, top:'50%', transform:'translateY(-50%)', width:3, height:22, background:'var(--green)', borderRadius:'0 2px 2px 0' }} />}
                <Icon size={15} color={isActive ? 'var(--green)' : 'var(--t3)'} strokeWidth={isActive ? 2 : 1.5} />
                {!sidebarCollapsed && <>
                  <span style={{ fontSize:12, fontWeight:isActive?500:400, color:isActive?'var(--t1)':'var(--t2)', flex:1, textAlign:'left' }}>{item.label}</span>
                  {count !== undefined && count > 0 && <span style={{ background:'var(--green)', color:'#001', fontSize:9, fontWeight:700, padding:'1px 5px', borderRadius:8 }}>{count}</span>}
                </>}
              </button>
            </div>
          );
        })}
      </div>

      {/* Bottom controls */}
      <div style={{ padding:'8px 10px', borderTop:'1px solid var(--b2)', display:'flex', flexDirection:'column', gap:6 }}>
        {!sidebarCollapsed && <button onClick={toggleNightMode} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 6px', background:'none', border:'1px solid var(--b1)', borderRadius:'var(--r2)', color:'var(--t3)', width:'100%' }}>
          {nightMode ? <Sun size={13} /> : <Moon size={13} />}
          <span style={{ fontSize:11 }}>{nightMode ? 'Day mode' : 'Night mode'}</span>
        </button>}
        <button onClick={toggleSidebar} style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'6px', background:'var(--surface)', border:'1px solid var(--b1)', borderRadius:'var(--r2)', color:'var(--t3)', width:'100%' }}>
          {sidebarCollapsed ? <ChevronRight size={13}/> : <ChevronLeft size={13}/>}
        </button>
      </div>
    </nav>
  );
}
