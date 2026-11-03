import { utcLevels } from './stsData';
import { ttgGroups } from './ttgData';
import { allReferences, allTasks, coreLevels, lessonsForTask, taskById } from './cfetpLogic';
import { REFERENCE_GUIDE, REFERENCE_POINTS } from './referenceGuide';

// "What to teach" for one STS task: the part of its TTG lesson that teaches it, the exercises that
// show it, and where the trainee starts. A TTG lesson often trains several tasks, so each task step
// is matched to the task(s) it teaches by the words in its heading. A step with no matching heading
// (a sub-heading such as "Classified Cargo") continues the task above it; steps before the first
// match are background for the whole lesson.

const STOP = new Set('a an the and or of for to in on with within w f by from as at is are be into via per iaw its their all any applicable appropriate required e g etc using utilize utilizes use i ie'.split(' '));
const stem = word => word.replace(/(ing|ed|es|s)$/, '');
const wordsOf = text => new Set(text.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(word => word.length > 1 && !STOP.has(word)).map(stem));
const overlap = (a, b) => {
  let shared = 0;
  a.forEach(word => { if (b.has(word)) shared += 1; });
  return a.size && b.size ? shared / Math.sqrt(a.size * b.size) : 0;
};

// Steps where the heading words point the wrong way, checked by hand against the TTGs. Keyed by
// lesson id, then step heading; 'shared' marks background for every task in the lesson.
export const STEP_OWNERS = {
  'ttg4-expert': {
    'A. QAE Application Process': ['4.1.4.1'],
    'B. Quality Assurance': ['4.1.4.1'],
    'Reporting Process (resolving issues identified by the traveler or T.O.)': ['4.1.4.1', '4.1.4.2'],
  },
  'ttg5-intermediate': { 'Personal Property Advisories/Disseminate PPTY Guidance to Base Populace': ['4.2.2.7', '4.2.2.8'] },
  'ttg11-incheck': { 'Verify Validity of Shipping Documents': ['5.1.1.1'], 'Verify Item(s) Matches Shipping Document': ['5.1.1.2'] },
  'ttg15-rcp': { 'Reusable Container Program': 'shared' },
  'ttg17-intermediate': { 'WPM Management Overview': 'shared' },
  'ttg19-basic': {
    'Segregate Documentation / Perform Shipment Planning Actions for Priority / General Cargo Shipments': ['5.2.1.2', '5.2.1.3'],
    'Perform Partial Shipment Actions': ['5.2.1.4'],
    'Perform Consolidation Shipment Actions': ['5.2.1.5'],
    'Perform Shipment Routing Actions': ['5.2.1.9'],
    'Perform Shipment Planning Actions for ITAR Shipments Requiring EEI / CFR Exemption': ['5.2.1.24'],
  },
  'ttg23-intermediate': { 'Steps in Task Performance (the TTG\'s flowchart)': ['5.2.2.5', '5.2.2.6'] },
  'ttg24-expert': {
    'Author, Review or Update Performance Work Statements': ['5.2.4.3', '5.2.4.4'],
    'Reviews and Recommends Updates to DoD Policies': ['5.2.4.5'],
    'Reviews and Updates TFG': ['5.2.4.6'],
  },
  'ttg28-identification': {
    'Complete Special Handling Asset Course Qualifications & Complete NWRM Fundamental Course': ['5.4.1.1', '5.4.1.2'],
    'Recognizes HAZMAT, Classified, Protected and AA&E Identifiers on Documentation and Cargo': ['5.4.1.3', '5.4.1.4'],
    'Hazardous Materiel': ['5.4.1.3'],
    'Classified Cargo': ['5.4.1.4'],
    'Protected Cargo': ['5.4.1.4'],
    'AA&E': ['5.4.1.4'],
    'Segregates and Stores Cargo as Required': ['5.4.1.5'],
  },
  'ttg29-hazmat': { 'Packages and Certifies Hazardous Material': ['5.4.2.2'] },
  'ttg31-receipt': { 'Review and Analyze Source Document for Applicable System': ['5.5.1.1'] },
};

// Each step of a lesson with the tasks it teaches ('shared' for lesson background), and how the
// match was made: the lesson trains one task, a hand-checked correction, a heading-word match, or
// a sub-heading continuing the step above.
export const MATCH_LABELS = {
  single: 'The lesson trains only this task',
  checked: 'Matched by hand against the TTG',
  heading: 'Matched by the step heading',
  continues: 'Continues the step above',
  shared: 'Background for the whole lesson',
};

