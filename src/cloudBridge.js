// Courses report every local save here. Cloud sync (signed-in users) listens; with nobody
// listening, as in tests or before sign-in, publishing does nothing.
const listeners = new Set();

export function publishSave(course, session) {
  listeners.forEach((listener) => listener(course, session));
}

export function onSave(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
