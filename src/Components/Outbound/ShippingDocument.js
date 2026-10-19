import FloatingWindow from '../Session/FloatingWindow';
import { ITEMS, originOf, consignee, isOverseas } from './outboundData';
import { DOCUMENT_DAY, transportationPriority } from './outboundShipments';
import { NO_DODAAC } from './cmosLogic';
import { cmosUser } from '../../currentUser';

// The packer's signature: the signed-in trainee, written in proper case.
const signatureName = () => cmosUser().toLowerCase().replace(/\b[a-z]/g, ch => ch.toUpperCase());

// Training facsimiles of the customer's shipping document: DD Form 1348-1A (Issue Release/Receipt
// Document) or DD Form 1149 (Requisition and Invoice/Shipping Document). Values come from the
// document as presented, so a discrepancy shows until the customer corrects it; a missing entry
// is simply left empty, as on a real form.
// Packing data the trainee wrote on the document during Pack, shown in hand ink.
const Ink = ({ children }) => children === undefined || children === '' ? null : <span className="doc-ink">{children}</span>;
const deliveryLines = delivery => delivery ? [delivery.name, delivery.address, `${delivery.city}, ${delivery.state} ${delivery.zip}`, ...(delivery.phone ? [`PH ${delivery.phone}`] : [])] : [];
const dims = packing => packing ? `${packing.length} × ${packing.width} × ${packing.height} IN` : '';
// Simulated linear bar code: bar widths follow the encoded characters.
function Barcode({ value, className = 'doc-barcode' }) {
  const text = String(value);
  const bars = text.split('').flatMap((ch, i) => [0, 1, 2, 3, 4].map(k => ({ x: 4 + i * 9 + k * 1.8, w: (ch.charCodeAt(0) >> k) & 1 ? 1.1 : .45 })));
  return <svg className={className} viewBox={`0 0 ${8 + text.length * 9} 22`} preserveAspectRatio="none" aria-hidden="true">{bars.map((bar, i) => <rect key={i} x={bar.x} y="0" width={bar.w} height="22" fill="#111" />)}</svg>;
}
// Simulated PDF417 two-dimensional symbols down the middle of the 1348-1A, patterned from the document number.
function Symbol2D({ seed }) {
  let state = [...seed].reduce((sum, ch) => (sum * 31 + ch.charCodeAt(0)) % 2147483647, 7);
  const next = () => { state = (state * 16807) % 2147483647; return state / 2147483647; };
  const cells = [];
  for (let block = 0; block < 3; block += 1) for (let row = 0; row < 26; row += 1) for (let col = 0; col < 10; col += 1) {
    if (col === 0 || col === 9 || next() > .52) cells.push({ x: col * 1.2, y: block * 34 + row * 1.2 });
  }
  return <svg className="f1348-2d" viewBox="0 0 12 100" preserveAspectRatio="none" aria-hidden="true">{cells.map((cell, i) => <rect key={i} x={cell.x} y={cell.y} width="1.2" height="1.2" fill="#111" />)}</svg>;
}

// The 80-column card line across the top. Columns 8–22 (NSN) and 30–44 (document number and
// suffix) are not printed here; they appear as bar codes in blocks 25 and 24.
const CARD_COLUMNS = [...Array.from({ length: 7 }, (_, i) => i + 1), ...Array.from({ length: 7 }, (_, i) => i + 23), ...Array.from({ length: 36 }, (_, i) => i + 45)];
const CARD_GROUPS = [
  ['DOC IDENT', 1, 3], ['RI FROM', 4, 6], ['M&S', 7, 7], ['UNIT ISS', 23, 24], ['QUANTITY', 25, 29], ['SUPPLEMENTARY ADDRESS', 45, 50], ['SIG', 51, 51],
  ['FUND', 52, 53], ['DIS- TRI- BU- TION', 54, 56], ['PROJECT', 57, 59], ['PRI', 60, 61], ["REQ'D DEL DATE", 62, 64], ['ADV', 65, 66], ['RI', 67, 69],
  ['O/P', 70, 70], ['COND', 71, 71], ['MGT', 72, 72], ['', 73, 73], ['UNIT PRICE DOLLARS', 74, 78], ['CTS', 79, 80],
];
const track = column => CARD_COLUMNS.indexOf(column) + 1;
const MILSTRIP_RIC = 'FHZ';

