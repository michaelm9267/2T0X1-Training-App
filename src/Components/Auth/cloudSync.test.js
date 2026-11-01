import { splitSession, joinSession, fingerprint, hydrate, createCloudSync, claimLocal, clearLocal, META_KEY, HISTORY_LIMIT } from './cloudSync';

const memory = (initial = {}) => {
  const data = { ...initial };
  return {
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v); },
    removeItem: (k) => { delete data[k]; },
    data,
  };
};
const cdf = (extra = {}) => ({
  version: 1, mode: 'test', stepId: 'manifest', startedAt: 5,
  clock: { elapsed: 10, running: true, events: {} },
  test: { trainee: { rank: 'SrA', first: 'A', last: 'B' }, finishedAt: null },
  shipments: { a: { axles: [[1, 2]] } },
  cdfCmos: { revision: 1, sharedCmos: { version: 1, shipments: {}, history: Array.from({ length: 250 }, (_, i) => ({ i })) } },
  ...extra,
});

test('splits a CDF session into a summary document and a CMOS document, and joins it back', () => {
  const parts = splitSession('cdf', cdf(), 99);
  expect(parts.session).toMatchObject({ course: 'cdf', mode: 'test', stepId: 'manifest', updatedAt: 99, trainee: { last: 'B' }, testFinishedAt: null });
  expect(JSON.parse(parts.session.data).cdfCmos.sharedCmos).toBeUndefined();
  expect(JSON.parse(parts.cmos).history).toHaveLength(HISTORY_LIMIT);
  const back = joinSession('cdf', { ...parts.session, cmos: parts.cmos });
  expect(back.shipments.a.axles).toEqual([[1, 2]]);
  expect(back.cdfCmos.sharedCmos.history[0]).toEqual({ i: 50 });
});

test('the Outbound summary uses its trainee and finish time', () => {
  const parts = splitSession('outbound', { version: 5, mode: 'test', stepId: 'pack', trainee: { last: 'C' }, testFinishedAt: 7, sharedCmos: { history: [] } }, 1);
  expect(parts.session).toMatchObject({ trainee: { last: 'C' }, testFinishedAt: 7 });
  expect(JSON.parse(parts.session.data).sharedCmos).toBeUndefined();
});

test('the running clock alone is not a change worth writing', () => {
  expect(fingerprint('cdf', cdf())).toBe(fingerprint('cdf', cdf({ clock: { elapsed: 500, running: false, events: {} } })));
  expect(fingerprint('cdf', cdf())).not.toBe(fingerprint('cdf', cdf({ stepId: 'loadplan' })));
});

describe('hydrate', () => {
  const cloudCopy = (session, updatedAt) => ({ ...splitSession('cdf', session, updatedAt).session, cmos: splitSession('cdf', session, updatedAt).cmos });

  test('a newer cloud copy replaces the browser copy', async () => {
    const storage = memory({ 'cdf-trainer-session': JSON.stringify(cdf({ stepId: 'precheck' })), [META_KEY]: JSON.stringify({ uid: 'u1', cdf: 10 }) });
    await hydrate({ uid: 'u1', storage, readCourse: async (uid, course) => (course === 'cdf' ? cloudCopy(cdf({ stepId: 'departure' }), 20) : null) });
    expect(JSON.parse(storage.data['cdf-trainer-session']).stepId).toBe('departure');
    expect(JSON.parse(storage.data[META_KEY])).toMatchObject({ uid: 'u1', cdf: 20 });
  });

  test('unsynced browser work newer than the cloud is kept', async () => {
    const storage = memory({ 'cdf-trainer-session': JSON.stringify(cdf({ stepId: 'loadplan' })), [META_KEY]: JSON.stringify({ uid: 'u1', cdf: 30 }) });
    await hydrate({ uid: 'u1', storage, readCourse: async (uid, course) => (course === 'cdf' ? cloudCopy(cdf({ stepId: 'precheck' }), 20) : null) });
    expect(JSON.parse(storage.data['cdf-trainer-session']).stepId).toBe('loadplan');
  });

  test("another user's browser work is removed when the signed-in user has none", async () => {
    const storage = memory({ 'cdf-trainer-session': '{}', 'outbound-trainer-session': '{}', [META_KEY]: JSON.stringify({ uid: 'other' }) });
    await hydrate({ uid: 'u1', storage, readCourse: async () => null });
    expect(storage.data['cdf-trainer-session']).toBeUndefined();
    expect(storage.data['outbound-trainer-session']).toBeUndefined();
  });

  test('work saved before sign-in existed is kept on the first sign-in', async () => {
    const storage = memory({ 'cdf-trainer-session': JSON.stringify(cdf()) });
    await hydrate({ uid: 'u1', storage, readCourse: async () => null });
    expect(storage.data['cdf-trainer-session']).toBeDefined();
    expect(JSON.parse(storage.data[META_KEY]).uid).toBe('u1');
  });
});

