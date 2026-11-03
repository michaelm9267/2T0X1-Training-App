import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../App';
import { utcLevels } from './stsData';
import { allReferences, allTasks, allTtgs, buildWorksheet, coreLevels, explainTask, filterTasks, lessonsForTask, taskById, ttgByNumber, ttgsForTask } from './cfetpLogic';
import { STEP_OWNERS, buildPlan, referenceGuideFor, isHandsOn, nextLevelFor, startingPoint, stepOwners, stepTexts, teachingFor, trainingPlanFor } from './teaching';
import { publicationStatus } from './publications';
import { SCENARIOS, scenariosFor } from './scenarios';
import { REFERENCE_GUIDE, REFERENCE_POINTS } from './referenceGuide';
import { continueTraining } from './progress';

beforeEach(() => { window.localStorage.clear(); });

test('the STS holds every task once, in order, with valid behavior matches', () => {
  const ids = allTasks.map(task => task.id);
  expect(new Set(ids).size).toBe(ids.length);
  allTasks.forEach(task => expect(task.behavior).toBeTruthy());
  // Spot checks against the CFETP pages.
  expect(taskById['5.3.1.4']).toMatchObject({ text: 'In-check shipment documents into system of record', core: '5^', deploy: '*~', code: 'P(W)' });
  expect(taskById['4.2.2.2'].core).toBe('7/R^');
  expect(taskById['6.3.4.2'].text).toBe('Collaborate and communicate with IDO');
});

test('Attachment 5 has 33 TTGs, and every crosswalk and UTC entry names a real STS task', () => {
  expect(allTtgs.map(ttg => ttg.n)).toEqual(Array.from({ length: 33 }, (_, i) => i + 1));
  allTtgs.forEach(ttg => ttg.tasks.forEach(id => expect(taskById[id]).toBeDefined()));
  Object.keys(utcLevels).forEach(id => expect(taskById[id]).toBeDefined());
  // Only TTGs transcribed from their documents are verified; every lesson names real STS tasks.
  expect(allTtgs.filter(ttg => ttg.verified).map(ttg => ttg.n)).toEqual(Array.from({ length: 33 }, (_, i) => i + 1));
  allTtgs.flatMap(ttg => ttg.lessons).forEach(lesson => lesson.tasks.forEach(id => expect(taskById[id]).toBeDefined()));
});

test('the Passenger Operations TTGs cover all of 4.1, mapped by content where their numbering differs', () => {
  const covered = new Set([1, 2, 3, 4].flatMap(n => ttgByNumber[n].tasks));
  allTasks.filter(task => task.sub.id === '4.1').forEach(task => expect(covered.has(task.id)).toBe(true));
  expect(ttgsForTask('4.1.1.2').map(ttg => ttg.n)).toEqual([1]);
  // TTG 3 prints CBA reconciliation as 4.1.3.1; the 2026 STS numbers it 4.1.3.3.
  expect(lessonsForTask('4.1.3.3').map(lesson => [lesson.ttg, lesson.printed])).toEqual([[3, '4.1.3.1.']]);
  expect(lessonsForTask('4.1.3.1').map(lesson => lesson.ttg)).toEqual([2]);
  const sheet = buildWorksheet(['4.1.2.1', '1.1.1.1']);
  expect(sheet.lessons.map(lesson => lesson.id)).toEqual(['ttg2-emergency']);
  expect(sheet.untaught.map(task => task.id)).toEqual(['1.1.1.1']);
  expect(sheet.ttgReferences).toContain('DTR 4500.9-R Part 1, Ch 103');
});

test('core markings and plain-language explanations follow the CFETP', () => {
  expect(coreLevels('5/7^')).toEqual({ five: true, seven: true, reserveOptional: false });
  expect(coreLevels('5/R^')).toEqual({ five: true, seven: false, reserveOptional: true });
  const labels = explainTask(taskById['5.1.1.9']).map(note => note.label);
  expect(labels).toEqual(['Core task 5^', 'Deployment *', 'CBRN ~', '3-level P(W)', '(W)', 'Behavior 3']);
  expect(ttgsForTask('5.3.1.4').map(ttg => ttg.n)).toEqual([25]);
});

test('filters combine search and markings', () => {
  const core7 = filterTasks({ filters: ['core7'] });
  expect(core7.every(task => coreLevels(task.core).seven)).toBe(true);
  expect(filterTasks({ query: 'REPSHIP', sub: '5.4', levelName: 'Basic' }).map(task => task.id)).toEqual(['5.4.1.10', '5.4.1.11']);
  expect(filterTasks({ query: 'ttg 25' }).map(task => task.id)).toContain('5.3.1.4');
});

