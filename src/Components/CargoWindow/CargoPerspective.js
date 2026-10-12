import { useId } from 'react';
import { cargoModel } from './cargoModels';

// Renders the cargo models in cargoModels.js. Side and front views are orthographic, so tape
// readings stay exact; the 3D view is an oblique projection for inspection only, seen from the
// front-left and above.
const SLOPE = .14;
const project = (x, y, z) => [x * .85 - y * .5, x * SLOPE - y * .28 - z * .9];
const toPoints = pts => pts.map(p => p.join(',')).join(' ');
const area = pts => pts.reduce((sum, [x1, y1], i) => { const [x2, y2] = pts[(i + 1) % pts.length]; return sum + x1 * y2 - x2 * y1; }, 0) / 2;
// Direction (VIEW_X, 1, VIEW_Z) points away from the viewer: every point along it projects to the
// same spot. Surfaces face the viewer when their normal points against it.
const VIEW_X = .5 / .85, VIEW_Z = (SLOPE * VIEW_X - .28) / .9;
const facesViewer = (nx, nz) => -VIEW_X * nx - VIEW_Z * nz > 1e-4;

function Defs({ id }) {
  const linear = (name, stops, x2 = '0', y2 = '1') => <linearGradient id={`${id}-${name}`} x1="0" y1="0" x2={x2} y2={y2}>{stops.map(([offset, color]) => <stop key={offset} offset={offset} stopColor={color} />)}</linearGradient>;
  return <defs>
    {linear('tan', [[0, '#d6c08f'], [.45, '#bba06e'], [1, '#8c7651']])}
    {linear('canvas', [[0, '#c7b083'], [1, '#9a8462']])}
    {linear('grey', [[0, '#b9c1c6'], [.5, '#8e979d'], [1, '#626b71']])}
    {linear('aluminum', [[0, '#e3e9eb'], [.45, '#a7b3b8'], [.6, '#7c898f'], [1, '#c9d1d4']])}
    {linear('od', [[0, '#636e4a'], [1, '#3a4430']])}
    {linear('wood', [[0, '#c7a776'], [1, '#8d6e45']])}
    {linear('kraft', [[0, '#cfab74'], [1, '#a47f4a']])}
    {linear('glass', [[0, '#a9c2c4'], [.3, '#4b6d75'], [1, '#14232a']], '1', '1')}
    <radialGradient id={`${id}-tire`}><stop offset="0" stopColor="#3a3d39" /><stop offset=".7" stopColor="#1f221f" /><stop offset="1" stopColor="#0c0e0c" /></radialGradient>
    <radialGradient id={`${id}-shadow`}><stop offset="0" stopColor="#000" stopOpacity=".6" /><stop offset="1" stopColor="#000" stopOpacity="0" /></radialGradient>
  </defs>;
}

// Wheel face in local inches, y down, centered on the hub.
function WheelFace({ r, detailed, paint }) {
  if (!detailed) return <g><circle r={r} fill={paint('tire')} stroke="#070807" strokeWidth=".8" /><circle r={r * .5} fill="#151815" /></g>;
  return <g>
    <circle r={r} fill={paint('tire')} stroke="#070807" strokeWidth=".8" />
    {Array.from({ length: 24 }, (_, i) => { const t = i * Math.PI / 12; return <line key={i} x1={Math.cos(t) * r * .9} y1={Math.sin(t) * r * .9} x2={Math.cos(t + .06) * r} y2={Math.sin(t + .06) * r} stroke="#3c403b" strokeWidth={r * .09} />; })}
    <circle r={r * .78} fill="none" stroke="#2c302b" strokeWidth=".7" />
    <circle r={r * .56} fill="#33362f" stroke="#1a1c18" strokeWidth=".8" />
    <circle r={r * .44} fill="none" stroke="#5d6157" strokeWidth=".6" />
    {Array.from({ length: 8 }, (_, i) => { const t = i * Math.PI / 4; return <circle key={i} cx={Math.cos(t) * r * .34} cy={Math.sin(t) * r * .34} r={r * .045} fill="#c3c6b0" />; })}
    <circle r={r * .17} fill="#242622" stroke="#6d7168" strokeWidth=".5" />
  </g>;
}

