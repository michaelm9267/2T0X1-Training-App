import { useEffect, useState } from 'react';
import { RELEASE_WINDOW_MINUTES, formatTime, parseLocal, releaseManifest, releaseWindow, setDepartureTime } from './departureLogic';
import { DODAAC_INFO, ORIGIN } from '../CargoWindow/workflow';
import { useTestMode } from '../Session/mode';
import './departure.css';

// Aircraft departure: set the departure date and time, then release the manifest within the
// 30 minutes before departure.
export default function Departure({ state, departureAt, onChange, ready, waiting, manifestPieces, destination, basis, onPrintPackage, onOpenCmos }) {
  const test = useTestMode();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 15000);
    return () => window.clearInterval(timer);
  }, []);
  const window30 = releaseWindow(departureAt);
  const departure = parseLocal(departureAt);
  const weight = manifestPieces.reduce((sum, { record }) => sum + Number(record.weight), 0);
  const released = Boolean(state.releasedAt);
  return <section className="departure" aria-labelledby="departure-title">
    <div className="training-heading"><span className="eyebrow">{test ? 'Test' : 'Guided practice'} · Chalk 001C · C-17</span><h2 id="departure-title">Aircraft departure</h2>
      <p className="muted">Set the aircraft departure, then release the manifest. The manifest must be released within {RELEASE_WINDOW_MINUTES} minutes of departure.</p></div>
    <div className="departure-card">
      <div className="departure-route">
        <div><small>APOE</small><strong>{DODAAC_INFO[ORIGIN].port}</strong><span>{ORIGIN}</span></div>
        <span aria-hidden="true">→</span>
        <div><small>APOD</small><strong>{DODAAC_INFO[destination]?.port}</strong><span>{destination}</span></div>
      </div>
      <label className="departure-time">Aircraft departure date and time
        <input type="datetime-local" value={departureAt} onChange={event => onChange(setDepartureTime(state, event.target.value))} />
      </label>
      <dl className="departure-facts">
        <div><dt>Current time</dt><dd>{formatTime(now)}</dd></div>
        <div><dt>Departure</dt><dd>{departure ? formatTime(departure) : '—'}</dd></div>
        {!test && <div><dt>Release window</dt><dd>{window30 ? `${formatTime(window30.opens)} to ${formatTime(window30.closes)}` : '—'}</dd></div>}
        <div><dt>Manifest</dt><dd>{manifestPieces.length} piece{manifestPieces.length === 1 ? '' : 's'} · {weight.toLocaleString()} lb</dd></div>
      </dl>
      {waiting.length > 0 && <p className="reference-note">Waiting for JI: {waiting.join(', ')}. Every piece on the DSOE must pass JI before the manifest is released.</p>}
      <div className="answer-options">{onOpenCmos ? <button type="button" className="primary-button" onClick={onOpenCmos}>Open CMOS Air Manifest</button> : <button type="button" className="primary-button" disabled={released} onClick={() => onChange(releaseManifest(state, { departureAt, now: new Date(), ready, basis }))}>{released ? 'Manifest released' : 'Release manifest'}</button>}
        {onPrintPackage && <button type="button" disabled={manifestPieces.length === 0} onClick={onPrintPackage}>Print aircraft paperwork package</button>}</div>
      <p aria-live="polite" className={released ? 'departure-released' : 'departure-feedback'}>{test && !released && state.mistakes.length && state.feedback && !/JI/.test(state.feedback) ? 'Manifest not released. Recheck the departure time and release timing.' : state.feedback}</p>
    </div>
  </section>;
}
