// JBER shipping consignor supplied for training paperwork and CMOS records.
export const JBER_CONSIGNOR = {
  dodaac: 'FA5030', unit: '773 LRS LGRT',
  address1: 'GPC ONLY SHIP TO', address2: '5257 FINLETTER AVE',
  city: 'JBER', state: 'AK', zip: '99506', country: 'US',
  phone: '9075522131', port: 'EDF',
};
export const JBER_CITY_LINE = `${JBER_CONSIGNOR.city}, ${JBER_CONSIGNOR.state} ${JBER_CONSIGNOR.zip}`;
// The issuing transportation office printed on JBER bills of lading.
export const JBER_ISSUING_OFFICE = {
  dodaac: 'FA5030', unit: '773 LRS LGRN', officer: 'TRAFFIC MANAGEMENT OFFICER', lines: ['8517 20TH ST', '5257 GIBSON'],
  city: 'JBER', state: 'AK', zip: '995062401', country: 'US',
};
