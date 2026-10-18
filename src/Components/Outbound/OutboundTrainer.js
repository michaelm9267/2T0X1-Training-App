import { useCallback, useEffect, useState } from 'react';
import { publishSave } from '../../cloudBridge';
import ProcessPanel from '../ProcessPanel/ProcessPanel';
import { FREQUENT_LINKS } from '../ProcessPanel/frequentLinks';
import SessionBar from '../Session/SessionBar';
import { ModeContext } from '../Session/mode';
import OutboundCargoWindow from './OutboundCargoWindow';
import OutboundPanel from './OutboundPanel';
import { DocumentBody } from './ShippingDocument';
import { ITEMS, ORIGINS } from './outboundData';
import { createQueue } from './outboundShipments';
import { newPractice } from './outboundPractice';
import OutboundGradingSheet from './OutboundGradingSheet';
import { TraineeBar, emptyTest } from '../Session/Grading';
import {
  OUTBOUND_STEPS, createOutboundExercise, answerCheck, returnToCustomer, acceptCustody, packShipment, editForm, submitForm,
  stageComplete, lockedSteps, shipmentComplete, markPrinted, applyLabel, presentedDocument,
} from './outboundLogic';
import { incheckTcn, newRecord, discardRecord, editRecord, addPiece, editPiece, deletePieces, savePlanning, openExpressShip, editExpress, sendRequest, cancelRequest, closedPackage } from './cmosLogic';
import { migrateOutboundCmos, projectOutbound, resetOutboundShipment } from '../Cmos/courseAdapters';
import { normalizeCmosStore } from '../Cmos/model';
import './outbound.css';

// Outbound (Traffic Management) trainer: a queue of customers bring cargo with a DD 1348-1A or
// DD 1149; the trainee receives, packs, inchecks, plans and ships each one. Practice mode works one
// section at a time on its own shipment, leaving the queue as it was. Test mode takes the trainee's
// rank and name, and finishing the test locks the queue and opens a printable grading sheet. Saved in
// this browser separately from the CDF session.
export const STORAGE_KEY = 'outbound-trainer-session';
const VERSION = 5;
// Outbound keeps every frequent link except DTR Part III, which covers deployments.
const OUTBOUND_LINKS = FREQUENT_LINKS.filter(group => !group.group.includes('Part III'));
const OUTBOUND_MODES = [['guided', 'Guided'], ['practice', 'Practice'], ['test', 'Test']];

export function newOutboundSession({ random, mode = 'guided', origin = 'jber' } = {}) {
  const shipments = createQueue({ random, origin });
  return { version: VERSION, origin, shipments, exercises: Object.fromEntries(shipments.map(shipment => [shipment.key, createOutboundExercise()])), selected: shipments[0].key, stepId: 'receive', mode,
    practice: mode === 'practice' ? newPractice({ random, origin }) : null, trainee: emptyTest().trainee, testFinishedAt: null };
}
// Sessions saved before DD 1149 requisition numbers took an X in position 11 get it on load.
const with1149Number = shipment => shipment.document === '1149' && shipment.documentNumber[10] !== 'X'
  ? { ...shipment, documentNumber: `${shipment.documentNumber.slice(0, 10)}X${shipment.documentNumber.slice(-3)}` } : shipment;
export function normalizeOutboundSession(saved) {
  try {
    const valid = [4, VERSION].includes(saved?.version) && ORIGINS[saved.origin] && Array.isArray(saved.shipments) && saved.shipments.length > 0
      && saved.shipments.every(shipment => ITEMS[shipment.itemId] && saved.exercises?.[shipment.key]?.answers && saved.exercises[shipment.key].cmos && Array.isArray(saved.exercises[shipment.key].markings))
      && saved.shipments.some(shipment => shipment.key === saved.selected);
    if (!valid) return null;
    const practice = saved.practice?.section && saved.practice.shipment && ITEMS[saved.practice.shipment.itemId] && saved.practice.exercise?.cmos ? saved.practice : null;
    return { ...saved, version:VERSION, ...(saved.sharedCmos?{sharedCmos:normalizeCmosStore(saved.sharedCmos)}:{}), shipments: saved.shipments.map(with1149Number), practice: practice || (saved.mode === 'practice' ? newPractice({ origin: saved.origin }) : null), trainee: saved.trainee || emptyTest().trainee };
  } catch { return null; }
}

