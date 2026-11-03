import React, { useEffect, useMemo, useState } from 'react';
import { CFETP_EDITION, UTC, competencies } from './stsData';
import { TTG_PORTAL, TTG_REVIEWED, ttgGroups } from './ttgData';
import { FILTERS, allReferences, allTasks, buildWorksheet, coreLevels, explainTask, filterTasks, lessonsForTask, taskById, ttgByNumber, ttgsForTask, utcFor } from './cfetpLogic';
import { GOALS, WORK_CENTERS, buildPlan, stepTexts } from './teaching';
import { CHECKED, STATUS_LABELS, publicationStatus } from './publications';
import { PHASES, continueTraining, resumeAt, useProgress } from './progress';
import { PubRef, PubUpdates, RECORD_SYSTEM, ReportIssue, SourceLink, StepBlock, Steps, Unverified, Verified } from './parts';
import TeachCard from './TeachCard';
import './cfetp.css';

// A reference and trainer aid for the 2T0X1 CFETP. It reads the STS; it does not keep training
// records or certify anyone. It remembers, in this browser only, the trainer's session task list,
// plan choices, and walkthrough progress.
const VIEWS = [['plan', 'What to Train'], ['sts', 'STS Tasks'], ['ttg', 'TTG Library'], ['session', 'Session Builder'], ['guide', 'Trainer Guide']];
const LEVELS = ['Basic', 'Intermediate', 'Advanced', 'Expert'];
const SESSION_KEY = 'cfetp-session-tasks';
const PLAN_KEY = 'cfetp-plan';

function readSession() {
  try { const ids = JSON.parse(window.localStorage.getItem(SESSION_KEY)); return Array.isArray(ids) ? ids.filter(id => taskById[id]) : []; } catch { return []; }
}
function writeSession(ids) {
  try { window.localStorage.setItem(SESSION_KEY, JSON.stringify(ids)); } catch { /* storage unavailable */ }
}

function readPlan() {
  try { const plan = JSON.parse(window.localStorage.getItem(PLAN_KEY)); return plan && typeof plan === 'object' ? plan : {}; } catch { return {}; }
}
function writePlan(plan) {
  try { window.localStorage.setItem(PLAN_KEY, JSON.stringify(plan)); } catch { /* storage unavailable */ }
}

// One lesson of a transcribed TTG: trainer guidance, task steps, exercise, and evaluation checklist.
function Lesson({ lesson, open, onOpenTask }) {
  const guidance = [
    ['Prerequisites', lesson.prerequisites], ['Training references', lesson.references], ['Additional supporting references', lesson.additionalReferences],
    ['Training support material', lesson.supportMaterial], ['Specific techniques', lesson.techniques],
  ].filter(([, list]) => list && list.length);
  return (
    <details className="cfetp-lesson" open={open} id={`cfetp-lesson-${lesson.id}`}>
      <summary><span className="cfetp-badge">{lesson.level}</span> <strong>{lesson.title}</strong> <span className="cfetp-muted">· {lesson.printed ? `TTG line items ${lesson.printed}` : 'no CFETP line item'} · TTG page {lesson.page}</span></summary>
      <div className="cfetp-lesson-body">
        {lesson.tasks.length > 0 && <p className="cfetp-lesson-tasks">STS: {lesson.tasks.map(id => <button type="button" key={id} className="cfetp-link" onClick={() => onOpenTask(id)}>{id} {taskById[id].text}</button>)}</p>}
        {lesson.numbering && <p className="cfetp-callout-text">{lesson.numbering}</p>}
        {lesson.unnumbered && <p className="cfetp-callout-text">{lesson.unnumbered}</p>}
        <PubUpdates texts={[...lesson.references, ...(lesson.additionalReferences || []), ...stepTexts(lesson.steps)]} />
        <section>
          <h4>Trainer guidance</h4>
          <dl className="cfetp-explain">
            {guidance.map(([label, list]) => <div key={label}><dt>{label}</dt><dd>{list.join('; ')}</dd></div>)}
            <div><dt>Criterion objective</dt><dd>Upon completion of training, the trainee will: {lesson.outcome}</dd></div>
          </dl>
          <details><summary>Notes to trainer</summary><p className="cfetp-muted">{lesson.notes}</p></details>
        </section>
        <section>
          <h4>Training objectives</h4>
          <Steps items={lesson.objectives} />
        </section>
        <section>
          <h4>Task steps</h4>
          {lesson.steps.map((step, i) => <StepBlock key={i} step={step} />)}
        </section>
        {lesson.tables && <section>
          <h4>Reference tables</h4>
          {lesson.tables.map(table => <table key={table.title} className="cfetp-table cfetp-ref-table">
            <caption>{table.title}</caption>
            <thead><tr>{table.columns.map(column => <th scope="col" key={column}>{column}</th>)}</tr></thead>
            <tbody>{table.rows.map(row => <tr key={row[0]}>{row.map((cell, i) => (i === 0 ? <th scope="row" key={i}>{cell}</th> : <td key={i}>{cell}</td>))}</tr>)}</tbody>
          </table>)}
        </section>}
        {lesson.attachments && <section>
          <h4>Attachments</h4>
          {lesson.attachments.map(attachment => <details key={attachment.title} className="cfetp-attachment">
            <summary>{attachment.title}</summary>
            {attachment.sections.map(section => <div key={section.heading} className="cfetp-step">
              <h5>{section.heading}</h5>
              {section.intro && <p>{section.intro}</p>}
              {section.items.length > 0 && <Steps items={section.items} ordered={section.ordered} />}
            </div>)}
          </details>)}
        </section>}
        {lesson.exercises && <section>
          <h4>Exercise</h4>
          <ol>{lesson.exercises.map(item => <li key={item}>{item}</li>)}</ol>
        </section>}
        {lesson.checklist && <section>
          <h4>Task evaluation checklist</h4>
          <Checklist lesson={lesson} />
        </section>}
        <ReportIssue context={[['TTG lesson', `TTG ${lesson.ttg} · ${ttgByNumber[lesson.ttg].title}: ${lesson.title}`], ['Source', `"${ttgByNumber[lesson.ttg].file}", ${lesson.level} lesson, line items ${lesson.printed}, trainer guidance page ${lesson.page}`], ['Reviewed', TTG_REVIEWED]]}
          passages={[...lesson.steps.map((step, i) => step.heading || `Step ${i + 1}`), 'Training references', 'Exercise', 'Something else']} />
      </div>
    </details>
  );
}

