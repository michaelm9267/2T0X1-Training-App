function reviewResult(question, decision) {
  if (!decision) return { pending: true, errors: [] };

  const errors = [];
  if (decision.status !== 'verified') errors.push(`semantic review unresolved: ${question.id}`);
  if (decision.ref !== question.ref || (decision.question && decision.question !== question.question)) {
    errors.push(`stem or citation changed since review: ${question.id}`);
  }
  if (decision.answer !== question.answer) errors.push(`answer changed since review: ${question.id}`);
  const wrong = decision.wrong || decision.distractors?.map(item => item.choice);
  if (JSON.stringify(wrong) !== JSON.stringify(question.wrong)) {
    errors.push(`distractors changed since review: ${question.id}`);
  }
  return { pending: false, errors };
}

module.exports = { reviewResult };
