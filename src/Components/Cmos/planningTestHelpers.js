import { screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Detail-form tests follow the same explicit TCN click as trainees.
export function openSelectedPlanningTcn() {
  const tcn = screen.getAllByRole('button', { name: /^Open TCN / })
    .find(button => button.closest('tr').getAttribute('aria-selected') === 'true');
  if (!tcn) throw new Error('Select a shipment row before opening its TCN.');
  userEvent.click(tcn);
}

// MIL Mode F Edit TCN needs NSN (NNSN when there is none) and the air data CMOS lists under
// Consistency Check Results.
export function fillAirData(scope = screen, { poe = 'ANC', pod = 'FAI', tac = 'TRN1' } = {}) {
  for (const [label, value] of [['NSN', 'NNSN'], ['POE', poe], ['POD', pod], ['TAC', tac], ['ETA', '1']])
    if (!scope.getByLabelText(label).value) fireEvent.change(scope.getByLabelText(label), { target: { value } });
  userEvent.click(scope.getByRole('tab', { name: 'Indicators' }));
  const indicators = within(scope.getByRole('tabpanel', { name: 'Indicators' }));
  fireEvent.change(indicators.getByRole('textbox', { name: 'Commodity S/H' }), { target: { value: 'AZ' } });
  userEvent.selectOptions(indicators.getByLabelText('Air Dim'), 'A');
  userEvent.click(scope.getByRole('tab', { name: 'Pieces' }));
}
