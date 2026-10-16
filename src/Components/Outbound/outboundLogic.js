import { recordMistake } from '../CargoWindow/mistakes';
import { ITEMS, CONTAINERS, MARKINGS, requiredMarkings, wrongMarkings, isOverseas, consignee, destinationOf, originOf, ALL_DODAACS, AERIAL_PORTS, TYPE_PACKS, typePackFor } from './outboundData';
import { presentedDocument, shipmentTp, DISCREPANCIES } from './outboundShipments';

export const OUTBOUND_STEPS = [
  { id: 'receive', title: 'Receive & inspect' },
  { id: 'pack', title: 'Pack' },
  { id: 'planning', title: 'Shipment planning' },
  { id: 'small-package', title: 'Small package' },
  { id: 'surface', title: 'Surface freight' },
  { id: 'amc', title: 'AMC' },
];
export const MODES = { 'small-package': 'Small package', surface: 'Surface freight', amc: 'AMC channel airlift' };
// CMOS Mil Mode codes and the step that processes each. Air (J) and surface (5) small parcels both
// go through Small Package Express.
export const MIL_MODES = { J: 'Air small parcel', 5: 'Surface small parcel', B: 'Less than truckload (LTL)', F: 'AMC channel airlift', 9: 'AMC' };
export const stepForMode = milMode => ({ J: 'small-package', 5: 'small-package', B: 'surface', F: 'amc', 9: 'amc' }[milMode] || null);

export function createOutboundExercise() {
  return { documentViewed: false, tagInspected: false, counted: false, answers: {}, returned: false, custodyAccepted: false,
    container: null, markings: [], packed: false, packFeedback: '', measured: {}, weighed: false, forms: {}, cmos: { record: null, message: '' }, spe: null, milMode: null, mode: null,
    // printed: labels and documents printed from CMOS; labels: what has been applied to the box on the bench.
    printed: {}, labels: {}, mistakes: [], firstActionAt: null };
}

// ---- Step 1: receive the asset and its shipping document ----

export const RECEIPT_CHECKS = [
  { id: 'nsn', title: 'NSN matches the item identification tag', needsItem: true, reference: 'DLM 4000.25-1 (MILSTRIP) · DD 1348-1A block 25' },
  { id: 'quantity', title: 'Quantity matches the items presented', needsItem: true, reference: 'DLM 4000.25-1 (MILSTRIP) · DD 1348-1A block 26' },
  { id: 'condition', title: 'Condition code matches the item condition tag', needsItem: true, reference: 'DLM 4000.25-2 (MILSTRAP) supply condition codes' },
  { id: 'funding', title: 'TAC / fund citation is present', reference: 'DAFI 24-602V2 para 5.7 and A3.1.4 · DTR Part II Appendix V' },
  { id: 'shipto', title: 'Ship-to address is present (DoDAAC or in the clear)', reference: 'DAFI 24-602V2 para 2.3.3 and A3.1.2 · DTR Part II Chapter 203, para B.2' },
  { id: 'signature', title: 'Authorized requester signature (DD 1149 block 10)', reference: 'DAFI 24-602V2 Attachment 3, para A3.1.19' },
];
export const CHOICE_LABEL = { satisfactory: 'Satisfactory', unsatisfactory: 'Unsatisfactory', 'not-applicable': 'Not applicable' };

// The right call for each check, judged against the document as the customer first presented it.
export function expectedReceipt(shipment, id) {
  if (id === 'signature' && shipment.document === '1348-1A') return 'not-applicable';
  return shipment.discrepancy === id ? 'unsatisfactory' : 'satisfactory';
}
export const checkReady = (e, check) => e.documentViewed && (!check.needsItem || (e.tagInspected && (check.id !== 'quantity' || e.counted)));

export function answerCheck(shipment, e, id, choice) {
  if (e.custodyAccepted) return e;
  const check = RECEIPT_CHECKS.find(item => item.id === id);
  if (!check || !checkReady(e, check)) return e;
  const expected = expectedReceipt(shipment, id);
  const next = { ...e, answers: { ...e.answers, [id]: choice } };
  return choice !== expected && e.answers[id] !== choice ? recordMistake(next, 'receipt', `Marked "${check.title}" ${CHOICE_LABEL[choice]}; it was ${CHOICE_LABEL[expected]}`, check.reference) : next;
}
export const checkComplete = (shipment, e, id) => e.answers[id] === expectedReceipt(shipment, id) && (expectedReceipt(shipment, id) !== 'unsatisfactory' || e.returned);

