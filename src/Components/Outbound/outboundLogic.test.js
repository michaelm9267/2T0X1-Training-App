import { createShipment, createQueue, presentedDocument, transportationPriority } from './outboundShipments';
import {
  createOutboundExercise, answerCheck, returnToCustomer, acceptCustody, packShipment, submitForm, editForm, expectedMilMode,
  lengthGirth, cube, formFields, lockedSteps, stageComplete, RECEIPT_CHECKS, expectedReceipt,
} from './outboundLogic';
import { ITEMS, requiredMarkings } from './outboundData';
import { seeded, receive, packed, fill } from './testHelpers';


test('each origin queue covers its Mil Modes, and every shipment routes as built', () => {
  for (let seed = 1; seed < 40; seed += 1) {
    const jber = createQueue({ random: seeded(seed), origin: 'jber' });
    expect(jber.map(shipment => shipment.targetMode).sort()).toEqual(['9', '9', 'B', 'J']);
    const travis = createQueue({ random: seeded(seed), origin: 'travis' });
    expect(travis.map(shipment => shipment.targetMode).sort()).toEqual(['5', '9', 'B', 'J']);
    [...jber, ...travis].forEach(shipment => expect(expectedMilMode(shipment)).toBe(shipment.targetMode));
    travis.forEach(shipment => { expect(shipment.documentNumber.startsWith('FB4427')).toBe(true); expect(shipment.dodaac).not.toBe('FB4427'); });
  }
});

test('builds MILSTRIP document numbers and TCNs', () => {
  const shipment = createShipment({ random: seeded(3), target: 'amc-overseas', discrepancy: null });
  expect(shipment.documentNumber).toMatch(/^FB50006285\d{4}$/);
  expect(shipment.tcn).toBe(`${shipment.documentNumber}XXX`);
  expect(shipment.tcn).toHaveLength(17);
});

test('transportation priority follows DTR Part II Table 203-3 (PD, RDD and CONUS/OCONUS customer)', () => {
  // Today is day 285.
  expect(transportationPriority('02', '')).toBe('TP1');
  expect(transportationPriority('03', '999')).toBe('TP1');
  expect(transportationPriority('01', 'S05')).toBe('TP3');
  expect(transportationPriority('01', 'X10')).toBe('TP3');
  ['444', '555', '777', 'N05', 'E10'].forEach(rdd => expect(transportationPriority('12', rdd)).toBe('TP2'));
  expect(transportationPriority('06', '290')).toBe('TP2');
  expect(transportationPriority('06', '300')).toBe('TP3');
  expect(transportationPriority('06', '300', true)).toBe('TP2');
  expect(transportationPriority('06', '310', true)).toBe('TP3');
  expect(transportationPriority('13', '')).toBe('TP3');
});

test('Mil Mode rules by origin, priority, size and destination', () => {
  const small = { length: 36, width: 12, height: 12, weight: 37 };
  const base = { ...createShipment({ random: seeded(5), target: 'J', discrepancy: null }), dodaac: 'FA8217', delivery: null, packed: small };
  const tp1 = { pd: '02', rdd: '' }, tp2 = { pd: '06', rdd: '777' }, tp3 = { pd: '12', rdd: '' };
  expect(expectedMilMode({ ...base, ...tp1 })).toBe('J');
  expect(expectedMilMode({ ...base, ...tp2 })).toBe('J');
  expect(expectedMilMode({ ...base, ...tp3 })).toBe('9');
  expect(expectedMilMode({ ...base, origin: 'travis', ...tp1 })).toBe('J');
  expect(expectedMilMode({ ...base, origin: 'travis', ...tp2 })).toBe('5');
  expect(expectedMilMode({ ...base, origin: 'travis', ...tp3 })).toBe('5');
  // Small parcel air: 300 lb between Alaska and CONUS, 150 lb within CONUS (Chapter 202, para M.1).
  const brake = { length: 30, width: 30, height: 18, weight: 290 };
  expect(expectedMilMode({ ...base, ...tp1, packed: brake })).toBe('J');
  expect(expectedMilMode({ ...base, ...tp1, packed: { ...brake, weight: 301 } })).toBe('B');
  expect(expectedMilMode({ ...base, origin: 'travis', ...tp1, packed: { ...small, weight: 151 } })).toBe('B');
  expect(expectedMilMode({ ...base, ...tp1, packed: { length: 84, width: 44, height: 10, weight: 94 } })).toBe('B');
  expect(expectedMilMode({ ...base, ...tp1, dodaac: 'FB5294', packed: { ...small, weight: 400 } })).toBe('9');
  expect(lengthGirth(small)).toBe(84);
  expect(cube({ length: 24, width: 18, height: 12 })).toBe(3);
});

