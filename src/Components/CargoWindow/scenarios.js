import { fuelFinding } from './discrepancies';
const source = (paragraph, page) => ({ paragraph, page, edition: '3 February 2023' });
export const DTR_URL = 'https://www.business.ustranscom.mil/dtr/part-iii/dtr_part_iii_app_o.pdf';

const common = [
  { id: 'documents', title: 'Shipment documents', observation: 'Review the LOGMOD paperwork and applicable shipment documents against this asset.', correct: 'satisfactory', explanation: 'The deploying force supplies the pre-load plan and manifest/load/packing list for inspection.', source: source('K.2.d(1)–(2)', 'III-O-7'), stage: 'pre-incheck' },
  { id: 'label', title: 'Military shipping label', observation: 'A legible Military Shipping Label is attached to the piece.', correct: 'satisfactory', explanation: 'All items presented for movement require a Military Shipping Label.', source: source('K.2.d(5)', 'III-O-7'), stage: 'pre-incheck' },
];

export const scenarios = [
  {
    id: 'rolling-stock', title: 'HMMWV', subtitle: 'HMMWV, M1151A1 utility truck',
    length: 197, width: 86, height: 74, weight: 9800,
    vehicleChecks: { positiveTaped:false, negativeTaped:true, fuelFraction:.375, fuelLimit:.25 },
    axles: [{ id: 'front-axle', title: 'Front axle', position: 33, weight: 5400 }, { id: 'rear-axle', title: 'Rear axle', position: 163, weight: 4400 }],
    findings: [...common,
      { id: 'battery', title: 'Battery protection', observation: 'The battery is secured, but its positive terminal is exposed.', correct: 'unsatisfactory', explanation: 'Battery terminals must be protected against damage or short circuits, and the battery must be secured.', correction: 'Install suitable terminal protection and verify the battery remains secured.', source: source('K.2.f(3)', 'III-O-8'), stage: 'qc-after-incheck' },
      { id: 'equipment', title: 'Vehicle equipment', observation: 'The spare tire and tool kit are secured to the vehicle.', correct: 'satisfactory', explanation: 'Vehicle accessories and loose equipment must be secured to prevent becoming projectiles.', source: source('K.2.f(8)', 'III-O-9'), stage: 'ji' },
      { id: 'tiedowns', title: 'Tie-down points', observation: 'The visible interior and exterior tie-down points are serviceable.', correct: 'satisfactory', explanation: 'Inspect interior and exterior restraint points and clevises for serviceability.', source: source('K.2.f(6)', 'III-O-9'), stage: 'ji' },
      { id: 'special-service', title: 'Special handling document', observation: 'This fictional shipment does not require protective, signature, or other special services.', correct: 'not-applicable', explanation: 'DD Form 1387-2 applies when the shipment requires the specified special services.', source: source('K.2.d(4)', 'III-O-7'), stage: 'ji' },
    ],
  },
  {
    id: 'isu-90', title: 'ISU-90', subtitle: 'ISU-90 container, mixed supplies',
    length: 108, width: 88, height: 90, weight: 4200,
    contents: [
      { id: 'secured-crates', title: 'Supply crates', description: 'Three general-supply crates are restrained to prevent shifting.' },
      { id: 'loose-case', title: 'Loose tool case', description: 'An unsecured tool case sits above the crates.' },
      { id: 'undeclared-hazmat', title: 'Marked chemical package', description: 'A secured package carries a hazardous-material label but is absent from the packing list and declaration.' },
    ],
    findings: [...common,
      { id: 'access', title: 'Container access', observation: 'The deploying representative provides the key. Doors can be opened for inspection.', correct: 'satisfactory', explanation: 'Keys or combinations must be available so the mobility force inspector can access locked items.', source: source('K.2.e(6)', 'III-O-8'), stage: 'qc-after-incheck' },
      { id: 'secured-crates', title: 'Supply crates', observation: 'The general-supply crates are restrained inside the container.', correct: 'satisfactory', explanation: 'Container contents must be secured against movement and damage during flight.', source: source('K.2.g(2)(c)', 'III-O-10'), stage: 'ji', interior: true },
      { id: 'loose-case', title: 'Loose tool case', observation: 'The tool case is unsecured inside the ISU.', correct: 'unsatisfactory', explanation: 'Cargo inside ISUs must be secured or restrained against movement.', correction: 'Restrain the tool case and verify it can no longer shift.', source: source('E; K.2.g(2)(c)', 'III-O-2 / III-O-10'), stage: 'ji', interior: true },
      { id: 'undeclared-hazmat', title: 'Marked chemical package', observation: 'A hazardous-material package is not declared in the shipment documents.', correct: 'unsatisfactory', explanation: 'Inspect all container contents for undeclared hazardous material. The shipper must declare and prepare it under the applicable hazardous-material rules.', correction: 'Hold the shipment for declaration and qualified HAZMAT review; simulate verification of corrected documentation and preparation.', source: source('K.1.a–c; K.2.d(3)', 'III-O-5 / III-O-7'), stage: 'ji', interior: true },
      { id: 'dunnage', title: 'ISU dunnage', observation: 'Three serviceable pieces of appropriate dunnage accompany the ISU.', correct: 'satisfactory', explanation: 'Three pieces of proper dunnage must accompany each pallet or ISU.', source: source('K.2.g(3)', 'III-O-10'), stage: 'ji' },
    ],
  },
  {
    id: '463l-pallet', title: 'Loaded 463L pallet', subtitle: 'Palletized general supplies',
    length: 108, width: 88, height: 72, weight: 4800,
    findings: [...common,
      { id: 'arrangement', title: 'Cargo arrangement', observation: 'Heavy crates are below lighter cartons and the load is stable.', correct: 'satisfactory', explanation: 'Arrange heavy cargo below lighter, fragile cargo and stack it stably.', source: source('J.16', 'III-O-4'), stage: 'qc-after-incheck' },
      { id: 'nets', title: 'Cargo nets', observation: 'A side net has a visible tear.', correct: 'unsatisfactory', explanation: 'Damaged cargo nets must not be used.', correction: 'Replace the damaged net and verify the replacement is properly installed.', source: source('K.2.g(1)(b)', 'III-O-10'), stage: 'ji' },
      { id: 'pallet-condition', title: 'Pallet and rings', observation: 'The pallet is clean and level, and its tie-down rings are intact.', correct: 'satisfactory', explanation: 'Inspect the pallet and rings for damage, warping, exposed core, and delamination.', source: source('K.2.g(1)', 'III-O-10'), stage: 'ji' },
      { id: 'dunnage', title: 'Pallet dunnage', observation: 'Only two pieces of dunnage accompany the pallet.', correct: 'unsatisfactory', explanation: 'Each pallet must be accompanied by three pieces of proper dunnage.', correction: 'Provide the missing third piece and verify all dunnage meets applicable requirements.', source: source('K.2.g(3)', 'III-O-10'), stage: 'ji' },
    ],
  },
];

