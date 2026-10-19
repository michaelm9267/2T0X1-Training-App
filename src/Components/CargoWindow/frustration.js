import { paperwork } from './workflow';
import { screenATTLA, letterApplies } from './transportability';
import { canConfirmVehicleCorrection } from './vehicleInspection';
import { recordMistake } from './mistakes';

// Frustration reasons offered for every shipment. A reason only "applies" when this shipment
// actually has the discrepancy, so trainees must identify the right one. Finding reasons share
// their id with the inspection finding they describe.
export const FRUSTRATION_REASONS = [
  { id: 'paperwork', title: 'Missing or insufficient document copies', fix: 'Request the missing copies from the increment monitor, then recount them in Precheck.' },
  { id: 'hazdec', title: 'HAZDEC errors or missing signature', fix: 'Return the HAZDEC to the shipper for correction, then recount and verify the corrected copies.' },
  { id: 'attla', title: 'Missing, expired, or inapplicable ATTLA letter', fix: 'Obtain a current ATTLA letter that matches the configuration, dimensions, and weight.' },
  { id: 'label', title: 'Missing or illegible military shipping label', finding: true },
  { id: 'packets', title: 'Missing or incomplete document packet', finding: true },
  { id: 'undeclared-hazmat', title: 'Undeclared hazardous material', finding: true },
  { id: 'clean', title: 'Item not clean', finding: true },
  { id: 'leaks', title: 'Fluid leak', finding: true },
  { id: 'mechanical', title: 'Engine does not run', finding: true },
  { id: 'brakes', title: 'Brakes not operational', finding: true },
  { id: 'tires', title: 'Tire pressure out of specification', finding: true },
  { id: 'battery', title: 'Battery terminals unprotected', finding: true, physical: 'Inspect both battery terminals in the cargo bay and tape any exposed terminal, then confirm the correction here.' },
  { id: 'fuel', title: 'Fuel level exceeds limit', finding: true, physical: 'Read the fuel level in the cargo bay, drain to the equipment limit, reread the fuel level, then confirm the correction here.' },
  { id: 'equipment', title: 'Loose equipment or accessories', finding: true },
  { id: 'tiedowns', title: 'Unserviceable tie-down points', finding: true },
  { id: 'access', title: 'No access to locked container', finding: true },
  { id: 'secured-crates', title: 'Supply crates not restrained', finding: true },
  { id: 'loose-case', title: 'Unsecured cargo inside container', finding: true },
  { id: 'arrangement', title: 'Improper cargo arrangement', finding: true },
  { id: 'nets', title: 'Damaged cargo nets', finding: true },
  { id: 'pallet-condition', title: 'Damaged pallet or tie-down rings', finding: true },
  { id: 'dunnage', title: 'Insufficient dunnage', finding: true },
  { id: 'mismatch', title: 'Measured dimensions or weight differ from paperwork', fix: 'Remeasure and reweigh; when the paperwork is wrong, the shipper must correct it.' },
  { id: 'other', title: 'Other (describe)', fix: 'Record the corrective action, then release the asset.' },
];
export const findReason = id => FRUSTRATION_REASONS.find(reason => reason.id === id);
// Paperwork errors the shipper must correct, and the packet document each one is on.
const ERROR_DOCUMENT = { mismatch: 'logmod', attla: 'attla', hazdec: 'hazdec' };
function documentError(scenario, id) {
  if (id === 'mismatch') return scenario.paperworkWeight !== undefined && scenario.paperworkWeight !== scenario.weight;
  if (id === 'attla') return Boolean(scenario.docErrors?.attla) && !letterApplies(scenario);
  if (id === 'hazdec') return Boolean(scenario.hazdecError);
  return false;
}
// Reason for frustrating from an inspection item, when that item can be one.
export const reasonForFinding = id => findReason(id)?.finding ? id : id === 'documents' ? 'paperwork' : undefined;
const finding = (scenario, id) => scenario.findings.find(item => item.id === id && item.correct === 'unsatisfactory');
const documentTitle = (scenario, id) => paperwork(scenario).find(d => d.id === id)?.title;
const shortDocuments = (scenario, e, subject) => paperwork(scenario).filter(d => d.required && (!subject || d.id === subject) && (e.documentCopies[d.id] ?? d.copies) < d.minimum);
export const entryTitle = (scenario, entry) => `${findReason(entry.reason).title}${entry.subject ? ` — ${documentTitle(scenario, entry.subject)}` : ''}`;

