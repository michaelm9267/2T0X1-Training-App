import React, { useState } from 'react';
import { CFETP_EDITION } from './stsData';
import { TTG_PORTAL, TTG_REVIEWED } from './ttgData';
import { ttgByNumber } from './cfetpLogic';
import { MATCH_LABELS, isHandsOn, nextLevelFor, startingPoint, stepTexts, trainingPlanFor } from './teaching';
import { CHECKED_ON } from './publications';
import { FICTITIOUS, scenariosFor } from './scenarios';
import { GO_CRITERIA, PHASES, RATINGS, ROUNDS, evaluationFor, phaseStatus, stepNamesFor, useTaskProgress } from './progress';
import { PubRef, PubUpdates, RECORD_SYSTEM, ReportIssue, StepBlock, pubUpdates } from './parts';

function Phase({ n, title, children }) {
  return <section className="cfetp-phase" aria-label={`Step ${n}: ${title}`}>
    <h5 className="cfetp-phase-title"><span className="cfetp-phase-n">{n}</span>{title}</h5>
    {children}
  </section>;
}

function Tick({ id, done, toggle, children }) {
  return <label className="cfetp-tick"><input type="checkbox" checked={Boolean(done[id])} onChange={() => toggle(id)} /> <span>{children}</span></label>;
}

// A sample document: a labelled form extract, stamped as fictitious training data.
function SampleDocument({ doc }) {
  return <table className="cfetp-table cfetp-sample-doc">
    <caption>{doc.title} <span className="cfetp-badge">Training sample</span></caption>
    <tbody>{doc.rows.map(([field, value]) => <tr key={field}><th scope="row">{field}</th><td>{value}</td></tr>)}</tbody>
  </table>;
}

// A ready-to-run scenario. The trainee's part shows by default, so the trainer can share the
// screen; the evaluator's answer guide opens on request.
function ScenarioCard({ scenario, open }) {
  const [answers, setAnswers] = useState(false);
  return <details className="cfetp-scenario" open={open}>
    <summary><strong>{scenario.title}</strong> <span className="cfetp-muted">· STS {scenario.tasks.join(', ')}</span></summary>
    <div className="cfetp-scenario-body">
      <h6>Before the session</h6>
      <ul>{scenario.setup.map(item => <li key={item}>{item}</li>)}</ul>
      <h6>Tell the trainee</h6>
      <p className="cfetp-quote">{scenario.situation}</p>
      <h6>Sample documents</h6>
      <p className="cfetp-muted cfetp-small">{FICTITIOUS}</p>
      {scenario.documents.map(doc => <SampleDocument key={doc.title} doc={doc} />)}
      <button type="button" aria-expanded={answers} onClick={() => setAnswers(!answers)}>{answers ? 'Hide evaluator answer guide' : 'Show evaluator answer guide'}</button>
      {answers && <div className="cfetp-answer-guide" role="region" aria-label={`Answer guide: ${scenario.title}`}>
        <h6>Planted discrepancies</h6>
        <ul>{scenario.discrepancies.map(item => <li key={item.where}><strong>{item.where}:</strong> {item.what}</li>)}</ul>
        <h6>Expected actions</h6>
        <ol>{scenario.expected.map(item => <li key={item.action}>{item.action} <span className="cfetp-source">({item.source})</span></li>)}</ol>
        <h6>Questions and answers</h6>
        <dl className="cfetp-qa">{scenario.questions.map(item => <div key={item.q}><dt>{item.q}</dt><dd>{item.a} <span className="cfetp-source">({item.source})</span></dd></div>)}</dl>
      </div>}
    </div>
  </details>;
}

// For tasks with no written scenario: a scaffold built from the task's own TTG steps.
function ScenarioBuilder({ stepNames }) {
  return <details className="cfetp-scenario">
    <summary><strong>Build a scenario for this task</strong></summary>
    <div className="cfetp-scenario-body">
      <p className="cfetp-muted">No ready-made scenario covers this task yet. Use real paperwork from your section with the identifying details removed, then plant one error for each step below. Write down the expected action as you plant it; that becomes your answer guide.</p>
      <table className="cfetp-table">
        <thead><tr><th scope="col">TTG step</th><th scope="col">Error to plant</th><th scope="col">Expected action</th></tr></thead>
        <tbody>{stepNames.map(name => <tr key={name}><td>{name}</td><td className="cfetp-blank-cell" /><td className="cfetp-blank-cell" /></tr>)}</tbody>
      </table>
    </div>
  </details>;
}

