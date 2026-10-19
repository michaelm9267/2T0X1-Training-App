import { piecesFor, totals } from './model';
import { formatScheduleDate, parseScheduleDate } from './airScheduleLogic';

// Rows for the Air Manifest cargo grids, in CMOS column order.
export const PALLET_COLUMNS = [['palletId', 'ID'], ['poe', 'POE'], ['date', 'Date'], ['pod', 'POD'], ['weight', 'Gross Weight'], ['completeDate', 'Complete Date'], ['priority', 'Priority'], ['special', 'Special'], ['hazard', 'Hazard'], ['cargoLocation', 'Cargo Location'], ['configCode', 'Config Code'], ['epp', 'EPP'], ['height', 'Height'], ['dsoeId', 'DSOE ID'], ['chalk', 'Chalk'], ['typeCargo', 'Type Cargo'], ['frCode', 'FR Code']];
// Assign Pallets adds the pallet's load plan between Chalk and Type Cargo.
export const ASSIGN_PALLET_COLUMNS = [...PALLET_COLUMNS.slice(0, 15), ['loadPlanId', 'Load Plan ID'], ...PALLET_COLUMNS.slice(15)];
export const LOOSE_COLUMNS = [['tcn', 'TCN'], ['pod', 'POD'], ['commSh', 'Comm S/H'], ['hazCode', 'Haz Code'], ['rdd', 'RDD'], ['priority', 'Priority'], ['cargoLocation', 'Cargo Location'], ['pieces', 'Pieces'], ['weight', 'Weight'], ['registryLock', 'Registry Lock Number'], ['dsoeId', 'DSOE ID'], ['chalk', 'Chalk'], ['mailInd', 'Mail Ind'], ['frCode', 'FR Code'], ['tac', 'TAC']];

// Complete Date is the pallet's build date as YDDD (last digit of the year, then the day of the year).
export function julianDate(text) {
  const date = parseScheduleDate(text);
  if (!date) return '';
  const day = Math.round((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(date.getFullYear(), 0, 1)) / 864e5) + 1;
  return `${date.getFullYear() % 10}${String(day).padStart(3, '0')}`;
}
export const today = () => formatScheduleDate(new Date());

const hazardClass = (store, id) => Object.values(store.hazards || {}).map(h => h.draft).find(d => d?.shipmentId === id)?.page2?.division || '';
const hazardous = draft => Boolean(draft.hazmat) && !String(draft.hazmat).startsWith('N');
const tallest = (store, ids) => Math.max(0, ...piecesFor(store, ids).map(p => Number(p.draft?.height) || 0));

export function looseRow(store, record) {
  const d = record.draft;
  return { ...d, ...totals(store, [record.id]), commSh: d.commoditySH || '', hazCode: hazardClass(store, record.id), priority: d.tp, ids: [record.id] };
}

// One row per pallet ID, from the shipments built onto it.
export function palletRows(store, records) {
  const pallets = new Map();
  for (const record of records.filter(r => r.draft.palletId)) {
    const list = pallets.get(record.draft.palletId) || [];
    pallets.set(record.draft.palletId, [...list, record]);
  }
  return [...pallets.entries()].map(([palletId, members]) => {
    const ids = members.map(r => r.id);
    const first = members[0].draft;
    const date = first.palletDate || '';
    return { palletId, ids, poe: first.poe || '', date, pod: first.pod || '', weight: totals(store, ids).weight, completeDate: julianDate(date), priority: first.tp || '', special: '',
      hazard: members.some(r => hazardous(r.draft)) ? 'Y' : 'N', cargoLocation: '', configCode: 'PC', epp: '10.0', height: tallest(store, ids) || '', dsoeId: first.dsoeId || '', chalk: first.chalk || '',
      loadPlanId: '', typeCargo: String(first.typeCargo || 'G').charAt(0), frCode: '' };
  });
}

// Empty pallets on hand at the APOE (fictional IDs). They list with Assign Pallets until built.
export const EMPTY_PALLETS = [['GC', '20Feb2025'], ['GF', '17Apr2025'], ['HC', '17Apr2025'], ['HJ', '18Apr2025'], ['HU', '01May2025'], ['LF', '28Jul2025'], ['LG', '28Jul2025'], ['LH', '28Jul2025'], ['LJ', '28Jul2025'], ['LL', '28Jul2025'], ['LU', '29Jul2025'], ['NG', '25Apr2021'], ['PU', '24Sep2026'], ['PV', '24Sep2026'], ['RV', '30Oct2021'], ['SC', '27Jan2022']]
  .map(([palletId, date]) => ({ palletId, ids: [], empty: true, poe: 'EDF', date, pod: '', weight: '', completeDate: '', priority: '', special: '', hazard: 'N', cargoLocation: '', configCode: 'PC', epp: '1.0', height: '', dsoeId: '', chalk: '', loadPlanId: '', typeCargo: '', frCode: '' }));
