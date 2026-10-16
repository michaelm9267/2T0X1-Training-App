import { TYPE_PACKS, typePackFor } from '../Outbound/outboundData';
import { EQUIPMENT_TYPES, TYPE_PACK_CODES, FREIGHT_SERVICE_AGENCIES, LOW_COST_NOT_USED_REASONS, RIN_CODES, gblocForDodaac, rinTextFor } from './dtrReference';
import { MODE_REFERENCE, ediForMilMode } from './modeReference';
import { HOLD_CODE_REFERENCE } from './planningReferences';

test('DTR tables load the published code lists', () => {
  expect(RIN_CODES[0][0]).toBe('101');
  expect(rinTextFor('101')).toMatch(/^CMOS BL only/);
  expect(EQUIPMENT_TYPES).toContainEqual(['AV2', 'Van, closed, 31-40 ft']);
  expect(FREIGHT_SERVICE_AGENCIES).toContainEqual(['P', 'Coast Guard']);
  expect(LOW_COST_NOT_USED_REASONS[0]).toEqual(['N1', 'Excusable Refusal']);
  expect(gblocForDodaac('fb6181')).toBe('AAFL');
});

test('clipped CMOS descriptions are completed only where DTR agrees', () => {
  expect(MODE_REFERENCE.find(([code]) => code === 'S')[1]).toMatch(/^SCHEDULED TRUCK SERVICE \(APPLIES TO CONTRACT CARRIAGE/);
  expect(MODE_REFERENCE.find(([code]) => code === 'B')[1]).toBe('MOTOR, LESS THAN TRUCKLOAD');
  expect(ediForMilMode('Q')).toBe('AF');
  expect(HOLD_CODE_REFERENCE.find(([code]) => code === 'D')[1]).toBe('DELAY DUE TO DIVERSION TO SURFACE RESULTING FROM CHALLENGE BY AIR CLEARANCE ACTIVITY.');
  // CMOS lists Y with text DTR files under X, so it stays as transcribed.
  expect(HOLD_CODE_REFERENCE.find(([code]) => code === 'Y')[1]).toMatch(/\.\.\.$/);
});

test('type pack codes on the paperwork are DTR codes', () => {
  const dtr = Object.fromEntries(TYPE_PACK_CODES);
  for (const [code, text] of Object.entries(TYPE_PACKS)) expect(dtr[code]).toBe(text);
  expect(typePackFor('triwall')).toBe('MW');
  expect(dtr.PL).toBe('Pail');
  expect(TYPE_PACKS.PK).toBeUndefined();
});
