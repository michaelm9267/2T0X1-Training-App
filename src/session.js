import { normalizeCmosStore } from './Components/Cmos/model';
import { emptyCdfCmos } from './Components/CdfCmos/manifestLogic';
import { createPieces, MAX_PIECES } from './Components/CargoWindow/pieces';
import { createExercise } from './Components/CargoWindow/exercise';
import { DESTINATIONS, randomDestination } from './Components/CargoWindow/workflow';
import { emptyPlan } from './Components/LoadPlan/loadPlanLogic';
import { emptyDeparture } from './Components/Departure/departureLogic';
import { scenarios } from './Components/CargoWindow/scenarios';
import { publishSave } from './cloudBridge';

// The training session, saved in this browser so a refresh or closed tab resumes where the
// trainee left off. A new session (or a scenario code) replaces it.
export const STORAGE_KEY = 'cdf-trainer-session';
const VERSION = 1;

export function normalizeSession(saved) {
  if (saved?.version !== VERSION || Object.keys(saved.shipments || {}).length !== MAX_PIECES) return null;
  const keys = Object.keys(saved.shipments);
  if (!Number.isInteger(saved.pieceCount) || saved.pieceCount < 1 || saved.pieceCount > MAX_PIECES || !keys.slice(0, saved.pieceCount).includes(saved.scenarioId) || !DESTINATIONS.includes(saved.destination)) return null;
  const validExercise = exercise => exercise && ['documentsViewed', 'jiDocumentsViewed', 'jiMeasurements', 'jiSides', 'jiInspected', 'jiVerified', 'measurements', 'inspected', 'tapeLabels', 'frustrations'].every(field => Array.isArray(exercise[field])) && ['documentsVerified', 'documentCopies', 'documentFeedback', 'manifestDraft', 'jiWeights', 'jiTerminals', 'weights', 'answers', 'notebookDraft', 'notebookEntries', 'notebookFeedback', 'vehicleState', 'terminalViewed'].every(field => exercise[field] && typeof exercise[field] === 'object');
  if (!keys.every(key => saved.shipments[key]?.key === key && Array.isArray(saved.shipments[key]?.findings) && validExercise(saved.exercises?.[key]))) return null;
  const plan = saved.loadPlan || emptyPlan();
  if (!plan.placements || typeof plan.placements !== 'object' || !Array.isArray(plan.mistakes)) return null;
  const elapsed = Number.isFinite(saved.clock?.elapsed) && saved.clock.elapsed >= 0 ? saved.clock.elapsed : 0;
  const events = saved.clock?.events && typeof saved.clock.events === 'object' ? saved.clock.events : {};
  // Sessions saved before the departure step start with no departure set.
  const departure = saved.departure && typeof saved.departure === 'object' && Array.isArray(saved.departure.mistakes) ? saved.departure : emptyDeparture();
  const cdfCmos = saved.cdfCmos ? {...saved.cdfCmos,...(saved.cdfCmos.sharedCmos?{sharedCmos:normalizeCmosStore(saved.cdfCmos.sharedCmos)}:{})} : emptyCdfCmos();
  if (!validCdfCmos(cdfCmos, saved)) return null;
  const exercises = Object.fromEntries(keys.map(key => {
    const e=saved.exercises[key];
    return [key, {...e, cmosRequired:true, shipmentRecord:e.shipmentRecord || e.manifestRecord || null,
      ...(!saved.cdfCmos ? {manifestAccepted:false, mslApplied:false} : {})}];
  }));
  return { ...saved, cdfCmos, exercises, loadPlan: plan, departure, clock: { elapsed, running: false, events } };
}

// A fresh session. With a seeded random function and forced discrepancies, every trainee who
// loads the same scenario code gets the same deployment.
export function newSession({ random, forced, destination, pieceCount = scenarios.length, mode = 'guided', code = null } = {}) {
  const pieces = createPieces({ random, forced });
  return {
    version: VERSION,
    shipments: Object.fromEntries(pieces.map(piece => [piece.key, piece])),
    exercises: Object.fromEntries(pieces.map(piece => [piece.key, {...createExercise(), cmosRequired:true, shipmentRecord:null}])),
    cdfCmos: emptyCdfCmos(),
    destination: destination || randomDestination(random),
    pieceCount,
    scenarioId: pieces[0].key,
    stepId: 'precheck',
    mode,
    code,
    startedAt: Date.now(),
    loadPlan: emptyPlan(),
    departure: emptyDeparture(),
    clock: { elapsed: 0, running: false, events: {} },
  };
}

