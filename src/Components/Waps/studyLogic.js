// Spaced repetition (Leitner boxes) and practice-test building for the WAPS study tool.
// A card's box goes up one each time it is answered right and drops to 1 when it is missed,
// and the box sets how many days until it comes back. Box 5 and up counts as mastered.

const DAY = 24 * 60 * 60 * 1000;
export const BOX_DAYS = [0, 0, 1, 3, 7, 14, 30];
export const MASTERED_BOX = 5;
export const NEW_PER_SESSION = 10;

export const emptyProgress = () => ({ cards: {}, tests: [] });

export function reviewCard(progress, id, correct, now = Date.now()) {
  const previous = progress.cards[id] || { box: 0, right: 0, wrong: 0 };
  const box = correct ? Math.min(previous.box + 1, BOX_DAYS.length - 1) : 1;
  const card = { box, right: previous.right + (correct ? 1 : 0), wrong: previous.wrong + (correct ? 0 : 1), due: now + BOX_DAYS[box] * DAY, seen: now, lastCorrect: correct };
  return { ...progress, cards: { ...progress.cards, [id]: card } };
}

const inSection = section => item => !section || section === 'all' || item.section === section;

// Cards to review now: everything due (most overdue first), then up to `newLimit` never-seen cards in book order.
export function studyQueue(bank, progress, { section = 'all', now = Date.now(), newLimit = NEW_PER_SESSION } = {}) {
  const pool = bank.filter(inSection(section));
  const due = pool.filter(item => progress.cards[item.id] && progress.cards[item.id].due <= now)
    .sort((a, b) => progress.cards[a.id].due - progress.cards[b.id].due);
  const fresh = pool.filter(item => !progress.cards[item.id]).slice(0, newLimit);
  return [...due, ...fresh];
}

export function nextDue(bank, progress, section = 'all') {
  const times = bank.filter(inSection(section)).map(item => progress.cards[item.id]?.due).filter(Boolean);
  return times.length ? Math.min(...times) : null;
}

export function sectionStats(bank, progress, section = 'all', now = Date.now()) {
  const stats = { total: 0, fresh: 0, learning: 0, mastered: 0, due: 0 };
  bank.filter(inSection(section)).forEach(item => {
    const card = progress.cards[item.id];
    stats.total += 1;
    if (!card) stats.fresh += 1;
    else if (card.box >= MASTERED_BOX) stats.mastered += 1;
    else stats.learning += 1;
    if (card && card.due <= now) stats.due += 1;
  });
  return stats;
}

// Cards missed more often than answered right, worst first.
export function troubleCards(bank, progress, limit = 10) {
  return bank.filter(item => (progress.cards[item.id]?.wrong || 0) > 0)
    .map(item => ({ item, card: progress.cards[item.id] }))
    .sort((a, b) => (b.card.wrong - b.card.right) - (a.card.wrong - a.card.right) || a.card.box - b.card.box)
    .slice(0, limit).map(({ item }) => item);
}

export function shuffle(list, random = Math.random) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function buildTest(bank, { section = 'all', length = 25, random = Math.random } = {}) {
  return shuffle(bank.filter(inSection(section)), random).slice(0, length)
    .map(item => ({ ...item, choices: shuffle([item.answer, ...item.wrong], random) }));
}

export function recordTest(progress, result) {
  const {outcomes, ...summary} = result;
  if (outcomes) {
    const groups = {};
    outcomes.forEach(o => {const key = `${o.setId}|${o.section}`; const group = groups[key] ||= {setId: o.setId, section: o.section, right: 0, total: 0}; group.total += 1; group.right += o.correct ? 1 : 0;});
    summary.breakdown = Object.values(groups);
  }
  return { ...progress, tests: [...progress.tests, summary].slice(-20) };
}