test('the presented document carries the discrepancy until the customer corrects it', () => {
  const shipment = createShipment({ random: seeded(9), target: 'B', discrepancy: 'quantity' });
  expect(presentedDocument(shipment).quantity).not.toBe(shipment.quantity);
  expect(presentedDocument(shipment, true).quantity).toBe(shipment.quantity);
  expect(presentedDocument({ ...shipment, discrepancy: 'funding' }).tac).toBe('');
});

test('custody is refused while a discrepancy is uncorrected, and accepted after the customer fixes it', () => {
  const shipment = createShipment({ random: seeded(11), target: 'J', discrepancy: 'nsn' });
  let e = { ...createOutboundExercise(), documentViewed: true, tagInspected: true, counted: true };
  for (const check of RECEIPT_CHECKS) e = answerCheck(shipment, e, check.id, expectedReceipt(shipment, check.id));
  const refused = acceptCustody(shipment, e);
  expect(refused.custodyAccepted).toBe(false);
  expect(refused.mistakes).toHaveLength(1);
  expect(receive(shipment).custodyAccepted).toBe(true);
  expect(receive(shipment).mistakes).toHaveLength(0);
});

test('a wrong receipt call and a needless return each record a mistake', () => {
  const shipment = createShipment({ random: seeded(13), target: 'amc-overseas', discrepancy: null });
  let e = { ...createOutboundExercise(), documentViewed: true, tagInspected: true, counted: true };
  e = answerCheck(shipment, e, 'nsn', 'unsatisfactory');
  expect(e.mistakes).toHaveLength(1);
  e = returnToCustomer(shipment, e);
  expect(e.returned).toBe(false);
  expect(e.mistakes).toHaveLength(2);
});

test('NSN, quantity and condition calls wait for the item inspection', () => {
  const shipment = createShipment({ random: seeded(13), target: 'amc-overseas', discrepancy: null });
  const e = answerCheck(shipment, { ...createOutboundExercise(), documentViewed: true }, 'quantity', 'satisfactory');
  expect(e.answers.quantity).toBeUndefined();
});

test('Pack finishes when the packing data written on the document matches the measured piece', () => {
  const shipment = createShipment({ random: seeded(17), target: 'B', discrepancy: null });
  let e = packShipment(shipment, { ...receive(shipment), container: 'mailer' });
  expect(e.packed).toBe(false);
  e = packShipment(shipment, { ...e, container: shipment.container, markings: requiredMarkings(shipment) });
  expect(e.packed).toBe(true);
  expect(submitForm(shipment, fill(shipment, e, 'annotation'), 'annotation').forms.annotation.accepted).toBeFalsy();
  const wrongPack = submitForm(shipment, editForm(fill(shipment, { ...e, measured: { length: true, width: true, height: true }, weighed: true }, 'annotation'), 'annotation', 'typePack', 'DR'), 'annotation');
  expect(wrongPack.forms.annotation.errors).toEqual(['typePack']);
  const done = packed(shipment);
  expect(stageComplete(shipment, done, 'pack')).toBe(true);
  expect(lockedSteps(shipment, done).planning).toBeUndefined();
  expect(lockedSteps(shipment, done)['small-package']).toBeTruthy();
});