test('the worksheet gathers TTGs, references, behaviors, and core tasks', () => {
  const sheet = buildWorksheet(['5.3.1.4', '5.3.1.6']);
  expect(sheet.ttgs.map(ttg => ttg.n)).toEqual([25]);
  expect(sheet.references).toContain('DTR Part II, Chapter 210, Transportation Discrepancy Reports');
  expect(sheet.thirdParty.map(task => task.id)).toEqual(['5.3.1.4']);
});

function openCfetp(view) {
  render(<App />);
  userEvent.click(screen.getByRole('tab', { name: 'CFETP / TTGs' }));
  if (view) userEvent.click(screen.getByRole('tab', { name: view }));
}

test('a trainer can go from a task to its TTG and back, and build a session worksheet', () => {
  openCfetp('STS Tasks');
  expect(screen.getByRole('heading', { name: 'CFETP Training Center' })).toBeInTheDocument();
  userEvent.type(screen.getByRole('searchbox', { name: 'Search tasks' }), '5.3.1.4');
  userEvent.click(within(screen.getByRole('list', { name: 'STS tasks' })).getByRole('button', { name: /In-check shipment documents/ }));
  expect(screen.getByRole('heading', { name: /5\.3\.1\.4 In-check shipment documents/ })).toBeInTheDocument();
  expect(screen.getByText(/Listed in Attachment 4 for the 3-level, 5-level, 7-level/)).toBeInTheDocument();

  userEvent.click(screen.getByRole('button', { name: /TTG 25 · In-checking Process: In-checking Process/ }));
  expect(screen.getByRole('heading', { name: 'TTG 25 · In-checking Process' })).toBeInTheDocument();
  expect(screen.getByRole('table', { name: /Sensitive Items Code/ })).toBeInTheDocument();
  userEvent.click(screen.getByRole('button', { name: 'Add these tasks to training session' }));

  userEvent.click(screen.getByRole('tab', { name: /Session Builder/ }));
  expect(screen.getByRole('heading', { name: 'Training preparation worksheet' })).toBeInTheDocument();
  expect(screen.getByText('6 tasks', { exact: false })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'TTG 25 lesson: In-checking Process' })).toBeInTheDocument();
  expect(JSON.parse(window.localStorage.getItem('cfetp-session-tasks'))).toHaveLength(6);
});

test('the Personal Property TTGs cover all of 4.2, each task in exactly one lesson', () => {
  allTasks.filter(task => task.sub.id === '4.2').forEach(task => expect(lessonsForTask(task.id)).toHaveLength(1));
  expect(lessonsForTask('4.2.3.7').map(lesson => lesson.id)).toEqual(['ttg9-qa']);
  const briefings = lessonsForTask('4.2.3.1')[0];
  expect(briefings.attachments.map(attachment => attachment.title)).toEqual([
    'Personal Property Counseling Checklist Breakdown (DD Form 1797)', 'Personally Procured Move Briefing (DD Form 2278)',
  ]);
});

test('the Packaging TTGs cover all of 5.1, mapped by content where their numbering is older', () => {
  allTasks.filter(task => task.sub.id === '5.1').forEach(task => expect(lessonsForTask(task.id)).toHaveLength(1));
  // TTG 14 prints forklift licensing as 5.1.1.12; the 2026 STS numbers it 5.1.1.14.
  expect(lessonsForTask('5.1.1.14').map(lesson => [lesson.ttg, lesson.printed])).toEqual([[14, '5.1.1.12.']]);
  expect(lessonsForTask('5.1.1.12').map(lesson => lesson.ttg)).toEqual([13]);
  expect(lessonsForTask('5.1.2.10').map(lesson => lesson.id)).toEqual(['ttg17-intermediate']);
});

test('the Outbound TTGs cover all of 5.2, each task in exactly one lesson', () => {
  allTasks.filter(task => task.sub.id === '5.2').forEach(task => expect(lessonsForTask(task.id)).toHaveLength(1));
  expect(lessonsForTask('5.2.3.3').map(lesson => lesson.id)).toEqual(['ttg23-advanced']);
  expect(lessonsForTask('5.2.1.17').map(lesson => lesson.ttg)).toEqual([20]);
});

