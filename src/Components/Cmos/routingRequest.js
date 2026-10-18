import { editRecord } from './model';
import { DODAAC_INFO } from '../CargoWindow/workflow';
import { EQUIPMENT_TYPES, SHIPMENT_SERVICE_CODES } from './dtrReference';
import { formatScheduleDate, formatScheduleDateTime } from './airScheduleLogic';
import { routingErrors } from './routingLogic';
import { equipmentGroups } from './routingEquipment';
import { carrierQuotes } from './routingResponse';

// Route order request cycle (Manage Routings guide, steps 25–28), simulated for training:
// Edit Data checks the order → Send Request (status RR, GFM ID and Routing Order Number assigned,
// Request Date stamped, order locked) → after the ATR Carrier Response Hours the carrier list
// arrives (status CR), or Status Request picks it up.

const pad = (n, size) => String(n).padStart(size, '0');

// Equipment Type Lookup rows (Type, Category, Description). The DTR table has no category, so it
// is worked out from the type: K… rail, W… water, motor otherwise unless the text says otherwise.
export const equipmentCategory = (code, text = '') => {
  const t = String(text).toLowerCase();
  if (/^K/.test(code) || /\brail|boxcar|gondola|hopper\b/.test(t)) return 'R - RAIL';
  if (/^W/.test(code) || /\bvessel|barge|ship\b/.test(t)) return 'W - WATER';
  if (/\bbus|pipeline|air\b/.test(t) && !/air ride/.test(t)) return 'O - OTHER';
  return 'M - MOTOR';
};
export const EQUIPMENT_TYPE_ROWS = EQUIPMENT_TYPES.map(([code, text]) => [code, equipmentCategory(code, text), String(text).toUpperCase()]);

// Service Code Lookup (Service Code, Service Code Type, Description): the DTR shipment unit special
// handling codes (V_SHPMNT_UNT_SPL_HNDL_CD_DOM). The DTR table has no type, so transportation
// protective services (surveillance, guards, escorts, protective, dual driver, exclusive use) are
// TPS and the rest accessorial ACC. CMOS's own wording is kept for the codes seen in its lookup.
const CMOS_WORDING = {
  '045': 'ADVANCING CHARGES', 405: 'FUEL ADJUSTMENT', 520: 'OVERDIMENSION PERMIT', 675: 'SIGNATURE TALLY', BUA: 'BUNKER ADJUSTMENT',
  CFC: 'CUSTOMS FEES-CONTAINER LEVEL', CHN: 'CHAINS AND BINDERS', CIS: 'CONSTANT SURVEILLANCE', CUF: 'CURRENCY ADJUSTMENT FACTOR',
};
const TPS = /surveillance|armed guard|security escort|protective|dual driver|exclusive use|signature security|satellite/i;
// Codes whose text mentions those services but which are ordinary accessorials.
const NOT_TPS = ['675', 'AUX', 'HRS', 'EXU'];
export const serviceCodeType = (code, text) => (!NOT_TPS.includes(code) && TPS.test(text) ? 'TPS' : 'ACC');
export const SERVICE_CODES = [
  ...SHIPMENT_SERVICE_CODES.filter(([code]) => code !== 'ZZZ'),
  ...Object.keys(CMOS_WORDING).filter((code) => !SHIPMENT_SERVICE_CODES.some(([c]) => c === code)).map((code) => [code, CMOS_WORDING[code]]),
].map(([code, text]) => [code, serviceCodeType(code, text), CMOS_WORDING[code] || String(text).toUpperCase()])
  .sort((a, b) => a[0].localeCompare(b[0]));
export const serviceCodeInfo = (code) => SERVICE_CODES.find(([c]) => c === String(code || '').trim().toUpperCase());

// Fictional SPLC (9 digits) for a DODAAC, so Copy TCN Data can fill Origin/Dest SPLC.
// Only DODAACs in the system have one; any other DODAAC gets no SPLC.
export function splcFor(dodaac) {
  const text = String(dodaac || '').trim().toUpperCase();
  if (!text || !DODAAC_INFO[text]) return '';
  let hash = 7;
  for (const ch of text) hash = (hash * 31 + ch.charCodeAt(0)) % 900000000;
  return String(100000000 + hash);
}

// Copy TCN Data: the first assigned TCN supplies the destination, SPLCs, UMMIPS RDD and TP.
export function copyTcnData(store, record) {
  const d = record.draft;
  const first = store.shipments[(d.shipmentIds || [])[0]]?.saved || store.shipments[(d.shipmentIds || [])[0]]?.draft;
  if (!first) return store;
  return editRecord(store, 'routings', record.id, {
    origin: first.origin || d.origin, destination: first.destination || d.destination,
    originSplc: splcFor(first.origin || d.origin), destSplc: splcFor(first.destination || d.destination),
    ummipsRdd: first.rdd || d.ummipsRdd || '', tp: first.tp || d.tp || '',
  });
}

