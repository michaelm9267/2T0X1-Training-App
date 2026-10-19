import { useState } from 'react';
import { ITEMS, CONTAINERS, isHardware, originOf } from './outboundData';
import ConditionTagForm, { CONDITION_TAGS, tagFor } from './ConditionTagForm';
import RegulationHelp from '../Regulations/RegulationHelp';
import { LABELS } from './outboundLogic';

// The receiving bench: the customer's item as presented, and later the packed piece, drawn in SVG.
// Inspect reads the condition tag and counts units; Tape measure and Scale read the packed piece.

// The small tag drawn on the item takes its form's border color; its close-up is the full DD Form tag.
const tagStyle = condition => { const tag = CONDITION_TAGS[tagFor(condition)]; return { form: tag.form.replace('FORM ', ''), fill: tag.border, text: '#111' }; };

function ConditionTag({ x, y, condition, onOpen }) {
  const tag = tagStyle(condition);
  return <g className="item-tag" role="button" tabIndex={0} aria-label={`${tag.form} condition tag. Select to inspect.`}
    onClick={onOpen} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onOpen(); } }}>
    <line x1={x + 6} y1={y} x2={x + 2} y2={y - 8} stroke="#c9b98f" strokeWidth=".8" />
    <rect x={x} y={y} width="16" height="10" rx="1.2" fill={tag.fill} stroke="#1d1d1d" strokeWidth=".4" />
    <circle cx={x + 2.5} cy={y + 2.5} r=".9" fill="#1d1d1d" />
    <rect x={x + 5} y={y + 3} width="9" height="1.2" fill={tag.text} /><rect x={x + 3} y={y + 6} width="11" height="1" fill={tag.text} opacity=".6" />
  </g>;
}

function HardwareBox({ x, y, kind, open }) {
  return <g>
    <rect x={x} y={y} width="15" height="10" fill="#c79b5b" stroke="#6b4d22" strokeWidth=".4" />
    <rect x={x + 2} y={y + 2.5} width="11" height="4" fill="#f4efe3" />
    <rect x={x + 3} y={y + 3.5} width={kind === 'nuts' ? 6 : 8} height=".8" fill="#333" /><rect x={x + 3} y={y + 5} width="5" height=".6" fill="#777" />
    {open && <rect x={x} y={y - 1.5} width="15" height="1.5" fill="#a77c40" />}
  </g>;
}
function Fastener({ kind, x, y }) {
  if (kind === 'nuts') return <g transform={`translate(${x} ${y})`}><polygon points="0,-4 3.5,-2 3.5,2 0,4 -3.5,2 -3.5,-2" fill="#aab4bd" stroke="#4d5a64" strokeWidth=".4" /><circle r="1.6" fill="#1a2430" /></g>;
  if (kind === 'screws') return <g transform={`translate(${x} ${y})`}><rect x="-2.5" y="-5" width="5" height="4" rx=".8" fill="#55606a" /><polygon points="0,-4.2 1.2,-3.5 1.2,-2.4 0,-1.8 -1.2,-2.4 -1.2,-3.5" fill="#20262c" /><rect x="-1.1" y="-1" width="2.2" height="9" fill="#8d99a3" />{[0, 1, 2, 3, 4].map(i => <line key={i} x1="-1.2" x2="1.2" y1={i * 1.7} y2={i * 1.7 + .7} stroke="#4d5a64" strokeWidth=".3" />)}</g>;
  return <g transform={`translate(${x} ${y})`}><polygon points="-3,-5 3,-5 3.6,-3.5 3,-2 -3,-2 -3.6,-3.5" fill="#aab4bd" stroke="#4d5a64" strokeWidth=".4" /><rect x="-1.3" y="-2" width="2.6" height="11" fill="#9aa6b0" />{[0, 1, 2, 3, 4, 5].map(i => <line key={i} x1="-1.4" x2="1.4" y1={i * 1.6 + 1} y2={i * 1.6 + 1.7} stroke="#4d5a64" strokeWidth=".3" />)}</g>;
}

