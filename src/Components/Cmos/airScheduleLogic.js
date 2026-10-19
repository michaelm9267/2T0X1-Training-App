import { DODAAC_INFO } from '../CargoWindow/workflow';
import { TABLE_APODS } from '../Outbound/dodaacs';

// CMOS Common In/Out → Air Schedule: the missions (aircraft) that deployment cargo is manifested
// onto. A mission is built here first; the Air Manifest then picks it up by mission number.

// AC Type Lookup, transcribed from the CMOS reference screens (Series, Description,
// Conveyance Seq, Military/Commercial).
export const AC_TYPES = [
  ['005A', 'C5A', '', 'M'], ['005B', 'C5B', '', 'M'], ['0060', 'DC-6', '', 'C'], ['0080', 'DC-8', '', 'C'],
  ['0090', 'C9', '', 'M'], ['009D', 'DC-9', '', 'C'], ['010D', 'DC-10', '', 'C'], ['010K', 'KC10', '', 'M'],
  ['0120', 'C12', '', 'M'], ['0170', 'C17', '', 'M'], ['0180', 'UV188', '', 'M'], ['0210', 'C21', '', 'M'],
  ['0230', 'C23', '', 'M'], ['0270', 'C27', '', 'M'], ['0390', 'T39', '', 'M'], ['0430', 'T43', '', 'M'],
  ['0999', 'OTHER', '', 'M'], ['1011', 'L1011', '', 'C'], ['1300', 'C130', '', 'M'], ['1350', 'KC135', '', 'M'],
  ['1370', 'C137', '', 'M'], ['1400', 'C140', '', 'M'], ['141B', 'C141B', '', 'M'], ['1880', 'L1880', '', 'C'],
  ['7070', 'B707', '', 'C'], ['7270', 'B727', '', 'C'], ['7370', 'B737', '', 'C'], ['7470', 'B747', '', 'C'],
  ['7570', 'B757', '', 'C'], ['7670', 'B767', '', 'C'], ['9990', 'OTHER', '', 'M'], ['COML', 'OTHER', '', 'C'],
  ['L100', 'L100', '', 'C'], ['MD11', 'MD11', '', ''],
];

// APOD Terminals Lookup: the aerial ports this app's deployments use and every APOD in the DoDAAC table
// (Terminal Name, Terminal, Type, TRDM).
const TERMINAL_NAMES = {
  EDF: 'ELMENDORF AFB (JBER)', OSN: 'OSAN AB', KUZ: 'KUNSAN AB', DNA: 'KADENA AB', OKO: 'YOKOTA AB',
  MSJ: 'MISAWA AB', UAM: 'ANDERSEN AFB', HIK: 'HICKAM AFB (JBPHH)', RMS: 'RAMSTEIN AB', MHZ: 'RAF MILDENHALL',
  DOV: 'DOVER AFB', CHS: 'CHARLESTON AFB', SUU: 'TRAVIS AFB', TCM: 'MCCHORD FLD (JBLM)',
  // APODs from the CMOS DoDAAC table.
  '3OR': 'AL ASAD AB', ADA: 'INCIRLIK AB', AJY: 'AGADEZ AB 201', AKH: 'PRINCE SULTAN AB', AKT: 'RAF AKROTIRI', AVB: 'AVIANO AB',
  AZ3: 'FAIRBANKS', CTS: 'CHITOSE AB', DHF: 'AL DHAFRA AB', DLG: 'DILLINGHAM', EIL: 'EIELSON AFB', HC1: 'BALEDOGLE',
  IGL: 'CIGLI AB', IUD: 'AL UDEID AB', KEZ: 'ALI AL SALEM AB', KTM: 'TRIBHUVAN INTL', KWI: 'KUWAIT INTL', LGS: 'LAJES FIELD',
  NIM: 'NIAMEY AB', NKW: 'DIEGO GARCIA', O1R: 'APO AE 09357', PLA: 'SOTO CANO AB', RTA: 'NAVSTA ROTA', SJU: 'SAN JUAN',
  SQX: 'MUWAFFAQ SALTI AB', VDA: 'OVDA AB',
};
export const TERMINALS = [...new Set([...Object.values(DODAAC_INFO).map((info) => info.port), ...TABLE_APODS].filter(Boolean))]
  .map((port) => [TERMINAL_NAMES[port] || port, port, 'A', 'Y'])
  .sort((a, b) => a[0].localeCompare(b[0]));

export const IO_OPTIONS = ['O', 'I'];
// Search: direction (I/O) and mission state (open or closed).
export const DIRECTIONS = [['I', 'Inbound'], ['O', 'Outbound']];
export const MISSION_STATUSES = [['O', 'OPEN'], ['C', 'CLOSED']];

