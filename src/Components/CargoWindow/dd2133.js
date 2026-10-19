import { paperwork, hazdecRequired } from './workflow';
import { jiEvidence } from './exercise';
import { notebookFields, viewedReading } from './notebook';
import { recordMistake } from './mistakes';

// DD Form 2133, Joint Airlift Inspection Record/Checklist (JUN 2013), blocks 11–15, filled out at
// JI with the marks in DTR Part III App O K.2.c (III-O-6): a check for satisfactory, an X for
// unsatisfactory, a circled X once corrected, and a dash for not applicable. Blocks 11 and 12 are
// marked in full; of blocks 13–15 only the one that fits the item is used and the rest stay blank.
export const MARKS = [['', 'Blank'], ['sat', '√ Satisfactory'], ['unsat', '✗ Unsatisfactory'], ['corrected', 'ⓧ Corrected'], ['na', '– Not applicable']];
export const MARK_SYMBOL = { sat: '√', unsat: '✗', corrected: 'ⓧ', na: '–', '': '' };
const MARK_TEXT = { sat: 'satisfactory (√)', unsat: 'unsatisfactory (✗)', corrected: 'corrected (circled ✗)', na: 'not applicable (–)', '': 'left blank' };

export const BLOCKS = [
  { id: 11, title: 'Documentation' },
  { id: 12, title: 'General requirements', note: 'Applicable to blocks 13, 14, 15' },
  { id: 13, title: 'Vehicles/non-powered equipment' },
  { id: 14, title: "Pallets/pallet trains/ISU's" },
  { id: 15, title: 'Helicopters', note: 'Flyaway' },
];
const blockFor = s => s.axles ? 13 : 14;

const has = (s, id) => s.findings.some(f => f.id === id);
const docRequired = (s, id) => paperwork(s).some(d => d.id === id && d.required);
// A row's state from the inspection findings behind it: any discrepancy outranks satisfactory, and
// a discrepancy counts as corrected once the correction and reinspection were recorded.
function fromFindings(s, e, ids) {
  const present = s.findings.filter(f => ids.includes(f.id));
  if (!present.length || present.every(f => f.correct === 'not-applicable')) return 'na';
  const bad = present.filter(f => f.correct === 'unsatisfactory');
  if (!bad.length) return 'sat';
  return bad.every(f => e.answers?.[f.id]?.corrected) ? 'corrected' : 'unsat';
}
// Paperwork errors stay corrected once the shipper fixed them through frustration.
const fromDocument = (s, e, error, fix) => error ? (e.docFixes?.[fix] ? 'corrected' : 'unsat') : 'sat';
const worst = states => ['unsat', 'corrected', 'sat'].find(state => states.includes(state)) || 'na';

// What this JI still has to look at before a row can be marked, one step per document or item.
const toOpen = (s, e, ids) => paperwork(s).filter(d => ids.includes(d.id) && d.required && !e.jiDocumentsViewed.includes(d.id)).map(d => `open the ${d.title} in the paperwork packet`);
const toInspect = (s, e, ids) => s.findings.filter(f => ids.includes(f.id) && !e.jiInspected.includes(f.id)).map(f => `inspect ${f.title}${f.interior ? ' inside the ISU (open the doors)' : ''} in the cargo bay`);
const toRetake = (s, e) => jiEvidence(s, e, 'measurements') ? [] : [`retake ${notebookFields(s).filter(f => viewedReading(s, { ...e, measurements: e.jiMeasurements, weights: e.jiWeights }, f) === undefined).map(f => f.label).join(', ')} with the Tape measure and Scale`];
const toMarkings = (s, e) => s.axles && !jiEvidence(s, e, 'markings') ? [`inspect the ${['left', 'right'].filter(side => !e.jiSides.includes(side)).join(' and ')} tape markings`] : [];
const findingRow = (id, label, ids, paragraph, page, extra = {}) => ({ id, label, paragraph, page,
  state: (s, e) => fromFindings(s, e, ids), missing: (s, e) => toInspect(s, e, ids), ...extra });
