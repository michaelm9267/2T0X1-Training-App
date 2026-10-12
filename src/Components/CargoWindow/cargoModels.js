// Visual models of each increment, described once in inches and rendered as the side, front, and
// 3D perspective views. Axes: x runs aft from the forward edge, y runs from the left (near) side
// to the right side, and z runs up from the floor. Shapes follow the real equipment's layout but
// are fitted to each shipment's dimensions, so drawings stay true to the measured values.
//
// Paints that start with '$' name a gradient the renderer defines.
const PI = Math.PI;

// Whether a piece currently has the given inspection discrepancy, so drawings match it.
const faulty = (s, id) => s.findings?.some(f => f.id === id && f.correct === 'unsatisfactory');
const prism = (profile, y0, y1, paint, extra = {}) => ({ type: 'prism', profile, y0, y1, ...paint, ...extra });
const box = (x, y, z, l, w, h, paint, extra = {}) => ({ type: 'box', x, y, z, l, w, h, ...paint, ...extra });
const poly = (pts, fill, extra = {}) => ({ type: 'poly', pts, fill, ...extra });
// Flat shapes on a plane facing the left side (constant y) or the front (constant x).
const sidePoly = (y, pts, fill, extra) => poly(pts.map(([x, z]) => [x, y, z]), fill, extra);
const frontPoly = (x, pts, fill, extra) => poly(pts.map(([y, z]) => [x, y, z]), fill, extra);
const sideRect = (y, x, z, l, h, fill, extra) => sidePoly(y, [[x, z], [x + l, z], [x + l, z + h], [x, z + h]], fill, extra);
const frontRect = (x, y, z, w, h, fill, extra) => frontPoly(x, [[y, z], [y + w, z], [y + w, z + h], [y, z + h]], fill, extra);
const line = (a, b, stroke, width = 1, extra = {}) => ({ type: 'line', a, b, stroke, width, ...extra });
const wheel = (x, y0, y1, r, detailed, extra = {}) => ({ type: 'wheel', x, y0, y1, r, detailed, ...extra });
const text = (plane, at, value, size, fill, extra = {}) => ({ type: 'text', plane, at, value, size, fill, ...extra });
const ring = (n, f) => Array.from({ length: n }, (_, i) => f(i * 2 * PI / n));
const sideCircle = (y, cx, cz, r, fill, extra) => sidePoly(y, ring(14, t => [cx + r * Math.cos(t), cz + r * Math.sin(t)]), fill, extra);
const frontCircle = (x, cy, cz, r, fill, extra) => frontPoly(x, ring(14, t => [cy + r * Math.cos(t), cz + r * Math.sin(t)]), fill, extra);

// Wheel-well cut-out, traced aft to forward along the bottom of a side profile.
export function arch(cx, cz, radius, zBase, steps = 10) {
  const start = Math.asin(Math.max(-1, Math.min(1, (zBase - cz) / radius)));
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = start + (PI - 2 * start) * i / steps;
    return [cx + radius * Math.cos(t), cz + radius * Math.sin(t)];
  });
}
const wellShadow = (y, cx, r, radius, zBase) => sidePoly(y, [...arch(cx, r, radius, zBase), [cx - radius, 0], [cx + radius, 0]], '#0b0f0c', { only: ['3d', 'side'] });

// CARC desert tan, as on current Army and Air Force tactical vehicles.
const TAN = { fill: '$tan', top: '#dcc699', front: '#9e8660', stroke: '#5e4f37' };
const DARK = { fill: '#1d221c', top: '#2c332a', front: '#161a15', stroke: '#0d100c' };
const BLACK = { fill: '#141614', top: '#232622', front: '#0f110f', stroke: '#060706' };
const TAN_CANVAS = { fill: '$canvas', top: '#cdb88c', front: '#8f7a58', stroke: '#5e4f37' };
const GREY = { fill: '$grey', top: '#b3bbc0', front: '#6d767c', stroke: '#3c4246' };
const ALUMINUM = { fill: '$aluminum', top: '#c7d0d3', front: '#8e9a9f', stroke: '#5f6b70' };
const OD = { fill: '$od', top: '#6f7a55', front: '#414b33', stroke: '#2b321f' };
const STEEL = { fill: '#4a4f4c', top: '#6b716d', front: '#3a3f3c', stroke: '#222624' };

