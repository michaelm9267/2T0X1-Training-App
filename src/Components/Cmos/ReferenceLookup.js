import { useState } from 'react';
import { Dialog } from '../CdfCmos/controls';

// Rows are tracked by position, so a code may appear on several rows (e.g. one DSOE with
// several chalks). onSelect receives the value column and the whole row.
export default function ReferenceLookup({ title, columns, rows, valueIndex = 0, onSelect, onClose }) {
  const [filters, setFilters] = useState(columns.map(() => ''));
  const [selected, setSelected] = useState(null);
  const matches = rows.map((row, index) => ({ row, index }))
    .filter(({ row }) => filters.every((query, index) => String(row[index]).toUpperCase().includes(query.toUpperCase())));
  const select = row => { onSelect(row[valueIndex], row); onClose(); };
  return <Dialog title={title} bare onClose={onClose} overlayClassName="shared-reference-overlay">
    <div className={`shared-reference-lookup ${columns.length === 3 ? 'shared-mode-reference' : columns[0] === 'CIIC' ? 'shared-ciic-reference' : ''}`}>
      <div className="shared-reference-toolbar"><button onClick={() => { setFilters(columns.map(() => '')); setSelected(null); }}>Clear</button></div>
      <div className="shared-reference-scroll"><table>
        <thead>
          <tr>{columns.map((column, index) => <th key={column}><input aria-label={index === columns.length - 1 ? 'Lookup search' : `Filter ${column}`} value={filters[index]} onChange={event => {
            setFilters(filters.map((value, i) => i === index ? event.target.value : value));
            setSelected(null);
          }} /></th>)}</tr>
          <tr>{columns.map(column => <th key={column}>{column}</th>)}</tr>
        </thead>
        <tbody>{matches.map(({ row, index }) => <tr key={index} aria-label={row.filter(v => v !== '').join(' ')} aria-selected={selected === index} tabIndex={0} onClick={() => setSelected(index)} onDoubleClick={() => select(row)} onKeyDown={event => {
          if (event.key === 'Enter') { event.preventDefault(); select(row); }
          else if (event.key === ' ') { event.preventDefault(); setSelected(index); }
        }}>{row.map((value, i) => <td key={i} title={value}>{i === 0 && <input className="shared-reference-radio" type="radio" aria-label={`Select ${row[0]}`} checked={selected === index} onChange={() => setSelected(index)} />}{value}</td>)}</tr>)}</tbody>
      </table></div>
      <div className="shared-reference-count">{matches.length} row(s) found.</div>
      <footer><button disabled={selected === null} onClick={() => select(rows[selected])}>Select</button><button onClick={onClose}>Close</button></footer>
    </div>
  </Dialog>;
}
