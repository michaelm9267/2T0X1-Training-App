import { useRef, useState } from 'react';
import { field, collections } from './referenceInventory';
import { Dialog, Lookup, lookupValues } from './controls';
import ReferenceLookup from './ReferenceLookup';
import CmosDateField from './CmosDateField';
import ConveyanceDialog from './ConveyanceDialog';
import { SERVICE_CODES, serviceCodeInfo, splcFor } from './routingRequest';
import { createRecord, editRecord, totals } from './model';
import { CBL_LIST_COLUMNS, CBL_SAMPLES, HAZARDOUS_CERTIFICATION, addressPatch, cblRow, shipmentModes } from './cblLogic';
import { isHazardousIndicator } from '../CargoWindow/workflow';
import { AIR_SVC_TYPES, AIR_SVC_LEVELS } from './routingLogic';
import { FREIGHT_SERVICE_AGENCIES, LOW_COST_NOT_USED_REASONS, RIN_CODES, rinTextFor } from './dtrReference';

const TABS = ['TCNs', 'Addresses', 'Billing', 'Miscellaneous', 'RINs', 'Conveyances', 'Commodities', 'Service Codes', 'Via SCAC', 'Rail'];
const ACTIONS = ['Print', 'Validate Funds', 'Notices', 'Edit', 'Release', 'Save', 'Save and Close', 'Close'];
const VIEW_ACTIONS = ['Print', 'Close'];
const COUNTRIES = lookupValues({ id: 'ucCountry' });
const described = rows => ({ options: rows.map(([code]) => code), optionLabels: Object.fromEntries(rows.map(([code, text]) => [code, `${code} - ${text}`])) });
const STATES = Object.entries(lookupValues({ id: 'ucState' }));
const tcnColumns = [['tcn', 'TCN'], ['st', 'ST'], ['stopLd', 'Stop LD'], ['stopUl', 'Stop UL'], ['conveyance', 'Cnvync Nbr'], ['primaryEqNbr', 'Primary Eq Nbr'], ['consignor', 'Consignor'], ['consignee', 'Consignee'], ['pieces', 'Pieces'], ['weight', 'Weight'], ['cube', 'Cube']];
const conveyanceColumns = [['conveyanceSeqNbr', 'Seq Nbr'], ['primaryEqInit', 'Pri Eq Init'], ['primaryEqNbr', 'Pri Eq Nbr'], ['secondaryEqInit', 'Sec Eq Init'], ['secondaryEqNbr', 'Sec Eq Nbr'], ['equipTypeOrdered', 'Eq Ord'], ['equipTypeFurnished', 'Eq Fur'], ['cp', 'CP']];
const rinColumns = [['rin', 'RIN Nbr'], ['printRin', 'Print RIN'], ['typeRin', 'Type RIN'], ['customField', 'Custom Field'], ['description', 'RIN Text']];
const contains = (value, query) => !query || String(value ?? '').toUpperCase().includes(query.toUpperCase().replace(/%/g, ''));
const money = value => Number.isFinite(Number(value)) && String(value).trim() !== '' ? `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '';
// Visible label (with the CMOS required star) separate from the accessible name.
const f = (label, id, extra = {}) => ({ ...field(label.replace(/^\* /, ''), id), label, ariaLabel: extra.ariaLabel || label.replace(/^\* /, ''), ...extra });
const pick = (label, id, options, extra = {}) => f(label, id, { type: 'select', options, ...extra });
const flagField = (label, id) => f(label, id, { type: 'checkbox' });
const area = (label, id, extra = {}) => f(label, id, { type: 'textarea', ...extra });
// SPLCs for the DODAACs already in the system (training values; no licensed SPLC data).
const SYSTEM_DODAACS = lookupValues({ id: 'destination' });
const SYSTEM_SPLCS = SYSTEM_DODAACS.map(([code, text]) => [splcFor(code), `${code} ${String(text).trim()}`]);
const ADDRESS_BLOCKS = [['destination', 'Destination', 'splc'], ['origin', 'Origin', 'splc'], ['consignee', 'Consignee', 'gbloc'], ['shipper', 'Shipper', null]];
const addressFields = (prefix, title, third) => ({
  dodaac: f('* DODAAC', `${prefix}Dodaac`, { ariaLabel: `${title} DODAAC` }),
  name: f('* Name', `${prefix}Name`, { ariaLabel: `${title} Name`, lookup: false }),
  // SPLC is optional; its lookup lists only the DODAACs in the system.
  third: third === 'splc' ? f('SPLC', `${prefix}Splc`, { ariaLabel: `${title} SPLC`, lookup: SYSTEM_SPLCS }) : third === 'gbloc' ? f('GBLOC', 'gbloc') : null,
  address1: f('* Address 1', `${prefix}Address1`, { ariaLabel: `${title} Address 1`, lookup: false }),
  address2: f('Address 2', `${prefix}Address2`, { ariaLabel: `${title} Address 2`, lookup: false }),
  city: f('* City', `${prefix}City`, { ariaLabel: `${title} City`, lookup: false }),
  country: f('* Country', `${prefix}Country`, { ariaLabel: `${title} Country`, lookup: COUNTRIES }),
  state: f('* State', `${prefix}State`, { ariaLabel: `${title} State`, lookup: STATES }),
  zip: f('* Zip', `${prefix}Zip`, { ariaLabel: `${title} Zip`, lookup: false }),
});

export default function CommercialBolScreen({ store, record, opened, locked, renderFields, renderTab, change, edit, action, newBill, openBill, setAssignment, setAssignIds, openEntry, collectionRows, newCollection, print, setMessage }) {
  const [filters, setFilters] = useState({});
  const [tab, setTab] = useState('TCNs');
  const [tcnFilters, setTcnFilters] = useState({});
  const [tcnSelected, setTcnSelected] = useState([]);
  const [conveyanceFilters, setConveyanceFilters] = useState({});
  const [miscTab, setMiscTab] = useState('Shipment Contacts/Emergency Phone Numbers');
  // BOL RIN dialog: { id } edits an existing RIN row; id null adds one.
  const [rinDialog, setRinDialog] = useState(null);
  const [svcDialog, setSvcDialog] = useState(null);
  // Conveyance dialog: { id, initial }; id null is a new conveyance.
  const [cnvDialog, setCnvDialog] = useState(null);
  const [railLookup, setRailLookup] = useState(null);
  const railPick = useRef(null);
  const actual = Object.values(store.bills);
  const all = [...actual, ...CBL_SAMPLES.filter(sample => !actual.some(r => r.id === sample.id || r.draft.movementDocNbr === sample.draft.movementDocNbr))]
    .sort((a, b) => String(b.draft.movementDocNbr || '').localeCompare(String(a.draft.movementDocNbr || '')));
  if (!opened || !record) {
    const rows = all.map(r => ({ r, row: cblRow(store, r) })).filter(({ row }) => Object.entries(filters).every(([key, value]) => contains(row[key], value)));
    return <div className="shared-cbl-list">
      <div className="shared-cbl-grid">
        <div className="shared-toolbar"><button disabled={locked} onClick={() => { newBill(); setTab('TCNs'); }}>New</button><button onClick={() => setFilters({})}>Clear</button></div>
        <div className="shared-table-scroll"><table className="shared-table shared-cbl-list-table">
          <thead>
            <tr className="shared-air-filters">{CBL_LIST_COLUMNS.map(([key, label]) => <th key={key}><input aria-label={`Filter bill ${label}`} value={filters[key] || ''} onChange={e => setFilters({ ...filters, [key]: e.target.value })} /></th>)}</tr>
            <tr>{CBL_LIST_COLUMNS.map(([key, label]) => <th key={key}>{label}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map(({ r, row }) => <tr key={r.id} aria-selected={r.id === record?.id}>{CBL_LIST_COLUMNS.map(([key]) => <td key={key} title={String(row[key] ?? '')}>{key === 'movementDocNbr'
              ? <><span className="shared-cbl-expand" aria-hidden="true" /><button className="shared-cbl-link" aria-label={`Open bill ${row.movementDocNbr}`} onClick={() => { openBill(r); setTab('TCNs'); setTcnSelected([]); }}>{row.movementDocNbr}</button></>
              : String(row[key] ?? '')}</td>)}</tr>)}
            {!rows.length && <tr><td colSpan={CBL_LIST_COLUMNS.length}>No data to display.</td></tr>}
          </tbody>
        </table></div>
        <div className="shared-air-count">{rows.length} row(s) found.</div>
      </div>
    </div>;
  }

  const id = record.id;
  const draft = record.draft || {};
  // A released bill is closed: its Service Codes and Rail tabs become read-only.
  const closed = locked || record.status === 'Released';
  const shipments = (draft.shipmentIds || []).map(sid => store.shipments[sid]).filter(Boolean);
  const conveyances = collectionRows('Conveyances');
  const figures = draft.sampleTotals ? { ...draft.sampleTotals, cube: 0 } : totals(store, draft.shipmentIds || []);
  const hazardous = shipments.some(r => isHazardousIndicator(r.draft.hazmat));
  const values = {
    ...draft,
    ...shipmentModes(store, draft),
    routing: typeof draft.routing === 'string' ? draft.routing : '',
    currency: 'USD',
    oaCharges: money(draft.oaCharges ?? draft.estimatedCharges),
    nbrOfClsTls: String(Math.max(1, conveyances.length)),
    hazardousCert: hazardous ? HAZARDOUS_CERTIFICATION : '',
  };
  const onEdit = (key, value) => {
    const block = /^(destination|origin|consignee|shipper)Dodaac$/.exec(key);
    if (block) {
      const dodaac = String(value).toUpperCase();
      // A DODAAC in the system brings its SPLC for the blocks that have one.
      const splc = ['destination', 'origin'].includes(block[1]) && SYSTEM_DODAACS.some(([code]) => code === dodaac) ? { [`${block[1]}Splc`]: splcFor(dodaac) } : {};
      return change(editRecord(store, 'bills', id, { [key]: dodaac, ...addressPatch(block[1], value), ...splc }));
    }
    if (key === 'estimatedCharges') return change(editRecord(store, 'bills', id, { estimatedCharges: value, oaCharges: value }));
    edit(key, value);
  };
  const show = (...fields) => renderFields(fields.filter(Boolean), values, onEdit);
  const header = [
    [f('Movement Doc Nbr', 'movementDocNbr', { readOnly: true }), f('* Assign SCAC', 'scac'), f('Routing', 'routing', { readOnly: true, lookup: false }), pick('Status', 'routingStatus', [], { readOnly: true })],
    [f('Route ID', 'routeId', { lookup: false }), pick('Air Service Type', 'airServiceType', [], described(AIR_SVC_TYPES)), pick('Air Service Level', 'airServiceLevel', [], described(AIR_SVC_LEVELS)), pick('ETRR ID', 'etrrId', []), flagField('Complete', 'complete')],
  ];
  const stopsFor = sid => ({ stopLd: '00', stopUl: '99', conveyance: '001', ...draft.tcnStops?.[sid] });
  const setStop = (sid, key, value) => edit('tcnStops', { ...draft.tcnStops, [sid]: { ...stopsFor(sid), [key]: value } });
  const tcnRows = shipments.map(r => {
    const stops = stopsFor(r.id);
    const conveyance = conveyances.find(c => c.draft.conveyanceSeqNbr === stops.conveyance);
    const t = totals(store, [r.id]);
    return { id: r.id, tcn: r.draft.tcn || r.id, st: 'ST', ...stops, primaryEqNbr: conveyance?.draft.primaryEqNbr || 'NONE', consignor: r.draft.origin || '', consignee: r.draft.destination || '', pieces: t.pieces, weight: t.weight, cube: Math.round(t.cube) };
  }).filter(row => Object.entries(tcnFilters).every(([key, value]) => contains(row[key], value)));
  const nextConveyanceSeq = (after = 0) => String(Math.max(Number(after) || 0, ...conveyances.map(c => Number(c.draft.conveyanceSeqNbr) || 0)) + 1).padStart(3, '0');
  const saveConveyance = (cid, values) => {
    if (cid) { change(editRecord(store, 'documents', cid, values)); return cid; }
    const next = createRecord(store, 'documents', { ownerId: id, ownerKind: 'bills', collection: 'Conveyances', ...values });
    change(next);
    setMessage('Conveyance saved. Save the bill of lading.');
    return next.selection.documents;
  };
  const conveyanceOptions = [...new Set(['001', ...conveyances.map(c => c.draft.conveyanceSeqNbr).filter(Boolean)])];

  const panel = () => {
    if (tab === 'TCNs') return <div className="shared-cbl-grid">
      <div className="shared-toolbar">
        <button disabled={locked} onClick={() => { setAssignment(true); setAssignIds([]); }}>Assign TCNs/Aggregates</button>
        <button disabled={locked} onClick={() => {
          const existing = collectionRows('Stop Offs')[0];
          if (existing) openEntry('documents', existing.id, 'Stop Offs detail', collections['Stop Offs']);
          else newCollection('Stop Offs');
        }}>Stop Off Data</button>
        <button onClick={() => { setTcnFilters({}); setTcnSelected([]); }}>Clear</button>
        {tcnSelected.length > 0 && <button disabled={locked} onClick={() => { change(editRecord(store, 'bills', id, { shipmentIds: (draft.shipmentIds || []).filter(sid => !tcnSelected.includes(sid)) })); setTcnSelected([]); }}>Unassign</button>}
      </div>
      <div className="shared-table-scroll"><table className="shared-table">
        <thead>
          <tr className="shared-air-filters">{tcnColumns.map(([key, label]) => <th key={key}><input aria-label={`Filter TCN ${label}`} value={tcnFilters[key] || ''} onChange={e => setTcnFilters({ ...tcnFilters, [key]: e.target.value })} /></th>)}</tr>
          <tr>{tcnColumns.map(([key, label]) => <th key={key}>{label}</th>)}</tr>
        </thead>
        <tbody>
          {tcnRows.map(row => <tr key={row.id} aria-selected={tcnSelected.includes(row.id)} onClick={e => { if (e.target.closest('input,select,button')) return; setTcnSelected(e.ctrlKey || e.metaKey ? [...new Set([...tcnSelected, row.id])] : [row.id]); }}>
            {tcnColumns.map(([key]) => <td key={key}>
              {key === 'tcn' ? <><input className="shared-air-select-checkbox" type="checkbox" aria-label={`Select ${row.tcn}`} checked={tcnSelected.includes(row.id)} onChange={e => setTcnSelected(e.target.checked ? [...tcnSelected, row.id] : tcnSelected.filter(x => x !== row.id))} /><span className="shared-cbl-link">{row.tcn}</span></>
                : ['stopLd', 'stopUl'].includes(key) ? <input className="shared-cbl-cell-input" aria-label={`${key === 'stopLd' ? 'Stop LD' : 'Stop UL'} ${row.tcn}`} value={row[key]} disabled={locked} onChange={e => setStop(row.id, key, e.target.value)} />
                : key === 'conveyance' ? <select aria-label={`Cnvync Nbr ${row.tcn}`} value={row.conveyance} disabled={locked} onChange={e => setStop(row.id, 'conveyance', e.target.value)}>{conveyanceOptions.map(o => <option key={o}>{o}</option>)}</select>
                : String(row[key] ?? '')}
            </td>)}
          </tr>)}
          {!tcnRows.length && <tr><td colSpan={tcnColumns.length}>No data to display.</td></tr>}
        </tbody>
      </table></div>
      <div className="shared-air-count">{tcnRows.length} row(s) found.</div>
    </div>;
    if (tab === 'Addresses') return <div className="shared-cbl-addresses">
      {ADDRESS_BLOCKS.map(([prefix, title, third]) => {
        const a = addressFields(prefix, title, third);
        return <section key={prefix} aria-label={`${title} address`}>
          <h4>{title}</h4>
          <div className="shared-cbl-address-grid">
            <div>{show(a.dodaac)}</div><div>{show(a.name)}</div><div>{a.third && show(a.third)}</div>
            <div /><div>{show(a.address1)}</div><div>{show(a.address2)}</div>
            <div /><div className="shared-cbl-pair">{show(a.city, a.country)}</div><div className="shared-cbl-pair">{show(a.state, a.zip)}</div>
          </div>
        </section>;
      })}
    </div>;
    if (tab === 'Billing') {
      const byTac = new Map();
      for (const r of shipments) {
        const key = r.draft.tac || '';
        byTac.set(key, (byTac.get(key) || 0) + totals(store, [r.id]).weight);
      }
      const charges = Number(draft.estimatedCharges) || 0;
      return <div className="shared-cbl-billing">
        <div className="shared-cbl-billing-left">
          {show(pick('* Bill To', 'billTo', ['USBANK'], { optionLabels: { USBANK: 'USBANK - US Bank' } }), f('Name', 'billToName', { ariaLabel: 'Bill To Name', lookup: false }), f('Address', 'billToAddress', { ariaLabel: 'Bill To Address', lookup: false }), f('Address 2', 'billToAddress2', { ariaLabel: 'Bill To Address 2', lookup: false }), f('City', 'billToCity', { ariaLabel: 'Bill To City', lookup: false }))}
          <div className="shared-cbl-pair shared-cbl-billto-place">{show(f('Country', 'billToCountry', { ariaLabel: 'Bill To Country', lookup: COUNTRIES }), f('State', 'billToState', { ariaLabel: 'Bill To State', lookup: STATES }), f('Zip', 'billToZip', { ariaLabel: 'Bill To Zip', lookup: false }))}</div>
          <fieldset className="shared-cbl-accounting">
            <legend>Accounting</legend>
            <p><strong>B/L Weight:</strong> {figures.weight} <strong>Est. Charges:</strong> {money(draft.estimatedCharges)}</p>
            <table className="shared-table"><thead><tr><th>Advice Nbr</th><th>Accounting Classification</th><th>Weight</th><th>Est Charges</th></tr></thead>
              <tbody>{[...byTac].map(([tac, weight]) => <tr key={tac}><td /><td>{tac}</td><td>{weight}</td><td>{figures.weight ? money(charges * weight / figures.weight) : ''}</td></tr>)}
                {!byTac.size && <tr><td colSpan={4}>No data to display.</td></tr>}</tbody></table>
          </fieldset>
        </div>
        <div className="shared-cbl-billing-right">
          <div className="shared-cbl-pair">{show(pick('* Bill Type', 'billType', ['TP - Third Party Pays', 'PP - Prepaid', 'CC - Collect']), pick('Carrier Acct Nbr', 'carrierAcctNbr', []))}</div>
          <div className="shared-cbl-pair">{show(f('* NMFC/UFC', 'nmfcUfc', { lookup: false }), f('', 'nmfcSub', { ariaLabel: 'NMFC/UFC Sub', lookup: false }))}</div>
          <div className="shared-cbl-pair">{show(f('* Currency/Est. Charges', 'currency', { ariaLabel: 'Currency', readOnly: true, lookup: false }), f('', 'estimatedCharges', { ariaLabel: 'Est Charges', lookup: false }), f('OA Charges', 'oaCharges', { readOnly: true, lookup: false }))}</div>
          <div className="shared-cbl-pair">{show(pick('* Tariff/Special Rate Auth', 'tariffSpecialRateAuth', [...new Set([draft.tariffSpecialRateAuth, draft.scac && `${draft.scac}00102400 - B 01Jan2026 31Dec2026`].filter(Boolean))]), f('Release Value', 'releaseValue', { lookup: false }))}</div>
          {show(area('Hazardous Cert', 'hazardousCert', { readOnly: true }), f('Certifying Person', 'certifyingPerson', { lookup: false }), area('Remarks-1', 'remarks1'), area('Remarks-2', 'remarks'), area('Marks/Annotations', 'marksAnnotations'), area('Desc of Art Misc Remarks', 'descOfArtMiscRemarks'))}
        </div>
      </div>;
    }
    if (tab === 'Miscellaneous') return <div className="shared-cbl-misc">
      <div className="shared-cbl-row">{show(flagField('Pickup Service Furnished', 'pickupServiceFurnished'), flagField('Foreign Military Sales', 'foreignMilitarySales'), flagField('International Duty Free', 'internationalDutyFree'), flagField('Tailored Transportation Contract', 'tailoredTransportationContract'), flagField('DTTS', 'dtts'))}</div>
      <div className="shared-cbl-row">{show(flagField('Contract', 'contract'), f('* Authority', 'contractAuthority', { lookup: false }), f('Request Order Nbr Date', 'requestOrderNbrDate'))}</div>
      <div className="shared-cbl-row shared-cbl-gap">{show(f('Carrier/Waybill Nbr', 'waybill', { lookup: false }), pick('Service Agency', 'serviceAgency', [], described(FREIGHT_SERVICE_AGENCIES)), f('Shipper Initials', 'shipperInitials', { lookup: false }), f('Rated Mileage', 'ratedMileage', { lookup: false }))}</div>
      <div className="shared-cbl-row">{show(f('MTX', 'mtx', { lookup: false }), f('* Delivery Date', 'deliveryDate'), pick('', 'deliveryDateType', ['Desired', 'Required'], { ariaLabel: 'Delivery Date Type' }), f('Type Rate', 'typeRate', { lookup: false }), pick('Reason', 'reason', [], described(LOW_COST_NOT_USED_REASONS)), f('Cost Diff', 'costDiff', { lookup: false }))}</div>
      <div className="shared-cbl-row shared-cbl-gap">{show(f('FOB Point', 'fobPoint', { lookup: false }), f('Base/City', 'city', { lookup: false }), f('State', 'state', { ariaLabel: 'FOB State', lookup: STATES }), f('SPLC', 'splc', { ariaLabel: 'FOB SPLC', lookup: false }))}</div>
      <div className="shared-cbl-row">{show(f('Mil Mode', 'milMode', { readOnly: true, lookup: false }), f('EDI Mode', 'ediMode', { readOnly: true, lookup: false }), f('DSOE ID', 'dsoeId', { lookup: false }), f('Chalk', 'chalk', { lookup: false }), f('Nbr of CLS/TLS', 'nbrOfClsTls', { readOnly: true, lookup: false }), pick('Blk 31 Prot Svc', 'blk31ProtSvc', ['Y', 'N']))}</div>
      <div className="shared-cbl-row">{show(f('Vessel Name', 'vesselName', { lookup: false }), f('IRCS', 'ircs', { lookup: false }))}</div>
      <div className="shared-tab-bar shared-cbl-subtabs" role="tablist" aria-label="Miscellaneous sections">{['Shipment Contacts/Emergency Phone Numbers', 'B/L Weights'].map(t => <button key={t} role="tab" aria-selected={miscTab === t} onClick={() => setMiscTab(t)}>{t}</button>)}</div>
      <div className="shared-cbl-subpanel" role="tabpanel" aria-label={miscTab}>
        {miscTab === 'B/L Weights' ? <table className="shared-table"><thead><tr><th>Pieces</th><th>Weight</th><th>Cube</th></tr></thead><tbody><tr><td>{figures.pieces}</td><td>{figures.weight}</td><td>{Math.round(figures.cube || 0)}</td></tr></tbody></table>
          : [1, 2, 3].map(n => <div className="shared-cbl-row shared-cbl-phone" key={n}>{show(f(`Phone Number ${n}`, `phoneNumber${n}`, { lookup: false }), pick(`Phone Number Type ${n}`, `phoneNumberType${n}`, ['Emergency', 'Shipper', 'Consignee', 'Carrier']))}</div>)}
      </div>
    </div>;
    if (tab === 'RINs') {
      const rows = collectionRows('RINs');
      return <div className="shared-cbl-grid">
        <div className="shared-toolbar"><button disabled={locked} onClick={() => setRinDialog({ id: null, rin: '', print: false })}>New</button></div>
        <div className="shared-table-scroll"><table className="shared-table">
          <thead><tr>{rinColumns.map(([key, label]) => <th key={key}>{label}</th>)}</tr></thead>
          <tbody>{rows.map(r => <tr key={r.id}>{rinColumns.map(([key], i) => <td key={key}>{i === 0 ? <button className="shared-cbl-link" aria-label={`Open RIN ${r.draft.rin || r.id}`} onClick={() => setRinDialog({ id: r.id, rin: r.draft.rin || '', print: r.draft.printRin === 'Y' })}>{r.draft.rin || '(blank)'}</button> : String(r.draft[key] ?? '')}</td>)}</tr>)}
            {!rows.length && <tr><td colSpan={rinColumns.length}>No data to display.</td></tr>}</tbody>
        </table></div>
        <div className="shared-air-count">{rows.length} row(s) found.</div>
      </div>;
    }
    if (tab === 'Conveyances') {
      const rows = conveyances.filter(r => Object.entries(conveyanceFilters).every(([key, value]) => contains(r.draft[key], value)));
      return <div className="shared-cbl-grid">
        <div className="shared-toolbar">
          <button disabled={locked} onClick={() => setCnvDialog({ id: null, initial: { conveyanceSeqNbr: nextConveyanceSeq(), primaryEqInit: draft.scac || '' } })}>New</button>
          <button onClick={() => print('Conveyances')}>Print</button>
          <button onClick={() => setConveyanceFilters({})}>Clear</button>
        </div>
        <div className="shared-table-scroll"><table className="shared-table">
          <thead>
            <tr className="shared-air-filters">{conveyanceColumns.map(([key, label]) => <th key={key}><input aria-label={`Filter conveyance ${label}`} value={conveyanceFilters[key] || ''} onChange={e => setConveyanceFilters({ ...conveyanceFilters, [key]: e.target.value })} /></th>)}</tr>
            <tr>{conveyanceColumns.map(([key, label]) => <th key={key}>{label}</th>)}</tr>
          </thead>
          <tbody>{rows.map(r => <tr key={r.id}>{conveyanceColumns.map(([key], i) => <td key={key}>{i === 0 ? <button className="shared-cbl-link" aria-label={`Open conveyance ${r.draft.conveyanceSeqNbr || r.id}`} onClick={() => setCnvDialog({ id: r.id, initial: r.draft })}>{r.draft.conveyanceSeqNbr || '(blank)'}</button> : String(r.draft[key] ?? '')}</td>)}</tr>)}
            {!rows.length && <tr><td colSpan={conveyanceColumns.length}>No data to display.</td></tr>}</tbody>
        </table></div>
        <div className="shared-air-count">{rows.length} row(s) found.</div>
      </div>;
    }
    if (tab === 'Commodities') return <div className="shared-cbl-grid shared-cbl-commodities">
      <div className="shared-table-scroll"><table className="shared-table">
        <thead><tr><th>NMFC/UFC</th><th>Released Value</th><th>Qualifier</th></tr></thead>
        <tbody><tr>
          <td className="shared-cbl-center"><input aria-label="Commodity NMFC/UFC" className="shared-cbl-cell" readOnly value={draft.nmfcUfc || ''} style={{ width: '82px' }} />
            <input aria-label="Commodity NMFC/UFC Sub" className="shared-cbl-cell" readOnly value={draft.nmfcSub || ''} style={{ width: '24px' }} /></td>
          <td className="shared-cbl-center"><input aria-label="Commodity Released Value" className="shared-cbl-cell" readOnly value={draft.releaseValue || ''} style={{ width: '82px' }} /></td>
          <td><select aria-label="Commodity Qualifier" className="shared-cbl-cell" disabled={locked} value={draft.commodityQualifier || ''} onChange={e => edit('commodityQualifier', e.target.value)} style={{ width: '100%' }}>
            <option value="" /></select></td>
        </tr></tbody>
      </table></div>
    </div>;
    if (tab === 'Service Codes') {
      // Carried over from the route order's equipment group (Equip Load Plan → Service Codes).
      const rows = draft.serviceCodes || [];
      return <div className="shared-cbl-grid">
        <div className="shared-toolbar shared-cbl-empty-toolbar">{!closed && <button onClick={() => setSvcDialog({ code: '', performDate: '', stop: '', cnvSeqNbr: '', charges: '' })}>New</button>}</div>
        <div className="shared-table-scroll"><table className="shared-table">
          <thead><tr>{['Svc Code', 'Svc Code Type', 'Perform Date', 'Special Charge Desc', 'Stop', 'Cnv Seq Nbr', 'Service Charges'].map(label => <th key={label}>{label}</th>)}</tr></thead>
          <tbody>{rows.map((r, i) => <tr key={`${r.code}-${i}`}><td><span className="shared-cbl-link-text">{r.code}</span></td><td>{r.type}</td><td>{r.performDate}</td><td>{r.desc}</td><td>{r.stop}</td><td>{r.cnvSeqNbr || ''}</td><td>{money(r.charges || 0).replace('$0.00', '$.00')}</td></tr>)}
            {!rows.length && <tr><td colSpan={7}>No data to display.</td></tr>}</tbody>
        </table></div>
        <div className="shared-air-count">{rows.length} row(s) found.</div>
      </div>;
    }
    if (tab === 'Via SCAC') {
      const rows = draft.viaScacs || [];
      return <div className="shared-cbl-grid">
        <div className="shared-toolbar shared-cbl-empty-toolbar" />
        <div className="shared-table-scroll"><table className="shared-table">
          <thead><tr><th>Seq Code</th><th>SCAC</th><th>SPLC</th></tr></thead>
          <tbody>{rows.map((r, i) => <tr key={i}><td>{r.seq}</td><td>{r.scac}</td><td>{r.splc}</td></tr>)}
            {!rows.length && <tr><td colSpan={3}>No data to display.</td></tr>}</tbody>
        </table></div>
        <div className="shared-air-count">{rows.length} row(s) found.</div>
      </div>;
    }
    if (tab === 'Rail') {
      // Editable while the bill is open; greyed once it is released (closed).
      const rail = !closed;
      const dodaacRows = lookupValues({ id: 'destination' });
      const lookups = {
        Dodaac: dodaacRows,
        Splc: SYSTEM_SPLCS,
        Country: COUNTRIES,
        State: STATES,
      };
      const pickDodaac = (prefix, dodaac) => {
        const a = addressPatch('rail', dodaac);
        change(editRecord(store, 'bills', id, { [`${prefix}Dodaac`]: dodaac, [`${prefix}Name`]: a.railName || '', [`${prefix}Address`]: a.railAddress1 || '', [`${prefix}Address2`]: a.railAddress2 || '',
          [`${prefix}City`]: a.railCity || '', [`${prefix}Country`]: a.railCountry || '', [`${prefix}State`]: a.railState || '', [`${prefix}Zip`]: a.railZip || '', [`${prefix}Splc`]: splcFor(dodaac) }));
      };
      const box = (key, label, width, { system } = {}) => {
        const name = label.startsWith('Empty') ? label : `${key.startsWith('railDest') ? 'Destination' : key.startsWith('railOrigin') ? 'Origin' : 'Empty Rail Car'} ${label}`;
        const kind = Object.keys(lookups).find(k => key.endsWith(k));
        return <span className="shared-cbl-rail-field">
          <label htmlFor={`rail-${key}`} className={system && !rail ? 'shared-route-system' : undefined}>{label}:</label>
          <input id={`rail-${key}`} aria-label={name} readOnly={!rail} value={draft[key] || ''} onChange={e => edit(key, e.target.value.toUpperCase())} style={{ width }} />
          {rail && kind && <button type="button" className="shared-route-lookup" aria-label={`Look up ${name}`} onClick={() => setRailLookup({ key, name, rows: lookups[kind], dodaac: kind === 'Dodaac' })}>
            <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"><circle cx="6.5" cy="6.5" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="m10 10 4 4" stroke="currentColor" strokeWidth="1.5" /></svg>
          </button>}
        </span>;
      };
      railPick.current = pickDodaac;
      const block = (prefix, title) => <div className="shared-cbl-rail-block">
        <div className="shared-cbl-rail-title"><h4>{title}</h4>{box(`${prefix}Dodaac`, 'DODAAC', '84px')}</div>
        <div className="shared-cbl-rail-lines">
          <div>{box(`${prefix}Name`, 'Name', '432px')}{box(`${prefix}Splc`, 'SPLC', '118px', { system: true })}</div>
          <div>{box(`${prefix}Address`, 'Address', '432px')}{box(`${prefix}Address2`, 'Address 2', '432px', { system: true })}</div>
          <div>{box(`${prefix}City`, 'City', '312px')}{box(`${prefix}Country`, 'Country', '46px')}{box(`${prefix}State`, 'State', '46px')}{box(`${prefix}Zip`, 'Zip', '130px', { system: true })}</div>
        </div>
      </div>;
      return <div className="shared-cbl-rail">
        {block('railOrigin', 'Origin')}
        {block('railDest', 'Destination')}
        <fieldset className="shared-cbl-rail-empty"><legend>Empty Rail Car</legend>
          <div className="shared-cbl-rail-empty-fields">
            <div>{box('railEmptyName', 'Name', '430px', { system: true })}</div>
            <div>{box('railEmptyCity', 'City', '310px')}{box('railEmptyCountry', 'Country', '46px')}{box('railEmptyState', 'State', '46px')}</div>
          </div>
          <table className="shared-table shared-cbl-rail-grid"><thead><tr><th>SCAC</th><th>SPLC</th></tr></thead>
            <tbody>{[0, 1, 2, 3, 4].map(i => <tr key={i}><td>{draft.railEmptyCars?.[i]?.scac || ''}</td><td>{draft.railEmptyCars?.[i]?.splc || ''}</td></tr>)}</tbody></table>
        </fieldset>
      </div>;
    }
    return <div className="shared-cbl-generic">{renderTab(tab)}</div>;
  };

  return <div className="shared-cbl-detail">
    <div className="shared-cbl-header">{header.map((row, i) => <div className="shared-cbl-row" key={i}>{show(...row)}</div>)}</div>
    <div className="shared-tab-bar shared-cbl-tabs" role="tablist" aria-label="Commercial Bill of Lading tabs">{TABS.map(t => <button key={t} role="tab" aria-selected={tab === t} onClick={() => { setTab(t); setTcnSelected([]); }}>{t}</button>)}</div>
    <section role="tabpanel" aria-label={tab} className="shared-cbl-panel">{panel()}</section>
    <p className="shared-air-errors">{record.check?.errors?.join(' ')}</p>
    {railLookup && <Lookup field={{ id: railLookup.key, label: railLookup.name }} rows={railLookup.rows}
      onSelect={value => (railLookup.dodaac ? railPick.current?.(railLookup.key.replace(/Dodaac$/, ''), value) : edit(railLookup.key, value))} onClose={() => setRailLookup(null)} />}
    {cnvDialog && <ConveyanceDialog key={cnvDialog.id || 'new'} initial={cnvDialog.initial} recordId={cnvDialog.id} locked={closed} scac={draft.scac} nextSeq={nextConveyanceSeq}
      onSave={saveConveyance} onClose={() => setCnvDialog(null)} />}
    {svcDialog && (() => {
      const info = serviceCodeInfo(svcDialog.code);
      const set = patch => setSvcDialog(d => ({ ...d, ...patch }));
      return <Dialog title="Service Code" bare onClose={() => setSvcDialog(null)} overlayClassName="shared-route-equipment-overlay shared-route-new-service shared-cbl-service-dialog">
        <div className="shared-route-equipment shared-route-service-form">
          <span className="shared-route-field"><label htmlFor="cbl-svc-code">Service Code:</label>
            <input id="cbl-svc-code" aria-label="Service Code" style={{ width: '40px' }} value={svcDialog.code} onChange={e => set({ code: e.target.value.toUpperCase() })} />
            <button type="button" className="shared-route-lookup" aria-label="Look up Service Code" onClick={() => set({ lookup: true })}>
              <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"><circle cx="6.5" cy="6.5" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="m10 10 4 4" stroke="currentColor" strokeWidth="1.5" /></svg>
            </button></span>
          <span className="shared-route-field"><label className="shared-route-system">Svc Code Type:</label><input aria-label="Svc Code Type" readOnly value={info?.[1] || ''} style={{ width: '150px' }} /></span>
          <span className="shared-route-field"><label className="shared-route-system">Special Charge Desc:</label><input aria-label="Special Charge Desc" readOnly value={info?.[2] || ''} style={{ width: '150px' }} /></span>
          <span className="shared-route-field"><label htmlFor="cbl-svc-date">Perform Date:</label><CmosDateField id="cbl-svc-date" label="Perform Date" width="110px" value={svcDialog.performDate} onChange={v => set({ performDate: v })} /></span>
          <span className="shared-route-field"><label htmlFor="cbl-svc-stop">Stop:</label><select id="cbl-svc-stop" aria-label="Stop" value={svcDialog.stop} onChange={e => set({ stop: e.target.value })}><option value="" /><option value="99">99</option></select></span>
          <span className="shared-route-field"><label htmlFor="cbl-svc-cnv">Cnv Seq Nbr:</label><input id="cbl-svc-cnv" aria-label="Cnv Seq Nbr" style={{ width: '40px' }} value={svcDialog.cnvSeqNbr} onChange={e => set({ cnvSeqNbr: e.target.value })} /></span>
          <span className="shared-route-field"><label htmlFor="cbl-svc-chg">Service Charges:</label><input id="cbl-svc-chg" aria-label="Service Charges" style={{ width: '80px' }} value={svcDialog.charges} onChange={e => set({ charges: e.target.value.replace(/[^\d.]/g, '') })} /></span>
          <footer>
            <button type="button" onClick={() => {
              if (!svcDialog.code.trim()) return;
              edit('serviceCodes', [...(draft.serviceCodes || []), { code: svcDialog.code.trim(), type: info?.[1] || '', desc: info?.[2] || '', performDate: svcDialog.performDate, stop: svcDialog.stop, cnvSeqNbr: svcDialog.cnvSeqNbr, charges: Number(svcDialog.charges) || 0 }]);
              setSvcDialog(null);
            }}>Save</button>
            <button type="button" onClick={() => setSvcDialog(null)}>Close</button>
          </footer>
        </div>
        {svcDialog.lookup && <ReferenceLookup title="Service Code Lookup" columns={['Service Code', 'Service Code Type', 'Description']} rows={SERVICE_CODES}
          onSelect={code => set({ code })} onClose={() => set({ lookup: false })} />}
      </Dialog>;
    })()}
    {rinDialog && (() => {
      const others = collectionRows('RINs').filter(r => r.id !== rinDialog.id).map(r => r.draft.rin);
      const codes = RIN_CODES.filter(([code]) => !others.includes(code));
      const save = () => {
        const values = { rin: rinDialog.rin, printRin: rinDialog.print ? 'Y' : 'N', description: rinTextFor(rinDialog.rin) };
        if (rinDialog.id) change(editRecord(store, 'documents', rinDialog.id, values));
        else change(createRecord(store, 'documents', { ownerId: id, ownerKind: 'bills', collection: 'RINs', typeRin: '', customField: '', ...values }));
        setMessage('RIN saved. Save the bill of lading.');
        setRinDialog(null);
      };
      return <Dialog title="BOL RIN" wide overlayClassName="shared-cbl-rin-overlay" onClose={() => setRinDialog(null)}>
        <div className="shared-cbl-rin">
          <label>* RIN Nbr:<select aria-label="RIN Nbr" value={rinDialog.rin} disabled={locked} onChange={e => setRinDialog({ ...rinDialog, rin: e.target.value })}>
            <option value="" />{codes.map(([code, text]) => <option key={code} value={code} title={text}>{`${code} - ${text}`}</option>)}
          </select></label>
          <label>Print RIN:<input type="checkbox" aria-label="Print RIN" checked={rinDialog.print} disabled={locked} onChange={e => setRinDialog({ ...rinDialog, print: e.target.checked })} /></label>
          <label className="shared-cbl-rin-system">Type RIN:<input aria-label="Type RIN" value="" readOnly /></label>
          <label className="shared-cbl-rin-system shared-cbl-rin-text">RIN Text:<textarea aria-label="RIN Text" value={rinTextFor(rinDialog.rin)} readOnly /></label>
          <footer><button disabled={locked || !rinDialog.rin} onClick={save}>Save</button><button onClick={() => setRinDialog(null)}>Close</button></footer>
        </div>
      </Dialog>;
    })()}
    <div className="shared-toolbar shared-cbl-bottom">{ACTIONS.map(label => <button key={label} disabled={locked && !VIEW_ACTIONS.includes(label)} onClick={() => { if (label === 'Close') setMessage(''); action(label); }}>{label}</button>)}</div>
  </div>;
}
