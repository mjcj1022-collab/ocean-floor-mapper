import { useEffect } from 'react';
import { useSurveyStore } from './store/surveyStore';
import { SonarCanvas } from './components/SonarCanvas';
import { LayerPanel } from './components/LayerPanel';
import { TargetPanel } from './components/TargetPanel';
import { PipelineBar } from './components/PipelineBar';
import { MetricsBar } from './components/MetricsBar';
import type { Target, ViewMode } from './types';
import './App.css';

const DEMO_TARGETS: Target[] = [
  { id: 'TGT-001', lat: 28.4612, lon: -92.8201, depth_m: 1240, intensity: 0.94,
    shadow_length_px: 18, estimated_height_m: 5.2, footprint_px: 82,
    confidence: 0.94, classification: 'high', notes: 'Hard metallic return' },
  { id: 'TGT-002', lat: 28.4489, lon: -92.8034, depth_m: 980, intensity: 0.72,
    shadow_length_px: 9, estimated_height_m: 2.6, footprint_px: 34,
    confidence: 0.67, classification: 'medium', notes: 'Possible wreck debris' },
  { id: 'TGT-003', lat: 28.4401, lon: -92.8412, depth_m: 1580, intensity: 0.55,
    shadow_length_px: 24, estimated_height_m: 7.0, footprint_px: 140,
    confidence: 0.41, classification: 'low', notes: 'Sediment mound' },
  { id: 'TGT-004', lat: 28.4681, lon: -92.7991, depth_m: 760, intensity: 0.88,
    shadow_length_px: 12, estimated_height_m: 3.5, footprint_px: 28,
    confidence: 0.88, classification: 'high', notes: 'Metallic return, elongated' },
];

const VIEW_MODES: Array<{ key: ViewMode; icon: string; label: string }> = [
  { key: 'sonar',   icon: '≋', label: 'Sonar' },
  { key: '3d',      icon: '⬡', label: '3D' },
  { key: 'heatmap', icon: '◈', label: 'Heatmap' },
  { key: 'contour', icon: '≣', label: 'Contours' },
];

export default function App() {
  const { setTargets, mapView, setViewMode, setSession } = useSurveyStore();

  useEffect(() => {
    setTargets(DEMO_TARGETS);
    setSession({
      id: 'demo-session-001',
      created_at: new Date().toISOString(),
      sonar_files: ['scan1.xyx', 'scan2.xyx', 'scan3.xyx'],
      gps_file: 'track.gpx',
      status: 'running',
      progress_step: 'mosaic',
      mosaic_shape: [4096, 8192],
      bounds: { min_lat: 28.42, max_lat: 28.49, min_lon: -92.87, max_lon: -92.78 },
      targets_count: DEMO_TARGETS.length,
      outputs: {},
    });
  }, []);

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-left">
          <div className="status-dot" />
          <div>
            <div className="topbar-title">Ocean Floor Mapper</div>
            <div className="topbar-sub">Gulf of Mexico Block 42 · Active Pass 3/8</div>
          </div>
        </div>
        <div className="view-switcher">
          {VIEW_MODES.map((m) => (
            <button
              key={m.key}
              className={`view-btn ${mapView.mode === m.key ? 'view-btn-active' : ''}`}
              onClick={() => setViewMode(m.key)}
              title={m.label}
            >
              {m.icon} {m.label}
            </button>
          ))}
        </div>
        <div className="coord-display">
          <span>LAT 28.4521°N</span>
          <span>LON 92.8374°W</span>
        </div>
      </header>

      <MetricsBar />

      <div className="main-layout">
        <aside className="side-panel">
          <LayerPanel />
        </aside>
        <main className="map-area">
          <SonarCanvas />
          <div className="legend">
            <div className="legend-top">0 m</div>
            <div className="legend-gradient" />
            <div className="legend-bottom">4500 m</div>
          </div>
        </main>
        <aside className="side-panel">
          <TargetPanel />
        </aside>
      </div>

      <PipelineBar />
    </div>
  );
}
