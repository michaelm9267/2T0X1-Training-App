// Practice mode: which section the trainee is practicing, how it is going, and a fresh start.
// Earlier sections come already done, so the trainee works only this one.
export default function PracticeBar({ sections, section, onStart, complete, mistakes = [], note }) {
  const title = sections.find(item => item.id === section)?.title || section;
  return <section className="training-card practice-bar" aria-label="Practice">
    <div className="shipment-bar">
      <label>Practice section <select value={section} onChange={event => onStart(event.target.value)}>{sections.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
      <span className={`practice-status ${complete ? 'is-complete' : ''}`} role="status">{complete ? `${title} complete` : `${title} in progress`} · {mistakes.length} {mistakes.length === 1 ? 'mistake' : 'mistakes'} · not scored</span>
      <button type="button" className={complete ? 'primary-button' : undefined} onClick={() => onStart(section)}>Practice again with a new {note || 'shipment'}</button>
    </div>
    {mistakes.length > 0 && <details className="practice-mistakes"><summary>What went wrong ({mistakes.length})</summary>
      <ul className="mistake-list">{mistakes.map((mistake, index) => <li key={index}>{mistake.detail} <span className="task-source">{mistake.reference}</span></li>)}</ul>
    </details>}
  </section>;
}
