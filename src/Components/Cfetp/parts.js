import React, { useState } from 'react';
import { CHECKED, STATUS_LABELS, publicationStatus } from './publications';

// Pieces shared by the CFETP views and the training walkthrough.

// The current system of record for training records. The CFETP says only "the authorized system".
export const RECORD_SYSTEM = 'TBA 2.0';
const ISSUES_URL = 'https://github.com/michaelm9267/2T0X1-Training-App/issues/new';

export function Unverified() {
  return <span className="cfetp-badge cfetp-badge-warn" title="The CFETP lists TTG titles only. This pairing is suggested from the TTG title and has not been checked against the TTG itself.">Suggested · unverified</span>;
}

export function Verified() {
  return <span className="cfetp-badge cfetp-badge-ok" title="Task coverage taken from the TTG document itself.">From the TTG</span>;
}

export function SourceLink({ status }) {
  return status?.url ? <a className="cfetp-source-link" href={status.url} target="_blank" rel="noreferrer">Open source</a> : null;
}

// A cited publication, flagged when it has been replaced, misprinted, or needs confirming, with a
// link to the current edition where one is known.
export function PubRef({ text }) {
  const status = publicationStatus(text);
  if (!status) return <>{text}</>;
  if (status.status === 'current') return <>{text} <SourceLink status={status} /></>;
  return <>{text} <span className={`cfetp-badge cfetp-pub-${status.status}`}>{STATUS_LABELS[status.status]}</span> <span className="cfetp-pub-note">Now: {status.current}. {status.note}</span> <SourceLink status={status} /></>;
}

// The publication changes that affect a set of citations, once each.
export function pubUpdates(texts) {
  const seen = new Map();
  texts.forEach(text => {
    const status = publicationStatus(text);
    if (status && status.status !== 'current' && !seen.has(status.current)) seen.set(status.current, { text: text.match(status.pattern)[0], status });
  });
  return [...seen.values()];
}

export function PubUpdates({ texts }) {
  const updates = pubUpdates(texts);
  if (!updates.length) return null;
  return <div className="cfetp-callout-text" role="note" aria-label="Publication updates">
    <strong>Publication updates (checked {CHECKED}):</strong>
    <ul>{updates.map(({ text, status }) => <li key={status.current}><span className={`cfetp-badge cfetp-pub-${status.status}`}>{STATUS_LABELS[status.status]}</span> {text}: now {status.current}. {status.note} <SourceLink status={status} /></li>)}</ul>
  </div>;
}

export function Steps({ items, ordered }) {
  const List = ordered ? 'ol' : 'ul';
  return <List>{items.map((item, i) => (typeof item === 'string' ? <li key={i}>{item}</li> : <li key={i}>{item.text}<Steps items={item.items} /></li>))}</List>;
}

export function StepBlock({ step }) {
  return <div className="cfetp-step">
    {step.heading && <h5>{step.heading}</h5>}
    {step.intro && <p>{step.intro}</p>}
    {step.items.length > 0 && <Steps items={step.items} ordered={step.ordered} />}
  </div>;
}

// Report a passage that looks wrong: a prefilled GitHub issue, or a copy of the same report to
// send another way. `context` is a list of [label, value] lines that locate the passage.
export function ReportIssue({ context, passages = [] }) {
  const [passage, setPassage] = useState(passages[0] || '');
  const [problem, setProblem] = useState('');
  const [copied, setCopied] = useState(false);
  const lines = [...context, ['Passage', passage || '(not specified)'], ['What looks wrong', problem || '(describe it here)']];
  const body = lines.map(([label, value]) => `**${label}:** ${value}`).join('\n');
  const title = `CFETP source check: ${context[0]?.[1] || 'passage'}`;
  const href = `${ISSUES_URL}?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
  const copy = () => {
    const text = `${title}\n\n${body.replace(/\*\*/g, '')}`;
    try { window.navigator.clipboard.writeText(text).then(() => setCopied(true), () => setCopied(false)); } catch { setCopied(false); }
  };
  return <details className="cfetp-report">
    <summary>Report a questionable passage</summary>
    {passages.length > 0 && <label className="cfetp-field"><span>Passage</span>
      <select value={passage} onChange={event => setPassage(event.target.value)}>
        {passages.map(item => <option key={item} value={item}>{item}</option>)}
      </select>
    </label>}
    <label className="cfetp-field"><span>What looks wrong</span>
      <textarea rows={3} value={problem} onChange={event => setProblem(event.target.value)} placeholder="For example: the TTG cites para 4.8.2, but the current DAFI covers this in para 4.8.3." />
    </label>
    <div className="cfetp-actions">
      <a className="cfetp-button" href={href} target="_blank" rel="noreferrer">Report on GitHub</a>
      <button type="button" onClick={copy}>{copied ? 'Copied' : 'Copy report'}</button>
    </div>
    <p className="cfetp-muted cfetp-small">The report names the source and page so it can be checked against the TTG. GitHub needs an account; without one, copy the report and send it to the app owner.</p>
  </details>;
}
