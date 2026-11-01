import { publishSave } from '../../cloudBridge';
import { emptyProgress } from './studyLogic';
const key = rank => `waps-progress-${rank}`;
const object = value => value && typeof value === 'object' && !Array.isArray(value);
const finite = value => Number.isFinite(value) && value >= 0;
export function validExam(exam) {
  if (!object(exam) || !Array.isArray(exam.items) || !exam.items.length || !exam.items.every(q => object(q) && typeof q.id === 'string' && typeof q.question === 'string' && typeof q.answer === 'string' && Array.isArray(q.choices) && q.choices.length === 4 && q.choices.includes(q.answer) && q.choices.every(c => typeof c === 'string'))) return null;
  if (new Set(exam.items.map(q=>q.id)).size !== exam.items.length || !Number.isInteger(exam.position) || exam.position < 0 || exam.position >= exam.items.length || !finite(exam.startedAt) || !(exam.endsAt === null || finite(exam.endsAt))) return null;
  const answers = object(exam.answers) ? Object.fromEntries(Object.entries(exam.answers).filter(([id, choice]) => exam.items.some(q => q.id === id && q.choices.includes(choice)))) : {};
  return {...exam, answers, flagged: Array.isArray(exam.flagged) ? exam.flagged.filter(id => exam.items.some(q => q.id === id)) : []};
}
export function readProgress(rank) {
  try {
    const raw = JSON.parse(localStorage.getItem(key(rank)));
    const value = object(raw) ? raw : emptyProgress();
    const cards = {};
    if (object(value.cards)) Object.entries(value.cards).forEach(([id, c]) => {
      if (!object(c)) return;
      cards[id] = {right: finite(c.right) ? c.right : 0, wrong: finite(c.wrong) ? c.wrong : 0,
        box: Number.isInteger(c.box) && c.box >= 0 && c.box <= 6 ? c.box : 0,
        due: finite(c.due) ? c.due : 0, seen: finite(c.seen) ? c.seen : 0,
        ...(typeof c.lastCorrect === 'boolean' ? {lastCorrect: c.lastCorrect} : {})};
    });
    let exam = value.exam;
    if (!Object.prototype.hasOwnProperty.call(value, 'exam')) {
      try {exam = JSON.parse(localStorage.getItem(`waps-exam-${rank}`));} catch {exam = null;}
    }
    return {...value, cards,
      tests: Array.isArray(value.tests) ? value.tests.filter(t => object(t) && finite(t.at) && Number.isInteger(t.total) && t.total > 0 && finite(t.right) && t.right <= t.total).slice(-20) : [],
      reports: Array.isArray(value.reports) ? value.reports.filter(r => object(r) && typeof r.id === 'string' && typeof r.questionId === 'string' && typeof r.reason === 'string').slice(-100) : [],
      exam: validExam(exam)};
  } catch { return emptyProgress(); }
}
export function saveProgress(rank, value) {
  localStorage.setItem(key(rank), JSON.stringify(value));
  // Track unsent edits, so a stale server snapshot cannot replace offline local work on sign-in.
  let meta;
  try { meta = JSON.parse(localStorage.getItem('transit-iq-cloud')) || {}; } catch { meta = {}; }
  localStorage.setItem('transit-iq-cloud', JSON.stringify({...meta, waps: Date.now()}));
  publishSave('waps', value);
}
