import { formatScheduleDate, formatScheduleDateTime, parseScheduleDate, validDateTime } from './airScheduleLogic';

// CMOS Outbound → Routings (Route Orders): the request to SDDC for a commercial carrier.

export const ROUTE_ORDER_TYPES = [['B', 'Voluntary Tender'], ['S', 'Spotbid']];
export const REQUEST_TYPES = [
  ['OR', 'Original'],
  ['CO', 'Correction to a previously transmitted request'],
  ['AI', 'Amend (requesting additional carriers)'],
  ['CA', 'Cancel a previously transmitted request'],
  ['RB', 'Recost'],
];
export const ROUTE_IDS = [['RG', 'Route Order Number-Domestic'], ['RH', 'Route Order Number-Export'], ['RJ', 'Route Order Number-Emergency']];
// ATR Carrier Response Hours, as the CMOS dropdown lists them: 0.25, 0.5, then 1 to 48.
export const ATR_HOURS = ['0.25', '0.5', ...Array.from({ length: 48 }, (_, i) => String(i + 1))];
const validAtr = (value) => { const n = Number(String(value || '').trim()); return n >= 0.25 && n <= 48 && /^(0?\.25|0?\.5|0?\.75|\d{1,2})$/.test(String(value).trim()); };
// Transcribed from the CMOS Route Orders dropdowns.
export const SVC_AGENCY_CODES = [
  ['A', 'ARMY'], ['B', 'DEFENSE MAPPING AGENCY'], ['F', 'AIR FORCE'], ['M', 'MARINE CORPS'], ['N', 'NAVY'], ['P', 'COAST GUARD'],
  ['S', 'DEFENSE LOGISTICS AGENCY'], ['U', 'GSA'], ['W', 'ARMY and AF EXCHANGE SERVICE'], ['Y', 'NON-DOD (EXCEPT COAST GUARD)'], ['X', 'MULTI-SERVICES'],
];
export const AIR_SVC_TYPES = [['AA', 'AIRPORT TO AIRPORT'], ['DA', 'DOOR TO AIRPORT OF DEBARKATION'], ['DD', 'DOOR TO DOOR'], ['AD', 'AIRPORT TO DOOR']];
export const AIR_SVC_LEVELS = [['SG', 'PRIORITY'], ['D1', 'OVERNIGHT'], ['D2', 'SECOND DAY'], ['D3', 'DEFERRED']];

const pad = (n, size) => String(n).padStart(size, '0');
const dayOfYear = (date) => Math.round((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(date.getFullYear(), 0, 1)) / 864e5) + 1;

// Shipment ID: GBLOC + "1" + last digit of the year + Julian day + 4-digit serial for that day,
// e.g. MKFZ1 6 288 0004 → MKFZ162880004.
export function nextShipmentId(store, gbloc, now = new Date()) {
  const prefix = `${gbloc}1${now.getFullYear() % 10}${pad(dayOfYear(now), 3)}`;
  const used = Object.values(store.routings || {}).map((r) => String(r.draft.shipmentId || ''))
    .filter((id) => id.startsWith(prefix)).map((id) => Number(id.slice(prefix.length)) || 0);
  return `${prefix}${pad(Math.max(0, ...used) + 1, 4)}`;
}

export const routingDefaults = (store, { gbloc, origin, requester, now = new Date() }) => ({
  shipmentId: nextShipmentId(store, gbloc, now),
  atr: true,
  routeOrderType: 'B',
  requestType: 'OR',
  routeId: 'RG',
  sendElectronic: true,
  atrHours: '',
  scacsRequested: '24',
  // Request Date is stamped when the request is sent.
  requestDate: '',
  expDate: formatScheduleDate(new Date(now.getTime() + 90 * 864e5)),
  requesterDodaac: origin,
  requesterName: requester,
  requestStatus: '00',
  svcAgencyCode: 'F',
});

// GFM works in Eastern Time: pickup and delivery date/times are Eastern wall-clock times.
export function easternNow(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
    .formatToParts(now).map((p) => [p.type, p.value]));
  return new Date(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second));
}

// Carriers have the ATR Carrier Response Hours to answer; the earliest pickup must fall at least
// 2 hours after that response window closes. The window starts now (Eastern Time).
export function earliestPickupAllowed(atrHours, now = new Date()) {
  const hours = Number(atrHours);
  if (!(hours > 0)) return null;
  const minimum = new Date(easternNow(now).getTime() + (hours + 2) * 3600e3);
  if (minimum.getSeconds() || minimum.getMilliseconds()) minimum.setMinutes(minimum.getMinutes() + 1, 0, 0);
  return minimum;
}