// A paperwork subject names the document; without one, any short document counts.
export function reasonApplies(scenario, e, id, subject) {
  if (id === 'paperwork') return paperwork(scenario).some(d => d.required && (!subject || d.id === subject) && d.copies < d.minimum);
  if (id === 'attla') return screenATTLA(scenario).certificationRequired && !letterApplies(scenario);
  if (id === 'mismatch') return documentError(scenario, id) || ['length', 'width', 'height'].some(key => e.notebookEntries[key] !== undefined && e.notebookEntries[key] !== scenario[key]) || (e.notebookEntries.gross !== undefined && e.notebookEntries.gross !== scenario.weight);
  if (id === 'hazdec') return documentError(scenario, id);
  if (id === 'other') return true;
  return Boolean(finding(scenario, id));
}
export function reasonFixed(scenario, e, entry) {
  if (entry.resolved) return true;
  if (!reasonApplies(scenario, e, entry.reason, entry.subject)) return true;
  if (entry.reason === 'paperwork') return shortDocuments(scenario, e, entry.subject).length === 0;
  if (findReason(entry.reason)?.finding) return e.answers[entry.reason]?.corrected === true && canConfirmVehicleCorrection(scenario, e, entry.reason);
  return false;
}
export function fixGuidance(scenario, id, subject) {
  const reason = findReason(id);
  if (id === 'paperwork' && subject) return `Request the missing ${documentTitle(scenario, subject)} copies from the increment monitor, then recount them in Precheck.`;
  return reason.physical || finding(scenario, id)?.correction || reason.fix || 'This shipment does not have that discrepancy.';
}
// Whether the Fix button can act now, and why not when it cannot.
export function fixReadiness(scenario, e, id) {
  if (id === 'paperwork' || id === 'other' || documentError(scenario, id)) return { ready: true };
  if (!findReason(id)?.finding) return { ready: false, reason: 'Correct this outside the manifest workflow, then release.' };
  if (!e.inspected.includes(id)) return { ready: false, reason: `Inspect ${finding(scenario, id)?.title.toLowerCase() || 'the item'} in the cargo bay first.` };
  if (!canConfirmVehicleCorrection(scenario, e, id)) return { ready: false, reason: findReason(id).physical };
  return { ready: true };
}

export const isFrustrated = e => (e.frustrations || []).some(entry => !entry.released);
export const openFrustration = (e, reason, subject) => (e.frustrations || []).some(entry => entry.reason === reason && entry.subject === subject && !entry.released);

const resetDownstream = e => ({ ...e, manifestAccepted: false, jiVerified: [], jiMarks: {} });
export function frustrate(scenario, e, reason, note = '', subject) {
  if (!findReason(reason) || (reason === 'other' && !note.trim())) return { ...e, frustrationFeedback: reason === 'other' ? 'Describe the reason before frustrating the asset.' : 'Select a frustration reason.' };
  if (openFrustration(e, reason, subject)) return { ...e, frustrationFeedback: 'The asset is already frustrated for that reason.' };
  const entry = { reason, subject, note: note.trim(), valid: reasonApplies(scenario, e, reason, subject), released: false, resolved: false };
  const title = entryTitle(scenario, entry);
  const answers = entry.valid && findReason(reason).finding && e.answers[reason]?.choice !== 'unsatisfactory' ? { ...e.answers, [reason]: { choice: 'unsatisfactory', corrected: false } } : e.answers;
  const next = resetDownstream({ ...e, answers, frustrations: [...(e.frustrations || []), entry],
    frustrationFeedback: entry.valid ? `Asset frustrated: ${title}.` : `Asset frustrated, but this shipment does not have that discrepancy (${title}). Recheck and release it.` });
  return entry.valid ? next : recordMistake(next, 'frustration', `Frustrated for "${title}", which this piece does not have`, 'DTR Part III App O K.2.j');
}
export function fixFrustration(scenario, e, index) {
  const entry = e.frustrations[index];
  if (!entry || !fixReadiness(scenario, e, entry.reason).ready) return e;
  if (entry.reason === 'paperwork') {
    const short = shortDocuments(scenario, e, entry.subject);
    return resetDownstream({ ...e, documentCopies: { ...e.documentCopies, ...Object.fromEntries(short.map(d => [d.id, d.minimum])) }, documentsVerified: { ...e.documentsVerified, ...Object.fromEntries(short.map(d => [d.id, false])) }, frustrationFeedback: 'Missing copies received. Recount them in Precheck.' });
  }
  if (documentError(scenario, entry.reason)) {
    const doc = ERROR_DOCUMENT[entry.reason];
    return resetDownstream({ ...e, docFixes: { ...e.docFixes, [doc]: true }, documentsVerified: { ...e.documentsVerified, [doc]: false }, attlaLetterVerified: doc === 'attla' ? false : e.attlaLetterVerified, hazdecReviewed: doc === 'hazdec' ? false : e.hazdecReviewed, frustrationFeedback: 'Corrected document received from the shipper. Re-verify it in Precheck.' });
  }
  if (entry.reason === 'other') return { ...e, frustrations: e.frustrations.map((item, i) => i === index ? { ...item, resolved: true } : item), frustrationFeedback: 'Corrective action recorded.' };
  return resetDownstream({ ...e, answers: { ...e.answers, [entry.reason]: { choice: 'unsatisfactory', corrected: true } }, frustrationFeedback: `${findReason(entry.reason).title}: correction simulated and reinspected.` });
}
export function releaseFrustration(scenario, e, index) {
  const entry = e.frustrations[index];
  if (!entry || !reasonFixed(scenario, e, entry)) return e;
  const frustrations = e.frustrations.map((item, i) => i === index ? { ...item, released: true } : item);
  return { ...e, frustrations, frustrationFeedback: isFrustrated({ frustrations }) ? 'Reason released. Other frustration reasons remain open.' : 'Asset released from frustration.' };
}
