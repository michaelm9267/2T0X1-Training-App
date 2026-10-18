// Prime DIC (document identifier code), built by CMOS from the shipment, from the supplied DTR
// data-value tables: position 1 is always T, position 2 is DOC_ID_2P (type of shipment) and
// position 3 is DOC_ID_3P (type of document, the "T" mode-code column). TX1 is general cargo,
// loose; a hazardous ("O - Other") shipment becomes TJ1.
export const DOC_ID_2P = [
  ['A', 'Manifest Header (see Paragraph C below, for 3rd position)'],
  ['B', 'Accompanied Baggage'],
  ['C', 'Defense Courier System'],
  ['D', 'Intraservice Use Only'],
  ['E', 'Ammunition and Explosives'],
  ['F', 'Unaccompanied Baggage'],
  ['G', 'Mail from Postal Concentration Centers'],
  ['H', 'Household Goods'],
  ['I', 'Vet Inspectable Container'],
  ['J', 'Hazardous Materials (except Ammunition and Explosives or Consumer Commodities (ORM-D))'],
  ['K', 'In Transit Data (not a TCMD or Manifest Document)'],
  ['L', 'Dunnage and Lashing Gear'],
  ['M', 'Tracer Action (not a TCMD or Manifest Document)'],
  ['P', 'Privately Owned Vehicle'],
  ['S', 'Shipment Challenge (not a TCMD or Manifest Document)'],
  ['U', 'Equipment in Sets or Systems'],
  ['V', 'Government Vehicles, Trailers, Wheeled Guns, and Aircraft'],
  ['W', 'Arms/Weapons: (All types, including inert components and/or parts) Handgun(s), shoulder fired/crew served weapons and shoulder fired missiles or similar weapon system/device without related explosive component(s), includes NWRM related parts/components containing no fissionable/fushionable material.'],
  ['X', 'Shipments (including ORM-D) not otherwise covered'],
];
export const DOC_ID_3P = [
  ['0', 'Prime document for Release Unit shipment (including empty SEAVAN, CONEX, etc.) not in a consolidation container.'],
  ['1', 'Prime document for Less than Release Unit shipment (including empty SEAVAN, CONEX), not in a consolidation container.'],
  ['2', 'Prime document (header) for loaded Roll On/Roll Off (RO/RO), SEAVAN, MILVAN, or Air Pallet (463-L).'],
  ['3', 'Prime document (header) for CONEX, Unitized Pallet Load, or other Consolidation Container containing multiple shipment units.'],
  ['4', 'Prime document for shipment units consolidated in a container (CONEX, SEAVAN, MILVAN, 463-L Pallet, RO/RO, or Unitized Pallet Load).'],
];

const on = (value) => value === true || /^Y/i.test(String(value || ''));

// Second position: the most specific shipment type the record shows, else X (not otherwise covered).
export function shipmentTypeCode(d = {}) {
  const hazmat = String(d.hazmat || '').trim().toUpperCase();
  if (hazmat.startsWith('A') || hazmat.startsWith('E')) return 'E';
  if (on(d.weaponsShipment)) return 'W';
  if (hazmat.startsWith('O')) return 'J';
  if (['9', 'X', 'Y'].includes(String(d.courierInd || '').trim().toUpperCase())) return 'C';
  if (on(d.mailShipment)) return 'G';
  if (on(d.vetInspectableContainer)) return 'I';
  const commodity = String(d.commoditySH || '').trim().toUpperCase()[0];
  if (commodity === 'J') return 'F';
  if (commodity === 'T') return 'H';
  return 'X';
}

// Third position: 4 when the shipment is part of a consolidation (pallet or container), else 1
// (less than release unit, not consolidated).
export function documentTypeCode(d = {}) {
  return on(d.consolidationInd) || String(d.palId || '').trim() ? '4' : '1';
}

export const derivePrimeDic = (d = {}) => `T${shipmentTypeCode(d)}${documentTypeCode(d)}`;
