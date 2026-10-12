import { notebookFields, saveNotebookEntry, editNotebookEntry, placeTapeLabel } from './notebook';
import { createExercise, getTasks } from './exercise';
import { scenarios } from './scenarios';
import { calculateCB } from './centerOfBalance';

const scenario = scenarios[0];
function observedExercise() {
  const exercise = createExercise();
  exercise.measurements = [
    { view: 'side', endpoints: [{ x: 0, y: 74 }, { x: 33, y: 74 }], inches: 33 },
    { view: 'side', endpoints: [{ x: 0, y: 74 }, { x: 163, y: 74 }], inches: 163 },
  ];
  exercise.weights = { gross: { pounds: 9800 }, 'front-axle': { pounds: 5400 }, 'rear-axle': { pounds: 4400 } };
  return exercise;
}
function savedExercise() {
  let exercise = observedExercise();
  for (const [id,value] of [['D1','33'],['D2','163'],['W1','5400'],['W2','4400'],['gross','9800']]) {
    exercise = editNotebookEntry(exercise,id,value);
    exercise = saveNotebookEntry(scenario,exercise,id);
  }
  exercise.cbResult = calculateCB([{ distance: 33, weight: 5400 }, { distance: 163, weight: 4400 }],9800);
  return exercise;
}

test('notebook uses the requested axle identifiers and requires observed evidence', () => {
  expect(notebookFields(scenario).map(field => field.id)).toEqual(['length','width','height','gross','D1','W1','D2','W2']);
  const exercise = editNotebookEntry(createExercise(),'W1','5400');
  expect(saveNotebookEntry(scenario,exercise,'W1').notebookEntries.W1).toBeUndefined();
  expect(saveNotebookEntry(scenario,exercise,'W1').notebookFeedback.W1).toMatch(/view/i);
});

test('observed readings do not complete tasks until manually entered and checked', () => {
  let exercise = observedExercise();
  expect(getTasks(scenario,'incheck',exercise).find(task => task.id === 'front-axle-weight').complete).toBe(false);
  exercise = editNotebookEntry(exercise,'W1','5300');
  exercise = saveNotebookEntry(scenario,exercise,'W1');
  expect(exercise.notebookEntries.W1).toBeUndefined();
  exercise = editNotebookEntry(exercise,'W1','5400');
  exercise = saveNotebookEntry(scenario,exercise,'W1');
  expect(getTasks(scenario,'incheck',exercise).find(task => task.id === 'front-axle-weight').complete).toBe(true);
});

test('rejects extra precision that does not match the displayed reading', () => {
  for (const [id,value] of [['D1','33.04'], ['W1','5400.0001'], ['gross','9800.0001']]) {
    const exercise = saveNotebookEntry(scenario,editNotebookEntry(observedExercise(),id,value),id);
    expect(exercise.notebookEntries[id]).toBeUndefined();
    expect(exercise.notebookFeedback[id]).toMatch(/does not match/);
  }
});

test('rejects tape footprints outside the vehicle body', () => {
  const exercise = savedExercise();
  expect(placeTapeLabel(scenario,exercise,{type:'raw',side:'left',x:163,y:40,value:'4400'}).tapeLabels).toHaveLength(0);
  expect(placeTapeLabel(scenario,exercise,{type:'cb',side:'left',x:91,y:58,value:'91',gross:'9800'}).tapeLabels).toHaveLength(0);
});

test('editing a saved axle entry invalidates its value, CB and dependent tape labels', () => {
  let exercise = savedExercise();
  exercise.tapeLabels = [{ type:'faw',side:'left' }, { type:'raw',side:'left' }, { type:'cb',side:'left' }];
  exercise = editNotebookEntry(exercise,'W1','5500');
  expect(exercise.notebookEntries.W1).toBeUndefined();
  expect(exercise.cbResult).toBeNull();
  expect(exercise.tapeLabels.map(label => label.type)).toEqual(['raw']);
});

test('validates labeling content and location and mirrors tape to both vehicle sides', () => {
  let exercise = savedExercise();
  const label = { type:'faw', side:'left', x:33, y:33, value:'5400' };
  expect(placeTapeLabel(scenario,exercise,{...label,value:'5300'}).tapeLabels).toHaveLength(0);
  expect(placeTapeLabel(scenario,exercise,{...label,x:163}).tapeLabels).toHaveLength(0);
  expect(placeTapeLabel(scenario,exercise,{...label,y:74}).tapeLabels).toHaveLength(0);
  exercise = placeTapeLabel(scenario,exercise,label);
  expect(exercise.tapeLabels.map(item => item.side)).toEqual([label.side, label.side === 'left' ? 'right' : 'left']);
  expect(exercise.labelFeedback).toMatch(/matched on the/);
  exercise = placeTapeLabel(scenario,exercise,{...label,side:'right'});
  expect(exercise.tapeLabels).toHaveLength(2);
  exercise = placeTapeLabel(scenario,exercise,{type:'cb',side:'left',x:91,y:33,value:'91',gross:'9800'});
  expect(exercise.tapeLabels).toHaveLength(4);
  expect(exercise.tapeLabels.filter(item => item.type === 'cb').map(item => item.side).sort()).toEqual(['left','right']);
  expect(placeTapeLabel(scenario,exercise,{type:'cb',side:'right',x:80,y:33,value:'91',gross:'9800'}).tapeLabels).toHaveLength(4);
});

test('three-axle notebook and tape distinguish intermediate and rear weights', () => {
  const three = scenarios.find(item => item.id === 'three-axle');
  expect(three).toBeDefined();
  const fields = notebookFields(three);
  expect(fields.find(field => field.id === 'W2').label).toContain('IAW');
  expect(fields.find(field => field.id === 'W3').label).toContain('RAW');
  let exercise = createExercise();
  exercise.notebookEntries = {W1:9200,W2:6000,W3:5800,gross:21000,D1:35,D2:172,D3:227};
  exercise = placeTapeLabel(three,exercise,{type:'iaw',side:'left',x:172,y:55,value:'6000'});
  exercise = placeTapeLabel(three,exercise,{type:'raw',side:'left',x:227,y:55,value:'5800'});
  expect(exercise.tapeLabels.map(label => `${label.type}-${label.side}`)).toEqual(['iaw-left','iaw-right','raw-left','raw-right']);
  exercise = editNotebookEntry(exercise,'W3','5900');
  expect(exercise.tapeLabels.map(label => label.type)).toEqual(['iaw','iaw']);
});
