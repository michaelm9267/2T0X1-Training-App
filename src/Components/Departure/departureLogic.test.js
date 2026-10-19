import { defaultDepartureAt, emptyDeparture, formatTime, parseLocal, reconcileRelease, releaseCheck, releaseManifest, setDepartureTime, toLocalInput } from './departureLogic';

const departureAt = '2026-10-12T16:25';
const at = (h, m) => new Date(2026, 9, 12, h, m);

test('departure times round-trip through the date and time input format', () => {
  expect(toLocalInput(parseLocal(departureAt))).toBe(departureAt);
  expect(parseLocal('not a time')).toBeNull();
  expect(formatTime(parseLocal(departureAt))).toBe('12-Oct-2026/16:25');
  expect(defaultDepartureAt(16 * 60 + 25, new Date(2026, 9, 12, 8, 0))).toBe(departureAt);
});

test('the manifest can be released only within the 30 minutes following departure', () => {
  expect(releaseCheck(departureAt, at(16, 24)).ok).toBe(false);
  expect(releaseCheck(departureAt, at(16, 24)).message).toMatch(/Too early: release the manifest after the aircraft departs, from 12-Oct-2026\/16:25 until 12-Oct-2026\/16:55/);
  expect(releaseCheck(departureAt, at(16, 25)).ok).toBe(true);
  expect(releaseCheck(departureAt, at(16, 55)).ok).toBe(true);
  expect(releaseCheck(departureAt, at(16, 56)).message).toMatch(/Too late: the release window closed at 12-Oct-2026\/16:55/);
  expect(releaseCheck('', at(16, 0)).message).toMatch(/valid aircraft departure/);
});

test('releasing records the time; a rejected release is a mistake', () => {
  const early = releaseManifest({ ...emptyDeparture(), at: departureAt }, { departureAt, now: at(12, 0), ready: true, basis: 'm1' });
  expect(early.releasedAt).toBeNull();
  expect(early.mistakes).toHaveLength(1);
  const waiting = releaseManifest(emptyDeparture(), { departureAt, now: at(16, 10), ready: false, basis: 'm1' });
  expect(waiting.feedback).toMatch(/must pass JI/);
  expect(waiting.mistakes).toHaveLength(0);
  const released = releaseManifest(early, { departureAt, now: at(16, 40), ready: true, basis: 'm1' });
  expect(released.releasedAt).toBe(at(16, 40).toISOString());
  expect(released.feedback).toBe('Manifest released at 12-Oct-2026/16:40, 15 minutes after the 12-Oct-2026/16:25 departure.');
});

test('a new departure time or a changed manifest voids the release', () => {
  const released = releaseManifest(emptyDeparture(), { departureAt, now: at(16, 40), ready: true, basis: 'm1' });
  expect(reconcileRelease(released, 'm1')).toBe(released);
  expect(reconcileRelease(released, 'm2').releasedAt).toBeNull();
  expect(setDepartureTime(released, '2026-10-12T18:00')).toEqual(expect.objectContaining({ at: '2026-10-12T18:00', releasedAt: null, feedback: 'Departure time changed. Release the manifest again.' }));
});
