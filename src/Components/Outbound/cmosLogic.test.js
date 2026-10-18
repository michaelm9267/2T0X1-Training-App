import { createShipment } from './outboundShipments';
import { typePackFor } from './outboundData';
import { shipmentComplete, lockedSteps, expectedMilMode, markPrinted, applyLabel, stageComplete } from './outboundLogic';
import {
  listRows, searchRows, planningFields, incheckTcn, newRecord, editRecord, addPiece, editPiece, savePlanning, canExpressShip,
  openExpressShip, editExpress, sendRequest, cancelRequest, pieceCube, validDateCode, expectedDocType, usualDomInt, closedPackage,
} from './cmosLogic';
import { seeded, packed } from './testHelpers';

function fillRecord(shipment, e, milMode = expectedMilMode(shipment)) {
  const fields = planningFields(shipment, { milMode });
  let next = editRecord(e, 'milMode', milMode);
  next = Object.entries(fields).reduce((state, [id, field]) => field.expected !== undefined && (field.required || !['poe', 'poeDodaac', 'pod'].includes(id)) && !state.cmos.record.draft[id] ? editRecord(state, id, typeof field.expected === 'boolean' ? field.expected : String(field.expected)) : state, next);
  const d = shipment.delivery;
  if (d) next = [['ucName', d.name], ['ucAddress', d.address], ['ucCity', d.city], ['ucCountry', d.country], ['ucState', d.state], ['ucZip', d.zip]].reduce((state, [id, value]) => editRecord(state, id, value), next);
  next = editRecord(editRecord(next, 'nmfc', '062820'), 'ciic', 'U');
  next = addPiece(next);
  const p = shipment.packed;
  return [['weight', p.weight], ['length', p.length], ['width', p.width], ['height', p.height], ['typePack', typePackFor(shipment.container)]].reduce((state, [id, value]) => editPiece(state, 0, id, String(value)), next);
}

test('the list holds filler advance records, plus the customer TCN only when it has an advance record', () => {
  const withAdvance = createShipment({ random: seeded(2), target: 'J', advance: true });
  const without = { ...withAdvance, advance: false };
  const e = packed(withAdvance);
  expect(listRows(withAdvance, e).length).toBeGreaterThan(20);
  expect(listRows(withAdvance, e).some(row => row.tcn === withAdvance.tcn && row.status === '00')).toBe(true);
  expect(listRows(without, e).some(row => row.tcn === without.tcn)).toBe(false);
  const rows = listRows(withAdvance, e);
  expect(searchRows(rows, { status: '00', tcn: `%${withAdvance.tcn.slice(6, 14)}%` }).map(row => row.tcn)).toEqual([withAdvance.tcn]);
  expect(searchRows(rows, { status: 'PI', tcn: '' })).toHaveLength(0);
});

test('inchecking another TCN opens nothing and records no mistake; the right one opens a prefilled record', () => {
  const shipment = createShipment({ random: seeded(4), target: 'J', advance: true });
  const e = packed(shipment);
  expect(listRows(shipment, e).some(row => row.tcn.startsWith('E'))).toBe(false);
  const wrong = incheckTcn(shipment, e, listRows(shipment, e).find(row => !row.customer).tcn);
  expect(wrong.cmos.record).toBeNull();
  expect(wrong.mistakes).toHaveLength(0);
  const right = incheckTcn(shipment, e, shipment.tcn);
  expect(right.cmos.record.draft).toMatchObject({ tcn: shipment.tcn, nsn: shipment.nsn, consignee: shipment.dodaac, tac: shipment.tac, consignor: 'FA5030', secClass: 'U', primeDic: 'TX1' });
  expect(right.cmos.record.draft.milMode).toBeUndefined();
  // POE and POD are left for the trainee; they are needed only for Mil Mode 9.
  expect(right.cmos.record.draft.poe).toBeUndefined();
  expect(right.cmos.record.draft.pod).toBeUndefined();
});

