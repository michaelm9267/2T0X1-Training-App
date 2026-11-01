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
};
const cache = {};
const loadPassages = setId => {
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

export const citeLabel = (item, publication) => `${item.publication || publication}, ${/^\d/.test(item.ref) ? `para ${item.ref}` : item.ref}`;

function PassagePopup({ id, label, passage, trigger, onEnter, onLeave }) {
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
    <section ref={node} id={id} role="tooltip" className="regulation-popover waps-passage" data-regulation-popup="" style={position}
      onMouseEnter={onEnter} onMouseLeave={onLeave}>
      <header>
        <strong>{label}</strong>
        {passage && <small>{passage.edition} · PDF page {passage.page}</small>}
      </header>
      {passage === undefined && <p>Loading the regulation text…</p>}
      {passage === null && <p>The exact wording for this citation is not available.</p>}
      {passage && <>
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
  const trigger = useRef(null);
  const timer = useRef(null);
  const id = useId();

  useEffect(() => {
    if (!quote || !open) return undefined;
    let live = true;
    loadPassages(item.setId).then(data => { if (live) setPassage(findPassage(data, item)); });
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
    {open && <PassagePopup id={id} label={label} passage={passage} trigger={trigger.current}
      onEnter={() => clearTimeout(timer.current)} onLeave={hide} />}
  </>;
}
