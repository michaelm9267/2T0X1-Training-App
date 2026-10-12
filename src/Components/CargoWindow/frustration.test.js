import { scenarios } from './scenarios';
import { createExercise, isStageComplete } from './exercise';
import { saveManifest } from './workflow';
import { frustrate, fixFrustration, releaseFrustration, reasonFixed, fixReadiness, isFrustrated } from './frustration';

const pallet = scenarios.find(s => s.id === '463l-pallet');
const isu = scenarios.find(s => s.id === 'isu-90');

test('valid finding frustration needs inspection, a fix, and release', () => {
  let e = frustrate(pallet, createExercise(), 'nets');
  expect(e.frustrations[0]).toMatchObject({ reason: 'nets', valid: true });
  expect(e.answers.nets.choice).toBe('unsatisfactory');
  expect(isFrustrated(e)).toBe(true);
  expect(releaseFrustration(pallet, e, 0)).toBe(e);
  expect(fixReadiness(pallet, e, 'nets').ready).toBe(false);
  e = { ...e, inspected: ['nets'] };
  e = fixFrustration(pallet, e, 0);
  expect(e.answers.nets.corrected).toBe(true);
  expect(reasonFixed(pallet, e, e.frustrations[0])).toBe(true);
  e = releaseFrustration(pallet, e, 0);
  expect(isFrustrated(e)).toBe(false);
  expect(e.frustrationFeedback).toBe('Asset released from frustration.');
});

test('frustrated asset cannot be manifested or complete JI', () => {
  const e = frustrate(pallet, createExercise(), 'dunnage');
  expect(saveManifest(pallet, e, true).manifestFeedback).toMatch(/Asset is frustrated/);
  expect(isStageComplete(pallet, 'manifest', { ...e, manifestAccepted: true })).toBe(false);
  expect(isStageComplete(pallet, 'ji', e)).toBe(false);
});

test('missing HAZDEC copies are fixed by requesting copies', () => {
  let e = frustrate(isu, createExercise(), 'paperwork');
  expect(e.frustrations[0].valid).toBe(true);
  expect(reasonFixed(isu, e, e.frustrations[0])).toBe(false);
  e = fixFrustration(isu, e, 0);
  expect(e.documentCopies.hazdec).toBe(3);
  expect(isFrustrated(releaseFrustration(isu, e, 0))).toBe(false);
});

test('a reason the shipment does not have is flagged and can be released', () => {
  let e = frustrate(pallet, createExercise(), 'fuel');
  expect(e.frustrations[0].valid).toBe(false);
  expect(e.frustrationFeedback).toMatch(/does not have that discrepancy/);
  e = releaseFrustration(pallet, e, 0);
  expect(isFrustrated(e)).toBe(false);
});

test('other requires a description and is fixed by recording the action', () => {
  expect(frustrate(pallet, createExercise(), 'other').frustrations).toHaveLength(0);
  let e = frustrate(pallet, createExercise(), 'other', 'Shipper unavailable');
  expect(reasonFixed(pallet, e, e.frustrations[0])).toBe(false);
  e = releaseFrustration(pallet, fixFrustration(pallet, e, 0), 0);
  expect(isFrustrated(e)).toBe(false);
});