test('the Inbound TTGs cover all of 5.3, each task in exactly one lesson', () => {
  allTasks.filter(task => task.sub.id === '5.3').forEach(task => expect(lessonsForTask(task.id)).toHaveLength(1));
  const incheck = lessonsForTask('5.3.1.2')[0];
  expect(incheck.tables.map(table => table.rows.length)).toEqual([17, 12]);
});

test('the Special Handling TTGs cover all of 5.4, each task in exactly one lesson', () => {
  allTasks.filter(task => task.sub.id === '5.4').forEach(task => expect(lessonsForTask(task.id)).toHaveLength(1));
  // The 2026 STS rewords 5.4.1.1-5.4.1.2; the lesson says so.
  expect(lessonsForTask('5.4.1.1')[0].numbering).toMatch(/hazardous material handler qualification/);
  const documentation = lessonsForTask('5.4.1.10')[0];
  expect(documentation.attachments.map(attachment => attachment.title)).toEqual(['Automated REPSHIP Procedures (CMOS Joint Service Site, embedded in the TTG)']);
  expect(lessonsForTask('5.4.1.3')[0].tables.map(table => table.rows.length)).toEqual([10, 11]);
});

test('the Receipt Operations TTGs cover all of 5.5, so every Attachment 5 TTG is transcribed', () => {
  allTasks.filter(task => task.sub.id === '5.5').forEach(task => expect(lessonsForTask(task.id)).toHaveLength(1));
  expect(lessonsForTask('5.5.2.8')[0].attachments.map(attachment => attachment.title)).toEqual(['Manual Shipment Recovery Using CONHIST (CMOS screen callout reproduced in the TTG)']);
  expect(lessonsForTask('5.5.4.2').map(lesson => lesson.id)).toEqual(['ttg33-expert']);
  expect(allTtgs.every(ttg => ttg.verified)).toBe(true);
});

test('a task opens its TTG lesson with the steps and evaluation checklist', () => {
  openCfetp('STS Tasks');
  userEvent.type(screen.getByRole('searchbox', { name: 'Search tasks' }), '4.1.2.1');
  userEvent.click(within(screen.getByRole('list', { name: 'STS tasks' })).getByRole('button', { name: /emergency leave/ }));
  userEvent.click(screen.getByRole('button', { name: /TTG 2 · Coordinating Travel Arrangements: Validates and Assist with Emergency Leave Travel/ }));
  expect(screen.getByRole('heading', { name: 'TTG 2 · Coordinating Travel Arrangements' })).toBeInTheDocument();
  expect(screen.getByText(/If PE is not available, do not delay travel/)).toBeVisible();
  expect(screen.getByRole('cell', { name: 'Utilize GSA CPP Fare Search Tool to identify authorized baseline cost' })).toBeInTheDocument();
  expect(screen.getByText(/Transcribed from "02. Coordinating Travel Arrangements"/)).toBeInTheDocument();
});

test('every task a TTG trains gets its own steps from the lesson', () => {
  allTtgs.flatMap(ttg => ttg.lessons).forEach(lesson => {
    const owned = stepOwners(lesson);
    lesson.tasks.forEach(id => expect([id, owned.some(({ owners }) => owners !== 'shared' && owners.includes(id))]).toEqual([id, true]));
  });
  // Every hand-checked correction names a real step heading and real tasks of that lesson.
  Object.entries(STEP_OWNERS).forEach(([lessonId, steps]) => {
    const lesson = allTtgs.flatMap(ttg => ttg.lessons).find(item => item.id === lessonId);
    Object.entries(steps).forEach(([heading, owners]) => {
      expect(lesson.steps.map(step => step.heading)).toContain(heading);
      expect(owners === 'shared' || owners.every(id => lesson.tasks.includes(id))).toBe(true);
    });
  });
  // Sub-headings follow the task above them.
  expect(teachingFor('5.4.1.4').steps.map(step => step.heading)).toEqual([
    'Recognizes HAZMAT, Classified, Protected and AA&E Identifiers on Documentation and Cargo', 'Classified Cargo', 'Protected Cargo', 'AA&E',
  ]);
  expect(teachingFor('5.3.1.6').steps.map(step => step.heading)).toEqual(['Generate Turn Over Record in CMOS & Contact Customer for Pick-Up']);
  expect(teachingFor('5.1.2.1').background.map(step => step.heading)).toEqual(['Reusable Container Program']);
  expect(teachingFor('1.1.1.1').lesson).toBeNull();
  expect(startingPoint(taskById['1.1.1.2'])).toMatch(/Not taught at the 3-level course/);
});

