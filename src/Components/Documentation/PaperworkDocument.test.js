import { render, screen, within } from '@testing-library/react';
import PaperworkDocument from './PaperworkDocument';
import { scenarios } from '../CargoWindow/scenarios';
import { manifestFields } from '../CargoWindow/workflow';

test('HAZDEC follows the DAF Form 7507 layout with shipment values', () => {
  const scenario = scenarios.find(item => item.id === 'age-generator');
  const values = Object.fromEntries(manifestFields(scenario).map(f => [f.id, f.expected]));
  render(<PaperworkDocument scenario={scenario} document={{ id: 'hazdec', title: 'HAZDEC' }} onClose={() => {}} />);
  const form = screen.getByRole('dialog', { name: 'HAZDEC' });
  expect(within(form).getByText("SHIPPER'S DECLARATION FOR DANGEROUS GOODS")).toBeInTheDocument();
  expect(within(form).getByText(values.tcn)).toBeInTheDocument();
  expect(within(form).getByRole('cell', { name: 'UN3528' })).toBeInTheDocument();
  expect(within(form).getByRole('cell', { name: 'MACHINERY, INTERNAL COMBUSTION, FLAMMABLE LIQUID POWERED' })).toBeInTheDocument();
  expect(within(form).getByText('PASSENGER AND CARGO AIRCRAFT')).toHaveClass('hz-deleted');
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

test('LOGMOD placard shows the shipment identifiers and handling data', () => {
  const scenario = scenarios.find(item => item.id === '463l-pallet');
  const values = Object.fromEntries(manifestFields(scenario).map(f => [f.id, f.expected]));
  render(<PaperworkDocument scenario={scenario} document={{ id: 'logmod-placards', title: 'LOGMOD placards' }} onClose={() => {}} />);
  const placard = screen.getByRole('dialog', { name: 'LOGMOD placards' });
  expect(within(placard).getByText('LOGMOD CARGO PLACARD')).toBeInTheDocument();
  expect(within(placard).getByText(values.tcn)).toBeInTheDocument();
  expect(within(placard).getByText(values.description)).toBeInTheDocument();
  expect(within(placard).getByText(`${values.destination} / ${values.apod}`)).toBeInTheDocument();
  expect(within(placard).getByText(`${values.weight} LB`)).toBeInTheDocument();
});
