import React, { useEffect, useState } from 'react';
import { citeLabel, findPassage, findTable, Highlighted, highlightTerms, loadPassages, loadTables, RegulationTable } from './RegulationPassage';

// Hand-written explanations for the questions where two choices most often sound right, keyed by
// question id: { why, wrong: { [wrong choice]: reason }, watch? }. Loaded on first use.
let explanations;
const loadExplanations = () => {
  explanations = explanations || import('./explanations.json').then(module => module.default || module).catch(() => { explanations = undefined; return {}; });
  return explanations;
};

export { highlightTerms };

// Why the answer is right, why each other choice is wrong (when written), the governing passage,
// and any exception that is easy to confuse. `picked` marks the reader's wrong choice.
export default function AnswerExplanation({ item, publication, picked, open = false }) {
  const [passage, setPassage] = useState(undefined);
  const [note, setNote] = useState(undefined);
  const [table, setTable] = useState(null);
  useEffect(() => {
    let live = true;
    loadTables().then(data => { if (live) setTable(findTable(data, item)); });
    loadPassages(item.passageSet || item.setId).then(data => { if (live) setPassage(findPassage(data, item)); });
    loadExplanations().then(data => { if (live) setNote(data[item.id] || null); });
    return () => { live = false; };
  }, [item]);
  if (!item.wrong) return null;
  const label = citeLabel(item, publication);
  const others = item.wrong.filter(choice => note?.wrong?.[choice]);

  return (
    <details className="waps-explain" open={open}>
      <summary>Why this is the answer</summary>
      <h5>Why “{item.answer}” is correct</h5>
      <p>{note?.why || (passage || table ? `${label} states it directly. The words that match the answer are highlighted ${table ? 'in the table' : 'in the passage'} below.` : `See ${label}.`)}</p>
      {others.length > 0 && <>
        <h5>Why the other choices are wrong</h5>
        <ul className="waps-explain-wrong">
          {others.map(choice => <li key={choice} className={choice === picked ? 'picked' : undefined}>
            <strong>{choice}</strong>{choice === picked && <em> (your answer)</em>}: {note.wrong[choice]}
          </li>)}
        </ul>
      </>}
      <h5>Governing passage · {label}</h5>
      {table && <>
        <RegulationTable table={table} answer={item.answer} />
        <small className="waps-muted">{passage?.edition && `${passage.edition} · `}PDF page {table.page}</small>
      </>}
      {!table && passage === undefined && <p className="waps-muted">Loading the regulation text…</p>}
      {!table && passage === null && <p className="waps-muted">The exact wording for this citation is not available.</p>}
      {!table && passage && <>
        <blockquote><Highlighted text={passage.quote} answer={item.answer} /></blockquote>
        <small className="waps-muted">{passage.edition} · PDF page {passage.page}</small>
      </>}
      {note?.watch && <>
        <h5>Watch out</h5>
        <p>{note.watch}</p>
      </>}
    </details>
  );
}
