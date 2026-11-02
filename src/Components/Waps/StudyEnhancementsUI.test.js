import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WapsStudyTool from './WapsStudyTool';
beforeEach(() => localStorage.clear());

// The publication (or PDG chapter) and section pickers are dropdowns.
function pick(label, option) {
  const select = screen.getByRole('combobox', { name: label });
  userEvent.selectOptions(select, within(select).getByRole('option', { name: option }));
}
function open() {render(<WapsStudyTool/>); userEvent.click(screen.getByRole('button', {name: /SSgt \/ E-5/})); userEvent.click(screen.getByRole('button', { name: /SSgt SKT/ }));}
test('numeric recall accepts a typed value and records its result', () => {
  open(); userEvent.click(screen.getByRole('tab', {name: 'Number recall'}));
  userEvent.click(screen.getByRole('button', {name: 'Start drill'}));
  expect(screen.queryByRole('group', {name: 'Answer choices'})).not.toBeInTheDocument();
  userEvent.type(screen.getByLabelText(/Your number/), '999999');
  userEvent.click(screen.getByRole('button', {name: 'Check answer'}));
  expect(screen.getByRole('status')).toHaveTextContent('Incorrect');
  expect(Object.keys(JSON.parse(localStorage.getItem('waps-progress-e5')).cards)).toHaveLength(1);
});
test('exam setup saves explicit publication weights and blocks invalid capacity', () => {
  open(); pick('Publication', /All regulations/);
  userEvent.click(screen.getByRole('tab', {name: 'Full exam'}));
  const panel = screen.getByRole('region', {name: 'Full exam'});
  expect(within(panel).getByText(/not an official SKT blueprint/i)).toBeInTheDocument();
  const weights = within(panel).getAllByRole('spinbutton');
  weights.forEach(input => {userEvent.clear(input); userEvent.type(input, '0');});
  userEvent.click(within(panel).getByRole('button', {name: 'Start exam'}));
  expect(within(panel).getByRole('alert')).toHaveTextContent(/weight/i);
});
test('weak spots explain when more scored answers are needed', () => {
  open(); userEvent.click(screen.getByRole('tab', {name: 'Weak spots'}));
  expect(screen.getByText(/Answer some practice questions first/)).toBeInTheDocument();
});
test('scenario drill combines season, weight and distance with source explanations', () => {
  open(); pick('Publication', /All regulations/);
  userEvent.click(screen.getByRole('tab', {name: 'Scenarios'}));
  userEvent.click(screen.getByRole('button', {name: 'Start drill'}));
  const choices = screen.getByRole('group', {name: 'Answer choices'});
  userEvent.click(within(choices).getAllByRole('button')[0]);
  expect(screen.getByRole('status')).toHaveTextContent(/(Correct|Incorrect)/);
  expect(screen.getByText(/greater than 800 miles/)).toBeInTheDocument();
});
test('custom exam count and time are configurable and persist with the blueprint', () => {
  open(); pick('Publication', /All regulations/); userEvent.click(screen.getByRole('tab', {name:'Full exam'}));
  userEvent.selectOptions(screen.getByLabelText('Questions'), 'custom');
  userEvent.clear(screen.getByLabelText('Custom question count')); userEvent.type(screen.getByLabelText('Custom question count'), '37');
  userEvent.selectOptions(screen.getByLabelText('Time limit'), 'custom');
  userEvent.clear(screen.getByLabelText('Custom time limit (minutes)')); userEvent.type(screen.getByLabelText('Custom time limit (minutes)'), '45');
  userEvent.click(screen.getByRole('button', {name:'Start exam'}));
  expect(screen.getByText(/Question 1 of 37/)).toBeInTheDocument();
  expect(screen.getByRole('timer')).toHaveTextContent('45:00');
  expect(JSON.parse(localStorage.getItem('waps-progress-e5')).examSettings).toMatchObject({length:37, minutes:45});
});