const visibleIn = (part, view) => {
  if (part.only) return part.only.includes(view);
  // Markings lying flat on a side face disappear edge-on in the front view, and vice versa.
  if (part.type === 'line') return !(view === 'front' && part.a[1] === part.b[1]) && !(view === 'side' && part.a[0] === part.b[0]);
  if (part.type === 'text') return view === '3d' || part.plane === view;
  return true;
};

// Orthographic side (x across, z up) and front (looking aft, so the left side is on the right).
function flat(view, w, h) {
  return view === 'side' ? ([x, , z]) => [x, h - z] : ([, y, z]) => [w - y, h - z];
}

function renderPart(part, key, view, ctx) {
  const { paint, w, h } = ctx;
  const fill = value => typeof value === 'string' && value[0] === '$' ? paint(value.slice(1)) : value;
  const at = view === '3d' ? pt => project(...pt) : flat(view, w, h);
  const shape = (pts, f, stroke, width = .6) => {
    const projected = pts.map(at);
    if (Math.abs(area(projected)) < .02) return null;
    return <polygon points={toPoints(projected)} fill={fill(f)} stroke={stroke || 'none'} strokeWidth={width} strokeLinejoin="round" />;
  };
  if (part.type === 'prism') {
    const { profile, y0, y1 } = part;
    const quads = [];
    profile.forEach(([x1, z1], i) => {
      const [x2, z2] = profile[(i + 1) % profile.length];
      const length = Math.hypot(x2 - x1, z2 - z1);
      if (length < 1e-6) return;
      const nx = -(z2 - z1) / length, nz = (x2 - x1) / length;
      const visible = view === '3d' ? facesViewer(nx, nz) : view === 'front' && nx < -1e-3;
      if (visible) quads.push({ depth: VIEW_X * (x1 + x2) / 2 + VIEW_Z * (z1 + z2) / 2, color: nz >= Math.abs(nx) ? part.top : part.front, pts: [[x1, y0, z1], [x2, y0, z2], [x2, y1, z2], [x1, y1, z1]] });
    });
    quads.sort((a, b) => b.depth - a.depth);
    return <g key={key}>
      {quads.map((quad, i) => <g key={i}>{shape(quad.pts, quad.color, part.stroke, .5)}</g>)}
      {view !== 'front' && shape(profile.map(([x, z]) => [x, y0, z]), part.fill, part.stroke, .7)}
    </g>;
  }
  if (part.type === 'box') {
    const { x, y, z, l, w: bw, h: bh } = part;
    const top = [[x, y, z + bh], [x + l, y, z + bh], [x + l, y + bw, z + bh], [x, y + bw, z + bh]];
    const side = [[x, y, z], [x + l, y, z], [x + l, y, z + bh], [x, y, z + bh]];
    const front = [[x, y, z], [x, y + bw, z], [x, y + bw, z + bh], [x, y, z + bh]];
    return <g key={key}>
      {view === '3d' && shape(top, part.top, part.stroke, .5)}
      {view !== 'front' && shape(side, part.fill, part.stroke, .6)}
      {view !== 'side' && shape(front, part.front, part.stroke, .6)}
    </g>;
  }
  if (part.type === 'poly') return <g key={key}>{shape(part.pts, part.fill, part.stroke, part.width)}</g>;
  if (part.type === 'line') {
    const [a, b] = [part.a, part.b].map(at);
    if (Math.hypot(a[0] - b[0], a[1] - b[1]) < .05) return null;
    return <line key={key} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={part.stroke} strokeWidth={part.width} strokeLinecap="round" />;
  }
  if (part.type === 'text') {
    const [x, y] = at(part.at);
    const transform = view !== '3d' ? `translate(${x} ${y})` : `translate(${x} ${y}) matrix(${part.plane === 'side' ? `.85 ${SLOPE}` : '.5 .28'} 0 .9 0 0)`;
    return <text key={key} transform={transform} fontSize={part.size} fill={part.fill} fontFamily="Arial, Helvetica, sans-serif" fontWeight="700" textAnchor={part.plane === 'front' ? 'middle' : 'start'} letterSpacing=".3">{part.value}</text>;
  }
  if (part.type === 'wheel') {
    const { x, y0, y1, r, detailed } = part;
    if (view === 'side') return <g key={key} transform={`translate(${x} ${h - r})`}><WheelFace r={r} detailed={detailed} paint={paint} /></g>;
    if (view === 'front') return <g key={key}>
      <rect x={w - y1} y={h - 2 * r} width={y1 - y0} height={2 * r} rx="3" fill="#161916" stroke="#060706" strokeWidth=".6" />
      {Array.from({ length: Math.floor(2 * r / 3.2) }, (_, i) => <line key={i} x1={w - y1 + 1} x2={w - y0 - 1} y1={h - 2 * r + 2 + i * 3.2} y2={h - 2 * r + 2 + i * 3.2} stroke="#333832" strokeWidth="1.1" />)}
    </g>;
    const steps = 6;
    return <g key={key}>
      {Array.from({ length: steps }, (_, i) => { const [cx, cy] = project(x, y1 - (y1 - y0) * i / steps, r); return <g key={i} transform={`translate(${cx} ${cy}) matrix(.85 ${SLOPE} 0 .9 0 0)`}><circle r={r} fill="#121412" /></g>; })}
      <g transform={`translate(${project(x, y0, r).join(' ')}) matrix(.85 ${SLOPE} 0 .9 0 0)`}><WheelFace r={r} detailed={detailed} paint={paint} /></g>
    </g>;
  }
  return null;
}

