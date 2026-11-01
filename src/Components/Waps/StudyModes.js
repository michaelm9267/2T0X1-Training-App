import React, { useEffect, useMemo, useState } from 'react';
import RegulationPassage from './RegulationPassage';
import { QuestionReport } from './QuestionReport';
import { buildExam, buildTest, nextDue, reviewCard, sectionStats, studyQueue, troubleCards, readiness } from './studyLogic';

const formatDue = time => {
  if (!time) return null;
  const days = Math.ceil((time - Date.now()) / (24 * 60 * 60 * 1000));
  return days <= 0 ? 'now' : days === 1 ? 'tomorrow' : `in ${days} days`;
};

// Hover (or focus, or tap) a citation to read the regulation's exact wording. Items in the mixed
// (all regulations) bank carry their own publication name.
function Cite({ item, publication, quote }) {
  return <><RegulationPassage key={item.id} item={item} publication={publication} quote={quote} /><QuestionReport key={item.id} item={item}/></>;
}

export function Flashcards({ bank, progress, onProgress, section, publication }) {
  const [round, setRound] = useState(0);
  const [newLimit, setNewLimit] = useState(undefined);
  // The queue is fixed when a round starts; missed cards are added back to the end of the same round.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const startQueue = useMemo(() => studyQueue(bank, progress, { section, newLimit }), [bank, section, round]);
  const [extra, setExtra] = useState([]);
  const [position, setPosition] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [guess, setGuess] = useState('');
  const [tally, setTally] = useState({ right: 0, wrong: 0 });
  const queue = [...startQueue, ...extra];
  const item = queue[position];

  const restart = limit => { setNewLimit(limit); setExtra([]); setPosition(0); setRevealed(false); setGuess(''); setTally({ right: 0, wrong: 0 }); setRound(r => r + 1); };
  const rate = correct => {
    onProgress(reviewCard(progress, item.id, correct));
    if (!correct) setExtra(list => [...list, item]);
    setTally(t => ({ right: t.right + (correct ? 1 : 0), wrong: t.wrong + (correct ? 0 : 1) }));
    setPosition(p => p + 1); setRevealed(false); setGuess('');
  };

  if (!item) {
    const stats = sectionStats(bank, progress, section);
    const due = formatDue(nextDue(bank, progress, section));
    return (
      <section className="waps-panel" aria-label="Flashcards">
        <h3>{queue.length ? 'Round complete' : 'Nothing due right now'}</h3>
        {queue.length > 0 && <p>You got {tally.right} right and missed {tally.wrong}. Missed cards stay due until you get them right.</p>}
        <p className="waps-muted">{stats.mastered} of {stats.total} mastered{due && stats.fresh < stats.total ? ` · next review ${due}` : ''}.</p>
        <div className="waps-actions">
          {stats.fresh > 0 && <button type="button" className="waps-primary" onClick={() => restart(undefined)}>Learn {Math.min(10, stats.fresh)} new cards</button>}
          <button type="button" onClick={() => restart(0)} disabled={stats.due === 0}>Review due cards</button>
        </div>
      </section>
    );
  }

  return (
    <section className="waps-panel" aria-label="Flashcards">
      <div className="waps-progress-line">
        <span>Card {position + 1} of {queue.length}</span>
        <Cite item={item} publication={publication} quote={revealed} />
      </div>
      <p className="waps-question">{item.question}</p>
      {!revealed ? <>
        <label className="waps-guess">Your answer (say it or type it before you flip)
          <textarea value={guess} onChange={event => setGuess(event.target.value)} rows={2} />
        </label>
        <button type="button" className="waps-primary" onClick={() => setRevealed(true)}>Show answer</button>
      </> : <>
        <div className="waps-answer" role="status">
          <span>Answer</span>
          <strong>{item.answer}</strong>
          {guess.trim() && <p className="waps-muted">You said: {guess}</p>}
        </div>
        <p className="waps-muted">Did you get it right?</p>
        <div className="waps-actions">
          <button type="button" className="waps-miss" onClick={() => rate(false)}>Missed it</button>
          <button type="button" className="waps-primary" onClick={() => rate(true)}>Got it</button>
        </div>
      </>}
    </section>
  );
}