// M1151-style HMMWV: sloped hood and grille, four-door armored cab, enclosed rear cargo shell.
function hmmwv(s) {
  const { length: l, width: w, height: h } = s;
  const [a1, a2] = s.axles.map(axle => axle.position);
  const r = .235 * h, tw = 12.5, zb = .31 * h, belt = .64 * h, well = r + 3.5;
  const d1 = .375 * l, d2 = .525 * l, d3 = .675 * l;
  const lower = [[3, zb], [3, .44 * h], [7, .58 * h], [.33 * l, belt], [l, belt], [l, .36 * h], [l - 3, zb], ...arch(a2, r, well, zb), ...arch(a1, r, well, zb)];
  const cabin = [[.33 * l, belt], [.385 * l, .975 * h], [.40 * l, h], [l - 4, h], [l, h - 4], [l, belt]];
  const grilleX = z => 3 + (z - .44 * h) / (.14 * h) * 4;
  const glassX = z => .33 * l + (z - belt) / (.975 * h - belt) * (.055 * l);
  const pane = (ya, yb) => poly([[glassX(belt + 2), ya, belt + 2], [glassX(belt + 2), yb, belt + 2], [glassX(.95 * h), yb, .95 * h], [glassX(.95 * h), ya, .95 * h]], '$glass', { stroke: '#4a3d2a', width: 1.4, frontKey: .33 * l - 1 });
  const headlight = y => poly(ring(12, t => { const z = .51 * h + 3.2 * Math.sin(t); return [grilleX(z) - .2, y + 3.2 * Math.cos(t), z]; }), '#e8ead6', { stroke: '#222', width: .8, only: ['3d', 'front'], frontKey: 2.9 });
  return [
    ...[a1, a2].map(x => wheel(x, w - 1 - tw, w - 1, r, false)),
    box(10, 14, .18 * h, l - 20, w - 28, zb - .18 * h + 2, DARK),
    ...[a1, a2].map(x => wellShadow(10, x, r, well, zb)),
    prism(lower, 1, w - 1, TAN, { tape: true }),
    box(0, -1, .28 * h, 4.5, w + 2, .13 * h, { fill: '#a58c62', top: '#c9b185', front: '#8b7552', stroke: '#5e4f37' }),
    ...[.2 * w, .8 * w].map(y => frontRect(-.1, y - 2.5, .31 * h, 5, 5, '#141813', { only: ['3d', 'front'] })),
    poly([[grilleX(.455 * h), .2 * w, .455 * h], [grilleX(.455 * h), .8 * w, .455 * h], [grilleX(.565 * h), .8 * w, .565 * h], [grilleX(.565 * h), .2 * w, .565 * h]], '#2a241b', { only: ['3d', 'front'], frontKey: 2.9 }),
    ...Array.from({ length: 11 }, (_, i) => { const y = .23 * w + i * .054 * w; return line([grilleX(.46 * h) - .2, y, .46 * h], [grilleX(.56 * h) - .2, y, .56 * h], '#a08a63', 1.6, { only: ['3d', 'front'], frontKey: 2.9 }); }),
    headlight(.11 * w), headlight(.89 * w),
    line([7, w / 2, .58 * h], [.33 * l, w / 2, belt], '#8a7552', .8, { only: ['3d'] }),
    sideRect(.9, 8, .5 * h, 4, 2.4, '#e09a2c'),
    sideRect(.9, l - 6, .5 * h, 4, 2.4, '#b3261e'),
    // Doors, hinges, and handles on the lower body.
    ...[d1, d2, d3].map(x => line([x, .9, .36 * h], [x, .9, belt], '#6e5c40', 1.1)),
    line([d1, .9, .36 * h], [d3, .9, .36 * h], '#6e5c40', 1.1),
    ...[d1, d2].map(x => sideRect(.85, x + 1.5, .56 * h, 6, 1.6, '#4a3d2a')),
    ...[d1, d2].flatMap(x => [.42, .58].map(f => sideRect(.85, x - 1, f * h, 2, 3.5, '#7d6a4b'))),
    box(d1, -1.5, zb - 2, d3 - d1, 2.5, 2, BLACK),
    text('side', [.70 * l, .85, .54 * h], 'U.S. AIR FORCE', 4.2, '#3b3226'),
    prism(cabin, 5, w - 5, TAN, { tape: true }),
    pane(8, w / 2 - 1.5), pane(w / 2 + 1.5, w - 8),
    // Armored side windows, door seams, and the cargo shell on the cab.
    ...[d1, d2, d3].map(x => line([x, 4.9, belt], [x, 4.9, .965 * h], '#6e5c40', 1.1)),
    sideRect(4.85, d1 + 3, .69 * h, d2 - d1 - 6, .25 * h, '$glass', { stroke: '#4a3d2a', width: 1.6 }),
    sideRect(4.85, d2 + 3, .69 * h, d3 - d2 - 6, .25 * h, '$glass', { stroke: '#4a3d2a', width: 1.6 }),
    line([d3 + 4, 4.9, .7 * h], [l - 4, 4.9, .7 * h], '#8a7552', .8),
    box(.355 * l, w - 1, .72 * h, 3, 6, .1 * h, BLACK, { only: ['front'] }),
    box(.355 * l, -5, .72 * h, 3, 6, .1 * h, BLACK),
    line([.37 * l, 1, .77 * h], [.385 * l, 5, .77 * h], '#111', 1.2),
    ...[a1, a2].map(x => wheel(x, 0, tw, r, true)),
  ];
}