function cardValues(doc) {
  const [dollars, cents] = doc.unitPrice.toFixed(2).split('.');
  return {
    1: 'A5A', 4: MILSTRIP_RIC, 7: ' ', 23: doc.ui, 25: String(doc.quantity).padStart(5, '0'), 45: (doc.shipTo || '').padEnd(6), 51: doc.shipTo ? 'J' : ' ',
    52: doc.tac ? 'KZ' : '  ', 54: '01 ', 57: doc.projectCode.padEnd(3), 60: doc.pd, 62: doc.rdd, 65: '  ', 67: '   ', 70: ' ', 71: doc.condition, 72: ' ', 73: ' ',
    74: dollars.padStart(5), 79: cents,
  };
}

function CardLine({ doc }) {
  const values = cardValues(doc);
  return <div className="f1348-card">
    {CARD_COLUMNS.map(column => <span key={`n${column}`} className="f1348-colnum" style={{ gridColumn: track(column), gridRow: 1 }}>{column}</span>)}
    {CARD_GROUPS.map(([label, from, to]) => <span key={`l${from}`} className={`f1348-collabel ${to - from < 2 ? 'stacked' : ''}`} style={{ gridColumn: `${track(from)} / ${track(to) + 1}`, gridRow: 2 }}>{label}</span>)}
    {CARD_GROUPS.flatMap(([, from, to]) => String(values[from] ?? '').padEnd(to - from + 1).slice(0, to - from + 1).split('').map((ch, i) =>
      <span key={`v${from + i}`} className={`f1348-char ${from + i === 71 || from + i === 74 ? 'group-start' : ''}`} style={{ gridColumn: track(from + i), gridRow: 3 }}>{ch.trim()}</span>))}
  </div>;
}

function Cell({ n, label, children, className = '' }) {
  return <div className={`f1348-cell ${className}`}><small>{n ? `${n}. ` : ''}{label}</small><span>{children}</span></div>;
}
function SideBlock({ label, children }) {
  return <div className="f1348-side"><div className="f1348-side-label">{label}</div><div className="f1348-side-body">{children}</div></div>;
}

