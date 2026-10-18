import { derivePrimeDic } from './primeDic';

test.each([
  [{}, 'TX1'],
  [{ hazmat: 'N - Not hazardous' }, 'TX1'],
  [{ hazmat: 'O - Other hazardous' }, 'TJ1'],
  [{ hazmat: 'A - Ammunition/explosives' }, 'TE1'],
  [{ hazmat: 'E - Explosives' }, 'TE1'],
  [{ weaponsShipment: true }, 'TW1'],
  [{ courierInd: '9' }, 'TC1'],
  [{ courierInd: 'X' }, 'TC1'],
  [{ courierInd: 'N' }, 'TX1'],
  [{ mailShipment: true }, 'TG1'],
  [{ vetInspectableContainer: true }, 'TI1'],
  [{ commoditySH: 'JZ' }, 'TF1'],
  [{ commoditySH: 'TZ' }, 'TH1'],
  [{ consolidationInd: 'Y' }, 'TX4'],
  [{ palId: 'P01' }, 'TX4'],
])('%j builds Prime DIC %s', (draft, dic) => expect(derivePrimeDic(draft)).toBe(dic));
