import { useState } from 'react';
import { render, screen, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CmosWorkspace from './CmosWorkspace';
import { createCmosStore, createRecord, saveRecord } from './model';
import { emptyDeployment, deploymentErrors, planningDefaults, deploymentDsoeRows } from './deploymentLogic';

function Harness({ initialPage = 'deployment', initialStore }) {
  const [store, setStore] = useState(initialStore || createCmosStore);
  return <><CmosWorkspace store={store} onChange={setStore} initialPage={initialPage} context={{}} onClose={() => {}} /><output aria-label="Stored data">{JSON.stringify(store)}</output></>;
}
const stored = () => JSON.parse(screen.getByLabelText('Stored data').textContent);
const withParameters = (extra = {}) => {
  const store = createRecord(createCmosStore(), 'deployments', { ...emptyDeployment(), dsoeId: 'TRN01', deploymentExercise: 'D', milMode: 'F', ediMode: 'ED', origin: 'FA5030', destination: 'FB5209', poe: 'EDF', pod: 'OKO', tac: 'TRN1', adviceNumber: 'TRN1', eta: '1', atcmdReq: 'A', ...extra });
  return saveRecord(store, 'deployments', 'deployments-1');
};

test('Deployment Parameters lists DSOEs with the reference columns', () => {
  render(<Harness />);
  expect(screen.getByRole('dialog', { name: 'CMOS Deployment Parameters' })).toBeInTheDocument();
  for (const column of ['DSOE ID', 'Deployment / Exercise', 'Local / MAJCOM Exercise', 'MIL Mode', 'EDI Mode', 'Consignor', 'POE', 'Project Code', 'TAC', 'Consignee', 'POD', 'ATCMD Req', 'Export Mode', 'Advice Number', 'ETA'])
    expect(screen.getByRole('columnheader', { name: column })).toBeInTheDocument();
  expect(screen.getByText('0 row(s) found.')).toBeInTheDocument();
});

test('New sets parameters: required fields, 5-character DSOE, MIL Mode fills EDI Mode, lookups', () => {
  render(<Harness />);
  userEvent.click(screen.getByRole('button', { name: 'New' }));
  const dialog = within(screen.getByRole('dialog', { name: 'Set Deployment Parameters' }));
  for (const id of ['dsoeId', 'deploymentExercise', 'milMode', 'origin'])
    expect(document.querySelector(`[data-field="${id}"] .shared-required-mark`)).toHaveTextContent('*');
  expect(dialog.getByLabelText('Local / MAJCOM Exercise')).toHaveAttribute('readonly');
  expect(dialog.getByLabelText('DSOE ID')).toHaveAttribute('title', 'Enter 5 characters.');
  expect(dialog.getByRole('button', { name: 'Terminate' })).toBeDisabled();
  expect(within(dialog.getByLabelText('Deployment / Exercise')).getAllByRole('option').map(o => o.textContent).filter(Boolean)).toEqual(['D - Deployment', 'E - Exercise']);
  expect(within(dialog.getByLabelText('ATCMD Req')).getAllByRole('option').map(o => o.textContent).filter(Boolean)).toEqual(['A - Air Clearance', 'W - Water Clearance']);
  fireEvent.change(dialog.getByLabelText('DSOE ID'), { target: { value: 'TRN1' } });
  userEvent.click(dialog.getByRole('button', { name: 'Save' }));
  expect(dialog.getByRole('alert')).toHaveTextContent('DSOE ID: Enter 5 characters.');
  expect(dialog.getByRole('alert')).toHaveTextContent('Deployment / Exercise is required.');
  expect(dialog.getByRole('alert')).toHaveTextContent('MIL Mode is required.');
  expect(dialog.getByRole('alert')).toHaveTextContent('Consignor is required.');
  fireEvent.change(dialog.getByLabelText('DSOE ID'), { target: { value: 'TRN01' } });
  userEvent.selectOptions(dialog.getByLabelText('Deployment / Exercise'), 'D');
  fireEvent.change(dialog.getByLabelText('MIL Mode'), { target: { value: 'F' } });
  expect(dialog.getByLabelText('EDI Mode')).toHaveValue('ED');
  for (const [label, value] of [['Consignor', 'FA5030'], ['Consignee', 'FB5209'], ['POE', 'EDF'], ['POD', 'OKO'], ['TAC', 'TRN1'], ['ETA', '1']])
    fireEvent.change(dialog.getByLabelText(label), { target: { value } });
  userEvent.selectOptions(dialog.getByLabelText('ATCMD Req'), 'A');
  userEvent.click(dialog.getByRole('button', { name: 'Look up Advice Number' }));
  const advice = within(screen.getByRole('dialog', { name: 'Advice Number Lookup' }));
  for (const column of ['Advice Number', 'Fund Identifier', 'SDN', 'Effective Date', 'Expiration Date']) expect(advice.getByRole('columnheader', { name: column })).toBeInTheDocument();
  userEvent.click(advice.getByRole('row', { name: /^TRN1 / }));
  userEvent.click(advice.getByRole('button', { name: 'Select' }));
  expect(dialog.getByLabelText('Advice Number')).toHaveValue('TRN1');
  expect(dialog.getByRole('button', { name: 'Look up Consignor' })).toBeInTheDocument();
  expect(dialog.getByRole('button', { name: 'Look up POD' })).toBeInTheDocument();
  userEvent.click(dialog.getByRole('button', { name: 'Save and Close' }));
  expect(screen.getByRole('button', { name: 'Open DSOE TRN01' })).toBeInTheDocument();
  expect(stored().deployments['deployments-1'].saved).toMatchObject({ dsoeId: 'TRN01', milMode: 'F', ediMode: 'ED', origin: 'FA5030', adviceNumber: 'TRN1', atcmdReq: 'A' });
});

test('Terminate removes a DSOE from the list and from the Air Schedule lookup', () => {
  render(<Harness initialStore={withParameters()} />);
  userEvent.click(screen.getByRole('button', { name: 'Open DSOE TRN01' }));
  userEvent.click(within(screen.getByRole('dialog', { name: 'Set Deployment Parameters' })).getByRole('button', { name: 'Terminate' }));
  expect(screen.queryByRole('button', { name: 'Open DSOE TRN01' })).not.toBeInTheDocument();
  expect(deploymentDsoeRows(stored())).toEqual([]);
});

test('the Air Schedule DSOE lookup offers Deployment Parameters DSOEs', () => {
  render(<Harness initialPage="schedule" initialStore={withParameters()} />);
  userEvent.click(screen.getByRole('button', { name: 'New' }));
  userEvent.click(screen.getByRole('button', { name: 'Look up DSOE ID' }));
  userEvent.click(within(screen.getByRole('dialog', { name: 'DSOE Lookup' })).getByRole('row', { name: 'TRN01 OKO D A' }));
  userEvent.click(within(screen.getByRole('dialog', { name: 'DSOE Lookup' })).getByRole('button', { name: 'Select' }));
  expect(within(screen.getByRole('dialog', { name: 'Air Schedule' })).getByLabelText('DSOE ID')).toHaveValue('TRN01');
});

test('entering the DSOE ID in Shipment Planning fills the blank fields from its parameters', () => {
  let store = withParameters();
  store = createRecord(store, 'shipments', { tcn: 'TRNDEP0001XXX', tac: 'KEEP', inchecked: true });
  render(<Harness initialPage="planning" initialStore={store} />);
  userEvent.click(screen.getByRole('button', { name: 'Open TCN TRNDEP0001XXX' }));
  fireEvent.change(screen.getByLabelText('DSOE ID'), { target: { value: 'TRN01' } });
  expect(screen.getByLabelText('MIL Mode')).toHaveValue('F');
  expect(screen.getByLabelText('EDI Mode')).toHaveValue('ED');
  expect(screen.getByLabelText('Consignee')).toHaveValue('FB5209');
  expect(screen.getByLabelText('POD')).toHaveValue('OKO');
  expect(screen.getByLabelText('TAC')).toHaveValue('KEEP');
});

test('parameter rules', () => {
  expect(deploymentErrors({ ...emptyDeployment(), dsoeId: 'TRN01', deploymentExercise: 'D', milMode: 'F', origin: 'FA5030', tac: 'TR', eta: '9' }))
    .toEqual(['TAC must be 4 characters.', 'ETA must be 1-5 or X.']);
  const store = withParameters();
  expect(deploymentErrors({ ...emptyDeployment(), dsoeId: 'trn01', deploymentExercise: 'D', milMode: 'F', origin: 'FA5030' }, store.deployments, 'other'))
    .toEqual(['DSOE TRN01 already has deployment parameters.']);
  expect(planningDefaults(store, 'trn01', { milMode: '', ediMode: 'AF', tac: 'KEEP' })).toMatchObject({ milMode: 'F', ediMode: 'ED', origin: 'FA5030' });
  expect(planningDefaults(store, 'trn01', { tac: 'KEEP' })).not.toHaveProperty('tac');
  expect(planningDefaults(store, 'NONE1', {})).toEqual({});
});
