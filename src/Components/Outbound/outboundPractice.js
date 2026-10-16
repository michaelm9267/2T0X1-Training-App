import { createOutboundExercise, answerCheck, returnToCustomer, acceptCustody, packShipment, submitForm, editForm, formFields, RECEIPT_CHECKS, expectedReceipt, expectedMilMode, routeFor, markPrinted, OUTBOUND_STEPS, MODES } from './outboundLogic';
import { incheckTcn, newRecord, editRecord, addPiece, editPiece, savePlanning, planningFields } from './cmosLogic';
import { ITEMS, requiredMarkings, typePackFor } from './outboundData';
import { createShipment, ORIGIN_TARGETS } from './outboundShipments';

// Practice mode: the trainee works one section at a time on a fresh shipment, with every earlier
// section already done correctly. Guided hints and feedback stay on.

// Earlier sections, done the right way.
export function receive(shipment) {
  let e = { ...createOutboundExercise(), documentViewed: true, tagInspected: true, counted: true };
  for (const check of RECEIPT_CHECKS) e = answerCheck(shipment, e, check.id, expectedReceipt(shipment, check.id));
  if (shipment.discrepancy) e = returnToCustomer(shipment, e);
  return acceptCustody(shipment, e);
}
export const fill = (shipment, state, formId) => formFields(shipment, formId).reduce((next, field) => editForm(next, formId, field.id, String(field.expected)), state);
export function packed(shipment) {
  const e = packShipment(shipment, { ...receive(shipment), container: shipment.container, markings: requiredMarkings(shipment) });
  return submitForm(shipment, fill(shipment, { ...e, measured: { length: true, width: true, height: true }, weighed: true }, 'annotation'), 'annotation');
}
export function planned(shipment) {
  const start = packed(shipment);
  let e = shipment.advance ? incheckTcn(shipment, start, shipment.tcn) : newRecord(shipment, start);
  const milMode = expectedMilMode(shipment);
  e = editRecord(e, 'milMode', milMode);
  const item = ITEMS[shipment.itemId];
  e = Object.entries(planningFields(shipment, { milMode })).reduce((state, [id, field]) => field.expected !== undefined && !state.cmos.record.draft[id] && (milMode === '9' || !['poe', 'poeDodaac', 'pod'].includes(id))
    ? editRecord(state, id, String(field.expected)) : state, e);
  const d = shipment.delivery;
  if (d) e = [['ucName', d.name], ['ucAddress', d.address], ['ucCity', d.city], ['ucCountry', d.country], ['ucState', d.state], ['ucZip', d.zip], ['ucPhone', d.phone]].reduce((state, [id, value]) => editRecord(state, id, value), e);
  e = editRecord(editRecord(e, 'nmfc', item.nmfc), 'ciic', item.ciic);
  const p = shipment.packed;
  e = [['weight', p.weight], ['length', p.length], ['width', p.width], ['height', p.height], ['typePack', typePackFor(shipment.container)]].reduce((state, [id, value]) => editPiece(state, 0, id, String(value)), addPiece(e));
  return markPrinted(savePlanning(shipment, e), 'msl');
}

const sectionIndex = stepId => OUTBOUND_STEPS.findIndex(step => step.id === stepId);
// Shipment targets that route to each shipping section.
const SECTION_TARGETS = { 'small-package': ['J', '5'], surface: ['B'], amc: ['amc-overseas', 'amc-conus'] };

// A fresh shipment for the section, with the exercise set up at its start.
export function newPractice({ random = Math.random, origin = 'jber', stepId = 'receive' } = {}) {
  const targets = (SECTION_TARGETS[stepId] || ORIGIN_TARGETS[origin]).filter(target => ORIGIN_TARGETS[origin].includes(target));
  for (let tries = 0; ; tries += 1) {
    const target = targets[Math.floor(random() * targets.length)];
    const shipment = { ...createShipment({ random, origin, target }), key: 'practice' };
    if (MODES[stepId] && routeFor(shipment) !== stepId && tries < 50) continue;
    const index = sectionIndex(stepId);
    const e = index >= 3 ? planned(shipment) : index === 2 ? packed(shipment) : index === 1 ? receive(shipment) : createOutboundExercise();
    if (index >= 3 && !e.cmos.record?.saved && tries < 50) continue;
    return { section: stepId, stepId, shipment, exercise: { ...e, mistakes: [], firstActionAt: null } };
  }
}
