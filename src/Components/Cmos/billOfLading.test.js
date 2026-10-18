import { render, screen } from '@testing-library/react';
import BillOfLadingDocument, { bolDate } from './BillOfLadingDocument';

const doc = (snapshot, extra = {}) => ({
  ownerId: 'bills-1', variant: 'Final', issuedAt: '2026-10-18T12:00:00Z', snapshot,
  shipmentSnapshots: [{ id: 's1', tcn: 'FA50306285X501XXX', description: 'Radio terminal', nsn: '5820200063421', tac: 'A42U', totals: { pieces: 1, weight: 2588, cube: 325 } }],
  pieceSnapshots: [{ id: 'p1', shipmentId: 's1', weight: '2588', length: '100', width: '79', height: '71', typePack: 'PT' }],
  totals: { pieces: 1, weight: 2588, cube: 325 }, details: [], ...extra,
});

test('Billing tab fields print in their places on the Commercial Bill of Lading', () => {
  render(<BillOfLadingDocument store={{}} d={doc({
    movementDocNbr: 'MKFZ700043', scac: 'TRNA', billType: 'TP - Third Party Pays', billTo: 'USBANK', billToName: 'US BANK-THIRD PARTY PAYMENT SYSTEM',
    carrierAcctNbr: 'ACCT1', nmfcUfc: '999912', nmfcSub: '0', currency: 'USD', estimatedCharges: '8155.40',
    tariffSpecialRateAuth: 'TRNA3157200 - B 09May2026 20Aug2027', releaseValue: '1000', hazardousCert: 'Haz cert text',
    certifyingPerson: 'Duck Duck Goose', remarks1: 'Hellow', remarks: 'Boob', marksAnnotations: 'Test M&A', descOfArtMiscRemarks: 'Desc remarks',
  }, { printOptions: { estimatedPickupDate: '23Oct2026', customs: 'No' } })} />);
  const box = (label) => screen.getByText(label, { selector: '.bol-label' }).closest('.bol-box');
  expect(box('CARRIER ACCOUNT')).toHaveTextContent('ACCT1');
  expect(box('TARIFF/SPECIAL RATE AUTHORITY')).toHaveTextContent('TRNA3157200');
  expect(box('TARIFF/SPECIAL RATE AUTHORITY')).not.toHaveTextContent('09May2026');
  expect(box('ESTIMATE')).toHaveTextContent('8155.40 USD');
  expect(box('BILL CHARGES TO (Dep/agency,bureau/office mail address & ZIP code)')).toHaveTextContent('Third Party');
  expect(box('ISSUING OFFICER AND OFFICE (Issuing officer name, office, and complete address)')).toHaveTextContent('TRAFFIC MANAGEMENT OFFICER');
  expect(box('ISSUING OFFICER AND OFFICE (Issuing officer name, office, and complete address)')).not.toHaveTextContent('DUCK');
  expect(screen.getByText('CERTIFIER: DUCK DUCK GOOSE')).toBeInTheDocument();
  expect(box('ISSUING OFFICER AND OFFICE (Issuing officer name, office, and complete address)')).toHaveTextContent('FA5030 773 LRS LGRN8517 20TH ST5257 GIBSONJBER, AK 995062401');
  expect(screen.getAllByText('ISSUING OFFICE', { selector: '.bol-label' })[0].closest('.bol-box')).toHaveTextContent('JBER, AK 995062401 US');
  expect(box('DATED')).toHaveTextContent('2026-10-18');
  expect(box("CARRIER'S PICKUP DATE")).toHaveTextContent('23-OCT-2026');
  expect(screen.getByText(/CLASSIFICATION ITEM NO/).closest('td')).toHaveTextContent('N-9999120');
  expect(screen.getByText('DESC REMARKS')).toBeInTheDocument();
  expect(screen.getByText('RELEASED VALUE: 1000')).toBeInTheDocument();
  expect(screen.getAllByText('TEST M&A')).toHaveLength(2);
  expect(screen.getByText('HELLOW')).toBeInTheDocument();
  expect(screen.getByText('BOOB')).toBeInTheDocument();
  expect(screen.getByText('HAZ CERT TEXT')).toBeInTheDocument();
  expect(document.querySelectorAll('.bol-page')).toHaveLength(3);
  expect(screen.getByText(/This CBL consists of 3 page\(s\)/)).toBeInTheDocument();
  expect(screen.getByText(/PIECE DATA: PC 1 Dim: 100L x 79W x 71H/)).toBeInTheDocument();
  expect(bolDate('23Oct2026')).toBe('23-OCT-2026');
});

test('accessorial service codes print as marks and annotations rows on the continuation sheet', () => {
  render(<BillOfLadingDocument store={{}} d={doc({
    movementDocNbr: 'MKFZ700036', scac: 'LTIA', nmfcUfc: '190450', serviceCodes: [
      { code: 'HOL', type: 'DR', desc: 'Sunday or holiday pick-up or delivery', stop: '1', cnvSeqNbr: '1', charges: 0 },
      { code: 'HOL', type: 'TH', desc: 'Sunday or holiday pick-up or delivery', stop: '1', cnvSeqNbr: '1', charges: 0 },
    ],
  })} />);
  expect(screen.getAllByText('001/NONE/LTIA HOL')).toHaveLength(2);
  expect(screen.getByText('DR SUNDAY OR HOLIDAY PICK-UP OR DELIVERY')).toBeInTheDocument();
  expect(screen.queryByText(/^CERTIFIER:/)).not.toBeInTheDocument();
});

test('main BOL prints marks in the reference marks block and avoids repeating an address DODAAC', () => {
  render(<BillOfLadingDocument store={{}} d={doc({
    movementDocNbr: 'MKFZ700044', marksAnnotations: 'Deliver at receiving dock',
    shipperDodaac: 'FA5030', shipperName: 'FA5030 773 LRS LGRT',
    shipperAddress1: 'GPC ONLY SHIP TO', shipperAddress2: '5257 FINLETTER AVE',
  })} />);
  const main = document.querySelector('.bol-main');
  expect(main.querySelector('.bol-marks')).toHaveTextContent('DELIVER AT RECEIVING DOCK');
  expect(main).toHaveTextContent('FA5030 773 LRS LGRT');
  expect(main).not.toHaveTextContent('FA5030 FA5030');
});

test('item continuation pages hold two shipments and carry the bill issue date', () => {
  const shipments = Array.from({ length: 5 }, (_, i) => ({ id: `s${i}`, tcn: `TCN-${i}`, description: `Cargo ${i}`, totals: { pieces: 1, weight: 100, cube: 2 } }));
  render(<BillOfLadingDocument store={{}} d={doc({ movementDocNbr: 'MKFZ700044' }, {
    shipmentSnapshots: shipments, pieceSnapshots: [], printOptions: { estimatedPickupDate: '23Oct2026' },
  })} />);
  const pages = [...document.querySelectorAll('.bol-page')];
  expect(pages).toHaveLength(5);
  expect(pages[2]).toHaveTextContent('TCN-0');
  expect(pages[2]).toHaveTextContent('TCN-1');
  expect(pages[2]).not.toHaveTextContent('TCN-2');
  expect(pages[4]).toHaveTextContent('TCN-4');
  for (const page of pages.slice(1)) expect(page.querySelector('.bol-cont-meta')).toHaveTextContent('18-OCT-2026');
});