test('a New record for a TCN with an advance record is refused as a duplicate, without a mistake', () => {
  const shipment = createShipment({ random: seeded(6), target: 'J', advance: true });
  const e = fillRecord(shipment, newRecord(shipment, packed(shipment)));
  const saved = savePlanning(shipment, e);
  expect(saved.cmos.record.saved).toBe(false);
  expect(saved.cmos.record.feedback).toMatch(/already exists/);
  expect(saved.mistakes).toHaveLength(0);
});

test('saving checks required fields and the Pieces tab, then unlocks the step for the chosen Mil Mode', () => {
  for (const target of ['J', 'B', 'amc-overseas', 'amc-conus']) {
    const shipment = createShipment({ random: seeded(8), target, advance: false, discrepancy: null });
    let e = newRecord(shipment, packed(shipment));
    expect(savePlanning(shipment, e).cmos.record.feedback).toMatch(/^Required/);
    e = fillRecord(shipment, e);
    expect(savePlanning(shipment, editRecord(e, 'milMode', 'X')).cmos.record.errors).toEqual(['milMode']);
    const saved = savePlanning(shipment, e);
    expect(saved.cmos.record.saved).toBe(true);
    expect(saved.milMode).toBe(shipment.targetMode);
    expect(lockedSteps(shipment, saved)[saved.mode]).toBeUndefined();
    expect(canExpressShip(saved)).toBe(target === 'J');
    expect(listRows(shipment, saved).find(row => row.tcn === shipment.tcn)).toMatchObject({ status: 'PI', milMode: shipment.targetMode, pieces: 1 });
  }
});

test('the trainee may choose any Mil Mode; POE, POE DODAAC and POD are required only for Mode 9', () => {
  const shipment = createShipment({ random: seeded(8), target: 'J', advance: false, discrepancy: null });
  const start = newRecord(shipment, packed(shipment));
  const amc = savePlanning(shipment, fillRecord(shipment, start, '9'));
  expect(amc.cmos.record.saved).toBe(true);
  expect(amc.mistakes).toHaveLength(0);
  expect(amc.mode).toBe('amc');
  const noPorts = ['poe', 'poeDodaac', 'pod'].reduce((state, id) => editRecord(state, id, ''), fillRecord(shipment, start, '9'));
  expect(savePlanning(shipment, noPorts).cmos.record.feedback).toBe('Required: POE, POE DODAAC, POD.');
  for (const mode of ['J', '5', 'B']) {
    const saved = savePlanning(shipment, fillRecord(shipment, start, mode));
    expect(saved.cmos.record.saved).toBe(true);
    expect(saved.cmos.record.draft.poe).toBeUndefined();
    expect(saved.milMode).toBe(mode);
  }
  // Fixed-looking entries can be changed too.
  expect(savePlanning(shipment, editRecord(fillRecord(shipment, start), 'typeCargo', 'A')).cmos.record.saved).toBe(true);
});