// Allocate whole-question quotas by largest remainder. Explicit weights are never silently
// redistributed when a publication lacks enough questions.
export function buildExam(bank, { length = 100, weights, random = Math.random } = {}) {
  if (!Number.isInteger(length) || length < 1) throw new Error('Exam length must be a positive whole number.');
  const groups = {};
  bank.forEach(item => { (groups[item.section] ||= []).push(item); });
  if (!bank.length) throw new Error('Not enough questions for this exam.');
  const size = weights ? length : Math.min(length, bank.length);
  if (weights && (Object.keys(weights).some(key => !groups[key]) || Object.keys(groups).some(key => !Number.isFinite(weights[key]) || weights[key] < 0))) {
    throw new Error('Each publication needs a finite, nonnegative weight.');
  }
  const total = weights ? Object.values(weights).reduce((a, b) => a + b, 0) : bank.length;
  if (!Number.isFinite(total) || !(total > 0)) throw new Error('At least one publication weight must be positive.');
  const quotas = Object.entries(groups).map(([key, items]) => {
    const exact = size * ((weights ? weights[key] : items.length) / total);
    return { items, count: Math.floor(exact), remainder: exact - Math.floor(exact) };
  });
  let left = size - quotas.reduce((sum, quota) => sum + quota.count, 0);
  [...quotas].sort((a, b) => b.remainder - a.remainder).forEach(quota => { if (left > 0) { quota.count += 1; left -= 1; } });
  if (quotas.some(q => q.count > q.items.length)) throw new Error('Not enough questions in a publication for these weights. Reduce the exam length or change the weights.');
  return shuffle(quotas.flatMap(q => shuffle(q.items, random).slice(0, q.count)), random)
    .map(item => ({ ...item, choices: shuffle([item.answer, ...item.wrong], random) }));
}

// Use the original chapter even when the combined view uses publication as its section.
export function weakSpotQueue(bank, progress, { length = 25, random = Math.random } = {}) {
  const groups = {};
  bank.forEach(item => {
    const key = `${item.setId || ''}|${item.sourceSection || item.section}`;
    const group = groups[key] ||= { items: [], right: 0, wrong: 0 };
    group.items.push(item);
    group.right += progress.cards[item.id]?.right || 0;
    group.wrong += progress.cards[item.id]?.wrong || 0;
  });
  const weak = Object.values(groups).filter(g => g.wrong > 0)
    .sort((a, b) => a.right / (a.right + a.wrong) - b.right / (b.right + b.wrong));
  return weak.flatMap(g => shuffle(g.items, random).sort((a, b) => {
    const score = item => {
      const card = progress.cards[item.id];
      return !card ? 1 : card.lastCorrect === false ? 3 : card.wrong > 0 ? 2 : 0;
    };
    return score(b) - score(a);
  })).slice(0, length).map(item => ({ ...item, choices: shuffle([item.answer, ...item.wrong], random) }));
}

export function readiness(progress, { now = Date.now() } = {}) {
  const eligible = (progress.tests || []).filter(t => t.kind === 'exam' && t.completed && t.blueprint && t.total > 0 && t.at <= now && t.at >= now - 30 * DAY)
    .sort((a, b) => b.at - a.at);
  const latest = eligible[0];
  const exams = eligible.filter(t => t.blueprint === latest?.blueprint && t.total === latest?.total).slice(0, 5);
  return { count: exams.length, score: exams.length ? Math.round(100 * exams.reduce((n, t) => n + t.right, 0) / exams.reduce((n, t) => n + t.total, 0)) : null,
    status: exams.length >= 3 ? 'available' : 'insufficient' };
}

const unitAliases = { lb: 'pounds', lbs: 'pounds', pound: 'pounds', pounds: 'pounds', day: 'days', days: 'days', hour: 'hours', hours: 'hours', minute: 'minutes', minutes: 'minutes', month: 'months', months: 'months', year: 'years', years: 'years', mile: 'miles', miles: 'miles', '%': '%', percent: '%' };
function parseNumeric(value) {
  const match = String(value).trim().toLowerCase().match(/^([+-]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?)\s*([a-z%]*)$/);
  if (!match || (match[2] && !unitAliases[match[2]])) return null;
  return { value: Number(match[1].replace(/,/g, '')), unit: unitAliases[match[2]] || '' };
}
export const numericAnswer = item => parseNumeric(item.answer);
export function matchesNumeric(input, item) {
  const expected = numericAnswer(item), actual = parseNumeric(input);
  return Boolean(expected && actual && expected.value === actual.value && (!actual.unit || actual.unit === expected.unit));
}
