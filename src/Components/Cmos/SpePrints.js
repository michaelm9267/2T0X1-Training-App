import { Barcode } from '../Documentation/MilitaryShippingLabel';
import { CBL_DODAACS } from './cblLogic';
import { OCONUS_DODAACS } from '../Outbound/dodaacs';
import { parseCmosDate } from './dateLogic';
import { CARRIER_NAMES, servicesFor } from './trackingNumbers';

// Small Package Express printouts laid out like the carrier label and the CMOS Carrier Pickup
// Report. Fictional training documents: the codes, barcodes and account are made up.
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const pad = (n, size = 2) => String(n).padStart(size, '0');
const dateCode = d => `${pad(d.getDate())}${MONTHS[d.getMonth()]}${d.getFullYear()}`;
const timeCode = (d, seconds) => `${pad(d.getHours())}${pad(d.getMinutes())}${seconds ? pad(d.getSeconds()) : ''}`;
const utc = d => new Date(d.getTime() + d.getTimezoneOffset() * 60000);
const dayOfYear = d => Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - new Date(d.getFullYear(), 0, 0)) / 86400000);
// CMOS closed date as the Closed Date list shows it: 16Oct2026/223200.
export const closedLabel = iso => { const d = new Date(iso); return `${pad(d.getDate())}${MONTHS[d.getMonth()].charAt(0)}${MONTHS[d.getMonth()].slice(1).toLowerCase()}${d.getFullYear()}/${timeCode(d, true)}`; };
const address = dodaac => CBL_DODAACS[String(dodaac || '').trim().toUpperCase()] || null;
const phoneText = phone => { const digits = String(phone || '').replace(/\D/g, ''); return digits.length === 10 ? `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}` : phone || '(999) 999-9999'; };
const serviceName = (scac, code) => (servicesFor(scac).find(([c]) => c === code)?.[1] || code || '').replace(/^S\//, '').toUpperCase();

// A 2-D symbol drawn from the tracking number (not a scannable PDF417/MaxiCode).
function MatrixCode({ text }) {
  const size = 24;
  let h = 7;
  const cells = [];
  for (let i = 0; i < size * size; i++) {
    h = (h * 31 + String(text).charCodeAt(i % String(text).length) + i) % 1000003;
    if (h % 3 === 0) cells.push(<rect key={i} x={i % size} y={Math.floor(i / size)} width="1" height="1" />);
  }
  return <svg className="spe-label-matrix" viewBox={`0 0 ${size} ${size}`} aria-hidden="true">{cells}</svg>;
}

// UPS service names and the service level number printed beside them (Ground has a solid box).
const UPS_NAMES = { '2M': ['UPS 2ND DAY AIR A.M.', '2'], AM: ['UPS NEXT DAY AIR EARLY', '1+'], D3: ['UPS 3 DAY SELECT', '3'], DE: ['UPS 2ND DAY AIR', '2'], DG: ['UPS GROUND', ''],
  DO: ['UPS NEXT DAY AIR', '1'], DP: ['UPS NEXT DAY AIR SAVER', '1'], ES: ['UPS WORLDWIDE SAVER', ''], IE: ['UPS WORLDWIDE EXPEDITED', ''], IP: ['UPS WORLDWIDE EXPRESS', ''],
  '3N': ['UPS 3 DAY FREIGHT', '3'], F7: ['UPS NEXT DAY AIR FREIGHT', '1'], F8: ['UPS 2ND DAY AIR FREIGHT', '2'], FC: ['UPS AIR FREIGHT CONSOLIDATED', ''] };
// A MaxiCode-style symbol: offset rows of dots around a bullseye (drawn, not scannable).
function MaxiCode({ text }) {
  const dots = [];
  let h = 11;
  for (let row = 0; row < 33; row++) for (let col = 0; col < 30; col++) {
    const x = col * 4 + (row % 2 ? 2 : 0) + 2, y = row * 3.5 + 2;
    if (Math.hypot(x - 60, y - 58) < 17) continue;
    h = (h * 31 + String(text).charCodeAt((row + col) % Math.max(1, String(text).length)) + row) % 1000003;
    if (h % 5 < 3) dots.push(<circle key={`${row}-${col}`} cx={x} cy={y} r="1.5" />);
  }
  return <svg className="ups-label-maxi" viewBox="0 0 122 118" aria-hidden="true">{dots}
    {[13, 9, 5].map(r => <circle key={r} cx="60" cy="58" r={r} fill="none" stroke="#000" strokeWidth="2.2" />)}<circle cx="60" cy="58" r="2" /></svg>;
}

function UpsLabel({ d, x, shipment, piece, from, to, tracking }) {
  const [name, level] = UPS_NAMES[x.service] || ['UPS GROUND', ''];
  const pieces = shipment.totals?.pieces || 1;
  const weight = Math.round(Number(d.result?.ratedWeight || shipment.totals?.weight || 0));
  const zip = String(to.zip || '').slice(0, 5);
  const state = to.country === 'US' || !to.country ? to.state : to.country;
  const route = `${state || 'XX'} ${zip.slice(0, 3) || '000'} ${Number(zip.slice(3, 5) || 0) % 9 + 1}-${String((Number(zip) || 0) % 97).padStart(2, '0')}`;
  const spaced = tracking.replace(/^1Z(\w{3})(\w{3})(\w{2})(\w{4})(\w{4})$/, '1Z $1 $2 $3 $4 $5');
  const line = (...parts) => parts.filter(Boolean).join(' ');
  return <article className="ups-label" aria-label={`Carrier label ${tracking}`}>
    <div className="ups-label-top">
      <p className="ups-label-from">{from.name}<br />{phoneText(from.phone)}<br />{from.address1}<br />{from.address2 && <>{from.address2}<br /></>}{line(`${from.city || ''},`, from.state, from.zip)}</p>
      <div className="ups-label-weight"><strong>{weight} LBS {'\u00a0'} 1 OF {pieces}</strong>
        <p>DWT: {[piece.length, piece.width, piece.height].map(v => Math.round(Number(v) || 0)).join(',')}<br />{x.additionalHandling ? 'AH' : ''}</p></div>
    </div>
    <div className="ups-label-to"><span>SHIP<br />TO:</span>
      <p>{shipment.destination} {to.name}<br />{phoneText(to.phone)}<br />{to.address1}<br />{to.address2 && <>{to.address2}<br /></>}<strong>{line(`${to.city || ''},`, state, to.zip)}</strong></p></div>
    <div className="ups-label-route">
      <MaxiCode text={tracking} />
      <div><strong>{route}</strong><Barcode text={`420${zip}`} height={52} className="spe-label-bars" /></div>
    </div>
    <div className="ups-label-service"><div><strong>{name}</strong><small>TRACKING # {'\u00a0'}{spaced}</small></div>
      {level ? <b>{level}</b> : <i aria-hidden="true" />}</div>
    <div className="ups-label-bars"><Barcode text={tracking} height={110} className="spe-label-bars" /></div>
    <p className="ups-label-ref">REF 1: {shipment.tcn}<br />REF 2: {shipment.destination}</p>
  </article>;
}

// DHL Express products (name and product code) for the PAZC services.
const DHL_PRODUCTS = { IP: ['EXPRESS WORLDWIDE', 'WPX'], IE: ['ECONOMY SELECT', 'ESU'] };
const COUNTRY_NAMES = { US: 'United States', KR: 'Korea, Republic of', JP: 'Japan', DE: 'Germany', GB: 'United Kingdom', IT: 'Italy', ES: 'Spain', PT: 'Portugal', TR: 'Turkey', QA: 'Qatar', KW: 'Kuwait', SA: 'Saudi Arabia', GR: 'Greece', CY: 'Cyprus', HN: 'Honduras', IO: 'British Indian Ocean Territory', LU: 'Luxembourg', AE: 'United Arab Emirates', GU: 'Guam', PR: 'Puerto Rico' };
// Three-letter service area: the consignee's aerial port when it has one, else from the city.
const serviceArea = (dodaac, info) => OCONUS_DODAACS[String(dodaac || '').toUpperCase()]?.port || (info.state === 'AK' ? 'ANC' : String(info.city || 'TRN').replace(/[^A-Z]/gi, '').slice(0, 3).toUpperCase());

function DhlLabel({ d, x, shipment, from, to, tracking, shipped }) {
  const [product, code] = DHL_PRODUCTS[x.service] || DHL_PRODUCTS.IP;
  const country = to.country || 'US';
  const area = serviceArea(shipment.destination, to);
  const weight = Number(d.result?.ratedWeight || shipment.totals?.weight || 0).toFixed(1);
  const pieces = shipment.totals?.pieces || 1;
  const zip = String(to.zip || '').replace(/\s/g, '');
  const plate = `JD01 4600 0002 ${tracking.slice(0, 4).padEnd(4, '0')} ${tracking.slice(-4).padStart(4, '0')}`;
  const eei = x.itn ? `EEI: ${x.itn}` : `EEI: NOEEI ${x.eeiExemptionCode || 'Sec 30.37(a)'}`;
  const iso = `${shipped.getFullYear()}-${pad(shipped.getMonth() + 1)}-${pad(shipped.getDate())}`;
  return <article className="dhl-label" aria-label={`Carrier label ${tracking}`}>
    <div className="dhl-label-head"><p><strong>{product}</strong><br /><small>DHL Online</small></p><b>{code}</b><span className="dhl-label-mark">DHL EXPRESS</span></div>
    <div className="dhl-label-from"><p><b>From:</b> {from.name} {'\u00a0'}Phone: {phoneText(from.phone)}<br />{from.address1}<br />{[from.city, from.state, from.zip].filter(Boolean).join(' ')}<br /><b>United States</b></p>
      <p className="dhl-label-origin">Origin:<br /><b>{serviceArea(shipment.origin, from)}</b></p></div>
    <div className="dhl-label-to"><span>To:</span><p className="dhl-label-to-name">{shipment.destination} {to.name}<br />{to.address1}{to.address2 && <><br />{to.address2}</>}</p>
      <p className="dhl-label-contact"><b>Contact:</b><br />{to.name}<br />{phoneText(to.phone)}</p>
      <p className="dhl-label-city"><strong>{zip}, {String(to.city || '').toUpperCase()}</strong><br /><b>{COUNTRY_NAMES[country] || country}</b></p></div>
    <p className="dhl-label-route">{country}-{area}-{area}</p>
    <div className="dhl-label-bar"><strong>C-PLT</strong><span>Day</span><span>Time</span></div>
    <div className="dhl-label-facts"><small>{eei}</small><span>Date:<br />{iso}</span><span>Shpt Weight:<br /><strong>{weight} lb</strong></span><span>Piece:<br /><strong>1/{pieces}</strong></span></div>
    <p className="dhl-label-export">These commodities, technology or software were exported from the United States in accordance with the Export Administration Regulations. Diversion contrary to U.S. law is prohibited.</p>
    <div className="dhl-label-codes">
      <div className="dhl-label-content">Content:<br />{shipment.description || 'General cargo'}</div>
      <Barcode text={tracking} height={64} className="dhl-label-waybill" /><p>WAYBILL {tracking.replace(/^(\d{2})(\d{4})(\d{4})$/, '$1 $2 $3')}</p>
      <Barcode text={`2L${country}${zip}48000001`} height={56} className="dhl-label-routing" /><p>(2L){country}{zip}+48000001</p>
      <Barcode text={`J${plate.replace(/ /g, '')}`} height={56} className="dhl-label-plate" /><p>(J){plate}</p>
    </div>
  </article>;
}

export function CarrierLabel({ d }) {
  const x = d.snapshot || {};
  const shipment = d.shipmentSnapshots?.[0] || {};
  const piece = (d.pieceSnapshots || [])[0] || {};
  const scac = String(x.scac || '').toUpperCase();
  const tracking = d.result?.tracking || '';
  const from = address(shipment.origin) || {};
  const to = address(shipment.destination) || {};
  const day = parseCmosDate(x.shipDate) && new Date(parseCmosDate(x.shipDate));
  const shipped = day ? new Date(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate()) : new Date();
  const days = Number(servicesFor(scac).find(([c]) => c === x.service)?.[2] || 2);
  const deliver = new Date(shipped);
  for (let left = days; left > 0;) { deliver.setDate(deliver.getDate() + 1); if (![0, 6].includes(deliver.getDay())) left--; }
  if (scac === 'PAZC') return <DhlLabel {...{ d, x, shipment, from, to, tracking, shipped }} />;
  if (scac.startsWith('UPS')) return <UpsLabel {...{ d, x, shipment, piece, from, to, tracking }} />;
  const fedex = scac.startsWith('FDE');
  const am = ['2M', 'AM', 'DO', 'F5'].includes(x.service);
  const bill = { PP: 'BILL SENDER', CD: 'BILL RECIPIENT', TP: 'BILL THIRD PARTY' }[x.billTo] || 'BILL SENDER';
  const destState = to.country === 'US' || !to.country ? to.state : to.country;
  const port = String(to.city || '').replace(/[^A-Z]/gi, '').slice(0, 3).toUpperCase();
  const weight = Number(d.result?.ratedWeight || shipment.totals?.weight || 0).toFixed(2);
  const spaced = fedex && tracking.length === 12 ? tracking.replace(/(\d{4})(\d{4})(\d{4})/, '$1 $2 $3') : tracking;
  return <article className="spe-label" aria-label={`Carrier label ${tracking}`}>
    <div className="spe-label-top">
      <div>
        <p>ORIGIN ID:{String(from.city || 'TRNG').replace(/[^A-Z]/gi, '').slice(0, 4).toUpperCase()} <span>{phoneText(from.phone)}</span></p>
        <p>{from.name}<br />{from.address1}</p>
        <p>{[from.city, from.state].filter(Boolean).join(', ')} {from.zip}<br />UNITED STATES US</p>
      </div>
      <div>
        <p>SHIP DATE: {pad(shipped.getDate())}{MONTHS[shipped.getMonth()]}{String(shipped.getFullYear()).slice(2)}<br />ACTWGT: {weight} LB<br />CAD: TRNG{tracking.slice(-6)}/TRAIN<br />
          DIMS: {[piece.length, piece.width, piece.height].map(v => Math.round(Number(v) || 0)).join('x')} IN</p>
        <p>{bill}</p>
      </div>
    </div>
    <div className="spe-label-to">
      <span>TO</span>
      <strong>{shipment.destination} {to.name}<br />{to.phone && <>CP {phoneText(to.phone).replace(/[()-]/g, ' ').replace(/\s+/g, ' ').trim()}<br /></>}{to.address1}<br />{[to.city, destState].filter(Boolean).join(' ')} {to.zip}</strong>
      <p>{phoneText(to.phone)}<span>REF: {shipment.tcn}</span><br />INV:<br />PO:<span>DEPT:</span></p>
    </div>
    <Barcode text={`${tracking}${to.zip || ''}`.slice(0, 22)} height={34} className="spe-label-bars" />
    <div className="spe-label-mid">
      <MatrixCode text={tracking} />
      <div className="spe-label-carrier"><strong>{fedex ? `FedEx ${scac === 'FDEG' ? 'Ground' : 'Express'}` : CARRIER_NAMES[scac] || scac}</strong><b>{scac === 'FDEG' ? 'G' : scac === 'UPSN' ? (x.service === 'DG' ? 'G' : 'A') : 'E'}</b></div>
    </div>
    <div className="spe-label-service">
      <p className="spe-label-deliver">{DAYS[deliver.getDay()]} - {pad(deliver.getDate())} {MONTHS[deliver.getMonth()]} {am ? 'AM' : 'EOD'}<br />{serviceName(scac, x.service)}</p>
      <p className="spe-label-trk"><small>TRK#{fedex && <em>0201</em>}</small><strong>{spaced}</strong></p>
      <p className="spe-label-ursa"><strong>{`${port.slice(0, 2) || 'XX'} ${String(to.city || 'TRNG').replace(/[^A-Z]/gi, '').slice(0, 5).toUpperCase()}`}</strong><span>{x.domInt === 'I' ? 'INTL' : 'DOM'} {to.zip}<br />{destState}-{to.country || 'US'} {port}</span></p>
    </div>
    <Barcode text={tracking} height={46} className="spe-label-bars" />
  </article>;
}

export function CarrierPickupReport({ d, origin }) {
  const site = address(origin) || {};
  const now = new Date();
  const closed = d.closedAt ? new Date(d.closedAt) : now;
  const gmt = utc(now);
  const closedGmt = utc(closed);
  const lines = d.packages || [];
  const sum = key => lines.reduce((total, p) => total + (Number(p[key]) || 0), 0);
  const money = value => (Number(value) || 0).toFixed(2);
  return <article className="spe-pickup" aria-label={`Carrier Pickup Report ${d.scac}`}>
    <header>
      <h3>CARRIER PICKUP REPORT</h3>
      <p className="spe-pickup-carrier">{CARRIER_NAMES[d.scac] || d.scac}</p>
      <p className="spe-pickup-site">{origin}  {site.name}<br />{site.address1}<br />{site.address2 && <>{site.address2}<br /></>}{site.city}, {site.state} {site.zip}<br />{site.country === 'US' || !site.country ? 'US (UNITED STATES)' : site.country}<br />{String(site.phone || '').replace(/\D/g, '')}</p>
      <p className="spe-pickup-stamp"><span>Date: {dateCode(now)}</span><span>Julian:{String(now.getFullYear()).slice(-1)}{pad(dayOfYear(now), 3)}</span><span>Time: {pad(now.getHours())}:{pad(now.getMinutes())}</span><span>GMT: {pad(gmt.getHours())}:{pad(gmt.getMinutes())}</span></p>
    </header>
    <div className="spe-pickup-info"><span>PICKUP LOCATION: {d.pu || ''}</span><span>DATE SHIPPED: <b>{dateCode(closedGmt)}/{timeCode(closedGmt, true)}</b></span><span>ACCOUNT NUMBER: <b>{d.account}</b></span></div>
    <table>
      <thead><tr><th>TRACKING NUMBER</th><th>TCN</th><th>SERVICE</th><th>PCS</th><th>WT</th><th>CUBE</th><th>COST</th><th>ADVICE#</th><th>HAZ</th></tr></thead>
      <tbody>
        {lines.map(p => <tr key={p.tracking}><td>{p.tracking}</td><td>{p.tcn}</td><td>{p.service}</td><td>{p.pieces}</td><td>{Math.round(Number(p.weight) || 0)}</td><td>{p.cube}</td><td>{money(p.cost)}</td><td>{p.advice}</td><td>{p.haz}</td></tr>)}
        <tr className="spe-pickup-totals"><td /><td /><td>TOTALS:</td><td>{sum('pieces')}</td><td>{Math.round(sum('weight'))}</td><td>{sum('cube')}</td><td>{money(sum('cost'))}</td><td /><td /></tr>
      </tbody>
    </table>
    <p className="spe-pickup-sign"><span>CARRIER: </span><span>SHIPPER: </span></p>
    <footer><span>CARRIER PICKUP REPORT</span><span>DODAAC: {origin}</span><span>{dateCode(now)}</span><span>End Page 1</span></footer>
  </article>;
}
