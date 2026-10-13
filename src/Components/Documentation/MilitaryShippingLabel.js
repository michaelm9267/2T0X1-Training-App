import { useEffect, useRef } from 'react';
import { manifestFields, DODAAC_INFO } from '../CargoWindow/workflow';

// Fictional training Military Shipping Label (MSL) laid out after the DD Form 1387 label.
// Barcodes are decorative patterns derived from the text; they are not scannable.
function hash(text) {
  let h = 2166136261;
  for (const ch of String(text)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}
function seeded(seed) {
  let state = seed || 1;
  return () => { state = Math.imul(state ^ (state >>> 15), 2246822519) + 0x6d2b79f5 >>> 0; return state / 4294967296; };
}

export function Barcode({ text, height = 40, className = '' }) {
  // Code 39–style pattern: each character gives five bars and four spaces, wide or narrow.
  const bars = [];
  let x = 0;
  for (const ch of `*${text}*`) {
    const code = ch.charCodeAt(0) * 7 + 3;
    for (let i = 0; i < 9; i++) {
      const w = (code >> i) & 1 ? 2.5 : 1;
      if (i % 2 === 0) bars.push(<rect key={bars.length} x={x} width={w} height={height} />);
      x += w;
    }
    x += 1;
  }
  return <svg className={`msl-barcode ${className}`} viewBox={`0 0 ${x} ${height}`} preserveAspectRatio="none" aria-hidden="true">{bars}</svg>;
}

export function Pdf417({ text }) {
  const random = seeded(hash(text));
  const cols = 44, rows = 18, cells = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (random() > .5) cells.push(<rect key={`${r}-${c}`} x={6 + c} y={r} width="1" height="1" />);
  return <svg className="msl-2d" viewBox={`0 0 ${cols + 12} ${rows}`} preserveAspectRatio="none" aria-hidden="true">
    {[0, 2, 3.5].map(x => <rect key={x} x={x} width={x ? .8 : 1.6} height={rows} />)}{cells}{[cols + 7, cols + 8.5, cols + 10].map(x => <rect key={x} x={x} width={x === cols + 10 ? 1.6 : .8} height={rows} />)}
  </svg>;
}

export function mslData(scenario) {
  const v = Object.fromEntries(manifestFields(scenario).map(f => [f.id, f.expected]));
  return { ...v, cube: Math.round(v.length * v.width * v.height / 1728), shipped: `6${String(scenario.documentDay || 285).padStart(3, '0')}`, priority: '3', rdd: '999', project: 'TRN', tac: 'FSDN', service: 'AMC CHANNEL', from: DODAAC_INFO[v.origin], to: DODAAC_INFO[v.destination] };
}

export function MilitaryShippingLabel({ scenario }) {
  const d = mslData(scenario);
  return <div className="msl" aria-label="Military shipping label">
    <div className="msl-tcn"><small>TCN</small><strong>{d.tcn}</strong><Barcode text={d.tcn} height={50} /></div>
    <div className="msl-from-row">
      <div className="msl-from"><small>From</small> <b>{d.origin}</b><p>{d.from.unit}<br />{d.from.address}<br />{d.from.city}</p></div>
      <div className="msl-tac"><small>TAC/Type Service/Postage</small><b>{d.tac}</b><b>{d.service}</b></div>
    </div>
    <div className="msl-grid">
      <div className="msl-piece"><small>Piece</small> <b>1</b> <small>Of</small> <b>{d.pieces}</b><Barcode text={`1${d.pieces}${d.tcn.slice(-5)}`} height={60} className="msl-piece-code" /></div>
      <div className="msl-box"><small>Weight(lb.)</small><b>{d.weight}</b></div>
      <div className="msl-box"><small>Date Shipped</small><b>{d.shipped}</b></div>
      <div className="msl-box msl-rdd"><small>RDD</small><b>{d.rdd}</b></div>
      <div className="msl-box"><small>Cube (ft.)</small><b>{d.cube}</b></div>
      <div className="msl-box"><small>Project</small><b>{d.project}</b></div>
      <div className="msl-priority"><small>Priority</small><span>{d.priority}</span></div>
    </div>
    <div className="msl-shipto"><div><small>Ship To/POE</small><span className="msl-port">{d.apoe}</span></div><p className="msl-note">FOR TRAINING USE ONLY<br />Fictional label — not for shipment</p></div>
    <div className="msl-lower">
      <div className="msl-left">
        <div><small>POD</small><span className="msl-port">{d.apod}</span></div>
        <div><small>FMS Case</small><b></b></div>
        <div />
      </div>
      <div className="msl-data"><small>MSL, Supply, and TCMD Data</small><Pdf417 text={`${d.tcn}${d.destination}${d.weight}${d.cube}`} /></div>
    </div>
    <div className="msl-consignee">
      <div><strong>{d.destination}</strong><Barcode text={d.destination} height={44} /></div>
      <div><small>Ultimate Consignee / Mark for Consignee</small><p>{d.to.unit}<br />{d.to.address}<br />{d.to.city}<br />DoDAAC {d.destination}</p></div>
    </div>
  </div>;
}

export default function MslModal({ scenario, onClose }) {
  const dialog = useRef(null);
  useEffect(() => {
    dialog.current?.focus();
    const closeOnEscape = event => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', closeOnEscape);
    document.body.classList.add('cmos-modal-open');
    return () => { document.removeEventListener('keydown', closeOnEscape); document.body.classList.remove('cmos-modal-open'); };
  }, [onClose]);
  return <div className="cmos-overlay" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <article className="paper-sheet msl-sheet" role="dialog" aria-modal="true" aria-label="Military Shipping Label" tabIndex={-1} ref={dialog}>
      <div className="paper-toolbar"><span>Military Shipping Label</span><button type="button" aria-label="Close Military Shipping Label" onClick={onClose}>×</button></div>
      <MilitaryShippingLabel scenario={scenario} />
    </article>
  </div>;
}
