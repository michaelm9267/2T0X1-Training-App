import { createOutboundExercise, answerCheck, returnToCustomer, acceptCustody, packShipment, submitForm, editForm, formFields, RECEIPT_CHECKS, expectedReceipt } from './outboundLogic';
import { requiredMarkings } from './outboundData';

// Shared helpers for the Outbound trainer tests.

// Deterministic random source for repeatable shipments.
export const seeded = (seed = 7) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

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