test('each task training plan lists the exact citations to check and the tasks that come first', () => {
  // The same chapter printed two ways is listed once.
  expect(trainingPlanFor('4.2.2.6').citations).toEqual(['DAFI 24-602V4, Chp 12']);
  expect(trainingPlanFor('5.1.1.7').citations).toEqual(['DAFI 24-602v2, Chapter 8', 'DAFI 24-602v2 para 8.5.1', 'DAFI 24-602v2 para 8.8']);
  // An Intermediate lesson requires the Basic tasks of the same sub-competency.
  const intermediate = trainingPlanFor('5.3.2.2');
  expect(intermediate.priorTasks.map(task => task.id)).toEqual(['5.3.1.1', '5.3.1.2', '5.3.1.3', '5.3.1.4', '5.3.1.5', '5.3.1.6']);
  expect(trainingPlanFor('5.3.1.1').priorTasks).toEqual([]);
  expect(trainingPlanFor('1.1.1.1').references.length).toBeGreaterThan(0);
  // Exercises split into what to watch and what to ask; proficiency builds to the next level.
  expect(isHandsOn('Demonstrate the ability to generate turn over record in CMOS.')).toBe(true);
  expect(isHandsOn('Explain the different types of source documents.')).toBe(false);
  expect(nextLevelFor('5.3.1.1').name).toBe('Intermediate');
  expect(nextLevelFor('5.3.4.1')).toBeNull();
});

test('the training plan lists upgrade core tasks, work center tasks, and UTC tasks', () => {
  const five = buildPlan({ goal: '5', subs: ['5.3'] });
  expect(five.coreTasks.length).toBeGreaterThan(0);
  expect(five.coreTasks.every(task => coreLevels(task.core).five)).toBe(true);
  expect(five.dutyTasks.every(task => task.sub.id === '5.3' && !coreLevels(task.core).five)).toBe(true);
  expect(five.dutyTasks[0].level.name).toBe('Basic');
  // ANG and AFRC drop the R-marked core tasks.
  const arc = buildPlan({ goal: '5', component: 'arc' });
  expect(arc.coreTasks.length + arc.reserveOptionalDropped).toBe(five.coreTasks.length);
  expect(buildPlan({ goal: 'q' }).coreTasks).toEqual([]);
  const deploy = buildPlan({ goal: '7', deploying: true });
  expect(deploy.deployTasks.map(task => task.id)).toContain('5.4.2.1');
  expect(deploy.deployTasks.some(task => coreLevels(task.core).seven)).toBe(false);
});