// Base values approximate each item's published size and curb weight; resets vary them slightly.
const twoAxle = scenarios[0];
scenarios.push({
  ...twoAxle, id:'three-axle', title:'FMTV cargo truck', subtitle:'M1083A1P2 FMTV 6x6 cargo truck',
  length:285, width:96, height:113, weight:21000,
  axles:[
    {id:'front-axle',title:'Front axle',position:35,weight:9200},
    {id:'intermediate-axle',title:'Intermediate axle',position:172,weight:6000},
    {id:'rear-axle',title:'Rear axle',position:227,weight:5800},
  ],
  vehicleChecks:{positiveTaped:false,negativeTaped:true,fuelFraction:.25,fuelLimit:.25},
  findings:twoAxle.findings.map(finding => ({...finding})),
});
scenarios.push({
  ...twoAxle, id:'age-generator', kind:'generator', title:'Start cart (AGE)', subtitle:'A/M32A-60A start cart',
  length:150, width:66, height:62, exhaustHeight:6, weight:4100,
  axles:[{id:'front-axle',title:'Front axle',position:46,weight:2200},{id:'rear-axle',title:'Rear axle',position:124,weight:1900}],
  // The start cart is drained nearly empty: residual fuel is measured in millilitres, 500 mL or less.
  vehicleChecks:{positiveTaped:false,negativeTaped:true,fuelUnit:'mL',fuelFraction:3000,fuelLimit:500},
  findings:twoAxle.findings.map(finding=>finding.id === 'equipment' ? {...finding,title:'Generator accessories',observation:'The generator cables, covers, and tool kit are secured against movement.'} : {...finding}),
});
// MJ-1B munitions lift truck ("Jammer"): the forward boom and table put most weight on the front axle.
scenarios.push({
  ...twoAxle, id:'mj1-jammer', kind:'jammer', title:'Bomb lift truck (Jammer)', subtitle:'MJ-1B bomb lift truck',
  length:150, width:56, height:46, weight:6500,
  axles:[{id:'front-axle',title:'Front axle',position:30,weight:3800},{id:'rear-axle',title:'Rear axle',position:107,weight:2700}],
  vehicleChecks:{positiveTaped:false,negativeTaped:true,fuelFraction:.5,fuelLimit:.25},
  findings:twoAxle.findings.map(finding=>finding.id === 'equipment' ? {...finding,title:'Lift boom and table',observation:'The boom is fully lowered, the lift table is pinned in the travel position, and loose adapters are removed and secured.'} : {...finding}),
});
for (const scenario of scenarios.filter(item => item.vehicleChecks)) scenario.findings.push(fuelFinding(scenario.vehicleChecks));

