import { create } from 'zustand';
import type { Target, Layer, LayerName, SonarParams, SubBottomParams, VesselTelemetry, ROVState, LidarLayer, MeasureMode, Measurement, PipelineStep, CoordFormat, ViewMode } from '../types';

interface SurveyStore {
  // Session
  sessionId: string;

  // Targets
  targets: Target[];
  selectedTargetId: string | null;
  setTargets: (t: Target[]) => void;
  addTarget: (t: Target) => void;
  updateTarget: (id: string, patch: Partial<Target>) => void;
  selectTarget: (id: string | null) => void;

  // Map
  viewMode: ViewMode;
  setViewMode: (m: ViewMode) => void;
  coordFormat: CoordFormat;
  setCoordFormat: (f: CoordFormat) => void;

  // Layers
  layers: Layer[];
  toggleLayer: (n: LayerName) => void;
  setLayerOpacity: (n: LayerName, v: number) => void;

  // Sonar
  sonarParams: SonarParams;
  setSonarParam: <K extends keyof SonarParams>(k: K, v: SonarParams[K]) => void;
  subParams: SubBottomParams;
  setSubParam: <K extends keyof SubBottomParams>(k: K, v: SubBottomParams[K]) => void;
  sonarRunning: boolean;
  setSonarRunning: (v: boolean) => void;

  // Measurements
  measureMode: MeasureMode;
  setMeasureMode: (m: MeasureMode) => void;
  measurements: Measurement[];
  addMeasurement: (m: Measurement) => void;
  clearMeasurements: () => void;

  // Telemetry
  telemetry: VesselTelemetry;
  setTelemetry: (t: Partial<VesselTelemetry>) => void;

  // ROVs
  rovs: ROVState[];
  setROVs: (r: ROVState[]) => void;

  // LiDAR
  lidarLayers: LidarLayer[];
  toggleLidar: (id: string) => void;

  // Pipeline
  pipelineStep: PipelineStep;
  pipelineRunning: boolean;
  setPipelineStep: (s: PipelineStep) => void;
  setPipelineRunning: (v: boolean) => void;

  // UI
  nightMode: boolean;
  toggleNightMode: () => void;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
}

const DEFAULT_LAYERS: Layer[] = [
  { name:'bathymetry', label:'Bathymetry',      color:'#1e8fd4', visible:true,  opacity:1.0 },
  { name:'sidescan',   label:'Side-scan sonar', color:'#00c896', visible:true,  opacity:0.85 },
  { name:'targets',    label:'Anomaly targets', color:'#e05050', visible:true,  opacity:1.0 },
  { name:'contours',   label:'Depth contours',  color:'#7a9ab8', visible:true,  opacity:0.5 },
  { name:'track',      label:'Survey track',    color:'#f0a500', visible:true,  opacity:0.9 },
  { name:'heatmap',    label:'Target heatmap',  color:'#ff6b35', visible:false, opacity:0.6 },
  { name:'lidar',      label:'LiDAR overlay',   color:'#8b67f0', visible:false, opacity:0.8 },
  { name:'assets',     label:'Subsea assets',   color:'#00d4ff', visible:false, opacity:1.0 },
];

const DEFAULT_TELEMETRY: VesselTelemetry = {
  lat:28.4521, lon:-92.8374, heading:92, speed_kts:4.2,
  depth_m:1240, heave_m:0.3, pitch_deg:1.2, roll_deg:-0.8,
  svp_ms:1498, tide_m:0.42, wind_kts:12, wave_m:1.1,
  coverage:73, pings:8432, elapsed_s:0, data_mbps:2.4,
};

const DEFAULT_ROVS: ROVState[] = [
  { id:'ROV-01', name:'Deep Sentinel', type:'ROV', status:'IDLE', depth_m:0, heading:0, lat:28.4521, lon:-92.8374, battery:94, speed_kts:0, tether_m:0 },
  { id:'AUV-01', name:'Scout AUV',    type:'AUV', status:'OFFLINE', depth_m:0, heading:0, lat:28.45,  lon:-92.83,  battery:78, speed_kts:0 },
];

const DEFAULT_LIDAR: LidarLayer[] = [
  { id:'ldr-01', name:'Drone Survey 2026-06', type:'above',    source:'drone',      points:2_400_000, visible:false, color:'#8b67f0', date:'2026-06-10' },
  { id:'ldr-02', name:'Vessel MBES 2026-06',  type:'below',    source:'vessel',     points:8_100_000, visible:false, color:'#00d4ff', date:'2026-06-15' },
  { id:'ldr-03', name:'Combined Surface',      type:'combined', source:'terrestrial',points:10_500_000,visible:false, color:'#00c896', date:'2026-06-15' },
];

export const useSurveyStore = create<SurveyStore>((set) => ({
  sessionId: 'SES-2026-001',

  targets: [],
  selectedTargetId: null,
  setTargets: (targets) => set({ targets }),
  addTarget: (t) => set((s) => ({ targets: [...s.targets, t] })),
  updateTarget: (id, patch) => set((s) => ({ targets: s.targets.map(t => t.id === id ? { ...t, ...patch } : t) })),
  selectTarget: (id) => set({ selectedTargetId: id }),

  viewMode: 'sonar',
  setViewMode: (viewMode) => set({ viewMode }),
  coordFormat: 'DD',
  setCoordFormat: (coordFormat) => set({ coordFormat }),

  layers: DEFAULT_LAYERS,
  toggleLayer: (n) => set((s) => ({ layers: s.layers.map(l => l.name === n ? { ...l, visible: !l.visible } : l) })),
  setLayerOpacity: (n, v) => set((s) => ({ layers: s.layers.map(l => l.name === n ? { ...l, opacity: v } : l) })),

  sonarParams: { frequency_khz:100, gain_db:40, range_m:200, pulse_length_us:100, tvg_enabled:true, filter_noise:true },
  setSonarParam: (k, v) => set((s) => ({ sonarParams: { ...s.sonarParams, [k]: v } })),
  subParams: { frequency_khz:3.5, gain_db:45, max_depth_m:2000 },
  setSubParam: (k, v) => set((s) => ({ subParams: { ...s.subParams, [k]: v } })),
  sonarRunning: true,
  setSonarRunning: (v) => set({ sonarRunning: v }),

  measureMode: 'none',
  setMeasureMode: (measureMode) => set({ measureMode }),
  measurements: [],
  addMeasurement: (m) => set((s) => ({ measurements: [...s.measurements, m] })),
  clearMeasurements: () => set({ measurements: [] }),

  telemetry: DEFAULT_TELEMETRY,
  setTelemetry: (t) => set((s) => ({ telemetry: { ...s.telemetry, ...t } })),

  rovs: DEFAULT_ROVS,
  setROVs: (rovs) => set({ rovs }),

  lidarLayers: DEFAULT_LIDAR,
  toggleLidar: (id) => set((s) => ({ lidarLayers: s.lidarLayers.map(l => l.id === id ? { ...l, visible: !l.visible } : l) })),

  pipelineStep: 'idle',
  pipelineRunning: false,
  setPipelineStep: (pipelineStep) => set({ pipelineStep }),
  setPipelineRunning: (v) => set({ pipelineRunning: v }),

  nightMode: false,
  toggleNightMode: () => set((s) => {
    document.body.classList.toggle('night-mode', !s.nightMode);
    return { nightMode: !s.nightMode };
  }),
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
}));
