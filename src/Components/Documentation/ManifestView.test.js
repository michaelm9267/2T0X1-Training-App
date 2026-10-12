import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ManifestView from './ManifestView';

const record = (tcn, weight) => ({ tcn, description: 'Item', length: 108, width: 88, height: 72, weight, origin: 'FB5000', apoe: 'EDF', destination: 'FB5294', apod: 'OSN', hazmat: 'N - Non-hazardous' });

test('lists every manifested piece across shipments with totals and per-piece removal', () => {
  const onRemove = jest.fn();
  render(<ManifestView onRemove={onRemove} pieces={[
    { scenarioId: 'isu-90', title: 'ISU 90', record: record('F00001$$E100200XX', 4200), mslApplied: false, current: false },
    { scenarioId: '463l-pallet', title: 'Loaded 463L pallet', record: record('F00001$$E100300XX', 4800), mslApplied: true, current: true },
  ]} />);
  const card = screen.getByRole('region', { name: 'Cargo manifest' });
  expect(within(card).getByText('2 pieces')).toBeInTheDocument();
  expect(within(card).getByText('Loaded 463L pallet (current)')).toBeInTheDocument();
  expect(within(card).getByText('9000')).toBeInTheDocument();
  const row = within(card).getByRole('row', { name: 'ISU 90 manifest entry' });
  userEvent.click(within(row).getByRole('button', { name: 'Remove piece from manifest' }));
  userEvent.click(within(row).getByRole('button', { name: 'Confirm removal' }));
  expect(onRemove).toHaveBeenCalledWith('isu-90');
});

test('print manifest opens a numbered manifest of every piece and prints it', () => {
  const print = jest.spyOn(window, 'print').mockImplementation(() => {});
  render(<ManifestView onRemove={() => {}} pieces={[
    { scenarioId: 'isu-90', title: 'ISU 90', record: record('F00001$$E100200XX', 4200), mslApplied: false, current: false },
    { scenarioId: '463l-pallet', title: 'Loaded 463L pallet', record: record('F00001$$E100300XX', 4800), mslApplied: true, current: true },
  ]} />);
  userEvent.click(screen.getByRole('button', { name: 'Print manifest' }));
  const manifest = screen.getByRole('dialog', { name: /^Cargo manifest EDF\d{4}001$/ });
  expect(within(manifest).getAllByText('F00001$$E100200XX')).toHaveLength(1);
  expect(within(manifest).getAllByText('9,000').length).toBeGreaterThan(0);
  userEvent.click(within(manifest).getByRole('button', { name: 'Print' }));
  expect(print).toHaveBeenCalled();
  print.mockRestore();
});

test('manifest number is EDF, the four-digit Julian date, and the sequence', () => {
  const { manifestNumber, julianDate } = require('./PrintManifest');
  expect(julianDate(new Date(2026, 9, 11))).toBe('6284');
  expect(julianDate(new Date(2027, 0, 1))).toBe('7001');
  expect(manifestNumber(new Date(2026, 9, 11))).toBe('EDF6284001');
});

test('print manifest is unavailable with no pieces', () => {
  render(<ManifestView onRemove={() => {}} pieces={[]} />);
  expect(screen.getByRole('button', { name: 'Print manifest' })).toBeDisabled();
});
