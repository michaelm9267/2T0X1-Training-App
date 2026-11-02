import React, { useEffect, useMemo, useRef, useState } from 'react';
import { dafi10403Bank, dafi10403Sections } from './dafi10403Bank';
import { dafi24602v2Bank, dafi24602v2Sections } from './dafi24602v2Bank';
import { dafi24602v1Bank, dafi24602v1Sections } from './dafi24602v1Bank';
import { dafi24602v4Bank, dafi24602v4Sections } from './dafi24602v4Bank';
import { dtrPart2Bank, dtrPart2Sections } from './dtrPart2Bank';
import { dtrPart3Bank, dtrPart3Sections } from './dtrPart3Bank';
import { dtrPart4Bank, dtrPart4Sections } from './dtrPart4Bank';
import { recordTest, sectionStats } from './studyLogic';
import { Flashcards, MockExam, PracticeTest, ProgressView, QuestionSearch } from './StudyModes';
import './waps.css';
import './waps-mobile.css';
import OfflineStatus from './OfflineStatus';
import AdaptiveDrill from './AdaptiveDrill';
import {ReportReview, WapsProgressContext} from './QuestionReport';
import {readProgress, saveProgress} from './wapsStorage';
import {publishSave} from '../../cloudBridge';
import { afh1Sets } from './afh1/afh1Bank';
import { comprehensionLevels } from './afh1/afh1Meta';

export const wapsRanks = [
  { id: 'e5', label: 'SSgt / E-5', description: 'Study for promotion to Staff Sergeant.' },
  { id: 'e6', label: 'TSgt / E-6', description: 'Study for promotion to Technical Sergeant.' },
];

// Study material by rank, one entry per publication. Each bank holds every chapter either rank is
// tested on; a rank studies only the chapters on its SKT list. Each question is tagged with its
// publication's id (setId) so its citation can find the regulation's exact wording.
const tag = (setId, bank) => bank.map(item => ({ ...item, setId }));
const publications = [
  { id: 'dafi10403', publication: 'DAFI 10-403', title: 'Deployment Planning and Execution', bank: dafi10403Bank, sections: dafi10403Sections, ranks: {
    e5: ['Chapter 1, Chapter 3, and Attachment 3', ['ch1', 'ch3', 'att3']],
    e6: ['Chapters 1, 2, and 3', ['ch1', 'ch2', 'ch3']] } },
  { id: 'dafi24602v2', publication: 'DAFI 24-602V2', title: 'Cargo Movement', bank: dafi24602v2Bank, sections: dafi24602v2Sections, ranks: {
    e5: ['Chapters 2, 3, 4, 8, 9, 10, 11, and 15; Attachments 1, 3, and 9', ['ch2', 'ch3', 'ch4', 'ch8', 'ch9', 'ch10', 'ch11', 'ch15', 'att1', 'att3', 'att9']],
    e6: ['Chapters 1 through 6 and 8 through 12; Attachments 9 and 10', ['ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6', 'ch8', 'ch9', 'ch10', 'ch11', 'ch12', 'att9', 'att10']] } },
  { id: 'dafi24602v1', publication: 'DAFI 24-602V1', title: 'Passenger Movement', bank: dafi24602v1Bank, sections: dafi24602v1Sections, ranks: {
    e5: ['Chapters 1, 2, 3, 5, 6, and 7', ['ch1', 'ch2', 'ch3', 'ch5', 'ch6', 'ch7']],
    e6: ['Chapters 2, 3, 4, 6, and 7', ['ch2', 'ch3', 'ch4', 'ch6', 'ch7']] } },
  { id: 'dafi24602v4', publication: 'DAFI 24-602V4', title: 'Personal Property Moving and Storage', bank: dafi24602v4Bank, sections: dafi24602v4Sections, ranks: {
    e5: ['Chapters 3, 6, 7, 8, 11, and 12; Attachment 4', ['ch3', 'ch6', 'ch7', 'ch8', 'ch11', 'ch12', 'att4']],
    e6: ['Chapters 3, 6, 7, 8, 11, and 14; Attachment 4', ['ch3', 'ch6', 'ch7', 'ch8', 'ch11', 'ch14', 'att4']] } },
  { id: 'dtrPart2', publication: 'DTR Part II', title: 'Cargo Movement', bank: dtrPart2Bank, sections: dtrPart2Sections, ranks: {
    e5: ['Chapters 202, 205, and 210', ['c202', 'c205', 'c210']],
    e6: ['Chapters 202, 205, and 210', ['c202', 'c205', 'c210']] } },
  { id: 'dtrPart3', publication: 'DTR Part III', title: 'Mobility', bank: dtrPart3Bank, sections: dtrPart3Sections, ranks: {
    e5: ['Chapter 303 and Appendix P', ['c303', 'appP']],
    e6: ['Chapter 303', ['c303']] } },
  { id: 'dtrPart4', publication: 'DTR Part IV', title: 'Personal Property', bank: dtrPart4Bank, sections: dtrPart4Sections, ranks: {
    e5: ['Chapters A-402 and A-411; Appendix A-B', ['cA402', 'cA411', 'appAB']],
    e6: ['Chapters A-401 and A-402; Appendix A-M', ['cA401', 'cA402', 'appAM']] } },
];
const studySets = Object.fromEntries(wapsRanks.map(({ id: rankId }) => [rankId, publications.map(({ ranks, bank, sections, ...publication }) => {
  const [scope, ids] = ranks[rankId];
  return { ...publication, scope, bank: tag(publication.id, bank.filter(item => ids.includes(item.section))), sections: sections.filter(section => ids.includes(section.id)) };
})]));

