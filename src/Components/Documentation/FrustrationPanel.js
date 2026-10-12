import { useState } from 'react';
import CollapsibleCard from './CollapsibleCard';
import { useTestMode } from '../Session/mode';
import { FRUSTRATION_REASONS, entryTitle, frustrate, fixFrustration, releaseFrustration, reasonFixed, fixGuidance, fixReadiness, isFrustrated } from '../CargoWindow/frustration';

export default function FrustrationPanel({ scenario, exercise, onWorkflow }) {
  const [adding, setAdding] = useState(false);
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const frustrated = isFrustrated(exercise);
  const test = useTestMode();
  const entries = exercise.frustrations.map((entry, index) => ({ ...entry, index })).filter(entry => !entry.released);
  function submit(event) {
    event.preventDefault();
    onWorkflow(e => frustrate(scenario, e, reason, note));
    if (reason && (reason !== 'other' || note.trim())) { setAdding(false); setReason(''); setNote(''); }
  }
  return <CollapsibleCard className={`frustration-card ${frustrated ? 'is-frustrated' : ''}`} label="Cargo frustration" title="Cargo frustration" summary={<span className="frustration-status">{frustrated ? 'FRUSTRATED' : 'Not frustrated'}</span>}>
    <p className="reference-note">Frustrate the asset when it does not meet movement requirements. It cannot be manifested or pass JI until every reason is fixed and released.</p>
    {!adding && <button type="button" className="frustrate-button" onClick={() => setAdding(true)}>Frustrate asset</button>}
    {adding && <form className="frustration-form" onSubmit={submit}>
      <label>Frustration reason <select value={reason} onChange={event => setReason(event.target.value)}>
        <option value="">Select a reason…</option>
        {FRUSTRATION_REASONS.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}
      </select></label>
      {reason === 'other' && <label>Describe the reason <input value={note} onChange={event => setNote(event.target.value)} /></label>}
      <div className="answer-options"><button type="submit" className="frustrate-button" disabled={!reason}>Confirm frustration</button><button type="button" onClick={() => { setAdding(false); setReason(''); setNote(''); }}>Cancel</button></div>
    </form>}
    <p aria-live="polite">{test && /does not have/.test(exercise.frustrationFeedback || '') ? 'Asset frustrated.' : exercise.frustrationFeedback}</p>
    {entries.length > 0 && <div className="task-list">{entries.map(entry => {
      const fixed = reasonFixed(scenario, exercise, entry);
      const readiness = fixReadiness(scenario, exercise, entry.reason);
      const title = entryTitle(scenario, entry);
      return <div className={`training-task ${fixed ? 'task-complete' : ''}`} role="group" aria-label={`Frustration: ${title}`} key={entry.index}>
        <div className="task-heading"><h4>{title}</h4><span>{test && !entry.valid ? 'Open' : fixed ? 'Fixed' : 'Outstanding'}</span></div>
        {entry.note && <p>Reason: {entry.note}</p>}
        {test ? <p>Correct the discrepancy, then release the asset.</p> : <p>{entry.valid ? <>How to fix: {fixGuidance(scenario, entry.reason, entry.subject)}</> : 'This shipment does not have that discrepancy. Release the asset and recheck.'}</p>}
        <div className="answer-options">
          {entry.valid && !fixed && <button type="button" className="primary-button" disabled={!readiness.ready} onClick={() => onWorkflow(e => fixFrustration(scenario, e, entry.index))}>Fix: {entry.reason === 'paperwork' ? 'request missing copies' : entry.reason === 'other' ? 'record corrective action' : ['mismatch', 'attla', 'hazdec'].includes(entry.reason) ? 'request corrected document' : 'simulate correction and reinspection'}</button>}
          <button type="button" disabled={!fixed} onClick={() => onWorkflow(e => releaseFrustration(scenario, e, entry.index))}>Release from frustration</button>
        </div>
        {entry.valid && !fixed && !readiness.ready && <p className="reference-note">{readiness.reason}</p>}
      </div>;
    })}</div>}
  </CollapsibleCard>;
}
