import { useEffect, useRef, useState } from 'react';
import { DESTINATIONS, DODAAC_INFO } from '../CargoWindow/workflow';
import { MAX_PIECES, pieceSlots } from '../CargoWindow/pieces';
import { possibleDiscrepancies } from '../CargoWindow/discrepancies';
import { decodeScenario, encodeScenario, newSeed, sessionFromScenario } from './scenarioCode';

// Instructor setup: build a deployment (pieces, destination, mode, and which discrepancies each
// piece presents) and share it as a scenario code, or load a code from an instructor.
export default function InstructorSetup({ currentCode, onStart, onClose }) {
  const dialog = useRef(null);
  useEffect(() => {
    dialog.current?.focus();
    const closeOnEscape = event => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', closeOnEscape);
    document.body.classList.add('cmos-modal-open');
    return () => { document.removeEventListener('keydown', closeOnEscape); document.body.classList.remove('cmos-modal-open'); };
  }, [onClose]);
  const [tab, setTab] = useState('setup');
  const [settings, setSettings] = useState(() => decodeScenario(currentCode) || { seed: newSeed(), pieceCount: 6, destination: null, mode: 'guided', forced: {} });
  const [entered, setEntered] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const code = encodeScenario(settings);
  const update = changes => { setSettings(previous => ({ ...previous, ...changes })); setCopied(false); };
  const choose = (key, id, value) => {
    const choices = { ...settings.forced[key] };
    if (value === 'random') delete choices[id]; else choices[id] = value === 'present';
    update({ forced: { ...settings.forced, [key]: choices } });
  };
  function load() {
    const parsed = decodeScenario(entered);
    if (!parsed) { setError('That scenario code is not valid. Check it and try again.'); return; }
    onStart(sessionFromScenario(parsed, entered.trim()));
  }
  return <div className="cmos-overlay" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <article className="paper-sheet setup-sheet" role="dialog" aria-modal="true" aria-label="Instructor setup" tabIndex={-1} ref={dialog}>
      <div className="paper-toolbar"><span>Instructor setup</span><button type="button" aria-label="Close instructor setup" onClick={onClose}>×</button></div>
      <div className="setup-tabs" role="tablist" aria-label="Instructor setup">
        {[['setup', 'Set up a deployment'], ['load', 'Load a scenario code']].map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}>{label}</button>)}
      </div>
      {tab === 'setup' ? <div className="setup-body">
        <p>Choose the deployment, then share the scenario code so every trainee gets the same pieces, readings, and discrepancies. Starting it replaces the current session on this computer.</p>
        <div className="setup-grid">
          <label>Pieces <select value={settings.pieceCount} onChange={event => update({ pieceCount: Number(event.target.value) })}>{Array.from({ length: MAX_PIECES }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n}</option>)}</select></label>
          <label>Destination <select value={settings.destination || ''} onChange={event => update({ destination: event.target.value || null })}><option value="">Random</option>{DESTINATIONS.map(d => <option key={d} value={d}>{d} · {DODAAC_INFO[d].port}</option>)}</select></label>
          <label>Mode <select value={settings.mode} onChange={event => update({ mode: event.target.value })}><option value="guided">Guided</option><option value="test">Test</option></select></label>
          <label>Seed <span className="setup-seed"><input type="number" value={settings.seed} onChange={event => update({ seed: Math.max(0, Math.floor(Number(event.target.value) || 0)) })} /><button type="button" onClick={() => update({ seed: newSeed() })}>New seed</button></span></label>
        </div>
        <h5>Discrepancies by piece</h5>
        <p className="reference-note">Random lets the seed decide. Present or Absent pins a discrepancy for every trainee.</p>
        {pieceSlots().slice(0, settings.pieceCount).map(({ key, title, template }) => <details key={key} className="setup-piece">
          <summary>{title} <span>{Object.keys(settings.forced[key] || {}).length} pinned</span></summary>
          <div className="setup-choices">{possibleDiscrepancies(template).map(([id, label]) => {
            const value = settings.forced[key]?.[id];
            return <label key={id}>{label}<select aria-label={`${title}: ${label}`} value={value === undefined ? 'random' : value ? 'present' : 'absent'} onChange={event => choose(key, id, event.target.value)}><option value="random">Random</option><option value="present">Present</option><option value="absent">Absent</option></select></label>;
          })}</div>
        </details>)}
        <label className="setup-code">Scenario code <input readOnly value={code} onFocus={event => event.target.select()} /></label>
        <div className="answer-options">
          <button type="button" onClick={() => { navigator.clipboard?.writeText(code).then(() => setCopied(true), () => setCopied(false)); }}>{copied ? 'Copied' : 'Copy code'}</button>
          <button type="button" className="primary-button" onClick={() => onStart(sessionFromScenario(settings, code))}>Start this deployment</button>
        </div>
      </div> : <div className="setup-body">
        <p>Paste the scenario code from your instructor. Loading it replaces the current session on this computer.</p>
        <label className="setup-code">Scenario code <input value={entered} onChange={event => { setEntered(event.target.value); setError(''); }} placeholder="CDF-…" /></label>
        <p role="alert" className="setup-error">{error}</p>
        <div className="answer-options"><button type="button" className="primary-button" onClick={load} disabled={!entered.trim()}>Load scenario</button></div>
      </div>}
    </article>
  </div>;
}
