import { RegulationReference } from '../Regulations/RegulationHelp';
import { BLOCKS, ROWS, MARKS, MARK_SYMBOL, expectedMark, markJI, rowComplete, rowExplanation, rowNeeds, rowReady } from '../CargoWindow/dd2133';
import { useTestMode } from '../Session/mode';
import CollapsibleCard from './CollapsibleCard';

// Header blocks 1–9 are typed by the inspector (App O K.2.b); they are kept with the piece but not
// graded. Block 10 identifies this piece's column by its TCN.
const HEADER = [['force', '1. Deploying force'], ['airfield', '2. Departure airfield'], ['date', '3. Date'], ['aircraft', '4. Aircraft type and mission number'],
  ['chalk', '5. Load/chalk no.'], ['start', '6. Start time'], ['complete', '7. Complete time'], ['mobility', '8. Mobility force']];

export default function DD2133Form({ scenario, exercise, onWorkflow, ready }) {
  const test = useTestMode();
  const header = exercise.jiHeader || {};
  const setHeader = (field, value) => onWorkflow(e => ({ ...e, jiHeader: { ...(e.jiHeader || {}), [field]: value } }));
  const done = ROWS.filter(row => rowComplete(scenario, exercise, row)).length;
  return <CollapsibleCard label="DD Form 2133" title="DD Form 2133 · Joint Airlift Inspection Record/Checklist" summary={<span>{done} / {ROWS.length} blocks marked</span>}>
    <div className="dd2133">
      {!test && <p className="tool-hint">Reinspect each applicable item in the cargo bay and paperwork during this JI, then mark this piece's column: √ satisfactory, ✗ unsatisfactory, ⓧ (circled ✗) once corrected, – not applicable. Mark every block in 11 and 12; use only the block of 13–15 that fits the item and leave the others blank.</p>}
      {!ready && <p className="reference-note">Complete Precheck, Incheck, and the manifest to enable the JI record.</p>}
      <div className="dd2133-header">
        {HEADER.map(([field, label]) => <label key={field}>{label}<input value={header[field] || ''} onChange={event => setHeader(field, event.target.value)} /></label>)}
        <fieldset><legend>9. Chapter 3 movement</legend>{['Yes', 'No'].map(value => <label key={value}><input type="radio" name="dd2133-chapter3" checked={header.chapter3 === value} onChange={() => setHeader('chapter3', value)} />{value}</label>)}</fieldset>
        <label>10. Increment/serial/bumper number and type/TCN<input value={scenario.tcn || scenario.title} readOnly /></label>
      </div>
      {BLOCKS.map(block => <table key={block.id} className="dd2133-block">
        <caption>{block.id}. {block.title.toUpperCase()}{block.note && <em> ({block.note})</em>}</caption>
        <tbody>{ROWS.filter(row => row.block === block.id).map(row => {
          const mark = exercise.jiMarks?.[row.id] || '';
          const feedback = exercise.jiMarkFeedback?.[row.id];
          const touched = exercise.jiMarks?.[row.id] !== undefined;
          const correct = rowComplete(scenario, exercise, row);
          return <tr key={row.id} className={!test && touched ? (correct ? 'dd2133-correct' : 'dd2133-wrong') : undefined}>
            <th scope="row" className={row.sub ? 'dd2133-sub' : undefined}>{row.sub ? '' : `${row.id.replace(/^\d+/, '')}. `}{row.label}
              {!rowReady(scenario, exercise, row) && (feedback ? <small role="status">{feedback}</small> : !test && <small>{rowNeeds(scenario, row, exercise)}</small>)}
              {!test && touched && <small>{correct ? 'Correct.' : 'Try again.'} {rowExplanation(scenario, exercise, row)} <RegulationReference reference={`DTR Part III App O ${row.paragraph}`} >App O {row.paragraph} · {row.page}</RegulationReference></small>}
            </th>
            <td className="dd2133-mark" aria-hidden="true">{MARK_SYMBOL[mark]}</td>
            <td><select aria-label={`DD 2133 ${row.id} ${row.label}`} disabled={!ready} value={mark} onChange={event => onWorkflow(e => markJI(scenario, e, row.id, event.target.value))}>
              {MARKS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select></td>
          </tr>;
        })}</tbody>
      </table>)}
      <p className="reference-note">Practice inspection record only; signatures (blocks 16–17) are not simulated. Legend: DTR Part III App O K.2.c (III-O-6).{test ? '' : ` ${ROWS.filter(row => expectedMark(scenario, exercise, row) !== '').length} blocks apply to this ${scenario.axles ? 'vehicle' : 'pallet or ISU'}.`}</p>
    </div>
  </CollapsibleCard>;
}