test('Send Request rates any choices, Cancel clears the rating, and both labels must be on the box to finish', () => {
  const shipment = { ...createShipment({ random: seeded(10), origin: 'travis', target: '5', advance: false, discrepancy: null }), delivery: null };
  let e = savePlanning(shipment, fillRecord(shipment, newRecord(shipment, packed(shipment))));
  expect(e.milMode).toBe('5');
  e = openExpressShip(e);
  expect(sendRequest(shipment, e).spe.feedback).toMatch(/^Required/);
  const fillSpe = (state, service, domInt) => [['scac', 'FDEG'], ['domInt', domInt], ['service', service], ['shipmentDate', '12OCT2026'], ['destCity', 'Hill AFB'], ['package', 'Box']].reduce((next, [id, value]) => editExpress(next, id, value), state);
  // Any service and DOM/INT rate: the trainer guides those choices.
  const rated = sendRequest(shipment, fillSpe(e, 'Priority Overnight', 'INT'));
  expect(rated.spe.rated).toBe(true);
  expect(rated.mistakes).toHaveLength(0);
  expect(rated.spe.result.tracking).toMatch(/^\d{12}$/);
  expect(editExpress(rated, 'service', 'Ground').spe.draft.service).toBe('Priority Overnight');
  expect(closedPackage(shipment, rated)).toMatchObject({ scac: 'FDEG', service: 'Priority Overnight', pieces: 1, weight: shipment.packed.weight });
  expect(shipmentComplete(shipment, rated)).toBe(false);
  expect(applyLabel(rated, 'carrier').labels.carrier).toBeUndefined();
  const labeled = ['msl', 'carrier'].reduce((state, id) => applyLabel(state, id), ['msl', 'carrierLabel'].reduce(markPrinted, rated));
  expect(labeled.labels).toEqual({ msl: true, carrier: true });
  expect(shipmentComplete(shipment, labeled)).toBe(true);
  // Cancel voids the rating and the carrier label; the MSL stays. The entries can change and be re-sent.
  const cancelled = cancelRequest(labeled);
  expect(cancelled.spe.rated).toBe(false);
  expect(cancelled.spe.result).toBeNull();
  expect(cancelled.labels).toEqual({ msl: true });
  expect(cancelled.printed.carrierLabel).toBeUndefined();
  expect(closedPackage(shipment, cancelled)).toBeNull();
  expect(sendRequest(shipment, editExpress(cancelled, 'service', 'Ground')).spe.draft.service).toBe('Ground');
});

test('AMC and surface steps also need the MSL on the box', () => {
  const shipment = createShipment({ random: seeded(8), target: 'amc-overseas', advance: false, discrepancy: null });
  const saved = savePlanning(shipment, fillRecord(shipment, newRecord(shipment, packed(shipment))));
  const accepted = { ...saved, forms: { ...saved.forms, amc: { accepted: true } } };
  expect(stageComplete(shipment, accepted, 'amc')).toBe(false);
  expect(stageComplete(shipment, applyLabel(markPrinted(accepted, 'msl'), 'msl'), 'amc')).toBe(true);
});

test('DOM/INT guidance, CMOS cube rounding and date codes', () => {
  const shipment = createShipment({ random: seeded(12), target: 'J', discrepancy: null });
  expect(usualDomInt({ ...shipment, origin: 'jber', dodaac: 'FA8217' })).toBe('INT');
  expect(usualDomInt({ ...shipment, origin: 'travis', dodaac: 'FA8217' })).toBe('DOM');
  expect(usualDomInt({ ...shipment, origin: 'travis', dodaac: 'FB5294' })).toBe('INT');
  expect(pieceCube({ length: 36, width: 14, height: 9 })).toBe(3);
  expect(validDateCode('12OCT2026')).toBe(true);
  expect(validDateCode('31FEB2026')).toBe(false);
  expect(validDateCode('2026-10-12')).toBe(false);
});

test('DD 1149 TCNs: X in position 11, then 00# or a 500-series number, then XXX', () => {
  const shipments = Array.from({ length: 29 }, (_, i) => createShipment({ random: seeded(i + 1), target: 'J' }));
  shipments.filter(shipment => shipment.document === '1149').forEach(shipment => {
    expect(shipment.tcn).toMatch(/^FA50306285X(00\d|5\d\d)XXX$/);
    expect(shipment.documentNumber).toMatch(/^FB50006285X\d{3}$/);
  });
  shipments.filter(shipment => shipment.document !== '1149').forEach(shipment => expect(shipment.tcn).toBe(`${shipment.documentNumber}XXX`));
  expect(expectedDocType({ ...createShipment({ random: seeded(3), target: 'J' }), document: '1149' })).toBe('N - Non-MILSTRIP');
});

