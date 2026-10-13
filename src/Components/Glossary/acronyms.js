// Acronyms and codes shown in the trainer, with what each stands for.
export const GLOSSARY = {
  AB: 'Air Base',
  AF: 'Air Force',
  AFB: 'Air Force Base',
  AGE: 'Aerospace Ground Equipment',
  AMC: 'Air Mobility Command',
  APOD: 'Aerial Port of Debarkation — the airport where cargo is offloaded',
  APOE: 'Aerial Port of Embarkation — the airport where cargo is loaded',
  APS: 'Aerial Port Squadron',
  ATTLA: 'Air Transportability Test Loading Activity — certifies items for airlift',
  CB: 'Center of Balance — the point where the item balances, measured aft of the RDL',
  CDF: 'Cargo Deployment Function',
  CIIC: 'Controlled Inventory Item Code',
  CMOS: 'Cargo Movement Operations System',
  DD: 'Department of Defense (as in DD Form)',
  DG2: 'Dangerous goods details for a hazardous piece',
  DIC: 'Document Identifier Code',
  DoD: 'Department of Defense',
  DoDAAC: 'Department of Defense Activity Address Code — identifies a shipping or receiving unit',
  DSOE: 'Deployment Schedule of Events',
  DTR: 'Defense Transportation Regulation',
  FAW: 'Front Axle Weight',
  FMS: 'Foreign Military Sales',
  FMTV: 'Family of Medium Tactical Vehicles',
  GWT: 'Gross Weight',
  GATES: 'Global Air Transportation Execution System — AMC system that processes and tracks air cargo and passengers',
  HAZ: 'Hazardous',
  HAZDEC: "Hazardous Declaration — the Shipper's Declaration for Dangerous Goods",
  HAZMAT: 'Hazardous Material',
  HMMWV: 'High Mobility Multipurpose Wheeled Vehicle (Humvee)',
  IAW: 'In Accordance With; on axle weight worksheets, Intermediate Axle Weight',
  IMT: 'Information Management Tool (an Air Force form)',
  ISU: 'Internal Slingable Unit — an air-cargo container on a 463L-compatible base',
  'ISU-90': 'Internal Slingable Unit, 90 inches tall',
  JBER: 'Joint Base Elmendorf-Richardson, Alaska',
  JBPHH: 'Joint Base Pearl Harbor-Hickam, Hawaii',
  JI: 'Joint Inspection — a trained joint inspector and the owning unit\'s representative inspect deploying cargo before aircraft loading (DAFI 10-403 para 3.10.3.6), recorded on DD Form 2133',
  LOGMOD: 'Logistics Module — the web-based program that maintains deploying UTC equipment and personnel data and schedules movement (DAFI 10-403 para 2.2.3)',
  LRS: 'Logistics Readiness Squadron',
  'MJ-1B': 'Munitions lift truck ("Jammer") used to load bombs and missiles',
  MSL: 'Military Shipping Label',
  NSN: 'National Stock Number',
  OD: 'Olive Drab',
  POD: 'Port of Debarkation',
  POE: 'Port of Embarkation',
  PSI: 'Pounds per Square Inch',
  RAW: 'Rear Axle Weight',
  RDD: 'Required Delivery Date',
  RDL: 'Reference Datum Line — the zero point that axle and CB distances are measured from',
  TAC: 'Transportation Account Code',
  TCMD: 'Transportation Control and Movement Document',
  TCN: 'Transportation Control Number — the 17-character shipment identifier',
  TMO: 'Traffic Management Office',
  TP: 'Transportation Priority',
  ULN: 'Unit Line Number',
  UN: 'United Nations (UN numbers identify hazardous materials)',
  'UN/ID': 'United Nations / Identification number for a hazardous material',
  USAF: 'United States Air Force',
  UTC: 'Unit Type Code',
  // Aerial port codes.
  CHS: 'Charleston AFB, South Carolina (aerial port code)',
  DNA: 'Kadena AB, Japan (aerial port code)',
  DOV: 'Dover AFB, Delaware (aerial port code)',
  EDF: 'Elmendorf Field, JBER, Alaska (aerial port code)',
  HIK: 'Hickam Field, JBPHH, Hawaii (aerial port code)',
  KUZ: 'Kunsan AB, Korea (aerial port code)',
  MHZ: 'RAF Mildenhall, United Kingdom (aerial port code)',
  MSJ: 'Misawa AB, Japan (aerial port code)',
  OKO: 'Yokota AB, Japan (aerial port code)',
  OSN: 'Osan AB, Korea (aerial port code)',
  RMS: 'Ramstein AB, Germany (aerial port code)',
  SUU: 'Travis AFB, California (aerial port code)',
  TCM: 'McChord Field, Joint Base Lewis-McChord, Washington (aerial port code)',
  UAM: 'Andersen AFB, Guam (aerial port code)',
};

const TOKEN = /[A-Za-z0-9][A-Za-z0-9/-]*[A-Za-z0-9]|[A-Za-z]/g;

// The glossary term for a word, allowing a plural "s" (DoDAACs).
export function lookup(word) {
  if (Object.hasOwn(GLOSSARY, word)) return word;
  if (word.endsWith('s') && Object.hasOwn(GLOSSARY, word.slice(0, -1))) return word.slice(0, -1);
  return undefined;
}

// Every glossary term in a string, with its character range.
export function findAcronyms(text) {
  const found = [];
  for (const match of text.matchAll(TOKEN)) {
    const term = lookup(match[0]);
    if (term) { found.push({ term, start: match.index, end: match.index + match[0].length }); continue; }
    // Paired words such as "Consignor/POE" or "ISU-type": check each part on its own.
    for (const part of match[0].matchAll(/[A-Za-z0-9]+/g)) {
      const partTerm = lookup(part[0]);
      if (partTerm) found.push({ term: partTerm, start: match.index + part.index, end: match.index + part.index + part[0].length });
    }
  }
  return found;
}

// The glossary term covering a character offset, if any.
export const acronymAt = (text, offset) => findAcronyms(text).find(item => offset >= item.start && offset <= item.end);
