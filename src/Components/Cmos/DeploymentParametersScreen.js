import { useState } from 'react';
import { Dialog, Fields, Lookup } from './controls';
import { field } from './referenceInventory';
import { createRecord, editRecord, saveRecord, deleteRecord } from './model';
import { ediForMilMode } from './modeReference';
import { DEPLOYMENT_EXERCISE, ATCMD_REQ, ADVICE_NUMBERS, emptyDeployment, deploymentErrors } from './deploymentLogic';

const COLUMNS = [['dsoeId', 'DSOE ID'], ['deploymentExercise', 'Deployment / Exercise'], ['localMajcomExercise', 'Local / MAJCOM Exercise'],
  ['milMode', 'MIL Mode'], ['ediMode', 'EDI Mode'], ['origin', 'Consignor'], ['poe', 'POE'], ['projectCode', 'Project Code'], ['tac', 'TAC'],
  ['destination', 'Consignee'], ['pod', 'POD'], ['atcmdReq', 'ATCMD Req'], ['exportMode', 'Export Mode'], ['adviceNumber', 'Advice Number'], ['eta', 'ETA']];
const contains = (value, query) => !query || String(value || '').toUpperCase().includes(String(query).toUpperCase().replace(/%/g, ''));
const described = (label, id, entries, extra = {}) => ({
  ...field(label, id, 'select', entries.map(([code]) => code)),
  optionLabels: Object.fromEntries(entries.map(([code, text]) => [code, `${code} - ${text}`])), ...extra,
});
const req = (f) => ({ ...f, required: true });

function ParametersDialog({ store, record, locked, change, setMessage, onClose, adviceNumbers }) {
  const [lookup, setLookup] = useState(null);
  const [errors, setErrors] = useState([]);
  const draft = { ...emptyDeployment(), ...record.draft };
  const edit = (key, value) => {
    if (locked) return;
    const patch = { [key]: value };
    // EDI Mode is filled once the MIL Mode is decided.
    if (key === 'milMode') patch.ediMode = ediForMilMode(value);
    change(editRecord(store, 'deployments', record.id, patch));
  };
  const columns = [
    [
      { ...req(field('DSOE ID', 'dsoeId')), lookup: false, placeholder: '', help: 'Enter 5 characters.' },
      req(described('Deployment / Exercise', 'deploymentExercise', DEPLOYMENT_EXERCISE)),
      // Opens only when CMOS runs in Exercise mode; filled by the system until then.
      { ...field('Local / MAJCOM Exercise', 'localMajcomExercise'), readOnly: true, lookup: false },
    ],
    [
      req(field('MIL Mode', 'milMode')), field('EDI Mode', 'ediMode'), field('POE', 'poe'), field('POD', 'pod'),
      { ...field('Project Code', 'projectCode'), lookup: false }, { ...field('TAC', 'tac'), lookup: false },
    ],
    [
      { ...req(field('Consignor', 'origin')), lookupLabel: 'Consignor' }, { ...field('Consignee', 'destination'), lookupLabel: 'Consignee' },
      described('ATCMD Req', 'atcmdReq', ATCMD_REQ), { ...field('Export Mode', 'exportMode'), lookup: false },
      { ...field('Advice Number', 'adviceNumber'), lookup: adviceNumbers }, { ...field('ETA', 'eta'), lookup: false },
    ],
  ];
  const save = (close) => {
    const found = deploymentErrors(draft, store.deployments, record.id);
    setErrors(found);
    if (found.length) return;
    change(saveRecord(editRecord(store, 'deployments', record.id, { dsoeId: draft.dsoeId.trim().toUpperCase() }), 'deployments', record.id));
    setMessage(<span className="shared-edit-ok"><strong>Transaction Successfully Processed</strong><br />Record Saved</span>);
    if (close) onClose(false);
  };
  const close = () => onClose(!record.saved);
  return <Dialog title="Set Deployment Parameters" onClose={close} wide overlayClassName="shared-deployment-overlay">
    <div className="shared-deployment-form">
      <div className="shared-deployment-columns">
        {columns.map((fields, i) => <Fields key={i} fields={fields} values={draft} onEdit={edit} locked={locked} openLookup={(f, rows) => setLookup({ f, rows })} />)}
      </div>
      {errors.length > 0 && <ul className="shared-schedule-errors" role="alert">{errors.map((e) => <li key={e}>{e}</li>)}</ul>}
      <footer>
        <button type="button" className="shared-deployment-terminate" disabled={locked || !record.saved} onClick={() => {
          change({ ...store, deployments: { ...store.deployments, [record.id]: { ...record, terminated: true } } });
          setMessage(<span className="shared-edit-ok"><strong>Transaction Successfully Processed</strong><br />Deployment Parameters Terminated</span>);
          onClose(false);
        }}>Terminate</button>
        <span />
        <button type="button" disabled={locked} onClick={() => save(false)}>Save</button>
        <button type="button" disabled={locked} onClick={() => save(true)}>Save and Close</button>
        <button type="button" onClick={close}>Close</button>
      </footer>
    </div>
    {lookup && <Lookup field={lookup.f} rows={lookup.rows} onSelect={(value) => edit(lookup.f.id, value)} onClose={() => setLookup(null)} />}
  </Dialog>;
}

export default function DeploymentParametersScreen({ store, change, locked, setMessage, adviceNumbers = ADVICE_NUMBERS }) {
  const [filters, setFilters] = useState({});
  const [openId, setOpenId] = useState(null);
  const records = Object.values(store.deployments || {});
  const rows = records.filter((r) => r.saved && !r.terminated)
    .filter((r) => Object.entries(filters).every(([key, value]) => contains(r.saved[key], value)))
    .sort((a, b) => String(a.saved.dsoeId).localeCompare(String(b.saved.dsoeId)));
  const open = openId && store.deployments?.[openId];
  return <div className="shared-deployment">
    <div className="shared-deployment-grid">
      <div className="shared-toolbar">
        <button type="button" disabled={locked} onClick={() => {
          const next = createRecord(store, 'deployments', emptyDeployment());
          change(next); setOpenId(next.selection.deployments);
        }}>New</button>
        <button type="button" onClick={() => setFilters({})}>Clear</button>
      </div>
      <div className="shared-table-scroll"><table className="shared-table">
        <thead>
          <tr className="shared-air-filters">{COLUMNS.map(([key, label]) => <th key={key}><input aria-label={`Filter ${label}`} value={filters[key] || ''} onChange={(e) => setFilters({ ...filters, [key]: e.target.value })} /></th>)}</tr>
          <tr>{COLUMNS.map(([key, label]) => <th key={key} scope="col">{label}</th>)}</tr>
        </thead>
        <tbody>{rows.map((r) => <tr key={r.id} aria-selected={openId === r.id}>
          {COLUMNS.map(([key]) => <td key={key}>{key === 'dsoeId'
            ? <button type="button" className="shared-air-manifest-link" aria-label={`Open DSOE ${r.saved.dsoeId}`} onClick={() => setOpenId(r.id)}>{r.saved.dsoeId}</button>
            : r.saved[key]}</td>)}
        </tr>)}</tbody>
      </table>{!rows.length && <p>No data to display.</p>}</div>
      <div className="shared-piece-count">{rows.length} row(s) found.</div>
    </div>
    {open && <ParametersDialog store={store} record={open} locked={locked} change={change} setMessage={setMessage} adviceNumbers={adviceNumbers}
      onClose={(discard) => {
        if (discard && store.deployments?.[open.id]) change(deleteRecord(store, 'deployments', open.id));
        setOpenId(null);
      }} />}
  </div>;
}
