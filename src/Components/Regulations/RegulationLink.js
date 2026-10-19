import { useEffect, useId, useRef, useState } from 'react';
import { citationHref, getCitation } from './catalog';
import RegulationPopover from './RegulationPopover';
import { useRegulationAids } from './RegulationScope';
import './regulation-links.css';

// Native anchors still work before the hover delay. Mode policy is applied by the shared scope.
function EnabledRegulationLink({ citationId, citation: suppliedCitation, children, className = '', details = true }) {
  const citation = suppliedCitation || getCitation(citationId);
  const [open, setOpen] = useState(false);
  const id = useId();
  const trigger = useRef(null), wrapper = useRef(null);
  const hoverTimer = useRef(null), closeTimer = useRef(null);
  const scopes = useRef({ trigger: false, popup: false, focus: false });
  const clearHover = () => { clearTimeout(hoverTimer.current); hoverTimer.current = null; };
  const clearClose = () => { clearTimeout(closeTimer.current); closeTimer.current = null; };
  const show = () => {
    clearHover(); clearClose();
    const doc = trigger.current?.ownerDocument;
    if (!doc) return;
    const event = doc.createEvent('CustomEvent'); event.initCustomEvent('regulation-open', false, false, id); doc.dispatchEvent(event);
    setOpen(true);
  };
  const scheduleClose = () => {
    clearHover(); clearClose();
    closeTimer.current = setTimeout(() => {
      if (!Object.values(scopes.current).some(Boolean)) setOpen(false);
    }, 200);
  };
  const enterTrigger = () => {
    scopes.current.trigger = true; clearClose();
    if (!open && hoverTimer.current === null) hoverTimer.current = setTimeout(show, 3000);
  };
  const leaveTrigger = () => { scopes.current.trigger = false; scheduleClose(); };
  const focus = () => { scopes.current.focus = true; show(); };
  const blur = event => {
    const next = event.relatedTarget;
    const popup = trigger.current?.ownerDocument.getElementById(id);
    if (next && (wrapper.current?.contains(next) || popup?.contains(next))) return;
    scopes.current.focus = false; scheduleClose();
  };
  const moveIntoQuote = event => {
    if (open && (event.key === 'ArrowDown' || (event.key === 'Tab' && !event.shiftKey))) {
      event.preventDefault();
      trigger.current?.ownerDocument.getElementById(id)?.querySelector('blockquote')?.focus();
    }
  };
  useEffect(() => {
    clearHover(); clearClose(); setOpen(false);
    scopes.current = { trigger: false, popup: false, focus: false };
  }, [citationId, suppliedCitation?.id, suppliedCitation?.quote]);
  useEffect(() => {
    if (!open) return;
    const doc = trigger.current?.ownerDocument;
    const escape = event => {
      if (event.key !== 'Escape') return;
      event.preventDefault(); event.stopImmediatePropagation();
      clearHover(); clearClose(); setOpen(false);
    };
    doc?.addEventListener('keydown', escape, true);
    return () => doc?.removeEventListener('keydown', escape, true);
  }, [open]);
  useEffect(() => {
    const doc = trigger.current?.ownerDocument;
    if (!doc) return;
    const other = event => { if (event.detail !== id) { clearHover(); clearClose(); setOpen(false); } };
    const escape = event => { if (event.key === 'Escape') { clearHover(); clearClose(); setOpen(false); } };
    const closed = () => { clearHover(); clearClose(); setOpen(false); };
    doc.addEventListener('regulation-open', other); doc.addEventListener('keydown', escape);
    doc.defaultView?.addEventListener('pagehide', closed);
    return () => { clearHover(); clearClose(); doc.removeEventListener('regulation-open', other);
      doc.removeEventListener('keydown', escape); doc.defaultView?.removeEventListener('pagehide', closed); };
  }, [id]);
  if (!citation) return <>{children}</>;
  return <><span className={`regulation-trigger ${className}`} ref={wrapper} data-regulation-source=""
    onMouseEnter={enterTrigger} onMouseLeave={leaveTrigger} onFocus={focus} onBlur={blur}
    onClick={event => event.stopPropagation()} onDoubleClick={event => event.stopPropagation()} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') event.stopPropagation(); }}>
    <a ref={trigger} className="regulation-link" href={citationHref(citation)} target="_blank" rel="noopener noreferrer"
      aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? id : undefined} onKeyDown={moveIntoQuote}>{children || citation.section}</a>
    {details && <button type="button" className="regulation-details" aria-label={`Show regulation quotation: ${citation.section}`}
      aria-expanded={open} aria-controls={open ? id : undefined} onClick={show} onKeyDown={moveIntoQuote}>ⓘ</button>}
  </span>{open && <RegulationPopover id={id} citation={citation} trigger={trigger.current}
    onEnter={() => { scopes.current.popup = true; clearClose(); }}
    onLeave={() => { scopes.current.popup = false; scheduleClose(); }} onFocus={focus} onBlur={blur} />}</>;
}

export default function RegulationLink(props) {
  const allowed = useRegulationAids();
  return allowed ? <EnabledRegulationLink {...props} /> : <>{props.children}</>;
}
