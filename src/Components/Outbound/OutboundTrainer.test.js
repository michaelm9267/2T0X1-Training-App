import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../App';
import * as workflow from '../CargoWindow/workflow';

beforeEach(() => { window.localStorage.clear(); jest.spyOn(workflow, 'randomDestination').mockReturnValue('FB5294'); });
afterEach(() => { jest.restoreAllMocks(); });

function openOutbound() {
  render(<App />);
  userEvent.click(screen.getByRole('tab', { name: 'Outbound Training' }));
}

test('opens the outbound trainer with its process steps in order', () => {
  openOutbound();
  const navigation = screen.getByRole('navigation', { name: 'Outbound process steps' });
  expect(within(navigation).getAllByRole('button').map(button => button.textContent))
    .toEqual(['1. Receive & inspect', '2. Pack', '3. Shipment planning', '4. Small package', '5. Surface freight', '6. AMC']);
  expect(screen.getByRole('button', { name: '2. Pack' })).toBeDisabled();
  expect(screen.getByRole('button', { name: '6. AMC' })).toHaveAccessibleDescription('Locked until the shipment is saved in Shipment planning with a Mil Mode');
  expect(screen.getByRole('combobox', { name: 'Shipping from' })).toHaveValue('jber');
  expect(screen.getByRole('heading', { name: 'Receive & inspect' })).toBeInTheDocument();
  expect(screen.getByRole('region', { name: 'Receiving bench' })).toBeInTheDocument();
  expect(screen.queryByRole('navigation', { name: 'CDF process steps' })).not.toBeInTheDocument();
});

test('shows the shipping document and enables item checks after inspecting the bench', () => {
  openOutbound();
  const nsnCheck = screen.getByRole('group', { name: 'NSN matches the item identification tag' });
  expect(within(nsnCheck).getByRole('button', { name: 'Satisfactory' })).toBeDisabled();
  userEvent.click(screen.getByRole('button', { name: /^View DD (1348-1A|1149)$/ }));
  const form = screen.getByRole('dialog', { name: /DD Form (1348-1A|1149)/ });
  expect(within(form).getAllByText(/FB50006285\d{4}/).length).toBeGreaterThan(0);
  userEvent.click(within(form).getByRole('button', { name: /Close/ }));
  expect(within(nsnCheck).getByRole('button', { name: 'Satisfactory' })).toBeDisabled();
  userEvent.click(screen.getByRole('button', { name: 'Inspect condition tag' }));
  expect(within(nsnCheck).getByRole('button', { name: 'Satisfactory' })).toBeEnabled();
  expect(within(screen.getByRole('group', { name: 'TAC / fund citation is present' })).getByRole('button', { name: 'Satisfactory' })).toBeEnabled();
});

test('keeps outbound progress when switching tabs', () => {
  openOutbound();
  userEvent.click(screen.getByRole('button', { name: /^View DD/ }));
  userEvent.click(screen.getByRole('button', { name: /Close DD Form/ }));
  userEvent.click(screen.getByRole('tab', { name: 'CDF Training' }));
  userEvent.click(screen.getByRole('tab', { name: 'Outbound Training' }));
  expect(within(screen.getByRole('group', { name: 'TAC / fund citation is present' })).getByRole('button', { name: 'Satisfactory' })).toBeEnabled();
});

