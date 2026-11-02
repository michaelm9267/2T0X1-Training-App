import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import '../Regulations/regulation-links.css';

// The exact regulation wording behind each question, built from the publications by
// scripts/build_waps_passages.py. Each publication's passages load on first use.
const loaders = {
  dafi10403: () => import('./passages/dafi10403.json'),
  dafi24602v2: () => import('./passages/dafi24602v2.json'),
  dafi24602v1: () => import('./passages/dafi24602v1.json'),
  dafi24602v4: () => import('./passages/dafi24602v4.json'),
  dtrPart2: () => import('./passages/dtrPart2.json'),
  dtrPart3: () => import('./passages/dtrPart3.json'),
  dtrPart4: () => import('./passages/dtrPart4.json'),
  afh1: () => import('./passages/afh1.json'),
};
const cache = {};
export const loadPassages = setId => {
  if (!loaders[setId]) return Promise.resolve(null);
  cache[setId] = cache[setId] || loaders[setId]().then(module => module.default || module).catch(() => { delete cache[setId]; return null; });
  return cache[setId];
};

export function findPassage(data, item) {
  if (!data) return null;
  const passage = data.questions[`${item.ref}|${item.question}`] || data.refs[item.ref];
  if (!passage) return null;
  const prefix = Object.keys(data.editions).find(key => key && item.ref.startsWith(key)) ?? '';
  return { ...passage, edition: data.editions[prefix] };
}

// Cited tables, rebuilt from the publication PDFs with their rows, columns, and footnotes, so a
// table citation shows as a table instead of a run of loose cell text.
let tables;
export const loadTables = () => {
  tables = tables || import('./passages/tables.json').then(module => module.default || module).catch(() => { tables = undefined; return {}; });
  return tables;
};
const TABLE_REF = /\bTable\s+([A-Z]?-?\d[\dA-Z.-]*?)\.?(?=[\s,)]|$)/;
export function findTable(data, item) {
  const match = data && (item.ref || '').match(TABLE_REF);
  return (match && data[`${item.passageSet || item.setId}|Table ${match[1]}`]) || null;
}

