import { calculateCB } from './centerOfBalance';

test('matches Appendix P example one and rounds to the nearest whole inch', () => {
  const result = calculateCB([{ distance: '20', weight: '2870' }, { distance: '150', weight: '2550' }], '5420');
  expect(result.error).toBeUndefined();
  expect(result.totalMoment).toBe(439900);
  expect(result.rounded).toBe(81);
  expect(result.exact).toBeCloseTo(81.16236);
});

test('calculates multiple axles and rounds a half inch upwards', () => {
  expect(calculateCB([{ distance: '0', weight: '100' }, { distance: '11', weight: '100' }], '200').rounded).toBe(6);
  expect(calculateCB([{ distance: '70', weight: '12500' }, { distance: '222', weight: '12900' }, { distance: '276', weight: '12700' }], '38100').rounded).toBe(190);
});

test('rounds half-inch results up even with fractional weight arithmetic', () => {
  expect(calculateCB([{ distance: '21', weight: '1000.1' }, { distance: '122', weight: '1000.1' }], '2000.2').rounded).toBe(72);
});

test('weight reconciliation allows floating-point noise but rejects small inconsistent totals', () => {
  expect(calculateCB([{ distance: '0', weight: '.1' }, { distance: '11', weight: '.2' }], '.3').error).toBeUndefined();
  expect(calculateCB([{ distance: '0', weight: '.001' }, { distance: '11', weight: '.001' }], '.011').error).toBeTruthy();
});

test.each([
  [[{ distance: '', weight: '100' }, { distance: '20', weight: '100' }], '200'],
  [[{ distance: '0', weight: '0' }, { distance: '20', weight: '100' }], '100'],
  [[{ distance: '-1', weight: '100' }, { distance: '20', weight: '100' }], '200'],
  [[{ distance: '0', weight: '100' }, { distance: '20', weight: '100' }], '0'],
  [[{ distance: '0', weight: '100' }, { distance: '20', weight: '100' }], '300'],
  [[{ distance: '20', weight: '100' }, { distance: '10', weight: '100' }], '200'],
  [[{ distance: '0', weight: 'Infinity' }, { distance: '20', weight: '100' }], '200'],
])('rejects missing, invalid, reversed, or inconsistent readings (%#)', (rows, gross) => {
  expect(calculateCB(rows, gross).error).toBeTruthy();
});
