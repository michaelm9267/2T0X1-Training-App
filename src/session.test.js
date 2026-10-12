import { newSession, loadSession, saveSession, exportSession, importSession } from './session';
beforeEach(() => localStorage.clear());
test('malformed saved state falls back safely rather than crashing the trainer', () => {
 const session = newSession();
 delete session.exercises[session.scenarioId];
 saveSession(session);
 expect(loadSession()).toBeNull();
});
test('sessions transfer as validated JSON files', () => {
 const session = newSession();
 expect(importSession(exportSession(session))).toEqual({ ...session, clock: { elapsed: 0, running: false, events: {} } });
 expect(importSession('{"kind":"cdf-training-session","session":{}}')).toBeNull();
 expect(importSession('not json')).toBeNull();
});
test('import rejects nested session data that would crash the UI', () => {
 const missingExerciseField = newSession();
 delete missingExerciseField.exercises[missingExerciseField.scenarioId].documentsVerified;
 expect(importSession(exportSession(missingExerciseField))).toBeNull();
 const missingPlacements = newSession();
 missingPlacements.loadPlan = {};
 expect(importSession(exportSession(missingPlacements))).toBeNull();
 const invalidDestination = newSession();
 invalidDestination.destination = 'NOT-A-DODAAC';
 expect(importSession(exportSession(invalidDestination))).toBeNull();
});
test('load planning and simulation clock survive resuming a session', () => {
 const session = newSession();
 expect(session.loadPlan).toEqual(expect.objectContaining({ placements: {}, accepted: false }));
 expect(session.clock).toEqual(expect.objectContaining({ elapsed: 0, running: false }));
 saveSession(session);
 expect(loadSession()).toEqual(session);
});
test('sessions saved before the departure step resume with no departure set', () => {
 const session = newSession();
 expect(session.departure).toEqual(expect.objectContaining({ at: null, releasedAt: null, mistakes: [] }));
 delete session.departure;
 saveSession(session);
 expect(loadSession().departure).toEqual(expect.objectContaining({ at: null, releasedAt: null }));
});
