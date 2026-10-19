import { render, screen } from '@testing-library/react';
import { newPracticeSession } from '../CargoWindow/practice';
import { withDocumentErrors } from '../CargoWindow/discrepancies';
import DocumentationPanel from './DocumentationPanel';
import CargoWindow from '../CargoWindow/CargoWindow';

test('at JI the notebook is a read-only Incheck record and the Labeling tape tool is gone', () => {
  const session = newPracticeSession({ section: 'ji', piece: 'rolling-stock', random: () => .3 });
  const exercise = session.exercises[session.scenarioId];
  const scenario = withDocumentErrors({ ...session.shipments[session.scenarioId], destination: session.destination }, exercise);
  const noop = () => {};
  render(<DocumentationPanel step={{ id: 'ji', title: 'JI' }} scenario={scenario} exercise={exercise} onAnswer={noop} onCorrect={noop} completedStages={[]} onWorkflow={noop} onNotebookChange={noop} onNotebookSave={noop} onCBCalculate={noop} />);
  expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /^Record / })).not.toBeInTheDocument();
  expect(screen.getByText(String(scenario.weight))).toBeInTheDocument();
  render(<CargoWindow scenario={scenario} exercise={exercise} stage="ji" onRecordMeasurement={noop} onRecordWeight={noop} onInspect={noop} onPlaceLabel={noop} onRemoveLabel={noop} onInspectMarkings={noop} />);
  expect(screen.queryByRole('button', { name: 'Labeling tape' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Scale' })).toBeInTheDocument();
});
