import { useState } from 'react';
import { render, screen, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CmosWorkspace from './CmosWorkspace';
import { createCmosStore, createRecord } from './model';

function Harness() {
  const [store, setStore] = useState(() => createRecord(createCmosStore(), 'shipments', { tcn: 'LOOKUP-TCN' }));
  return <><CmosWorkspace store={store} onChange={setStore} onClose={() => {}} /><output aria-label="Saved EDI Mode">{Object.values(store.shipments)[0].saved?.ediMode}</output></>;
}
function open() {
  render(<Harness />);
  userEvent.click(screen.getByRole('button', { name: 'Open TCN LOOKUP-TCN' }));
}

test.each([
  ['CIIC', 'CIIC Lookup', '36 row(s) found.', 'N', 'FIREARMS'],
  ['Hold Code', 'Hold Code Lookup', '28 row(s) found.', 'W', 'WOOD PACKING MATERIAL (WPM) REMEDIATION/DECONTAMINATION.'],
])('%s opens its full reference list and selection updates the field', (field, title, count, code, description) => {
  open();
  userEvent.click(screen.getByRole('button', { name: `Look up ${field}` }));
  const modal = within(screen.getByRole('dialog', { name: title }));
  expect(modal.getByText(count)).toBeInTheDocument();
  expect(modal.getByText(description)).toBeInTheDocument();
  userEvent.click(modal.getByRole('row', { name: `${code} ${description}` }));
  userEvent.click(modal.getByRole('button', { name: 'Select', exact: true }));
  expect(screen.getByLabelText(field)).toHaveValue(code);
});

test('security and cargo dropdowns show all reference descriptions while storing codes', () => {
  open();
  const security = screen.getByLabelText('Sec Class');
  expect(within(security).getAllByRole('option')).toHaveLength(8);
  userEvent.selectOptions(security, within(security).getByRole('option', { name: 'E - Unclassified, Encrypt For Transmission' }));
  expect(security).toHaveValue('E');
  const cargo = screen.getByLabelText('Type Cargo');
  expect(within(cargo).getAllByRole('option')).toHaveLength(31);
  userEvent.selectOptions(cargo, within(cargo).getByRole('option', { name: '4 - Radioactive Substance in Limited Quantities, No Label Required' }));
  expect(cargo).toHaveValue('4');
});

test('typing or selecting MIL Mode fills the matching EDI Mode and saves the pair', () => {
  open();
  fireEvent.change(screen.getByLabelText('MIL Mode'), { target: { value: 'j' } });
  expect(screen.getByLabelText('MIL Mode')).toHaveValue('J');
  expect(screen.getByLabelText('EDI Mode')).toHaveValue('AF');
  userEvent.click(screen.getByRole('button', { name: 'Look up MIL Mode' }));
  const modal = within(screen.getByRole('dialog', { name: 'MIL/EDI Mode Code Lookup' }));
  expect(modal.getByText('35 row(s) found.')).toBeInTheDocument();
  expect(modal.getByRole('columnheader', { name: 'EDI Mode' })).toBeInTheDocument();
  userEvent.click(modal.getByRole('row', { name: /B LT MOTOR, LESS THAN TRUCKLOAD/ }));
  userEvent.click(modal.getByRole('button', { name: 'Select', exact: true }));
  expect(screen.getByLabelText('MIL Mode')).toHaveValue('B');
  expect(screen.getByLabelText('EDI Mode')).toHaveValue('LT');
  userEvent.click(screen.getByRole('button', { name: 'Save', exact: true }));
  expect(screen.getByLabelText('Saved EDI Mode')).toHaveTextContent('LT');
  fireEvent.change(screen.getByLabelText('MIL Mode'), { target: { value: '' } });
  expect(screen.getByLabelText('EDI Mode')).toHaveValue('');
});

test('reference column filters and Clear reset the list and selection', () => {
  open();
  userEvent.click(screen.getByRole('button', { name: 'Look up MIL Mode' }));
  const modal = within(screen.getByRole('dialog', { name: 'MIL/EDI Mode Code Lookup' }));
  fireEvent.change(modal.getByLabelText('Filter EDI Mode'), { target: { value: 'LT' } });
  expect(modal.getByText('1 row(s) found.')).toBeInTheDocument();
  userEvent.click(modal.getByRole('row', { name: /B LT MOTOR, LESS THAN TRUCKLOAD/ }));
  fireEvent.change(modal.getByLabelText('Filter EDI Mode'), { target: { value: 'ED' } });
  expect(modal.getByRole('button', { name: 'Select', exact: true })).toBeDisabled();
  userEvent.click(modal.getByRole('button', { name: 'Clear' }));
  expect(modal.getByText('35 row(s) found.')).toBeInTheDocument();
});

test('EDI magnifier selects the EDI code from the shared MIL/EDI table', () => {
  open();
  userEvent.click(screen.getByRole('button', { name: 'Look up EDI Mode' }));
  const modal = within(screen.getByRole('dialog', { name: 'MIL/EDI Mode Code Lookup' }));
  userEvent.click(modal.getByRole('row', { name: /Q AF COMMERCIAL AIR FREIGHT/ }));
  userEvent.click(modal.getByRole('button', { name: 'Select', exact: true }));
  expect(screen.getByLabelText('EDI Mode')).toHaveValue('AF');
});
