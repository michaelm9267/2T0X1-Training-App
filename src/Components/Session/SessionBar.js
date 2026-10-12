import { useRef, useState } from 'react';
import './session-bar.css';

// Session tools above the workspace: guided or test mode, reference tools, and starting over.
export default function SessionBar({ mode, onModeChange, onNewSession, tools = [], clock, onClockChange, onExport, onImport }) {
  const [confirming, setConfirming] = useState(false);
  const file = useRef(null);
  return <div className="session-bar" role="toolbar" aria-label="Session tools">
    <div className="mode-switch" role="group" aria-label="Training mode">
      {[['guided', 'Guided'], ['test', 'Test']].map(([id, label]) => <button key={id} type="button" aria-pressed={mode === id} onClick={() => onModeChange(id)}>{label}</button>)}
    </div>
    <span className="mode-note">{mode === 'test' ? 'Test mode: hints and explanations are hidden; results are in the after-action report.' : 'Guided mode: hints, explanations, and fixes are shown.'}</span>
    {clock && <div className="sim-clock" role="timer" aria-label="Simulation clock"><strong>{String(Math.floor(clock.elapsed / 60)).padStart(2, '0')}:{String(clock.elapsed % 60).padStart(2, '0')}</strong><button type="button" onClick={() => onClockChange({ ...clock, running: !clock.running })}>{clock.running ? 'Pause clock' : 'Start clock'}</button><button type="button" onClick={() => onClockChange({ ...clock, elapsed: 0, running: false })}>Reset clock</button></div>}
    <div className="session-tools">
      {tools.map(([label, onClick]) => <button key={label} type="button" onClick={onClick}>{label}</button>)}
      {onExport && <button type="button" onClick={onExport}>Export session</button>}
      {onImport && <><button type="button" onClick={() => file.current?.click()}>Import session</button><input className="visually-hidden" ref={file} type="file" accept="application/json,.json" aria-label="Import session file" onChange={event => { const selected = event.target.files?.[0]; if (selected) selected.text().then(onImport); event.target.value = ''; }} /></>}
      {!confirming && <button type="button" onClick={() => setConfirming(true)}>New session</button>}
      {confirming && <span className="session-confirm" role="group" aria-label="Confirm new session">
        <span>Start over? This clears all progress.</span>
        <button type="button" className="danger-button" onClick={() => { setConfirming(false); onNewSession(); }}>Start new session</button>
        <button type="button" onClick={() => setConfirming(false)}>Cancel</button>
      </span>}
    </div>
  </div>;
}
