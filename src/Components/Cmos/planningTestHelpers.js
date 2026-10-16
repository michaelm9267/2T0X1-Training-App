import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Detail-form tests follow the same explicit TCN click as trainees.
export function openSelectedPlanningTcn() {
  const tcn = screen.getAllByRole('button', { name: /^Open TCN / })
    .find(button => button.closest('tr').getAttribute('aria-selected') === 'true');
  if (!tcn) throw new Error('Select a shipment row before opening its TCN.');
  userEvent.click(tcn);
}
