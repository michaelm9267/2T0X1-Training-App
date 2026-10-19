import RegulationHelp from '../Regulations/RegulationHelp';
import { notebookFields, viewedReading } from './notebook';
import CBWorksheet from './CBWorksheet';
import CollapsibleCard from '../Documentation/CollapsibleCard';

// readOnly shows the Incheck record without letting it change: at JI the piece is remeasured and
// reweighed with the tools, and editing an entry would undo Incheck (and the manifest after it).
export default function MeasurementNotebook({ scenario, exercise, onNotebookChange, onNotebookSave, onCBCalculate, readOnly = false }) {
  if (readOnly) return <CollapsibleCard className="notebook" label="Measurement notebook" title="Measurement notebook">
    <p className="muted">Incheck record, read only at JI. Remeasure and reweigh with the Tape measure and Scale; you do not re-record the notebook.</p>
    <dl className="notebook-fields notebook-record">{notebookFields(scenario).map(field => <div className="notebook-entry entry-saved" key={field.id}><dt>{field.label}</dt><dd>{exercise.notebookEntries[field.id] ?? '—'}</dd></div>)}
      {scenario.axles && <div className="notebook-entry entry-saved"><dt>Calculated CB (in from RDL)</dt><dd>{exercise.cbResult?.rounded ?? '—'}</dd></div>}</dl>
  </CollapsibleCard>;
  return <CollapsibleCard className="notebook" label="Measurement notebook" title="Measurement notebook">
    <p className="muted">View each reading in the cargo bay, then type it here and record it. Values are not filled in for you.</p>
    <RegulationHelp claims={['cargo.weight', 'cargo.dimensions', 'cargo.cbMarking']} />
    <div className="notebook-fields">{notebookFields(scenario).map(field => {
      const viewed = viewedReading(scenario,exercise,field) !== undefined;
      const saved = exercise.notebookEntries[field.id] !== undefined;
      return <form className={`notebook-entry ${saved ? 'entry-saved' : ''}`} key={field.id} noValidate onSubmit={event => { event.preventDefault(); onNotebookSave(field.id); }}>
        <label>{field.label}<input type="number" step="any" inputMode="decimal" min="0" value={exercise.notebookDraft[field.id] ?? ''} placeholder="Type viewed reading" onChange={event => onNotebookChange(field.id,event.target.value)} /></label>
        <button type="submit" aria-label={`Record ${field.label}`}>Record</button>
        <span className="entry-evidence">{saved ? 'Recorded.' : viewed ? 'Reading viewed — enter it above.' : 'View the tape or scale reading first.'}</span>
        {exercise.notebookFeedback[field.id] && !saved && <p className="entry-feedback" role="status">{exercise.notebookFeedback[field.id]}</p>}
      </form>;
    })}</div>
    {scenario.axles && <CBWorksheet scenario={scenario} exercise={exercise} onCBCalculate={onCBCalculate} />}
  </CollapsibleCard>;
}
