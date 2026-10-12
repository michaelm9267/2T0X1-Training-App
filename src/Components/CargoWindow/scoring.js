import { activeDiscrepancies } from './discrepancies';
import { paperwork } from './workflow';

// After-action scoring. Each piece starts at 100. Every recorded mistake costs 5 points; every
// discrepancy the piece presented but the trainee never caught costs 15 once the piece reaches
// the manifest (before that it is still "not yet found").
export const MISTAKE_POINTS = 5;
export const MISSED_POINTS = 15;

// Discrepancies the piece presented, and whether the trainee caught each one.
export function discrepancyReview(scenario, e) {
  const frustratedFor = reason => (e.frustrations || []).some(entry => entry.valid && entry.reason === reason);
  const items = activeDiscrepancies(scenario).map(item => ({ ...item,
    caught: item.kind === 'finding' ? e.answers?.[item.id]?.choice === 'unsatisfactory' || frustratedFor(item.id) : frustratedFor(item.reason) }));
  const short = paperwork(scenario).filter(d => d.required && d.copies < d.minimum).map(d => ({ id: `copies-${d.id}`, kind: 'document', title: d.copies === 0 ? `${d.title} not brought by the increment monitor` : `Only ${d.copies} of ${d.minimum} ${d.title} copies brought`, reference: 'DTR Part III App O K.2.d(1)–(2)',
    caught: (e.documentCopies?.[d.id] ?? d.copies) >= d.minimum || (e.frustrations || []).some(entry => entry.valid && entry.reason === 'paperwork') }));
  return [...items, ...short];
}

export function pieceResult(scenario, e, doneStages) {
  const reachedManifest = doneStages.includes('manifest') || Boolean(e.manifestAccepted);
  const discrepancies = discrepancyReview(scenario, e).map(item => ({ ...item, status: item.caught ? 'Caught' : reachedManifest ? 'Missed' : 'Not yet found' }));
  const mistakes = e.mistakes || [];
  const missed = discrepancies.filter(item => item.status === 'Missed').length;
  const started = Boolean(e.firstActionAt) || mistakes.length > 0;
  const score = Math.max(0, 100 - MISTAKE_POINTS * mistakes.length - MISSED_POINTS * missed);
  const finishedAt = e.stageTimes?.ji;
  return { started, score, mistakes, discrepancies, missed, done: doneStages, minutes: e.firstActionAt && finishedAt ? Math.round((finishedAt - e.firstActionAt) / 60000) : null };
}

// Overall score: the average of every piece the trainee has started.
export function overallScore(results) {
  const started = results.filter(result => result.started);
  return started.length ? Math.round(started.reduce((sum, result) => sum + result.score, 0) / started.length) : null;
}