// Return the document to the customer. Correct only when the trainee called out the actual discrepancy.
export function returnToCustomer(shipment, e) {
  if (e.returned || e.custodyAccepted) return e;
  const flagged = RECEIPT_CHECKS.filter(check => e.answers[check.id] === 'unsatisfactory').map(check => check.id);
  if (!flagged.length) return { ...e, receiptFeedback: 'Mark the discrepancy Unsatisfactory before returning the document to the customer.' };
  if (!shipment.discrepancy || flagged.some(id => id !== shipment.discrepancy)) return recordMistake({ ...e, receiptFeedback: 'The customer reviewed the document and found nothing to correct for that entry. Recheck your findings.' }, 'receipt', 'Returned a shipping document for a discrepancy it did not have', 'DAFI 24-602V2 para 2.2.1.3 · DTR Part II Chapter 203, para B');
  return { ...e, returned: true, receiptFeedback: `Customer corrected the document: ${DISCREPANCIES[shipment.discrepancy].toLowerCase()} — fixed and re-presented.` };
}
export const receiptReady = (shipment, e) => RECEIPT_CHECKS.every(check => checkComplete(shipment, e, check.id));
export function acceptCustody(shipment, e) {
  if (e.custodyAccepted) return e;
  if (!RECEIPT_CHECKS.every(check => e.answers[check.id])) return { ...e, receiptFeedback: 'Record a decision for every receipt check before accepting custody.' };
  if (!receiptReady(shipment, e)) {
    const open = shipment.discrepancy && !e.returned;
    return recordMistake({ ...e, receiptFeedback: open ? 'Do not accept custody of a shipment with a document discrepancy. Return it to the customer first.' : 'Finish every receipt check before accepting custody.' }, 'receipt', open ? 'Tried to accept custody with an uncorrected document discrepancy' : 'Tried to accept custody before finishing the receipt checks', 'DAFI 24-602V2 paras 2.2.1.3 and 2.2.5');
  }
  // DAFI 24-602V2 para 2.2.2: the in-checker signs a DD 1149 in block 18, "Checked By". A retail
  // MILSTRIP 1348-1A needs no in-checker signature; CMOS sends the digital signature (DAFGM para 2.2.1.2).
  return { ...e, custodyAccepted: true, receiptFeedback: shipment.document === '1149'
    ? 'Custody accepted. You signed block 18 (Checked By) on the DD 1149.'
    : 'Custody accepted. No signature goes on the 1348-1A; CMOS sends the digital signature when you incheck it.' };
}

// ---- Step 2: pack and mark ----

export function packShipment(shipment, e) {
  if (e.packed) return e;
  const item = ITEMS[shipment.itemId];
  if (!e.container) return { ...e, packFeedback: 'Choose a container first.' };
  if (e.container !== shipment.container) {
    return recordMistake({ ...e, packFeedback: `${CONTAINERS[e.container].title} is not suitable for ${shipment.quantity} ${item.ui} of ${item.nomenclature.toLowerCase()}. Choose another container.` }, 'packing', `Packed in ${CONTAINERS[e.container].title} instead of ${CONTAINERS[shipment.container].title}`, 'DTR Part II Chapter 208 · MIL-STD-2073-1');
  }
  const required = requiredMarkings(shipment);
  const missing = required.filter(id => !e.markings.includes(id));
  const extra = e.markings.filter(id => wrongMarkings(shipment).includes(id));
  if (missing.length || extra.length) {
    const names = ids => ids.map(id => MARKINGS.find(m => m.id === id).title.split(' (')[0]).join(', ');
    const detail = [missing.length && `missing ${names(missing)}`, extra.length && `should not have ${names(extra)}`].filter(Boolean).join('; ');
    return recordMistake({ ...e, packFeedback: `Markings are not right: ${detail}.` }, 'packing', `Package markings: ${detail}`, 'MIL-STD-129 · DAFI 24-602V2 paras 8.10.2, 8.12 and Chapter 9');
  }
  return { ...e, packed: true, packFeedback: `Packed in ${CONTAINERS[shipment.container].title.toLowerCase()} and marked. Measure and weigh the piece, then write the packing data on the shipping document.` };
}

// ---- Forms: packing data on the document, and the surface and AMC placeholders ----

export const lengthGirth = ({ length, width, height }) => length + 2 * (width + height);
export const cube = ({ length, width, height }) => Math.round(length * width * height / 1728 * 10) / 10;