// FMTV 6×6 (M1083 MTV): flat-nose cab over engine, cargo bed with bows and canvas, tandem rear axles.
function fmtv(s) {
  const { length: l, width: w, height: h } = s;
  const [a1, a2, a3] = s.axles.map(axle => axle.position);
  const r = .21 * h, tw = 15, zb = .34 * h, well = r + 3;
  const cabEnd = Math.max(a1 + well + 9, .29 * l), bedX = cabEnd + 5, bedZ = .36 * h, rail = .6 * h;
  const cab = [[3, zb], [3, .63 * h], [7, .66 * h], [14, .92 * h], [18, .94 * h], [cabEnd, .94 * h], [cabEnd, zb], ...arch(a1, r, well, zb)];
  const bed = [[bedX, bedZ], [bedX, rail], [l, rail], [l, bedZ], ...arch(a3, r, well, bedZ), ...arch(a2, r, well, bedZ)];
  const cover = [[bedX + 1, rail], [bedX + 1, .955 * h], [bedX + 5, h], [l - 5, h], [l - 1, .955 * h], [l - 1, rail]];
  const glassX = z => 7 + (z - .66 * h) / (.26 * h) * 7;
  const pane = (ya, yb) => poly([[glassX(.68 * h), ya, .68 * h], [glassX(.68 * h), yb, .68 * h], [glassX(.9 * h), yb, .9 * h], [glassX(.9 * h), ya, .9 * h]], '$glass', { stroke: '#4a3d2a', width: 1.4, frontKey: 2.9 });
  const bowCount = Math.max(2, Math.round((l - bedX) / 34));
  const bows = Array.from({ length: bowCount }, (_, i) => bedX + 1 + (i + 1) * (l - bedX - 2) / (bowCount + 1));
  return [
    ...[a1, a2, a3].map(x => wheel(x, w - 1 - tw, w - 1, r, false)),
    box(8, 18, .25 * h, l - 12, w - 36, .1 * h, DARK),
    ...[a1].map(x => wellShadow(12, x, r, well, zb)),
    ...[a2, a3].map(x => wellShadow(12, x, r, well, bedZ)),
    box(a1 + well + 6, 2, .2 * h, Math.max(20, a2 - a1 - 2 * well - 40), 22, .13 * h, { fill: '$tan', top: '#c9b185', front: '#8b7552', stroke: '#5e4f37' }),
    box(a2 - well - 26, 3, .22 * h, 22, 18, .11 * h, BLACK),
    prism(bed, 2, w - 2, TAN, { tape: true }),
    ...Array.from({ length: Math.round((l - bedX) / 24) }, (_, i) => line([bedX + 12 + i * 24, 1.9, bedZ + 2], [bedX + 12 + i * 24, 1.9, rail - 2], '#8a7552', 1.2)),
    text('side', [bedX + 24, 1.9, bedZ + .45 * (rail - bedZ)], 'U.S. AIR FORCE', 5, '#3b3226'),
    sideRect(1.9, l - 6, bedZ + 2, 4, 3, '#b3261e'),
    prism(cover, 3, w - 3, TAN_CANVAS, { tape: true }),
    ...bows.map(x => line([x, 2.9, rail + 1], [x, 2.9, .955 * h], '#8a7655', 1.4)),
    ...Array.from({ length: Math.round((l - bedX) / 8) }, (_, i) => line([bedX + 3 + i * 8, 2.9, rail + 4], [bedX + 7 + i * 8, 2.9, rail + 1], '#7a6849', .8)),
    prism(cab, 2, w - 2, TAN, { tape: true }),
    box(0, -1, .25 * h, 6, w + 2, .11 * h, { fill: '#a58c62', top: '#c9b185', front: '#8b7552', stroke: '#5e4f37' }),
    ...[4, w - 14].map(y => frontRect(-.1, y, .29 * h, 10, 5, '#e8ead6', { stroke: '#222', width: .7, only: ['3d', 'front'] })),
    frontRect(2.9, .22 * w, .42 * h, .56 * w, .18 * h, '#2a241b', { only: ['3d', 'front'] }),
    ...Array.from({ length: 6 }, (_, i) => line([2.8, .22 * w, .44 * h + i * .028 * h], [2.8, .78 * w, .44 * h + i * .028 * h], '#a08a63', 1.4, { only: ['3d', 'front'] })),
    ...[.12 * w, .88 * w].map(y => frontRect(2.9, y - 4, .5 * h, 8, 4, '#e09a2c', { only: ['3d', 'front'] })),
    pane(5, w / 2 - 2), pane(w / 2 + 2, w - 5),
    ...[.25 * w, .7 * w].map(y => line([glassX(.69 * h) - .3, y, .69 * h], [glassX(.8 * h) - .3, y + 8, .8 * h], '#111', 1, { only: ['3d', 'front'], frontKey: 2.9 })),
    // Cab door, window, steps, and grab handle on the left side.
    sideRect(1.85, 24, .38 * h, cabEnd - 36, .53 * h, 'none', { stroke: '#6e5c40', width: 1.1 }),
    sideRect(1.8, 28, .64 * h, cabEnd - 46, .24 * h, '$glass', { stroke: '#4a3d2a', width: 1.4 }),
    sideRect(1.8, cabEnd - 22, .52 * h, 7, 1.8, '#4a3d2a'),
    line([18, 1.5, .45 * h], [18, 1.5, .8 * h], '#c7c9b8', 1.4),
    ...[.2, .29].map(f => box(cabEnd - 14, -1, f * h, 12, 3, 1.4, STEEL)),
    box(1, w + 1, .66 * h, 4, 6, .16 * h, BLACK, { only: ['front'] }),
    box(1, -7, .66 * h, 4, 6, .16 * h, BLACK),
    line([4, -1, .72 * h], [8, 2, .72 * h], '#111', 1.2),
    box(a1 + well - 2, -.5, .12 * h, 1.2, 4, .14 * h, BLACK),
    ...[a1, a2, a3].map(x => wheel(x, 0, tw, r, true)),
  ];
}

