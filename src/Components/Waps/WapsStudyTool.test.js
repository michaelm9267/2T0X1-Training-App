import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../App';

beforeEach(() => { window.localStorage.clear(); });

// The publication (or PDG chapter) and section pickers are dropdowns.
function pick(label, option) {
  const select = screen.getByRole('combobox', { name: label });
  userEvent.selectOptions(select, within(select).getByRole('option', { name: option }));
}

function openWaps() {
  render(<App />);
  userEvent.click(screen.getByRole('tab', { name: '2T0 WAPS Study Tool' }));
}

test('the WAPS tab lets the trainee pick SSgt/E-5 or TSgt/E-6 and change it', () => {
  openWaps();
  expect(screen.getByRole('heading', { name: 'What are you studying for?' })).toBeInTheDocument();
  userEvent.click(screen.getByRole('button', { name: /TSgt \/ E-6/ }));
  expect(screen.getByRole('heading', { name: 'Which test are you studying for?' })).toBeInTheDocument();
  userEvent.click(screen.getByRole('button', { name: /TSgt PDG/ }));
  expect(screen.getByRole('heading', { name: 'Studying for TSgt / E-6 · PDG' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /Chapter 1, Professionalism/ })).toBeInTheDocument();
  userEvent.click(screen.getByRole('button', { name: 'Change rank' }));
  userEvent.click(screen.getByRole('button', { name: /SSgt \/ E-5/ })); userEvent.click(screen.getByRole('button', { name: /SSgt SKT/ }));
  expect(screen.getByRole('heading', { name: 'Studying for SSgt / E-5 · SKT' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /DAFI 10-403/ })).toBeInTheDocument();
});

test('TSgt SKT studies the TSgt chapter list, which differs from SSgt', () => {
  openWaps();
  userEvent.click(screen.getByRole('button', { name: /TSgt \/ E-6/ })); userEvent.click(screen.getByRole('button', { name: /TSgt SKT/ }));
  expect(screen.getByRole('heading', { name: 'Studying for TSgt / E-6 · SKT' })).toBeInTheDocument();
  expect(screen.getByText(/Chapters 1, 2, and 3 ·/)).toBeInTheDocument();
  expect(screen.getByRole('option', { name: /^Chapter 2\b/ })).toBeInTheDocument();
  expect(screen.queryByRole('option', { name: /^Attachment 3\b/ })).not.toBeInTheDocument();
  pick('Publication', /DTR Part IV/);
  expect(screen.getByRole('option', { name: /^Appendix A-M\b/ })).toBeInTheDocument();
  expect(screen.queryByRole('option', { name: /^Appendix A-B\b/ })).not.toBeInTheDocument();
  // SSgt still sees its own list.
  userEvent.click(screen.getByRole('button', { name: 'Change rank' }));
  userEvent.click(screen.getByRole('button', { name: /SSgt \/ E-5/ })); userEvent.click(screen.getByRole('button', { name: /SSgt SKT/ }));
  expect(screen.queryByRole('option', { name: /^Chapter 2\b/ })).not.toBeInTheDocument();
});

test('E-5 flashcards flip, record the rating, and save progress', () => {
  openWaps();
  userEvent.click(screen.getByRole('button', { name: /SSgt \/ E-5/ })); userEvent.click(screen.getByRole('button', { name: /SSgt SKT/ }));
  const cards = screen.getByRole('region', { name: 'Flashcards' });
  expect(within(cards).getByText(/Card 1 of 10/)).toBeInTheDocument();
  userEvent.click(within(cards).getByRole('button', { name: 'Show answer' }));
  expect(within(cards).getByText('AFI 38-101, Manpower and Organization')).toBeInTheDocument();
  userEvent.click(within(cards).getByRole('button', { name: 'Missed it' }));
  expect(within(cards).getByText(/Card 2 of 11/)).toBeInTheDocument();
  expect(Object.keys(JSON.parse(window.localStorage.getItem('waps-progress-e5')).cards)).toHaveLength(1);
});

