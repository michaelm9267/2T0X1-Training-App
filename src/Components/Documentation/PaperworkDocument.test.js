import { render, screen, within } from '@testing-library/react';
import PaperworkDocument, { DocumentBody } from './PaperworkDocument';
import { scenarios } from '../CargoWindow/scenarios';
import { manifestFields } from '../CargoWindow/workflow';

test.each([
  ['rolling-stock', '91'], ['isu-90', '44'], ['463l-pallet', '44'],
  ['three-axle', '127'], ['age-generator', '82'], ['mj1-jammer', '62'],
])('%s LOGMOD load list and both placards agree on the shipment CB', (id, cb) => {
  const scenario = scenarios.find(item => item.id === id);
  const { rerender } = render(<PaperworkDocument scenario={scenario} document={{ id: 'logmod', title: 'LOGMOD paperwork' }} onClose={() => {}} />);
  for (const label of screen.getAllByText('CB (in)')) expect(label.nextElementSibling).toHaveTextContent(new RegExp(`^${cb}$`));
  if (id === 'isu-90') expect(within(screen.getByRole('region', { name: 'Hazardous cargo detail' })).getByText('CB (in)').nextElementSibling).toHaveTextContent(/^44$/);
  rerender(<PaperworkDocument scenario={scenario} document={{ id: 'logmod-placards', title: 'LOGMOD placards' }} onClose={() => {}} />);
  const labels = screen.getAllByText('CB', { exact: true });
  expect(labels).toHaveLength(2);
  for (const label of labels) expect(label.nextElementSibling).toHaveTextContent(new RegExp(`^${cb}$`));
});

test('simulated LOGMOD identifiers stay consistent across documents as shipment CB changes', () => {
  const scenario = scenarios.find(item => item.id === 'rolling-stock');
  const { rerender } = render(<PaperworkDocument scenario={scenario} document={{ id: 'logmod', title: 'LOGMOD paperwork' }} onClose={() => {}} />);
  const items = screen.getByRole('table', { name: 'Increment items' });
  expect(within(items).getByRole('cell', { name: '2320-00-999-1001' })).toBeInTheDocument();
  expect(within(items).getByRole('cell', { name: 'TRN/VEH' })).toBeInTheDocument();
  const changed = { ...scenario, paperworkWeight: 10500, axles: [{ position: 20, weight: 4900 }, { position: 140, weight: 4900 }] };
  rerender(<PaperworkDocument scenario={changed} document={{ id: 'logmod', title: 'LOGMOD paperwork' }} onClose={() => {}} />);
  for (const label of screen.getAllByText('CB (in)')) expect(label.nextElementSibling).toHaveTextContent(/^80$/);
  expect(within(items).getByRole('cell', { name: '2320-00-999-1001' })).toBeInTheDocument();
  rerender(<PaperworkDocument scenario={changed} document={{ id: 'logmod-placards', title: 'LOGMOD placards' }} onClose={() => {}} />);
  for (const copy of screen.getAllByRole('region', { name: /Deployment Marshaling Placard copy/ })) {
    expect(within(copy).getByText(/NSN: 2320-00-999-1001/)).toHaveTextContent('Org/Shop: TRN/VEH');
    expect(within(copy).getByText('CB', { exact: true }).nextElementSibling).toHaveTextContent(/^80$/);
  }
});

test('pallet LOGMOD CB follows changed length', () => {
  const scenario = { ...scenarios.find(item => item.id === '463l-pallet'), length: 120 };
  render(<PaperworkDocument scenario={scenario} document={{ id: 'logmod', title: 'LOGMOD paperwork' }} onClose={() => {}} />);
  expect(screen.getByText('CB (in)').nextElementSibling).toHaveTextContent(/^60$/);
});

test('execution load list retains declared weight discrepancies and updates with the shipment', () => {
  const scenario = { ...scenarios[0], paperworkWeight: 9950 };
  const { rerender } = render(<PaperworkDocument scenario={scenario} document={{ id: 'logmod', title: 'LOGMOD paperwork' }} onClose={() => {}} />);
  const table = screen.getByRole('table', { name: 'Increment items' });
  expect(within(table).getByRole('cell', { name: '9950' })).toBeInTheDocument();
  expect(within(table).queryByRole('cell', { name: '9800' })).not.toBeInTheDocument();
  rerender(<PaperworkDocument scenario={{ ...scenario, paperworkWeight: undefined, weight: 9825 }} document={{ id: 'logmod', title: 'LOGMOD paperwork' }} onClose={() => {}} />);
  expect(within(table).getByRole('cell', { name: '9825' })).toBeInTheDocument();
});

