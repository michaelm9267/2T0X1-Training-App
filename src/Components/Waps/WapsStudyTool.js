import React, { useEffect, useMemo, useRef, useState } from 'react';
import { dafi10403Bank, dafi10403Sections } from './dafi10403Bank';
import { dafi24602v2Bank, dafi24602v2Sections } from './dafi24602v2Bank';
import { dafi24602v1Bank, dafi24602v1Sections } from './dafi24602v1Bank';
import { dafi24602v4Bank, dafi24602v4Sections } from './dafi24602v4Bank';
import { dtrPart2Bank, dtrPart2Sections } from './dtrPart2Bank';
import { dtrPart3Bank, dtrPart3Sections } from './dtrPart3Bank';
import { dtrPart4Bank, dtrPart4Sections } from './dtrPart4Bank';
import { recordTest, sectionStats } from './studyLogic';
import { Flashcards, MockExam, PracticeTest, ProgressView } from './StudyModes';
import './waps.css';
import './waps-mobile.css';
import OfflineStatus from './OfflineStatus';
import AdaptiveDrill from './AdaptiveDrill';
import {ReportReview, WapsProgressContext} from './QuestionReport';
import {readProgress, saveProgress} from './wapsStorage';
import {publishSave} from '../../cloudBridge';

export const wapsRanks = [
  { id: 'e5', label: 'SSgt / E-5', description: 'Study for promotion to Staff Sergeant.' },
  { id: 'e6', label: 'TSgt / E-6', description: 'Study for promotion to Technical Sergeant.' },
];

// Study material by rank, one entry per publication. E-6 has none yet. Each question is tagged with
// its publication's id (setId) so its citation can find the regulation's exact wording.
const tag = (setId, bank) => bank.map(item => ({ ...item, setId }));
const studySets = {
  e5: [
    { id: 'dafi10403', publication: 'DAFI 10-403', title: 'Deployment Planning and Execution', scope: 'Chapter 1, Chapter 3, and Attachment 3', bank: tag('dafi10403', dafi10403Bank), sections: dafi10403Sections },
    { id: 'dafi24602v2', publication: 'DAFI 24-602V2', title: 'Cargo Movement', scope: 'Chapters 2, 3, 4, 8, 9, 10, 11, and 15; Attachments 1, 3, and 9', bank: tag('dafi24602v2', dafi24602v2Bank), sections: dafi24602v2Sections },
    { id: 'dafi24602v1', publication: 'DAFI 24-602V1', title: 'Passenger Movement', scope: 'Chapters 1, 2, 3, 5, 6, and 7', bank: tag('dafi24602v1', dafi24602v1Bank), sections: dafi24602v1Sections },
    { id: 'dafi24602v4', publication: 'DAFI 24-602V4', title: 'Personal Property Moving and Storage', scope: 'Chapters 3, 6, 7, 8, 11, and 12; Attachment 4', bank: tag('dafi24602v4', dafi24602v4Bank), sections: dafi24602v4Sections },
    { id: 'dtrPart2', publication: 'DTR Part II', title: 'Cargo Movement', scope: 'Chapters 202, 205, and 210', bank: tag('dtrPart2', dtrPart2Bank), sections: dtrPart2Sections },
    { id: 'dtrPart3', publication: 'DTR Part III', title: 'Mobility', scope: 'Chapter 303 and Appendix P', bank: tag('dtrPart3', dtrPart3Bank), sections: dtrPart3Sections },
    { id: 'dtrPart4', publication: 'DTR Part IV', title: 'Personal Property', scope: 'Chapters A-402 and A-411; Appendix A-B', bank: tag('dtrPart4', dtrPart4Bank), sections: dtrPart4Sections },
  ],
};

const RANK_KEY = 'waps-study-rank';
const publicationKey = rankId => `waps-publication-${rankId}`;
const examKey = rankId => `waps-exam-${rankId}`;
// Tests saved before a rank had more than one publication carry no publication id; they were DAFI 10-403.
const testPublication = test => test.publication || 'dafi10403';

function readStorage(key, fallback) {
  try { const value = window.localStorage.getItem(key); return value === null ? fallback : JSON.parse(value); } catch { return fallback; }
}
function writeStorage(key, value) {
  try { if (value === null) window.localStorage.removeItem(key); else window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable */ }
}

