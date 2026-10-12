import { createPieces, MAX_PIECES } from './Components/CargoWindow/pieces';
import { createExercise } from './Components/CargoWindow/exercise';
import { DESTINATIONS, randomDestination } from './Components/CargoWindow/workflow';
import { emptyPlan } from './Components/LoadPlan/loadPlanLogic';
import { emptyDeparture } from './Components/Departure/departureLogic';
import { scenarios } from './Components/CargoWindow/scenarios';

// The training session, saved in this browser so a refresh or closed tab resumes where the
// trainee left off. A new session (or a scenario code) replaces it.
const STORAGE_KEY = 'cdf-trainer-session';
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
  return { ...saved, loadPlan: plan, departure, clock: { elapsed, running: false, events } };
}

// A fresh session. With a seeded random function and forced discrepancies, every trainee who
// loads the same scenario code gets the same deployment.
export function newSession({ random, forced, destination, pieceCount = scenarios.length, mode = 'guided', code = null } = {}) {
  const pieces = createPieces({ random, forced });
  return {
    version: VERSION,
    shipments: Object.fromEntries(pieces.map(piece => [piece.key, piece])),
    exercises: Object.fromEntries(pieces.map(piece => [piece.key, createExercise()])),
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
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session)); } catch { /* storage full or blocked: keep working unsaved */ }
}

export function clearSession() {
  try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* nothing saved */ }
}
