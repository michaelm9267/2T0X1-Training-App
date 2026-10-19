import { useEffect, useRef, useState } from 'react';
import { GLOSSARY, acronymAt, findAcronyms } from './acronyms';
import './acronym-tooltip.css';

// Shows what an acronym means when the pointer rests on it anywhere in the page. It reads the
// word under the pointer rather than wrapping text, so it covers every screen without changing
// the markup React renders. Known acronyms also get a dotted underline where the browser
// supports the CSS Custom Highlight API.
function caretAt(x, y) {
  if (document.caretPositionFromPoint) {
    const position = document.caretPositionFromPoint(x, y);
    return position && { node: position.offsetNode, offset: position.offset };
  }
  if (document.caretRangeFromPoint) {
    const range = document.caretRangeFromPoint(x, y);
    return range && { node: range.startContainer, offset: range.startOffset };
  }
  return null;
}

function acronymAtPoint(x, y, ignore) {
  const caret = caretAt(x, y);
  if (!caret || caret.node?.nodeType !== Node.TEXT_NODE || ignore?.contains(caret.node)) return null;
  const hit = acronymAt(caret.node.textContent, caret.offset);
  if (!hit || caret.node.parentElement?.closest('[data-regulation-source], [data-regulation-popup]')) return null;
  const range = document.createRange();
  range.setStart(caret.node, hit.start);
  range.setEnd(caret.node, hit.end);
  // The caret lands on the nearest text even when the pointer is beside it; require a direct hit.
  const rect = [...range.getClientRects()].find(r => x >= r.left - 2 && x <= r.right + 2 && y >= r.top - 2 && y <= r.bottom + 2);
  return rect ? { term: hit.term, rect } : null;
}

function underlineAcronyms(ignore) {
  if (typeof CSS === 'undefined' || !CSS.highlights || !window.Highlight) return;
  const ranges = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode: node => node.parentElement?.closest('script, style, option, textarea, [data-regulation-source], [data-regulation-popup]') || ignore?.contains(node) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
  });
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    for (const hit of findAcronyms(node.textContent)) {
      const range = new Range();
      range.setStart(node, hit.start);
      range.setEnd(node, hit.end);
      ranges.push(range);
    }
  }
  CSS.highlights.set('acronym', new window.Highlight(...ranges));
}

export default function AcronymTooltip() {
  const [tip, setTip] = useState(null);
  const tooltip = useRef(null);
  useEffect(() => {
    let frame = 0;
    const show = (x, y) => {
      const hit = acronymAtPoint(x, y, tooltip.current);
      setTip(current => !hit ? null : current?.term === hit.term && current.rect.left === hit.rect.left && current.rect.top === hit.rect.top ? current : hit);
    };
    const move = event => {
      cancelAnimationFrame(frame);
      const { clientX, clientY } = event;
      frame = requestAnimationFrame(() => show(clientX, clientY));
    };
    const tap = event => { if (event.pointerType === 'touch') show(event.clientX, event.clientY); };
    const hide = () => setTip(null);
    const escape = event => { if (event.key === 'Escape') hide(); };
    document.addEventListener('mousemove', move);
    document.addEventListener('pointerdown', tap);
    document.addEventListener('scroll', hide, true);
    document.addEventListener('keydown', escape);
    let timer = 0;
    const refresh = () => { clearTimeout(timer); timer = setTimeout(() => underlineAcronyms(tooltip.current), 200); };
    const observer = new MutationObserver(refresh);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    refresh();
    return () => {
      cancelAnimationFrame(frame); clearTimeout(timer); observer.disconnect();
      document.removeEventListener('mousemove', move);
      document.removeEventListener('pointerdown', tap);
      document.removeEventListener('scroll', hide, true);
      document.removeEventListener('keydown', escape);
      if (typeof CSS !== 'undefined' && CSS.highlights) CSS.highlights.delete('acronym');
    };
  }, []);
  const width = 280, margin = 8;
  const style = tip && {
    left: Math.max(margin, Math.min(tip.rect.left + tip.rect.width / 2 - width / 2, window.innerWidth - width - margin)),
    ...(tip.rect.bottom + 90 > window.innerHeight ? { bottom: window.innerHeight - tip.rect.top + 6 } : { top: tip.rect.bottom + 6 }),
    maxWidth: width,
  };
  return <div ref={tooltip} className="acronym-tooltip" role="tooltip" hidden={!tip} style={style || undefined}>
    {tip && <><strong>{tip.term}</strong><span>{GLOSSARY[tip.term]}</span></>}
  </div>;
}
