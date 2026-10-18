import { useState } from 'react';
import { render, screen, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CmosWorkspace from './CmosWorkspace';
import { createCmosStore, createRecord } from './model';
import { CBL_SAMPLES, HAZARDOUS_CERTIFICATION, nextCblNumber } from './cblLogic';

function Harness() {
  const [store, setStore] = useState(() => createRecord(createCmosStore(), 'shipments', { tcn: 'FA50306285X501XXX', origin: 'FA5030', destination: 'FB6501', milMode: 'B', ediMode: 'LT', tac: 'S4CA', hazmat: 'O - Other hazardous' }));
  return <><CmosWorkspace store={store} onChange={setStore} initialPage="cbl" context={{ course: 'outbound', origin: 'FA5030' }} onClose={() => {}} /><pre aria-label="Stored CMOS">{JSON.stringify(store)}</pre></>;
}
const stored = () => JSON.parse(screen.getByLabelText('Stored CMOS').textContent);

test('the list shows past bills newest first and New generates the next movement document number', () => {
  render(<Harness />);
  const links = screen.getAllByRole('button', { name: /^Open bill / });
  expect(links[0]).toHaveTextContent('MKFZ700043');
  expect(screen.getByText(`${CBL_SAMPLES.length} row(s) found.`)).toBeInTheDocument();
  userEvent.click(screen.getByRole('button', { name: 'New', exact: true }));
  expect(screen.getByLabelText('Movement Doc Nbr')).toHaveValue('MKFZ700044');
  expect(screen.getByLabelText('Movement Doc Nbr')).toHaveAttribute('readonly');
  userEvent.click(screen.getByRole('button', { name: 'Close', exact: true }));
  expect(screen.getByRole('button', { name: 'Open bill MKFZ700044' })).toBeInTheDocument();
  expect(nextCblNumber(stored())).toBe('MKFZ700045');
});

test('assigning a TCN carries its addresses and modes onto the bill', () => {
  render(<Harness />);
  userEvent.click(screen.getByRole('button', { name: 'New', exact: true }));
  userEvent.click(screen.getByRole('button', { name: 'Assign TCNs/Aggregates' }));
  const dialog = within(screen.getByRole('dialog', { name: 'Assign TCNs' }));
  userEvent.click(dialog.getByRole('checkbox', { name: 'Assign FA50306285X501XXX' }));
  userEvent.click(dialog.getByRole('button', { name: 'Assign' }));
  userEvent.click(dialog.getByRole('button', { name: 'Close' }));
  const row = within(screen.getByRole('tabpanel', { name: 'TCNs' }));
  expect(row.getByText('FA50306285X501XXX')).toBeInTheDocument();
  expect(row.getByLabelText('Stop LD FA50306285X501XXX')).toHaveValue('00');
  userEvent.click(screen.getByRole('tab', { name: 'Addresses' }));
  expect(screen.getByLabelText('Destination DODAAC')).toHaveValue('FB6501');
  expect(screen.getByLabelText('Destination City')).toHaveValue('CHEYENNE');
  expect(screen.getByLabelText('Consignee State')).toHaveValue('WY');
  expect(screen.getByLabelText('Shipper DODAAC')).toHaveValue('FA5030');
  userEvent.click(screen.getByRole('tab', { name: 'Miscellaneous' }));
  expect(screen.getByLabelText('Mil Mode')).toHaveValue('B');
  expect(screen.getByLabelText('EDI Mode')).toHaveValue('LT');
  expect(screen.getByLabelText('Nbr of CLS/TLS')).toHaveValue('1');
  userEvent.click(screen.getByRole('tab', { name: 'Billing' }));
  expect(screen.getByLabelText('Hazardous Cert')).toHaveValue(HAZARDOUS_CERTIFICATION);
  expect(screen.getByLabelText('Bill To Name')).toHaveValue('US BANK-THIRD PARTY PAYMENT SYSTEM');
  expect(screen.getByText('S4CA')).toBeInTheDocument();
});

test('typing a DODAAC fills its address, and OA charges follow estimated charges', () => {
  render(<Harness />);
  userEvent.click(screen.getByRole('button', { name: 'New', exact: true }));
  userEvent.click(screen.getByRole('tab', { name: 'Addresses' }));
  fireEvent.change(screen.getByLabelText('Origin DODAAC'), { target: { value: 'fb4802' } });
  expect(screen.getByLabelText('Origin DODAAC')).toHaveValue('FB4802');
  expect(screen.getByLabelText('Origin City')).toHaveValue('HOLLOMAN AFB');
  userEvent.click(screen.getByRole('tab', { name: 'Billing' }));
  expect(screen.getByLabelText('Currency')).toHaveValue('USD');
  fireEvent.change(screen.getByLabelText('Est Charges'), { target: { value: '9055.66' } });
  expect(screen.getByLabelText('OA Charges')).toHaveValue('$9,055.66');
  expect(stored().bills['bills-1'].draft.oaCharges).toBe('9055.66');
});

test('new conveyances number themselves and appear in the TCN conveyance choice', () => {
  render(<Harness />);
  userEvent.click(screen.getByRole('button', { name: 'New', exact: true }));
  fireEvent.change(screen.getByLabelText('Assign SCAC'), { target: { value: 'TRNC' } });
  userEvent.click(screen.getByRole('tab', { name: 'Conveyances' }));
  userEvent.click(within(screen.getByRole('tabpanel', { name: 'Conveyances' })).getByRole('button', { name: 'New' }));
  const detail = within(screen.getByRole('dialog', { name: 'Conveyance' }));
  expect(detail.getByLabelText('Conveyance Seq Nbr')).toHaveValue('001');
  expect(detail.getByLabelText('Primary Eq Init')).toHaveValue('TRNC');
  // Required fields block the save.
  userEvent.click(detail.getByRole('button', { name: 'Save and Close' }));
  expect(detail.getByRole('alert')).toHaveTextContent('Primary Eq Nbr is required. Equip Type Ordered is required. Equip Type Furnished is required.');
  fireEvent.change(detail.getByLabelText('Primary Eq Nbr'), { target: { value: 'none' } });
  fireEvent.change(detail.getByLabelText('Equip Type Ordered'), { target: { value: 'qq' } });
  fireEvent.change(detail.getByLabelText('Equip Type Furnished'), { target: { value: 'QQ' } });
  expect(within(detail.getByLabelText('Seals Applied By')).getAllByRole('option').map(o => o.textContent)).toEqual(['', 'SH  - Shipper', 'CA  - Carrier']);
  userEvent.selectOptions(detail.getByLabelText('Seals Applied By'), 'SH');
  fireEvent.change(detail.getByLabelText('Seal Number 1'), { target: { value: 's123' } });
  // Add saves and starts the next conveyance.
  userEvent.click(detail.getByRole('button', { name: 'Add' }));
  expect(detail.getByLabelText('Conveyance Seq Nbr')).toHaveValue('002');
  expect(detail.getByLabelText('Primary Eq Nbr')).toHaveValue('');
  userEvent.click(detail.getByRole('button', { name: 'Close' }));
  const panel = within(screen.getByRole('tabpanel', { name: 'Conveyances' }));
  const row = panel.getByRole('button', { name: 'Open conveyance 001' }).closest('tr');
  expect(row).toHaveTextContent('001TRNCNONENONENONEQQQQYes');
  userEvent.click(panel.getByRole('button', { name: 'Open conveyance 001' }));
  const reopened = within(screen.getByRole('dialog', { name: 'Conveyance' }));
  expect(reopened.getByLabelText('Seal Number 1')).toHaveValue('S123');
  expect(reopened.getByLabelText('Seals Applied By')).toHaveValue('SH');
});

test('DTR codes drive service agency, reason, GBLOC, and RIN entries', () => {
  render(<Harness />);
  userEvent.click(screen.getByRole('button', { name: 'New', exact: true }));
  userEvent.click(screen.getByRole('tab', { name: 'Addresses' }));
  fireEvent.change(screen.getByLabelText('Consignee DODAAC'), { target: { value: 'FB6181' } });
  expect(screen.getByLabelText('GBLOC')).toHaveValue('AAFL');
  userEvent.click(screen.getByRole('tab', { name: 'Miscellaneous' }));
  expect(within(screen.getByLabelText('Service Agency')).getByRole('option', { name: 'P - Coast Guard' })).toBeInTheDocument();
  userEvent.selectOptions(screen.getByLabelText('Reason'), 'N4');
  expect(screen.getByLabelText('Reason')).toHaveDisplayValue('N4 - Traffic Distribution');
  userEvent.click(screen.getByRole('tab', { name: 'RINs' }));
  userEvent.click(within(screen.getByRole('tabpanel', { name: 'RINs' })).getByRole('button', { name: 'New' }));
  const rin = within(screen.getByRole('dialog', { name: 'BOL RIN' }));
  expect(rin.getAllByRole('option')).toHaveLength(141);
  expect(rin.getByRole('button', { name: 'Save' })).toBeDisabled();
  userEvent.selectOptions(rin.getByLabelText('RIN Nbr'), '102');
  expect(rin.getByLabelText('RIN Text')).toHaveValue('Annotate BL: "Security escort vehicle service requested."');
  expect(rin.getByLabelText('RIN Text')).toHaveAttribute('readonly');
  expect(rin.getByLabelText('Type RIN')).toHaveAttribute('readonly');
  userEvent.click(rin.getByLabelText('Print RIN'));
  userEvent.click(rin.getByRole('button', { name: 'Save' }));
  const panel = within(screen.getByRole('tabpanel', { name: 'RINs' }));
  expect(panel.getByText('Annotate BL: "Security escort vehicle service requested."')).toBeInTheDocument();
  expect(panel.getByText('Y')).toBeInTheDocument();
  userEvent.click(panel.getByRole('button', { name: 'New' }));
  const next = within(screen.getByRole('dialog', { name: 'BOL RIN' }));
  expect(next.queryByRole('option', { name: /^102 - / })).not.toBeInTheDocument();
  expect(next.getByRole('option', { name: /^101 - CMOS BL only/ })).toBeInTheDocument();
  userEvent.click(next.getByRole('button', { name: 'Close' }));
  userEvent.click(panel.getByRole('button', { name: 'Open RIN 102' }));
  const existing = within(screen.getByRole('dialog', { name: 'BOL RIN' }));
  expect(existing.getByLabelText('RIN Nbr')).toHaveValue('102');
  expect(existing.getByLabelText('Print RIN')).toBeChecked();
});

test('new bills default the complete consignor blocks to FA5030', () => {
  render(<Harness />);
  userEvent.click(screen.getByRole('button', { name: 'New', exact: true }));
  userEvent.click(screen.getByRole('tab', { name: 'Addresses' }));
  for (const prefix of ['Origin', 'Shipper']) {
    for (const [field, value] of [['DODAAC', 'FA5030'], ['Name', '773 LRS LGRT'], ['Address 1', 'GPC ONLY SHIP TO'], ['Address 2', '5257 FINLETTER AVE'], ['City', 'JBER'], ['State', 'AK'], ['Zip', '99506'], ['Country', 'US']]) {
      expect(screen.getByLabelText(`${prefix} ${field}`)).toHaveValue(value);
    }
  }
  expect(screen.getByLabelText('Consignee DODAAC')).toHaveValue('');
});

test('Air Service Type and Level use the same codes as Route Orders', () => {
  render(<Harness />);
  userEvent.click(screen.getByRole('button', { name: 'New', exact: true }));
  const options = (label) => within(screen.getByLabelText(label)).getAllByRole('option').map((o) => o.textContent).filter(Boolean);
  expect(options('Air Service Type')).toEqual(['AA - AIRPORT TO AIRPORT', 'DA - DOOR TO AIRPORT OF DEBARKATION', 'DD - DOOR TO DOOR', 'AD - AIRPORT TO DOOR']);
  expect(options('Air Service Level')).toEqual(['SG - PRIORITY', 'D1 - OVERNIGHT', 'D2 - SECOND DAY', 'D3 - DEFERRED']);
});

test('Commodities, Service Codes, Via SCAC and Rail tabs match CMOS', () => {
  let store = createCmosStore();
  store = createRecord(store, 'bills', { movementDocNbr: 'MKFZ700046', nmfcUfc: '114215', nmfcSub: '0', milMode: 'B', serviceCodes: [{ code: 'AIR', type: 'ACC', desc: '', stop: '99', performDate: '16Oct2026', charges: 0 }] });
  function BillHarness() {
    const [state, setState] = useState(store);
    return <CmosWorkspace store={state} onChange={setState} initialPage="cbl" context={{ course: 'outbound', origin: 'FA5030' }} onClose={() => {}} />;
  }
  render(<BillHarness />);
  userEvent.click(screen.getByRole('button', { name: /MKFZ700046/ }));
  const panel = () => within(screen.getByRole('tabpanel'));
  userEvent.click(screen.getByRole('tab', { name: 'Commodities' }));
  for (const column of ['NMFC/UFC', 'Released Value', 'Qualifier']) expect(panel().getByRole('columnheader', { name: column })).toBeInTheDocument();
  expect(panel().getByLabelText('Commodity NMFC/UFC')).toHaveValue('114215');
  expect(panel().getByLabelText('Commodity NMFC/UFC')).toHaveAttribute('readonly');
  userEvent.click(screen.getByRole('tab', { name: 'Service Codes' }));
  for (const column of ['Svc Code', 'Svc Code Type', 'Perform Date', 'Special Charge Desc', 'Stop', 'Cnv Seq Nbr', 'Service Charges']) expect(panel().getByRole('columnheader', { name: column })).toBeInTheDocument();
  expect(panel().getByRole('row', { name: 'AIR ACC 16Oct2026 99 $.00' })).toBeInTheDocument();
  userEvent.click(screen.getByRole('tab', { name: 'Via SCAC' }));
  for (const column of ['Seq Code', 'SCAC', 'SPLC']) expect(panel().getByRole('columnheader', { name: column })).toBeInTheDocument();
  expect(panel().getByText('0 row(s) found.')).toBeInTheDocument();
  userEvent.click(screen.getByRole('tab', { name: 'Rail' }));
  for (const label of ['Origin DODAAC', 'Origin Name', 'Origin SPLC', 'Destination Address 2', 'Destination Zip', 'Empty Rail Car Name', 'Empty Rail Car State'])
    expect(panel().getByLabelText(label)).not.toHaveAttribute('readonly');
  for (const name of ['Origin DODAAC', 'Origin SPLC', 'Origin Country', 'Origin State', 'Destination DODAAC', 'Empty Rail Car Country', 'Empty Rail Car State'])
    expect(panel().getByRole('button', { name: `Look up ${name}` })).toBeInTheDocument();
  expect(panel().getByRole('group', { name: 'Empty Rail Car' })).toBeInTheDocument();
  // Picking a DODAAC fills its address and SPLC.
  userEvent.click(panel().getByRole('button', { name: 'Look up Origin DODAAC' }));
  userEvent.click(screen.getByRole('radio', { name: 'Select FA5030' }));
  userEvent.click(within(screen.getByRole('dialog', { name: /lookup/i })).getByRole('button', { name: 'Select' }));
  expect(panel().getByLabelText('Origin DODAAC')).toHaveValue('FA5030');
  expect(panel().getByLabelText('Origin City')).not.toHaveValue('');
  expect(panel().getByLabelText('Origin SPLC').value).toMatch(/^\d{9}$/);
  // Service Codes New adds a code from the Service Code Lookup.
  userEvent.click(screen.getByRole('tab', { name: 'Service Codes' }));
  userEvent.click(panel().getByRole('button', { name: 'New' }));
  const form = within(screen.getByRole('dialog', { name: 'Service Code' }));
  fireEvent.change(form.getByLabelText('Service Code'), { target: { value: 'CIS' } });
  expect(form.getByLabelText('Svc Code Type')).toHaveValue('TPS');
  userEvent.selectOptions(form.getByLabelText('Stop'), '99');
  userEvent.click(form.getByRole('button', { name: 'Save' }));
  expect(panel().getByRole('row', { name: /^CIS TPS/ })).toBeInTheDocument();
});

test('a released (closed) bill shows Service Codes and Rail read-only', () => {
  let store = createRecord(createCmosStore(), 'bills', { movementDocNbr: 'MKFZ700047', milMode: 'B' });
  store = { ...store, bills: { ...store.bills, 'bills-1': { ...store.bills['bills-1'], status: 'Released' } } };
  function BillHarness() {
    const [state, setState] = useState(store);
    return <CmosWorkspace store={state} onChange={setState} initialPage="cbl" context={{ course: 'outbound', origin: 'FA5030' }} onClose={() => {}} />;
  }
  render(<BillHarness />);
  userEvent.click(screen.getByRole('button', { name: /MKFZ700047/ }));
  const panel = () => within(screen.getByRole('tabpanel'));
  userEvent.click(screen.getByRole('tab', { name: 'Service Codes' }));
  expect(panel().queryByRole('button', { name: 'New' })).not.toBeInTheDocument();
  userEvent.click(screen.getByRole('tab', { name: 'Rail' }));
  expect(panel().getByLabelText('Origin DODAAC')).toHaveAttribute('readonly');
  expect(panel().queryByRole('button', { name: 'Look up Origin DODAAC' })).not.toBeInTheDocument();
});

test('SPLC is optional and its lookup only offers DODAACs in the system', () => {
  const { splcFor } = require('./routingRequest');
  expect(splcFor('FB4497')).toMatch(/^\d{9}$/);
  expect(splcFor('ZZ9999')).toBe('');
  render(<Harness />);
  userEvent.click(screen.getByRole('button', { name: 'New', exact: true }));
  userEvent.click(screen.getByRole('tab', { name: 'Addresses' }));
  expect(document.querySelector('[data-field="destinationSplc"] .shared-required-mark')).toBeNull();
  expect(screen.getByText('SPLC', { selector: '[data-field="destinationSplc"] span' })).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Destination DODAAC'), { target: { value: 'FB4497' } });
  expect(screen.getByLabelText('Destination SPLC')).toHaveValue(splcFor('FB4497'));
  userEvent.click(screen.getByRole('button', { name: 'Look up Destination SPLC' }));
  expect(screen.getByRole('dialog', { name: /SPLC lookup/i })).toHaveTextContent('FB4497');
});