function Form1348({ doc, shipment, received, packing }) {
  const origin = originOf(shipment);
  const info = consignee(doc.shipTo);
  const [dollars, cents] = (doc.unitPrice * doc.quantity).toFixed(2).split('.');
  const julianDate = `26${String(DOCUMENT_DAY).padStart(3, '0')}`;
  const nsnBar = `${doc.nsn.replace(/-/g, '')}`;
  const ricBar = `${MILSTRIP_RIC}${doc.ui}${String(doc.quantity).padStart(5, '0')}${doc.condition}01${doc.unitPrice.toFixed(2).replace('.', '').padStart(7, '0')}`;
  return <div className="f1348-scroll"><div className="f1348">
    <div className="f1348-edge">DD FORM 1348-1A, JUL 91 (EG) &nbsp;·&nbsp; ISSUE RELEASE/RECEIPT DOCUMENT</div>
    <div className="f1348-body">
      <div className="f1348-top">
        <CardLine doc={doc} />
        <div className="f1348-cell f1348-total"><small>1. TOTAL PRICE</small><div className="f1348-money"><small>DOLLARS</small><small>CTS</small><b>{dollars}</b><b>{cents}</b></div></div>
        <Cell n="2" label="SHIP FROM" className="f1348-ship">{origin.cmosDodaac}</Cell>
        <Cell n="3" label="SHIP TO" className="f1348-ship">{doc.shipTo}</Cell>
        <Cell n="4" label="MARK FOR" className="f1348-markfor">{doc.delivery?.name}</Cell>
      </div>
      <div className="f1348-main">
        <div className="f1348-left">
          <SideBlock label="24. DOCUMENT NUMBER & SUFFIX (30-44)"><Barcode value={doc.documentNumber} /><b>{doc.documentNumber}</b></SideBlock>
          <SideBlock label="25. NATIONAL STOCK NO. & ADD (8-22)"><Barcode value={nsnBar} /><b>{nsnBar}</b><span className="f1348-free">TAC: {doc.tac}</span></SideBlock>
          <SideBlock label="26. RIC(4-6) UI(23-24) QTY(25-29) CON CODE(71) DIST(55-56) UP(74-80)"><Barcode value={ricBar} /><b>{ricBar}</b></SideBlock>
          <SideBlock label="27. ADDITIONAL DATA">
            <span className="f1348-free">DEMIL CD = A{shipment.serialNumber ? ` · SER NO: ${shipment.serialNumber}` : ''}</span>
            {doc.delivery && <span className="f1348-free">DELIVER TO: {deliveryLines(doc.delivery).join(', ')}</span>}
            {packing && <span className="f1348-free"><Ink>DIMS {dims(packing)}</Ink></span>}
            <span className="f1348-free f1348-original">{origin.dodaac.slice(2)} &nbsp; ORIGINAL &nbsp; P/N {doc.partNumber}</span>
          </SideBlock>
        </div>
        <Symbol2D seed={doc.documentNumber} />
        <div className="f1348-right">
          <div className="f1348-row">
            <Cell n="5" label="DOC DATE">{julianDate}</Cell><Cell n="6" label="NMFC">{ITEMS[shipment.itemId].nmfc}</Cell><Cell n="7" label="FRT RATE" /><Cell n="8" label="TYPE CARGO">{ITEMS[shipment.itemId].esd ? '3' : 'Z'}</Cell><Cell n="9" label="PS">{ITEMS[shipment.itemId].ciic}</Cell>
          </div>
          <div className="f1348-row">
            <Cell n="10" label="QTY. REC'D" /><Cell n="11" label="UP">1</Cell><Cell n="12" label="UNIT WEIGHT">{doc.unitWeight}</Cell><Cell n="13" label="UNIT CUBE" /><Cell n="14" label="UFC" /><Cell n="15" label="SL" />
          </div>
          <Cell n="16" label="FREIGHT CLASSIFICATION NOMENCLATURE">GENERAL CARGO</Cell>
          <div className="f1348-cell"><small>17. ITEM NOMENCLATURE <b className="f1348-class">UNCLASSIFIED</b></small><span>{doc.nomenclature}</span></div>
          <div className="f1348-row">
            <Cell n="18" label="TY CONT"><Ink>{packing?.typePack}</Ink></Cell><Cell n="19" label="NO CONT"><Ink>{packing?.containers}</Ink></Cell><Cell n="20" label="TOTAL WEIGHT">{packing ? <Ink>{packing.weight}</Ink> : Math.round(doc.unitWeight * doc.quantity)}</Cell><Cell n="21" label="TOTAL CUBE" />
          </div>
          <div className="f1348-row f1348-receipt">
            {/* Once custody is accepted: the packer's signature and the date the cargo was packed. */}
            <Cell n="22" label="RECEIVED BY">{received && <span className="doc-signature">{signatureName()}</span>}</Cell><Cell n="23" label="DATE RECEIVED">{received && <Ink>{julianDate}</Ink>}</Cell>
          </div>
          <div className="f1348-address">
            {info ? <><b>{doc.shipTo} &nbsp; {info.unit}</b><b>{info.address}</b><b>{info.city}</b></> : <b>&nbsp;</b>}
          </div>
          <div className="f1348-inspector"><span>INSPECTOR: ________________</span><span>SEL/BY: ________________</span></div>
        </div>
      </div>
    </div>
    <div className="f1348-edge f1348-edge-right">PREVIOUS EDITION MAY BE USED</div>
  </div></div>;
}

