import React from 'react';
import { render, screen, within } from '@testing-library/react';
import explanations from './explanations.json';
import AnswerExplanation, { highlightTerms } from './AnswerExplanation';
import { dafi10403Bank } from './dafi10403Bank';
import { dafi24602v2Bank } from './dafi24602v2Bank';
import { dafi24602v1Bank } from './dafi24602v1Bank';
import { dafi24602v4Bank } from './dafi24602v4Bank';
import { dtrPart2Bank } from './dtrPart2Bank';
import { dtrPart3Bank } from './dtrPart3Bank';
import { dtrPart4Bank } from './dtrPart4Bank';
import { afh1Sets } from './afh1/afh1Bank';

const items = Object.fromEntries([
  ...[['dafi10403', dafi10403Bank], ['dafi24602v2', dafi24602v2Bank], ['dafi24602v1', dafi24602v1Bank], ['dafi24602v4', dafi24602v4Bank],
    ['dtrPart2', dtrPart2Bank], ['dtrPart3', dtrPart3Bank], ['dtrPart4', dtrPart4Bank]].flatMap(([setId, bank]) => bank.map(item => ({ ...item, setId }))),
  ...afh1Sets('e6').flatMap(set => set.bank),
].map(item => [item.id, item]));

test('every written explanation belongs to a real question and covers each wrong choice', () => {
  Object.entries(explanations).forEach(([id, note]) => {
    const item = items[id];
    expect(item).toBeDefined();
    expect(note.why.length).toBeGreaterThan(20);
    expect(Object.keys(note.wrong).sort()).toEqual([...item.wrong].sort());
    Object.values(note.wrong).forEach(reason => expect(reason.length).toBeGreaterThan(10));
  });
});

test('the highlight terms come from the answer itself', () => {
  expect(highlightTerms('18 months')).toEqual(expect.arrayContaining(['18', 'months']));
  expect(highlightTerms('It is not')).toEqual([]);
});

test('the panel shows why the answer is right, why each other choice is wrong, the passage, and the watch-out', async () => {
  const id = Object.keys(explanations).find(key => explanations[key].watch && key.startsWith('1.15.1.4.1'));
  const item = items[id];
  render(<AnswerExplanation item={item} publication="DAFI 10-403" picked="12 months" open />);
  const panel = screen.getByRole('group');
  expect(within(panel).getByText(`Why “${item.answer}” is correct`)).toBeInTheDocument();
  expect(await within(panel).findByText(/says the appointed IDO fills the position/)).toBeInTheDocument();
  expect(within(panel).getByText('Why the other choices are wrong')).toBeInTheDocument();
  item.wrong.forEach(choice => expect(within(panel).getByText(choice)).toBeInTheDocument());
  expect(within(panel).getByText('(your answer)')).toBeInTheDocument();
  expect(await within(panel).findByText(/fill this position for a period of not less than/)).toBeInTheDocument();
  expect(within(panel).getAllByText('18 months', { selector: 'mark' }).length).toBeGreaterThan(0);
  expect(within(panel).getByText('Watch out')).toBeInTheDocument();
});

test('a question without a written explanation still gets the governing passage', async () => {
  const item = dtrPart4Bank.map(entry => ({ ...entry, setId: 'dtrPart4' })).find(entry => !explanations[entry.id]);
  render(<AnswerExplanation item={item} publication="DTR Part IV" open />);
  expect(await screen.findByText(/states it directly/)).toBeInTheDocument();
  expect(screen.queryByText('Why the other choices are wrong')).not.toBeInTheDocument();
  expect(screen.getByText(/^Governing passage/)).toBeInTheDocument();
});

test('a question citing a table shows the table, with its rows, columns, and footnotes', async () => {
  const item = dtrPart2Bank.map(entry => ({ ...entry, setId: 'dtrPart2' })).find(entry => entry.ref === 'Ch 205, Table 205-1' && entry.answer === '2 hours');
  render(<AnswerExplanation item={item} publication="DTR Part II" open />);
  const table = await screen.findByRole('table');
  expect(within(table).getByRole('columnheader', { name: 'Mitigating Measures' })).toBeInTheDocument();
  expect(within(table).getAllByRole('row').length).toBeGreaterThan(20);
  // The answer is in footnote 5, which is shown under the table with the answer marked.
  expect(screen.getByText(/shall be limited to/)).toBeInTheDocument();
  expect(screen.getAllByText('2 hours', { selector: 'mark' }).length).toBeGreaterThan(0);
});

test('every table citation in the question banks has a rebuilt table', async () => {
  const { findTable, loadTables } = require('./RegulationPassage');
  const data = await loadTables();
  const cited = Object.values(items).filter(item => /\bTable\s/.test(item.ref));
  expect(cited.length).toBeGreaterThan(50);
  cited.forEach(item => expect([item.ref, findTable(data, item)?.title]).toEqual([item.ref, expect.stringContaining('Table')]));
  Object.values(data).forEach(table => table.rows.forEach(row => expect(row.length).toBeGreaterThan(0)));
});
