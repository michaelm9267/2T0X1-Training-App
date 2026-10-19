import { useState } from 'react';
import { AIR_MANIFEST_COLUMNS, AIR_MANIFEST_SAMPLES, eligibleForAirManifest, availableForAirManifest, airAssignmentIds } from './airManifestLogic';
import { field } from './referenceInventory';
import { manifestMissions } from './airScheduleLogic';
import { Dialog } from './controls';
import { assignShipments, editRecord, totals, wholeCube } from './model';
import { BuildPallet } from './PalletsScreen';
import { ASSIGN_PALLET_COLUMNS, EMPTY_PALLETS, LOOSE_COLUMNS, PALLET_COLUMNS, looseRow, palletRows, today } from './airCargoRows';

const palletColumns = PALLET_COLUMNS;
const palletWidths = { palletId: 48, poe: 48, date: 96, pod: 48, weight: 92, completeDate: 92, priority: 62, special: 68, hazard: 65, cargoLocation: 95, configCode: 92, epp: 48, height: 65, dsoeId: 70, chalk: 60, typeCargo: 90, frCode: 70 };
const looseColumns = LOOSE_COLUMNS;
const looseWidths = { tcn: 160, pod: 56, commSh: 70, hazCode: 58, rdd: 56, priority: 56, cargoLocation: 110, pieces: 82, weight: 82, registryLock: 240, dsoeId: 70, chalk: 70, mailInd: 58, frCode: 58, tac: 52 };
const contains = (value, query) => !query || String(value || '').toUpperCase().includes(query.toUpperCase().replace(/%/g, ''));
export default function AirManifestScreen({ store, record, opened, locked, openManifest, newManifest, action, renderFields, total, selected, setSelected, change, setMessage, openShipPlan }) {
  const [query, setQuery] = useState({ manifest: '', release: 'Open' });
  const [search, setSearch] = useState(query);
  const [filters, setFilters] = useState({});
  const [cargoTab, setCargoTab] = useState('Assigned Pallets');
  const [cargoFilters, setCargoFilters] = useState({});
  const [build, setBuild] = useState(false);
  const [buildError, setBuildError] = useState('');
  const [schedule, setSchedule] = useState(false);
  const [palletId, setPalletId] = useState('');
  const [buildIds, setBuildIds] = useState([]);
  // Assign Pallets / Assign Loose Cargo windows: which one is open, its selection, and its filters.
  const [assign, setAssign] = useState(null);
  const [assignSelected, setAssignSelected] = useState([]);
  const [assignFilters, setAssignFilters] = useState({});
  const [assignError, setAssignError] = useState('');
  // The Build Pallet window for a pallet ID link.
  const [buildPallet, setBuildPallet] = useState(null);
  const actual = Object.values(store.airManifests);
  const all = [...actual, ...AIR_MANIFEST_SAMPLES.filter(sample => !actual.some(r => r.id === sample.id || r.draft.manifestNumber === sample.draft.manifestNumber))];
  const projected = r => ({ ...r.draft, mode: r.draft.mode || 'F', releaseDate: r.status === 'Released' ? r.releaseDetails?.departureAt || r.releaseDetails?.departDate || r.releaseDetails?.departureDateTime || '' : '', ...(r.draft.shipmentIds?.length ? totals(store, r.draft.shipmentIds) : {}), release: r.status === 'Released' ? 'Released' : r.status === 'Aborted' ? 'Aborted' : 'Open' });
  const matches = all.filter(r => {
    const row = projected(r);
    return (search.manifest ? contains(row.manifestNumber, search.manifest) : !search.release || row.release === search.release) && Object.entries(filters).every(([key, value]) => contains(row[key], value));
  });
  const draft = record?.draft || {};
  const shipmentIds = draft.shipmentIds || [];
  const assigned = shipmentIds.map(id => store.shipments[id]).filter(Boolean);
  const cargo = cargoTab === 'Assigned Pallets'
    ? [...palletRows(store, assigned), ...(draft.sampleCargo || []).map(r => ({ ...r, palletId: r.id, ids: [] }))]
    : assigned.filter(r => !r.draft.palletId).map(r => looseRow(store, r));
  const columns = cargoTab === 'Assigned Pallets' ? palletColumns : looseColumns;
  const rows = cargo.filter(row => Object.entries(cargoFilters).every(([key, value]) => contains(row[key], value)));
  const header = [
    [field('Manifest', 'manifestNumber'), { ...field('Mission', 'mission'), lookup: manifestMissions(store).map(m => [m.missionNumber, [m.dsoeId && `DSOE ${m.dsoeId}`, m.chalk && `CHALK ${m.chalk}`, m.routings?.filter(Boolean).join('-')].filter(Boolean).join(' · ')]) }, field('DSOE ID', 'dsoeId'), { ...field('Chalk', 'chalk'), placeholder: '001', help: 'Chalk: 001 - 999' }, field('POD', 'pod'), { ...field('Destination', 'destination'), lookup: false }],
    [{ ...field('Mode', 'mode'), lookup: [['F', 'AIR MOBILITY COMMAND (AMC) CHANNEL AND SPECIAL ASSIGNMENT']] }, field('Weight', 'weight'), field('Cube', 'cube'), field('Ref ID', 'refId'), field('Complete', 'complete', 'select', ['Yes', 'No']), field('Remarks', 'remarks')],
  ];
  const figures = shipmentIds.length ? total : { weight: draft.weight || 0, cube: draft.cube || 0 };
  const values = { ...draft, mode: draft.mode || 'F', weight: String(figures.weight), cube: String(wholeCube(figures.cube)) };
  const beginBuild = (ids = selected, name = '') => { setBuildIds(ids.filter(id => eligibleForAirManifest(store.shipments[id]))); setPalletId(name); setBuildError(''); setBuild(true); };
  if (!opened || !record) return <div className="shared-air-list">
    <form className="shared-air-search" role="search" aria-label="Air Manifest search" onSubmit={e => { e.preventDefault(); setSearch(query); }}>
      <label htmlFor="air-manifest-search">Manifest</label><input id="air-manifest-search" aria-label="Manifest search" value={query.manifest} onChange={e => setQuery({ ...query, manifest: e.target.value })} />
      <label htmlFor="air-release-search">Release Status</label><select id="air-release-search" aria-label="Release Status" value={query.release} onChange={e => setQuery({ ...query, release: e.target.value })}>{['Open', 'Released', 'Aborted', 'All'].map(value => <option key={value} value={value === 'All' ? '' : value}>{value}</option>)}</select>
      <div><button type="submit">Search</button><button type="button" onClick={() => { const value = { manifest: '', release: 'Open' }; setQuery(value); setSearch(value); setFilters({}); }}>Clear</button></div>
      <p><strong>Tip:</strong> Default search returns Air Manifests in Open status. Searching by Manifest will ignore other search parameters.</p>
    </form>
    <div className="shared-air-grid"><div className="shared-toolbar"><button disabled={locked} onClick={() => { newManifest('Cargo'); setCargoTab('Assigned Pallets'); }}>New Cargo Manifest</button><button disabled={locked} onClick={() => { newManifest('Mail'); setCargoTab('Assigned Pallets'); }}>New Mail Manifest</button><button onClick={() => setFilters({})}>Clear</button></div>
      <div className="shared-table-scroll"><table className="shared-table"><thead><tr className="shared-air-filters">{AIR_MANIFEST_COLUMNS.map(([key, label]) => <th key={key}><input aria-label={`Filter manifest ${label}`} value={filters[key] || ''} onChange={e => setFilters({ ...filters, [key]: e.target.value })} /></th>)}</tr><tr>{AIR_MANIFEST_COLUMNS.map(([key, label]) => <th key={key}>{label}</th>)}</tr></thead>
        <tbody>{matches.map(r => <tr key={r.id} aria-selected={record ? r.id === record.id : r.id === matches[0]?.id}>{AIR_MANIFEST_COLUMNS.map(([key]) => <td key={key} title={String(projected(r)[key] ?? '')}>{key === 'manifestNumber' ? <button className="shared-air-manifest-link" aria-label={`Open manifest ${r.draft.manifestNumber || r.id}`} onClick={() => { openManifest(r); setCargoTab('Assigned Pallets'); }}>{r.draft.manifestNumber || r.id}</button> : String(projected(r)[key] ?? '')}</td>)}</tr>)}{!matches.length && <tr><td colSpan={10}>No data to display.</td></tr>}</tbody></table></div><div className="shared-air-count">{matches.length} row(s) found.</div>
    </div>
  </div>;
  return <Dialog title="Air Manifest" wide onClose={() => action('Close')}><div className="shared-air-detail">
    <div className="shared-air-header">{header.map((fields, index) => <div key={index}>{fields.map(f => <div key={f.id}>{renderFields([{ ...f, readOnly: ['manifestNumber', 'dsoeId', 'chalk', 'weight', 'cube'].includes(f.id) }], values)}</div>)}</div>)}</div>
    <p className="shared-air-tip"><strong>Tip:</strong> Click Id Link to Build Pallet, or to unassign one or more Pallets or Loose Cargo, select row(s) with ctrl-click and click 'Unassign'.</p>
    <div className="shared-tab-bar" role="tablist" aria-label="Air Manifest tabs">{['Assigned Pallets', 'View Loose Cargo'].map(tab => <button key={tab} role="tab" aria-selected={cargoTab === tab} onClick={() => { setCargoTab(tab); setSelected([]); setCargoFilters({}); }}>{tab}</button>)}</div>
    <section role="tabpanel" aria-label={cargoTab} className="shared-air-cargo">
      <div className="shared-toolbar"><button disabled={locked} onClick={() => { setAssign(cargoTab === 'Assigned Pallets' ? 'pallet' : 'loose'); setAssignSelected([]); setAssignFilters({}); }}>{cargoTab === 'Assigned Pallets' ? 'Unassigned Pallets' : 'Assign TCNs'}</button><button disabled={locked || !selected.length} onClick={() => { change(assignShipments(store, 'airManifests', record.id, selected, true)); setSelected([]); }}>Unassign</button>{cargoTab === 'Assigned Pallets' ? <button disabled={locked} onClick={() => beginBuild()}>Build Pallets</button> : <button disabled={selected.length !== 1 || !openShipPlan} title="Open the selected TCN in Shipment Planning" onClick={() => openShipPlan(selected[0])}>Ship Plan</button>}<button onClick={() => { setSelected([]); setCargoFilters({}); }}>Clear</button></div>
      <div className="shared-table-scroll"><table className={`shared-table ${cargoTab === 'Assigned Pallets' ? 'shared-air-pallet-table' : 'shared-air-loose-table'}`}><colgroup>{columns.map(([key]) => <col key={key} style={{ width: (cargoTab === 'Assigned Pallets' ? palletWidths : looseWidths)[key] }} />)}</colgroup><thead><tr className="shared-air-filters">{columns.map(([key, label]) => <th key={key}><input aria-label={`Filter assigned ${label}`} value={cargoFilters[key] || ''} onChange={e => setCargoFilters({ ...cargoFilters, [key]: e.target.value })} /></th>)}</tr><tr>{columns.map(([key, label]) => <th key={key}>{label}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={`${row.palletId || row.tcn}-${index}`} aria-selected={row.ids.length > 0 && row.ids.every(id => selected.includes(id))} onClick={e => { if (e.target.closest('button,input') || !row.ids.length) return; setSelected(e.ctrlKey || e.metaKey ? [...new Set([...selected, ...row.ids])] : row.ids); }}>{columns.map(([key], columnIndex) => <td key={key} title={String(row[key] ?? '')}>{columnIndex === 0 && row.ids.length > 0 && <input className="shared-air-select-checkbox" type="checkbox" aria-label={`Select ${row.palletId || row.tcn}`} checked={row.ids.every(id => selected.includes(id))} onChange={e => setSelected(e.target.checked ? [...new Set([...selected, ...row.ids])] : selected.filter(id => !row.ids.includes(id)))} />}{key === 'palletId' ? <button disabled={locked || !row.ids.length} onClick={() => setBuildPallet(row.palletId)}>{row[key]}</button> : key === 'tcn' ? <strong>{row[key]}</strong> : String(row[key] ?? '')}</td>)}</tr>)}{!rows.length && <tr><td colSpan={columns.length}>No data to display.</td></tr>}</tbody></table></div><div className="shared-air-count">{rows.length} row(s) found.</div>
    </section>
    <p className="shared-air-errors">{record.check?.errors?.join(' ')}</p>
    <div className="shared-toolbar shared-air-bottom">{['First', 'Previous', 'Next', 'Last', 'Print Manifest', 'Print Cargo Pull Sheet', 'Export', 'Edit Check', 'Release', 'Air Schedule', 'Abort Mission', 'Save', 'Save and Close', 'Close'].map(label => <button key={label} disabled={((['First', 'Previous'].includes(label) && all[0]?.id === record.id) || (['Next', 'Last'].includes(label) && all[all.length - 1]?.id === record.id)) || (!store.airManifests[record.id] && ['Print Manifest', 'Print Cargo Pull Sheet', 'Export'].includes(label)) || (locked && !['First', 'Previous', 'Next', 'Last', 'Print Manifest', 'Print Cargo Pull Sheet', 'Export', 'Air Schedule', 'Close'].includes(label))} onClick={() => {
      if (['First', 'Previous', 'Next', 'Last'].includes(label)) { let index = all.findIndex(r => r.id === record.id); index = label === 'First' ? 0 : label === 'Last' ? all.length - 1 : Math.max(0, Math.min(all.length - 1, index + (label === 'Next' ? 1 : -1))); openManifest(all[index]); }
      else if (label === 'Air Schedule') setSchedule(true);
      else action(label === 'Print Cargo Pull Sheet' ? 'Print Pull Sheet' : label === 'Abort Mission' ? 'Abort Manifest' : label);
    }}>{label}</button>)}</div>
    {assign && (() => {
      const pallet = assign === 'pallet';
      const available = Object.values(store.shipments).filter(r => availableForAirManifest(store, record.id, r) && !shipmentIds.includes(r.id) && (pallet ? Boolean(r.draft.palletId) : !r.draft.palletId));
      const built = palletRows(store, available);
      const list = pallet ? [...built, ...EMPTY_PALLETS.filter(e => !built.some(b => b.palletId === e.palletId))].sort((a, b) => a.palletId.localeCompare(b.palletId)) : available.map(r => looseRow(store, r));
      const cols = pallet ? ASSIGN_PALLET_COLUMNS : LOOSE_COLUMNS;
      const shown = list.filter(row => Object.entries(assignFilters).every(([key, value]) => contains(row[key], value)));
      const keyOf = row => pallet ? row.palletId : row.ids[0];
      const pick = (row, add) => setAssignSelected(add ? (assignSelected.includes(keyOf(row)) ? assignSelected.filter(k => k !== keyOf(row)) : [...assignSelected, keyOf(row)]) : [keyOf(row)]);
      const chosen = list.filter(row => assignSelected.includes(keyOf(row)));
      const number = draft.manifestNumber || record.id;
      return <Dialog title={pallet ? `Assign Pallets to Manifest: ${number}` : `Assign Loose Cargo to Manifest ${number}`} wide onClose={() => setAssign(null)}><div className="shared-air-assign">
        {pallet ? <><p className="shared-air-assign-tip"><strong>Tip:</strong> To assign one or more Pallets select desired row(s) with ctrl-click, then click 'Assign'.</p><p className="shared-air-assign-tip"><strong>Tip:</strong> Click link under Id column to Build Pallet. Redirect to Ship Plan for TCNs cannot be done from the Manifest.</p></>
          : <p className="shared-air-assign-tip"><strong>Tip:</strong> To assign one or more Loose Cargo items, select row(s) with ctrl-click and click 'Assign'.</p>}
        {assignError && <p className="shared-air-errors" role="alert">{assignError}</p>}
        <section className="shared-air-cargo" aria-label={pallet ? 'Unassigned pallets' : 'Unassigned loose cargo'}>
          <div className="shared-toolbar"><button disabled={locked || !chosen.length} onClick={() => {
            const empty = chosen.filter(row => row.empty);
            if (empty.length) { setAssignError(`Pallet ${empty.map(row => row.palletId).join(', ')} has no cargo. Click its ID to build it first.`); return; }
            change(assignShipments(store, 'airManifests', record.id, chosen.flatMap(row => row.ids))); setAssignSelected([]); setAssignError('');
            setMessage(`${pallet ? 'Pallets' : 'TCNs'} assigned. Save the manifest.`);
          }}>Assign</button>{!pallet && <button disabled={chosen.length !== 1 || !openShipPlan} onClick={() => { setAssign(null); openShipPlan(chosen[0].ids[0]); }}>Ship Plan</button>}<button onClick={() => { setAssignSelected([]); setAssignFilters({}); setAssignError(''); }}>Clear</button></div>
          <div className="shared-table-scroll"><table className={`shared-table ${pallet ? 'shared-air-pallet-table' : 'shared-air-loose-table'}`}>
            <colgroup>{cols.map(([key]) => <col key={key} style={{ width: (pallet ? { ...palletWidths, loadPlanId: 95 } : looseWidths)[key] }} />)}</colgroup>
            <thead><tr className="shared-air-filters">{cols.map(([key, label]) => <th key={key}>{key === 'date' ? null : <input aria-label={`Filter unassigned ${label}`} value={assignFilters[key] || ''} onChange={e => setAssignFilters({ ...assignFilters, [key]: e.target.value })} />}</th>)}</tr><tr>{cols.map(([key, label]) => <th key={key}>{label}</th>)}</tr></thead>
            <tbody>{shown.map(row => <tr key={keyOf(row)} aria-selected={assignSelected.includes(keyOf(row))} onClick={e => { if (!e.target.closest('button,input')) pick(row, e.ctrlKey || e.metaKey); }}>{cols.map(([key], i) => <td key={key} title={String(row[key] ?? '')}>
              {i === 0 && <input className="shared-air-select-checkbox" type="checkbox" aria-label={`Assign ${pallet ? `pallet ${row.palletId}${row.empty ? ' (empty)' : `: ${row.ids.map(id => store.shipments[id].draft.tcn).join(', ')}`}` : row.tcn}`} checked={assignSelected.includes(keyOf(row))} onChange={() => pick(row, true)} />}
              {key === 'palletId' ? <button disabled={locked} onClick={() => { setAssign(null); setBuildPallet(row.palletId); }}>{row.palletId}</button> : String(row[key] ?? '')}</td>)}</tr>)}
              {!shown.length && <tr><td colSpan={cols.length}>No data to display.</td></tr>}</tbody>
          </table></div>
          <div className="shared-air-count">{shown.length} row(s) found.</div>
        </section>
        <footer className="shared-air-assign-footer"><button onClick={() => setAssign(null)}>Close</button></footer>
      </div></Dialog>;
    })()}
    {buildPallet && <BuildPallet store={store} palletId={buildPallet} locked={locked} change={change} openShipPlan={openShipPlan} onClose={() => setBuildPallet(null)} />}
    {build && <Dialog title="Build Pallets" onClose={() => setBuild(false)}><label>Pallet ID<input aria-label="Pallet ID" value={palletId} onChange={e => { setPalletId(e.target.value); setBuildError(''); }} /></label>{buildError && <p role="alert">{buildError}</p>}<p>Only Shipment Planning MIL Mode F cargo can be built and assigned.</p>{Object.values(store.shipments).filter(r => availableForAirManifest(store, record.id, r)).map(r => <label key={r.id}><input type="checkbox" aria-label={`Build ${r.draft.tcn}`} checked={buildIds.includes(r.id)} onChange={e => setBuildIds(e.target.checked ? [...buildIds, r.id] : buildIds.filter(id => id !== r.id))} />{r.draft.tcn}</label>)}<footer><button disabled={!palletId.trim() || !buildIds.length || locked} onClick={() => {
      let next = store;
      const targetIds = Object.values(store.shipments).filter(r => r.draft.palletId === palletId.trim()).map(r => r.id);
      const requested = [...new Set([...buildIds, ...targetIds])];
      const ids = airAssignmentIds(store, record.id, requested);
      if (requested.some(id => !ids.includes(id))) { setBuildError('Pallet ID is already assigned to another manifest or contains cargo without MIL Mode F. Choose another ID.'); return; }
      for (const id of ids) next = editRecord(next, 'shipments', id, { palletId: palletId.trim(), palletDate: store.shipments[id].draft.palletDate || today() });
      next = assignShipments(next, 'airManifests', record.id, ids);
      change(next); setSelected([]); setBuild(false); setMessage('Pallet built and assigned. Save the shipment changes; Edit Check lists anything still missing.');
    }}>Build and Assign</button><button onClick={() => setBuild(false)}>Close</button></footer></Dialog>}
    {schedule && <Dialog title="Air Schedule" onClose={() => setSchedule(false)}><table className="shared-table"><thead><tr><th>Mission</th><th>POD</th><th>Destination</th></tr></thead><tbody>{all.filter(r => r.draft.mission).map(r => <tr key={r.id}><td>{r.draft.mission}</td><td>{r.draft.pod}</td><td>{r.draft.destination}</td></tr>)}</tbody></table><button onClick={() => setSchedule(false)}>Close</button></Dialog>}
  </div></Dialog>;
}
