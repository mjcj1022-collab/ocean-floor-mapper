import { useEffect, useState } from 'react';
import { useSurveyStore } from './store/surveyStore';
import { Sidebar } from './components/nav/Sidebar';
import { Topbar } from './components/nav/Topbar';
import { DashboardPage } from './pages/DashboardPage';
import { SurveyPage } from './pages/SurveyPage';
import { TargetsPage } from './pages/TargetsPage';
import { PipelinePage, LayersPage, ExportPage, SettingsPage } from './pages/OtherPages';
import type { Page } from './components/nav/Sidebar';
import type { Target } from './types';

const DEMO_TARGETS: Target[] = [
  { id: 'TGT-001', lat: 28.4612, lon: -92.8201, depth_m: 1240, intensity: 0.94,
    shadow_length_px: 18, estimated_height_m: 5.2, footprint_px: 82,
    confidence: 0.94, classification: 'high', notes: 'Hard metallic return — elongated profile consistent with vessel wreck debris' },
  { id: 'TGT-002', lat: 28.4489, lon: -92.8034, depth_m: 980, intensity: 0.72,
    shadow_length_px: 9, estimated_height_m: 2.6, footprint_px: 34,
    confidence: 0.67, classification: 'medium', notes: 'Possible wreck debris or fishing gear entanglement' },
  { id: 'TGT-003', lat: 28.4401, lon: -92.8412, depth_m: 1580, intensity: 0.55,
    shadow_length_px: 24, estimated_height_m: 7.0, footprint_px: 140,
    confidence: 0.41, classification: 'low', notes: 'Sediment mound — likely geological feature' },
  { id: 'TGT-004', lat: 28.4681, lon: -92.7991, depth_m: 760, intensity: 0.88,
    shadow_length_px: 12, estimated_height_m: 3.5, footprint_px: 28,
    confidence: 0.88, classification: 'high', notes: 'Strong metallic return — possible cannon or anchor' },
];

export default function App() {
  const [page, setPage] = useState<Page>('dashboard');
  const { setTargets, setSession, setMetrics, metrics } = useSurveyStore();

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

    // Simulate live metric ticks
    const interval = setInterval(() => {
      setMetrics({
        depth_current_m: 760 + Math.round(Math.sin(Date.now() / 3000) * 150),
        elapsed_seconds: Math.floor((Date.now() - Date.now() % 1000) / 1000) % 3600,
        pings_recorded: 8432 + Math.floor((Date.now() / 1000) % 1000),
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const coords = {
    lat: '28.4521°N',
    lon: '92.8374°W',
    depth: metrics.depth_current_m,
  };

  const PAGE_MAP: Record<Page, React.ReactNode> = {
    dashboard: <DashboardPage />,
    survey:    <SurveyPage />,
    targets:   <TargetsPage />,
    pipeline:  <PipelinePage />,
    layers:    <LayersPage />,
    export:    <ExportPage />,
    settings:  <SettingsPage />,
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--sea-900)' }}>
      <Sidebar active={page} onChange={setPage} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        <Topbar page={page} coords={coords} />
        <main style={{ flex: 1, overflow: 'hidden', background: 'var(--sea-800)' }}>
          {PAGE_MAP[page]}
        </main>
      </div>
    </div>
  );
}
