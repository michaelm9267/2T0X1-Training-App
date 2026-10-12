import { applyVehicleAction, vehicleStatus, canConfirmVehicleCorrection } from './vehicleInspection';
import { createExercise } from './exercise';
import { scenarios } from './scenarios';

test('battery evidence requires checking both terminals and rechecking after taping', () => {
  const scenario = scenarios[0];
  let exercise = createExercise();
  exercise = applyVehicleAction(scenario,exercise,{type:'inspect-terminal',terminal:'positive'});
  expect(exercise.inspected).not.toContain('battery');
  exercise = applyVehicleAction(scenario,exercise,{type:'inspect-terminal',terminal:'negative'});
  expect(exercise.inspected).toContain('battery');
  expect(canConfirmVehicleCorrection(scenario,exercise,'battery')).toBe(false);
  exercise.answers.battery = {choice:'unsatisfactory'};
  exercise = applyVehicleAction(scenario,exercise,{type:'tape-terminal',terminal:'positive'});
  expect(vehicleStatus(scenario,exercise).positiveTaped).toBe(true);
  expect(exercise.inspected).not.toContain('battery');
  for (const terminal of ['positive','negative']) exercise = applyVehicleAction(scenario,exercise,{type:'inspect-terminal',terminal});
  expect(canConfirmVehicleCorrection(scenario,exercise,'battery')).toBe(true);
});

test('fuel correction requires viewing, correcting, and rereading the gauge', () => {
  const scenario = scenarios[0];
  let exercise = applyVehicleAction(scenario,createExercise(),{type:'read-fuel'});
  expect(exercise.inspected).toContain('fuel');
  expect(canConfirmVehicleCorrection(scenario,exercise,'fuel')).toBe(false);
  exercise.answers.fuel = {choice:'unsatisfactory'};
  exercise = applyVehicleAction(scenario,exercise,{type:'drain-fuel'});
  expect(vehicleStatus(scenario,exercise).fuelFraction).toBe(.25);
  expect(exercise.inspected).not.toContain('fuel');
  expect(canConfirmVehicleCorrection(scenario,exercise,'fuel')).toBe(false);
  exercise = applyVehicleAction(scenario,exercise,{type:'read-fuel'});
  expect(canConfirmVehicleCorrection(scenario,exercise,'fuel')).toBe(true);
});

test('quarter-tank threshold is inclusive and explicitly scenario-specific', () => {
  const scenario = {...scenarios[0],vehicleChecks:{positiveTaped:true,negativeTaped:true,fuelFraction:.25,fuelLimit:.25}};
  const exercise = applyVehicleAction(scenario,createExercise(),{type:'read-fuel'});
  expect(canConfirmVehicleCorrection(scenario,exercise,'fuel')).toBe(true);
  exercise.vehicleState.fuelFraction = .25001;
  expect(canConfirmVehicleCorrection(scenario,exercise,'fuel')).toBe(false);
});
