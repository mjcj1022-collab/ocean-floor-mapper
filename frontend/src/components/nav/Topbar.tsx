import { Bell, HelpCircle } from 'lucide-react';
import type { Page } from './Sidebar';

interface Props {
  page: Page;
  coords: { lat: string; lon: string; depth: number };
}

const PAGE_TITLES: Record<Page, string> = {
  dashboard: 'Map View',
  survey:    'Sonar Survey',
  targets:   'Detected Targets',
  pipeline:  'Survey Pipeline',
  layers:    'Layer Manager',
  export:    'Export & Reports',
  settings:  'Settings',
};

export function Topbar({ page, coords }: Props) {
  return (
    <header style={styles.bar}>
      <div style={styles.left}>
        <h1 style={styles.title}>{PAGE_TITLES[page]}</h1>
        <span style={styles.breadcrumb}>Gulf of Mexico · Block 42</span>
      </div>

      <div style={styles.center}>
        <CoordPill label="LAT" value={coords.lat} />
        <CoordPill label="LON" value={coords.lon} />
        <CoordPill label="DEPTH" value={`${coords.depth} m`} accent />
      </div>

      <div style={styles.right}>
        <IconBtn icon={<Bell size={15} />} />
        <IconBtn icon={<HelpCircle size={15} />} />
        <div style={styles.avatar}>MJ</div>
      </div>
    </header>
  );
}

function CoordPill({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={styles.pill}>
      <span style={styles.pillLabel}>{label}</span>
      <span style={{ ...styles.pillValue, color: accent ? 'var(--teal)' : 'var(--text-hi)' }}>
        {value}
      </span>
    </div>
  );
}

function IconBtn({ icon }: { icon: React.ReactNode }) {
  return (
    <button style={styles.iconBtn}>
      <span style={{ color: 'var(--text-md)' }}>{icon}</span>
    </button>
  );
}

const styles: Record<string, React.CSSProperties> = {
  bar: {
    height: 'var(--topbar-h)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 20px 0 16px',
    borderBottom: '1px solid var(--border)',
    background: 'var(--panel)',
    flexShrink: 0,
    gap: 12,
  },
  left: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 10,
    minWidth: 180,
  },
  title: {
    fontSize: 15,
    fontWeight: 600,
    color: 'var(--text-hi)',
    letterSpacing: '-0.01em',
  },
  breadcrumb: {
    fontSize: 11,
    color: 'var(--text-lo)',
  },
  center: {
    display: 'flex',
    gap: 8,
    flex: 1,
    justifyContent: 'center',
  },
  pill: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '3px 10px',
  },
  pillLabel: {
    fontSize: 10,
    color: 'var(--text-lo)',
    fontWeight: 600,
    letterSpacing: '0.06em',
  },
  pillValue: {
    fontSize: 12,
    fontFamily: 'monospace',
    fontVariantNumeric: 'tabular-nums',
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    minWidth: 120,
    justifyContent: 'flex-end',
  },
  iconBtn: {
    width: 30,
    height: 30,
    borderRadius: 'var(--radius)',
    background: 'none',
    border: '1px solid transparent',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'border-color 0.12s',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    background: 'var(--blue-lo)',
    border: '1px solid rgba(58,143,214,0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--blue)',
    marginLeft: 4,
  },
};
