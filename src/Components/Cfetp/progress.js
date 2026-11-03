import { useEffect, useState } from 'react';
import { allTasks, taskById } from './cfetpLogic';
import { buildPlan, trainingPlanFor } from './teaching';
import { scenariosFor } from './scenarios';

// The trainer's progress through each task's walkthrough, kept in this browser only: ticks, step
// ratings and observations, the phase they were on, and when they last worked on it. It is a
// working aid, not a training record.
const KEY = 'cfetp-train-progress';
const EVENT = 'cfetp-progress';

export function readProgress() {
  try { const saved = JSON.parse(window.localStorage.getItem(KEY)); return saved && typeof saved === 'object' ? saved : {}; } catch { return {}; }
}

function writeTask(taskId, entry) {
  const { [taskId]: _, ...rest } = readProgress();
  const next = entry ? { ...rest, [taskId]: { ...entry, _updated: Date.now() } } : rest;
  try { window.localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* storage unavailable */ }
  window.dispatchEvent(new Event(EVENT));
}

export function useTaskProgress(taskId) {
  const [done, setDone] = useState(() => readProgress()[taskId] || {});
  const set = (key, value) => {
    const next = { ...done, [key]: value };
    setDone(next);
    writeTask(taskId, next);
  };
  return { done, set, toggle: key => set(key, !done[key]), reset: () => { setDone({}); writeTask(taskId, null); } };
}

// Re-renders the caller whenever any task's progress changes.
export function useProgress() {
  const [progress, setProgress] = useState(readProgress);
  useEffect(() => {
    const update = () => setProgress(readProgress());
    window.addEventListener(EVENT, update);
    window.addEventListener('storage', update);
    return () => { window.removeEventListener(EVENT, update); window.removeEventListener('storage', update); };
  }, []);
  return progress;
}

export const PHASES = ['Prepare', 'Explain', 'Show', 'Practice', 'Evaluate', 'Document'];
export const RATINGS = [['independent', 'Independent'], ['prompted', 'Needed prompting'], ['incorrect', 'Incorrect']];
export const GO_CRITERIA = [['assist', 'Performs it without assistance'], ['accurate', 'Accurate'], ['timely', 'Timely, meeting local demands'], ['procedure', 'Uses the correct procedures']];
export const ROUNDS = [
  ['round1', 'Guided', 'They do each step while you prompt it. Stop and correct every error on the spot.'],
  ['round2', 'Coached', 'They lead; you step in only when they stall or start to go wrong.'],
  ['round3', 'Solo', 'They do it start to finish with no prompts. If this is clean, move to Evaluate.'],
];

export const stepNamesFor = steps => steps.map((step, i) => step.heading || `Step ${i + 1}`);

// The evaluation: each TTG step rated Independent, Needed prompting, or Incorrect, plus the four
// Go criteria (Part II, para 2.6.1.2). Go only when every step was independent and every
// criterion was met. Missed steps say what to practice next.
export function evaluationFor(taskId, done) {
  const plan = trainingPlanFor(taskId);
  const names = stepNamesFor(plan.steps);
  const steps = names.map((name, i) => ({ name, rating: done[`rate:${i}`] || null, note: done[`note:${i}`] || '' }));
  const criteria = GO_CRITERIA.map(([id, label]) => ({ id, label, met: Boolean(done[`eval:${id}`]) }));
  const evaluated = steps.some(step => step.rating) || criteria.some(item => item.met);
  const complete = steps.every(step => step.rating) && criteria.every(item => item.met);
  const isGo = evaluated && steps.every(step => step.rating === 'independent') && criteria.every(item => item.met);
  const reteach = steps.filter(step => step.rating === 'incorrect');
  const repractice = steps.filter(step => step.rating === 'prompted');
  const missed = [...reteach, ...repractice].map(step => step.name);
  const scenarios = scenariosFor(taskId).filter(scenario => scenario.expected.some(item => missed.includes(item.step)));
  return { steps, criteria, evaluated, complete, isGo, reteach, repractice, unrated: steps.filter(step => !step.rating), criteriaMissed: criteria.filter(item => !item.met), scenarios };
}

// Which phases are complete, and the first one that is not.
export function phaseStatus(taskId, done) {
  const plan = trainingPlanFor(taskId);
  const names = stepNamesFor(plan.steps);
  const evaluation = evaluationFor(taskId, done);
  const keys = [
    ['prep:read', 'prep:prereq', 'prep:bring', 'prep:pubs', 'prep:setup'],
    plan.lesson ? ['explain:task', 'explain:why', 'explain:standard'] : ['explain:task', 'explain:why', 'explain:source', 'explain:standard'],
    names.map((_, i) => `show:${i}`),
    ROUNDS.map(([id]) => `practice:${id}`),
    null,
    plan.lesson ? ['doc:tba', 'doc:ttg'] : ['doc:tba'],
  ];
  const complete = keys.map((list, i) => (i === 4 ? evaluation.complete && evaluation.isGo : list.every(key => done[key])));
  const next = complete.indexOf(false);
  return { complete, next: next === -1 ? null : next, documented: Boolean(done['doc:tba']) };
}

// Where to pick up: the task worked on most recently that is not finished, the phase to resume,
// prerequisite tasks not yet marked documented here, and the next task from the What to Train plan.
export function continueTraining(progress, planChoices) {
  const started = Object.entries(progress)
    .filter(([id, entry]) => taskById[id] && Object.keys(entry).some(key => !key.startsWith('_')))
    .sort(([, a], [, b]) => (b._updated || 0) - (a._updated || 0));
  const status = id => phaseStatus(id, progress[id] || {});
  const unfinished = started.find(([id]) => status(id).next !== null);
  const current = unfinished ? unfinished[0] : null;
  const documented = id => status(id).documented;
  const gapsFor = id => trainingPlanFor(id).priorTasks.filter(task => !documented(task.id));
  const plan = buildPlan(planChoices || {});
  const queue = [...plan.coreTasks, ...plan.dutyTasks, ...plan.deployTasks].filter(task => task.id !== current && !documented(task.id));
  const ready = queue.find(task => !gapsFor(task.id).some(gap => queue.includes(gap)));
  const next = ready || queue[0] || null;
  return {
    current: current && { task: taskById[current], phase: status(current).next, updated: progress[current]._updated, gaps: gapsFor(current) },
    next: next && { task: next, gaps: gapsFor(next.id) },
    startedCount: started.length,
    documentedCount: allTasks.filter(task => progress[task.id] && documented(task.id)).length,
  };
}

// Point a task's walkthrough at a phase, so it opens there next time.
export function resumeAt(taskId, phase) {
  writeTask(taskId, { ...(readProgress()[taskId] || {}), _phase: phase });
}
