export type TargetClass = 'high' | 'medium' | 'low';
export type TargetType  = 'UNKNOWN' | 'WRECK' | 'PIPELINE' | 'CABLE' | 'DEBRIS' | 'BOULDER' | 'UXO' | 'ANCHOR' | 'ROV' | 'STRUCTURE';
export type TargetStatus = 'OPEN' | 'REVIEWED' | 'CONFIRMED' | 'ASSIGNED' | 'CLOSED';
export interface TargetDimensions { length_m?:number; width_m?:number; height_m?:number; area_m2?:number; volume_m3?:number; shadow_length_m?:number; }
export interface Target { id:string; lat:number|null; lon:number|null; depth_m:number|null; intensity:number; confidence:number; classification:TargetClass; type:TargetType; status:TargetStatus; notes:string; dims:TargetDimensions; ai_label?:string; ai_description?:string; created_at:string; created_by:string; pixel_x?:number; pixel_y?:number; manual?:boolean; }
export interface SonarParams { frequency_khz:number; gain_db:number; range_m:number; pulse_length_us:number; tvg_enabled:boolean; filter_noise:boolean; }
export interface SubBottomParams { frequency_khz:number; gain_db:number; max_depth_m:number; }
export interface HistoricalSurvey { id:string; name:string; date:string; vessel:string; targets:number; coverage:number; notes:string; }
export type ComparisonMode = 'side-by-side' | 'slider' | 'delta';
export interface LidarLayer { id:string; name:string; type:'above'|'below'|'combined'; source:'drone'|'vessel'|'satellite'|'terrestrial'; points:number; visible:boolean; color:string; date:string; }
export interface ROVState { id:string; name:string; type:'ROV'|'AUV'|'ASV'|'DRONE'; status:'IDLE'|'DIVING'|'SURVEYING'|'SURFACING'|'OFFLINE'; depth_m:number; heading:number; lat:number; lon:number; battery:number; speed_kts:number; tether_m?:number; }
export interface VesselTelemetry { lat:number; lon:number; heading:number; speed_kts:number; depth_m:number; heave_m:number; pitch_deg:number; roll_deg:number; svp_ms:number; tide_m:number; wind_kts:number; wave_m:number; coverage:number; pings:number; elapsed_s:number; data_mbps:number; }
export type LayerName = 'bathymetry'|'sidescan'|'targets'|'contours'|'track'|'heatmap'|'lidar'|'assets';
export interface Layer { name:LayerName; label:string; color:string; visible:boolean; opacity:number; }
export type MeasureMode = 'none'|'length'|'width'|'area'|'height';
export interface Measurement { id:string; mode:MeasureMode; points:Array<{x:number;y:number}>; result:number; unit:string; label:string; }
export type PipelineStep = 'idle'|'sonar_load'|'gps_load'|'noise_reduce'|'mosaic'|'target_detection'|'arcgis_export'|'kml_export'|'report'|'complete'|'error';
export const PIPELINE_STEPS = [
  { key: 'sonar_load' as PipelineStep, label:'Load sonar', desc:'Parse sonar files' },
  { key: 'gps_load' as PipelineStep, label:'Load GPS', desc:'Parse navigation' },
  { key: 'noise_reduce' as PipelineStep, label:'Noise filter', desc:'TVG + despeckle' },
  { key: 'mosaic' as PipelineStep, label:'Mosaic stitch', desc:'Georeference pings' },
  { key: 'target_detection' as PipelineStep, label:'AI detect', desc:'AI anomaly scan' },
  { key: 'arcgis_export' as PipelineStep, label:'ArcGIS', desc:'Raster + contours' },
  { key: 'kml_export' as PipelineStep, label:'KML export', desc:'Google Earth' },
  { key: 'report' as PipelineStep, label:'Report', desc:'PDF survey report' },
];
export interface SubseaAsset { id:string; name:string; type:'PIPELINE'|'CABLE'|'TURBINE'|'PLATFORM'|'MOORING'; risk:'LOW'|'MEDIUM'|'HIGH'|'CRITICAL'; last_insp:string; status:'OPERATIONAL'|'DEGRADED'|'CRITICAL'|'DECOMMISSIONED'; length_km?:number; }
export type CoordFormat = 'DD' | 'DMS' | 'UTM';
export type ViewMode = 'sonar' | '3d' | 'heatmap' | 'contour';
export type Page = 'dashboard'|'sonar'|'targets'|'comparison'|'lidar'|'rov'|'assets'|'pipeline'|'export'|'settings';
