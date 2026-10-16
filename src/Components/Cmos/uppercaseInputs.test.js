import { useState } from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CmosWorkspace from './CmosWorkspace';
import { createCmosStore, createRecord } from './model';

function Harness() {
  const [store, setStore] = useState(() => createRecord(createCmosStore(), 'shipments', { tcn: 'UPPERCASE-TCN', hazmat: 'O - Other hazardous' }));
  return <CmosWorkspace store={store} onChange={setStore} onClose={() => {}} />;
}

test('CMOS search entry converts lowercase text to uppercase', () => {
  render(<Harness />);
  const search = screen.getByLabelText('TCN');
  userEvent.type(search, 'uppercase-tcn');
  expect(search).toHaveValue('UPPERCASE-TCN');
});

test('CMOS modal text and multiline pasted values save and reopen in uppercase', () => {
  render(<Harness />);
  userEvent.click(screen.getByRole('button', { name: 'Open TCN UPPERCASE-TCN' }));
  userEvent.click(screen.getByRole('tab', { name: 'DG2', exact: true }));
  userEvent.click(within(screen.getByRole('tabpanel', { name: 'DG2' })).getByRole('button', { name: 'New', exact: true }));
  let modal = within(screen.getByRole('dialog', { name: 'Hazardous TCN' }));
  userEvent.click(modal.getByRole('tab', { name: 'Page 2' }));
  fireEvent.change(modal.getByLabelText('Address 1'), { target: { value: '5257 Gibson Avenue' } });
  fireEvent.change(modal.getByLabelText('Additional Handling Information'), { target: { value: 'keep upright\nhandle with care' } });
  expect(modal.getByLabelText('Address 1')).toHaveValue('5257 GIBSON AVENUE');
  expect(modal.getByLabelText('Additional Handling Information')).toHaveValue('KEEP UPRIGHT\nHANDLE WITH CARE');
  userEvent.click(modal.getByRole('button', { name: 'Save and Close' }));
  userEvent.click(screen.getByRole('button', { name: 'Edit hazards-1' }));
  modal = within(screen.getByRole('dialog', { name: 'Hazardous TCN' }));
  userEvent.click(modal.getByRole('tab', { name: 'Page 2' }));
  expect(modal.getByLabelText('Address 1')).toHaveValue('5257 GIBSON AVENUE');
  expect(modal.getByLabelText('Additional Handling Information')).toHaveValue('KEEP UPRIGHT\nHANDLE WITH CARE');
});
