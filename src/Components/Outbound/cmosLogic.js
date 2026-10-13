import { ITEMS, ORIGINS, AERIAL_PORTS, originOf, isOverseas } from './outboundData';
import { HAZ_INDICATORS } from '../CargoWindow/workflow';
import { shipmentTp, DOCUMENT_DAY, julian } from './outboundShipments';
import { MIL_MODES, stepForMode, podFor } from './outboundLogic';

// CMOS (Cargo Movement Operations System) training screens for outbound processing: the Shipment
// Planning list, the Shipment Planning record, and Small Package Express.

export const DOC_TYPES = ['M - MILSTRIP', 'N - Non-MILSTRIP', 'O - Other'];
export const expectedDocType = shipment => shipment.document === '1348-1A' ? 'M - MILSTRIP' : 'N - Non-MILSTRIP';
export const NO_DODAAC = 'F00000';
export const tpCode = shipment => shipmentTp(shipment).slice(2);
// CMOS rounds a piece's cube up to the next whole cubic foot.
export const pieceCube = piece => {
  const [l, w, h] = ['length', 'width', 'height'].map(id => Number(piece[id]) || 0);
  return l && w && h ? Math.ceil(l * w * h / 1728) : '';
};
const normalize = (value, id) => String(value ?? '').trim().toUpperCase().replace(id === 'nsn' ? /[-\s]/g : /$^/, '');

// The TCN CMOS holds for the shipment: what the trainee saved, or the advance record's.
export const activeTcn = (shipment, e) => e.cmos?.record?.saved ? normalize(e.cmos.record.draft.tcn) : shipment.tcn;

// ---- Shipment Planning list ----

const seeded = seed => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const FILLER_CONSIGNEES = ['FY5186', 'FY5027', 'FY5026', 'FB2307', 'FB5270', 'FB5004', 'FY5020', 'SW3225', 'EZ7504', 'Q98917', ''];

// Other advance records waiting at this TMO, so the trainee has to find the right TCN. Stable for an origin.
export function fillerRows(originId) {
  const origin = ORIGINS[originId] || ORIGINS.jber;
  const random = seeded(originId === 'travis' ? 4427 : 5030);
  const rows = [];
  let day = 106;
  for (let i = 0; i < 26; i += 1) {
    day += Math.floor(random() * 5);
    const suffix = String(Math.floor(random() * 6)).padStart(2, '0');
    rows.push({ tcn: `${origin.cmosDodaac}${julian(day)}X5${suffix}XXX`, docNbr: '', status: '00', docType: 'N', tac: '', consignee: FILLER_CONSIGNEES[Math.floor(random() * FILLER_CONSIGNEES.length)], priority: '', rdd: String(day + Math.floor(random() * 8)) });
  }
  return [...new Map(rows.map(row => [row.tcn, row])).values()];
}

// The customer's own row: there when supply sent an advance record, or once a new record is saved.
export function customerRow(shipment, e) {
  const record = e.cmos?.record;
  if (!shipment.advance && !record?.saved) return null;
  const saved = Boolean(record?.saved);
  const draft = record?.draft || {};
  const pieces = saved ? record.pieces : [];
  return {
    tcn: activeTcn(shipment, e), docNbr: saved ? draft.docNbr || '' : shipment.documentNumber, status: saved ? 'PI' : '00', docType: (saved ? draft.docType || '' : expectedDocType(shipment)).slice(0, 1), tac: saved ? draft.tac || '' : shipment.tac,
    consignee: saved ? draft.consignee || '' : shipment.dodaac || NO_DODAAC, pod: saved ? draft.pod || '' : '', milMode: saved ? draft.milMode : '', priority: saved ? draft.tp || '' : tpCode(shipment), rdd: saved ? draft.rdd || '' : shipment.rdd,
    pieces: pieces.length || '', weight: pieces.reduce((sum, p) => sum + (Number(p.weight) || 0), 0) || '', cube: pieces.reduce((sum, p) => sum + (Number(pieceCube(p)) || 0), 0) || '', customer: true,
  };
}

export function listRows(shipment, e) {
  const own = customerRow(shipment, e);
  return [...fillerRows(shipment.origin), ...(own ? [own] : [])].sort((a, b) => a.tcn.localeCompare(b.tcn));
}

// TCN search: % is a wildcard; an exact search ignores the status filter, as in CMOS.
export function searchRows(rows, { status, tcn }) {
  const text = String(tcn || '').trim().toUpperCase();
  if (text) {
    const pattern = new RegExp(`^${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*')}$`);
    return rows.filter(row => pattern.test(row.tcn));
  }
  return status === 'all' ? rows : rows.filter(row => row.status === status);
}

// ---- Shipment Planning record ----

