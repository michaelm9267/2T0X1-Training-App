import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TgetAdapter from './TgetAdapter';

test('TGET prevalidates the LOA with a progress bar, then reports the result', () => {
  jest.useFakeTimers();
  const onComplete = jest.fn(() => ({ ok: true, details: 'LOA prevalidated. Funds available (training).' }));
  const onClose = jest.fn();
  render(<TgetAdapter tcn="FB652152530037XXX" tac="F8E0" onComplete={onComplete} onClose={onClose} runMs={1000} />);
  expect(screen.getByText(/Do not close this browser until validation is complete/)).toBeInTheDocument();
  expect(screen.getByText('Prevalidating LOA...')).toBeInTheDocument();
  expect(screen.getByRole('cell', { name: 'Processing...' })).toBeInTheDocument();
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  userEvent.click(screen.getByRole('button', { name: 'Minimize' }));
  expect(onClose).toHaveBeenLastCalledWith(true);
  act(() => { jest.advanceTimersByTime(500); });
  expect(Number(screen.getByRole('progressbar').getAttribute('aria-valuenow'))).toBeGreaterThan(0);
  expect(onComplete).not.toHaveBeenCalled();
  act(() => { jest.advanceTimersByTime(1500); });
  expect(onComplete).toHaveBeenCalledTimes(1);
  expect(screen.getByText('LOA prevalidation complete.')).toBeInTheDocument();
  expect(screen.getByRole('cell', { name: 'LOA prevalidated. Funds available (training).' })).toBeInTheDocument();
  userEvent.click(screen.getByRole('button', { name: 'Close' }));
  expect(onClose).toHaveBeenLastCalledWith(false);
  jest.useRealTimers();
});

test('TGET cannot validate a TCN with no TAC', () => {
  const onComplete = jest.fn();
  render(<TgetAdapter tcn="FB652152530037XXX" tac="" onComplete={onComplete} onClose={() => {}} />);
  expect(screen.getByText('LOA prevalidation failed.')).toBeInTheDocument();
  expect(screen.getByRole('cell', { name: /TAC is required/ })).toBeInTheDocument();
  expect(onComplete).not.toHaveBeenCalled();
});