// The TTG's own checklist: completed unassisted and without error, marked YES / NO / N/A.
function Checklist({ lesson }) {
  return <table className="cfetp-table cfetp-checklist-table">
    <caption className="cfetp-muted">Given all applicable materials, the trainee will complete the following items unassisted and without error. The scenario is the training assessment.</caption>
    <thead><tr><th scope="col">Item</th><th scope="col">YES</th><th scope="col">NO</th><th scope="col">N/A</th></tr></thead>
    <tbody>{lesson.checklist.flatMap(group => [
      <tr key={group.heading} className="cfetp-checklist-group"><th scope="rowgroup" colSpan={4}>{group.heading}</th></tr>,
      ...group.items.map(item => <tr key={`${group.heading}-${item}`}><td>{item}</td><td /><td /><td /></tr>),
    ])}</tbody>
  </table>;
}

function Markings({ task }) {
  const core = coreLevels(task.core);
  return <span className="cfetp-marks">
    {task.core && <span className={`cfetp-badge ${core.five ? 'cfetp-badge-core5' : 'cfetp-badge-core7'}`}>{task.core}</span>}
    {task.deploy && <span className="cfetp-badge">{task.deploy}</span>}
    {task.code && <span className="cfetp-badge cfetp-badge-course">3-lvl {task.code}</span>}
  </span>;
}

function TaskDetail({ task, inSession, onToggleSession, onOpenTtg }) {
  const lessons = lessonsForTask(task.id);
  const ttgs = ttgsForTask(task.id).filter(ttg => !ttg.verified);
  const utc = utcFor(task.id);
  return (
    <article className="cfetp-panel cfetp-detail" aria-labelledby="cfetp-task-title">
      <p className="cfetp-path">{task.competency.id}. {task.competency.title} › {task.sub.id} {task.sub.title} › {task.level.name}</p>
      <h3 id="cfetp-task-title">{task.id} {task.text}</h3>
      <Markings task={task} />
      <div className="cfetp-actions">
        <button type="button" className={inSession ? '' : 'cfetp-primary'} onClick={() => onToggleSession(task.id)}>{inSession ? 'Remove from session' : 'Add to training session'}</button>
      </div>

      <section>
        <h4>How to train it</h4>
        <TeachCard key={task.id} task={task} onOpenTtg={onOpenTtg} />
      </section>

      <section>
        <h4>What the markings mean</h4>
        <dl className="cfetp-explain">
          {explainTask(task).map(note => <div key={note.label}><dt>{note.label}</dt><dd>{note.text}</dd></div>)}
        </dl>
      </section>

      <section>
        <h4>Required behavior {task.match}</h4>
        <p className="cfetp-quote">{task.behavior}</p>
        <p className="cfetp-muted">{task.level.name} criteria · {task.level.criteria}</p>
      </section>

      <section>
        <h4>Task Training Guide</h4>
        {lessons.map(lesson => <div key={lesson.id} className="cfetp-lesson-link">
          <button type="button" className="cfetp-link" onClick={() => onOpenTtg(lesson.ttg, lesson.id)}>TTG {lesson.ttg} · {ttgByNumber[lesson.ttg].title}: {lesson.title}</button> <Verified />
          <p className="cfetp-muted">{lesson.level} lesson, TTG page {lesson.page}. Criterion objective: {lesson.outcome}</p>
          {lesson.numbering && <p className="cfetp-muted">{lesson.numbering}</p>}
        </div>)}
        {ttgs.length > 0 && <ul className="cfetp-links">
          {ttgs.map(ttg => <li key={ttg.n}><button type="button" className="cfetp-link" onClick={() => onOpenTtg(ttg.n)}>TTG {ttg.n} · {ttg.title}</button> <Unverified /></li>)}
        </ul>}
        {!lessons.length && !ttgs.length && <p className="cfetp-muted">{ttgsForTask(task.id).length ? 'The TTG for this sub-competency has been added, and none of its lessons lists this task.' : `Attachment 5 lists no TTG for ${task.sub.title}.`} Train from the technical references below and the required behavior above.</p>}
      </section>

      <section>
        <h4>UTC {UTC.code} requirement</h4>
        {utc ? <p>Listed in Attachment 4 for the {utc.levels.join(', ')}.{utc.note && <> <strong>Note:</strong> {utc.note}</>}</p>
          : <p className="cfetp-muted">Not listed in Attachment 4 for UTC {UTC.code}.</p>}
      </section>

      <details>
        <summary>Technical references for {task.sub.id} {task.sub.title} ({task.sub.references.length})</summary>
        <ul className="cfetp-refs">{task.sub.references.map(ref => <li key={ref}><PubRef text={ref} /></li>)}</ul>
        <p className="cfetp-muted">Supporting competencies: {task.sub.supporting.join(', ')}. CFETP page {task.sub.page}.</p>
      </details>
    </article>
  );
}

