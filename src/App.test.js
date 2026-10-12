import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import * as workflow from './Components/CargoWindow/workflow';

// The deployment destination is random each session; tests pin it to Osan AB.
beforeEach(() => { window.localStorage.clear(); jest.spyOn(workflow, 'randomDestination').mockReturnValue('FB5294'); });
afterEach(() => { jest.restoreAllMocks(); });

test('opens the existing trainer from the CDF Training tab by default', () => {
  render(<App />);
  const navigation = screen.getByRole('navigation', { name: 'Training modules' });
  const tabs = within(navigation).getAllByRole('tab');
  expect(tabs.map(tab => tab.textContent)).toEqual([
    'CDF Training',
    'PDF Training',
    'Outbound Training',
    'Inbound Training',
    'HHG Training',
    'PAX Training',
  ]);
  expect(within(navigation).getByRole('tab', { name: 'CDF Training' })).toHaveAttribute('aria-selected', 'true');
  expect(screen.getByRole('navigation', { name: 'CDF process steps' })).toBeInTheDocument();
});

test.each([
  'PDF Training',
  'Outbound Training',
  'Inbound Training',
  'HHG Training',
  'PAX Training',
])('opens a coming-soon screen for %s and returns to CDF Training', moduleName => {
  render(<App />);
  userEvent.click(screen.getByRole('tab', { name: moduleName }));
  expect(screen.getByRole('heading', { name: moduleName })).toBeInTheDocument();
  expect(screen.getByText('Coming soon')).toBeInTheDocument();
  expect(screen.queryByRole('navigation', { name: 'CDF process steps' })).not.toBeInTheDocument();
  userEvent.click(screen.getByRole('tab', { name: 'CDF Training' }));
  expect(screen.getByRole('navigation', { name: 'CDF process steps' })).toBeInTheDocument();
});

test('lists the CDF steps in order and opens Precheck initially', () => {
  render(<App />);
  const navigation = screen.getByRole('navigation', { name: 'CDF process steps' });
  expect(within(navigation).getAllByRole('button').map(button => button.textContent))
    .toEqual(['View DSOE', '1. Precheck', '2. Incheck', '3. Manifest', '4. Load plan', '5. JI']);
  expect(screen.getByRole('heading', { name: 'Precheck' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '1. Precheck' })).toHaveAttribute('aria-current', 'step');
});

test('clicking each step opens its training section and updates the selection', () => {
  render(<App />);
  const ji = screen.getByRole('button', { name: '5. JI' });
  expect(ji).toBeDisabled();
  expect(ji).toHaveAccessibleDescription('Locked until Precheck, Incheck, Manifest, and the deployment Load Plan are complete');
  for (const name of ['Incheck', 'Manifest', 'Precheck']) {
    const button = screen.getByRole('button', { name: new RegExp(`^\\d\\. ${name}$`) });
    userEvent.click(button);
    expect(screen.getByRole('heading', { name })).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-current', 'step');
    expect(screen.getAllByRole('button').filter(item => item.hasAttribute('aria-current'))).toHaveLength(1);
  }
});

function notebook() { return screen.getByRole('region', { name: 'Measurement notebook' }); }
function record(field, value) {
  const input = within(notebook()).getByLabelText(field);
  userEvent.clear(input); userEvent.type(input, value);
  userEvent.click(within(notebook()).getByRole('button', { name: `Record ${field}` }));
}
function measureBetween(start, end) {
  userEvent.click(screen.getByRole('button', { name: 'Tape measure' }));
  userEvent.click(screen.getByRole('button', { name: start }));
  userEvent.click(screen.getByRole('button', { name: end }));
}
function collectCB() {
  userEvent.selectOptions(screen.getByLabelText('Cargo view'), 'side');
  measureBetween('Lower left edge / forward datum', 'Front axle center');
  record('D1 — front axle datum distance (in)', '33');
  measureBetween('Lower left edge / forward datum', 'Rear axle center');
  record('D2 — rear axle datum distance (in)', '163');
  userEvent.click(screen.getByRole('button', { name: 'Scale' }));
  userEvent.click(screen.getByRole('button', { name: 'Weigh W1 (FAW)' }));
  record('W1 (FAW) — front axle weight (lb)', '5400');
  userEvent.click(screen.getByRole('button', { name: 'Weigh W2 (RAW)' }));
  record('W2 (RAW) — rear axle weight (lb)', '4400');
  userEvent.click(screen.getByRole('button', { name: 'Weigh whole piece' }));
  record('GWT — gross weight (lb)', '9800');
  userEvent.click(screen.getByRole('button', { name: 'Calculate CB' }));
}

test('viewed readings leave notebook blank until the trainee types and records them', () => {
  render(<App />);
  userEvent.click(screen.getByRole('button', { name: 'Scale' }));
  userEvent.click(screen.getByRole('button', { name: 'Weigh whole piece' }));
  expect(within(notebook()).getByLabelText('GWT — gross weight (lb)')).toHaveValue(null);
  expect(screen.getByRole('status')).toHaveTextContent('9,800 lb');
  record('GWT — gross weight (lb)', '5000');
  expect(notebook()).toHaveTextContent('does not match');
  record('GWT — gross weight (lb)', '9800');
  expect(notebook()).toHaveTextContent('Recorded.');
});

test('manual entries persist per shipment and reset clears only the active shipment', () => {
  render(<App />);
  userEvent.click(screen.getByRole('button', { name: 'Scale' }));
  userEvent.click(screen.getByRole('button', { name: 'Weigh whole piece' }));
  record('GWT — gross weight (lb)', '9800');
  userEvent.selectOptions(screen.getByLabelText('Training shipment'), 'isu-90');
  expect(within(notebook()).getByLabelText('GWT — gross weight (lb)')).toHaveValue(null);
  userEvent.click(screen.getByRole('button', { name: 'Scale' }));
  userEvent.click(screen.getByRole('button', { name: 'Weigh whole piece' }));
  record('GWT — gross weight (lb)', '4200');
  userEvent.selectOptions(screen.getByLabelText('Training shipment'), 'rolling-stock');
  expect(within(notebook()).getByLabelText('GWT — gross weight (lb)')).toHaveValue(9800);
  userEvent.click(screen.getByRole('button', { name: 'Reset this shipment' }));
  expect(within(notebook()).getByLabelText('GWT — gross weight (lb)')).toHaveValue(null);
  userEvent.selectOptions(screen.getByLabelText('Training shipment'), 'isu-90');
  expect(within(notebook()).getByLabelText('GWT — gross weight (lb)')).toHaveValue(4200);
});