const notApplicable = (id, label, paragraph, page, why) => ({ id, label, paragraph, page, state: () => 'na', why });

export const ROWS = [
  { block: 11, id: '11a', label: 'Pre-Load Plan', paragraph: 'K.2.d(1)', page: 'III-O-7', state: () => 'sat', why: 'The accepted deployment load plan accounts for the entire load.' },
  { block: 11, id: '11b', label: 'Manifest/ Load List/Packing List', paragraph: 'K.2.d(2)', page: 'III-O-7',
    state: (s, e) => worst([fromDocument(s, e, s.docErrors?.logmodWeight, 'logmod'), fromFindings(s, e, ['packets'])]),
    missing: (s, e) => [...toOpen(s, e, ['logmod', 'packing']), ...toInspect(s, e, ['packets'])] },
  { block: 11, id: '11c', label: 'Shippers Declaration for Dangerous Goods (SDDG)', paragraph: 'K.2.d(3)', page: 'III-O-7',
    state: (s, e) => hazdecRequired(s) ? fromDocument(s, e, s.docErrors?.hazdec, 'hazdec') : 'na',
    missing: (s, e) => toOpen(s, e, ['hazdec']) },
  { block: 11, id: '11d', label: 'DD Form 1387-2', paragraph: 'K.2.d(4)', page: 'III-O-7', state: (s, e) => fromFindings(s, e, ['special-service']), why: 'No special handling services (signature, protective, or other) are required.' },
  findingRow('11e', 'Military Shipping Label/DD Form 1387', ['label'], 'K.2.d(5)', 'III-O-7', { block: 11 }),
  { block: 11, id: '11f', label: 'ATTLA Certification', paragraph: 'K.2.d(6)', page: 'III-O-7',
    state: (s, e) => docRequired(s, 'attla') ? fromDocument(s, e, s.docErrors?.attla, 'attla') : 'na',
    missing: (s, e) => toOpen(s, e, ['attla']), why: 'The item is listed in the aircraft Dash 9 TO; no ATTLA letter is required.' },

  findingRow('12a', 'Clean', ['clean'], 'K.2.e(1)', 'III-O-7', { block: 12 }),
  { ...findingRow('12b', 'Fluid Leaks', ['leaks'], 'K.2.e(2)', 'III-O-7'), block: 12, why: 'The item has no engine or fluid systems.' },
  { block: 12, id: '12c', label: 'Scale Weight (GW, Axle Weight, Marked on Both Sides)', paragraph: 'K.2.e(3)', page: 'III-O-7', state: () => 'sat',
    missing: (s, e) => [...toRetake(s, e), ...toMarkings(s, e)] },
  { block: 12, id: '12d', label: 'Dimensions (Fits Aircraft Contour)', paragraph: 'K.2.e(4)', page: 'III-O-7', state: () => 'sat',
    missing: toRetake },
  { block: 12, id: '12e', label: 'Center of Balance (Marked on Both Sides)', paragraph: 'K.2.e(5)', page: 'III-O-8', state: s => s.axles ? 'sat' : 'na',
    missing: toMarkings, why: 'CB is marked on vehicles and equipment, not on pallets or ISUs.' },
  { ...findingRow('12f', 'Keys/Combinations (All Locks)', ['access'], 'K.2.e(6)', 'III-O-8'), block: 12, why: 'The item is not secured with a lock.' },
  { ...notApplicable('12g', 'Shoring (Floor/Roller Limitations)', 'K.2.e(7)', 'III-O-8', 'Neither the Dash 9 TO nor the ATTLA letter calls for shoring on this item.'), block: 12 },
  { block: 12, id: '12h', label: 'Hazardous Materials Preparation/Packaging', paragraph: 'K.2.e(8)', page: 'III-O-8',
    state: (s, e) => has(s, 'undeclared-hazmat') ? fromFindings(s, e, ['undeclared-hazmat']) : hazdecRequired(s) ? 'sat' : 'na',
    missing: (s, e) => [...toOpen(s, e, ['hazdec']), ...toInspect(s, e, ['undeclared-hazmat'])], why: 'The item carries no hazardous materials.' },

  findingRow('13a', 'Mechanical Condition (Engine Runs)', ['mechanical'], 'K.2.f(1)', 'III-O-8', { block: 13 }),
  findingRow('13b', 'Brakes Operational (Service/Emergency)', ['brakes'], 'K.2.f(2)', 'III-O-8', { block: 13 }),
  findingRow('13c', 'Battery (Secured, Terminals Protected, No Leaks)', ['battery'], 'K.2.f(3)', 'III-O-8', { block: 13 }),
  findingRow('13d', 'Fuel Tank(s), Level, Caps', ['fuel'], 'K.2.f(4)', 'III-O-8', { block: 13 }),
  { ...notApplicable('13e', 'Jerricans (Secure, Fuel Level, Seal)', 'K.2.f(5)', 'III-O-9', 'No jerricans are carried.'), block: 13 },
  { ...notApplicable('13e1', '(1) DOT 5L (Metal) MUST BE EMPTY', 'K.2.f(5)(a)', 'III-O-9', 'No jerricans are carried.'), block: 13, sub: true },
  { ...notApplicable('13e2', '(2) UN Specification (Plastic)', 'K.2.f(5)(b)', 'III-O-9', 'No jerricans are carried.'), block: 13, sub: true },
  findingRow('13f', 'Tiedown Points/Clevises (Serviceable)', ['tiedowns'], 'K.2.f(6)', 'III-O-9', { block: 13 }),
  { ...notApplicable('13g', 'Pintle Hooks (If Used)', 'K.2.f(7)', 'III-O-9', 'The pintle hook is not used for loading or a trailer.'), block: 13 },
  findingRow('13h', 'Vehicle Equipment Secured', ['equipment'], 'K.2.f(8)', 'III-O-9', { block: 13 }),
  findingRow('13i', 'Tire Pressure', ['tires'], 'K.2.f(9)', 'III-O-9', { block: 13 }),
  { ...notApplicable('13j', 'Accompanying Load (w/in Rated Capacity and Secured)', 'K.2.f(10)', 'III-O-9', 'The vehicle carries no secondary cargo.'), block: 13 },
  { ...notApplicable('13k', 'Lox/Nitrogen Cart (Vent Kit)', 'K.2.f(11)', 'III-O-9', 'The item is not a LOX or nitrogen cart.'), block: 13 },

  findingRow('14a', 'Serviceable (Pallet and Tiedown Rings)', ['pallet-condition', 'nets', 'isu-condition'], 'K.2.g(1)', 'III-O-10', { block: 14 }),
  findingRow('14b', 'Correctly Built/Items Secured', ['arrangement', 'secured-crates', 'loose-case'], 'K.2.g(2)', 'III-O-10', { block: 14 }),
  findingRow('14c', 'Dunnage (3 Pieces Per Pallet or ISU)', ['dunnage'], 'K.2.g(3)', 'III-O-10', { block: 14 }),

  ...[['15a', 'Fuel Quantity (As Required)'], ['15b', 'Configuration (T.O./Cert Letter)'], ['15c', 'Battery (Disconnected, Covered/Taped)'], ['15d', 'Special Loading Equipment (Tow bars, etc.)'], ['15e', 'Accompanying Load (w/in Rated Capacity and Secured)']]
    .map(([id, label], i) => ({ block: 15, id, label, paragraph: `K.2.h(${i + 1})`, page: 'III-O-11', state: () => 'na' })),
];

