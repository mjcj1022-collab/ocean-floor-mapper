import { useState } from 'react';
import { useSurveyStore } from '../store/surveyStore';
import { Card, SectionLabel, Btn, Badge, Row, Toggle } from '../components/ui';
import { PIPELINE_STEPS } from '../types';
import type { PipelineStep } from '../types';
import { CheckCircle2, Circle, Loader, AlertCircle, Download, FileText, Map, Globe } from 'lucide-react';

// ─── Pipeline page ────────────────────────────────────────────────────────

export function PipelinePage() {
  const { session, pipelineRunning, setPipelineRunning, updatePipelineStep, targets } = useSurveyStore();
  const current = session?.progress_step ?? 'idle';

  function getState(key: PipelineStep): 'done' | 'active' | 'pending' | 'error' {
    const order = PIPELINE_STEPS.map(s => s.key);
    const ci = order.indexOf(current as any);
    const si = order.indexOf(key);
    if (current === 'error' && si === ci) return 'error';
    if (si < ci) return 'done';
    if (si === ci) return 'active';
    return 'pending';
  }

  async function run() {
    if (pipelineRunning) return;
    setPipelineRunning(true);
    for (const step of PIPELINE_STEPS) {
      updatePipelineStep(step.key);
      await new Promise(r => setTimeout(r, 700 + Math.random() * 500));
    }
    updatePipelineStep('complete');
    setPipelineRunning(false);
  }

  const ICONS = { done: CheckCircle2, active: Loader, pending: Circle, error: AlertCircle };
  const COLORS = { done: 'var(--teal)', active: 'var(--blue)', pending: 'var(--text-lo)', error: 'var(--red)' };

  return (
    <div style={{ padding: 20, display: 'flex', gap: 16, height: '100%', overflow: 'auto' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Card>
          <SectionLabel>Survey pipeline</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 16 }}>
            {PIPELINE_STEPS.map((step) => {
              const state = getState(step.key);
              const Icon = ICONS[state];
              const color = COLORS[state];
              return (
                <div key={step.key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: state === 'active' ? 'var(--blue-lo)' : 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid ' + (state === 'active' ? 'rgba(58,143,214,0.3)' : 'var(--border)') }}>
                  <Icon size={16} color={color} style={state === 'active' ? { animation: 'spin 1s linear infinite' } : undefined} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: state === 'active' ? 'var(--text-hi)' : 'var(--text-md)' }}>{step.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-lo)' }}>{step.description}</div>
                  </div>
                  <Badge variant={state === 'done' ? 'success' : state === 'active' ? 'info' : state === 'error' ? 'high' : 'neutral'}>
                    {state}
                  </Badge>
                </div>
              );
            })}
          </div>
          <Btn variant="primary" style={{ width: '100%', justifyContent: 'center' }} onClick={run} disabled={pipelineRunning}>
            {pipelineRunning ? '⟳ Running pipeline…' : '▶ Run full pipeline'}
          </Btn>
        </Card>
      </div>

      <div style={{ width: 260, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Card>
          <SectionLabel>Results</SectionLabel>
          <Row label="Targets detected" value={targets.length} />
          <Row label="Mosaic coverage"  value={`${useSurveyStore.getState().metrics.coverage_pct}%`} />
          <Row label="Session ID"       value="demo-001" mono />
        </Card>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── Layers page ──────────────────────────────────────────────────────────

export function LayersPage() {
  const { layers, toggleLayer, setLayerOpacity } = useSurveyStore();

  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12, height: '100%', overflowY: 'auto' }}>
      <Card>
        <SectionLabel>Map layers</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {layers.map(layer => (
            <div key={layer.name} style={{ background: 'var(--surface2)', borderRadius: 'var(--radius)', padding: '10px 12px', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: layer.visible ? 10 : 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 12, height: 12, borderRadius: 3, background: layer.color }} />
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-hi)' }}>{layer.label}</span>
                </div>
                <Toggle on={layer.visible} onChange={() => toggleLayer(layer.name as any)} />
              </div>
              {layer.visible && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-lo)', marginBottom: 4 }}>
                    <span>Opacity</span>
                    <span>{Math.round(layer.opacity * 100)}%</span>
                  </div>
                  <input type="range" min={0} max={1} step={0.01} value={layer.opacity}
                    onChange={e => setLayerOpacity(layer.name as any, Number(e.target.value))}
                    style={{ width: '100%', accentColor: layer.color }} />
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ─── Export page ─────────────────────────────────────────────────────────

export function ExportPage() {
  const [exporting, setExporting] = useState<string | null>(null);

  async function doExport(format: string) {
    setExporting(format);
    await new Promise(r => setTimeout(r, 1500));
    setExporting(null);
  }

  const exports = [
    { format: 'GeoTIFF',  icon: <Map size={18} />,      desc: 'Georeferenced mosaic raster for GIS software',      ext: '.tif' },
    { format: 'GeoJSON',  icon: <Globe size={18} />,     desc: 'Contour lines and target locations (WGS 84)',        ext: '.geojson' },
    { format: 'KML',      icon: <Globe size={18} />,     desc: 'Survey track and targets for Google Earth',          ext: '.kml' },
    { format: 'Shapefile',icon: <Map size={18} />,       desc: 'ESRI Shapefile for ArcGIS / QGIS',                  ext: '.shp' },
    { format: 'CSV',      icon: <FileText size={18} />,  desc: 'Target table with coordinates and confidence',       ext: '.csv' },
    { format: 'PDF Report',icon: <FileText size={18} />, desc: 'Full survey report with maps and target summary',    ext: '.pdf' },
  ];

  return (
    <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, height: '100%', overflowY: 'auto', alignContent: 'start' }}>
      {exports.map(ex => (
        <Card key={ex.format}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ color: 'var(--teal)', marginTop: 2 }}>{ex.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-hi)', marginBottom: 3 }}>{ex.format}</div>
              <div style={{ fontSize: 11, color: 'var(--text-lo)', marginBottom: 12 }}>{ex.desc}</div>
              <Btn
                variant="secondary"
                size="sm"
                icon={<Download size={13} />}
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => doExport(ex.format)}
                disabled={exporting === ex.format}
              >
                {exporting === ex.format ? 'Exporting…' : `Export ${ex.ext}`}
              </Btn>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ─── Settings page ────────────────────────────────────────────────────────

export function SettingsPage() {
  const [vessel, setVessel] = useState('R/V Surveyor');
  const [operator, setOperator] = useState('Michael Jeffreys');
  const [crs, setCrs] = useState('WGS 84 (EPSG:4326)');
  const [threshold, setThreshold] = useState(75);

  return (
    <div style={{ padding: 20, display: 'flex', gap: 16, height: '100%', overflowY: 'auto', alignItems: 'flex-start' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Card>
          <SectionLabel>Survey configuration</SectionLabel>
          {[
            { label: 'Vessel name', value: vessel, onChange: setVessel },
            { label: 'Operator', value: operator, onChange: setOperator },
            { label: 'Coordinate reference system', value: crs, onChange: setCrs },
          ].map(f => (
            <div key={f.label} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: 'var(--text-lo)', marginBottom: 4 }}>{f.label}</div>
              <input value={f.value} onChange={e => f.onChange(e.target.value)}
                style={styles.input} />
            </div>
          ))}
        </Card>

        <Card>
          <SectionLabel>Detection thresholds</SectionLabel>
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
              <span style={{ color: 'var(--text-md)' }}>Anomaly intensity threshold</span>
              <span style={{ color: 'var(--text-hi)', fontVariantNumeric: 'tabular-nums' }}>{threshold}%</span>
            </div>
            <input type="range" min={50} max={99} value={threshold}
              onChange={e => setThreshold(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--teal)' }} />
          </div>
          <Row label="Min blob size"    value="4 px" />
          <Row label="Max targets"      value="50" />
          <Row label="Shadow ratio min" value="1.2" />
        </Card>
      </div>

      <div style={{ width: 260, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Card>
          <SectionLabel>Software connections</SectionLabel>
          {[
            { name: 'ArcGIS Pro', ok: true },
            { name: 'QGIS 3.28',  ok: true },
            { name: 'SonarWiz',   ok: true },
            { name: 'Hypack',     ok: false },
            { name: 'Google Earth', ok: true },
          ].map(s => (
            <div key={s.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0' }}>
              <span style={{ fontSize: 12, color: 'var(--text-md)' }}>{s.name}</span>
              <Badge variant={s.ok ? 'success' : 'high'}>{s.ok ? 'Connected' : 'Offline'}</Badge>
            </div>
          ))}
        </Card>
        <Card>
          <SectionLabel>About</SectionLabel>
          <Row label="Version"   value="v0.2.0" />
          <Row label="Python"    value="3.11" />
          <Row label="React"     value="18.3" />
          <Row label="Repo"      value="ocean-floor-mapper" mono />
        </Card>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  input: {
    width: '100%', padding: '7px 10px',
    background: 'var(--surface2)', border: '1px solid var(--border2)',
    borderRadius: 'var(--radius)', color: 'var(--text-hi)', fontSize: 13,
  },
};