export function loadOutboundSession(){try{return normalizeOutboundSession(JSON.parse(window.localStorage.getItem(STORAGE_KEY)));}catch{return null;}}
export const exportOutboundSession=session=>JSON.stringify({kind:'outbound-training-session',session},null,2);
export function importOutboundSession(text){try{const payload=JSON.parse(text);return payload.kind==='outbound-training-session'?normalizeOutboundSession(payload.session):null;}catch{return null;}}

export default function OutboundTrainer() {
  const [session, setSession] = useState(() => loadOutboundSession() || newOutboundSession());
  const [benchVersion, setBenchVersion] = useState(0);
  const [cmosRequest,setCmosRequest]=useState(0),[sessionNotice,setSessionNotice]=useState(''),[storageError,setStorageError]=useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const closeSheet = useCallback(() => setSheetOpen(false), []);
  useEffect(() => { publishSave('outbound', session); try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));setStorageError(false); } catch { setStorageError(true); } }, [session]);
  const practicing = session.mode === 'practice' && Boolean(session.practice);
  const shipment = practicing ? session.practice.shipment : session.shipments.find(item => item.key === session.selected);
  const exercise = practicing ? session.practice.exercise : session.exercises[shipment.key];
  // Practice opens any section; the queue keeps its step locks.
  const locks = practicing ? {} : lockedSteps(shipment, exercise);
  const stepId = practicing ? session.practice.stepId : session.stepId;
  const step = OUTBOUND_STEPS.find(item => item.id === stepId) || OUTBOUND_STEPS[0];
  const stepLocked = Boolean(locks[session.stepId]);
  useEffect(() => { if (stepLocked) setSession(current => ({ ...current, stepId: 'receive' })); }, [stepLocked]);

  const setStep = next => setSession(current => current.mode === 'practice' ? { ...current, practice: { ...current.practice, stepId: next.id } } : { ...current, stepId: next.id });
  // Change one exercise: the practice shipment's, or a queue customer's. A finished test locks the queue.
  const changeExercise = (current, key, change) => {
    if (current.mode === 'practice') {
      const previous = current.practice.exercise;
      const next = change(previous);
      return next === previous ? current : { ...current, practice: { ...current.practice, exercise: { ...next, firstActionAt: previous.firstActionAt || Date.now() } } };
    }
    if (current.testFinishedAt) return current;
    const previous = current.exercises[key];
    const next = change(previous);
    return next === previous ? current : { ...current, exercises: { ...current.exercises, [key]: { ...next, firstActionAt: previous.firstActionAt || Date.now() } } };
  };
  const update = change => setSession(current => changeExercise(current, current.selected, change));
  const startPractice = practiceStep => { setSession(current => ({ ...current, practice: newPractice({ origin: current.origin, stepId: practiceStep }) })); setBenchVersion(version => version + 1); };
  const changeMode = mode => setSession(current => ({ ...current, mode, practice: mode === 'practice' && !current.practice ? newPractice({ origin: current.origin }) : current.practice }));
  const selectCustomer = key => { setSession(current => {const id=Object.values(current.sharedCmos?.shipments||{}).find(r=>r.draft.assetKey===key)?.id;return {...current,selected:key,stepId:'receive',...(id?{sharedCmos:{...current.sharedCmos,selection:{...current.sharedCmos.selection,shipments:id}}}:{})};}); setBenchVersion(version => version + 1); };
  const actions = {
    sharedCmos: next => setSession(current => {
      if (current.testFinishedAt && current.mode !== 'practice') return current;
      if(current.mode==='practice')return {...current,practice:{...current.practice,sharedCmos:next,exercise:projectOutbound(next,{[current.practice.shipment.key]:current.practice.exercise})[current.practice.shipment.key]}};
      return {...current,sharedCmos:next,exercises:projectOutbound(next,current.exercises)};
    }),
    viewDocument: () => update(e => e.documentViewed ? e : { ...e, documentViewed: true }),
    answer: (id, choice) => update(e => answerCheck(shipment, e, id, choice)),
    returnDocument: () => update(e => returnToCustomer(shipment, e)),
    acceptCustody: () => update(e => acceptCustody(shipment, e)),
    chooseContainer: id => update(e => e.packed ? e : { ...e, container: id, packFeedback: '' }),
    toggleMarking: id => update(e => e.packed ? e : { ...e, markings: e.markings.includes(id) ? e.markings.filter(item => item !== id) : [...e.markings, id], packFeedback: '' }),
    pack: () => update(e => packShipment(shipment, e)),
    editForm: (formId, field, value) => update(e => editForm(e, formId, field, value)),
    submitForm: formId => update(e => submitForm(shipment, e, formId)),
    incheck: tcn => update(e => incheckTcn(shipment, e, tcn)),
    newRecord: () => update(e => newRecord(shipment, e)),
    discardRecord: () => update(discardRecord),
    cmosMessage: message => update(e => ({ ...e, cmos: { ...e.cmos, message } })),
    editRecord: (field, value) => update(e => editRecord(e, field, value)),
    addPiece: () => update(addPiece),
    editPiece: (index, field, value) => update(e => editPiece(e, index, field, value)),
    deletePieces: () => update(deletePieces),
    savePlanning: () => update(e => savePlanning(shipment, e)),
    openExpress: () => update(openExpressShip),
    editExpress: (field, value) => update(e => editExpress(e, field, value)),
    sendRequest: () => update(e => sendRequest(shipment, e)),
    cancelRequest: () => update(cancelRequest),
    // Documents print for the selected customer, or for another closed package listed in CMOS.
    printDocument: (doc, key) => setSession(current => changeExercise(current, key || current.selected, previous => markPrinted(previous, doc))),
    applyLabel: id => update(e => applyLabel(e, id)),
  };
  // Every closed small package this session, for the CMOS print documents window and pickup report.
  const packages = (practicing ? [[shipment, exercise]] : session.shipments.map(item => [item, session.exercises[item.key]])).map(([item, e]) => {
    const closed = closedPackage(item, e);
    return closed && { ...closed, shipment: item, exercise: e };
  }).filter(Boolean);
  const started = session.shipments.some(item => session.exercises[item.key].firstActionAt);
  const onInspect = id => update(e => ({ ...e, tagInspected: e.tagInspected || id === 'tag', counted: e.counted || id === 'count' }));
  const onMeasure = dimension => update(e => e.measured[dimension] ? e : { ...e, measured: { ...e.measured, [dimension]: true } });
  const onWeigh = () => update(e => e.weighed ? e : { ...e, weighed: true });
  const index = session.shipments.indexOf(shipment);
  const nextCustomer = session.shipments.slice(index + 1).find(item => !shipmentComplete(item, session.exercises[item.key]));
  const completed = OUTBOUND_STEPS.filter(item => stageComplete(shipment, exercise, item.id)).map(item => item.id);

  const newSession = origin => { setSession(newOutboundSession({ mode: session.mode, origin })); setSheetOpen(false); setBenchVersion(version => version + 1); };
  const finished = Boolean(session.testFinishedAt);

  return <ModeContext.Provider value={session.mode}>
    <ProcessPanel title="Outbound Process" label="Outbound process steps" links={OUTBOUND_LINKS} steps={OUTBOUND_STEPS} selectedStepId={step.id} onSelectStep={practicing ? next => startPractice(next.id) : setStep} completedStages={completed} lockedSteps={locks} />
    <main className="training-workspace outbound-workspace">
      <SessionBar mode={session.mode} modes={OUTBOUND_MODES} testNote="Test mode: hints and explanations are hidden. Finish the test for the grading sheet." onModeChange={changeMode} onNewSession={() => newSession(session.origin)} tools={[["CMOS workspace",()=>setCmosRequest(n=>n+1)]]} onExport={()=>{const url=URL.createObjectURL(new Blob([exportOutboundSession(session)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download='transit-iq-outbound-session.json';link.click();URL.revokeObjectURL(url);}} onImport={text=>{const loaded=importOutboundSession(text);if(loaded){setSession(loaded);setSessionNotice('Outbound session imported.');setBenchVersion(n=>n+1);}else setSessionNotice('This file is not a valid Outbound session; current work was retained.');}} />
      {sessionNotice&&<p role="status">{sessionNotice}</p>}
      {session.mode === 'test' && <TraineeBar trainee={session.trainee} finishedAt={session.testFinishedAt} onChange={trainee => setSession(current => ({ ...current, trainee }))}
        onFinish={() => { setSession(current => ({ ...current, testFinishedAt: Date.now() })); setSheetOpen(true); }} onOpenSheet={() => setSheetOpen(true)} />}
      {sheetOpen && finished && <OutboundGradingSheet trainee={session.trainee} origin={ORIGINS[session.origin]} shipments={session.shipments} exercises={session.exercises} finishedAt={session.testFinishedAt} onClose={closeSheet} />}
      {practicing ? <div className="shipment-bar" role="group" aria-label="Practice">
        <label>Practice section <select value={session.practice.section} onChange={event => startPractice(event.target.value)}>{OUTBOUND_STEPS.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
        <button type="button" onClick={() => startPractice(session.practice.section)}>New practice shipment</button>
      </div> : <div className="shipment-bar">
        <label title={started ? 'Start a new session to change the origin' : undefined}>Shipping from <select value={session.origin} disabled={started} onChange={event => newSession(event.target.value)}>{Object.values(ORIGINS).map(origin => <option key={origin.id} value={origin.id}>{origin.name} ({origin.cmosDodaac})</option>)}</select></label>
        <label>Customer <select value={shipment.key} onChange={event => selectCustomer(event.target.value)}>{session.shipments.map(item => <option key={item.key} value={item.key}>Customer {item.serial} · {ITEMS[item.itemId].nomenclature.toLowerCase()}{shipmentComplete(item, session.exercises[item.key]) ? ' (shipped)' : ''}</option>)}</select></label>
        <button type="button" disabled={finished} onClick={() => { setSession(current=>{const exercise=createOutboundExercise();return {...current,stepId:'receive',exercises:{...current.exercises,[current.selected]:exercise},sharedCmos:current.sharedCmos?resetOutboundShipment(current.sharedCmos,current.selected,current.shipments.find(s=>s.key===current.selected),exercise):undefined};}); setBenchVersion(version => version + 1); }}>Reset this shipment</button>
      </div>}
      {finished && !practicing && <p className="reference-note" role="status">Test finished. The work is locked; open the grading sheet to review or print it. Start a new session for the next trainee.</p>}
      <p className="simulation-note">Training shipments from the {ORIGINS[session.origin].name} TMO ({ORIGINS[session.origin].cmosDodaac}) · Fictional NSNs, part numbers and TACs; consignee DoDAACs from the CMOS DoDAAC table · Mil Mode rules are shown in Shipment planning (guided and practice modes).</p>
      <div className="simulation-layout">
        <OutboundCargoWindow key={`${shipment.key}-${benchVersion}`} shipment={shipment} exercise={exercise} onInspect={onInspect} onMeasure={onMeasure} onWeigh={onWeigh} onApplyLabel={actions.applyLabel} />
        <OutboundPanel cmosRequest={cmosRequest} cmosStore={migrateOutboundCmos(practicing?{shipments:[session.practice.shipment],exercises:{[session.practice.shipment.key]:session.practice.exercise},selected:session.practice.shipment.key,sharedCmos:session.practice.sharedCmos}:session)} cmosContext={{storageError,finished:Boolean(session.testFinishedAt)&&!practicing,shipments:practicing?[session.practice.shipment]:session.shipments,documents:(practicing?[session.practice.shipment]:session.shipments).map(item=>{const ex=practicing?session.practice.exercise:session.exercises[item.key];return {id:'source-'+item.key,title:`DD ${item.document} · Customer ${item.serial}`,render:()=> <DocumentBody shipment={item} doc={presentedDocument(item,ex.returned)} received={ex.custodyAccepted} packing={ex.forms.annotation?.accepted?ex.forms.annotation.draft:null}/>};})}} step={step} shipment={shipment} exercise={exercise} actions={actions} packages={packages} onSelectStep={setStep} hasNextCustomer={Boolean(nextCustomer)} onNextCustomer={() => nextCustomer && selectCustomer(nextCustomer.key)}
          practice={practicing ? { section: session.practice.section, onAgain: () => startPractice(session.practice.section) } : null} />
      </div>
    </main>
  </ModeContext.Provider>;
}
