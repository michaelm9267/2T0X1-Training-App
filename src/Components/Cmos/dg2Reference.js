import { UN_NUMBERS } from '../Documentation/unNumbers';
import catalog from './afmanDg2Catalog.json';

export const AFMAN_REFERENCE = {
  title: 'AFMAN 24-604 · 6 June 2025',
  url: 'https://static.e-publishing.af.mil/production/1/af_a4/publication/afman24-604/afman24-604.pdf',
};
export const JBER_SHIPPER = { shipper: 'FB5000 773 LRS LGRT', address1: '5257 Gibson Ave', address2: '', city: 'JBER', country: 'US', state: 'AK', zip: '99505', phone: '907-552-2131' };
export const dg2Defaults = (draft = {}) => ({
  ...draft, templateType: draft.templateType || 'DG',
  page1: { ...draft.page1 }, page2: { ...JBER_SHIPPER, ...draft.page2 }, lots: draft.lots || [],
});
export const normalizeUn = value => {
  const text = String(value || '').trim().toUpperCase().replace(/\s+/g, '');
  return /^\d{4}$/.test(text) ? `UN${text}` : text;
};
export const DG2_CATALOG = catalog.entries;
export const unMatches = value => DG2_CATALOG.filter(entry => entry.unId === normalizeUn(value));
const CLASS_NAMES = {
  '1': 'EXPLOSIVES', '2.1': 'FLAMMABLE GAS', '2.2': 'NON-FLAMMABLE, NON-TOXIC GAS', '2.3': 'TOXIC GAS',
  '3': 'FLAMMABLE LIQUID', '4.1': 'FLAMMABLE SOLID', '4.2': 'SPONTANEOUSLY COMBUSTIBLE', '4.3': 'DANGEROUS WHEN WET',
  '5.1': 'OXIDIZER', '5.2': 'ORGANIC PEROXIDE', '6.1': 'TOXIC', '6.2': 'INFECTIOUS SUBSTANCE', '7': 'RADIOACTIVE', '8': 'CORROSIVE', '9': 'MISCELLANEOUS',
};
const unDerivedFields = ['properShippingName', 'division', 'compatibility', 'subsidiary', 'packingGroup', 'specialProvisions', 'packingPara', 'hazardClassName', 'hazardLabel', 'sym', 'aircraft'];
const unDerivedFlags = ['NOS Item', 'Dry Ice', 'Radioactive Material', 'Dangerous When Wet'];
const preferredShippingName = template => {
  const names = UN_NUMBERS.find(r => r.un === template.unId)?.names || [];
  const alternatives = template.name.split(/\s+or\s+/i).map(s => s.trim());
  return alternatives.find(name => names.some(n => n.toUpperCase() === name.toUpperCase())) || alternatives[0];
};
export function clearDg2Un(draft, value) {
  const previous = dg2Defaults(draft);
  return { ...previous, templateId: '', referencePage: null,
    page1: { ...previous.page1, ...Object.fromEntries(unDerivedFlags.map(key => [key, false])) },
    page2: { ...previous.page2, ...Object.fromEntries(unDerivedFields.map(key => [key, ''])), unId: normalizeUn(value), emergencyContact: '' },
  };
}
export function applyDg2Template(draft, template) {
  if (!template || template.forbidden || template.referenceOnly) return dg2Defaults(draft);
  const previous = dg2Defaults(draft);
  const division = template.division;
  const className = CLASS_NAMES[division.startsWith('1.') ? '1' : division] || '';
  const isNewHazard = normalizeUn(previous.page2.unId) !== template.unId;
  return {
    ...previous, templateId: template.id, templateType: 'DG', referencePage: template.page,
    page1: { ...previous.page1, 'NOS Item': /N\.?O\.?S\.?/i.test(template.name), 'Dry Ice': template.unId === 'UN1845', 'Radioactive Material': division === '7', 'Dangerous When Wet': division === '4.3' },
    page2: {
      ...previous.page2, unId: template.unId, properShippingName: preferredShippingName(template),
      division, subsidiary: template.subsidiary, packingGroup: template.packingGroup || 'N/A',
      compatibility: division.startsWith('1.') ? division.match(/[A-Z]$/)?.[0] || '' : '',
      specialProvisions: template.specialProvisions, packingPara: template.packingPara, sym: template.sym,
      aircraft: /\bP[1-4]\b/.test(template.specialProvisions) ? 'Cargo aircraft only' : /\bP5\b/.test(template.specialProvisions) ? 'Passenger and cargo aircraft' : '',
      hazardClassName: className, hazardLabel: division.startsWith('1.') ? `EXPLOSIVES ${division}` : [...new Set([className, ...template.subsidiary.split(',').map(code => CLASS_NAMES[code.trim()] || '').filter(Boolean)])].join('; '),
      ...(isNewHazard && EMERGENCY_CONTACTS.some(c => c.number === previous.page2.emergencyContact) ? { emergencyContact: '' } : {}),
    },
  };
}
// A UN alone can fill a record only if its permitted variants agree on the regulatory data.
export function unAutofill(value) {
  const matches = unMatches(value).filter(t => !t.forbidden && !t.referenceOnly);
  if (!matches.length) return null;
  const signature = t => JSON.stringify([t.name, t.division, t.subsidiary, t.packingGroup, t.specialProvisions, t.packingPara, t.sym]);
  return matches.every(t => signature(t) === signature(matches[0])) ? matches[0] : null;
}
export const EMERGENCY_CONTACTS = [
  { id: 'class1', category: 'class1', hazard: 'Class 1 — Explosives', agency: 'Army Operations Center — Watch Desk', number: '+1 (703) 695-4695 / +1 (703) 695-4696', dsn: '312-225-4695 / 312-225-4696', notes: 'Collect; ask for the Watch Desk', paragraph: 'A17.2.9.1' },
  { id: 'radioactive-af', category: 'radioactive', hazard: 'Class 7 — Radioactive', agency: 'Air Force', number: '+1 (202) 767-4011', dsn: '', notes: 'Collect', paragraph: 'A17.2.9.2.2' },
  { id: 'radioactive-army', category: 'radioactive', hazard: 'Class 7 — Radioactive', agency: 'Army', number: '+1 (703) 695-4695 / +1 (703) 695-4696', dsn: '312-225-4695 / 312-225-4696', notes: 'Collect', paragraph: 'A17.2.9.2.1' },
  { id: 'radioactive-navy', category: 'radioactive', hazard: 'Class 7 — Radioactive', agency: 'Navy / Marines', number: '+1 (757) 887-4692', dsn: '312-953-4692', notes: '', paragraph: 'A17.2.9.2.3' },
  { id: 'radioactive-dla', category: 'radioactive', hazard: 'Class 7 — Radioactive', agency: 'DLA', number: '+1 (717) 770-5283', dsn: '', notes: 'Collect', paragraph: 'A17.2.9.2.4' },
  { id: 'warfare', category: 'warfare', hazard: 'Biological warfare materials', agency: 'Biological warfare materials contact', number: '+1 (410) 306-4100', dsn: '458-4100', notes: '', paragraph: 'A17.2.9.3' },
  { id: 'other', category: 'other', hazard: 'Other hazardous materials', agency: 'DoD Emergency Response Hotline', number: '1-800-851-8061; +1-804-279-3131', dsn: '', notes: 'Domestic toll free; international collect. Enter both numbers.', paragraph: 'A17.2.9.4.1–A17.2.9.4.2' },
];
export const emergencyCategory = ({ division = '', biologicalWarfare = false } = {}) =>
  biologicalWarfare ? 'warfare' : String(division).startsWith('1.') || division === '1' ? 'class1' : division === '7' ? 'radioactive' : 'other';
export const emergencyContactsFor = page2 => EMERGENCY_CONTACTS.filter(c => c.category === emergencyCategory(page2));
