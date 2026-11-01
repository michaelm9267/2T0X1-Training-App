import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuestionReport, ReportReview, WapsProgressContext } from './QuestionReport';

test('a report preserves question identity, source and reason for review', () => {
  let saved;
  const q = {id: 'q1', setId: 'book', ref: '2.1', question: 'What?', answer: 'A', wrong: ['B', 'C', 'D']};
  render(<WapsProgressContext.Provider value={{progress: {reports: []}, save: p => {saved = p;}}}><QuestionReport item={q}/></WapsProgressContext.Provider>);
  userEvent.click(screen.getByRole('button', {name: 'Report this question'}));
  userEvent.type(screen.getByLabelText('What needs fixing?'), 'Two answers appear true.');
  userEvent.click(screen.getByRole('button', {name: 'Save report'}));
  expect(saved.reports[0]).toMatchObject({questionId: 'q1', setId: 'book', ref: '2.1', reason: 'Two answers appear true.', status: 'open'});
  expect(screen.getByRole('status')).toHaveTextContent('Report saved');
});
test('saved reports are visible and can be resolved without losing their details', () => {
  let saved;
  const progress = {reports: [{id: 'r1', questionId: 'q1', question: 'What?', reason: 'Citation wrong', status: 'open', at: 1}]};
  render(<WapsProgressContext.Provider value={{progress, save: p => {saved = p;}}}><ReportReview/></WapsProgressContext.Provider>);
  expect(screen.getByText('Citation wrong')).toBeInTheDocument();
  userEvent.click(screen.getByRole('button', {name: 'Mark resolved'}));
  expect(saved.reports[0]).toMatchObject({status: 'resolved', reason: 'Citation wrong'});
});