test('flashcards step back and forth, and the citation shows only with the answer', () => {
  openWaps();
  userEvent.click(screen.getByRole('button', { name: /SSgt \/ E-5/ })); userEvent.click(screen.getByRole('button', { name: /SSgt SKT/ }));
  const cards = screen.getByRole('region', { name: 'Flashcards' });
  const cites = () => within(cards).queryAllByRole('button', { name: /^DAFI 10-403, / });
  expect(within(cards).getByRole('button', { name: 'Previous card' })).toBeDisabled();
  expect(cites()).toHaveLength(0);
  for (let i = 0; i < 3; i += 1) {
    userEvent.click(within(cards).getByRole('button', { name: 'Show answer' }));
    // Exactly one citation, inside the answer: earlier cards' citations do not pile up.
    expect(cites()).toHaveLength(1);
    expect(within(within(cards).getByRole('status')).getByRole('button', { name: /^DAFI 10-403, / })).toBeInTheDocument();
    userEvent.click(within(cards).getByRole('button', { name: 'Got it' }));
  }
  userEvent.click(within(cards).getByRole('button', { name: 'Next card' }));
  expect(within(cards).getByText(/Card 5 of/)).toBeInTheDocument();
  for (let i = 0; i < 4; i += 1) userEvent.click(within(cards).getByRole('button', { name: 'Previous card' }));
  expect(within(cards).getByText(/Card 1 of/)).toBeInTheDocument();
  expect(within(cards).getByRole('button', { name: 'Previous card' })).toBeDisabled();
});

test('search finds questions on every screen and steps through the matches', () => {
  openWaps();
  userEvent.click(screen.getByRole('button', { name: /SSgt \/ E-5/ })); userEvent.click(screen.getByRole('button', { name: /SSgt SKT/ }));
  const search = screen.getByRole('region', { name: 'Search questions' });
  userEvent.type(within(search).getByRole('searchbox', { name: 'Search questions' }), 'IDO');
  expect(within(search).getByText(/^Match 1 of \d+$/)).toBeInTheDocument();
  expect(within(search).getByText(/\bIDO\b/)).toBeInTheDocument();
  userEvent.click(within(search).getByRole('button', { name: 'Next match' }));
  expect(within(search).getByText(/^Match 2 of/)).toBeInTheDocument();
  userEvent.click(within(search).getByRole('button', { name: 'Previous match' }));
  expect(within(search).getByText(/^Match 1 of/)).toBeInTheDocument();
  userEvent.click(within(search).getByRole('button', { name: 'Show search answer' }));
  expect(within(search).getByText('Answer')).toBeInTheDocument();
  userEvent.click(screen.getByRole('tab', { name: 'Practice test' }));
  expect(screen.getByRole('region', { name: 'Search questions' })).toBeInTheDocument();
  userEvent.click(screen.getByRole('tab', { name: 'Progress' }));
  expect(screen.getByRole('region', { name: 'Search questions' })).toBeInTheDocument();
});

test('the practice test goes back to answered questions and forward again', () => {
  openWaps();
  userEvent.click(screen.getByRole('button', { name: /SSgt \/ E-5/ })); userEvent.click(screen.getByRole('button', { name: /SSgt SKT/ }));
  userEvent.click(screen.getByRole('tab', { name: 'Practice test' }));
  const panel = screen.getByRole('region', { name: 'Practice test' });
  userEvent.selectOptions(within(panel).getByRole('combobox', { name: 'Questions' }), '10');
  userEvent.click(within(panel).getByRole('button', { name: 'Start test' }));
  userEvent.click(within(within(panel).getByRole('group', { name: 'Answer choices' })).getAllByRole('button')[0]);
  userEvent.click(within(panel).getByRole('button', { name: 'Next question' }));
  expect(within(panel).getByText('Question 2 of 10')).toBeInTheDocument();
  userEvent.click(within(panel).getByRole('button', { name: 'Previous question' }));
  expect(within(panel).getByText('Question 1 of 10')).toBeInTheDocument();
  // The earlier answer is kept and locked, with its feedback.
  expect(within(panel).getByText(/^(Correct\.|Incorrect\.)/)).toBeInTheDocument();
  within(within(panel).getByRole('group', { name: 'Answer choices' })).getAllByRole('button').forEach(button => expect(button).toBeDisabled());
  userEvent.click(within(panel).getByRole('button', { name: 'Next question' }));
  expect(within(panel).getByText('Question 2 of 10')).toBeInTheDocument();
});