function StsView({ selected, onSelect, session, onToggleSession, onOpenTtg }) {
  const [query, setQuery] = useState('');
  const [sub, setSub] = useState('all');
  const [levelName, setLevelName] = useState('all');
  const [filters, setFilters] = useState([]);
  const results = useMemo(() => filterTasks({ query, filters, sub, levelName }), [query, filters, sub, levelName]);
  const task = taskById[selected];
  const toggle = id => setFilters(current => (current.includes(id) ? current.filter(item => item !== id) : [...current, id]));
  return (
    <div className="cfetp-split">
      <div className="cfetp-panel cfetp-browser">
        <label className="cfetp-field"><span>Search tasks</span>
          <input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Task number, words, or TTG" />
        </label>
        <div className="cfetp-row">
          <label className="cfetp-field"><span>Sub-competency</span>
            <select value={sub} onChange={event => setSub(event.target.value)}>
              <option value="all">All sub-competencies</option>
              {competencies.map(comp => <optgroup key={comp.id} label={`${comp.id}. ${comp.title}`}>
                {comp.subs.map(item => <option key={item.id} value={item.id}>{item.id} {item.title}</option>)}
              </optgroup>)}
            </select>
          </label>
          <label className="cfetp-field"><span>Proficiency level</span>
            <select value={levelName} onChange={event => setLevelName(event.target.value)}>
              <option value="all">All levels</option>
              {LEVELS.map(name => <option key={name} value={name}>{name}</option>)}
            </select>
          </label>
        </div>
        <div className="cfetp-chips" role="group" aria-label="Task filters">
          {FILTERS.map(([id, label]) => <button type="button" key={id} aria-pressed={filters.includes(id)} onClick={() => toggle(id)}>{label}</button>)}
        </div>
        <p className="cfetp-muted" role="status">{results.length} of {allTasks.length} tasks</p>
        <ul className="cfetp-results" aria-label="STS tasks">
          {results.map(item => (
            <li key={item.id}>
              <button type="button" aria-current={item.id === selected ? 'true' : undefined} onClick={() => onSelect(item.id)}>
                <span className="cfetp-result-id">{item.id}</span>
                <span className="cfetp-result-text">{item.text}</span>
                <Markings task={item} />
              </button>
            </li>
          ))}
        </ul>
      </div>
      {task ? <TaskDetail task={task} inSession={session.includes(task.id)} onToggleSession={onToggleSession} onOpenTtg={onOpenTtg} />
        : <div className="cfetp-panel cfetp-empty"><h3>Pick a task</h3><p className="cfetp-muted">Choose an STS task to see its markings in plain language, the behavior it supports, its TTG, and its references.</p></div>}
    </div>
  );
}

function TtgView({ selected, lessonId, onSelect, onOpenTask, session, onAddTasks }) {
  const ttg = ttgByNumber[selected];
  const tasks = ttg ? ttg.tasks.map(id => taskById[id]).filter(Boolean) : [];
  const covered = new Set(ttgGroups.map(group => group.sub));
  const uncovered = competencies.flatMap(comp => comp.subs).filter(item => !covered.has(item.id));
  useEffect(() => {
    if (lessonId) document.getElementById(`cfetp-lesson-${lessonId}`)?.scrollIntoView?.({ block: 'start' });
  }, [lessonId, selected]);
  return (
    <div className="cfetp-split">
      <div className="cfetp-panel cfetp-browser">
        <p className="cfetp-muted">Attachment 5 lists 33 TTGs. They are mandatory and are posted on the <a href={TTG_PORTAL} target="_blank" rel="noreferrer">HAF Traffic Management SharePoint</a> (CAC required). Use the official paper-based TTG when training.</p>
        {ttgGroups.map(group => (
          <section key={group.title} className="cfetp-ttg-group">
            <h4>{group.title}</h4>
            <ul className="cfetp-results">
              {group.ttgs.map(item => <li key={item.n}><button type="button" aria-current={item.n === selected ? 'true' : undefined} onClick={() => onSelect(item.n)}>
                <span className="cfetp-result-id">TTG {item.n}</span><span className="cfetp-result-text">{item.title}</span>
                {ttgByNumber[item.n].verified && <span className="cfetp-marks"><Verified /></span>}
              </button></li>)}
            </ul>
          </section>
        ))}
        <p className="cfetp-muted">No TTG is listed for: {uncovered.map(item => `${item.id} ${item.title}`).join('; ')}.</p>
      </div>
      {ttg ? <article className="cfetp-panel cfetp-detail" aria-labelledby="cfetp-ttg-title">
        <p className="cfetp-path">Attachment 5 › {ttg.group}</p>
        <h3 id="cfetp-ttg-title">TTG {ttg.n} · {ttg.title}</h3>
        {ttg.verified ? <p className="cfetp-muted"><Verified /> Transcribed from "{ttg.file}" (CFETP line items {ttg.printed}); last reviewed against the file {TTG_REVIEWED}. TTGs carry no edition date, so check the SharePoint for a newer version before training.</p>
          : <div className="cfetp-callout">
            <Unverified />
            <p>This TTG has not been added yet. The tasks below are a suggested match from the TTG title and the STS behaviors. Confirm them against the official TTG before relying on them.</p>
          </div>}
        <div className="cfetp-actions">
          <button type="button" className="cfetp-primary" onClick={() => onAddTasks(ttg.tasks)} disabled={ttg.tasks.every(id => session.includes(id))}>Add these tasks to training session</button>
          <a className="cfetp-button" href={TTG_PORTAL} target="_blank" rel="noreferrer">Open TTG library on SharePoint</a>
        </div>
        {ttg.verified && <section className="cfetp-lessons" aria-label={`Lessons in TTG ${ttg.n}`}>
          <h4>Lessons ({ttg.lessons.length})</h4>
          {ttg.lessons.map(lesson => <Lesson key={lesson.id} lesson={lesson} open={lesson.id === lessonId} onOpenTask={onOpenTask} />)}
        </section>}
        <h4>STS tasks covered</h4>
        <ul className="cfetp-results" aria-label={`STS tasks for TTG ${ttg.n}`}>
          {tasks.map(task => <li key={task.id}><button type="button" onClick={() => onOpenTask(task.id)}>
            <span className="cfetp-result-id">{task.id}</span><span className="cfetp-result-text">{task.text}</span><Markings task={task} />
          </button></li>)}
        </ul>
      </article> : <div className="cfetp-panel cfetp-empty"><h3>Pick a TTG</h3><p className="cfetp-muted">Choose a Task Training Guide to see the STS tasks it likely supports.</p></div>}
    </div>
  );
}

