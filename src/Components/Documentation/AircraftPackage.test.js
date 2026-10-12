import { render, screen, within } from '@testing-library/react';
import AircraftPackage, { packageDocuments } from './AircraftPackage';
import { scenarios } from '../CargoWindow/scenarios';
import { emptyPlan } from '../LoadPlan/loadPlanLogic';

const view = id => ({ ...scenarios.find(s => s.id === id), destination: 'FB5294' });
const record = (tcn, weight) => ({ tcn, description: 'Item', length: 108, width: 88, height: 72, weight, origin: 'FB5000', apoe: 'EDF', destination: 'FB5294', apod: 'OSN', hazmat: 'N - Non-hazardous' });
const pieces = [
  { key: 'isu-90', title: 'ISU-90', record: record('F00001$$E100200XX', 4200), scenario: view('isu-90') },
  { key: '463l-pallet', title: 'Loaded 463L pallet', record: record('F00001$$E100300XX', 4800), scenario: view('463l-pallet') },
];

test('the package lists the manifest, load plan, and each required HAZDEC and ATTLA letter', () => {
  expect(packageDocuments(pieces).map(d => d.id)).toEqual(['manifest', 'load-plan', 'hazdec-isu-90', 'attla-isu-90']);
});

test('the package combines every document on its own page and flags what is not ready', () => {
  render(<AircraftPackage pieces={pieces} plan={{ ...emptyPlan(), placements: { 'isu-90': { station: 300, lateral: 0 } } }} departureAt="2026-10-12T16:25" releasedAt={null} destination="FB5294" outstanding={['The manifest has not been released.']} onClose={() => {}} />);
  const sheet = within(screen.getByRole('dialog', { name: 'Aircraft commander paperwork package' }));
  expect(sheet.getByText('DRAFT — NOT READY')).toBeInTheDocument();
  expect(sheet.getByText('The manifest has not been released.')).toBeInTheDocument();
  expect(sheet.getByRole('button', { name: 'Print package' })).toBeInTheDocument();
  const pages = sheet.getAllByRole('region');
  expect(pages.map(page => page.getAttribute('aria-label'))).toEqual(['Package cover sheet', 'Cargo manifest', 'Load plan', "Shipper's Declaration for Dangerous Goods (HAZDEC) — ISU-90", 'ATTLA air transport certification — ISU-90']);
  expect(within(pages[1]).getAllByText('F00001$$E100300XX').length).toBeGreaterThan(0);
  expect(within(pages[2]).getByText('Not placed')).toBeInTheDocument();
  expect(within(pages[3]).getByText("SHIPPER'S DECLARATION FOR DANGEROUS GOODS")).toBeInTheDocument();
  expect(within(pages[4]).getByText('File Number 99.05.14 Rev 1')).toBeInTheDocument();
});
