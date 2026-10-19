import { useState } from 'react';
import { Dialog } from './controls';
import RegulationHelp, { CodeReference, FieldReference } from '../Regulations/RegulationHelp';
import { assignShipments, createRecord, editRecord, saveRecord } from './model';
import { airAssignmentIds } from './airManifestLogic';
import { today } from './airCargoRows';
import { ASSIGN_TCN_COLUMNS, PALLET_CATEGORIES, PALLET_LIST_COLUMNS, PALLET_TCN_COLUMNS, allPalletIds, assignableTcns, members, newPalletDraft, nextPalletId, palletRecord, palletSummary, tcnRow } from './palletLogic';

// What on these screens is training data rather than a cited rule.
const PALLET_ASSUMPTION = 'Pallet IDs (including the New Special Pallet ID, whose rule is not yet confirmed), Equivalent Positions values, the 44 in pallet/ISU CB, the empty pallets on hand, and the special-pallet cargo filter are training values. Pallet Type and Config Code follow the DTEB definitions linked on their labels.';
const contains = (value, query) => !query || String(value ?? '').toUpperCase().includes(String(query).toUpperCase());

// A CMOS grid: filter row, blue headings, click (ctrl-click adds) to select, row count.
function Grid({ label, columns, rows, keyOf, selected = [], onSelect, link, empty = 'No data to display.' }) {
  const [filters, setFilters] = useState({});
  const shown = rows.filter(row => columns.every(([key]) => contains(row[key], filters[key])));
  const pick = (row, add) => onSelect?.(add ? (selected.includes(keyOf(row)) ? selected.filter(k => k !== keyOf(row)) : [...selected, keyOf(row)]) : [keyOf(row)]);
  return <section className="shared-air-cargo cmos-pallet-grid" aria-label={label}>
    <div className="shared-table-scroll"><table className="shared-table">
      <thead><tr className="shared-air-filters">{columns.map(([key, title]) => <th key={key}>{key === 'date' ? null : <input aria-label={`Filter ${label} ${title}`} value={filters[key] || ''} onChange={e => setFilters({ ...filters, [key]: e.target.value })} />}</th>)}</tr>
        <tr>{columns.map(([key, title]) => <th key={key}>{title}</th>)}</tr></thead>
      <tbody>{shown.map(row => <tr key={keyOf(row)} aria-selected={selected.includes(keyOf(row))} onClick={e => { if (!e.target.closest('button,input')) pick(row, e.ctrlKey || e.metaKey); }}>
        {columns.map(([key], i) => <td key={key} title={String(row[key] ?? '')}>
          {i === 0 && onSelect && <input className="shared-air-select-checkbox" type="checkbox" aria-label={`Select ${row[key]}`} checked={selected.includes(keyOf(row))} onChange={() => pick(row, true)} />}
          {i === 0 && link ? <button className="shared-air-manifest-link" onClick={() => link(row)}>{row[key]}</button> : key === 'configCode' && row[key] ? <CodeReference fieldId="configCode" code={row[key]}>{row[key]}</CodeReference> : String(row[key] ?? '')}
        </td>)}</tr>)}
        {!shown.length && <tr><td colSpan={columns.length}>{empty}</td></tr>}</tbody>
    </table></div>
    <div className="shared-air-count">{shown.length} row(s) found.</div>
  </section>;
}

// Assign TCNs to a pallet. A special pallet offers only hazardous or classified/sensitive cargo.
function AssignTcns({ store, category, onAssign, onClose }) {
  const [selected, setSelected] = useState([]);
  const rows = assignableTcns(store, category).map(r => tcnRow(store, r));
  return <Dialog title="Assign TCNs" wide onClose={onClose}><div className="shared-air-assign">
    <p className="shared-air-assign-tip"><strong>Tip</strong> To assign one or more TCNs, select row(s) with a click and click 'Assign' button.</p>
    {category === 'Special' && <p className="shared-air-assign-tip">Special pallet: only hazardous (A, E, O) or classified/sensitive cargo is listed.</p>}
    <div className="shared-toolbar"><button disabled={!selected.length} onClick={() => { onAssign(selected); setSelected([]); }}>Assign</button><button onClick={() => setSelected([])}>Clear</button></div>
    <Grid label="Unassigned TCNs" columns={ASSIGN_TCN_COLUMNS} rows={rows} keyOf={row => row.ids[0]} selected={selected} onSelect={setSelected} />
    <footer className="shared-air-assign-footer"><button onClick={onClose}>Close</button></footer>
  </div></Dialog>;
}

