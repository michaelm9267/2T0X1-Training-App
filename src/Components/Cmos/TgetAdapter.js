import { useEffect, useRef, useState } from 'react';
import { Dialog } from './controls';

// TGET Adapter: CMOS's Val Funds sends the TCN's TAC to TGET, which prevalidates the line of
// accounting (LOA). The window shows its progress; when it finishes, CMOS sets LOA Val Status to P.
// Training simulation: no funds system is contacted.
export const TGET_RUN_MS = 2400;

export default function TgetAdapter({ tcn, tac, onComplete, onClose, runMs = TGET_RUN_MS }) {
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const done = useRef(false);
  const finish = useRef(onComplete);
  finish.current = onComplete;
  useEffect(() => {
    if (!String(tac || '').trim()) { setResult({ ok: false, details: 'TAC is required. Enter the TAC in Shipment Planning, then Val Funds again.' }); return undefined; }
    const step = Math.max(20, runMs / 25);
    const timer = setInterval(() => setProgress(current => Math.min(100, current + 4)), step);
    return () => clearInterval(timer);
  }, [tac, runMs]);
  useEffect(() => {
    if (progress < 100 || done.current) return;
    done.current = true;
    setResult(finish.current());
  }, [progress]);
  const running = !result;
  return <Dialog title="TGET Adapter" wide onClose={() => onClose(running)}><div className="tget-adapter">
    <header className="tget-header"><span className="tget-logo" aria-hidden="true">CMOS</span><span>TGET Adapter</span></header>
    <p className="tget-warning" role="note"><span aria-hidden="true">⚠ </span>Do not close this browser until validation is complete. Closing the browser will stop the validation process. The browser may be minimized and you may continue to work in CMOS while the validation is being performed.</p>
    <div className="tget-progress" role="progressbar" aria-label="Funds validation progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
      <span style={{ width: `${Math.max(progress, 3)}%` }}>{progress}%</span>
    </div>
    <h3>{tcn}</h3>
    <p className="tget-state" role="status">{running ? 'Prevalidating LOA...' : result.ok ? 'LOA prevalidation complete.' : 'LOA prevalidation failed.'}</p>
    <table className="tget-table">
      <thead><tr><th>TCN</th><th>TAC</th><th>Details</th></tr></thead>
      <tbody><tr><td>{tcn}</td><td>{tac}</td><td>{running ? 'Processing...' : result.details}</td></tr></tbody>
    </table>
    <footer className="cmos-release-footer"><button type="button" onClick={() => onClose(running)}>{running ? 'Minimize' : 'Close'}</button></footer>
  </div></Dialog>;
}
