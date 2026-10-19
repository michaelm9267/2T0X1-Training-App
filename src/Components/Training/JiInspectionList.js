import RegulationHelp, { RegulationReference } from '../Regulations/RegulationHelp';
import { useState } from 'react';
import { BLOCKS, ROWS, CHECKS, APPLIES } from '../CargoWindow/dd2133';
import FloatingWindow from '../Session/FloatingWindow';
import './training-tools.css';

// Reference list of every DD Form 2133 JI inspection item: what to check, which items it applies
// to, and its DTR Part III App O paragraph. Opens from the tools menu at any stage.
export default function JiInspectionList({ onClose }) {
  const [query, setQuery] = useState('');
  const match = row => `${row.id} ${row.label} ${CHECKS[row.id]}`.toLowerCase().includes(query.trim().toLowerCase());
  return <FloatingWindow title={<strong>JI inspection list</strong>} label="JI inspection list" closeLabel="Close JI inspection list" onClose={onClose} className="training-tool-sheet" titleClass="training-tool-header">
    <h2>DD Form 2133 · Joint Airlift Inspection Record/Checklist</h2>
    <p>Mark each item in the piece's column: <strong>√</strong> satisfactory, <strong>✗</strong> unsatisfactory, <strong>ⓧ</strong> (circled ✗) once corrected, <strong>–</strong> not applicable. Mark every item in blocks 11 and 12. Use only the one of blocks 13–15 that fits the item (vehicles 13, pallets and ISUs 14, helicopters 15) and leave the others blank.</p>
    <p className="reference-note">DTR Part III App O K.2 (3 February 2023). Summaries for training; the appendix governs.</p>
    <RegulationHelp claims={['inspection.scope', 'inspection.legend', 'inspection.corrections']} />
    <label className="tool-search">Search inspection items<input aria-label="Search inspection items" value={query} onChange={event => setQuery(event.target.value)} /></label>
    {BLOCKS.map(block => {
      const rows = ROWS.filter(row => row.block === block.id && match(row));
      return rows.length > 0 && <section key={block.id} className="ji-list-block" aria-label={`Block ${block.id} ${block.title}`}>
        <h3>{block.id}. {block.title}</h3>
        <p className="ji-list-applies">Applies to: {APPLIES[block.id]}{block.note ? ` · ${block.note}` : ''}</p>
        <dl className="ji-list">{rows.map(row => <div key={row.id}>
          <dt>{row.sub ? '' : `${row.id.replace(/^\d+/, '')}. `}{row.label}</dt>
          <dd><RegulationReference reference={`DTR Part III App O ${row.paragraph}`}>{CHECKS[row.id]}</RegulationReference> <RegulationReference reference={`DTR Part III App O ${row.paragraph}`} >App O {row.paragraph} · {row.page}</RegulationReference></dd>
        </div>)}</dl>
      </section>;
    })}
    {!ROWS.some(match) && <p role="status">No inspection items match “{query}”.</p>}
  </FloatingWindow>;
}
