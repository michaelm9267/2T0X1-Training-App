import { useEffect, useRef } from 'react';
import { manifestFields, paperwork, tcnUln, tcnIncrement, DODAAC_INFO, ORIGIN, DESTINATION, DESTINATIONS } from '../CargoWindow/workflow';
import { MAX_PIECES } from '../CargoWindow/pieces';

// Deployment Schedule of Events for the training increments, laid out as a LOGMOD Schedule
// Processing Recap Report for one cargo chalk on a C-17. The processing schedule lists the chalk's
// overall milestones, not per-increment times. Identifiers are fictional.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const round5 = minutes => Math.ceil(minutes / 5) * 5;
// Chalk milestones in minutes after midnight on the processing day; each window grows with the
// number of increments. Cargo prep starts the day before.
export function chalkSchedule(count) {
  const report = 6 * 60, incheckStart = 6 * 60 + 30;
  const incheckComplete = round5(incheckStart + 40 + count * 20);
  const manifestComplete = round5(incheckComplete + 30 + count * 10);
  const jiStart = manifestComplete + 30, jiComplete = round5(jiStart + 30 + count * 15);
  const loadStart = Math.max(13 * 60, jiComplete + 60), loadComplete = round5(loadStart + 45 + count * 5);
  return { cargoPrep: 7 * 60 + 30, report, incheckStart, incheckComplete, manifestStart: incheckComplete, manifestComplete, jiStart, jiComplete, loadStart, loadComplete, arrival: loadStart - 90, departure: loadComplete + 60 };
}

// Report timestamps in the recap format, e.g. 01-Aug-2024/07:30.
const two = n => String(n).padStart(2, '0');
const dayOf = (date, offsetDays = 0) => { const d = new Date(date); d.setDate(d.getDate() + offsetDays); return `${two(d.getDate())}-${MONTHS[d.getMonth()]}-${d.getFullYear()}`; };
const stamp = (date, minutes, offsetDays = 0) => `${dayOf(date, offsetDays + Math.floor(minutes / 1440))}/${two(Math.floor(minutes / 60) % 24)}:${two(minutes % 60)}`;

function Field({ label, children, wide }) {
  return <div className={`recap-field${wide ? ' recap-wide' : ''}`}><span className="recap-label">{label}:</span><span className="recap-value">{children}</span></div>;
}

