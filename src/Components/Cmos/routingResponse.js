import { totals } from './model';
import { formatScheduleDate } from './airScheduleLogic';

// GFM/ATR response for training: every carrier, contact and cost here is fictional and generated
// from the route order, so the same order always gets the same quotes.

// Reasons a lower-cost carrier was not used (RSN), transcribed from the CMOS dropdown.
export const RSN_CODES = [
  ['F1', 'SHIPMENT REFUSAL'], ['F2', 'IMPROPER OR INADEQUATE EQUIPMENT'], ['F3', 'TSP UNABLE TO MEET SERVICE REQUIREMENTS'],
  ['F4', 'FAILURE TO PICK UP AT ORIGIN AS SCHEDULED'], ['F5', 'TSP FAILED TO MEET DDD/RDD'], ['F6', 'TIME-IN-TRANSIT'],
  ['F7', 'FAILURE TO PROVIDE PROTECTIVE SERVICE'], ['F8', 'FAILURE TO PROVIDE SIGNATURE AND TALLY RECORD'], ['F9', 'MISHANDLING FREIGHT'],
  ['FA', 'LOSS OR DAMAGE'], ['FB', 'IMPROPER ROUTING'], ['FC', 'USE OF BAD LANGUAGE, OFFENSIVE BEHAVIOR'], ['FD', 'NONPAYMENT OF JUST DEBTS'],
  ['FE', 'FALSIFICATION OF A POWERTRACK DELIVERY'], ['FF', 'DOUBLE BROKERING'], ['FG', 'DRUG/ALCOHOL/FIREARM ABUSE'],
  ['FH', 'THEFT - TSP RESPONSIBLE'], ['FJ', 'SHORTAGE - TSP RESPONSIBLE'], ['FK', 'COMMITMENT WITHDRAWAL'],
  ['FL', 'UNAUTHORIZED LOAD/BROKER BOARD POSTING'], ['FM', 'SHIPMENT REFUSAL - SPOT BID'], ['FN', 'SHIPMENT REFUSAL - NEGOTIATION'],
  ['FP', 'OTHER SERVICE FAILURE'], ['FQ', 'FAILURE TO PICK UP AT ORIGIN ON SCHEDULED DATE'], ['FR', 'FAILURE TO PICK UP AT ORIGIN ON SCHEDULED TIME'],
  ['FS', 'FAILURE TO DELIVER AT DESTINATION ON SCHEDULED DATE'], ['FT', 'FAILURE TO DELIVER AT DESTINATION ON SCHEDULED TIME'],
  ['N1', 'EXCUSABLE REFUSAL'], ['N2', 'TSP UNREACHABLE'], ['N3', 'LOW COST NOT USED IN ORDER TO USE CARRIER ONSITE'],
  ['N4', 'TRAFFIC DISTRIBUTION'], ['N5', 'REQUIRED SMALL BUSINESS SELECTION'], ['N6', 'CONTRACT REQUIRES SPECIFIC REQUESTED MODE'],
  ['N7', 'LOWER COST TSP NOT USED DUE TO PAST PERFORMANCE: LOSS/DAMAGE'], ['N8', 'LOWER COST TSP NOT USED DUE TO PAST PERFORMANCE: TRANSIT TIME'],
  ['N9', 'LOWER COST TSP NOT USED DUE TO PAST PERFORMANCE: NO-SHOWS'], ['NA', 'LOWER COST TSP NOT USED DUE TO PAST PERFORMANCE: MECHANICAL FAILURES'],
  ['NB', 'LOWER COST TSP NOT USED DUE TO PAST PERFORMANCE: OTHER'], ['NC', 'CARRIER NOT USED DUE TO MULTI-EQUIPMENT REQUIREMENT'],
  ['ND', 'LOW COST CARRIER NOT USED DUE TO MISSION REQUIREMENTS/GOVT CONVENIENCE'],
];