test('a New DD 1149 record saves with any unused 00#/500-series TCN but not a duplicate', () => {
  const shipment = { ...createShipment({ random: seeded(14), origin: 'travis', target: 'J', advance: false, discrepancy: null }), document: '1149' };
  const ready = fillRecord(shipment, newRecord(shipment, packed(shipment)));
  const saved = savePlanning(shipment, editRecord(editRecord(ready, 'tcn', 'FB44276285X003XXX'), 'docType', 'N - Non-MILSTRIP'));
  expect(saved.cmos.record.saved).toBe(true);
  expect(listRows(shipment, saved).some(row => row.tcn === 'FB44276285X003XXX' && row.status === 'PI')).toBe(true);
  const filler = listRows(shipment, ready).find(row => row.tcn.startsWith('FB4427'));
  const duplicate = savePlanning(shipment, editRecord(ready, 'tcn', filler.tcn));
  expect(duplicate.cmos.record.saved).toBe(false);
  expect(duplicate.cmos.record.feedback).toMatch(/already exists/);
});

test('vendor shipments: DD 1149, no DoDAAC (F00000), and an Ultimate Consignee entry needs its Country', () => {
  const vendors = [];
  for (let seed = 1; seed < 200 && vendors.length < 5; seed += 1) {
    const shipment = createShipment({ random: seeded(seed), target: 'J', advance: false, discrepancy: null });
    if (shipment.delivery && !shipment.dodaac) vendors.push(shipment);
  }
  expect(vendors.length).toBe(5);
  for (const shipment of vendors) {
    expect(shipment.document).toBe('1149');
    expect(planningFields(shipment).consignee.expected).toBe('F00000');
    const e = fillRecord(shipment, newRecord(shipment, packed(shipment)));
    expect(savePlanning(shipment, editRecord(e, 'ucCountry', '')).cmos.record.feedback).toMatch(/Required: Ultimate Consignee Country/);
    // Entries are the trainee's: a different consignee or zip still saves.
    expect(savePlanning(shipment, editRecord(editRecord(e, 'consignee', 'FA8217'), 'ucZip', '00000')).cmos.record.saved).toBe(true);
  }
});

test('nothing on the record is graded: changed entries and indicators still save with no mistake', () => {
  const shipment = createShipment({ random: seeded(22), target: 'B', advance: false, discrepancy: null });
  const record = fillRecord(shipment, newRecord(shipment, packed(shipment)));
  const changed = [['nsn', '1560-00-000-0000'], ['tac', 'ZZZZ'], ['tp', '1'], ['hazInd', 'H - Hazardous material'], ['routing', false], ['micap', true]].reduce((state, [id, value]) => editRecord(state, id, value), record);
  const saved = savePlanning(shipment, editPiece(changed, 0, 'weight', '1'));
  expect(saved.cmos.record.saved).toBe(true);
  expect(saved.mistakes).toHaveLength(0);
  expect(listRows(shipment, saved).find(row => row.customer)).toMatchObject({ tac: 'ZZZZ', priority: '1', weight: 1 });
});

test.each(['H - Hazardous material', 'A - Ammunition/explosives', 'O - Other'])(
  'selecting %s enables outbound T-9 and None clears it', indicator => {
    const shipment = createShipment({ random: seeded(6), target: 'J', advance: true });
    const state = incheckTcn(shipment, packed(shipment), shipment.tcn);
    const selected = editRecord(state, 'hazInd', indicator);
    expect(selected.cmos.record.draft).toMatchObject({ hazInd: indicator, t9: true });
    expect(editRecord(selected, 'hazInd', 'N - Non-hazardous').cmos.record.draft.t9).toBe(false);
  }
);

test('new outbound records default Consignor to FA5030 and leave Consignee editable', () => {
  const shipment = createShipment({ random: seeded(8), target: 'J', advance: false });
  const state = newRecord(shipment, packed(shipment));
  expect(state.cmos.record.draft.consignor).toBe('FA5030');
  expect(state.cmos.record.draft.consignee).toBeUndefined();
  expect(editRecord(state, 'consignee', 'FB5294').cmos.record.draft.consignee).toBe('FB5294');
});
