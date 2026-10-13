import { useEffect, useState } from 'react';
import ProcessPanel from '../ProcessPanel/ProcessPanel';
import { FREQUENT_LINKS } from '../ProcessPanel/frequentLinks';
import SessionBar from '../Session/SessionBar';
import { ModeContext } from '../Session/mode';
import OutboundCargoWindow from './OutboundCargoWindow';
import OutboundPanel from './OutboundPanel';
import { ITEMS, ORIGINS } from './outboundData';
import { createQueue } from './outboundShipments';
import {
  OUTBOUND_STEPS, createOutboundExercise, answerCheck, returnToCustomer, acceptCustody, packShipment, editForm, submitForm,
  stageComplete, lockedSteps, shipmentComplete, markPrinted, applyLabel,
} from './outboundLogic';
import { incheckTcn, newRecord, discardRecord, editRecord, addPiece, editPiece, deletePieces, savePlanning, openExpressShip, editExpress, sendRequest, cancelRequest, closedPackage } from './cmosLogic';
import './outbound.css';

// Outbound (Traffic Management) trainer: a queue of customers bring cargo with a DD 1348-1A or
// DD 1149; the trainee receives, packs, inchecks, plans and ships each one. Saved in this browser
// separately from the CDF session.
const STORAGE_KEY = 'outbound-trainer-session';
const VERSION = 4;
// Outbound keeps every frequent link except DTR Part III, which covers deployments.
const OUTBOUND_LINKS = FREQUENT_LINKS.filter(group => !group.group.includes('Part III'));

export function newOutboundSession({ random, mode = 'guided', origin = 'jber' } = {}) {
  const shipments = createQueue({ random, origin });
  return { version: VERSION, origin, shipments, exercises: Object.fromEntries(shipments.map(shipment => [shipment.key, createOutboundExercise()])), selected: shipments[0].key, stepId: 'receive', mode };
}
export function loadOutboundSession() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
    const valid = saved?.version === VERSION && ORIGINS[saved.origin] && Array.isArray(saved.shipments) && saved.shipments.length > 0
      && saved.shipments.every(shipment => ITEMS[shipment.itemId] && saved.exercises?.[shipment.key]?.answers && saved.exercises[shipment.key].cmos && Array.isArray(saved.exercises[shipment.key].markings))
      && saved.shipments.some(shipment => shipment.key === saved.selected);
    return valid ? saved : null;
  } catch { return null; }
}

export default function OutboundTrainer() {
  const [session, setSession] = useState(() => loadOutboundSession() || newOutboundSession());
  const [benchVersion, setBenchVersion] = useState(0);
  useEffect(() => { try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session)); } catch { /* storage blocked: keep working unsaved */ } }, [session]);
  const shipment = session.shipments.find(item => item.key === session.selected);
  const exercise = session.exercises[shipment.key];
  const locks = lockedSteps(shipment, exercise);
  const step = OUTBOUND_STEPS.find(item => item.id === session.stepId) || OUTBOUND_STEPS[0];
  useEffect(() => { if (locks[session.stepId]) setSession(current => ({ ...current, stepId: 'receive' })); }, [locks, session.stepId]);

  const setStep = next => setSession(current => ({ ...current, stepId: next.id }));
  const update = change => setSession(current => {
    const previous = current.exercises[current.selected];
    const next = change(previous);
    return next === previous ? current : { ...current, exercises: { ...current.exercises, [current.selected]: { ...next, firstActionAt: previous.firstActionAt || Date.now() } } };
  });
  const selectCustomer = key => { setSession(current => ({ ...current, selected: key, stepId: 'receive' })); setBenchVersion(version => version + 1); };
  const actions = {
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
    printDocument: (doc, key) => setSession(current => {
      const target = key || current.selected;
      const previous = current.exercises[target];
      const next = markPrinted(previous, doc);
      return next === previous ? current : { ...current, exercises: { ...current.exercises, [target]: next } };
    }),
    applyLabel: id => update(e => applyLabel(e, id)),
  };
  // Every closed small package this session, for the CMOS print documents window and pickup report.
  const packages = session.shipments.map(item => {
    const closed = closedPackage(item, session.exercises[item.key]);
    return closed && { ...closed, shipment: item, exercise: session.exercises[item.key] };
  }).filter(Boolean);
  const started = session.shipments.some(item => session.exercises[item.key].firstActionAt);
  const onInspect = id => update(e => ({ ...e, tagInspected: e.tagInspected || id === 'tag', counted: e.counted || id === 'count' }));
  const onMeasure = dimension => update(e => e.measured[dimension] ? e : { ...e, measured: { ...e.measured, [dimension]: true } });
  const onWeigh = () => update(e => e.weighed ? e : { ...e, weighed: true });
  const index = session.shipments.indexOf(shipment);
  const nextCustomer = session.shipments.slice(index + 1).find(item => !shipmentComplete(item, session.exercises[item.key]));
  const completed = OUTBOUND_STEPS.filter(item => stageComplete(shipment, exercise, item.id)).map(item => item.id);

  return <ModeContext.Provider value={session.mode}>
    <ProcessPanel title="Outbound Process" label="Outbound process steps" links={OUTBOUND_LINKS} steps={OUTBOUND_STEPS} selectedStepId={step.id} onSelectStep={setStep} completedStages={completed} lockedSteps={locks} />
    <main className="training-workspace outbound-workspace">
      <SessionBar mode={session.mode} onModeChange={mode => setSession(current => ({ ...current, mode }))} onNewSession={() => { setSession(newOutboundSession({ mode: session.mode, origin: session.origin })); setBenchVersion(version => version + 1); }} />
      <div className="shipment-bar">
        <label title={started ? 'Start a new session to change the origin' : undefined}>Shipping from <select value={session.origin} disabled={started} onChange={event => { setSession(newOutboundSession({ mode: session.mode, origin: event.target.value })); setBenchVersion(version => version + 1); }}>{Object.values(ORIGINS).map(origin => <option key={origin.id} value={origin.id}>{origin.name} ({origin.dodaac})</option>)}</select></label>
        <label>Customer <select value={shipment.key} onChange={event => selectCustomer(event.target.value)}>{session.shipments.map(item => <option key={item.key} value={item.key}>Customer {item.serial} · {ITEMS[item.itemId].nomenclature.toLowerCase()}{shipmentComplete(item, session.exercises[item.key]) ? ' (shipped)' : ''}</option>)}</select></label>
        <button type="button" onClick={() => { update(() => createOutboundExercise()); setSession(current => ({ ...current, stepId: 'receive' })); setBenchVersion(version => version + 1); }}>Reset this shipment</button>
      </div>
      <p className="simulation-note">Training shipments from the {ORIGINS[session.origin].name} TMO ({ORIGINS[session.origin].dodaac}) · Fictional NSNs, part numbers and TACs; consignee DoDAACs from the CMOS DoDAAC table · Mil Mode rules are shown in Shipment planning (guided mode).</p>
      <div className="simulation-layout">
        <OutboundCargoWindow key={`${shipment.key}-${benchVersion}`} shipment={shipment} exercise={exercise} onInspect={onInspect} onMeasure={onMeasure} onWeigh={onWeigh} onApplyLabel={actions.applyLabel} />
        <OutboundPanel step={step} shipment={shipment} exercise={exercise} actions={actions} packages={packages} onSelectStep={setStep} hasNextCustomer={Boolean(nextCustomer)} onNextCustomer={() => nextCustomer && selectCustomer(nextCustomer.key)} />
      </div>
    </main>
  </ModeContext.Provider>;
}