test('E-5 practice test gives feedback and a score', () => {
  openWaps();
  userEvent.click(screen.getByRole('button', { name: /SSgt \/ E-5/ })); userEvent.click(screen.getByRole('button', { name: /SSgt SKT/ }));
  pick('Section', /^Chapter 3\b/);
  userEvent.click(screen.getByRole('tab', { name: 'Practice test' }));
  const panel = screen.getByRole('region', { name: 'Practice test' });
  userEvent.selectOptions(within(panel).getByRole('combobox', { name: 'Questions' }), '10');
  userEvent.click(within(panel).getByRole('button', { name: 'Start test' }));
  for (let i = 0; i < 10; i += 1) {
    userEvent.click(within(within(panel).getByRole('group', { name: 'Answer choices' })).getAllByRole('button')[0]);
    expect(within(panel).getByText(/^(Correct\.|Incorrect\.)/)).toBeInTheDocument();
    userEvent.click(within(panel).getByRole('button', { name: i === 9 ? 'See results' : 'Next question' }));
  }
  expect(within(panel).getByRole('heading', { name: /Score: \d+%/ })).toBeInTheDocument();
  userEvent.click(screen.getByRole('tab', { name: 'Progress' }));
  expect(screen.getByText(/Chapter 3 · \d+\/10/)).toBeInTheDocument();
});

test('E-5 can switch to DAFI 24-602V2, and progress and reset stay per publication', () => {
  openWaps();
  userEvent.click(screen.getByRole('button', { name: /SSgt \/ E-5/ })); userEvent.click(screen.getByRole('button', { name: /SSgt SKT/ }));
  const cards = () => screen.getByRole('region', { name: 'Flashcards' });
  userEvent.click(within(cards()).getByRole('button', { name: 'Show answer' }));
  userEvent.click(within(cards()).getByRole('button', { name: 'Got it' }));

  pick('Publication', /DAFI 24-602V2/);
  expect(screen.getByRole('heading', { name: /DAFI 24-602V2, Cargo Movement/ })).toBeInTheDocument();
  expect(screen.getByRole('option', { name: /^Attachment 9\b/ })).toBeInTheDocument();
  userEvent.click(within(cards()).getByRole('button', { name: 'Show answer' }));
  expect(within(cards()).getByText('CMOS')).toBeInTheDocument();
  userEvent.click(within(cards()).getByRole('button', { name: 'Missed it' }));
  expect(Object.keys(JSON.parse(window.localStorage.getItem('waps-progress-e5')).cards)).toHaveLength(2);

  jest.spyOn(window, 'confirm').mockReturnValue(true);
  userEvent.click(screen.getByRole('tab', { name: 'Progress' }));
  userEvent.click(screen.getByRole('button', { name: 'Reset progress' }));
  const cardsLeft = Object.keys(JSON.parse(window.localStorage.getItem('waps-progress-e5')).cards);
  expect(cardsLeft).toHaveLength(1);
  expect(cardsLeft[0]).not.toMatch(/^24-602V2/);
  window.confirm.mockRestore();
});