test('execution load list includes hazardous-cargo detail only for declared hazardous shipments', () => {
  const scenario = scenarios.find(item => item.id === 'isu-90');
  const { rerender } = render(<PaperworkDocument scenario={scenario} document={{ id: 'logmod', title: 'LOGMOD paperwork' }} onClose={() => {}} />);
  expect(screen.getByRole('region', { name: 'Hazardous cargo detail' })).toHaveTextContent('UN1950');
  rerender(<PaperworkDocument scenario={scenarios.find(item => item.id === '463l-pallet')} document={{ id: 'logmod', title: 'LOGMOD paperwork' }} onClose={() => {}} />);
  expect(screen.queryByRole('region', { name: 'Hazardous cargo detail' })).not.toBeInTheDocument();
});

test('HAZDEC follows the DAF Form 7507 layout with shipment values', () => {
  const scenario = scenarios.find(item => item.id === 'age-generator');
  const values = Object.fromEntries(manifestFields(scenario).map(f => [f.id, f.expected]));
  render(<PaperworkDocument scenario={scenario} document={{ id: 'hazdec', title: 'HAZDEC' }} onClose={() => {}} />);
  const form = screen.getByRole('dialog', { name: 'HAZDEC' });
  expect(within(form).getByText("SHIPPER'S DECLARATION FOR DANGEROUS GOODS")).toBeInTheDocument();
  expect(within(form).getByText(values.tcn)).toBeInTheDocument();
  expect(within(form).getByRole('cell', { name: 'UN3528' })).toBeInTheDocument();
  expect(within(form).getByRole('cell', { name: 'MACHINERY, INTERNAL COMBUSTION, FLAMMABLE LIQUID POWERED' })).toBeInTheDocument();
  expect(within(form).getByText('PASSENGER AND CARGO AIRCRAFT')).not.toHaveClass('hz-deleted');
  expect(within(form).getByText('CARGO AIRCRAFT ONLY')).toHaveClass('hz-deleted');
  expect(within(form).getByText('RADIOACTIVE')).toHaveClass('hz-deleted');
  expect(within(form).getByText(/DAF FORM 7507/)).toBeInTheDocument();
});

test.each([
  ['rolling-stock', 'UN3166', 'A13.4'],
  ['three-axle', 'UN3166', 'A13.4'],
  ['mj1-jammer', 'UN3166', 'A13.4'],
  ['age-generator', 'UN3528', 'A7.11'],
  ['isu-90', 'UN1950', 'A6.2'],
])('%s HAZDEC uses the AFMAN 24-604 packing paragraph for %s', (scenarioId, unNumber, paragraph) => {
  const scenario = scenarios.find(item => item.id === scenarioId);
  render(<PaperworkDocument scenario={scenario} document={{ id: 'hazdec', title: 'HAZDEC' }} onClose={() => {}} />);
  const row = screen.getByRole('cell', { name: unNumber }).closest('tr');
  expect(within(row).getByRole('cell', { name: paragraph })).toBeInTheDocument();
});

test('both marshaling placard copies show the declared shipment data and preserve weight discrepancies', () => {
  const scenario = { ...scenarios.find(item => item.id === '463l-pallet'), paperworkWeight: 4950 };
  const { rerender } = render(<PaperworkDocument scenario={scenario} document={{ id: 'logmod-placards', title: 'LOGMOD placards' }} onClose={() => {}} />);
  const copies = screen.getAllByRole('region', { name: /Deployment Marshaling Placard copy/ });
  expect(copies).toHaveLength(2);
  for (const copy of copies) {
    expect(within(copy).getByText('F00001$$E100300XX')).toBeInTheDocument();
    expect(within(copy).getByText('E / 1003')).toBeInTheDocument();
    expect(within(copy).getByText('4,950')).toBeInTheDocument();
    expect(within(copy).getByText('396')).toBeInTheDocument();
    expect(within(copy).getByText('Palletized general supplies')).toBeInTheDocument();
    expect(within(copy).getByText('4. Date Shipped').nextElementSibling.textContent.trim()).toBe('');
  }
  rerender(<PaperworkDocument scenario={{ ...scenario, paperworkWeight: undefined, weight: 4825 }} document={{ id: 'logmod-placards', title: 'LOGMOD placards' }} onClose={() => {}} />);
  for (const copy of copies) {
    expect(within(copy).getByText('4,825')).toBeInTheDocument();
    expect(within(copy).queryByText('4,950')).not.toBeInTheDocument();
  }
});

