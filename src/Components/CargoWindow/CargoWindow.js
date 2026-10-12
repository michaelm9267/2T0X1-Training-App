import VehicleInspection from './VehicleInspectionPanel';
import { axleCode } from './axles';
import { useCallback, useState } from 'react';
import { edgeTargets, measure, screenToPhysical } from './measurement';
import CargoPerspective, { CargoModel, perspectiveViewBox } from './CargoPerspective';
import { tapeScale } from './cargoModels';
import LabelingTape, { TapeMarks } from './LabelingTape';
import { manifestFields } from './workflow';
import MslModal, { mslData } from '../Documentation/MilitaryShippingLabel';
import './cargo-window.css';

function CargoDrawing({ scenario, view, doorsOpen }) {
  const width = view === 'side' ? scenario.length : scenario.width;
  const height = scenario.height;
  return <g className="cargo-art">
    <rect width={width} height={height} className="cargo-outline" />
    <CargoModel scenario={scenario} view={view} doorsOpen={doorsOpen} />
    {view === 'side' && scenario.axles?.map(axle => <line key={axle.id} x1={axle.position} x2={axle.position} y1={height - 6} y2={height} stroke="#5ee0c5" strokeDasharray="2 2" />)}
  </g>;
}

// Military shipping label applied after the increment is manifested. Drawn at its real size
// (4 × 6 in, in the drawing's inch units) from a 40 × 60 design scaled by 0.1. Click to view it.
const MSL_WIDTH = 4, MSL_HEIGHT = 6;
function mslPosition(scenario, view) {
  const width = view === 'side' ? scenario.length : scenario.width;
  const height = scenario.height;
  if (view === 'front') return [(width - MSL_WIDTH) / 2, height * .45];
  if (scenario.kind === 'generator') return [width * .3, height * .6];
  if (scenario.axles) return [58, height * .5];
  if (scenario.id === 'isu-90') return [width / 2 + 8, 42];
  return [14, height * .45];
}
function ShippingLabel({ scenario, view, onOpen }) {
  const label = mslData(scenario);
  const [x, y] = mslPosition(scenario, view);
  const bars = label.tcn.split('').flatMap((ch, i) => [0, 1, 2].map(k => ({ x: 2 + i * 2.1 + k * .65, w: (ch.charCodeAt(0) >> k) & 1 ? .45 : .22 })));
  const open = event => { event.stopPropagation(); onOpen(); };
  return <g className="shipping-label" role="button" tabIndex={0} aria-label={`Military shipping label ${label.tcn}. Select to view.`}
    onClick={open} onMouseDown={event => event.stopPropagation()} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(event); } }}>
    <title>Military shipping label — click to view</title>
    <rect className="shipping-label-hit" x={x - 2} y={y - 2} width={MSL_WIDTH + 4} height={MSL_HEIGHT + 4} fill="transparent" />
    <g transform={`translate(${x} ${y}) scale(.1)`}>
      <rect width="40" height="60" fill="#fbfaf4" stroke="#1d242b" strokeWidth="1" />
      <g fill="#111">{bars.map((bar, i) => <rect key={i} x={bar.x} y="4" width={bar.w} height="7" />)}</g>
      <line x1="0" x2="40" y1="13" y2="13" stroke="#111" strokeWidth=".6" />
      <rect x="2" y="15" width="16" height="2" fill="#555" /><rect x="22" y="15" width="16" height="2" fill="#555" />
      <line x1="0" x2="40" y1="19" y2="19" stroke="#111" strokeWidth=".6" />
      <rect x="2" y="21" width="10" height="8" fill="#111" opacity=".85" />
      <rect x="29" y="21" width="9" height="15" fill="#111" />
      <rect x="2" y="31" width="14" height="6" fill="#111" />
      <rect x="2" y="40" width="13" height="6" fill="#111" />
      <rect x="18" y="39" width="20" height="9" fill="url(#msl-2d)" />
      <line x1="0" x2="40" y1="50" y2="50" stroke="#111" strokeWidth=".6" />
      <rect x="2" y="52" width="14" height="3" fill="#111" /><g fill="#111">{[0, 1, 2, 3, 4, 5, 6, 7].map(i => <rect key={i} x={2 + i * 1.7} y="56" width={i % 3 ? .5 : .9} height="3" />)}</g>
      <rect x="20" y="52" width="16" height="1.2" fill="#666" /><rect x="20" y="54.5" width="13" height="1.2" fill="#666" /><rect x="20" y="57" width="15" height="1.2" fill="#666" />
    </g>
  </g>;
}