test('ESDS items need the ESD caution label; hazmat labels are refused', () => {
  const shipment = { ...createShipment({ random: seeded(19), target: 'J', discrepancy: null }), itemId: 'circuit-card', container: 'esd-fiberboard', rdd: '' };
  const ready = { ...createOutboundExercise(), custodyAccepted: true, container: 'esd-fiberboard' };
  expect(packShipment(shipment, { ...ready, markings: [] }).packed).toBe(false);
  expect(packShipment(shipment, { ...ready, markings: ['esd', 'hazmat'] }).packed).toBe(false);
  expect(packShipment(shipment, { ...ready, markings: ['esd', 'up'] }).packed).toBe(true);
});

test('a DD 1149 takes its TP from the RDD alone (DAFI 24-602V2 Table 2.1)', () => {
  const tp = (rdd, oconus) => transportationPriority('', rdd, oconus, '1149');
  expect(tp('287')).toBe('TP1');
  expect(tp('288')).toBe('TP2');
  expect(tp('293')).toBe('TP2');
  expect(tp('294')).toBe('TP3');
  expect(tp('290', true)).toBe('TP1');
  expect(tp('306', true)).toBe('TP2');
  expect(tp('307', true)).toBe('TP3');
  expect(tp('')).toBe('TP3');
  // A 1348-1A RDD exactly 8 days out is still TP2.
  expect(transportationPriority('06', '293')).toBe('TP2');
  for (let seed = 1; seed < 30; seed += 1) createQueue({ random: seeded(seed), origin: 'travis' })
    .filter(shipment => shipment.document === '1149').forEach(shipment => { expect(shipment.pd).toBe(''); expect(shipment.rdd).toMatch(/^(\d{3})?$/); });
});

test('wood packaging needs the WPM mark and an RDD 999 piece needs the 999 marking', () => {
  const base = createShipment({ random: seeded(23), target: 'B', discrepancy: null });
  expect(requiredMarkings({ ...base, itemId: 'gearbox', container: 'wood-box', rdd: '' })).toEqual(['wpm']);
  expect(requiredMarkings({ ...base, itemId: 'bolts', container: 'triwall', rdd: '999' })).toEqual(['wpm', 'expedite']);
  expect(requiredMarkings({ ...base, itemId: 'actuator', container: 'fiberboard', rdd: '' })).toEqual([]);
  const shipment = { ...base, itemId: 'actuator', container: 'fiberboard', rdd: '' };
  const ready = { ...createOutboundExercise(), custodyAccepted: true, container: 'fiberboard' };
  expect(packShipment(shipment, { ...ready, markings: ['wpm'] }).packed).toBe(false);
  expect(packShipment(shipment, { ...ready, markings: [] }).packed).toBe(true);
});

test('consignees come from the CMOS DoDAAC table: lower 48 by surface or parcel, OCONUS by AMC, Alaska lookup only', () => {
  const { CONUS, OVERSEAS, consignee } = require('./outboundData');
  expect(Object.keys(CONUS).length).toBeGreaterThan(150);
  expect(Object.keys(OVERSEAS).length).toBeGreaterThan(35);
  expect(consignee('FB4479')).toMatchObject({ unit: '62 APS TROT', city: 'LEWIS MCCHORD, WA 98438' });
  expect(OVERSEAS.FB5240.port).toBe('UAM');
  expect(consignee('FB6520').city).toMatch(/JBER, AK/);
  expect(CONUS.FB6520 || OVERSEAS.FB6520).toBeUndefined();
});

test('the catalog has a variety of cargo and every item packs and routes as built', () => {
  const kinds = new Set();
  for (let seed = 1; seed < 120; seed += 1) {
    for (const origin of ['jber', 'travis']) createQueue({ random: seeded(seed), origin }).forEach(shipment => {
      kinds.add(shipment.itemId);
      expect(expectedMilMode(shipment)).toBe(shipment.targetMode);
      expect(shipment.container).toBeTruthy();
      expect(shipment.packed.weight).toBeGreaterThan(0);
    });
  }
  expect(kinds.size).toBe(Object.keys(ITEMS).length);
});