// Header fields on the record. expected: the value from the shipping document; advance: supply's
// advance record fills it in; preset: CMOS fills it in on a new record too; required: Save refuses an
// empty entry. Nothing is graded and every field stays editable until Save: the trainer reviews the
// record with the trainee. POE, POE DODAAC and POD are needed only for an AMC (Mode 9) move.
export const chosenMode = draft => String(draft?.milMode ?? '').trim().toUpperCase();
export function planningFields(shipment, draft = {}) {
  const item = ITEMS[shipment.itemId];
  const origin = originOf(shipment);
  const amc = chosenMode(draft) === '9';
  return {
    docType: { title: 'Doc Type', expected: expectedDocType(shipment), options: DOC_TYPES, advance: true },
    docNbr: { title: 'Doc Nbr', expected: shipment.documentNumber, advance: true },
    tcn: { title: 'TCN', expected: shipment.tcn, advance: true, required: true },
    nomen: { title: 'Nomen', expected: item.nomenclature, advance: true, required: true },
    milMode: { title: 'MIL Mode', required: true },
    nmfc: { title: 'NMFC/UFC', required: true },
    tac: { title: 'TAC', expected: shipment.tac, advance: true },
    nsn: { title: 'NSN', expected: shipment.nsn, advance: true, required: true },
    partNo: { title: 'Part No/AIN', expected: item.partNumber, advance: true },
    consignor: { title: 'Consignor', expected: origin.dodaac, preset: true, required: true },
    poe: { title: 'POE', expected: origin.port, options: AERIAL_PORTS, required: amc },
    poeDodaac: { title: 'POE DODAAC', expected: origin.cmosDodaac, required: amc },
    // A consignee with no DoDAAC takes the sponsoring Service code, F00000 for the Air Force
    // (DTR Part II, Chapter 203, para B.2).
    consignee: { title: 'Consignee', expected: shipment.dodaac || NO_DODAAC, advance: true },
    pod: { title: 'POD', expected: podFor(shipment), options: AERIAL_PORTS, required: amc },
    ciic: { title: 'CIIC', required: true },
    secClass: { title: 'Sec Class', expected: 'U', options: ['U', 'C', 'S'], preset: true },
    // Type cargo code 3 marks an ESD-sensitive item (DAFI 24-602V2 para 8.10.2.1).
    typeCargo: { title: 'Type Cargo', expected: item.esd ? '3' : 'Z', options: ['Z', '3', 'A', 'B', 'C'], preset: true },
    rdd: { title: 'RDD', expected: shipment.rdd, advance: true, date: 'julian' },
    tp: { title: 'TP', expected: tpCode(shipment), options: ['1', '2', '3'], advance: true },
    hazInd: { title: 'Hazardous/Ammunition Ind', expected: HAZ_INDICATORS[0], options: HAZ_INDICATORS, advance: true, required: true },
  };
}
// Entries CMOS shows on every record without the trainee typing them; all can be overwritten.
const RECORD_DEFAULTS = { primeDic: 'TX1', ediMode: 'AF', expMode: 'F' };

// Ultimate Consignee tab. Used when the piece goes to an address in the clear: a vendor with no
// DoDAAC, or a delivery point different from the consignee DoDAAC's address. Otherwise it stays empty.
export const UC_FIELDS = { ucName: 'Name', ucAddress: 'Address', ucAddress2: 'Address 2', ucCity: 'Base/City', ucCountry: 'Country', ucState: 'State', ucZip: 'Zip', ucPhone: 'Phone Nbr' };
// The Shipment Planning tab a field lives on, for marking a tab that has an error.
export const tabOf = id => id.startsWith('uc') ? 'consignee' : id === 'hazInd' ? 'indicators' : id === 'pieces' ? 'pieces' : null;

function newRecordDraft(shipment, advance) {
  const fields = planningFields(shipment);
  return { ...RECORD_DEFAULTS, ...Object.fromEntries(Object.entries(fields).filter(([, field]) => field.preset || (advance && field.advance)).map(([id, field]) => [id, typeof field.expected === 'boolean' ? field.expected : String(field.expected)])) };
}
const openRecord = (shipment, advance) => ({ isNew: !advance, draft: newRecordDraft(shipment, advance), pieces: [], saved: false, errors: [], feedback: '' });
const setCmos = (e, changes) => ({ ...e, cmos: { ...e.cmos, ...changes } });

// Incheck the selected advance record. Inchecking a TCN that isn't the customer's is a mistake.
export function incheckTcn(shipment, e, tcn) {
  if (!tcn) return setCmos(e, { message: 'Select a TCN to incheck.' });
  if (e.cmos.record && tcn === shipment.tcn) return e;
  if (tcn !== shipment.tcn) return setCmos(e, { message: `${tcn} is another shipment's advance record. This training opens only the customer's own TCN; check it against the shipping document.` });
  return setCmos(e, { record: openRecord(shipment, true), message: '' });
}

