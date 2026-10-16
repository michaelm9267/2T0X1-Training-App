import { useCallback, useEffect, useRef, useState } from 'react';
import useModalDialog from '../Training/useModalDialog';

// CMOS browser window for the Outbound trainer: logo bar, login line, the Cargo Management menu,
// and the current page. The customer's shipping document can be docked beside the screen.

const MENU = [
  ['Inbound', ['Convoy Delivery Records', 'Inbound Cargo', 'OS&D', 'Turnover']],
  ['Outbound', ['Shipment Planning', 'Aggregates', 'Air Manifest', 'Commercial BOL', 'Containerization', 'Consolidate Shipments', 'Electronic Export Information', 'Obligation Authorities', 'Pallets', 'Print Shipping Label', 'Rate Quote', 'Release (Chalk/Convoy/Manifest)', 'Reusable Container', 'RF ITV Registration', 'Routings', 'Send ATCMDs to ACA', 'Send ATCMDs to WPS', 'Small Package Express', 'Small Parcels', 'Supply Document Cancellation', 'Truck Manifest']],
  ['Common In/Out', ['Air Schedule', 'Carrier Incidents', 'Communications', 'REPSHIPs', 'RF Tag Number List', 'Status', 'Synchronize HHT']],
  ['Deployment', ['Change Deployment Cargo Data', 'Convoy Schedule', 'Deployment Parameters', 'Import Unit Move', 'Unit Deployment List']],
];
export const CMOS_PAGES = { 'Shipment Planning': 'planning', 'Small Package Express': 'spe' };

function CmosLogo() {
  return <svg className="cmos-logo-mark" viewBox="0 0 120 30" aria-hidden="true">
    {['C', 'M', 'O', 'S'].map((letter, i) => <g key={letter} transform={`translate(${i * 30} 0)`}>
      <rect x="1" y="1" width="28" height="28" rx={i === 1 ? 3 : 13} fill="#5f6368" stroke="#3c4043" />
      <text x="15" y="21" textAnchor="middle" fontSize="17" fontWeight="700" fill="#f1f3f4" fontFamily="Arial, sans-serif">{letter}</text>
    </g>)}
  </svg>;
}

export default function CmosWindow({ origin, page, title, onNavigate, onClose, paper, children, pages = CMOS_PAGES }) {
  const dialog = useRef(null);
  const [paperOpen, setPaperOpen] = useState(false);
  const closeRef = useRef(onClose); closeRef.current = onClose;
  const stableClose = useCallback(() => closeRef.current(), []);
  useModalDialog(dialog, stableClose);
  useEffect(() => {
    document.body.classList.add('cmos-modal-open');
    return () => document.body.classList.remove('cmos-modal-open');
  }, []);
  return <div className="cmos-overlay" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className={`cmos-workspace cmos-app-workspace ${paperOpen ? 'has-paper' : ''}`}>
      <section className="cmos-app" role="dialog" aria-modal="true" aria-label={`CMOS ${title}`} tabIndex={-1} ref={dialog}>
        <header className="cmos-app-header">
          <div className="cmos-logo"><CmosLogo /><span>Cargo Movement Operations System</span></div>
          <div className="cmos-app-top">
            <div className="cmos-toplinks"><span>Dashboard</span><span>Date/Time</span><span>Intelink</span><span>Contact</span><button type="button" onClick={onClose}>Logout</button></div>
            <p>Logged in as TRAINEE at DODAAC: {origin.cmosDodaac}</p>
          </div>
          <button type="button" className="cmos-app-close" aria-label="Close CMOS" onClick={onClose}>×</button>
        </header>
        <div className="cmos-app-body">
          <nav className="cmos-menu" aria-label="CMOS menu">
            <strong className="cmos-menu-root">⌄ Cargo Management</strong>
            {MENU.map(([group, items]) => <div key={group} className="cmos-menu-group">
              <span className="cmos-menu-heading">{group}</span>
              <ul>{items.map(item => <li key={item}>{pages[item]
                ? <button type="button" aria-current={pages[item] === page ? 'page' : undefined} onClick={() => onNavigate(pages[item])}>{item}</button>
                : <span title="Not used in this training">{item}</span>}</li>)}</ul>
            </div>)}
            {['Passenger Management', 'Reference Data', 'Reports & Queries'].map(item => <strong key={item} className="cmos-menu-root cmos-menu-closed">› {item}</strong>)}
          </nav>
          <div className="cmos-app-main">
            <div className="cmos-page-head">
              <h2 className="cmos-page-title">{title}</h2>
              {paper && <button type="button" className="cmos-paper-toggle" aria-pressed={paperOpen} onClick={() => setPaperOpen(open => !open)}>{paperOpen ? `Hide ${paper.title}` : `Show ${paper.title}`}</button>}
            </div>
            {children}
          </div>
        </div>
      </section>
      {paper && paperOpen && <aside className="paper-sheet shipping-document cmos-paper" aria-label={`${paper.title} (docked)`}>
        <div className="paper-toolbar"><span>{paper.title}</span><button type="button" aria-label={`Close ${paper.title} paperwork`} onClick={() => setPaperOpen(false)}>×</button></div>
        {paper.render()}
      </aside>}
    </div>
  </div>;
}
