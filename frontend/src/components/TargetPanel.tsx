import { useSurveyStore } from '../store/surveyStore';
import type { Target, TargetClass } from '../types';
import styles from './TargetPanel.module.css';

const CLASS_COLORS: Record<TargetClass, string> = {
  high:   '#E24B4A',
  medium: '#BA7517',
  low:    '#1D9E75',
};

const CLASS_BG: Record<TargetClass, string> = {
  high:   'rgba(162,45,45,0.12)',
  medium: 'rgba(185,117,23,0.12)',
  low:    'rgba(15,110,86,0.12)',
};

export function TargetPanel() {
  const { targets, selectedTargetId, selectTarget, integrations } =
    useSurveyStore();

  return (
    <div className={styles.panel}>
      <div className={styles.section}>
        <div className={styles.sectionLabel}>
          Detected targets
          <span className={styles.count}>{targets.length}</span>
        </div>

        {targets.length === 0 && (
          <div className={styles.empty}>No targets detected yet</div>
        )}

        {targets.map((t) => (
          <TargetCard
            key={t.id}
            target={t}
            selected={t.id === selectedTargetId}
            onSelect={() =>
              selectTarget(t.id === selectedTargetId ? null : t.id)
            }
          />
        ))}
      </div>

      <div className={styles.section}>
        <div className={styles.sectionLabel}>Software</div>
        {integrations.map((intg) => (
          <div key={intg.name} className={styles.integrationRow}>
            <span className={styles.integrationName}>{intg.name}</span>
            <StatusBadge status={intg.status} />
          </div>
        ))}
      </div>
    </div>
  );
}

function TargetCard({
  target, selected, onSelect,
}: {
  target: Target;
  selected: boolean;
  onSelect: () => void;
}) {
  const cls = target.classification;
  const color = CLASS_COLORS[cls];

  return (
    <button
      className={`${styles.card} ${selected ? styles.cardSelected : ''}`}
      style={selected ? { borderColor: '#378ADD' } : undefined}
      onClick={onSelect}
    >
      <div className={styles.cardHeader}>
        <span className={styles.targetId}>{target.id}</span>
        <span
          className={styles.badge}
          style={{ color, background: CLASS_BG[cls] }}
        >
          {cls.toUpperCase()}
        </span>
      </div>
      <div className={styles.cardDetail}>
        <Row label="Depth" value={target.depth_m != null ? `${target.depth_m} m` : '—'} />
        <Row label="Height est." value={target.estimated_height_m != null ? `${target.estimated_height_m} m` : '—'} />
        <Row label="Confidence" value={`${Math.round(target.confidence * 100)}%`} />
        <Row label="Footprint" value={`${target.footprint_px} px`} />
      </div>
      {target.lat != null && (
        <div className={styles.coords}>
          {target.lat.toFixed(4)}°N {Math.abs(target.lon!).toFixed(4)}°W
        </div>
      )}
    </button>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.detailRow}>
      <span>{label}</span>
      <span className={styles.detailValue}>{value}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { color: string; icon: string }> = {
    connected:    { color: '#1D9E75', icon: '✓' },
    disconnected: { color: '#888780', icon: '○' },
    error:        { color: '#E24B4A', icon: '✗' },
    syncing:      { color: '#BA7517', icon: '⟳' },
  };
  const c = cfg[status] ?? cfg.disconnected;
  return (
    <span style={{ fontSize: 11, color: c.color }}>
      {c.icon} {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
