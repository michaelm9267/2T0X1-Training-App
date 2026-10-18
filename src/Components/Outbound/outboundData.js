import { JBER_CONSIGNOR, JBER_CITY_LINE } from '../jberConsignor';
import { LOWER_48_DODAACS, OCONUS_DODAACS, ALASKA_DODAACS } from './dodaacs';

// Training catalog for the Outbound (Traffic Management) trainer. NSNs, part numbers and TACs are
// fictional training values in the real formats; consignee DoDAACs come from the CMOS DoDAAC table
// in dodaacs.js.

// nmfc is the NMFC item number printed in block 6 of the 1348-1A; ciic is the Controlled
// Inventory Item Code, printed as the PS (physical security) code in block 9. U = unclassified,
// no special controls. Both are training values.
// Each item says how it is identified, what it weighs, and how it must be packed. Quantity-based
// items (hardware boxes, circuit cards) are drawn one per unit so the trainee can count them.
export const ITEMS = {
  'circuit-card': {
    kind: 'circuit-card', nmfc: '061700', ciic: 'U', nomenclature: 'CIRCUIT CARD ASSEMBLY', fsc: '5998', partNumber: '7024311-04', ui: 'EA', unitWeight: 1.5, unitPrice: 2840,
    esd: true, quantity: [1, 4], category: 'Electronics',
    description: 'Printed circuit card with surface-mount chips and a gold edge connector. Electrostatic discharge sensitive (ESDS).',
  },
  'display-unit': {
    kind: 'display-unit', nmfc: '061700', ciic: 'U', nomenclature: 'DISPLAY UNIT, MULTIFUNCTION', fsc: '6610', partNumber: 'MFD-2210-3', ui: 'EA', unitWeight: 18, unitPrice: 41200,
    esd: true, quantity: [1, 1], category: 'Avionics',
    description: 'Cockpit multifunction display line-replaceable unit. Bezel keys, rear connectors. ESDS.',
  },
  actuator: {
    kind: 'actuator', nmfc: '004745', ciic: 'U', nomenclature: 'ACTUATOR, HYDRAULIC, LINEAR', fsc: '1650', partNumber: '6M3410-7', ui: 'EA', unitWeight: 32, unitPrice: 9650,
    quantity: [1, 1], category: 'Aircraft parts',
    description: 'Flight-control hydraulic actuator with rod-end clevis and capped hydraulic ports.',
  },
  starter: {
    kind: 'starter', nmfc: '004745', ciic: 'U', nomenclature: 'STARTER, ENGINE, AIR TURBINE', fsc: '2995', partNumber: '3505872-12', ui: 'EA', unitWeight: 62, unitPrice: 27400,
    quantity: [1, 1], category: 'Aircraft parts',
    description: 'Air turbine engine starter with mounting flange, inlet duct and splined output shaft.',
  },
  brake: {
    kind: 'brake', nmfc: '004745', ciic: 'U', nomenclature: 'BRAKE ASSEMBLY, AIRCRAFT', fsc: '1630', partNumber: '2-1675-3', ui: 'EA', unitWeight: 245, unitPrice: 38900,
    quantity: [1, 1], category: 'Aircraft parts',
    description: 'Main landing gear carbon brake: heat stack, piston housing and torque tube.',
  },
  gearbox: {
    kind: 'gearbox', nmfc: '004745', ciic: 'U', nomenclature: 'GEARBOX, ACCESSORY DRIVE', fsc: '3010', partNumber: 'AGB-7731-2', ui: 'EA', unitWeight: 330, unitPrice: 61800,
    quantity: [1, 1], category: 'Aircraft parts',
    description: 'Engine accessory drive gearbox: cast housing, drive pads and capped oil ports. Over 300 lb.',
  },
  panel: {
    kind: 'panel', nmfc: '004745', ciic: 'U', nomenclature: 'PANEL, ACCESS, AIRCRAFT', fsc: '1560', partNumber: '17B4521-9', ui: 'EA', unitWeight: 34, unitPrice: 6120,
    quantity: [1, 1], category: 'Aircraft parts',
    description: 'Long composite fuselage access panel with fastener holes along the edges. Light but oversize.',
  },
  radio: {
    kind: 'radio', nmfc: '061700', ciic: 'U', nomenclature: 'RECEIVER-TRANSMITTER, RADIO', fsc: '5821', partNumber: 'RT-1796/ARC', ui: 'EA', unitWeight: 22, unitPrice: 18750,
    esd: true, quantity: [1, 1], category: 'Avionics',
    description: 'Rack-mounted UHF/VHF radio receiver-transmitter with front-panel connectors. ESDS.',
  },
  harness: {
    kind: 'harness', nmfc: '061700', ciic: 'U', nomenclature: 'WIRING HARNESS, BRANCHED', fsc: '6150', partNumber: '65B90412-21', ui: 'EA', unitWeight: 9, unitPrice: 3480,
    quantity: [1, 1], category: 'Electrical',
    description: 'Coiled, branched wiring harness with capped circular connectors and identification sleeves.',
  },
  'seal-kit': {
    kind: 'seal-kit', nmfc: '004745', ciic: 'U', nomenclature: 'PARTS KIT, SEAL REPLACEMENT', fsc: '5330', partNumber: 'K-2210-14', ui: 'KT', unitWeight: .5, unitPrice: 126,
    quantity: [1, 6], category: 'Seals and gaskets',
    description: 'Sealed plastic bags of O-rings and packing seals, one kit per bag. Light and non-fragile.',
  },
  filter: {
    kind: 'filter', nmfc: '004745', ciic: 'U', nomenclature: 'FILTER ELEMENT, FLUID PRESSURE', fsc: '4330', partNumber: 'AC-8012-3', ui: 'EA', unitWeight: 2, unitPrice: 312,
    quantity: [2, 12], category: 'Aircraft parts',
    description: 'Pleated hydraulic filter elements, each in its own carton.',
  },
  valve: {
    kind: 'valve', nmfc: '004745', ciic: 'U', nomenclature: 'VALVE, BLEED AIR, SHUTOFF', fsc: '4820', partNumber: '3214552-6', ui: 'EA', unitWeight: 18, unitPrice: 14300,
    quantity: [1, 1], category: 'Aircraft parts',
    description: 'Butterfly bleed-air shutoff valve with electrical actuator and capped duct flanges.',
  },
  pump: {
    kind: 'pump', nmfc: '004745', ciic: 'U', nomenclature: 'PUMP, FUEL, BOOST', fsc: '2915', partNumber: '8100-1185', ui: 'EA', unitWeight: 28, unitPrice: 11900,
    quantity: [1, 1], category: 'Aircraft parts',
    description: 'Electric fuel boost pump with motor housing, capped inlet screen and outlet port.',
  },
  antenna: {
    kind: 'antenna', nmfc: '061700', ciic: 'U', nomenclature: 'ANTENNA, BLADE', fsc: '5985', partNumber: 'DMC63-2', ui: 'EA', unitWeight: 6, unitPrice: 2210,
    quantity: [1, 1], category: 'Avionics',
    description: 'Long blade antenna with mounting base plate and coaxial connector. Light but long.',
  },
  generator: {
    kind: 'generator', nmfc: '061700', ciic: 'U', nomenclature: 'GENERATOR, ALTERNATING CURRENT', fsc: '6115', partNumber: '976J498-1', ui: 'EA', unitWeight: 85, unitPrice: 52300,
    quantity: [1, 1], category: 'Electrical',
    description: 'Engine-driven AC generator with mounting flange, spline drive and terminal block.',
  },
  tire: {
    kind: 'tire', nmfc: '004745', ciic: 'U', nomenclature: 'TIRE, PNEUMATIC, AIRCRAFT', fsc: '2620', partNumber: '46X16 28PR', ui: 'EA', unitWeight: 95, unitPrice: 2650,
    quantity: [1, 1], category: 'Aircraft parts',
    description: 'Main landing gear tire, tubeless, ribbed tread.',
  },
  wheel: {
    kind: 'wheel', nmfc: '004745', ciic: 'U', nomenclature: 'WHEEL ASSEMBLY, MAIN LANDING GEAR', fsc: '1630', partNumber: '3-1594-2', ui: 'EA', unitWeight: 160, unitPrice: 21400,
    quantity: [1, 1], category: 'Aircraft parts',
    description: 'Split-hub main wheel assembly with bearings capped and tie bolts torqued.',
  },
  apu: {
    kind: 'apu', nmfc: '004745', ciic: 'U', nomenclature: 'ENGINE, AUXILIARY POWER UNIT', fsc: '2835', partNumber: 'GTCP85-180L', ui: 'EA', unitWeight: 420, unitPrice: 184000,
    quantity: [1, 1], category: 'Aircraft parts',
    description: 'Gas turbine auxiliary power unit on a shipping frame, inlets and exhaust capped. Over 400 lb.',
  },
  bolts: {
    kind: 'bolts', nmfc: '051300', ciic: 'U', nomenclature: 'BOLT, MACHINE (BX OF 100)', fsc: '5306', partNumber: 'NAS6606-12', ui: 'BX', unitWeight: 6, unitPrice: 88,
    quantity: [2, 40], category: 'Hardware',
    description: 'Boxes of hex-head machine bolts, 100 per box.',
  },
  nuts: {
    kind: 'nuts', nmfc: '051300', ciic: 'U', nomenclature: 'NUT, SELF-LOCKING, HEXAGON (BX OF 100)', fsc: '5310', partNumber: 'MS21042L4', ui: 'BX', unitWeight: 4, unitPrice: 54,
    quantity: [2, 40], category: 'Hardware',
    description: 'Boxes of self-locking hex nuts, 100 per box.',
  },
  screws: {
    kind: 'screws', nmfc: '051300', ciic: 'U', nomenclature: 'SCREW, CAP, SOCKET HEAD (BX OF 100)', fsc: '5305', partNumber: 'NAS1352-3-8P', ui: 'BX', unitWeight: 5, unitPrice: 71,
    quantity: [2, 40], category: 'Hardware',
    description: 'Boxes of socket-head cap screws, 100 per box.',
  },
};
export const HARDWARE = ['bolts', 'nuts', 'screws'];
export const isHardware = item => HARDWARE.includes(item.kind);

