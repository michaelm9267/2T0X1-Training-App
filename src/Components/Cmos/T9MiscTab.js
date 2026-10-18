import { useState } from 'react';
import { Dialog } from '../CdfCmos/controls';
import { editRecord } from './model';

// CMOS T-9 Misc tab: a list of 26-character lines. New opens the entry dialog, where Add T-9 Misc
// adds each line in order; a line is selected with a click and edited with a double-click.
export const T9_LINE_LENGTH = 26;
export const t9Entries = draft => draft.t9Entries || (draft.t9Remarks ? String(draft.t9Remarks).split('\n') : []);

function T9Entry({ initial, editing, locked, onAdd, onSave, onDelete, onClose }) {
  const [text, setText] = useState(initial);
  const [index, setIndex] = useState(editing);
  const [invalid, setInvalid] = useState(false);
  const line = text.trim();
  // Save keeps the line being edited; a new line becomes the edited line, so a second Save
  // does not add it twice.
  const save = () => {
    if (!line) { setInvalid(true); return false; }
    setInvalid(false);
    if (index === null) setIndex(onAdd(line)); else onSave(index, line);
    return true;
  };
  return <Dialog title="T-9 Miscellaneous" onClose={onClose} overlayClassName="shared-t9-overlay">
    <div className="shared-t9-entry">
      <label>
        <span><span className="shared-required">*</span> T-9 Miscellaneous Entry</span>
        <input aria-label="T-9 Miscellaneous Entry" className={invalid ? 'shared-invalid' : undefined} maxLength={T9_LINE_LENGTH} autoFocus readOnly={locked}
          value={text} onChange={e => { setText(e.target.value.toUpperCase().slice(0, T9_LINE_LENGTH)); setInvalid(false); }} />
      </label>
      <footer>
        <button type="button" disabled={locked} onClick={() => {
          if (!line) { setInvalid(true); return; }
          onAdd(line); setText(''); setIndex(null);
        }}>Add T-9 Misc</button>
        <button type="button" disabled={locked} onClick={save}>Save</button>
        <button type="button" disabled={locked} onClick={() => { if (save()) onClose(); }}>Save and Close</button>
        <button type="button" disabled={locked || index === null} onClick={() => { onDelete(index); onClose(); }}>Delete</button>
        <button type="button" onClick={onClose}>Close</button>
      </footer>
    </div>
  </Dialog>;
}

export default function T9MiscTab({ store, id, draft, locked, change }) {
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('');
  const [entry, setEntry] = useState(null);
  const entries = t9Entries(draft);
  // The dialog edits the latest store, so each change builds on the one before it.
  const latest = { store, entries };
  const write = next => {
    latest.store = editRecord(latest.store, 'shipments', id, { t9Entries: next, t9Remarks: next.join('\n') });
    latest.entries = next;
    change(latest.store);
  };
  const remove = index => { write(latest.entries.filter((_, i) => i !== index)); setSelected(null); };
  const rows = entries.map((text, index) => ({ text, index })).filter(r => r.text.toUpperCase().includes(filter.toUpperCase()));
  return <div className="shared-t9-list">
    <div className="shared-toolbar">
      <button type="button" disabled={locked} onClick={() => setEntry({ initial: '', editing: null })}>New</button>
      <button type="button" disabled={locked || selected === null} onClick={() => remove(selected)}>Delete</button>
      <button type="button" onClick={() => { setSelected(null); setFilter(''); }}>Clear</button>
    </div>
    <div className="shared-table-scroll shared-t9-scroll"><table className="shared-table">
      <thead>
        <tr className="shared-piece-filter-strip"><th><input aria-label="Filter T-9 Miscellaneous Entries" value={filter} onChange={e => setFilter(e.target.value)} /></th></tr>
        <tr><th scope="col">T-9 Miscellaneous Entries</th></tr>
      </thead>
      <tbody>{rows.map(r => <tr key={r.index} aria-label={r.text} aria-selected={selected === r.index} tabIndex={0} title="Double-click to edit"
        onClick={() => setSelected(r.index)}
        onDoubleClick={() => { setSelected(r.index); setEntry({ initial: r.text, editing: r.index }); }}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); setSelected(r.index); setEntry({ initial: r.text, editing: r.index }); } }}>
        <td>{r.text}</td>
      </tr>)}</tbody>
    </table>{!rows.length && <p>No data to display.</p>}</div>
    <div className="shared-piece-count">{rows.length} row(s) found.</div>
    {entry && <T9Entry key={`${entry.editing}`} {...entry} locked={locked}
      onAdd={line => { write([...latest.entries, line]); return latest.entries.length - 1; }}
      onSave={(index, line) => write(latest.entries.map((text, i) => i === index ? line : text))}
      onDelete={remove}
      onClose={() => setEntry(null)} />}
  </div>;
}
