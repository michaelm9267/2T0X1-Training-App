import { useState } from 'react';
import { render, screen, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CmosWorkspace from './CmosWorkspace';
import { createCmosStore, createRecord } from './model';

function Harness() {
  const [store, setStore] = useState(() => createRecord(createCmosStore(), 'shipments', { tcn: 'DG2-TCN', hazmat: 'O - Other hazardous' }));
  return <CmosWorkspace store={store} onChange={setStore} onClose={() => {}} />;
}
function openHazard() {
  render(<Harness />);
  userEvent.click(screen.getByRole('button', { name: 'Open TCN DG2-TCN' }));
  userEvent.click(screen.getByRole('tab', { name: 'DG2', exact: true }));
  userEvent.click(within(screen.getByRole('tabpanel', { name: 'DG2' })).getByRole('button', { name: 'New', exact: true }));
  return within(screen.getByRole('dialog', { name: 'Hazardous TCN' }));
}
test('DG2 uses the JBER shipper default and typing a UN number fills its AFMAN data', () => {
  let dg = openHazard();
  userEvent.click(dg.getByRole('tab', { name: 'Page 2' }));
  expect(dg.getByLabelText('Shipper Name')).toHaveValue('FA5030 773 LRS LGRT');
  expect(dg.getByLabelText('Address 1')).toHaveValue('GPC ONLY SHIP TO');
  expect(dg.getByLabelText('Address 2')).toHaveValue('5257 FINLETTER AVE');
  expect(dg.getByLabelText('Base/City')).toHaveValue('JBER');
  expect(dg.getByLabelText('Zip')).toHaveValue('99506');
  fireEvent.change(dg.getByLabelText('Metric Hazmat Qty/UOM'), { target: { value: '15' } });
  fireEvent.change(dg.getByLabelText('UN/NA ID Nbr'), { target: { value: 'un1001' } });
  expect(dg.getByLabelText('UN Class/Div Nbr')).toHaveValue('2.1');
  expect(dg.getByLabelText('Packaging Para')).toHaveValue('A6.9.');
  expect(dg.getByLabelText('Spec Provisions')).toHaveValue('P4, N86, N88');
  expect(dg.getByLabelText('Metric Hazmat Qty/UOM')).toHaveValue('15');
  userEvent.click(dg.getByRole('button', { name: 'Save and Close' }));
  const panel = within(screen.getByRole('tabpanel', { name: 'DG2' }));
  expect(panel.getByText(/ACETYLENE/)).toBeInTheDocument();
  userEvent.click(panel.getByRole('button', { name: 'Edit hazards-1' }));
  dg = within(screen.getByRole('dialog', { name: 'Hazardous TCN' }));
  userEvent.click(dg.getByRole('tab', { name: 'Page 2' }));
  expect(dg.getByLabelText('Metric Hazmat Qty/UOM')).toHaveValue('15');
});
test('emergency lookup lists AFMAN contacts by hazard and saves the selected contact only', () => {
  const dg = openHazard();
  userEvent.click(dg.getByRole('tab', { name: 'Page 2' }));
  fireEvent.change(dg.getByLabelText('UN Class/Div Nbr'), { target: { value: '1.4S' } });
  userEvent.click(dg.getByRole('button', { name: 'Look up Emergency Contact' }));
  const lookup = within(screen.getByRole('dialog', { name: 'Emergency Contact lookup' }));
  expect(lookup.getByText('Army Operations Center — Watch Desk')).toBeInTheDocument();
  userEvent.click(lookup.getByRole('radio', { name: 'Select class1' }));
  userEvent.click(lookup.getByRole('button', { name: 'Select', exact: true }));
  expect(dg.getByLabelText('Emergency Contact')).toHaveValue('+1 (703) 695-4695 / +1 (703) 695-4696');
  expect(dg.getByLabelText('Shipper Name')).toHaveValue('FA5030 773 LRS LGRT');
});
test('UN lookup selects a specific variant instead of guessing the class for aerosols', () => {
  const dg = openHazard();
  userEvent.click(dg.getByRole('tab', { name: 'Page 2' }));
  fireEvent.change(dg.getByLabelText('UN/NA ID Nbr'), { target: { value: 'UN1950' } });
  expect(dg.getByLabelText('UN Class/Div Nbr')).toHaveValue('');
  userEvent.click(dg.getByRole('button', { name: 'Look up UN/NA ID Nbr' }));
  const lookup = within(screen.getByRole('dialog', { name: 'UN number lookup' }));
  fireEvent.change(lookup.getByLabelText('Lookup search'), { target: { value: 'UN1950' } });
  const row = lookup.getAllByRole('row').find(r => /2\.1/.test(r.textContent) && !/FORBIDDEN/.test(r.textContent));
  userEvent.click(within(row).getByRole('radio'));
  userEvent.click(lookup.getByRole('button', { name: 'Select', exact: true }));
  expect(dg.getByLabelText('UN Class/Div Nbr')).toHaveValue('2.1');
  expect(dg.getByLabelText('Packaging Para')).toHaveValue('A6.2.');
});

test('DG2 grid copies and deletes individual records and prints the saved declaration details', () => {
  let dg = openHazard();
  fireEvent.change(dg.getByLabelText('Piece'), { target: { value: '1' } });
  fireEvent.change(dg.getByLabelText('Enter Name and Title'), { target: { value: 'TEST CERTIFIER, HAZ' } });
  userEvent.click(dg.getByRole('tab', { name: 'Page 2' }));
  fireEvent.change(dg.getByLabelText('UN/NA ID Nbr'), { target: { value: 'UN1001' } });
  userEvent.click(dg.getByRole('button', { name: 'Save and Close' }));
  let panel = within(screen.getByRole('tabpanel', { name: 'DG2' }));
  userEvent.click(panel.getByRole('button', { name: 'Copy', exact: true }));
  dg = within(screen.getByRole('dialog', { name: 'Hazardous TCN' }));
  userEvent.click(dg.getByRole('tab', { name: 'Page 2' }));
  expect(dg.getByLabelText('UN/NA ID Nbr')).toHaveValue('UN1001');
  userEvent.click(dg.getByRole('button', { name: 'Save and Close' }));
  panel = within(screen.getByRole('tabpanel', { name: 'DG2' }));
  expect(panel.getByText('2 row(s) found.')).toBeInTheDocument();
  userEvent.click(panel.getByRole('button', { name: 'Delete', exact: true }));
  userEvent.click(within(screen.getByRole('dialog', { name: 'Delete DG2 record?' })).getByRole('button', { name: 'Confirm' }));
  expect(panel.getByText('1 row(s) found.')).toBeInTheDocument();
  userEvent.click(panel.getByRole('radio', { name: 'Select DG2 hazards-1' }));
  userEvent.click(panel.getByRole('button', { name: 'Print DG' }));
  const document = within(screen.getByRole('dialog', { name: 'DG2 Dangerous Goods Declaration' }));
  expect(document.getByText('ACETYLENE, DISSOLVED')).toBeInTheDocument();
  expect(document.getByText('FA5030 773 LRS LGRT')).toBeInTheDocument();
});

test('Page 2 quantity magnifiers show separate hazard UOM lists and save their selected units', () => {
  let dg = openHazard();
  userEvent.click(dg.getByRole('tab', { name: 'Page 2' }));
  expect(dg.getByLabelText('Phone Nbr')).toHaveValue('9075522131');
  fireEvent.change(dg.getByLabelText('B/L Hazmat Qty/UOM'), { target: { value: '25' } });
  fireEvent.change(dg.getByLabelText('Metric Hazmat Qty/UOM'), { target: { value: '12' } });
  userEvent.click(dg.getByRole('button', { name: 'Look up B/L UOM' }));
  let lookup = within(screen.getByRole('dialog', { name: 'Hazard UOM Lookup' }));
  expect(lookup.getAllByRole('row')).toHaveLength(23);
  expect(lookup.getByRole('row', { name: '20 20 Foot Container' })).toBeInTheDocument();
  expect(lookup.queryByRole('row', { name: 'KG Kilogram' })).not.toBeInTheDocument();
  userEvent.click(lookup.getByRole('row', { name: 'PN Pounds Net' }));
  userEvent.click(lookup.getByRole('button', { name: 'Select', exact: true }));
  expect(dg.getByLabelText('B/L UOM')).toHaveValue('PN');
  expect(dg.getByLabelText('B/L Hazmat Qty/UOM')).toHaveValue('25');
  userEvent.click(dg.getByRole('button', { name: 'Look up Metric UOM' }));
  lookup = within(screen.getByRole('dialog', { name: 'Hazard UOM Lookup' }));
  expect(lookup.getAllByRole('row')).toHaveLength(24);
  expect(lookup.queryByRole('row', { name: 'PN Pounds Net' })).not.toBeInTheDocument();
  userEvent.click(lookup.getByRole('row', { name: 'KG Kilogram' }));
  userEvent.click(lookup.getByRole('button', { name: 'Select', exact: true }));
  expect(dg.getByLabelText('Metric UOM')).toHaveValue('KG');
  expect(dg.getByLabelText('Metric Hazmat Qty/UOM')).toHaveValue('12');
  userEvent.click(dg.getByRole('button', { name: 'Save and Close' }));
  userEvent.click(screen.getByRole('button', { name: 'Edit hazards-1' }));
  dg = within(screen.getByRole('dialog', { name: 'Hazardous TCN' }));
  userEvent.click(dg.getByRole('tab', { name: 'Page 2' }));
  expect(dg.getByLabelText('B/L UOM')).toHaveValue('PN');
  expect(dg.getByLabelText('Metric UOM')).toHaveValue('KG');
  expect(dg.getByLabelText('Phone Nbr')).toHaveValue('9075522131');
});
