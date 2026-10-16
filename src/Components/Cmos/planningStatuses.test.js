import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CmosWorkspace from './CmosWorkspace';
import { createCmosStore, createRecord } from './model';
const statuses = [
  ['PI', 'Planning And Packaging', 'Inchecked'],
  ['ST', 'Inchecked Into Surface Freight', 'Inchecked'],
  ['AT', 'Inchecked Into Air Freight', 'Inchecked'],
  ['00', 'Advance Record Not Yet Inchecked', 'Need Incheck'],
  ['PA', 'Waiting Incheck Into Air Freight', 'Need Incheck'],
  ['PS', 'Waiting Incheck Into Surface Freight', 'Need Incheck'],
  ['CT', 'TCN Has Been Assigned To History', 'View Only'],
  ['FC', 'Frustrated And Cancelled', 'View Only'],
];
function Harness() {
  const [store, setStore] = useState(() => {
    let next = createCmosStore();
    for (const [code] of statuses) {
      next = createRecord(next, 'shipments', { tcn: `STATUS-${code}` });
      const id = next.selection.shipments;
      next.shipments[id].statusCode = code;
    }
    return next;
  });
  return <CmosWorkspace store={store} onChange={setStore} onClose={() => {}} />;
}
test('status dropdown matches the reference labels and groups', () => {
  render(<Harness />);
  const select = screen.getByLabelText('Search Status');
  for (const [code, label, group] of statuses) {
    const option = within(select).getByRole('option', { name: `${code} - ${label}` });
    expect(option).toHaveValue(code);
    expect(option.parentElement).toHaveAttribute('label', group);
  }
});
test.each(statuses)('%s filters the grid and displays the same status in shipment details', (code, label) => {
  render(<Harness />);
  userEvent.selectOptions(screen.getByLabelText('Search Status'), code);
  userEvent.click(screen.getByRole('button', { name: 'Search', exact: true }));
  const link = screen.getByRole('button', { name: `Open TCN STATUS-${code}` });
  expect(within(link.closest('tr')).getByText(code, { exact: true })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: `Open TCN STATUS-${code === '00' ? 'PI' : '00'}` })).not.toBeInTheDocument();
  userEvent.click(link);
  expect(screen.getByLabelText('Status')).toHaveValue(`${code} - ${label}`);
});
test.each([['00', 'PI'], ['PA', 'AT'], ['PS', 'ST']])('inchecking %s changes it to %s and keeps it visible', (before, after) => {
  render(<Harness />);
  userEvent.selectOptions(screen.getByLabelText('Search Status'), before);
  userEvent.click(screen.getByRole('button', { name: 'Search', exact: true }));
  userEvent.click(screen.getByRole('checkbox', { name: `Select row STATUS-${before}` }));
  userEvent.click(screen.getByRole('button', { name: 'Incheck', exact: true }));
  expect(screen.getByLabelText('Search Status')).toHaveValue(after);
  expect(within(screen.getByRole('button', { name: `Open TCN STATUS-${before}` }).closest('tr')).getByText(after, { exact: true })).toBeInTheDocument();
});

test.each(['CT', 'FC'])('%s remains view only and cannot be inchecked or edited', code => {
  render(<Harness />);
  userEvent.click(screen.getByRole('checkbox', { name: `Select row STATUS-${code}` }));
  expect(screen.getByRole('button', { name: 'Incheck', exact: true })).toBeDisabled();
  userEvent.click(screen.getByRole('button', { name: `Open TCN STATUS-${code}` }));
  expect(screen.getByLabelText('TCN')).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Save', exact: true })).toBeDisabled();
});
test('saving a new advance record keeps it at 00 until actual incheck', () => {
  render(<Harness />);
  userEvent.click(screen.getByRole('button', { name: 'New', exact: true }));
  userEvent.click(screen.getByRole('button', { name: 'Save', exact: true }));
  expect(screen.getByLabelText('Status')).toHaveValue('00 - Advance Record Not Yet Inchecked');
});