const HEADER_COLUMNS = [
  [['Oldest Piece', 'oldest'], ['Grid Location', 'gridLocation', true], ['Location on Acft', 'locationOnAcft', true], ['Air Dimension Code', 'airDimCode'], ['* POE', 'poe'], ['POD', 'pod'], ['Mode', 'mode'], ['Buildup Activity', 'buildup'], ['Consignee', 'consignee'], ['Pallet Type Code', 'palletType']],
  [['Serial Number', 'serialNumber', true], ['Config Code', 'configCode'], ['Type Cargo', 'typeCargo'], ['Frustrated Reason', 'frustratedReason', true], ['Priority', 'priority'], ['Special Priority', 'specialPriority', true], ['Height', 'height'], ['Center of Balance', 'cb'], ['Type Tie Down', 'typeTieDown', true], ['Type Tie Down Quantity', 'typeTieDownQty', true]],
  [['Equivalent Positions', 'epp'], ['Fore Overhang', 'foreOverhang', true], ['Aft Overhang', 'aftOverhang', true], ['Overhang Direction', 'overhangDirection', true], ['Personal Property Code', 'personalPropertyCode', true], ['Pieces', 'pieces'], ['Weight', 'weight'], ['Cube', 'cube'], ['Gross Scale Weight', 'weight'], ['Completion Date', 'completeDate']],
];

// Build Pallet: the pallet's header, its TCNs, and its own header data. Opened from Pallets or from
// an Air Manifest pallet ID. Assigning TCNs to a pallet already on a manifest adds them to it.
export function BuildPallet({ store, palletId, locked, change, onClose, openShipPlan }) {
  const [tab, setTab] = useState('TCNs Assigned');
  const [selected, setSelected] = useState([]);
  const [assigning, setAssigning] = useState(false);
  const [status, setStatus] = useState(null);
  const summary = palletSummary(store, palletId);
  const record = summary.record;
  const draft = record?.draft || {};
  const manifested = Boolean(summary.manifestId);
  const ensure = () => record ? store : createRecord(store, 'pallets', newPalletDraft(palletId, summary.category));
  const edit = patch => { const base = ensure(); const id = palletRecord(base, palletId).id; change(editRecord(base, 'pallets', id, patch)); setStatus(null); };
  const save = () => { const base = ensure(); change(saveRecord(base, 'pallets', palletRecord(base, palletId).id)); setStatus({ title: 'Transaction Successfully Processed', text: 'Record successfully saved' }); };
  const shown = { ...summary, ...draft, oldest: summary.built ? `${summary.date}/0800` : '', palletType: summary.palletType };
  const tcns = members(store, palletId).map(r => tcnRow(store, r));
  const assign = ids => {
    let next = ensure();
    for (const id of ids) next = editRecord(next, 'shipments', id, { palletId, palletDate: store.shipments[id].draft.palletDate || draft.date || today() });
    if (summary.manifestId) next = assignShipments(next, 'airManifests', summary.manifestId, airAssignmentIds(next, summary.manifestId, ids));
    change(next); setStatus({ title: 'Transaction Successfully Processed', text: `${ids.length} TCN${ids.length === 1 ? '' : 's'} assigned to pallet ${palletId}.` });
  };
  const unassign = () => {
    let next = store;
    if (summary.manifestId) next = assignShipments(next, 'airManifests', summary.manifestId, selected, true);
    for (const id of selected) next = editRecord(next, 'shipments', id, { palletId: '', palletDate: '' });
    change(next); setSelected([]); setStatus({ title: 'Transaction Successfully Processed', text: 'TCNs unassigned from the pallet.' });
  };
  const field = (label, value, { editable = false, key, width, title } = {}) => <label className={`cmos-release-field ${editable ? '' : 'cmos-release-readonly'}`}>
    <span><FieldReference fieldId={key} value={value}>{label}</FieldReference></span><input aria-label={label.replace(/^\* /, '')} value={value ?? ''} readOnly={!editable || locked} title={title} style={width ? { width } : undefined} onChange={e => editable && edit({ [key]: e.target.value.toUpperCase() })} /></label>;
  const message = text => setStatus({ title: 'Transaction Successfully Processed', text });
  return <Dialog title="Build Pallet" wide onClose={onClose}><div className="cmos-build-pallet">
    <div className="cmos-build-header">
      <div>
        <div className="cmos-release-field"><span>Pallet ID</span><span className="cmos-pallet-id"><input aria-label="Pallet ID" value={palletId} readOnly /><input aria-label="Pallet POE" value={shown.poe} readOnly /><input aria-label="Pallet date" value={shown.date} readOnly /></span></div>
        {field('Manifest', summary.manifest)}
        {field('Weight', summary.weight)}
      </div>
      <div>
        <div className="cmos-build-row">{field('Pallet Type', summary.palletType, { width: '28px', key: 'palletType' })}{field('DSOE ID', shown.dsoeId, { editable: !manifested, key: 'dsoeId', width: '64px', title: 'Enter 5 characters.' })}{field('Chalk', shown.chalk, { editable: !manifested, key: 'chalk', width: '54px' })}</div>
        {field('RF Tag Number', shown.rfTag, { editable: true, key: 'rfTag', width: '300px' })}
        <div className="cmos-build-row">{field('Equivalent Positions', summary.epp, { width: '40px' })}{field('Type Cargo', summary.typeCargo, { width: '24px' })}</div>
      </div>
    </div>
    <RegulationHelp claims={['cargo.nets', 'cargo.secured', 'cargo.dunnage']} assumptions={[PALLET_ASSUMPTION]} />
    <p className="cmos-build-tip"><strong>Tip</strong> To unassign one or more TCNs, select row(s) with ctrl-click and click 'Unassign'.</p>
    <div className="shared-tab-bar" role="tablist" aria-label="Build Pallet tabs">{['TCNs Assigned', 'Pallet Header'].map(name => <button key={name} role="tab" aria-selected={tab === name} onClick={() => setTab(name)}>{name}</button>)}</div>
    {tab === 'TCNs Assigned' ? <div role="tabpanel" aria-label="TCNs Assigned" className="cmos-build-panel">
      <div className="shared-toolbar">
        <button disabled={locked || manifested} onClick={() => setAssigning(true)}>Assign TCNs</button>
        <button disabled={locked || manifested || !selected.length} onClick={unassign}>Unassign</button>
        <button disabled={!tcns.length} onClick={() => message(`Pallet ${palletId} inventory printed (training).`)}>Print Inventory</button>
        <button onClick={() => message(`Pallet ${palletId} placard printed (training).`)}>Print Placard</button>
        <button disabled={!openShipPlan || selected.length !== 1} onClick={() => { onClose(); openShipPlan(selected[0]); }}>Ship Plan</button>
        <button disabled={selected.length !== 1} onClick={() => message('AIT created for the selected TCN (training).')}>Create AIT for TCN</button>
        <button onClick={() => setSelected([])}>Clear</button>
      </div>
      <Grid label="Pallet TCNs" columns={PALLET_TCN_COLUMNS} rows={tcns} keyOf={row => row.ids[0]} selected={selected} onSelect={setSelected} />
    </div> : <div role="tabpanel" aria-label="Pallet Header" className="cmos-build-panel cmos-pallet-header">
      {HEADER_COLUMNS.map((column, i) => <div key={i}>{column.map(([label, key, editable]) => <div key={label}>{field(label, shown[key], { editable: editable && !locked, key })}</div>)}</div>)}
    </div>}
    {status && <div className="cmos-build-status" role="status"><strong>{status.title}</strong><span>{status.text}</span></div>}
    <footer className="cmos-release-footer">
      <button disabled={locked} onClick={() => message(summary.built ? 'Passed edits.' : 'Pallet has no TCNs assigned.')}>Edit Check</button>
      <button onClick={() => message(`AIT created for pallet ${palletId} (training).`)}>Create AIT for Pallet</button>
      <button disabled={locked || summary.built || !record} onClick={() => { change({ ...store, pallets: Object.fromEntries(Object.entries(store.pallets).filter(([id]) => id !== record.id)) }); onClose(); }}>Delete</button>
      <button disabled>Reopen Pallet</button>
      <button disabled={locked} onClick={save}>Save</button>
      <button disabled={locked} onClick={() => { save(); onClose(); }}>Save and Close</button>
      <button onClick={onClose}>Close</button>
    </footer>
    {assigning && <AssignTcns store={store} category={summary.category} onAssign={assign} onClose={() => setAssigning(false)} />}
  </div></Dialog>;
}