// Each rank studies for two tests: the SKT (career field publications) and the PDG (AFH 1, Airman,
// tested on the PFE). PDG sections carry the ADTC comprehension level for the rank.
export const wapsModules = [
  { id: 'skt', label: 'SKT', description: 'Specialty Knowledge Test: the 2T0X1 career field publications.' },
  { id: 'pdg', label: 'PDG', description: 'Professional Development Guide: AFH 1, Airman, at the comprehension level your rank requires.' },
];
const setsFor = (rankId, moduleId) => (moduleId === 'pdg' ? (['e5', 'e6'].includes(rankId) ? afh1Sets(rankId) : null) : studySets[rankId]);

const RANK_KEY = 'waps-study-rank';
const moduleKey = rankId => `waps-module-${rankId}`;
// The SKT keeps its original storage keys so existing progress and choices carry over.
const publicationKey = (rankId, moduleId = 'skt') => `waps-publication-${rankId}${moduleId === 'skt' ? '' : `-${moduleId}`}`;
const examKey = (rankId, moduleId = 'skt') => `waps-exam-${rankId}${moduleId === 'skt' ? '' : `-${moduleId}`}`;
const examField = moduleId => (moduleId === 'skt' ? 'exam' : `${moduleId}Exam`);
const examSettingsField = moduleId => (moduleId === 'skt' ? 'examSettings' : `${moduleId}ExamSettings`);
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
function combineSets(sets, moduleId = 'skt') {
  const lists = sets.map(set => set.bank.map(item => ({ ...item, sourceSection: item.section, section: set.id, publication: item.publication || set.publication })));
  const bank = [];
  for (let i = 0; i < Math.max(...lists.map(list => list.length)); i += 1) lists.forEach(list => { if (list[i]) bank.push(list[i]); });
  return {
    id: COMBINED_ID, publication: moduleId === 'pdg' ? 'All chapters' : 'All regulations', title: 'Mixed review and full exam', combined: true,
    scope: sets.map(set => set.publication).join(', '), bank,
    sections: sets.map(set => ({ id: set.id, label: set.publication, title: set.title })),
  };
}

// The ADTC comprehension scale, with the levels this set's sections require for the rank highlighted.
function LevelGuide({ set, section, rankLabel }) {
  const current = set.sections.find(item => item.id === section)?.level;
  const used = new Set(set.sections.map(item => item.level).filter(Boolean));
  return (
    <details className="waps-levels" open={Boolean(current)}>
      <summary>{current ? `${rankLabel} level for Section ${section}: ${current} (${comprehensionLevels[current].name})` : `${rankLabel} comprehension levels (ADTC)`}</summary>
      <ul>
        {Object.entries(comprehensionLevels).map(([level, info]) => (
          <li key={level} className={level === current ? 'current' : used.has(level) ? 'used' : ''}>
            <strong>{level} · {info.name}</strong> {info.description}
            {used.has(level) && !current && <span className="waps-muted"> Sections: {set.sections.filter(item => item.level === level).map(item => item.label).join(', ')}</span>}
          </li>
        ))}
      </ul>
    </details>
  );
}

function StudySet({ set, progress, onProgress, onTestFinished, savedExam, onSaveExam, moduleId = 'skt', rankLabel }) {
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
      {mode !== 'exam' && <label className="waps-select">
        <span>Section</span>
        <select value={section} onChange={event => setSection(event.target.value)}>
          {[{ id: 'all', label: 'All sections' }, ...set.sections].map(item => (
            <option key={item.id} value={item.id}>
              {[item.label, item.title, item.level && `${rankLabel} level ${item.level} (${comprehensionLevels[item.level]?.name})`].filter(Boolean).join(' · ')}
            </option>
          ))}
        </select>
      </label>}
      {set.leveled && mode !== 'exam' && <LevelGuide set={set} section={section} rankLabel={rankLabel} />}
      {/* Hidden while a full exam is running so it cannot show exam answers. */}
      {!(mode === 'exam' && savedExam) && <QuestionSearch key={`${set.id}-${section}`} bank={section === 'all' ? set.bank : set.bank.filter(item => item.section === section)} publication={set.publication} />}
      <div className="waps-modes" role="tablist" aria-label="Study mode">
        {(set.combined ? COMBINED_MODES : MODES).map(([id, label]) => (
          <button type="button" role="tab" key={id} aria-selected={mode === id} onClick={() => setMode(id)}>{label}</button>
        ))}
      </div>
      {mode === 'cards' && <Flashcards key={section} {...shared} />}
      {mode === 'test' && <PracticeTest key={section} {...shared} onFinish={result => onTestFinished({ ...result, publication: set.id })} />}
      {mode === 'exam' && <MockExam bank={set.bank} progress={progress} onProgress={onProgress} sections={set.sections} saved={savedExam} onSave={onSaveExam} settings={progress[examSettingsField(moduleId)]} onSettings={examSettings => onProgress({...progress, [examSettingsField(moduleId)]: examSettings})}
        onFinish={result => onTestFinished({ ...result, publication: set.id })} />}
      {['weak', 'numeric', 'scenario'].includes(mode) && <AdaptiveDrill key={`${mode}-${section}`} kind={mode} {...shared} onFinish={result => onTestFinished({...result, publication: set.id})} />}
      {mode === 'progress' && <ProgressView {...shared} progress={ownTests} sections={set.sections} onReset={reset}
        resetMessage={set.combined ? 'Erase your study progress for every publication?' : undefined} />}
    </div>
  );
}

