import { newPractice, planned } from './outboundPractice';
import { gradeOutbound } from './outboundGrading';
import { traineeReady } from '../Session/Grading';
import { createQueue } from './outboundShipments';
import { createOutboundExercise, lockedSteps, routeFor, stageComplete, OUTBOUND_STEPS } from './outboundLogic';
import { recordMistake } from '../CargoWindow/mistakes';
import { seeded, packed } from './testHelpers';

test('practice starts each section with every earlier section done and nothing recorded', () => {
  for (const origin of ['jber', 'travis']) {
    OUTBOUND_STEPS.forEach((step, index) => {
      const { section, stepId, shipment, exercise } = newPractice({ random: seeded(index + 3), origin, stepId: step.id });
      expect([section, stepId]).toEqual([step.id, step.id]);
      expect(exercise.mistakes).toEqual([]);
      expect(stageComplete(shipment, exercise, step.id)).toBe(false);
      OUTBOUND_STEPS.slice(0, Math.min(index, 3)).forEach(earlier => expect(stageComplete(shipment, exercise, earlier.id)).toBe(true));
    });
  }
});

test('a shipping section practice routes to that section, saved in CMOS with the MSL printed', () => {
  for (const origin of ['jber', 'travis']) {
    ['small-package', 'surface', 'amc'].forEach((stepId, index) => {
      const { shipment, exercise } = newPractice({ random: seeded(index + 11), origin, stepId });
      expect(routeFor(shipment)).toBe(stepId);
      expect(exercise.mode).toBe(stepId);
      expect(exercise.printed.msl).toBe(true);
      expect(lockedSteps(shipment, exercise)[stepId]).toBeUndefined();
    });
  }
});

test('grading: shipped customers lose 5 a mistake, unshipped ones score 0, the final averages all', () => {
  const shipments = createQueue({ random: seeded(5), origin: 'travis' });
  const exercises = Object.fromEntries(shipments.map(shipment => [shipment.key, createOutboundExercise()]));
  const [first, second] = shipments;
  // Ship the first customer by surface or AMC form, or close its small package, as its route needs.
  const done = planned(first);
  const shipped = routeFor(first) === 'small-package'
    ? { ...done, spe: { rated: true }, labels: { msl: true, carrier: true } }
    : { ...done, forms: { ...done.forms, [routeFor(first)]: { accepted: true } }, labels: { msl: true } };
  exercises[first.key] = recordMistake(recordMistake(shipped, 'packing', 'Wrong container', 'MIL-STD-2073-1'), 'receipt', 'Missed the NSN', 'DLM 4000.25-1');
  exercises[second.key] = recordMistake(packed(second), 'receipt', 'Returned a good document', 'DAFI 24-602V2');
  const { customers, final } = gradeOutbound(shipments, exercises);
  expect(customers[0]).toMatchObject({ complete: true, score: 90 });
  expect(customers[0].mistakes.map(m => m.detail)).toEqual(['Wrong container', 'Missed the NSN']);
  expect(customers[1]).toMatchObject({ complete: false, score: 0, steps: ['Receive & inspect', 'Pack'] });
  expect(final).toBe(Math.round(90 / shipments.length));
  expect(traineeReady({ rank: 'SrA', first: 'Pat', last: ' ' })).toBe(false);
  expect(traineeReady({ rank: 'SrA', first: 'Pat', last: 'Lee' })).toBe(true);
});