// Start a new record for a TCN that has no advance record.
export function newRecord(shipment, e) {
  if (e.cmos.record) return e;
  return setCmos(e, { record: openRecord(shipment, false), message: '' });
}
// Close an unsaved record and go back to the list.
export const discardRecord = e => e.cmos.record?.saved ? e : setCmos(e, { record: null });

const updateRecord = (e, change) => e.cmos.record && !e.cmos.record.saved ? setCmos(e, { record: change(e.cmos.record) }) : e;
export const editRecord = (e, field, value) => updateRecord(e, record => ({ ...record, draft: { ...record.draft, [field]: value } }));
export const addPiece = e => updateRecord(e, record => ({ ...record, pieces: [...record.pieces, { weight: '', typePack: '', length: '', width: '', height: '' }] }));
export const editPiece = (e, index, field, value) => updateRecord(e, record => ({ ...record, pieces: record.pieces.map((piece, i) => i === index ? { ...piece, [field]: value } : piece) }));
export const deletePieces = e => updateRecord(e, record => ({ ...record, pieces: [] }));

// Save refuses only what CMOS itself would: a TCN already in the system, an empty required entry,
// a Mil Mode that is not a code, or a record with no piece. Nothing is graded.
export function savePlanning(shipment, e) {
  const record = e.cmos.record;
  if (!record || record.saved) return e;
  const fields = planningFields(shipment, record.draft);
  const fail = changes => setCmos(e, { record: { ...record, ...changes } });
  const typedTcn = normalize(record.draft.tcn);
  if (record.isNew && ((shipment.advance && typedTcn === shipment.tcn) || fillerRows(shipment.origin).some(row => row.tcn === typedTcn))) {
    return fail({ errors: ['tcn'], feedback: `TCN ${typedTcn} already exists in CMOS. Search for it and use Incheck, or use an unused number.` });
  }
  const missing = [...Object.entries(fields).filter(([id, field]) => field.required && !String(record.draft[id] ?? '').trim()).map(([id]) => id),
    ...(Object.keys(UC_FIELDS).some(id => String(record.draft[id] ?? '').trim()) && !String(record.draft.ucCountry ?? '').trim() ? ['ucCountry'] : [])];
  if (missing.length) return fail({ errors: missing, feedback: `Required: ${missing.map(id => fields[id]?.title || `Ultimate Consignee ${UC_FIELDS[id]}`).join(', ')}.` });
  const milMode = chosenMode(record.draft);
  if (!stepForMode(milMode)) return fail({ errors: ['milMode'], feedback: `Use a Mil Mode code from the lookup (${Object.keys(MIL_MODES).join(', ')}).` });
  if (!record.pieces.length) return fail({ errors: ['pieces'], feedback: 'Add the piece on the Pieces tab (New) with its weight, type pack and dimensions.' });
  const next = { ...record, saved: true, errors: [], draft: { ...record.draft, milMode },
    feedback: `Record saved. Status PI. Mil Mode ${milMode}, ${MIL_MODES[milMode].toLowerCase()}. Print the MSL from the Pieces tab.${stepForMode(milMode) === 'small-package' ? ' Select Expr Ship to process it on Small Package Express.' : ''}` };
  return { ...setCmos(e, { record: next, message: '' }), milMode, mode: stepForMode(milMode) };
}
export const canExpressShip = e => Boolean(e.cmos.record?.saved) && ['J', '5'].includes(e.milMode);

// ---- Small Package Express ----

export const SCACS = ['FDE', 'FDEG', 'PAZC', 'UPSN', 'UPSQ'];
export const SERVICES = ['Priority Overnight', 'Standard Overnight', '2Day', 'Express Saver', 'Ground'];
export const PACKAGES = ['Your Packaging', 'Box', 'Pak', 'Envelope', 'Tube'];
export const PICKUP_LOCATIONS = ['TMO DOCK', 'WAREHOUSE'];
// Guidance only: a package leaving Alaska for anywhere outside Alaska, or going overseas, is INT.
export const usualDomInt = shipment => originOf(shipment).alaska || isOverseas(shipment.dodaac) ? 'INT' : 'DOM';
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
export const todayCode = () => { const d = new Date(Date.UTC(2026, 0, DOCUMENT_DAY)); return `${String(d.getUTCDate()).padStart(2, '0')}${MONTHS[d.getUTCMonth()]}${d.getUTCFullYear()}`; };
export function validDateCode(value) {
  const match = /^(\d{2})([A-Z]{3})(\d{4})$/.exec(String(value || '').trim().toUpperCase());
  if (!match || !MONTHS.includes(match[2])) return false;
  const day = Number(match[1]);
  return day >= 1 && day <= new Date(Date.UTC(Number(match[3]), MONTHS.indexOf(match[2]) + 1, 0)).getUTCDate();
}