// One task in the plan: the STS line, and its "What to teach" card on demand.
function PlanTask({ task, onOpenTask, onOpenTtg }) {
  const [open, setOpen] = useState(false);
  return <li className="cfetp-plan-task" aria-label={`${task.id} ${task.text}`}>
    <div className="cfetp-plan-row">
      <button type="button" className="cfetp-link cfetp-result-id" onClick={() => onOpenTask(task.id)}>{task.id}</button>
      <span className="cfetp-result-text">{task.text} <Markings task={task} /></span>
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? 'Hide' : 'How to train it'}</button>
    </div>
    {open && <TeachCard task={task} onOpenTtg={onOpenTtg} />}
  </li>;
}

function PlanSection({ title, intro, tasks, session, onAddTasks, onOpenTask, onOpenTtg, groupBy }) {
  const groups = [...tasks.reduce((map, task) => map.set(groupBy(task), [...(map.get(groupBy(task)) || []), task]), new Map())];
  return <section className="cfetp-panel" aria-label={title}>
    <div className="cfetp-plan-head">
      <h3>{title} <span className="cfetp-count">{tasks.length}</span></h3>
      <button type="button" onClick={() => onAddTasks(tasks.map(task => task.id))} disabled={tasks.every(task => session.includes(task.id))}>Add all to training session</button>
    </div>
    <p className="cfetp-muted">{intro}</p>
    {groups.map(([label, items]) => <div key={label}>
      <h4>{label}</h4>
      <ul className="cfetp-plan-list">{items.map(task => <PlanTask key={task.id} task={task} onOpenTask={onOpenTask} onOpenTtg={onOpenTtg} />)}</ul>
    </div>)}
  </section>;
}

// Where to pick up: the task in progress and its unfinished phase, prerequisite gaps, and the next
// task from the plan.
function ContinuePanel({ choices, onOpenTask }) {
  const progress = useProgress();
  const { current, next, documentedCount } = useMemo(() => continueTraining(progress, choices), [progress, choices]);
  const open = (id, phase) => { resumeAt(id, phase); onOpenTask(id); };
  const gapList = gaps => gaps.length > 0 && <details className="cfetp-gaps"><summary>{gaps.length} prerequisite task{gaps.length === 1 ? '' : 's'} not marked documented here</summary>
    <ul>{gaps.map(task => <li key={task.id}><button type="button" className="cfetp-link" onClick={() => open(task.id, 0)}>{task.id}</button> {task.text}</li>)}</ul>
    <p className="cfetp-muted cfetp-small">Confirm in {RECORD_SYSTEM}; tasks trained before this app was used will not show here.</p></details>;
  return <section className="cfetp-panel cfetp-continue" aria-label="Continue training">
    <h3>Continue training</h3>
    {current ? <div className="cfetp-continue-item">
      <span className="cfetp-eyebrow">In progress</span>
      <strong>{current.task.id} {current.task.text}</strong>
      <span className="cfetp-muted">Next phase: {PHASES[current.phase]}. Last worked on {new Date(current.updated).toLocaleDateString()}.</span>
      {gapList(current.gaps)}
      <button type="button" className="cfetp-primary" onClick={() => open(current.task.id, current.phase)}>Resume at {PHASES[current.phase]}</button>
    </div> : <p className="cfetp-muted">No task in progress. Open "How to train it" on any task below to start.</p>}
    {next ? <div className="cfetp-continue-item">
      <span className="cfetp-eyebrow">{current ? 'Then' : 'Start with'}</span>
      <strong>{next.task.id} {next.task.text}</strong>
      <span className="cfetp-muted">{next.task.sub.title} · {next.task.level.name}{next.task.core ? ` · core ${next.task.core}` : ''}. The first task in your plan that is not marked documented here.</span>
      {gapList(next.gaps)}
      <button type="button" onClick={() => open(next.task.id, 0)}>Start {next.task.id}</button>
    </div> : <p className="cfetp-muted">Pick an upgrade status or work centers to get a suggested next task.</p>}
    {documentedCount > 0 && <p className="cfetp-muted cfetp-small">{documentedCount} task{documentedCount === 1 ? '' : 's'} marked documented in this browser.</p>}
  </section>;
}