// Towable flightline AGE start cart (A/M32A-60A style): aircraft-grey enclosure on a four-wheel trailer
// with a steerable front axle, A-frame tow bar stowed up, and a roof exhaust stack.
function startCart(s) {
  const { length: l, width: w, height: h } = s;
  const [a1, a2] = s.axles.map(axle => axle.position);
  const exhaust = s.exhaustHeight, top = h - exhaust, r = Math.min(.12 * h, 13), tw = 8;
  const x0 = .21 * l, fz0 = 1.7 * r, fz1 = fz0 + .06 * h;
  const body = [[x0, fz1], [x0, top - 5], [x0 + 5, top], [l - 5, top], [l, top - 5], [l, fz1]];
  const panel = (x, z, len, ht) => sideRect(2.9, x, z, len, ht, 'none', { stroke: '#3c4246', width: 1 });
  // k scales stencils and fittings with the cart's size; L is the enclosure length.
  const k = Math.min(1, h / 98), L = l - x0, pz = fz1 + 4 * k, ph = top - fz1 - 9 * k;
  const louverX0 = x0 + .55 * L, louverX1 = x0 + .97 * L, coil = Math.min(9, .07 * L);
  const hitch = [3, w / 2, .86 * h];
  return [
    ...[a1, a2].map(x => wheel(x, w - 4 - tw, w - 4, r, false)),
    line([x0 + 4, .8 * w, fz0 + 2], hitch, '#202320', 2.6),
    box(x0 - 3, 6, fz0, l - x0, w - 12, fz1 - fz0, BLACK),
    ...[a1, a2].map(x => box(x - 2, 6, r - 1, 4, w - 12, 2, BLACK, { only: ['3d', 'front'] })),
    prism(body, 3, w - 3, GREY, { tape: true }),
    frontRect(x0 - .1, .18 * w, .45 * top, .64 * w, .38 * top, '#2b2a24', { only: ['3d', 'front'] }),
    ...Array.from({ length: 9 }, (_, i) => line([x0 - .2, .2 * w, .47 * top + i * .04 * top], [x0 - .2, .8 * w, .47 * top + i * .04 * top], '#8d969b', 1.5, { only: ['3d', 'front'] })),
    text('front', [x0 - .2, .5 * w, .35 * top], 'USAF', 6 * k, '#1d1b14', { only: ['3d', 'front'] }),
    // Control-panel door, cable stowage, intake louvers, and stencils on the left side, laid out
    // along the enclosure length (L) so they keep their spacing at any size.
    panel(x0 + .03 * L, pz, .3 * L, ph),
    sideRect(2.85, x0 + .06 * L, .52 * top, .24 * L, .3 * top, '#30302a', { stroke: '#3c4246', width: .8 }),
    ...[0, 1, 2].map(i => sideCircle(2.8, x0 + .1 * L + i * .07 * L, .72 * top, 1.6 * k, '#e8e4cf', { stroke: '#111', width: .6 })),
    ...[0, 1].map(i => sideRect(2.8, x0 + .09 * L + i * .11 * L, .57 * top, 3.5 * k, 2.2 * k, '#0d0d0b')),
    ...[.4, .8].map(f => sideRect(2.85, x0 + .3 * L, pz + f * ph, 1.4 * k, 3 * k, '#3a3a33')),
    panel(x0 + .35 * L, pz, .17 * L, ph),
    ...[0, 1, 2].map(i => sideCircle(2.7, x0 + .435 * L + i * k, .55 * top - i * k, coil - i * .6 * k, 'none', { stroke: '#161616', width: 2.2 * k })),
    sideRect(2.85, x0 + .435 * L - 1.5 * k, .55 * top + coil - 1, 3 * k, 3 * k, '#3a3a33'),
    panel(louverX0, pz, louverX1 - louverX0, ph),
    sideRect(2.85, louverX0 + .02 * L, .42 * top, louverX1 - louverX0 - .04 * L, .42 * top, '#2c3134'),
    ...Array.from({ length: 10 }, (_, i) => line([louverX0 + .02 * L, 2.8, .44 * top + i * .04 * top], [louverX1 - .02 * L, 2.8, .44 * top + i * .04 * top], '#9aa3a8', 1.6 * k)),
    text('side', [louverX0 + .02 * L, 2.8, fz1 + .1 * top], 'U.S. AIR FORCE', 4.6 * k, '#1d1b14'),
    text('side', [x0 + .05 * L, 2.8, top - 6 * k], 'NO STEP', 3.4 * k, '#1d1b14'),
    sideRect(2.85, l - .1 * L, fz1 + .1 * top, 7 * k, 4.5 * k, '#e8e4cf', { stroke: '#111', width: .5 }),
    sideRect(2.85, l - 5, fz1 + 3, 3, 3, '#b3261e'),
    sideRect(2.85, x0 + 1, fz1 + 3, 3, 3, '#e09a2c'),
    box(.72 * l, .55 * w, top, 7, 7, exhaust, STEEL),
    box(.72 * l - 1, .55 * w - 1, h - 1.5, 9, 9, 1.5, BLACK),
    line([x0 + 4, .2 * w, fz0 + 2], hitch, '#2b2f2b', 2.6),
    sideCircle(w / 2, 3, .86 * h, 2.6, 'none', { stroke: '#1b1d1b', width: 1.4, only: ['side'] }),
    frontCircle(2.5, w / 2, .86 * h, 2.6, 'none', { stroke: '#1b1d1b', width: 1.4, only: ['3d', 'front'] }),
    ...[a1, a2].map(x => wheel(x, 1, 1 + tw, r, true)),
  ];
}