test.each([
  ['age-generator', ['UN1202, Diesel Fuel, 3, III, Fuel Drained to 500 ML or less.', 'UN2800, 1 Non-Spillable Batteries installed, Terminals Taped']],
  ['rolling-stock', ['UN1202, Diesel Fuel, 3, III, Fuel Drained to 1/4 or less. 23.75 Lt', 'UN2800, 2 Non-Spillable Batteries installed, Terminals Taped']],
  ['three-axle', ['UN1202, Diesel Fuel, 3, III, Fuel Drained to 1/4 or less. 55 Lt', 'UN2800, 4 Non-Spillable Batteries installed, Terminals Taped']],
])('%s HAZDEC states its fuel and batteries and shows quantities in metric', (scenarioId, statements) => {
  const scenario = scenarios.find(item => item.id === scenarioId);
  render(<PaperworkDocument scenario={scenario} document={{ id: 'hazdec', title: 'HAZDEC' }} onClose={() => {}} />);
  const form = screen.getByRole('dialog', { name: 'HAZDEC' });
  for (const statement of statements) expect(within(form).getByText(statement)).toBeInTheDocument();
  expect(within(form).getByText(`1 unpackaged × ${Math.round(scenario.weight * 0.45359237).toLocaleString()} kg`)).toBeInTheDocument();
  expect(within(form).queryByText(/\blb\b/)).not.toBeInTheDocument();
});

// AFMAN 24-604 (6 June 2025), Tables A4.1 and A4.2: these entries are P5.
test.each(['rolling-stock', 'three-axle', 'mj1-jammer', 'age-generator', 'isu-90'])(
  '%s retains passenger and cargo aircraft under P5', scenarioId => {
    render(<PaperworkDocument scenario={scenarios.find(item => item.id === scenarioId)} document={{ id: 'hazdec', title: 'HAZDEC' }} onClose={() => {}} />);
    expect(screen.getByText('PASSENGER AND CARGO AIRCRAFT')).not.toHaveClass('hz-deleted');
    expect(screen.getByText('CARGO AIRCRAFT ONLY')).toHaveClass('hz-deleted');
  }
);

test('UN0012 ammunition uses the AFMAN packing paragraph and explosives emergency contact', () => {
  const scenario = { ...scenarios.find(item => item.id === 'rolling-stock'), ammo: true, hazdecError: null };
  render(<PaperworkDocument scenario={scenario} document={{ id: 'hazdec', title: 'HAZDEC' }} onClose={() => {}} />);
  expect(screen.getByRole('cell', { name: 'A5.12' })).toBeInTheDocument();
  expect(screen.getByText(/703.*695-4695/, { selector: '.hz-emergency .hz-inline' })).toBeInTheDocument();
  expect(screen.getByText('CARGO AIRCRAFT ONLY')).toHaveClass('hz-deleted');
});

test('HAZDEC prints the complete JBER consignor and shipper phone', () => {
  render(<PaperworkDocument scenario={scenarios.find(item => item.id === 'age-generator')} document={{ id: 'hazdec', title: 'HAZDEC' }} onClose={() => {}} />);
  const shipper = screen.getByText('SHIPPER', { exact: true }).parentElement;
  for (const line of ['FA5030 773 LRS LGRT', 'GPC ONLY SHIP TO', '5257 FINLETTER AVE', 'JBER, AK 99506', '9075522131']) {
    expect(within(shipper).getByText(line)).toBeInTheDocument();
  }
});

test('the packing list is a LOGMOD Execution Material List whose line weights total the increment weight', () => {
  const { ammunitionFixture } = require('../CdfCmos/trainingData');
  for (const scenario of [...scenarios, ammunitionFixture()]) {
    const { unmount } = render(<DocumentBody scenario={{ ...scenario, destination: 'FB5612' }} documentId="packing" />);
    const report = screen.getByRole('region', { name: 'Execution material list' });
    expect(within(report).getAllByRole('heading', { name: 'Execution Material List' })).toHaveLength(2);
    const tables = within(report).getAllByRole('table', { name: /^Items · / });
    const weights = tables.flatMap(table => within(table).getAllByRole('row').slice(1).map(row => Number(within(row).getAllByRole('cell')[8].textContent) || 0));
    expect(weights.reduce((sum, w) => sum + w, 0)).toBe(scenario.weight);
    const text = report.textContent;
    if (scenario.id === 'isu-90') { expect(text).toMatch(/PAINT, AEROSOL, FLAMMABLE/); expect(text).not.toMatch(/chemical/i); }
    if (scenario.id === 'rolling-stock') expect(within(report).getByRole('region', { hidden: true, name: 'Remarks' })).toHaveTextContent('UN2800');
    if (scenario.ammo) expect(within(report).getByRole('table', { name: 'Lot data' })).toHaveTextContent('TRN-001');
    if (scenario.axles) expect(text).toMatch(/UN3166|UN3528/);
    unmount();
  }
});