// "What should I train my Airman on?" The core tasks for their upgrade, the tasks of the work
// centers they work in, and their deployment tasks, each with what to teach.
function PlanView({ session, onAddTasks, onOpenTask, onOpenTtg }) {
  const [choices, setChoices] = useState(() => ({ goal: '5', component: 'regaf', subs: [], deploying: false, ...readPlan() }));
  useEffect(() => writePlan(choices), [choices]);
  const set = change => setChoices(current => ({ ...current, ...change }));
  const toggleSub = id => set({ subs: choices.subs.includes(id) ? choices.subs.filter(item => item !== id) : [...choices.subs, id] });
  const plan = useMemo(() => buildPlan(choices), [choices]);
  const goal = GOALS.find(item => item.id === choices.goal) || GOALS[0];
  const otherSubs = competencies.flatMap(comp => comp.subs).filter(item => !WORK_CENTERS.some(center => center.sub === item.id));
  const bySub = task => `${task.sub.id} ${task.sub.title}`;
  const shared = { session, onAddTasks, onOpenTask, onOpenTtg };
  return (
    <div className="cfetp-split cfetp-plan">
      <div className="cfetp-panel cfetp-browser">
        <h3>Tell us about your Airman</h3>
        <fieldset className="cfetp-fieldset">
          <legend>Upgrade status</legend>
          {GOALS.map(item => <label key={item.id} className="cfetp-check"><input type="radio" name="cfetp-goal" checked={choices.goal === item.id} onChange={() => set({ goal: item.id })} /> {item.label}</label>)}
        </fieldset>
        <label className="cfetp-field"><span>Component</span>
          <select value={choices.component} onChange={event => set({ component: event.target.value })}>
            <option value="regaf">Regular Air Force</option>
            <option value="arc">Air National Guard / Air Force Reserve</option>
          </select>
        </label>
        <fieldset className="cfetp-fieldset">
          <legend>Work centers they work in</legend>
          {WORK_CENTERS.map(center => <label key={center.sub} className="cfetp-check"><input type="checkbox" checked={choices.subs.includes(center.sub)} onChange={() => toggleSub(center.sub)} /> {center.sub} {center.title}</label>)}
          <details>
            <summary>Other areas they are responsible for</summary>
            {otherSubs.map(item => <label key={item.id} className="cfetp-check"><input type="checkbox" checked={choices.subs.includes(item.id)} onChange={() => toggleSub(item.id)} /> {item.id} {item.title}</label>)}
          </details>
        </fieldset>
        <label className="cfetp-check"><input type="checkbox" checked={choices.deploying} onChange={event => set({ deploying: event.target.checked })} /> Fills a UTC {UTC.code} deployment position</label>
        <p className="cfetp-muted">The supervisor decides which tasks go on the Airman's Master Task List. Use this as a starting point, then confirm against the CFETP and your local training plan.</p>
      </div>

      <div className="cfetp-plan-results">
        <ContinuePanel choices={choices} onOpenTask={onOpenTask} />
        {goal.core ? <PlanSection title={`Core tasks for the ${goal.core === 'five' ? '5' : '7'}-level`} groupBy={bySub} tasks={plan.coreTasks} {...shared}
          intro={`Every one of these must be certified before the ${goal.core === 'five' ? '5' : '7'}-skill level is awarded, whatever the work center. Core tasks need third-party certification (Part I, paras 11.2.1.3 and 11.3.1.3; Part II, para 2.3).${plan.reserveOptionalDropped ? ` ${plan.reserveOptionalDropped} core task${plan.reserveOptionalDropped === 1 ? ' is' : 's are'} marked R, optional for ANG and AFRC, and left off (Part II, para 2.2).` : ''}`} />
          : <div className="cfetp-panel"><h3>No upgrade core tasks</h3><p className="cfetp-muted">A qualified 7-level has no further core tasks. Train the duty position tasks below.</p></div>}
        {choices.subs.length > 0 ? <PlanSection title="Work center tasks" groupBy={task => `${task.sub.id} ${task.sub.title} · ${task.level.name}`} tasks={plan.dutyTasks} {...shared}
          intro="The other tasks for the work centers you picked, Basic first. Core tasks already listed above are not repeated. Levels are not tied to rank or position (Part I, para 7.7), so train the levels the job needs." />
          : <div className="cfetp-panel cfetp-empty"><h3>Pick their work centers</h3><p className="cfetp-muted">Choose the work centers your Airman works in to see the tasks those jobs need.</p></div>}
        {choices.deploying && <PlanSection title={`UTC ${UTC.code} tasks for the ${plan.current}-level`} groupBy={bySub} tasks={plan.deployTasks} {...shared}
          intro={`Attachment 4 lists these for the ${plan.current}-level in UTC ${UTC.code}. Tasks already listed above are not repeated.`} />}
      </div>
    </div>
  );
}

const SEQUENCE = [
  `Review the trainee's training record in ${RECORD_SYSTEM} and confirm the task is on the trainee's Master Task List.`,
  'Obtain the official TTG and the technical references; read the current edition before the session.',
  'Explain the task, the required behavior it supports, and the standard the trainee will be held to.',
  'Demonstrate the task using the TTG task performance checklist.',
  'Have the trainee perform the task with coaching; repeat until the trainee works without help.',
  'Evaluate the trainee against the Go/No-Go standard below.',
  `Document start and completion dates and trainee/trainer initials in ${RECORD_SYSTEM}. Core tasks also need the certifier.`,
];

