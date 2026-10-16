import FloatingWindow from '../Session/FloatingWindow';
import { Barcode, Pdf417 } from '../Documentation/MilitaryShippingLabel';
import { ITEMS, consignee, originOf } from './outboundData';
import { DOCUMENT_DAY, julian } from './outboundShipments';
import { MIL_MODES } from './outboundLogic';
import { activeTcn, pieceCube } from './cmosLogic';

// What CMOS prints for an outbound shipment: the military shipping label (DD Form 1387) for each
// piece, the carrier's shipping label, the commercial invoice, and the carrier pickup report. All
// values come from what the trainee entered in CMOS, so the printout shows their entries as made.
// Fictional training facsimiles; barcodes are decorative.

// The print viewer, a movable window over CMOS. Print sends it to the browser's printer.
export function PrintPreview({ title, onClose, wide, children }) {
  return <FloatingWindow title={title} onClose={onClose} className={`paper-sheet print-manifest outbound-print ${wide ? '' : 'outbound-print-label'}`} printable>
    {children}
  </FloatingWindow>;
}

// Where the piece goes: the Ultimate Consignee address when the trainee entered one, otherwise the
// address on file for the consignee DoDAAC they entered.
function shipTo(draft) {
  if (String(draft.ucName ?? '').trim()) return { name: draft.ucName, lines: [draft.ucAddress, draft.ucAddress2, [draft.ucCity, draft.ucState, draft.ucZip].filter(Boolean).join(' '), draft.ucCountry].filter(Boolean), phone: draft.ucPhone };
  const info = consignee(String(draft.consignee ?? '').trim().toUpperCase());
  return info ? { name: info.unit, lines: [info.address, info.city] } : { name: '', lines: [] };
}

export function OutboundMsl({ shipment, exercise, index }) {
  const record = exercise.cmos.record;
  const d = record.draft;
  const piece = record.pieces[index];
  const tcn = activeTcn(shipment, exercise);
  const from = originOf(shipment);
  const to = shipTo(d);
  const dodaac = String(d.consignee ?? '').toUpperCase();
  return <div className="msl" aria-label={`Military shipping label, piece ${index + 1} of ${record.pieces.length}`}>
    <div className="msl-tcn"><small>TCN</small><strong>{tcn}</strong><Barcode text={tcn} height={50} /></div>
    <div className="msl-from-row">
      <div className="msl-from"><small>From</small> <b>{d.consignor}</b><p>{from.unit}<br />{from.address}<br />{from.city}</p></div>
      <div className="msl-tac"><small>TAC/Type Service/Postage</small><b>{d.tac}</b><b>{(MIL_MODES[d.milMode] || '').toUpperCase()}</b></div>
    </div>
    <div className="msl-grid">
      <div className="msl-piece"><small>Piece</small> <b>{index + 1}</b> <small>Of</small> <b>{record.pieces.length}</b><Barcode text={`${index + 1}${record.pieces.length}${tcn.slice(-5)}`} height={60} className="msl-piece-code" /></div>
      <div className="msl-box"><small>Weight(lb.)</small><b>{piece.weight}</b></div>
      <div className="msl-box"><small>Date Shipped</small><b>{julian(DOCUMENT_DAY)}</b></div>
      <div className="msl-box msl-rdd"><small>RDD</small><b>{d.rdd}</b></div>
      <div className="msl-box"><small>Cube (ft.)</small><b>{pieceCube(piece)}</b></div>
      <div className="msl-box"><small>Project</small><b>{d.proj}</b></div>
      <div className="msl-priority"><small>Priority</small><span>{d.tp}</span></div>
    </div>
    <div className="msl-shipto"><div><small>Ship To/POE</small><span className="msl-port">{d.poe || dodaac}</span></div><p className="msl-note">FOR TRAINING USE ONLY<br />Fictional label — not for shipment</p></div>
    <div className="msl-lower">
      <div className="msl-left">
        <div><small>POD</small><span className="msl-port">{d.pod}</span></div>
        <div><small>FMS Case</small><b>{d.fms}</b></div>
        <div />
      </div>
      <div className="msl-data"><small>MSL, Supply, and TCMD Data</small><Pdf417 text={`${tcn}${dodaac}${piece.weight}${index}`} /></div>
    </div>
    <div className="msl-consignee">
      <div><strong>{dodaac}</strong>{dodaac && <Barcode text={dodaac} height={44} />}</div>
      <div><small>Ultimate Consignee / Mark for Consignee</small><p>{to.name}{to.lines.map(line => <span key={line}><br />{line}</span>)}{dodaac && <><br />DoDAAC {dodaac}</>}{d.markFor && <><br />MARK FOR: {d.markFor}</>}</p></div>
    </div>
  </div>;
}

