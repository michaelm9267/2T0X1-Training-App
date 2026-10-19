import { useState } from 'react';
import { field } from './referenceInventory';
import { Dialog, lookupValues } from './controls';
import { editRecord, totals } from './model';
import { DSOE_REFERENCE } from './airScheduleLogic';
import { EMERGENCY_PHONE_TYPES, HAZ_STATEMENTS, PHONE_TYPES, TRUCK_COLUMNS, TRUCK_SAMPLES, truckAddress, truckRow } from './truckManifestLogic';

// CMOS Truck Manifest, laid out like the CMOS screens: the manifest list (Manifest / Release Status
// search), and the manifest window with its header and the TCNs Assigned, Addresses, Miscellaneous,
// Conveyance and Assign Statements tabs. DSOE ID and Chalk are optional on this screen.
const TABS = ['TCNs Assigned', 'Addresses', 'Miscellaneous', 'Conveyance', 'Assign Statements'];
const ACTIONS = ['First', 'Previous', 'Next', 'Last', 'Edit Check', 'Print Manifest', 'Export', 'Release', 'Abort Manifest', 'Save', 'Save and Close', 'Close'];
const VIEW_ACTIONS = ['First', 'Previous', 'Next', 'Last', 'Print Manifest', 'Export', 'Close'];
const COUNTRIES = lookupValues({ id: 'ucCountry' });
const STATES = lookupValues({ id: 'ucState' });
const contains = (value, query) => !query || String(value ?? '').toUpperCase().includes(String(query).toUpperCase().replace(/%/g, ''));
const f = (label, id, extra = {}) => ({ ...field(label, id), ...extra });