function SessionView({ session, onRemove, onClear, onOpenTask }) {
  const sheet = useMemo(() => buildWorksheet(session), [session]);
  const [picked, setPicked] = useState('');
  if (!session.length) return <div className="cfetp-panel cfetp-empty">
    <h3>No tasks in this session yet</h3>
    <p className="cfetp-muted">Add tasks from <strong>STS Tasks</strong>, or add a whole TTG from the <strong>TTG Library</strong>. The builder turns them into a printable preparation worksheet.</p>
  </div>;
  return (
    <div className="cfetp-sheet">
      <div className="cfetp-panel cfetp-no-print">
        <div className="cfetp-actions">
          <button type="button" className="cfetp-primary" onClick={() => window.print()}>Print worksheet</button>
          <button type="button" onClick={onClear}>Clear session</button>
        </div>
        <p className="cfetp-muted">This worksheet is a preparation aid. It is not a training record; document training in {RECORD_SYSTEM}, the authorized system of record (Part II, para 2.3).</p>
        <label className="cfetp-field"><span>Remove a task</span>
          <select value={picked} onChange={event => { onRemove(event.target.value); setPicked(''); }}>
            <option value="">Choose a task to remove…</option>
            {sheet.tasks.map(task => <option key={task.id} value={task.id}>{task.id} {task.text}</option>)}
          </select>
        </label>
      </div>

      <article className="cfetp-panel cfetp-worksheet" aria-labelledby="cfetp-sheet-title">
        <h3 id="cfetp-sheet-title">Training preparation worksheet</h3>
        <p className="cfetp-muted">{CFETP_EDITION} · {sheet.tasks.length} task{sheet.tasks.length === 1 ? '' : 's'}</p>
        <div className="cfetp-blanks"><span>Trainee</span><span>Trainer</span><span>Certifier</span><span>Date</span></div>

        <section>
          <h4>STS tasks</h4>
          <table className="cfetp-table">
            <thead><tr><th scope="col">STS</th><th scope="col">Task</th><th scope="col">Markings</th><th scope="col">TTG</th></tr></thead>
            <tbody>{sheet.tasks.map(task => <tr key={task.id}>
              <td><button type="button" className="cfetp-link" onClick={() => onOpenTask(task.id)}>{task.id}</button></td>
              <td>{task.text}</td>
              <td>{[task.core, task.deploy, task.code && `3-lvl ${task.code}`].filter(Boolean).join(' ') || '—'}</td>
              <td>{ttgsForTask(task.id).map(ttg => `TTG ${ttg.n}`).join(', ') || 'None listed'}</td>
            </tr>)}</tbody>
          </table>
        </section>

        <section>
          <h4>Task Training Guides to obtain</h4>
          {sheet.ttgs.length ? <ul>{sheet.ttgs.map(ttg => <li key={ttg.n}>TTG {ttg.n} · {ttg.title}{ttg.verified ? `: ${ttg.lessons.filter(lesson => sheet.lessons.includes(lesson)).map(lesson => `${lesson.level} lesson, page ${lesson.page}`).join('; ')}` : ' (suggested, unverified)'}</li>)}</ul>
            : <p className="cfetp-muted">Attachment 5 lists no TTG for these tasks.</p>}
        </section>

        <section>
          <h4>Required behaviors</h4>
          <ul>{sheet.behaviors.map(item => <li key={`${item.sub.id}-${item.level}-${item.match}`}><strong>{item.sub.id} {item.sub.title}, {item.level} {item.match}:</strong> {item.text}</li>)}</ul>
        </section>

        {sheet.ttgReferences.length > 0 && <section>
          <h4>TTG training references</h4>
          <ul className="cfetp-refs cfetp-columns">{sheet.ttgReferences.map(ref => <li key={ref}>{ref}</li>)}</ul>
        </section>}

        <section>
          <h4>STS technical references</h4>
          <ul className="cfetp-refs cfetp-columns">{sheet.references.map(ref => <li key={ref}>{ref}</li>)}</ul>
        </section>

        <section>
          <h4>Suggested instructional sequence</h4>
          <ol>{SEQUENCE.map(step => <li key={step}>{step}</li>)}</ol>
          {sheet.thirdParty.length > 0 && <p><strong>Third-party certification:</strong> {sheet.thirdParty.map(task => task.id).join(', ')} {sheet.thirdParty.length === 1 ? 'is a core task' : 'are core tasks'}. A task certifier other than the trainer evaluates {sheet.thirdParty.length === 1 ? 'it' : 'them'} for upgrade (Part II, para 2.3).</p>}
        </section>

        {sheet.lessons.map(lesson => <section key={lesson.id} className="cfetp-sheet-lesson">
          <h4>TTG {lesson.ttg} lesson: {lesson.title}</h4>
          <p className="cfetp-muted">{lesson.level} · STS {lesson.tasks.join(', ')} · Criterion objective: {lesson.outcome}</p>
          {lesson.exercises && <><h5>Exercise</h5><ol>{lesson.exercises.map(item => <li key={item}>{item}</li>)}</ol></>}
          {lesson.checklist && <><h5>Task evaluation checklist</h5><Checklist lesson={lesson} /></>}
        </section>)}

        <section>
          <h4>Go/No-Go assessment</h4>
          <p className="cfetp-muted">Go means the trainee can perform the task without assistance and meets local demands for accuracy, timeliness, and correct use of procedures (Part II, para 2.6.1.2).</p>
          <table className="cfetp-table cfetp-gonogo">
            <thead><tr><th scope="col">STS</th><th scope="col">Without assistance</th><th scope="col">Accurate</th><th scope="col">Timely</th><th scope="col">Correct procedures</th><th scope="col">Go / No-Go</th></tr></thead>
            <tbody>{sheet.tasks.map(task => <tr key={task.id}>
              <th scope="row">{task.id}</th>
              {['assist', 'accurate', 'timely', 'procedure'].map(check => <td key={check}><input type="checkbox" aria-label={`${task.id} ${check}`} /></td>)}
              <td className="cfetp-blank-cell">Go&nbsp;/&nbsp;No-Go</td>
            </tr>)}</tbody>
          </table>
        </section>
      </article>
    </div>
  );
}

