import { expectedShipment, missionForSession, cargoKind, ammunitionFixture } from '../CdfCmos/trainingData';
import { createAirManifest, assignCargo, editCheck, markPrinted } from '../CdfCmos/manifestLogic';
import { newSession } from '../../session';
import { createExercise, isStageComplete } from './exercise';
import { paperwork, verifyPaperwork, reviewHazdec, hazdecRequired, manifestFields, saveManifest } from './workflow';
import { screenATTLA } from './transportability';
import { placeTapeLabel } from './notebook';
import { tapeScale } from './cargoModels';
import { correctMarks } from './dd2133';
import { calculateCB } from './centerOfBalance';
import { axleLabels } from './axles';
import { possibleDiscrepancies, withDocumentErrors } from './discrepancies';
import { scenarios } from './scenarios';
import { autoPlan, planBasis } from '../LoadPlan/loadPlanLogic';

// CDF practice mode: one section at a time on a fresh deployment, with every earlier section done
// correctly. Precheck through JI practice one piece of a random equipment type; the load plan and
// departure practice the whole six-piece chalk. Guided hints and feedback stay on.
export const CDF_SECTIONS = ['precheck', 'incheck', 'manifest', 'load-plan', 'ji', 'departure'];
const DEPLOYMENT_SECTIONS = ['load-plan', 'departure'];

// ---- Earlier stages, done the right way ----

export function completePrecheck(s, start) {
  let e = { ...start, dsoeViewed: true, documentsViewed: paperwork(s).map(d => d.id) };
  // Ask the increment monitor for any missing copies.
  const short = paperwork(s).filter(d => d.required && d.copies < d.minimum);
  e = { ...e, documentCopies: { ...e.documentCopies, ...Object.fromEntries(short.map(d => [d.id, d.minimum])) } };
  if (screenATTLA(s).reasons.length || paperwork(s).some(d => d.id === 'attla' && d.required)) e = { ...e, attlaReviewed: true, attlaLetterVerified: true };
  if (hazdecRequired(s)) e = reviewHazdec(s, e);
  for (const d of paperwork(s)) e = verifyPaperwork(s, e, d.id, e.documentCopies[d.id] ?? d.copies);
  return e;
}

// Trucks whose practice tape sits low on the body, just above the panel's lower edge, instead of mid-panel.
const LOW_TAPE = ['rolling-stock', 'three-axle', 'age-generator'];
const measure = (view, a, b) => ({ view, endpoints: [a, b], inches: Math.hypot(b.x - a.x, b.y - a.y) });
export function completeIncheck(s, start) {
  const { length, width, height } = s;
  const measurements = [measure('side', { x: 0, y: 0 }, { x: length, y: 0 }), measure('front', { x: 0, y: 0 }, { x: width, y: 0 }), measure('side', { x: 0, y: 0 }, { x: 0, y: height }),
    ...(s.axles || []).map(axle => measure('side', { x: 0, y: height }, { x: axle.position, y: height }))];
  const weights = { gross: { id: 'gross', title: 'Gross weight', pounds: s.weight }, ...Object.fromEntries((s.axles || []).map(axle => [axle.id, { id: axle.id, title: axle.title, pounds: axle.weight }])) };
  const notebookEntries = { length, width, height, gross: s.weight, ...Object.fromEntries((s.axles || []).flatMap((axle, i) => [[`D${i + 1}`, axle.position], [`W${i + 1}`, axle.weight]])) };
  const findings = s.findings.filter(f => f.id !== 'label');
  let e = { ...start, measurements, weights, notebookEntries, inspected: findings.map(f => f.id),
    answers: Object.fromEntries(findings.map(f => [f.id, { choice: f.correct, corrected: f.correct === 'unsatisfactory' }])),
    ...(s.vehicleChecks ? { vehicleState: { positiveTaped: true, negativeTaped: true, fuelFraction: Math.min(s.vehicleChecks.fuelFraction, s.vehicleChecks.fuelLimit) }, terminalViewed: { positive: true, negative: true }, fuelViewed: true } : {}) };
  if (!s.axles) return e;
  e = { ...e, cbResult: calculateCB(s.axles.map(axle => ({ distance: axle.position, weight: axle.weight })), s.weight) };
  // Tape goes where placeTapeLabel accepts it: on a body panel directly above each axle, and the CB T
  // at the CB, centred in the panel's height there, or low on it for LOW_TAPE trucks (nudged aft or
  // forward only if the panel is cut away).
  for (const type of [...axleLabels(s).map(axle => axle.type), 'cb']) {
    const axle = axleLabels(s).find(item => item.type === type);
    const x0 = type === 'cb' ? e.cbResult.rounded : axle.position;
    const value = type === 'cb' ? e.cbResult.rounded : axle.weight;
    const before = e;
    const place = spot => placeTapeLabel(s, before, { side: 'left', type, ...spot, value: String(value), gross: String(s.weight) });
    for (const dx of [0, -1, 1, -2, 2]) {
      const fits = Array.from({ length: Math.ceil(height) * 2 + 1 }, (_, i) => ({ x: x0 + dx, y: i / 2 })).filter(at => place(at).tapeLabels.some(label => label.type === type));
      if (!fits.length) continue;
      // Low tape keeps its whole footprint on the panel: the axle strip's lower edge, or a small inset for the CB T's stem.
      const low = fits[fits.length - 1].y - tapeScale(s) * (type === 'cb' ? 2 : 5);
      const spot = LOW_TAPE.includes(s.id) ? fits.reduce((best, at) => Math.abs(at.y - low) < Math.abs(best.y - low) ? at : best) : fits[Math.floor(fits.length / 2)];
      e = { ...place(spot), labelFeedback: '' };
      break;
    }
  }
  return e;
}