// Edit Data: everything the guide fills in before the request can be sent.
export function routingCheckErrors(store, draft, now) {
  const errors = [];
  if (!(draft.shipmentIds || []).length) errors.push('Assign at least one TCN.');
  if (!String(draft.destination || '').trim()) errors.push('Dest DODAAC is required.');
  for (const [field, label] of [['pickupEarliest', 'Requested Pickup Earliest'], ['pickupLatest', 'Requested Pickup Latest'],
    ['deliveryEarliest', 'Requested Delivery Earliest'], ['deliveryLatest', 'Requested Delivery Latest']])
    if (!String(draft[field] || '').trim()) errors.push(`${label} is required.`);
  errors.push(...routingErrors(draft, now));
  for (const group of equipmentGroups(store, draft))
    if (!group.equipment.length) errors.push(`Add equipment to equip group ${group.group} in the Equip Load Plan.`);
  return [...new Set(errors)];
}

export const isSent = (draft) => Boolean(draft?.gfmId) || !['', '00', undefined, null].includes(draft?.requestStatus);

// What the Edit Data button records: the revision it passed on.
export const passedEditData = (record) => Boolean(record?.routeCheck?.passed && record.routeCheck.revision === record.revision
  && JSON.stringify(record.draft) === JSON.stringify(record.saved));

function stamp(store, id, patch) {
  const r = store.routings[id];
  const draft = { ...r.draft, ...patch };
  return { ...store, routings: { ...store.routings, [id]: { ...r, draft, saved: { ...(r.saved || r.draft), ...patch } } } };
}

const logEntry = (now, user, action) => ({ at: formatScheduleDateTime(now).toUpperCase(), user, action });
const userOf = (draft) => String(draft.requesterName || 'TRAINEE').split(',')[0].replace(/\s+/g, '').slice(0, 8).toUpperCase() || 'TRAINEE';

export function sendRequest(store, id, now = new Date()) {
  const r = store.routings[id];
  const serial = (store.counters?.gfm || 139800) + 1;
  const gbloc = String(r.draft.shipmentId || 'MKFZ').slice(0, 4);
  const sentAt = now.getTime();
  const user = userOf(r.draft);
  const log = [...(r.draft.requestLog || [])];
  if (!log.length) log.push(logEntry(now, user, 'SHIP ID CREATED'));
  log.push(logEntry(now, user, 'ORIGINAL REQ'), logEntry(now, user, 'REQUEST SENT'), logEntry(now, user, 'FORWARDED TO ATR'));
  const next = stamp(store, id, {
    requestStatus: 'RR', gfmId: pad(serial, 13), routingOrderNumber: `7${gbloc.slice(1)}${pad(serial % 100000, 5)}A`,
    requestDate: formatScheduleDate(now), requestSentAt: sentAt, responseDueAt: sentAt + Number(r.draft.atrHours || 0) * 3600e3,
    requestLog: log,
  });
  return { ...next, counters: { ...next.counters, gfm: serial },
    history: [...(store.history || []), { kind: 'routings', id, action: 'Send Request', revision: r.revision, status: 'RR', date: now.toISOString(), user: r.draft.requesterName || 'TRAINEE' }] };
}

// The ATR window has closed (in training: after the 10-second simulation): every equipment
// group gets its carrier quotes and the order moves RR → CR.
export function receiveResponses(store, id, now = new Date(), { force = false } = {}) {
  const r = store.routings[id];
  if (!r || r.draft.requestStatus !== 'RR' || (!force && now.getTime() < Number(r.draft.responseDueAt || Infinity))) return store;
  const equipGroups = { ...(r.draft.equipGroups || {}) };
  for (const group of equipmentGroups(store, r.draft))
    equipGroups[group.group] = { ...(equipGroups[group.group] || {}), carriers: carrierQuotes(store, r.draft, group, now), assignedScac: '', reasons: {} };
  const user = userOf(r.draft);
  return stamp(store, id, {
    requestStatus: 'CR', equipGroups, responseStatus: 'CR - CARRIER RESPONSES RECEIVED',
    requestLog: [...(r.draft.requestLog || []), logEntry(now, user, 'REQUEST SENT'), logEntry(now, user, 'ROUT RESPONSE REC')],
  });
}

