import reference from './dtrReference.json';

// Code lists from the DTEB Transportation Reference Data tables; rebuild with scripts/build_dtr_reference.py.
const table = key => reference.tables[key].rows;
export const DTR_RETRIEVED = reference.retrieved;
export const RIN_CODES = table('routeInstructionNotes');
export const EQUIPMENT_TYPES = table('equipmentTypes');
export const FREIGHT_SERVICE_AGENCIES = table('freightServiceAgencies');
// The long DTR explanations start with a short title before the colon.
export const LOW_COST_NOT_USED_REASONS = table('lowCostNotUsedReasons').map(([code, text]) => [code, text.split(':')[0]]);
export const SPECIAL_SERVICES = table('ladingBillSpecialServices');
export const MEASURE_UNITS = table('measureUnits');
export const GBLOCS = table('gblocs').map(([code, name]) => [code, name]);
export const AIR_MANIFEST_REFERENCES = table('airManifestReferences');
export const ROUTE_ORDER_SERVICES = table('routeOrderServices');
export const TYPE_PACK_CODES = table('typePacks');

const gblocByDodaac = Object.fromEntries(table('gblocs').filter(row => row[2]).map(([code, , dodaac]) => [dodaac, code]));
export const gblocForDodaac = dodaac => gblocByDodaac[String(dodaac || '').trim().toUpperCase()] || '';
const rinText = Object.fromEntries(RIN_CODES);
export const rinTextFor = code => rinText[String(code || '').trim()] || '';

// Completes descriptions clipped in the CMOS screenshots ("...") when DTR text begins the same way.
export function completeClipped(rows, key, valueIndex = rows[0]?.length - 1) {
  const full = Object.fromEntries(table(key).map(([code, text]) => [code, text]));
  return rows.map(row => {
    const text = row[valueIndex];
    const visible = String(text).replace(/\.{3}$/, '').trim().toUpperCase();
    const source = full[row[0]];
    if (!String(text).endsWith('...') || !source || !source.toUpperCase().replace(/\s+/g, ' ').startsWith(visible.replace(/\s+/g, ' '))) return row;
    return row.map((cell, i) => (i === valueIndex ? source.toUpperCase() : cell));
  });
}
