import { useEffect, useRef } from 'react';
import { MISTAKE_POINTS, MISSED_POINTS, overallScore } from '../CargoWindow/scoring';
import { DODAAC_INFO } from '../CargoWindow/workflow';

// After-action report for the deployment: score, stage progress, mistakes, and caught or missed
// discrepancies for each piece, with the reference that covers each item. Printable.
const STAGES = [['precheck', 'Precheck'], ['incheck', 'Incheck'], ['manifest', 'Manifest'], ['ji', 'JI']];

export default function AfterActionReport({ pieces, destination, mode, onClose }) {
  const dialog = useRef(null);
  useEffect(() => {
    dialog.current?.focus();
    const closeOnEscape = event => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', closeOnEscape);
    document.body.classList.add('cmos-modal-open');
    return () => { document.removeEventListener('keydown', closeOnEscape); document.body.classList.remove('cmos-modal-open'); };
  }, [onClose]);
  const overall = overallScore(pieces.map(piece => piece.result));
  const totals = pieces.reduce((sum, { result }) => ({ mistakes: sum.mistakes + result.mistakes.length, caught: sum.caught + result.discrepancies.filter(d => d.status === 'Caught').length, missed: sum.missed + result.missed, found: sum.found + result.discrepancies.length }), { mistakes: 0, caught: 0, missed: 0, found: 0 });
  return <div className="cmos-overlay print-overlay" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <article className="paper-sheet print-manifest aar-sheet" role="dialog" aria-modal="true" aria-label="After-action report" tabIndex={-1} ref={dialog}>
      <div className="paper-toolbar no-print"><span>After-action report</span><span className="print-actions"><button type="button" className="print-button" onClick={() => window.print()}>Print</button><button type="button" aria-label="Close after-action report" onClick={onClose}>×</button></span></div>
      <p className="paper-banner">FOR TRAINING USE ONLY</p>
      <header className="paper-header"><div><strong>After-Action Report</strong><span>CDF training deployment · {mode === 'test' ? 'Test mode' : 'Guided mode'} · Destination {destination} ({DODAAC_INFO[destination]?.port})</span></div><span className="paper-form">Overall score {overall === null ? '—' : `${overall} / 100`}</span></header>
      <div className="paper-boxes">
        {[['Pieces started', `${pieces.filter(p => p.result.started).length} of ${pieces.length}`], ['Pieces through JI', pieces.filter(p => p.result.done.includes('ji')).length], ['Mistakes', totals.mistakes], ['Discrepancies caught', `${totals.caught} of ${totals.found}`], ['Discrepancies missed', totals.missed]].map(([k, v]) => <div key={k}><small>{k}</small><span>{v}</span></div>)}
      </div>
      <p className="reference-note">Each piece starts at 100. A mistake costs {MISTAKE_POINTS} points; a discrepancy still uncaught when the piece reaches the manifest costs {MISSED_POINTS}. The overall score averages the pieces started.</p>
      {pieces.map(({ title, tcn, result }) => <section key={tcn} className="aar-piece" aria-label={`${title} results`}>
        <h5>{title} · {tcn} · {result.started ? `Score ${result.score}` : 'Not started'}</h5>
        <p className="aar-stages">{STAGES.map(([id, label]) => <span key={id} className={result.done.includes(id) ? 'aar-done' : ''}>{result.done.includes(id) ? '✓' : '○'} {label}</span>)}{result.minutes !== null && <span>Time to JI: {result.minutes} min</span>}</p>
        <div className="paper-table"><table>
          <thead><tr><th>Discrepancy presented</th><th>Result</th><th>Reference</th></tr></thead>
          <tbody>{result.discrepancies.length ? result.discrepancies.map(item => <tr key={item.id} className={`aar-${item.status === 'Caught' ? 'caught' : item.status === 'Missed' ? 'missed' : 'open'}`}><td>{item.title}</td><td>{item.status}</td><td>{item.reference}</td></tr>) : <tr><td colSpan="3">No discrepancies on this piece — it should pass without frustration.</td></tr>}</tbody>
        </table></div>
        <div className="paper-table"><table>
          <thead><tr><th>Mistake</th><th>Type</th><th>Reference</th></tr></thead>
          <tbody>{result.mistakes.length ? result.mistakes.map((m, i) => <tr key={i}><td>{m.detail}</td><td>{m.kind}</td><td>{m.reference}</td></tr>) : <tr><td colSpan="3">No mistakes recorded.</td></tr>}</tbody>
        </table></div>
      </section>)}
    </article>
  </div>;
}
