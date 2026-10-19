import { createCmosStore, createRecord, movementDocumentFor } from './model';
import { money, isMoneyField } from './money';

test('the movement document is the SPE tracking number, the CBL number, or the manifest number', () => {
  let s = createRecord(createCmosStore(), 'shipments', { tcn: 'TRN001' });
  s = createRecord(s, 'shipments', { tcn: 'TRN002' });
  s = createRecord(s, 'shipments', { tcn: 'TRN003' });
  s = createRecord(s, 'shipments', { tcn: 'TRN004' });
  expect(movementDocumentFor(s, 'shipments-1')).toBe('');
  s = createRecord(s, 'express', { shipmentId: 'shipments-1' });
  expect(movementDocumentFor(s, 'shipments-1')).toBe('');
  s = { ...s, express: { ...s.express, 'express-1': { ...s.express['express-1'], result: { state: 'success', tracking: '878837661728' } } } };
  expect(movementDocumentFor(s, 'shipments-1')).toBe('878837661728');
  s = createRecord(s, 'bills', { movementDocNbr: 'MKFZ700044', shipmentIds: ['shipments-2'] });
  expect(movementDocumentFor(s, 'shipments-2')).toBe('MKFZ700044');
  s = createRecord(s, 'truckManifests', { manifestNumber: 'TRN-TM-1', shipmentIds: ['shipments-3'] });
  expect(movementDocumentFor(s, 'shipments-3')).toBe('TRN-TM-1');
  s = createRecord(s, 'airManifests', { manifestNumber: 'FA5030A0001', shipmentIds: ['shipments-4'] });
  expect(movementDocumentFor(s, 'shipments-4')).toBe('FA5030A0001');
  s = { ...s, airManifests: { ...s.airManifests, 'airManifests-1': { ...s.airManifests['airManifests-1'], status: 'Aborted' } } };
  expect(movementDocumentFor(s, 'shipments-4')).toBe('');
});

test('money amounts carry a dollar sign', () => {
  expect(money('35.51')).toBe('$35.51');
  expect(money('12450')).toBe('$12,450.00');
  expect(money('', '$.00')).toBe('$.00');
  expect(money('$500.00')).toBe('$500.00');
  expect(['estimatedCharges', 'oaCharges', 'totalCost', 'insuredValue', 'upc'].every(isMoneyField)).toBe(true);
  expect(isMoneyField('weight')).toBe(false);
});

test('earlier pickups fill the Closed Date list with weekday evening closeouts before today', () => {
  const { pastPickups } = require('./SpeDocuments');
  const list = pastPickups('FDE', new Date(2026, 9, 18, 23, 0));
  expect(list).toHaveLength(18);
  expect(list.every(p => new Date(p.closedAt) < new Date(2026, 9, 18) && ![0, 6].includes(new Date(p.closedAt).getDay()))).toBe(true);
  expect(list[0].packages[0].tcn).toMatch(/^FB5000\d{8}XAX$/);
  expect(list[0].packages[0].tracking).toMatch(/^\d{12}$/);
  expect(pastPickups('XXXX')).toEqual([]);
});
