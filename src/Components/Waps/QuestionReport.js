import React, { createContext, useContext, useId, useState } from 'react';

export const WapsProgressContext = createContext(null);
export function downloadJson(name, value) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], {type: 'application/json'}));
  const link = document.createElement('a'); link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function QuestionReport({item}) {
  const context = useContext(WapsProgressContext);
  const [open, setOpen] = useState(false), [reason, setReason] = useState(''), [saved, setSaved] = useState(false);
  const id = useId();
  if (!context) return null;
  const submit = event => {
    event.preventDefault();
    if (!reason.trim()) return;
    const at = Date.now();
    context.save({...context.progress, reports: [...(context.progress.reports || []), {
      id: `${at}-${Math.random().toString(36).slice(2)}`, questionId: item.id, setId: item.setId,
      ref: item.ref, question: item.question, answer: item.answer, wrong: item.wrong,
      reason: reason.trim().slice(0, 2000), status: 'open', at,
    }].slice(-100)});
    setOpen(false); setSaved(true); setReason('');
  };
  return <div className="waps-report">
    <button type="button" className="waps-text-button" onClick={() => {setOpen(!open); setSaved(false);}}>Report this question</button>
    {saved && <span role="status">Report saved. Find it in Question reports to export for review.</span>}
    {open && <form onSubmit={submit}>
      <label htmlFor={id}>What needs fixing?</label>
      <textarea id={id} required maxLength={2000} value={reason} onChange={e => setReason(e.target.value)} rows={3}/>
      <div className="waps-actions"><button type="submit">Save report</button><button type="button" onClick={() => setOpen(false)}>Cancel</button></div>
    </form>}
  </div>;
}
export function ReportReview() {
  const context = useContext(WapsProgressContext);
  if (!context) return null;
  const {progress, save} = context;
  const reports = progress.reports || [];
  return <details className="waps-panel waps-report-review"><summary>Question reports ({reports.filter(r => r.status === 'open').length} open)</summary>
    <p className="waps-muted">Saved with your study progress. Export reports and send the file to your instructor for review. The most recent 100 reports are retained.</p>
    <button type="button" disabled={!reports.length} onClick={() => downloadJson('waps-question-reports.json', {version: 1, reports})}>Export reports</button>
    {!reports.length && <p>No reports saved.</p>}
    <ul className="waps-missed">{[...reports].reverse().map(r => <li key={r.id}>
      <p><strong>{r.question}</strong></p><p>{r.setId} · {r.ref} · {r.status}</p><p>{r.reason}</p>
      <small>Question ID: {r.questionId}</small>
      <button type="button" onClick={() => save({...progress, reports: reports.map(row => row.id === r.id ? {...row, status: row.status === 'open' ? 'resolved' : 'open'} : row)})}>{r.status === 'open' ? 'Mark resolved' : 'Reopen report'}</button>
    </li>)}</ul>
  </details>;
}