export function loadSession() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
    return normalizeSession(saved);
  } catch {
    return null;
  }
}

export function exportSession(session) {
  return JSON.stringify({ kind: 'cdf-training-session', exportedAt: new Date().toISOString(), session }, null, 2);
}

export function importSession(text) {
  try {
    const payload = JSON.parse(text);
    return payload?.kind === 'cdf-training-session' ? normalizeSession(payload.session) : null;
  } catch { return null; }
}

export function saveSession(session) {
  publishSave('cdf', session);
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session)); return true; } catch { return false; }
}

export function clearSession() {
  try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* nothing saved */ }
}

function validCdfCmos(state, saved) {
 if(!state || !state.releaseDetails || typeof state.releaseDetails!=='object' || Array.isArray(state.releaseDetails) || !Array.isArray(state.assignments) || !Array.isArray(state.mistakes) || !state.headerDraft || typeof state.headerDraft!=='object' || !Number.isInteger(state.revision) || state.revision<0)return false;
 for(const field of ['checkedRevision','pullSheetRevision','manifestPrintRevision'])if(state[field]!==null&&(!Number.isInteger(state[field])||state[field]<0||state[field]>state.revision))return false;
 if(state.manifest!==null&&(!state.manifest||typeof state.manifest.number!=='string'))return false;
 if(state.assignments.length&&!state.manifest)return false;
 const keys=Object.keys(saved.shipments).slice(0,saved.pieceCount),seen=new Set(),ids=new Set();
 for(const a of state.assignments){
  if(!a||!['loose','pallet'].includes(a.kind)||typeof a.id!=='string'||ids.has(a.id)||!Array.isArray(a.pieceKeys)||!a.pieceKeys.length)return false;
  ids.add(a.id);
  for(const key of a.pieceKeys){if(!keys.includes(key)||seen.has(key)||!(saved.exercises[key].shipmentRecord||saved.exercises[key].manifestRecord))return false;seen.add(key);}
 }
 for(const e of Object.values(saved.exercises)){
  if(e.hazardDrafts!==undefined){
   if(!isObject(e.hazardDrafts))return false;
   for(const [key,draft] of Object.entries(e.hazardDrafts))if(!validHazardDraft(draft)||(key!=='new'&&draft.id!==key))return false;
  }
 }
 for(const e of Object.values(saved.exercises))for(const holder of [e.manifestDraft,e.shipmentRecord]){
  if(e.sharedManaged)continue;
  if(!holder||holder.hazardRecords===undefined)continue;
  if(!Array.isArray(holder.hazardRecords))return false;
  const recordIds=new Set();
  for(const r of holder.hazardRecords){
   if(!r||typeof r.id!=='string'||recordIds.has(r.id)||!validHazardDraft(r))return false;recordIds.add(r.id);
   const lots=new Set();for(const l of r.lots){if(!l||typeof l.id!=='string'||lots.has(l.id))return false;lots.add(l.id);for(const field of ['roundCount','new','metricNew','pieces','weight','cube'])if(l[field]!==undefined&&(!Number.isFinite(Number(l[field]))||Number(l[field])<0))return false;}
  }
 }
 return true;
}

function isObject(value){return Boolean(value)&&typeof value==='object'&&!Array.isArray(value);}
function validHazardDraft(record){
 if(!isObject(record)||!isObject(record.page1)||!isObject(record.page2)||!Array.isArray(record.lots))return false;
 if(Object.values(record.page1).some(value=>!['string','boolean','number'].includes(typeof value))||Object.values(record.page2).some(value=>!['string','number'].includes(typeof value)))return false;
 const ids=new Set();
 for(const lot of record.lots){if(!isObject(lot)||typeof lot.id!=='string'||ids.has(lot.id))return false;ids.add(lot.id);for(const field of ['roundCount','new','metricNew','pieces','weight','cube'])if(lot[field]!==undefined&&(!Number.isFinite(Number(lot[field]))||Number(lot[field])<0))return false;}
 return true;
}