// MJ-1B bomb lift truck ("Jammer"): low four-wheel chassis, forward hydraulic lift boom with
// a cradle table for munitions, open operator seat, and rear engine compartment.
function jammer(s) {
  const { length: l, width: w, height: h } = s;
  const [a1, a2] = s.axles.map(axle => axle.position);
  const r = Math.min(.24 * h, 12), tw = 8, zb = .28 * h, deck = .52 * h, well = r + 2;
  const front = Math.min(.09 * l, a1 - well - 1);
  const chassis = [[front, zb], [front, deck], [l - 2, deck], [l, deck - 2], [l, zb], ...arch(a2, r, well, zb), ...arch(a1, r, well, zb)];
  const hood = [[.62 * l, deck], [.62 * l, .8 * h], [.66 * l, .86 * h], [l - 4, .86 * h], [l - 1, .8 * h], [l - 1, deck]];
  const arm = [[.04 * l, .5 * h], [.04 * l, .6 * h], [.52 * l, .7 * h], [.52 * l, .6 * h]];
  const STRIPE = ['#e3b521', '#151515'];
  const stripes = (y, x0, x1, z0, z1) => Array.from({ length: Math.ceil((x1 - x0) / 3) }, (_, i) => sideRect(y, x0 + i * 3, z0, Math.min(3, x1 - x0 - i * 3), z1 - z0, STRIPE[i % 2], { only: ['3d', 'side'] }));
  return [
    ...[a1, a2].map(x => wheel(x, w - 1 - tw, w - 1, r, false)),
    ...[a1, a2].map(x => wellShadow(8, x, r, well, zb)),
    prism(arm, .78 * w, .78 * w + 4, GREY),
    line([.44 * l, .76 * w, deck], [.3 * l, .76 * w, .56 * h], '#cfd5d8', 3),
    prism(chassis, 4, w - 4, GREY, { tape: true }),
    ...[.3, .55, .8].map(f => sideCircle(3.8, f * l, zb + 2.5, 1.3, 'none', { stroke: '#2b3033', width: .8 })),
    sideRect(3.9, .3 * l, .35 * h, 10, 5, '#e8e4cf', { stroke: '#111', width: .5 }),
    text('side', [.42 * l, 3.8, .36 * h], 'U.S. AIR FORCE', 3.4, '#1d2023'),
    sideRect(3.9, l - 5, .4 * h, 3, 3, '#b3261e'),
    sideRect(3.9, front + 1, .4 * h, 3, 3, '#e09a2c'),
    box(l - 4, w / 2 - 3, .3 * h, 4, 6, 4, STEEL),
    prism(hood, 6, w - 6, GREY, { tape: true }),
    sideRect(5.9, .7 * l, .58 * h, .22 * l, .2 * h, '#2c3134'),
    ...Array.from({ length: 5 }, (_, i) => line([.7 * l, 5.8, .6 * h + i * .04 * h], [.92 * l, 5.8, .6 * h + i * .04 * h], '#9aa3a8', 1.3)),
    text('side', [.65 * l, 5.8, .82 * h], 'NO STEP', 2.6, '#1d2023'),
    text('side', [.7 * l, 5.8, .52 * h + 1.5], 'MJ-1B', 3.4, '#1d2023'),
    box(.9 * l, .7 * w, .86 * h, 3, 3, .09 * h, STEEL),
    box(.5 * l, .3 * w, deck, .1 * l, .4 * w, .1 * h, BLACK),
    box(.58 * l, .3 * w, .62 * h, .04 * l, .4 * w, .3 * h, BLACK),
    line([.5 * l, .5 * w, deck], [.45 * l, .5 * w, .94 * h], '#2b3033', 2.2),
    poly(ring(14, t => [.45 * l - 1.5 * Math.sin(t), .5 * w + 7 * Math.cos(t), .97 * h + 1.5 * Math.sin(t)]), 'none', { stroke: '#111', width: 1.6 }),
    // Lift table: cradle saddles on a striped platform at the front of the boom.
    box(0, .08 * w, .44 * h, .16 * l, .84 * w, .06 * h, STEEL),
    ...stripes(.08 * w - .1, 0, .16 * l, .44 * h, .5 * h),
    frontRect(-.1, .08 * w, .44 * h, .84 * w, .06 * h, '#e3b521', { only: ['3d', 'front'] }),
    ...[.15, .35, .55, .75].map(f => frontRect(-.2, (.08 + f * .84) * w, .44 * h, .084 * w, .06 * h, '#151515', { only: ['3d', 'front'] })),
    ...[.015, .115].map(f => box(f * l, .1 * w, .5 * h, .03 * l, .8 * w, .07 * h, BLACK)),
    prism(arm, .18 * w, .18 * w + 4, GREY, { sideKey: 3, tape: true }),
    line([.44 * l, .17 * w, deck], [.3 * l, .17 * w, .56 * h], '#cfd5d8', 3, { sideKey: 2.9 }),
    ...[a1, a2].map(x => wheel(x, 1, 1 + tw, r, true)),
  ];
}

