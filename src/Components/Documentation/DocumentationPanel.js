import RegulationHelp, { RegulationReference } from '../Regulations/RegulationHelp';
import ShipmentPaperwork from './ShipmentPaperwork';
import { isStageComplete } from '../CargoWindow/exercise';
import { canConfirmVehicleCorrection } from '../CargoWindow/vehicleInspection';
import { getTasks } from '../CargoWindow/exercise';
import MeasurementNotebook from '../CargoWindow/MeasurementNotebook';
import FrustrationPanel from './FrustrationPanel';
import ManifestView from './ManifestView';
import CollapsibleCard from './CollapsibleCard';
import SectionJump from './SectionJump';
import DD2133Form from './DD2133Form';
import FrustrateButton from './FrustrateButton';
import { reasonForFinding } from '../CargoWindow/frustration';
import { useTestMode } from '../Session/mode';

export default function DocumentationPanel({ step, scenario, exercise, onAnswer, onCorrect, completedStages, onNotebookChange, onNotebookSave, onCBCalculate, onWorkflow, manifestPieces = [], onRemovePiece, onOpenCmos, manifestMetadata }) {
  const tasks = getTasks(scenario, step.id, exercise);
  const test = useTestMode();
  return <section className="documentation-panel" id="training-section" aria-labelledby="training-title">
    <div className="training-heading"><span className="eyebrow">{test ? 'Test' : 'Guided practice'} · {scenario.title}</span><h2 id="training-title">{step.title}</h2><p className="muted">{step.id === 'incheck' ? 'Measure, weigh, inspect, correct discrepancies, and apply tape markings.' : step.id==='precheck' ? 'Verify required paperwork with the increment monitor.' : step.id==='manifest' ? 'Manifest the asset using its paperwork and verified Incheck readings.' : 'Perform a fresh final inspection of the prepared asset for airworthiness.'}</p></div>
    <SectionJump resetKey={`${scenario.key ?? scenario.id}-${step.id}`} />
    <ManifestView pieces={manifestPieces} onRemove={onRemovePiece} manifest={manifestMetadata} />
    <FrustrationPanel scenario={scenario} exercise={exercise} onWorkflow={onWorkflow} />
        <ShipmentPaperwork key={scenario.key ?? scenario.id} scenario={scenario} exercise={exercise} step={step.id} onWorkflow={onWorkflow} onOpenCmos={onOpenCmos} />
    {step.id === 'ji' ? <DD2133Form scenario={scenario} exercise={exercise} onWorkflow={onWorkflow} ready={isStageComplete(scenario,'manifest',exercise)} /> : <CollapsibleCard label="Stage checklist" title="Stage checklist" summary={<span>{tasks.filter(task => task.complete).length} / {tasks.length} complete</span>}>
      <div className="task-list">{tasks.map(task => {
        const answer = exercise.answers[task.id];
        const correct = answer?.choice === task.correct;
        return <div className={`training-task ${task.complete ? 'task-complete' : ''}`} role="group" aria-label={task.title} key={task.id}>
          <div className="task-heading"><h4>{task.title}</h4><span>{task.complete ? (answer?.corrected ? 'Corrected' : 'Complete') : 'Pending'}</span></div>
          {task.hint ? <>{!test && <p>{task.hint}</p>}{task.fresh && <button type="button" disabled={!isStageComplete(scenario,'manifest',exercise) || !task.evidence} onClick={()=>onWorkflow(e=>({...e,jiVerified:[...new Set([...e.jiVerified,task.id])]}))}>Verify {task.title}</button>}{!task.local && !test && <RegulationReference className="task-source" reference={task.id.startsWith('tape-') ? 'DTR Part III Appendix P C.3' : `DTR Part III App O ${task.id === 'gross' || task.id.endsWith('-weight') ? 'K.2.e(3)' : task.id.endsWith('-position') ? 'K.2.e(5)' : 'K.2.e(4)'}`}>{task.id.startsWith('tape-') ? 'Appendix P C.3 · III-P-2' : <>Appendix O {task.id === 'gross' || task.id.endsWith('-weight') ? 'K.2.e(3)' : task.id.endsWith('-position') ? 'K.2.e(5) · see CB worksheet' : 'K.2.e(4)'} · {task.id.endsWith('-position') ? 'III-O-8' : 'III-O-7'}</>}</RegulationReference>}</> : <>
            {task.inspected ? <p><RegulationReference reference={`DTR Part III App O ${task.source?.paragraph || ''}`}>{task.observation}</RegulationReference></p> : <p>Use Inspect in the cargo bay to examine this component{task.interior ? ' inside the ISU' : ''} before recording a decision.</p>}
            <div className="answer-options">{[['satisfactory', 'Satisfactory'], ['unsatisfactory', 'Unsatisfactory'], ['not-applicable', 'Not applicable']].map(([value, label]) => <button key={value} type="button" disabled={!task.inspected} aria-pressed={answer?.choice === value} onClick={() => onAnswer(task.id, value)}>{label}</button>)}{reasonForFinding(task.id) && <FrustrateButton scenario={scenario} exercise={exercise} onWorkflow={onWorkflow} reason={reasonForFinding(task.id)} label={task.title} disabled={!task.inspected} />}</div>
            {answer && test && <div className="task-feedback" aria-live="polite"><strong>Decision recorded.</strong></div>}
            {answer && !test && <div className={`task-feedback ${correct ? 'feedback-correct' : ''}`} aria-live="polite"><strong>{correct ? 'Correct decision.' : 'Try again.'}</strong> <RegulationReference reference={`DTR Part III App O ${task.source.paragraph}`}>{task.explanation}</RegulationReference><RegulationReference reference={`DTR Part III App O ${task.source.paragraph}`}>Appendix O {task.source.paragraph} · {task.source.page}</RegulationReference></div>}
            {(test ? answer?.choice === 'unsatisfactory' : correct && task.correct === 'unsatisfactory') && !answer.corrected && <div className="correction">{!test && <p>{task.correction}</p>}<button type="button" className="primary-button" disabled={!task.inspected || !canConfirmVehicleCorrection(scenario,exercise,task.id)} onClick={() => onCorrect(task.id)}>Simulate correction and reinspection</button></div>}
          </>}
        </div>;
      })}</div>
    </CollapsibleCard>}
    <RegulationHelp claims={['inspection.scope', 'inspection.legend', 'inspection.corrections']} />
    <MeasurementNotebook scenario={scenario} exercise={exercise} onNotebookChange={onNotebookChange} onNotebookSave={onNotebookSave} onCBCalculate={onCBCalculate} readOnly={step.id === 'ji'} />
    <CollapsibleCard className="practice-summary" label="Exercise progress" title="Exercise progress" summary={<span>{completedStages.length} / 4 stages</span>}><p>{completedStages.length} of 4 stages complete.</p>{completedStages.length === 4 && <p role="status">Guided exercise complete. Paperwork, Incheck preparation, manifest, and final JI verification are complete.</p>}<p className="reference-note">Practice inspection record only. Appendix O K.2.c (III-O-6) describes satisfactory, unsatisfactory, corrected, and not-applicable entries; K.2.j (III-O-11) requires discrepancy and correction details.</p></CollapsibleCard>
  </section>;
}