// The Pallets list: every pallet record, pallet built from shipments, and empty pallet on hand.
export default function PalletsScreen({ store, change, locked, openShipPlan }) {
  const [open, setOpen] = useState(null);
  const rows = allPalletIds(store).map(id => palletSummary(store, id));
  const create = category => {
    const palletId = nextPalletId(store);
    if (!palletId) return;
    const next = createRecord(store, 'pallets', newPalletDraft(palletId, category));
    change(saveRecord(next, 'pallets', next.selection.pallets));
    setOpen(palletId);
  };
  return <div className="shared-air-list cmos-pallets">
    <h3>Pallets</h3>
    <RegulationHelp claims={['cargo.nets', 'cargo.dunnage']} assumptions={[PALLET_ASSUMPTION]} />
    <div className="shared-air-grid">
      <div className="shared-toolbar">{Object.entries(PALLET_CATEGORIES).map(([category, label]) => <button key={category} disabled={locked} onClick={() => create(category)}>{label}</button>)}<button onClick={() => setOpen(null)}>Clear</button></div>
      <Grid label="Pallets" columns={PALLET_LIST_COLUMNS} rows={rows} keyOf={row => row.palletId} link={row => setOpen(row.palletId)} />
    </div>
    {open && <BuildPallet store={store} palletId={open} locked={locked} change={change} openShipPlan={openShipPlan} onClose={() => setOpen(null)} />}
  </div>;
}