export function statusRequest(store, id, now = new Date()) {
  const r = store.routings[id];
  if (r.draft.requestStatus !== 'RR') return { store, message: `Request Status is ${r.draft.requestStatus}. No status request is needed.` };
  return { store: receiveResponses(store, id, now, { force: true }), message: 'Status Request sent. Carrier responses received.' };
}

// SCAC window: assign (or remove) a carrier for an equipment group, with RSN reasons.
export function setGroupResponse(store, id, group, patch) {
  const r = store.routings[id];
  const equipGroups = { ...(r.draft.equipGroups || {}), [group]: { ...((r.draft.equipGroups || {})[group] || {}), ...patch } };
  return stamp(store, id, { equipGroups });
}

// What a route order hands its Commercial BOL: routing data from the order, the equipment group's
// DSOE/chalk/NMFC and service codes, and — once a SCAC is assigned — the carrier's tender, cost and
// mileage (and why the lowest cost carrier was not used).
const titleDate = (text) => { const m = /^(\d{2})([A-Za-z]{3})(\d{4})/.exec(String(text || '')); return m ? `${m[1]}${m[2][0].toUpperCase()}${m[2].slice(1).toLowerCase()}${m[3]}` : ''; };
export function routeToBill(draft, group) {
  const carriers = group.carriers || [];
  const carrier = carriers.find((c) => c.scac === group.assignedScac);
  const lowest = carriers[0];
  const lowestReason = lowest && carrier && lowest.scac !== carrier.scac ? (group.reasons || {})[lowest.scac] || '' : '';
  const protective = (group.serviceCodes || []).find((s) => s.type === 'TPS');
  const [nmfc, sub] = [group.nmfc, group.nmfcSub];
  return {
    routing: draft.routingOrderNumber || '', routeId: draft.routeId || '', routingStatus: draft.requestStatus || '',
    dsoeId: group.dsoeId || '', chalk: group.chalk || '',
    ...(nmfc ? { nmfcUfc: nmfc, nmfcSub: sub || '0' } : {}),
    ...(draft.deliveryLatest ? { deliveryDate: titleDate(draft.deliveryLatest), deliveryDateType: 'Required' } : {}),
    fobPoint: draft.fobPoint || '', city: draft.fobCity || '', state: draft.fobStCo || '',
    airServiceType: draft.airSvcType || '', airServiceLevel: draft.airSvcLevel || '', etrrId: draft.etrrId || '',
    tailoredTransportationContract: Boolean(draft.tailoredTransportationContract),
    ...(draft.carrierRemarks ? { remarks1: draft.carrierRemarks } : {}),
    ...(protective ? { blk31ProtSvc: protective.code } : {}),
    serviceCodes: (group.serviceCodes || []).map((s) => ({ ...s, performDate: titleDate(draft.pickupEarliest), charges: 0 })),
    scac: carrier?.scac || '',
    tariffSpecialRateAuth: carrier ? `${carrier.tender} - ${carrier.mode} ${titleDate(carrier.effective)} ${titleDate(carrier.expires)}` : '',
    estimatedCharges: carrier ? carrier.totalCost.toFixed(2) : '', oaCharges: carrier ? carrier.totalCost.toFixed(2) : '',
    ratedMileage: carrier ? String(carrier.ratedMiles) : '',
    costDiff: carrier && lowest ? (carrier.totalCost - lowest.totalCost).toFixed(2) : '',
    reason: /^N/.test(lowestReason) ? lowestReason : '',
  };
}

// Update: award every equipment group that has an assigned SCAC (CR → AW).
export function awardRoute(store, id, now = new Date()) {
  const r = store.routings[id];
  const groups = equipmentGroups(store, r.draft);
  const missing = groups.flatMap((g) => [
    !g.cblId && `Create the CBL for equip group ${g.group}.`,
    !g.assignedScac && `Assign a SCAC to equip group ${g.group}.`,
  ]).filter(Boolean);
  if (missing.length) return { store, errors: missing };
  const equipGroups = { ...(r.draft.equipGroups || {}) };
  for (const g of groups) equipGroups[g.group] = { ...equipGroups[g.group], awardStatus: 'AWARDED', releaseDate: formatScheduleDate(now).toUpperCase() };
  const next = stamp(store, id, {
    requestStatus: 'AW', equipGroups, releaseId: r.draft.routingOrderNumber, availDate: String(r.draft.pickupEarliest || '').split('/')[0],
    requestLog: [...(r.draft.requestLog || []), logEntry(now, userOf(r.draft), 'AWARDED')],
  });
  return { store: { ...next, history: [...(next.history || []), { kind: 'routings', id, action: 'Award', revision: r.revision, status: 'AW', date: now.toISOString(), user: r.draft.requesterName || 'TRAINEE' }] }, errors: [] };
}
