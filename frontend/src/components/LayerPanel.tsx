import { useSurveyStore } from '../store/surveyStore';
import type { LayerName } from '../types';
import styles from './LayerPanel.module.css';

export function LayerPanel() {
  const { layers, toggleLayer, sonarParams, setSonarParam } =
    useSurveyStore();

  return (
    <div className={styles.panel}>
      <div className={styles.section}>
        <div className={styles.sectionLabel}>Layers</div>
        {layers.map((layer) => (
          <div key={layer.name} className={styles.layerRow}>
            <div className={styles.layerLeft}>
              <div
                className={styles.swatch}
                style={{ background: layer.color }}
              />
              <span className={styles.layerName}>{layer.label}</span>
            </div>
            <button
              className={`${styles.toggle} ${layer.visible ? styles.toggleOn : ''}`}
              onClick={() => toggleLayer(layer.name as LayerName)}
              aria-label={`Toggle ${layer.label}`}
            />
          </div>
        ))}
      </div>

      <div className={styles.section}>
        <div className={styles.sectionLabel}>Sonar settings</div>

        <SliderRow
          label="Frequency"
          value={sonarParams.frequency_khz}
          min={50} max={400} step={50}
          unit="kHz"
          onChange={(v) => setSonarParam('frequency_khz', v)}
        />
        <SliderRow
          label="Gain"
          value={sonarParams.gain_db}
          min={20} max={80} step={1}
          unit="dB"
          onChange={(v) => setSonarParam('gain_db', v)}
        />
        <SliderRow
          label="Range"
          value={sonarParams.range_m}
          min={50} max={500} step={50}
          unit="m"
          onChange={(v) => setSonarParam('range_m', v)}
        />
        <SliderRow
          label="Pulse"
          value={sonarParams.pulse_length_us}
          min={10} max={500} step={10}
          unit="µs"
          onChange={(v) => setSonarParam('pulse_length_us', v)}
        />
      </div>
    </div>
  );
}

function SliderRow({
  label, value, min, max, step, unit, onChange,
}: {
  label: string;
  value: number;
  min: number; max: number; step: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className={styles.sliderRow}>
      <div className={styles.sliderHeader}>
        <span>{label}</span>
        <span className={styles.sliderValue}>{value} {unit}</span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={styles.slider}
      />
    </div>
  );
}
