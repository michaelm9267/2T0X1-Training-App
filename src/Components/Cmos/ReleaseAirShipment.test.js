import { render, screen, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReleaseAirShipment from './ReleaseAirShipment';
import { createCmosStore, createRecord, transition } from './model';

const record = { id: 'airManifests-1', draft: { manifestNumber: 'EDF6C60021', mission: 'LMFF700CPX11', refId: 'EW', pod: 'ADQ', dsoeId: 'TRN01', chalk: '001' }, releaseDraft: {} };
const store = { ...createCmosStore(), missions: { m1: { id: 'm1', saved: { missionNumber: 'LMFF700CPX11', flightNbr: 'PMX101' } } } };

test('Release Air Shipment shows the manifest and mission read only, with required DEP Date/Time and EDD', () => {
  const onEdit = jest.fn(), onRelease = jest.fn();
  render(<ReleaseAirShipment store={store} record={record} locked={false} message="" onEdit={onEdit} onRelease={onRelease} onClose={() => {}} />);
  const dialog = within(screen.getByRole('dialog', { name: 'Release Air Shipment' }));
  for (const [label, value] of [['Mission', 'LMFF700CPX11'], ['Flight Nbr', 'PMX101'], ['DSOE ID', 'TRN01'], ['Chalk', '001']]) {
    expect(dialog.getByLabelText(label)).toHaveValue(value);
    expect(dialog.getByLabelText(label)).toHaveAttribute('readonly');
  }
  expect(dialog.getByLabelText('DEP Date/Time')).toHaveAttribute('placeholder', 'ddmmmyyyy/HHmm');
  expect(dialog.getByRole('button', { name: 'Choose DEP Date/Time' })).toBeInTheDocument();
  expect(dialog.getByRole('button', { name: 'Choose EDD' })).toBeInTheDocument();
  const cargo = within(dialog.getByRole('region', { name: 'Cargo' }));
  expect(cargo.getAllByRole('cell').map(cell => cell.textContent)).toEqual(['EDF6C60021', 'EW', 'ADQ']);
  expect(cargo.getByText('1 row(s) found.')).toBeInTheDocument();
  expect(within(dialog.getByRole('region', { name: 'Passenger' })).getByText('No data to display.')).toBeInTheDocument();
  fireEvent.change(dialog.getByLabelText('DEP Date/Time'), { target: { value: '18Oct2026/17' } });
  expect(onEdit).toHaveBeenLastCalledWith('departureAt', '');
  expect(dialog.getByText(/Use ddMmmyyyy\/HHmm, e\.g\. 18Oct2026\/1744/)).toBeInTheDocument();
  fireEvent.change(dialog.getByLabelText('DEP Date/Time'), { target: { value: '18Oct2026/1744' } });
  expect(onEdit).toHaveBeenLastCalledWith('departureAt', '2026-10-18T17:44');
  userEvent.click(dialog.getByRole('button', { name: 'Release' }));
  expect(onRelease).toHaveBeenCalledWith(expect.objectContaining({ flightNumber: 'PMX101' }));
});

test('releasing an air manifest requires the EDD, after the departure', () => {
  const base = createRecord(createCmosStore(), 'airManifests', { manifestNumber: 'EDF6C60021' });
  const id = Object.keys(base.airManifests)[0];
  const messages = releaseDetails => transition(base, 'airManifests', id, 'Release', { releaseDetails }).outcome.messages;
  expect(messages({ departureAt: '2026-10-18T17:44' })).toContain('Enter EDD.');
  expect(messages({ departureAt: '2026-10-18T17:44', edd: '2026-10-18T09:00' })).toContain('EDD must be after the departure date/time.');
  expect(messages({ departureAt: '2026-10-18T17:44', edd: '2026-10-19T09:00' }).some(m => /EDD/.test(m))).toBe(false);
});
