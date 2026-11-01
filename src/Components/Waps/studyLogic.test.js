import { dafi10403Bank, dafi10403Sections } from './dafi10403Bank';
import { dafi24602v2Bank, dafi24602v2Sections } from './dafi24602v2Bank';
import { dafi24602v1Bank, dafi24602v1Sections } from './dafi24602v1Bank';
import { dafi24602v4Bank, dafi24602v4Sections } from './dafi24602v4Bank';
import { dtrPart2Bank, dtrPart2Sections } from './dtrPart2Bank';
import { dtrPart3Bank, dtrPart3Sections } from './dtrPart3Bank';
import { dtrPart4Bank, dtrPart4Sections } from './dtrPart4Bank';
import { buildExam, buildTest, emptyProgress, reviewCard, sectionStats, studyQueue, troubleCards, MASTERED_BOX } from './studyLogic';

const DAY = 24 * 60 * 60 * 1000;

test.each([
  ['DAFI 10-403', dafi10403Bank, dafi10403Sections],
  ['DAFI 24-602V2', dafi24602v2Bank, dafi24602v2Sections],
  ['DAFI 24-602V1', dafi24602v1Bank, dafi24602v1Sections],
  ['DAFI 24-602V4', dafi24602v4Bank, dafi24602v4Sections],
  ['DTR Part II', dtrPart2Bank, dtrPart2Sections],
  ['DTR Part III', dtrPart3Bank, dtrPart3Sections],
  ['DTR Part IV', dtrPart4Bank, dtrPart4Sections],
])('every %s question has one answer, three distinct wrong answers, and a known section', (name, bank, sections) => {
  bank.forEach(item => {
    expect(sections.map(s => s.id)).toContain(item.section);
    expect(item.wrong).toHaveLength(3);
    expect(new Set([item.answer, ...item.wrong]).size).toBe(4);
  });
  sections.forEach(section => expect(bank.some(item => item.section === section.id)).toBe(true));
});

test('question ids are unique across every publication', () => {
  const ids = [...dafi10403Bank, ...dafi24602v2Bank, ...dafi24602v1Bank, ...dafi24602v4Bank, ...dtrPart2Bank, ...dtrPart3Bank, ...dtrPart4Bank].map(item => item.id);
  expect(new Set(ids).size).toBe(ids.length);
});

test('right answers push the review out; a miss brings it back today', () => {
  const now = 1_000_000;
  let progress = emptyProgress();
  for (let i = 0; i < MASTERED_BOX; i += 1) progress = reviewCard(progress, 'a', true, now);
  expect(progress.cards.a.box).toBe(MASTERED_BOX);
  expect(progress.cards.a.due).toBe(now + 14 * DAY);
  progress = reviewCard(progress, 'a', false, now);
  expect(progress.cards.a).toMatchObject({ box: 1, due: now, right: MASTERED_BOX, wrong: 1 });
});

test('the study queue shows due cards first, then up to the new-card limit', () => {
  const now = 10 * DAY;
  const [first, second, third] = dafi10403Bank;
  let progress = reviewCard(emptyProgress(), third.id, false, now - DAY);
  progress = reviewCard(progress, first.id, true, now); // box 1, due now
  progress = reviewCard(progress, first.id, true, now); // box 2, due tomorrow
  const queue = studyQueue(dafi10403Bank, progress, { now, newLimit: 2 });
  expect(queue.map(item => item.id)).toEqual([third.id, second.id, dafi10403Bank[3].id]);
});

test('section stats and trouble cards follow progress', () => {
  const ch3 = dafi10403Bank.filter(item => item.section === 'ch3');
  let progress = reviewCard(emptyProgress(), ch3[0].id, false);
  progress = reviewCard(progress, ch3[1].id, true);
  expect(sectionStats(dafi10403Bank, progress, 'ch3')).toMatchObject({ total: ch3.length, fresh: ch3.length - 2, learning: 2 });
  expect(troubleCards(dafi10403Bank, progress).map(item => item.id)).toEqual([ch3[0].id]);
});

test('a practice test draws from one section and includes the right answer in the choices', () => {
  const test = buildTest(dafi10403Bank, { section: 'att3', length: 5 });
  expect(test).toHaveLength(5);
  test.forEach(item => { expect(item.section).toBe('att3'); expect(item.choices).toContain(item.answer); expect(item.choices).toHaveLength(4); });
});

test('an exam mixes publications in proportion to their size', () => {
  const bank = [
    ...dafi10403Bank.map(item => ({ ...item, section: 'a' })),
    ...dtrPart4Bank.map(item => ({ ...item, section: 'b' })),
  ];
  const exam = buildExam(bank, { length: 100 });
  expect(exam).toHaveLength(100);
  expect(new Set(exam.map(item => item.id)).size).toBe(100);
  const fromA = exam.filter(item => item.section === 'a').length;
  expect(Math.abs(fromA - (100 * dafi10403Bank.length) / bank.length)).toBeLessThan(1);
  exam.forEach(item => expect(item.choices).toContain(item.answer));
});
