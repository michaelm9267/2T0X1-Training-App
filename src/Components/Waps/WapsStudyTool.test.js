import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../App';

beforeEach(() => { window.localStorage.clear(); });

function openWaps() {
  render(<App />);
  userEvent.click(screen.getByRole('tab', { name: '2T0 WAPS Study Tool' }));
}

test('the WAPS tab lets the trainee pick SSgt/E-5 or TSgt/E-6 and change it', () => {
  openWaps();
  expect(screen.getByRole('heading', { name: 'What are you studying for?' })).toBeInTheDocument();
  userEvent.click(screen.getByRole('button', { name: /TSgt \/ E-6/ }));
  expect(screen.getByRole('heading', { name: 'Studying for TSgt / E-6' })).toBeInTheDocument();
  expect(screen.getByText('Study material for this rank is coming soon.')).toBeInTheDocument();
  userEvent.click(screen.getByRole('button', { name: 'Change rank' }));
  userEvent.click(screen.getByRole('button', { name: /SSgt \/ E-5/ }));
  expect(screen.getByRole('heading', { name: 'Studying for SSgt / E-5' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /DAFI 10-403/ })).toBeInTheDocument();
});

test('E-5 flashcards flip, record the rating, and save progress', () => {
  openWaps();
  userEvent.click(screen.getByRole('button', { name: /SSgt \/ E-5/ }));
  const cards = screen.getByRole('region', { name: 'Flashcards' });
  expect(within(cards).getByText(/Card 1 of 10/)).toBeInTheDocument();
  userEvent.click(within(cards).getByRole('button', { name: 'Show answer' }));
  expect(within(cards).getByText('AFI 38-101, Manpower and Organization')).toBeInTheDocument();
  userEvent.click(within(cards).getByRole('button', { name: 'Missed it' }));
  expect(within(cards).getByText(/Card 2 of 11/)).toBeInTheDocument();
  expect(Object.keys(JSON.parse(window.localStorage.getItem('waps-progress-e5')).cards)).toHaveLength(1);
});

test('E-5 practice test gives feedback and a score', () => {
  openWaps();
  userEvent.click(screen.getByRole('button', { name: /SSgt \/ E-5/ }));
  userEvent.click(screen.getByRole('button', { name: 'Chapter 3' }));
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
  userEvent.click(screen.getByRole('button', { name: /SSgt \/ E-5/ }));
  const cards = () => screen.getByRole('region', { name: 'Flashcards' });
  userEvent.click(within(cards()).getByRole('button', { name: 'Show answer' }));
  userEvent.click(within(cards()).getByRole('button', { name: 'Got it' }));

  userEvent.click(screen.getByRole('tab', { name: /DAFI 24-602V2/ }));
  expect(screen.getByRole('heading', { name: /DAFI 24-602V2, Cargo Movement/ })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Attachment 9' })).toBeInTheDocument();
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
  userEvent.click(screen.getByRole('button', { name: /SSgt \/ E-5/ }));
  userEvent.click(screen.getByRole('tab', { name: /DAFI 24-602V1/ }));
  expect(screen.getByRole('heading', { name: /DAFI 24-602V1, Passenger Movement/ })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Chapter 7' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Chapter 4' })).not.toBeInTheDocument();
  userEvent.click(within(screen.getByRole('region', { name: 'Flashcards' })).getByRole('button', { name: 'Show answer' }));
  expect(screen.getByText('Self-approval is prohibited')).toBeInTheDocument();
});

test('E-5 also offers DAFI 24-602V4 with the chapters in the excerpt', () => {
  openWaps();
  userEvent.click(screen.getByRole('button', { name: /SSgt \/ E-5/ }));
  userEvent.click(screen.getByRole('tab', { name: /DAFI 24-602V4/ }));
  expect(screen.getByRole('heading', { name: /DAFI 24-602V4, Personal Property Moving and Storage/ })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Attachment 4' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Chapter 14' })).not.toBeInTheDocument();
  userEvent.click(within(screen.getByRole('region', { name: 'Flashcards' })).getByRole('button', { name: 'Show answer' }));
  expect(screen.getByText('It is prohibited')).toBeInTheDocument();
});

test('E-5 also offers DTR Part II Chapters 202, 205, and 210', () => {
  openWaps();
  userEvent.click(screen.getByRole('button', { name: /SSgt \/ E-5/ }));
  userEvent.click(screen.getByRole('tab', { name: /DTR Part II(?!I)/ }));
  expect(screen.getByRole('heading', { name: /DTR Part II, Cargo Movement/ })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Chapter 210' })).toBeInTheDocument();
  userEvent.click(within(screen.getByRole('region', { name: 'Flashcards' })).getByRole('button', { name: 'Show answer' }));
  expect(screen.getByText('TOs, or their authorized shipper agents appointed by official letter')).toBeInTheDocument();
});

test('E-5 also offers DTR Part III Chapter 303 and Appendix P', () => {
  openWaps();
  userEvent.click(screen.getByRole('button', { name: /SSgt \/ E-5/ }));
  userEvent.click(screen.getByRole('tab', { name: /DTR Part III/ }));
  expect(screen.getByRole('heading', { name: /DTR Part III, Mobility/ })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Appendix P' })).toBeInTheDocument();
  userEvent.click(within(screen.getByRole('region', { name: 'Flashcards' })).getByRole('button', { name: 'Show answer' }));
  expect(screen.getByText('Planning; predeployment activities; movement; and JRSOI')).toBeInTheDocument();
});

test('E-5 also offers DTR Part IV Chapters A-402, A-411 and Appendix A-B', () => {
  openWaps();
  userEvent.click(screen.getByRole('button', { name: /SSgt \/ E-5/ }));
  userEvent.click(screen.getByRole('tab', { name: /DTR Part IV/ }));
  expect(screen.getByRole('heading', { name: /DTR Part IV, Personal Property/ })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Appendix A-B' })).toBeInTheDocument();
  userEvent.click(within(screen.getByRole('region', { name: 'Flashcards' })).getByRole('button', { name: 'Show answer' }));
  expect(screen.getByText('eTOPS')).toBeInTheDocument();
});

test('All regulations mixes every publication in flashcards and practice tests', () => {
  openWaps();
  userEvent.click(screen.getByRole('button', { name: /SSgt \/ E-5/ }));
  userEvent.click(screen.getByRole('tab', { name: /All regulations/ }));
  expect(screen.getByRole('heading', { name: /All regulations, Mixed review and full exam/ })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'DTR Part IV' })).toBeInTheDocument();
  const cards = screen.getByRole('region', { name: 'Flashcards' });
  // New cards alternate publications: the first card is DAFI 10-403's, the second DAFI 24-602V2's.
  expect(within(cards).getByText(/^DAFI 10-403,/)).toBeInTheDocument();
  userEvent.click(within(cards).getByRole('button', { name: 'Show answer' }));
  userEvent.click(within(cards).getByRole('button', { name: 'Got it' }));
  expect(within(cards).getByText(/^DAFI 24-602V2,/)).toBeInTheDocument();
  userEvent.click(screen.getByRole('tab', { name: 'Practice test' }));
  expect(within(screen.getByRole('region', { name: 'Practice test' })).getByRole('button', { name: 'Start test' })).toBeInTheDocument();
});

test('the full exam holds feedback until submit, then scores by publication and is saved', () => {
  openWaps();
  userEvent.click(screen.getByRole('button', { name: /SSgt \/ E-5/ }));
  userEvent.click(screen.getByRole('tab', { name: /All regulations/ }));
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
  userEvent.click(screen.getByRole('button', { name: /SSgt \/ E-5/ }));
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