test('drives CMOS Shipment Planning from the list to a saved record', () => {
  // A packed shipment, saved straight into the session so the test starts at Shipment planning.
  const { newOutboundSession } = require('./OutboundTrainer');
  const { packed } = require('./testHelpers');
  const session = newOutboundSession();
  const shipment = { ...session.shipments[0], advance: true };
  session.shipments[0] = shipment;
  session.exercises[shipment.key] = packed(shipment);
  session.stepId = 'planning';
  window.localStorage.setItem('outbound-trainer-session', JSON.stringify(session));
  openOutbound();
  userEvent.click(screen.getByRole('button', { name: 'Open CMOS Shipment Planning' }));
  const cmos = screen.getByRole('dialog', { name: 'CMOS Shipment Planning' });
  expect(within(cmos).getByText(/Logged in as TRAINEE at DODAAC: FA5030/)).toBeInTheDocument();
  expect(within(cmos).getByRole('button', { name: 'Incheck' })).toBeDisabled();
  userEvent.type(within(cmos).getByLabelText('TCN'), shipment.tcn);
  userEvent.click(within(cmos).getByRole('button', { name: 'Search' }));
  expect(within(cmos).getByText('1 row(s) found.')).toBeInTheDocument();
  userEvent.click(within(cmos).getByRole('button', { name: `Select ${shipment.tcn}` }));
  userEvent.click(within(cmos).getByRole('button', { name: 'Incheck' }));
  expect(within(cmos).getByLabelText('TCN')).toHaveValue(shipment.tcn);
  expect(within(cmos).getByLabelText('TCN')).not.toHaveAttribute('readonly');
  userEvent.click(within(cmos).getByRole('button', { name: 'Save' }));
  expect(within(cmos).getByRole('status')).toHaveTextContent(/Required: MIL Mode, NMFC\/UFC, CIIC/);
  userEvent.click(within(cmos).getByRole('button', { name: 'Look up Mil Mode codes' }));
  expect(within(cmos).getByRole('listbox', { name: 'Mil Mode codes' })).toHaveTextContent('J Air small parcel');
  userEvent.click(within(cmos).getByRole('button', { name: 'Show DD ' + shipment.document }));
  expect(screen.getByRole('complementary', { name: `DD ${shipment.document} (docked)` })).toBeInTheDocument();
});

test('prints the MSL from the Pieces tab, rates a small package and prints its documents', () => {
  const { newOutboundSession } = require('./OutboundTrainer');
  const { packed } = require('./testHelpers');
  const { newRecord, editRecord, addPiece, editPiece, savePlanning } = require('./cmosLogic');
  const session = newOutboundSession();
  const shipment = { ...session.shipments[0], advance: false };
  session.shipments[0] = shipment;
  let e = newRecord(shipment, packed(shipment));
  e = [['milMode', 'J'], ['nmfc', '061700'], ['ciic', 'U'], ['tcn', shipment.tcn], ['nsn', shipment.nsn], ['nomen', 'ITEM'], ['hazInd', 'N - Not hazardous']].reduce((state, [id, value]) => editRecord(state, id, value), e);
  e = ['weight', 'length', 'width', 'height'].reduce((state, id) => editPiece(state, 0, id, String(shipment.packed[id])), addPiece(e));
  e = savePlanning(shipment, e);
  expect(e.cmos.record.saved).toBe(true);
  session.exercises[shipment.key] = e;
  session.stepId = 'planning';
  window.localStorage.setItem('outbound-trainer-session', JSON.stringify(session));
  openOutbound();
  userEvent.click(screen.getByRole('button', { name: 'Open CMOS Shipment Planning' }));
  let cmos = screen.getByRole('dialog', { name: 'CMOS Shipment Planning' });
  userEvent.type(within(cmos).getByLabelText('TCN'), shipment.tcn);
  userEvent.click(within(cmos).getByRole('button', { name: 'Search' }));
  userEvent.click(within(cmos).getByRole('button', { name: shipment.tcn }));
  userEvent.click(within(cmos).getByRole('button', { name: 'Print All Pieces' }));
  const msl = screen.getByRole('dialog', { name: 'Military Shipping Label' });
  expect(within(msl).getByLabelText('Military shipping label, piece 1 of 1')).toHaveTextContent(shipment.tcn);
  userEvent.click(within(msl).getByRole('button', { name: 'Close Military Shipping Label' }));
  expect(screen.getByRole('dialog', { name: 'CMOS Shipment Planning' })).toBeInTheDocument();
  userEvent.click(within(cmos).getByRole('button', { name: 'Expr Ship' }));
  cmos = screen.getByRole('dialog', { name: 'CMOS Small Package Express' });
  [['SCAC', 'FDE'], ['DOM/INT', 'INT'], ['Service', 'Ground'], ['Package', 'Box']].forEach(([label, value]) => userEvent.selectOptions(within(cmos).getByRole('combobox', { name: label }), value));
  userEvent.click(within(cmos).getByRole('button', { name: 'Choose Shipment Date from calendar' }));
  userEvent.click(within(cmos).getByRole('button', { name: '12 OCT 2026' }));
  expect(within(cmos).getByLabelText('Shipment Date')).toHaveValue('12OCT2026');
  userEvent.type(within(cmos).getByLabelText('Dest City'), 'Anywhere');
  expect(within(cmos).getByRole('button', { name: 'Cancel' })).toBeDisabled();
  userEvent.click(within(cmos).getByRole('button', { name: 'Send Request' }));
  expect(within(cmos).getByRole('button', { name: 'Cancel' })).toBeEnabled();
  userEvent.click(within(cmos).getByRole('button', { name: 'Print Express Docs' }));
  const docs = screen.getByRole('dialog', { name: 'Print Small Package Express Documents' });
  expect(within(docs).getByText('1 row(s) found.')).toBeInTheDocument();
  expect(within(docs).getByRole('checkbox', { name: `Print Shipper's Declaration for ${shipment.tcn}` })).toBeDisabled();
  userEvent.click(within(docs).getByRole('checkbox', { name: `Print Shipping Label for ${shipment.tcn}` }));
  userEvent.click(within(docs).getByRole('button', { name: 'Print' }));
  expect(within(screen.getByRole('dialog', { name: 'Small Package Express Documents' })).getByLabelText('Carrier shipping label')).toHaveTextContent(shipment.tcn);
  userEvent.click(screen.getByRole('button', { name: 'Close Small Package Express Documents' }));
  userEvent.click(within(docs).getByRole('button', { name: 'Pickup Report' }));
  expect(within(screen.getByRole('dialog', { name: 'Pickup Report FDE' })).getByText(shipment.tcn)).toBeInTheDocument();
});

