import FloatingWindow from '../Session/FloatingWindow';
import { manifestFields, DODAAC_INFO } from '../CargoWindow/workflow';
import { consignee, ORIGINS } from '../Outbound/outboundData';

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

// Address block lines for a DoDAAC, as the label prints them: "DODAAC UNIT", street, city.
const plainCity = city => String(city || '').replace(/,/g, '');
export function dodaacLines(code) {
  const key = String(code || '').trim().toUpperCase();
  const info = DODAAC_INFO[key] || consignee(key) || Object.values(ORIGINS).find(o => o.cmosDodaac === key || o.dodaac === key);
  if (!key) return [];
  if (!info) return [key];
  return [`${key}  ${info.unit}`, info.address, info.address2, plainCity(info.city)].filter(Boolean);
}

export function mslData(scenario) {
  const v = Object.fromEntries(manifestFields(scenario).map(f => [f.id, f.expected]));
  return {
    tcn: v.tcn, tac: 'FSDN', service: 'AMC CHANNEL', piece: 1, of: v.pieces, weight: v.weight,
    cube: Math.round(v.length * v.width * v.height / 1728), shipped: `6${String(scenario.documentDay || 285).padStart(3, '0')}`,
    rdd: '999', project: 'TRN', priority: '3',
    from: v.origin, fromLines: dodaacLines(v.origin), poe: v.apoe, shipToLines: dodaacLines(v.origin), pod: v.apod,
    consignee: v.destination, consigneeLines: dodaacLines(v.destination),
  };
}

// The DD Form 1387 label. `d` holds the printed values; empty ones print as blank boxes.
export function MslLabel({ d, label = 'Military shipping label' }) {
  const tcn = d.tcn || '';
  return <div className="msl" aria-label={label}>
    <div className="msl-tcn"><div><small>TCN</small><strong>{tcn}</strong></div>{tcn && <Barcode text={tcn} height={50} />}</div>
    <div className="msl-from-row">
      <div className="msl-from"><small>From</small> <b>{d.from}</b><p>{(d.fromLines || []).map((line, i) => <span key={i}>{line}<br /></span>)}</p></div>
      <div className="msl-tac"><small>TAC/Type Service/Postage</small><b>{d.tac}</b><b>{d.service}</b></div>
    </div>
    <div className="msl-grid">
      <div className="msl-piece"><div><small>Piece</small> <b>{d.piece}</b> <small>Of</small> <b>{d.of}</b></div><Barcode text={`${d.piece}${d.of}${tcn.slice(-5)}`} height={60} className="msl-piece-code" /></div>
      <div className="msl-box"><small>Weight (lb.)</small><b>{d.weight}</b></div>
      <div className="msl-box"><small>Date Shipped</small><b>{d.shipped}</b></div>
      <div className="msl-box msl-rdd"><small>RDD</small><b>{d.rdd}</b></div>
      <div className="msl-box"><small>Cube (ft.)</small><b>{d.cube}</b></div>
      <div className="msl-box"><small>Project</small><b>{d.project}</b></div>
      <div className="msl-priority"><small>Priority</small><span>{d.priority}</span></div>
      <div className="msl-shipto">
        <div><small>Ship To / POE</small>{d.poe && <span className="msl-port">{d.poe}</span>}</div>
        <p>{(d.shipToLines || []).map((line, i) => <span key={i}>{line}<br /></span>)}</p>
      </div>
    </div>
    <div className="msl-lower">
      <div className="msl-left">
        <div><small>POD</small>{d.pod && <span className="msl-port">{d.pod}</span>}</div>
        <div><small>FMS Case</small><b>{d.fmsCase}</b></div>
        <div className="msl-eei">{d.eei ?? 'NO EEI 30.39'}</div>
      </div>
      <div className="msl-data">
        <small>MSL, Supply, &amp; TCMD Data</small>
        <Pdf417 text={`${tcn}${d.consignee}${d.weight}${d.piece}`} />
        <p className="msl-line-items">{d.lineItems || 'NO LINE ITEM DATA'}</p>
      </div>
    </div>
    <div className="msl-consignee">
      <div><strong>{d.consignee}</strong>{d.consignee && <Barcode text={d.consignee} height={44} />}</div>
      <div><small>Ultimate Consignee/Mark</small><p>{(d.consigneeLines || []).map((line, i) => <span key={i}>{line}<br /></span>)}</p></div>
    </div>
    <p className="msl-training">FICTIONAL TRAINING LABEL · NOT FOR SHIPMENT</p>
  </div>;
}

export function MilitaryShippingLabel({ scenario }) {
  return <MslLabel d={mslData(scenario)} />;
}

export default function MslModal({ scenario, onClose }) {
  return <FloatingWindow title="Military Shipping Label" onClose={onClose} className="paper-sheet msl-sheet">
    <MilitaryShippingLabel scenario={scenario} />
  </FloatingWindow>;
}
