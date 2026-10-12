// Discrepancies a piece can present. Each reset decides which ones are present, so trainees must
// inspect rather than remember; sometimes nothing is wrong. An instructor can force any of them.
// Inspection findings switch between a sound and a faulty observation; document errors change
// what the paperwork packet shows until the trainee frustrates the piece and gets them corrected.
export const FAULT_CHANCE = .35;
export const DOCUMENT_ERROR_CHANCE = .2;

const noun = scenario => scenario.id === 'isu-90' ? 'ISU' : 'pallet';
const FINDING_TEXT = {
  battery: { sound: () => 'Both battery terminals are covered and the battery is secured.', faulty: () => 'The battery is secured, but its positive terminal is exposed.', correction: 'Install suitable terminal protection and verify the battery remains secured.' },
  equipment: { faulty: () => 'Loose accessories and the tool kit are not secured and could shift in flight.', correction: 'Secure all loose equipment and accessories, then reinspect.' },
  tiedowns: { faulty: () => 'A rear tie-down point is cracked and its clevis pin is missing.', correction: 'Repair or replace the damaged tie-down provision, then reinspect.' },
  access: { faulty: () => 'The container is padlocked and the deploying representative has no key or combination.', correction: 'Have the unit provide the key or combination, open the doors, and inspect the contents.' },
  'secured-crates': { faulty: () => 'The general-supply crates are not strapped and slide when pushed.', correction: 'Restrain the crates with straps and verify they no longer shift.' },
  'loose-case': { sound: () => 'The tool case is strapped down above the crates.' },
  'undeclared-hazmat': { sound: () => 'Every hazard-labeled package inside matches the packing list and HAZDEC.' },
  dunnage: { sound: s => `Three serviceable pieces of appropriate dunnage accompany the ${noun(s)}.`, faulty: s => `Only two pieces of dunnage accompany the ${noun(s)}.`, correction: 'Provide the missing third piece and verify all dunnage meets applicable requirements.' },
  nets: { sound: () => 'The side and top nets are serviceable and properly attached to the pallet rings.' },
  'pallet-condition': { faulty: () => 'One pallet edge rail is bent and a tie-down ring is cracked.', correction: 'Replace the pallet with a serviceable one, rebuild the load, and reinspect.' },
};
const CONTENTS_TEXT = {
  'loose-case': { sound: 'A tool case is strapped down above the crates.', faulty: 'An unsecured tool case sits above the crates.' },
  'secured-crates': { sound: 'Three general-supply crates are restrained to prevent shifting.', faulty: 'Three general-supply crates sit unstrapped on the floor.' },
  'undeclared-hazmat': { sound: 'A hazard-labeled aerosol crate is listed on the packing list and HAZDEC.', faulty: 'A secured package carries a hazardous-material label but is absent from the packing list and declaration.' },
};
// Transposed UN numbers used for the HAZDEC "wrong UN number" error.
export const WRONG_UN = { UN1950: 'UN1905', UN3166: 'UN3616', UN3528: 'UN3258' };
export const FUEL_LEVELS = [.125, .25, .375, .5, .75];

export function fuelFinding(checks) {
  const satisfactory = checks.fuelFraction <= checks.fuelLimit;
  return {
    id: 'fuel', title: 'Fuel level', stage: 'qc-after-incheck', correct: satisfactory ? 'satisfactory' : 'unsatisfactory',
    observation: `The fuel gauge reads ${checks.fuelFraction * 100}% full. This scenario requires no more than 25% (¼ tank).`,
    explanation: 'Compare the gauge with the ¼-tank training target. This is a scenario requirement, not a universal DTR limit; Appendix O specifies equipment- and movement-dependent fuel requirements.',
    correction: 'Simulate draining to ¼ tank, reread the fuel gauge, then confirm correction.',
    source: { paragraph: 'K.2.f(4) · scenario target: ¼ tank', page: 'III-O-8', edition: '3 February 2023' },
  };
}

// Every discrepancy that can be chosen for this equipment, as [id, label] pairs.
export function possibleDiscrepancies(template) {
  const findings = template.findings.filter(f => FINDING_TEXT[f.id] || f.id === 'fuel').map(f => [f.id, f.title]);
  return [
    ...findings,
    ['doc-logmod', 'LOGMOD weight differs from the scale'],
    ...(template.attla?.letter ? [['doc-attla', 'Wrong ATTLA letter in the packet']] : []),
    ...(template.hasEngine || template.paperworkRequirements?.hazdec ? [['doc-hazdec', 'HAZDEC error (UN number or signature)']] : []),
  ];
}

