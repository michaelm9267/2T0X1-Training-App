import { GradingSheet } from '../Session/Grading';
import { DODAAC_INFO } from '../CargoWindow/workflow';
import { gradeDeployment, STAGE_OF_MISTAKE, MISTAKE_POINTS, MISSED_POINTS } from '../CargoWindow/scoring';

const STAGES = [['precheck', 'Precheck'], ['incheck', 'Incheck'], ['manifest', 'Manifest'], ['ji', 'JI']];

// The CDF grading sheet: trainee, final score, and each piece's mistakes and missed discrepancies,
// then the load plan and manifest release.
export default function CdfGradingSheet({ test, destination, pieces, loadPlan, departure, cdfCmos, onClose }) {
  const { pieces: graded, deploymentMistakes, final } = gradeDeployment(pieces, loadPlan, departure, cdfCmos);
  const step = m => STAGE_OF_MISTAKE[m.kind] || m.kind;
  return <GradingSheet heading="CDF Training Grading Sheet" subtitle={`Deployment to ${destination} (${DODAAC_INFO[destination]?.port})`} trainee={test.trainee} finishedAt={test.finishedAt} final={final} onClose={onClose}
    boxes={[['Pieces through JI', `${graded.filter(p => p.passed).length} of ${graded.length}`], ['Load plan', loadPlan.accepted ? 'Accepted' : 'Not accepted'], ['Manifest', departure.releasedAt ? 'Released' : 'Not released']]}
    scoringNote={`Each piece starts at 100. Each mistake costs ${MISTAKE_POINTS} points; each discrepancy the piece presented but the trainee never caught costs ${MISSED_POINTS}. A piece that had not passed JI when the test was finished scores 0. The final score averages all ${graded.length} pieces, then loses ${MISTAKE_POINTS} points for each CMOS, load plan, or manifest release mistake.`}
    columns={['Piece', 'TCN', 'Stages complete', 'Mistakes', 'Missed discrepancies', 'Score']}
    rows={graded.map(p => [p.title, p.tcn, STAGES.filter(([id]) => p.result.done.includes(id)).map(([, label]) => label).join(', ') || 'None', p.result.mistakes.length, p.result.missed, p.score])}
    sections={[...graded.map(p => ({ key: p.key, label: p.title, title: `${p.title} · ${p.tcn} · Score ${p.score}`,
      note: p.passed ? null : `Did not pass JI. ${p.result.done.length ? `Completed: ${STAGES.filter(([id]) => p.result.done.includes(id)).map(([, label]) => label).join(', ')}.` : 'No stages completed.'}`,
      mistakes: [...p.result.mistakes.map(m => ({ detail: m.detail, step: step(m), reference: m.reference })),
        ...p.result.discrepancies.filter(d => d.status !== 'Caught').map(d => ({ detail: `${d.status === 'Missed' ? 'Missed' : 'Not found'}: ${d.title}`, step: 'Discrepancy', reference: d.reference }))] })),
      { key: 'deployment', label: 'Load plan and release', title: 'Load plan and manifest release', note: departure.releasedAt ? null : 'The manifest was not released.',
        mistakes: deploymentMistakes.map(m => ({ detail: m.detail, step: step(m), reference: m.reference })) }]} />;
}