export function stepOwners(lesson) {
  if (lesson.tasks.length <= 1) return lesson.steps.map(step => ({ step, owners: lesson.tasks, how: 'single' }));
  const taskWords = lesson.tasks.map(id => [id, wordsOf(taskById[id].text)]);
  const overrides = STEP_OWNERS[lesson.id] || {};
  let previous = 'shared';
  return lesson.steps.map(step => {
    let owners = overrides[step.heading];
    let how = 'checked';
    if (!owners) {
      const heading = wordsOf(step.heading || '');
      const scores = taskWords.map(([id, words]) => [id, overlap(words, heading)]);
      const best = Math.max(...scores.map(([, score]) => score));
      how = best >= 0.25 ? 'heading' : 'continues';
      owners = best >= 0.25 ? scores.filter(([, score]) => score >= best * 0.6).map(([id]) => id) : previous;
    }
    if (owners === 'shared') how = 'shared';
    previous = owners;
    return { step, owners, how };
  });
}

const CODE_START = {
  K: 'The 3-level course taught the facts and principles (K). Teach the hands-on performance on the job.',
  P: 'The 3-level course had the trainee perform it (P), but not yet to field speed and accuracy. Coach to the local standard.',
  pk: 'The 3-level course taught the procedures and principles (pk). Teach the hands-on performance on the job.',
};

// Where the trainee starts, from the STS column 4 code (Attachment 2).
export function startingPoint(task) {
  if (!task.code) return 'Not taught at the 3-level course. Expect to teach it from the beginning on the job.';
  const base = task.code.replace('(W)', '');
  return `${CODE_START[base]}${task.code.includes('(W)') ? ' The course covers it only when the wartime course is active, so check what your trainee received.' : ''}`;
}

export function teachingFor(id) {
  const task = taskById[id];
  const lesson = lessonsForTask(id)[0];
  if (!lesson) return { task, lesson: null, steps: [], matches: [], background: [], exercises: [], otherExercises: [] };
  const owned = stepOwners(lesson);
  const mine = owned.filter(({ owners }) => owners !== 'shared' && owners.includes(id));
  const steps = mine.map(({ step }) => step);
  const matches = mine.map(({ how }) => how);
  const background = owned.filter(({ owners }) => owners === 'shared').map(({ step }) => step);
  // An exercise belongs to the task whose text and step headings share the most words with it.
  const exercises = lesson.exercises || [];
  const profile = lesson.tasks.map(taskId => {
    const words = wordsOf(taskById[taskId].text);
    owned.filter(({ owners }) => owners !== 'shared' && owners.includes(taskId)).forEach(({ step }) => wordsOf(step.heading || '').forEach(word => words.add(word)));
    return [taskId, words];
  });
  const myExercises = exercises.filter(exercise => {
    if (lesson.tasks.length === 1) return true;
    const words = wordsOf(exercise);
    const scores = profile.map(([taskId, taskWords]) => [taskId, overlap(taskWords, words)]);
    const best = Math.max(...scores.map(([, score]) => score));
    return best > 0 && scores.some(([taskId, score]) => taskId === id && score >= best * 0.8);
  });
  return { task, lesson, steps, matches, background, exercises: myExercises, otherExercises: exercises.filter(exercise => !myExercises.includes(exercise)) };
}

// The training plan for an Airman: the core tasks their upgrade requires, the tasks of the work
// centers they are assigned to, and the deployment (UTC) tasks for their current skill level.
export const GOALS = [
  { id: '5', label: '3-level working toward 5-level', current: '3', core: 'five' },
  { id: '7', label: '5-level working toward 7-level', current: '5', core: 'seven' },
  { id: 'q', label: 'Qualified 7-level (duty position training only)', current: '7', core: null },
];
const LEVEL_ORDER = ['Basic', 'Intermediate', 'Advanced', 'Expert'];