function ItemArt({ shipment, onTag }) {
  const item = ITEMS[shipment.itemId];
  const q = shipment.quantity;
  if (isHardware(item)) {
    const columns = Math.min(10, Math.max(4, Math.ceil(Math.sqrt(q * 2.2))));
    const rows = Math.ceil(q / columns);
    const top = 92 - rows * 11;
    return <g>
      {Array.from({ length: q }, (_, i) => <HardwareBox key={i} kind={item.kind} x={20 + (i % columns) * 16} y={top + Math.floor(i / columns) * 11} open={i === 0} />)}
      {[0, 1, 2, 3].map(i => <Fastener key={i} kind={item.kind} x={[30, 40, 50, 58][i]} y={98 - (i % 2) * 2} />)}
      <ConditionTag x={8} y={top + 2} condition={shipment.condition} onOpen={onTag} />
    </g>;
  }
  if (item.kind === 'circuit-card') return <g>
    {Array.from({ length: q }, (_, i) => <g key={i} transform={`translate(${22 + i * 42} 46)`}>
      <rect width="38" height="30" rx="1" fill="#1f6b3d" stroke="#0e3a20" strokeWidth=".5" />
      {[[5, 5, 9, 7], [18, 4, 7, 7], [27, 6, 6, 5], [6, 15, 12, 6], [22, 16, 9, 6]].map(([x, y, w, h], k) => <rect key={k} x={x} y={y} width={w} height={h} fill="#1a1d20" />)}
      {[0, 1, 2, 3, 4, 5].map(k => <path key={k} d={`M ${3 + k * 6} 24 v -4 h 3`} stroke="#c9a94a" strokeWidth=".4" fill="none" />)}
      <rect x="4" y="30" width="30" height="3" fill="#d6b24c" />{Array.from({ length: 14 }, (_, k) => <line key={k} x1={5 + k * 2.1} x2={5 + k * 2.1} y1="30" y2="33" stroke="#8b6d1c" strokeWidth=".3" />)}
    </g>)}
    <ConditionTag x={10} y={40} condition={shipment.condition} onOpen={onTag} />
  </g>;
  if (item.kind === 'display-unit') return <g>
    <rect x="55" y="22" width="90" height="74" rx="3" fill="#2d3238" stroke="#11151a" />
    <rect x="66" y="30" width="68" height="52" fill="#0d2830" /><path d="M 70 70 L 90 52 L 105 62 L 128 40" stroke="#5ee0c5" strokeWidth="1" fill="none" />
    {[0, 1, 2, 3, 4].map(i => <rect key={i} x="58" y={32 + i * 10} width="5" height="6" rx="1" fill="#5a636c" />)}
    {[0, 1, 2, 3, 4].map(i => <rect key={i} x="137" y={32 + i * 10} width="5" height="6" rx="1" fill="#5a636c" />)}
    <ConditionTag x={40} y={30} condition={shipment.condition} onOpen={onTag} />
  </g>;
  if (item.kind === 'actuator') return <g>
    <rect x="30" y="52" width="95" height="20" rx="4" fill="#8e9aa4" stroke="#47525c" /><rect x="125" y="58" width="42" height="8" fill="#d8dee3" stroke="#6b7680" />
    <circle cx="172" cy="62" r="6" fill="#7e8a94" stroke="#47525c" /><circle cx="172" cy="62" r="2" fill="#1a1f24" />
    <rect x="16" y="56" width="16" height="12" rx="2" fill="#7e8a94" stroke="#47525c" /><circle cx="18" cy="62" r="2" fill="#1a1f24" />
    {[55, 95].map(x => <g key={x}><rect x={x} y="45" width="8" height="8" fill="#c43c3c" /><rect x={x + 1} y="43" width="6" height="3" fill="#e05a5a" /></g>)}
    <ConditionTag x={65} y={78} condition={shipment.condition} onOpen={onTag} />
  </g>;
  if (item.kind === 'starter') return <g>
    <ellipse cx="70" cy="62" rx="14" ry="30" fill="#6e7a84" stroke="#37424b" /><rect x="70" y="34" width="60" height="56" fill="#8794a0" stroke="#37424b" />
    <ellipse cx="130" cy="62" rx="14" ry="28" fill="#9aa6b0" stroke="#37424b" /><rect x="142" y="56" width="22" height="12" fill="#c3ccd3" stroke="#5b6670" />
    {[0, 1, 2, 3, 4, 5].map(i => <line key={i} x1={145 + i * 3} x2={145 + i * 3} y1="57" y2="67" stroke="#5b6670" strokeWidth=".5" />)}
    <rect x="86" y="24" width="18" height="12" fill="#6e7a84" stroke="#37424b" />
    <ConditionTag x={92} y={92} condition={shipment.condition} onOpen={onTag} />
  </g>;
  if (item.kind === 'brake') return <g>
    <circle cx="100" cy="60" r="44" fill="#3b3f44" stroke="#15181b" strokeWidth="1.2" />
    {[38, 32, 26].map(r => <circle key={r} cx="100" cy="60" r={r} fill="none" stroke="#5c6168" strokeWidth="2.5" />)}
    <circle cx="100" cy="60" r="16" fill="#9aa4ad" stroke="#47525c" />
    {Array.from({ length: 8 }, (_, i) => { const a = i * Math.PI / 4; return <circle key={i} cx={100 + Math.cos(a) * 41} cy={60 + Math.sin(a) * 41} r="3" fill="#b8c1c8" stroke="#47525c" strokeWidth=".4" />; })}
    <ConditionTag x={150} y={30} condition={shipment.condition} onOpen={onTag} />
  </g>;
  if (item.kind === 'gearbox') return <g>
    <path d="M 48 36 L 132 30 L 158 52 L 156 92 L 52 98 L 40 70 Z" fill="#7d878f" stroke="#363d43" strokeWidth="1" />
    {[[78, 58, 16], [116, 54, 13], [96, 80, 9]].map(([cx, cy, r]) => <g key={cx}><circle cx={cx} cy={cy} r={r} fill="#9aa4ad" stroke="#363d43" /><circle cx={cx} cy={cy} r={r * .45} fill="#5c656d" />{Array.from({ length: 6 }, (_, i) => { const a = i * Math.PI / 3; return <circle key={i} cx={cx + Math.cos(a) * r * .75} cy={cy + Math.sin(a) * r * .75} r="1.2" fill="#2b3136" />; })}</g>)}
    {[[140, 70], [60, 86]].map(([x, y]) => <g key={x}><rect x={x - 5} y={y - 4} width="10" height="8" fill="#c43c3c" /><rect x={x - 4} y={y - 6} width="8" height="3" fill="#e05a5a" /></g>)}
    <ConditionTag x={160} y={36} condition={shipment.condition} onOpen={onTag} />
  </g>;
  if (item.kind === 'radio') return <g>
    <rect x="45" y="40" width="110" height="52" rx="2" fill="#4a5560" stroke="#1d2329" />
    <rect x="52" y="47" width="40" height="16" fill="#12302a" /><text x="72" y="58" textAnchor="middle" fontSize="7" fill="#7dfc9e" fontFamily="monospace">243.0</text>
    {[0, 1, 2].map(i => <circle key={i} cx={108 + i * 14} cy="55" r="5" fill="#2a3138" stroke="#9aa6b0" strokeWidth=".6" />)}
    {[0, 1, 2, 3].map(i => <rect key={i} x={54 + i * 12} y="72" width="8" height="12" rx="1" fill="#2a3138" />)}
    <rect x="135" y="70" width="14" height="16" rx="7" fill="#c9a94a" stroke="#6b5a20" />
    <ConditionTag x={30} y={36} condition={shipment.condition} onOpen={onTag} />
  </g>;
  if (item.kind === 'harness') return <g fill="none">
    {[26, 20, 14].map(r => <ellipse key={r} cx="90" cy="66" rx={r * 2} ry={r} stroke="#1f2a33" strokeWidth="3.5" />)}
    <path d="M 132 64 L 170 50 M 132 70 L 172 84" stroke="#1f2a33" strokeWidth="3" />
    {[[170, 50], [172, 84], [48, 66]].map(([x, y]) => <rect key={x} x={x - 4} y={y - 5} width="10" height="10" rx="2" fill="#8d99a3" stroke="#47525c" />)}
    {[70, 100, 120].map(x => <rect key={x} x={x} y="49" width="6" height="4" fill="#f4efe3" />)}
    <ConditionTag x={150} y={92} condition={shipment.condition} onOpen={onTag} />
  </g>;
  if (item.kind === 'seal-kit' || item.kind === 'filter') {
    const kit = item.kind === 'seal-kit';
    const q = shipment.quantity;
    const columns = Math.min(6, q);
    return <g>
      {Array.from({ length: q }, (_, i) => { const x = 24 + (i % columns) * 26, y = (q > 6 ? 46 : 62) + Math.floor(i / columns) * 28; return kit
        ? <g key={i}><rect x={x} y={y} width="22" height="22" rx="2" fill="#e8f1f7" stroke="#8aa1b2" opacity=".95" /><circle cx={x + 8} cy={y + 9} r="4.5" fill="none" stroke="#1d1d1d" strokeWidth="1.6" /><circle cx={x + 15} cy={y + 14} r="3" fill="none" stroke="#1d1d1d" strokeWidth="1.2" /><rect x={x + 2} y={y + 18} width="12" height="2" fill="#555" /></g>
        : <g key={i}><rect x={x} y={y} width="20" height="24" fill="#f0e6c8" stroke="#8a7a50" /><rect x={x + 3} y={y + 4} width="14" height="3" fill="#2a5d8f" /><rect x={x + 3} y={y + 10} width="10" height="1.2" fill="#555" /></g>; })}
      <ConditionTag x={8} y={40} condition={shipment.condition} onOpen={onTag} />
    </g>;
  }
  if (item.kind === 'valve') return <g>
    {[60, 140].map(x => <ellipse key={x} cx={x} cy="66" rx="7" ry="22" fill="#b8c1c8" stroke="#47525c" />)}
    <rect x="60" y="48" width="80" height="36" fill="#9aa6b0" stroke="#47525c" />
    <rect x="86" y="24" width="28" height="24" rx="3" fill="#5c6670" stroke="#2b3136" /><rect x="94" y="18" width="12" height="7" fill="#c9a94a" />
    {[60, 140].map(x => <ellipse key={`c${x}`} cx={x} cy="66" rx="4" ry="15" fill="#c43c3c" />)}
    <ConditionTag x={150} y={90} condition={shipment.condition} onOpen={onTag} />
  </g>;
  if (item.kind === 'pump') return <g>
    <rect x="50" y="44" width="70" height="40" rx="18" fill="#7e8a94" stroke="#37424b" />
    {[0, 1, 2, 3, 4, 5].map(i => <line key={i} x1={62 + i * 9} x2={62 + i * 9} y1="46" y2="82" stroke="#5c6670" strokeWidth="1" />)}
    <rect x="120" y="50" width="30" height="28" rx="3" fill="#a3aeb7" stroke="#37424b" /><circle cx="160" cy="64" r="8" fill="#c43c3c" /><rect x="128" y="36" width="12" height="14" fill="#c43c3c" />
    <ConditionTag x={36} y={88} condition={shipment.condition} onOpen={onTag} />
  </g>;
  if (item.kind === 'antenna') return <g>
    <rect x="20" y="76" width="160" height="8" rx="2" fill="#8d99a3" stroke="#47525c" />
    <path d="M 40 76 L 60 40 L 170 54 L 168 76 Z" fill="#e3e6ea" stroke="#47525c" />
    <circle cx="30" cy="80" r="3" fill="#c9a94a" stroke="#6b5a20" />
    <ConditionTag x={176} y={86} condition={shipment.condition} onOpen={onTag} />
  </g>;
  if (item.kind === 'generator') return <g>
    <rect x="58" y="36" width="80" height="54" rx="10" fill="#6e7a84" stroke="#2b3136" />
    {[0, 1, 2, 3, 4, 5, 6].map(i => <line key={i} x1="62" x2="134" y1={42 + i * 7} y2={42 + i * 7} stroke="#56616a" strokeWidth="1.2" />)}
    <ellipse cx="58" cy="63" rx="9" ry="27" fill="#9aa4ad" stroke="#2b3136" /><rect x="38" y="58" width="12" height="10" fill="#c3ccd3" stroke="#5b6670" />
    <rect x="140" y="50" width="20" height="26" fill="#2a3138" />{[0, 1, 2].map(i => <circle key={i} cx="150" cy={56 + i * 8} r="2" fill="#c9a94a" />)}
    <ConditionTag x={92} y={92} condition={shipment.condition} onOpen={onTag} />
  </g>;
  if (item.kind === 'tire') return <g>
    <circle cx="100" cy="60" r="46" fill="#1f2226" stroke="#0b0c0e" />
    {Array.from({ length: 24 }, (_, i) => { const a = i * Math.PI / 12; return <line key={i} x1={100 + Math.cos(a) * 40} y1={60 + Math.sin(a) * 40} x2={100 + Math.cos(a) * 46} y2={60 + Math.sin(a) * 46} stroke="#3a3f45" strokeWidth="2" />; })}
    <circle cx="100" cy="60" r="24" fill="#26303a" stroke="#0b0c0e" />
    <ConditionTag x={150} y={20} condition={shipment.condition} onOpen={onTag} />
  </g>;
  if (item.kind === 'wheel') return <g>
    <circle cx="100" cy="60" r="42" fill="#b8c1c8" stroke="#47525c" strokeWidth="1.2" />
    <circle cx="100" cy="60" r="30" fill="#9aa4ad" stroke="#47525c" />
    {Array.from({ length: 10 }, (_, i) => { const a = i * Math.PI / 5; return <circle key={i} cx={100 + Math.cos(a) * 22} cy={60 + Math.sin(a) * 22} r="2.5" fill="#5c656d" />; })}
    <circle cx="100" cy="60" r="10" fill="#c43c3c" />
    <ConditionTag x={150} y={28} condition={shipment.condition} onOpen={onTag} />
  </g>;
  if (item.kind === 'apu') return <g>
    <rect x="20" y="92" width="160" height="8" fill="#5b7a3a" stroke="#2f4220" />
    <path d="M 40 92 L 40 50 Q 40 36 56 36 L 140 36 Q 160 36 160 54 L 160 92 Z" fill="#8794a0" stroke="#37424b" />
    <circle cx="70" cy="62" r="14" fill="#c43c3c" stroke="#37424b" /><rect x="118" y="50" width="30" height="20" rx="4" fill="#c43c3c" stroke="#37424b" />
    {[0, 1, 2, 3].map(i => <rect key={i} x={92 + i * 6} y="40" width="3" height="48" fill="#6e7a84" />)}
    <ConditionTag x={164} y={40} condition={shipment.condition} onOpen={onTag} />
  </g>;
  return <g>
    <path d="M 8 70 L 192 62 L 192 76 L 8 84 Z" fill="#c8cdd1" stroke="#5f6870" />
    {Array.from({ length: 22 }, (_, i) => <circle key={i} cx={13 + i * 8.4} cy={71.6 - i * .37} r=".9" fill="#5f6870" />)}
    {Array.from({ length: 22 }, (_, i) => <circle key={`b${i}`} cx={13 + i * 8.4} cy={80.3 - i * .37} r=".9" fill="#5f6870" />)}
    <ConditionTag x={30} y={86} condition={shipment.condition} onOpen={onTag} />
  </g>;
}

