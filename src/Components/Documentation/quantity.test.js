import { convertQuantity, linkedQuantity } from './quantity';

test('metric and imperial quantities convert both ways', () => {
  expect(convertQuantity('100', true, 'Weight (kg / lb)')).toBe('220.46');
  expect(convertQuantity('220.46', false, 'Weight (kg / lb)')).toBe('100');
  expect(convertQuantity('100', true, 'Volume (L / gal)')).toBe('26.42');
  expect(convertQuantity('10', false, 'Volume (L / gal)')).toBe('37.85');
  expect(convertQuantity('', true)).toBe('');
  expect(convertQuantity('abc', true)).toBe('');
});

test('typing either field or changing the measure fills the linked field', () => {
  expect(linkedQuantity('dg2QtyMetric', '50', {})).toEqual({ id: 'dg2QtyImperial', value: '110.23' });
  expect(linkedQuantity('dg2QtyImperial', '110.23', {})).toEqual({ id: 'dg2QtyMetric', value: '50' });
  expect(linkedQuantity('dg2QtyMeasure', 'Volume (L / gal)', { dg2QtyMetric: '50' })).toEqual({ id: 'dg2QtyImperial', value: '13.21' });
  expect(linkedQuantity('dg2Name', 'x', {})).toBeNull();
});
