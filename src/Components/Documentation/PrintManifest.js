import { useEffect, useRef } from 'react';
import { isHazardousIndicator, DODAAC_PORTS, ORIGIN } from '../CargoWindow/workflow';

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
// Four-digit Julian date: last digit of the year followed by the day of the year (YDDD).
export function julianDate(date) {
  const start = new Date(date.getFullYear(), 0, 0);
  const day = Math.round((new Date(date.getFullYear(), date.getMonth(), date.getDate()) - start) / 86400000);
  return `${date.getFullYear() % 10}${String(day).padStart(3, '0')}`;
}
// Manifest number: APOE + Julian date + manifest sequence number.
export const manifestNumber = (date, sequence = 1) => `${DODAAC_PORTS[ORIGIN]}${julianDate(date)}${String(sequence).padStart(3, '0')}`;

export default function PrintManifest({ pieces, date = new Date(), onClose }) {
  const dialog = useRef(null);
  useEffect(() => {
    dialog.current?.focus();
    const closeOnEscape = event => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', closeOnEscape);
    document.body.classList.add('cmos-modal-open');
    return () => { document.removeEventListener('keydown', closeOnEscape); document.body.classList.remove('cmos-modal-open'); };
  }, [onClose]);
  const number = manifestNumber(date);
  const cube = record => record.length * record.width * record.height / 1728;
  const totals = pieces.reduce((sum, { record }) => ({ weight: sum.weight + Number(record.weight), cube: sum.cube + cube(record) }), { weight: 0, cube: 0 });
  const hazardous = pieces.filter(({ record }) => isHazardousIndicator(record.hazmat)).length;
  const printed = `${String(date.getDate()).padStart(2, '0')} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
  return <div className="cmos-overlay print-overlay" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <article className="paper-sheet print-manifest" role="dialog" aria-modal="true" aria-label={`Cargo manifest ${number}`} tabIndex={-1} ref={dialog}>
      <div className="paper-toolbar no-print"><span>Cargo manifest</span><span className="print-actions"><button type="button" className="print-button" onClick={() => window.print()}>Print</button><button type="button" aria-label="Close cargo manifest" onClick={onClose}>×</button></span></div>
      <p className="paper-banner">FOR TRAINING USE ONLY — FICTIONAL DOCUMENT</p>
      <header className="paper-header"><div><strong>Cargo Manifest</strong><span>Air movement · Increment cargo</span></div><span className="paper-form">Manifest Nbr {number}</span></header>
      <div className="paper-boxes">
        {[['Manifest number', number], ['Date', `${printed} (${julianDate(date)})`], ['APOE', DODAAC_PORTS[ORIGIN]], ['Origin DoDAAC', ORIGIN], ['Total pieces', pieces.length], ['Total weight (lb)', totals.weight.toLocaleString()], ['Total cube (ft³)', totals.cube.toFixed(1)], ['Hazardous pieces', hazardous]].map(([k, v]) => <div key={k}><small>{k}</small><span>{v}</span></div>)}
      </div>
      <div className="paper-table"><table>
        <thead><tr><th>Pc</th><th>TCN</th><th>Nomenclature</th><th>L × W × H (in)</th><th>Weight (lb)</th><th>Cube (ft³)</th><th>Consignee / APOD</th><th>Haz ind</th><th>UN/ID</th></tr></thead>
        <tbody>{pieces.map(({ scenarioId, record }, index) => <tr key={scenarioId}>
          <td>{index + 1}</td><td>{record.tcn}</td><td>{record.description}</td><td>{record.length} × {record.width} × {record.height}</td>
          <td>{Number(record.weight).toLocaleString()}</td><td>{cube(record).toFixed(1)}</td><td>{record.destination} / {record.apod}</td>
          <td>{record.hazmat.slice(0, 1)}</td><td>{isHazardousIndicator(record.hazmat) ? record.dg2Template || '—' : ''}</td>
        </tr>)}</tbody>
        <tfoot><tr><th colSpan="4">Totals · {pieces.length} {pieces.length === 1 ? 'piece' : 'pieces'}</th><td>{totals.weight.toLocaleString()}</td><td>{totals.cube.toFixed(1)}</td><td colSpan="3" /></tr></tfoot>
      </table></div>
      <div className="paper-boxes print-signatures">
        {['Prepared by (CDF/increment monitor)', 'Load planner', 'Received by (aerial port)'].map(k => <div key={k}><small>{k}</small><span>&nbsp;</span></div>)}
      </div>
    </article>
  </div>;
}
