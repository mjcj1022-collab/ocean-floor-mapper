import { create } from 'zustand';
import type {
  Target, LayerConfig, LayerName, MapViewState, SonarParams,
  SurveyMetrics, Integration, IntegrationStatus, PipelineStep,
  SurveySession, ViewMode,
} from '../types';

interface SurveyStore {
  // ── Session ──────────────────────────────────────────────────────
  session: SurveySession | null;
  setSession: (s: SurveySession | null) => void;
  updatePipelineStep: (step: PipelineStep) => void;

  // ── Targets ──────────────────────────────────────────────────────
  targets: Target[];
  setTargets: (t: Target[]) => void;
  selectedTargetId: string | null;
  selectTarget: (id: string | null) => void;

  // ── Map view ─────────────────────────────────────────────────────
  mapView: MapViewState;
  setViewMode: (mode: ViewMode) => void;
  setMapCenter: (center: [number, number]) => void;

  // ── Layers ───────────────────────────────────────────────────────
  layers: LayerConfig[];
  toggleLayer: (name: LayerName) => void;
  setLayerOpacity: (name: LayerName, opacity: number) => void;

  // ── Sonar params ─────────────────────────────────────────────────
  sonarParams: SonarParams;
  setSonarParam: <K extends keyof SonarParams>(key: K, val: SonarParams[K]) => void;

  // ── Metrics ──────────────────────────────────────────────────────
  metrics: SurveyMetrics;
  setMetrics: (m: Partial<SurveyMetrics>) => void;

  // ── Integrations ─────────────────────────────────────────────────
  integrations: Integration[];
  setIntegrationStatus: (name: string, status: IntegrationStatus) => void;

  // ── Pipeline ─────────────────────────────────────────────────────
  pipelineRunning: boolean;
  setPipelineRunning: (v: boolean) => void;
}

const DEFAULT_LAYERS: LayerConfig[] = [
  { name: 'bathymetry', label: 'Bathymetry',      color: '#185FA5', visible: true,  opacity: 1.0 },
  { name: 'sonar',      label: 'Side-scan sonar', color: '#1D9E75', visible: true,  opacity: 0.8 },
  { name: 'targets',    label: 'Anomaly targets', color: '#E24B4A', visible: true,  opacity: 1.0 },
  { name: 'contours',   label: 'Depth contours',  color: '#888780', visible: true,  opacity: 0.6 },
  { name: 'track',      label: 'Survey track',    color: '#EF9F27', visible: true,  opacity: 0.9 },
  { name: 'heatmap',    label: 'Target heatmap',  color: '#D85A30', visible: false, opacity: 0.5 },
];

const DEFAULT_INTEGRATIONS: Integration[] = [
  { name: 'ArcGIS Pro',   status: 'connected' },
  { name: 'QGIS',         status: 'connected' },
  { name: 'SonarWiz',     status: 'connected' },
  { name: 'Hypack',       status: 'syncing'   },
  { name: 'Google Earth', status: 'connected' },
];

export const useSurveyStore = create<SurveyStore>((set) => ({
  // Session
  session: null,
  setSession: (session) => set({ session }),
  updatePipelineStep: (step) =>
    set((state) => ({
      session: state.session ? { ...state.session, progress_step: step } : null,
    })),

  // Targets
  targets: [],
  setTargets: (targets) => set({ targets }),
  selectedTargetId: null,
  selectTarget: (id) => set({ selectedTargetId: id }),

  // Map view
  mapView: {
    mode: 'sonar',
    center: [28.45, -92.83],
    zoom: 10,
    selectedTarget: null,
  },
  setViewMode: (mode) =>
    set((state) => ({ mapView: { ...state.mapView, mode } })),
  setMapCenter: (center) =>
    set((state) => ({ mapView: { ...state.mapView, center } })),

  // Layers
  layers: DEFAULT_LAYERS,
  toggleLayer: (name) =>
    set((state) => ({
      layers: state.layers.map((l) =>
        l.name === name ? { ...l, visible: !l.visible } : l
      ),
    })),
  setLayerOpacity: (name, opacity) =>
    set((state) => ({
      layers: state.layers.map((l) =>
        l.name === name ? { ...l, opacity } : l
      ),
    })),

  // Sonar params
  sonarParams: {
    frequency_khz: 100,
    gain_db: 40,
    range_m: 200,
    pulse_length_us: 100,
  },
  setSonarParam: (key, val) =>
    set((state) => ({ sonarParams: { ...state.sonarParams, [key]: val } })),

  // Metrics
  metrics: {
    coverage_pct: 73,
    vessel_speed_kts: 4.2,
    data_rate_mbps: 2.4,
    depth_current_m: 1240,
    pings_recorded: 8_432,
    elapsed_seconds: 0,
  },
  setMetrics: (m) =>
    set((state) => ({ metrics: { ...state.metrics, ...m } })),

  // Integrations
  integrations: DEFAULT_INTEGRATIONS,
  setIntegrationStatus: (name, status) =>
    set((state) => ({
      integrations: state.integrations.map((i) =>
        i.name === name ? { ...i, status } : i
      ),
    })),

  // Pipeline
  pipelineRunning: false,
  setPipelineRunning: (v) => set({ pipelineRunning: v }),
}));