// Containers on the packing bench. Hardware moves to a triwall on a pallet past 24 boxes.
export const CONTAINERS = {
  mailer: { title: 'Padded mailer', note: 'Light, flat, non-fragile items only.' },
  fiberboard: { title: 'Fiberboard box with cushioning', note: 'Corrugated box with dunnage. Small parts and hardware.' },
  'esd-fiberboard': { title: 'ESD bag in cushioned fiberboard box', note: 'Static-shielding bag, sealed, then boxed with cushioning.' },
  'wood-box': { title: 'Wooden box', note: 'Nailed wood box for heavy or high-value compact parts.' },
  triwall: { title: 'Triwall box on pallet', note: 'Triple-wall corrugated box banded to a pallet. Heavy bulk loads.' },
  crate: { title: 'Wooden crate on skid', note: 'Framed crate on runners for long or oversize parts.' },
};

export function correctContainer(item, quantity) {
  if (item.esd) return 'esd-fiberboard';
  if (isHardware(item)) return quantity > 24 ? 'triwall' : 'fiberboard';
  return { actuator: 'fiberboard', starter: 'wood-box', brake: 'wood-box', gearbox: 'wood-box', panel: 'crate', harness: 'fiberboard', 'seal-kit': 'mailer', filter: 'fiberboard',
    valve: 'fiberboard', pump: 'fiberboard', antenna: 'fiberboard', generator: 'wood-box', tire: 'fiberboard', wheel: 'wood-box', apu: 'crate' }[item.kind];
}