export function formFields(shipment, formId) {
  const tp = shipmentTp(shipment);
  const p = shipment.packed;
  const origin = originOf(shipment);
  const on1149 = shipment.document === '1149';
  if (formId === 'annotation') return [
    { id: 'typePack', title: on1149 ? 'Type container (f)' : 'Type pack (block 18)', expected: typePackFor(shipment.container), options: Object.keys(TYPE_PACKS), optionLabel: code => `${code} - ${TYPE_PACKS[code]}`, hint: 'The code for the outer container you packed in.' },
    { id: 'containers', title: on1149 ? 'Total containers (block 18)' : 'No. containers (block 19)', expected: 1, numeric: true },
    { id: 'weight', title: on1149 ? 'Total weight, lb (block 18)' : 'Total weight, lb (block 20)', expected: p.weight, numeric: true, hint: 'Your scale reading for the packed piece.' },
    { id: 'length', title: 'Length (in)', expected: p.length, numeric: true },
    { id: 'width', title: 'Width (in)', expected: p.width, numeric: true },
    { id: 'height', title: 'Height (in)', expected: p.height, numeric: true },
  ];
  if (formId === 'surface') return [
    { id: 'service', title: 'Service', expected: 'LTL', options: ['LTL', 'Truckload'], hint: 'Less-than-truckload for freight under 10,000 lb.' },
    { id: 'consignee', title: 'Consignee DoDAAC', expected: shipment.dodaac || 'F00000', options: [...ALL_DODAACS.filter(code => code !== origin.dodaac), 'F00000'] },
    { id: 'pieces', title: 'Handling units', expected: 1, numeric: true },
    { id: 'weight', title: 'Weight (lb)', expected: p.weight, numeric: true },
    { id: 'cube', title: 'Cube (ft³)', expected: cube(p), numeric: true, tolerance: .1, hint: 'L × W × H ÷ 1,728, to one decimal.' },
    { id: 'tac', title: 'TAC (billing)', expected: shipment.tac },
  ];
  if (formId === 'amc') return [
    { id: 'apoe', title: 'POE', expected: origin.port, options: AERIAL_PORTS, hint: `${origin.name} ships through aerial port ${origin.port}.` },
    { id: 'apod', title: 'POD', expected: podFor(shipment), options: AERIAL_PORTS, hint: "The consignee's aerial port of debarkation." },
    { id: 'tp', title: 'Transportation priority', expected: tp, options: ['TP1', 'TP2', 'TP3'] },
    { id: 'weight', title: 'Weight (lb)', expected: p.weight, numeric: true },
    { id: 'cube', title: 'Cube (ft³)', expected: cube(p), numeric: true, tolerance: .1, hint: 'L × W × H ÷ 1,728, to one decimal.' },
    { id: 'rdd', title: 'RDD', expected: shipment.rdd },
  ];
  return [];
}

const FORM_TITLES = { annotation: 'Shipping document packing data', surface: 'Commercial bill of lading', amc: 'ATCMD' };
const FORM_REFERENCES = { annotation: 'DD 1348-1A blocks 18–21 · DD 1149 columns (f)–(g) and block 18', surface: 'DTR Part II Chapter 202 (routing, ATR) · Chapter 206 (bills of lading)', amc: 'DTR Part II Appendix M (ATCMD) · Appendix P (AMC channels)' };
const matches = (field, value) => {
  const text = String(value ?? '').trim();
  if (field.numeric) return text !== '' && Math.abs(Number(text) - field.expected) <= (field.tolerance ?? 0) + 1e-9;
  return text.toUpperCase() === String(field.expected).toUpperCase();
};
export const formMismatches = (shipment, formId, draft = {}) => formFields(shipment, formId).filter(field => !matches(field, draft[field.id]));

export const editForm = (e, formId, field, value) => {
  const form = e.forms[formId] || {};
  return form.accepted ? e : { ...e, forms: { ...e.forms, [formId]: { ...form, draft: { ...form.draft, [field]: value } } } };
};

export function submitForm(shipment, e, formId) {
  const form = e.forms[formId] || {};
  if (form.accepted) return e;
  if (formId === 'annotation' && !(e.packed && ['length', 'width', 'height'].every(id => e.measured[id]) && e.weighed)) return { ...e, forms: { ...e.forms, annotation: { ...form, feedback: 'Pack the item, then measure its length, width and height and weigh it before writing on the document.' } } };
  const wrong = formMismatches(shipment, formId, form.draft);
  const save = changes => ({ ...e, forms: { ...e.forms, [formId]: { ...form, ...changes } } });
  if (!wrong.length) return save({ accepted: true, errors: [], feedback: formId === 'annotation' ? `Packing data written on the DD ${shipment.document}.` : `${FORM_TITLES[formId]} accepted.` });
  const names = wrong.map(field => field.title).join(', ');
  return recordMistake(save({ errors: wrong.map(field => field.id), feedback: `${wrong.length === 1 ? 'This entry does' : 'These entries do'} not match: ${names}.` }), 'documentation', `${FORM_TITLES[formId]} entries did not match: ${names}`, FORM_REFERENCES[formId]);
}

// ---- Mil Mode routing ----

