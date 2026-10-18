import { useState } from 'react';
import { render, screen, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CmosWorkspace from './CmosWorkspace';
import { createCmosStore, createRecord, saveRecord, normalizeCmosStore } from './model';
import { AC_TYPES, TERMINALS, departMission, missionErrors, emptyMission, validDateTime } from './airScheduleLogic';

function Harness({ initialPage = 'schedule', initialStore }) {
  const [store, setStore] = useState(initialStore || createCmosStore);
  return <><CmosWorkspace store={store} onChange={setStore} initialPage={initialPage} context={{ dsoes: [['TRN01', '001', 'OKO', 'D', 'A']] }} onClose={() => {}} /><output aria-label="Stored data">{JSON.stringify(store)}</output></>;
}
const stored = () => JSON.parse(screen.getByLabelText('Stored data').textContent);

test('Air Schedule lists open missions with the reference search and columns', () => {
  render(<Harness />);
  expect(screen.getByRole('dialog', { name: 'CMOS Air Schedule' })).toBeInTheDocument();
  expect(screen.getByLabelText('Status')).toHaveValue('O');
  expect(within(screen.getByLabelText('Status')).getAllByRole('option').map(o => o.textContent).filter(Boolean)).toEqual(['I - Inbound', 'O - Outbound']);
  expect(screen.getByLabelText('Open or closed')).toHaveValue('O');
  expect(within(screen.getByLabelText('Open or closed')).getAllByRole('option').map(o => o.textContent).filter(Boolean)).toEqual(['OPEN', 'CLOSED']);
  expect(screen.getByLabelText('Scheduled Arrival From').value).toMatch(/^\d{2}[A-Z][a-z]{2}\d{4}$/);
  for (const column of ['Mission Number', 'I/O', 'DSOE ID', 'Chalk', 'Scheduled Arrival', 'Actual Arrival', 'Scheduled Departure', 'Actual Departure'])
    expect(screen.getByRole('columnheader', { name: column })).toBeInTheDocument();
  expect(screen.getByText('24 row(s) found.')).toBeInTheDocument();
  userEvent.click(screen.getByRole('button', { name: 'Open mission TRNCJZ0551' }));
  const sample = within(screen.getByRole('dialog', { name: 'Air Schedule' }));
  expect(sample.getByText(/Sample mission · view only/)).toBeInTheDocument();
  expect(sample.getByRole('button', { name: 'Save' })).toBeDisabled();
});

test('New builds a mission with AC Type and routing lookups; required fields block Save', () => {
  render(<Harness />);
  userEvent.click(screen.getByRole('button', { name: 'New' }));
  const dialog = within(screen.getByRole('dialog', { name: 'Air Schedule' }));
  for (const id of ['ioInd', 'missionNumber']) expect(document.querySelector(`[data-field="${id}"] .shared-required-mark`)).toHaveTextContent('*');
  expect(dialog.getByLabelText('I/O Ind')).toHaveValue('O');
  expect(dialog.getByLabelText('Carrier')).toHaveValue('00AMC');
  expect(dialog.getByLabelText('Actual Departure')).toBeDisabled();
  expect(dialog.getByRole('button', { name: 'Abort Mission' })).toBeDisabled();
  expect(dialog.getByRole('button', { name: 'Delete' })).toBeDisabled();
  userEvent.click(dialog.getByRole('button', { name: 'Save' }));
  expect(dialog.getByRole('alert')).toHaveTextContent('Mission Number is required.');
  for (const [label, value] of [['Mission Number', 'trnc17001'], ['Scheduled Departure', '18Oct2026/1400']])
    fireEvent.change(dialog.getByLabelText(label), { target: { value } });
  userEvent.click(dialog.getByRole('button', { name: 'Look up DSOE ID' }));
  const dsoe = within(screen.getByRole('dialog', { name: 'DSOE Lookup' }));
  for (const column of ['DSOE ID', 'Chalk', 'Destination', 'Exercise/Mobility', 'Surface/Air']) expect(dsoe.getByRole('columnheader', { name: column })).toBeInTheDocument();
  expect(dsoe.getByText('16 row(s) found.')).toBeInTheDocument();
  userEvent.click(dsoe.getByRole('row', { name: 'TRN01 001 OKO D A' }));
  userEvent.click(dsoe.getByRole('button', { name: 'Select' }));
  expect(dialog.getByLabelText('DSOE ID')).toHaveValue('TRN01');
  expect(dialog.getByLabelText('Chalk')).toHaveValue('001');
  userEvent.click(dialog.getByRole('button', { name: 'Look up DSOE ID' }));
  userEvent.click(within(screen.getByRole('dialog', { name: 'DSOE Lookup' })).getByRole('row', { name: 'TT261 003 D A' }));
  userEvent.click(within(screen.getByRole('dialog', { name: 'DSOE Lookup' })).getByRole('button', { name: 'Select' }));
  expect(dialog.getByLabelText('Chalk')).toHaveValue('003');
  userEvent.click(dialog.getByRole('button', { name: 'Look up DSOE ID' }));
  userEvent.click(within(screen.getByRole('dialog', { name: 'DSOE Lookup' })).getByRole('row', { name: 'TRN01 001 OKO D A' }));
  userEvent.click(within(screen.getByRole('dialog', { name: 'DSOE Lookup' })).getByRole('button', { name: 'Select' }));
  userEvent.click(dialog.getByRole('button', { name: 'Look up AC Type' }));
  const ac = within(screen.getByRole('dialog', { name: 'AC Type Lookup' }));
  expect(ac.getByText('34 row(s) found.')).toBeInTheDocument();
  userEvent.click(ac.getByRole('row', { name: '0170 C17 M' }));
  userEvent.click(ac.getByRole('button', { name: 'Select' }));
  expect(dialog.getByLabelText('AC Type')).toHaveValue('0170');
  userEvent.click(dialog.getByRole('button', { name: 'Look up Routings' }));
  const terminals = within(screen.getByRole('dialog', { name: 'APOD Terminals Lookup' }));
  expect(terminals.getByText(`${TERMINALS.length} row(s) found.`)).toBeInTheDocument();
  userEvent.click(terminals.getByRole('row', { name: /^EDF / }));
  userEvent.click(terminals.getByRole('button', { name: 'Seq 1' }));
  userEvent.click(terminals.getByRole('row', { name: /^OKO / }));
  userEvent.click(terminals.getByRole('button', { name: 'Seq 2' }));
  userEvent.click(terminals.getByRole('button', { name: 'Close' }));
  expect(dialog.getByLabelText('Routing 1')).toHaveValue('EDF');
  expect(dialog.getByLabelText('Routing 2')).toHaveValue('OKO');
  userEvent.click(dialog.getByRole('button', { name: 'Save and Close' }));
  expect(screen.queryByRole('dialog', { name: 'Air Schedule' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Open mission TRNC17001' })).toBeInTheDocument();
  expect(stored().missions['missions-1'].saved).toMatchObject({ missionNumber: 'TRNC17001', dsoeId: 'TRN01', chalk: '001', acType: '0170', routings: ['EDF', 'OKO', '', '', ''] });
});

test('closing a new mission without saving discards it; Abort Mission closes it', () => {
  render(<Harness />);
  userEvent.click(screen.getByRole('button', { name: 'New' }));
  userEvent.click(within(screen.getByRole('dialog', { name: 'Air Schedule' })).getByRole('button', { name: 'Close' }));
  expect(stored().missions).toEqual({});
  userEvent.click(screen.getByRole('button', { name: 'New' }));
  let dialog = within(screen.getByRole('dialog', { name: 'Air Schedule' }));
  fireEvent.change(dialog.getByLabelText('Mission Number'), { target: { value: 'TRNABORT01' } });
  userEvent.click(dialog.getByRole('button', { name: 'Save and Close' }));
  userEvent.click(screen.getByRole('button', { name: 'Open mission TRNABORT01' }));
  dialog = within(screen.getByRole('dialog', { name: 'Air Schedule' }));
  userEvent.click(dialog.getByRole('button', { name: 'Abort Mission' }));
  expect(screen.queryByRole('button', { name: 'Open mission TRNABORT01' })).not.toBeInTheDocument();
  userEvent.selectOptions(screen.getByLabelText('Open or closed'), 'C');
  userEvent.click(screen.getByRole('button', { name: 'Search' }));
  expect(screen.getByRole('button', { name: 'Open mission TRNABORT01' })).toBeInTheDocument();
});

test('the Air Manifest Mission lookup offers Air Schedule missions and fills DSOE ID and Chalk', () => {
  let store = createRecord(createCmosStore(), 'missions', { ...emptyMission(), missionNumber: 'TRNC17001', dsoeId: 'TRN01', chalk: '001', routings: ['EDF', 'OKO', '', '', ''] });
  store = saveRecord(store, 'missions', 'missions-1');
  render(<Harness initialPage="air" initialStore={store} />);
  userEvent.click(screen.getByRole('button', { name: 'New Cargo Manifest' }));
  userEvent.click(screen.getByRole('button', { name: 'Look up Mission' }));
  const lookup = within(screen.getByRole('dialog', { name: /Mission lookup/ }));
  expect(lookup.getByText('DSOE TRN01 · CHALK 001 · EDF-OKO')).toBeInTheDocument();
  userEvent.click(lookup.getByRole('radio', { name: 'Select TRNC17001' }));
  userEvent.click(lookup.getByRole('button', { name: 'Select' }));
  expect(screen.getByLabelText('Mission')).toHaveValue('TRNC17001');
  expect(screen.getByLabelText('DSOE ID')).toHaveValue('TRN01');
  expect(screen.getByLabelText('Chalk')).toHaveValue('001');
});

test('mission rules: required fields, chalk and date/time formats, unique numbers, release departure', () => {
  expect(AC_TYPES).toHaveLength(34);
  expect(missionErrors({ ...emptyMission(), ioInd: '' })).toEqual(['I/O Ind is required.', 'Mission Number is required.']);
  expect(missionErrors({ ...emptyMission(), missionNumber: 'X', chalk: '01', scheduledArrival: '18Oct2026', seats: 'ten' }))
    .toEqual(['Chalk must be 001 - 999.', 'Scheduled Arrival must be ddmmmyyyy/HHmm.', 'Seats must be a number.']);
  expect(validDateTime('18May2026/1245')).toBe(true);
  expect(validDateTime('31Feb2026/1245')).toBe(false);
  const missions = { a: { id: 'a', draft: { missionNumber: 'TRN1' }, saved: { missionNumber: 'TRN1' } } };
  expect(missionErrors({ ...emptyMission(), missionNumber: 'trn1' }, missions, 'b')).toEqual(['Mission TRN1 already exists.']);
  expect(departMission(missions, 'trn1', '2026-10-18T14:00').a.saved.actualDeparture).toBe('2026-10-18T14:00');
  expect(normalizeCmosStore({ version: 1, missions: missions }).missions.a.draft.missionNumber).toBe('TRN1');
});

test('Air Schedule date/time fields and the arrival range have calendars', () => {
  render(<Harness />);
  expect(screen.getByRole('button', { name: 'Choose Scheduled Arrival From' })).toBeInTheDocument();
  userEvent.click(screen.getByRole('button', { name: 'New' }));
  const dialog = within(screen.getByRole('dialog', { name: 'Air Schedule' }));
  for (const name of ['Scheduled Arrival', 'Actual Arrival', 'Scheduled Departure']) expect(dialog.getByRole('button', { name: `Choose ${name}` })).toBeEnabled();
  expect(dialog.getByRole('button', { name: 'Choose Actual Departure' })).toBeDisabled();
  userEvent.click(dialog.getByRole('button', { name: 'Choose Scheduled Departure' }));
  const picker = within(screen.getByRole('dialog', { name: 'Scheduled Departure calendar' }));
  fireEvent.change(picker.getByLabelText('Scheduled Departure time'), { target: { value: '0945' } });
  userEvent.click(picker.getAllByRole('button').find((b) => /^\d{2}[A-Z][a-z]{2}\d{4}$/.test(b.getAttribute('aria-label') || '') && b.textContent === '15'));
  expect(dialog.getByLabelText('Scheduled Departure').value).toMatch(/^15[A-Z][a-z]{2}\d{4}\/0945$/);
});