// One progress store per rank, shared by its publications (card ids are unique across publications).
function RankStudy({ rankId, sets, moduleId = 'skt', rankLabel }) {
  const [progress, setProgress] = useState(() => readProgress(rankId));
  const combined = useMemo(() => combineSets(sets, moduleId), [sets, moduleId]);
  const [publicationId, setPublicationId] = useState(() => {
    const saved = readStorage(publicationKey(rankId, moduleId), null);
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
  const choose = id => { setPublicationId(id); writeStorage(publicationKey(rankId, moduleId), id); };

  return <WapsProgressContext.Provider value={{progress, save}}>
    {saveError && <p role="alert">{saveError}</p>}
    {sets.length > 1 && <label className="waps-select waps-select-publication">
      <span>{moduleId === 'pdg' ? 'Chapter' : 'Publication'}</span>
      <select value={publicationId} onChange={event => choose(event.target.value)}>
        <option value={COMBINED_ID}>{combined.publication} · {moduleId === 'pdg' ? 'every AFH 1 chapter, plus the full exam' : 'every publication, plus the full exam'}</option>
        {sets.map(item => <option key={item.id} value={item.id}>{item.publication} · {item.title}</option>)}
      </select>
    </label>}
    <StudySet key={set.id} set={set} progress={progress} onProgress={save} moduleId={moduleId} rankLabel={rankLabel}
      savedExam={progress[examField(moduleId)] || null} onSaveExam={exam => { save(current => ({...current, [examField(moduleId)]: exam})); writeStorage(examKey(rankId, moduleId), exam); }}
      onTestFinished={result => save(current => recordTest(current, result))} />
    <ReportReview/>
    <OfflineStatus/>
  </WapsProgressContext.Provider>;
}

function WapsStudyTool() {
  const [rankId, setRankId] = useState(savedRank);
  const rank = wapsRanks.find(item => item.id === rankId);
  const choose = id => { setRankId(id); writeStorage(RANK_KEY, id); setModuleId(id ? savedModule(id) : null); };
  const savedModule = id => { const value = readStorage(moduleKey(id), null); return wapsModules.some(m => m.id === value) ? value : null; };
  const [moduleId, setModuleId] = useState(() => (rankId ? savedModule(rankId) : null));
  const chooseModule = id => { setModuleId(id); if (rankId) writeStorage(moduleKey(rankId), id); };
  const module = wapsModules.find(item => item.id === moduleId);

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

  if (!module) return (
    <main className="waps-study" data-glossary="waps">
      <section className="waps-card" aria-labelledby="waps-module-heading">
        <span className="module-status">2T0 WAPS Study Tool · {rank.label}</span>
        <h2 id="waps-module-heading">Which test are you studying for?</h2>
        <p>The SKT covers your career field publications; the PDG (AFH 1) is tested on the PFE.</p>
        <div className="waps-rank-options">
          {wapsModules.map(item => (
            <button type="button" key={item.id} className="waps-rank-option" onClick={() => chooseModule(item.id)}>
              <strong>{rank.label.split(' / ')[0]} {item.label}</strong>
              <span>{item.description}</span>
            </button>
          ))}
        </div>
        <button type="button" className="waps-change" onClick={() => choose(null)}>Change rank</button>
      </section>
    </main>
  );

  const sets = setsFor(rank.id, module.id);
  return (
    <main className="waps-study waps-study-active" data-glossary="waps">
      <section className="waps-workspace" aria-labelledby="waps-rank-heading">
        <header className="waps-header">
          <div>
            <span className="module-status">2T0 WAPS Study Tool</span>
            <h2 id="waps-rank-heading">Studying for {rank.label} · {module.label}</h2>
          </div>
          <div className="waps-header-actions">
            <button type="button" className="waps-change" onClick={() => chooseModule(null)}>Change test</button>
            <button type="button" className="waps-change" onClick={() => choose(null)}>Change rank</button>
          </div>
        </header>
        {sets?.length ? <RankStudy key={`${rank.id}-${module.id}`} rankId={rank.id} moduleId={module.id} rankLabel={rank.label.split(' / ')[0]} sets={sets} />
          : <p className="waps-muted">{module.label} study material for {rank.label} is coming soon.</p>}
      </section>
    </main>
  );
}

export default WapsStudyTool;
