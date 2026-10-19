import { addressPatch } from './cblLogic';
import { totals } from './model';

// CMOS Truck Manifest: list columns, sample traffic, manifest numbers, and the lists its tabs use.
export const TRUCK_COLUMNS = [['manifestNumber', 'Manifest'], ['consignee', 'Consignee'], ['convoyNbr', 'Convoy Nbr'], ['dsoeId', 'DSOE ID'], ['chalk', 'Chalk'], ['milMode', 'MIL Mode'],
  ['ediMode', 'EDI Mode'], ['destState', 'Dest State'], ['destCountry', 'Dest Country'], ['pieces', 'Pieces'], ['weight', 'Weight'], ['releaseDate', 'Release Date'], ['status', 'Status']];
export const PHONE_TYPES = ['DSN', 'COMMERCIAL', 'INTERNATIONAL'];
export const EMERGENCY_PHONE_TYPES = ['EMERGENCY COMMERCIAL', 'EMERGENCY DSN', 'EMERGENCY INTERNATIONAL'];
// Hazardous certification statements a truck manifest can carry: the 49 CFR 172.204(a)(1) and
// (a)(2) shipper's certifications.
export const HAZ_STATEMENTS = [
  ['01', 'This is to certify that the above-named materials are properly classified, described, packaged, marked and labeled, and are in proper condition for transportation according to the applicable regulations of the Department of Transportation.'],
  ['02', 'I hereby declare that the contents of this consignment are fully and accurately described above by the proper shipping name, and are classified, packaged, marked and labelled/placarded, and are in all respects in proper condition for transport according to applicable international and national governmental regulations.'],
];

// Address block from a DODAAC, with the name as CMOS shows it ("FA5030  773 LRS LGRT").
export function truckAddress(prefix, dodaac) {
  const patch = addressPatch(prefix, dodaac);
  const code = String(dodaac || '').trim().toUpperCase();
  return patch[`${prefix}Name`] ? { ...patch, [`${prefix}Name`]: `${code}  ${patch[`${prefix}Name`]}`, [`${prefix}PhoneType`]: 'DSN' } : patch;
}

// Invented training traffic in the CMOS manifest number format (EDF + year digit + T + serial).
export const TRUCK_SAMPLES = [
  ['EDF6T60103', 'FB6520', '9', 2, 1840], ['EDF6T60108', 'FB5000', '9', 4, 6120], ['EDF6T60114', 'FB6520', '9', 1, 960],
  ['EDF6T60121', 'FB5004', '9', 7, 12480], ['EDF6T60127', 'FB5000', '9', 3, 2210], ['EDF6T60132', 'FB6521', '9', 0, 0],
].map(([manifestNumber, destinationDODAAC, conveyanceMode, pieces, weight], index) => ({
  id: `truck-sample-${index}`, sample: true, status: 'Saved',
  draft: { manifestNumber, destinationDODAAC, ...truckAddress('destination', destinationDODAAC), originDODAAC: 'FA5030', origin: 'FA5030', ...truckAddress('origin', 'FA5030'), shipperDODAAC: 'FA5030', ...truckAddress('shipper', 'FA5030'), conveyanceMode, equipmentOwner: 'G', vehicleFullyLoaded: 'No', samplePieces: pieces, sampleWeight: weight, sampleCube: Math.round(weight / 14) },
}));

export function nextTruckManifestNumber(store) {
  const prefix = 'EDF6T6';
  const numbers = [...TRUCK_SAMPLES.map(r => r.draft.manifestNumber), ...Object.values(store.truckManifests || {}).flatMap(r => [r.draft.manifestNumber, r.saved?.manifestNumber])];
  const serials = numbers.filter(n => typeof n === 'string' && n.startsWith(prefix) && /^\d{4}$/.test(n.slice(prefix.length))).map(n => Number(n.slice(prefix.length)));
  const serial = Math.max(1, ...serials.map(n => n + 1));
  return serial <= 9999 ? `${prefix}${String(serial).padStart(4, '0')}` : null;
}

// One manifest as the Truck Manifest list shows it.
export function truckRow(store, r) {
  const d = r.draft;
  const ids = d.shipmentIds || [];
  const first = store.shipments[ids[0]]?.draft || {};
  const t = ids.length ? totals(store, ids) : { pieces: d.samplePieces || 0, weight: d.sampleWeight || 0 };
  return { manifestNumber: d.manifestNumber || r.id, consignee: d.destinationDODAAC || first.destination || '', convoyNbr: d.convoyNbr || '', dsoeId: d.dsoeId || '', chalk: d.chalk || '',
    milMode: d.conveyanceMode || '', ediMode: first.ediMode || '', destState: d.destinationState || '', destCountry: d.destinationCountry && d.destinationCountry !== 'US' ? d.destinationCountry : '',
    pieces: t.pieces, weight: t.weight, releaseDate: r.status === 'Released' ? String(r.releaseDetails?.departureAt || '').replace('T', ' ') : '', // Status 00 (Original) until released; the released code is not in the trainer's references.
    status: r.status === 'Released' ? '' : '00',
    release: r.status === 'Released' ? 'Released' : 'Open' };
}
