import { ITEMS } from './outboundData';
import { activeTcn } from './cmosLogic';
import { OUTBOUND_STEPS, stageComplete, shipmentComplete, shipmentScore, MISTAKE_POINTS } from './outboundLogic';

// Test mode grading. Each customer starts at 100 and loses MISTAKE_POINTS for each mistake; a
// customer not shipped when the test is finished scores 0. The final score averages every customer.
export const MISTAKE_STEP = { receipt: 'Receive & inspect', packing: 'Pack', documentation: 'Documentation' };

export function gradeOutbound(shipments, exercises) {
  const customers = shipments.map(shipment => {
    const e = exercises[shipment.key];
    const complete = shipmentComplete(shipment, e);
    const steps = OUTBOUND_STEPS.filter(step => stageComplete(shipment, e, step.id)).map(step => step.title);
    return { key: shipment.key, serial: shipment.serial, item: ITEMS[shipment.itemId].nomenclature, document: shipment.document, tcn: activeTcn(shipment, e),
      milMode: e.milMode, complete, steps, mistakes: e.mistakes || [], score: complete ? shipmentScore(e) : 0 };
  });
  const final = customers.length ? Math.round(customers.reduce((sum, customer) => sum + customer.score, 0) / customers.length) : 0;
  return { customers, final, mistakePoints: MISTAKE_POINTS };
}