// All STS technical references with where each stands today.
function ReferenceList() {
  const [query, setQuery] = useState('');
  const [onlyChanged, setOnlyChanged] = useState(false);
  const rows = allReferences.map(ref => ({ ...ref, status: publicationStatus(ref.text) }));
  const counts = rows.reduce((sum, row) => ({ ...sum, [row.status?.status || 'unchecked']: (sum[row.status?.status || 'unchecked'] || 0) + 1 }), {});
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const shown = rows.filter(row => (!onlyChanged || (row.status && row.status.status !== 'current'))
    && words.every(word => `${row.text} ${row.subs.join(' ')}`.toLowerCase().includes(word)));
  return (
    <section className="cfetp-panel" aria-label="STS references">
      <h3>STS references ({rows.length})</h3>
      <p className="cfetp-muted">Every technical reference the STS lists, checked {CHECKED}: {counts.current || 0} current, {counts.replaced || 0} replaced, {counts.wrong || 0} with a number error, {counts.confirm || 0} to confirm, {counts.unchecked || 0} not checked. DTR chapters were read on the USTRANSCOM site; AF and DoD issuances were checked by web search, because e-Publishing and the DoD Issuances site block automated access. Confirm on e-Publishing before you rely on an edition.</p>
      <div className="cfetp-row">
        <label className="cfetp-field"><span>Search references</span>
          <input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Number, title, or sub-competency" />
        </label>
        <label className="cfetp-check cfetp-check-inline"><input type="checkbox" checked={onlyChanged} onChange={event => setOnlyChanged(event.target.checked)} /> Only changed or to confirm</label>
      </div>
      <table className="cfetp-table">
        <thead><tr><th scope="col">Reference (as the STS prints it)</th><th scope="col">Used in</th><th scope="col">Status</th></tr></thead>
        <tbody>{shown.map(row => <tr key={row.text}>
          <td>{row.text}</td>
          <td>{row.subs.join(', ')}</td>
          <td>{row.status
            ? <><span className={`cfetp-badge cfetp-pub-${row.status.status}`}>{STATUS_LABELS[row.status.status]}</span> {row.status.current}{row.status.note && <span className="cfetp-pub-note"> {row.status.note}</span>} <SourceLink status={row.status} /></>
            : <span className="cfetp-muted">Not checked</span>}</td>
        </tr>)}</tbody>
      </table>
    </section>
  );
}