// One step's rating and observation in the evaluation.
function RateStep({ index, name, done, set }) {
  const rating = done[`rate:${index}`];
  return <div className="cfetp-rate" role="group" aria-label={`Rating for ${name}`}>
    <span className="cfetp-rate-name">{name}</span>
    <div className="cfetp-rate-options">
      {RATINGS.map(([id, label]) => <button type="button" key={id} className={`cfetp-rate-${id}`} aria-pressed={rating === id} onClick={() => set(`rate:${index}`, rating === id ? null : id)}>{label}</button>)}
    </div>
    <input type="text" aria-label={`Observation for ${name}`} placeholder="What you saw (optional)" value={done[`note:${index}`] || ''} onChange={event => set(`note:${index}`, event.target.value)} />
  </div>;
}

function EvaluationResult({ evaluation, isCore, onPractice }) {
  const { evaluated, isGo, reteach, repractice, unrated, criteriaMissed, scenarios } = evaluation;
  if (!evaluated) return <div className="cfetp-result" role="status">Rate each step and tick the Go criteria to see the result.</div>;
  if (isGo) return <div className="cfetp-result cfetp-result-go" role="status"><strong>Go.</strong> {isCore ? 'Core task: a certifier other than you evaluates it before upgrade sign-off (Part II, para 2.3).' : 'Ready to document.'}</div>;
  const withNote = step => (step.note ? `${step.name} (${step.note})` : step.name);
  return <div className="cfetp-result" role="status">
    <strong>Not a Go yet.</strong>
    <ul>
      {reteach.length > 0 && <li><strong>Re-teach:</strong> {reteach.map(withNote).join('; ')}. Show it again, then run a Guided round.</li>}
      {repractice.length > 0 && <li><strong>Practice more:</strong> {repractice.map(withNote).join('; ')}. Run Coached, then Solo rounds until no prompts are needed.</li>}
      {criteriaMissed.length > 0 && <li><strong>Standard not met:</strong> {criteriaMissed.map(item => item.label).join(', ')}.</li>}
      {unrated.length > 0 && <li><strong>Not rated yet:</strong> {unrated.map(step => step.name).join('; ')}.</li>}
    </ul>
    {scenarios.length > 0 && <p>Practice the missed steps with: {scenarios.map((scenario, i) => <React.Fragment key={scenario.id}>{i > 0 && ', '}<button type="button" className="cfetp-link" onClick={() => onPractice(scenario.id)}>{scenario.title}</button></React.Fragment>)}.</p>}
    <p className="cfetp-muted">Then evaluate again; the TTG calls this remedial training.</p>
  </div>;
}

