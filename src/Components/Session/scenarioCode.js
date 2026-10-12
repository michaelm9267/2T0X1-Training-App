import { newSession } from '../../session';
import { DESTINATIONS } from '../CargoWindow/workflow';
import { MAX_PIECES } from '../CargoWindow/pieces';

// Scenario codes let an instructor give a whole class the same deployment. A code holds a random
// seed plus the instructor's choices (piece count, destination, mode, and any discrepancies pinned
// on or off); the seed then generates identical readings and discrepancies for everyone.
const PREFIX = 'CDF-';

// Small, fast seeded random generator (mulberry32).
export function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const newSeed = () => Math.floor(Math.random() * 2 ** 31);

export function encodeScenario({ seed, pieceCount, destination, mode, forced = {} }) {
  const pinned = Object.fromEntries(Object.entries(forced).filter(([, choices]) => Object.keys(choices).length));
  const json = JSON.stringify({ v: 1, s: seed, p: pieceCount, d: destination || null, m: mode, f: pinned });
  return PREFIX + btoa(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Returns the scenario settings, or null when the code is not valid.
export function decodeScenario(code) {
  try {
    const body = String(code).trim().replace(/^CDF-/i, '').replace(/-/g, '+').replace(/_/g, '/');
    const data = JSON.parse(atob(body + '='.repeat((4 - body.length % 4) % 4)));
    if (data.v !== 1 || !Number.isInteger(data.s) || !Number.isInteger(data.p) || data.p < 1 || data.p > MAX_PIECES) return null;
    if (data.d && !DESTINATIONS.includes(data.d)) return null;
    return { seed: data.s, pieceCount: data.p, destination: data.d || null, mode: data.m === 'test' ? 'test' : 'guided', forced: data.f || {} };
  } catch {
    return null;
  }
}

// The deployment a scenario code describes.
export function sessionFromScenario(settings, code = encodeScenario(settings)) {
  const random = seededRandom(settings.seed);
  return newSession({ random, forced: settings.forced, destination: settings.destination || undefined, pieceCount: settings.pieceCount, mode: settings.mode, code });
}
