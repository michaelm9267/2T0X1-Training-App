import { JBER_CONSIGNOR } from '../jberConsignor';
import { DODAAC_INFO } from '../CargoWindow/workflow';
import { LOWER_48_DODAACS, OCONUS_DODAACS, ALASKA_DODAACS } from '../Outbound/dodaacs';
import { ORIGINS } from '../Outbound/outboundData';
import { totals } from './model';
import { gblocForDodaac } from './dtrReference';

// 49 CFR 172.204(a)(1) shipper's certification, shown when an assigned TCN is hazardous.
export const HAZARDOUS_CERTIFICATION = 'THIS IS TO CERTIFY THAT THE HEREIN NAMED MATERIALS ARE PROPERLY CLASSIFIED, DESCRIBED, PACKAGED, MARKED, AND LABELED AND ARE IN PROPER CONDITION FOR TRANSPORTATION ACCORDING TO THE APPLICABLE REGULATIONS OF THE DEPARTMENT OF TRANSPORTATION. (REF: CFR49, PARA 172.204(A)(1))';
export const CBL_PREFIX = 'MKFZ7';
export const CBL_LIST_COLUMNS = [['movementDocNbr', 'Movement Doc Nbr'], ['consignee', 'Consignee'], ['dsoeId', 'DSOE ID'], ['chalk', 'Chalk'], ['scac', 'SCAC'], ['milMode', 'Mil Mode'], ['ediMode', 'EDI Mode'], ['destState', 'Dest State'], ['destCountry', 'Dest Country'], ['pieces', 'Pieces'], ['weight', 'Weight'], ['releasedDate', 'Released Date'], ['statusCode', 'Status']];
export const BILL_TO = { billTo: 'USBANK', billToName: 'US BANK-THIRD PARTY PAYMENT SYSTEM', billToAddress: '1010 SOUTH 7TH STREET', billToAddress2: '', billToCity: 'MINNEAPOLIS', billToCountry: 'US', billToState: 'MN', billToZip: '55415' };

// "CITY, ST 99999" → parts; overseas entries keep their country code in the state slot.
const splitCity = text => {
  const match = /^(.*),\s*([A-Z]{2})\s+(.+)$/.exec(text || '');
  return match ? { city: match[1], state: match[2], zip: match[3] } : { city: text || '', state: '', zip: '' };
};
const STATES = new Set('AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY GU PR'.split(' '));
export const CBL_DODAACS = Object.fromEntries([
  ...Object.entries({ ...DODAAC_INFO, ...LOWER_48_DODAACS, ...OCONUS_DODAACS, ...ALASKA_DODAACS }),
  ...Object.values(ORIGINS).map(origin => [origin.cmosDodaac, origin]),
].map(([dodaac, info]) => {
  const { city, state, zip } = splitCity(info.city);
  const domestic = STATES.has(state) && !['GU', 'PR'].includes(state);
  return [dodaac, { name: info.unit, address1: info.address, address2: info.address2 || '', phone: info.phone || '', city, state: domestic ? state : '', country: domestic ? 'US' : state, zip }];
}));
// Address block fields filled from a DODAAC entry; SPLC and GBLOC stay with the trainee.
export function addressPatch(prefix, dodaac) {
  const info = CBL_DODAACS[String(dodaac || '').trim().toUpperCase()];
  const gbloc = prefix === 'consignee' ? gblocForDodaac(dodaac) : '';
  if (!info) return gbloc ? { gbloc } : {};
  return { ...(gbloc ? { gbloc } : {}), [`${prefix}Name`]: info.name, [`${prefix}Address1`]: info.address1, [`${prefix}Address2`]: info.address2, [`${prefix}City`]: info.city, [`${prefix}Country`]: info.country, [`${prefix}State`]: info.state, [`${prefix}Zip`]: info.zip, [`${prefix}PhoneNumber`]: info.phone };
}
export function cblDefaults(origin) {
  const consignor = origin || JBER_CONSIGNOR.dodaac;
  return { ...BILL_TO, billType: 'TP - Third Party Pays', currency: 'USD', deliveryDateType: 'Required', typeRate: '1', nbrOfClsTls: '1', serviceAgency: 'F', originDodaac: consignor, ...addressPatch('origin', consignor), shipperDodaac: consignor, ...addressPatch('shipper', consignor) };
}

