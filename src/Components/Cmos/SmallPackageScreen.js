import { useEffect, useState } from 'react';
import { screens } from './referenceInventory';
import CmosDateField from './CmosDateField';
import { createRecord, editRecord, saveRecord } from './model';
import { lookupValues } from './controls';
import { dodaacCountry } from './cblLogic';
import { carrierAccount, servicesFor } from './trackingNumbers';
import { closedLabel } from './SpePrints';
import { parseCmosDate } from './dateLogic';

// CMOS Small Package Express, laid out like the CMOS screen: the TCN list on the left (date search,
// filter row, B/L / SCAC / REL / SVC / tracking / D/I / closed date / error columns) and the selected
// TCN's Shipment Details and Hold At Location-3 tabs on the right (International Details for an I
// shipment). Selecting a TCN opens its SPE record (creating one the first time). Save only saves;
// Validate Funds runs TGET for the TCN, and Send Request rates it with the carrier.
const SPE_MODES = ['J', '5'];
const LIST_COLUMNS = [['tcn', 'TCN'], ['bl', 'B/L'], ['scac', 'SCAC'], ['rel', 'REL'], ['svc', 'SVC'], ['tracking', 'Tracking Number'], ['di', 'D/I'], ['closed', 'Closed/Release Date'], ['err', 'ERR']];
// Who pays the carrier (Bill To), as CMOS lists it.
export const BILL_TO = { PP: 'PP - Prepaid', CD: 'CD - Recipient pays', TP: 'TP - Third party' };
const ACTIONS = ['Web Tracking', 'Closeout', 'Print Express Docs', 'Cancel', 'Validate Funds', 'Notices', 'Ship Plan', 'Send Request', 'Edit', 'Save'];
export const DOM_INT = { D: 'D - Domestic', I: 'I - International' };
const SHIPPING_LABELS = ['Thermal', 'Laser'];
const SATURDAY = { 1: '1 - None, Default', 2: '2 - Pickup', 3: '3 - Delivery' };
// Hold At Location types offered by the selected carrier.
export const HOLD_TYPES = { FDE: ['FedEx Express Station', 'FedEx Ground Terminal', 'FedEx Office'], FDEG: ['FedEx Express Station', 'FedEx Ground Terminal', 'FedEx Office'] };
const COUNTRIES = lookupValues({ id: 'ucCountry' });
const STATES = lookupValues({ id: 'ucState' });
const described = rows => ({ type: 'select', options: rows.map(([code]) => code), optionLabels: Object.fromEntries(rows.map(([code, text]) => [code, `${code} - ${text}`])) });
// DOM/INT follows the country listed for the consignee DoDAAC: D for the US, I for anywhere else.
export const domIntFor = dodaac => { const country = dodaacCountry(dodaac); return country ? (country === 'US' ? 'D' : 'I') : ''; };
const contains = (value, query) => !query || String(value ?? '').toUpperCase().includes(String(query).toUpperCase());
const money = value => `$${Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`.replace(/^\$0\.00$/, '$.00');

// Field definitions come from the SPE inventory so their ids, lookups, and options stay the same;
// only the on-screen label follows the CMOS screen.
const all = [...screens.spe.header, ...Object.values(screens.spe.tabs).flat()];
const def = (label, shown = label) => { const f = all.find(item => item.label === label); return f && { ...f, label: shown, ariaLabel: f.ariaLabel || label }; };

