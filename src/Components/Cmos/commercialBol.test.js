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
  const detail = within(screen.getByRole('dialog', { name: 'Conveyances detail' }));
  expect(detail.getByLabelText('Conveyance Seq Nbr')).toHaveValue('001');
  expect(detail.getByLabelText('Primary Eq Init')).toHaveValue('TRNC');
  userEvent.click(detail.getByRole('button', { name: 'Save and Close' }));
  const panel = within(screen.getByRole('tabpanel', { name: 'Conveyances' }));
  expect(panel.getByRole('button', { name: 'Open conveyance 001' })).toBeInTheDocument();
  expect(panel.getByText('NONE')).toBeInTheDocument();
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