test('a supervisor picks their Airman and sees what to teach for each task', () => {
  openCfetp();
  expect(screen.getByRole('heading', { name: 'Tell us about your Airman' })).toBeInTheDocument();
  userEvent.click(screen.getByRole('checkbox', { name: '5.3 Inbound Operations' }));
  // 5.3.1.1 is a 5-level core task, so it is listed with the core tasks, not repeated per work center.
  expect(within(screen.getByRole('region', { name: 'Work center tasks' })).getByText(/Contact customer for pick-up/)).toBeInTheDocument();
  const row = within(screen.getByRole('region', { name: 'Core tasks for the 5-level' })).getByRole('listitem', { name: /^5\.3\.1\.1 Offload/ });
  userEvent.click(within(row).getByRole('button', { name: 'How to train it' }));
  const card = within(row).getByRole('region', { name: 'What to teach for 5.3.1.1' });
  // One phase at a time, in demonstration-performance order.
  expect(within(card).getByRole('region', { name: 'Step 1: Prepare before the session' })).toBeInTheDocument();
  const next = title => {
    userEvent.click(within(card).getByRole('button', { name: /^Next:/ }));
    return within(card).getByRole('region', { name: title });
  };
  expect(next('Step 2: Explain it')).toBeInTheDocument();
  expect(within(next('Step 3: Show them')).getByRole('heading', { name: 'Offload and Visually Inspect Property for Discrepancies' })).toBeInTheDocument();
  expect(within(next('Step 4: Have them do it')).getByText(/Demonstrate the ability to offload and visually inspect/)).toBeInTheDocument();
  expect(next('Step 5: Evaluate: Go or No-Go')).toBeInTheDocument();
  // Each step is rated; a prompted step is a No-Go that says what to practice and with which scenario.
  ['Performs it without assistance', 'Accurate', 'Timely, meeting local demands', 'Uses the correct procedures'].forEach(name => userEvent.click(within(card).getByRole('checkbox', { name })));
  const step = 'Offload and Visually Inspect Property for Discrepancies';
  expect(within(card).getByRole('status')).toHaveTextContent(`Not rated yet: ${step}`);
  userEvent.click(within(within(card).getByRole('group', { name: `Rating for ${step}` })).getByRole('button', { name: 'Needed prompting' }));
  userEvent.type(within(card).getByRole('textbox', { name: `Observation for ${step}` }), 'signed before noting damage');
  expect(within(card).getByRole('status')).toHaveTextContent(`Practice more: ${step} (signed before noting damage)`);
  userEvent.click(within(within(card).getByRole('status')).getByRole('button', { name: 'Short and damaged truck delivery' }));
  const guideButton = within(card).getByRole('button', { name: 'Show evaluator answer guide' });
  expect(within(card).queryByRole('region', { name: /Answer guide/ })).not.toBeInTheDocument();
  userEvent.click(guideButton);
  expect(within(card).getByRole('region', { name: 'Answer guide: Short and damaged truck delivery' })).toHaveTextContent('Three cartons are on the truck; the CBL shows four.');
  // The Continue panel picks up the task in progress.
  expect(within(screen.getByRole('region', { name: 'Continue training' })).getByText('5.3.1.1 Offload and visually inspect property for discrepancies')).toBeInTheDocument();
  userEvent.click(within(within(card).getByRole('list', { name: 'Training phases' })).getByRole('button', { name: /Evaluate$/ }));
  userEvent.click(within(within(card).getByRole('group', { name: `Rating for ${step}` })).getByRole('button', { name: 'Independent' }));
  expect(within(card).getByRole('status')).toHaveTextContent(/Go\. Core task: a certifier other than you evaluates it/);
  const saved = JSON.parse(window.localStorage.getItem('cfetp-train-progress'))['5.3.1.1'];
  expect([saved['eval:accurate'], saved['rate:0'], saved['note:0']]).toEqual([true, 'independent', 'signed before noting damage']);
  userEvent.click(within(card).getByRole('button', { name: /^Next:/ }));
  expect(within(card).getByText(/In TBA 2\.0, entered the start and completion dates/)).toBeInTheDocument();
  expect(within(card).getByText(/The next level of Inbound Operations is/)).toBeInTheDocument();
  expect(JSON.parse(window.localStorage.getItem('cfetp-plan')).subs).toEqual(['5.3']);
  userEvent.click(within(card).getByRole('button', { name: 'TTG 25 · In-checking Process, page 3' }));
  expect(screen.getByRole('heading', { name: 'TTG 25 · In-checking Process' })).toBeInTheDocument();
});

test('every task without a TTG has a reference to teach it from', () => {
  allTasks.filter(task => !lessonsForTask(task.id).length).forEach(task => {
    const guide = referenceGuideFor(task.id);
    expect([task.id, Boolean(guide && guide.refs.length && guide.look)]).toEqual([task.id, true]);
  });
  // Every key names a real STS reference.
  Object.entries(REFERENCE_GUIDE).forEach(([id, [keys]]) => keys.forEach(key => expect([id, key, allReferences.some(ref => ref.text.startsWith(key))]).toEqual([id, key, true])));
  expect(referenceGuideFor('1.2.2.8').refs).toEqual(['DAFMAN 36-2689, Training Program']);
  expect(referenceGuideFor('6.3.3.1').look).toMatch(/para 3\.10\.3\.6/);
  // Where the publication was read, the guide carries the points themselves, each with its source.
  Object.entries(REFERENCE_POINTS).forEach(([id, blocks]) => {
    expect(referenceGuideFor(id)).not.toBeNull();
    blocks.forEach(block => { expect(block.source).toMatch(/AFH 33-337.*(Chapter|page)/); expect(block.items.length).toBeGreaterThan(0); });
  });
  expect(Object.keys(REFERENCE_POINTS).length).toBeGreaterThanOrEqual(20);
  expect(referenceGuideFor('2.1.1.2').points[0].items.map(item => item.split(':')[0])).toEqual(['Focused', 'Organized', 'Clear', 'Understanding', 'Supported']);
  expect(trainingPlanFor('5.3.1.1').guide).toBeNull();
});

test('a task without a TTG explains where the rule lives', () => {
  openCfetp('STS Tasks');
  userEvent.type(screen.getByRole('searchbox', { name: 'Search tasks' }), '1.2.2.8');
  userEvent.click(within(screen.getByRole('list', { name: 'STS tasks' })).getByRole('button', { name: /Develop and update MTL/ }));
  const card = screen.getByRole('region', { name: 'What to teach for 1.2.2.8' });
  userEvent.click(within(card).getByRole('button', { name: /^Next:/ }));
  const explain = within(card).getByRole('region', { name: 'Step 2: Explain it' });
  expect(explain).toHaveTextContent('Where the rule lives: DAFMAN 36-2689, Training Program');
  expect(explain).toHaveTextContent('Look up: Developing and maintaining the Master Task List (MTL) and Master Training Plan (MTP)');
});

