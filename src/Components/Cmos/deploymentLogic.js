import { ediForMilMode } from './modeReference';
import { AIR_MIL_MODES } from './planningStatuses';

// CMOS Deployment → Deployment Parameters: one record per DSOE holding the values every TCN on
// that DSOE shares. Air Schedule offers these DSOEs, and Shipment Planning fills its blank
// fields from them when the DSOE ID is entered.

export const DEPLOYMENT_EXERCISE = [['D', 'Deployment'], ['E', 'Exercise']];
export const ATCMD_REQ = [['A', 'Air Clearance'], ['W', 'Water Clearance']];

// Advice numbers this app's exercises use (Advice Number, Fund Identifier, SDN, Effective Date,
// Expiration Date). Like a TAC, an advice number is four characters.
export const ADVICE_NUMBERS = [['TRN1', '', '', '01Oct2025', '30Sep2027']];

export const emptyDeployment = () => ({
  dsoeId: '', deploymentExercise: '', localMajcomExercise: '', milMode: '', ediMode: '', poe: '', pod: '',
  projectCode: '', tac: '', origin: '', destination: '', atcmdReq: '', exportMode: '', adviceNumber: '', eta: '',
});

export function deploymentErrors(draft, deployments = {}, id = null) {
  const errors = [];
  const dsoe = String(draft.dsoeId || '').trim().toUpperCase();
  if (!dsoe) errors.push('DSOE ID is required.');
  else if (!/^[A-Z0-9]{5}$/.test(dsoe)) errors.push('DSOE ID: Enter 5 characters.');
  else if (Object.values(deployments).some((r) => r.id !== id && !r.terminated && String(r.draft.dsoeId || '').toUpperCase() === dsoe))
    errors.push(`DSOE ${dsoe} already has deployment parameters.`);
  if (!String(draft.deploymentExercise || '').trim()) errors.push('Deployment / Exercise is required.');
  if (!String(draft.milMode || '').trim()) errors.push('MIL Mode is required.');
  if (!String(draft.origin || '').trim()) errors.push('Consignor is required.');
  for (const [field, label] of [['tac', 'TAC'], ['adviceNumber', 'Advice Number']])
    if (String(draft[field] || '').trim() && !/^[A-Z0-9]{4}$/i.test(String(draft[field]).trim())) errors.push(`${label} must be 4 characters.`);
  if (String(draft.eta || '').trim() && !/^[1-5X]$/i.test(String(draft.eta).trim())) errors.push('ETA must be 1-5 or X.');
  return errors;
}

// Saved, active parameters (Terminate removes a DSOE from use).
export const activeDeployments = (store) =>
  Object.values(store.deployments || {}).filter((r) => r.saved && !r.terminated);

export function deploymentFor(store, dsoeId) {
  const dsoe = String(dsoeId || '').trim().toUpperCase();
  return dsoe ? activeDeployments(store).find((r) => String(r.saved.dsoeId).toUpperCase() === dsoe)?.saved : null;
}

// Air Schedule DSOE Lookup rows: DSOE ID, Chalk, Destination, Exercise/Mobility, Surface/Air.
export const deploymentDsoeRows = (store) => activeDeployments(store).map(({ saved }) => [
  String(saved.dsoeId).toUpperCase(), '', saved.pod || '', saved.deploymentExercise || '',
  AIR_MIL_MODES.includes(String(saved.milMode).toUpperCase()) ? 'A' : 'S',
]);

// Shipment Planning: entering a DSOE ID fills the blank fields from its parameters.
const PLANNING_FIELDS = [
  ['milMode', 'milMode'], ['ediMode', 'ediMode'], ['origin', 'origin'], ['destination', 'destination'],
  ['poe', 'poe'], ['pod', 'pod'], ['tac', 'tac'], ['adviceNumber', 'adviceNbr'], ['eta', 'eta'],
  ['projectCode', 'proj'], ['atcmdReq', 'atcmdType'], ['exportMode', 'expMode'],
];
export function planningDefaults(store, dsoeId, shipment = {}) {
  const params = deploymentFor(store, dsoeId);
  if (!params) return {};
  const patch = {};
  for (const [from, to] of PLANNING_FIELDS)
    if (String(params[from] || '').trim() && !String(shipment[to] || '').trim()) patch[to] = params[from];
  // EDI Mode always follows a MIL Mode filled from the parameters.
  if (patch.milMode) patch.ediMode = params.ediMode || ediForMilMode(patch.milMode);
  return patch;
}