export default function CargoWindow({ scenario, onRecordMeasurement, onRecordWeight, onInspect, exercise = { tapeLabels: [], labelFeedback: '' }, onPlaceLabel, onRemoveLabel, onVehicleAction, stage, onInspectMarkings }) {
  const [view, setView] = useState('side');
  const [mslOpen, setMslOpen] = useState(false);
  const closeMsl = useCallback(() => setMslOpen(false), []);
  const tcn = manifestFields(scenario).find(field => field.id === 'tcn').expected;
  const [tool, setTool] = useState('tape');
  const [points, setPoints] = useState([]);
  const [hover, setHover] = useState(null);
  const [doorsOpen, setDoorsOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [side, setSide] = useState('left');
  const [labelDraft, setLabelDraft] = useState({ type:'faw', value:'', gross:'', x:'', height:'38' });
  const [message, setMessage] = useState('Choose a start point, then an end point.');
  const width = view === 'side' ? scenario.length : scenario.width;
  const height = scenario.height;
  const targets = edgeTargets(width, height, view === 'side' ? scenario.axles : []);
  const distance = points.length === 2 ? measure(points[0], points[1]) : null;
  const perspective = view === 'perspective';
  const viewBox = perspective ? perspectiveViewBox(scenario) : `-25 -20 ${width + 50} ${height + 55}`;
  const [canvasX, canvasY, canvasWidth, canvasHeight] = viewBox.split(' ').map(Number);

  function clear() {
    setPoints([]); setHover(null); setMessage('Choose a start point, then an end point.');
  }
  function selectPoint(point) {
    if (tool !== 'tape' || perspective) return;
    if (points.length !== 1) {
      setPoints([point]); setMessage('Start point set. Choose an end point.');
    } else if (measure(points[0], point) < .01) {
      setMessage('Choose a different endpoint.');
    } else {
      const inches = measure(points[0],point);
      setPoints([points[0], point]);
      onRecordMeasurement({ view, endpoints: [points[0],point].map(endpoint => ({ ...endpoint })), inches });
      const axleIndex = scenario.axles?.findIndex(axle => [points[0],point].some(endpoint => Math.abs(endpoint.x-axle.position)<.1 && Math.abs(endpoint.y-height)<.1) && [points[0],point].some(endpoint => Math.abs(endpoint.x)<.1 && Math.abs(endpoint.y-height)<.1));
      setMessage(`${axleIndex >= 0 ? `D${axleIndex+1}: ` : 'Measurement: '}${inches.toFixed(1)} inches. Type this reading in your notebook.`);
    }
  }
  function mousePoint(event, snap = true) {
    const matrix = event.currentTarget.getScreenCTM();
    if (!matrix) return null;
    const point = screenToPhysical(event.clientX, event.clientY, matrix.inverse());
    if (!snap) return point;
    // Compare in screen space so the snap radius is independent of zoom or aspect ratio.
    let nearest = point;
    let closest = 12;
    for (const target of targets) {
      const dx = target.x - point.x, dy = target.y - point.y;
      const screenDistance = Math.hypot(matrix.a * dx + matrix.c * dy, matrix.b * dx + matrix.d * dy);
      if (screenDistance <= closest) { closest = screenDistance; nearest = target; }
    }
    return nearest;
  }
  function inspect(id) {
    const finding = scenario.findings.find(item => item.id === id);
    setDetail(finding);
    setMessage(`${finding.title}: ${exercise.answers?.[id]?.corrected ? 'Discrepancy corrected and reinspection recorded. ' + finding.correction : finding.observation}`);
    if (!scenario.vehicleChecks || !['battery','fuel'].includes(id)) onInspect(id);
  }
  function weigh(id, title, pounds) {
    onRecordWeight({ id, title, pounds }); setMessage(`${title}: ${pounds.toLocaleString()} lb. Type this reading in your notebook.`);
  }
  const visibleFindings = scenario.findings.filter(finding => !['documents', 'special-service'].includes(finding.id) && (finding.id !== 'label' || stage === 'ji') && (!finding.interior || doorsOpen));
  return <section className="cargo-window" aria-label="Cargo simulator">
    <div className="scene-header"><div><span className="eyebrow">Virtual cargo bay</span><h3>{scenario.subtitle}</h3><p className="scene-tcn">TCN <strong>{tcn}</strong></p></div><span className="sample-badge">Simulated shipment</span></div>
    <div className="scene-toolbar">
      <div className="tool-group" aria-label="Cargo tools">
        {[['tape', 'Tape measure'], ['scale', 'Scale'], ['inspect', 'Inspect'], ...(scenario.axles ? [['label', 'Labeling tape']] : [])].map(([id, title]) => <button key={id} type="button" aria-pressed={tool === id} onClick={() => { setTool(id); clear(); }}>{title}</button>)}
      </div>
      <label>Cargo view <select value={view} onChange={event => { setView(event.target.value); clear(); }}><option value="side">Side</option><option value="front">Front</option><option value="perspective">3D perspective</option></select></label>
    </div>
    <div className={`scene-canvas tool-${tool}`}>
      <svg role="img" aria-label={`Interactive cargo: ${scenario.title}, ${view} view`} viewBox={viewBox} onClick={event => { if (tool === 'label' && view === 'side') { const point = mousePoint(event,false); if (point) onPlaceLabel({ ...labelDraft, side, ...point }); return; } if (perspective || tool !== 'tape') return; const point = mousePoint(event); if (point) selectPoint(point); }} onMouseMove={event => { if (tool === 'tape' && !perspective) setHover(mousePoint(event)); }} onMouseLeave={() => setHover(null)}>
        <defs>
          <linearGradient id={`body-${scenario.id}`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#819078" /><stop offset=".5" stopColor="#53654d" /><stop offset="1" stopColor="#2b3c30" /></linearGradient>
          <linearGradient id={`glass-${scenario.id}`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#b5c9c1" /><stop offset=".3" stopColor="#5f8d91" /><stop offset="1" stopColor="#173743" /></linearGradient>
          <linearGradient id={`wood-${scenario.id}`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#b99f76" /><stop offset="1" stopColor="#6d5c3e" /></linearGradient>
          <pattern id="msl-2d" width="2" height="2" patternUnits="userSpaceOnUse"><rect width="2" height="2" fill="#fbfaf4" /><rect width="1" height="1" fill="#111" /><rect x="1" y="1" width="1" height="1" fill="#111" /></pattern>
          <pattern id={`grid-${scenario.id}`} width="12" height="12" patternUnits="userSpaceOnUse"><path d="M 12 0 L 0 0 0 12" fill="none" stroke="#263b4c" strokeWidth=".3" /></pattern></defs>
        <rect x={canvasX} y={canvasY} width={canvasWidth} height={canvasHeight} fill={`url(#grid-${scenario.id})`} />
        {!perspective && <line x1="-15" x2={width + 15} y1={height + 4} y2={height + 4} stroke="#496577" strokeWidth=".7" />}
        {perspective ? <CargoPerspective scenario={scenario} doorsOpen={doorsOpen} /> : <CargoDrawing scenario={scenario} view={view} doorsOpen={doorsOpen} />}
        {!perspective && !(scenario.id === 'isu-90' && doorsOpen) && exercise.manifestAccepted && exercise.mslApplied && <ShippingLabel scenario={scenario} view={view} onOpen={() => setMslOpen(true)} />}
        {scenario.axles && view === 'side' && <><text x={width / 2} y={-10} textAnchor="middle" fill="#b5c2d4" fontSize="6">{side === 'left' ? 'Left' : 'Right'} vehicle side · forward edge at left</text><line x1="0" x2="0" y1="-10" y2={height + 10} stroke="#efce8d" strokeDasharray="3 2" /><text x="0" y={height + 20} fill="#efce8d" fontSize="6">Forward RDL</text>{scenario.axles.map((axle,index) => <text key={axle.id} x={axle.position} y={height+14} textAnchor="middle" fill="#a6f3e5" fontSize="5.5">{`D${index+1} / W${index+1} (${axleCode(scenario,index)})`}</text>)}<TapeMarks labels={exercise.tapeLabels.filter(label => label.side === side)} scale={tapeScale(scenario)} /></>}
        {tool === 'tape' && !perspective && targets.map(target => <circle key={target.id} cx={target.x} cy={target.y} r="2" fill="#5ee0c5" stroke="#102a2a" strokeWidth=".5" />)}
        {hover && tool === 'tape' && !perspective && <circle cx={hover.x} cy={hover.y} r="3.5" fill="none" stroke="#edf2f8" strokeWidth=".8" />}
        {points.length > 0 && <circle cx={points[0].x} cy={points[0].y} r="3" fill="#efce8d" />}
        {points.length === 2 && <><line x1={points[0].x} y1={points[0].y} x2={points[1].x} y2={points[1].y} stroke="#efce8d" strokeWidth="1.5" /><circle cx={points[1].x} cy={points[1].y} r="3" fill="#efce8d" /><text x={(points[0].x + points[1].x) / 2} y={(points[0].y + points[1].y) / 2 - 5} textAnchor="middle" fill="#fff1c9" fontSize="7" stroke="#0d1420" strokeWidth=".5" paintOrder="stroke">{distance.toFixed(1)} in</text></>}
      </svg>
    </div>
    <div className="scene-actions">
      {tool === 'inspect' && scenario.vehicleChecks && <div className="vehicle-hotspots"><button type="button" onClick={() => inspect('battery')}>Open battery compartment</button><button type="button" onClick={() => inspect('fuel')}>Check fuel gauge</button></div>}
      {perspective ? <p className="tool-hint">Shaded perspective inspection view. Switch to Side or Front to take accurate measurements.</p> : <button type="button" className="perspective-shortcut" onClick={() => { setView('perspective'); clear(); }}>View in 3D perspective</button>}
      {perspective && tool === 'tape' && <button type="button" onClick={() => { setView('side'); clear(); }}>Switch to side measurement view</button>}
      {scenario.contents && <button type="button" aria-expanded={doorsOpen} onClick={() => { setDoorsOpen(!doorsOpen); setDetail(null); }}>{doorsOpen ? 'Close ISU doors' : 'Open ISU doors'}</button>}
      {tool === 'tape' && !perspective && <>
        <p className="tool-hint">Click any two points on the scene. Nearby corners and axle stations snap into place. Axle targets project each axle center to the measurement baseline.</p>
        <details><summary>Keyboard measurement points</summary><div className="target-buttons">{targets.map(target => <button key={target.id} type="button" onClick={() => selectPoint(target)}>{target.label}</button>)}</div></details>
        <div className="action-row"><button type="button" onClick={clear}>Clear measurement</button></div>
      </>}
      {tool === 'scale' && <div className="action-row"><button type="button" onClick={() => weigh('gross', 'Whole piece', scenario.weight)}>Weigh whole piece</button>{scenario.axles?.map((axle,index) => <button key={axle.id} type="button" onClick={() => weigh(axle.id, `W${index+1} (${axleCode(scenario,index)})`, axle.weight)}>Weigh {`W${index+1} (${axleCode(scenario,index)})`}</button>)}</div>}
      {tool === 'label' && scenario.axles && <LabelingTape side={side} setSide={setSide} draft={labelDraft} setDraft={setLabelDraft} scenario={scenario} view={view} onApply={onPlaceLabel} onRemove={onRemoveLabel} labels={exercise.tapeLabels.filter(label => label.side === side)} feedback={exercise.labelFeedback} />}
      {tool === 'inspect' && <>
        <p className="tool-hint">Choose a component to inspect. Record your finding in the stage checklist.</p>
        {stage==='ji' && scenario.axles && <div className="action-row">{['left','right'].map(vehicleSide=><button key={vehicleSide} type="button" onClick={()=>{setView('side');setSide(vehicleSide);onInspectMarkings(vehicleSide);}}>Inspect {vehicleSide} tape markings</button>)}</div>}
        <div className="inspection-points">{visibleFindings.map(finding => <button type="button" key={finding.id} onClick={() => inspect(finding.id)}>Inspect {finding.title}</button>)}</div>
        {scenario.contents && !doorsOpen && <p className="tool-hint">Open the ISU doors to inspect all internal contents.</p>}
        {detail && (scenario.vehicleChecks && ['battery','fuel'].includes(detail.id) ? <VehicleInspection scenario={scenario} exercise={exercise} part={detail.id} onAction={onVehicleAction} /> : <div className="inspection-detail"><strong>{detail.title}</strong><p>{exercise.answers?.[detail.id]?.corrected ? 'Prepared condition: discrepancy corrected and reinspection recorded. ' + detail.correction : scenario.contents?.find(item => item.id === detail.id)?.description || detail.observation}</p></div>)}
      </>}
    </div>
    <div className="scene-readout" role="status">{tool === 'label' ? exercise.labelFeedback || 'Write a label value and click a position on the side of the vehicle.' : message}</div>
    {mslOpen && exercise.manifestAccepted && exercise.mslApplied && <MslModal scenario={scenario} onClose={closeMsl} />}
  </section>;
}
