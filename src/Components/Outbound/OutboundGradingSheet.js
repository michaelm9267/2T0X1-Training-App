import { GradingSheet } from '../Session/Grading';
import { MIL_MODES } from './outboundLogic';
import { MISTAKE_STEP, gradeOutbound } from './outboundGrading';

// The outbound grading sheet: trainee, final score, and what went wrong on each customer.
export default function OutboundGradingSheet({ trainee, origin, shipments, exercises, finishedAt, onClose }) {
  const { customers, final, mistakePoints } = gradeOutbound(shipments, exercises);
  return <GradingSheet heading="Outbound Training Grading Sheet" subtitle={`${origin.unit} · ${origin.name} (${origin.cmosDodaac})`} trainee={trainee} finishedAt={finishedAt} final={final} onClose={onClose}
    boxes={[['Customers shipped', `${customers.filter(c => c.complete).length} of ${customers.length}`]]}
    scoringNote={`Each customer starts at 100. Each mistake costs ${mistakePoints} points. A customer not shipped when the test was finished scores 0. The final score averages all ${customers.length} customers. CMOS entries are not graded; the evaluator reviews them with the trainee.`}
    columns={['Customer', 'Item', 'Document', 'TCN', 'Mil Mode', 'Status', 'Mistakes', 'Score']}
    rows={customers.map(c => [c.serial, c.item, `DD ${c.document}`, c.tcn, c.milMode ? `${c.milMode} · ${MIL_MODES[c.milMode]}` : '—', c.complete ? 'Shipped' : 'Not shipped', c.mistakes.length, c.score])}
    sections={customers.map(c => ({ key: c.key, label: `Customer ${c.serial}`, title: `Customer ${c.serial} · ${c.item} · Score ${c.score}`,
      note: c.complete ? null : `Not shipped. ${c.steps.length ? `Completed: ${c.steps.join(', ')}.` : 'No steps completed.'}`,
      mistakes: c.mistakes.map(m => ({ detail: m.detail, step: MISTAKE_STEP[m.kind] || m.kind, reference: m.reference })) }))} />;
}