// Packed outer dimensions (in) and container tare weight (lb).
const PACKED = {
  'circuit-card': { length: 16, width: 12, height: 8, tare: 2 },
  'display-unit': { length: 20, width: 18, height: 14, tare: 4 },
  actuator: { length: 36, width: 12, height: 12, tare: 5 },
  starter: { length: 24, width: 24, height: 22, tare: 30 },
  brake: { length: 30, width: 30, height: 18, tare: 45 },
  gearbox: { length: 36, width: 30, height: 28, tare: 70 },
  panel: { length: 84, width: 44, height: 10, tare: 60 },
  radio: { length: 20, width: 14, height: 12, tare: 3 },
  harness: { length: 24, width: 18, height: 6, tare: 2 },
  valve: { length: 16, width: 12, height: 12, tare: 2 },
  pump: { length: 20, width: 14, height: 12, tare: 3 },
  antenna: { length: 64, width: 8, height: 8, tare: 4 },
  generator: { length: 22, width: 18, height: 16, tare: 20 },
  tire: { length: 46, width: 46, height: 16, tare: 6 },
  wheel: { length: 30, width: 30, height: 16, tare: 40 },
  apu: { length: 48, width: 40, height: 36, tare: 90 },
};
export function packedSize(item, quantity) {
  if (item.kind === 'seal-kit') return { length: 14, width: 10, height: 2 + quantity, tare: .5 };
  if (item.kind === 'filter') return quantity <= 6 ? { length: 18, width: 12, height: 10, tare: 3 } : { length: 24, width: 18, height: 12, tare: 5 };
  if (!isHardware(item)) return PACKED[item.kind];
  if (quantity <= 12) return { length: 18, width: 12, height: 10, tare: 3 };
  if (quantity <= 24) return { length: 24, width: 18, height: 12, tare: 5 };
  return { length: 48, width: 40, height: 30, tare: 55 };
}