export default function TruckManifestScreen({ store, record, opened, locked, renderFields, renderTab, change, edit, action, newManifest, openManifest }) {
  const [query, setQuery] = useState({ manifest: '', release: 'Open' });
  const [search, setSearch] = useState(query);
  const [filters, setFilters] = useState({});
  const [tab, setTab] = useState('TCNs Assigned');
  const [statementPick, setStatementPick] = useState(null);
  const [statementSelected, setStatementSelected] = useState([]);
  const [statementFilters, setStatementFilters] = useState({});
  const actual = Object.values(store.truckManifests || {});
  const all = [...actual, ...TRUCK_SAMPLES.filter(sample => !actual.some(r => r.id === sample.id || r.draft.manifestNumber === sample.draft.manifestNumber))];
  const rows = all.map(r => ({ r, row: truckRow(store, r) }))
    .filter(({ row }) => (search.manifest ? contains(row.manifestNumber, search.manifest) : !search.release || row.release === search.release)
      && TRUCK_COLUMNS.every(([key]) => contains(row[key], filters[key])))
    .sort((a, b) => a.row.manifestNumber.localeCompare(b.row.manifestNumber));

  if (!opened || !record) return <div className="shared-truck-list">
    <form className="shared-air-search" role="search" aria-label="Truck Manifest search" onSubmit={e => { e.preventDefault(); setSearch(query); }}>
      <label htmlFor="truck-manifest-search">Manifest</label><input id="truck-manifest-search" aria-label="Manifest search" value={query.manifest} onChange={e => setQuery({ ...query, manifest: e.target.value })} />
      <label htmlFor="truck-release-search">Release Status</label><select id="truck-release-search" aria-label="Release Status" value={query.release} onChange={e => setQuery({ ...query, release: e.target.value })}>{[['', 'All'], ['Open', 'Open'], ['Released', 'Released']].map(([value, label]) => <option key={label} value={value}>{label}</option>)}</select>
      <div><button type="submit">Search</button><button type="button" onClick={() => { const value = { manifest: '', release: 'Open' }; setQuery(value); setSearch(value); setFilters({}); }}>Clear</button></div>
      <p><strong>Tip:</strong> Default search returns Truck Manifests in Open status. Searching by Manifest will ignore other search parameters.</p>
    </form>
    <div className="shared-air-grid shared-truck-grid"><div className="shared-toolbar"><button disabled={locked} onClick={() => { newManifest(); setTab('TCNs Assigned'); }}>New</button><button onClick={() => setFilters({})}>Clear</button></div>
      <div className="shared-table-scroll"><table className="shared-table">
        <thead><tr className="shared-air-filters">{TRUCK_COLUMNS.map(([key, label]) => <th key={key}>{key !== 'releaseDate' && <input aria-label={`Filter truck ${label}`} value={filters[key] || ''} onChange={e => setFilters({ ...filters, [key]: e.target.value })} />}</th>)}</tr>
          <tr>{TRUCK_COLUMNS.map(([key, label]) => <th key={key}>{label}</th>)}</tr></thead>
        <tbody>{rows.map(({ r, row }, index) => <tr key={r.id} aria-selected={index === 0}>{TRUCK_COLUMNS.map(([key]) => <td key={key} className={['pieces', 'weight'].includes(key) ? 'shared-num' : ['milMode', 'status'].includes(key) ? 'shared-center' : undefined}>
          {key === 'manifestNumber' ? <button className="shared-air-manifest-link" aria-label={`Open manifest ${row.manifestNumber}`} onClick={() => { openManifest(r); setTab('TCNs Assigned'); }}>{row.manifestNumber}</button> : String(row[key] ?? '')}</td>)}</tr>)}
          {!rows.length && <tr><td colSpan={TRUCK_COLUMNS.length}>No data to display.</td></tr>}</tbody>
      </table></div>
      <div className="shared-air-count">{rows.length} row(s) found.</div>
    </div>
  </div>;

  const draft = record.draft || {};
  const ids = draft.shipmentIds || [];
  const t = ids.length ? totals(store, ids) : { pieces: draft.samplePieces || 0, weight: draft.sampleWeight || 0, cube: draft.sampleCube || 0 };
  const released = record.status === 'Released';
  const values = { ...draft, totalWeight: String(t.weight), totalCube: String(Math.round(Number(t.cube) || 0)), statusCode: released ? '' : '00', statusText: released ? 'Released' : 'Original',
    loadPieces: String(t.pieces), loadWeight: String(t.weight), loadCube: String(Math.round(Number(t.cube) || 0)) };
  const disabled = locked || released;
  const put = patch => !disabled && change(editRecord(store, 'truckManifests', record.id, patch));
  // A DODAAC entry fills that address block from the DoDAAC table.
  const onEdit = (key, value) => {
    const prefix = { destinationDODAAC: 'destination', originDODAAC: 'origin', shipperDODAAC: 'shipper' }[key];
    if (prefix) put({ [key]: value.toUpperCase(), ...(prefix === 'origin' ? { origin: value.toUpperCase() } : {}), ...truckAddress(prefix, value) });
    else edit(key, value);
  };
  const show = (...fields) => renderFields(fields.map(x => disabled ? { ...x, readOnly: true } : x), values, onEdit);
  const sys = (label, id, extra) => f(label, id, { readOnly: true, lookup: false, ...extra });
  const address = (title, prefix, { required = true, markFor = false } = {}) => <section className="shared-truck-address" aria-label={`${title} address`}>
    <h3>{title}</h3>
    <div className="shared-truck-dodaac">{show(f('DODAAC', `${prefix}DODAAC`, { ariaLabel: `${title} DODAAC`, required }))}</div>
    <div className="shared-truck-address-fields">
      <div className="shared-truck-wide">{show(f('Name', `${prefix}Name`, { ariaLabel: `${title} Name`, lookup: false }))}</div>
      <div className="shared-truck-wide">{show(f('Address', `${prefix}Address1`, { ariaLabel: `${title} Address`, lookup: false }))}</div>
      <div className="shared-truck-wide">{show(f('Address 2', `${prefix}Address2`, { ariaLabel: `${title} Address 2`, lookup: false }))}</div>
      <div className="shared-truck-row">{show(f('Base/City', `${prefix}City`, { ariaLabel: `${title} Base/City`, lookup: false }), f('Country', `${prefix}Country`, { ariaLabel: `${title} Country`, lookup: COUNTRIES }),
        f('State', `${prefix}State`, { ariaLabel: `${title} State`, lookup: STATES, required: true }), f('Zip', `${prefix}Zip`, { ariaLabel: `${title} Zip`, lookup: false }))}</div>
      <div className="shared-truck-row">{show(f('Phone Nbr', `${prefix}PhoneNumber`, { ariaLabel: `${title} Phone Nbr`, lookup: false }), f('Phone Nbr Type', `${prefix}PhoneType`, { ariaLabel: `${title} Phone Nbr Type`, type: 'select', options: PHONE_TYPES }))}</div>
      {markFor && <div className="shared-truck-wide">{show(f('Mark For', `${prefix}MarkFor`, { ariaLabel: `${title} Mark For`, lookup: false }))}</div>}
    </div>
  </section>;
  const phones = draft.emergencyPhones || [{}, {}, {}];
  const seals = draft.sealNumbers || ['', '', '', ''];
  const statements = (draft.statementIds || []).map(id => HAZ_STATEMENTS.find(([cert]) => cert === id)).filter(Boolean)
    .filter(([cert, text]) => contains(cert, statementFilters.cert) && contains(text, statementFilters.text));
  const panel = () => {
    if (tab === 'TCNs Assigned') return renderTab('TCNs Assigned');
    if (tab === 'Addresses') return <div className="shared-truck-addresses">
      {address('Destination', 'destination', { markFor: true })}{address('Origin', 'origin')}{address('Shipper', 'shipper', { required: false })}
    </div>;
    if (tab === 'Miscellaneous') return <div className="shared-truck-misc">
      <div>
        <div className="shared-truck-wide">{show(sys('RF Tag Number', 'rfTagNumber'))}</div>
        <div className="shared-truck-row">{show(f('Vessel Name', 'vesselName', { lookup: false }), f('IRCS', 'ircs', { lookup: false }))}</div>
        <div className="shared-truck-row">{show(f('RDD', 'rddDate'), f('Pick Up Date', 'pickUpDate', { required: true }))}</div>
        <div className="shared-truck-wide">{show(f('Addl Ship Inst', 'addlShipInst', { lookup: false }))}</div>
        <div className="shared-truck-row">{show(f('Complete', 'complete', { type: 'select', options: ['Yes', 'No'] }), sys('ETRR ID', 'etrrId'))}</div>
      </div>
      <fieldset className="shared-truck-phones"><legend>Emergency Phone</legend>
        <table><thead><tr><th>Phone Number</th><th>Phone Number Type</th></tr></thead>
          <tbody>{phones.map((p, i) => <tr key={i}>
            <td><input aria-label={`Emergency Phone Number ${i + 1}`} disabled={disabled} value={p.number || ''} onChange={e => put({ emergencyPhones: phones.map((x, j) => j === i ? { ...x, number: e.target.value } : x) })} /></td>
            <td><select aria-label={`Emergency Phone Number Type ${i + 1}`} disabled={disabled} value={p.type || ''} onChange={e => put({ emergencyPhones: phones.map((x, j) => j === i ? { ...x, type: e.target.value } : x) })}><option value="" />{EMERGENCY_PHONE_TYPES.map(type => <option key={type}>{type}</option>)}</select></td>
          </tr>)}</tbody></table>
      </fieldset>
    </div>;
    if (tab === 'Conveyance') return <div className="shared-truck-conveyance">
      <div>
        <div className="shared-truck-row">{show(f('Equipment Type', 'equipmentType', { required: true }))}</div>
        <div className="shared-truck-row">{show(f('Truck Serial/Bumper Number', 'truckSerialBumperNumber', { required: true, lookup: false }))}</div>
        <div className="shared-truck-wide">{show(f('Trailer/Chassis Number', 'trailerChassisNumber', { lookup: false }))}</div>
        <div className="shared-truck-row">{show(f('Reefer Compartment Ref Number', 'reeferCompartmentRefNumber', { lookup: false }), f('Temperature Control', 'temperatureControl', { lookup: false }), f('Temp Scale', 'tempScale', { type: 'select', options: ['F', 'C'], readOnly: !String(draft.temperatureControl || '').trim() }))}</div>
        <div className="shared-truck-wide">{show(f('Motor Carrier Name', 'motorCarrierName', { required: true, lookup: false }))}</div>
        <div className="shared-truck-row">{show(f('Vehicle Fully Loaded', 'vehicleFullyLoaded', { type: 'select', options: ['No', 'Yes'] }))}</div>
        <h4>Load Information</h4>
        <div className="shared-truck-row shared-truck-load">{show(sys('Pieces', 'loadPieces'), sys('Weight', 'loadWeight'), sys('Cube', 'loadCube'))}</div>
      </div>
      <div className="shared-truck-seals">
        <h4>Seals Applied By</h4>
        <div role="radiogroup" aria-label="Seals Applied By">{['Shipper', 'Carrier'].map(by => <label key={by}><input type="radio" name="truck-seals-by" disabled={disabled} checked={draft.sealsAppliedBy === by} onChange={() => put({ sealsAppliedBy: by })} /> {by}</label>)}</div>
        <h4>Conveyance Seals</h4>
        <p>Conveyance<br />Seal Number</p>
        {seals.map((seal, i) => <input key={i} aria-label={`Conveyance Seal Number ${i + 1}`} disabled={disabled} value={seal} onChange={e => put({ sealNumbers: seals.map((x, j) => j === i ? e.target.value : x) })} />)}
      </div>
    </div>;
    return <div className="shared-truck-statements">
      <h4>Hazardous Certification Statements Assigned</h4>
      <p><strong>Tip:</strong> Select one or multiple Hazardous Certification Statement to unassign.</p>
      <div className="shared-air-cargo">
        <div className="shared-toolbar"><button disabled={disabled} onClick={() => { setStatementPick([]); }}>Assign Statement</button>
          <button disabled={disabled || !statementSelected.length} onClick={() => { put({ statementIds: (draft.statementIds || []).filter(id => !statementSelected.includes(id)) }); setStatementSelected([]); }}>Unassign Statement</button>
          <button onClick={() => { setStatementSelected([]); setStatementFilters({}); }}>Clear</button></div>
        <table className="shared-table"><colgroup><col style={{ width: 110 }} /><col /></colgroup>
          <thead><tr className="shared-air-filters"><th><input aria-label="Filter Cert ID" value={statementFilters.cert || ''} onChange={e => setStatementFilters({ ...statementFilters, cert: e.target.value })} /></th><th><input aria-label="Filter Statement" value={statementFilters.text || ''} onChange={e => setStatementFilters({ ...statementFilters, text: e.target.value })} /></th></tr>
            <tr><th>Cert ID</th><th>Statement</th></tr></thead>
          <tbody>{statements.map(([cert, text]) => <tr key={cert} aria-selected={statementSelected.includes(cert)} onClick={e => setStatementSelected(e.ctrlKey || e.metaKey ? [...new Set([...statementSelected, cert])] : [cert])}><td>{cert}</td><td>{text}</td></tr>)}
            {!statements.length && <tr><td colSpan={2}>No data to display.</td></tr>}</tbody>
        </table>
        <div className="shared-air-count">{statements.length} row(s) found.</div>
      </div>
    </div>;
  };
  const index = all.findIndex(r => r.id === record.id);
  return <Dialog title="Truck Manifest" wide onClose={() => action('Close')} overlayClassName="shared-truck-overlay"><div className="shared-truck-detail">
    <div className="shared-truck-header">
      <div>
        <div className="shared-truck-row">{show(sys('Manifest Number', 'manifestNumber'))}</div>
        <div className="shared-truck-row">{show(f('DSOE ID', 'dsoeId', { lookup: DSOE_REFERENCE.map(([id, chalk]) => [id, chalk ? `CHALK ${chalk}` : '']) }), f('Chalk', 'chalk', { placeholder: '', help: 'Chalk: 001 - 999', lookup: false }))}</div>
        <div className="shared-truck-row">{show(f('Convoy Nbr', 'convoyNbr', { lookup: [] }))}</div>
        <div className="shared-truck-row">{show(f('Equipment Owner', 'equipmentOwner', { type: 'select', options: ['G', 'C'] }))}</div>
        <div className="shared-truck-row">{show(f('Mode', 'conveyanceMode', { type: 'select', options: ['9', 'B', '3'] }))}</div>
      </div>
      <div>
        <div className="shared-truck-row">{show(f('TMR Number', 'tmrNumber', { lookup: false }))}</div>
        <div className="shared-truck-row shared-truck-status">{show(sys('Status', 'statusCode', { ariaLabel: 'Status' }), sys('', 'statusText', { ariaLabel: 'Status description' }))}</div>
        <div className="shared-truck-row">{show(sys('Total Weight', 'totalWeight'))}</div>
        <div className="shared-truck-row">{show(sys('Total Cube', 'totalCube'))}</div>
      </div>
    </div>
    <div className="shared-tab-bar" role="tablist" aria-label="Truck Manifest tabs">{TABS.map(name => <button key={name} role="tab" aria-selected={tab === name} onClick={() => setTab(name)}>{name}</button>)}</div>
    <section role="tabpanel" aria-label={tab} className="shared-truck-panel">{panel()}</section>
    <p className="shared-air-errors">{record.check?.errors?.join(' ')}</p>
    <div className="shared-toolbar shared-truck-bottom">{ACTIONS.map(label => <button key={label} className={label === 'Edit Check' ? 'shared-truck-gap' : undefined}
      disabled={(['First', 'Previous'].includes(label) && index <= 0) || (['Next', 'Last'].includes(label) && index === all.length - 1) || (label === 'Abort Manifest' && !released)
        || (released && !['Abort Manifest', ...VIEW_ACTIONS].includes(label)) || (locked && !VIEW_ACTIONS.includes(label))}
      onClick={() => {
        if (['First', 'Previous', 'Next', 'Last'].includes(label)) { const next = label === 'First' ? 0 : label === 'Last' ? all.length - 1 : Math.max(0, Math.min(all.length - 1, index + (label === 'Next' ? 1 : -1))); openManifest(all[next]); }
        else action(label);
      }}>{label}</button>)}</div>
    {statementPick && <Dialog title="Hazardous Certification Statements" wide onClose={() => setStatementPick(null)} overlayClassName="shared-reference-overlay">
      <div className="shared-truck-statement-pick">
        <table className="shared-table"><colgroup><col style={{ width: 40 }} /><col style={{ width: 90 }} /><col /></colgroup>
          <thead><tr><th aria-label="Select" /><th>Cert ID</th><th>Statement</th></tr></thead>
          <tbody>{HAZ_STATEMENTS.filter(([cert]) => !(draft.statementIds || []).includes(cert)).map(([cert, text]) => <tr key={cert}>
            <td><input type="checkbox" aria-label={`Select statement ${cert}`} checked={statementPick.includes(cert)} onChange={e => setStatementPick(e.target.checked ? [...statementPick, cert] : statementPick.filter(x => x !== cert))} /></td><td>{cert}</td><td>{text}</td></tr>)}</tbody>
        </table>
        <footer><button disabled={!statementPick.length} onClick={() => { put({ statementIds: [...(draft.statementIds || []), ...statementPick] }); setStatementPick(null); }}>Assign</button><button onClick={() => setStatementPick(null)}>Close</button></footer>
      </div>
    </Dialog>}
  </div></Dialog>;
}
