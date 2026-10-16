import { useId, useState } from 'react';

// Training panel card whose heading toggles its body open and closed. Each toggle sends a
// cardtoggle event so the panel's section bar can show which cards are open.
export default function CollapsibleCard({ label, title, summary, className = '', defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  const bodyId = useId();
  return <section className={`training-card collapsible-card ${open ? '' : 'is-collapsed'} ${className}`} aria-label={label}>
    <div className="card-heading">
      <h3><button type="button" className="collapse-toggle" aria-expanded={open} aria-controls={bodyId} onClick={event => { setOpen(!open); event.currentTarget.dispatchEvent(new CustomEvent('cardtoggle', { bubbles: true, detail: { open: !open } })); }}>
        <span className="collapse-icon" aria-hidden="true">▸</span>{title}
      </button></h3>
      {summary}
    </div>
    <div id={bodyId} className="collapsible-body" hidden={!open}>{children}</div>
  </section>;
}
