import { competencies, utcLevels, utcNotes } from './stsData';
import { ttgContent, ttgGroups } from './ttgData';

// Every STS task, flattened, with its place in the competency model attached.
export const allTasks = competencies.flatMap(comp => comp.subs.flatMap(sub => sub.levels.flatMap(lvl => lvl.tasks.map(task => ({
  ...task, competency: comp, sub, level: lvl, behavior: lvl.behaviors[task.match - 1] || null,
})))));
export const taskById = Object.fromEntries(allTasks.map(task => [task.id, task]));
// A transcribed TTG takes its task list from its lessons; the others keep the suggested list.
export const allTtgs = ttgGroups.flatMap(group => group.ttgs.map(ttg => {
  const content = ttgContent[ttg.n];
  if (!content) return { ...ttg, group: group.title, verified: false, lessons: [] };
  const lessons = content.lessons.map(lesson => ({ ...lesson, ttg: ttg.n }));
  return { ...ttg, ...content, group: group.title, verified: true, lessons, tasks: [...new Set(lessons.flatMap(lesson => lesson.tasks))] };
}));
export const ttgByNumber = Object.fromEntries(allTtgs.map(ttg => [ttg.n, ttg]));

export function ttgsForTask(id) {
  return allTtgs.filter(ttg => ttg.tasks.includes(id));
}

// The TTG lessons that train a task (only transcribed TTGs have lessons).
export function lessonsForTask(id) {
  return allTtgs.flatMap(ttg => ttg.lessons.filter(lesson => lesson.tasks.includes(id)));
}

// Column 2 of the STS: which skill-level upgrades the task is a core task for, and whether the ANG
// and AFRC may treat it as optional (Part II, para 2.2: "5/R, 7/R" are optional for ANG and AFRC).
export function coreLevels(core) {
  if (!core) return { five: false, seven: false, reserveOptional: false };
  return { five: /5/.test(core), seven: /7/.test(core), reserveOptional: /R/.test(core) };
}

const CODE_MEANINGS = {
  K: 'Subject knowledge training: the course teaches the trainee to identify facts, state principles, and analyze or evaluate the subject.',
  P: 'Performance training: the trainee performed the task to the satisfaction of the course, but may not yet meet field requirements for speed and accuracy.',
  pk: 'Performance knowledge training: the trainee can relate simple facts, procedures, operating principles, and operational theory for the task.',
};

// A plain-language reading of every marking on a task's STS line. Each sentence restates what the
// CFETP says the marking means and cites where it says it.
export function explainTask(task) {
  const notes = [];
  const core = coreLevels(task.core);
  if (core.five || core.seven) {
    const levels = [core.five && '5-skill level (2T051)', core.seven && '7-skill level (2T071)'].filter(Boolean).join(' and the ');
    notes.push({ label: `Core task ${task.core}`, text: `Core task for upgrade to the ${levels}. The trainee must be certified on it before the skill level is awarded, and core tasks need third-party certification (Part I, paras 11.2.1.3 and 11.3.1.3; Part II, para 2.3).` });
    if (core.reserveOptional) notes.push({ label: 'R', text: 'Mandatory for RegAF; optional for ANG and AFRC (Part II, para 2.2).' });
  }
  if (task.deploy.includes('*')) notes.push({ label: 'Deployment *', text: 'Deployment task: identified by higher headquarters for personnel to perform during deployments, contingencies, or wartime (Part II, para 2.2).' });
  if (task.deploy.includes('~')) notes.push({ label: 'CBRN ~', text: 'CBRN task (Part II, para 2.2). CBRN task qualification training has Airmen perform wartime mission essential tasks in a simulated wartime environment while wearing full individual protective equipment (Terms, "Task Qualification Training").' });
  if (task.code) {
    const base = task.code.replace('(W)', '');
    notes.push({ label: `3-level ${task.code}`, text: `${CODE_MEANINGS[base]} Taught in the 3-level course (Attachment 2).` });
    if (task.code.includes('(W)')) notes.push({ label: '(W)', text: 'Wartime course requirement: taught at the 3-level course when the wartime course is activated (Part II, para 2.4).' });
  } else {
    notes.push({ label: '3-level -', text: 'No training is provided in the 3-level course; this task is learned on the job (Attachment 2).' });
  }
  notes.push({ label: `Behavior ${task.match}`, text: `Supports required behavior ${task.match} of ${task.sub.title} ${task.level.name} (Part II, para 2.1).` });
  return notes;
}

