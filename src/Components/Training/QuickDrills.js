import RegulationHelp from '../Regulations/RegulationHelp';
import { useMemo, useRef, useState } from 'react';
import { DODAAC_INFO, DESTINATIONS, tcnIncrement, tcnUln } from '../CargoWindow/workflow';
import { calculateCB } from '../CargoWindow/centerOfBalance';
import useModalDialog from './useModalDialog';
import './training-tools.css';

const random = max => Math.floor(Math.random() * max);
function makeDrill(topic, round) {
  void round;
  if (topic === 'tcn') { const tcn = `F00001$$E${String(1001 + random(8999)).padStart(4, '0')}00XX`; return { prompt: `Enter the increment from TCN ${tcn}`, answer: tcnIncrement(tcn), explanation: `ULN ${tcnUln(tcn)}; increment ${tcnIncrement(tcn)}.` }; }
  if (topic === 'dodaac') { const code = DESTINATIONS[random(DESTINATIONS.length)]; return { prompt: `Which aerial port serves ${code}?`, answer: DODAAC_INFO[code].port, explanation: `${code} routes through ${DODAAC_INFO[code].port}.` }; }
  if (topic === 'inspection') {
    const questions = [
      { prompt: 'An engine-powered asset arrives with 2 HAZDEC copies. How many additional copies are needed?', answer: '1', explanation: 'This exercise requires three HAZDEC copies for an engine-powered asset.' },
      { prompt: 'A vehicle fuel gauge reads ⅜ tank against this scenario’s ¼-tank target. Enter S for satisfactory or U for unsatisfactory.', answer: 'U', explanation: '⅜ exceeds the scenario target, so the condition is unsatisfactory.' },
      { prompt: 'An ISU door has a combination lock with no combination tape above it, and the deploying representative does not know the combination. Enter S for satisfactory or U for unsatisfactory.', answer: 'U', explanation: 'The container must be accessible for inspection.' },
    ];
    return questions[round % questions.length];
  }
  const d1 = 28 + random(10), d2 = 150 + random(20), w1 = 5000 + random(8) * 100, w2 = 3800 + random(8) * 100;
  const cb = calculateCB([{ distance: d1, weight: w1 }, { distance: d2, weight: w2 }], w1 + w2).rounded;
  return { prompt: `Calculate CB: D1 ${d1} in × W1 ${w1} lb; D2 ${d2} in × W2 ${w2} lb; GWT ${w1 + w2} lb. Round to a whole inch.`, answer: String(cb), explanation: `The rounded CB is ${cb} inches aft of the RDL.` };
}

export default function QuickDrills({ onClose }) {
  const dialog = useRef(null);
  const [topic, setTopic] = useState('cb');
  const [round, setRound] = useState(0);
  const drill = useMemo(() => makeDrill(topic, round), [topic, round]);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState('');
  useModalDialog(dialog, onClose);
  const reset = next => { setTopic(next); setAnswer(''); setFeedback(''); setRound(value => value + 1); };
  return <div className="cmos-overlay" onMouseDown={event => event.target === event.currentTarget && onClose()}>
    <article className="training-tool-sheet drill-sheet" role="dialog" aria-modal="true" aria-label="Quick drills" tabIndex={-1} ref={dialog}>
      <div className="training-tool-header"><strong>Quick drills</strong><button type="button" aria-label="Close quick drills" onClick={onClose}>×</button></div>
      <label>Drill topic<select aria-label="Drill topic" value={topic} onChange={event => reset(event.target.value)}><option value="cb">Center of balance</option><option value="tcn">TCN decoding</option><option value="dodaac">DoDAAC and port</option><option value="inspection">Appendix O inspection</option></select></label>
      <RegulationHelp claims={topic === 'cb' ? ['cargo.cb', 'cargo.cbReweigh'] : topic === 'tcn' ? ['outbound.tcn'] : topic === 'inspection' ? ['cargo.access', 'documents.hazdec'] : []} assumptions={['Fictional routing destinations, example values, document copy counts, and selected fuel targets belong to the exercise.']} />
      <p className="drill-prompt">{drill.prompt}</p>
      <label>Your answer<input value={answer} onChange={event => { setAnswer(event.target.value); setFeedback(''); }} /></label>
      <div className="answer-options"><button type="button" className="primary-button" onClick={() => setFeedback(answer.trim() ? (answer.trim().toUpperCase() === drill.answer.toUpperCase() ? `Correct. ${drill.explanation}` : `Recheck your answer. ${drill.explanation}`) : 'Enter an answer before checking.')}>Check answer</button><button type="button" onClick={() => reset(topic)}>New question</button></div>
      {feedback && <p role="alert" className="drill-feedback">{feedback}</p>}
    </article>
  </div>;
}
