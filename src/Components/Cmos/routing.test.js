import { useState } from 'react';
import { render, screen, within, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CmosWorkspace from './CmosWorkspace';
import { createCmosStore, createRecord } from './model';
import { nextShipmentId, routingErrors, ATR_HOURS } from './routingLogic';

function Harness({ initialStore }) {
  const [store, setStore] = useState(initialStore || createCmosStore);
  return <><CmosWorkspace store={store} onChange={setStore} initialPage="routing" context={{ now: new Date(2026, 9, 15, 9, 0) }} onClose={() => {}} /><output aria-label="Stored data">{JSON.stringify(store)}</output></>;
}
const stored = () => JSON.parse(screen.getByLabelText('Stored data').textContent);
// New opens Assign TCNs/Aggregates first; close it to work on the order.
const newOrder = () => {
  userEvent.click(screen.getByRole('button', { name: 'New' }));
  userEvent.click(within(screen.getByRole('dialog', { name: 'Assign TCNs/Aggregates' })).getByRole('button', { name: 'Close' }));
};
const options = (label) => within(screen.getByLabelText(label)).getAllByRole('option').map((o) => o.textContent).filter(Boolean);

test('Routings lists route orders with the reference search and columns', () => {
  render(<Harness />);
  expect(screen.getByLabelText('Start Date')).toHaveAttribute('placeholder', 'ddmmmyyyy');
  for (const column of ['Shipment ID', 'Release ID', 'Dest DODAAC', 'Release Type', 'Requester Name', 'Request Status', 'Request Date', 'TCN Assigned', 'Avail Date'])
    expect(screen.getByRole('columnheader', { name: column })).toBeInTheDocument();
  expect(screen.getByText('9 row(s) found.')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Start Date'), { target: { value: '10Oct2026' } });
  userEvent.click(screen.getByRole('button', { name: 'Search' }));
  expect(screen.getByText('4 row(s) found.')).toBeInTheDocument();
});

test('New generates the Shipment ID and opens Route Orders with the reference defaults and options', () => {
  render(<Harness />);
  newOrder();
  expect(screen.getByLabelText('Shipment ID')).toHaveValue('MKFZ162880001');
  expect(screen.getByLabelText('Shipment ID')).toHaveAttribute('readonly');
  expect(screen.getByLabelText('ATR')).toBeChecked();
  expect(screen.getByLabelText('Route Order Type')).toHaveValue('B');
  expect(options('Route Order Type')).toEqual(['B - Voluntary Tender', 'S - Spotbid']);
  expect(screen.getByLabelText('Request Type')).toHaveValue('OR');
  expect(options('Request Type')).toEqual(['OR - Original', 'CO - Correction to a previously transmitted request', 'AI - Amend (requesting additional carriers)', 'CA - Cancel a previously transmitted request', 'RB - Recost']);
  expect(screen.getByLabelText('Route ID')).toHaveValue('RG');
  expect(options('Route ID')).toEqual(['RG - Route Order Number-Domestic', 'RH - Route Order Number-Export', 'RJ - Route Order Number-Emergency']);
  expect(options('ATR Carrier Response Hours').slice(0, 3)).toEqual(['0.25', '0.5', '1']);
  expect(screen.getByLabelText('ATR Carrier Response Hours')).toHaveValue('');
  expect(screen.getByLabelText('Send Electronic?')).toBeChecked();
  expect(screen.getByLabelText('SCACs Requested')).toHaveValue(24);
  expect(options('ATR Carrier Response Hours').at(-1)).toBe('48');
  // Request Date is stamped when the request is sent.
  expect(screen.getByLabelText('Request Date')).toHaveValue('');
  expect(screen.getByLabelText('Requester DODAAC')).toHaveValue('FA5030');
  expect(screen.getByLabelText('Request Status')).toBeDisabled();
  expect(screen.getByLabelText('Svc Agency Code')).toHaveValue('F');
  expect(options('Svc Agency Code')).toEqual(['A - ARMY', 'B - DEFENSE MAPPING AGENCY', 'F - AIR FORCE', 'M - MARINE CORPS', 'N - NAVY', 'P - COAST GUARD', 'S - DEFENSE LOGISTICS AGENCY', 'U - GSA', 'W - ARMY and AF EXCHANGE SERVICE', 'Y - NON-DOD (EXCEPT COAST GUARD)', 'X - MULTI-SERVICES']);
  expect(options('Air Svc Type')).toEqual(['AA - AIRPORT TO AIRPORT', 'DA - DOOR TO AIRPORT OF DEBARKATION', 'DD - DOOR TO DOOR', 'AD - AIRPORT TO DOOR']);
  expect(options('Air Svc Level')).toEqual(['SG - PRIORITY', 'D1 - OVERNIGHT', 'D2 - SECOND DAY', 'D3 - DEFERRED']);
  for (const id of ['atrHours', 'primaryEqInitials', 'primaryEqNumber'])
    expect(document.querySelector(`[data-field="${id}"] .shared-required-mark`)).toHaveTextContent('*');
  expect(screen.getByLabelText('Primary EQ Initials')).toBeDisabled();
  for (const name of ['TCNs', 'Addresses', 'Water Port', 'Notices', 'Status']) expect(screen.getByRole('tab', { name })).toBeInTheDocument();
  for (const name of ['Print Route Report', 'Ship Plan', 'Delete', 'Save', 'Save and Close', 'Close']) expect(screen.getByRole('button', { name, exact: true })).toBeInTheDocument();
});

test('required fields block Save: ATR hours always, Primary EQ for staged equipment', () => {
  render(<Harness />);
  newOrder();
  userEvent.selectOptions(screen.getByLabelText('ATR Carrier Response Hours'), '');
  userEvent.click(screen.getByLabelText('Staged Equipment?'));
  expect(screen.getByLabelText('Primary EQ Initials')).toBeEnabled();
  userEvent.click(screen.getByRole('button', { name: 'Save', exact: true }));
  const alert = screen.getByRole('alert');
  expect(alert).toHaveTextContent('ATR Carrier Response Hours is required.');
  expect(alert).toHaveTextContent('Primary EQ Initials is required.');
  expect(alert).toHaveTextContent('Primary EQ Number is required.');
  expect(stored().routings['routings-1'].saved).toBeNull();
  userEvent.selectOptions(screen.getByLabelText('ATR Carrier Response Hours'), '0.25');
  fireEvent.change(screen.getByLabelText('Primary EQ Initials'), { target: { value: 'TRNU' } });
  fireEvent.change(screen.getByLabelText('Primary EQ Number'), { target: { value: '123456' } });
  userEvent.click(screen.getByRole('button', { name: 'Save', exact: true }));
  expect(stored().routings['routings-1'].saved).toMatchObject({ atrHours: '0.25', primaryEqInitials: 'TRNU' });
});

test('shipment IDs number serially per Julian day and rules check formats', () => {
  let store = createRecord(createCmosStore(), 'routings', { shipmentId: 'MKFZ162880004' });
  expect(nextShipmentId(store, 'MKFZ', new Date(2026, 9, 15))).toBe('MKFZ162880005');
  expect(nextShipmentId(store, 'MKFZ', new Date(2026, 9, 16))).toBe('MKFZ162890001');
  expect(ATR_HOURS).toHaveLength(50);
  expect(routingErrors({ atrHours: '49' })).toEqual(['ATR Carrier Response Hours must be 0.25 - 48.']);
  expect(routingErrors({ atrHours: '2', pickupEarliest: '16Oct2026/0800', deliveryLatest: '15Oct2026/0800', requestDate: '2026-10-15' }))
    .toEqual(['Request Date must be ddmmmyyyy.', 'Requested pickup must be before requested delivery.']);
});

test('earliest pickup must be at least 2 hours after the ATR carrier response times out (Eastern Time)', () => {
  const { easternNow } = require('./routingLogic');
  const { formatScheduleDateTime } = require('./airScheduleLogic');
  render(<Harness />);
  newOrder();
  userEvent.selectOptions(screen.getByLabelText('ATR Carrier Response Hours'), '3');
  expect(screen.getByLabelText('Pickup Earliest')).toHaveAttribute('title', expect.stringContaining('Eastern Time'));
  const minimum = new Date(easternNow(new Date(2026, 9, 15, 9, 0)).getTime() + 5 * 3600e3);
  fireEvent.change(screen.getByLabelText('Pickup Earliest'), { target: { value: formatScheduleDateTime(new Date(minimum.getTime() - 60e3)) } });
  userEvent.click(screen.getByRole('button', { name: 'Save', exact: true }));
  expect(screen.getByRole('alert')).toHaveTextContent(`no earlier than ${formatScheduleDateTime(minimum)} Eastern`);
  fireEvent.change(screen.getByLabelText('Pickup Earliest'), { target: { value: formatScheduleDateTime(minimum) } });
  userEvent.click(screen.getByRole('button', { name: 'Save', exact: true }));
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

test('date fields open a calendar; date/time fields add a time', () => {
  render(<Harness />);
  newOrder();
  userEvent.click(screen.getByRole('button', { name: 'Choose Exp Date' }));
  const calendar = within(screen.getByRole('dialog', { name: 'Exp Date calendar' }));
  userEvent.click(calendar.getByRole('button', { name: 'Next month' }));
  userEvent.click(calendar.getByRole('button', { name: '05Feb2027' }));
  expect(screen.getByLabelText('Exp Date')).toHaveValue('05Feb2027');
  userEvent.click(screen.getByRole('button', { name: 'Choose Delivery Latest' }));
  const picker = within(screen.getByRole('dialog', { name: 'Delivery Latest calendar' }));
  fireEvent.change(picker.getByLabelText('Delivery Latest time'), { target: { value: '1630' } });
  userEvent.click(picker.getByRole('button', { name: '20Oct2026' }));
  expect(screen.getByLabelText('Delivery Latest')).toHaveValue('20Oct2026/1630');
  expect(screen.queryByRole('dialog', { name: 'Delivery Latest calendar' })).not.toBeInTheDocument();
});

test('New opens Assign TCNs/Aggregates with only finished Shipment Planning TCNs marked for Routing', () => {
  const { saveRecord, checkRecord } = require('./model');
  let store = createCmosStore();
  const add = (tcn, extra) => {
    store = createRecord(store, 'shipments', { tcn, description: 'TRAINING BOX', origin: 'FA5030', destination: 'FB4497', milMode: 'J', ediMode: 'J', nmfc: '999913', rdd: '999', nsn: 'NNSN', ciic: 'U', tac: 'TRN1', routing: true, tp: '2', ...extra });
    const id = store.selection.shipments;
    store = createRecord(store, 'pieces', { shipmentId: id, weight: '10', length: '12', width: '12', height: '12', typePack: 'BX' });
    store = saveRecord(store, 'pieces', store.selection.pieces);
    store = checkRecord(saveRecord(store, 'shipments', id), 'shipments', id);
  };
  add('TRNREADY001XXX');
  add('TRNNOROUTE01XX', { routing: false });
  add('TRNTP4000001XX', { tp: '4' });
  add('TRNFAILS001XXX', { nsn: '' });
  render(<Harness initialStore={store} />);
  userEvent.click(screen.getByRole('button', { name: 'New' }));
  const picker = within(screen.getByRole('dialog', { name: 'Assign TCNs/Aggregates' }));
  expect(screen.getByRole('heading', { name: /TIP: TCNs with a trans priority of 4 will not display/ })).toBeInTheDocument();
  for (const column of ['TCN', 'MIL Mode', 'EDI Mode', 'Consignor DODAAC', 'Consignee DODAAC', 'DSOE_ID', 'CHALK', 'Ovr Dm', 'Haz Ind', 'Advice Number', 'Acct Class', 'Cost', 'TAC'])
    expect(picker.getByRole('columnheader', { name: column })).toBeInTheDocument();
  expect(picker.getByText('1 row(s) found.')).toBeInTheDocument();
  for (const name of ['Assign', 'Ship Plan', 'Clear']) expect(picker.getByRole('button', { name, exact: true })).toBeInTheDocument();
  expect(picker.getByRole('button', { name: 'Assign', exact: true })).toBeDisabled();
  userEvent.click(picker.getByRole('row', { name: 'Assign TRNREADY001XXX' }));
  expect(picker.getByText('Rows Selected1')).toBeInTheDocument();
  userEvent.click(picker.getByRole('button', { name: 'Assign', exact: true }));
  expect(picker.getByText('0 row(s) found.')).toBeInTheDocument();
  userEvent.click(picker.getByRole('tab', { name: 'Assign Aggregates' }));
  expect(picker.getByText('No data to display.')).toBeInTheDocument();
  userEvent.click(picker.getByRole('button', { name: 'Close' }));
  expect(screen.getByLabelText('TCNs Assigned')).toHaveValue('Y');
  expect(stored().routings['routings-1'].draft.shipmentIds).toHaveLength(1);
});

test('route order tabs: equipment groups, stop offs, load plan and response follow the assigned TCNs', () => {
  const { saveRecord, checkRecord } = require('./model');
  let store = createCmosStore();
  store = createRecord(store, 'shipments', { tcn: 'TRNEQUIP001XXX', description: 'TRAINING BOX', origin: 'FA5030', destination: 'FB4497', milMode: 'B', ediMode: 'LT', nmfc: '137300', rdd: '999', nsn: 'NNSN', ciic: 'U', tac: 'TRN1', routing: true, tp: '2' });
  store = createRecord(store, 'pieces', { shipmentId: 'shipments-1', weight: '291', length: '48', width: '40', height: '59', typePack: 'PLT' });
  store = saveRecord(store, 'pieces', 'pieces-1');
  store = checkRecord(saveRecord(store, 'shipments', 'shipments-1'), 'shipments', 'shipments-1');
  render(<Harness initialStore={store} />);
  userEvent.click(screen.getByRole('button', { name: 'New' }));
  userEvent.click(within(screen.getByRole('dialog', { name: 'Assign TCNs/Aggregates' })).getByRole('row', { name: 'Assign TRNEQUIP001XXX' }));
  userEvent.click(within(screen.getByRole('dialog', { name: 'Assign TCNs/Aggregates' })).getByRole('button', { name: 'Assign', exact: true }));
  userEvent.click(within(screen.getByRole('dialog', { name: 'Assign TCNs/Aggregates' })).getByRole('button', { name: 'Close' }));
  expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['TCNs', 'Equip Group Mode', 'Stop Offs', 'Equip Load Plan', 'Response', 'Addresses', 'Water Port', 'Notices', 'Status']);
  const panel = () => within(screen.getByRole('tabpanel'));
  expect(panel().getByRole('button', { name: 'Acct Fund' })).toBeEnabled();
  expect(panel().getByLabelText('TRNEQUIP001XXX Equip Group ID')).toHaveValue('01');
  expect(panel().getByLabelText('TRNEQUIP001XXX Stop Ld')).toHaveValue('00');
  expect(panel().getByLabelText('TRNEQUIP001XXX Stop UL')).toHaveValue('99');
  // No B/L until Create CBL generates the Commercial BOL.
  expect(panel().queryByRole('cell', { name: /^MKFZ7\d{5}$/ })).not.toBeInTheDocument();
  userEvent.click(screen.getByRole('tab', { name: 'Equip Group Mode' }));
  expect(panel().getByLabelText('Equip group 01 EDI Mode')).toHaveValue('LT');
  userEvent.click(panel().getByRole('button', { name: 'Look up Equip group 01 EDI Mode' }));
  const modes = within(screen.getByRole('dialog', { name: 'MIL/EDI Mode Code Lookup' }));
  userEvent.click(modes.getByRole('row', { name: /^A J MOTOR, TRUCKLOAD/ }));
  userEvent.click(modes.getByRole('button', { name: 'Select' }));
  expect(panel().getByLabelText('Equip group 01 EDI Mode')).toHaveValue('J');
  userEvent.click(screen.getByRole('tab', { name: 'Stop Offs' }));
  for (const column of ['Equip Group', 'Stop', 'DODAAC', 'SPLC', 'RSN', 'Stop Type', 'Date/Time', 'POC', 'Address 1', 'Address 2', 'City', 'Country', 'State', 'ZIP', 'Phone', 'Intl?'])
    expect(panel().getByRole('columnheader', { name: column })).toBeInTheDocument();
  expect(panel().getByRole('cell', { name: 'FB4497' })).toBeInTheDocument();
  expect(panel().getByRole('cell', { name: 'UL' })).toBeInTheDocument();
  fireEvent.change(panel().getByLabelText('Stop 99 POC'), { target: { value: 'SSGT TRAINER' } });
  userEvent.click(panel().getByRole('button', { name: 'Update' }));
  expect(stored().routings['routings-1'].draft.stops['01-99'].poc).toBe('SSGT TRAINER');
  userEvent.click(screen.getByRole('tab', { name: 'Equip Load Plan' }));
  expect(panel().getByRole('cell', { name: '137300-0' })).toBeInTheDocument();
  expect(panel().getByRole('cell', { name: '291' })).toBeInTheDocument();
  userEvent.click(panel().getByLabelText('Fully Loaded'));
  userEvent.click(panel().getByRole('button', { name: 'Save' }));
  expect(panel().getByLabelText('Equip group 01 fully loaded')).toBeChecked();
  for (const name of ['Service Codes', 'Equipment']) expect(panel().getByRole('button', { name })).toBeEnabled();
  userEvent.click(panel().getByRole('button', { name: 'Equipment' }));
  expect(screen.getByRole('dialog', { name: 'Equipment' })).toHaveTextContent('Equipment Group: 01');
});

test('Manage Routings guide, steps 11–28: assign, copy, equipment, Edit Data, Send Request, then CR', () => {
  const { saveRecord, checkRecord } = require('./model');
  const { splcFor, EQUIPMENT_TYPE_ROWS } = require('./routingRequest');
  let store = createCmosStore();
  store = createRecord(store, 'shipments', { tcn: 'FA50305084X001XXX', description: 'MANAGE ROUTINGS', origin: 'FA5030', destination: 'FB4497', milMode: 'B', ediMode: 'LT', nmfc: '999913', rdd: '110', nsn: 'NNSN', ciic: 'U', tac: 'BOND', routing: true, tp: '1' });
  store = createRecord(store, 'pieces', { shipmentId: 'shipments-1', weight: '450', length: '40', width: '25', height: '15', typePack: 'PT' });
  store = saveRecord(store, 'pieces', 'pieces-1');
  store = checkRecord(saveRecord(store, 'shipments', 'shipments-1'), 'shipments', 'shipments-1');
  render(<Harness initialStore={store} />);
  const message = () => screen.getAllByRole('status').find((el) => el.getAttribute('aria-live') === 'polite');
  // Steps 11–12: New opens Assign TCNs/Aggregates; select the TCN and Assign.
  userEvent.click(screen.getByRole('button', { name: 'New' }));
  let picker = within(screen.getByRole('dialog', { name: 'Assign TCNs/Aggregates' }));
  userEvent.click(picker.getByRole('row', { name: 'Assign FA50305084X001XXX' }));
  userEvent.click(picker.getByRole('button', { name: 'Assign', exact: true }));
  userEvent.click(picker.getByRole('button', { name: 'Close' }));
  for (const name of ['Send Request', 'Edit Data', 'Print Route Report', 'Ship Plan', 'Delete', 'Save', 'Save and Close', 'Close'])
    expect(screen.getByRole('button', { name, exact: true })).toBeInTheDocument();
  // Step 13: Copy TCN Data fills the destination, SPLCs, UMMIPS RDD and TP.
  userEvent.click(screen.getByRole('button', { name: 'Copy TCN Data' }));
  expect(screen.getByLabelText('Dest DODAAC')).toHaveValue('FB4497');
  expect(screen.getByLabelText('Dest SPLC')).toHaveValue(splcFor('FB4497'));
  expect(screen.getByLabelText('UMMIPS RDD')).toHaveValue('110');
  expect(screen.getByLabelText('TP')).toHaveValue(1);
  // Steps 14–15: ATR hours and pickup/delivery date/times.
  userEvent.selectOptions(screen.getByLabelText('ATR Carrier Response Hours'), '0.25');
  for (const [label, value] of [['Pickup Earliest', '26Mar2030/0800'], ['Pickup Latest', '27Mar2030/0800'], ['Delivery Earliest', '07Apr2030/1400'], ['Delivery Latest', '08Apr2030/1400']])
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  userEvent.click(screen.getByRole('button', { name: 'Save', exact: true }));
  // Edit Data before equipment fails.
  userEvent.click(screen.getByRole('button', { name: 'Edit Data' }));
  expect(message()).toHaveTextContent('Add equipment to equip group 01 in the Equip Load Plan.');
  // Steps 16–24: Equip Load Plan → Equipment → New → lookup AV1 → Add → Close → Close → Save.
  userEvent.click(screen.getByRole('tab', { name: 'Equip Load Plan' }));
  userEvent.click(screen.getByRole('button', { name: 'Equipment' }));
  const equipment = within(screen.getByRole('dialog', { name: 'Equipment' }));
  expect(equipment.getByText('0 row(s) found.')).toBeInTheDocument();
  userEvent.click(equipment.getByRole('button', { name: 'New' }));
  const fresh = within(screen.getByRole('dialog', { name: 'New Equipment' }));
  userEvent.click(fresh.getByRole('button', { name: 'Look up Equip Type' }));
  const types = within(screen.getByRole('dialog', { name: 'Equipment Type Lookup' }));
  expect(types.getByText(`${EQUIPMENT_TYPE_ROWS.length} row(s) found.`)).toBeInTheDocument();
  userEvent.click(types.getByRole('row', { name: 'AV1 M - MOTOR VAN, CLOSED, 30 FT AND LESS' }));
  userEvent.click(types.getByRole('button', { name: 'Select' }));
  expect(fresh.getByLabelText('Equip Type')).toHaveValue('AV1');
  userEvent.click(fresh.getByRole('button', { name: 'Add' }));
  expect(fresh.getByLabelText('Equip Type')).toHaveValue('');
  userEvent.click(fresh.getByRole('button', { name: 'Close' }));
  expect(equipment.getByRole('cell', { name: 'AV1' })).toBeInTheDocument();
  userEvent.click(equipment.getByRole('button', { name: 'Close' }));
  userEvent.click(within(screen.getByRole('tabpanel')).getByRole('button', { name: 'Save' }));
  // Steps 25–26: Edit Data → Passed Edits.
  userEvent.click(screen.getByRole('button', { name: 'Edit Data' }));
  expect(message()).toHaveTextContent('Information');
  expect(message()).toHaveTextContent('Passed Edits');
  // Step 27: Send Request → RR, GFM ID, Routing Order Number, Request Date; the order locks and
  // the ATR window is simulated for 10 seconds.
  jest.useFakeTimers();
  userEvent.click(screen.getByRole('button', { name: 'Send Request' }));
  let order = stored().routings['routings-1'];
  expect(order.draft).toMatchObject({ requestStatus: 'RR', requestDate: '15Oct2026' });
  expect(order.draft.gfmId).toMatch(/^\d{13}$/);
  expect(order.draft.routingOrderNumber).toMatch(/^7KFZ\d{5}A$/);
  expect(screen.getByRole('alertdialog', { name: 'Simulating ATR Time' })).toHaveTextContent('10 seconds remaining');
  for (let i = 0; i < 10; i++) act(() => { jest.advanceTimersByTime(1000); });
  jest.useRealTimers();
  expect(screen.queryByRole('alertdialog', { name: 'Simulating ATR Time' })).not.toBeInTheDocument();
  order = stored().routings['routings-1'];
  expect(order.draft.requestStatus).toBe('CR');
  expect(screen.getByLabelText('ATR Carrier Response Hours')).toBeDisabled();
  expect(screen.queryByRole('button', { name: 'Send Request' })).not.toBeInTheDocument();
  // Response tab: Update, Create CBL, Assign/Remove SCAC.
  expect(screen.getByRole('tab', { name: 'Response' })).toHaveAttribute('aria-selected', 'true');
  const panel = () => within(screen.getByRole('tabpanel'));
  for (const column of ['Equip Group', 'DSOE ID', 'Chalk', 'Assigned SCAC', 'Tender', 'B/L', 'Award Status']) expect(panel().getByRole('columnheader', { name: column })).toBeInTheDocument();
  // Create CBL comes first; until then Assign/Remove SCAC is unavailable.
  expect(panel().getByRole('button', { name: 'Assign/Remove SCAC' })).toBeDisabled();
  userEvent.click(panel().getByRole('button', { name: 'Create CBL' }));
  let bill = Object.values(stored().bills)[0];
  expect(bill.draft).toMatchObject({ shipmentIds: ['shipments-1'] });
  expect(bill.draft.scac || '').toBe('');
  // After Create CBL: Update | B/L | Assign/Remove SCAC | Assign Lowest Cost SCAC, and the B/L shows.
  expect(panel().queryByRole('button', { name: 'Create CBL' })).not.toBeInTheDocument();
  for (const name of ['Update', 'B/L', 'Assign/Remove SCAC', 'Assign Lowest Cost SCAC']) expect(panel().getByRole('button', { name })).toBeInTheDocument();
  expect(panel().queryByRole('button', { name: 'Award' })).not.toBeInTheDocument();
  // The B/L is the movement document number of the bill Create CBL made.
  expect(panel().getByRole('cell', { name: bill.draft.movementDocNbr })).toBeInTheDocument();
  userEvent.click(panel().getByRole('button', { name: 'Assign/Remove SCAC' }));
  const scac = within(screen.getByRole('dialog', { name: 'SCAC' }));
  for (const column of ['Assigned', 'SCAC', 'Total Cost', 'Max Days', 'Tender', 'EQ Type', 'NMFC/UFC', 'RSN', 'Cumulative Weight', 'Conveyances Avail', 'Conveyances Used', 'Trans Mode'])
    expect(scac.getByRole('columnheader', { name: column })).toBeInTheDocument();
  expect(scac.getByText('7 row(s) found.')).toBeInTheDocument();
  const carriers = order.draft.equipGroups['01'].carriers;
  expect(carriers.map((c) => c.totalCost)).toEqual([...carriers.map((c) => c.totalCost)].sort((a, b) => a - b));
  expect(within(scac.getByLabelText(`RSN ${carriers[0].scac}`)).getAllByRole('option')).toHaveLength(41);
  // Passing over the lowest cost carrier needs a reason.
  userEvent.click(scac.getByRole('row', { name: `SCAC ${carriers[1].scac}` }));
  expect(scac.getByRole('alert')).toHaveTextContent(`Select a reason (RSN) for not using lower cost SCAC ${carriers[0].scac}.`);
  userEvent.selectOptions(scac.getByLabelText(`RSN ${carriers[0].scac}`), 'N4');
  userEvent.click(scac.getByRole('row', { name: `SCAC ${carriers[1].scac}` }));
  expect(within(scac.getByRole('row', { name: `SCAC ${carriers[1].scac}` })).getAllByRole('cell')[0]).toHaveTextContent('X');
  userEvent.click(scac.getByRole('button', { name: 'Close' }));
  expect(panel().getByRole('cell', { name: carriers[1].scac })).toBeInTheDocument();
  // With a SCAC assigned, Assign Lowest Cost SCAC has become Award (CR → AW).
  expect(panel().queryByRole('button', { name: 'Assign Lowest Cost SCAC' })).not.toBeInTheDocument();
  userEvent.click(panel().getByRole('button', { name: 'Award' }));
  order = stored().routings['routings-1'];
  expect(order.draft).toMatchObject({ requestStatus: 'AW', releaseId: order.draft.routingOrderNumber });
  expect(panel().getByRole('cell', { name: 'AWARDED' })).toBeInTheDocument();
  expect(order.draft.requestLog.map((e) => e.action)).toEqual(['SHIP ID CREATED', 'ORIGINAL REQ', 'REQUEST SENT', 'FORWARDED TO ATR', 'REQUEST SENT', 'ROUT RESPONSE REC', 'AWARDED']);
  // Print Route Report: summary plus a carrier detail page per carrier.
  userEvent.click(screen.getByRole('button', { name: 'Print Route Report' }));
  const report = screen.getByRole('dialog', { name: 'Route report', exact: true });
  expect(report).toHaveTextContent('Route Order Request Summary');
  expect(report).toHaveTextContent('AW/AWARDED');
  expect(report).toHaveTextContent(`SCAC ASSIGNED: ${carriers[1].scac}`);
  expect(within(report).getAllByText(/CARRIER DETAIL EQUIP GROUP 01/)).toHaveLength(7);
  // The CBL carries the route order and the assigned carrier: routing, route ID, tender, costs.
  bill = Object.values(stored().bills)[0];
  expect(bill.draft).toMatchObject({
    scac: carriers[1].scac, shipmentIds: ['shipments-1'], routing: order.draft.routingOrderNumber, routeId: 'RG', routingStatus: 'AW',
    estimatedCharges: carriers[1].totalCost.toFixed(2), ratedMileage: String(carriers[1].ratedMiles), reason: 'N4',
    costDiff: (carriers[1].totalCost - carriers[0].totalCost).toFixed(2), deliveryDate: '08Apr2030', deliveryDateType: 'Required',
  });
  expect(bill.draft.tariffSpecialRateAuth).toMatch(new RegExp(`^${carriers[1].tender} - B `));
});

test('Equip Load Plan Service Codes: list, New form, Service Code Lookup and Stop 99', () => {
  const { saveRecord, checkRecord } = require('./model');
  let store = createCmosStore();
  store = createRecord(store, 'shipments', { tcn: 'TRNSVC0001XXX', description: 'X', origin: 'FA5030', destination: 'FB4497', milMode: 'B', ediMode: 'LT', nmfc: '999912', rdd: '777', nsn: 'NNSN', ciic: 'U', tac: 'TRN1', routing: true, tp: '2' });
  store = createRecord(store, 'pieces', { shipmentId: 'shipments-1', weight: '500', length: '48', width: '40', height: '59', typePack: 'PT' });
  store = saveRecord(store, 'pieces', 'pieces-1');
  store = checkRecord(saveRecord(store, 'shipments', 'shipments-1'), 'shipments', 'shipments-1');
  render(<Harness initialStore={store} />);
  userEvent.click(screen.getByRole('button', { name: 'New' }));
  const picker = within(screen.getByRole('dialog', { name: 'Assign TCNs/Aggregates' }));
  userEvent.click(picker.getByRole('row', { name: 'Assign TRNSVC0001XXX' }));
  userEvent.click(picker.getByRole('button', { name: 'Assign', exact: true }));
  userEvent.click(picker.getByRole('button', { name: 'Close' }));
  userEvent.click(screen.getByRole('tab', { name: 'Equip Load Plan' }));
  userEvent.click(screen.getByRole('button', { name: 'Service Codes' }));
  const list = within(screen.getByRole('dialog', { name: 'Service Code' }));
  expect(list.getByText('Equipment Group: 01')).toBeInTheDocument();
  for (const column of ['Svc Code', 'Svc Code Type', 'Special Charges Desc', 'Stop']) expect(list.getByRole('columnheader', { name: column })).toBeInTheDocument();
  expect(list.queryByRole('button', { name: /Close Service Code/ })).not.toBeInTheDocument();
  userEvent.click(list.getByRole('button', { name: 'New' }));
  const form = within(screen.getAllByRole('dialog', { name: 'Service Code' }).at(-1));
  expect(form.getByLabelText('Svc Code Type')).toHaveAttribute('readonly');
  expect(within(form.getByLabelText('Stop')).getAllByRole('option').map((o) => o.textContent)).toEqual(['', '99']);
  userEvent.click(form.getByRole('button', { name: 'Look up Service Code' }));
  const lookup = within(screen.getByRole('dialog', { name: 'Service Code Lookup' }));
  for (const column of ['Service Code', 'Service Code Type', 'Description']) expect(lookup.getByRole('columnheader', { name: column })).toBeInTheDocument();
  userEvent.click(lookup.getByRole('row', { name: 'CIS TPS CONSTANT SURVEILLANCE' }));
  userEvent.click(lookup.getByRole('button', { name: 'Select' }));
  expect(form.getByLabelText('Service Code')).toHaveValue('CIS');
  expect(form.getByLabelText('Svc Code Type')).toHaveValue('TPS');
  expect(form.getByLabelText('Special Charge Desc')).toHaveValue('CONSTANT SURVEILLANCE');
  userEvent.selectOptions(form.getByLabelText('Stop'), '99');
  userEvent.click(form.getByRole('button', { name: 'Save' }));
  expect(list.getByRole('row', { name: 'CIS TPS CONSTANT SURVEILLANCE 99' })).toBeInTheDocument();
  expect(stored().routings['routings-1'].draft.equipGroups['01'].serviceCodes).toEqual([{ code: 'CIS', type: 'TPS', desc: 'CONSTANT SURVEILLANCE', stop: '99' }]);
});

test('Service Code Lookup lists every DTR shipment unit special handling code', () => {
  const { SERVICE_CODES } = require('./routingRequest');
  expect(SERVICE_CODES.length).toBeGreaterThan(500);
  const find = (code) => SERVICE_CODES.find(([c]) => c === code);
  expect(find('045')).toEqual(['045', 'ACC', 'ADVANCING CHARGES']);
  expect(find('CIS')).toEqual(['CIS', 'TPS', 'CONSTANT SURVEILLANCE']);
  expect(find('AGS')).toEqual(['AGS', 'TPS', 'ARMED GUARD SERVICE']);
  expect(find('SVS')[1]).toBe('ACC');
  expect(find('HRS')[1]).toBe('ACC');
  expect(find('405')).toEqual(['405', 'ACC', 'FUEL ADJUSTMENT']);
  expect(find('ZZZ')).toBeUndefined();
});

test('after Create CBL, Assign Lowest Cost SCAC assigns the cheapest carrier and B/L opens the CBL', () => {
  const { saveRecord, checkRecord } = require('./model');
  const { sendRequest, receiveResponses } = require('./routingRequest');
  let store = createCmosStore();
  store = createRecord(store, 'shipments', { tcn: 'TRNLOW0001XXX', description: 'X', origin: 'FA5030', destination: 'FB4497', milMode: 'B', ediMode: 'LT', nmfc: '999913', rdd: '777', nsn: 'NNSN', ciic: 'U', tac: 'TRN1', routing: true, tp: '2' });
  store = createRecord(store, 'pieces', { shipmentId: 'shipments-1', weight: '270', length: '48', width: '40', height: '59', typePack: 'PT' });
  store = saveRecord(store, 'pieces', 'pieces-1');
  store = checkRecord(saveRecord(store, 'shipments', 'shipments-1'), 'shipments', 'shipments-1');
  store = createRecord(store, 'routings', { shipmentId: 'MKFZ162880001', origin: 'FA5030', destination: 'FB4497', atrHours: '1', shipmentIds: ['shipments-1'], equipGroups: { '01': { equipment: ['AV2'] } } });
  store = saveRecord(store, 'routings', 'routings-1');
  store = receiveResponses(sendRequest(store, 'routings-1', new Date(2026, 9, 15, 9)), 'routings-1', new Date(2026, 9, 15, 9), { force: true });
  render(<Harness initialStore={store} />);
  // The selected route order opens directly.
  userEvent.click(screen.getByRole('tab', { name: 'Response' }));
  const panel = () => within(screen.getByRole('tabpanel'));
  expect(panel().queryByRole('button', { name: 'Assign Lowest Cost SCAC' })).not.toBeInTheDocument();
  userEvent.click(panel().getByRole('button', { name: 'Create CBL' }));
  userEvent.click(panel().getByRole('button', { name: 'Assign Lowest Cost SCAC' }));
  expect(panel().getByRole('button', { name: 'Award' })).toBeEnabled();
  const lowest = stored().routings['routings-1'].draft.equipGroups['01'].carriers[0].scac;
  expect(panel().getByRole('cell', { name: lowest })).toBeInTheDocument();
  expect(Object.values(stored().bills)[0].draft.scac).toBe(lowest);
  userEvent.click(panel().getByRole('button', { name: 'B/L' }));
  expect(screen.getByRole('dialog', { name: 'CMOS Commercial Bill of Lading' })).toBeInTheDocument();
  expect(screen.getByLabelText('Movement Doc Nbr')).toHaveValue(Object.values(stored().bills)[0].draft.movementDocNbr);
});

test('a saved, complete TCN with Routing checked is offered to a route order without a separate Edit Check', () => {
  const { saveRecord, editRecord } = require('./model');
  const { routingCandidates } = require('./RoutingScreen');
  const complete = { description: 'TRAINING BOX', origin: 'FA5030', destination: 'FB4497', milMode: 'B', ediMode: 'LT', nmfc: '137300', rdd: '999', nsn: 'NNSN', ciic: 'U', tac: 'TRN1', tp: '2' };
  let store = createCmosStore();
  for (const [tcn, extra] of [['TRNREADY01XXX', { routing: true }], ['TRNNOROUTE1XXX', { routing: false }], ['TRNMISSING1XXX', { routing: true, nsn: '' }]]) {
    store = createRecord(store, 'shipments', { ...complete, tcn, ...extra });
    const id = store.selection.shipments;
    store = createRecord(store, 'pieces', { shipmentId: id, weight: '291', length: '48', width: '40', height: '59', typePack: 'PLT' });
    store = saveRecord(store, 'pieces', store.selection.pieces);
    store = saveRecord(store, 'shipments', id);
  }
  expect(routingCandidates(store).map(r => r.draft.tcn)).toEqual(['TRNREADY01XXX']);
  // An unsaved change keeps it off until the record is saved again.
  const ready = Object.values(store.shipments).find(r => r.draft.tcn === 'TRNREADY01XXX').id;
  expect(routingCandidates(editRecord(store, 'shipments', ready, { tac: 'TRN2' }))).toHaveLength(0);
  render(<Harness initialStore={store} />);
  userEvent.click(screen.getByRole('button', { name: 'New' }));
  const assign = within(screen.getByRole('dialog', { name: 'Assign TCNs/Aggregates' }));
  expect(assign.getByRole('row', { name: 'Assign TRNREADY01XXX' })).toBeInTheDocument();
  expect(assign.queryByRole('row', { name: 'Assign TRNNOROUTE1XXX' })).not.toBeInTheDocument();
  expect(assign.queryByRole('row', { name: 'Assign TRNMISSING1XXX' })).not.toBeInTheDocument();
});

test('Edit TCN is a tool: a complete saved shipment manifests and releases without running it', () => {
  const { saveRecord, transition, shipmentReady, createRecord: create } = require('./model');
  let store = createCmosStore();
  store = create(store, 'shipments', { tcn: 'TRNNOCHECK1XXX', description: 'TRAINING BOX', origin: 'FA5030', destination: 'FB4497', milMode: 'B', ediMode: 'LT', nmfc: '137300', rdd: '999', nsn: 'NNSN', ciic: 'U', tac: 'TRN1', tp: '2' });
  store = create(store, 'pieces', { shipmentId: 'shipments-1', weight: '291', length: '48', width: '40', height: '59', typePack: 'PLT' });
  store = saveRecord(saveRecord(store, 'pieces', 'pieces-1'), 'shipments', 'shipments-1');
  expect(store.shipments['shipments-1'].check).toBeNull();
  expect(shipmentReady(store, 'shipments-1')).toBe(true);
  store = create(store, 'truckManifests', { manifestNumber: 'TRN-TM-1', shipmentIds: ['shipments-1'] });
  store = saveRecord(store, 'truckManifests', 'truckManifests-1');
  const messages = transition(store, 'truckManifests', 'truckManifests-1', 'Release', { releaseDetails: { departureAt: '2026-10-18T10:00' } }).outcome.messages || [];
  expect(messages.join(' ')).not.toMatch(/edit check|Edit TCN/i);
});
