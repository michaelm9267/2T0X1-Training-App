import FloatingWindow from '../Session/FloatingWindow';
import { ManifestBody } from './PrintManifest';
import { DocumentBody } from './PaperworkDocument';
import { DODAAC_INFO, ORIGIN, paperwork } from '../CargoWindow/workflow';
import { ACL, CB_RANGE, checkPlan, pieceCB } from '../LoadPlan/loadPlanLogic';
import { formatTime, parseLocal } from '../Departure/departureLogic';

// Paperwork package for the aircraft commander: everything the aircrew receives for the chalk,
// combined in one printable document. It holds the corrected paperwork: cargo manifest, load
// plan, and the HAZDEC and ATTLA certification for each piece that needs them. Use the browser's
// print dialog to print it or save it as a PDF.
export function packageDocuments(pieces) {
  const needs = id => pieces.filter(item => paperwork(item.scenario).some(d => d.id === id && d.required));
  return [
    { id: 'manifest', title: 'Cargo manifest', detail: `${pieces.length} piece${pieces.length === 1 ? '' : 's'}` },
    { id: 'load-plan', title: 'Load plan', detail: 'C-17 cargo floor positions and combined CB' },
    ...needs('hazdec').map(item => ({ id: `hazdec-${item.key}`, kind: 'hazdec', item, title: "Shipper's Declaration for Dangerous Goods (HAZDEC)", detail: `${item.title} · ${item.record.tcn}` })),
    ...needs('attla').map(item => ({ id: `attla-${item.key}`, kind: 'attla', item, title: 'ATTLA air transport certification', detail: `${item.title} · ${item.record.tcn}` })),
  ];
}

export default function AircraftPackage({ pieces, manifest, plan, departureAt, releasedAt, destination, outstanding = [], date = new Date(), onClose }) {
  const documents = packageDocuments(pieces);
  const loadPieces = pieces.map(item => ({ ...item.scenario, key: item.key, title: item.title }));
  const { weight, cb } = checkPlan(loadPieces, plan.placements);
  const departure = parseLocal(departureAt);
  const hazardous = documents.filter(d => d.kind === 'hazdec').length;
  return <FloatingWindow title="Aircraft commander paperwork package" closeLabel="Close paperwork package" onClose={onClose} className="paper-sheet print-manifest package-sheet" printable printLabel="Print package">
      <p className="no-print reference-note package-tip">Print opens your browser's print dialog. To keep a file, choose Save as PDF as the printer. Each document starts on a new page.</p>

      <section className="package-page" aria-label="Package cover sheet">
        <p className="paper-banner">FOR TRAINING USE ONLY</p>
        <header className="paper-header"><div><strong>Aircraft Commander Paperwork Package</strong><span>Mission {manifest?.mission || 'JTRN0001'} · Chalk {manifest?.chalk || '001'} · C-17</span></div><span className="paper-form">{outstanding.length ? 'DRAFT — NOT READY' : 'READY FOR AIRCREW'}</span></header>
        <div className="paper-boxes">
          {[['APOE', `${DODAAC_INFO[ORIGIN].port} · ${ORIGIN}`], ['APOD', `${DODAAC_INFO[destination]?.port} · ${destination}`], ['Aircraft departure', departure ? formatTime(departure) : '—'], ['Manifest released', releasedAt ? formatTime(new Date(releasedAt)) : 'Not released'],
            ['Pieces', pieces.length], ['Total weight (lb)', weight.toLocaleString()], ['Hazardous pieces', hazardous], ['Combined CB (in)', cb === null ? '—' : cb.toFixed(1)]].map(([k, v]) => <div key={k}><small>{k}</small><span>{v}</span></div>)}
        </div>
        {outstanding.length > 0 && <div className="package-outstanding" role="note"><strong>Not ready for the aircrew:</strong><ul>{outstanding.map(item => <li key={item}>{item}</li>)}</ul></div>}
        <h5>Contents</h5>
        <div className="paper-table"><table>
          <thead><tr><th>#</th><th>Document</th><th>Covers</th></tr></thead>
          <tbody>{documents.map((d, index) => <tr key={d.id}><td>{index + 1}</td><td>{d.title}</td><td>{d.detail}</td></tr>)}</tbody>
        </table></div>
        <div className="paper-boxes print-signatures">
          {['Prepared by (CDF)', 'Received by (aircraft commander or loadmaster)', 'Date and time received'].map(k => <div key={k}><small>{k}</small><span>&nbsp;</span></div>)}
        </div>
      </section>

      <section className="package-page" aria-label="Cargo manifest"><ManifestBody pieces={pieces.map(item => ({ scenarioId: item.key, record: item.record, palletId:item.palletId }))} manifest={manifest} date={date} /></section>

      <section className="package-page" aria-label="Load plan">
        <p className="paper-banner">FOR TRAINING USE ONLY</p>
        <header className="paper-header"><div><strong>Load Plan</strong><span>C-17 · Chalk 001 · simplified training limits</span></div><span className="paper-form">{plan.accepted ? 'ACCEPTED' : 'NOT ACCEPTED'}</span></header>
        <div className="paper-table"><table>
          <thead><tr><th>Piece</th><th>TCN</th><th>Weight (lb)</th><th>Forward edge station (in)</th><th>Lateral offset (in)</th><th>Piece CB station (in)</th></tr></thead>
          <tbody>{loadPieces.map((piece, index) => { const spot = plan.placements[piece.key]; return <tr key={piece.key}>
            <td>{piece.title}</td><td>{pieces[index].record.tcn}</td><td>{piece.weight.toLocaleString()}</td>
            <td>{spot ? spot.station : 'Not placed'}</td><td>{spot ? spot.lateral : '—'}</td><td>{spot ? (spot.station + pieceCB(piece)).toFixed(1) : '—'}</td>
          </tr>; })}</tbody>
          <tfoot><tr><th colSpan="2">Totals</th><td>{weight.toLocaleString()} of {ACL.toLocaleString()} ACL</td><td colSpan="2">Allowable CB {CB_RANGE[0]}–{CB_RANGE[1]} in</td><td>{cb === null ? '—' : cb.toFixed(1)}</td></tr></tfoot>
        </table></div>
      </section>

      {documents.filter(d => d.kind).map(d => <section key={d.id} className="package-page" aria-label={`${d.title} — ${d.item.title}`}>
        <p className="package-label">{d.title} · {d.detail}</p>
        <DocumentBody scenario={d.item.scenario} documentId={d.kind} />
      </section>)}
  </FloatingWindow>;
}
