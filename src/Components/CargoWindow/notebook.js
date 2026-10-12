import { axleCode, axleLabels } from './axles';
import { tapePanels, tapeScale } from './cargoModels';
import { recordMistake } from './mistakes';
export function notebookFields(scenario) {
  return [
    { id: 'length', label: 'Overall length (in)', expected: scenario.length },
    { id: 'width', label: 'Overall width (in)', expected: scenario.width },
    { id: 'height', label: 'Overall height (in)', expected: scenario.height },
    { id: 'gross', label: 'GWT — gross weight (lb)', expected: scenario.weight, weightId: 'gross' },
    ...(scenario.axles || []).flatMap((axle, index) => [
      { id: `D${index+1}`, label: `D${index+1} — ${axle.title.toLowerCase()} datum distance (in)`, expected: axle.position, axle },
      { id: `W${index+1}`, label: `W${index+1} (${axleCode(scenario,index)}) — ${axle.title.toLowerCase()} weight (lb)`, expected: axle.weight, weightId: axle.id },
    ]),
  ];
}

export function viewedReading(scenario, exercise, field) {
  if (field.weightId) return exercise.weights[field.weightId]?.pounds;
  const equal = (a,b) => Math.abs(a.x-b.x) < .1 && Math.abs(a.y-b.y) < .1;
  const match = (record, view, a, b) => record.view === view && ((equal(record.endpoints[0],a) && equal(record.endpoints[1],b)) || (equal(record.endpoints[0],b) && equal(record.endpoints[1],a)));
  const h = scenario.height;
  const record = exercise.measurements.find(record => {
    if (field.axle) return match(record,'side',{x:0,y:h},{x:field.axle.position,y:h});
    if (field.id === 'height') return ['side','front'].some(view => [0,view === 'side' ? scenario.length : scenario.width].some(x => match(record,view,{x,y:0},{x,y:h})));
    const view = field.id === 'length' ? 'side' : 'front';
    const width = field.id === 'length' ? scenario.length : scenario.width;
    return [0,h].some(y => match(record,view,{x:0,y},{x:width,y}));
  });
  return record?.inches;
}

export function editNotebookEntry(exercise, id, value) {
  const entries = { ...exercise.notebookEntries };
  delete entries[id];
  const cbField = id === 'gross' || /^[DW]\d+$/.test(id);
  return { ...exercise, notebookDraft: { ...exercise.notebookDraft, [id]: value }, notebookEntries: entries,
    notebookFeedback: { ...exercise.notebookFeedback, [id]: '' },
    cbResult: cbField ? null : exercise.cbResult,
    tapeLabels: exercise.tapeLabels.filter(label => !(cbField && label.type === 'cb') && !(id === (label.weightId || (label.type === 'faw' ? 'W1' : label.type === 'raw' ? 'W2' : null)))),
    labelFeedback: cbField ? '' : exercise.labelFeedback,
  };
}

export function saveNotebookEntry(scenario, exercise, id) {
  const field = notebookFields(scenario).find(field => field.id === id);
  const value = exercise.notebookDraft[id];
  let error;
  if (!field || value === undefined || String(value).trim() === '' || !Number.isFinite(Number(value)) || Number(value) < 0 || (field.weightId && Number(value) <= 0)) error = 'Enter a valid reading in the stated units.';
  else if (viewedReading(scenario,exercise,field) === undefined) error = 'View the appropriate tape or scale reading first.';
  else if (Number(value) !== (field.weightId ? field.expected : Number(field.expected.toFixed(1)))) error = 'This entry does not match the viewed reading. Recheck the value and units.';
  const saved = { ...exercise, notebookEntries: error ? exercise.notebookEntries : { ...exercise.notebookEntries, [id]: Number(value) }, notebookFeedback: { ...exercise.notebookFeedback, [id]: error || 'Recorded.' } };
  return error?.startsWith('This entry does not match') ? recordMistake(saved, 'reading', `${field.label}: recorded ${value}`, 'DTR Part III App O K.2.e(3)–(5)') : saved;
}

export function placeTapeLabel(scenario, exercise, label) {
  const reject = message => ({ ...exercise, labelFeedback: message });
  const wrong = message => recordMistake(reject(message), 'tape', `${label.type?.toUpperCase()} tape: ${message}`, 'DTR Part III App P C.3');
  if (!scenario.axles || !['left','right'].includes(label.side) || ![...axleLabels(scenario).map(axle => axle.type),'cb'].includes(label.type)) return reject('Choose a vehicle side and valid tape label.');
  if (![label.x,label.y].every(Number.isFinite)) return reject('Choose a valid position on the side of the vehicle.');
  // The tape's centerline must lie on the vehicle's side panels (not over wheel wells or air).
  const h = scenario.height, k = tapeScale(scenario);
  const panels = tapePanels(scenario).map(profile => profile.map(([x,z]) => [x,h-z]));
  const inPolygon = (body,x,y) => {
    let hit = false;
    for (let i = 0, j = body.length-1; i < body.length; j = i++) {
      const [xi,yi] = body[i], [xj,yj] = body[j];
      if ((yi > y) !== (yj > y) && x < (xj-xi)*(y-yi)/(yj-yi)+xi) hit = !hit;
    }
    return hit;
  };
  const inside = (x,y) => panels.some(body => inPolygon(body,x,y));
  const centerlines = label.type === 'cb' ? [[-28,0,28,0],[0,4,0,22]] : [[-22,0,22,0]];
  const panel = centerlines.every(([x1,y1,x2,y2]) => Array.from({length:9},(_,i) => i/8).every(t => inside(label.x+k*(x1+(x2-x1)*t),label.y+k*(y1+(y2-y1)*t))));
  const value = String(label.value ?? '').trim();
  if (value === '' || !Number.isFinite(Number(value))) return reject('Type the value to write on the tape before placing it.');
  let expected, position;
  if (label.type === 'cb') {
    if (!exercise.cbResult || exercise.cbResult.error) return reject('Calculate CB from your recorded notebook entries first.');
    expected = exercise.cbResult.rounded;
    position = expected;
    if (String(label.gross ?? '').trim() === '' || Number(label.gross) !== exercise.notebookEntries.gross) return wrong('The horizontal tape must show the recorded GWT.');
  } else {
    const axle = axleLabels(scenario).find(axle => axle.type === label.type);
    expected = exercise.notebookEntries[axle.weightId];
    position = axle.position;
    if (expected === undefined) return reject('Record the corresponding axle weight in the notebook first.');
  }
  if (Number(value) !== expected) return wrong('The label value does not match your recorded weight or calculated CB.');
  if (!panel || Math.abs(label.x-position) > (label.type === 'cb' ? 3 : 8)) return wrong(label.type === 'cb' ? 'Place the CB T at the calculated distance aft of the RDL, on the body panel.' : 'Place the axle-weight tape on the body panel directly above that axle.');
  // Tape goes on both vehicle sides; applying it to one side mirrors it to the other.
  const applied = { ...label, weightId:axleLabels(scenario).find(axle => axle.type === label.type)?.weightId, value:Number(value), gross:label.type === 'cb' ? Number(label.gross) : undefined };
  const other = label.side === 'left' ? 'right' : 'left';
  return { ...exercise, tapeLabels: [...exercise.tapeLabels.filter(item => item.type !== label.type), applied, { ...applied, side:other }], labelFeedback: `${label.type.toUpperCase()} tape applied to the ${label.side} side and matched on the ${other} side.` };
}
