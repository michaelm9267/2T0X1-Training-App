import { ClaimLink } from '../Regulations/RegulationHelp';
import { vehicleStatus } from './vehicleInspection';
import { fuelLimitText, fuelReading } from './discrepancies';

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
  const limit = fuelLimitText(state);
  const within = state.fuelFraction <= state.fuelLimit;
  const drain = state.fuelFraction > state.fuelLimit && <button type="button" disabled={!exercise.fuelViewed || exercise.answers.fuel?.choice !== 'unsatisfactory'} onClick={() => onAction({type:'drain-fuel'})}>Simulate draining to {limit}</button>;
  const reread = !exercise.fuelViewed && exercise.vehicleState.fuelFraction !== undefined && <p>Reread the fuel level before confirming correction.</p>;
  // Equipment drained nearly empty shows residual fuel in millilitres against its limit.
  if (state.fuelUnit === 'mL') {
    const scale = 10000, x = ml => 30 + 260 * Math.min(ml, scale) / scale;
    return <section className="vehicle-closeup" aria-label="Fuel inspection"><h4>Residual fuel</h4>
      <p><ClaimLink claimId="cargo.generatorFuel">Limit: {limit} or less.</ClaimLink> Measure the fuel left in the tank and drain it to the limit before movement.</p>
      <svg viewBox="0 0 320 120" role="img" aria-label="Residual fuel measurement"><rect width="320" height="120" rx="16" fill="#101923" /><rect x="30" y="45" width="260" height="24" rx="4" fill="#1d2b37" stroke="#7f99ac" /><rect x="30" y="45" width={x(state.fuelFraction) - 30} height="24" rx="4" fill="#efce8d" /><line x1={x(state.fuelLimit)} x2={x(state.fuelLimit)} y1="36" y2="78" stroke="#5ee0c5" strokeWidth="3" /><text x={x(state.fuelLimit)} y="30" fill="#5ee0c5" textAnchor="middle" fontSize="13">{limit}</text>{[0, 5000, 10000].map(ml => <text key={ml} x={x(ml)} y="98" fill="#e4edf4" textAnchor="middle" fontSize="12">{ml.toLocaleString()} mL</text>)}</svg>
      <button type="button" onClick={() => onAction({type:'read-fuel'})}>Measure residual fuel</button>
      {exercise.fuelViewed && <p aria-live="polite">Residual fuel: {fuelReading(state)} — {within ? 'within the limit' : 'above the limit'}.</p>}
      {drain}{reread}
    </section>;
  }
  const angle = Math.PI * (1-state.fuelFraction);
  return <section className="vehicle-closeup" aria-label="Fuel inspection"><h4>Fuel gauge</h4>
    <p>Limit: {limit} or below. <ClaimLink claimId="cargo.fuel">Appendix O fuel limits depend on equipment and movement.</ClaimLink> This scenario target is selected for this equipment; it is not a universal fuel limit.</p>
    <svg viewBox="0 0 320 185" role="img" aria-label="Vehicle fuel gauge"><rect width="320" height="185" rx="16" fill="#101923" /><path d="M 45 145 A 115 115 0 0 1 275 145" fill="none" stroke="#7f99ac" strokeWidth="5" />{['E','¼','½','¾','F'].map((label,index) => { const a=Math.PI*(1-index/4); return <text key={label} x={160+138*Math.cos(a)} y={148-138*Math.sin(a)} fill={index===1?'#5ee0c5':'#e4edf4'} textAnchor="middle" fontSize="16">{label}</text>; })}<line x1="160" y1="145" x2={160+100*Math.cos(angle)} y2={145-100*Math.sin(angle)} stroke="#efce8d" strokeWidth="5" /><circle cx="160" cy="145" r="9" fill="#b8c9d4" /></svg>
    <button type="button" onClick={() => onAction({type:'read-fuel'})}>Read fuel gauge</button>
    {exercise.fuelViewed && <p aria-live="polite">Gauge reading: {state.fuelFraction*100}% full — {within ? 'within the limit' : 'above the limit'}.</p>}
    {drain}{reread}
  </section>;
}
