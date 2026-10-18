import FloatingWindow from '../Session/FloatingWindow';
import { Barcode, MslLabel, dodaacLines } from '../Documentation/MilitaryShippingLabel';
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
function consigneeLines(draft, dodaac) {
  const uc = String(draft.ucName ?? '').trim();
  const lines = uc
    ? [`${dodaac}  ${uc}`, draft.ucPhone && `CP ${draft.ucPhone}`, draft.ucAddress, draft.ucAddress2, [draft.ucCity, draft.ucState, draft.ucZip].filter(Boolean).join(' '), draft.ucCountry]
    : dodaacLines(dodaac);
  return [...lines, draft.markFor && `MARK FOR: ${draft.markFor}`].filter(Boolean);
}
function shipTo(draft) {
  if (String(draft.ucName ?? '').trim()) return { name: draft.ucName, lines: [draft.ucAddress, draft.ucAddress2, [draft.ucCity, draft.ucState, draft.ucZip].filter(Boolean).join(' '), draft.ucCountry].filter(Boolean), phone: draft.ucPhone };
  const info = consignee(String(draft.consignee ?? '').trim().toUpperCase());
  return info ? { name: info.unit, lines: [info.address, info.city] } : { name: '', lines: [] };
}
// What the label prints under TAC for each MIL mode.
const MIL_MODE_SHORT = { F: 'AMC', 9: 'AMC' };

export function OutboundMsl({ shipment, exercise, index }) {
  const record = exercise.cmos.record;
  const d = record.draft;
  const piece = record.pieces[index];
  const tcn = activeTcn(shipment, exercise);
  const from = originOf(shipment);
  const dodaac = String(d.consignee ?? '').toUpperCase();
  const consignor = String(d.consignor || from.cmosDodaac).toUpperCase();
  return <MslLabel label={`Military shipping label, piece ${index + 1} of ${record.pieces.length}`} d={{
    tcn, from: consignor, fromLines: dodaacLines(consignor), tac: d.tac, service: MIL_MODE_SHORT[d.milMode] || (MIL_MODES[d.milMode] || '').toUpperCase(),
    piece: index + 1, of: record.pieces.length, weight: piece.weight, cube: pieceCube(piece), shipped: julian(DOCUMENT_DAY),
    rdd: d.rdd, project: d.proj, priority: d.tp, poe: d.poe || dodaac, shipToLines: d.poe ? dodaacLines(d.poeDodaac || from.cmosDodaac) : consigneeLines(d, dodaac),
    pod: d.pod, fmsCase: d.fms, consignee: dodaac, consigneeLines: consigneeLines(d, dodaac),
  }} />;
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
      <div><small>ORIGIN</small><p>{from.unit}<br />{from.address}<br />{from.address2 && <>{from.address2}<br /></>}{from.city}</p></div>
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
      <dt>Shipper</dt><dd>{[from.unit, from.address, from.address2, from.city].filter(Boolean).join(', ')}</dd>
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
    <p>{origin.unit} · {[origin.address, origin.address2, origin.city].filter(Boolean).join(', ')} · DODAAC {origin.cmosDodaac}</p>
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