// Training routing rules. Overseas consignees move by AMC (9). A lower-48 piece over small parcel
// limits moves LTL (B). Small parcel air (NGDS) takes packages up to 150 lb within CONUS and up to
// 300 lb between CONUS and Alaska (DTR Part II, Chapter 202, para M.1); 165 in length + girth is the
// carriers' size limit. Within the limits: from Alaska, TP1/TP2 fly air small parcel (J) and TP3
// takes the AMC channel (9); from the lower 48, TP1 flies (J) and TP2/TP3 go surface small parcel (5).
export const smallParcelLimits = shipment => ({ weight: originOf(shipment).alaska ? 300 : 150, lengthGirth: 165 });
export const fitsSmallParcel = shipment => shipment.packed.weight <= smallParcelLimits(shipment).weight && lengthGirth(shipment.packed) <= smallParcelLimits(shipment).lengthGirth;
export function expectedMilMode(shipment) {
  if (isOverseas(shipment.dodaac)) return '9';
  if (!fitsSmallParcel(shipment)) return 'B';
  const tp = shipmentTp(shipment);
  if (originOf(shipment).alaska) return tp === 'TP3' ? '9' : 'J';
  return tp === 'TP1' ? 'J' : '5';
}
export const routeFor = shipment => stepForMode(expectedMilMode(shipment));
// Aerial port of debarkation for an AMC move: the overseas unit's port, or the stateside channel port.
export const podFor = shipment => isOverseas(shipment.dodaac) ? consignee(shipment.dodaac).port : destinationOf(shipment)?.channelPort;
export function routeExplanation(shipment) {
  const p = shipment.packed;
  const tp = shipmentTp(shipment);
  const origin = originOf(shipment);
  if (isOverseas(shipment.dodaac)) return `${shipment.dodaac} is overseas (${consignee(shipment.dodaac).port}), so it moves Mil Mode 9, AMC, through ${origin.port}.`;
  const limits = smallParcelLimits(shipment);
  if (p.weight > limits.weight) return `${p.weight} lb is over the ${limits.weight} lb small parcel limit from ${origin.name}, so it moves Mil Mode B, LTL.`;
  if (lengthGirth(p) > limits.lengthGirth) return `Length + girth is ${lengthGirth(p)} in, over the carriers' 165 in limit, so it moves Mil Mode B, LTL.`;
  if (origin.alaska) return tp === 'TP3' ? `A routine (TP3) small parcel from Alaska to the lower 48 takes the AMC channel: Mil Mode 9.` : `A ${tp} small parcel from Alaska to the lower 48 flies air small parcel: Mil Mode J.`;
  return tp === 'TP1' ? 'A TP1 small parcel in the lower 48 flies air small parcel: Mil Mode J.' : `A ${tp} small parcel in the lower 48 goes surface small parcel: Mil Mode 5.`;
}

// ---- Progress ----

// Every mode needs the MSL on the box; a small package also needs the carrier's shipping label.
export function stageComplete(shipment, e, stepId) {
  const msl = Boolean(e.labels?.msl);
  switch (stepId) {
    case 'receive': return e.custodyAccepted;
    case 'pack': return e.packed && Boolean(e.forms.annotation?.accepted);
    case 'planning': return e.sharedManaged ? Boolean(e.planningChecked) : Boolean(e.cmos?.record?.saved);
    case 'small-package': return e.mode === stepId && Boolean(e.spe?.rated) && msl && Boolean(e.labels?.carrier);
    default: return e.mode === stepId && Boolean(e.forms[stepId]?.accepted) && msl;
  }
}

// Labels printed from CMOS, and applied to the packed piece on the bench.
export const markPrinted = (e, doc) => e.printed?.[doc] ? e : { ...e, printed: { ...e.printed, [doc]: true } };
export const LABELS = { msl: { title: 'Military shipping label (MSL)', printedBy: 'msl' }, carrier: { title: 'Carrier shipping label', printedBy: 'carrierLabel' } };
export function applyLabel(e, id) {
  const label = LABELS[id];
  if (!label || !e.packed || !e.printed?.[label.printedBy] || e.labels?.[id]) return e;
  return { ...e, labels: { ...e.labels, [id]: true }, labelBasis: { ...e.labelBasis, [id]: e.printedBasis?.[label.printedBy] } };
}
export const shipmentComplete = (shipment, e) => Boolean(e.mode) && stageComplete(shipment, e, e.mode);

export function lockedSteps(shipment, e) {
  const locks = {};
  if (!e.custodyAccepted) locks.pack = 'Locked until custody is accepted in Receive & inspect';
  if (!stageComplete(shipment, e, 'pack')) locks.planning = 'Locked until the piece is packed and its packing data is on the document';
  for (const mode of Object.keys(MODES)) {
    if (!e.mode) locks[mode] = 'Locked until the shipment is saved in Shipment planning with a Mil Mode';
    else if (e.mode !== mode) locks[mode] = 'Not the Mil Mode saved for this shipment';
  }
  return locks;
}

export const MISTAKE_POINTS = 5;
export const shipmentScore = e => Math.max(0, 100 - MISTAKE_POINTS * (e.mistakes || []).length);

export { presentedDocument };