export default function Dsoe({ increments, pieceCount = increments.length, onPieceCountChange, destination = DESTINATION, onDestinationChange, destinationLocked = false, elapsedSeconds = 0, milestoneTimes = {}, date = new Date(), onClose }) {
  const dialog = useRef(null);
  useEffect(() => {
    dialog.current?.focus();
    const closeOnEscape = event => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', closeOnEscape);
    document.body.classList.add('cmos-modal-open');
    return () => { document.removeEventListener('keydown', closeOnEscape); document.body.classList.remove('cmos-modal-open'); };
  }, [onClose]);
  const time = chalkSchedule(increments.length);
  const origin = DODAAC_INFO[ORIGIN], dest = DODAAC_INFO[destination];
  const printed = `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()} ${two(date.getHours())}:${two(date.getMinutes())}:${two(date.getSeconds())}`;
  // Actual reads COMPLETE once a milestone is reached: a start when any increment has finished the
  // step before it, a completion when every increment has finished that step.
  const any = stage => increments.some(item => item.done?.includes(stage));
  const all = stage => increments.length > 0 && increments.every(item => item.done?.includes(stage));
  const events = [
    ['C', 'CARGO PREP', 'START', stamp(date, time.cargoPrep, -1), any('precheck'), 'cargoPrepStart'],
    ['C', 'REPORT TO', 'CDF', stamp(date, time.report), all('precheck'), 'reportTo'],
    ['C', 'INCHECK', 'START', stamp(date, time.incheckStart), any('precheck'), 'incheckStart'],
    ['C', 'INCHECK', 'COMPLETE', stamp(date, time.incheckComplete), all('incheck'), 'incheckComplete'],
    ['C', 'MANIFEST', 'START', stamp(date, time.manifestStart), any('incheck'), 'manifestStart'],
    ['C', 'MANIFEST', 'COMPLETE', stamp(date, time.manifestComplete), all('manifest'), 'manifestComplete'],
    ['C', 'JOINT INSPECTION', 'START', stamp(date, time.jiStart), any('manifest'), 'jiStart'],
    ['C', 'JOINT INSPECTION', 'COMPLETE', stamp(date, time.jiComplete), all('ji'), 'jiComplete'],
    ['C', 'CARGO LOAD', 'START', stamp(date, time.loadStart), milestoneTimes.cargoLoadStart !== undefined, 'cargoLoadStart'],
    ['C', 'CARGO LOAD', 'COMPLETE', stamp(date, time.loadComplete), milestoneTimes.cargoLoadComplete !== undefined, 'cargoLoadComplete'],
    ['M', 'AC', 'ARRIVAL', stamp(date, time.arrival), false],
    ['M', 'AC', 'DEPARTURE', stamp(date, time.departure), false],
  ];
  return <div className="cmos-overlay" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <article className="paper-sheet dsoe-sheet" role="dialog" aria-modal="true" aria-label="Deployment Schedule of Events" tabIndex={-1} ref={dialog}>
      <div className="paper-toolbar"><span>Deployment Schedule of Events (DSOE)</span><button type="button" aria-label="Close DSOE" onClick={onClose}>×</button></div>
      <p className="dsoe-clock">Simulation elapsed: {String(Math.floor(elapsedSeconds / 60)).padStart(2, '0')}:{String(elapsedSeconds % 60).padStart(2, '0')}. Start, pause, or reset the clock from the session toolbar.</p>
      {(onPieceCountChange || onDestinationChange) && <div className="dsoe-options">
        {onPieceCountChange && <label className="dsoe-count">Pieces to process
          <select value={pieceCount} onChange={event => onPieceCountChange(Number(event.target.value))}>
            {Array.from({ length: MAX_PIECES }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <span>Pieces 7–12 repeat the equipment types as additional increments.</span>
        </label>}
        {onDestinationChange && <label className="dsoe-count">Destination
          <select value={destination} disabled={destinationLocked} onChange={event => onDestinationChange(event.target.value)}>
            {DESTINATIONS.map(code => <option key={code} value={code}>{code} · {DODAAC_INFO[code].unit} · APOD {DODAAC_INFO[code].port}</option>)}
          </select>
          <span>{destinationLocked ? 'Locked while pieces are on the manifest. Remove them to change the destination.' : 'Picked at random for each new session; every piece ships here.'}</span>
        </label>}
      </div>}
      <div className="recap-page">
        <div className="recap-top"><span>TRAINEE.USER0000000000</span><strong>0001TRNG0000 - TR001</strong><span>Page 1 of 1</span></div>
        <h4 className="recap-title">Schedule Processing Recap Report</h4>
        <div className="recap-fields">
          <Field label="Schedule">TR001</Field><Field label="RST">{stamp(date, 0, -7)}</Field><Field label="As Of Date">{stamp(date, 6 * 60, -1)}</Field><Field label="Change #">0</Field>
          <Field label="Chalk">001C</Field><Field label="Mode">C17</Field><Field label="Mission Number">JTRN0001</Field><span />
          <Field label="Parking" /><Field label="Tail Number" /><span /><span />
          <Field label="ETA">{stamp(date, time.arrival)}</Field><Field label="ETD">{stamp(date, time.departure)}</Field><Field label="ATD" /><span />
          <Field label="Origin">{`${ORIGIN} · ${origin.unit} · ${origin.city}`}</Field><Field label="APOE">{origin.port}</Field><Field label="Destination">{`${destination} · ${dest.unit} · ${dest.city}`}</Field><Field label="APOD">{dest.port}</Field>
          <Field label="Remarks" wide>CARGO CHALK · {ORIGIN} THROUGH APOE {origin.port} TO {destination} THROUGH APOD {dest.port}</Field>
        </div>
        <h5 className="recap-section">Processing Schedule</h5>
        <div className="paper-table"><table className="recap-table" aria-label="Processing schedule">
          <thead><tr><th>Event Type</th><th colSpan="2">Chalk Event</th><th>Scheduled</th><th>Actual</th></tr></thead>
          <tbody>{events.map(([type, what, event, scheduled, complete, milestone], i) => <tr key={i} aria-label={`${what} ${event}`}><td>{type}</td><td>{what}</td><td>{event}</td><td>{scheduled}</td><td>{complete ? `COMPLETE · T+${Math.floor((milestoneTimes[milestone] ?? elapsedSeconds) / 60)}m` : ''}</td></tr>)}</tbody>
        </table></div>
        <div className="recap-totals"><h5 className="recap-section">Cargo Information</h5><Field label="Total TCNs">{increments.length}</Field></div>
        <div className="paper-table"><table className="recap-table" aria-label="Cargo TCNs">
          <thead><tr><th>ULN</th><th>Incr</th><th>TCN</th><th>Description</th><th>Pcs</th><th>Weight (lb)</th><th>L × W × H (in)</th><th>Haz</th><th>Status</th></tr></thead>
          <tbody>{increments.map(({ scenario, status }) => {
            const values = Object.fromEntries(manifestFields(scenario).map(f => [f.id, f.expected]));
            const haz = paperwork(scenario).some(d => d.id === 'hazdec' && d.required);
            return <tr key={scenario.key ?? scenario.id} aria-label={`Increment ${tcnIncrement(values.tcn)}`}>
              <td>{tcnUln(values.tcn)}</td><td>{tcnIncrement(values.tcn)}</td><td>{values.tcn}</td><td>{values.description}</td><td>{values.pieces}</td>
              <td>{Number(values.weight).toLocaleString()}</td><td>{values.length} × {values.width} × {values.height}</td><td>{haz ? 'Y' : 'N'}</td><td>{status}</td>
            </tr>;
          })}</tbody>
        </table></div>
        <div className="recap-totals"><h5 className="recap-section">PAX Information</h5><div className="recap-stack"><Field label="Total Seats">0</Field><Field label="Total PAX">0</Field></div></div>
        <footer className="recap-footer">
          <p>THIS IS A TRAINING FACSIMILE OF A SCHEDULE PROCESSING RECAP REPORT. ALL IDENTIFIERS ARE FICTIONAL.</p>
          <p>FOR TRAINING USE ONLY</p>
          <div><span>Originating Office: CDF TRAINING</span><span>FOR TRAINING USE ONLY</span><span>{printed}</span></div>
        </footer>
      </div>
    </article>
  </div>;
}