// Oblique view of the packed piece, proportioned to its real outer dimensions.
function packedGeometry({ length, width, height }) {
  const s = Math.min(150 / (length + width * .4), 82 / (height + width * .4));
  const dx = width * s * .4, dy = width * s * .4;
  const w = length * s, h = height * s;
  const x = (200 - w - dx) / 2, y = 104 - h;
  return { x, y, w, h, dx, dy };
}
const FACE = {
  fiberboard: ['#c79b5b', '#b0864a', '#d8b076'], 'esd-fiberboard': ['#c79b5b', '#b0864a', '#d8b076'],
  'wood-box': ['#b99f76', '#9c8460', '#cdb68d'], crate: ['#b99f76', '#9c8460', '#cdb68d'], triwall: ['#b8925a', '#9d7a47', '#cfaa70'], mailer: ['#e9e2c8', '#d0c8aa', '#f3eedc'],
};
function PackedArt({ shipment, exercise, measure, weighing }) {
  const g = packedGeometry(shipment.packed);
  const [front, side, top] = FACE[shipment.container];
  const wood = ['wood-box', 'crate'].includes(shipment.container);
  const base = ['triwall', 'crate'].includes(shipment.container);
  return <g>
    {weighing && <g><rect x={g.x - 10} y="104" width={g.w + g.dx + 20} height="5" fill="#59656f" /><rect x={g.x + g.w + g.dx - 2} y="96" width="22" height="13" rx="1.5" fill="#1b2027" stroke="#59656f" /><text x={g.x + g.w + g.dx + 9} y="105" textAnchor="middle" fill="#7dfc9e" fontSize="5.5" fontFamily="monospace">{shipment.packed.weight}</text></g>}
    {base && <g fill="#7b6544">{[0, .45, .9].map(f => <rect key={f} x={g.x + f * (g.w - 6)} y={g.y + g.h} width="6" height="4" />)}</g>}
    <polygon points={`${g.x},${g.y} ${g.x + g.dx},${g.y - g.dy} ${g.x + g.w + g.dx},${g.y - g.dy} ${g.x + g.w},${g.y}`} fill={top} stroke="#3b2c18" strokeWidth=".5" />
    <polygon points={`${g.x + g.w},${g.y} ${g.x + g.w + g.dx},${g.y - g.dy} ${g.x + g.w + g.dx},${g.y + g.h - g.dy} ${g.x + g.w},${g.y + g.h}`} fill={side} stroke="#3b2c18" strokeWidth=".5" />
    <rect x={g.x} y={g.y} width={g.w} height={g.h} fill={front} stroke="#3b2c18" strokeWidth=".5" />
    {wood && Array.from({ length: 4 }, (_, i) => <line key={i} x1={g.x} x2={g.x + g.w} y1={g.y + (i + 1) * g.h / 5} y2={g.y + (i + 1) * g.h / 5} stroke="#7d6744" strokeWidth=".4" />)}
    {shipment.container === 'crate' && <g stroke="#7d6744" strokeWidth="2" fill="none"><rect x={g.x + 1} y={g.y + 1} width={g.w - 2} height={g.h - 2} /><line x1={g.x + g.w / 2} x2={g.x + g.w / 2} y1={g.y} y2={g.y + g.h} /></g>}
    {!wood && <rect x={g.x + g.w * .42} y={g.y} width={g.w * .16} height={g.h} fill="#d9c7a0" opacity=".55" />}
    {exercise.labels?.msl && <g aria-label="MSL applied"><rect x={g.x + 4} y={g.y + 3} width={Math.min(28, g.w * .4)} height={Math.min(16, g.h * .5)} fill="#fbfaf4" stroke="#222" strokeWidth=".3" />{[0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => <rect key={i} x={g.x + 6 + i * 1.6} y={g.y + 5} width={i % 3 ? .5 : 1} height="3" fill="#111" />)}<rect x={g.x + 6} y={g.y + 10} width={Math.min(20, g.w * .3)} height="1" fill="#222" /><rect x={g.x + 6} y={g.y + 12.5} width={Math.min(14, g.w * .2)} height="1" fill="#555" /></g>}
    {exercise.markings.includes('esd') && <g transform={`translate(${g.x + g.w - 14} ${g.y + 3})`}><polygon points="5,0 10,9 0,9" fill="#f2d24b" stroke="#111" strokeWidth=".4" /><rect x="4.4" y="3" width="1.2" height="3.5" fill="#111" /></g>}
    {exercise.markings.includes('up') && <g fill="#111" transform={`translate(${g.x + g.w / 2 - 4} ${g.y + g.h - 12})`}><polygon points="2,0 4,3 0,3" /><rect x="1.5" y="3" width="1" height="3" /><polygon points="7,0 9,3 5,3" /><rect x="6.5" y="3" width="1" height="3" /></g>}
    {exercise.labels?.carrier && <g aria-label="Carrier label applied" transform={`translate(${g.x + g.w * .62} ${g.y + 3})`}><rect width={Math.min(18, g.w * .3)} height={Math.min(16, g.h * .6)} fill="#fff" stroke="#111" strokeWidth=".35" /><rect x="1.5" y="1.5" width="8" height="1.6" fill="#333" />{[0, 1, 2, 3, 4, 5, 6].map(i => <rect key={i} x={1.5 + i * 2} y="5" width={i % 2 ? .5 : 1} height="4" fill="#111" />)}<rect x="1.5" y="10.5" width="10" height="1" fill="#444" /></g>}
    {measure === 'length' && <Dimension x1={g.x} y1={g.y + g.h + 7} x2={g.x + g.w} y2={g.y + g.h + 7} label={`${shipment.packed.length} in`} />}
    {measure === 'height' && <Dimension x1={g.x - 6} y1={g.y + g.h} x2={g.x - 6} y2={g.y} label={`${shipment.packed.height} in`} vertical />}
    {measure === 'width' && <Dimension x1={g.x + g.w + 3} y1={g.y + g.h + 2} x2={g.x + g.w + g.dx + 3} y2={g.y + g.h - g.dy + 2} label={`${shipment.packed.width} in`} />}
  </g>;
}
function Dimension({ x1, y1, x2, y2, label, vertical }) {
  return <g className="dimension-line"><line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#efce8d" strokeWidth=".9" /><circle cx={x1} cy={y1} r="1.6" fill="#efce8d" /><circle cx={x2} cy={y2} r="1.6" fill="#efce8d" />
    <text x={(x1 + x2) / 2 + (vertical ? -3 : 0)} y={(y1 + y2) / 2 + (vertical ? 0 : 6)} textAnchor={vertical ? 'end' : 'middle'} fill="#fff1c9" fontSize="6" stroke="#0d1420" strokeWidth=".5" paintOrder="stroke">{label}</text></g>;
}

