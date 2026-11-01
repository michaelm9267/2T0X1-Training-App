import { buildExam, emptyProgress, reviewCard, weakSpotQueue, readiness, numericAnswer, matchesNumeric } from './studyLogic';
const item = (id, section = 'a', sourceSection = 'ch1') => ({ id, section, sourceSection, setId: section, question: id, answer: 'Yes', wrong: ['No', 'Maybe', 'Never'] });
const bank = [...Array.from({length: 10}, (_, i) => item(`a${i}`, 'a')), ...Array.from({length: 10}, (_, i) => item(`b${i}`, 'b'))];
test('weighted exams follow explicit quotas regardless of bank size', () => {
  const exam = buildExam(bank, {length: 10, weights: {a: 80, b: 20}});
  expect(exam.filter(q => q.section === 'a')).toHaveLength(8);
  expect(exam.filter(q => q.section === 'b')).toHaveLength(2);
  expect(new Set(exam.map(q => q.id)).size).toBe(10);
});
test('invalid blueprints and insufficient publication capacity fail visibly', () => {
  expect(() => buildExam(bank, {length: 20, weights: {a: 90, b: 10}})).toThrow(/enough/i);
  expect(() => buildExam(bank, {length: 10, weights: {a: -1, b: 20}})).toThrow(/weight/i);
  expect(() => buildExam(bank, {length: 10, weights: {a: 0, b: 0}})).toThrow(/weight/i);
  expect(() => buildExam(bank, {length: 0})).toThrow(/length/i);
});
test('weak drills prioritize weakest source section across publications using recorded answers', () => {
  const p = emptyProgress();
  p.cards.a0 = {right: 0, wrong: 3};
  p.cards.b0 = {right: 5, wrong: 1};
  const queue = weakSpotQueue(bank, p, {length: 5, random: () => 0.5});
  expect(queue).toHaveLength(5);
  expect(queue[0].id).toBe('a0');
  expect(queue.every(q => q.setId === 'a')).toBe(true);
  expect(weakSpotQueue(bank, emptyProgress())).toEqual([]);
});
test('readiness uses only recent completed blueprint-matching exams and requires three', () => {
  const now = Date.now();
  const exam = {kind: 'exam', at: now, total: 100, right: 80, blueprint: 'custom', completed: true};
  expect(readiness({tests: [{...exam, kind: 'practice'}]}, {now}).count).toBe(0);
  expect(readiness({tests: [exam, {...exam, at: now - 40*86400000}]}, {now}).status).toBe('insufficient');
  expect(readiness({tests: [exam, exam, {...exam, right: 90}]}, {now})).toMatchObject({count: 3, score: 83, status: 'available'});
});
test('numeric recall normalizes commas, decimals and matching units only', () => {
  const q = {answer: '10,000 pounds'};
  expect(numericAnswer(q)).toEqual({value: 10000, unit: 'pounds'});
  expect(matchesNumeric('10000', q)).toBe(true);
  expect(matchesNumeric('10,000 lbs', q)).toBe(true);
  expect(matchesNumeric('10000 days', q)).toBe(false);
  expect(matchesNumeric('1000', q)).toBe(false);
  expect(numericAnswer({answer: '18 months (minimum)'})).toBeNull();
  expect(numericAnswer({answer: 'AF Form 100'})).toBeNull();
});
test('review records most recent outcome for targeted drills', () => {
  expect(reviewCard(emptyProgress(), 'a', false, 123).cards.a).toMatchObject({lastCorrect: false, seen: 123});
});

test('test history aggregates outcomes by source chapter without duplicating long question IDs', () => {
  const {recordTest} = require('./studyLogic');
  const p = recordTest(emptyProgress(), {at:1, outcomes:[{id:'long question id',setId:'a',section:'ch1',correct:true},{id:'another',setId:'a',section:'ch1',correct:false}]});
  expect(p.tests[0].breakdown).toEqual([{setId:'a', section:'ch1', right:1,total:2}]);
  expect(p.tests[0].outcomes).toBeUndefined();
});
test('overflowing relative weights are rejected instead of producing an empty exam', () => {
  expect(()=>buildExam(bank, {length:10, weights:{a:1e308,b:1e308}})).toThrow(/weight/i);
});
