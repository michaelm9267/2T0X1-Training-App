import { axleLabels } from './axles';
export function TapeMarks({ labels, scale = 1 }) {
  return <g className="vehicle-tape-marks" pointerEvents="none">{labels.map(label => <g key={label.type} transform={`translate(${label.x} ${label.y}) scale(${scale})`}>
    {label.type === 'cb' ? <>
      <rect x="-28" y="-4" width="56" height="8" rx=".7" fill="#f2e5bd" stroke="#b5a77d" strokeWidth=".4" />
      <rect x="-4" y="4" width="8" height="18" fill="#f2e5bd" stroke="#b5a77d" strokeWidth=".4" />
      <text x="0" y="1.5" textAnchor="middle" fill="#18211d" fontSize="4.8" fontWeight="700">GWT {label.gross.toLocaleString()} lb</text>
      <text transform="translate(1.6 13) rotate(-90)" textAnchor="middle" fill="#18211d" fontSize="4" fontWeight="700">CB {label.value} in</text>
    </> : <>
      <rect x="-22" y="-4" width="44" height="8" rx=".7" fill="#f2e5bd" stroke="#b5a77d" strokeWidth=".4" />
      <text x="0" y="1.5" textAnchor="middle" fill="#18211d" fontSize="4.8" fontWeight="700">{label.type.toUpperCase()} {label.value.toLocaleString()} lb</text>
    </>}
  </g>)}</g>;
}

export default function LabelingTape({ side, setSide, draft, setDraft, scenario, view, onApply, onRemove, labels, feedback }) {
  const setField = (field,value) => setDraft(previous => ({ ...previous,[field]:value }));
  return <section className="labeling-controls" aria-label="Vehicle tape labeling">
    <p className="tool-hint">Write the value on the tape, then click the vehicle body to apply it. Place each axle-weight label above its axle; place the CB T at its calculated distance from the RDL. Label both sides.</p>
    <label>Vehicle side<select value={side} onChange={event => setSide(event.target.value)}><option value="left">Left side</option><option value="right">Right side</option></select></label>
    <label>Tape label<select value={draft.type} onChange={event => setDraft({ type:event.target.value,value:'',gross:'',x:'',height:'38' })}>{axleLabels(scenario).map(axle => <option key={axle.type} value={axle.type}>{axle.weightId} ({axle.code}) axle-weight tape</option>)}<option value="cb">CB T-shaped marking</option></select></label>
    <label>Value on tape<input type="number" step="any" value={draft.value} onChange={event => setField('value',event.target.value)} placeholder={draft.type === 'cb' ? 'CB distance in inches' : 'Axle weight in pounds'} /></label>
    {draft.type === 'cb' && <label>GWT on horizontal tape (lb)<input type="number" step="any" value={draft.gross} onChange={event => setField('gross',event.target.value)} /></label>}
    {view !== 'side' ? <p className="tool-hint">Select Side view to apply tape using physical positions.</p> : <details><summary>Keyboard tape placement</summary>
      <label>Placement distance from RDL (in)<input type="number" step="any" value={draft.x} onChange={event => setField('x',event.target.value)} /></label>
      <label>Placement height above ground (in)<input type="number" step="any" value={draft.height} onChange={event => setField('height',event.target.value)} /></label>
      <button type="button" onClick={() => onApply({ ...draft,side,x:draft.x.trim() === '' ? NaN : Number(draft.x),y:draft.height.trim() === '' ? NaN : scenario.height-Number(draft.height) })}>Apply tape at entered position</button>
    </details>}
    <ul className="tape-label-list">{labels.map(label => <li key={label.type}><span>{label.type.toUpperCase()} · {label.value.toLocaleString()} {label.type === 'cb' ? 'in from RDL' : 'lb'}</span><button type="button" onClick={() => onRemove(side,label.type)}>Remove {label.type.toUpperCase()} tape from {side} side</button></li>)}</ul>
    <p className="reference-note">Appendix P C.3, III-P-2: axle weights above each axle on both sides; gross weight on the horizontal portion of the T and CB on the vertical portion, with distance from the RDL.</p>
    {feedback && <p className="tape-feedback">{feedback}</p>}
  </section>;
}