export function PracticeTest({ bank, progress, onProgress, onFinish, section, publication }) {
  const [length, setLength] = useState(25);
  const [test, setTest] = useState(null);
  const [position, setPosition] = useState(0);
  const [picked, setPicked] = useState(null);
  const [answers, setAnswers] = useState([]);
  const pool = bank.filter(item => section === 'all' || item.section === section);

  const start = items => { setTest(items); setPosition(0); setPicked(null); setAnswers([]); };

  if (!test) return (
    <section className="waps-panel" aria-label="Practice test">
      <h3>Practice test</h3>
      <p className="waps-muted">Multiple choice, in random order. Each answer also counts toward your flashcard schedule.</p>
      <label className="waps-inline">Questions
        <select value={length} onChange={event => setLength(Number(event.target.value))}>
          {[10, 25, 50].filter(n => n < pool.length).map(n => <option key={n} value={n}>{n}</option>)}
          <option value={pool.length}>All ({pool.length})</option>
        </select>
      </label>
      <button type="button" className="waps-primary" onClick={() => start(buildTest(bank, { section, length }))}>Start test</button>
    </section>
  );

  const item = test[position];
  if (!item) {
    const right = answers.filter(answer => answer.correct).length;
    const missed = answers.filter(answer => !answer.correct);
    return (
      <section className="waps-panel" aria-label="Practice test">
        <h3>Score: {Math.round((right / answers.length) * 100)}%</h3>
        <p>{right} of {answers.length} correct.</p>
        {missed.length > 0 && <>
          <h4>Review what you missed</h4>
          <ul className="waps-missed">
            {missed.map(({ item: miss, choice }) => <li key={miss.id}>
              <p>{miss.question}</p>
              <p className="waps-wrong-text">You picked: {choice}</p>
              <p className="waps-right-text">Correct: {miss.answer}</p>
              <Cite item={miss} publication={publication} />
            </li>)}
          </ul>
        </>}
        <div className="waps-actions">
          {missed.length > 0 && <button type="button" className="waps-primary" onClick={() => start(buildTest(missed.map(m => m.item), { length: missed.length }))}>Retake missed questions</button>}
          <button type="button" onClick={() => setTest(null)}>New test</button>
        </div>
      </section>
    );
  }

  const choose = choice => {
    if (picked) return;
    const correct = choice === item.answer;
    setPicked(choice);
    setAnswers(list => [...list, { item, choice, correct }]);
    onProgress(reviewCard(progress, item.id, correct));
  };
  const next = () => {
    if (position + 1 === test.length) onFinish({ at: Date.now(), kind: 'practice', section, right: answers.filter(a => a.correct).length, total: answers.length, outcomes: answers.map(a => ({id: a.item.id, setId: a.item.setId, section: a.item.sourceSection || a.item.section, correct: a.correct})) });
    setPosition(p => p + 1); setPicked(null);
  };

  return (
    <section className="waps-panel" aria-label="Practice test">
      <div className="waps-progress-line"><span>Question {position + 1} of {test.length}</span></div>
      <p className="waps-question">{item.question}</p>
      <div className="waps-choices" role="group" aria-label="Answer choices">
        {item.choices.map(choice => {
          const state = !picked ? '' : choice === item.answer ? 'right' : choice === picked ? 'wrong' : '';
          return <button type="button" key={choice} className={`waps-choice ${state}`} aria-pressed={picked === choice} disabled={Boolean(picked)} onClick={() => choose(choice)}>{choice}</button>;
        })}
      </div>
      {picked && <div className="waps-feedback" role="status">
        <strong>{picked === item.answer ? 'Correct.' : `Incorrect. The answer is: ${item.answer}`}</strong>
        <Cite item={item} publication={publication} />
        <button type="button" className="waps-primary" onClick={next}>{position + 1 === test.length ? 'See results' : 'Next question'}</button>
      </div>}
    </section>
  );
}

