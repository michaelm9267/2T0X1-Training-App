import { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CmosWorkspace from './CmosWorkspace';
import { createCmosStore } from './model';
function Harness() {
  const [store, setStore] = useState(createCmosStore);
  return <CmosWorkspace store={store} onChange={setStore} context={{ now: new Date(2026, 9, 15) }} onClose={() => {}} />;
}
function start(type) {
  render(<Harness />);
  userEvent.click(screen.getByRole('button', { name: 'New', exact: true }));
  if (type) userEvent.selectOptions(screen.getByLabelText('Doc Type'), type);
}

test.each([
  ['FB500062880001', 'FB500062880001XXX'],
  ['FB500062880001A', 'FB500062880001AXX'],
])('MILSTRIP document %s generates its TCN when tabbing out and overwrites previous entry', (document, expected) => {
  start('M - MILSTRIP');
  const input = screen.getByLabelText('Doc Nbr');
  expect(input).toBeRequired();
  fireEvent.change(screen.getByLabelText('TCN'), { target: { value: 'OLD-TCN' } });
  userEvent.click(input);
  userEvent.type(input, document);
  expect(screen.getByLabelText('TCN')).toHaveValue('OLD-TCN');
  userEvent.tab();
  expect(screen.getByLabelText('TCN')).toHaveValue(expected);
});

test('new Non-MILSTRIP TCNs use the current Julian date and sequential unique serials without a document number', () => {
  start();
  expect(screen.getByLabelText('TCN')).toHaveValue('FA50306288X001XXX');
  expect(screen.getByLabelText('Doc Nbr')).toHaveValue('');
  expect(screen.getByLabelText('Doc Nbr')).toBeDisabled();
  userEvent.click(screen.getByRole('button', { name: 'New', exact: true }));
  expect(screen.getByLabelText('TCN')).toHaveValue('FA50306288X002XXX');
});

test('Other accepts either a document-derived TCN or a TCN entered without a document number', () => {
  start('O - Other');
  const input = screen.getByLabelText('Doc Nbr');
  expect(input).not.toBeRequired();
  fireEvent.change(input, { target: { value: 'FB500062880001' } });
  fireEvent.blur(input);
  expect(screen.getByLabelText('TCN')).toHaveValue('FB500062880001XXX');
  fireEvent.change(screen.getByLabelText('TCN'), { target: { value: 'CUSTOM-TCN' } });
  expect(input).toHaveValue('');
  expect(screen.getByLabelText('TCN')).toHaveValue('CUSTOM-TCN');
});

test('MILSTRIP Edit Check requires a document number', () => {
  start('M - MILSTRIP');
  userEvent.click(screen.getByRole('button', { name: 'Save', exact: true }));
  userEvent.click(screen.getByRole('button', { name: 'Edit TCN', exact: true }));
  expect(screen.getByRole('status')).toHaveTextContent('Required: docNbr');
});

test('saving immediately after document entry persists the generated TCN', () => {
  start('M - MILSTRIP');
  const input = screen.getByLabelText('Doc Nbr');
  userEvent.click(input);
  userEvent.type(input, 'FB500062880001A');
  userEvent.click(screen.getByRole('button', { name: 'Save and Close', exact: true }));
  userEvent.click(screen.getByRole('button', { name: 'Open TCN FB500062880001AXX' }));
  expect(screen.getByLabelText('TCN')).toHaveValue('FB500062880001AXX');
  expect(screen.getByLabelText('Doc Nbr')).toHaveValue('FB500062880001A');
});

test('Increment clears document-derived numbers and accepts a manually entered increment TCN', () => {
  start('M - MILSTRIP');
  fireEvent.change(screen.getByLabelText('Doc Nbr'), { target: { value: 'FB500062880001' } });
  fireEvent.blur(screen.getByLabelText('Doc Nbr'));
  userEvent.selectOptions(screen.getByLabelText('Doc Type'), 'I - Increment');
  expect(screen.getByLabelText('Doc Nbr')).toHaveValue('');
  expect(screen.getByLabelText('Doc Nbr')).toBeDisabled();
  expect(screen.getByLabelText('TCN')).toHaveValue('');
  expect(screen.getByLabelText('TCN')).toBeEnabled();
  fireEvent.change(screen.getByLabelText('TCN'), { target: { value: 'F00001$$E100100XX' } });
  userEvent.click(screen.getByRole('button', { name: 'Save and Close', exact: true }));
  userEvent.click(screen.getByRole('button', { name: 'Open TCN F00001$$E100100XX' }));
  expect(screen.getByLabelText('TCN')).toHaveValue('F00001$$E100100XX');
  expect(screen.getByLabelText('Doc Nbr')).toHaveValue('');
});
