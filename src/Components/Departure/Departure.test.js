import { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Departure from './Departure';
import { emptyDeparture, toLocalInput } from './departureLogic';
import DepartureTimeField from './DepartureTimeField';

function Harness({ ready = true }) {
  const [state, setState] = useState(emptyDeparture());
  const departureAt = state.at || toLocalInput(new Date(Date.now() + 2 * 3600000));
  return <Departure state={state} departureAt={departureAt} onChange={setState} ready={ready} waiting={ready ? [] : ['ISU-90']}
    manifestPieces={[{ scenarioId: 'p', record: { tcn: 'T1', weight: 4800 } }]} destination="FB5294" basis="T1" />;
}

test('the trainee sets the departure and releases the manifest within the 30 minutes following it', () => {
  render(<Harness />);
  userEvent.click(screen.getByRole('button', { name: 'Release manifest' }));
  expect(screen.getByText(/Too early/)).toBeInTheDocument();
  userEvent.click(screen.getByRole('button', { name: 'Use current time' }));
  expect(screen.getByText(/^Departs \d{2}-[A-Z][a-z]{2}-\d{4}\/\d{2}:\d{2} \(24-hour local time\)\.$/)).toBeInTheDocument();
  userEvent.click(screen.getByRole('button', { name: 'Release manifest' }));
  expect(screen.getByText(/Manifest released at/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Manifest released' })).toBeDisabled();
});

test('the manifest cannot be released before every piece passes JI', () => {
  render(<Harness ready={false} />);
  expect(screen.getByText(/Waiting for JI: ISU-90/)).toBeInTheDocument();
  userEvent.click(screen.getByRole('button', { name: 'Release manifest' }));
  expect(screen.getByText('Every piece on the DSOE must pass JI before the manifest is released.')).toBeInTheDocument();
});

test('the departure picker builds the time from a date, hour, and minute', () => {
  const onChange = jest.fn();
  render(<DepartureTimeField label="Departure Date/Time" value="" onChange={onChange} />);
  expect(screen.getByText('Choose the departure date, hour and minute.')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Departure Date/Time date'), { target: { value: '18OCT2026' } });
  userEvent.selectOptions(screen.getByLabelText('Departure Date/Time hour'), '16');
  expect(onChange).toHaveBeenLastCalledWith('');
  expect(screen.getByText('Choose the departure minute.')).toBeInTheDocument();
  userEvent.selectOptions(screen.getByLabelText('Departure Date/Time minute'), '25');
  expect(onChange).toHaveBeenLastCalledWith('2026-10-18T16:25');
  expect(screen.getByText('Departs 18-Oct-2026/16:25 (24-hour local time).')).toBeInTheDocument();
  expect(screen.getByRole('option', { name: '16 (4 PM)' })).toBeInTheDocument();
});
