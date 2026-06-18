import { useState } from 'react';
import { useSurveyStore } from '../store/surveyStore';
import { Card, SectionLabel, Badge, Btn, Divider, Row, ProgressBar } from '../components/ui';
import type { Target } from '../types';
import { MapPin, Crosshair } from 'lucide-react';

export function TargetsPage() {
  const { targets } = useSurveyStore();
  const [selected, setSelected] = useState<Target | null>(targets[0] ?? null);
  const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  const shown = filter === 'all' ? targets : targets.filter(t => t.classification === filter);

  return (
    <div style={styles.page}>
      {/* Table */}
      <div style={styles.tableWrap}>
        {/* Filters */}
        <div style={styles.toolbar}>
          <span style={{ color: 'var(--text-md)', fontSize: 12 }}>
            {shown.length} target{shown.length !== 1 ? 's' : ''}
          </span>
          <div style={{ display: 'flex', gap: 4 }}>
            {(['all','high','medium','low'] as const).map(f => (
              <button key={f}
                style={{ ...styles.filterBtn, ...(filter === f ? styles.filterBtnOn : {}) }}
                onClick={() => setFilter(f)}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Table header */}
        <div style={styles.tableHead}>
          {['ID','Class','Confidence','Depth','Height est.','Footprint','Lat','Lon'].map(h => (
            <span key={h} style={styles.th}>{h}</span>
          ))}
        </div>

        {/* Rows */}
        <div style={styles.tableBody}>
          {shown.map(t => (
            <div
              key={t.id}
              style={{ ...styles.tableRow, ...(selected?.id === t.id ? styles.tableRowOn : {}) }}
              onClick={() => setSelected(t)}
            >
              <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600, color: 'var(--text-hi)' }}>{t.id}</span>
              <span><Badge variant={t.classification as any}>{t.classification.toUpperCase()}</Badge></span>
              <span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ProgressBar value={t.confidence * 100} color={confColor(t.confidence)} />
                  <span style={{ fontSize: 11, color: 'var(--text-md)', minWidth: 30 }}>{Math.round(t.confidence * 100)}%</span>
                </div>
              </span>
              <span style={styles.td}>{t.depth_m != null ? `${t.depth_m} m` : '—'}</span>
              <span style={styles.td}>{t.estimated_height_m != null ? `${t.estimated_height_m} m` : '—'}</span>
              <span style={styles.td}>{t.footprint_px} px²</span>
              <span style={styles.tdMono}>{t.lat?.toFixed(4) ?? '—'}</span>
              <span style={styles.tdMono}>{t.lon != null ? Math.abs(t.lon).toFixed(4) : '—'}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Detail panel */}
      {selected && (
        <div style={styles.detail}>
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 700, color: 'var(--text-hi)' }}>
                {selected.id}
              </span>
              <Badge variant={selected.classification as any}>{selected.classification.toUpperCase()}</Badge>
            </div>

            <SectionLabel>Classification</SectionLabel>
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: 'var(--text-md)' }}>Confidence</span>
                <span style={{ fontSize: 12, color: confColor(selected.confidence) }}>
                  {Math.round(selected.confidence * 100)}%
                </span>
              </div>
              <ProgressBar value={selected.confidence * 100} color={confColor(selected.confidence)} />
            </div>

            <SectionLabel>Physical properties</SectionLabel>
            <Row label="Depth"           value={selected.depth_m != null ? `${selected.depth_m} m` : '—'} />
            <Row label="Est. height"     value={selected.estimated_height_m != null ? `${selected.estimated_height_m} m` : '—'} />
            <Row label="Shadow length"   value={`${selected.shadow_length_px} px`} />
            <Row label="Footprint"       value={`${selected.footprint_px} px²`} />
            <Row label="Peak intensity"  value={`${Math.round(selected.intensity * 100)}%`} />

            <Divider />
            <SectionLabel>Location</SectionLabel>
            <Row label="Latitude"  value={selected.lat?.toFixed(6) ?? '—'} mono />
            <Row label="Longitude" value={selected.lon != null ? Math.abs(selected.lon).toFixed(6) + '°W' : '—'} mono />

            {selected.notes && (
              <>
                <Divider />
                <SectionLabel>Notes</SectionLabel>
                <p style={{ fontSize: 12, color: 'var(--text-md)', lineHeight: 1.6 }}>{selected.notes}</p>
              </>
            )}

            <Divider />
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn variant="primary" size="sm" style={{ flex: 1, justifyContent: 'center' }}
                icon={<MapPin size={13} />}>
                Pan to target
              </Btn>
              <Btn variant="ghost" size="sm" style={{ flex: 1, justifyContent: 'center' }}
                icon={<Crosshair size={13} />}>
                Inspect
              </Btn>
            </div>
          </Card>

          {/* ROV status */}
          <Card>
            <SectionLabel>ROV verification</SectionLabel>
            <Row label="ROV status"    value="Not deployed" />
            <Row label="Last dive"     value="—" />
            <Row label="Visual conf."  value="Pending" />
            <div style={{ marginTop: 12 }}>
              <Btn variant="secondary" size="sm" style={{ width: '100%', justifyContent: 'center' }}>
                Schedule ROV dive
              </Btn>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function confColor(c: number): string {
  if (c >= 0.8) return 'var(--red)';
  if (c >= 0.5) return 'var(--amber)';
  return 'var(--teal)';
}

const styles: Record<string, React.CSSProperties> = {
  page: { display: 'flex', gap: 16, padding: 20, height: '100%', overflow: 'hidden' },
  tableWrap: { flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' },
  toolbar: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 12,
  },
  filterBtn: {
    padding: '4px 12px', borderRadius: 'var(--radius)',
    background: 'var(--surface)', border: '1px solid var(--border)',
    color: 'var(--text-md)', fontSize: 12,
  },
  filterBtnOn: {
    background: 'var(--teal-lo)', borderColor: 'rgba(29,176,130,0.4)',
    color: 'var(--teal)',
  },
  tableHead: {
    display: 'grid',
    gridTemplateColumns: '90px 80px 1fr 90px 90px 80px 100px 100px',
    padding: '8px 12px',
    background: 'var(--surface)',
    borderRadius: 'var(--radius) var(--radius) 0 0',
    border: '1px solid var(--border)',
    borderBottom: 'none',
  },
  th: { fontSize: 10, fontWeight: 600, color: 'var(--text-lo)', textTransform: 'uppercase', letterSpacing: '0.06em' },
  tableBody: { flex: 1, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '0 0 var(--radius) var(--radius)' },
  tableRow: {
    display: 'grid',
    gridTemplateColumns: '90px 80px 1fr 90px 90px 80px 100px 100px',
    padding: '10px 12px',
    borderBottom: '1px solid var(--border)',
    cursor: 'pointer', transition: 'background 0.1s', alignItems: 'center',
  },
  tableRowOn: { background: 'rgba(29,176,130,0.06)' },
  td:     { fontSize: 12, color: 'var(--text-md)', fontVariantNumeric: 'tabular-nums' },
  tdMono: { fontSize: 11, color: 'var(--text-md)', fontFamily: 'monospace', fontVariantNumeric: 'tabular-nums' },
  detail: { width: 260, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' },
};