const STOP = new Set('the and for are not with from that this its into only all one per who what which when has have will may can than then their them they was were been over under more less each other must shall'.split(' '));
const escapeRegExp = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// The answer's own words, longest first, for marking where the answer comes from.
export function highlightTerms(answer) {
  // A lone digit ("2" in "2 hours") would mark every 2 in a table, so single characters count only
  // when they are the whole answer.
  const phraseOnly = answer.trim().length > 1;
  const words = (answer.match(/[A-Za-z0-9][A-Za-z0-9'/-]*/g) || [])
    .filter(word => !(phraseOnly && word.length < 2))
    .filter(word => /\d/.test(word) || (word.length > 3 && !STOP.has(word.toLowerCase())));
  // The whole answer comes first, so a phrase like "2 hours" is marked as one piece where it appears.
  const phrase = answer.trim().replace(/\.$/, '');
  return [...new Set([...(words.length && /\s/.test(phrase) ? [phrase] : []), ...words])].sort((a, b) => b.length - a.length);
}
export function Highlighted({ text, answer }) {
  const terms = answer ? highlightTerms(answer) : [];
  if (!terms.length) return text;
  const pattern = new RegExp(`(${terms.map(escapeRegExp).join('|')})`, 'gi');
  return text.split(pattern).map((part, index) => (index % 2 ? <mark key={index}>{part}</mark> : part));
}

const cellText = cell => (typeof cell === 'string' ? cell : cell.t);
export function RegulationTable({ table, answer }) {
  const wanted = answer ? answer.toLowerCase() : '';
  const Cell = ({ cell, header }) => {
    const tag = header || cell.h ? 'th' : 'td';
    return React.createElement(tag, { colSpan: cell.c, rowSpan: cell.r, scope: header ? 'col' : undefined, className: cellText(cell).length > 14 ? 'wide' : undefined }, <Highlighted text={cellText(cell)} answer={header ? '' : answer} />);
  };
  return (
    <figure className="waps-table">
      <figcaption>{table.title}</figcaption>
      <div className="waps-table-scroll" tabIndex={0}>
        <table>
          {table.head && <thead>{table.head.map((row, i) => <tr key={i}>{row.map((cell, j) => <Cell key={j} cell={cell} header />)}</tr>)}</thead>}
          <tbody>
            {table.rows.map((row, i) => {
              const hit = wanted && row.map(cellText).join(' ').toLowerCase().includes(wanted);
              return <tr key={i} className={hit ? 'hit' : undefined}>{row.map((cell, j) => <Cell key={j} cell={cell} />)}</tr>;
            })}
          </tbody>
        </table>
      </div>
      {table.notes && <ul className="waps-table-notes">{table.notes.map(note => <li key={note}><Highlighted text={note} answer={answer} /></li>)}</ul>}
    </figure>
  );
}

export const citeLabel = (item, publication) => `${item.publication || publication}, ${/^\d/.test(item.ref) ? `para ${item.ref}` : item.ref}`;

function PassagePopup({ id, label, passage, table, answer, trigger, onEnter, onLeave }) {
  const node = useRef(null);
  const [position, setPosition] = useState({ left: 8, top: 8 });
  useLayoutEffect(() => {
    const place = () => {
      if (!trigger?.isConnected) return;
      const rect = trigger.getBoundingClientRect();
      const box = node.current?.getBoundingClientRect();
      const width = box?.width || 460, height = box?.height || 300;
      const below = rect.bottom + 6, above = rect.top - height - 6;
      const top = below + height <= window.innerHeight - 8 || above < 8 ? below : above;
      setPosition({ left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)), top: Math.max(8, Math.min(top, window.innerHeight - height - 8)) });
    };
    place();
    window.addEventListener('resize', place);
    document.addEventListener('scroll', place, true);
    return () => { window.removeEventListener('resize', place); document.removeEventListener('scroll', place, true); };
  }, [trigger, passage]);

  return createPortal(
    <section ref={node} id={id} role="tooltip" className={`regulation-popover waps-passage${table ? ' waps-passage-table' : ''}`} data-regulation-popup="" style={position}
      onMouseEnter={onEnter} onMouseLeave={onLeave}>
      <header>
        <strong>{label}</strong>
        {table ? <small>{passage?.edition && `${passage.edition} · `}PDF page {table.page}</small> : passage && <small>{passage.edition} · PDF page {passage.page}</small>}
      </header>
      {table && <RegulationTable table={table} answer={answer} />}
      {!table && passage === undefined && <p>Loading the regulation text…</p>}
      {!table && passage === null && <p>The exact wording for this citation is not available.</p>}
      {!table && passage && <>
        <blockquote tabIndex={0}>{passage.quote}</blockquote>
        <small>{passage.note || 'Exact wording from the publication.'} “…” marks text left out.</small>
      </>}
    </section>,
    document.body,
  );
}

// A question's citation. Hovering it, focusing it, or tapping it shows the regulation's exact words.
// With `quote={false}` (e.g. a flashcard not yet flipped) it is plain text, so it cannot give the answer away.
export default function RegulationPassage({ item, publication, quote = true }) {
  const label = citeLabel(item, publication);
  const [open, setOpen] = useState(false);
  const [passage, setPassage] = useState(undefined);
  const [table, setTable] = useState(null);
  const trigger = useRef(null);
  const timer = useRef(null);
  const id = useId();

  useEffect(() => {
    if (!quote || !open) return undefined;
    let live = true;
    loadPassages(item.passageSet || item.setId).then(data => { if (live) setPassage(findPassage(data, item)); });
    loadTables().then(data => { if (live) setTable(findTable(data, item)); });
    return () => { live = false; };
  }, [quote, item, open]);
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    if (!open) return undefined;
    const escape = event => { if (event.key === 'Escape') setOpen(false); };
    const outside = event => { if (!trigger.current?.contains(event.target) && !document.getElementById(id)?.contains(event.target)) setOpen(false); };
    document.addEventListener('keydown', escape);
    document.addEventListener('pointerdown', outside);
    return () => { document.removeEventListener('keydown', escape); document.removeEventListener('pointerdown', outside); };
  }, [open, id]);

  if (!quote) return <span className="waps-cite">{label}</span>;
  const show = delay => { clearTimeout(timer.current); timer.current = setTimeout(() => setOpen(true), delay); };
  const hide = () => { clearTimeout(timer.current); timer.current = setTimeout(() => setOpen(false), 200); };

  return <>
    <button type="button" ref={trigger} className="waps-cite waps-cite-trigger" data-regulation-source=""
      aria-describedby={open ? id : undefined} aria-expanded={open} title="Hover to read the regulation's exact wording"
      onMouseEnter={() => show(150)} onMouseLeave={hide} onFocus={() => show(0)} onBlur={hide}
      onClick={() => { clearTimeout(timer.current); setOpen(value => !value); }}>
      {label}
    </button>
    {open && <PassagePopup id={id} label={label} passage={passage} table={table} answer={item.answer} trigger={trigger.current}
      onEnter={() => clearTimeout(timer.current)} onLeave={hide} />}
  </>;
}