function TrainerGuide() {
  const terms = [
    ['5^ / 7^', 'Core task for 5-level or 7-level upgrade. "5/7^" and "5,7^" are core for both. Core tasks are the minimum tasks a trainee must be certified on for the next skill level (Part I, paras 7.4-7.5).'],
    ['5/R^ / 7/R^', 'Core for RegAF; optional for ANG and AFRC (Part II, para 2.2).'],
    ['*', 'Deployment task (Part II, para 2.2).'],
    ['~', 'CBRN task (Part II, para 2.2).'],
    ['+', 'SEI task. No task in the current STS carries this marking.'],
    ['Behavior match', 'The number of the required behavior, in the level header, that the task builds toward (Part II, para 2.1).'],
    ['K / P / pk', 'Training given in the 3-level course: knowledge, performance, or performance knowledge (Attachment 2).'],
    ['- / X', 'No training in the course or CDC / training required but not provided due to resource limits (Attachment 2).'],
    ['(W)', 'Taught at the 3-level course when the wartime course is activated (Part II, para 2.4).'],
    ['Go / No-Go', 'Go: performs the task without assistance and meets local demands for accuracy, timeliness, and correct procedures (Part II, para 2.6.1.2).'],
  ];
  const levels = [
    ['Basic', 'New practices, concepts, and theories of all workplace elements; is a credible resource in this area.'],
    ['Intermediate', 'New practices of all workplace elements.'],
    ['Advanced', 'Established practices of all workplace elements.'],
    ['Expert', 'Established practice with some workplace elements.'],
  ];
  return (
    <div className="cfetp-guide">
      <section className="cfetp-panel">
        <h3>Trainer preparation checklist</h3>
        <ol className="cfetp-checklist">
          <li>Identify the trainee's assigned STS task.</li>
          <li>Review the required behaviors and performance standard.</li>
          <li>Obtain and review the applicable official TTG.</li>
          <li>Conduct training and observe task performance.</li>
          <li>Complete required documentation in {RECORD_SYSTEM}.</li>
        </ol>
      </section>

      <section className="cfetp-panel">
        <h3>Reading the STS</h3>
        <dl className="cfetp-explain">{terms.map(([term, text]) => <div key={term}><dt>{term}</dt><dd>{text}</dd></div>)}</dl>
        <details>
          <summary>Proficiency levels (Table 4, depth of knowledge)</summary>
          <dl className="cfetp-explain">{levels.map(([term, text]) => <div key={term}><dt>{term}</dt><dd>{text}</dd></div>)}</dl>
          <p className="cfetp-muted">Levels are not tied to a rank or position (Part I, para 7.7). Each level header states its criteria, such as reach of influence or scope.</p>
        </details>
      </section>

      <section className="cfetp-panel">
        <h3>Upgrade requirements</h3>
        <table className="cfetp-table">
          <thead><tr><th scope="col">Skill level</th><th scope="col">Requirement</th><th scope="col">Source</th></tr></thead>
          <tbody>
            <tr><th scope="row">3 (2T031)</th><td>Complete Traffic Management Operations Apprentice Course LCABP2T031 00AE.</td><td>Part I, 11.1.1.3</td></tr>
            <tr><th scope="row">5 (2T051)</th><td>12 months OJT (9 for retrainees), all 5-level core tasks certified, supervisor recommendation, commander approval. No CDCs.</td><td>Part I, 11.2.1.3; 7.4</td></tr>
            <tr><th scope="row">7 (2T071)</th><td>Start on selection to SSgt. 12 months OJT (6 for retrainees), all 7-level core tasks certified, supervisor recommendation, commander approval. No CDCs.</td><td>Part I, 11.3.1.3; 11.3.3; 7.5</td></tr>
            <tr><th scope="row">9 (2T091)</th><td>Possess 2T071, at least SMSgt, meet DAFECD requirements, supervisor recommendation, commander approval.</td><td>Part I, 6.4</td></tr>
          </tbody>
        </table>
      </section>

      <ReferenceList />

      <section className="cfetp-panel">
        <h3>Trainers, certifiers, and records</h3>
        <ul>
          <li><strong>Trainer:</strong> must attend the DAF Trainer Course (DAFTC) and be qualified to perform the task being trained (Part I, para 9 table).</li>
          <li><strong>Certifier:</strong> at least a SSgt (E-5) with a 5-skill level or civilian equivalent, capable of evaluating the task, and DAFTC complete (Part I, para 9 table).</li>
          <li><strong>Documentation:</strong> record training in {RECORD_SYSTEM}, the current system of record. Show a start date, completion date, and trainee, trainer, and certifier initials (when required). Third-party certification is required on core tasks for upgrade (Part II, para 2.3).</li>
          <li><strong>TTGs:</strong> mandatory. Use the paper-based TTG while training; the trainee, trainer, and certifier (if applicable) document completion in the system of record, currently {RECORD_SYSTEM} (Attachment 5).</li>
          <li><strong>Decertification:</strong> line through or delete the prior certification and enter the reason on the DAF Form 623A (Part II, para 2.6.1.1).</li>
          <li><strong>Transcribing:</strong> move records to a revised CFETP within 120 days (240 for ARC) of its publication date; it is not a reevaluation of training (Part II, para 2.6.1.3).</li>
        </ul>
      </section>
    </div>
  );
}

export default function CfetpCenter() {
  const [view, setView] = useState('plan');
  const [taskId, setTaskId] = useState(null);
  const [ttgN, setTtgN] = useState(null);
  const [lessonId, setLessonId] = useState(null);
  const [session, setSession] = useState(readSession);
  useEffect(() => writeSession(session), [session]);
  const openTask = id => { setTaskId(id); setView('sts'); };
  const openTtg = (n, lesson = null) => { setTtgN(n); setLessonId(lesson); setView('ttg'); };
  const toggleSession = id => setSession(current => (current.includes(id) ? current.filter(item => item !== id) : [...current, id]));
  const addTasks = ids => setSession(current => [...current, ...ids.filter(id => !current.includes(id))]);

  return (
    <main className="cfetp">
      <div className="cfetp-workspace">
        <header className="cfetp-header">
          <div>
            <span className="cfetp-eyebrow">AFSC 2T0X1 · 19 February 2026</span>
            <h2>CFETP Training Center</h2>
            <p className="cfetp-muted">A reference for the STS and the Task Training Guides. It does not replace the CFETP, the official TTGs, or the training record.</p>
          </div>
        </header>
        <div className="cfetp-views" role="tablist" aria-label="CFETP views">
          {VIEWS.map(([id, label]) => <button type="button" role="tab" key={id} aria-selected={view === id} onClick={() => setView(id)}>
            {label}{id === 'session' && session.length > 0 && <span className="cfetp-count"> {session.length}</span>}
          </button>)}
        </div>
        {view === 'plan' && <PlanView session={session} onAddTasks={addTasks} onOpenTask={openTask} onOpenTtg={openTtg} />}
        {view === 'sts' && <StsView selected={taskId} onSelect={setTaskId} session={session} onToggleSession={toggleSession} onOpenTtg={openTtg} />}
        {view === 'ttg' && <TtgView selected={ttgN} lessonId={lessonId} onSelect={n => openTtg(n)} onOpenTask={openTask} session={session} onAddTasks={addTasks} />}
        {view === 'session' && <SessionView session={session} onRemove={id => id && toggleSession(id)} onClear={() => setSession([])} onOpenTask={openTask} />}
        {view === 'guide' && <TrainerGuide />}
      </div>
    </main>
  );
}
