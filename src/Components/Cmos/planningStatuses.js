import { requiresNmfc } from './modeReference';
export const PLANNING_STATUS_GROUPS = [
  { label: 'Inchecked', statuses: [['PI', 'Planning And Packaging'], ['ST', 'Inchecked Into Surface Freight'], ['AT', 'Inchecked Into Air Freight']] },
  { label: 'Need Incheck', statuses: [['00', 'Advance Record Not Yet Inchecked'], ['PA', 'Waiting Incheck Into Air Freight'], ['PS', 'Waiting Incheck Into Surface Freight']] },
  { label: 'View Only', statuses: [['CT', 'TCN Has Been Assigned To History'], ['FC', 'Frustrated And Cancelled']] },
];
const labels = Object.fromEntries(PLANNING_STATUS_GROUPS.flatMap(group => group.statuses));
const codeOf = value => {
  const code = String(value || '').trim().toUpperCase().match(/^(00|PI|ST|AT|PA|PS|CT|FC)(?:$|[\s-])/)?.[1];
  return code && labels[code] ? code : null;
};
// Once an inchecked record is saved with every * field filled, CMOS moves it into air freight
// (AT) for military air modes, or surface freight (ST) for every surface or commercial mode
// (including 9 and commercial air such as J and Q); until then it stays in Planning (PI).
const REQUIRED = ['tcn', 'milMode', 'origin', 'nsn', 'ciic'];
export const AIR_MIL_MODES = ['F', 'O'];
export const freightStatus = saved => {
  const required = requiresNmfc(saved?.milMode) ? [...REQUIRED, 'nmfc'] : REQUIRED;
  if (!saved || required.some(field => !String(saved[field] ?? '').trim())) return 'PI';
  return AIR_MIL_MODES.includes(String(saved.milMode).trim().toUpperCase()) ? 'AT' : 'ST';
};
const recordedStatus = record => {
  for (const value of [record?.statusCode, record?.status, record?.draft?.statusCode, record?.draft?.status, record?.saved?.statusCode, record?.saved?.status]) {
    const code = codeOf(value);
    if (code) return code;
  }
  if (typeof record?.inchecked === 'boolean') return record.inchecked ? 'PI' : '00';
  // Older imported records did not retain an explicit incheck flag.
  return record?.saved || (record?.status && record.status !== 'Draft') ? 'PI' : '00';
};
// Operational CMOS codes are separate from record editing states such as Saved/Passed Edits.
export const planningStatus = record => {
  const code = recordedStatus(record);
  return ['PI', 'AT', 'ST'].includes(code) && record?.saved && !record.sample ? freightStatus(record.saved) : code;
};
export const planningStatusLabel = record => {
  const code = planningStatus(record);
  return `${code} - ${labels[code]}`;
};
export const isPlanningViewOnly = record => ['CT', 'FC'].includes(planningStatus(record));
export const incheckedStatus = code => ({ '00': 'PI', PA: 'AT', PS: 'ST' })[code];
export const incheckPlanningRecord = record => {
  const code = incheckedStatus(planningStatus(record));
  return code ? { ...record, statusCode: code, inchecked: true } : record;
};