test('incorrect inspection choices give source-based feedback and cannot be corrected as if valid', () => {
  render(<App />);
  userEvent.click(screen.getByRole('button', { name: '2. Incheck' }));
  userEvent.click(screen.getByRole('button', { name: 'Inspect' }));
  userEvent.click(screen.getByRole('button', { name: 'Inspect Battery protection' }));
  userEvent.click(screen.getByRole('button', { name: 'Check positive terminal' }));
  userEvent.click(screen.getByRole('button', { name: 'Check negative terminal' }));
  const task = screen.getByRole('group', { name: 'Battery protection' });
  userEvent.click(within(task).getByRole('button', { name: 'Satisfactory' }));
  expect(task).toHaveTextContent('Try again');
  expect(task).toHaveTextContent('III-O-8');
  expect(within(task).queryByRole('button', { name: /Simulate correction/ })).not.toBeInTheDocument();
  userEvent.click(within(task).getByRole('button', { name: 'Unsatisfactory' }));
  userEvent.click(screen.getByRole('button', { name: 'Tape positive terminal' }));
  userEvent.click(screen.getByRole('button', { name: 'Check positive terminal' }));
  userEvent.click(screen.getByRole('button', { name: 'Check negative terminal' }));
  userEvent.click(within(task).getByRole('button', { name: /Simulate correction/ }));
  expect(task).toHaveTextContent('Corrected');
});

test('fuel check uses the quarter-tank scenario target and requires a reread after correction', () => {
  render(<App />);
  userEvent.click(screen.getByRole('button', { name:'2. Incheck' }));
  userEvent.click(screen.getByRole('button', { name:'Inspect' }));
  userEvent.click(screen.getByRole('button', { name:'Check fuel gauge' }));
  expect(screen.getByRole('img', { name:'Vehicle fuel gauge' })).toBeInTheDocument();
  const task = screen.getByRole('group', { name:'Fuel level' });
  expect(within(task).getByRole('button', { name:'Unsatisfactory' })).toBeDisabled();
  userEvent.click(screen.getByRole('button', { name:'Read fuel gauge' }));
  expect(screen.getByText(/Gauge reading: 37.5%/)).toBeInTheDocument();
  userEvent.click(within(task).getByRole('button', { name:'Unsatisfactory' }));
  userEvent.click(screen.getByRole('button', { name:'Simulate draining to ¼ tank' }));
  expect(within(task).getByRole('button', { name:/Simulate correction/ })).toBeDisabled();
  userEvent.click(screen.getByRole('button', { name:'Read fuel gauge' }));
  expect(screen.getByText(/Gauge reading: 25%/)).toBeInTheDocument();
  userEvent.click(within(task).getByRole('button', { name:/Simulate correction/ }));
  expect(task).toHaveTextContent('Corrected');
});

test('three-axle vehicle records all three readings and includes W3 in CB', () => {
  render(<App />);
  userEvent.selectOptions(screen.getByLabelText('Training shipment'),'three-axle');
  expect(screen.getByRole('button', { name:'Front axle center' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name:'Intermediate axle center' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name:'Rear axle center' })).toBeInTheDocument();
  for (const [label,value,target] of [
    ['D1 — front axle datum distance (in)','35','Front axle center'],
    ['D2 — intermediate axle datum distance (in)','172','Intermediate axle center'],
    ['D3 — rear axle datum distance (in)','227','Rear axle center'],
  ]) { measureBetween('Lower left edge / forward datum',target); record(label,value); }
  userEvent.click(screen.getByRole('button', { name:'Scale' }));
  for (const [code,label,value] of [
    ['W1 (FAW)','W1 (FAW) — front axle weight (lb)','9200'],
    ['W2 (IAW)','W2 (IAW) — intermediate axle weight (lb)','6000'],
    ['W3 (RAW)','W3 (RAW) — rear axle weight (lb)','5800'],
  ]) { userEvent.click(screen.getByRole('button', { name:`Weigh ${code}` })); record(label,value); }
  userEvent.click(screen.getByRole('button', { name:'Weigh whole piece' }));
  record('GWT — gross weight (lb)','21000');
  userEvent.click(screen.getByRole('button', { name:'Calculate CB' }));
  expect(screen.getByRole('region', { name:'CB calculation result' })).toHaveTextContent('127 inches aft of RDL');
  expect(screen.getByRole('region', { name:'CB calculation result' })).toHaveTextContent('D3 × W3 (RAW)');
  userEvent.clear(screen.getByLabelText('W3 (RAW) — rear axle weight (lb)'));
  expect(screen.queryByRole('region', { name:'CB calculation result' })).not.toBeInTheDocument();
  userEvent.click(screen.getByRole('button', { name:'Calculate CB' }));
  expect(screen.getByRole('alert')).toHaveTextContent('W3 (RAW)');
});

