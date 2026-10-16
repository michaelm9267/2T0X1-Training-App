import { recordMistake } from '../CargoWindow/mistakes';

// Simplified C-17 load planning (DTR Part III App V). Positions are measured on the cargo floor:
// station in inches aft of the forward cargo compartment bulkhead, and lateral offset in inches
// from the centerline (positive toward the right side). These limits are simplified training
// values, not taken from TO 1C-17A-9; real load plans use the aircraft's -9 and the load planner.
export const FLOOR = { length: 1056, width: 216, ramp: 240 };
export const CB_RANGE = [380, 620];
export const ACL = 120000;

// A piece's own center of balance, in inches aft of its forward edge.
export function pieceCB(piece) {
  if (piece.axles?.length) return piece.axles.reduce((sum, axle) => sum + axle.position * axle.weight, 0) / piece.weight;
  return piece.length / 2;
}

// Next open spot: forward to aft along the centerline, with 12 in between pieces.
export function autoPlace(piece, placements, pieces) {
  const ends = Object.entries(placements).map(([key, spot]) => spot.station + (pieces.find(p => p.key === key)?.length || 0));
  return { station: ends.length ? Math.max(...ends) + 12 : 24, lateral: 0 };
}

const box = (piece, spot) => ({ x0: spot.station, x1: spot.station + piece.length, y0: spot.lateral - piece.width / 2, y1: spot.lateral + piece.width / 2 });

// Problems with the plan as placed. ready lists pieces that passed JI; every listed piece must
// be loaded for the plan to be complete.
export function checkPlan(pieces, placements) {
  const placed = pieces.filter(piece => placements[piece.key]);
  const problems = pieces.length ? [] : ['No pieces are available to load.'];
  for (const piece of pieces) if (!placements[piece.key]) problems.push(`${piece.title} is not placed on the aircraft.`);
  for (const piece of placed) {
    const spot = placements[piece.key];
    if (!Number.isFinite(spot.station) || !Number.isFinite(spot.lateral)) problems.push(`${piece.title} needs finite station and lateral coordinates.`);
    const b = box(piece, spot);
    if (b.x0 < 0 || b.x1 > FLOOR.length || b.y0 < -FLOOR.width / 2 || b.y1 > FLOOR.width / 2) problems.push(`${piece.title} extends beyond the cargo floor.`);
  }
  placed.forEach((a, i) => placed.slice(i + 1).forEach(b => {
    const p = box(a, placements[a.key]), q = box(b, placements[b.key]);
    if (p.x0 < q.x1 && q.x0 < p.x1 && p.y0 < q.y1 && q.y0 < p.y1) problems.push(`${a.title} overlaps ${b.title}.`);
  }));
  const weight = placed.reduce((sum, piece) => sum + piece.weight, 0);
  const cb = weight ? placed.reduce((sum, piece) => sum + piece.weight * (placements[piece.key].station + pieceCB(piece)), 0) / weight : null;
  if (weight > ACL) problems.push(`Total weight ${weight.toLocaleString()} lb exceeds the ${ACL.toLocaleString()} lb allowable cabin load.`);
  if (cb !== null && (cb < CB_RANGE[0] || cb > CB_RANGE[1])) problems.push(`Combined CB at station ${cb.toFixed(1)} in is outside the allowable range of ${CB_RANGE[0]}–${CB_RANGE[1]} in.`);
  return { problems, weight, cb };
}

// Submitting the plan: accepted when it has no problems; a rejected submission is a mistake.
export function submitPlan(plan, pieces, allManifested) {
  const { problems } = checkPlan(pieces, plan.placements);
  if (!allManifested) return { ...plan, accepted: false, feedback: 'Every piece on the DSOE must complete Manifest before the load plan can be submitted.' };
  if (problems.length) return recordMistake({ ...plan, accepted: false, feedback: `Load plan not accepted: ${problems.join(' ')}` }, 'load plan', problems.join(' '), 'DTR Part III App V');
  return { ...plan, accepted: true, acceptedAt: Date.now(), feedback: 'Training load plan accepted.' };
}

// What the accepted plan was built on. A change to any piece's size, weight or manifest status
// reopens the plan.
export const planBasis = pieces => JSON.stringify(pieces.map(({ key, length, width, weight, manifested }) => ({ key, length, width, weight, manifested })));

// A plan that passes checkPlan, for practice that starts after the load plan: one centerline row
// if it fits, otherwise two side-by-side rows, shifted aft so the combined CB sits mid-range.
export function autoPlan(pieces) {
  const rows = (lanes) => {
    const lines = Array.from({ length: lanes }, () => ({ end: 0, keys: [] }));
    [...pieces].sort((a, b) => b.length - a.length).forEach(piece => {
      const line = lines.reduce((low, next) => next.end < low.end ? next : low);
      line.keys.push({ piece, station: line.end });
      line.end += piece.length + 12;
    });
    const lateral = i => lanes === 1 ? 0 : (i === 0 ? -1 : 1) * FLOOR.width / 4;
    return Object.fromEntries(lines.flatMap((line, i) => line.keys.map(({ piece, station }) => [piece.key, { station, lateral: lateral(i) }])));
  };
  for (const lanes of [1, 2]) {
    const placements = rows(lanes);
    const { cb } = checkPlan(pieces, placements);
    const end = Math.max(...pieces.map(piece => placements[piece.key].station + piece.length));
    const shift = Math.max(0, Math.min(FLOOR.length - end, Math.round((CB_RANGE[0] + CB_RANGE[1]) / 2 - cb)));
    const shifted = Object.fromEntries(Object.entries(placements).map(([key, spot]) => [key, { ...spot, station: spot.station + shift }]));
    if (!checkPlan(pieces, shifted).problems.length) return shifted;
  }
  return rows(2);
}

export const emptyPlan = () => ({ placements: {}, accepted: false, feedback: '', mistakes: [] });

export function reconcilePlan(plan, basis) {
  return plan.basis === basis ? plan : { ...plan, basis, accepted: false, acceptedAt: undefined, feedback: '' };
}
