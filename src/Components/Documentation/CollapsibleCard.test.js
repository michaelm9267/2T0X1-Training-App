import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const CollapsibleCard = jest.requireActual('./CollapsibleCard').default;

test('training panel cards start closed and open from their heading', () => {
  render(<CollapsibleCard label="Shipment paperwork" title="Increment monitor's paperwork packet"><p>Packet contents</p></CollapsibleCard>);
  const toggle = screen.getByRole('button', { name: "Increment monitor's paperwork packet" });
  expect(toggle).toHaveAttribute('aria-expanded', 'false');
  expect(screen.queryByText('Packet contents')).not.toBeVisible();
  userEvent.click(toggle);
  expect(toggle).toHaveAttribute('aria-expanded', 'true');
  expect(screen.getByText('Packet contents')).toBeVisible();
});