test('every scenario names real tasks and the TTG steps those tasks are taught by', () => {
  expect(SCENARIOS.length).toBeGreaterThanOrEqual(12);
  expect(new Set(SCENARIOS.map(scenario => scenario.id)).size).toBe(SCENARIOS.length);
  SCENARIOS.forEach(scenario => {
    scenario.tasks.forEach(id => expect(taskById[id]).toBeDefined());
    const taught = new Set(scenario.tasks.flatMap(id => teachingFor(id).steps.map(step => step.heading)));
    scenario.expected.forEach(item => expect([scenario.id, taught.has(item.step)]).toEqual([scenario.id, true]));
    [...scenario.expected, ...scenario.questions].forEach(item => expect(item.source).toMatch(/TTG \d+/));
  });
  expect(scenariosFor('5.4.1.8').map(scenario => scenario.id)).toEqual(['special-4388-two-person']);
});

test('continue training resumes the latest unfinished task and suggests the next from the plan', () => {
  const progress = {
    '5.3.1.1': { 'prep:read': true, _updated: 2 },
    '5.3.1.2': { 'doc:tba': true, _updated: 1 },
  };
  const result = continueTraining(progress, { goal: '5', subs: ['5.3'] });
  expect([result.current.task.id, result.current.phase]).toEqual(['5.3.1.1', 0]);
  expect(result.documentedCount).toBe(1);
  expect(result.next.task.id).not.toBe('5.3.1.2');
  expect(continueTraining({}, {}).current).toBeNull();
  // Basic Inbound tasks not yet documented here are prerequisite gaps for Intermediate ones.
  expect(continueTraining({ '5.3.2.2': { 'prep:read': true, _updated: 1 } }, {}).current.gaps.map(task => task.id)).toContain('5.3.1.1');
});

test('publication checks flag replaced, misprinted, and current references', () => {
  expect(publicationStatus('DODI 4516.16, Use of GSA Contracts').status).toBe('wrong');
  expect(publicationStatus('AFI 24-602V4, Personal Property').status).toBe('replaced');
  expect(publicationStatus('DAFI 24-602V4').status).toBe('current');
  expect(publicationStatus('AFI 24-602V1, Passenger Movement').status).toBe('current');
  expect(publicationStatus('DAFMAN 20-110, Nuclear Weapons Related Materiel Management').status).toBe('current');
  expect(publicationStatus('see AFI20-110 para 6.2').status).toBe('replaced');
  expect(publicationStatus('DAFI31-160, Mortuary Affairs Program').status).toBe('wrong');
  expect(publicationStatus('JP 5-0, Joint Planning')).toBeNull();
  expect(publicationStatus('DAFI31-160').url).toMatch(/dafi34-160\.pdf$/);
  expect(publicationStatus('DTR Part III, Appendix P, Center of Balance').url).toMatch(/dtrp3\.cfm$/);
  // TTG 29's human remains steps print the mortuary affairs instruction as 31-160.
  expect(stepTexts(teachingFor('5.4.2.5').steps).some(text => publicationStatus(text)?.status === 'wrong')).toBe(true);
  expect(allReferences.length).toBe(112);
});

test('the trainer guide lists every STS reference with its status', () => {
  openCfetp('Trainer Guide');
  const list = screen.getByRole('region', { name: 'STS references' });
  userEvent.type(within(list).getByRole('searchbox', { name: 'Search references' }), '4516');
  expect(within(list).getByText('DODI 4516.16, Use of GSA Contracts for Air Passenger Transportation Services (GSA City Pair Program) for Attendance at Inactive Duty (IDT) Assemblies')).toBeInTheDocument();
  expect(within(list).getByText('Number error')).toBeInTheDocument();
});

test('the trainer guide explains the STS markings', () => {
  openCfetp();
  userEvent.click(screen.getByRole('tab', { name: 'Trainer Guide' }));
  expect(screen.getByRole('heading', { name: 'Trainer preparation checklist' })).toBeInTheDocument();
  expect(screen.getByText(/Core for RegAF; optional for ANG and AFRC/)).toBeInTheDocument();
});
