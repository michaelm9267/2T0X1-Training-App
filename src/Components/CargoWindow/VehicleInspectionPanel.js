import { vehicleStatus } from './vehicleInspection';

export default function VehicleInspection({ scenario, exercise, part, onAction }) {
  const state = vehicleStatus(scenario, exercise);
  if (part === 'battery') return <section className="vehicle-closeup" aria-label="Battery compartment">
    <h4>Battery compartment</h4><p>Check both terminal covers. Classify any discrepancy in Incheck, apply tape, then inspect both terminals again.</p>
    <svg viewBox="0 0 320 155" role="img" aria-label="Battery terminals">
      <rect x="35" y="45" width="250" height="95" rx="10" fill="#34494d" stroke="#849d99" strokeWidth="3" />
      <rect x="145" y="38" width="30" height="110" fill="#1b252a" stroke="#7e9194" />
      {['positive','negative'].map((terminal,index) => <g key={terminal} onClick={() => onAction({type:'inspect-terminal',terminal})} style={{cursor:'pointer'}}><path d={`M ${index ? 245 : 75} 52 V 15 H ${index ? 315 : 5}`} fill="none" stroke={index ? '#151b23' : '#d35b53'} strokeWidth="12" /><rect x={index ? 225 : 55} y="36" width="40" height="30" rx="5" fill={state[`${terminal}Taped`] ? '#10171e' : '#c7cdd1'} stroke="#a2b0b8" /><text x={index ? 245 : 75} y="91" textAnchor="middle" fill="#eff6f9" fontSize="16">{index ? '−' : '+'}</text></g>)}
    </svg>
    {['positive','negative'].map(terminal => <div className="terminal-check" key={terminal}><button type="button" onClick={() => onAction({type:'inspect-terminal',terminal})}>Check {terminal} terminal</button>{exercise.terminalViewed[terminal] && <span>{terminal}: {state[`${terminal}Taped`] ? 'protected with tape' : 'exposed terminal'}</span>}{!state[`${terminal}Taped`] && <button type="button" disabled={!exercise.terminalViewed[terminal] || exercise.answers.battery?.choice !== 'unsatisfactory'} onClick={() => onAction({type:'tape-terminal',terminal})}>Tape {terminal} terminal</button>}</div>)}
  </section>;
  const angle = Math.PI * (1-state.fuelFraction);
  return <section className="vehicle-closeup" aria-label="Fuel inspection"><h4>Fuel gauge</h4>
    <p>Training target: ¼ tank or below. Appendix O fuel limits depend on equipment and movement; this target belongs to this scenario.</p>
    <svg viewBox="0 0 320 185" role="img" aria-label="Vehicle fuel gauge"><rect width="320" height="185" rx="16" fill="#101923" /><path d="M 45 145 A 115 115 0 0 1 275 145" fill="none" stroke="#7f99ac" strokeWidth="5" />{['E','¼','½','¾','F'].map((label,index) => { const a=Math.PI*(1-index/4); return <text key={label} x={160+138*Math.cos(a)} y={148-138*Math.sin(a)} fill={index===1?'#5ee0c5':'#e4edf4'} textAnchor="middle" fontSize="16">{label}</text>; })}<line x1="160" y1="145" x2={160+100*Math.cos(angle)} y2={145-100*Math.sin(angle)} stroke="#efce8d" strokeWidth="5" /><circle cx="160" cy="145" r="9" fill="#b8c9d4" /></svg>
    <button type="button" onClick={() => onAction({type:'read-fuel'})}>Read fuel gauge</button>
    {exercise.fuelViewed && <p aria-live="polite">Gauge reading: {state.fuelFraction*100}% full — {state.fuelFraction <= state.fuelLimit ? 'within training target' : 'above training target'}.</p>}
    {state.fuelFraction > state.fuelLimit && <button type="button" disabled={!exercise.fuelViewed || exercise.answers.fuel?.choice !== 'unsatisfactory'} onClick={() => onAction({type:'drain-fuel'})}>Simulate draining to ¼ tank</button>}
    {!exercise.fuelViewed && exercise.vehicleState.fuelFraction !== undefined && <p>Reread the gauge before confirming correction.</p>}
  </section>;
}