// Markings the packer can apply at Pack. The address label is the MSL printed from CMOS and applied
// after Shipment planning, so it is not here. ESDS items need the ESD caution label (DAFI 24-602V2 para 8.10.2.1). Wood packaging material (wood boxes, crates, and
// the pallet under a triwall) carries the ISPM 15 heat-treatment certification mark (DAFI 24-602V2
// Chapter 9, DoDM 4140.65). An RDD 999 shipment is marked 999 on each piece (para 8.12.3).
export const MARKINGS = [
  { id: 'esd', title: 'ESD caution label' },
  { id: 'wpm', title: 'ISPM 15 heat-treated WPM mark (wood packaging)' },
  { id: 'expedite', title: '999 expedite marking' },
  { id: 'hazmat', title: 'Hazardous materials label' },
  { id: 'up', title: '"This side up" arrows' },
];
export const WOOD_CONTAINERS = ['wood-box', 'crate', 'triwall'];
export function requiredMarkings(shipment) {
  const item = ITEMS[shipment.itemId];
  return [...(item.esd ? ['esd'] : []), ...(WOOD_CONTAINERS.includes(shipment.container) ? ['wpm'] : []), ...(shipment.rdd === '999' ? ['expedite'] : [])];
}
// Markings that would be wrong to apply: no item in this trainer is hazardous, and a mark that
// does not fit this piece misleads handlers.
export const wrongMarkings = shipment => ['hazmat', ...(WOOD_CONTAINERS.includes(shipment.container) ? [] : ['wpm']), ...(shipment.rdd === '999' ? [] : ['expedite'])];

// Shipping origins. Each session ships from one TMO: JBER in Alaska or Travis AFB in the lower 48.
// dodaac is the consignor on the shipping document; cmosDodaac is the CMOS login and POE DoDAAC.
export const ORIGINS = {
  jber: { id: 'jber', name: 'JBER, AK', dodaac: 'FB5000', cmosDodaac: JBER_CONSIGNOR.dodaac, unit: JBER_CONSIGNOR.unit, address: JBER_CONSIGNOR.address1, address2: JBER_CONSIGNOR.address2, city: JBER_CITY_LINE, phone: JBER_CONSIGNOR.phone, port: JBER_CONSIGNOR.port, alaska: true },
  travis: { id: 'travis', name: 'Travis AFB, CA', dodaac: 'FB4427', cmosDodaac: 'FB4427', unit: '60 LRS / TMO (LGRDF)', address: '510 PERIMETER RD BLDG 977', city: 'TRAVIS AFB, CA 94535', port: 'SUU', alaska: false },
};
export const originOf = shipment => ORIGINS[shipment.origin] || ORIGINS.jber;