export function utcFor(id) {
  const levels = utcLevels[id];
  return levels ? { levels: levels.split('').map(n => `${n}-level`), note: utcNotes[id] || '' } : null;
}

export const FILTERS = [
  ['core5', '5-level core', task => coreLevels(task.core).five],
  ['core7', '7-level core', task => coreLevels(task.core).seven],
  ['deploy', 'Deployment *', task => task.deploy.includes('*')],
  ['cbrn', 'CBRN ~', task => task.deploy.includes('~')],
  ['utc', 'UTC UFTSW', task => Boolean(utcLevels[task.id])],
  ['course', 'Taught at 3-level', task => Boolean(task.code)],
  ['ttg', 'Has a TTG', task => ttgsForTask(task.id).length > 0],
];

export function filterTasks({ query = '', filters = [], sub = 'all', levelName = 'all' } = {}) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const tests = FILTERS.filter(([id]) => filters.includes(id)).map(([, , test]) => test);
  return allTasks.filter(task => {
    if (sub !== 'all' && task.sub.id !== sub) return false;
    if (levelName !== 'all' && task.level.name !== levelName) return false;
    if (!tests.every(test => test(task))) return false;
    if (!words.length) return true;
    const haystack = `${task.id} ${task.text} ${task.sub.title} ${ttgsForTask(task.id).map(ttg => `ttg ${ttg.n} ${ttg.title}`).join(' ')}`.toLowerCase();
    return words.every(word => haystack.includes(word));
  });
}

// A training preparation worksheet for the chosen tasks. The sequence is the OJT steps the CFETP
// describes (Attachment 5 and Part II, paras 2.3 and 2.6.1.2); the Go standard is para 2.6.1.2's.
export function buildWorksheet(ids) {
  const tasks = ids.map(id => taskById[id]).filter(Boolean);
  const subs = [...new Map(tasks.map(task => [task.sub.id, task.sub])).values()];
  const ttgs = [...new Map(tasks.flatMap(task => ttgsForTask(task.id)).map(ttg => [ttg.n, ttg])).values()].sort((a, b) => a.n - b.n);
  return {
    tasks,
    ttgs,
    references: [...new Set(subs.flatMap(sub => sub.references))],
    ttgReferences: [...new Set(tasks.flatMap(task => lessonsForTask(task.id)).flatMap(lesson => [...lesson.references, ...(lesson.additionalReferences || [])]))],
    behaviors: [...new Map(tasks.filter(task => task.behavior).map(task => [`${task.level.name}|${task.sub.id}|${task.match}`, { sub: task.sub, level: task.level.name, match: task.match, text: task.behavior }])).values()],
    thirdParty: tasks.filter(task => coreLevels(task.core).five || coreLevels(task.core).seven),
    // TTG lessons covering the chosen tasks, in TTG order, and the tasks no lesson covers yet.
    lessons: [...new Map(tasks.flatMap(task => lessonsForTask(task.id)).map(lesson => [lesson.id, lesson])).values()]
      .sort((a, b) => allTtgs.findIndex(ttg => ttg.n === a.ttg) - allTtgs.findIndex(ttg => ttg.n === b.ttg)),
    untaught: tasks.filter(task => !lessonsForTask(task.id).length),
  };
}

// Every STS technical reference, once, with the sub-competencies that list it.
export const allReferences = [...competencies.flatMap(comp => comp.subs).reduce((map, sub) => {
  sub.references.forEach(ref => map.set(ref, [...(map.get(ref) || []), sub.id]));
  return map;
}, new Map())].map(([text, subs]) => ({ text, subs })).sort((a, b) => a.text.localeCompare(b.text));
