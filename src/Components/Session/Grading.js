import { useState } from 'react';
import FloatingWindow from './FloatingWindow';

// Test mode, shared by every trainer: the trainee's rank and name, finishing the test, and the
// printable grading sheet with the score and a breakdown of what was wrong.
export const RANKS = ['AB', 'Amn', 'A1C', 'SrA', 'SSgt', 'TSgt', 'MSgt', 'SMSgt', 'CMSgt', '2d Lt', '1st Lt', 'Capt', 'Maj', 'Lt Col', 'Col', 'Civ'];
export const emptyTest = () => ({ trainee: { rank: '', first: '', last: '' }, finishedAt: null });
export const traineeReady = trainee => ['rank', 'first', 'last'].every(id => String(trainee?.[id] ?? '').trim());
const dateOf = time => time ? new Date(time).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase() : '';

// Who is testing. Finishing locks the work and opens the grading sheet.
export function TraineeBar({ trainee = {}, finishedAt, onChange, onFinish, onOpenSheet }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');
  const edit = (id, value) => { onChange({ ...trainee, [id]: value }); setError(''); };
  const finish = () => {
    if (!traineeReady(trainee)) { setError('Enter rank, first name and last name before finishing.'); setConfirming(false); return; }
    setConfirming(false); onFinish();
  };
  return <div className="shipment-bar trainee-bar" role="group" aria-label="Trainee">
    <label>Rank <select value={trainee.rank || ''} disabled={Boolean(finishedAt)} onChange={event => edit('rank', event.target.value)}><option value="">Select</option>{RANKS.map(rank => <option key={rank} value={rank}>{rank}</option>)}</select></label>
    <label>First name <input value={trainee.first || ''} readOnly={Boolean(finishedAt)} onChange={event => edit('first', event.target.value)} /></label>
    <label>Last name <input value={trainee.last || ''} readOnly={Boolean(finishedAt)} onChange={event => edit('last', event.target.value)} /></label>
    {finishedAt ? <button type="button" className="primary-button" onClick={onOpenSheet}>Grading sheet</button>
      : confirming ? <span className="session-confirm" role="group" aria-label="Confirm finish test">
        <span>Finish the test? Your work locks and is graded.</span>
        <button type="button" className="primary-button" onClick={finish}>Finish and grade</button>
        <button type="button" onClick={() => setConfirming(false)}>Cancel</button>
      </span>
      : <button type="button" onClick={() => setConfirming(true)}>Finish test</button>}
    {error && <p role="alert" className="setup-error">{error}</p>}
  </div>;
}

// The printable grading sheet. rows fill the summary table under columns; each section lists
// what was wrong on one item (or the whole deployment), with the step and reference.
export function GradingSheet({ heading, subtitle, trainee, finishedAt, final, boxes = [], scoringNote, columns, rows, sections, onClose }) {
  return <FloatingWindow title="Grading sheet" onClose={onClose} className="paper-sheet print-manifest grading-sheet" printable>
    <p className="paper-banner">FOR TRAINING USE ONLY</p>
    <header className="paper-header"><div><strong>{heading}</strong><span>{subtitle} · Test mode</span></div><span className="paper-form">Final score {final} / 100</span></header>
    <div className="paper-boxes">
      {[['Rank', trainee.rank], ['Last name', trainee.last], ['First name', trainee.first], ['Date', dateOf(finishedAt)], ...boxes, ['Final score', `${final} / 100`]].map(([k, v]) => <div key={k}><small>{k}</small><span>{v || '—'}</span></div>)}
    </div>
    <p className="reference-note">{scoringNote}</p>
    <div className="paper-table"><table>
      <thead><tr>{columns.map(column => <th key={column}>{column}</th>)}</tr></thead>
      <tbody>{rows.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j}>{cell}</td>)}</tr>)}</tbody>
    </table></div>
    {sections.map(section => <section key={section.key} className="aar-piece" aria-label={`${section.label} breakdown`}>
      <h5>{section.title}</h5>
      {section.note && <p className="grading-incomplete">{section.note}</p>}
      <div className="paper-table"><table>
        <thead><tr><th>What was wrong</th><th>Step</th><th>Reference</th></tr></thead>
        <tbody>{section.mistakes.length ? section.mistakes.map((m, i) => <tr key={i}><td>{m.detail}</td><td>{m.step}</td><td>{m.reference}</td></tr>) : <tr><td colSpan="3">No mistakes recorded.</td></tr>}</tbody>
      </table></div>
    </section>)}
    <div className="paper-boxes grading-signatures">
      {['Trainee signature', 'Evaluator signature', 'Date'].map(k => <div key={k}><small>{k}</small><span /></div>)}
    </div>
  </FloatingWindow>;
}