// The mark the row should carry for this piece. Blocks 13–15 that do not fit the item stay blank.
export function expectedMark(s, e, row) {
  if (row.block >= 13 && row.block !== blockFor(s)) return '';
  return row.state(s, e);
}
const stillNeeded = (s, e, row) => row.missing ? row.missing(s, e) : [];
export const rowReady = (s, e, row) => ['', 'na'].includes(expectedMark(s, e, row)) || stillNeeded(s, e, row).length === 0;
export const rowNeeds = (s, row, e) => { const steps = stillNeeded(s, e, row).join('; '); return steps && `${steps[0].toUpperCase()}${steps.slice(1)}.`; };
export function rowExplanation(s, e, row) {
  const expected = expectedMark(s, e, row);
  if (expected === '') return `Block ${row.block} does not apply to ${s.axles ? 'vehicles' : 'pallets and ISUs'}; leave it blank (App O K.2.c note).`;
  if (expected === 'na') return row.why || 'This item does not apply to this piece.';
  if (expected === 'corrected') return 'A discrepancy was found and corrected; circle the ✗.';
  return 'The item meets standards.';
}

// Record a mark in this piece's column. Marking an applicable row needs this JI's inspection first.
export function markJI(s, e, rowId, mark) {
  const row = ROWS.find(item => item.id === rowId);
  if (!row) return e;
  const marks = { ...(e.jiMarks || {}), [rowId]: mark };
  const feedback = { ...(e.jiMarkFeedback || {}) };
  if (['sat', 'unsat', 'corrected'].includes(mark) && !rowReady(s, e, row)) {
    return { ...e, jiMarkFeedback: { ...feedback, [rowId]: `Inspect first: ${rowNeeds(s, row, e)}` } };
  }
  const expected = expectedMark(s, e, row);
  const next = { ...e, jiMarks: marks, jiMarkFeedback: { ...feedback, [rowId]: '' } };
  return mark === expected || (e.jiMarks || {})[rowId] === mark ? next
    : recordMistake(next, 'ji', `DD 2133 ${row.id} ${row.label}: marked ${MARK_TEXT[mark]}; it should be ${MARK_TEXT[expected]}`, `DTR Part III App O ${row.paragraph}`);
}
// The correct marks for this piece's column (used to prepare practice sessions).
export const correctMarks = (s, e) => Object.fromEntries(ROWS.map(row => [row.id, expectedMark(s, e, row)]));
export const rowComplete = (s, e, row) => (e.jiMarks?.[row.id] || '') === expectedMark(s, e, row) && rowReady(s, e, row);

