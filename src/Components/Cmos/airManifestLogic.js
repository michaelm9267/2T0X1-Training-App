export const eligibleForAirManifest = record => String(record?.draft?.milMode || '').trim().toUpperCase() === 'F';
export const AIR_MANIFEST_COLUMNS = [['manifestNumber', 'Manifest'], ['mission', 'Mission'], ['pod', 'POD'], ['destination', 'Destination'], ['mode', 'Mode'], ['weight', 'Weight'], ['cube', 'Cube'], ['refId', 'Ref ID'], ['releaseDate', 'Release Date'], ['remarks', 'Remarks']];
// Invented training traffic uses the reference format, never the pictured mission/shipment values.
export const AIR_MANIFEST_SAMPLES = [
  ['EDF6C60018', 'TRN4726AX101', 'FAI', 'FAIRBANKS', 6380, 462, 'QH'],
  ['EDF6C60022', 'TRN4826BX102', 'ANC', 'ANCHORAGE', 8240, 655, 'QJ'],
  ['EDF6C60023', 'TRN4926CX103', 'ADQ', 'KODIAK', 11360, 948, 'QK'],
  ['EDF6C60027', 'TRN5026DX104', 'BGR', 'BANGOR', 15640, 1286, 'QL'],
  ['EDF6C60029', 'TRN5126EX105', 'CHS', 'CHARLESTON AFB', 19480, 1742, 'QM'],
  ['EDF6C60030', 'TRN5226FX106', 'DOV', 'DOVER AFB', 26420, 2158, 'QN'],
  ['EDF6C60031', 'TRN5326GX107', 'SUU', 'TRAVIS AFB', 3120, 268, 'QP'],
].map(([manifestNumber, mission, pod, destination, weight, cube, refId], index) => {
  const dsoeId = `TR${624 + index}`;
  const chalk = String(14 + index).padStart(3, '0');
  return { id: `air-sample-${index}`, sample: true, status: 'Saved', draft: {
    manifestNumber, mission, pod, destination, weight, cube, refId, mode: 'F', manifestType: 'Cargo', complete: 'Yes', dsoeId, chalk, remarks: '',
    sampleCargo: [{ id: ['AQ', 'AR', 'AS', 'AT', 'AU', 'AV', 'AW'][index], poe: 'EDF', date: '14OCT2026', pod, weight, completeDate: '6287', priority: String(index % 3 + 1), special: '', hazard: 'N', cargoLocation: '', configCode: 'PC', epp: (8.5 + index * 0.4).toFixed(1), height: String(54 + index * 2), dsoeId, chalk, typeCargo: 'Z', frCode: '' }],
  } };
});
export const airManifestCounterKey = type => type === 'Mail' ? 'airManifestMail' : 'airManifestCargo';
export function nextAirManifestNumber(store, type = 'Cargo') {
  const prefix = `EDF6${type === 'Mail' ? 'M' : 'C'}6`;
  const numbers = [...AIR_MANIFEST_SAMPLES.map(r => r.draft.manifestNumber), ...Object.values(store.airManifests).flatMap(r => [r.draft.manifestNumber, r.saved?.manifestNumber])];
  const serials = numbers.filter(number => typeof number === 'string' && number.startsWith(prefix) && /^\d{4}$/.test(number.slice(prefix.length))).map(number => Number(number.slice(prefix.length)));
  const serial = Math.max(1, Number(store.counters?.[airManifestCounterKey(type)]) || 1, ...serials.map(number => number + 1));
  return serial <= 9999 ? `${prefix}${String(serial).padStart(4, '0')}` : null;
}
const oldSampleRows = [
  ['EDF6C60020', 'LMFF700CPX13', 'ADQ', 'KODIAK', 4520, 341, 'EV'],
  ['EDF6C60021', 'LMFF700CPX11', 'ADQ', 'KODIAK', 5660, 528, 'EW'],
  ['EDF6C60024', 'CJZ055R2P138', 'EIL', 'EIELSON AFB', 10300, 1155, 'EZ'],
  ['EDF6C60025', 'LMZF127QP141', 'AGRA', 'AGRA', 17720, 3448, 'FA'],
  ['EDF6C60026', 'EDF500012671', 'EIL', 'EIELSON AFB', 17624, 796, 'FB'],
  ['EDF6C60028', 'JJZF2674C217', 'SQX', 'MUWAFFAQ SALTI AB', 33648, 1534, 'FD'],
  ['EDF6C60031', '', '', '', 0, 0, 'FG'],
].map(([manifestNumber, mission, pod, destination, weight, cube, refId], index) => ({
  manifestNumber, mission, pod, destination, weight, cube, refId, mode: 'F', manifestType: 'Cargo', complete: 'Yes', dsoeId: 'TT261', chalk: '002',
  sampleCargo: index === 0 ? [{ id: 'PS', poe: 'EDF', date: '06MAY2026', pod: 'ADQ', weight: 4520, completeDate: '6127', priority: '1', hazard: 'Y', configCode: 'PC', epp: '10.0', height: '62', dsoeId: 'TT261', chalk: '002', typeCargo: 'G' }] : [],
}));
// Only exact old demo snapshots are refreshed; edits and assigned cargo remain untouched.
export function refreshAirManifestSample(record) {
  const index = AIR_MANIFEST_SAMPLES.findIndex(sample => sample.id === record.id);
  if (index < 0 || record.status === 'Released') return record;
  const unchanged = value => value && !(value.shipmentIds || []).length && !String(value.remarks || '').trim()
    && Object.entries(oldSampleRows[index]).every(([key, original]) => JSON.stringify(value[key]) === JSON.stringify(original));
  if (!unchanged(record.draft) || (record.saved && !unchanged(record.saved))) return record;
  return { ...record, draft: { ...record.draft, ...AIR_MANIFEST_SAMPLES[index].draft }, saved: record.saved ? { ...record.saved, ...AIR_MANIFEST_SAMPLES[index].draft } : null };
}

// Pallets move as complete groups. Other open/released manifests reserve their cargo.
export function airAssignmentIds(store, manifestId, requested, remove = false) {
  const shipments = Object.values(store.shipments);
  const elsewhere = new Set(Object.values(store.airManifests)
    .filter(r => r.id !== manifestId && r.status !== 'Aborted')
    .flatMap(r => [...(r.draft.shipmentIds || []), ...(r.saved?.shipmentIds || [])]));
  const result = new Set();
  for (const id of requested) {
    const record = store.shipments[id];
    if (!record) continue;
    const members = record.draft.palletId ? shipments.filter(r => r.draft.palletId === record.draft.palletId) : [record];
    if (remove || members.every(r => eligibleForAirManifest(r) && !elsewhere.has(r.id))) members.forEach(r => result.add(r.id));
  }
  return [...result];
}
export const availableForAirManifest = (store, manifestId, record) => Boolean(record && airAssignmentIds(store, manifestId, [record.id]).length);
