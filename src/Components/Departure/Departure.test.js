import { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Departure from './Departure';
import { emptyDeparture, toLocalInput } from './departureLogic';

function Harness({ ready = true }) {
  const [state, setState] = useState(emptyDeparture());
  const departureAt = state.at || toLocalInput(new Date(Date.now() + 2 * 3600000));
  return <Departure state={state} departureAt={departureAt} onChange={setState} ready={ready} waiting={ready ? [] : ['ISU-90']}
    manifestPieces={[{ scenarioId: 'p', record: { tcn: 'T1', weight: 4800 } }]} destination="FB5294" basis="T1" />;
}

test('the trainee sets the departure and releases the manifest within 30 minutes of it', () => {
  render(<Harness />);
  const input = screen.getByLabelText('Aircraft departure date and time');
  userEvent.click(screen.getByRole('button', { name: 'Release manifest' }));
  expect(screen.getByText(/Too early/)).toBeInTheDocument();
  fireEvent.change(input, { target: { value: toLocalInput(new Date(Date.now() + 10 * 60000)) } });
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
