import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CargoWindow from './CargoWindow';
import { scenarios } from './scenarios';
import { cargoModel, ISU_COMBINATION } from './cargoModels';

function setup(scenario = scenarios[0], stage = 'incheck') {
  const props = { scenario, stage, onRecordMeasurement: jest.fn(), onRecordWeight: jest.fn(), onInspect: jest.fn(), onPlaceLabel: jest.fn(), onRemoveLabel: jest.fn() };
  render(<CargoWindow {...props} />);
  return props;
}

test('records a two-point physical measurement and rejects duplicate endpoints', () => {
  const props = setup();
  userEvent.click(screen.getByRole('button', { name: 'Upper left edge' }));
  userEvent.click(screen.getByRole('button', { name: 'Upper left edge' }));
  expect(screen.getByRole('status')).toHaveTextContent('Choose a different endpoint');
  expect(props.onRecordMeasurement).not.toHaveBeenCalled();
  userEvent.click(screen.getByRole('button', { name: 'Upper right edge' }));
  expect(props.onRecordMeasurement).toHaveBeenCalledWith(expect.objectContaining({ view: 'side', inches: 197 }));
});

test('changing view or tool clears incomplete measurements', () => {
  setup();
  userEvent.click(screen.getByRole('button', { name: 'Upper left edge' }));
  userEvent.selectOptions(screen.getByLabelText('Cargo view'), 'front');
  userEvent.click(screen.getByRole('button', { name: 'Upper right edge' }));
  expect(screen.queryByRole('button', { name: 'Save measurement' })).not.toBeInTheDocument();
  userEvent.click(screen.getByRole('button', { name: 'Scale' }));
  userEvent.click(screen.getByRole('button', { name: 'Tape measure' }));
  userEvent.click(screen.getByRole('button', { name: 'Upper left edge' }));
  expect(screen.queryByRole('button', { name: 'Save measurement' })).not.toBeInTheDocument();
  userEvent.click(screen.getByRole('button', { name: 'Clear measurement' }));
  expect(screen.getByRole('status')).toHaveTextContent('Choose a start point');
});

test('records gross and individual axle weights', () => {
  const props = setup();
  userEvent.click(screen.getByRole('button', { name: 'Scale' }));
  for (const name of ['Weigh whole piece', 'Weigh W1 (FAW)', 'Weigh W2 (RAW)']) userEvent.click(screen.getByRole('button', { name }));
  expect(props.onRecordWeight.mock.calls.map(([value]) => value)).toEqual([
    { id: 'gross', title: 'Whole piece', pounds: 9800 },
    { id: 'front-axle', title: 'W1 (FAW)', pounds: 5400 },
    { id: 'rear-axle', title: 'W2 (RAW)', pounds: 4400 },
  ]);
});

test('Incheck inspection does not offer an MSL inspection button', () => {
  setup();
  userEvent.click(screen.getByRole('button', { name: 'Inspect' }));
  expect(screen.queryByRole('button', { name: 'Inspect Military shipping label' })).not.toBeInTheDocument();
});

test('ISU doors reveal contents and closing hides their controls', () => {
  const props = setup(scenarios[1]);
  userEvent.click(screen.getByRole('button', { name: 'Inspect' }));
  expect(screen.queryByRole('button', { name: 'Inspect Loose tool case' })).not.toBeInTheDocument();
  userEvent.click(screen.getByRole('button', { name: 'Open ISU doors' }));
  userEvent.click(screen.getByRole('button', { name: 'Inspect Loose tool case' }));
  expect(props.onInspect).toHaveBeenCalledWith('loose-case');
  expect(screen.getByRole('status')).toHaveTextContent('The tool case is unsecured inside the ISU.');
  expect(screen.getByText(/unsecured tool case/i)).toBeInTheDocument();
  userEvent.click(screen.getByRole('button', { name: 'Close ISU doors' }));
  expect(screen.queryByRole('button', { name: 'Inspect Loose tool case' })).not.toBeInTheDocument();
});

test('mouse points use the inverse SVG transform and snap at different screen scales', () => {
  const props = setup();
  const svg = screen.getByRole('img', { name: /interactive cargo/i });
  for (const scale of [2, 4]) {
    svg.getScreenCTM = () => ({ a: scale, b: 0, c: 0, d: scale, inverse: () => ({ a: 1 / scale, b: 0, c: 0, d: 1 / scale, e: 0, f: 0 }) });
    fireEvent.click(svg, { clientX: 2, clientY: 2 });
    fireEvent.click(svg, { clientX: 197 * scale - 2, clientY: 2 });
    }
  expect(props.onRecordMeasurement).toHaveBeenCalledTimes(2);
  expect(props.onRecordMeasurement.mock.calls.every(([value]) => value.inches === 197)).toBe(true);
});

test('perspective inspection cannot record distorted measurements and switching clears endpoints', () => {
  const props = setup();
  userEvent.click(screen.getByRole('button', { name: 'Upper left edge' }));
  userEvent.selectOptions(screen.getByLabelText('Cargo view'), 'perspective');
  expect(screen.getByRole('img', { name: /perspective view/i })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Save measurement' })).not.toBeInTheDocument();
  const svg = screen.getByRole('img', { name: /perspective view/i });
  fireEvent.click(svg, { clientX: 10, clientY: 10 });
  fireEvent.click(svg, { clientX: 200, clientY: 100 });
  expect(props.onRecordMeasurement).not.toHaveBeenCalled();
  userEvent.selectOptions(screen.getByLabelText('Cargo view'), 'side');
  userEvent.click(screen.getByRole('button', { name: 'Upper right edge' }));
  expect(screen.queryByRole('button', { name: 'Save measurement' })).not.toBeInTheDocument();
});

test('mouse tape placement passes physical coordinates and the selected vehicle side', () => {
  const props = setup();
  userEvent.click(screen.getByRole('button', { name: 'Labeling tape' }));
  userEvent.selectOptions(screen.getByLabelText('Vehicle side'), 'right');
  userEvent.type(screen.getByLabelText('Value on tape'), '2600');
  const svg = screen.getByRole('img', { name: /interactive cargo/i });
  svg.getScreenCTM = () => ({ inverse: () => ({ a:.5,b:0,c:0,d:.5,e:0,f:0 }) });
  fireEvent.click(svg, { clientX:72, clientY:80 });
  expect(props.onPlaceLabel).toHaveBeenCalledWith(expect.objectContaining({ type:'faw',side:'right',value:'2600',x:36,y:40 }));
  userEvent.selectOptions(screen.getByLabelText('Cargo view'), 'perspective');
  fireEvent.click(svg,{clientX:72,clientY:80});
  expect(props.onPlaceLabel).toHaveBeenCalledTimes(1);
});

test('ISU door locks show the combination tape unless access is the discrepancy', () => {
  const isu = scenarios.find(item => item.id === 'isu-90');
  const parts = scenario => cargoModel(scenario, { doorsOpen: false }).filter(part => part.value === ISU_COMBINATION);
  expect(parts(isu)).toHaveLength(2);
  const locked = { ...isu, findings: isu.findings.map(f => f.id === 'access' ? { ...f, correct: 'unsatisfactory' } : f) };
  expect(parts(locked)).toHaveLength(0);
  expect(isu.findings.find(f => f.id === 'access').observation).toMatch(/combination written on tape directly above the lock/);
});
