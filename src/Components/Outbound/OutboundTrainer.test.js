import { openSelectedPlanningTcn } from '../Cmos/planningTestHelpers';
import { render, screen, within, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../App';
import * as workflow from '../CargoWindow/workflow';
import { newOutboundSession, loadOutboundSession } from './OutboundTrainer';

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
  expect(within(form).getAllByText(/FB50006285(\d{4}|X\d{3})/).length).toBeGreaterThan(0);
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

test('Shipment Planning saves incomplete records while explicit checks report missing fields',()=>{
 const {packed}=require('./testHelpers'),session=newOutboundSession(),shipment=session.shipments[0];session.exercises[shipment.key]=packed(shipment);session.stepId='planning';localStorage.setItem('outbound-trainer-session',JSON.stringify(session));openOutbound();userEvent.click(screen.getByRole('button',{name:'Open CMOS Shipment Planning'}));
 fireEvent.change(screen.getByLabelText('TCN'),{target:{value:shipment.tcn}});userEvent.click(screen.getByRole('button',{name:'Search'}));expect(screen.getByText('1 row(s) found.')).toBeInTheDocument();userEvent.click(screen.getByRole('button',{name:`Select ${shipment.tcn}`}));userEvent.click(screen.getByRole('button',{name:'Incheck'}));openSelectedPlanningTcn();userEvent.click(screen.getByRole('button',{name:'Save',exact:true}));expect(within(screen.getByRole('dialog',{name:/^CMOS/})).getByRole('status')).toHaveTextContent('successfully saved');userEvent.click(screen.getByRole('button',{name:'Edit TCN'}));expect(within(screen.getByRole('dialog',{name:/^CMOS/})).getByRole('status')).toHaveTextContent('Edit TCN Failed');expect(within(screen.getByRole('dialog',{name:'Consistency Check Results'})).getAllByRole('listitem').map(i=>i.textContent)).toContain('MIL Mode');userEvent.click(within(screen.getByRole('dialog',{name:'Consistency Check Results'})).getByRole('button',{name:'Close'}));expect(screen.getByLabelText('TCN')).toBeEnabled();userEvent.click(screen.getByRole('button',{name:'View documentation'}));expect(screen.getByRole('dialog',{name:`DD ${shipment.document}`})).not.toHaveAttribute('aria-modal');fireEvent.change(screen.getByLabelText('TTAN'),{target:{value:'TEST'}});expect(screen.getByLabelText('TTAN')).toHaveValue('TEST');
});
test('shared CMOS prints MSL, rates international SPE, retrieves documents and closes out a carrier',async()=>{
 const {packed}=require('./testHelpers'),logic=require('./cmosLogic'),session=newOutboundSession(),shipment={...session.shipments[0],advance:false};session.shipments[0]=shipment;let e=logic.newRecord(shipment,packed(shipment));for(const [id,value]of [['milMode','J'],['nmfc','061700'],['ciic','U'],['tcn',shipment.tcn],['nsn',shipment.nsn],['nomen','ITEM'],['hazInd','N - Not hazardous'],['consignee',shipment.dodaac||'F00000'],['tac',shipment.tac]])e=logic.editRecord(e,id,value);e=logic.addPiece(e);for(const id of ['weight','length','width','height'])e=logic.editPiece(e,0,id,String(shipment.packed[id]));e=logic.savePlanning(shipment,e);session.exercises[shipment.key]=e;session.stepId='planning';localStorage.setItem('outbound-trainer-session',JSON.stringify(session));openOutbound();userEvent.click(screen.getByRole('button',{name:'Open CMOS Shipment Planning'}));userEvent.click(screen.getByRole('button',{name:`Select ${shipment.tcn}`}));userEvent.click(screen.getByRole('button',{name:'Incheck'}));openSelectedPlanningTcn();userEvent.click(screen.getByRole('button',{name:'Print All Pieces'}));expect(screen.getByRole('dialog',{name:'Military shipping label',exact:true})).toHaveTextContent(shipment.tcn);userEvent.click(screen.getByRole('button',{name:'Expr Ship'}));
 for(const [label,value]of [['SCAC','FDE'],['DOM/INT','INT'],['Service','IP'],['Shipment Date','12OCT2026'],['Package Type','Box']])fireEvent.change(screen.getByLabelText(label),{target:{value}});userEvent.click(screen.getByRole('tab',{name:'International Details'}));for(const [label,value]of [['Shipment Value','100'],['Harmonized Code','123456'],['ITN','TRN-ITN']])fireEvent.change(screen.getByLabelText(label),{target:{value}});userEvent.click(screen.getByRole('button',{name:'Save',exact:true}));userEvent.click(screen.getByRole('button',{name:'Edit',exact:true}));expect(within(screen.getByRole('dialog',{name:/^CMOS/})).getByRole('status')).toHaveTextContent('Passed Edits');userEvent.click(screen.getByRole('button',{name:'Send Request'}));await waitFor(()=>expect(JSON.parse(localStorage.getItem('outbound-trainer-session')).sharedCmos.express['express-1'].result.state).toBe('success'));
 userEvent.click(screen.getByRole('button',{name:'Print Express Docs'}));const docs=within(screen.getByRole('dialog',{name:'Print Small Package Express Documents'}));userEvent.click(docs.getByRole('button',{name:'Retrieve'}));expect(JSON.parse(localStorage.getItem('outbound-trainer-session')).exercises[shipment.key].printed.carrierLabel).toBeFalsy();userEvent.click(docs.getByRole('button',{name:'Print Carrier label'}));expect(screen.getByRole('dialog',{name:'Carrier label',exact:true})).toHaveTextContent(shipment.tcn);expect(JSON.parse(localStorage.getItem('outbound-trainer-session')).exercises[shipment.key].printed.carrierLabel).toBe(true);userEvent.click(docs.getByRole('button',{name:'Pickup Report'}));const pu=within(screen.getByRole('dialog',{name:'Carrier Closeout and Pickup Report'}));userEvent.click(pu.getByRole('button',{name:'OK'}));expect(screen.getByRole('dialog',{name:'Pickup report',exact:true})).toHaveTextContent(shipment.tcn);
});
test('New shipment Save and Close retains partial data without completing planning',()=>{
 const {packed}=require('./testHelpers'),session=newOutboundSession(),shipment=session.shipments[0];session.exercises[shipment.key]=packed(shipment);session.stepId='planning';localStorage.setItem('outbound-trainer-session',JSON.stringify(session));openOutbound();userEvent.click(screen.getByRole('button',{name:'Open CMOS Shipment Planning'}));userEvent.click(screen.getByRole('button',{name:'New',exact:true}));fireEvent.change(screen.getByLabelText('TCN'),{target:{value:'TRN-NEW'}});userEvent.click(screen.getByRole('button',{name:'Save and Close'}));expect(screen.getByRole('button',{name:'Select TRN-NEW'})).toBeInTheDocument();expect(JSON.parse(localStorage.getItem('outbound-trainer-session')).exercises[shipment.key].planningChecked).toBe(false);
});

test('a saved session gets an X in position 11 of its DD 1149 requisition numbers', () => {
  const session = newOutboundSession();
  session.shipments[0] = { ...session.shipments[0], document: '1149', documentNumber: 'FB500062851435' };
  window.localStorage.setItem('outbound-trainer-session', JSON.stringify(session));
  expect(loadOutboundSession().shipments[0].documentNumber).toBe('FB50006285X435');
});

test('practice mode opens any section on its own shipment and leaves the queue alone', () => {
  openOutbound();
  userEvent.click(screen.getByRole('button', { name: 'Practice' }));
  const practice = screen.getByRole('group', { name: 'Practice' });
  userEvent.selectOptions(within(practice).getByRole('combobox', { name: 'Practice section' }), 'planning');
  expect(screen.getByRole('heading', { name: 'Shipment planning' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '6. AMC' })).toBeEnabled();
  expect(screen.getByText(/Receive & inspect, Pack are already done/)).toBeInTheDocument();
  userEvent.click(screen.getByRole('button', { name: '1. Receive & inspect' }));
  expect(within(practice).getByRole('combobox', { name: 'Practice section' })).toHaveValue('receive');
  userEvent.click(screen.getByRole('button', { name: 'Guided' }));
  expect(screen.getByRole('combobox', { name: 'Customer' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '2. Pack' })).toBeDisabled();
});

test('test mode needs the trainee name to finish, then locks the work and prints a grading sheet', () => {
  openOutbound();
  userEvent.click(screen.getByRole('button', { name: 'Test' }));
  const trainee = screen.getByRole('group', { name: 'Trainee' });
  userEvent.click(within(trainee).getByRole('button', { name: 'Finish test' }));
  userEvent.click(within(trainee).getByRole('button', { name: 'Finish and grade' }));
  expect(within(trainee).getByRole('alert')).toHaveTextContent('Enter rank, first name and last name');
  userEvent.selectOptions(within(trainee).getByRole('combobox', { name: 'Rank' }), 'SrA');
  userEvent.type(within(trainee).getByLabelText('First name'), 'Pat');
  userEvent.type(within(trainee).getByLabelText('Last name'), 'Lee');
  userEvent.click(within(trainee).getByRole('button', { name: 'Finish test' }));
  userEvent.click(within(trainee).getByRole('button', { name: 'Finish and grade' }));
  const sheet = screen.getByRole('dialog', { name: 'Grading sheet' });
  expect(within(sheet).getByText('SrA')).toBeInTheDocument();
  expect(within(sheet).getByText('Lee')).toBeInTheDocument();
  expect(within(sheet).getByText('Pat')).toBeInTheDocument();
  expect(within(sheet).getAllByText('Final score 0 / 100').length).toBeGreaterThan(0);
  expect(within(sheet).getByRole('region', { name: 'Customer 1 breakdown' })).toHaveTextContent('Not shipped. No steps completed.');
  userEvent.click(within(sheet).getByRole('button', { name: 'Close Grading sheet' }));
  expect(screen.getByRole('button', { name: 'Reset this shipment' })).toBeDisabled();
  expect(within(trainee).getByLabelText('Last name')).toHaveAttribute('readonly');
});