// Jest 27 has no async timer helper: run the timers, then let the awaited writes settle.
const advance = async (ms) => {
  jest.advanceTimersByTime(ms);
  for (let i = 0; i < 10; i++) await Promise.resolve();
};

describe('createCloudSync', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  test('writes at most once per interval and skips clock-only changes', async () => {
    const writeCourse = jest.fn().mockResolvedValue();
    const sync = createCloudSync({ uid: 'u1', writeCourse, storage: memory(), interval: 1000, now: () => 42 });
    sync.handleSave('cdf', cdf({ stepId: 'a' }));
    sync.handleSave('cdf', cdf({ stepId: 'b' }));
    expect(writeCourse).not.toHaveBeenCalled();
    await advance(1000);
    expect(writeCourse).toHaveBeenCalledTimes(1);
    expect(JSON.parse(writeCourse.mock.calls[0][2].session.data).stepId).toBe('b');
    expect(writeCourse.mock.calls[0][2].cmos).toBeDefined();
    sync.handleSave('cdf', cdf({ stepId: 'b', clock: { elapsed: 99, running: true, events: {} } }));
    await advance(5000);
    expect(writeCourse).toHaveBeenCalledTimes(1);
    sync.handleSave('cdf', cdf({ stepId: 'c' }));
    await advance(1000);
    expect(writeCourse).toHaveBeenCalledTimes(2);
    // The CMOS document is only rewritten when it changed.
    expect(writeCourse.mock.calls[1][2]).not.toHaveProperty('cmos');
  });

  test('a final flush also saves the latest clock', async () => {
    const writeCourse = jest.fn().mockResolvedValue();
    const sync = createCloudSync({ uid: 'u1', writeCourse, storage: memory(), interval: 1000 });
    sync.handleSave('cdf', cdf());
    await advance(1000);
    sync.handleSave('cdf', cdf({ clock: { elapsed: 77, running: true, events: {} } }));
    await sync.flush({ final: true });
    expect(writeCourse).toHaveBeenCalledTimes(2);
    expect(JSON.parse(writeCourse.mock.calls[1][2].session.data).clock.elapsed).toBe(77);
  });

  test('a failed write is retried later', async () => {
    const writeCourse = jest.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue();
    const sync = createCloudSync({ uid: 'u1', writeCourse, storage: memory(), interval: 1000 });
    sync.handleSave('outbound', { mode: 'guided' });
    await advance(1000);
    await advance(1000);
    expect(writeCourse).toHaveBeenCalledTimes(2);
  });
});

test('demo accounts keep their own browser work but never see a previous user', () => {
  const storage = memory({ 'cdf-trainer-session': '{}', [META_KEY]: JSON.stringify({ uid: 'someone' }) });
  claimLocal('demo', storage);
  expect(storage.data['cdf-trainer-session']).toBeUndefined();
  storage.setItem('cdf-trainer-session', '{"x":1}');
  claimLocal('demo', storage);
  expect(storage.data['cdf-trainer-session']).toBe('{"x":1}');
  clearLocal(storage);
  expect(storage.data[META_KEY]).toBeUndefined();
});

