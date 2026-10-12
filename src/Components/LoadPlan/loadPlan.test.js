import { autoPlace, checkPlan, pieceCB, submitPlan, emptyPlan, CB_RANGE, reconcilePlan } from './loadPlanLogic';

const truck = { key: 't', title: 'Truck', length: 200, width: 86, weight: 10000, axles: [{ position: 30, weight: 6000 }, { position: 160, weight: 4000 }] };
const pallet = { key: 'p', title: 'Pallet', length: 108, width: 88, weight: 5000 };

test('own CB comes from axles for vehicles and the middle for other cargo', () => {
  expect(pieceCB(truck)).toBe((30 * 6000 + 160 * 4000) / 10000);
  expect(pieceCB(pallet)).toBe(54);
});
test('accepted plans reopen whenever the deployment basis changes', () => {
 const accepted = { ...emptyPlan(), accepted: true, feedback: 'Training load plan accepted.', basis: 'old' };
 expect(reconcilePlan(accepted, 'new')).toEqual(expect.objectContaining({ accepted: false, feedback: '', basis: 'new' }));
 expect(reconcilePlan({ ...accepted, basis: 'same' }, 'same').accepted).toBe(true);
});

test('the plan flags unplaced, overlapping, off-floor, and out-of-range loads', () => {
  expect(checkPlan([truck, pallet], {}).problems).toEqual(['Truck is not placed on the aircraft.', 'Pallet is not placed on the aircraft.']);
  expect(checkPlan([truck, pallet], { t: { station: 300, lateral: 0 }, p: { station: 400, lateral: 0 } }).problems.join(' ')).toMatch(/overlaps/);
  expect(checkPlan([truck], { t: { station: 950, lateral: 0 } }).problems.join(' ')).toMatch(/beyond the cargo floor/);
  expect(checkPlan([truck], { t: { station: 0, lateral: 0 } }).problems.join(' ')).toMatch(/outside the allowable range/);
  const good = { t: { station: 300, lateral: 0 }, p: { station: 520, lateral: 0 } };
  const result = checkPlan([truck, pallet], good);
  expect(result.problems).toEqual([]);
  expect(result.cb).toBeGreaterThanOrEqual(CB_RANGE[0]);
});

test('auto placement puts the next piece aft of the last one', () => {
  expect(autoPlace(pallet, { t: { station: 100, lateral: 0 } }, [truck, pallet])).toEqual({ station: 312, lateral: 0 });
});

test('a rejected plan is a mistake; a clean plan is accepted', () => {
  const bad = submitPlan({ ...emptyPlan(), placements: { t: { station: 0, lateral: 0 } } }, [truck], true);
  expect(bad.accepted).toBe(false);
  expect(bad.mistakes).toHaveLength(1);
  expect(submitPlan({ ...emptyPlan(), placements: { t: { station: 300, lateral: 0 } } }, [truck], false).feedback).toMatch(/must complete Manifest/);
  expect(submitPlan({ ...emptyPlan(), placements: { t: { station: 300, lateral: 0 } } }, [truck], true).accepted).toBe(true);
});

test('invalid coordinates and empty deployments cannot be accepted', () => {
 expect(submitPlan({ ...emptyPlan(), placements: { t: { station: NaN, lateral: 0 } } }, [truck], true).accepted).toBe(false);
 expect(submitPlan(emptyPlan(), [], true).accepted).toBe(false);
});
