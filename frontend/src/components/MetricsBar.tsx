import { useSurveyStore } from '../store/surveyStore';
import styles from './MetricsBar.module.css';

export function MetricsBar() {
  const { metrics } = useSurveyStore();

  const elapsed = formatElapsed(metrics.elapsed_seconds);

  return (
    <div className={styles.bar}>
      <Metric label="Coverage"     value={`${metrics.coverage_pct}%`}    accent="#1D9E75" />
      <Metric label="Speed"        value={`${metrics.vessel_speed_kts} kts`} />
      <Metric label="Data rate"    value={`${metrics.data_rate_mbps} MB/s`} />
      <Metric label="Current depth" value={`${metrics.depth_current_m} m`} accent="#378ADD" />
      <Metric label="Pings"        value={metrics.pings_recorded.toLocaleString()} />
      <Metric label="Elapsed"      value={elapsed} />
    </div>
  );
}

function Metric({
  label, value, accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className={styles.metric}>
      <div className={styles.label}>{label}</div>
      <div className={styles.value} style={accent ? { color: accent } : undefined}>
        {value}
      </div>
    </div>
  );
}

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2,'0')}s`;
  return `${s}s`;
}