// Applicability belongs to each fictional asset/load configuration. ATTLA is
// explicitly selected by scenario specifications, never inferred from its type.
for (const scenario of scenarios) {
  scenario.hasEngine = Boolean(scenario.axles);
  scenario.paperworkRequirements = {
    packing: scenario.id==='isu-90' || scenario.id==='463l-pallet',
    hazdec: scenario.id==='isu-90',
    attla: false,
  };
  // The starting ISU packet arrives one HAZDEC short; resets generate new packets.
  if (scenario.id==='isu-90') scenario.paperworkCopies = { hazdec: 2 };
}

// ATTLA Internal Air Transport Certification letters that travel with these items. Limits come
// from each letter: the HMMWV uses the M1151A1 row of its Table 2, the FMTV the M1083A1P2 GVWR and
// C-17/C-5 axle limit, and the ISU-90 its base footprint and gross weight. Vehicle letters list
// dimensions only as approximations, so only the ISU letter limits size. A qualifying measurement
// alone never creates a certification requirement.
const ATTLA_LETTERS = {
  'rolling-stock': { id:'2016.03.27 Rev 2', doc:'hmmwv', configurationId:'M1151A1', current:true, maxWeight:12100, maxAxle:[5750,7000],
    disposition:'HMMWVs are certified under ATTLA file 2016.03.27 Rev 2. The shipper provides a copy; check the M1151A1 row of Table 2 (12,100 lb, front axle 5,750 lb, rear 7,000 lb).' },
  'isu-90': { id:'99.05.14 Rev 1', doc:'isu', configurationId:'ISU-90', current:true, maxWeight:12000, maxLength:108, maxWidth:88, maxHeight:90,
    disposition:'AAR 56000 series ISUs are certified under ATTLA file 99.05.14 Rev 1. The shipper provides a copy; gross weight may not exceed 12,000 lb or the data plate.' },
  'three-axle': { id:'2008.01.13 Rev 6', doc:'fmtv', configurationId:'M1083A1P2', current:true, maxWeight:44952, maxAxle:[19000,19000,19000],
    disposition:'FMTV A1P2 trucks are certified under ATTLA file 2008.01.13 Rev 6. The shipper provides a copy; check the M1083A1P2 GVWR (44,952 lb) and the 19,000 lb C-17/C-5 axle limit without sleeper shoring.' },
};
for (const scenario of scenarios) {
  scenario.loadConfiguration = scenario.id==='isu-90' ? 'sealed-container' : scenario.id==='463l-pallet' ? 'consolidated' : 'single-equipment';
  if(scenario.axles) scenario.axles=scenario.axles.map(axle=>({...axle,wheels:2,contactAreaPerWheel:140}));
  const { disposition, ...letter } = ATTLA_LETTERS[scenario.id] || {};
  scenario.attla={
    configurationId:letter.configurationId || `${scenario.id}-training`,
    certificationRequired:Boolean(letter.id),
    reviewDisposition:disposition || 'Scenario aircraft/loading review does not require a separate letter for this configuration.',
    ...(letter.id ? {letter} : {}),
  };
}
