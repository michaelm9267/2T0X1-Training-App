import { useState } from 'react';
import { field, collections } from './referenceInventory';
import { Dialog, lookupValues } from './controls';
import { createRecord, editRecord, totals } from './model';
import { CBL_LIST_COLUMNS, CBL_SAMPLES, HAZARDOUS_CERTIFICATION, addressPatch, cblRow, shipmentModes } from './cblLogic';
import { isHazardousIndicator } from '../CargoWindow/workflow';
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
const ADDRESS_BLOCKS = [['destination', 'Destination', 'splc'], ['origin', 'Origin', 'splc'], ['consignee', 'Consignee', 'gbloc'], ['shipper', 'Shipper', null]];
const addressFields = (prefix, title, third) => ({
  dodaac: f('* DODAAC', `${prefix}Dodaac`, { ariaLabel: `${title} DODAAC` }),
  name: f('* Name', `${prefix}Name`, { ariaLabel: `${title} Name`, lookup: false }),
  third: third === 'splc' ? f('* SPLC', `${prefix}Splc`, { ariaLabel: `${title} SPLC`, lookup: false }) : third === 'gbloc' ? f('GBLOC', 'gbloc') : null,
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
    if (block) return change(editRecord(store, 'bills', id, { [key]: String(value).toUpperCase(), ...addressPatch(block[1], value) }));
    if (key === 'estimatedCharges') return change(editRecord(store, 'bills', id, { estimatedCharges: value, oaCharges: value }));
    edit(key, value);
  };
  const show = (...fields) => renderFields(fields.filter(Boolean), values, onEdit);
  const header = [
    [f('Movement Doc Nbr', 'movementDocNbr', { readOnly: true }), f('* Assign SCAC', 'scac'), f('Routing', 'routing', { readOnly: true, lookup: false }), pick('Status', 'routingStatus', [], { readOnly: true })],
    [f('Route ID', 'routeId', { lookup: false }), pick('Air Service Type', 'airServiceType', ['DOM - Domestic', 'INT - International']), pick('Air Service Level', 'airServiceLevel', ['1 - Next Day', '2 - Second Day', '3 - Deferred']), pick('ETRR ID', 'etrrId', []), flagField('Complete', 'complete')],
  ];
  const stopsFor = sid => ({ stopLd: '00', stopUl: '99', conveyance: '001', ...draft.tcnStops?.[sid] });
  const setStop = (sid, key, value) => edit('tcnStops', { ...draft.tcnStops, [sid]: { ...stopsFor(sid), [key]: value } });
  const tcnRows = shipments.map(r => {
    const stops = stopsFor(r.id);
    const conveyance = conveyances.find(c => c.draft.conveyanceSeqNbr === stops.conveyance);
    const t = totals(store, [r.id]);
    return { id: r.id, tcn: r.draft.tcn || r.id, st: 'ST', ...stops, primaryEqNbr: conveyance?.draft.primaryEqNbr || 'NONE', consignor: r.draft.origin || '', consignee: r.draft.destination || '', pieces: t.pieces, weight: t.weight, cube: Math.round(t.cube) };
  }).filter(row => Object.entries(tcnFilters).every(([key, value]) => contains(row[key], value)));
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
          <div className="shared-cbl-pair">{show(pick('* Tariff/Special Rate Auth', 'tariffSpecialRateAuth', draft.scac ? [`${draft.scac}00102400 - B 01Jan2026 31Dec2026`] : []), f('Release Value', 'releaseValue', { lookup: false }))}</div>
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
          <button disabled={locked} onClick={() => {
            const seq = String(conveyances.length + 1).padStart(3, '0');
            const next = createRecord(store, 'documents', { ownerId: id, ownerKind: 'bills', collection: 'Conveyances', conveyanceSeqNbr: seq, primaryEqInit: draft.scac || '', primaryEqNbr: 'NONE', cp: 'Yes' });
            change(next);
            openEntry('documents', next.selection.documents, 'Conveyances detail', collections.Conveyances);
          }}>New</button>
          <button onClick={() => print('Conveyances')}>Print</button>
          <button onClick={() => setConveyanceFilters({})}>Clear</button>
        </div>
        <div className="shared-table-scroll"><table className="shared-table">
          <thead>
            <tr className="shared-air-filters">{conveyanceColumns.map(([key, label]) => <th key={key}><input aria-label={`Filter conveyance ${label}`} value={conveyanceFilters[key] || ''} onChange={e => setConveyanceFilters({ ...conveyanceFilters, [key]: e.target.value })} /></th>)}</tr>
            <tr>{conveyanceColumns.map(([key, label]) => <th key={key}>{label}</th>)}</tr>
          </thead>
          <tbody>{rows.map(r => <tr key={r.id}>{conveyanceColumns.map(([key], i) => <td key={key}>{i === 0 ? <button className="shared-cbl-link" aria-label={`Open conveyance ${r.draft.conveyanceSeqNbr || r.id}`} onClick={() => openEntry('documents', r.id, 'Conveyances detail', collections.Conveyances)}>{r.draft.conveyanceSeqNbr || '(blank)'}</button> : String(r.draft[key] ?? '')}</td>)}</tr>)}
            {!rows.length && <tr><td colSpan={conveyanceColumns.length}>No data to display.</td></tr>}</tbody>
        </table></div>
        <div className="shared-air-count">{rows.length} row(s) found.</div>
      </div>;
    }
    return <div className="shared-cbl-generic">{renderTab(tab)}</div>;
  };

  return <div className="shared-cbl-detail">
    <div className="shared-cbl-header">{header.map((row, i) => <div className="shared-cbl-row" key={i}>{show(...row)}</div>)}</div>
    <div className="shared-tab-bar shared-cbl-tabs" role="tablist" aria-label="Commercial Bill of Lading tabs">{TABS.map(t => <button key={t} role="tab" aria-selected={tab === t} onClick={() => { setTab(t); setTcnSelected([]); }}>{t}</button>)}</div>
    <section role="tabpanel" aria-label={tab} className="shared-cbl-panel">{panel()}</section>
    <p className="shared-air-errors">{record.check?.errors?.join(' ')}</p>
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