test('WAPS progress, reports and exam restore on another device and clear between accounts', async () => {
  const progress = {cards: {a: {right: 2}}, tests: [], reports: [{id: 'r1'}], exam: {position: 2}};
  const storage = memory();
  await hydrate({uid: 'one', storage, readCourse: async (uid, course) => course === 'waps' ? {data: JSON.stringify(progress), updatedAt: 10} : null});
  expect(JSON.parse(storage.getItem('waps-progress-e5'))).toEqual(progress);
  await hydrate({uid: 'two', storage, readCourse: async () => null});
  expect(storage.getItem('waps-progress-e5')).toBeNull();
});

test('WAPS writes use the existing account sync bridge', async () => {
  const storage = memory();
  const writes = [];
  const sync = createCloudSync({uid: 'one', storage, writeCourse: async (...args) => writes.push(args)});
  sync.handleSave('waps', {cards: {}, tests: [], reports: [{questionId: 'q1'}]});
  await sync.flush();
  sync.stop();
  expect(writes).toHaveLength(1);
  expect(JSON.parse(writes[0][2].session.data).reports[0].questionId).toBe('q1');
});

test('first account sign-in merges guest WAPS cards and reports with existing cloud progress', async () => {
  const storage = memory({'waps-progress-e5': JSON.stringify({cards: {guest: {seen: 50}}, tests: [], reports: [{id:'local'}]})});
  await hydrate({uid:'one', storage, readCourse: async (uid, course) => course === 'waps' ? {data: JSON.stringify({cards:{cloud:{seen:40}}, tests:[], reports:[{id:'remote'}]}), updatedAt: 40} : null});
  const restored = JSON.parse(storage.getItem('waps-progress-e5'));
  expect(Object.keys(restored.cards).sort()).toEqual(['cloud', 'guest']);
  expect(restored.reports.map(r=>r.id).sort()).toEqual(['local', 'remote']);
});
test('legacy WAPS exams are removed when browser ownership changes', async () => {
  const storage = memory({'waps-exam-e5':'{"secret":"previous user"}', [META_KEY]:JSON.stringify({uid:'one'})});
  await hydrate({uid:'two', storage, readCourse: async()=>null});
  expect(storage.getItem('waps-exam-e5')).toBeNull();
});
test('a superseded account hydration cannot write another user snapshot', async () => {
  const storage = memory(); let current = false;
  await hydrate({uid:'one',storage,isCurrent:()=>current,readCourse:async()=>({data:'{"private":true}',updatedAt:1})});
  expect(storage.getItem('cdf-trainer-session')).toBeNull();
  expect(storage.getItem(META_KEY)).toBeNull();
});
test('an old account write cannot reclaim browser metadata after sync stops', async () => {
  const storage = memory({[META_KEY]:JSON.stringify({uid:'one'})});
  let finish; const pending = new Promise(resolve=>{finish=resolve;});
  const sync = createCloudSync({uid:'one',storage,writeCourse:()=>pending});
  sync.handleSave('waps',{cards:{},tests:[]}); const flushing = sync.flush();
  sync.stop(); storage.setItem(META_KEY, JSON.stringify({uid:'two',waps:99}));
  finish(); await flushing;
  expect(JSON.parse(storage.getItem(META_KEY))).toEqual({uid:'two',waps:99});
});
test('final flush reports failure so sign-out can preserve unsent work', async () => {
  const sync = createCloudSync({uid:'one',storage:memory(),writeCourse:async()=>{throw new Error('offline');}});
  sync.handleSave('waps',{cards:{},tests:[]});
  expect(await sync.flush({final:true})).toBe(false); sync.stop();
});