function savedRank() {
  const id = readStorage(RANK_KEY, null);
  return wapsRanks.some(rank => rank.id === id) ? id : null;
}

const MODES = [['cards', 'Flashcards'], ['test', 'Practice test'], ['weak', 'Weak spots'], ['numeric', 'Number recall'], ['scenario', 'Scenarios'], ['progress', 'Progress']];
const COMBINED_MODES = [['cards', 'Flashcards'], ['test', 'Practice test'], ['exam', 'Full exam'], ['weak', 'Weak spots'], ['numeric', 'Number recall'], ['scenario', 'Scenarios'], ['progress', 'Progress']];
const COMBINED_ID = 'all';

// Every publication as one study set. Each publication becomes a "section" so it can be filtered
// and scored on its own, and cards are interleaved so new flashcards mix the regulations.
// Card ids are unchanged, so progress here and in each publication is the same progress.
function combineSets(sets) {
  const lists = sets.map(set => set.bank.map(item => ({ ...item, sourceSection: item.section, section: set.id, publication: set.publication })));
  const bank = [];
  for (let i = 0; i < Math.max(...lists.map(list => list.length)); i += 1) lists.forEach(list => { if (list[i]) bank.push(list[i]); });
  return {
    id: COMBINED_ID, publication: 'All regulations', title: 'Mixed review and full exam', combined: true,
    scope: sets.map(set => set.publication).join(', '), bank,
    sections: sets.map(set => ({ id: set.id, label: set.publication, title: set.title })),
  };
}

function StudySet({ set, progress, onProgress, onTestFinished, savedExam, onSaveExam }) {
  const [mode, setMode] = useState('cards');
  const [section, setSection] = useState('all');
  const stats = sectionStats(set.bank, progress, section);
  const shared = { bank: set.bank, progress, onProgress, section, publication: set.publication };
  const ownTests = { ...progress, tests: progress.tests.filter(test => testPublication(test) === set.id) };
  const reset = () => {
    const ids = new Set(set.bank.map(item => item.id));
    onProgress({ ...progress, cards: Object.fromEntries(Object.entries(progress.cards).filter(([id]) => !ids.has(id))), tests: progress.tests.filter(test => !set.combined && testPublication(test) !== set.id) });
  };

  return (
    <div className="waps-study-set">
      <div className="waps-source">
        <div>
          <h3>{set.publication}, {set.title}</h3>
          <p className="waps-muted">{set.scope} · {set.bank.length} questions</p>
        </div>
        <p className="waps-summary">{stats.due} due · {stats.mastered} mastered · {stats.fresh} not started</p>
      </div>
      {mode !== 'exam' && <div className="waps-filters" role="group" aria-label="Section">
        {[{ id: 'all', label: 'All sections' }, ...set.sections].map(item => (
          <button type="button" key={item.id} aria-pressed={section === item.id} title={item.title} onClick={() => setSection(item.id)}>{item.label}</button>
        ))}
      </div>}
      <div className="waps-modes" role="tablist" aria-label="Study mode">
        {(set.combined ? COMBINED_MODES : MODES).map(([id, label]) => (
          <button type="button" role="tab" key={id} aria-selected={mode === id} onClick={() => setMode(id)}>{label}</button>
        ))}
      </div>
      {mode === 'cards' && <Flashcards key={section} {...shared} />}
      {mode === 'test' && <PracticeTest key={section} {...shared} onFinish={result => onTestFinished({ ...result, publication: set.id })} />}
      {mode === 'exam' && <MockExam bank={set.bank} progress={progress} onProgress={onProgress} sections={set.sections} saved={savedExam} onSave={onSaveExam} settings={progress.examSettings} onSettings={examSettings => onProgress({...progress, examSettings})}
        onFinish={result => onTestFinished({ ...result, publication: set.id })} />}
      {['weak', 'numeric', 'scenario'].includes(mode) && <AdaptiveDrill key={`${mode}-${section}`} kind={mode} {...shared} onFinish={result => onTestFinished({...result, publication: set.id})} />}
      {mode === 'progress' && <ProgressView {...shared} progress={ownTests} sections={set.sections} onReset={reset}
        resetMessage={set.combined ? 'Erase your study progress for every publication?' : undefined} />}
    </div>
  );
}

