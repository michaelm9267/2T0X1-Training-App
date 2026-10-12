import { measure, snapPoint, screenToPhysical } from './measurement';

test('measures in physical inches and handles identical points', () => {
  expect(measure({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  expect(measure({ x: 3, y: 4 }, { x: 3, y: 4 })).toBe(0);
});

test('snaps to the nearest eligible edge or axle target only', () => {
  const targets = [{ x: 10, y: 0 }, { x: 12, y: 0 }];
  expect(snapPoint({ x: 11.8, y: 0 }, targets, 2)).toEqual(targets[1]);
  expect(snapPoint({ x: 20, y: 0 }, targets, 2)).toEqual({ x: 20, y: 0 });
});

test('screen transforms preserve physical distances across viewport sizes', () => {
  const inverse = scale => ({ a: 1 / scale, b: 0, c: 0, d: 1 / scale, e: -10 / scale, f: -20 / scale });
  for (const scale of [2, 4]) {
    const a = screenToPhysical(10, 20, inverse(scale));
    const b = screenToPhysical(10 + 30 * scale, 20 + 40 * scale, inverse(scale));
    expect(measure(a, b)).toBe(50);
  }
});
