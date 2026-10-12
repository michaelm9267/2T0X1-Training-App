import { recordMistake } from '../CargoWindow/mistakes';

// Aircraft departure and manifest release. The trainee sets the aircraft departure date and
// time; the manifest may be released only within the 30 minutes before departure (training rule).
export const RELEASE_WINDOW_MINUTES = 30;
const RULE = 'Training rule: release the manifest within 30 minutes of aircraft departure';

export const emptyDeparture = () => ({ at: null, releasedAt: null, basis: null, feedback: '', mistakes: [] });

const two = n => String(n).padStart(2, '0');
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// Values for a datetime-local input (local time, YYYY-MM-DDTHH:MM).
export const toLocalInput = date => `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())}T${two(date.getHours())}:${two(date.getMinutes())}`;
export function parseLocal(text) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(text || '');
  if (!match) return null;
  const [, y, m, d, h, mi] = match.map(Number);
  const date = new Date(y, m - 1, d, h, mi);
  return Number.isNaN(date.getTime()) ? null : date;
}
// Recap-report style, e.g. 12-Oct-2026/16:25.
export const formatTime = date => `${two(date.getDate())}-${MONTHS[date.getMonth()]}-${date.getFullYear()}/${two(date.getHours())}:${two(date.getMinutes())}`;

// Today at the DSOE's scheduled departure (minutes after midnight).
export function defaultDepartureAt(minutes, today = new Date()) {
  return toLocalInput(new Date(today.getFullYear(), today.getMonth(), today.getDate(), Math.floor(minutes / 60), minutes % 60));
}

// When the release window opens and closes for a departure time.
export function releaseWindow(departureAt) {
  const departure = parseLocal(departureAt);
  return departure && { opens: new Date(departure.getTime() - RELEASE_WINDOW_MINUTES * 60000), closes: departure };
}

export function releaseCheck(departureAt, now) {
  const window = releaseWindow(departureAt);
  if (!window) return { ok: false, message: 'Set a valid aircraft departure date and time.' };
  if (now < window.opens) return { ok: false, message: `Too early: the manifest can be released from ${formatTime(window.opens)}, within ${RELEASE_WINDOW_MINUTES} minutes of the ${formatTime(window.closes)} departure.` };
  if (now > window.closes) return { ok: false, message: `The ${formatTime(window.closes)} departure time has passed. Update the aircraft departure time before releasing the manifest.` };
  return { ok: true };
}

// Releasing the manifest. ready: every piece on the DSOE passed JI. basis identifies the manifest
// as released, so a later change to it voids the release.
export function releaseManifest(state, { departureAt, now, ready, basis }) {
  if (!ready) return { ...state, feedback: 'Every piece on the DSOE must pass JI before the manifest is released.' };
  const check = releaseCheck(departureAt, now);
  if (!check.ok) return recordMistake({ ...state, releasedAt: null, basis: null, feedback: check.message }, 'manifest release', check.message, RULE);
  const minutes = Math.round((parseLocal(departureAt) - now) / 60000);
  return { ...state, releasedAt: now.toISOString(), basis, feedback: `Manifest released at ${formatTime(now)}, ${minutes} minute${minutes === 1 ? '' : 's'} before the ${formatTime(parseLocal(departureAt))} departure.` };
}

// A new departure time voids an earlier release.
export const setDepartureTime = (state, at) => state.at === at ? state : { ...state, at, releasedAt: null, basis: null, feedback: state.releasedAt ? 'Departure time changed. Release the manifest again.' : '' };

// A manifest change after release voids it.
export function reconcileRelease(state, basis) {
  if (!state.releasedAt || state.basis === basis) return state;
  return { ...state, releasedAt: null, basis: null, feedback: 'The manifest changed after it was released. Release it again.' };
}
