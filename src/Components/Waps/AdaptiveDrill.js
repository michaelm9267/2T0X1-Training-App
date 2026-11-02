import React, {useMemo, useState} from 'react';
import {buildTest, matchesNumeric, numericAnswer, reviewCard, weakSpotQueue} from './studyLogic';
import RegulationPassage from './RegulationPassage';
import {QuestionReport} from './QuestionReport';
import AnswerExplanation from './AnswerExplanation';
import {scenarioBank} from './scenarioBank';
export default function AdaptiveDrill({kind, bank, progress, onProgress, onFinish, section, publication}) {
  const [items, setItems] = useState(null), [position, setPosition] = useState(0), [guess, setGuess] = useState('');
  const [results, setResults] = useState([]);
  const title = kind === 'weak' ? 'Drill my weak spots' : kind === 'numeric' ? 'Number recall' : 'Scenario practice';
  const pool = useMemo(() => bank.filter(q => section === 'all' || q.section === section), [bank, section]);
  const available = kind === 'numeric' ? pool.filter(numericAnswer) : kind === 'scenario' ? scenarioBank.filter(q => pool.some(p => p.setId === q.setId)) : weakSpotQueue(pool, progress);
  if (!items) return <section className="waps-panel" aria-label={title}><h3>{title}</h3>
    <p className="waps-muted">{kind === 'weak' ? 'Practice the publications and chapters with your lowest recorded accuracy. Missed questions come first.' : kind === 'numeric' ? 'Recall numbers without answer choices. Enter the value; matching units are optional.' : 'Apply season, weight and distance rules together, then review both cited passages.'}</p>
    {!available.length && <p>{kind === 'weak' ? 'Answer some practice questions first, then return here after a missed answer.' : 'No questions for this mode in the current selection.'}</p>}
    <button type="button" className="waps-primary" disabled={!available.length} onClick={() => {setItems(kind === 'weak' ? available.slice(0, 10) : buildTest(available, {length: 10})); setPosition(0); setResults([]);}}>Start drill</button>
  </section>;
  const item = items[position];
  if (!item) return <section className="waps-panel" aria-label={title}><h3>Drill complete: {results.filter(r => r.correct).length}/{results.length}</h3>
    <ul className="waps-missed">{results.filter(r => !r.correct).map(r => <li key={r.item.id}><p>{r.item.question}</p><p>Your answer: {r.choice}</p><p>Correct: {r.item.answer}</p><RegulationPassage item={r.item} publication={publication}/><QuestionReport item={r.item}/></li>)}</ul>
    <button type="button" onClick={() => setItems(null)}>New drill</button></section>;
  // Answered questions stay answered: going back shows the earlier answer and its feedback.
  const answered = results.find(r => r.item.id === item.id) || null;
  const answer = choice => {
    if (answered) return;
    const correct = kind === 'numeric' ? matchesNumeric(choice, item) : choice === item.answer;
    const result = {item, choice, correct}; setResults([...results, result]);
    onProgress(reviewCard(progress, item.id, correct));
  };
  const next = () => {
    if (position + 1 === items.length) onFinish({at: Date.now(), kind, section, right: results.filter(r => r.correct).length, total: results.length,
      outcomes: results.map(r => ({id: r.item.id, setId: r.item.setId, section: r.item.sourceSection || r.item.section, correct: r.correct}))});
    setPosition(position + 1); setGuess('');
  };
  const back = () => { setPosition(position - 1); setGuess(''); };
  return <section className="waps-panel" aria-label={title}>
    <span>Question {position + 1} of {items.length}</span><p className="waps-question">{item.question}</p>
    {kind === 'numeric' ? <form onSubmit={e => {e.preventDefault(); if (guess.trim()) answer(guess);}}>
      <label className="waps-guess">Your number{numericAnswer(item)?.unit ? ` (${numericAnswer(item).unit})` : ''}<input autoComplete="off" value={answered ? answered.choice : guess} disabled={Boolean(answered)} onChange={e => setGuess(e.target.value)}/></label>
      <button type="submit" disabled={!guess.trim() || Boolean(answered)}>Check answer</button>
    </form> : <div className="waps-choices" role="group" aria-label="Answer choices">{item.choices.map(choice => <button type="button" key={choice} disabled={Boolean(answered)} onClick={() => answer(choice)}>{choice}</button>)}</div>}
    <QuestionReport key={item.id} item={item}/>
    {answered && <div className="waps-feedback"><strong role="status">{answered.correct ? 'Correct.' : `Incorrect. The answer is: ${item.answer}`}</strong>
      {item.explanation && <p>{item.explanation}</p>}
      {[item.ref, ...(item.supportingRefs || [])].map(ref => <RegulationPassage key={ref} item={{...item, ref}} publication={publication}/>)}
      {!item.explanation && <AnswerExplanation key={item.id} item={item} publication={publication} picked={answered.choice} open={!answered.correct}/>}
    </div>}
    <div className="waps-actions waps-step">
      <button type="button" onClick={back} disabled={position === 0}>Previous question</button>
      {answered && <button type="button" className="waps-primary" onClick={next}>{position + 1 === items.length ? 'See results' : 'Next question'}</button>}
    </div>
  </section>;
}