// The tag as supply's inspector filled it in. QTY is what is actually tagged on the bench.
function TagCloseup({ shipment }) {
  const item = ITEMS[shipment.itemId];
  const origin = originOf(shipment);
  const reparable = tagFor(shipment.condition) === '1577-2';
  return <><RegulationHelp claims={['outbound.receipt']} assumptions={['Which condition codes use which DD Form tag (1574, 1575, 1577, 1577-2) and the tag layouts follow the supplied tag images; the governing condition-code source (DLM 4000.25-2) was not obtained, so it is not quoted. The filled-in inspector, activity, and reason entries are fictional.']} /><ConditionTagForm condition={shipment.condition} values={{
    description: <>{shipment.nsn}<br />P/N {item.partNumber}<br />{item.nomenclature}</>,
    serial: shipment.serialNumber || '', ui: item.ui, qty: String(shipment.quantity), contract: '',
    activity: `${origin.dodaac} SUPPLY QA`, inspector: 'J. ALVAREZ 12 OCT 2026',
    nextInspection: '', reason: reparable ? 'FAILED OPERATIONAL CHECK' : '', removedFrom: reparable ? 'END ITEM SN TRN-0001' : '',
  }} /></>;
}

export default function OutboundCargoWindow({ shipment, exercise, onInspect, onMeasure, onWeigh, onApplyLabel }) {
  const item = ITEMS[shipment.itemId];
  const [view, setView] = useState(exercise.packed ? 'packed' : 'item');
  const [tool, setTool] = useState('inspect');
  const [detail, setDetail] = useState(null);
  const [measure, setMeasure] = useState(null);
  const [message, setMessage] = useState('Inspect the item and its condition tag against the shipping document.');
  const packed = exercise.packed && view === 'packed';
  function inspect(id) {
    setDetail(id); onInspect(id);
    if (id === 'tag') setMessage(`${tagStyle(shipment.condition).form} tag: condition code ${shipment.condition}, NSN ${shipment.nsn}.`);
    if (id === 'count') setMessage(`You count ${shipment.quantity} ${item.ui} of ${item.nomenclature.toLowerCase()}.`);
    if (id === 'condition') setMessage(item.description);
  }
  function takeMeasure(dimension) { setMeasure(dimension); onMeasure(dimension); setMessage(`Packed ${dimension}: ${shipment.packed[dimension]} inches.`); }
  return <section className="cargo-window outbound-window" aria-label="Receiving bench">
    <div className="scene-header"><div><span className="eyebrow">Receiving bench · {item.category}</span><h3>{item.nomenclature}</h3><p className="scene-tcn">{shipment.document === '1149' ? 'TCN' : 'Document'} <strong>{shipment.document === '1149' ? shipment.tcn : shipment.documentNumber}</strong> · DD {shipment.document}</p></div><span className="sample-badge">Simulated shipment</span></div>
    <div className="scene-toolbar">
      <div className="tool-group" aria-label="Bench tools">
        {[['inspect', 'Inspect'], ['tape', 'Tape measure'], ['scale', 'Scale'], ['labels', 'Labels']].map(([id, title]) => <button key={id} type="button" aria-pressed={tool === id} onClick={() => { setTool(id); setMeasure(null); if (id !== 'inspect' && exercise.packed) setView('packed'); }}>{title}</button>)}
      </div>
      <label>Bench view <select value={packed ? 'packed' : 'item'} onChange={event => { setView(event.target.value); setMeasure(null); }}><option value="item">Item as received</option><option value="packed" disabled={!exercise.packed}>Packed piece</option></select></label>
    </div>
    <div className="scene-canvas">
      <svg role="img" aria-label={packed ? `Packed piece: ${CONTAINERS[shipment.container].title}` : `Item as received: ${shipment.quantity} ${item.ui} ${item.nomenclature}`} viewBox="0 0 200 120">
        <defs><pattern id="bench-grid" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M 10 0 L 0 0 0 10" fill="none" stroke="#263b4c" strokeWidth=".3" /></pattern></defs>
        <rect width="200" height="120" fill="url(#bench-grid)" />
        <rect x="0" y="110" width="200" height="10" fill="#1d2a36" /><line x1="0" x2="200" y1="110" y2="110" stroke="#496577" strokeWidth=".6" />
        {packed ? <PackedArt shipment={shipment} exercise={exercise} measure={tool === 'tape' ? measure : null} weighing={tool === 'scale' && exercise.weighed} />
          : <ItemArt shipment={shipment} onTag={() => { setTool('inspect'); inspect('tag'); }} />}
      </svg>
    </div>
    <div className="scene-actions">
      {tool === 'inspect' && <>
        <p className="tool-hint">Compare what is on the bench with the shipping document. Select the condition tag in the drawing or use the buttons.</p>
        <div className="inspection-points">
          <button type="button" onClick={() => inspect('tag')}>Inspect condition tag</button>
          <button type="button" onClick={() => inspect('count')}>Count items</button>
          <button type="button" onClick={() => inspect('condition')}>Inspect physical condition</button>
        </div>
        {detail === 'tag' && <TagCloseup shipment={shipment} />}
        {detail === 'condition' && <div className="inspection-detail"><strong>Physical condition</strong><p>{item.description} No damage beyond normal handling.</p></div>}
      </>}
      {tool === 'tape' && (exercise.packed ? <>
        <p className="tool-hint">Measure the packed piece's greatest outer dimensions.</p>
        <div className="action-row">{['length', 'width', 'height'].map(id => <button key={id} type="button" onClick={() => { setView('packed'); takeMeasure(id); }}>Measure {id}</button>)}</div>
      </> : <p className="tool-hint">Pack the item first. Shipping dimensions are taken from the packed piece.</p>)}
      {tool === 'scale' && (exercise.packed ? <div className="action-row"><button type="button" onClick={() => { setView('packed'); onWeigh(); setMessage(`Scale reading: ${shipment.packed.weight} lb gross.`); }}>Weigh packed piece</button></div>
        : <p className="tool-hint">Pack the item first. The shipping weight is the gross weight of the packed piece.</p>)}
      {tool === 'labels' && (exercise.packed ? <>
        <p className="tool-hint">Apply the labels printed from CMOS: the MSL from the Shipment Planning Pieces tab, and for a small package the carrier's shipping label from Print Express Docs.</p>
        <div className="action-row">{Object.entries(LABELS).map(([id, label]) => {
          const printed = Boolean(exercise.printed?.[label.printedBy]);
          const applied = Boolean(exercise.labels?.[id]);
          return <button key={id} type="button" disabled={!printed || applied} title={printed ? undefined : 'Print it in CMOS first'} onClick={() => { setView('packed'); onApplyLabel(id); setMessage(`${label.title} applied to the packed piece.`); }}>{applied ? `${label.title} applied` : `Apply ${label.title.toLowerCase()}`}</button>;
        })}</div>
      </> : <p className="tool-hint">Pack the item first. Labels go on the packed piece.</p>)}
    </div>
    <div className="scene-readout" role="status">{message}</div>
  </section>;
}
