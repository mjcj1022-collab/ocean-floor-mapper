import { useSurveyStore } from '../store/surveyStore';
import { PIPELINE_STEPS } from '../types';
import type { PipelineStep } from '../types';
import styles from './PipelineBar.module.css';

export function PipelineBar() {
  const { session, pipelineRunning, setPipelineRunning, updatePipelineStep } =
    useSurveyStore();

  const currentStep = session?.progress_step ?? 'idle';

  function getStepState(key: PipelineStep): 'done' | 'active' | 'pending' {
    const order = PIPELINE_STEPS.map((s) => s.key);
    const currentIdx = order.indexOf(currentStep as any);
    const stepIdx = order.indexOf(key);
    if (stepIdx < currentIdx) return 'done';
    if (stepIdx === currentIdx) return 'active';
    return 'pending';
  }

  async function runPipeline() {
    if (pipelineRunning) return;
    setPipelineRunning(true);
    for (const step of PIPELINE_STEPS) {
      updatePipelineStep(step.key);
      await sleep(700 + Math.random() * 400);
    }
    updatePipelineStep('complete');
    setPipelineRunning(false);
  }

  return (
    <div className={styles.bar}>
      <div className={styles.steps}>
        {PIPELINE_STEPS.map((step, i) => {
          const state = getStepState(step.key);
          return (
            <div key={step.key} className={styles.stepGroup}>
              {i > 0 && (
                <span className={`${styles.sep} ${state !== 'pending' ? styles.sepDone : ''}`}>
                  ›
                </span>
              )}
              <div className={styles.step}>
                <div className={`${styles.dot} ${styles[`dot_${state}`]}`} />
                <span className={`${styles.label} ${state === 'active' ? styles.labelActive : ''}`}>
                  {step.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <button
        className={`${styles.runBtn} ${pipelineRunning ? styles.runBtnActive : ''}`}
        onClick={runPipeline}
        disabled={pipelineRunning}
      >
        {pipelineRunning ? '⟳ Running…' : '▶ Run pipeline'}
      </button>
    </div>
  );
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
