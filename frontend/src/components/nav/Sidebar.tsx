import {
  Map, Radar, Target, GitBranch,
  Settings, Download, Layers, Anchor
} from 'lucide-react';

export type Page =
  | 'dashboard'
  | 'survey'
  | 'targets'
  | 'pipeline'
  | 'layers'
  | 'export'
  | 'settings';

interface Props {
  active: Page;
  onChange: (p: Page) => void;
}

const NAV: Array<{ key: Page; icon: React.FC<any>; label: string; divider?: boolean }> = [
  { key: 'dashboard', icon: Map,       label: 'Map View' },
  { key: 'survey',    icon: Radar,     label: 'Sonar Survey' },
  { key: 'targets',   icon: Target,    label: 'Targets',  divider: true },
  { key: 'pipeline',  icon: GitBranch, label: 'Pipeline' },
  { key: 'layers',    icon: Layers,    label: 'Layers' },
  { key: 'export',    icon: Download,  label: 'Export',   divider: true },
  { key: 'settings',  icon: Settings,  label: 'Settings' },
];

export function Sidebar({ active, onChange }: Props) {
  return (
    <nav style={styles.nav}>
      {/* Logo */}
      <div style={styles.logo}>
        <Anchor size={18} color="var(--teal)" />
        <span style={styles.logoText}>OFMapper</span>
      </div>

      {/* Nav items */}
      <div style={styles.items}>
        {NAV.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.key;
          return (
            <div key={item.key}>
              {item.divider && <div style={styles.divider} />}
              <button
                style={{
                  ...styles.item,
                  ...(isActive ? styles.itemActive : {}),
                }}
                onClick={() => onChange(item.key)}
              >
                <Icon
                  size={16}
                  color={isActive ? 'var(--teal)' : 'var(--text-md)'}
                  strokeWidth={isActive ? 2 : 1.5}
                />
                <span style={{
                  ...styles.itemLabel,
                  color: isActive ? 'var(--text-hi)' : 'var(--text-md)',
                }}>
                  {item.label}
                </span>
                {isActive && <div style={styles.activeBar} />}
              </button>
            </div>
          );
        })}
      </div>

      {/* Status footer */}
      <div style={styles.footer}>
        <div style={styles.statusDot} />
        <span style={{ color: 'var(--text-lo)', fontSize: 11 }}>Survey active</span>
      </div>
    </nav>
  );
}

const styles: Record<string, React.CSSProperties> = {
  nav: {
    width: 'var(--sidebar-w)',
    height: '100%',
    background: 'var(--panel)',
    borderRight: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
  },
  logo: {
    height: 'var(--topbar-h)',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '0 16px',
    borderBottom: '1px solid var(--border)',
    flexShrink: 0,
  },
  logoText: {
    fontSize: 15,
    fontWeight: 600,
    color: 'var(--text-hi)',
    letterSpacing: '-0.01em',
  },
  items: {
    flex: 1,
    padding: '8px 0',
    overflowY: 'auto',
  },
  divider: {
    height: 1,
    background: 'var(--border)',
    margin: '6px 12px',
  },
  item: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 16px',
    background: 'none',
    border: 'none',
    position: 'relative',
    borderRadius: 0,
    transition: 'background 0.12s',
  },
  itemActive: {
    background: 'rgba(29,176,130,0.08)',
  },
  itemLabel: {
    fontSize: 13,
    fontWeight: 400,
  },
  activeBar: {
    position: 'absolute',
    left: 0,
    top: '50%',
    transform: 'translateY(-50%)',
    width: 3,
    height: 20,
    background: 'var(--teal)',
    borderRadius: '0 2px 2px 0',
  },
  footer: {
    padding: '12px 16px',
    borderTop: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    gap: 7,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: '50%',
    background: 'var(--teal)',
    boxShadow: '0 0 0 2px rgba(29,176,130,0.2)',
  },
};