test('E-5 also offers DAFI 24-602V1 with its own sections', () => {
  openWaps();
  userEvent.click(screen.getByRole('button', { name: /SSgt \/ E-5/ })); userEvent.click(screen.getByRole('button', { name: /SSgt SKT/ }));
  pick('Publication', /DAFI 24-602V1/);
  expect(screen.getByRole('heading', { name: /DAFI 24-602V1, Passenger Movement/ })).toBeInTheDocument();
  expect(screen.getByRole('option', { name: /^Chapter 7\b/ })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Chapter 4' })).not.toBeInTheDocument();
  userEvent.click(within(screen.getByRole('region', { name: 'Flashcards' })).getByRole('button', { name: 'Show answer' }));
  expect(screen.getByText('Self-approval is prohibited')).toBeInTheDocument();
});

test('E-5 also offers DAFI 24-602V4 with the chapters in the excerpt', () => {
  openWaps();
  userEvent.click(screen.getByRole('button', { name: /SSgt \/ E-5/ })); userEvent.click(screen.getByRole('button', { name: /SSgt SKT/ }));
  pick('Publication', /DAFI 24-602V4/);
  expect(screen.getByRole('heading', { name: /DAFI 24-602V4, Personal Property Moving and Storage/ })).toBeInTheDocument();
  expect(screen.getByRole('option', { name: /^Attachment 4\b/ })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Chapter 14' })).not.toBeInTheDocument();
  userEvent.click(within(screen.getByRole('region', { name: 'Flashcards' })).getByRole('button', { name: 'Show answer' }));
  expect(screen.getByText('It is prohibited')).toBeInTheDocument();
});

test('E-5 also offers DTR Part II Chapters 202, 205, and 210', () => {
  openWaps();
  userEvent.click(screen.getByRole('button', { name: /SSgt \/ E-5/ })); userEvent.click(screen.getByRole('button', { name: /SSgt SKT/ }));
  pick('Publication', /DTR Part II(?!I)/);
  expect(screen.getByRole('heading', { name: /DTR Part II, Cargo Movement/ })).toBeInTheDocument();
  expect(screen.getByRole('option', { name: /^Chapter 210\b/ })).toBeInTheDocument();
  userEvent.click(within(screen.getByRole('region', { name: 'Flashcards' })).getByRole('button', { name: 'Show answer' }));
  expect(screen.getByText('TOs, or their authorized shipper agents appointed by official letter')).toBeInTheDocument();
});

test('E-5 also offers DTR Part III Chapter 303 and Appendix P', () => {
  openWaps();
  userEvent.click(screen.getByRole('button', { name: /SSgt \/ E-5/ })); userEvent.click(screen.getByRole('button', { name: /SSgt SKT/ }));
  pick('Publication', /DTR Part III/);
  expect(screen.getByRole('heading', { name: /DTR Part III, Mobility/ })).toBeInTheDocument();
  expect(screen.getByRole('option', { name: /^Appendix P\b/ })).toBeInTheDocument();
  userEvent.click(within(screen.getByRole('region', { name: 'Flashcards' })).getByRole('button', { name: 'Show answer' }));
  expect(screen.getByText('Planning; predeployment activities; movement; and JRSOI')).toBeInTheDocument();
});

test('E-5 also offers DTR Part IV Chapters A-402, A-411 and Appendix A-B', () => {
  openWaps();
  userEvent.click(screen.getByRole('button', { name: /SSgt \/ E-5/ })); userEvent.click(screen.getByRole('button', { name: /SSgt SKT/ }));
  pick('Publication', /DTR Part IV/);
  expect(screen.getByRole('heading', { name: /DTR Part IV, Personal Property/ })).toBeInTheDocument();
  expect(screen.getByRole('option', { name: /^Appendix A-B\b/ })).toBeInTheDocument();
  userEvent.click(within(screen.getByRole('region', { name: 'Flashcards' })).getByRole('button', { name: 'Show answer' }));
  expect(screen.getByText('eTOPS')).toBeInTheDocument();
});

test('All regulations mixes every publication in flashcards and practice tests', () => {
  openWaps();
  userEvent.click(screen.getByRole('button', { name: /SSgt \/ E-5/ })); userEvent.click(screen.getByRole('button', { name: /SSgt SKT/ }));
  pick('Publication', /All regulations/);
  expect(screen.getByRole('heading', { name: /All regulations, Mixed review and full exam/ })).toBeInTheDocument();
  expect(within(screen.getByRole('combobox', { name: 'Section' })).getByRole('option', { name: /^DTR Part IV\b/ })).toBeInTheDocument();
  const cards = screen.getByRole('region', { name: 'Flashcards' });
  // New cards alternate publications: the first card is DAFI 10-403's, the second DAFI 24-602V2's.
  userEvent.click(within(cards).getByRole('button', { name: 'Show answer' }));
  expect(within(cards).getByRole('button', { name: /^DAFI 10-403,/ })).toBeInTheDocument();
  userEvent.click(within(cards).getByRole('button', { name: 'Got it' }));
  userEvent.click(within(cards).getByRole('button', { name: 'Show answer' }));
  expect(within(cards).getByRole('button', { name: /^DAFI 24-602V2,/ })).toBeInTheDocument();
  userEvent.click(screen.getByRole('tab', { name: 'Practice test' }));
  expect(within(screen.getByRole('region', { name: 'Practice test' })).getByRole('button', { name: 'Start test' })).toBeInTheDocument();
});

test('the full exam holds feedback until submit, then scores by publication and is saved', () => {
  openWaps();
  userEvent.click(screen.getByRole('button', { name: /SSgt \/ E-5/ })); userEvent.click(screen.getByRole('button', { name: /SSgt SKT/ }));
  pick('Publication', /All regulations/);
  userEvent.click(screen.getByRole('tab', { name: 'Full exam' }));
  const exam = () => screen.getByRole('region', { name: 'Full exam' });
  userEvent.selectOptions(within(exam()).getByLabelText('Questions'), '25');
  userEvent.click(within(exam()).getByRole('button', { name: 'Start exam' }));
  expect(within(exam()).getByText(/Question 1 of 25 · 0 answered/)).toBeInTheDocument();
  expect(within(exam()).getByRole('timer')).toHaveTextContent('2:00:00 left');

  const choices = within(within(exam()).getByRole('group', { name: 'Answer choices' })).getAllByRole('button');
  userEvent.click(choices[0]);
  userEvent.click(choices[1]); // answers can be changed
  expect(choices[1]).toHaveAttribute('aria-pressed', 'true');
  expect(choices[0]).toHaveAttribute('aria-pressed', 'false');
  expect(within(exam()).queryByText(/Correct\.|Incorrect/)).not.toBeInTheDocument();
  userEvent.click(within(exam()).getByRole('button', { name: 'Flag for review' }));
  expect(within(exam()).getByRole('button', { name: 'Question 1, answered, flagged' })).toBeInTheDocument();
  expect(JSON.parse(window.localStorage.getItem('waps-exam-e5')).items).toHaveLength(25);

  const confirm = jest.spyOn(window, 'confirm').mockReturnValue(true);
  userEvent.click(within(exam()).getByRole('button', { name: 'Submit exam' }));
  expect(confirm).toHaveBeenCalledWith(expect.stringMatching(/24 unanswered questions\. 1 flagged\./));
  confirm.mockRestore();
  expect(within(exam()).getByRole('heading', { name: /Exam score: \d+%/ })).toBeInTheDocument();
  expect(within(exam()).getByText(/of 25 correct, (24|25) left blank/)).toBeInTheDocument();
  expect(within(exam()).getByRole('heading', { name: 'By publication' })).toBeInTheDocument();
  expect(window.localStorage.getItem('waps-exam-e5')).toBeNull();
  const saved = JSON.parse(window.localStorage.getItem('waps-progress-e5'));
  expect(Object.keys(saved.cards)).toHaveLength(25);
  expect(saved.tests[0]).toMatchObject({ kind: 'exam', publication: 'all', total: 25 });
});

test('hovering a citation after answering shows the regulation\'s exact wording', async () => {
  openWaps();
  userEvent.click(screen.getByRole('button', { name: /SSgt \/ E-5/ })); userEvent.click(screen.getByRole('button', { name: /SSgt SKT/ }));
  const cards = screen.getByRole('region', { name: 'Flashcards' });
  // Before the card is flipped the citation is plain text, so it cannot give the answer away.
  expect(within(cards).queryByRole('button', { name: /^DAFI 10-403, para/ })).not.toBeInTheDocument();
  userEvent.click(within(cards).getByRole('button', { name: 'Show answer' }));
  const cite = within(cards).getByRole('button', { name: /^DAFI 10-403, para/ });
  userEvent.hover(cite);
  const popup = await screen.findByRole('tooltip');
  expect(await within(popup).findByText(/AFI 38-101, Manpower and Organization/)).toBeInTheDocument();
  expect(within(popup).getByText(/17 December 2025 · PDF page \d+/)).toBeInTheDocument();
  userEvent.keyboard('{Escape}');
  expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
});

test('TSgt PDG uses the TSgt ADTC levels and adds the questions written for them', () => {
  openWaps();
  userEvent.click(screen.getByRole('button', { name: /TSgt \/ E-6/ }));
  userEvent.click(screen.getByRole('button', { name: /TSgt PDG/ }));
  pick('Chapter', /^Chapter 8 /);
  // Section 8A is level B for SSgt and level C for TSgt.
  pick('Section', /^8A/);
  expect(screen.getByText('TSgt level for Section 8A: C (Applying)')).toBeInTheDocument();
});

test('SSgt PDG studies AFH 1 by chapter with the ADTC comprehension level for each section', () => {
  openWaps();
  userEvent.click(screen.getByRole('button', { name: /SSgt \/ E-5/ }));
  userEvent.click(screen.getByRole('button', { name: /SSgt PDG/ }));
  expect(screen.getByRole('heading', { name: 'Studying for SSgt / E-5 · PDG' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /Chapter 1, Professionalism/ })).toBeInTheDocument();
  // Section 1C (Core Values) is level C for SSgt; the others in Chapter 1 are level B.
  pick('Section', /^1C/);
  expect(screen.getByText('SSgt level for Section 1C: C (Applying)')).toBeInTheDocument();
  userEvent.click(within(screen.getByRole('region', { name: 'Flashcards' })).getByRole('button', { name: 'Show answer' }));
  expect(within(screen.getByRole('region', { name: 'Flashcards' })).getByRole('button', { name: /^AFH 1, para 1\.3/ })).toBeInTheDocument();
  pick('Chapter', /^Chapter 9 /);
  expect(screen.getByRole('heading', { name: /Chapter 9, / })).toBeInTheDocument();
  // SKT and PDG keep separate places in the rank: switching tests returns to the SKT publications.
  userEvent.click(screen.getByRole('button', { name: 'Change test' }));
  userEvent.click(screen.getByRole('button', { name: /SSgt SKT/ }));
  expect(screen.getByRole('heading', { name: /DAFI 10-403/ })).toBeInTheDocument();
});
