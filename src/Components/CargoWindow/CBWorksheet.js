import { axleCode, axleLabels } from './axles';
import { calculateCB } from './centerOfBalance';
export const APPENDIX_P_URL = 'https://www.business.ustranscom.mil/dtr/part-iii/dtr_part_iii_app_p.pdf';

export default function CBWorksheet({ scenario, exercise, onCBCalculate }) {
  const inputs = exercise.notebookEntries;
  const result = exercise.cbResult;
  const format = value => value.toLocaleString('en-US', { maximumFractionDigits: 2 });
  const matches = result && !result.error && result.axles.every((row, index) => Math.abs(row.distance - scenario.axles[index].position) < .1 && Math.abs(row.weight - scenario.axles[index].weight) < .1) && Math.abs(result.grossWeight - scenario.weight) < .1;
  function calculate(event) {
    event.preventDefault();
    if ([...axleLabels(scenario).flatMap(axle => [axle.distanceId,axle.weightId]),'gross'].some(id => inputs[id] === undefined)) { onCBCalculate({ error: `Record ${axleLabels(scenario).map(axle => `${axle.distanceId}, ${axle.weightId} (${axle.code})`).join(', ')}, and GWT in the notebook first.` }); return; }
    onCBCalculate(calculateCB(scenario.axles.map((axle,index) => ({ distance: inputs[`D${index+1}`], weight: inputs[`W${index+1}`] })), inputs.gross));
  }
  return <div className="cb-worksheet">
    <h4>Center-of-balance worksheet</h4>
    <p>Uses recorded notebook entries: {axleLabels(scenario).map(axle => `${axle.weightId} (${axle.code}), ${axle.distanceId}`).join(', ')} and GWT. Every axle distance is measured from the same forward RDL.</p>
    <form onSubmit={calculate} noValidate>
      <p className="cb-formula">CB = [{axleLabels(scenario).map(axle => `(${axle.distanceId} × ${axle.weightId})`).join(' + ')}] ÷ GWT</p>
      <button className="primary-button" type="submit">Calculate CB</button>
    </form>
    {result?.error && <p className="cb-error" role="alert">{result.error}</p>}
    {result && !result.error && <section className="cb-result" aria-label="CB calculation result" aria-live="polite">
      <strong>{result.rounded} inches aft of RDL</strong>
      <table><caption>Moment calculation</caption><thead><tr><th>Axle</th><th>Datum × weight</th><th>Moment (lb-in)</th></tr></thead><tbody>{result.axles.map((row, index) => <tr key={scenario.axles[index].id}><th scope="row">{`D${index+1} × W${index+1} (${axleCode(scenario,index)})`}</th><td>{format(row.distance)} × {format(row.weight)}</td><td>{format(result.moments[index])}</td></tr>)}</tbody></table>
      <p>{format(result.totalMoment)} lb-in ÷ {format(result.grossWeight)} lb = {result.exact.toFixed(2)} in → {result.rounded} in.</p>
      <p>{matches ? 'Your entries match this training shipment.' : 'Your entries differ from this training shipment. Recheck your measured axle positions and scale readings.'}</p>
      <p className="reference-note">Round only the final CB to the nearest whole inch; a half inch rounds up. After determining CB, mark its position and gross weight on both sides of the vehicle.</p>
    </section>}
    <a className="task-source" href={`${APPENDIX_P_URL}#page=2`} target="_blank" rel="noreferrer">Appendix P C.1–3 · III-P-2 · June 2016</a>
    <p className="reference-note">Weigh with secondary cargo secured; changing the load requires reweighing and recomputing CB (Appendix P B.1). This worksheet practices the calculation, using simulated cargo values.</p>
  </div>;
}
