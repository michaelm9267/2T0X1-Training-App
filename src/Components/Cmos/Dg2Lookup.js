import { useState } from 'react';
import { Dialog } from './controls';
import { AFMAN_REFERENCE, DG2_CATALOG, EMERGENCY_CONTACTS, emergencyCategory } from './dg2Reference';

export default function Dg2Lookup({ emergency = false, page2, onSelect, onClose, templateLookup = false }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState(emergency ? emergencyCategory(page2) : 'all');
  const [selected, setSelected] = useState(null);
  const [limit, setLimit] = useState(150);
  const source = emergency ? EMERGENCY_CONTACTS : DG2_CATALOG;
  const text = query.trim().toUpperCase().replace(/^TRN-/, '');
  const rows = source.filter(r => (!emergency || category === 'all' || category === r.category) &&
    Object.values(r).join(' ').toUpperCase().includes(text));
  const choose = r => { if (!r.forbidden && !r.referenceOnly) setSelected(r); };
  const title = emergency ? 'Emergency Contact lookup' : templateLookup ? 'DG2 template lookup' : 'UN number lookup';
  return <Dialog title={title} onClose={onClose} wide overlayClassName="shared-lookup-overlay shared-dg2-lookup-overlay">
    <div className="shared-lookup shared-dg2-lookup">
      <a className="shared-dg2-reference" href={`${AFMAN_REFERENCE.url}#page=${emergency ? 448 : 103}`} target="_blank" rel="noreferrer">{AFMAN_REFERENCE.title} · {emergency ? 'A17.2.9' : 'Table A4.1'}</a>
      <div className="shared-dg2-lookup-query">
        <label>Search<input aria-label="Lookup search" value={query} onChange={e => { setQuery(e.target.value); setLimit(150); }} /></label>
        {emergency && <label>Hazard category<select aria-label="Emergency hazard category" value={category} onChange={e => { setCategory(e.target.value); setSelected(null); }}>
          <option value="all">All AFMAN contacts</option><option value="class1">Class 1 — Explosives</option><option value="radioactive">Class 7 — Radioactive</option><option value="warfare">Biological warfare materials</option><option value="other">Other hazardous materials</option>
        </select></label>}
        <button onClick={() => { setQuery(''); setSelected(null); setLimit(150); }}>Clear</button>
      </div>
      <div className="shared-lookup-scroll"><table>
        <thead><tr><th>Select</th>{(emergency ? ['Hazard', 'Agency', 'Telephone number(s)', 'DSN', 'Notes', 'Reference'] : ['DG2 Template ID', 'UN/NA Number', 'Proper Shipping Name', 'Class/Div', 'Sub Risk', 'PG', 'Special Provisions', 'Packaging Para']).map(x => <th key={x}>{x}</th>)}</tr></thead>
        <tbody>{rows.slice(0, limit).map(r => <tr key={r.id} aria-selected={selected?.id === r.id} className={r.forbidden ? 'shared-dg2-forbidden' : ''} onClick={() => choose(r)} onDoubleClick={() => { if (!r.forbidden && !r.referenceOnly) { onSelect(r); onClose(); } }}>
          <td><input type="radio" aria-label={`Select ${r.id}`} checked={selected?.id === r.id} disabled={r.forbidden || r.referenceOnly} onChange={() => choose(r)} /></td>
          {(emergency ? [r.hazard, r.agency, r.number, r.dsn, r.notes, r.paragraph] : [r.id, r.unId, r.name, r.division, r.subsidiary, r.packingGroup || 'N/A', r.specialProvisions, r.forbidden ? 'FORBIDDEN' : r.referenceOnly ? 'See AFMAN entry' : r.packingPara]).map((v, i) => <td key={i}>{v}</td>)}
        </tr>)}</tbody>
      </table></div>
      {!rows.length && <p>No matching records found.</p>}
      <div className="shared-dg2-lookup-count">{rows.length} row(s) found.{rows.length > limit && <button onClick={() => setLimit(limit + 150)}>Show more</button>}</div>
      <footer><button disabled={!selected} onClick={() => { onSelect(selected); onClose(); }}>Select</button><button onClick={onClose}>Close</button></footer>
    </div>
  </Dialog>;
}