export function buildPlan({ goal = '5', component = 'regaf', subs = [], deploying = false } = {}) {
  const { current, core } = GOALS.find(item => item.id === goal) || GOALS[0];
  const coreTasks = core ? allTasks.filter(task => {
    const marks = coreLevels(task.core);
    return marks[core] && !(component === 'arc' && marks.reserveOptional);
  }) : [];
  const listed = new Set(coreTasks.map(task => task.id));
  const dutyTasks = allTasks.filter(task => subs.includes(task.sub.id) && !listed.has(task.id))
    .sort((a, b) => LEVEL_ORDER.indexOf(a.level.name) - LEVEL_ORDER.indexOf(b.level.name) || allTasks.indexOf(a) - allTasks.indexOf(b));
  dutyTasks.forEach(task => listed.add(task.id));
  const deployTasks = deploying ? allTasks.filter(task => (utcLevels[task.id] || '').includes(current) && !listed.has(task.id)) : [];
  return { current, coreTasks, dutyTasks, deployTasks, reserveOptionalDropped: component === 'arc' && core ? allTasks.filter(task => coreLevels(task.core)[core] && coreLevels(task.core).reserveOptional).length : 0 };
}

// Work centers: the sub-competencies Attachment 5 gives TTGs for, in TTG order.
export const WORK_CENTERS = ttgGroups.map(group => ({ sub: group.sub, title: group.title }));

// Citations with a paragraph, chapter, table, figure, appendix, or attachment, as the task's own
// steps print them, so the trainer can check each one against the current publication.
const CITE = /\b(?:DAFI|AFI|AFMAN|DAFMAN|AFH|DLM|DoDM|DoDI|JTR|DTR|\d+ CFR)\b[^.;()"]{0,45}?\b(?:para(?:graph)?s?|chp|chapter|table|figure|appendix|attachment)\b\.?\s*[A-Z]?[\d.\-–]*[\dA-Z]/gi;
const flatten = items => items.flatMap(item => (typeof item === 'string' ? [item] : [item.text, ...flatten(item.items)]));

// All the text of a set of task steps.
export const stepTexts = steps => steps.flatMap(step => [step.heading || '', step.intro || '', ...flatten(step.items)]).filter(Boolean);

export function citationsIn(steps) {
  const text = steps.flatMap(step => [step.heading || '', step.intro || '', ...flatten(step.items)]).join(' \n ');
  const seen = new Map();
  (text.match(CITE) || []).forEach(raw => {
    const cite = raw.replace(/\s+/g, ' ').replace(/[:,]\s*$/, '').trim();
    const key = cite.toLowerCase().replace(/[^a-z0-9]/g, '').replace(/chapter|chp/g, 'ch').replace(/paragraph|para/g, 'p');
    if (!seen.has(key)) seen.set(key, cite);
  });
  return [...seen.values()];
}

// For a task no TTG covers: the STS references to teach it from (full STS wording, best first),
// what to look up, and any caveat.
export function referenceGuideFor(id) {
  const entry = REFERENCE_GUIDE[id];
  if (!entry) return null;
  const [keys, look, note = ''] = entry;
  const refs = keys.map(key => allReferences.find(ref => ref.text.startsWith(key))?.text).filter(Boolean);
  return { refs, look, note, points: REFERENCE_POINTS[id] || [] };
}

const PREREQ = /complete (basic|intermediate|advanced?) requirements/i;

// A session plan for one task, in the demonstration-performance order every TTG prescribes.
export function trainingPlanFor(id) {
  const teaching = teachingFor(id);
  const { task, lesson, steps } = teaching;
  const prior = lesson && lesson.prerequisites.some(item => PREREQ.test(item))
    ? allTasks.filter(item => item.sub.id === task.sub.id && LEVEL_ORDER.indexOf(item.level.name) < LEVEL_ORDER.indexOf(task.level.name))
    : [];
  return {
    ...teaching,
    priorTasks: prior,
    citations: citationsIn(steps),
    references: lesson ? [...lesson.references, ...(lesson.additionalReferences || [])] : task.sub.references,
    supportMaterial: lesson?.supportMaterial || [],
    techniques: lesson?.techniques || [],
    core: coreLevels(task.core),
    guide: lesson ? null : referenceGuideFor(id),
  };
}

// An exercise the trainee performs (watch them) or answers (ask them).
const HANDS_ON = /\b(demonstrate|perform|locate|log into|show proof|identify designated|create|develop a training plan|pull(?:ing)? data)\b/i;
export const isHandsOn = exercise => HANDS_ON.test(exercise);

// The next proficiency level of the task's sub-competency: what proficiency beyond this task
// looks like in the STS (Part II, para 2.1), or null at Expert.
export function nextLevelFor(id) {
  const task = taskById[id];
  const levels = task.sub.levels;
  const next = levels[levels.indexOf(task.level) + 1];
  return next ? { name: next.name, criteria: next.criteria, behaviors: next.behaviors, tasks: next.tasks.map(item => taskById[item.id]) } : null;
}
