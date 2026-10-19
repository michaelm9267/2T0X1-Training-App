import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { scenarios } from './scenarios';
import { applyDiscrepancies, possibleDiscrepancies } from './discrepancies';
import { createExercise } from './exercise';
import { ammunitionFixture } from '../CdfCmos/trainingData';
import { ROWS, expectedMark, markJI, correctMarks, rowComplete, rowNeeds, rowReady } from './dd2133';
import DD2133Form from '../Documentation/DD2133Form';

const pieces = [...scenarios, ammunitionFixture()];
const prepared = s => ({ ...createExercise(), jiInspected: s.findings.map(f => f.id), jiDocumentsViewed: ['logmod', 'logmod-placards', 'packing', 'hazdec', 'attla'] });

test('blocks 11 and 12 are marked for every piece; only the block that fits the item is used', () => {
  for (const s of pieces) {
    const e = createExercise();
    const marks = block => ROWS.filter(row => row.block === block).map(row => expectedMark(s, e, row));
    for (const block of [11, 12]) expect(marks(block)).not.toContain('');
    const used = s.axles ? 13 : 14;
    expect(marks(used)).not.toContain('');
    for (const block of [13, 14, 15].filter(block => block !== used)) expect(marks(block).every(mark => mark === '')).toBe(true);
  }
});

test('every discrepancy a piece can present is caught on a DD 2133 row, circled once corrected', () => {
  for (const template of pieces) for (const [id] of possibleDiscrepancies(template).filter(([id]) => !id.startsWith('doc-'))) {
    const s = { ...template, ...applyDiscrepancies(template, () => .99, { [id]: true }) };
    const corrected = { ...createExercise(), answers: { [id]: { choice: 'unsatisfactory', corrected: true } } };
    const rows = ROWS.filter(row => expectedMark(s, corrected, row) === 'corrected').map(row => row.id);
    expect({ piece: template.id, id, rows: rows.length > 0 }).toEqual({ piece: template.id, id, rows: true });
    expect(ROWS.some(row => expectedMark(s, createExercise(), row) === 'unsat')).toBe(true);
  }
});

test('paperwork errors fixed through frustration are circled on the matching documentation row', () => {
  const hmmwv = scenarios.find(s => s.id === 'rolling-stock');
  const s = { ...hmmwv, docErrors: { logmodWeight: 100, hazdec: 'un', attla: true } };
  const e = { ...createExercise(), docFixes: { logmod: true, hazdec: true, attla: true } };
  expect(['11b', '11c', '11f'].map(id => expectedMark(s, e, ROWS.find(row => row.id === id)))).toEqual(['corrected', 'corrected', 'corrected']);
});

test('applicable rows need this JI\'s inspection first, and wrong marks are recorded as mistakes', () => {
  const s = scenarios.find(item => item.id === 'rolling-stock');
  let e = markJI(s, createExercise(), '13c', 'sat');
  expect(e.jiMarks['13c']).toBeUndefined();
  expect(e.jiMarkFeedback['13c']).toMatch(/Inspect first: Inspect Battery protection/);
  e = markJI(s, { ...e, jiInspected: ['battery'] }, '13c', 'sat');
  expect(e.jiMarks['13c']).toBe('sat');
  e = markJI(s, e, '14a', 'na');
  expect(e.mistakes.at(-1)).toMatchObject({ kind: 'ji', detail: expect.stringMatching(/14a .*should be left blank/) });
  e = markJI(s, e, '12g', 'na');
  expect(rowComplete(s, e, ROWS.find(row => row.id === '12g'))).toBe(true);
});

test('the correct column completes every row once the piece is reinspected', () => {
  for (const s of pieces) {
    const e = prepared(s);
    const filled = { ...e, jiMarks: correctMarks(s, e), jiMeasurements: [], jiSides: ['left', 'right'] };
    const open = ROWS.filter(row => !rowComplete(s, filled, row)).map(row => row.id);
    expect(open.every(id => ['12c', '12d'].includes(id))).toBe(true);
  }
});

test('the form marks a row and explains the expected entry', () => {
  const s = scenarios.find(item => item.id === 'isu-90');
  let e = { ...createExercise(), jiInspected: ['access'] };
  const onWorkflow = update => { e = update(e); };
  const { rerender } = render(<DD2133Form scenario={s} exercise={e} onWorkflow={onWorkflow} ready />);
  userEvent.selectOptions(screen.getByLabelText('DD 2133 13a Mechanical Condition (Engine Runs)'), '');
  userEvent.selectOptions(screen.getByLabelText('DD 2133 12f Keys/Combinations (All Locks)'), s.findings.find(f => f.id === 'access').correct === 'satisfactory' ? 'sat' : 'corrected');
  rerender(<DD2133Form scenario={s} exercise={e} onWorkflow={onWorkflow} ready />);
  expect(screen.getByLabelText('DD 2133 12f Keys/Combinations (All Locks)')).toHaveValue(e.jiMarks['12f']);
  expect(screen.getAllByText(/Block 13 does not apply to pallets and ISUs; leave it blank/)).toHaveLength(1);
});

test('the hint names only what this JI still has to look at', () => {
  const isu = scenarios.find(item => item.id === 'isu-90');
  const row = ROWS.find(item => item.id === '12h');
  let e = createExercise();
  expect(rowNeeds(isu, row, e)).toBe('Open the HAZDEC in the paperwork packet; inspect Marked chemical package inside the ISU (open the doors) in the cargo bay.');
  e = { ...e, jiDocumentsViewed: ['hazdec'] };
  expect(rowNeeds(isu, row, e)).toBe('Inspect Marked chemical package inside the ISU (open the doors) in the cargo bay.');
  e = { ...e, jiInspected: ['undeclared-hazmat'] };
  expect(rowReady(isu, e, row)).toBe(true);
  expect(rowNeeds(isu, row, e)).toBe('');
});