test('a New record, once saved, shows in the Shipment Planning list', () => {
  const { newOutboundSession } = require('./OutboundTrainer');
  const { packed } = require('./testHelpers');
  const session = newOutboundSession();
  const shipment = { ...session.shipments[0], advance: false };
  session.shipments[0] = shipment;
  session.exercises[shipment.key] = packed(shipment);
  session.stepId = 'planning';
  window.localStorage.setItem('outbound-trainer-session', JSON.stringify(session));
  openOutbound();
  userEvent.click(screen.getByRole('button', { name: 'Open CMOS Shipment Planning' }));
  const cmos = screen.getByRole('dialog', { name: 'CMOS Shipment Planning' });
  expect(within(cmos).queryByRole('button', { name: shipment.tcn })).not.toBeInTheDocument();
  userEvent.click(within(cmos).getByRole('button', { name: 'New' }));
  userEvent.type(within(cmos).getByLabelText('TCN'), shipment.tcn);
  [['MIL Mode', 'J'], ['NMFC/UFC', '061700'], ['CIIC', 'U'], ['NSN', shipment.nsn], ['Nomen', 'ITEM']].forEach(([label, value]) => userEvent.type(within(cmos).getByLabelText(label), value));
  userEvent.click(within(cmos).getByRole('tab', { name: 'Indicators' }));
  userEvent.selectOptions(within(cmos).getByLabelText('Hazardous/Ammunition Ind'), within(cmos).getByLabelText('Hazardous/Ammunition Ind').options[1].value);
  userEvent.click(within(cmos).getByRole('tab', { name: 'Pieces' }));
  userEvent.click(within(cmos).getByRole('button', { name: 'New' }));
  userEvent.type(within(cmos).getByLabelText('Piece 1 weight'), '20');
  userEvent.click(within(cmos).getByRole('button', { name: 'Save and Close' }));
  expect(within(cmos).getByRole('button', { name: shipment.tcn })).toBeInTheDocument();
  expect(within(cmos).getByText('1 row(s) found.')).toBeInTheDocument();
});
