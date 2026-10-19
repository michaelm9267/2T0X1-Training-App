import { Barcode } from '../Documentation/MilitaryShippingLabel';
import { cmosUser } from '../../currentUser';
import { parseCmosDate } from './dateLogic';

// The CMOS Truck Manifest printout: header blocks (preparer, destination, carrier, conveyance,
// pickup and totals), a TXA prime line and TXF trailer line for each TCN, the three signature
// blocks, and the manifest number bar code. Fictional training document.
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const pad = (n, size = 2) => String(n).padStart(size, '0');
const lines = (d, prefix) => [d[`${prefix}Name`], d[`${prefix}Address1`], d[`${prefix}Address2`],
  [d[`${prefix}City`] && `${d[`${prefix}City`]},`, d[`${prefix}State`] || (d[`${prefix}Country`] !== 'US' ? d[`${prefix}Country`] : ''), d[`${prefix}Zip`]].filter(Boolean).join(' ')].filter(Boolean);
const pickup = value => { const t = parseCmosDate(value); if (t === null) return value || ''; const d = new Date(t); return `${pad(d.getUTCDate())}-${MONTHS[d.getUTCMonth()]}-${String(d.getUTCFullYear()).slice(2)}`; };

export default function TruckManifestDocument({ d }) {
  const m = d.snapshot || {};
  const now = new Date();
  const gmt = new Date(now.getTime() + now.getTimezoneOffset() * 60000);
  const dateCode = `${pad(now.getDate())}${MONTHS[now.getMonth()]}${now.getFullYear()}`;
  const julian = `${String(now.getFullYear()).slice(-1)}${pad(Math.round((new Date(now.getFullYear(), now.getMonth(), now.getDate()) - new Date(now.getFullYear(), 0, 0)) / 86400000), 3)}`;
  const shipments = (d.shipmentSnapshots || []).map(s => {
    const pieces = (d.pieceSnapshots || []).filter(p => p.shipmentId === s.id);
    return { ...s, typePack: pieces[0]?.typePack || '', pieces: s.totals?.pieces ?? pieces.length, weight: s.totals?.weight ?? 0, cube: Math.round(Number(s.totals?.cube) || 0) };
  });
  const sum = key => shipments.reduce((total, s) => total + (Number(s[key]) || 0), 0);
  const first = shipments[0] || {};
  const phones = (m.emergencyPhones || []).filter(p => p.number).map(p => `${p.number}${p.type ? ` ${p.type.replace('EMERGENCY ', '')}` : ''}`);
  const site = m.shipperDODAAC || 'FA5030';
  const user = cmosUser().replace(/\s+/g, '  ');
  const signature = (label, name = '') => <div className="tm-sign"><b>{label}</b><span className="tm-line"><i>SIGNATURE</i></span><span className="tm-line tm-name">{name}<i>PRINTED FULL NAME/ORG/DATE/TIME</i></span></div>;
  return <article className="tm-doc" aria-label={`Truck Manifest ${m.manifestNumber || ''}`}>
    <header className="tm-head"><h2>Truck Manifest</h2><p>Date: {dateCode} &nbsp; Julian: {julian} &nbsp; Time: {pad(now.getHours())}:{pad(now.getMinutes())} &nbsp; GMT: {pad(gmt.getHours())}:{pad(gmt.getMinutes())}</p></header>
    <table className="tm-block tm-cols-5"><thead><tr><th>Manifest</th><th>Preparer/DODAAC</th><th>Date Prepared</th><th>Active RFID Tag No.</th><th>ULN</th></tr></thead>
      <tbody><tr><td>{m.manifestNumber}</td><td>{lines(m, 'origin').map(l => <div key={l}>{l}</div>)}</td><td>{pad(now.getMonth() + 1)}{pad(now.getDate())}{now.getFullYear()}</td><td>{m.rfTagNumber}</td><td /></tr></tbody></table>
    <table className="tm-block tm-cols-4"><thead><tr><th className="tm-indent">Carrier</th><th>Destination</th><th>Destination Contact</th><th>Emergency Contact and Phone</th></tr></thead>
      <tbody><tr><td className="tm-indent">{m.equipmentOwner === 'C' ? m.motorCarrierName : 'GOVT'}</td><td>{lines(m, 'destination').map(l => <div key={l}>{l}</div>)}</td><td><div>&nbsp;</div><div>{m.destinationPhoneNumber}</div></td><td>{phones.map(p => <div key={p}>{p}</div>)}</td></tr></tbody></table>
    <table className="tm-block tm-cols-conv"><thead><tr><th>Truck Prime Mover</th><th>Trailer/Chassis</th><th>Permit Nbr</th><th>Seal Nbrs</th><th>Added Instructions</th></tr></thead>
      <tbody><tr><td>{m.truckSerialBumperNumber}</td><td>{m.trailerChassisNumber}</td><td /><td>{(m.sealNumbers || []).filter(Boolean).join(', ')}</td><td>{m.addlShipInst}</td></tr></tbody></table>
    <table className="tm-block tm-cols-pickup"><thead><tr><th>Pickup Date</th><th>EDD</th><th>ATD</th><th>POD</th><th>M</th><th>CNSGNEE</th><th>Clear Text Dest</th><th className="tm-num">Total Pieces</th><th className="tm-num">Total Weight</th><th className="tm-num">Total Cube</th></tr></thead>
      <tbody><tr><td>{pickup(m.pickUpDate)}</td><td /><td>{d.releaseDetails?.departureAt ? pickup(String(d.releaseDetails.departureAt).slice(0, 10)) : ''}</td><td>{first.pod}</td><td>{m.conveyanceMode}</td><td>{m.destinationDODAAC}</td><td>{m.destinationName}</td>
        <td className="tm-num">{sum('pieces')}</td><td className="tm-num">{Math.round(sum('weight'))}</td><td className="tm-num">{sum('cube')}</td></tr></tbody></table>
    <table className="tm-tcns"><thead><tr>{['D/I', 'ID', 'CNSNOR', 'CSHLG', 'D', 'POE', 'POD', 'M', 'TP', 'TCN', 'CSGNEE', 'P', 'RDD', 'PJT', 'TAC', 'Pieces', 'Weight', 'Cube'].map(h => <th key={h}>{h}</th>)}</tr></thead>
      {shipments.map(s => <tbody key={s.id}>
        <tr><td>TXA</td><td /><td>{s.origin}</td><td>{s.commoditySH || ''}</td><td>{String(s.typeCargo || '').charAt(0)}</td><td>{s.poe}</td><td>{s.pod}</td><td>{s.milMode}</td><td>{s.typePack}</td><td>{s.tcn}</td><td>{s.destination}</td><td>{s.tp}</td><td>{s.rdd}</td><td>{s.proj}</td><td>{s.tac}</td><td className="tm-num">{s.pieces}</td><td className="tm-num">{Math.round(Number(s.weight) || 0)}</td><td className="tm-num">{s.cube}</td></tr>
        <tr><td>TXF</td><td /><td /><td>{s.commoditySH || ''}</td><td /><td>{s.poe}</td><td>{s.pod}</td><td>{s.milMode}</td><td>{s.typePack}</td><td>{s.tcn}</td><td>{s.destination}</td><td>{s.tp}</td><td>NNSN</td><td colSpan={5} className="tm-nomen">{String(s.description || '').toUpperCase()}</td></tr>
      </tbody>)}
    </table>
    <section className="tm-signatures">{signature('TRUCK LOADED BY:', user)}{signature('RECEIVED BY DRIVER:')}{signature('CARGO RECEIVED DEST:')}</section>
    <div className="tm-barcode"><small>Manifest Number</small><Barcode text={m.manifestNumber || ''} height={22} /><small>{m.manifestNumber}</small></div>
    <footer className="tm-foot"><span>Truck Manifest</span><span>DODAAC:{site}</span><span>{dateCode}</span><span>Page 1 of 1</span></footer>
  </article>;
}
