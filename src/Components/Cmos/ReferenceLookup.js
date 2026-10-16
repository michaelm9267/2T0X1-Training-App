import { useState } from 'react';
import { Dialog } from '../CdfCmos/controls';

export default function ReferenceLookup({ title, columns, rows, valueIndex = 0, onSelect, onClose }) {
  const [filters, setFilters] = useState(columns.map(() => ''));
  const [selected, setSelected] = useState(null);
  const matches = rows.filter(row => filters.every((query, index) => String(row[index]).toUpperCase().includes(query.toUpperCase())));
  const select = row => { onSelect(row[valueIndex]); onClose(); };
  return <Dialog title={title} onClose={onClose} overlayClassName="shared-reference-overlay">
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
        <tbody>{matches.map(row => <tr key={row[0]} aria-label={row.join(' ')} aria-selected={selected === row[0]} tabIndex={0} onClick={() => setSelected(row[0])} onDoubleClick={() => select(row)} onKeyDown={event => {
          if (event.key === 'Enter') { event.preventDefault(); select(row); }
          else if (event.key === ' ') { event.preventDefault(); setSelected(row[0]); }
        }}>{row.map((value, index) => <td key={index} title={value}>{index === 0 && <input className="shared-reference-radio" type="radio" aria-label={`Select ${row[0]}`} checked={selected === row[0]} onChange={() => setSelected(row[0])} />}{value}</td>)}</tr>)}</tbody>
      </table></div>
      <div className="shared-reference-count">{matches.length} row(s) found.</div>
      <footer><button disabled={selected === null} onClick={() => select(rows.find(row => row[0] === selected))}>Select</button><button onClick={onClose}>Close</button></footer>
    </div>
  </Dialog>;
}
