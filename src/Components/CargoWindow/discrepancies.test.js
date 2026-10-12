import { scenarios } from './scenarios';
import { applyDiscrepancies, possibleDiscrepancies, withDocumentErrors, activeDiscrepancies } from './discrepancies';
import { randomizeShipment } from './scenarioVariants';
import { reasonApplies, frustrate, fixFrustration, reasonFixed, releaseFrustration } from './frustration';
import { letterApplies } from './transportability';
import { createExercise } from './exercise';

const byId = id => scenarios.find(s => s.id === id);

test('resets choose which discrepancies are present, including none at all', () => {
  const pallet = byId('463l-pallet');
  const clean = applyDiscrepancies(pallet, () => .99);
  expect(clean.findings.filter(f => f.correct === 'unsatisfactory')).toEqual([]);
  expect(clean.findings.find(f => f.id === 'nets').observation).toMatch(/serviceable/);
  const dirty = applyDiscrepancies(pallet, () => 0);
  expect(dirty.findings.filter(f => f.correct === 'unsatisfactory').map(f => f.id).sort()).toEqual(['dunnage', 'nets', 'pallet-condition']);
  expect(dirty.findings.find(f => f.id === 'pallet-condition').correction).toBeTruthy();
});

test('vehicle battery and fuel follow the chosen discrepancies', () => {
  const hmmwv = byId('rolling-stock');
  const sound = applyDiscrepancies(hmmwv, () => .99);
  expect(sound.vehicleChecks.positiveTaped).toBe(true);
  expect(sound.vehicleChecks.fuelFraction).toBeLessThanOrEqual(.25);
  expect(sound.findings.find(f => f.id === 'fuel').correct).toBe('satisfactory');
  const bad = applyDiscrepancies(hmmwv, () => 0, { battery: true, fuel: true });
  expect(bad.vehicleChecks.positiveTaped).toBe(false);
  expect(bad.vehicleChecks.fuelFraction).toBeGreaterThan(.25);
  expect(bad.findings.find(f => f.id === 'battery').correct).toBe('unsatisfactory');
});

test('instructors can force discrepancies on or off', () => {
  const isu = byId('isu-90');
  const forced = applyDiscrepancies(isu, () => 0, { 'loose-case': false, access: true, 'undeclared-hazmat': false, 'secured-crates': false, dunnage: false, 'doc-attla': false, 'doc-hazdec': false, 'doc-logmod': false });
  expect(forced.findings.filter(f => f.correct === 'unsatisfactory').map(f => f.id)).toEqual(['access']);
  expect(forced.contents.find(c => c.id === 'loose-case').description).toMatch(/strapped/);
  expect(possibleDiscrepancies(isu).map(([id]) => id)).toEqual(expect.arrayContaining(['loose-case', 'access', 'doc-attla', 'doc-hazdec', 'doc-logmod']));
});

test('paperwork errors show until the trainee frustrates the piece and gets them corrected', () => {
  const hmmwv = { ...randomizeShipment(byId('rolling-stock'), byId('rolling-stock'), () => .99, { 'doc-logmod': true, 'doc-attla': true, 'doc-hazdec': true }), destination: 'FB5294' };
  let e = createExercise();
  let seen = withDocumentErrors(hmmwv, e);
  expect(seen.paperworkWeight).not.toBe(seen.weight);
  expect(letterApplies(seen)).toBe(false);
  expect(seen.hazdecError).toBeTruthy();
  expect(activeDiscrepancies(hmmwv).map(d => d.id)).toEqual(expect.arrayContaining(['doc-logmod', 'doc-attla', 'doc-hazdec']));
  for (const reason of ['mismatch', 'attla', 'hazdec']) {
    expect(reasonApplies(seen, e, reason)).toBe(true);
    e = frustrate(seen, e, reason);
    const index = e.frustrations.length - 1;
    e = fixFrustration(seen, e, index);
    seen = withDocumentErrors(hmmwv, e);
    expect(reasonFixed(seen, e, e.frustrations[index])).toBe(true);
    e = releaseFrustration(seen, e, index);
  }
  expect(seen.paperworkWeight).toBeUndefined();
  expect(letterApplies(seen)).toBe(true);
  expect(seen.hazdecError).toBeUndefined();
});