export function ProgressView({ bank, progress, sections, publication, onReset, resetMessage = 'Erase your study progress for this publication?' }) {
  const trouble = troubleCards(bank, progress);
  const indicator = readiness(progress);
  const tests = [...progress.tests].reverse().slice(0, 5);
  return (
    <section className="waps-panel" aria-label="Progress">
      <h3>Progress</h3>
      <div className="waps-readiness"><h4>Practice readiness</h4>
        {indicator.status === 'available' ? <p>Recent exam average: <strong>{indicator.score}%</strong> across {indicator.count} comparable exams.</p> : <p>Complete at least three exams with the same settings within 30 days to see a recent average ({indicator.count}/3).</p>}
        <p className="waps-muted">Uses up to five recent exams with matching length, time and publication weights. This is a practice trend, not a prediction of your SKT score or promotion outcome.</p>
      </div>
      <p className="waps-muted">Each right answer pushes a card's next review further out (same day, 1, 3, 7, 14, then 30 days); a miss brings it back to today. A card counts as mastered once its next review is two weeks or more away.</p>
      <div className="waps-stats">
        {[{ id: 'all', label: 'All sections', title: '' }, ...sections].map(section => {
          const stats = sectionStats(bank, progress, section.id);
          const pct = n => `${(n / stats.total) * 100}%`;
          return <div key={section.id} className="waps-stat">
            <div className="waps-stat-head"><strong>{section.label}</strong><span>{stats.mastered}/{stats.total} mastered · {stats.due} due</span></div>
            {section.title && <span className="waps-muted">{section.title}</span>}
            <div className="waps-bar" role="img" aria-label={`${section.label}: ${stats.mastered} mastered, ${stats.learning} learning, ${stats.fresh} not started`}>
              <span className="mastered" style={{ width: pct(stats.mastered) }} />
              <span className="learning" style={{ width: pct(stats.learning) }} />
            </div>
          </div>;
        })}
      </div>
      <p className="waps-legend"><span className="mastered" /> Mastered <span className="learning" /> Learning <span className="fresh" /> Not started</p>
      {tests.length > 0 && <>
        <h4>Recent tests</h4>
        <ul className="waps-tests">{tests.map(test => <li key={test.at}>{new Date(test.at).toLocaleDateString()} · {test.kind === 'exam' ? 'Full exam' : sections.find(s => s.id === test.section)?.label || 'All sections'} · {test.right}/{test.total} ({Math.round((test.right / test.total) * 100)}%)</li>)}</ul>
      </>}
      {trouble.length > 0 && <>
        <h4>Most missed</h4>
        <ul className="waps-missed">{trouble.map(item => <li key={item.id}><p>{item.question}</p><p className="waps-right-text">{item.answer}</p><Cite item={item} publication={publication} /></li>)}</ul>
      </>}
      <button type="button" className="waps-reset" onClick={() => { if (window.confirm(resetMessage)) onReset(); }}>Reset progress</button>
    </section>
  );
}

