import RegulationScope from './Components/Regulations/RegulationScope';
import { resetCdfShipment } from './Components/Cmos/courseAdapters';
import CdfCmosWorkspace from './Components/CdfCmos/CdfCmosWorkspace';
import useCdfCmos, {emptyCdfCmos} from './Components/CdfCmos/useCdfCmos';
import {manifestBasis, manifestPieces as assignedManifestPieces} from './Components/CdfCmos/manifestLogic';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Layout from './Layout/Layout.js';
import DocumentationPanel from './Components/Documentation/DocumentationPanel.js';
import ProcessPanel from './Components/ProcessPanel/ProcessPanel.js';
import CargoWindow from './Components/CargoWindow/CargoWindow';
import { createExercise, isStageComplete } from './Components/CargoWindow/exercise';
import { editNotebookEntry, saveNotebookEntry, placeTapeLabel } from './Components/CargoWindow/notebook';
import { applyVehicleAction, canConfirmVehicleCorrection } from './Components/CargoWindow/vehicleInspection';
import { resetPiece } from './Components/CargoWindow/pieces';
import { exportSession, importSession, loadSession, newSession, normalizeSession, saveSession } from './session';
import { manifestFields } from './Components/CargoWindow/workflow';
import { withDocumentErrors } from './Components/CargoWindow/discrepancies';
import { recordMistake } from './Components/CargoWindow/mistakes';
import { pieceResult } from './Components/CargoWindow/scoring';
import { newPracticeSession, practicePieces } from './Components/CargoWindow/practice';
import { TraineeBar, emptyTest } from './Components/Session/Grading';
import AfterActionReport from './Components/Documentation/AfterActionReport';
import SessionBar from './Components/Session/SessionBar';
import { ModeContext } from './Components/Session/mode';
import InstructorSetup from './Components/Session/InstructorSetup';
import Dsoe from './Components/Documentation/Dsoe';
import AcronymTooltip from './Components/Glossary/AcronymTooltip';
import LoadPlan from './Components/LoadPlan/LoadPlan';
import TrainingGuide from './Components/Training/TrainingGuide';
import QuickDrills from './Components/Training/QuickDrills';
import JiInspectionList from './Components/Training/JiInspectionList';
import { reconcilePlan, planBasis } from './Components/LoadPlan/loadPlanLogic';
import Departure from './Components/Departure/Departure';
import AircraftPackage from './Components/Documentation/AircraftPackage';
import { defaultDepartureAt, emptyDeparture, reconcileRelease } from './Components/Departure/departureLogic';
import { chalkSchedule } from './Components/Documentation/Dsoe';
import OutboundTrainer from './Components/Outbound/OutboundTrainer';
import PracticeBar from './Components/Session/PracticeBar';
import CdfGradingSheet from './Components/Documentation/CdfGradingSheet';
import './App.css';

const processSteps = [
  { id: 'precheck', title: 'Precheck' },
  { id: 'incheck', title: 'Incheck' },
  { id: 'manifest', title: 'Manifest' },
  { id: 'load-plan', title: 'Load plan' },
  { id: 'ji', title: 'JI' },
  { id: 'departure', title: 'Departure' },
];

const CDF_MODES = [['guided', 'Guided'], ['practice', 'Practice'], ['test', 'Test']];

const placeholderModules = {
  pdf: 'PDF Training',
  inbound: 'Inbound Training',
  hhg: 'HHG Training',
  pax: 'PAX Training',
};