// DSOE Lookup (DSOE ID, Chalk, Destination, Exercise/Mobility, Surface/Air), transcribed from the
// CMOS reference screen. The exercise's own DSOE is added in front by the course.
export const DSOE_REFERENCE = [
  ['15804', '', '', 'D', ''], ['31112', '', '', 'D', ''], ['36012', '', '', 'D', ''], ['44488', '', '', 'D', ''],
  ['44489', '', '', 'D', ''], ['65075', '', '', 'D', ''], ['CCATT', '001', '', 'D', 'A'], ['IND26', '001', '', 'D', 'A'],
  ['KCE26', '002', '', 'D', 'A'], ['SDP26', '001', '', 'D', 'A'], ['SUM26', '001', 'HIK', 'D', 'A'], ['TRN26', '001', '', 'D', 'A'],
  ['TT261', '001', '', 'D', 'A'], ['TT261', '002', '', 'D', 'A'], ['TT261', '003', '', 'D', 'A'],
];
export const dsoeRows = (exerciseDsoes = []) => [
  ...exerciseDsoes,
  ...DSOE_REFERENCE.filter((row) => !exerciseDsoes.some((own) => own[0] === row[0] && own[1] === row[1])),
].sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]));
export const ROUTING_SLOTS = 5;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = (n, size = 2) => String(n).padStart(size, '0');
// CMOS writes dates as ddMmmyyyy (18Oct2026) and date/times as ddMmmyyyy/HHmm (18Oct2026/1245).
export const formatScheduleDate = (date) => `${pad(date.getDate())}${MONTHS[date.getMonth()]}${date.getFullYear()}`;
export const formatScheduleDateTime = (date) => `${formatScheduleDate(date)}/${pad(date.getHours())}${pad(date.getMinutes())}`;
export function parseScheduleDate(text) {
  const match = /^(\d{2})([A-Za-z]{3})(\d{4})(?:\/(\d{2})(\d{2}))?$/.exec(String(text || '').trim());
  if (!match) return null;
  const month = MONTHS.findIndex((m) => m.toUpperCase() === match[2].toUpperCase());
  const [day, year, hour = 0, minute = 0] = [match[1], match[3], match[4], match[5]].map((v) => (v === undefined ? undefined : Number(v)));
  if (month < 0 || hour > 23 || minute > 59) return null;
  const date = new Date(year, month, day, hour || 0, minute || 0);
  return date.getDate() === day ? date : null;
}
export const validDateTime = (text) => /\/\d{4}$/.test(String(text || '').trim()) && Boolean(parseScheduleDate(text));

export const emptyMission = () => ({
  ioInd: 'O', missionNumber: '', flightNbr: '', dsoeId: '', chalk: '', carrier: '00AMC', acType: '', tailNbr: '',
  allowableCabinLoad: '', departedPr: '', spot: '', seats: '', scheduledArrival: '', actualArrival: '',
  scheduledDeparture: '', actualDeparture: '', remarks: '', routings: Array(ROUTING_SLOTS).fill(''), statusCode: 'O',
});

// What Save refuses: blank required (*) fields and badly formed entries.
export function missionErrors(draft, missions = {}, id = null) {
  const errors = [];
  if (!String(draft.ioInd || '').trim()) errors.push('I/O Ind is required.');
  const number = String(draft.missionNumber || '').trim().toUpperCase();
  if (!number) errors.push('Mission Number is required.');
  else if (Object.values(missions).some((m) => m.id !== id && String(m.draft.missionNumber || '').toUpperCase() === number))
    errors.push(`Mission ${number} already exists.`);
  const chalk = String(draft.chalk || '').trim();
  if (chalk && (!/^\d{3}$/.test(chalk) || chalk === '000')) errors.push('Chalk must be 001 - 999.');
  for (const [field, label] of [['scheduledArrival', 'Scheduled Arrival'], ['actualArrival', 'Actual Arrival'], ['scheduledDeparture', 'Scheduled Departure']])
    if (String(draft[field] || '').trim() && !validDateTime(draft[field])) errors.push(`${label} must be ddmmmyyyy/HHmm.`);
  for (const [field, label] of [['allowableCabinLoad', 'Allowable Cabin Load'], ['seats', 'Seats']])
    if (String(draft[field] || '').trim() && !/^\d+$/.test(String(draft[field]).trim())) errors.push(`${label} must be a number.`);
  return errors;
}

// Fictional open missions so the schedule is not empty; they can be viewed but not changed.
export const AIR_SCHEDULE_SAMPLES = [
  'TRN4DNU0204', 'TRN64FS6322', 'TRN8EN93060', 'TRNAJZ1530', 'TRNAJZ1540', 'TRNBJX0110', 'TRNBKR1084',
  'TRNCEN0441', 'TRNCHA0001', 'TRNCHI0001', 'TRNCJZ0551', 'TRNDC09812', 'TRNJAM1314', 'TRNJAM1357',
  'TRNJAM1370', 'TRNJAM1390', 'TRNJSD0001', 'TRNJSD1319', 'TRNJJZ2674', 'TRNJJZ3350', 'TRNJMZ1150',
  'TRNJMZ1522', 'TRNLAM1320', 'TRNLAM1346',
].map((missionNumber, i) => ({
  id: `sample-mission-${i + 1}`,
  sample: true,
  status: 'Saved',
  draft: {
    ...emptyMission(),
    missionNumber,
    ...(i === 10 ? { dsoeId: 'TRN26', chalk: '002', scheduledDeparture: '18May2026/1245', acType: '0170' } : {}),
    ...(i === 18 ? { dsoeId: 'TRN27', chalk: '001', scheduledDeparture: '05Aug2026/2020', acType: '0170' } : {}),
  },
}));

// On Air Manifest release the mission records its actual departure.
export function departMission(missions = {}, missionNumber, departureAt) {
  const number = String(missionNumber || '').trim().toUpperCase();
  const entry = Object.values(missions).find((m) => String(m.draft.missionNumber || '').toUpperCase() === number);
  if (!number || !entry || !departureAt) return missions;
  const draft = { ...entry.draft, actualDeparture: departureAt };
  return { ...missions, [entry.id]: { ...entry, draft, saved: entry.saved ? { ...entry.saved, actualDeparture: departureAt } : entry.saved } };
}

// Missions the Air Manifest Mission lookup offers: saved, open schedule missions.
export const manifestMissions = (store) => Object.values(store.missions || {})
  .filter((m) => m.saved && (m.saved.statusCode || 'O') === 'O')
  .map((m) => m.saved);
