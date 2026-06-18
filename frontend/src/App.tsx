import { useEffect } from 'react';
import { useState } from 'react';
import { useSurveyStore } from './store/surveyStore';
import { Sidebar } from './components/nav/Sidebar';
import { Topbar } from './components/nav/Topbar';
import { DashboardPage }  from './pages/DashboardPage';
import { SurveyPage }     from './pages/SurveyPage';
import { TargetsPage }    from './pages/TargetsPage';
import { ComparisonPage } from './pages/ComparisonPage';
import { PipelinePage, ExportPage, LidarPage, ROVPage, AssetsPage, SettingsPage } from './pages/OtherPages';
import type { Page, Target } from './types';
import { classifyTarget } from './utils/aiClassify';
import { shadowToHeight } from './utils/coords';

function makeTarget(_i:number, id:string, lat:number, lon:number, depth:number, conf:number, intensity:number, shadowM:number, px:number, py:number, manual=false): Target {
  const {type,ai_label,ai_description}=classifyTarget(conf,intensity);
  return {
    id, lat, lon, depth_m:depth, intensity, confidence:conf,
    classification:conf>=0.8?'high':conf>=0.55?'medium':'low',
    type, status:'OPEN', notes:'', ai_label, ai_description,
    dims:{ length_m:+(Math.random()*22+3).toFixed(1), width_m:+(Math.random()*5+1).toFixed(1), height_m:shadowToHeight(shadowM), shadow_length_m:shadowM, area_m2:undefined, volume_m3:undefined },
    created_at:new Date().toISOString(), created_by:'AI auto-detect',
    pixel_x:px, pixel_y:py, manual,
  };
}

const DEMO_TARGETS: Target[] = [
  makeTarget(0,'TGT-001',28.4612,-92.8201,1240,0.94,0.94,4.8,0.42,0.38),
  makeTarget(1,'TGT-002',28.4489,-92.8034, 980,0.67,0.72,2.1,0.61,0.55),
  makeTarget(2,'TGT-003',28.4401,-92.8412,1580,0.41,0.55,5.9,0.28,0.65),
  makeTarget(3,'TGT-004',28.4681,-92.7991, 760,0.88,0.88,3.2,0.73,0.29),
];

export default function App() {
  const [page, setPage] = useState<Page>('dashboard');
  const { setTargets, setTelemetry, telemetry } = useSurveyStore();

  useEffect(()=>{
    setTargets(DEMO_TARGETS);
    // Animate telemetry
    const id=setInterval(()=>{
      setTelemetry({
        depth_m: Math.round(760+Math.sin(Date.now()/3000)*180),
        heave_m: +((Math.sin(Date.now()/800)*0.6).toFixed(2)),
        pitch_deg: +((Math.sin(Date.now()/1200)*2.1).toFixed(1)),
        roll_deg: +((Math.cos(Date.now()/1100)*1.8).toFixed(1)),
        pings: telemetry.pings + 1,
        elapsed_s: Math.floor((Date.now()/1000)%86400),
        speed_kts: +(4.1+Math.sin(Date.now()/5000)*0.4).toFixed(1),
      });
    },800);
    return()=>clearInterval(id);
  },[]);

  const PAGE:Record<Page,React.ReactNode>={
    dashboard:  <DashboardPage />,
    sonar:      <SurveyPage />,
    targets:    <TargetsPage />,
    comparison: <ComparisonPage />,
    lidar:      <LidarPage />,
    rov:        <ROVPage />,
    assets:     <AssetsPage />,
    pipeline:   <PipelinePage />,
    export:     <ExportPage />,
    settings:   <SettingsPage />,
  };

  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden', background:'var(--bg)' }}>
      <Sidebar active={page} onChange={setPage} />
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0 }}>
        <Topbar page={page} />
        <main style={{ flex:1, overflow:'hidden', background:'var(--bg2)' }}>
          {PAGE[page]}
        </main>
      </div>
    </div>
  );
}
