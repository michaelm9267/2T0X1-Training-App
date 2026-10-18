// Training reference for common air-cargo UN/ID numbers (49 CFR 172.101 / IATA DGR).
// Verify against the current regulation before relying on an entry; n.o.s. and multi-packing-group
// entries leave the packing group for the trainee to determine.
export const UN_NUMBERS = [
  { un: 'UN0012', names: ['CARTRIDGES FOR WEAPONS, INERT PROJECTILE'], division: '1.4S', className: 'EXPLOSIVE', subsidiary: '', label: 'EXPLOSIVE 1.4', packingGroup: 'N/A', compatibility: 'S' },
  { un: 'UN1001', names: ['ACETYLENE, DISSOLVED'], division: '2.1', className: 'FLAMMABLE GAS', subsidiary: '', label: 'FLAMMABLE GAS', packingGroup: 'N/A', compatibility: '' },
  { un: 'UN1013', names: ['CARBON DIOXIDE'], division: '2.2', className: 'NONFLAMMABLE GAS', subsidiary: '', label: 'NONFLAMMABLE GAS', packingGroup: 'N/A', compatibility: '' },
  { un: 'UN1066', names: ['NITROGEN, COMPRESSED'], division: '2.2', className: 'NONFLAMMABLE GAS', subsidiary: '', label: 'NONFLAMMABLE GAS', packingGroup: 'N/A', compatibility: '' },
  { un: 'UN1072', names: ['OXYGEN, COMPRESSED'], division: '2.2', className: 'NONFLAMMABLE GAS', subsidiary: '5.1', label: 'NONFLAMMABLE GAS, OXIDIZER', packingGroup: 'N/A', compatibility: '' },
  { un: 'UN1202', names: ['DIESEL FUEL'], division: '3', className: 'FLAMMABLE LIQUID', subsidiary: '', label: 'FLAMMABLE LIQUID', packingGroup: 'III', compatibility: '' },
  { un: 'UN1203', names: ['GASOLINE'], division: '3', className: 'FLAMMABLE LIQUID', subsidiary: '', label: 'FLAMMABLE LIQUID', packingGroup: 'II', compatibility: '' },
  { un: 'UN1830', names: ['SULFURIC ACID'], division: '8', className: 'CORROSIVE', subsidiary: '', label: 'CORROSIVE', packingGroup: 'II', compatibility: '' },
  { un: 'UN1863', names: ['FUEL, AVIATION, TURBINE ENGINE'], division: '3', className: 'FLAMMABLE LIQUID', subsidiary: '', label: 'FLAMMABLE LIQUID', packingGroup: '', compatibility: '' },
  { un: 'UN1950', names: ['AEROSOLS, FLAMMABLE'], division: '2.1', className: 'FLAMMABLE GAS', subsidiary: '', label: 'FLAMMABLE GAS', packingGroup: 'N/A', compatibility: '' },
  { un: 'UN1978', names: ['PROPANE'], division: '2.1', className: 'FLAMMABLE GAS', subsidiary: '', label: 'FLAMMABLE GAS', packingGroup: 'N/A', compatibility: '' },
  { un: 'UN1993', names: ['FLAMMABLE LIQUID, N.O.S.'], division: '3', className: 'FLAMMABLE LIQUID', subsidiary: '', label: 'FLAMMABLE LIQUID', packingGroup: '', compatibility: '' },
  { un: 'UN2794', names: ['BATTERIES, WET, FILLED WITH ACID'], division: '8', className: 'CORROSIVE', subsidiary: '', label: 'CORROSIVE', packingGroup: 'N/A', compatibility: '' },
  { un: 'UN2800', names: ['BATTERIES, WET, NON-SPILLABLE'], division: '8', className: 'CORROSIVE', subsidiary: '', label: 'CORROSIVE', packingGroup: 'N/A', compatibility: '' },
  { un: 'UN3082', names: ['ENVIRONMENTALLY HAZARDOUS SUBSTANCE, LIQUID, N.O.S.'], division: '9', className: 'MISCELLANEOUS', subsidiary: '', label: 'MISCELLANEOUS', packingGroup: 'III', compatibility: '' },
  { un: 'UN3528', title: 'ENGINE/MACHINERY, FLAMMABLE LIQUID POWERED', names: ['ENGINE, INTERNAL COMBUSTION, FLAMMABLE LIQUID POWERED', 'ENGINE, FUEL CELL, FLAMMABLE LIQUID POWERED', 'MACHINERY, INTERNAL COMBUSTION, FLAMMABLE LIQUID POWERED', 'MACHINERY, FUEL CELL, FLAMMABLE LIQUID POWERED'], division: '3', className: 'FLAMMABLE LIQUID', subsidiary: '', label: 'FLAMMABLE LIQUID', packingGroup: 'N/A', compatibility: '' },
  { un: 'UN3529', title: 'ENGINE/MACHINERY, FLAMMABLE GAS POWERED', names: ['ENGINE, INTERNAL COMBUSTION, FLAMMABLE GAS POWERED', 'ENGINE, FUEL CELL, FLAMMABLE GAS POWERED', 'MACHINERY, INTERNAL COMBUSTION, FLAMMABLE GAS POWERED', 'MACHINERY, FUEL CELL, FLAMMABLE GAS POWERED'], division: '2.1', className: 'FLAMMABLE GAS', subsidiary: '', label: 'FLAMMABLE GAS', packingGroup: 'N/A', compatibility: '' },
  { un: 'UN3530', title: 'ENGINE/MACHINERY, INTERNAL COMBUSTION', names: ['ENGINE, INTERNAL COMBUSTION', 'MACHINERY, INTERNAL COMBUSTION'], division: '9', className: 'MISCELLANEOUS', subsidiary: '', label: 'MISCELLANEOUS', packingGroup: 'N/A', compatibility: '' },
  { un: 'UN3166', names: ['VEHICLE, FLAMMABLE LIQUID POWERED'], division: '9', className: 'MISCELLANEOUS', subsidiary: '', label: 'MISCELLANEOUS', packingGroup: 'N/A', compatibility: '' },
  { un: 'UN3171', names: ['BATTERY-POWERED VEHICLE'], division: '9', className: 'MISCELLANEOUS', subsidiary: '', label: 'MISCELLANEOUS', packingGroup: 'N/A', compatibility: '' },
];

export const findUnNumber = un => UN_NUMBERS.find(item => item.un === un);
export const unOptionLabel = un => { const entry = findUnNumber(un); return `${un} · ${entry.title || entry.names[0]}`; };

// Draft fields filled from the selected UN/ID number. A UN number covering several proper shipping
// names leaves the name for the trainee to choose.
export function fieldsForUnNumber(un) {
  const entry = findUnNumber(un);
  return { dg2Name: entry?.names.length === 1 ? entry.names[0] : '', dg2Division: entry?.division ?? '', dg2Class: entry?.className ?? '', dg2Subsidiary: entry?.subsidiary ?? '', dg2Label: entry?.label ?? '', dg2PackingGroup: entry?.packingGroup ?? '', dg2Compatibility: entry?.compatibility ?? '' };
}