// DD Form 1149 (JUN 2003): container tally across the top and bottom, blocks 1–15, appropriations,
// the item lines, and the recapitulation and receipt blocks.
const ymd = day => { const d = new Date(Date.UTC(2026, 0, day)); return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`; };
const money = value => value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
function B({ n, label, children, className = '' }) {
  return <div className={`f1149-box ${className}`}><small>{n ? `${n}. ` : ''}{label}</small><div className="f1149-value">{children}</div></div>;
}
function Tally({ from, to, lead }) {
  return <div className="f1149-tally">{lead && <span className="f1149-tally-lead">{lead} <span aria-hidden="true">⟶</span></span>}<span className="f1149-tally-nums">{Array.from({ length: to - from + 1 }, (_, i) => <span key={i}>{from + i}</span>)}</span></div>;
}

function Form1149({ doc, shipment, received, packing }) {
  const origin = originOf(shipment);
  const info = consignee(doc.shipTo);
  const item = ITEMS[shipment.itemId];
  const total = money(doc.unitPrice * doc.quantity);
  return <div className="f1348-scroll"><div className="f1149">
    <Tally lead="SHIPPING CONTAINER TALLY" from={1} to={50} />
    <div className="f1149-sheet">
      <div className="f1149-title"><h3>REQUISITION AND INVOICE/SHIPPING DOCUMENT</h3><div className="f1149-omb">Form Approved<br />OMB No. 0704-0246<br />Expires Feb 28, 2006</div></div>
      <p className="f1149-burden">The public reporting burden for this collection of information is estimated to average 1 hour per response, including the time for reviewing instructions, searching existing data sources, gathering and maintaining the data needed, and completing and reviewing the collection of information. Training facsimile.</p>
      <p className="f1149-return">PLEASE DO NOT RETURN YOUR FORM TO THIS ADDRESS. RETURN COMPLETED FORM TO THE ADDRESS IN ITEM 2.</p>
      <div className="f1149-head">
        <div className="f1149-left">
          <B n="1" label="FROM: (Include ZIP Code)" className="f1149-tall"><b>{origin.cmosDodaac}</b><b>{origin.unit}</b><b>{origin.address}</b>{origin.address2 && <b>{origin.address2}</b>}<b>{origin.city}</b>{origin.phone && <b>PH {origin.phone}</b>}</B>
          <B n="2" label="TO: (Include ZIP Code)" className="f1149-tall">{info ? <><b>{doc.shipTo}</b><b>{info.unit}</b><b>{info.address}</b><b>{info.city}</b></> : doc.delivery && [NO_DODAAC, ...deliveryLines(doc.delivery)].map(line => <b key={line}>{line}</b>)}</B>
          <B n="3" label="SHIP TO - MARK FOR" className="f1149-tall">{doc.delivery ? deliveryLines(doc.delivery).map(line => <b key={line}>{line}</b>) : info && <><b>{doc.shipTo}</b><b>MARK FOR: SUPPLY / RECEIVING</b></>}</B>
        </div>
        <div className="f1149-right">
          <div className="f1149-row f1149-r1"><B label="SHEET NO.">1</B><B label="NO. OF SHEETS">1</B><B n="5" label="REQUISITION DATE">{ymd(DOCUMENT_DAY)}</B><B n="6" label="REQUISITION NUMBER">{doc.tcn}</B></div>
          <div className="f1149-row f1149-r2"><B n="7" label="DATE MATERIAL REQUIRED (YYYYMMDD)">{/^\d{3}$/.test(doc.rdd) && Number(doc.rdd) <= 366 ? ymd(Number(doc.rdd)) : doc.rdd}</B><B n="8" label="PRIORITY">{transportationPriority(doc.pd, doc.rdd, isOverseas(doc.shipTo), '1149').slice(2)}</B></div>
          <B n="9" label="AUTHORITY OR PURPOSE">{doc.condition === 'F' ? 'REPARABLE RETURN TO DEPOT' : 'SHIPMENT TO SUPPORTED UNIT'}{transportationPriority(doc.pd, doc.rdd, isOverseas(doc.shipTo), '1149') !== 'TP3' && <><br />EXPEDITE: SQ/CC JUSTIFICATION MEMO ATTACHED</>}</B>
          <div className="f1149-row f1149-r2"><B n="10" label="SIGNATURE">{doc.signed && <span className="doc-signature">J. Alvarez, MSgt</span>}</B><B n="11a" label="VOUCHER NUMBER & DATE (YYYYMMDD)" /></div>
          <div className="f1149-row f1149-r2"><B n="12" label="DATE SHIPPED (YYYYMMDD)" /><B n="b" label="" /></div>
          <div className="f1149-row f1149-r2"><B n="13" label="MODE OF SHIPMENT" /><B n="14" label="BILL OF LADING NUMBER" /></div>
          <B n="15" label="AIR MOVEMENT DESIGNATOR OR PORT REFERENCE NO." />
        </div>
      </div>
      <div className="f1149-row f1149-approp"><B n="4" label="APPROPRIATIONS DATA">{doc.tac && <b>TAC: {doc.tac}</b>}</B><B label="AMOUNT">{total}</B></div>
      <table className="f1149-items">
        <thead><tr>
          {[['ITEM NO.', 'a'], ['FEDERAL STOCK NUMBER, DESCRIPTION, AND CODING OF MATERIEL AND/OR SERVICES', 'b'], ['UNIT OF ISSUE', 'c'], ['QUANTITY REQUESTED', 'd'], ['SUPPLY ACTION', 'e'], ['TYPE CON- TAINER', 'f'], ['CON- TAINER NOS.', 'g'], ['UNIT PRICE', 'h'], ['TOTAL COST', 'i']].map(([title, letter]) => <th key={letter} scope="col">{title}<span>({letter})</span></th>)}
        </tr></thead>
        <tbody>
          <tr>
            <td>1</td>
            <td><b>{doc.nsn}</b><b>{doc.nomenclature}</b><b>P/N {doc.partNumber}{shipment.serialNumber ? ` · SER ${shipment.serialNumber}` : ''} · COND {doc.condition}</b><b className="f1149-statement">THIS SHIPMENT DOES NOT CONTAIN ANY CLASSIFIED, SENSITIVE, PROTECTIVE OR HAZARDOUS MATERIAL. <span className="doc-ink">JA</span></b></td>
            <td><b>{doc.ui}</b></td><td><b>{doc.quantity}</b></td><td />
            <td><Ink>{packing?.typePack}</Ink></td><td><Ink>{packing ? `1-${packing.containers}` : ''}</Ink></td>
            <td><b>{money(doc.unitPrice)}</b></td><td><b>{total}</b></td>
          </tr>
          {[1, 2, 3, 4].map(i => <tr key={i} className="f1149-empty">{Array.from({ length: 9 }, (_, k) => <td key={k} />)}</tr>)}
        </tbody>
      </table>
      <div className="f1149-row f1149-r16"><B n="16" label="TRANSPORTATION VIA MATS OR MSTS CHARGEABLE TO" /><B n="17" label="SPECIAL HANDLING">{item.esd && <b>ESD SENSITIVE</b>}</B></div>
      <div className="f1149-bottom">
        <div className="f1149-recap">
          <div className="f1149-vlabel">18. RECAPITULATION OF SHIPMENT</div>
          <table>
            <thead><tr><th /><th>TOTAL CON- TAINERS</th><th>TYPE CON- TAINER</th><th>DESCRIPTION</th><th>TOTAL WEIGHT</th><th>TOTAL CUBE</th></tr></thead>
            <tbody>
              <tr><th scope="row">ISSUED BY<span className="f1149-typed">J. ALVAREZ</span></th><td /><td /><td /><td /><td /></tr>
              <tr><th scope="row">CHECKED BY{received && <span className="doc-ink">TMO Trainee</span>}</th><td /><td /><td /><td /><td /></tr>
              <tr><th scope="row">PACKED BY{packing && <span className="doc-ink">TMO Trainee</span>}</th><td><Ink>{packing?.containers}</Ink></td><td><Ink>{packing?.typePack}</Ink></td><td><Ink>{packing ? `DIMS ${dims(packing)}` : ''}</Ink></td><td><Ink>{packing ? `${packing.weight} LB` : ''}</Ink></td><td /></tr>
              <tr className="f1149-total"><td /><td colSpan="5"><span aria-hidden="true">⟵</span> TOTAL <span aria-hidden="true">⟶</span></td></tr>
            </tbody>
          </table>
        </div>
        <div className="f1149-receipt">
          <div className="f1149-vlabel">19. RECEIPT</div>
          <div className="f1149-receipt-rows">
            {['CONTAINERS RECEIVED EXCEPT AS NOTED', 'QUANTITIES RECEIVED EXCEPT AS NOTED', 'POSTED'].map((title, i) => <div key={title} className="f1149-receipt-row">
              <span className="f1149-receipt-title">{title}</span>
              <B label="DATE (YYYYMMDD)" />
              <B label="BY" />
            </div>)}
          </div>
        </div>
        <div className="f1149-totals"><B label="SHEET TOTAL">{total}</B><B label="GRAND TOTAL">{total}</B><B n="20" label="RECEIVER'S VOUCHER NO." /></div>
      </div>
    </div>
    <div className="f1149-foot"><strong>DD FORM 1149, JUN 2003</strong><Tally from={51} to={100} /><span>PREVIOUS EDITION IS OBSOLETE.</span></div>
  </div></div>;
}

export function DocumentBody({ doc, shipment, received, packing }) {
  return doc.type === '1149' ? <Form1149 doc={doc} shipment={shipment} received={received} packing={packing} /> : <Form1348 doc={doc} shipment={shipment} received={received} packing={packing} />;
}

export default function ShippingDocument({ doc, shipment, received, packing, onClose }) {
  const title = doc.type === '1149' ? 'DD Form 1149' : 'DD Form 1348-1A';
  return <FloatingWindow title={title} onClose={onClose} className="paper-sheet shipping-document">
    <DocumentBody doc={doc} shipment={shipment} received={received} packing={packing} />
    <p className="paper-sign">FOR TRAINING USE ONLY · Fictional NSNs, part numbers and DoDAACs</p>
  </FloatingWindow>;
}