const samples = [
  [25, 'WC1JH9', 'LTIA', 'A', 'J', 'AK', 1, 23297, '15Oct2026/1023'],
  [26, 'WC1JH9', 'LTIA', 'A', 'J', 'AK', 1, 23297, '15Oct2026/1025'],
  [27, 'WC1JH9', 'LTIA', 'A', 'J', 'AK', 2, 11200, '15Oct2026/1025'],
  [28, 'WC1JH9', 'LTIA', 'A', 'J', 'AK', 1, 23297, '15Oct2026/1027'],
  [30, 'WC1JH9', 'LTIA', 'A', 'J', 'AK', 2, 19740, '15Oct2026/1028'],
  [31, 'WC1JH9', 'LTIA', 'A', 'J', 'AK', 1, 23297, '15Oct2026/1030'],
  [32, 'WC1JH9', 'LTIA', 'A', 'J', 'AK', 2, 26197, '15Oct2026/1031'],
  [33, 'WC1JH9', 'LTIA', 'A', 'J', 'AK', 1, 23297, '15Oct2026/1032'],
  [34, 'WC1JH9', 'LTIA', 'A', 'J', 'AK', 2, 17700, '15Oct2026/1033'],
  [35, 'WC1JH9', 'LTIA', 'A', 'J', 'AK', 2, 11200, '15Oct2026/1033'],
  [36, 'WC1JH9', 'LTIA', 'A', 'J', 'AK', 2, 24200, '15Oct2026/1034'],
  [37, 'WC1JH9', 'LTIA', 'A', 'J', 'AK', 2, 18180, '15Oct2026/1035'],
  [38, 'WC1JH9', 'LTIA', 'A', 'J', 'AK', 1, 9090, '15Oct2026/1035'],
  [39, 'FB6012', 'LTIA', 'B', 'LT', 'AL', 1, 341, '13Oct2026/1807'],
  [40, 'FB4659', 'LTIA', 'B', 'LT', 'ND', 1, 270, '13Oct2026/1808'],
  [41, 'W81Y7G', 'LTIA', 'B', 'LT', 'AK', 1, 291, '13Oct2026/1810'],
  [42, 'M94160', 'SCAV', 'Q', 'AF', 'GA', 2, 726, '15Oct2026/1734'],
  [43, 'W25G1W', 'LTIA', 'B', 'LT', 'PA', 1, 2588, '15Oct2026/1827'],
];
// Fictional released bills that populate the list the way a working site's would.
export const CBL_SAMPLES = samples.map(([serial, consignee, scac, milMode, ediMode, destState, pieces, weight, releasedDate]) => ({
  id: `cbl-sample-${serial}`,
  sample: true,
  status: 'Released',
  draft: {
    movementDocNbr: `${CBL_PREFIX}000${serial}`, consigneeDodaac: consignee, destinationDodaac: consignee, destinationState: destState, destinationCountry: 'US', scac, milMode, ediMode,
    ...cblDefaults(ORIGINS.jber.cmosDodaac), estimatedCharges: '', waybill: `${scac}${7000 + serial}`,
    sampleTotals: { pieces, weight }, releasedDate, sampleTcns: [],
  },
}));
const serialOf = number => typeof number === 'string' && number.startsWith(CBL_PREFIX) && /^\d{5}$/.test(number.slice(CBL_PREFIX.length)) ? Number(number.slice(CBL_PREFIX.length)) : null;
export function nextCblNumber(store) {
  const used = [...CBL_SAMPLES.map(r => r.draft.movementDocNbr), ...Object.values(store.bills).flatMap(r => [r.draft.movementDocNbr, r.saved?.movementDocNbr])].map(serialOf).filter(n => n !== null);
  const serial = Math.max(Number(store.counters?.cbl) || 0, ...used) + 1;
  return serial <= 99999 ? `${CBL_PREFIX}${String(serial).padStart(5, '0')}` : null;
}
const stamp = iso => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const pad = n => String(n).padStart(2, '0');
  return `${pad(d.getDate())}${months[d.getMonth()]}${d.getFullYear()}/${pad(d.getHours())}${pad(d.getMinutes())}`;
};
// Values carried over from the first assigned TCN in Shipment Planning.
export function shipmentModes(store, draft) {
  const first = (draft.shipmentIds || []).map(id => store.shipments[id]).find(Boolean)?.draft;
  return { milMode: first?.milMode || draft.milMode || '', ediMode: first?.ediMode || draft.ediMode || '' };
}
export function cblRow(store, r) {
  const d = r.draft || {};
  const figures = d.sampleTotals || totals(store, d.shipmentIds || []);
  const release = [...(store.history || [])].reverse().find(h => h.kind === 'bills' && h.id === r.id && h.action === 'Release');
  const first = (d.shipmentIds || []).map(id => store.shipments[id]).find(Boolean)?.draft;
  return {
    movementDocNbr: d.movementDocNbr || r.id,
    consignee: d.consigneeDodaac || first?.destination || '',
    dsoeId: d.dsoeId || '', chalk: d.chalk || '', scac: d.scac || '',
    ...shipmentModes(store, d),
    destState: d.destinationState || '', destCountry: d.destinationCountry || '',
    pieces: (d.shipmentIds?.length || d.sampleTotals) ? figures.pieces : '',
    weight: (d.shipmentIds?.length || d.sampleTotals) ? figures.weight : 0,
    releasedDate: d.releasedDate || (r.status === 'Released' && release ? stamp(release.date) : ''),
    statusCode: r.status === 'Released' ? '00' : '',
  };
}
// Fills the bill's addresses and modes from the first assigned TCN, leaving trainee entries alone.
export function fillFromShipments(store, draft) {
  const first = (draft.shipmentIds || []).map(id => store.shipments[id]).find(Boolean)?.draft;
  if (!first) return {};
  const patch = {};
  const fill = (prefix, dodaac) => {
    if (!dodaac || draft[`${prefix}Dodaac`]) return;
    Object.assign(patch, { [`${prefix}Dodaac`]: dodaac }, addressPatch(prefix, dodaac));
  };
  fill('destination', first.destination);
  fill('consignee', first.destination);
  fill('origin', first.origin);
  if (first.milMode) patch.milMode = first.milMode;
  if (first.ediMode) patch.ediMode = first.ediMode;
  return patch;
}