export default function SmallPackageScreen({ store, record, locked, change, setMessage, action, renderFields, shown }) {
  const [dates, setDates] = useState({ start: '', end: '' });
  const [range, setRange] = useState({ start: '', end: '' });
  const [filters, setFilters] = useState({});
  const [tab, setTab] = useState('Shipment Details');
  const express = Object.values(store.express || {});
  const expressFor = sid => express.find(r => r.draft.shipmentId === sid);
  const shipments = Object.values(store.shipments).filter(r => (r.saved && SPE_MODES.includes(String(r.draft.milMode || '').trim().toUpperCase())) || expressFor(r.id));
  const rows = shipments.map(r => {
    const x = expressFor(r.id);
    const closed = x?.status === 'Closed out';
    return { id: r.id, expressId: x?.id, tcn: r.draft.tcn || r.id, bl: 'N', scac: x?.draft.scac || '', rel: closed ? 'Y' : 'N', svc: x?.draft.service || '',
      tracking: x?.result?.tracking || '', di: String(x?.draft.domInt || '').charAt(0), closed: closed && x.result?.closedAt ? closedLabel(x.result.closedAt) : '', err: x?.result?.state === 'failed' ? 'Y' : '', shipDate: x?.draft.shipDate || '' };
  }).filter(row => LIST_COLUMNS.every(([key]) => contains(row[key], filters[key]))
    && (!range.start || (row.shipDate && parseCmosDate(row.shipDate) >= parseCmosDate(range.start)))
    && (!range.end || (row.shipDate && parseCmosDate(row.shipDate) <= parseCmosDate(range.end))));
  const open = row => {
    if (row.expressId) { change({ ...store, selection: { ...store.selection, express: row.expressId } }); return; }
    if (locked) return;
    const next = createRecord(store, 'express', { shipmentId: row.id, shippingLabel: 'Thermal', insuredValue: '0', domInt: domIntFor(store.shipments[row.id]?.draft.destination) });
    change(next);
  };
  const id = record?.id;
  // Once rated, the carrier entries are greyed until Cancel; Web Tracking opens after closeout.
  const rated = record?.result?.state === 'success';
  const closedOut = record?.status === 'Closed out';
  const linked = record ? store.shipments[record.draft.shipmentId]?.draft || {} : {};
  // DOM/INT is filled from the consignee DoDAAC; it stays open only when the DoDAAC is not on file.
  const derived = domIntFor(linked.destination);
  const domInt = derived || record?.draft.domInt || '';
  const international = domInt === 'I' || String(domInt).toUpperCase() === 'INT';
  // Keep the stored DOM/INT on the consignee DoDAAC's country, so Send Request rates it correctly.
  useEffect(() => {
    if (id && derived && record.draft.domInt !== derived && !locked && record.result?.state !== 'success') change(editRecord(store, 'express', id, { domInt: derived }));
  }, [id, derived, record?.draft.domInt, locked]); // eslint-disable-line react-hooks/exhaustive-deps
  const save = () => {
    change(saveRecord(store, 'express', id));
    setMessage('Record successfully saved.');
  };
  // U/C: the shipment's dollar value, as CMOS shows it.
  const values = { ...(shown || {}), domInt, upc: linked.totalCost ? money(linked.totalCost) : '' };
  const scac = String(record?.draft.scac || '').toUpperCase();
  const services = servicesFor(scac);
  // Hold At Location-3 is offered only for FedEx.
  const tabs = ['Shipment Details', ...(HOLD_TYPES[scac] ? ['Hold At Location-3'] : []), ...(international ? ['International Details'] : [])];
  const current = tabs.includes(tab) ? tab : 'Shipment Details';
  const holdTypes = HOLD_TYPES[scac] || [];
  // Shipment facts and carrier results are system-filled (read-only); the carrier entries are editable.
  const SYSTEM = ['movementDocNumber', 'hazardous', 'consignee', 'milMode', 'ediMode', 'upc', 'nomenclature', 'pieces', 'weight', 'cube', 'estimatedCharges', 'ratedWeight', 'trackingNumber', 'closedReleasedDate', 'maxTransitDays', 'gfmId', 'error'];
  const block = (className, fields) => <div className={`spe-block ${className}`}>{renderFields(fields.filter(Boolean).map(f => SYSTEM.includes(f.id) || rated ? { ...f, readOnly: true } : f), values)}</div>;
  return <div className="spe-screen">
    <section className="spe-list" aria-label="Small Package Express TCNs">
      <form className="spe-search" onSubmit={event => { event.preventDefault(); setRange(dates); }}>
        <label>Start Date:<CmosDateField label="Start Date" width="130px" value={dates.start} onChange={start => setDates({ ...dates, start })} /></label>
        <label>End Date:<CmosDateField label="End Date" width="130px" value={dates.end} onChange={end => setDates({ ...dates, end })} /></label>
        <button type="submit">Search</button>
      </form>
      <div className="shared-air-cargo">
        <div className="shared-toolbar"><button type="button" onClick={() => { setFilters({}); setDates({ start: '', end: '' }); setRange({ start: '', end: '' }); }}>Clear</button></div>
        <div className="shared-table-scroll"><table className="shared-table">
          <thead>
            <tr className="shared-air-filters">{LIST_COLUMNS.map(([key, label]) => <th key={key}><input aria-label={`Filter SPE ${label}`} value={filters[key] || ''} onChange={e => setFilters({ ...filters, [key]: e.target.value })} /></th>)}</tr>
            <tr>{LIST_COLUMNS.map(([key, label]) => <th key={key}>{label}</th>)}</tr>
          </thead>
          <tbody>{rows.map(row => <tr key={row.id} aria-selected={Boolean(record) && record.draft.shipmentId === row.id}>{LIST_COLUMNS.map(([key]) => <td key={key}>
            {key === 'tcn' ? <button type="button" className="shared-air-manifest-link" onClick={() => open(row)}><span aria-hidden="true">⧉ </span>{row.tcn}</button> : row[key]}</td>)}</tr>)}
            {!rows.length && <tr><td colSpan={LIST_COLUMNS.length}>No data to display.</td></tr>}</tbody>
        </table></div>
        <div className="shared-air-count">{rows.length} row(s) found.</div>
      </div>
    </section>
    <section className="spe-detail" aria-label="Small Package Express shipment">
      {record ? <>
        <p className="spe-tcn"><strong>TCN:</strong> {values.tcn}</p>
        <div className="shared-tab-bar" role="tablist" aria-label="SPE tabs">
          {tabs.map(name =>
            <button key={name} type="button" role="tab" aria-selected={current === name} onClick={() => setTab(name)}>{name}</button>)}
        </div>
        {current === 'International Details'
          ? <div role="tabpanel" aria-label="International Details" className="spe-panel">{block('spe-international', screens.spe.tabs['International Details'])}</div>
          : current === 'Hold At Location-3'
          ? <div role="tabpanel" aria-label="Hold At Location-3" className="spe-panel spe-hold">
            <fieldset className="spe-box"><legend>Recipient Unit/Activity Contact Location</legend>{block('spe-hold-contact', [def('POC Name'), def('POC Phone')])}</fieldset>
            <fieldset className="spe-box"><legend>Hold At Location Address</legend>{block('spe-hold-address', [def('Address'), def('Address 2'), def('City'),
              { ...def('Country Code'), ...described(COUNTRIES) }, { ...def('State/Province'), ...described(STATES) }, def('ZIP')])}</fieldset>
            {block('spe-hold-type', [{ ...def('Type'), type: 'select', options: holdTypes, ariaLabel: 'Hold At Location Type' }])}
          </div>
          : <div role="tabpanel" aria-label="Shipment Details" className="spe-panel">
            {block('spe-facts', [def('Movement Doc Number'), def('Hazardous'), def('P/U Location'), def('Consignee'), def('MIL Mode', 'Mil Mode'), def('EDI Mode'), { ...def('UPC', 'U/C'), readOnly: true }, def('Nomenclature'), def('Pieces'), { ...def('Weight'), help: 'The weight of the cargo' }, def('Cube')])}
            {block('spe-entries', [def('SCAC'), { ...def('DOM/INT'), type: 'select', options: Object.keys(DOM_INT), optionLabels: DOM_INT, readOnly: Boolean(derived) }, { ...def('Service'), type: 'select', options: services.map(([code]) => code), optionLabels: Object.fromEntries(services.map(([code, name]) => [code, `${code} - ${name}`])) }, def('Shipment Date'), { ...def('Bill To'), type: 'select', options: Object.keys(BILL_TO), optionLabels: BILL_TO }, { ...def('Carrier Acct Nbr', '/'), type: 'select', options: [carrierAccount(record?.draft.scac)].filter(Boolean) }, def('Dest City'), def('Remarks'), def('Broker Indicator'), def('Package Type'), def('Additional Handling'), { ...def('Saturday'), type: 'select', options: Object.keys(SATURDAY), optionLabels: SATURDAY }, def('Insured Value'), def('Sender Email'), def('Recipient Email'), def('Email Memo'), def('Booking Number'), { ...def('Shipping Label'), type: 'select', options: SHIPPING_LABELS }])}
            {block('spe-results', [def('Estimated Charges'), def('Rated Weight'), def('Tracking Number'), def('Closed/Released Date'), def('Max Transit Days'), def('GFM ID'), def('Error')])}
          </div>}
      </> : <p className="spe-empty">Select a TCN to open its Small Package Express shipment.</p>}
    </section>
    <div className="shared-toolbar shared-bottom spe-actions">{ACTIONS.map(label => <button key={label} type="button"
      disabled={!record || (locked && !['Print Express Docs', 'Web Tracking', 'Ship Plan'].includes(label)) || (label === 'Web Tracking' && !closedOut) || (label === 'Closeout' && (!rated || closedOut)) || (['Send Request', 'Save'].includes(label) && rated)}
      onClick={() => label === 'Save' ? save() : action(label)}>{label}</button>)}</div>
  </div>;
}