export function completeManifest(s, start) {
  const e = saveManifest(s, { ...start, manifestDraft: Object.fromEntries(manifestFields(s).map(f => [f.id, String(f.expected)])) }, isStageComplete(s, 'incheck', start));
  return { ...e, cmosRequired:true, manifestDraft:expectedShipment(s), shipmentRecord:expectedShipment(s), manifestRecord:expectedShipment(s), mslApplied:e.manifestAccepted, manifestFeedback:'' };
}

export function completeJI(s, start) {
  const e = { ...start, jiInspected: s.findings.map(f => f.id), jiDocumentsViewed: paperwork(s).map(d => d.id), jiMeasurements: start.measurements, jiWeights: start.weights,
    jiSides: s.axles ? ['left', 'right'] : [], jiTerminals: s.vehicleChecks ? { positive: true, negative: true } : {} };
  return { ...e, jiMarks: correctMarks(s, e) };
}

const STAGE_STEPS = [['precheck', completePrecheck], ['incheck', completeIncheck], ['manifest', completeManifest]];

// ---- A practice deployment ----

// Discrepancies an earlier section would have fixed are left out: from Incheck on, the paperwork
// is in order; from Manifest on, the piece itself is sound too.
function forcedFor(section, slots) {
  const index = CDF_SECTIONS.indexOf(section);
  if (index < 1) return {};
  return Object.fromEntries(slots.map(slot => [slot.key, Object.fromEntries(possibleDiscrepancies(slot.template).filter(([id]) => index >= 2 || id.startsWith('doc-')).map(([id]) => [id, false]))]));
}

// The single piece to practice on: 'random', a scenario id, or 'ammunition' (an explosives pallet).
export const practicePieces = () => [['random', 'Random equipment'], ...scenarios.map(item => [item.id, item.title]), ['ammunition', 'Ammunition / explosives pallet']];

export function newPracticeSession({ section = 'precheck', cargo = 'equipment', piece = cargo === 'ammunition' ? 'ammunition' : 'random', random = Math.random } = {}) {
  const index = CDF_SECTIONS.indexOf(section);
  const deployment = DEPLOYMENT_SECTIONS.includes(section);
  const slots = scenarios.map(template => ({ key: template.id, template }));
  for (let tries = 0; ; tries += 1) {
    const base = newSession({ random, forced: forcedFor(section, slots), pieceCount: deployment ? scenarios.length : 1, mode: 'practice' });
    // The chosen (or a random) piece: move it to the front of the deployment.
    const ammunition = piece === 'ammunition' && !deployment;
    const first = deployment ? scenarios[0].id : ammunition ? '463l-pallet' : scenarios.some(item => item.id === piece) ? piece : scenarios[Math.floor(random() * scenarios.length)].id;
    const shipments = { [first]: base.shipments[first], ...base.shipments };
    if(ammunition)shipments[first]={...ammunitionFixture(),id:'463l-pallet',key:first,tcn:shipments[first].tcn};
    const keys = Object.keys(shipments).slice(0, base.pieceCount);
    const view = key => withDocumentErrors({ ...shipments[key], destination: base.destination }, base.exercises[key]);
    const exercises = { ...base.exercises };
    for (const key of keys) {
      let e = createExercise();
      for (const [, complete] of STAGE_STEPS.slice(0, Math.min(index, 3))) e = complete(view(key), e);
      if (index >= 5) e = completeJI(view(key), e);
      exercises[key] = { ...e, mistakes: [], firstActionAt: null };
    }
    // JI and departure need the accepted load plan; departure also needs every piece through JI.
    let loadPlan = base.loadPlan;
    if (index >= 4) {
      const pieces = keys.map(key => ({ ...shipments[key], key }));
      loadPlan = { ...base.loadPlan, placements: autoPlan(pieces), accepted: true, acceptedAt: Date.now(), feedback: 'Training load plan accepted.',
        basis: planBasis(keys.map(key => ({ ...shipments[key], key, manifested: isStageComplete(view(key), 'manifest', exercises[key]) }))) };
    }
    const done = [...STAGE_STEPS.slice(0, Math.min(index, 3)).map(([stage]) => stage), ...(index >= 5 ? ['ji'] : [])];
    const ready = keys.every(key => done.every(stage => isStageComplete(view(key), stage, exercises[key])));
    if (ready || tries >= 20) {
      const context={...base,shipments,exercises,loadPlan,pieceKeys:keys};
      let cdfCmos=base.cdfCmos;
      if(index>=3){
        cdfCmos=createAirManifest(cdfCmos,missionForSession(context),context,'TRNPRACTICE001').state;
        for(const key of keys){const kind=cargoKind(shipments[key]);cdfCmos=assignCargo(cdfCmos,{id:kind.palletId||key,kind:kind.kind,pieceKeys:[key]},context).state;}
        cdfCmos=editCheck(cdfCmos,context).state;
        cdfCmos=markPrinted(cdfCmos,'pull',context).state;cdfCmos=markPrinted(cdfCmos,'manifest',context).state;
      }
      return {...base,shipments,exercises,loadPlan,cdfCmos,scenarioId:first,stepId:section};
    }
  }
}