function App() {
  const [activeModule, setActiveModule] = useState('cdf');
  // The session resumes from this browser's saved copy, or starts the standard deployment.
  const [initial] = useState(() => loadSession() || newSession());
  const [selectedStep, setSelectedStep] = useState(() => processSteps.find(step => step.id === initial.stepId) || processSteps[0]);
  // scenarioId holds the selected piece's key; pieceCount is the number of pieces on the DSOE.
  const [scenarioId, setScenarioId] = useState(initial.scenarioId);
  const [pieceCount, setPieceCount] = useState(initial.pieceCount);
  const [shipments, setShipments] = useState(initial.shipments);
  const [exercises, setExercises] = useState(initial.exercises);
  const [sceneVersion, setSceneVersion] = useState(0);
  const pieceKeys = Object.keys(shipments).slice(0, pieceCount);
  // One destination for the whole deployment, picked at random each session and changeable on
  // the DSOE until a piece is manifested to it.
  const [destination, setDestination] = useState(initial.destination);
  // Guided mode shows hints and explanations; test mode hides them and leaves feedback to the report.
  const [mode, setMode] = useState(initial.mode || 'guided');
  const [loadPlan, setLoadPlan] = useState(initial.loadPlan);
  const [storageError,setStorageError]=useState(false);
  const [cdfCmos,setCdfCmos]=useState(initial.cdfCmos||emptyCdfCmos());
  const [cmosPage,setCmosPage]=useState(null);
  const closeCmos=useCallback(()=>setCmosPage(null),[]);
  const [departure, setDeparture] = useState(initial.departure || emptyDeparture());
  const [clock, setClock] = useState(initial.clock);
  const [meta, setMeta] = useState({ startedAt: initial.startedAt, code: initial.code });
  // Practice mode works on its own deployment; practice.main keeps the session it set aside.
  const [practice, setPractice] = useState(initial.mode === 'practice' && initial.practice ? initial.practice : null);
  // Test mode: the trainee's rank and name, and when the test was finished (the work then locks).
  const [test, setTest] = useState(initial.test || emptyTest());
  const [sheetOpen, setSheetOpen] = useState(false);
  const closeSheet = useCallback(() => setSheetOpen(false), []);
  const finished = Boolean(test.finishedAt);
  useEffect(() => {
    setStorageError(!saveSession({ version: initial.version, shipments, exercises, destination, pieceCount, scenarioId, stepId: selectedStep.id, mode, loadPlan, departure, cdfCmos, clock, ...meta, practice, test }));
  }, [initial.version, shipments, exercises, destination, pieceCount, scenarioId, selectedStep.id, mode, loadPlan, departure, cdfCmos, clock, meta, practice, test]);
  useEffect(() => {
    if (!clock.running) return undefined;
    const timer = window.setInterval(() => setClock(value => ({ ...value, elapsed: value.elapsed + 1 })), 1000);
    return () => window.clearInterval(timer);
  }, [clock.running]);
  function startSession(session) {
    setCdfCmos(session.cdfCmos||emptyCdfCmos());setCmosPage(null);
    setShipments(session.shipments); setExercises(session.exercises); setDestination(session.destination);
    setPieceCount(session.pieceCount); setScenarioId(session.scenarioId); setSelectedStep(processSteps.find(step => step.id === session.stepId) || processSteps[0]);
    setMode(session.mode); setLoadPlan(session.loadPlan); setDeparture(session.departure || emptyDeparture()); setClock(session.clock); setMeta({ startedAt: session.startedAt, code: session.code }); setSceneVersion(version => version + 1);
    setPractice(session.mode === 'practice' && session.practice ? session.practice : null); setTest(session.test || emptyTest()); setSheetOpen(false);
  }
  // Each piece as the trainee sees it: deployment destination, plus paperwork errors not yet corrected.
  const piece = key => shipments[key] && withDocumentErrors({ ...shipments[key], destination }, exercises[key]);
  function changePieceCount(count) {
    setPieceCount(count);
    if (Object.keys(shipments).indexOf(scenarioId) >= count) { setScenarioId(Object.keys(shipments)[0]); setSelectedStep(processSteps[0]); }
  }
  const exercise = exercises[scenarioId];
  const scenario = useMemo(() => withDocumentErrors({ ...shipments[scenarioId], destination }, exercise), [shipments, scenarioId, destination, exercise]);
  const cargoSteps = processSteps.filter(step => !['load-plan', 'departure'].includes(step.id));
  const completedStages = cargoSteps.filter(step => isStageComplete(scenario, step.id, exercise)).map(step => step.id);
  const loadBasis = planBasis(pieceKeys.map(key => ({ ...shipments[key], key, manifested: isStageComplete(piece(key), 'manifest', exercises[key]) })));
  const loadPlanCurrent = loadPlan.accepted && loadPlan.basis === loadBasis;
  // JI follows the deployment load plan. If a manifest or cargo value changes, the plan reopens
  // and JI locks until the revised plan is accepted.
  const jiLocked = !['precheck', 'incheck', 'manifest'].every(id => completedStages.includes(id)) || !loadPlanCurrent;
  // Aircraft departure follows JI: the manifest is released once every piece on the DSOE passed JI.
  const passedJI = pieceKeys.map(key => ({ key, title: shipments[key].title, done: isStageComplete(piece(key), 'ji', exercises[key]) }));
  const allPassedJI = passedJI.every(item => item.done);
  const lockedSteps = { ...(jiLocked ? { ji: 'Locked until Precheck, Incheck, Manifest, and the deployment Load Plan are complete' } : {}), ...(allPassedJI ? {} : { departure: 'Locked until every piece on the DSOE passes JI' }) };
  useEffect(() => { if (jiLocked && selectedStep.id === 'ji') setSelectedStep(processSteps.find(step => step.id === 'load-plan')); }, [jiLocked, selectedStep.id]);
  useEffect(() => { if (!allPassedJI && selectedStep.id === 'departure') setSelectedStep(processSteps.find(step => step.id === 'ji')); }, [allPassedJI, selectedStep.id]);
  const departureAt = departure.at || defaultDepartureAt(chalkSchedule(pieceCount).departure);
  const cmosContext={storageError,scenarioId,shipments,exercises,destination,pieceCount,pieceKeys,loadPlan,departure,departureAt,finished,...meta,test};
  const cmos=useCdfCmos({state:cdfCmos,setState:setCdfCmos,context:cmosContext,setExercises});
  function updateExercise(update, preserveFinal = false) {
    if (finished) return;
    setExercises(previous => {
      const current = previous[scenarioId];
      const next = preserveFinal ? update(current) : {...update(current),manifestAccepted:false,jiInspected:[],jiTerminals:{},jiVerified:[],jiMarks:{},jiDocumentsViewed:[],jiMeasurements:[],jiWeights:{},jiSides:[]};
      return { ...previous, [scenarioId]: { ...next, firstActionAt: current.firstActionAt || Date.now() } };
    });
  }
  // Record when each piece first finishes each stage, for the after-action report.
  useEffect(() => {
    const now = Date.now();
    const updates = {};
    for (const key of Object.keys(shipments)) {
      const item = exercises[key];
      const view = withDocumentErrors({ ...shipments[key], destination }, item);
      const missing = processSteps.filter(step => !item.stageTimes?.[step.id] && isStageComplete(view, step.id, item));
      if (missing.length) updates[key] = { ...item, stageTimes: { ...item.stageTimes, ...Object.fromEntries(missing.map(step => [step.id, now])) } };
    }
    if (Object.keys(updates).length) setExercises(previous => ({ ...previous, ...updates }));
  }, [exercises, shipments, destination]);
  const [setupOpen, setSetupOpen] = useState(false);
  const closeSetup = useCallback(() => setSetupOpen(false), []);
  const [packageOpen, setPackageOpen] = useState(false);
  const closePackage = useCallback(() => setPackageOpen(false), []);
  const [reportOpen, setReportOpen] = useState(false);
  const closeReport = useCallback(() => setReportOpen(false), []);
  const [guideOpen, setGuideOpen] = useState(false);
  const [drillsOpen, setDrillsOpen] = useState(false);
  const [jiListOpen, setJiListOpen] = useState(false);
  const closeJiList = useCallback(() => setJiListOpen(false), []);
  const closeGuide = useCallback(() => setGuideOpen(false), []);
  const closeDrills = useCallback(() => setDrillsOpen(false), []);
  const [transferFeedback, setTransferFeedback] = useState('');
  const sessionSnapshot = () => ({ version: initial.version, shipments, exercises, destination, pieceCount, scenarioId, stepId: selectedStep.id, mode, loadPlan, departure, cdfCmos, clock, ...meta, practice, test });
  // Entering practice sets the current session aside; leaving brings it back as it was.
  const startPractice = (section, main = practice?.main, piece = practice?.piece) => startSession({ ...newPracticeSession({ section, piece }), practice: { section, main, piece } });
  function changeMode(next) {
    if (next === mode) return;
    if (next === 'practice') { startPractice(processSteps.some(step => step.id === selectedStep.id) ? selectedStep.id : 'precheck', sessionSnapshot()); return; }
    if (mode === 'practice') { startSession({ ...(normalizeSession(practice?.main) || newSession()), mode: next }); return; }
    setMode(next);
  }
  function downloadSession() {
    const blob = new Blob([exportSession(sessionSnapshot())], { type: 'application/json' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `cdf-training-${new Date().toISOString().slice(0, 10)}.json`; link.click(); URL.revokeObjectURL(link.href);
    setTransferFeedback('Session file exported.');
  }
  function uploadSession(text) {
    const session = importSession(text);
    if (!session) { setTransferFeedback('Import failed: choose a valid CDF training session file.'); return; }
    startSession(session); setTransferFeedback('Session imported.');
  }
  // The CDF process starts from the DSOE; viewing it marks it reviewed for every increment.
  const [dsoeOpen, setDsoeOpen] = useState(false);
  const closeDsoe = useCallback(() => setDsoeOpen(false), []);
  const dsoeViewed = Boolean(exercise.dsoeViewed);
  function viewDsoe() {
    setDsoeOpen(true);
    setExercises(previous => Object.fromEntries(Object.entries(previous).map(([id, item]) => [id, { ...item, dsoeViewed: true }])));
  }
  const dsoeIncrements = pieceKeys.map(key => {
    const done = processSteps.filter(step => isStageComplete(piece(key), step.id, exercises[key]));
    return { scenario: piece(key), status: done.length ? `${done[done.length - 1].title} complete` : 'Scheduled', done: done.map(step => step.id) };
  });
  useEffect(() => { setLoadPlan(plan => reconcilePlan(plan, loadBasis)); }, [loadBasis]);
  useEffect(() => {
    const any = stage => dsoeIncrements.some(item => item.done.includes(stage));
    const all = stage => dsoeIncrements.length > 0 && dsoeIncrements.every(item => item.done.includes(stage));
    // Standard cargo events, DAFI 10-403 Table 3.1. QC is complete when the documentation (manifest,
    // load plan, JI) is final; the aircraft commander's package and the manifest transmission to
    // GATES complete when the manifest is released.
    const released = Boolean(departure.releasedAt);
    const reached = { cargoPrepStart: any('precheck'), unitAssembly: any('precheck'), reportTo: all('precheck'), incheckStart: any('precheck'), incheckComplete: all('incheck'), manifestStart: any('incheck'), manifestComplete: all('manifest'), jiStart: loadPlanCurrent, jiComplete: all('ji'), qcComplete: loadPlanCurrent && all('ji'), acpComplete: released, cargoLoadStart: all('ji'), cargoLoadComplete: all('ji'), transmitManifest: released };
    setClock(current => {
      const missing = Object.entries(reached).filter(([key, complete]) => complete && current.events?.[key] === undefined);
      return missing.length ? { ...current, events: { ...(current.events || {}), ...Object.fromEntries(missing.map(([key]) => [key, current.elapsed])) } } : current;
    });
  }, [dsoeIncrements, loadPlanCurrent, departure.releasedAt]);
  // Every manifested piece across all training shipments, in shipment order.
  const manifestPieces = assignedManifestPieces(cdfCmos,cmosContext).map(p=>({...p,current:p.scenarioId===scenarioId}));
  // A released manifest stays released only while the manifest itself is unchanged.
  const releaseBasis = manifestBasis(cdfCmos,cmosContext);
  useEffect(() => { setDeparture(state => reconcileRelease(state, releaseBasis)); }, [releaseBasis]);
  // The aircraft commander's package uses the corrected paperwork for every manifested piece.
  const packagePieces = manifestPieces.map(item => ({ key: item.scenarioId, title: item.title, record: item.record, palletId:item.palletId,
    scenario: withDocumentErrors({ ...shipments[item.scenarioId], destination }, { docFixes: { logmod: true, attla: true, hazdec: true } }) }));
  const packageOutstanding = [
    ...(manifestPieces.length < pieceKeys.length ? [`${pieceKeys.length - manifestPieces.length} of ${pieceKeys.length} pieces are not on the manifest.`] : []),
    ...(allPassedJI ? [] : ['Not every piece on the DSOE has passed JI.']),
    ...(loadPlanCurrent ? [] : ['The load plan is not accepted for the current manifest.']),
    ...(departure.releasedAt ? [] : ['The manifest has not been released.']),
  ];
  // Each piece's results, for the after-action report and the grading sheet.
  const pieceResults = () => pieceKeys.map(key => { const view = piece(key); return { key, title: shipments[key].title, tcn: manifestFields(view).find(field => field.id === 'tcn').expected, result: pieceResult(view, exercises[key], cargoSteps.filter(step => isStageComplete(view, step.id, exercises[key])).map(step => step.id)) }; });
  // Practice: the section is done when every piece in it is through the stage (or the plan is
  // accepted, or the manifest released); mistakes count across the practice deployment.
  const practiceComplete = practice ? (practice.section === 'load-plan' ? loadPlanCurrent : practice.section === 'departure' ? Boolean(departure.releasedAt)
    : pieceKeys.every(key => isStageComplete(piece(key), practice.section, exercises[key]))) : false;
  const practiceMistakes = practice ? [...pieceKeys.flatMap(key => exercises[key].mistakes || []), ...(loadPlan.mistakes || []), ...(departure.mistakes || []),...cdfCmos.mistakes] : [];
  function removePiece(id) { cmos.removePiece(id); }
  function onAnswer(id, choice) {
    const finding = scenario.findings.find(item => item.id === id);
    const label = { satisfactory: 'Satisfactory', unsatisfactory: 'Unsatisfactory', 'not-applicable': 'Not applicable' };
    updateExercise(current => {
      const next = { ...current, answers: { ...current.answers, [id]: { choice, corrected: false } } };
      return finding && choice !== finding.correct && current.answers[id]?.choice !== choice ? recordMistake(next, 'decision', `Marked ${finding.title} ${label[choice]}; it was ${label[finding.correct]}`, `DTR Part III App O ${finding.source?.paragraph || ''}`.trim()) : next;
    });
  }
  function onCorrect(id) {
    const finding = scenario.findings.find(item => item.id === id);
    // In test mode the correction button shows for any Unsatisfactory call; correcting a sound item is a mistake.
    if (finding && finding.correct !== 'unsatisfactory' && exercise.answers[id]?.choice === 'unsatisfactory') { updateExercise(current => recordMistake(current, 'decision', `Tried to correct ${finding.title}, which was serviceable`, `DTR Part III App O ${finding.source?.paragraph || ''}`.trim()), true); return; }
    if (finding?.correct !== 'unsatisfactory' || exercise.answers[id]?.choice !== finding.correct || !exercise.inspected.includes(id) || !canConfirmVehicleCorrection(scenario, exercise, id)) return;
    updateExercise(current => ({ ...current, answers: { ...current.answers, [id]: { ...current.answers[id], corrected: true } } }));
  }
  return (
    <ModeContext.Provider value={mode}><RegulationScope assessmentActive={mode === 'test' && !test.finishedAt}>
    <div className="App">
      <AcronymTooltip />
      <Layout activeModule={activeModule} onModuleChange={setActiveModule}>
        {activeModule === 'cdf' ? <>
        <ProcessPanel steps={processSteps} selectedStepId={selectedStep.id} onSelectStep={practice ? step => startPractice(step.id) : setSelectedStep} completedStages={[...completedStages, ...(loadPlanCurrent ? ['load-plan'] : []), ...(departure.releasedAt ? ['departure'] : [])]} lockedSteps={practice ? {} : lockedSteps} onViewDsoe={viewDsoe} dsoeViewed={dsoeViewed} />
        {reportOpen && <AfterActionReport destination={destination} mode={mode} release={{ ...departure, departureAt }} cdfCmos={cdfCmos} onClose={closeReport} pieces={pieceResults()} />}
        {sheetOpen && finished && <CdfGradingSheet test={test} destination={destination} pieces={pieceResults()} loadPlan={loadPlan} departure={departure} cdfCmos={cdfCmos} onClose={closeSheet} />}
        {dsoeOpen && <Dsoe increments={dsoeIncrements} pieceCount={pieceCount} onPieceCountChange={changePieceCount} destination={destination} onDestinationChange={setDestination} destinationLocked={Object.values(exercises).some(item => item.manifestAccepted)} elapsedSeconds={clock.elapsed} milestoneTimes={clock.events} departureAt={departureAt} onClose={closeDsoe} />}
        {guideOpen && <TrainingGuide onClose={closeGuide} />}
        {packageOpen && packagePieces.length > 0 && <AircraftPackage manifest={cdfCmos.manifest} pieces={packagePieces} plan={loadPlan} departureAt={departureAt} releasedAt={departure.releasedAt} destination={destination} outstanding={packageOutstanding} onClose={closePackage} />}
        {drillsOpen && <QuickDrills onClose={closeDrills} />}
        {jiListOpen && <JiInspectionList onClose={closeJiList} />}
        <main className="training-workspace">
          <SessionBar mode={mode} modes={CDF_MODES} testNote="Test mode: hints and explanations are hidden. Finish the test for the grading sheet." onModeChange={changeMode} onNewSession={() => practice ? startPractice(practice.section) : startSession(newSession({ mode }))} clock={clock} onClockChange={setClock}
            onExport={downloadSession} onImport={uploadSession} tools={[['CMOS workspace',()=>setCmosPage('planning')],['Training guide', () => setGuideOpen(true)], ['Quick drills', () => setDrillsOpen(true)], ['JI inspection list', () => setJiListOpen(true)], ['Instructor setup', () => setSetupOpen(true)]]} />
          {transferFeedback && <p className="transfer-feedback" role="status">{transferFeedback}</p>}
          {meta.code && <p className="scenario-code-note">Scenario code <code>{meta.code}</code></p>}
          {setupOpen && <InstructorSetup currentCode={meta.code} onClose={closeSetup} onStart={session => { startSession(session); setSetupOpen(false); }} />}
          {mode === 'test' && <TraineeBar trainee={test.trainee} finishedAt={test.finishedAt} onChange={trainee => setTest(current => ({ ...current, trainee }))}
            onFinish={() => { setTest(current => ({ ...current, finishedAt: Date.now() })); setClock(current => ({ ...current, running: false })); setSheetOpen(true); }} onOpenSheet={() => setSheetOpen(true)} />}
          {practice && <PracticeBar sections={processSteps} section={practice.section} onStart={section => startPractice(section)} note="deployment" complete={practiceComplete} mistakes={practiceMistakes} />}
          {practice && ['precheck','incheck','manifest','ji'].includes(practice.section) && <label className="simulation-note">Practice piece <select aria-label="Practice piece" value={practice.piece || 'random'} onChange={event => startPractice(practice.section, practice.main, event.target.value)}>{practicePieces().map(([id, title]) => <option key={id} value={id}>{title}</option>)}</select></label>}
          {practice && ['load-plan','ji','departure'].includes(practice.section) && <p className="simulation-note">Focused practice: predecessor CMOS shipment, assignment, check, and print tasks are prepared for you.</p>}
          {finished && <p className="reference-note" role="status">Test finished. The work is locked; open the grading sheet to review or print it. Start a new session for the next trainee.</p>}
          <div className="shipment-bar">
            <label>Training shipment <select value={scenarioId} onChange={event => { setScenarioId(event.target.value); setSelectedStep(processSteps[0]); }}>{pieceKeys.map(key => <option value={key} key={key}>{shipments[key].title}</option>)}</select></label>
            <button type="button" onClick={() => setReportOpen(true)}>After-action report</button>
            <button type="button" disabled={manifestPieces.length === 0} title={manifestPieces.length ? undefined : 'Add a piece to the manifest first'} onClick={() => setPackageOpen(true)}>Aircraft paperwork package</button>
            <button type="button" disabled={finished} onClick={() => { const reset=resetPiece(shipments[scenarioId]);setShipments(previous => ({...previous,[scenarioId]:reset}));setCdfCmos(previous=>previous.sharedCmos?{...previous,sharedCmos:resetCdfShipment(previous.sharedCmos,scenarioId,reset)}:previous); updateExercise(current => ({ ...createExercise(), dsoeViewed: current.dsoeViewed })); setSceneVersion(version => version + 1); }}>Reset this shipment</button>
          </div>
          <p className="simulation-note">Shipment values approximate the real equipment · Guided by your Appendix O edition, 3 February 2023. Reset varies each item's size and weight slightly. Standard ISU and pallet footprints stay fixed.</p>
          <div inert={finished || undefined}>
          {selectedStep.id === 'departure' ? <Departure state={departure} departureAt={departureAt} onChange={setDeparture} ready={allPassedJI} waiting={passedJI.filter(item => !item.done).map(item => item.title)} manifestPieces={manifestPieces} destination={destination} basis={releaseBasis} onOpenCmos={()=>setCmosPage('air')} onPrintPackage={() => setPackageOpen(true)} />
          : selectedStep.id === 'load-plan' ? <LoadPlan pieces={pieceKeys.map(key => ({ ...shipments[key], manifested: isStageComplete(piece(key), 'manifest', exercises[key]) }))} plan={loadPlan} onChange={next => setLoadPlan({ ...next, basis: loadBasis })} /> : <div className="simulation-layout">
            <CargoWindow key={`${scenarioId}-${sceneVersion}`} scenario={scenario} exercise={exercise} stage={selectedStep.id}
              onInspectMarkings={side => updateExercise(current=>({...current,jiSides:[...new Set([...current.jiSides,side])]}),true)}
              onVehicleAction={action => updateExercise(current => {
                const next=applyVehicleAction(scenario,current,action);
                if (selectedStep.id!=='ji') return next;
                if(action.type==='inspect-terminal') { const viewed={...current.jiTerminals,[action.terminal]:true}; return {...next,jiTerminals:viewed,jiInspected:viewed.positive&&viewed.negative ? [...new Set([...current.jiInspected,'battery'])] : current.jiInspected}; }
                if(action.type==='read-fuel') return {...next,jiInspected:[...new Set([...current.jiInspected,'fuel'])]};
                return {...next,manifestAccepted:false,jiInspected:[],jiVerified:[],jiMarks:{},jiTerminals:{}};
              },selectedStep.id==='ji')}
              onPlaceLabel={label => updateExercise(current => placeTapeLabel(scenario,current,label))}
              onRemoveLabel={(side,type) => updateExercise(current => ({ ...current, tapeLabels: current.tapeLabels.filter(label => !(label.side === side && label.type === type)), labelFeedback: `${type.toUpperCase()} tape removed from the ${side} side.` }))}
              onRecordMeasurement={record => updateExercise(current => ({ ...current, measurements: [...current.measurements, record], jiMeasurements:selectedStep.id==='ji' ? [...current.jiMeasurements,record] : [] }),selectedStep.id==='ji')}
              onRecordWeight={record => updateExercise(current => ({ ...current, weights: { ...current.weights, [record.id]: record }, jiWeights:selectedStep.id==='ji' ? {...current.jiWeights,[record.id]:record} : {} }),selectedStep.id==='ji')}
              onInspect={id => updateExercise(current => ({ ...current, inspected: [...new Set([...current.inspected, id])], jiInspected: selectedStep.id==='ji' ? [...new Set([...current.jiInspected,id])] : [] }), selectedStep.id==='ji')} />
            <DocumentationPanel step={selectedStep} scenario={scenario} exercise={exercise} onAnswer={onAnswer} onCorrect={onCorrect} completedStages={completedStages}
              onWorkflow={update => updateExercise(update,true)} manifestPieces={manifestPieces} onRemovePiece={removePiece} onOpenCmos={()=>setCmosPage('planning')} manifestMetadata={cdfCmos.manifest}
              onNotebookChange={(field,value) => updateExercise(current => editNotebookEntry(current,field,value))}
              onNotebookSave={field => updateExercise(current => saveNotebookEntry(scenario,current,field))}
              onCBCalculate={result => updateExercise(current => ({ ...current, cbResult: result, tapeLabels: current.tapeLabels.filter(label => label.type !== 'cb'), labelFeedback: '' }))} />
          </div>}
          </div>
        </main>
        {cmosPage && <CdfCmosWorkspace session={cmosContext} state={cdfCmos} initialPage={cmosPage} onClose={closeCmos} onStateChange={cmos.onStateChange} onExerciseChange={cmos.onExerciseChange} onDepartureChange={update=>{if(!finished)setDeparture(update);}}/>}
        </> : activeModule === 'outbound' ? <OutboundTrainer /> : <main className="module-placeholder">
          <div className="module-placeholder-card">
            <span className="module-status">Coming soon</span>
            <h2>{placeholderModules[activeModule]}</h2>
            <p>This training area is ready for its course content. Use the navigation above to return to CDF Training.</p>
          </div>
        </main>}
      </Layout>
    </div>
    </RegulationScope></ModeContext.Provider>
  );
}

export default App;
