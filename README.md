# Ocean Floor Mapper

A modular Python + React framework for unified ocean floor mapping workflows — integrating ArcGIS, QGIS, SonarWiz, Hypack, and Google Earth Pro into a single pipeline.

## Architecture

```
ocean-floor-mapper/
├── core/                   # Core data pipeline
│   ├── data_io/            # Sonar + GPS loaders
│   ├── processing/         # Noise reduction, mosaicking, contour generation
│   └── visualization/      # ArcGIS/QGIS/KML exporters, 3D model, heatmap
├── integrations/           # Software-specific connectors
│   ├── arcgis/             # ArcGIS Pro / arcpy automation
│   ├── qgis/               # PyQGIS automation
│   ├── sonarwiz/           # SonarWiz CLI/COM connector
│   ├── hypack/             # Hypack connector
│   └── google_earth/       # KML exporter
├── automation/             # End-to-end survey pipelines
├── utils/                  # Config, logging, helpers
├── frontend/               # React dashboard (Vite + TypeScript)
├── data/                   # Raw, processed, output data
├── tests/                  # Unit + integration tests
└── docs/                   # API docs, survey guides
```

## Quickstart

```bash
# Python backend
pip install -r requirements.txt
python main.py --sonar data/raw/scan1.xyx --gps data/raw/gps.csv

# React dashboard
cd frontend
npm install
npm run dev
```

## Software Requirements

| Software | Purpose | Notes |
|---|---|---|
| ArcGIS Pro | GIS mapping + spatial analysis | Requires license |
| QGIS 3.28+ | Open-source GIS | Free |
| SonarWiz | Side-scan + multibeam processing | Requires license |
| Hypack | Hydrographic survey | Requires license |
| Google Earth Pro | KML visualization | Free |

## Pipeline

```
Sonar Files → Load → Noise Reduction → Mosaic → ArcGIS Export → Contours → Report
     ↑                                                               ↓
  GPS Data                                                      QGIS / KML
```

## Target Detection

The anomaly detection module (`automation/target_analysis.py`) flags hard sonar returns by:
- Intensity threshold relative to local seafloor baseline
- Shadow geometry analysis (object height estimation)
- Cross-referencing historical wreck databases (NOAA)

## License

MIT
