import { createExercise, getTasks, isStageComplete } from './exercise';
import { scenarios } from './scenarios';

test('stage navigation alone cannot complete an exercise', () => {
  for (const stage of ['precheck', 'incheck', 'manifest', 'ji']) {
    expect(isStageComplete(scenarios[0], stage, createExercise())).toBe(false);
  }
});

test('dimensions require matching physical endpoints, not an arbitrary equal diagonal', () => {
  const exercise = createExercise();
  exercise.measurements = [{ view: 'side', inches: 197, endpoints: [{ x: 0, y: 0 }, { x: 197, y: 0 }] }];
  exercise.notebookEntries.length = 197;
  const tasks = getTasks(scenarios[0], 'incheck', exercise);
  expect(tasks.find(task => task.id === 'length').complete).toBe(true);
  expect(tasks.find(task => task.id === 'width').complete).toBe(false);
  exercise.measurements[0].endpoints = [{ x: 10, y: 10 }, { x: 207, y: 10 }];
  expect(getTasks(scenarios[0], 'incheck', exercise).find(task => task.id === 'length').complete).toBe(false);
});

test('axle stations require the common datum and axle weights', () => {
  const exercise = createExercise();
  exercise.measurements.push({ view: 'side', inches: 33, endpoints: [{ x: 0, y: 74 }, { x: 33, y: 74 }] });
  expect(getTasks(scenarios[0], 'incheck', exercise).find(task => task.id === 'front-axle-position').complete).toBe(false);
  exercise.notebookEntries.D1 = 33;
  expect(getTasks(scenarios[0], 'incheck', exercise).find(task => task.id === 'front-axle-position').complete).toBe(true);
  expect(getTasks(scenarios[0], 'incheck', exercise).find(task => task.id === 'front-axle-weight').complete).toBe(false);
});

test('correct classifications and simulated corrections are required for completion', () => {
  const exercise = createExercise();
  exercise.answers.battery = { choice: 'unsatisfactory' };
  exercise.inspected = ['battery'];
  expect(getTasks(scenarios[0], 'incheck', exercise).find(t=>t.id==='battery').complete).toBe(false);
  exercise.answers.battery.corrected = true;
  exercise.answers.fuel = { choice: 'unsatisfactory', corrected: true };
  exercise.inspected.push('fuel');
  exercise.vehicleState = {positiveTaped:true,fuelFraction:.25};
  exercise.terminalViewed = {positive:true,negative:true};
  exercise.fuelViewed = true;
  expect(getTasks(scenarios[0], 'incheck', exercise).find(t=>t.id==='battery').complete).toBe(true);
  exercise.answers.battery.choice = 'satisfactory';
  expect(getTasks(scenarios[0], 'incheck', exercise).find(t=>t.id==='battery').complete).toBe(false);
});

test('interior evidence requires inspecting each ISU content', () => {
  const exercise = createExercise();
  const finding = scenarios[1].findings.find(item => item.id === 'loose-case');
  exercise.answers[finding.id] = { choice: 'unsatisfactory', corrected: true };
  expect(getTasks(scenarios[1], 'incheck', exercise).find(task => task.id === finding.id).complete).toBe(false);
  exercise.inspected.push(finding.id);
  expect(getTasks(scenarios[1], 'incheck', exercise).find(task => task.id === finding.id).complete).toBe(true);
});
