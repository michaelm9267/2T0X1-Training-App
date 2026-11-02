const test = require('node:test');
const assert = require('node:assert/strict');
const { reviewResult } = require('./audit_policy');

const question = {
  id: '2.1|Example question?',
  ref: '2.1',
  question: 'Example question?',
  answer: 'Correct answer',
  wrong: ['Wrong one', 'Wrong two', 'Wrong three'],
};

test('new questions are pending without being reported as changed reviewed questions', () => {
  assert.deepEqual(reviewResult(question), { pending: true, errors: [] });
});

test('reviewed questions still fail when their answer changes', () => {
  const decision = { ...question, status: 'verified', answer: 'Old answer' };
  assert.deepEqual(reviewResult(question, decision), {
    pending: false,
    errors: [`answer changed since review: ${question.id}`],
  });
});
