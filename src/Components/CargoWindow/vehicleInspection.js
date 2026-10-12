export function vehicleStatus(scenario, exercise) {
  return { ...scenario.vehicleChecks, ...exercise.vehicleState };
}
export function canConfirmVehicleCorrection(scenario, exercise, id) {
  if (!scenario.vehicleChecks) return true;
  const state = vehicleStatus(scenario,exercise);
  if (id === 'battery') return state.positiveTaped && state.negativeTaped && exercise.terminalViewed?.positive && exercise.terminalViewed?.negative;
  if (id === 'fuel') return exercise.fuelViewed && state.fuelFraction <= state.fuelLimit;
  return true;
}
export function applyVehicleAction(scenario, exercise, action) {
  if (!scenario.vehicleChecks) return exercise;
  const terminal = action.terminal;
  const validTerminal = ['positive','negative'].includes(terminal);
  if (action.type === 'inspect-terminal' && validTerminal) {
    const viewed = {...exercise.terminalViewed,[terminal]:true};
    return {...exercise,terminalViewed:viewed,inspected: viewed.positive && viewed.negative ? [...new Set([...exercise.inspected,'battery'])] : exercise.inspected};
  }
  if (action.type === 'tape-terminal' && validTerminal && exercise.terminalViewed[terminal] && exercise.answers.battery?.choice === 'unsatisfactory') {
    return {...exercise,vehicleState:{...exercise.vehicleState,[`${terminal}Taped`]:true},terminalViewed:{},inspected:exercise.inspected.filter(id => id !== 'battery'),answers:{...exercise.answers,battery:{...exercise.answers.battery,corrected:false}}};
  }
  if (action.type === 'read-fuel') return {...exercise,fuelViewed:true,inspected:[...new Set([...exercise.inspected,'fuel'])]};
  if (action.type === 'drain-fuel' && exercise.fuelViewed && exercise.answers.fuel?.choice === 'unsatisfactory') {
    return {...exercise,vehicleState:{...exercise.vehicleState,fuelFraction:scenario.vehicleChecks.fuelLimit},fuelViewed:false,inspected:exercise.inspected.filter(id => id !== 'fuel'),answers:{...exercise.answers,fuel:{...exercise.answers.fuel,corrected:false}}};
  }
  return exercise;
}