// Decides which discrepancies are present. forced maps a discrepancy id to true (present) or
// false (absent); anything not forced is random.
export function applyDiscrepancies(template, random = Math.random, forced = {}) {
  const pick = (id, chance) => id in forced ? Boolean(forced[id]) : random() < chance;
  const faulty = {};
  let vehicleChecks = template.vehicleChecks && { ...template.vehicleChecks };
  if (vehicleChecks) {
    faulty.battery = pick('battery', FAULT_CHANCE);
    vehicleChecks.positiveTaped = !faulty.battery;
    faulty.fuel = pick('fuel', FAULT_CHANCE);
    const levels = FUEL_LEVELS.filter(level => faulty.fuel ? level > vehicleChecks.fuelLimit : level <= vehicleChecks.fuelLimit);
    vehicleChecks.fuelFraction = levels[Math.floor(random() * levels.length) % levels.length];
  }
  const findings = template.findings.map(finding => {
    if (finding.id === 'fuel' && vehicleChecks) return fuelFinding(vehicleChecks);
    const text = FINDING_TEXT[finding.id];
    if (!text) return finding;
    const bad = finding.id in faulty ? faulty[finding.id] : (faulty[finding.id] = pick(finding.id, FAULT_CHANCE));
    const baseBad = finding.correct === 'unsatisfactory';
    const observation = bad ? (baseBad ? finding.observation : text.faulty(template)) : (baseBad ? text.sound(template) : finding.observation);
    return { ...finding, correct: bad ? 'unsatisfactory' : 'satisfactory', observation, correction: bad ? (finding.correction || text.correction) : undefined };
  });
  const contents = template.contents?.map(item => CONTENTS_TEXT[item.id] ? { ...item, description: faulty[item.id] ? CONTENTS_TEXT[item.id].faulty : CONTENTS_TEXT[item.id].sound } : item);
  const hazdecRequired = template.hasEngine || template.paperworkRequirements?.hazdec;
  const docErrors = {
    logmodWeight: pick('doc-logmod', DOCUMENT_ERROR_CHANCE) ? (random() < .5 ? -1 : 1) * 50 * (2 + Math.floor(random() * 8)) : 0,
    attla: Boolean(template.attla?.letter) && pick('doc-attla', DOCUMENT_ERROR_CHANCE),
    hazdec: hazdecRequired && pick('doc-hazdec', DOCUMENT_ERROR_CHANCE) ? (random() < .5 ? 'signature' : 'un') : null,
  };
  return { findings, vehicleChecks, ...(contents ? { contents } : {}), docErrors };
}

// The letter mistakenly placed in a packet: another item's certification.
const OTHER_LETTER = { hmmwv: { doc: 'fmtv', id: '2008.01.13 Rev 6', configurationId: 'M1083A1P2' }, fmtv: { doc: 'hmmwv', id: '2016.03.27 Rev 2', configurationId: 'M1151A1' }, isu: { doc: 'hmmwv', id: '2016.03.27 Rev 2', configurationId: 'M1151A1' } };

// The piece as the trainee sees it: document errors stay in place until corrected.
export function withDocumentErrors(scenario, exercise = {}) {
  const errors = scenario.docErrors;
  if (!errors) return scenario;
  const fixed = exercise.docFixes || {};
  let next = scenario;
  if (errors.logmodWeight && !fixed.logmod) next = { ...next, paperworkWeight: next.weight + errors.logmodWeight };
  if (errors.attla && !fixed.attla && next.attla?.letter) next = { ...next, attla: { ...next.attla, letter: { ...next.attla.letter, ...OTHER_LETTER[next.attla.letter.doc] } } };
  if (errors.hazdec && !fixed.hazdec) next = { ...next, hazdecError: errors.hazdec };
  return next;
}

// Discrepancies actually present on this piece, for scoring and the after-action report.
export function activeDiscrepancies(scenario) {
  return [
    ...scenario.findings.filter(f => f.correct === 'unsatisfactory').map(f => ({ id: f.id, kind: 'finding', title: f.title, reference: `DTR Part III App O ${f.source?.paragraph || ''}`.trim() })),
    ...(scenario.docErrors?.logmodWeight ? [{ id: 'doc-logmod', kind: 'document', reason: 'mismatch', title: `LOGMOD weight off by ${Math.abs(scenario.docErrors.logmodWeight)} lb`, reference: 'DTR Part III App O K.2.d(1)–(2)' }] : []),
    ...(scenario.docErrors?.attla ? [{ id: 'doc-attla', kind: 'document', reason: 'attla', title: 'Wrong ATTLA certification letter in the packet', reference: 'DAFI 24-605V2; ATTLA letter distribution' }] : []),
    ...(scenario.docErrors?.hazdec ? [{ id: 'doc-hazdec', kind: 'document', reason: 'hazdec', title: scenario.docErrors.hazdec === 'un' ? 'HAZDEC UN number does not match the proper shipping name' : 'HAZDEC is not signed', reference: 'AFMAN 24-604 / TM 38-250' }] : []),
  ];
}
