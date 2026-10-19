import { piecesFor, totals } from './model';
import { EMPTY_PALLETS, julianDate, today } from './airCargoRows';
import { eligibleForAirManifest } from './airManifestLogic';

// CMOS Pallets: a pallet record keeps the pallet's own header; the TCNs built on it carry its ID
// (shipment palletId). Weight, pieces, cube, height, priority, and POD come from those TCNs.
export const PALLET_CATEGORIES = { Regular: 'New Regular Pallet', Special: 'New Special Pallet', Household: 'New Household Pallet' };
export const PALLET_LIST_COLUMNS = [['palletId', 'ID'], ['poe', 'POE'], ['date', 'Date'], ['consignee', 'Consignee'], ['manifest', 'Manifest'], ['pod', 'POD'], ['weight', 'Gross Weight'], ['completeDate', 'Complete Date'], ['priority', 'Priority'], ['special', 'Special'], ['hazard', 'Hazard'], ['cargoLocation', 'Cargo Location'], ['configCode', 'Config Code'], ['epp', 'EPP'], ['height', 'Height'], ['dsoeId', 'DSOE ID'], ['chalk', 'Chalk'], ['loadPlanId', 'Load Plan ID'], ['typeCargo', 'Type Cargo'], ['frCode', 'FR Code']];
export const PALLET_TCN_COLUMNS = [['type', 'Type'], ['tcn', 'TCN'], ['pod', 'POD'], ['rdd', 'RDD'], ['priority', 'Priority'], ['commSh', 'Comm S/H'], ['hazCode', 'Haz Code'], ['proj', 'Project Code'], ['cargoLocation', 'Cargo Location'], ['pieces', 'Pieces'], ['weight', 'Weight'], ['cube', 'Cube'], ['dsoeId', 'DSOE ID'], ['chalk', 'Chalk'], ['frCode', 'FR Code'], ['mailInd', 'Mail Ind']];
export const ASSIGN_TCN_COLUMNS = [...PALLET_TCN_COLUMNS.slice(1), ['tac', 'TAC']];

const code = value => String(value || '').trim().charAt(0).toUpperCase();
// Haz Code is the Hazardous/Ammunition indicator (A, E, or O); N (not hazardous) shows blank.
export const hazCode = draft => ['A', 'E', 'O'].includes(code(draft.hazmat)) ? code(draft.hazmat) : '';
const CLASSIFIED = ['C', 'R', 'S', 'T'];
// CIIC codes for sensitive arms, ammunition, explosives, controlled, or classified items.
const SENSITIVE_CIIC = ['$', '1', '2', '3', '4', '5', '6', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'K', 'L', 'N', 'O', 'P', 'Q', 'R', 'S', 'T'];
// A special pallet carries only hazardous or classified/sensitive cargo.
export const specialCargo = draft => Boolean(hazCode(draft)) || CLASSIFIED.includes(code(draft.secClass)) || SENSITIVE_CIIC.includes(String(draft.ciic || '').trim().toUpperCase());

// DTEB Palletized Transportation Unit Module Type: B = pallet 61"-84", L = pallet 85"-96"
// (C-5/C-17/C-130), M = pallet 97" and up (C-5/C-17). An empty pallet starts as L.
export const palletType = height => !height ? 'L' : height <= 84 ? 'B' : height <= 96 ? 'L' : 'M';

export const members = (store, palletId) => Object.values(store.shipments).filter(r => r.draft.palletId === palletId);
export const manifestFor = (store, ids) => Object.values(store.airManifests || {}).find(m => ids.some(id => (m.draft.shipmentIds || []).includes(id)));
export const palletRecord = (store, palletId) => Object.values(store.pallets || {}).find(r => r.draft.palletId === palletId);

export function tcnRow(store, record) {
  const d = record.draft;
  const sum = totals(store, [record.id]);
  return { ...d, ids: [record.id], type: 'I', priority: d.tp || '', commSh: d.commoditySH || '', hazCode: hazCode(d), proj: d.proj || '', pieces: sum.pieces, weight: sum.weight, cube: Math.round(sum.cube) };
}

// Everything the Pallets grid and the Build Pallet header show for one pallet ID.
export function palletSummary(store, palletId) {
  const record = palletRecord(store, palletId);
  const header = record?.draft || EMPTY_PALLETS.find(p => p.palletId === palletId) || {};
  const tcns = members(store, palletId);
  const ids = tcns.map(r => r.id);
  const sum = totals(store, ids);
  const height = Math.max(0, ...piecesFor(store, ids).map(p => Number(p.draft?.height) || 0));
  const first = tcns[0]?.draft || {};
  const date = header.date || first.palletDate || '';
  const manifest = manifestFor(store, ids);
  return { palletId, record, category: header.category || 'Regular', ids, built: ids.length > 0,
    poe: header.poe || first.poe || 'EDF', date, consignee: first.destination || '', manifest: manifest?.draft.manifestNumber || '', manifestId: manifest?.id,
    pod: first.pod || '', weight: ids.length ? sum.weight : '', pieces: sum.pieces, cube: Math.round(sum.cube), completeDate: header.completionDate || (ids.length ? julianDate(date) : ''),
    priority: ids.length ? String(Math.min(...tcns.map(r => Number(r.draft.tp) || 9))) : '', special: '', hazard: tcns.some(r => hazCode(r.draft)) ? 'Y' : 'N',
    cargoLocation: header.gridLocation || '', configCode: 'PC', epp: ids.length ? '10.0' : '1.0', height: height || '', dsoeId: header.dsoeId || first.dsoeId || '', chalk: header.chalk || first.chalk || '',
    loadPlanId: '', typeCargo: ids.length ? String(first.typeCargo || 'G').charAt(0) : '', frCode: header.frustratedReason || '', palletType: palletType(height), cb: 44,
    mode: first.milMode || 'F', buildup: first.origin || '', rfTag: header.rfTag || '' };
}

// Every pallet ID CMOS knows: pallet records, pallets built from shipments, and empty pallets on hand.
export function allPalletIds(store) {
  return [...new Set([...Object.values(store.pallets || {}).map(r => r.draft.palletId), ...Object.values(store.shipments).map(r => r.draft.palletId).filter(Boolean), ...EMPTY_PALLETS.map(p => p.palletId)])].sort();
}

// The next free two-letter pallet ID (I and O are skipped so they are not read as 1 and 0).
const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
export function nextPalletId(store, taken = allPalletIds(store)) {
  for (const a of LETTERS) for (const b of LETTERS) if (!taken.includes(a + b)) return a + b;
  return null;
}
export const newPalletDraft = (palletId, category = 'Regular') => ({ palletId, category, poe: 'EDF', date: today(), dsoeId: '', chalk: '', rfTag: '', airDimCode: 'Z', configCode: 'PC', typeTieDown: 'N' });

// TCNs Assign TCNs offers: MIL Mode F cargo not on a pallet, not on another manifest; a special
// pallet only takes hazardous or classified/sensitive cargo.
export function assignableTcns(store, category) {
  const manifested = new Set(Object.values(store.airManifests || {}).filter(m => m.status !== 'Aborted').flatMap(m => m.draft.shipmentIds || []));
  return Object.values(store.shipments).filter(r => !r.sample && eligibleForAirManifest(r) && !r.draft.palletId && !manifested.has(r.id) && (category !== 'Special' || specialCargo(r.draft)));
}