// Consignees in the lower 48. channelPort is the stateside aerial port an AMC channel from EDF serves.
// The three Air Logistics Complex repair shops are training entries; the rest come from dodaacs.js.
export const CONUS = {
  FA8217: { unit: '309 CMXG / OO-ALC', address: '6050 GUM LN BLDG 1515', city: 'HILL AFB, UT 84056', channelPort: 'TCM' },
  FA8105: { unit: '76 CMXG / OC-ALC', address: '3001 STAFF DR BLDG 3001', city: 'TINKER AFB, OK 73145', channelPort: 'TCM' },
  FA8522: { unit: '402 CMXG / WR-ALC', address: '380 RICHARD RAY BLVD', city: 'ROBINS AFB, GA 31098', channelPort: 'TCM' },
  ...LOWER_48_DODAACS,
};
export const conusFor = origin => Object.keys(CONUS).filter(code => code !== origin.dodaac);
// OCONUS consignees (overseas, Hawaii, Guam, Puerto Rico), reached by AMC channel airlift through their aerial port.
export const OVERSEAS = OCONUS_DODAACS;
export const consignee = dodaac => CONUS[dodaac] || OVERSEAS[dodaac] || ALASKA_DODAACS[dodaac] || null;
export const isOverseas = dodaac => Boolean(OVERSEAS[dodaac]);
export const ALL_DODAACS = [...new Set([...Object.values(ORIGINS).flatMap(origin => [origin.dodaac, origin.cmosDodaac]), ...Object.keys(CONUS), ...Object.keys(OVERSEAS)])].sort();
export const AERIAL_PORTS = [...new Set(['EDF', 'SUU', 'TCM', ...Object.values(OVERSEAS).map(info => info.port)])].sort();
// Commercial repair vendors in the lower 48. They have no DoDAAC, so a DD 1149 to one carries the
// address in the clear and CMOS takes it on the Ultimate Consignee tab. Fictional names.
export const VENDORS = [
  { name: 'NORTHSTAR COMPONENT REPAIR LLC', address: '4410 E AIRPORT DR', city: 'PHOENIX', state: 'AZ', zip: '85034', phone: '(555) 010-2231' },
  { name: 'BLUE MESA AVIONICS INC', address: '1200 INDUSTRIAL PKWY', city: 'WICHITA', state: 'KS', zip: '67219', phone: '(555) 010-4410' },
  { name: 'PALMETTO HYDRAULICS CORP', address: '77 COMMERCE WAY', city: 'NORTH CHARLESTON', state: 'SC', zip: '29405', phone: '(555) 010-7788' },
];
// Delivery points on a base other than the consignee DoDAAC's own address.
export const DELIVERY_POINTS = [['SUPPLY WAREHOUSE', 'BLDG 1260 7278 4TH ST'], ['FLIGHTLINE SUPPORT', 'BLDG 225 5800 WARDLEIGH RD'], ['RECEIVING DOCK B', 'BLDG 3001 DOCK 4 3001 STAFF DR']];
// Splits a stateside "CITY, ST 12345" line.
export function splitCity(line) {
  const [city, rest = ''] = line.split(',');
  const [state = '', zip = ''] = rest.trim().split(/\s+/);
  return { city: city.trim(), state, zip };
}
// Where the piece actually goes: the delivery address when the shipment has one, otherwise the
// consignee DoDAAC's address. channelPort is the stateside aerial port for an AMC move from EDF.
export function destinationOf(shipment) {
  if (shipment.delivery) return { ...shipment.delivery, channelPort: CONUS[shipment.dodaac]?.channelPort || 'TCM' };
  const info = consignee(shipment.dodaac);
  return info ? { name: info.unit, address: info.address, ...splitCity(info.city), channelPort: info.channelPort } : null;
}
// Destination city as the small package carrier wants it.
export const destinationCity = shipment => destinationOf(shipment)?.city || '';

// Type pack codes for block 18 of the shipping document and the CMOS Pieces tab.
// DTR type pack codes (DTEB V_TYPE_PACK) offered on the packing paperwork; a triwall is a multiwall container on a pallet.
export const TYPE_PACKS = { BX: 'Box', CT: 'Carton', CR: 'Crate', CS: 'Case', MW: 'Multiwall container secured to warehouse plt', PT: 'Palletized unit load other than code MW', EN: 'Envelope', BG: 'Bag, burlap or cloth', DR: 'Drum' };
export const typePackFor = container => ({ mailer: 'EN', fiberboard: 'BX', 'esd-fiberboard': 'BX', 'wood-box': 'BX', triwall: 'MW', crate: 'CR' }[container]);

export const TACS = ['F8C0', 'FBM0', 'F5E1', 'F2R4'];