const clock = ms => {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = String(total % 60).padStart(2, '0');
  return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${seconds}` : `${minutes}:${seconds}`;
};

// A full-length exam like the real test: questions from every publication, no feedback until the
// end, answers can be changed and questions flagged, and an optional time limit. The exam in
// progress is saved (`saved` / `onSave`) so leaving the page or the tab does not lose it.
export function MockExam({ bank, progress, onProgress, onFinish, sections, saved, onSave, settings, onSettings = () => {} }) {
  const [length, setLength] = useState(settings?.length || Math.min(100, bank.length));
  const [minutes, setMinutes] = useState(settings?.minutes ?? 120);
  const [customCount, setCustomCount] = useState(Boolean(settings?.length && ![25, 50, 100].includes(settings.length)));
  const [customTime, setCustomTime] = useState(Boolean(settings?.minutes && ![0, 30, 60, 90, 120].includes(settings.minutes)));
  const [weights, setWeights] = useState(() => Object.fromEntries(sections.map(s => [s.id, settings?.weights?.[s.id] ?? 1])));
  const [error, setError] = useState('');
  const updateSettings = changes => { const next = {length, minutes, weights, ...changes}; onSettings(next); };
  const blueprint = JSON.stringify({length, minutes, weights: Object.fromEntries(Object.entries(weights).sort(([a], [b]) => a.localeCompare(b)))});
  const [exam, setExamState] = useState(saved);
  const [result, setResult] = useState(null);
  const [now, setNow] = useState(Date.now());
  const setExam = next => { setExamState(next); onSave(next); };

  useEffect(() => {
    if (!exam?.endsAt) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [exam?.endsAt]);

  const submit = () => {
    const answers = exam.items.map(item => ({ item, choice: exam.answers[item.id] || null, correct: exam.answers[item.id] === item.answer }));
    const right = answers.filter(answer => answer.correct).length;
    // Unanswered questions count as misses on the flashcard schedule.
    onProgress(answers.reduce((current, answer) => reviewCard(current, answer.item.id, answer.correct), progress));
    onFinish({ at: Date.now(), section: 'all', kind: 'exam', right, total: answers.length, completed: true, blueprint: exam.blueprint || null, outcomes: answers.map(a => ({id: a.item.id, setId: a.item.setId, section: a.item.sourceSection || a.item.section, correct: a.correct})) });
    setResult({ answers, right, used: Date.now() - exam.startedAt, timedOut: Boolean(exam.endsAt && Date.now() >= exam.endsAt) });
    setExam(null);
  };
  const timeUp = Boolean(exam?.endsAt && now >= exam.endsAt);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (timeUp) submit(); }, [timeUp]);

  if (result) {
    const missed = result.answers.filter(answer => !answer.correct);
    const blank = missed.filter(answer => !answer.choice).length;
    return (
      <section className="waps-panel" aria-label="Full exam">
        <h3>Exam score: {Math.round((result.right / result.answers.length) * 100)}%</h3>
        <p>{result.right} of {result.answers.length} correct{blank ? `, ${blank} left blank` : ''}. Time used: {clock(result.used)}{result.timedOut ? ' (time ran out)' : ''}.</p>
        <h4>By publication</h4>
        <ul className="waps-breakdown">
          {sections.map(section => {
            const mine = result.answers.filter(answer => answer.item.section === section.id);
            if (!mine.length) return null;
            const right = mine.filter(answer => answer.correct).length;
            return <li key={section.id}><span>{section.label}</span><span>{right}/{mine.length} ({Math.round((right / mine.length) * 100)}%)</span></li>;
          })}
        </ul>
        {missed.length > 0 && <>
          <h4>Review what you missed</h4>
          <ul className="waps-missed">
            {missed.map(({ item, choice }) => <li key={item.id}>
              <p>{item.question}</p>
              <p className="waps-wrong-text">{choice ? `You picked: ${choice}` : 'Left blank'}</p>
              <p className="waps-right-text">Correct: {item.answer}</p>
              <Cite item={item} />
            </li>)}
          </ul>
        </>}
        <div className="waps-actions">
          <button type="button" className="waps-primary" onClick={() => setResult(null)}>New exam</button>
        </div>
      </section>
    );
  }

  if (!exam) return (
    <section className="waps-panel" aria-label="Full exam">
      <h3>Full exam</h3>
      <p className="waps-muted">This is a practice configuration, not an official SKT blueprint. Set publication weights from your study outline when available; equal weights are the starting point. The 100-question, 120-minute defaults are editable practice settings. Feedback appears after submission.</p>
      <label className="waps-inline">Questions
        <select value={customCount ? 'custom' : length} onChange={event => {if (event.target.value === 'custom') {setCustomCount(true); return;} setCustomCount(false); setLength(Number(event.target.value)); updateSettings({length: Number(event.target.value)});}}>
          {[25, 50, 100].filter(n => n <= bank.length).map(n => <option key={n} value={n}>{n}</option>)}
          <option value="custom">Custom</option>
        </select>
      </label>
      {customCount && <label className="waps-inline">Custom question count<input type="number" min="1" max={bank.length} value={length} onChange={e => {setLength(Number(e.target.value)); updateSettings({length:Number(e.target.value)});}}/></label>}
      <label className="waps-inline">Time limit
        <select value={customTime ? 'custom' : minutes} onChange={event => {if (event.target.value === 'custom') {setCustomTime(true); return;} setCustomTime(false); setMinutes(Number(event.target.value)); updateSettings({minutes: Number(event.target.value)});}}>
          {[30, 60, 90, 120].map(n => <option key={n} value={n}>{n} minutes</option>)}
          <option value={0}>No time limit</option><option value="custom">Custom</option>
        </select>
      </label>
      {customTime && <label className="waps-inline">Custom time limit (minutes)<input type="number" min="1" max="1440" value={minutes} onChange={e => {setMinutes(Number(e.target.value)); updateSettings({minutes:Number(e.target.value)});}}/></label>}
      <fieldset className="waps-weights"><legend>Publication weights (relative shares)</legend>
        {sections.map(s => <label key={s.id}>{s.label}<input type="number" min="0" max="1000" step="1" value={weights[s.id]} onChange={e => { const next = {...weights, [s.id]: e.target.value === '' ? '' : Number(e.target.value)}; setWeights(next); updateSettings({weights: next}); }}/></label>)}
      </fieldset>
      {error && <p role="alert">{error}</p>}
      <button type="button" className="waps-primary" onClick={() => {
        if (!Number.isFinite(minutes) || minutes < 0 || minutes > 1440 || (customTime && minutes === 0)) {setError('Choose a time limit between 1 and 1440 minutes, or select no time limit.'); return;}
        let items;
        try { items = buildExam(bank, {length, weights}); setError(''); } catch (e) {setError(e.message); return;}
        const startedAt = Date.now();
        setNow(startedAt);
        setExam({ items, blueprint, answers: {}, flagged: [], position: 0, startedAt, endsAt: minutes ? startedAt + minutes * 60 * 1000 : null });
      }}>Start exam</button>
    </section>
  );

  const item = exam.items[exam.position];
  const answered = Object.keys(exam.answers).length;
  const flagged = exam.flagged.includes(item.id);
  const go = position => setExam({ ...exam, position });
  const pick = choice => setExam({ ...exam, answers: { ...exam.answers, [item.id]: choice } });
  const toggleFlag = () => setExam({ ...exam, flagged: flagged ? exam.flagged.filter(id => id !== item.id) : [...exam.flagged, item.id] });
  const finish = () => {
    const open = exam.items.length - answered;
    const marked = exam.flagged.length ? ` ${exam.flagged.length} flagged.` : '';
    if (window.confirm(open ? `You have ${open} unanswered question${open === 1 ? '' : 's'}.${marked} Submit anyway?` : `Submit your exam for scoring?${marked}`)) submit();
  };

  return (
    <section className="waps-panel" aria-label="Full exam">
      <div className="waps-progress-line">
        <span>Question {exam.position + 1} of {exam.items.length} · {answered} answered</span>
        {exam.endsAt && <span className="waps-timer" role="timer" aria-label="Time left">{clock(exam.endsAt - now)} left</span>}
      </div>
      <p className="waps-question">{item.question}</p>
      <div className="waps-choices" role="group" aria-label="Answer choices">
        {item.choices.map(choice => (
          <button type="button" key={choice} className="waps-choice" aria-pressed={exam.answers[item.id] === choice} onClick={() => pick(choice)}>{choice}</button>
        ))}
      </div>
      <div className="waps-actions">
        <button type="button" onClick={() => go(exam.position - 1)} disabled={exam.position === 0}>Previous</button>
        <button type="button" aria-pressed={flagged} onClick={toggleFlag}>{flagged ? 'Unflag' : 'Flag for review'}</button>
        {exam.position + 1 < exam.items.length && <button type="button" className="waps-primary" onClick={() => go(exam.position + 1)}>Next</button>}
        <button type="button" className={exam.position + 1 === exam.items.length ? 'waps-primary' : ''} onClick={finish}>Submit exam</button>
      </div>
      <QuestionReport key={item.id} item={item}/>
      <nav className="waps-navigator" aria-label="Question navigator">
        {exam.items.map((question, index) => {
          const isAnswered = Boolean(exam.answers[question.id]);
          const isFlagged = exam.flagged.includes(question.id);
          return <button type="button" key={question.id} className={`${isAnswered ? 'answered' : ''} ${isFlagged ? 'flagged' : ''}`}
            aria-current={index === exam.position ? 'step' : undefined}
            aria-label={`Question ${index + 1}${isAnswered ? ', answered' : ''}${isFlagged ? ', flagged' : ''}`}
            onClick={() => go(index)}>{index + 1}</button>;
        })}
      </nav>
      <p className="waps-legend"><span className="answered" /> Answered <span className="flagged" /> Flagged <span className="fresh" /> Not answered</p>
    </section>
  );
}