// One progress store per rank, shared by its publications (card ids are unique across publications).
function RankStudy({ rankId, sets }) {
  const [progress, setProgress] = useState(() => readProgress(rankId));
  const combined = useMemo(() => combineSets(sets), [sets]);
  const [publicationId, setPublicationId] = useState(() => {
    const saved = readStorage(publicationKey(rankId), null);
    return saved === COMBINED_ID || sets.some(set => set.id === saved) ? saved : sets[0].id;
  });
  const set = publicationId === COMBINED_ID ? combined : sets.find(item => item.id === publicationId);
  const [saveError, setSaveError] = useState('');
  const progressRef = useRef(progress);
  const save = next => {
    const value = typeof next === 'function' ? next(progressRef.current) : next;
    progressRef.current = value;
    setProgress(value);
    try { saveProgress(rankId, value); setSaveError(''); } catch { setSaveError('Browser storage is full or unavailable. Keep this page open; new progress may not survive a reload.'); publishSave('waps', value); }
  };
  useEffect(() => { publishSave('waps', readProgress(rankId)); }, [rankId]);
  const choose = id => { setPublicationId(id); writeStorage(publicationKey(rankId), id); };

  return <WapsProgressContext.Provider value={{progress, save}}>
    {saveError && <p role="alert">{saveError}</p>}
    {sets.length > 1 && <div className="waps-publications" role="tablist" aria-label="Publication">
      {sets.map(item => (
        <button type="button" role="tab" key={item.id} aria-selected={item.id === publicationId} onClick={() => choose(item.id)}>
          <strong>{item.publication}</strong>
          <span>{item.title}</span>
        </button>
      ))}
      <button type="button" role="tab" className="waps-combined" aria-selected={publicationId === COMBINED_ID} onClick={() => choose(COMBINED_ID)}>
        <strong>All regulations</strong>
        <span>Mix every publication: flashcards, practice tests, and a full exam</span>
      </button>
    </div>}
    <StudySet key={set.id} set={set} progress={progress} onProgress={save}
      savedExam={progress.exam || null} onSaveExam={exam => { save(current => ({...current, exam})); writeStorage(examKey(rankId), exam); }}
      onTestFinished={result => save(current => recordTest(current, result))} />
    <ReportReview/>
    <OfflineStatus/>
  </WapsProgressContext.Provider>;
}

function WapsStudyTool() {
  const [rankId, setRankId] = useState(savedRank);
  const rank = wapsRanks.find(item => item.id === rankId);
  const choose = id => { setRankId(id); writeStorage(RANK_KEY, id); };

  if (!rank) return (
    <main className="waps-study" data-glossary="waps">
      <section className="waps-card" aria-labelledby="waps-select-heading">
        <span className="module-status">2T0 WAPS Study Tool</span>
        <h2 id="waps-select-heading">What are you studying for?</h2>
        <p>Pick the rank you are testing for.</p>
        <div className="waps-rank-options">
          {wapsRanks.map(item => (
            <button type="button" key={item.id} className="waps-rank-option" onClick={() => choose(item.id)}>
              <strong>{item.label}</strong>
              <span>{item.description}</span>
            </button>
          ))}
        </div>
      </section>
    </main>
  );

  const sets = studySets[rank.id];
  return (
    <main className="waps-study waps-study-active" data-glossary="waps">
      <section className="waps-workspace" aria-labelledby="waps-rank-heading">
        <header className="waps-header">
          <div>
            <span className="module-status">2T0 WAPS Study Tool</span>
            <h2 id="waps-rank-heading">Studying for {rank.label}</h2>
          </div>
          <button type="button" className="waps-change" onClick={() => choose(null)}>Change rank</button>
        </header>
        {sets ? <RankStudy key={rank.id} rankId={rank.id} sets={sets} /> : <p className="waps-muted">Study material for this rank is coming soon.</p>}
      </section>
    </main>
  );
}

export default WapsStudyTool;