const CARRIERS = [
  ['TRNA', 'Training Motor Freight Inc', 2, 2.49, 'PQ', 'Jordan Reyes'],
  ['TRNB', 'NORTHERN LIGHTS TRANSPORT', 3, 5.12, 'PZ', 'CASEY MORGAN'],
  ['TRNC', 'Arctic Haul LLC', 11, 18.66, 'PM', 'Riley Chen'],
  ['TRND', 'Fictional Express Lines', 12, 18.87, 'PM', 'AVERY BROOKS'],
  ['TRNE', 'SAMPLE CARRIER INC', 23, 36.9, 'PM', 'Taylor Nguyen'],
  ['TRNF', 'PRACTICE FREIGHT CO', 24, 37.27, 'PM', 'Morgan Ellis'],
  ['TRNG', 'Mock Logistics LLC', 25, 37.65, 'PM', 'Quinn Patel'],
];
const hash = (text) => { let h = 17; for (const ch of String(text)) h = (h * 31 + ch.charCodeAt(0)) % 1000003; return h; };
const pad = (n, size) => String(n).padStart(size, '0');

// The quotes for one equipment group, cheapest first.
export function carrierQuotes(store, draft, group, now = new Date()) {
  const weight = Math.max(1, Math.round(totals(store, group.members).weight || 0));
  const miles = 800 + (hash(`${draft.origin}-${draft.destination}`) % 2200);
  const day = 864e5;
  return CARRIERS.map(([scac, name, rank, factor, rateQual, contact], i) => {
    const lineCost = Math.round(weight * factor * (miles / 2847) * 100 + 4100 * (i + 1)) / 100;
    const svcCost = Math.round(lineCost * 0.327 * 100) / 100;
    const seed = hash(`${draft.shipmentId}-${scac}-${group.group}`);
    return {
      scac, name, rank: String(rank), phone: `555${pad(2000000 + (seed % 7999999), 7)}`,
      tender: `${scac}${pad(seed % 100000, 5)}00`, offerId: String(1342700000 + (seed % 99999)),
      effective: formatScheduleDate(new Date(now.getTime() - (90 + (seed % 300)) * day)).toUpperCase(),
      expires: formatScheduleDate(new Date(now.getTime() + (300 + (seed % 400)) * day)).toUpperCase(),
      lineHaulMiles: miles, ratedMiles: miles, actualWeight: weight, minWeight: i % 3 === 1 ? 1 : 0, maxWeight: [499, 4999, 0][i % 3],
      lineCost, svcCost, totalCost: Math.round((lineCost + svcCost) * 100) / 100,
      rateUsed: rateQual === 'PQ' ? (lineCost * 100 / weight).toFixed(2) : (lineCost / miles).toFixed(2), rateQual,
      ratedCommod: group.nmfc || '999913', maxDays: String(1 + (i % 3)), eqType: group.equipment[0] || 'AV1',
      nmfcUfc: `${group.nmfc || '999913'}-${group.nmfcSub || '0'}`, cumulativeWeight: 0, conveyancesAvail: 1,
      contact: { name: contact, phone: `555${pad(1000000 + (seed % 8999999), 7)}`, email: `dispatch@${scac.toLowerCase()}.example` },
      mode: group.milMode || draft.milMode || 'B',
    };
  }).sort((a, b) => a.totalCost - b.totalCost);
}

// Assigning a SCAC that is not the lowest cost needs a reason on every cheaper carrier passed over.
export function assignmentErrors(carriers, scac, reasons = {}) {
  const index = carriers.findIndex((c) => c.scac === scac);
  return carriers.slice(0, Math.max(0, index)).filter((c) => !reasons[c.scac])
    .map((c) => `Select a reason (RSN) for not using lower cost SCAC ${c.scac}.`);
}

export const REQUEST_STATUS_TEXT = { '00': 'NEW', RR: 'REQUEST SENT', CR: 'CARRIER RESPONSES RECEIVED', AW: 'AWARDED' };
