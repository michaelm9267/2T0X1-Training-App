import { useState } from 'react';
import { createRecord, deleteRecord } from './model';
import { dg2Defaults } from './dg2Reference';
import { generateDocument } from './operations';

const columns = [['piece', 'Piece'], ['templateId', 'DG2 Template ID'], ['hazardLabel', 'Hazard Label'], ['hazardClassName', 'Hazard Class Name'], ['properShippingName', 'Proper Shipping Name']];
export default function Dg2List({ store, shipmentId, locked, change, openEntry, setHazTab, setConfirm, setMessage, apply }) {
  const [selected, setSelected] = useState(null);
  const [filters, setFilters] = useState({});
  const records = Object.values(store.hazards).filter(r => r.draft.shipmentId === shipmentId);
  const source = records.find(r => r.id === selected);
  const value = (r, id) => r.draft[id] ?? r.draft.page2?.[id] ?? '';
  const rows = records.filter(r => columns.every(([id]) => String(value(r, id)).toUpperCase().includes((filters[id] || '').toUpperCase())));
  const open = r => { setSelected(r.id); setHazTab('Page 1'); openEntry('hazards', r.id, 'Hazardous TCN', []); };
  const create = copy => {
    const next = createRecord(store, 'hazards', dg2Defaults(copy ? { ...copy.draft, shipmentId } : { shipmentId, piece: '', certifier: '' }));
    change(next); open(next.hazards[next.selection.hazards]);
  };
  return <div className="shared-dg2-list">
    <div className="shared-dg2-subtitle">DG2</div>
    <div className="shared-toolbar">
      <button disabled={locked} onClick={() => create()}>New</button>
      <button disabled={locked || !source} onClick={() => create(source)}>Copy</button>
      <button disabled={locked || !source} onClick={() => setConfirm({ title: 'Delete DG2 record?', run: () => { change(deleteRecord(store, 'hazards', source.id)); setSelected(null); } })}>Delete</button>
      <button onClick={() => { setSelected(null); setFilters({}); }}>Clear</button>
      <button disabled={!source} onClick={() => {
        if (!source.saved) { setMessage('Save the DG2 record before printing.'); return; }
        apply(generateDocument(store, 'hazards', source.id, 'DG2 Dangerous Goods Declaration'));
      }}>Print DG</button>
    </div>
    <div className="shared-table-scroll"><table className="shared-table">
      <thead>
        <tr className="shared-piece-filter-strip"><th />{columns.map(([id, label]) => <th key={id}><input aria-label={`Filter DG2 ${label}`} value={filters[id] || ''} onChange={e => setFilters({ ...filters, [id]: e.target.value })} /></th>)}</tr>
        <tr><th scope="col"><span className="visually-hidden">Select</span></th>{columns.map(([id, label]) => <th scope="col" key={id}>{label}</th>)}</tr>
      </thead>
      <tbody>{rows.map(r => <tr key={r.id} aria-selected={selected === r.id} onClick={() => setSelected(r.id)}>
        <td><input type="radio" aria-label={`Select DG2 ${r.id}`} checked={selected === r.id} onChange={() => setSelected(r.id)} /></td>
        {columns.map(([id]) => <td key={id}>{id === 'piece' ? <button aria-label={`Edit ${r.id}`} onClick={e => { e.stopPropagation(); open(r); }}>{value(r, id) || 'Edit'}</button> : value(r, id)}</td>)}
      </tr>)}</tbody>
    </table>{!rows.length && <p>No data to display.</p>}</div>
    <div className="shared-piece-count">{rows.length} row(s) found.</div>
  </div>;
}