// ISU-90: framed container on a 463L-compatible base with fork pockets, corrugated walls, and
// double cargo doors on the forward end with locking bars.
function isu90(s, { doorsOpen }) {
  const { length: l, width: w, height: h } = s;
  const base = 7, top = h - 4;
  const ribs = Array.from({ length: Math.floor((l - 12) / 6) }, (_, i) => 7 + i * 6);
  const leaf = (y0, y1) => frontRect(-.1, y0, base + 3, y1 - y0, top - base - 3, '$od', { stroke: '#2b321f', width: .9 });
  const bars = [.16, .36, .64, .84].map(f => f * w);
  const opening = [[0, 3, base + 3], [0, w - 3, base + 3], [0, w - 3, top], [0, 3, top]];
  const contents = [
    box(2, 6, base + 1, 30, w / 2 - 8, 26, { fill: '$wood', top: '#c8ad81', front: '#9b7d52', stroke: '#5d4a2e' }),
    box(2, w / 2 + 2, base + 1, 26, w / 2 - 8, 26, { fill: '$wood', top: '#c8ad81', front: '#9b7d52', stroke: '#5d4a2e' }),
    ...(faulty(s, 'secured-crates') ? [] : [
      ...[.2 * w, .4 * w, .62 * w, .82 * w].map(y => frontRect(1.9, y - 1.2, base + 1, 2.4, 26, '#4f6b3a')),
      frontRect(1.9, 6, base + 18, w - 12, 2.4, '#4f6b3a'),
    ]),
    box(3, 10, base + 27, 22, 26, 11, { fill: '#232625', top: '#3a3e3c', front: '#1c1f1e', stroke: '#0c0d0d' }),
    frontRect(2.9, 18, base + 33, 9, 1.6, '#555'),
    // A secured tool case is strapped down; a loose one is not.
    ...(faulty(s, 'loose-case') ? [] : [frontRect(2.8, 15, base + 27, 2.2, 11, '#4f6b3a'), frontRect(2.8, 27, base + 27, 2.2, 11, '#4f6b3a')]),
    box(3, w - 30, base + 27, 18, 18, 22, { fill: '$kraft', top: '#d2b07b', front: '#a98652', stroke: '#6b5331' }),
    frontPoly(2.9, ring(4, t => [w - 21 + 5 * Math.sin(t), base + 39 + 5 * Math.cos(t)]), '#c8261d', { stroke: '#fff', width: .7 }),
    frontRect(2.9, w - 27, base + 30, 12, 3.5, '#efe8d4'),
  ];
  return [
    box(0, 0, 0, l, w, base, ALUMINUM),
    ...[.15, .62].map(f => sideRect(-.1, f * l, 1.4, .23 * l, base - 2.8, '#1b2023')),
    ...[.15, .62].map(f => frontRect(-.1, f * w, 1.4, .23 * w, base - 2.8, '#1b2023', { only: ['3d', 'front'] })),
    ...[.06, .45, .94].map(f => sideCircle(-.3, f * l, base - 1.5, 1.4, 'none', { stroke: '#dfe5e7', width: .8 })),
    box(0, 0, base, l, w, h - base, OD),
    ...ribs.map(x => sideRect(-.1, x, base + 3, 2.2, top - base - 3, '#6a7550')),
    ...ribs.map(x => line([x + 2.2, -.15, base + 3], [x + 2.2, -.15, top], '#2b331f', .8)),
    ...[0, l - 3].map(x => sideRect(-.2, x, base, 3, h - base, '$aluminum')),
    sideRect(-.2, 0, top, l, 4, '$aluminum'), sideRect(-.2, 0, base, l, 3, '$aluminum'),
    poly([[0, 0, h + .05], [l, 0, h + .05], [l, w, h + .05], [0, w, h + .05]], 'none', { stroke: '#c7d0d3', width: 2, only: ['3d'] }),
    ...[4, l - 4].map(x => sideCircle(-.4, x, top - 4, 1.8, 'none', { stroke: '#e3e9eb', width: 1 })),
    sideRect(-.3, .58 * l, .5 * h, .3 * l, .14 * h, '#ece8d6', { stroke: '#1d241c', width: .6 }),
    ...[0, 1, 2].map(i => sideRect(-.35, .6 * l, .6 * h - i * .035 * h, .22 * l, .8, '#4c5348')),
    text('side', [.43 * l, -.3, .8 * h], 'ISU-90', 7, '#e6e1c8'),
    text('side', [.43 * l, -.3, .72 * h], 'U.S. AIR FORCE', 3.6, '#e6e1c8'),
    ...(doorsOpen ? [
      frontRect(-.05, 3, base + 3, w - 6, top - base - 3, '#0c120e', { frontKey: -1 }),
      ...contents.map(part => ({ ...part, clip: opening, frontKey: -1, only: ['3d', 'front'] })),
      frontRect(-.1, 0, base, 3, h - base, '$aluminum', { only: ['3d', 'front'], frontKey: -1 }),
      frontRect(-.1, w - 3, base, 3, h - base, '$aluminum', { only: ['3d', 'front'], frontKey: -1 }),
      // Door leaves swung 270° and latched back against the side walls.
      sideRect(-.6, 0, base + 3, w / 2 - 3, top - base - 3, '$od', { stroke: '#2b321f', width: 1, sideKey: -.6 }),
      ...[.3, .7].map(f => line([(w / 2 - 3) * f, -.8, base + 4], [(w / 2 - 3) * f, -.8, top - 1], '#c9d0cf', 1.6, { only: ['3d', 'side'] })),
      ...[.3, .7].flatMap(f => [base + 4, top - 2].map(z => sideRect(-.9, (w / 2 - 3) * f - 1.6, z - 1, 3.2, 2.4, '#8e9a9f'))),
    ] : [
      leaf(3, w / 2 - .3), leaf(w / 2 + .3, w - 3),
      ...[0, w - 3].map(y => frontRect(-.1, y, base, 3, h - base, '$aluminum', { only: ['3d', 'front'] })),
      frontRect(-.1, 0, top, w, 4, '$aluminum', { only: ['3d', 'front'] }),
      ...bars.map(y => line([-.4, y, base + 4], [-.4, y, top - 1], '#c9d0cf', 1.6, { only: ['3d', 'front'] })),
      ...bars.flatMap(y => [base + 4, top - 2].map(z => frontRect(-.5, y - 1.6, z - 1, 3.2, 2.4, '#8e9a9f', { only: ['3d', 'front'] }))),
      ...bars.map(y => line([-.6, y, .48 * h], [-.6, y + (y < w / 2 ? 6 : -6), .48 * h], '#e1e6e5', 1.6, { only: ['3d', 'front'] })),
      ...[3.5, w - 4.5].flatMap(y => [.25, .55, .85].map(f => frontRect(-.5, y, f * h, 1, 4, '#5f6b70', { only: ['3d', 'front'] }))),
      frontRect(-.6, w / 2 - 2, .4 * h, 4, 5, '#3d3f3a', { only: ['3d', 'front'] }),
      text('front', [-.3, w / 2, .82 * h], 'ISU-90', 6, '#e6e1c8', { only: ['3d', 'front'] }),
    ]),
  ];
}

