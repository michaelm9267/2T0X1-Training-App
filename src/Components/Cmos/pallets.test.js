import { useState } from 'react';
import { render, screen, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CmosWorkspace from './CmosWorkspace';
import { createCmosStore, createRecord } from './model';
import { nextPalletId, palletType, specialCargo } from './palletLogic';

function seed() {
  let store = createCmosStore();
  store = createRecord(store, 'shipments', { tcn: 'FKOD991$S200010XX', milMode: 'F', pod: 'ADQ', rdd: '130', tp: '1', commoditySH: 'AA', hazmat: 'O - Other hazardous', proj: '9GF', tac: 'F7GS' });
  store = createRecord(store, 'shipments', { tcn: 'F00001$$E100100XX', milMode: 'F', pod: 'LSV', rdd: '008', tp: '2', commoditySH: 'AD', hazmat: 'N - Not hazardous', secClass: 'U', ciic: 'U', tac: 'FSDN' });
  store = createRecord(store, 'shipments', { tcn: 'AIR-J', milMode: 'J' });
  return store;
}
function Harness() {
  const [store, setStore] = useState(seed);
  return <><CmosWorkspace store={store} onChange={setStore} initialPage="pallets" context={{}} onClose={() => {}} /><output aria-label="Stored data">{JSON.stringify(store)}</output></>;
}

test('pallet IDs, types, and special-pallet cargo follow the reference rules', () => {
  expect(palletType(0)).toBe('L');
  expect(palletType(62)).toBe('B');
  expect(palletType(90)).toBe('L');
  expect(palletType(100)).toBe('M');
  expect(nextPalletId(createCmosStore(), ['AA', 'AB'])).toBe('AC');
  expect(specialCargo({ hazmat: 'A - Ammunition/explosives' })).toBe(true);
  expect(specialCargo({ ciic: '9' })).toBe(true);
  expect(specialCargo({ secClass: 'S' })).toBe(true);
  expect(specialCargo({ hazmat: 'N - Not hazardous', secClass: 'U', ciic: 'U' })).toBe(false);
});

test('Pallets lists pallets in CMOS columns and a new regular pallet builds from Assign TCNs', () => {
  render(<Harness />);
  const list = within(screen.getByRole('region', { name: 'Pallets' }));
  expect(list.getAllByRole('columnheader').map(th => th.textContent).filter(Boolean)).toEqual(['ID', 'POE', 'Date', 'Consignee', 'Manifest', 'POD', 'Gross Weight', 'Complete Date', 'Priority', 'Special', 'Hazard', 'Cargo Location', 'Config Code', 'EPP', 'Height', 'DSOE ID', 'Chalk', 'Load Plan ID', 'Type Cargo', 'FR Code']);
  for (const name of ['New Regular Pallet', 'New Special Pallet', 'New Household Pallet', 'Clear']) expect(screen.getByRole('button', { name })).toBeInTheDocument();
  userEvent.click(screen.getByRole('button', { name: 'New Regular Pallet' }));
  const build = within(screen.getByRole('dialog', { name: 'Build Pallet' }));
  expect(build.getByLabelText('Pallet ID')).toHaveValue('AA');
  expect(build.getByLabelText('Pallet Type')).toHaveValue('L');
  expect(build.getByLabelText('Equivalent Positions')).toHaveValue('1.0');
  expect(build.getByLabelText('DSOE ID')).toHaveAttribute('title', 'Enter 5 characters.');
  const panel = within(build.getByRole('tabpanel', { name: 'TCNs Assigned' }));
  expect(panel.getAllByRole('columnheader').map(th => th.textContent).filter(Boolean)).toEqual(['Type', 'TCN', 'POD', 'RDD', 'Priority', 'Comm S/H', 'Haz Code', 'Project Code', 'Cargo Location', 'Pieces', 'Weight', 'Cube', 'DSOE ID', 'Chalk', 'FR Code', 'Mail Ind']);
  userEvent.click(panel.getByRole('button', { name: 'Assign TCNs' }));
  const assign = within(screen.getByRole('dialog', { name: 'Assign TCNs' }));
  expect(assign.getByText(/select row\(s\) with a click and click 'Assign' button/)).toBeInTheDocument();
  expect(assign.queryByText('AIR-J')).not.toBeInTheDocument();
  expect(assign.getByText('2 row(s) found.')).toBeInTheDocument();
  userEvent.click(assign.getByText('FKOD991$S200010XX'));
  userEvent.click(assign.getByRole('button', { name: 'Assign' }));
  userEvent.click(assign.getByRole('button', { name: 'Close' }));
  expect(panel.getByText('FKOD991$S200010XX')).toBeInTheDocument();
  expect(build.getByRole('status')).toHaveTextContent('Transaction Successfully Processed');
  userEvent.click(build.getByRole('tab', { name: 'Pallet Header' }));
  const header = within(build.getByRole('tabpanel', { name: 'Pallet Header' }));
  expect(header.getByLabelText('Center of Balance')).toHaveValue('44');
  expect(header.getByLabelText('Config Code')).toHaveValue('PC');
  expect(header.getByLabelText('POE')).toHaveValue('EDF');
  fireEvent.change(build.getByLabelText('RF Tag Number'), { target: { value: 'rf123' } });
  userEvent.click(build.getByRole('button', { name: 'Save' }));
  expect(build.getByRole('status')).toHaveTextContent('Record successfully saved');
  const stored = JSON.parse(screen.getByLabelText('Stored data').textContent);
  expect(Object.values(stored.pallets)[0].saved).toMatchObject({ palletId: 'AA', category: 'Regular', rfTag: 'RF123' });
  expect(Object.values(stored.shipments).find(r => r.draft.tcn === 'FKOD991$S200010XX').draft.palletId).toBe('AA');
});

test('a new special pallet only offers hazardous or classified/sensitive TCNs', () => {
  render(<Harness />);
  userEvent.click(screen.getByRole('button', { name: 'New Special Pallet' }));
  const build = within(screen.getByRole('dialog', { name: 'Build Pallet' }));
  userEvent.click(build.getByRole('button', { name: 'Assign TCNs' }));
  const assign = within(screen.getByRole('dialog', { name: 'Assign TCNs' }));
  expect(assign.getByText('FKOD991$S200010XX')).toBeInTheDocument();
  expect(assign.queryByText('F00001$$E100100XX')).not.toBeInTheDocument();
  expect(assign.getByText(/Special pallet: only hazardous/)).toBeInTheDocument();
});

test('Pallet Type and Config Code cite their DTEB definitions in practice, and stay plain text in a test', () => {
  const { getCitation } = require('../Regulations/catalog');
  const { ModeContext } = require('../Session/mode');
  expect(getCitation('dteb.palletModuleTypes.L').quote).toContain('Pallet 85"-96" for C-5 (PPS 3-34), C-17');
  expect(getCitation('dteb.palletConfigurations.PC').quote).toContain('Palletized Cargo');
  const view = render(<Harness />);
  userEvent.click(screen.getByRole('button', { name: 'New Regular Pallet' }));
  const build = within(screen.getByRole('dialog', { name: 'Build Pallet' }));
  const typeLink = build.getByRole('link', { name: 'Pallet Type' });
  expect(typeLink).toHaveAttribute('target', '_blank');
  expect(typeLink).toHaveAttribute('href', expect.stringContaining('V_D_PTUNT_MODU_TY_CD.htm'));
  expect(build.getByLabelText('Pallet Type')).toHaveValue('L');
  userEvent.click(build.getByRole('tab', { name: 'Pallet Header' }));
  expect(build.getByRole('link', { name: 'Config Code' })).toHaveAttribute('href', expect.stringContaining('V_D_PLTZD_TRNSPRTN2_CD.htm'));
  view.unmount();
  render(<ModeContext.Provider value="test"><Harness /></ModeContext.Provider>);
  userEvent.click(screen.getByRole('button', { name: 'New Regular Pallet' }));
  expect(within(screen.getByRole('dialog', { name: 'Build Pallet' })).queryByRole('link', { name: 'Pallet Type' })).not.toBeInTheDocument();
  expect(screen.queryByText('Why? Governing sources')).not.toBeInTheDocument();
});