function depthKey(part, view) {
  if (view === 'side' && part.sideKey !== undefined) return part.sideKey;
  if (view === 'front' && part.frontKey !== undefined) return part.frontKey;
  const axis = view === 'side' ? 1 : 0;
  if (part.type === 'prism') return view === 'side' ? part.y0 : Math.min(...part.profile.map(([x]) => x));
  if (part.type === 'box') return view === 'side' ? part.y : part.x;
  if (part.type === 'poly') return Math.min(...part.pts.map(p => p[axis]));
  if (part.type === 'line') return Math.min(part.a[axis], part.b[axis]);
  if (part.type === 'text') return part.at[axis];
  if (part.type === 'wheel') return view === 'side' ? part.y0 : part.x - part.r;
  return 0;
}

export function CargoModel({ scenario, view, doorsOpen }) {
  const id = useId().replace(/:/g, '');
  const paint = name => `url(#${id}-${name})`;
  const ctx = { paint, w: scenario.width, h: scenario.height };
  let parts = cargoModel(scenario, { doorsOpen }).filter(part => visibleIn(part, view));
  if (view !== '3d') parts = parts.map((part, order) => ({ part, order, key: depthKey(part, view) })).sort((a, b) => b.key - a.key || a.order - b.order).map(item => item.part);
  const at = view === '3d' ? pt => project(...pt) : flat(view, ctx.w, ctx.h);
  return <>
    <Defs id={id} />
    {parts.map((part, i) => part.clip
      ? <g key={i}><clipPath id={`${id}-clip-${i}`}><polygon points={toPoints(part.clip.map(at))} /></clipPath><g clipPath={`url(#${id}-clip-${i})`}>{renderPart(part, i, view, ctx)}</g></g>
      : renderPart(part, i, view, ctx))}
  </>;
}

export default function CargoPerspective({ scenario, doorsOpen }) {
  const { length: l, width: w } = scenario;
  const [cx, cy] = project(l / 2, w / 2, 0);
  return <g className="cargo-art perspective-cargo">
    <ellipse cx={cx} cy={cy + 4} rx={(l * .85 + w * .5) / 2 + 12} ry={(l * SLOPE + w * .28) / 2 + 10} fill="url(#cargo-shadow)" opacity=".8" />
    <defs><radialGradient id="cargo-shadow"><stop offset="0" stopColor="#000" stopOpacity=".6" /><stop offset="1" stopColor="#000" stopOpacity="0" /></radialGradient></defs>
    <CargoModel scenario={scenario} view="3d" doorsOpen={doorsOpen} />
  </g>;
}

export function perspectiveViewBox(scenario) {
  const { length: l, width: w, height: h } = scenario;
  const left = -w * .5 - (scenario.contents ? w * .4 : 0) - 30;
  const top = -w * .28 - h * .9 - 20;
  return `${left} ${top} ${l * .85 + 30 - left} ${l * SLOPE + 30 - top}`;
}
