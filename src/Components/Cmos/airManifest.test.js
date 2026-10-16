import { useState } from 'react';
import { render, screen, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CmosWorkspace from './CmosWorkspace';
import { createCmosStore, createRecord, assignShipments, editRecord, saveRecord, validationErrors, normalizeCmosStore } from './model';
function seed() {
  let store = createCmosStore();
  for (const mode of ['F', 'J', 'B', '9', '']) store = createRecord(store, 'shipments', { tcn: `AIR-${mode || 'EMPTY'}`, milMode: mode, description: 'TRAINING CARGO' });
  return store;
}
function Harness({ finished = false, initialStore }) {
  const [store, setStore] = useState(initialStore || seed);
  return <><CmosWorkspace store={store} onChange={setStore} initialPage="air" context={{ finished }} onClose={() => {}} /><output aria-label="Stored air data">{JSON.stringify(store)}</output></>;
}
test('Air Manifest opens with reference search, creation buttons and manifest links', () => {
  render(<Harness />);
  expect(screen.getByLabelText('Release Status')).toHaveValue('Open');
  expect(screen.getByRole('button', { name: 'New Cargo Manifest' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'New Mail Manifest' })).toBeInTheDocument();
  for (const column of ['Manifest', 'Mission', 'POD', 'Destination', 'Mode', 'Weight', 'Cube', 'Ref ID', 'Release Date', 'Remarks']) expect(screen.getByRole('columnheader', { name: column, exact: true })).toBeInTheDocument();
  userEvent.click(screen.getByRole('button', { name: 'Open manifest EDF6C60018' }));
  expect(screen.getByLabelText('Mission')).toHaveValue('TRN4726AX101');
  expect(screen.getByRole('tab', { name: 'Assigned Pallets' })).toBeInTheDocument();
  expect(screen.getByRole('tab', { name: 'View Loose Cargo' })).toBeInTheDocument();
});
test('a new cargo manifest has the reference detail fields and only mode F cargo can be assigned', () => {
  render(<Harness />);
  userEvent.click(screen.getByRole('button', { name: 'New Cargo Manifest' }));
  expect(screen.getByLabelText('Mode')).toHaveValue('F');
  expect(screen.getByLabelText('Weight')).toHaveAttribute('readonly');
  expect(screen.getByLabelText('Cube')).toHaveAttribute('readonly');
  userEvent.click(screen.getByRole('tab', { name: 'View Loose Cargo' }));
  userEvent.click(screen.getByRole('button', { name: 'Assign Loose Cargo' }));
  const picker = within(screen.getByRole('dialog', { name: 'Assign TCNs' }));
  expect(picker.getByRole('checkbox', { name: 'Assign AIR-F' })).toBeInTheDocument();
  for (const mode of ['J', 'B', '9', 'EMPTY']) expect(picker.queryByRole('checkbox', { name: `Assign AIR-${mode}` })).not.toBeInTheDocument();
  userEvent.click(picker.getByRole('checkbox', { name: 'Assign AIR-F' }));
  userEvent.click(picker.getByRole('button', { name: 'Assign', exact: true }));
  userEvent.click(picker.getByRole('button', { name: 'Close', exact: true }));
  expect(screen.getByRole('tabpanel', { name: 'View Loose Cargo' })).toHaveTextContent('AIR-F');
  userEvent.click(screen.getByRole('button', { name: 'Save and Close' }));
  const stored = JSON.parse(screen.getByLabelText('Stored air data').textContent);
  const manifest = Object.values(stored.airManifests)[0];
  expect(manifest.saved.shipmentIds).toEqual(['shipments-1']);
  userEvent.click(screen.getByRole('button', { name: `Open manifest ${manifest.saved.manifestNumber}` }));
  userEvent.click(screen.getByRole('tab', { name: 'View Loose Cargo' }));
  userEvent.click(screen.getByRole('checkbox', { name: 'Select AIR-F' }));
  userEvent.click(screen.getByRole('button', { name: 'Unassign', exact: true }));
  expect(screen.getByRole('tabpanel', { name: 'View Loose Cargo' })).not.toHaveTextContent('AIR-F');
});
test('New Mail Manifest creates a mail record and manifest-number search overrides release status', () => {
  render(<Harness />);
  fireEvent.change(screen.getByLabelText('Manifest search'), { target: { value: 'EDF6C60018' } });
  userEvent.selectOptions(screen.getByLabelText('Release Status'), 'Released');
  userEvent.click(screen.getByRole('button', { name: 'Search', exact: true }));
  expect(screen.getByRole('button', { name: 'Open manifest EDF6C60018' })).toBeInTheDocument();
  userEvent.click(screen.getByRole('button', { name: 'New Mail Manifest' }));
  expect(Object.values(JSON.parse(screen.getByLabelText('Stored air data').textContent).airManifests)[0].draft.manifestType).toBe('Mail');
  expect(screen.getByLabelText('Manifest')).toHaveValue('EDF6M60001');
});
test('assignment rejects non-F cargo in the model and later mode changes invalidate manifest checks', () => {
  let store = createRecord(seed(), 'airManifests', { manifestNumber: 'AIR-TEST', mission: 'TEST', dsoeId: 'TEST', chalk: '001', pod: 'ADQ', destination: 'KODIAK' });
  store = assignShipments(store, 'airManifests', 'airManifests-1', Object.keys(store.shipments));
  expect(store.airManifests['airManifests-1'].draft.shipmentIds).toEqual(['shipments-1']);
  store = saveRecord(store, 'airManifests', 'airManifests-1');
  store = editRecord(store, 'shipments', 'shipments-1', { milMode: 'B' });
  expect(validationErrors(store, 'airManifests', 'airManifests-1').join(' ')).toMatch(/MIL Mode F/);
  store = assignShipments(store, 'airManifests', 'airManifests-1', ['shipments-1'], true);
  expect(store.airManifests['airManifests-1'].draft.shipmentIds).toEqual([]);
});

test('Build Pallets groups eligible cargo and unassigns the pallet as a unit', () => {
  render(<Harness />);
  userEvent.click(screen.getByRole('button', { name: 'New Cargo Manifest' }));
  userEvent.click(screen.getByRole('button', { name: 'Build Pallets' }));
  const build = within(screen.getByRole('dialog', { name: 'Build Pallets' }));
  expect(build.queryByRole('checkbox', { name: 'Build AIR-J' })).not.toBeInTheDocument();
  fireEvent.change(build.getByLabelText('Pallet ID'), { target: { value: 'PS' } });
  userEvent.click(build.getByRole('checkbox', { name: 'Build AIR-F' }));
  userEvent.click(build.getByRole('button', { name: 'Build and Assign' }));
  expect(screen.getByRole('tabpanel', { name: 'Assigned Pallets' })).toHaveTextContent('PS');
  userEvent.click(screen.getByRole('checkbox', { name: 'Select PS' }));
  userEvent.click(screen.getByRole('button', { name: 'Unassign', exact: true }));
  expect(screen.queryByRole('checkbox', { name: 'Select PS' })).not.toBeInTheDocument();
});

test('finished sessions can open an unmaterialized reference manifest without writing it', () => {
  render(<Harness finished />);
  userEvent.click(screen.getByRole('button', { name: 'Open manifest EDF6C60018' }));
  expect(screen.getByLabelText('Mission')).toHaveValue('TRN4726AX101');
  expect(screen.getByRole('button', { name: 'Save', exact: true })).toBeDisabled();
  expect(Object.keys(JSON.parse(screen.getByLabelText('Stored air data').textContent).airManifests)).toHaveLength(0);
});
test('pallet assignment includes all members and blocks a second manifest and mixed-mode pallets', () => {
  let store = seed();
  store = editRecord(store, 'shipments', 'shipments-1', { palletId: 'PS' });
  store = createRecord(store, 'shipments', { tcn: 'SECOND-F', milMode: 'F', palletId: 'PS' });
  store = createRecord(store, 'airManifests', { manifestNumber: 'PALLET-ONE' });
  store = createRecord(store, 'airManifests', { manifestNumber: 'PALLET-TWO' });
  store = assignShipments(store, 'airManifests', 'airManifests-1', ['shipments-1']);
  expect(store.airManifests['airManifests-1'].draft.shipmentIds).toEqual(['shipments-1', 'shipments-6']);
  store = assignShipments(store, 'airManifests', 'airManifests-2', ['shipments-6']);
  expect(store.airManifests['airManifests-2'].draft.shipmentIds || []).toEqual([]);
  store = assignShipments(store, 'airManifests', 'airManifests-1', ['shipments-6'], true);
  expect(store.airManifests['airManifests-1'].draft.shipmentIds).toEqual([]);
  store = editRecord(store, 'shipments', 'shipments-6', { milMode: 'J' });
  store = assignShipments(store, 'airManifests', 'airManifests-2', ['shipments-1']);
  expect(store.airManifests['airManifests-2'].draft.shipmentIds || []).toEqual([]);
});

test('building into a pallet ID reserved by another manifest makes no shipment changes', () => {
  let store = editRecord(seed(), 'shipments', 'shipments-1', { palletId: 'PS' });
  store = createRecord(store, 'shipments', { tcn: 'AVAILABLE-F', milMode: 'F' });
  store = createRecord(store, 'airManifests', { manifestNumber: 'OCCUPIED' });
  store = assignShipments(store, 'airManifests', 'airManifests-1', ['shipments-1']);
  store = createRecord(store, 'airManifests', { manifestNumber: 'CURRENT' });
  render(<Harness initialStore={store} />);
  userEvent.click(screen.getByRole('button', { name: 'Open manifest CURRENT' }));
  userEvent.click(screen.getByRole('button', { name: 'Build Pallets' }));
  const build = within(screen.getByRole('dialog', { name: 'Build Pallets' }));
  expect(build.queryByRole('checkbox', { name: 'Build AIR-F' })).not.toBeInTheDocument();
  fireEvent.change(build.getByLabelText('Pallet ID'), { target: { value: 'PS' } });
  userEvent.click(build.getByRole('checkbox', { name: 'Build AVAILABLE-F' }));
  userEvent.click(build.getByRole('button', { name: 'Build and Assign' }));
  expect(build.getByRole('alert')).toHaveTextContent('Pallet ID');
  const stored = JSON.parse(screen.getByLabelText('Stored air data').textContent);
  expect(stored.shipments['shipments-6'].draft.palletId).toBeUndefined();
  expect(stored.airManifests['airManifests-1'].draft.shipmentIds).toEqual(['shipments-1']);
});

test('new cargo manifests follow the reference numbering structure and advance without collisions', () => {
  render(<Harness />);
  userEvent.click(screen.getByRole('button', { name: 'New Cargo Manifest' }));
  expect(screen.getByLabelText('Manifest')).toHaveValue('EDF6C60032');
  userEvent.click(screen.getByRole('button', { name: 'Save and Close' }));
  userEvent.click(screen.getByRole('button', { name: 'New Cargo Manifest' }));
  expect(screen.getByLabelText('Manifest')).toHaveValue('EDF6C60033');
  const stored = normalizeCmosStore(JSON.parse(screen.getByLabelText('Stored air data').textContent));
  expect(stored.counters.airManifestCargo).toBe(34);
});

test('untouched older demos refresh to fictional values while trainee edits remain', () => {
  const original = { manifestNumber: 'EDF6C60021', mission: 'LMFF700CPX11', pod: 'ADQ', destination: 'KODIAK', weight: 5660, cube: 528, refId: 'EW', mode: 'F', manifestType: 'Cargo', complete: 'Yes', dsoeId: 'TT261', chalk: '002', sampleCargo: [] };
  let store = createRecord(createCmosStore(), 'airManifests', original, 'air-sample-1');
  expect(normalizeCmosStore(store).airManifests['air-sample-1'].draft).toMatchObject({ manifestNumber: 'EDF6C60022', mission: 'TRN4826BX102' });
  const editedWeight = editRecord(store, 'airManifests', 'air-sample-1', { weight: 5661 });
  expect(normalizeCmosStore(editedWeight).airManifests['air-sample-1'].draft.weight).toBe(5661);
  store = editRecord(store, 'airManifests', 'air-sample-1', { mission: 'MY-TRAINING-MISSION' });
  expect(normalizeCmosStore(store).airManifests['air-sample-1'].draft.mission).toBe('MY-TRAINING-MISSION');
});

test('the detail opens as a wide modal like the reference and closes back to the list', () => {
  render(<Harness />);
  userEvent.click(screen.getByRole('button', { name: 'Open manifest EDF6C60018' }));
  const detail = within(screen.getByRole('dialog', { name: 'Air Manifest', exact: true }));
  expect(detail.getByLabelText('Manifest')).toHaveValue('EDF6C60018');
  userEvent.click(detail.getByRole('button', { name: 'Close', exact: true }));
  expect(screen.getByRole('button', { name: 'New Cargo Manifest' })).toBeInTheDocument();
});
