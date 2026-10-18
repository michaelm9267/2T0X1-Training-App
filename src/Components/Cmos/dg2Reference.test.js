import { dg2Defaults, applyDg2Template, unMatches, emergencyContactsFor } from './dg2Reference';

test('new DG2 declarations use the JBER address without replacing existing shipper details', () => {
  expect(dg2Defaults().page2).toMatchObject({ shipper: 'FA5030 773 LRS LGRT', address1: 'GPC ONLY SHIP TO', address2: '5257 FINLETTER AVE', city: 'JBER', country: 'US', state: 'AK', zip: '99506' });
  expect(dg2Defaults({ page2: { shipper: 'CUSTOM SHIPPER', address1: '' } }).page2).toMatchObject({ shipper: 'CUSTOM SHIPPER', address1: '', city: 'JBER' });
});

test('UN selection fills AFMAN identification and packaging fields while retaining shipment quantities', () => {
  const [gasoline] = unMatches('1203');
  const result = applyDg2Template({ page2: { metricQty: '15', packagingUnits: '2', address1: 'CUSTOM ADDRESS' } }, gasoline);
  expect(result.page2).toMatchObject({ unId: 'UN1203', division: '3', packingGroup: 'II', packingPara: 'A7.2.', specialProvisions: 'P5, 144, 177', metricQty: '15', packagingUnits: '2', address1: 'CUSTOM ADDRESS' });
  expect(result.page2.properShippingName).toMatch(/GASOLINE/);
});

test('UN variants keep their own hazard classification and forbidden entries are identified', () => {
  const aerosols = unMatches('UN1950');
  expect(aerosols.some(x => x.division === '2.1')).toBe(true);
  expect(aerosols.some(x => x.division === '2.2')).toBe(true);
  expect(aerosols.some(x => x.forbidden)).toBe(true);
  const flammable = aerosols.find(x => x.division === '2.1' && !x.subsidiary && !x.forbidden);
  const result = applyDg2Template({ page2: { subsidiary: '8', packingGroup: 'I', metricQty: '4' } }, flammable);
  expect(result.page2).toMatchObject({ subsidiary: '', packingGroup: 'N/A', metricQty: '4', packingPara: 'A6.2.' });
});

test('emergency contacts follow AFMAN hazard categories without classifying infectious substances as warfare materials', () => {
  expect(emergencyContactsFor({ division: '1.4S' })[0]).toMatchObject({ category: 'class1', number: '+1 (703) 695-4695 / +1 (703) 695-4696' });
  expect(emergencyContactsFor({ division: '7' })[0]).toMatchObject({ category: 'radioactive', agency: 'Air Force', number: '+1 (202) 767-4011' });
  expect(emergencyContactsFor({ division: '6.2' })[0]).toMatchObject({ category: 'other', number: '1-800-851-8061; +1-804-279-3131' });
});

test('different shipping names sharing a UN number require an explicit variant choice', () => {
  const { unAutofill } = require('./dg2Reference');
  expect(unMatches('UN3171').some(r => /VEHICLE/.test(r.name))).toBe(true);
  expect(unMatches('UN3171').some(r => /EQUIPMENT/.test(r.name))).toBe(true);
  expect(unAutofill('UN3171')).toBeNull();
});

test('changing UN clears the old template, flags and contact while retaining shipment measurements', () => {
  const { clearDg2Un } = require('./dg2Reference');
  const next = clearDg2Un({ templateId: 'UN2910', referencePage: 201, page1: { 'Radioactive Material': true, Waste: true }, page2: { unId: 'UN2910', division: '7', emergencyContact: '+1 (202) 767-4011', metricQty: '12' } }, 'UN1950');
  expect(next).toMatchObject({ templateId: '', referencePage: null, page1: { 'Radioactive Material': false, Waste: true }, page2: { unId: 'UN1950', division: '', emergencyContact: '', metricQty: '12' } });
});

test('DG2 defaults the shipper phone while preserving a phone entered by the user', () => {
  expect(dg2Defaults().page2.phone).toBe('9075522131');
  expect(dg2Defaults({ page2: { phone: '907-555-0100' } }).page2.phone).toBe('907-555-0100');
});
