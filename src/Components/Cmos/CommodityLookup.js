import { useState } from 'react';
import { Dialog } from '../CdfCmos/controls';
import { COMMODITY_CODES, SPECIAL_HANDLING_CODES } from './commodityReference';

// Air Commodity and Special Handling Lookup: pick a commodity code on the left and a special
// handling code on the right; Select returns the two-character Commodity S/H value.
function CodePane({ name, column, rows, selected, onPick }) {
  const [filters, setFilters] = useState(['', '']);
  const matches = rows.filter(row => filters.every((query, i) => row[i].toUpperCase().includes(query.toUpperCase())));
  return <div className="shared-commodity-pane">
    <div className="shared-reference-toolbar"><button type="button" onClick={() => setFilters(['', ''])}>Clear</button></div>
    <div className="shared-reference-scroll"><table>
      <thead>
        <tr>{[column, 'Description'].map((title, i) => <th key={title}><input aria-label={`Filter ${name} ${title}`} value={filters[i]} onChange={event => setFilters(filters.map((v, j) => j === i ? event.target.value : v))} /></th>)}</tr>
        <tr><th>{column}</th><th>Description</th></tr>
      </thead>
      <tbody>{matches.map(([code, text]) => <tr key={code} aria-label={`${name} ${code} ${text}`} aria-selected={selected === code} tabIndex={0}
        onClick={() => onPick(code)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onPick(code); } }}>
        <td>{code}</td><td title={text}>{text}</td>
      </tr>)}</tbody>
    </table></div>
    <div className="shared-reference-count">{matches.length} row(s) found.</div>
  </div>;
}

export default function CommodityLookup({ value = '', onSelect, onClose }) {
  const [cmd, setCmd] = useState(COMMODITY_CODES.some(([c]) => c === value[0]) ? value[0] : '');
  const [sh, setSh] = useState(SPECIAL_HANDLING_CODES.some(([c]) => c === value[1]) ? value[1] : '');
  return <Dialog title="Air Commodity and Special Handling Lookup" onClose={onClose} overlayClassName="shared-reference-overlay shared-commodity-overlay">
    <div className="shared-reference-lookup shared-commodity-lookup">
      <label className="shared-commodity-value">Commodity S/H<input aria-label="Selected Commodity S/H" readOnly value={cmd + sh} /></label>
      <div className="shared-commodity-panes">
        <CodePane name="Commodity" column="CMD" rows={COMMODITY_CODES} selected={cmd} onPick={setCmd} />
        <CodePane name="Special Handling" column="S/H" rows={SPECIAL_HANDLING_CODES} selected={sh} onPick={setSh} />
      </div>
      <footer>
        <button type="button" disabled={!cmd || !sh} onClick={() => { onSelect(cmd + sh); onClose(); }}>Select</button>
        <button type="button" onClick={onClose}>Close</button>
      </footer>
    </div>
  </Dialog>;
}
