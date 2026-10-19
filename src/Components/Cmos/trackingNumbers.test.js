import { trackingNumber, validTracking } from './trackingNumbers';

test('tracking numbers follow each carrier format and check digit, and stay the same for a TCN', () => {
  const fedex = trackingNumber('FDE', 'FB65214086B010XXX');
  expect(fedex).toMatch(/^\d{12}$/);
  expect(fedex.slice(-1)).toBe(validTracking.fedexExpress(fedex.slice(0, 11)));
  expect(trackingNumber('FDE', 'FB65214086B010XXX')).toBe(fedex);
  expect(trackingNumber('FDE', 'FB65214086B011XXX')).not.toBe(fedex);
  const ground = trackingNumber('FDEG', 'FB65214086B010XXX');
  expect(ground).toMatch(/^\d{15}$/);
  expect(ground.slice(-1)).toBe(validTracking.mod10(ground.slice(0, 14)));
  const ups = trackingNumber('UPSN', 'FB65214086B010XXX', 'Next Day Air');
  expect(ups).toMatch(/^1Z[0-9A-Z]{6}01\d{8}$/);
  expect(ups.slice(-1)).toBe(validTracking.upsCheck(ups.slice(2, -1)));
  expect(trackingNumber('UPSN', 'FB65214086B010XXX', 'Ground').slice(8, 10)).toBe('03');
  expect(trackingNumber('UPSQ', 'FB65214086B010XXX')).toMatch(/^\d{9}$/);
  const dhl = trackingNumber('PAZC', 'FB65214086B010XXX');
  expect(dhl).toMatch(/^\d{10}$/);
  expect(dhl.slice(-1)).toBe(String(Number(dhl.slice(0, 9)) % 7));
});

test('UPS check digit matches a published UPS example', () => {
  // 1Z 999AA1 01 2345678 4 is UPS's documented sample tracking number.
  expect(validTracking.upsCheck('999AA10123456784'.slice(0, 15))).toBe('4');
});