// Where each part of this walkthrough comes from, and how to report a problem with it.
function SourceTrail({ task, lesson, steps, matches }) {
  const ttg = lesson && ttgByNumber[lesson.ttg];
  const context = [
    ['STS task', `${task.id} ${task.text}`],
    ['STS source', `${CFETP_EDITION}, Attachment 3, CFETP page ${task.sub.page}`],
    ...(lesson ? [['TTG', `TTG ${lesson.ttg} · ${ttg.title}, file "${ttg.file}"`], ['TTG lesson', `${lesson.level} lesson "${lesson.title}", line items ${lesson.printed}, trainer guidance page ${lesson.page}`]] : []),
  ];
  return <details className="cfetp-trail">
    <summary>Where this comes from</summary>
    <dl className="cfetp-explain">
      {context.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
      {lesson && <div><dt>Reviewed</dt><dd>Transcription last reviewed against the TTG file {TTG_REVIEWED}. TTGs carry no edition date; check the <a href={TTG_PORTAL} target="_blank" rel="noreferrer">TTG SharePoint</a> (CAC) for a newer version.</dd></div>}
      <div><dt>Publications</dt><dd>Checked {CHECKED_ON}. Links open the current edition where one was found.</dd></div>
      {steps.length > 0 && <div><dt>Step matching</dt><dd><ul>{steps.map((step, i) => <li key={i}>{step.heading || `Step ${i + 1}`}: {MATCH_LABELS[matches[i]]}</li>)}</ul></dd></div>}
    </dl>
    <ReportIssue context={context} passages={[...steps.map((step, i) => step.heading || `Step ${i + 1}`), 'Practice scenario', 'Publication reference', 'Something else']} />
  </details>;
}

// The supervisor's answer to "how do I train this task?": a guided walkthrough in the
// demonstration-performance order every TTG prescribes, one phase at a time, using this task's
// part of the TTG, with practice scenarios, a step-by-step evaluation, and where to go next.
export default function TeachCard({ task, onOpenTtg }) {
  const plan = trainingPlanFor(task.id);
  const { lesson, steps, matches, background, exercises, otherExercises, priorTasks, citations, references, supportMaterial, techniques, core, guide } = plan;
  const primary = guide?.refs[0];
  const { done, set, toggle, reset } = useTaskProgress(task.id);
  const [phase, setPhaseState] = useState(() => (Number.isInteger(done._phase) ? done._phase : 0));
  const [openScenario, setOpenScenario] = useState(null);
  const setPhase = value => { setPhaseState(value); set('_phase', value); };
  const ttg = lesson && ttgByNumber[lesson.ttg];
  const isCore = core.five || core.seven;
  const practice = exercises.length ? exercises : otherExercises;
  const watch = practice.filter(isHandsOn);
  const ask = practice.filter(item => !isHandsOn(item));
  const updates = pubUpdates([...references, ...stepTexts(steps)]);
  const levels = [...new Set(priorTasks.map(item => item.level.name))].join(' and ');
  const next = nextLevelFor(task.id);
  const stepNames = stepNamesFor(steps);
  const scenarios = scenariosFor(task.id);
  const evaluation = evaluationFor(task.id, done);
  const status = phaseStatus(task.id, done);
  const practiceScenario = id => { setOpenScenario(id); setPhase(3); };

  return (
    <div className="cfetp-teach" role="region" aria-label={`What to teach for ${task.id}`}>
      <div className="cfetp-glance" aria-label="At a glance">
        <span className="cfetp-badge">{task.level.name}</span>
        {isCore ? <span className={`cfetp-badge ${core.five ? 'cfetp-badge-core5' : 'cfetp-badge-core7'}`}>Core {task.core} · certifier required</span> : <span className="cfetp-badge">Not core</span>}
        {task.deploy.includes('*') && <span className="cfetp-badge">Deployment task</span>}
        <span className="cfetp-badge cfetp-badge-course">{task.code ? `3-level course: ${task.code}` : 'Not taught at tech school'}</span>
        {scenarios.length > 0 && <span className="cfetp-badge cfetp-badge-ok">{scenarios.length} practice scenario{scenarios.length === 1 ? '' : 's'}</span>}
        {lesson ? <button type="button" className="cfetp-link" onClick={() => onOpenTtg(lesson.ttg, lesson.id)}>TTG {lesson.ttg} · {ttg.title}, page {lesson.page}</button> : <span className="cfetp-badge">No TTG{primary ? ` · teach from ${primary.split(',')[0]}` : ''}</span>}
        {updates.length > 0 && <span className="cfetp-badge cfetp-pub-replaced">{updates.length} publication update{updates.length === 1 ? '' : 's'}</span>}
      </div>

      <ol className="cfetp-stepper" aria-label="Training phases">
        {PHASES.map((name, i) => <li key={name}>
          <button type="button" aria-current={phase === i ? 'step' : undefined} onClick={() => setPhase(i)}>
            <span className="cfetp-phase-n">{status.complete[i] ? '✓' : i + 1}</span>{name}
          </button>
        </li>)}
      </ol>

      {phase === 0 && <Phase n={1} title="Prepare before the session">
        <p className="cfetp-muted"><strong>Where they start:</strong> {startingPoint(task)}</p>
        <Tick id="prep:read" done={done} toggle={toggle}>The trainee read the training objectives and references{lesson ? ' in the TTG' : ''} before the session.</Tick>
        <Tick id="prep:prereq" done={done} toggle={toggle}>Prerequisites are met{lesson ? `: ${lesson.prerequisites.filter(item => !/timeline/i.test(item)).join(' ') || 'none'}` : ''}.</Tick>
        {priorTasks.length > 0 && <details className="cfetp-tick-detail"><summary>Their record in {RECORD_SYSTEM} should show the {priorTasks.length} {task.sub.title} {levels} tasks</summary><ul>{priorTasks.map(item => <li key={item.id}>{item.id} {item.text}</li>)}</ul></details>}
        <Tick id="prep:bring" done={done} toggle={toggle}>I have {lesson ? 'the official paper-based TTG (Attachment 5), ' : ''}{primary ? `${primary}, ` : ''}{supportMaterial.length ? `${supportMaterial.join(', ')}, ` : ''}and the references.</Tick>
        <Tick id="prep:pubs" done={done} toggle={toggle}>I checked the rules this task relies on against the current publications on e-Publishing.</Tick>
        <div className="cfetp-verify">
          <PubUpdates texts={[...references, ...stepTexts(steps)]} />
          {citations.length > 0 ? <><strong>Paragraphs the steps cite</strong><ul>{citations.map(cite => <li key={cite}><PubRef text={cite} /></li>)}</ul></>
            : <p className="cfetp-muted">The steps cite no paragraph numbers; read the references below.</p>}
          <details><summary>All references ({references.length})</summary><ul className="cfetp-refs">{references.map(ref => <li key={ref}><PubRef text={ref} /></li>)}</ul></details>
        </div>
        <Tick id="prep:setup" done={done} toggle={toggle}>{scenarios.length ? `A practice scenario is staged (see Practice: ${scenarios.map(item => item.title).join('; ')}), or real work from the section is ready.` : 'Real work from the section is ready, or a scenario built from the template in Practice.'} The TTGs call for hands-on, scenario-based training.{techniques.length > 0 && <> TTG techniques: {techniques.join('; ')}.</>}</Tick>
        {lesson?.numbering && <p className="cfetp-callout-text">{lesson.numbering}</p>}
      </Phase>}

      {phase === 1 && <Phase n={2} title="Explain it">
        <p className="cfetp-muted">Keep it short: what, why, and what good looks like. Then show it.</p>
        <Tick id="explain:task" done={done} toggle={toggle}><strong>What:</strong> {task.id} {task.text}.</Tick>
        <Tick id="explain:why" done={done} toggle={toggle}><strong>Why it matters:</strong> it builds toward required behavior {task.match}, <q>{task.behavior}</q></Tick>
        {guide && <>
          <Tick id="explain:source" done={done} toggle={toggle}><strong>Where the rule lives:</strong> {guide.refs.length ? <PubRef text={guide.refs[0]} /> : 'no STS reference fits'}. Look up: {guide.look}. Read it before the session and teach from it, so what you say matches the publication.</Tick>
          {guide.refs.length > 1 && <p className="cfetp-muted">Also see: {guide.refs.slice(1).map((ref, i) => <React.Fragment key={ref}>{i > 0 && '; '}<PubRef text={ref} /></React.Fragment>)}.</p>}
          {guide.points.map(block => <div key={block.heading} className="cfetp-points">
            <h5 className="cfetp-teach-label">Teach: {block.heading}</h5>
            {block.ordered ? <ol>{block.items.map(item => <li key={item}>{item}</li>)}</ol> : <ul>{block.items.map(item => <li key={item}>{item}</li>)}</ul>}
            <p className="cfetp-source">Source: {block.source}</p>
          </div>)}
          {guide.note && <p className="cfetp-callout-text">{guide.note}</p>}
          <p className="cfetp-muted cfetp-small">No TTG covers this task, and the STS lists references for the whole sub-competency, not per task. This app matched the task to the closest listed reference; confirm it covers your local process.</p>
        </>}
        <Tick id="explain:standard" done={done} toggle={toggle}><strong>What good looks like:</strong> {lesson ? lesson.outcome : `they show required behavior ${task.match} at the ${task.level.name} level (${task.level.criteria}), done without help.`} They will be held to the Go standard: without assistance, accurate, timely, and by the correct procedure.</Tick>
        {citations.length > 0 && <p className="cfetp-muted">Tell them where the rule lives so they can look it up later: {citations.slice(0, 3).join('; ')}.</p>}
      </Phase>}

      {phase === 2 && <Phase n={3} title="Show them">
        <p className="cfetp-muted">Do the task yourself while they watch. Say each step out loud and point to where the reference requires it. Tick each step as you show it.</p>
        {lesson ? <>
          {steps.map((step, i) => <div key={i} className="cfetp-show-step">
            <Tick id={`show:${i}`} done={done} toggle={toggle}><strong>Shown:</strong> {stepNames[i]}</Tick>
            <StepBlock step={step} />
            <p className="cfetp-source">Source: TTG {lesson.ttg}, {lesson.level} lesson (trainer guidance page {lesson.page}). {MATCH_LABELS[matches[i]]}.</p>
          </div>)}
          {background.length > 0 && <details><summary>Background the TTG gives for the whole lesson ({background.length})</summary>{background.map((step, i) => <StepBlock key={i} step={step} />)}</details>}
        </> : <p>With no TTG, open {primary || 'the references'}{guide ? <> and find: {guide.look}</> : ''}. Write your section's steps down from it, so what you show matches the publication and every trainee learns the same steps. Then show those.</p>}
      </Phase>}

      {phase === 3 && <Phase n={4} title="Have them do it">
        <p className="cfetp-muted">Hand it over in three rounds, giving less help each time.</p>
        <ol className="cfetp-rounds">{ROUNDS.map(([id, name, text]) => <li key={id}><Tick id={`practice:${id}`} done={done} toggle={toggle}><strong>{name}:</strong> {text}</Tick></li>)}</ol>
        <h5 className="cfetp-teach-label">Practice scenarios</h5>
        {scenarios.length > 0
          ? scenarios.map(scenario => <ScenarioCard key={scenario.id} scenario={scenario} open={openScenario === scenario.id} />)
          : <ScenarioBuilder stepNames={stepNames.length ? stepNames : [`${task.id} ${task.text}`]} />}
        {watch.length > 0 && <><h5 className="cfetp-teach-label">TTG exercise: watch them do</h5><ul>{watch.map(item => <li key={item}>{item}</li>)}</ul></>}
        {ask.length > 0 && <><h5 className="cfetp-teach-label">TTG exercise: ask them</h5><ul>{ask.map(item => <li key={item}>{item}</li>)}</ul></>}
        {!exercises.length && otherExercises.length > 0 && <p className="cfetp-muted">These are the lesson's exercises; the TTG does not single out this task.</p>}
        {exercises.length > 0 && otherExercises.length > 0 && <details><summary>Other exercises in this lesson ({otherExercises.length})</summary><ul>{otherExercises.map(item => <li key={item}>{item}</li>)}</ul></details>}
      </Phase>}

      {phase === 4 && <Phase n={5} title="Evaluate: Go or No-Go">
        <p className="cfetp-muted">Watch them do it once on their own, with no prompts. Rate each step as you see it and note what you saw.</p>
        {stepNames.map((name, i) => <RateStep key={i} index={i} name={name} done={done} set={set} />)}
        <h5 className="cfetp-teach-label">Go standard (Part II, para 2.6.1.2)</h5>
        {GO_CRITERIA.map(([id, label]) => <Tick key={id} id={`eval:${id}`} done={done} toggle={toggle}>{label}</Tick>)}
        {lesson?.checklist && <p>Also score it with the lesson's task checklist. <button type="button" className="cfetp-link" onClick={() => onOpenTtg(lesson.ttg, lesson.id)}>Open the checklist</button></p>}
        <EvaluationResult evaluation={evaluation} isCore={isCore} onPractice={practiceScenario} />
      </Phase>}

      {phase === 5 && <Phase n={6} title="Document it">
        <Tick id="doc:tba" done={done} toggle={toggle}>In {RECORD_SYSTEM}, entered the start and completion dates with trainee and trainer initials{isCore ? ", plus the certifier's" : ''} (Part II, para 2.3).</Tick>
        {lesson && <Tick id="doc:ttg" done={done} toggle={toggle}>Trainee, trainer, and certifier (if applicable) documented TTG completion (Attachment 5).</Tick>}
        {evaluation.steps.some(step => step.note) && <details><summary>Your observations from the evaluation</summary><ul>{evaluation.steps.filter(step => step.note).map(step => <li key={step.name}><strong>{step.name}:</strong> {step.note}</li>)}</ul></details>}
        <h5 className="cfetp-teach-label">Beyond Go: keep building proficiency</h5>
        <ul>
          <li>Give them this task on real work within the next few days, while it is fresh, and spot-check the result.</li>
          <li>Have them teach it back to the next trainee; explaining it is the surest check that they understand it.</li>
          {next ? <li>The next level of {task.sub.title} is <strong>{next.name}</strong> ({next.criteria}). Its required behaviors: {next.behaviors.map((item, i) => <q key={i}>{item}</q>).reduce((list, item, i) => (i ? [...list, ' ', item] : [item]), [])}
            <details><summary>{next.tasks.length} {next.name} tasks to train next</summary><ul>{next.tasks.map(item => <li key={item.id}>{item.id} {item.text}</li>)}</ul></details></li>
            : <li>This is the Expert level of {task.sub.title}. Grow proficiency by having them train and certify others.</li>}
        </ul>
      </Phase>}

      <div className="cfetp-phase-nav">
        <button type="button" onClick={() => setPhase(phase - 1)} disabled={phase === 0}>Back</button>
        <button type="button" className="cfetp-link" onClick={() => { reset(); setPhaseState(0); }}>Clear ticks</button>
        <button type="button" className="cfetp-primary" onClick={() => setPhase(phase + 1)} disabled={phase === PHASES.length - 1}>Next: {PHASES[phase + 1] || 'done'}</button>
      </div>
      <SourceTrail task={task} lesson={lesson} steps={steps} matches={matches} />
      <p className="cfetp-muted cfetp-small">Ticks, ratings, and notes are saved on this device only as your working notes. They are not a training record; document training in {RECORD_SYSTEM}.</p>
    </div>
  );
}