// 463L pallet (88 × 108 in, aluminum skin, 22 tie-down rings) on dunnage, built up with
// crates and cartons and restrained by side and top cargo nets.
function pallet463L(s) {
  const { length: l, width: w, height: h } = s;
  const deck = 2.25, mid = deck + .5 * (h - deck);
  const WOOD = { fill: '$wood', top: '#c8ad81', front: '#9b7d52', stroke: '#5d4a2e' };
  const KRAFT = { fill: '$kraft', top: '#d6b483', front: '#a98652', stroke: '#6b5331' };
  // Listed far to near in each layer so nearer loads paint over farther ones.
  const loads = [
    { x: 57, y: w / 2, z: deck, l: l - 60, w: w / 2 - 3, h: mid - deck - 4, paint: OD, kind: 'od' },
    { x: 3, y: w / 2, z: deck, l: 52, w: w / 2 - 3, h: mid - deck, paint: WOOD, kind: 'crate' },
    { x: 57, y: 3, z: deck, l: l - 60, w: w / 2 - 3, h: mid - deck - 4, paint: OD, kind: 'od' },
    { x: 3, y: 3, z: deck, l: 52, w: w / 2 - 3, h: mid - deck, paint: WOOD, kind: 'crate' },
    { x: l / 2, y: w / 2, z: mid - 4, l: l / 2 - 9, w: w / 2 - 8, h: h - mid, paint: KRAFT, kind: 'carton' },
    { x: 9, y: w / 2, z: mid, l: l / 2 - 9, w: w / 2 - 8, h: h - mid, paint: KRAFT, kind: 'carton' },
    { x: l / 2, y: 8, z: mid - 4, l: l / 2 - 9, w: w / 2 - 8, h: h - mid, paint: KRAFT, kind: 'carton' },
    { x: 9, y: 8, z: mid, l: l / 2 - 9, w: w / 2 - 8, h: h - mid, paint: KRAFT, kind: 'carton' },
  ];
  // Markings on each load's visible faces: crate battens, container latches, carton tape.
  const marks = b => {
    const near = b.y - .1, fwd = b.x - .1, roof = b.z + b.h + .05;
    if (b.kind === 'crate') return [
      ...[.06, .94].map(f => sideRect(near, b.x + f * b.l - 1.5, b.z, 3, b.h, '#8a6a40')),
      sideRect(near, b.x, b.z + b.h / 2 - 1.5, b.l, 3, '#8a6a40'),
      ...[.25, .5, .75].map(f => line([b.x, near - .05, b.z + f * b.h], [b.x + b.l, near - .05, b.z + f * b.h], '#6e5533', .5)),
      text('side', [b.x + 5, near - .1, b.z + .7 * b.h], 'NSN 8115-00 · 1 OF 1', 3, '#2b2216'),
      ...[.1, .9].map(f => frontRect(fwd, b.y + f * b.w - 1.5, b.z, 3, b.h, '#8a6a40', { only: ['3d', 'front'] })),
    ];
    if (b.kind === 'od') return [
      ...[.3, .7].map(f => sideRect(near, b.x + f * b.l - 4, b.z + .62 * b.h, 8, 2, '#1f241a')),
      ...[.15, .85].map(f => sideRect(near, b.x + f * b.l - 1.5, b.z + .8 * b.h, 3, 2.5, '#9aa08a')),
      line([b.x, near - .05, b.z + .78 * b.h], [b.x + b.l, near - .05, b.z + .78 * b.h], '#2b321f', .8),
      sideRect(near - .05, b.x + .4 * b.l, b.z + .25 * b.h, 9, 5, '#e8e4cf'),
      line([fwd, b.y, b.z + .78 * b.h], [fwd, b.y + b.w, b.z + .78 * b.h], '#2b321f', .8, { only: ['3d', 'front'] }),
    ];
    return [
      line([b.x, b.y + b.w / 2, roof], [b.x + b.l, b.y + b.w / 2, roof], '#c9b893', 3, { only: ['3d'] }),
      sideRect(near, b.x + .15 * b.l, b.z + .5 * b.h, 9, 6, '#f2efe3'),
      line([b.x + b.l / 2, near - .05, b.z], [b.x + b.l / 2, near - .05, b.z + b.h], '#8f6f43', .7),
      line([fwd, b.y + b.w / 2, b.z], [fwd, b.y + b.w / 2, b.z + b.h], '#c9b893', 2.4, { only: ['3d', 'front'] }),
    ];
  };
  const net = { stroke: '#5d6b3a', width: 1.5 };
  const torn = faulty(s, 'nets');
  const strand = (a, b, extra) => line(a, b, net.stroke, net.width, extra);
  const sideNet = [];
  for (let x = 6; x < l - 2; x += 12) {
    const topZ = x < l / 2 ? h : h - 4, lowTop = x < 57 ? mid : mid - 4;
    if (torn && x > 40 && x < 52) { // the torn strand
      sideNet.push(strand([x, 2.4, deck], [x, 2.4, mid - 14]), strand([x, 2.4, mid - 6], [x, 2.4, lowTop]));
      sideNet.push(...[-1.6, 0, 1.6].flatMap(dx => [line([x, 2.3, mid - 14], [x + dx, 2.3, mid - 12], '#c9b27d', .7), line([x, 2.3, mid - 6], [x + dx, 2.3, mid - 8], '#c9b27d', .7)]));
    } else sideNet.push(strand([x, 2.4, deck], [x, 2.4, lowTop]));
    sideNet.push(strand([x, 2.4, lowTop], [x, 7.4, lowTop], { only: ['3d'] }), strand([x, 7.4, lowTop], [x, 7.4, topZ]));
  }
  for (let z = deck + 10; z < h - 2; z += 12) {
    if (z < mid - 4) sideNet.push(strand([3, 2.4, z], [l - 3, 2.4, z]));
    else if (z < mid) sideNet.push(strand([3, 2.4, z], [57, 2.4, z]), strand([l / 2, 7.4, z], [l - 9, 7.4, z]));
    else sideNet.push(strand([9, 7.4, z], [z < h - 4 ? l - 9 : l / 2, 7.4, z]));
  }
  const frontNet = [];
  for (let y = 6; y < w - 2; y += 12) frontNet.push(strand([2.4, y, deck], [2.4, y, mid], { only: ['3d', 'front'] }), strand([8.4, y, mid], [8.4, y, h], { only: ['3d', 'front'] }));
  for (let z = deck + 10; z < h - 2; z += 12) frontNet.push(z < mid ? strand([2.4, 3, z], [2.4, w - 3, z], { only: ['3d', 'front'] }) : strand([8.4, 8, z], [8.4, w - 8, z], { only: ['3d', 'front'] }));
  const topNet = [];
  for (let y = 12; y < w - 8; y += 12) topNet.push(strand([9, y, h + .1], [l / 2, y, h + .1], { only: ['3d'] }), strand([l / 2, y, h - 3.9], [l - 9, y, h - 3.9], { only: ['3d'] }));
  for (let x = 12; x < l - 8; x += 12) topNet.push(strand([x, 8, (x < l / 2 ? h : h - 4) + .1], [x, w - 8, (x < l / 2 ? h : h - 4) + .1], { only: ['3d'] }));
  const rings = [
    ...Array.from({ length: 6 }, (_, i) => sideCircle(-.3, l * (i + .5) / 6, 1.2, 1.1, 'none', { stroke: '#e6ebec', width: .8 })),
    ...Array.from({ length: 5 }, (_, i) => frontCircle(-.3, w * (i + .5) / 5, 1.2, 1.1, 'none', { stroke: '#e6ebec', width: .8, only: ['3d', 'front'] })),
  ];
  return [
    ...(faulty(s, 'dunnage') ? [14, w - 18] : [12, w / 2 - 2, w - 16]).map(y => box(4, y, -4, l - 8, 4, 4, { fill: '$wood', top: '#c8ad81', front: '#9b7d52', stroke: '#5d4a2e' }, { only: ['3d'] })),
    box(0, 0, 0, l, w, deck, ALUMINUM),
    line([0, -.1, deck - .6], [l, -.1, deck - .6], '#eef2f3', .7),
    ...rings,
    ...loads.flatMap(b => [box(b.x, b.y, b.z, b.l, b.w, b.h, b.paint), ...marks(b)]),
    ...topNet, ...frontNet, ...sideNet,
  ];
}

// Labeling tape is drawn in inches, scaled down on smaller vehicles so it fits their panels.
export const tapeScale = scenario => Math.min(1, Math.max(.4, scenario.height / 110));
// Side outlines (x aft of the RDL, z above the ground) of the body panels tape can be applied to.
export const tapePanels = scenario => cargoModel(scenario).filter(part => part.tape).map(part => part.profile);

export function cargoModel(scenario, options = {}) {
  if (scenario.kind === 'generator') return startCart(scenario);
  if (scenario.kind === 'jammer') return jammer(scenario);
  if (scenario.axles?.length === 3) return fmtv(scenario);
  if (scenario.axles) return hmmwv(scenario);
  if (scenario.id === 'isu-90') return isu90(scenario, options);
  return pallet463L(scenario);
}