// What the inspector checks on each row, summarized from DTR Part III App O K.2.d–h (3 Feb 2023),
// for the JI inspection list reference.
export const CHECKS = {
  '11a': 'Deploying force provides a pre-load plan; use it to make sure the entire load is accounted for.',
  '11b': 'Deploying force provides the manifest, load list, and packing list; use them to verify or locate any undeclared hazardous shipments.',
  '11c': 'An SDDG is submitted for all hazardous cargo; inspect it for proper preparation and certification IAW AFMAN 24-604.',
  '11d': 'Submitted for items needing signature service, transportation protective service, or other special services (DTR Part II, Ch 205).',
  '11e': 'Every item presented for movement has a military shipping label (2D bar code) attached (DTR Part III, App H).',
  '11f': 'Required for vehicles and equipment not listed in the applicable aircraft Dash 9 TO.',
  '12a': 'Free of grime, oil, soil, pest infestation, and prohibited agricultural items; pressure wash (90 psi minimum) or steam clean if needed. No debris embedded in tire treads.',
  '12b': 'A readily detected loss of fluid is a leak; 5+ drops/minute from a cooling system, crankcase, or gear case is a leak. Any fuel or brake leak stops air shipment until corrected. A damp or discolored seal alone is not a leak.',
  '12c': 'Gross and axle weights are accurate and marked on both sides of vehicles/non-powered equipment and helicopters. Pallets are placarded with scale weight on two adjacent sides.',
  '12d': 'Item fits the aircraft profile/contour, negotiates the ramps and interior, and never contacts the floor, sidewalls, or ceiling. Check Dash 9 pallet position restrictions.',
  '12e': 'If applicable, CB is clearly marked on both sides, to the nearest whole inch (App P).',
  '12f': 'Keys or combinations for every lock are available to the inspector and attached to the item or placed in the aircraft manifest package. Locks without keys/combos are removed, or the item is removed from the chalk.',
  '12g': 'Shoring is serviceable and immediately available; floor and roller limits are not exceeded (Dash 9 TO or ATTLA certification).',
  '12h': 'All HAZMAT is properly prepared, positioned, compatible with other HAZMAT on the aircraft, and secured IAW AFMAN 24-604.',
  '13a': 'Unless shipped as retrograde, the vehicle is in good condition; self-propelled vehicles are operational (engine runs).',
  '13b': 'Service and emergency brakes work; the operator demonstrates braking while the vehicle is moving.',
  '13c': 'Battery terminals are protected against damage or short circuit (rubber covers, taped) and the battery is secured.',
  '13d': 'No more than 1/2 tank (3/4 with Chapter 3); wheeled engine-powered SE drained to the greatest extent (1/2 with Chapter 3). Caps installed; never more than 1/2 tank on the ramp.',
  '13e': 'Jerricans are in approved racks, secured, and sealed.',
  '13e1': 'DOT 5L metal jerricans are in approved racks, secured, and completely drained.',
  '13e2': 'UN-specification jerricans may carry fuel; racks secure them against movement or leakage, and each cap has a serviceable gasket.',
  '13f': 'All clevises and interior and exterior tie-down points are serviceable.',
  '13g': 'If used for loading/unloading or a trailer in flight, the pintle hook is serviceable, with pins or cotter keys installed and chained to the hook.',
  '13h': 'Tools, tires, fire extinguishers, seats/brackets, and any loose equipment that could become a projectile are secured.',
  '13i': 'Within the sidewall specification and inflated enough to keep the rim off the aircraft floor; above 100 PSI counts as a steel or hard rubber wheel (check shoring).',
  '13j': 'Secondary cargo is within rated capacity, below sidewall height unless restrained, and secured to the same restraint criteria as the vehicle (1/2-inch rope, not nylon, or approved restraint).',
  '13k': 'All vent kit materials are with the cargo; technicians install the vent kit at load time.',
  '14a': 'Pallets cleaned and inspected top and bottom for missing/cracked rings, warping, exposed core, or delamination; tie-down equipment and nets free of damage.',
  '14b': 'Nets properly installed, or chains/straps installed in pairs on opposite sides; cargo inside ISUs and containers secured; all HAZMAT accessible and restrained.',
  '14c': 'Three pieces of proper 4" x 4" x 88" dunnage accompany each pallet or ISU; wood meets ISPM 15.',
  '15a': 'Fuel does not exceed 3/4 full or 150 gallons per tank, whichever is less.',
  '15b': 'Configured per the applicable TO or ATTLA certification to fit the aircraft contour without touching the sidewalls, ceiling, or floor.',
  '15c': 'Battery is disconnected, its terminals taped, and the battery secured against damage or short circuit.',
  '15d': 'Special equipment needed to load the cargo (tow bars, tools, jacks, pintle hooks, pumps, ramps) is available.',
  '15e': 'All secondary cargo is secured within the helicopter to the same restraint criteria as the helicopter (1/2-inch rope, not nylon, or approved restraint).',
};
// Which items each row applies to, for the reference list.
export const APPLIES = { 11: 'Every item', 12: 'Every item', 13: 'Vehicles and non-powered equipment', 14: 'Pallets, pallet trains, and ISUs', 15: 'Helicopters (flyaway)' };