export function CarrierLabel({ shipment, exercise }) {
  const record = exercise.cmos.record;
  const { draft, result } = exercise.spe;
  const from = originOf(shipment);
  const to = shipTo(record.draft);
  const weight = record.pieces.reduce((sum, p) => sum + (Number(p.weight) || 0), 0);
  const piece = record.pieces[0] || {};
  return <div className="carrier-label" aria-label="Carrier shipping label">
    <div className="carrier-label-head"><strong>{draft.scac}</strong><span>{(draft.service || '').toUpperCase()}</span><span>{draft.domInt}</span></div>
    <div className="carrier-label-row">
      <div><small>ORIGIN</small><p>{from.unit}<br />{from.address}<br />{from.city}</p></div>
      <div><small>SHIP DATE</small><p>{result.closed}</p><small>ACT WGT</small><p>{weight} LB</p><small>DIMS</small><p>{piece.length}×{piece.width}×{piece.height} IN</p></div>
    </div>
    <div className="carrier-label-to"><small>TO</small><p><b>{to.name}</b>{to.lines.map(line => <span key={line}><br />{line}</span>)}{to.phone && <><br />{to.phone}</>}</p><p className="carrier-label-city">{draft.destCity}</p></div>
    <div className="carrier-label-track"><small>TRK#</small><strong>{result.tracking}</strong><Barcode text={result.tracking} height={56} /></div>
    <div className="carrier-label-row"><div><small>REF</small><p>{activeTcn(shipment, exercise)}</p></div><div><small>BILL</small><p>{(draft.billTo || 'Shipper').toUpperCase()} · TAC {record.draft.tac}</p></div></div>
    <p className="msl-note">FOR TRAINING USE ONLY · Fictional label — not for shipment</p>
  </div>;
}

export function CommercialInvoice({ shipment, exercise }) {
  const record = exercise.cmos.record;
  const { draft, result } = exercise.spe;
  const item = ITEMS[shipment.itemId];
  const from = originOf(shipment);
  const to = shipTo(record.draft);
  const weight = record.pieces.reduce((sum, p) => sum + (Number(p.weight) || 0), 0);
  return <div className="commercial-invoice" aria-label="Commercial invoice">
    <h4>COMMERCIAL INVOICE</h4>
    <dl className="invoice-grid">
      <dt>Date</dt><dd>{result.closed}</dd><dt>Carrier / Tracking</dt><dd>{draft.scac} {result.tracking}</dd>
      <dt>Shipper</dt><dd>{from.unit}, {from.address}, {from.city}</dd>
      <dt>Consignee</dt><dd>{[to.name, ...to.lines].join(', ')}</dd>
      <dt>Reference (TCN)</dt><dd>{activeTcn(shipment, exercise)}</dd><dt>Bill to / TAC</dt><dd>{draft.billTo || 'Shipper'} · {record.draft.tac}</dd>
      <dt>Reason for export</dt><dd>U.S. GOVERNMENT MATERIEL — NOT FOR RESALE</dd>
    </dl>
    <table className="manifest-table">
      <thead><tr><th scope="col">Pkgs</th><th scope="col">Description</th><th scope="col">NSN</th><th scope="col">Qty</th><th scope="col">Unit value</th><th scope="col">Total value</th><th scope="col">Weight (lb)</th><th scope="col">Origin</th></tr></thead>
      <tbody><tr><td>{record.pieces.length}</td><td>{record.draft.nomen}</td><td>{record.draft.nsn}</td><td>{shipment.quantity} {item.ui}</td><td>${item.unitPrice.toFixed(2)}</td><td>${(item.unitPrice * shipment.quantity).toFixed(2)}</td><td>{weight}</td><td>US</td></tr></tbody>
    </table>
    <p>I declare that all the information contained in this invoice is true and correct.</p>
    <p className="invoice-sign">Signature of shipper: ______________________ &nbsp; Date: {result.closed}</p>
    <p className="msl-note">FOR TRAINING USE ONLY</p>
  </div>;
}

// The carrier's pickup report: every package closed for the SCAC on the date, for the driver to sign.
export function PickupReport({ origin, scac, closed, pu, packages }) {
  const totals = packages.reduce((sum, p) => ({ pieces: sum.pieces + p.pieces, weight: sum.weight + p.weight }), { pieces: 0, weight: 0 });
  return <div className="pickup-report" aria-label={`Pickup report ${scac}`}>
    <h4>SMALL PACKAGE EXPRESS PICKUP REPORT</h4>
    <p>{origin.unit} · {origin.address}, {origin.city} · DODAAC {origin.cmosDodaac}</p>
    <p><strong>SCAC:</strong> {scac} &nbsp; <strong>Closed date:</strong> {closed || 'ALL'} &nbsp; <strong>P/U location:</strong> {pu || 'ALL'}</p>
    <table className="manifest-table">
      <thead><tr>{['TCN', 'Tracking number', 'Service', 'D/I', 'Pieces', 'Weight (lb)', 'Consignee', 'Dest city', 'Closed'].map(title => <th key={title} scope="col">{title}</th>)}</tr></thead>
      <tbody>{packages.length ? packages.map(p => <tr key={p.key}><td>{p.tcn}</td><td>{p.tracking}</td><td>{p.service}</td><td>{(p.domInt || '').slice(0, 1)}</td><td>{p.pieces}</td><td>{p.weight}</td><td>{p.consignee}</td><td>{p.destCity}</td><td>{p.closed}</td></tr>)
        : <tr><td colSpan="9">No packages closed for this SCAC.</td></tr>}</tbody>
      <tfoot><tr><th scope="row" colSpan="4">Total packages {packages.length}</th><td>{totals.pieces}</td><td>{totals.weight}</td><td colSpan="3" /></tr></tfoot>
    </table>
    <div className="print-signatures pickup-signatures"><div>Carrier driver (print / sign) ______________________</div><div>Date / time ____________</div><div>TMO representative ______________________</div></div>
    <p className="msl-note">FOR TRAINING USE ONLY</p>
  </div>;
}