// What Save refuses: the * fields and badly formed entries. Primary EQ Initials and Number are
// required (and open) only for staged equipment. With `now`, the pickup must also clear the ATR window.
export function routingErrors(draft, now) {
  const errors = [];
  if (!String(draft.atrHours || '').trim()) errors.push('ATR Carrier Response Hours is required.');
  else if (!validAtr(draft.atrHours)) errors.push('ATR Carrier Response Hours must be 0.25 - 48.');
  if (draft.stagedEquipment) {
    if (!String(draft.primaryEqInitials || '').trim()) errors.push('Primary EQ Initials is required.');
    if (!String(draft.primaryEqNumber || '').trim()) errors.push('Primary EQ Number is required.');
  }
  for (const [field, label] of [['pickupEarliest', 'Requested Pickup Earliest'], ['pickupLatest', 'Requested Pickup Latest'],
    ['deliveryEarliest', 'Requested Delivery Earliest'], ['deliveryLatest', 'Requested Delivery Latest']])
    if (String(draft[field] || '').trim() && !validDateTime(draft[field])) errors.push(`${label} must be ddmmmyyyy/HHmm.`);
  for (const [field, label] of [['requestDate', 'Request Date'], ['expDate', 'Exp Date'], ['fobContractDate', 'FOB Contract Date']])
    if (String(draft[field] || '').trim() && !/^\d{2}[A-Za-z]{3}\d{4}$/.test(String(draft[field]).trim())) errors.push(`${label} must be ddmmmyyyy.`);
  const pickup = parseScheduleDate(draft.pickupEarliest), delivery = parseScheduleDate(draft.deliveryLatest);
  if (pickup && delivery && pickup > delivery) errors.push('Requested pickup must be before requested delivery.');
  const minimum = now && validDateTime(draft.pickupEarliest) && validAtr(draft.atrHours) ? earliestPickupAllowed(draft.atrHours, now) : null;
  if (minimum && pickup < minimum)
    errors.push(`Requested Pickup Earliest must be at least 2 hours after the ATR carrier response times out (no earlier than ${formatScheduleDateTime(minimum)} Eastern).`);
  for (const [field, label] of [['scacsRequested', 'SCACs Requested'], ['addlScacsRequested', 'Addl SCACs Requested']])
    if (String(draft[field] || '').trim() && !/^\d+$/.test(String(draft[field]).trim())) errors.push(`${label} must be a number.`);
  return errors;
}

export const ROUTING_LIST_COLUMNS = [['shipmentId', 'Shipment ID'], ['releaseId', 'Release ID'], ['destination', 'Dest DODAAC'],
  ['routeOrderType', 'Release Type'], ['requesterName', 'Requester Name'], ['requestStatus', 'Request Status'],
  ['requestDate', 'Request Date'], ['tcnAssigned', 'TCN Assigned'], ['availDate', 'Avail Date']];

// Fictional route orders so the list is not empty; they open view-only.
export const ROUTING_SAMPLES = [
  ['MKFZ162880004', '7TRN49250A', 'FB4497', 'B', 'TRAINER, ALEX', 'AW', '15Oct2026', 'Y', '19Oct2026'],
  ['MKFZ162880003', '7TRN49094A', 'FB4418', 'B', 'TRAINER, ALEX', 'AW', '15Oct2026', 'Y', '16Oct2026'],
  ['MKFZ162860003', '7TRN47314A', 'FB4427', 'B', 'INSTRUCTOR, SAM', 'AW', '13Oct2026', 'Y', '14Oct2026'],
  ['MKFZ162860001', '7TRN47315A', 'FB4479', 'B', 'INSTRUCTOR, SAM', 'CR', '13Oct2026', 'Y', '14Oct2026'],
  ['MKFZ162800004', '', 'FB4497', 'B', 'TRAINER, ALEX', 'NC', '07Oct2026', 'N', '08Oct2026'],
  ['MKFZ162800001', '', 'FB4418', 'S', 'TRAINER, ALEX', 'CR', '07Oct2026', 'N', '08Oct2026'],
  ['MKFZ162790001', '7TRN44373A', 'FB4427', 'B', 'TRAINER, ALEX', 'AW', '06Oct2026', 'Y', '07Oct2026'],
  ['MKFZ162740001', '', 'FB4479', 'B', 'TRAINER, ALEX', '00', '', 'N', ''],
  ['MKFZ162730004', '', 'FB4497', 'B', 'LEADER, JORDAN', 'RR', '30Sep2026', 'N', '01Oct2026'],
].map(([shipmentId, releaseId, destination, routeOrderType, requesterName, requestStatus, requestDate, tcnAssigned, availDate]) => ({
  id: `sample-${shipmentId}`,
  sample: true,
  status: 'Saved',
  revision: 1,
  draft: { shipmentId, releaseId, destination, routeOrderType, requesterName, requestStatus, requestDate, availDate, sampleTcnAssigned: tcnAssigned,
    requestType: 'OR', routeId: 'RG', atrHours: '24', atr: true, origin: 'FA5030', requesterDodaac: 'FA5030', svcAgencyCode: 'F', shipmentIds: [] },
}));

// One list row per route order.
export const routingRow = (r) => {
  const d = r.saved || r.draft;
  return {
    ...d,
    tcnAssigned: d.sampleTcnAssigned || ((d.shipmentIds || []).length ? 'Y' : 'N'),
    availDate: d.availDate || String(d.pickupEarliest || '').split('/')[0],
  };
};
