import { act, fireEvent, render, screen } from '@testing-library/react';
import { ModeContext } from '../Session/mode';
import RegulationScope from './RegulationScope';
import RegulationLink from './RegulationLink';
const aid = <RegulationLink citationId="dtr3.appP.C.2">Rounding rule</RegulationLink>;
test.each(['guided','practice'])('%s allows contextual regulation help', mode => {
  render(<ModeContext.Provider value={mode}><RegulationScope>{aid}</RegulationScope></ModeContext.Provider>);
  expect(screen.getByRole('link', { name: 'Rounding rule' })).toBeInTheDocument();
});
test('active assessment overrides nested reference views and explicit local overrides', () => {
  render(<ModeContext.Provider value="test"><RegulationScope assessmentActive><RegulationScope view="reference" assessmentActive={false}>{aid}</RegulationScope></RegulationScope></ModeContext.Provider>);
  expect(screen.getByText('Rounding rule')).toBeInTheDocument();
  expect(screen.queryByRole('link')).not.toBeInTheDocument();
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
});
test('completed review can show sources without enabling contextual assessment hints', () => {
  render(<ModeContext.Provider value="test"><RegulationScope assessmentActive={false}>
    {aid}<RegulationScope view="review"><RegulationLink citationId="dtr3.appP.C.1">Review explanation</RegulationLink></RegulationScope>
  </RegulationScope></ModeContext.Provider>);
  expect(screen.queryByRole('link', { name: 'Rounding rule' })).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Review explanation' })).toBeInTheDocument();
});
test('mode changes cancel open and pending quotation aids', () => {
  jest.useFakeTimers();
  const view = mode => <ModeContext.Provider value={mode}><RegulationScope>{aid}</RegulationScope></ModeContext.Provider>;
  const { rerender } = render(view('practice'));
  fireEvent.mouseEnter(screen.getByRole('link', { name: 'Rounding rule' })); act(() => jest.advanceTimersByTime(3000));
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  rerender(view('test')); expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); expect(screen.queryByRole('link')).not.toBeInTheDocument();
  rerender(view('practice')); fireEvent.mouseEnter(screen.getByRole('link', { name: 'Rounding rule' }));
  rerender(view('test')); act(() => jest.advanceTimersByTime(5000)); expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  jest.useRealTimers();
});