// Every Small Package Express choice is the trainee's; Print refuses only empty required entries.
export const SPE_FIELDS = {
  scac: { title: 'SCAC', options: SCACS, required: true },
  domInt: { title: 'DOM/INT', options: ['DOM', 'INT'], required: true },
  service: { title: 'Service', options: SERVICES, required: true },
  shipmentDate: { title: 'Shipment Date', required: true },
  destCity: { title: 'Dest City', required: true },
  package: { title: 'Package', options: PACKAGES, required: true },
};
export const openExpressShip = e => canExpressShip(e) && !e.spe ? { ...e, spe: { draft: { label: 'Thermal' }, rated: false, errors: [], feedback: '' } } : e;
export const editExpress = (e, field, value) => e.spe && !e.spe.rated ? { ...e, spe: { ...e.spe, draft: { ...e.spe.draft, [field]: value } } } : e;

// Tracking numbers in each carrier's format, made from the TCN so they stay the same for a shipment.
function trackingNumber(scac, tcn) {
  const digits = [...tcn].map(ch => ch.charCodeAt(0) % 10).join('').padEnd(18, '7');
  if (scac.startsWith('UPS')) return `1Z${digits.slice(0, 6).replace(/\d/g, d => 'ABCDEFGHJK'[d])}01${digits.slice(6, 14)}`;
  if (scac === 'PAZC') return `9400${digits.slice(0, 18)}`;
  return digits.slice(0, 12);
}
const RATES = { 'Priority Overnight': [42, 2.15, 1], 'Standard Overnight': [36, 1.9, 1], '2Day': [27, 1.35, 2], 'Express Saver': [21, 1.05, 3], Ground: [12, .55, 5] };

// Send Request sends the shipment to the carrier, which rates it: tracking number, rated weight,
// charges and transit days. The entries lock until Cancel clears the rating.
export function sendRequest(shipment, e) {
  const spe = e.spe;
  if (!spe || spe.rated) return e;
  const save = changes => ({ ...e, spe: { ...spe, ...changes } });
  const missing = Object.entries(SPE_FIELDS).filter(([id, field]) => field.required && !String(spe.draft[id] ?? '').trim()).map(([id]) => id);
  if (missing.length) return save({ errors: missing, feedback: `Required: ${missing.map(id => SPE_FIELDS[id].title).join(', ')}.` });
  if (!validDateCode(spe.draft.shipmentDate)) return save({ errors: ['shipmentDate'], feedback: 'Enter the shipment date as ddmmmyyyy, for example 12OCT2026.' });
  const pieces = e.cmos.record?.pieces || [];
  const weight = pieces.reduce((sum, p) => sum + (Number(p.weight) || 0), 0);
  const dimWeight = pieces.reduce((sum, p) => sum + (Number(p.length) || 0) * (Number(p.width) || 0) * (Number(p.height) || 0) / 139, 0);
  const [base, perPound, days] = RATES[spe.draft.service] || RATES.Ground;
  const rated = Math.ceil(Math.max(weight, dimWeight));
  return save({ rated: true, errors: [], feedback: 'Request sent. The carrier rated the shipment. Print Express Docs to print the shipping label.',
    result: { tracking: trackingNumber(spe.draft.scac, activeTcn(shipment, e)), rated, charges: (base + perPound * rated).toFixed(2), transitDays: days, closed: spe.draft.shipmentDate.trim().toUpperCase() } });
}
// Cancel voids the rating and its tracking number, so the entries can be changed and sent again. A
// shipping label or invoice printed for the old tracking number is void too, and comes off the box.
export function cancelRequest(e) {
  if (!e.spe?.rated) return e;
  const { carrierLabel, invoice, ...printed } = e.printed || {};
  const { carrier, ...labels } = e.labels || {};
  return { ...e, printed, labels, spe: { ...e.spe, rated: false, result: null, errors: [], feedback: `Request cancelled. Tracking number ${e.spe.result.tracking} is void; update the entries and send the request again.${carrierLabel || carrier ? ' Reprint and reapply the shipping label.' : ''}` } };
}

// A closed package as the Print Small Package Express Documents window and the pickup report list it.
export function closedPackage(shipment, e) {
  if (!e.spe?.rated) return null;
  const record = e.cmos.record;
  const pieces = record?.pieces || [];
  return {
    key: shipment.key, tcn: activeTcn(shipment, e), scac: e.spe.draft.scac, service: e.spe.draft.service, domInt: e.spe.draft.domInt,
    tracking: e.spe.result.tracking, closed: e.spe.result.closed, pu: e.spe.draft.pu || '', pieces: pieces.length,
    weight: pieces.reduce((sum, p) => sum + (Number(p.weight) || 0), 0), consignee: record?.draft.consignee || '', destCity: e.spe.draft.destCity,
  };
}
