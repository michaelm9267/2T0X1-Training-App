import { LOWER_48_DODAACS, OCONUS_DODAACS, ALASKA_DODAACS, TABLE_APODS, TABLE_APOES } from './dodaacs';
import { DODAAC_TABLE } from './dodaacTable';
import { APOD_PORTS, APOE_PORTS, consignee, isOverseas } from './outboundData';
import { lookupValues } from '../Cmos/controls';
import { TERMINALS } from '../Cmos/airScheduleLogic';

test('every populated DoDAAC in the CMOS table is in a DoDAAC list', () => {
  const all = { ...LOWER_48_DODAACS, ...OCONUS_DODAACS, ...ALASKA_DODAACS };
  expect(DODAAC_TABLE.length).toBe(260);
  expect(DODAAC_TABLE.every(([code]) => all[code])).toBe(true);
  expect(LOWER_48_DODAACS.FB2835).toMatchObject({ unit: '66 LRS LGRDDC', city: 'HANSCOM AFB, MA 01731-3000' });
  expect(OCONUS_DODAACS.FB5621).toMatchObject({ unit: '52 FW LGTT', port: 'RMS' });
  expect(OCONUS_DODAACS.FB5284).toMatchObject({ port: 'KUZ', apoe: 'TIK' });
  expect(isOverseas('FB5682')).toBe(true);
  // No APOD on file: the address is known, but it is not an AMC destination.
  expect(consignee('FB5807')).toMatchObject({ unit: 'CENTRAL RECEIVING POINT' });
  expect(isOverseas('FB5807')).toBe(false);
});

test('the table APOEs and APODs are in the POE and POD lists and the terminal lookup', () => {
  expect(TABLE_APOES.every(p => APOE_PORTS.includes(p))).toBe(true);
  expect(TABLE_APODS.every(p => APOD_PORTS.includes(p))).toBe(true);
  expect(APOE_PORTS).toEqual(expect.arrayContaining(['EDF', 'TIK', 'DOV', 'CHS']));
  expect(APOD_PORTS).toEqual(expect.arrayContaining(['ADA', 'AVB', 'IUD', 'TCM', 'SUU']));
  expect(lookupValues({ id: 'poe' }).map(([code]) => code)).toEqual(expect.arrayContaining(['TIK', 'WRI']));
  expect(lookupValues({ id: 'pod' }).map(([code]) => code)).toEqual(expect.arrayContaining(['ADA', 'NKW']));
  expect(TERMINALS.find(t => t[1] === 'ADA')).toEqual(['INCIRLIK AB', 'ADA', 'A', 'Y']);
  expect(lookupValues({ id: 'destination' }).length).toBeGreaterThan(250);
});
