// ─── Survey session ────────────────────────────────────────────────────────

export interface SurveyBounds {
  min_lat: number;
  max_lat: number;
  min_lon: number;
  max_lon: number;
}

export interface SurveySession {
  id: string;
  created_at: string;
  sonar_files: string[];
  gps_file: string;
  status: 'pending' | 'running' | 'complete' | 'error';
  progress_step: PipelineStep;
  mosaic_shape?: [number, number];
  bounds?: SurveyBounds;
  targets_count: number;
  outputs: SessionOutputs;
}

export interface SessionOutputs {
  mosaic?: string;
  geotiff?: string;
  kml?: string;
  report?: string;
  targets_json?: string;
  heatmap_png?: string;
  contours_geojson?: string;
}

// ─── Pipeline ─────────────────────────────────────────────────────────────

export type PipelineStep =
  | 'idle'
  | 'sonar_load'
  | 'gps_load'
  | 'noise_reduce'
  | 'mosaic'
  | 'target_detection'
  | 'arcgis_export'
  | 'geotiff_export'
  | 'kml_export'
  | 'report'
  | 'complete'
  | 'error';

export interface PipelineStepInfo {
  key: PipelineStep;
  label: string;
  description: string;
}

export const PIPELINE_STEPS: PipelineStepInfo[] = [
  { key: 'sonar_load',      label: 'Load sonar',       description: 'Parse sonar files' },
  { key: 'gps_load',        label: 'Load GPS',          description: 'Parse navigation track' },
  { key: 'noise_reduce',    label: 'Noise filter',      description: 'TVG + despeckle' },
  { key: 'mosaic',          label: 'Mosaic stitch',     description: 'Georeference pings' },
  { key: 'target_detection',label: 'Detect targets',    description: 'Anomaly analysis' },
  { key: 'arcgis_export',   label: 'ArcGIS export',    description: 'Raster + contours' },
  { key: 'kml_export',      label: 'KML export',        description: 'Google Earth' },
  { key: 'report',          label: 'Generate report',   description: 'PDF survey report' },
];

// ─── Targets ───────────────────────────────────────────────────────────────

export type TargetClass = 'high' | 'medium' | 'low';

export interface Target {
  id: string;
  lat: number | null;
  lon: number | null;
  depth_m: number | null;
  intensity: number;
  shadow_length_px: number;
  estimated_height_m: number | null;
  footprint_px: number;
  confidence: number;
  classification: TargetClass;
  notes: string;
}

// ─── Sonar layers ─────────────────────────────────────────────────────────

export type LayerName =
  | 'bathymetry'
  | 'sonar'
  | 'targets'
  | 'contours'
  | 'track'
  | 'heatmap';

export interface LayerConfig {
  name: LayerName;
  label: string;
  color: string;
  visible: boolean;
  opacity: number;
}

// ─── Software integrations ────────────────────────────────────────────────

export type IntegrationStatus = 'connected' | 'disconnected' | 'error' | 'syncing';

export interface Integration {
  name: string;
  status: IntegrationStatus;
  last_sync?: string;
  version?: string;
}

// ─── Map view state ───────────────────────────────────────────────────────

export type ViewMode = 'sonar' | '3d' | 'heatmap' | 'contour';

export interface MapViewState {
  mode: ViewMode;
  center: [number, number];   // [lat, lon]
  zoom: number;
  selectedTarget: string | null;
}

// ─── Sonar parameters ─────────────────────────────────────────────────────

export interface SonarParams {
  frequency_khz: number;
  gain_db: number;
  range_m: number;
  pulse_length_us: number;
}

// ─── GPS point ────────────────────────────────────────────────────────────

export interface GPSPoint {
  lat: number;
  lon: number;
  timestamp?: string;
  altitude?: number;
  heading?: number;
  speed?: number;
}

// ─── Metrics ──────────────────────────────────────────────────────────────

export interface SurveyMetrics {
  coverage_pct: number;
  vessel_speed_kts: number;
  data_rate_mbps: number;
  depth_current_m: number;
  pings_recorded: number;
  elapsed_seconds: number;
}
