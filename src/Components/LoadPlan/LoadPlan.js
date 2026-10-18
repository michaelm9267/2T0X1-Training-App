import { useRef, useState } from 'react';
import { ACL, CB_RANGE, FLOOR, autoPlace, checkPlan, pieceCB, submitPlan } from './loadPlanLogic';
import { useTestMode } from '../Session/mode';
import './load-plan.css';

// C-17 load plan: place each manifested piece on the cargo floor (drag it, or type its
// station and lateral offset), keep the combined CB in range, and submit.
export default function LoadPlan({ pieces, plan, onChange }) {
  const test = useTestMode();
  const svg = useRef(null);
  const [drag, setDrag] = useState(null);
  const ready = pieces.filter(piece => piece.manifested);
  const waiting = pieces.filter(piece => !piece.manifested);
  const placements = plan.placements;
  const { problems, weight, cb } = checkPlan(ready, placements);
  const setSpot = (key, spot) => onChange({ ...plan, accepted: false, feedback: '', placements: { ...placements, [key]: spot } });
  const remove = key => { const next = { ...placements }; delete next[key]; onChange({ ...plan, accepted: false, feedback: '', placements: next }); };
  const toFloor = event => {
    const point = svg.current.createSVGPoint();
    point.x = event.clientX; point.y = event.clientY;
    const local = point.matrixTransform(svg.current.getScreenCTM().inverse());
    return { x: local.x, y: local.y - FLOOR.width / 2 };
  };
  const onMove = event => {
    if (!drag) return;
    const at = toFloor(event);
    setSpot(drag.key, { station: Math.round(at.x - drag.dx), lateral: Math.round(at.y - drag.dy) });
  };
  return <section className="load-plan" aria-labelledby="load-plan-title">
    <div className="training-heading"><span className="eyebrow">{test ? 'Test' : 'Guided practice'} · Chalk 001 · C-17</span><h2 id="load-plan-title">Load plan</h2>
      <p className="muted">Place every piece that passed JI on the C-17 cargo floor and keep the combined center of balance in range. Forward is at the left.</p></div>
    {!test && <p className="reference-note">Simplified training limits, not from TO 1C-17A-9: cargo floor {FLOOR.length} × {FLOOR.width} in (ramp is the last {FLOOR.ramp} in), allowable cabin load {ACL.toLocaleString()} lb, combined CB between stations {CB_RANGE[0]} and {CB_RANGE[1]} in. Stations are measured aft of the forward cargo compartment bulkhead. See DTR Part III Appendix V.</p>}
    <div className="load-floor-wrap">
      <svg ref={svg} className="load-floor" viewBox={`-20 -20 ${FLOOR.length + 40} ${FLOOR.width + 60}`} role="img" aria-label="C-17 cargo floor, top view"
        onPointerMove={onMove} onPointerUp={() => setDrag(null)} onPointerLeave={() => setDrag(null)}>
        <rect x="0" y="0" width={FLOOR.length} height={FLOOR.width} className="floor" />
        <rect x={FLOOR.length - FLOOR.ramp} y="0" width={FLOOR.ramp} height={FLOOR.width} className="ramp" />
        <line x1="0" x2={FLOOR.length} y1={FLOOR.width / 2} y2={FLOOR.width / 2} className="centerline" />
        {Array.from({ length: FLOOR.length / 100 + 1 }, (_, i) => <g key={i}><line x1={i * 100} x2={i * 100} y1={FLOOR.width} y2={FLOOR.width + 8} className="tick" /><text x={i * 100} y={FLOOR.width + 22} className="tick-label">{i * 100}</text></g>)}
        <rect x={CB_RANGE[0]} y="-14" width={CB_RANGE[1] - CB_RANGE[0]} height="8" className="cb-range" />
        <text x={(CB_RANGE[0] + CB_RANGE[1]) / 2} y="-16" className="tick-label">Allowable CB</text>
        {cb !== null && <polygon points={`${cb - 7},-18 ${cb + 7},-18 ${cb},-4`} className={cb >= CB_RANGE[0] && cb <= CB_RANGE[1] ? 'cb-mark' : 'cb-mark cb-bad'} />}
        <text x={FLOOR.length - FLOOR.ramp / 2} y="14" className="tick-label">RAMP</text>
        <text x="8" y="14" className="tick-label">FWD</text>
        {ready.filter(piece => placements[piece.key]).map(piece => {
          const spot = placements[piece.key];
          const y = FLOOR.width / 2 + spot.lateral - piece.width / 2;
          return <g key={piece.key} className={`load-piece ${drag?.key === piece.key ? 'dragging' : ''}`} onPointerDown={event => { const at = toFloor(event); event.currentTarget.ownerSVGElement.setPointerCapture?.(event.pointerId); setDrag({ key: piece.key, dx: at.x - spot.station, dy: at.y - spot.lateral }); }}>
            <rect x={spot.station} y={y} width={piece.length} height={piece.width} />
            <line x1={spot.station + pieceCB(piece)} x2={spot.station + pieceCB(piece)} y1={y} y2={y + piece.width} className="piece-cb" />
            <text x={spot.station + 6} y={y + 18}>{piece.title}</text>
            <text x={spot.station + 6} y={y + 34} className="piece-weight">{piece.weight.toLocaleString()} lb</text>
          </g>;
        })}
      </svg>
    </div>
    <div className="load-summary" role="status">
      <span>Total weight <strong>{weight.toLocaleString()} lb</strong> of {ACL.toLocaleString()}</span>
      <span>Combined CB <strong>{cb === null ? '—' : `${cb.toFixed(1)} in`}</strong></span>
      <span>{test ? `${ready.filter(p => placements[p.key]).length} of ${ready.length} placed` : problems.length ? `${problems.length} problem${problems.length === 1 ? '' : 's'}` : 'No problems found'}</span>
    </div>
    {!test && problems.length > 0 && <ul className="load-problems">{problems.map(problem => <li key={problem}>{problem}</li>)}</ul>}
    <div className="load-table"><table>
      <thead><tr><th>Piece</th><th>L × W (in)</th><th>Weight (lb)</th><th>Own CB (in)</th><th>Forward edge station (in)</th><th>Lateral offset (in)</th><th><span className="visually-hidden">Actions</span></th></tr></thead>
      <tbody>{ready.map(piece => {
        const spot = placements[piece.key];
        return <tr key={piece.key}>
          <td>{piece.title}</td><td>{piece.length} × {piece.width}</td><td>{piece.weight.toLocaleString()}</td><td>{pieceCB(piece).toFixed(1)}</td>
          <td>{spot ? <input type="number" aria-label={`${piece.title} forward edge station`} value={spot.station} onChange={event => setSpot(piece.key, { ...spot, station: Number(event.target.value) })} /> : '—'}</td>
          <td>{spot ? <input type="number" aria-label={`${piece.title} lateral offset`} value={spot.lateral} onChange={event => setSpot(piece.key, { ...spot, lateral: Number(event.target.value) })} /> : '—'}</td>
          <td>{spot ? <button type="button" onClick={() => remove(piece.key)}>Remove</button> : <button type="button" onClick={() => setSpot(piece.key, autoPlace(piece, placements, ready))}>Place {piece.title}</button>}</td>
        </tr>;
      })}</tbody>
    </table></div>
    {waiting.length > 0 && <p className="reference-note">Waiting for Manifest: {waiting.map(piece => piece.title).join(', ')}. Every DSOE piece must complete Manifest before the load plan can be submitted.</p>}
    <div className="answer-options"><button type="button" className="primary-button" onClick={() => onChange(submitPlan(plan, ready, waiting.length === 0))}>Submit load plan</button></div>
    <p aria-live="polite" className={plan.accepted ? 'load-accepted' : ''}>{test && !plan.accepted && plan.feedback ? 'Load plan not accepted. Recheck your plan.' : plan.feedback}</p>
  </section>;
}
