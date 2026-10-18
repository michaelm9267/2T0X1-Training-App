// Cloud copies of each trainee's sessions. The browser copy (localStorage) stays the working
// copy; this module mirrors it to Firestore for the signed-in user and restores it on sign-in.
//
// Firestore free plan: 20,000 writes/day for the whole class. So a course is written at most
// once per WRITE_INTERVAL, only when something besides the running clock changed, and once more
// when the page is hidden or the trainee signs out.
export const WRITE_INTERVAL = 60_000;
export const HISTORY_LIMIT = 200;
export const META_KEY = 'transit-iq-cloud';
export const COURSES = {
  cdf: { storageKey: 'cdf-trainer-session' },
  outbound: { storageKey: 'outbound-trainer-session' },
};

const clone = (value) => JSON.parse(JSON.stringify(value ?? null));

// The simulated CMOS database lives in cdfCmos.sharedCmos (CDF) or sharedCmos (Outbound).
function cmosOf(course, session) {
  return course === 'cdf' ? session?.cdfCmos?.sharedCmos : session?.sharedCmos;
}
function withoutCmos(course, session) {
  const copy = clone(session);
  if (course === 'cdf' && copy?.cdfCmos) delete copy.cdfCmos.sharedCmos;
  if (course === 'outbound' && copy) delete copy.sharedCmos;
  return copy;
}

// Summary fields sit at the top of the document so an instructor can list the class without
// opening anyone's full session. The session itself is stored as JSON text: Firestore cannot
// hold arrays inside arrays, which the sessions contain.
export function splitSession(course, session, updatedAt = Date.now()) {
  const test = course === 'cdf' ? session.test : { trainee: session.trainee, finishedAt: session.testFinishedAt };
  const store = cmosOf(course, session);
  const cmos = store ? { ...store, history: (store.history || []).slice(-HISTORY_LIMIT) } : null;
  return {
    session: {
      course,
      version: session.version ?? null,
      mode: session.mode ?? null,
      stepId: session.stepId ?? null,
      startedAt: session.startedAt ?? null,
      testFinishedAt: test?.finishedAt ?? null,
      trainee: test?.trainee ?? null,
      updatedAt,
      data: JSON.stringify(withoutCmos(course, session)),
    },
    cmos: cmos ? JSON.stringify(cmos) : null,
  };
}

export function joinSession(course, cloud) {
  const session = JSON.parse(cloud.data);
  if (cloud.cmos) {
    const store = JSON.parse(cloud.cmos);
    if (course === 'cdf') session.cdfCmos = { ...session.cdfCmos, sharedCmos: store };
    else session.sharedCmos = store;
  }
  return session;
}

// What counts as a change worth writing: everything except the running exercise clock.
export function fingerprint(course, session) {
  if (course !== 'cdf' || !session?.clock) return JSON.stringify(session);
  return JSON.stringify({ ...session, clock: { ...session.clock, elapsed: 0, running: false } });
}

const readMeta = (storage) => {
  try { return JSON.parse(storage.getItem(META_KEY)) || {}; } catch { return {}; }
};
const writeMeta = (storage, meta) => {
  try { storage.setItem(META_KEY, JSON.stringify(meta)); } catch { /* storage unavailable */ }
};

// Before the courses load: make this browser's copy belong to the signed-in user. The newer of
// the cloud and browser copies wins; another user's browser copy is never shown.
export async function hydrate({ uid, readCourse, storage = window.localStorage }) {
  const meta = readMeta(storage);
  const sameUser = meta.uid === uid;
  const firstSync = !meta.uid;
  for (const [course, { storageKey }] of Object.entries(COURSES)) {
    const cloud = await readCourse(uid, course);
    const local = storage.getItem(storageKey);
    const cloudNewer = cloud && (!sameUser || !local || Number(cloud.updatedAt) > Number(meta[course] || 0));
    if (cloudNewer) {
      storage.setItem(storageKey, JSON.stringify(joinSession(course, cloud)));
      meta[course] = Number(cloud.updatedAt);
    } else if (!cloud && !sameUser && !firstSync) {
      // Work left by a different user on this browser.
      storage.removeItem(storageKey);
      delete meta[course];
    }
  }
  writeMeta(storage, { ...meta, uid });
}

// Browser-only accounts (demo): keep this browser's copy across page reloads, but never show
// work left by someone else.
export function claimLocal(uid, storage = window.localStorage) {
  if (readMeta(storage).uid !== uid) clearLocal(storage);
  writeMeta(storage, { uid });
}

// Removes this browser's copies, e.g. when signing out on a shared computer.
export function clearLocal(storage = window.localStorage) {
  for (const { storageKey } of Object.values(COURSES)) storage.removeItem(storageKey);
  storage.removeItem(META_KEY);
}

export function createCloudSync({ uid, writeCourse, storage = window.localStorage, interval = WRITE_INTERVAL, now = Date.now, onError = () => {} }) {
  const latest = {}, written = {}, writtenCmos = {}, writtenFull = {};
  let timer = null, stopped = false;
  const schedule = () => {
    if (!timer && !stopped) timer = setTimeout(() => { timer = null; flush(); }, interval);
  };
  async function flush({ final = false } = {}) {
    const work = Object.entries(latest).filter(([course, session]) =>
      fingerprint(course, session) !== written[course] || (final && JSON.stringify(session) !== writtenFull[course]));
    for (const [course, session] of work) {
      const updatedAt = now();
      const parts = splitSession(course, session, updatedAt);
      try {
        await writeCourse(uid, course, { session: parts.session, ...(parts.cmos !== writtenCmos[course] ? { cmos: parts.cmos } : {}) });
        written[course] = fingerprint(course, session);
        writtenFull[course] = JSON.stringify(session);
        writtenCmos[course] = parts.cmos;
        writeMeta(storage, { ...readMeta(storage), uid, [course]: updatedAt });
      } catch (error) {
        onError(error);
        schedule();
      }
    }
  }
  return {
    handleSave(course, session) {
      if (stopped || !COURSES[course]) return;
      latest[course] = clone(session);
      if (fingerprint(course, latest[course]) !== written[course]) schedule();
    },
    flush,
    stop() {
      stopped = true;
      clearTimeout(timer);
      timer = null;
    },
  };
}
