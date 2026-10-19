import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { citationHref } from './catalog';

export default function RegulationPopover({ id, citation, trigger, onEnter, onLeave, onFocus, onBlur }) {
  const node = useRef(null);
  const [position, setPosition] = useState({ left: 8, top: 8 });
  const doc = trigger?.ownerDocument;
  useLayoutEffect(() => {
    if (!doc || !trigger) return;
    const win = doc.defaultView || window;
    const update = () => {
      if (!trigger.isConnected) return;
      const rect = trigger.getBoundingClientRect();
      const popup = node.current?.getBoundingClientRect();
      const width = popup?.width || 420, height = popup?.height || 300;
      setPosition({ left: Math.max(8, Math.min(rect.left, win.innerWidth - width - 8)),
        top: Math.max(8, Math.min(rect.bottom + 6, win.innerHeight - height - 8)) });
    };
    update(); win.addEventListener('resize', update); doc.addEventListener('scroll', update, true);
    return () => { win.removeEventListener('resize', update); doc.removeEventListener('scroll', update, true); };
  }, [doc, trigger]);
  if (!doc) return null;
  return createPortal(<section ref={node} id={id} className="regulation-popover" data-regulation-popup="" role="dialog"
    aria-modal="false" aria-label={`${citation.title} · ${citation.section}`} style={position}
    onMouseEnter={onEnter} onMouseLeave={onLeave} onFocus={onFocus} onBlur={onBlur}>
    <header><strong>{citation.title}</strong><span>{citation.section} · {citation.edition}</span>
      <small>{citation.printedPage ? `Printed page ${citation.printedPage} · ` : ''}{citation.pdfPage ? `PDF page ${citation.pdfPage} · ` : ''}{citation.sourceKind === 'supplied copy' ? 'Verified against supplied source copy' : 'Verified source quotation'}</small></header>
    <blockquote tabIndex={0}>{citation.quote}</blockquote>
    <a href={citationHref(citation)} target="_blank" rel="noopener noreferrer">Open source · {citation.section} ↗</a>
    <small className="regulation-dismiss-hint">Select or scroll the quoted text. Escape closes this popup.</small>
  </section>, doc.body);
}