test('CB uses recorded W1/D1/W2/D2 values and editing invalidates the result', () => {
  render(<App />);
  collectCB();
  expect(screen.getByRole('region', { name: 'CB calculation result' })).toHaveTextContent('91 inches aft of RDL');
  expect(screen.getByRole('region', { name: 'CB calculation result' })).toHaveTextContent('895,400');
  userEvent.clear(screen.getByLabelText('W1 (FAW) — front axle weight (lb)'));
  expect(screen.queryByRole('region', { name: 'CB calculation result' })).not.toBeInTheDocument();
  userEvent.click(screen.getByRole('button', { name: 'Calculate CB' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Record');
});

test('applies axle tapes and the CB T to both vehicle sides with placement feedback', () => {
  render(<App />);
  collectCB();
  userEvent.click(screen.getByRole('button', { name: 'Labeling tape' }));
  for (const side of ['left','right']) {
    userEvent.selectOptions(screen.getByLabelText('Vehicle side'), side);
    for (const [type, value, x] of [['faw','5400','33'], ['raw','4400','163'], ['cb','91','91']]) {
      userEvent.selectOptions(screen.getByLabelText('Tape label'), type);
      userEvent.clear(screen.getByLabelText('Value on tape'));
      userEvent.type(screen.getByLabelText('Value on tape'), value);
      if (type === 'cb') userEvent.type(screen.getByLabelText('GWT on horizontal tape (lb)'), '9800');
      userEvent.clear(screen.getByLabelText('Placement distance from RDL (in)'));
      userEvent.type(screen.getByLabelText('Placement distance from RDL (in)'), x);
      userEvent.clear(screen.getByLabelText('Placement height above ground (in)'));
      userEvent.type(screen.getByLabelText('Placement height above ground (in)'), '41');
      userEvent.click(screen.getByRole('button', { name: 'Apply tape at entered position' }));
      expect(screen.getByRole('status')).toHaveTextContent(`${type.toUpperCase()} tape applied to the ${side} side`);
      expect(screen.getByRole('button', { name: `Remove ${type.toUpperCase()} tape from ${side} side` })).toBeInTheDocument();
    }
  }
  userEvent.click(screen.getByRole('button', { name: 'Remove CB tape from right side' }));
  expect(screen.queryByRole('button', { name: 'Remove CB tape from right side' })).not.toBeInTheDocument();
  userEvent.selectOptions(screen.getByLabelText('Vehicle side'), 'left');
  expect(screen.getByRole('button', { name: 'Remove CB tape from left side' })).toBeInTheDocument();
});

test('generator reset changes visible readings and validates the new notebook values', () => {
  render(<App />);
  userEvent.selectOptions(screen.getByLabelText('Training shipment'), 'age-generator');
  expect(screen.getByRole('heading',{name:'A/M32A-60A start cart'})).toBeInTheDocument();
  measureBetween('Lower left edge / forward datum','Lower right edge');
  expect(screen.getByRole('status')).toHaveTextContent('150.0 inches');
  record('Overall length (in)','150');
  userEvent.click(screen.getByRole('button',{name:'Reset this shipment'}));
  expect(within(notebook()).getByLabelText('Overall length (in)')).toHaveValue(null);
  measureBetween('Lower left edge / forward datum','Lower right edge');
  const reading=screen.getByRole('status').textContent.match(/(\d+\.\d) inches/)[1];
  expect(reading).not.toBe('150.0');
  record('Overall length (in)',reading);
  userEvent.click(screen.getByRole('button',{name:'2. Incheck'}));
  expect(screen.getByRole('group',{name:'Record overall length'})).toHaveTextContent('Complete');
  userEvent.click(screen.getByRole('button',{name:'Scale'}));
  userEvent.click(screen.getByRole('button',{name:'Weigh whole piece'}));
  expect(screen.getByRole('status')).not.toHaveTextContent('7,800 lb');
});

test('precheck requests missing HAZDEC copies and manifest stays pending without Incheck',()=>{
 render(<App />);
 userEvent.selectOptions(screen.getByLabelText('Training shipment'),'isu-90');
 userEvent.click(screen.getByRole('button',{name:'View HAZDEC'}));
 const input=screen.getByLabelText('Count HAZDEC copies');
 userEvent.type(input,'2');
 userEvent.click(screen.getByRole('button',{name:'Verify HAZDEC copies'}));
 expect(screen.getByRole('group',{name:'HAZDEC'})).toHaveTextContent('Pending');
 userEvent.type(screen.getByLabelText('Additional HAZDEC copies needed'),'1');
 userEvent.click(screen.getByRole('button',{name:'Request additional HAZDEC copies'}));
 expect(screen.getByText('Received 1 copy. Recount and verify.')).toBeInTheDocument();
 userEvent.clear(input);userEvent.type(input,'3');
 userEvent.click(screen.getByRole('button',{name:'Verify HAZDEC copies'}));
 expect(screen.getByRole('group',{name:'HAZDEC'})).toHaveTextContent('Complete');
 userEvent.click(screen.getByRole('button',{name:'3. Manifest'}));
 userEvent.click(screen.getByRole('button',{name:'Open Shipment Planning'}));
 userEvent.click(screen.getByRole('button',{name:'Add piece to manifest'}));
 expect(screen.getByText('Complete Precheck and Incheck before accepting the manifest.')).toBeInTheDocument();
 expect(screen.getByRole('button',{name:'5. JI'})).toBeDisabled();
});

test('prepared pallet manifests but JI waits for the deployment load plan',()=>{
 render(<App />);
 userEvent.selectOptions(screen.getByLabelText('Training shipment'),'463l-pallet');
 const steps=screen.getByRole('navigation',{name:'CDF process steps'});
 expect(within(steps).getByText('Start here')).toBeInTheDocument();
 userEvent.click(within(steps).getByRole('button',{name:'View DSOE'}));
 const dsoe=screen.getByRole('dialog',{name:'Deployment Schedule of Events'});
 const increment=within(dsoe).getByRole('row',{name:'Increment E1003'});
 for(const text of ['00001','F00001$$E100300XX','Palletized general supplies','4,800','Scheduled']) expect(within(increment).getByText(text)).toBeInTheDocument();
 // The processing schedule lists the chalk's overall milestones, not per-increment times.
 const schedule=within(dsoe).getByRole('table',{name:'Processing schedule'});
 expect(within(schedule).getAllByRole('row').slice(1).map(row=>row.getAttribute('aria-label'))).toEqual(['CARGO PREP START','REPORT TO CDF','INCHECK START','INCHECK COMPLETE','MANIFEST START','MANIFEST COMPLETE','JOINT INSPECTION START','JOINT INSPECTION COMPLETE','CARGO LOAD START','CARGO LOAD COMPLETE','AC ARRIVAL','AC DEPARTURE']);
 expect(within(within(schedule).getByRole('row',{name:'REPORT TO CDF'})).getByText(/\/06:00$/)).toBeInTheDocument();
 expect(within(schedule).queryByText(/E100/)).not.toBeInTheDocument();
 expect(within(dsoe).getByText('Schedule Processing Recap Report')).toBeInTheDocument();
 expect(within(dsoe).getAllByRole('row',{name:/^Increment E/})).toHaveLength(6);
 for(const text of ['EDF','OSN',/^FB5000 · 673 LRS LGRM/,/^FB5294 · 51 LRS LGRDDC/]) expect(within(dsoe).getAllByText(text).length).toBeGreaterThan(0);
 userEvent.click(within(dsoe).getByRole('button',{name:'Close DSOE'}));
 expect(within(steps).getByText('Reviewed')).toBeInTheDocument();
 expect(screen.getByRole('group',{name:'Review the DSOE'})).toHaveTextContent('Complete');
 for(const [title,count] of [['LOGMOD paperwork','3'],['LOGMOD placards','3'],['Packing list','3'],['HAZDEC','0'],['ATTLA','0']]) {
  userEvent.click(screen.getByRole('button',{name:`View ${title}`}));
  // Documents in the packet open; ones not brought (0 copies) do not.
  const opened=screen.queryAllByRole('dialog',{name:title});
  expect(opened).toHaveLength(count==='0' ? 0 : 1);
  expect(opened.every(dialog=>within(dialog).getByText('FOR TRAINING USE ONLY — FICTIONAL DOCUMENT'))).toBe(true);
  opened.forEach(()=>userEvent.click(screen.getByRole('button',{name:`Close ${title}`})));
  userEvent.type(screen.getByLabelText(`Count ${title} copies`),count);
  userEvent.click(screen.getByRole('button',{name:`Verify ${title} copies`}));
 }
 userEvent.click(screen.getByRole('button',{name:'2. Incheck'}));
 measureBetween('Lower left edge / forward datum','Lower right edge');record('Overall length (in)','108');
 userEvent.selectOptions(screen.getByLabelText('Cargo view'),'front');
 measureBetween('Lower left edge / forward datum','Lower right edge');record('Overall width (in)','88');
 measureBetween('Lower left edge / forward datum','Upper left edge');record('Overall height (in)','72');
 userEvent.click(screen.getByRole('button',{name:'Scale'}));userEvent.click(screen.getByRole('button',{name:'Weigh whole piece'}));record('GWT — gross weight (lb)','4800');
 userEvent.click(screen.getByRole('button',{name:'Inspect'}));
 for(const [title,decision] of [['Shipment documents','Satisfactory'],['Cargo arrangement','Satisfactory'],['Cargo nets','Unsatisfactory'],['Pallet and rings','Satisfactory'],['Pallet dunnage','Unsatisfactory']]) {
  if(title!=='Shipment documents') userEvent.click(screen.getByRole('button',{name:`Inspect ${title}`}));
  const group=screen.getByRole('group',{name:title});userEvent.click(within(group).getByRole('button',{name:decision}));
  if(decision==='Unsatisfactory') userEvent.click(within(group).getByRole('button',{name:'Simulate correction and reinspection'}));
 }
 userEvent.click(screen.getByRole('button',{name:'3. Manifest'}));
 userEvent.click(screen.getByRole('button',{name:'Open Shipment Planning'}));
 userEvent.selectOptions(screen.getByLabelText('Origin DoDAAC'),'FB5000');
 userEvent.selectOptions(screen.getByLabelText('Destination DoDAAC'),'FB5294');
 for(const [label,value] of [['Transportation Control Number (TCN)','F00001$$E100300XX'],['Nomenclature','Palletized general supplies'],['Piece count','1'],['Length (in)','108'],['Width (in)','88'],['Height (in)','72'],['Gross weight (lb)','4800']]) userEvent.type(screen.getByLabelText(label),value);
 userEvent.selectOptions(screen.getByLabelText('APOE'),'EDF');
 userEvent.selectOptions(screen.getByLabelText('APOD'),'OSN');
 userEvent.click(screen.getByRole('tab',{name:'Indicators'}));
 userEvent.selectOptions(screen.getByLabelText('Hazardous/Ammunition Ind'),'H - Hazardous material');
 expect(screen.getByRole('tab',{name:'DG2'})).toBeInTheDocument();
 expect(screen.getByRole('tab',{name:'T-9 Misc'})).toBeInTheDocument();
 userEvent.click(screen.getByRole('tab',{name:'Pieces'}));
 userEvent.click(screen.getByRole('button',{name:'1 · HAZ'}));
 expect(screen.getByRole('tab',{name:'DG2'})).toHaveAttribute('aria-selected','true');
 userEvent.selectOptions(screen.getByLabelText('UN/ID Number'),'UN3528');
 expect(screen.getByLabelText('Hazard Class/Division')).toHaveValue('3');
 expect(screen.getByLabelText('Proper Shipping Name')).toHaveValue('');
 userEvent.selectOptions(screen.getByLabelText('Proper Shipping Name'),'MACHINERY, INTERNAL COMBUSTION, FLAMMABLE LIQUID POWERED');
 expect(screen.getByLabelText('Proper Shipping Name')).toHaveValue('MACHINERY, INTERNAL COMBUSTION, FLAMMABLE LIQUID POWERED');
 userEvent.selectOptions(screen.getByLabelText('UN/ID Number'),'UN1072');
 expect(screen.getByLabelText('Proper Shipping Name')).toHaveValue('OXYGEN, COMPRESSED');
 expect(screen.getByLabelText('Hazard Class/Division')).toHaveValue('2.2');
 expect(screen.getByLabelText('Subsidiary Risk')).toHaveValue('5.1');
 expect(screen.getByLabelText('Packing Group')).toHaveValue('N/A');
 userEvent.click(screen.getByRole('button',{name:'Save DG2'}));
 expect(screen.getByRole('cell',{name:'UN1072'})).toBeInTheDocument();
 userEvent.click(screen.getByRole('tab',{name:'Indicators'}));
 userEvent.selectOptions(screen.getByLabelText('Hazardous/Ammunition Ind'),'N - Non-hazardous');
 expect(screen.queryByRole('tab',{name:'DG2'})).not.toBeInTheDocument();
 userEvent.click(screen.getByRole('button',{name:'Add piece to manifest'}));
 expect(within(screen.getByRole('dialog',{name:'Shipment Planning'})).getByText('Piece added to manifest.')).toBeInTheDocument();
 userEvent.click(screen.getByRole('button',{name:'Close Shipment Planning'}));
 expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
 expect(screen.getByText('Piece added to manifest.')).toBeInTheDocument();
 userEvent.click(screen.getByRole('button',{name:'View DSOE'}));
 expect(within(screen.getByRole('dialog',{name:'Deployment Schedule of Events'})).getByLabelText(/^Destination/)).toBeDisabled();
 // One of six increments is through Incheck: Manifest has started, but Incheck is not complete for the chalk.
 const actual=name=>within(within(screen.getByRole('dialog',{name:'Deployment Schedule of Events'})).getByRole('row',{name})).getAllByRole('cell').at(-1);
 expect(actual('MANIFEST START')).toHaveTextContent('COMPLETE');
 expect(actual('INCHECK COMPLETE')).toBeEmptyDOMElement();
 userEvent.click(screen.getByRole('button',{name:'Close DSOE'}));
 const bay=screen.getByRole('region',{name:'Cargo simulator'});
 expect(within(bay).queryByRole('button',{name:/^Military shipping label /})).not.toBeInTheDocument();
 userEvent.click(screen.getByRole('button',{name:'Apply MSL'}));
 userEvent.click(within(bay).getByRole('button',{name:'Military shipping label F00001$$E100300XX. Select to view.'}));
 const fromCargo=screen.getByRole('dialog',{name:'Military Shipping Label'});
 expect(within(fromCargo).getAllByText('F00001$$E100300XX').length).toBeGreaterThan(0);
 userEvent.click(within(fromCargo).getByRole('button',{name:'Close Military Shipping Label'}));
 const manifest=screen.getByRole('region',{name:'Cargo manifest'});
 expect(within(manifest).getByText('F00001$$E100300XX')).toBeInTheDocument();
 expect(within(manifest).getByText('Applied')).toBeInTheDocument();
 userEvent.click(screen.getByRole('button',{name:'View MSL'}));
 const msl=screen.getByRole('dialog',{name:'Military Shipping Label'});
 for(const text of ['F00001$$E100300XX','EDF','OSN','FB5294']) expect(within(msl).getAllByText(text).length).toBeGreaterThan(0);
 userEvent.click(within(msl).getByRole('button',{name:'Close Military Shipping Label'}));
 expect(screen.getByRole('button',{name:'5. JI'})).toBeDisabled();
 expect(screen.getByRole('button',{name:'5. JI'})).toHaveAccessibleDescription(/deployment Load Plan/);
 // Manifested entries are locked; removing the piece unlocks them and withdraws the MSL.
 userEvent.click(screen.getByRole('button',{name:'3. Manifest'}));
 userEvent.click(screen.getByRole('button',{name:'Open Shipment Planning'}));
 expect(screen.getByLabelText('Transportation Control Number (TCN)')).toHaveAttribute('readonly');
 expect(screen.getByLabelText('Origin DoDAAC')).toBeDisabled();
 expect(screen.queryByRole('button',{name:'Add piece to manifest'})).not.toBeInTheDocument();
 userEvent.click(screen.getByRole('button',{name:'Close Shipment Planning'}));
 const card=screen.getByRole('region',{name:'Cargo manifest'});
 userEvent.click(within(card).getByRole('button',{name:'Remove piece from manifest'}));
 userEvent.click(within(card).getByRole('button',{name:'Cancel'}));
 expect(within(card).getByText('1 piece')).toBeInTheDocument();
 userEvent.click(within(card).getByRole('button',{name:'Remove piece from manifest'}));
 userEvent.click(within(card).getByRole('button',{name:'Confirm removal'}));
 expect(within(card).getByText('0 pieces')).toBeInTheDocument();
 expect(screen.getByText('Piece removed from the manifest. Correct the entries and add it again.')).toBeInTheDocument();
 expect(screen.getByRole('button',{name:'5. JI'})).toBeDisabled();
 expect(within(screen.getByRole('region',{name:'Cargo simulator'})).queryByRole('button',{name:/^Military shipping label /})).not.toBeInTheDocument();
 userEvent.click(screen.getByRole('button',{name:'Open Shipment Planning'}));
 expect(screen.getByLabelText('Transportation Control Number (TCN)')).not.toHaveAttribute('readonly');
 expect(screen.getByRole('button',{name:'Add piece to manifest'})).toBeInTheDocument();
});

test('HMMWV and FMTV carry their ATTLA certification letters and are checked against them',()=>{
 render(<App />);
 expect(screen.getByText('Axle 1 load > 5,000 lb')).toBeInTheDocument();
 userEvent.click(screen.getByRole('button',{name:'Review only — no separate letter'}));
 expect(screen.getByRole('group',{name:'ATTLA screening review'})).toHaveTextContent('Pending');
 userEvent.click(screen.getByRole('button',{name:'Certification required'}));
 expect(screen.getByRole('group',{name:'ATTLA screening review'})).toHaveTextContent('Complete');
 userEvent.click(screen.getByRole('button',{name:'View ATTLA'}));
 const letter=screen.getByRole('dialog',{name:'ATTLA'});
 for(const text of ['FOR TRAINING USE ONLY — COPY OF ISSUED ATTLA CERTIFICATION','Internal Air Transport Certification','File Number 2016.03.27 Rev 2',/^M1151A1/,'Table 2: Model Numbers and Ratings']) expect(within(letter).getAllByText(text).length).toBeGreaterThan(0);
 userEvent.keyboard('{Escape}');
 userEvent.click(screen.getByRole('button',{name:'Verify ATTLA letter applicability'}));
 expect(screen.getByText('Current letter matches configuration, dimensions, and gross weight.')).toBeInTheDocument();
 userEvent.type(screen.getByLabelText('Count ATTLA copies'),'1');
 userEvent.click(screen.getByRole('button',{name:'Verify ATTLA copies'}));
 expect(screen.getByRole('group',{name:'ATTLA'})).toHaveTextContent('Complete');
 userEvent.selectOptions(screen.getByLabelText('Training shipment'),'three-axle');
 userEvent.click(screen.getByRole('button',{name:'View ATTLA'}));
 expect(within(screen.getByRole('dialog',{name:'ATTLA'})).getAllByText('File Number 2008.01.13 Rev 6').length).toBeGreaterThan(0);
 userEvent.keyboard('{Escape}');
 expect(screen.getByRole('button',{name:'Verify ATTLA letter applicability'})).toBeDisabled();
 userEvent.type(screen.getByLabelText('Count ATTLA copies'),'1');
 userEvent.click(screen.getByRole('button',{name:'Verify ATTLA copies'}));
 expect(screen.getByRole('group',{name:'ATTLA'})).toHaveTextContent('Pending');
 userEvent.click(screen.getByRole('button',{name:'Certification required'}));
 userEvent.click(screen.getByRole('button',{name:'Verify ATTLA letter applicability'}));
 userEvent.click(screen.getByRole('button',{name:'Verify ATTLA copies'}));
 expect(screen.getByRole('group',{name:'ATTLA'})).toHaveTextContent('Complete');
 userEvent.click(screen.getByRole('button',{name:'Reset this shipment'}));
 expect(screen.getByRole('group',{name:'ATTLA screening review'})).toHaveTextContent('Pending');
 expect(screen.getByRole('group',{name:'ATTLA'})).toHaveTextContent('Pending');
});

test('the ISU-90 packet carries the AAR ISU container certification',()=>{
 render(<App />);
 userEvent.selectOptions(screen.getByLabelText('Training shipment'),'isu-90');
 userEvent.click(screen.getByRole('button',{name:'View ATTLA'}));
 const letter=screen.getByRole('dialog',{name:'ATTLA'});
 for(const text of ['File Number 99.05.14 Rev 1','Table 1: Approved Base Models','ISU-90']) expect(within(letter).getAllByText(text).length).toBeGreaterThan(0);
});

test('frustrates the asset with a selected reason, fixes it, and releases it',()=>{
 render(<App />);
 userEvent.selectOptions(screen.getByLabelText('Training shipment'),'isu-90');
 userEvent.click(screen.getByRole('button',{name:'Frustrate asset'}));
 userEvent.selectOptions(screen.getByLabelText('Frustration reason'),'paperwork');
 userEvent.click(screen.getByRole('button',{name:'Confirm frustration'}));
 const card=screen.getByRole('region',{name:'Cargo frustration'});
 expect(within(card).getByText('FRUSTRATED')).toBeInTheDocument();
 const entry=within(card).getByRole('group',{name:'Frustration: Missing or insufficient document copies'});
 expect(within(entry).getByRole('button',{name:'Release from frustration'})).toBeDisabled();
 userEvent.click(within(entry).getByRole('button',{name:'Fix: request missing copies'}));
 userEvent.click(within(entry).getByRole('button',{name:'Release from frustration'}));
 expect(within(card).getByText('Not frustrated')).toBeInTheDocument();
 expect(within(card).getByText('Asset released from frustration.')).toBeInTheDocument();
});

test('frustrates from the paperwork area and an inspection item, releasing in the main panel',()=>{
 render(<App />);
 userEvent.selectOptions(screen.getByLabelText('Training shipment'),'isu-90');
 userEvent.click(screen.getByRole('button',{name:'View HAZDEC'}));
 userEvent.click(screen.getByRole('button',{name:'Close HAZDEC'}));
 userEvent.click(screen.getByRole('button',{name:'Frustrate: HAZDEC'}));
 const card=screen.getByRole('region',{name:'Cargo frustration'});
 expect(within(card).getByText('Asset frustrated: Missing or insufficient document copies — HAZDEC.')).toBeInTheDocument();
 expect(screen.queryByRole('button',{name:'Frustrate: HAZDEC'})).not.toBeInTheDocument();
 expect(screen.getByText('Frustrated: Missing or insufficient document copies — HAZDEC. Release it in the Cargo frustration panel.')).toBeInTheDocument();
 const entry=within(card).getByRole('group',{name:'Frustration: Missing or insufficient document copies — HAZDEC'});
 userEvent.click(within(entry).getByRole('button',{name:'Fix: request missing copies'}));
 userEvent.click(within(entry).getByRole('button',{name:'Release from frustration'}));
 expect(within(card).getByText('Not frustrated')).toBeInTheDocument();
 userEvent.click(screen.getByRole('button',{name:'2. Incheck'}));
 userEvent.click(screen.getByRole('button',{name:'Inspect'}));
 expect(screen.queryByRole('button',{name:'Inspect Military shipping label'})).not.toBeInTheDocument();
 expect(screen.queryByRole('button',{name:'Frustrate: Military shipping label'})).not.toBeInTheDocument();
});

test('virtual cargo bay shows the shipment TCN and a new one after reset',()=>{
 render(<App />);
 const bay=screen.getByRole('region',{name:'Cargo simulator'});
 const tcn=within(bay).getByText(/^F\d{5}\$\$E\d{4}00XX$/,{selector:'strong'}).textContent;
 expect(within(bay).getAllByText(tcn)).toHaveLength(1);
 expect(within(bay).queryByRole('button',{name:/^Military shipping label /})).not.toBeInTheDocument();
 userEvent.click(screen.getByRole('button',{name:'Reset this shipment'}));
 const next=within(screen.getByRole('region',{name:'Cargo simulator'})).getByText(/^F\d{5}\$\$E\d{4}00XX$/,{selector:'strong'}).textContent;
 expect(next).not.toBe(tcn);
});

test('each training section collapses and expands from its heading',()=>{
 render(<App />);
 for(const name of ['Cargo frustration','Increment monitor’s paperwork packet','Stage checklist','Measurement notebook','Exercise progress']) expect(screen.getByRole('button',{name})).toHaveAttribute('aria-expanded','true');
 const toggle=screen.getByRole('button',{name:'Stage checklist'});
 userEvent.click(toggle);
 expect(toggle).toHaveAttribute('aria-expanded','false');
 expect(screen.queryByRole('group',{name:'LOGMOD paperwork'})).not.toBeInTheDocument();
 userEvent.click(toggle);
 expect(screen.getByRole('group',{name:'LOGMOD paperwork'})).toBeInTheDocument();
});

test('Shipment Planning shows packet paperwork beside the form while entries are typed',()=>{
 render(<App />);
 userEvent.selectOptions(screen.getByLabelText('Training shipment'),'463l-pallet');
 userEvent.click(screen.getByRole('button',{name:'3. Manifest'}));
 userEvent.click(screen.getByRole('button',{name:'Open Shipment Planning'}));
 const bar=screen.getByRole('group',{name:'Shipment Planning paperwork'});
 expect(within(bar).queryByRole('button',{name:/HAZDEC/})).not.toBeInTheDocument();
 expect(within(bar).getByRole('button',{name:'Packing list'})).toBeEnabled();
 userEvent.click(within(bar).getByRole('button',{name:'LOGMOD paperwork'}));
 const logmod=screen.getByRole('complementary',{name:'LOGMOD paperwork (paperwork)'});
 expect(within(logmod).getByText('F00001$$E100300XX')).toBeInTheDocument();
 userEvent.type(screen.getByLabelText('Transportation Control Number (TCN)'),'F00001$$E100300XX');
 expect(screen.getByRole('dialog',{name:'Shipment Planning'})).toBeInTheDocument();
 userEvent.click(within(bar).getByRole('button',{name:'LOGMOD paperwork'}));
 expect(screen.queryByRole('complementary',{name:'LOGMOD paperwork (paperwork)'})).not.toBeInTheDocument();
});

test('the DSOE sets how many pieces are processed, repeating equipment types past six',()=>{
 render(<App />);
 userEvent.selectOptions(screen.getByLabelText('Training shipment'),'463l-pallet');
 userEvent.click(screen.getByRole('button',{name:'View DSOE'}));
 const dsoe=screen.getByRole('dialog',{name:'Deployment Schedule of Events'});
 userEvent.selectOptions(within(dsoe).getByLabelText(/Pieces to process/),'8');
 expect(within(dsoe).getAllByRole('row',{name:/^Increment E/})).toHaveLength(8);
 expect(within(within(dsoe).getByRole('row',{name:'Increment E1007'})).getByText('F00001$$E100700XX')).toBeInTheDocument();
 expect(within(screen.getByLabelText('Training shipment')).getByRole('option',{name:'HMMWV #2'})).toBeInTheDocument();
 userEvent.selectOptions(within(dsoe).getByLabelText(/Pieces to process/),'2');
 expect(within(dsoe).getAllByRole('row',{name:/^Increment E/})).toHaveLength(2);
 expect(within(screen.getByLabelText('Training shipment')).getAllByRole('option')).toHaveLength(2);
 // The selected pallet (piece 3) is no longer in the deployment, so the first piece is selected.
 expect(screen.getByLabelText('Training shipment')).toHaveValue('rolling-stock');
});

test('the DSOE destination can be changed until a piece is manifested',()=>{
 render(<App />);
 userEvent.click(screen.getByRole('button',{name:'View DSOE'}));
 const dsoe=screen.getByRole('dialog',{name:'Deployment Schedule of Events'});
 userEvent.selectOptions(within(dsoe).getByLabelText(/^Destination/),'FB5612');
 for(const text of ['RMS',/^FB5612 · 86 LRS LGRDD/]) expect(within(dsoe).getAllByText(text).length).toBeGreaterThan(0);
 expect(within(dsoe).queryByText('OSN')).not.toBeInTheDocument();
 expect(within(dsoe).getByLabelText(/^Destination/)).toBeEnabled();
});

test('the CDF Process panel lists frequent regulation links that open in a new tab',()=>{
 render(<App />);
 const links=within(screen.getByRole('region',{name:'Frequent links'}));
 for(const href of ['https://www.business.ustranscom.mil/dtr/dtrp3.cfm','https://www.business.ustranscom.mil/dtr/part-iii/dtr_part_iii_app_o.pdf','https://www.business.ustranscom.mil/dtr/part-iii/dtr_part_iii_app_p.pdf','https://intelshare.intelink.gov/sites/attla/SitePages/Home.aspx'])
  expect(links.getAllByRole('link',{hidden:true}).some(link=>link.getAttribute('href')===href)).toBe(true);
 for(const link of links.getAllByRole('link',{hidden:true})) { expect(link).toHaveAttribute('target','_blank'); expect(link).toHaveAttribute('rel','noreferrer'); }
});

test('wrong decisions are scored and the after-action report lists them with discrepancies',()=>{
 render(<App />);
 userEvent.selectOptions(screen.getByLabelText('Training shipment'),'463l-pallet');
 userEvent.click(screen.getByRole('button',{name:'2. Incheck'}));
 userEvent.click(screen.getByRole('button',{name:'Inspect'}));
 userEvent.click(screen.getByRole('button',{name:'Inspect Cargo nets'}));
 userEvent.click(within(screen.getByRole('group',{name:'Cargo nets'})).getByRole('button',{name:'Satisfactory'}));
 userEvent.click(screen.getByRole('button',{name:'After-action report'}));
 const report=within(screen.getByRole('region',{name:'Loaded 463L pallet results'}));
 expect(report.getByText('Marked Cargo nets Satisfactory; it was Unsatisfactory')).toBeInTheDocument();
 expect(report.getByText(/Score 95/)).toBeInTheDocument();
 expect(within(report.getByText('Cargo nets').closest('tr')).getByText('Not yet found')).toBeInTheDocument();
 expect(within(report.getByText('Pallet dunnage').closest('tr')).getByText('Not yet found')).toBeInTheDocument();
});

test('progress is saved in the browser and New session starts over',()=>{
 const first=render(<App />);
 userEvent.click(screen.getByRole('button', { name: 'Scale' }));
 userEvent.click(screen.getByRole('button', { name: 'Weigh whole piece' }));
 record('GWT — gross weight (lb)', '9800');
 userEvent.selectOptions(screen.getByLabelText('Training shipment'),'isu-90');
 first.unmount();
 render(<App />);
 expect(screen.getByLabelText('Training shipment')).toHaveValue('isu-90');
 userEvent.selectOptions(screen.getByLabelText('Training shipment'),'rolling-stock');
 expect(within(notebook()).getByLabelText('GWT — gross weight (lb)')).toHaveValue(9800);
 userEvent.click(screen.getByRole('button',{name:'New session'}));
 userEvent.click(screen.getByRole('button',{name:'Start new session'}));
 expect(within(notebook()).getByLabelText('GWT — gross weight (lb)')).toHaveValue(null);
});

test('test mode hides hints and explanations but still scores the decision',()=>{
 render(<App />);
 userEvent.click(within(screen.getByRole('group',{name:'Training mode'})).getByRole('button',{name:'Test'}));
 userEvent.selectOptions(screen.getByLabelText('Training shipment'),'463l-pallet');
 userEvent.click(screen.getByRole('button',{name:'2. Incheck'}));
 expect(screen.queryByText('Side view: measure between matching left and right corners.')).not.toBeInTheDocument();
 userEvent.click(screen.getByRole('button',{name:'Inspect'}));
 userEvent.click(screen.getByRole('button',{name:'Inspect Cargo nets'}));
 const nets=within(screen.getByRole('group',{name:'Cargo nets'}));
 userEvent.click(nets.getByRole('button',{name:'Satisfactory'}));
 expect(nets.getByText('Decision recorded.')).toBeInTheDocument();
 expect(nets.queryByText(/Damaged cargo nets must not be used/)).not.toBeInTheDocument();
 expect(nets.queryByText('Try again.')).not.toBeInTheDocument();
 userEvent.click(screen.getByRole('button',{name:'After-action report'}));
 expect(within(screen.getByRole('dialog',{name:'After-action report'})).getByText(/Test mode/)).toBeInTheDocument();
 expect(within(screen.getByRole('region',{name:'Loaded 463L pallet results'})).getByText('Marked Cargo nets Satisfactory; it was Unsatisfactory')).toBeInTheDocument();
});

test('an instructor scenario code starts the same deployment for a trainee',()=>{
 render(<App />);
 userEvent.click(screen.getByRole('button',{name:'Instructor setup'}));
 const setup=within(screen.getByRole('dialog',{name:'Instructor setup'}));
 userEvent.selectOptions(setup.getByLabelText('Pieces'),'3');
 userEvent.selectOptions(setup.getByLabelText('Destination'),'FB5612');
 const code=setup.getByLabelText('Scenario code').value;
 userEvent.click(setup.getByRole('tab',{name:'Load a scenario code'}));
 userEvent.type(setup.getByLabelText('Scenario code'),code);
 userEvent.click(setup.getByRole('button',{name:'Load scenario'}));
 expect(screen.queryByRole('dialog',{name:'Instructor setup'})).not.toBeInTheDocument();
 expect(within(screen.getByLabelText('Training shipment')).getAllByRole('option')).toHaveLength(3);
 expect(screen.getByText(code)).toBeInTheDocument();
 userEvent.click(screen.getByRole('button',{name:'View DSOE'}));
 expect(within(screen.getByRole('dialog',{name:'Deployment Schedule of Events'})).getAllByText('RMS').length).toBeGreaterThan(0);
});

test('load planning follows Manifest, uses manifested pieces, and resumes after a refresh', () => {
 const first = render(<App />);
 userEvent.click(screen.getByRole('button', { name: '4. Load plan' }));
 expect(screen.getByRole('heading', { name: 'Load plan' })).toBeInTheDocument();
 expect(screen.getByText(/Waiting for Manifest:/)).toBeInTheDocument();
 userEvent.click(screen.getByRole('button', { name: 'Submit load plan' }));
 expect(screen.getAllByText(/must complete Manifest before/).length).toBeGreaterThan(0);
 first.unmount(); render(<App />);
 expect(screen.getByRole('heading', { name: 'Load plan' })).toBeInTheDocument();
});

test('trainees can open the walkthrough, searchable glossary, and quick drills', () => {
 render(<App />);
 userEvent.click(screen.getByRole('button', { name: 'Training guide' }));
 const guide = within(screen.getByRole('dialog', { name: 'Training guide' }));
 expect(guide.getByRole('heading', { name: 'Your first deployment' })).toBeInTheDocument();
 userEvent.type(guide.getByLabelText('Search acronyms'), 'FAW');
 expect(guide.getByText('Front Axle Weight')).toBeInTheDocument();
 expect(guide.queryByText('Rear Axle Weight')).not.toBeInTheDocument();
 userEvent.click(guide.getByRole('button', { name: 'Close training guide' }));
 userEvent.click(screen.getByRole('button', { name: 'Quick drills' }));
 const drill = within(screen.getByRole('dialog', { name: 'Quick drills' }));
 expect(drill.getByLabelText('Drill topic')).toBeInTheDocument();
 userEvent.click(drill.getByRole('button', { name: 'Check answer' }));
 expect(drill.getByRole('alert')).toHaveTextContent('Enter an answer');
});
