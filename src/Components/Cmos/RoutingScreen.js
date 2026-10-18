import { useEffect, useRef, useState } from 'react';
import { Dialog, Lookup, lookupValues } from './controls';
import CmosDateField from './CmosDateField';
import { assignShipments, createRecord, editRecord, saveRecord, totals, currentCheck } from './model';
import { screens } from './referenceInventory';
import { parseScheduleDate } from './airScheduleLogic';
import {
  ROUTE_ORDER_TYPES, REQUEST_TYPES, ROUTE_IDS, ATR_HOURS, AIR_SVC_TYPES, AIR_SVC_LEVELS, SVC_AGENCY_CODES, ROUTING_LIST_COLUMNS, ROUTING_SAMPLES,
  routingErrors, routingRow,
} from './routingLogic';
import ReferenceLookup from './ReferenceLookup';
import { EQUIPMENT_TYPE_ROWS, SERVICE_CODES, serviceCodeInfo, copyTcnData, routingCheckErrors, isSent, passedEditData, sendRequest, statusRequest, receiveResponses, setGroupResponse, awardRoute, routeToBill } from './routingRequest';
import { RSN_CODES, assignmentErrors } from './routingResponse';
import { cblDefaults, nextCblNumber, fillFromShipments } from './cblLogic';
import { equipmentGroups, stopOffs, tcnStops, billOfLading, groupOf } from './routingEquipment';
import { MIL_EDI_REFERENCE } from './modeReference';

const contains = (value, query) => !query || String(value || '').toUpperCase().includes(String(query).toUpperCase().replace(/%/g, ''));
const TCN_COLUMNS = [['tcn', 'TCN'], ['milMode', 'MIL Mode'], ['ediMode', 'EDI Mode'], ['origin', 'Consignor DODAAC'], ['destination', 'Consignee DODAAC'],
  ['equipGroupId', 'Equip Group ID'], ['stopLd', 'Stop Ld'], ['stopUl', 'Stop UL'], ['bl', 'B/L'], ['overDimensions', 'Over Dimensions'], ['hazInd', 'Haz Ind'],
  ['dsoeId', 'DSOE ID'], ['chalk', 'Chalk'], ['pieces', 'Pieces'], ['weight', 'TCN Weight']];
const TABS = ['TCNs', 'Equip Group Mode', 'Stop Offs', 'Equip Load Plan', 'Response', 'Addresses', 'Water Port', 'Notices', 'Status'];
const STOP_COLUMNS = [['group', 'Equip Group'], ['stop', 'Stop'], ['dodaac', 'DODAAC'], ['splc', 'SPLC'], ['rsn', 'RSN'], ['stopType', 'Stop Type'], ['dateTime', 'Date/Time'], ['poc', 'POC'],
  ['address1', 'Address 1'], ['address2', 'Address 2'], ['city', 'City'], ['country', 'Country'], ['state', 'State'], ['zip', 'ZIP'], ['phone', 'Phone'], ['intl', 'Intl?']];
const STOP_EDITABLE = ['stopType', 'dateTime', 'poc', 'phone'];
const ASSIGN_COLUMNS = [['tcn', 'TCN'], ['milMode', 'MIL Mode'], ['ediMode', 'EDI Mode'], ['origin', 'Consignor DODAAC'], ['destination', 'Consignee DODAAC'],
  ['dsoeId', 'DSOE_ID'], ['chalk', 'CHALK'], ['ovrDm', 'Ovr Dm'], ['hazInd', 'Haz Ind'], ['adviceNbr', 'Advice Number'], ['acctClass', 'Acct Class'], ['totalCost', 'Cost'], ['tac', 'TAC']];

// TCNs a route order can take: finished in Shipment Planning (saved with a current, passing Edit
// TCN), Routing indicator checked, not trans priority 4, and not already on a route order.
export function routingCandidates(store) {
  const taken = new Set(Object.values(store.routings || {}).flatMap((r) => r.draft.shipmentIds || []));
  return Object.values(store.shipments || {}).filter((r) => r.saved && currentCheck(r) && r.saved.routing
    && String(r.saved.tp || '').trim() !== '4' && !taken.has(r.id));
}

function AssignTcns({ store, record, onClose, change, setMessage, onShipPlan }) {
  const [tab, setTab] = useState('Assign TCNs');
  const [filters, setFilters] = useState({});
  const [picked, setPicked] = useState([]);
  const rows = (tab === 'Assign TCNs' ? routingCandidates(store) : [])
    .map((r) => ({ id: r.id, ...r.saved, hazInd: String(r.saved.hazmat || '').slice(0, 1) }))
    .filter((row) => Object.entries(filters).every(([key, value]) => contains(row[key], value)));
  return <Dialog title="Assign TCNs/Aggregates" heading={<>Assign TCNs/Aggregates - TIP: TCNs with a trans priority of 4 will not display and can not be assigned to a Routing</>} onClose={onClose} wide overlayClassName="shared-route-assign-overlay">
    <div className="shared-route-assign">
      <div className="shared-route-tabs" role="tablist" aria-label="Assign tabs">
        {['Assign TCNs', 'Assign Aggregates'].map((name) => <button key={name} type="button" role="tab" aria-selected={tab === name} onClick={() => setTab(name)}>{name}</button>)}
      </div>
      <section className="shared-route-panel" role="tabpanel" aria-label={tab}>
        <div className="shared-toolbar">
          <button type="button" disabled={!picked.length} onClick={() => {
            change(assignShipments(store, 'routings', record.id, picked));
            setMessage(`${picked.length} TCN(s) assigned. Save the route order.`); setPicked([]);
          }}>Assign</button>
          <button type="button" onClick={onShipPlan}>Ship Plan</button>
          <button type="button" onClick={() => { setFilters({}); setPicked([]); }}>Clear</button>
        </div>
        <div className="shared-table-scroll"><table className="shared-table">
          <thead>
            <tr className="shared-air-filters">{ASSIGN_COLUMNS.map(([key, label]) => <th key={key}><input aria-label={`Filter ${label}`} value={filters[key] || ''} onChange={(e) => setFilters({ ...filters, [key]: e.target.value })} /></th>)}</tr>
            <tr>{ASSIGN_COLUMNS.map(([key, label]) => <th key={key} scope="col">{label}</th>)}</tr>
          </thead>
          <tbody>{rows.map((row) => <tr key={row.id} className="shared-route-assign-row" tabIndex={0} aria-label={`Assign ${row.tcn}`} aria-selected={picked.includes(row.id)}
            onClick={() => setPicked((p) => (p.includes(row.id) ? p.filter((x) => x !== row.id) : [...p, row.id]))}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } }}>
            {ASSIGN_COLUMNS.map(([key]) => <td key={key}>{row[key] ?? ''}</td>)}
          </tr>)}</tbody>
        </table>{!rows.length && <p>No data to display.</p>}</div>
        <div className="shared-piece-count shared-route-count"><span>Rows Selected{picked.length}</span><span>{rows.length} row(s) found.</span></div>
      </section>
      <footer><button type="button" onClick={onClose}>Close</button></footer>
    </div>
  </Dialog>;
}

function RouteOrder({ store, record, locked, sample, edit, change, action, setMessage, renderFields, now, startAssigning, newCollection, go }) {
  const [tab, setTab] = useState('TCNs');
  // New opens straight onto Assign TCNs/Aggregates.
  const [assigning, setAssigning] = useState(Boolean(startAssigning) && !locked && !sample);
  const [lookup, setLookup] = useState(null);
  const [chosen, setChosen] = useState([]);
  const [errors, setErrors] = useState([]);
  const d = record.draft;
  // Once sent to GFM the order is read-only (guide p. 28).
  const sent = isSent(d);
  const readOnly = locked || sample || sent;
  const nowDate = () => (now ? new Date(now) : new Date());
  const [equipmentFor, setEquipmentFor] = useState(null);
  const [serviceFor, setServiceFor] = useState(null);
  const [scacFor, setScacFor] = useState(null);
  const [responseGroup, setResponseGroup] = useState(null);
  const [simulating, setSimulating] = useState(null);
  // Response actions stay open after the request is sent; only the request fields lock.
  const responseLocked = locked || sample;
  const ids = d.shipmentIds || [];
  const total = totals(store, ids);
  const set = (id, value) => { if (!readOnly) edit(id, value); };
  const input = (id, label, { width, required, system, placeholder, lookupRows, disabled, type, text, date, title } = {}) => <span className="shared-route-field" data-field={id}>
    <label htmlFor={`route-${id}`} className={system ? 'shared-route-system' : undefined}>{required && <span className="shared-required-mark" aria-hidden="true">* </span>}{text || label}:</label>
    {date
      ? <CmosDateField id={`route-${id}`} label={label} title={title} withTime={date === 'datetime'} width={width} value={d[id] ?? ''} readOnly={readOnly || system} disabled={disabled} onChange={(v) => set(id, v)} />
      : <input id={`route-${id}`} aria-label={label} type={type} style={width ? { width } : undefined} placeholder={placeholder} value={d[id] ?? ''}
        readOnly={readOnly || system || disabled} disabled={disabled} onChange={(e) => set(id, e.target.value)} />}
    {lookupRows && <button type="button" className="shared-route-lookup" aria-label={`Look up ${label}`} disabled={readOnly} onClick={() => setLookup({ f: { id, label }, rows: lookupRows })}>
      <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"><circle cx="6.5" cy="6.5" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="m10 10 4 4" stroke="currentColor" strokeWidth="1.5" /></svg>
    </button>}
  </span>;
  const pick = (id, label, entries, { required, system, blank = false } = {}) => <span className="shared-route-field" data-field={id}>
    <label htmlFor={`route-${id}`} className={system ? 'shared-route-system' : undefined}>{required && <span className="shared-required-mark" aria-hidden="true">* </span>}{label}:</label>
    <select id={`route-${id}`} aria-label={label} value={d[id] ?? ''} disabled={readOnly || system} onChange={(e) => set(id, e.target.value)}>
      {blank && <option value="" />}
      {entries.map((entry) => { const [code, text] = Array.isArray(entry) ? entry : [entry, '']; return <option key={code} value={code}>{text ? `${code} - ${text}` : code}</option>; })}
    </select>
  </span>;
  const flag = (id, label) => <span className="shared-route-field shared-route-flag" data-field={id}>
    <label htmlFor={`route-${id}`}>{label}:</label>
    <input id={`route-${id}`} type="checkbox" aria-label={label} checked={Boolean(d[id])} disabled={readOnly} onChange={(e) => set(id, e.target.checked)} />
  </span>;
  const dodaacs = lookupValues({ id: 'destination' });
  const save = (close) => {
    const found = routingErrors(d, nowDate());
    setErrors(found);
    if (found.length) return;
    action(close ? 'Save and Close' : 'Save');
  };
  const staged = Boolean(d.stagedEquipment);
  const groups = equipmentGroups(store, d);
  // Changes to an equipment group (mode, B/L, load plan) are kept on the route order.
  const setGroup = (group, patch) => { if (!readOnly) change(editRecord(store, 'routings', record.id, { equipGroups: { ...(d.equipGroups || {}), [group]: { ...((d.equipGroups || {})[group] || {}), ...patch } } })); };
  const [groupChosen, setGroupChosen] = useState(null);
  const [planGroup, setPlanGroup] = useState(null);
  const [stopDrafts, setStopDrafts] = useState({});
  const plan = groups.find((g) => g.group === planGroup) || groups[0];
  const selectedGroup = groups.find((g) => g.group === responseGroup) || groups[0];
  // Keep the group's CBL in step with the route order and its assigned carrier.
  const withBill = (next, groupKey) => {
    const g = equipmentGroups(next, next.routings[record.id].draft).find((x) => x.group === groupKey);
    return g?.cblId && next.bills?.[g.cblId] ? editRecord(next, 'bills', g.cblId, routeToBill(next.routings[record.id].draft, g)) : next;
  };
  return <div className="shared-route-order">
    <div className="shared-route-top">
      <div className="shared-route-flags">
        <div>{input('shipmentId', 'Shipment ID', { system: true, width: '100px' })}{input('gfmId', 'GFM ID', { system: true, width: '100px' })}</div>
        <div>{flag('atr', 'ATR')}{flag('ghs', 'GHS')}{flag('itarControlledShipment', 'ITAR Controlled Shipment')}</div>
        <div>{flag('intlSpotBid', 'Intl Spot Bid')}{flag('sendElectronic', 'Send Electronic?')}</div>
        <div>{flag('documentsOnly', 'Documents Only?')}{flag('stagedEquipment', 'Staged Equipment?')}</div>
      </div>
      <div className="shared-route-types">
        {pick('routeOrderType', 'Route Order Type', ROUTE_ORDER_TYPES)}
        {pick('requestType', 'Request Type', REQUEST_TYPES)}
        {pick('routeId', 'Route ID', ROUTE_IDS)}
        {input('primaryEqInitials', 'Primary EQ Initials', { required: true, width: '36px', disabled: !staged })}
      </div>
      <div className="shared-route-types">
        {input('routingOrderNumber', 'Routing Order Number', { system: true, width: '90px' })}
        {input('requestDate', 'Request Date', { width: '130px', date: 'date' })}
        {input('expDate', 'Exp Date', { width: '130px', date: 'date' })}
        {input('primaryEqNumber', 'Primary EQ Number', { required: true, width: '72px', disabled: !staged })}
      </div>
    </div>
    <div className="shared-route-row">{flag('smallBusiness', 'Small Business?')}{flag('smallBusinessOverride', 'Small Business Override?')}{input('smallBusinessNotes', 'Small Business Notes', { system: true, width: '900px' })}</div>
    <div className="shared-route-grid3">
      <div>{input('origin', 'Origin DODAAC', { width: '60px', lookupRows: dodaacs })}{input('originSplc', 'Origin SPLC', { system: true, width: '72px' })}</div>
      <div>{input('destination', 'Dest DODAAC', { width: '60px', lookupRows: dodaacs })}{input('destSplc', 'Dest SPLC', { system: true, width: '72px' })}</div>
      <div>{input('requesterDodaac', 'Requester DODAAC', { width: '60px', lookupRows: dodaacs })}{input('requesterName', 'Requester Name', { width: '220px' })}</div>
    </div>
    <div className="shared-route-grid2">
      <div className="shared-route-stack">
        {pick('atrHours', 'ATR Carrier Response Hours', ATR_HOURS, { required: true, blank: true })}
        <div>{input('scacsRequested', 'SCACs Requested', { width: '44px', type: 'number' })}{input('addlScacsRequested', 'Addl SCACs Requested', { width: '44px', type: 'number' })}</div>
        <div>{input('ummipsRdd', 'UMMIPS RDD', { width: '36px' })}{input('tp', 'TP', { width: '36px', type: 'number' })}</div>
        <div className="shared-route-totals">
          <span className="shared-route-field"><label className="shared-route-system">TCNs Assigned:</label><input aria-label="TCNs Assigned" readOnly value={ids.length ? 'Y' : 'N'} style={{ width: '24px' }} /></span>
          <span className="shared-route-field"><label className="shared-route-system">Total Weight:</label><input aria-label="Total Weight" readOnly value={total.weight} style={{ width: '72px' }} /></span>
          <span className="shared-route-field"><label className="shared-route-system">Total Cube:</label><input aria-label="Total Cube" readOnly value={total.cube.toFixed(0)} style={{ width: '72px' }} /></span>
        </div>
      </div>
      <div className="shared-route-stack shared-route-right">
        {pick('requestStatus', 'Request Status', [d.requestStatus || '00'], { system: true })}
        {pick('svcAgencyCode', 'Svc Agency Code', SVC_AGENCY_CODES)}
        {pick('airSvcType', 'Air Svc Type', AIR_SVC_TYPES, { blank: true })}
        {pick('airSvcLevel', 'Air Svc Level', AIR_SVC_LEVELS, { blank: true })}
      </div>
    </div>
    <div className="shared-route-windows">
      <fieldset><legend>Requested Pickup Date/Time</legend>{input('pickupEarliest', 'Pickup Earliest', { text: 'Earliest', width: '128px', date: 'datetime', title: EASTERN })}{input('pickupLatest', 'Pickup Latest', { text: 'Latest', width: '128px', date: 'datetime', title: EASTERN })}</fieldset>
      <fieldset><legend>Requested Delivery Date/Time</legend>{input('deliveryEarliest', 'Delivery Earliest', { text: 'Earliest', width: '128px', date: 'datetime', title: EASTERN })}{input('deliveryLatest', 'Delivery Latest', { text: 'Latest', width: '128px', date: 'datetime', title: EASTERN })}</fieldset>
    </div>
    <div className="shared-route-center">
      <div>{input('fobPoint', 'FOB Point', { width: '280px' })}{input('fobContractDate', 'FOB Contract Date', { width: '130px', date: 'date' })}</div>
      <div>{input('fobCity', 'FOB City', { width: '126px' })}{input('fobStCo', 'FOB ST/CO', { width: '28px', lookupRows: lookupValues({ id: 'ucState' }) })}{input('fobSplc', 'FOB SPLC', { width: '66px' })}</div>
      <div>{input('carrierRemarks', 'Carrier Remarks', { width: '900px' })}</div>
      <div>{input('remarksToReviewer', 'Remarks to Reviewer', { width: '900px' })}</div>
      <p className="shared-route-warning">WARNING!! Remarks To Reviewer will force SDDC manual processing and extend response time!</p>
    </div>
    <div className="shared-route-grid3">
      <div>{input('etrrId', 'ETRR ID', { width: '52px' })}</div>
      <div>{input('ratingTech', 'Rating Tech', { width: '220px' })}<span className="shared-route-flags-inline">{flag('manualInd', 'Manual Ind')}{flag('tailoredTransportationContract', 'Tailored Transportation Contract')}</span></div>
      <div>{input('ratingTechPhone', 'Rating Tech Phone', { width: '136px' })}</div>
    </div>
    <div className="shared-route-tabs" role="tablist" aria-label="Route order tabs">
      {TABS.map((name) => <button key={name} type="button" role="tab" aria-selected={tab === name} onClick={() => setTab(name)}>{name}</button>)}
    </div>
    <section className="shared-route-panel" role="tabpanel" aria-label={tab}>
      {tab === 'TCNs' && <>
        <div className="shared-toolbar" hidden={sent}>
          <button type="button" disabled={readOnly} onClick={() => setAssigning(true)}>Assign TCNs/Aggregates</button>
          <button type="button" disabled={readOnly || !chosen.length} onClick={() => { change(assignShipments(store, 'routings', record.id, chosen, true)); setChosen([]); }}>Remove</button>
          <button type="button" disabled={readOnly || !ids.length} onClick={() => newCollection('Accounting')}>Acct Fund</button>
          <button type="button" disabled={readOnly || !ids.length} onClick={() => { change(copyTcnData(store, record)); setMessage('TCN data copied to the route order.'); }}>Copy TCN Data</button>
        </div>
        <div className="shared-table-scroll"><table className="shared-table">
          <thead><tr><th><span className="visually-hidden">Select</span></th>{TCN_COLUMNS.map(([key, label]) => <th key={key} scope="col">{label}</th>)}</tr></thead>
          <tbody>{ids.map((sid) => { const s = store.shipments[sid]?.draft || {}; const t = totals(store, [sid]); const group = groupOf(d, sid);
            const row = { ...s, ...tcnStops(store, d, sid), equipGroupId: group, bl: groups.find((g) => g.group === group)?.bl || billOfLading(d, group), pieces: t.pieces, weight: t.weight, hazInd: String(s.hazmat || '').slice(0, 1) };
            return <tr key={sid}><td><input type="checkbox" aria-label={`Select ${s.tcn || sid}`} checked={chosen.includes(sid)} onChange={(e) => setChosen((c) => (e.target.checked ? [...c, sid] : c.filter((x) => x !== sid)))} /></td>
              {TCN_COLUMNS.map(([key]) => <td key={key}>{['equipGroupId', 'stopLd', 'stopUl'].includes(key)
                ? <input className="shared-route-cell" aria-label={`${s.tcn} ${key === 'equipGroupId' ? 'Equip Group ID' : key === 'stopLd' ? 'Stop Ld' : 'Stop UL'}`} readOnly value={row[key]} />
                : row[key] ?? ''}</td>)}</tr>; })}</tbody>
        </table>{!ids.length && <p>No data to display.</p>}</div>
        <div className="shared-piece-count">{ids.length} row(s) found.</div>
      </>}
      {tab === 'Equip Group Mode' && <>
        <div className="shared-toolbar"><button type="button" disabled={readOnly || !groupChosen} onClick={() => {
          const members = groups.find((g) => g.group === groupChosen)?.members || [];
          change(assignShipments(store, 'routings', record.id, members, true)); setGroupChosen(null);
        }}>Remove</button></div>
        <div className="shared-table-scroll"><table className="shared-table">
          <thead><tr><th scope="col">Equip Group</th><th scope="col">Mil Mode</th><th scope="col">EDI Mode</th><th scope="col">B/L</th></tr></thead>
          <tbody>{groups.map((g) => <tr key={g.group} aria-selected={groupChosen === g.group} onClick={() => setGroupChosen(g.group)}>
            <td>{g.group}</td><td>{g.milMode}</td>
            <td><span className="shared-route-inline"><input className="shared-route-cell" aria-label={`Equip group ${g.group} EDI Mode`} readOnly value={g.ediMode} />
              <button type="button" className="shared-route-lookup" aria-label={`Look up Equip group ${g.group} EDI Mode`} disabled={readOnly}
                onClick={(e) => { e.stopPropagation(); setLookup({ f: { id: 'ediMode', label: 'EDI Mode', group: g.group }, rows: MIL_EDI_REFERENCE }); }}>
                <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"><circle cx="6.5" cy="6.5" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="m10 10 4 4" stroke="currentColor" strokeWidth="1.5" /></svg>
              </button></span></td>
            <td>{g.bl}</td>
          </tr>)}</tbody>
        </table>{!groups.length && <p>No data to display.</p>}</div>
        <div className="shared-piece-count">{groups.length} row(s) found.</div>
      </>}
      {tab === 'Stop Offs' && (() => { const stops = stopOffs(store, d); return <>
        <div className="shared-toolbar"><button type="button" disabled={readOnly || !Object.keys(stopDrafts).length} onClick={() => {
          const next = { ...(d.stops || {}) };
          for (const [key, patch] of Object.entries(stopDrafts)) next[key] = { ...(next[key] || {}), ...patch };
          change(editRecord(store, 'routings', record.id, { stops: next })); setStopDrafts({}); setMessage('Stop offs updated. Save the route order.');
        }}>Update</button></div>
        <div className="shared-table-scroll"><table className="shared-table shared-route-stops">
          <thead><tr>{STOP_COLUMNS.map(([key, label]) => <th key={key} scope="col">{label}</th>)}</tr></thead>
          <tbody>{stops.map((s) => { const row = { ...s, ...(stopDrafts[s.key] || {}) }; return <tr key={s.key}>
            {STOP_COLUMNS.map(([key, label]) => <td key={key} title={typeof row[key] === 'string' ? row[key] : undefined}>{key === 'intl'
              ? <input type="checkbox" aria-label={`Stop ${s.stop} Intl?`} checked={Boolean(row.intl)} disabled={readOnly} onChange={(e) => setStopDrafts({ ...stopDrafts, [s.key]: { ...(stopDrafts[s.key] || {}), intl: e.target.checked } })} />
              : STOP_EDITABLE.includes(key)
                ? <input className="shared-route-cell shared-route-cell-edit" aria-label={`Stop ${s.stop} ${label}`} readOnly={readOnly} value={row[key] || ''} placeholder={key === 'dateTime' ? 'ddmmmyyyy/HHmm' : undefined}
                  onChange={(e) => setStopDrafts({ ...stopDrafts, [s.key]: { ...(stopDrafts[s.key] || {}), [key]: e.target.value } })} />
                : row[key]}</td>)}
          </tr>; })}</tbody>
        </table>{!stops.length && <p>No data to display.</p>}</div>
        <div className="shared-piece-count">{stops.length} row(s) found.</div>
      </>; })()}
      {tab === 'Equip Load Plan' && <div className="shared-route-loadplan">
        <div>
          <div className="shared-table-scroll"><table className="shared-table">
            <thead><tr><th scope="col">Equip Group</th><th scope="col">Fully Loaded</th><th scope="col">NMFC</th><th scope="col">Pieces</th><th scope="col">Weight</th><th scope="col">Cube</th></tr></thead>
            <tbody>{groups.map((g) => <tr key={g.group} aria-selected={planGroup === g.group} onClick={() => setPlanGroup(g.group)}>
              <td>{g.group}</td><td><input type="checkbox" className="shared-route-display-check" aria-label={`Equip group ${g.group} fully loaded`} checked={g.fullyLoaded} readOnly tabIndex={-1} onClick={(e) => e.preventDefault()} /></td>
              <td>{g.nmfc ? `${g.nmfc}-${g.nmfcSub || '0'}` : ''}</td><td>{g.pieces}</td><td>{g.weight}</td><td>{g.cube}</td>
            </tr>)}</tbody>
          </table>{!groups.length && <p>No data to display.</p>}</div>
          <div className="shared-piece-count">{groups.length} row(s) found.</div>
        </div>
        {plan && <LoadPlanForm key={plan.group} plan={plan} readOnly={readOnly} onSave={(patch) => {
          // The load plan Save saves the route order too (guide step 24, then Edit Data).
          const equipGroups = { ...(d.equipGroups || {}), [plan.group]: { ...((d.equipGroups || {})[plan.group] || {}), ...patch } };
          change(saveRecord(editRecord(store, 'routings', record.id, { equipGroups }), 'routings', record.id));
          setMessage(<Notice kind="ok" title="Transaction Successfully Processed" lines={['Record successfully saved']} />);
        }}
          onServiceCodes={() => setServiceFor(plan.group)} onEquipment={() => setEquipmentFor(plan.group)} openLookup={setLookup} />}
      </div>}
      {tab === 'Response' && <>
        <div className="shared-toolbar">
          <button type="button" disabled={responseLocked || !['CR', 'AW'].includes(d.requestStatus)} onClick={() => {
            // Update brings each group's CBL in line with the route order and its carrier.
            change(groups.reduce((next, g) => withBill(next, g.group), store));
            setMessage(<Notice kind="ok" title="Transaction Successfully Processed" lines={['Record successfully updated']} />);
          }}>Update</button>
          {selectedGroup?.cblId
            ? <button type="button" onClick={() => {
              // B/L opens the group's Commercial BOL.
              change({ ...store, selection: { ...store.selection, bills: selectedGroup.cblId } });
              go?.('cbl', { open: true });
            }}>B/L</button>
            : <button type="button" disabled={responseLocked || d.requestStatus !== 'CR'} onClick={() => {
            // Create CBL comes first: the bill exists before a SCAC can be assigned to it.
            const group = selectedGroup;
            const movementDocNbr = nextCblNumber(store);
            if (!movementDocNbr) { setMessage(<Notice kind="error" title="Error" lines={['All movement document numbers in this training series are in use.']} />); return; }
            let next = createRecord(store, 'bills', { ...cblDefaults(d.origin || 'FA5030'), movementDocNbr, shipmentIds: group.members, routeOrderNumber: d.routingOrderNumber });
            next = { ...next, counters: { ...next.counters, cbl: Number(movementDocNbr.slice(-5)) } };
            const billId = next.selection.bills;
            next = editRecord(next, 'bills', billId, fillFromShipments(next, next.bills[billId].draft));
            next = setGroupResponse(next, record.id, group.group, { cblId: billId, cblNumber: movementDocNbr });
            change(withBill(next, group.group));
            setMessage(<Notice kind="ok" title="Transaction Successfully Processed" lines={[`Commercial BOL ${movementDocNbr} created for equip group ${group.group}. Assign the SCAC.`]} />);
          }}>Create CBL</button>}
          <button type="button" disabled={responseLocked || d.requestStatus !== 'CR' || !selectedGroup?.cblId} title={selectedGroup?.cblId ? undefined : 'Create the CBL first.'}
            onClick={() => setScacFor(selectedGroup.group)}>Assign/Remove SCAC</button>
          {selectedGroup?.cblId && (selectedGroup.assignedScac
            // Once a SCAC is assigned the button becomes Award (CR → AW).
            ? <button type="button" disabled={responseLocked || d.requestStatus !== 'CR'} onClick={() => {
              const result = awardRoute(store, record.id, nowDate());
              if (result.errors.length) { setMessage(<Notice kind="error" title="Error" lines={result.errors} />); return; }
              change(groups.reduce((next, g) => withBill(next, g.group), result.store));
              setMessage(<Notice kind="ok" title="Transaction Successfully Processed" lines={['Shipment awarded.']} />);
            }}>Award</button>
            : <button type="button" disabled={responseLocked || d.requestStatus !== 'CR' || !selectedGroup.carriers.length} onClick={() => {
              // The lowest cost carrier needs no RSN.
              const lowest = selectedGroup.carriers[0].scac;
              change(withBill(setGroupResponse(store, record.id, selectedGroup.group, { assignedScac: lowest }), selectedGroup.group));
              setMessage(<Notice kind="ok" title="Transaction Successfully Processed" lines={[`SCAC ${lowest} assigned to equip group ${selectedGroup.group}.`]} />);
            }}>Assign Lowest Cost SCAC</button>)}
        </div>
        <div className="shared-table-scroll"><table className="shared-table">
          <thead><tr>{['Equip Group', 'DSOE ID', 'Chalk', 'Assigned SCAC', 'Tender', 'B/L', 'Award Status'].map((label) => <th key={label} scope="col">{label}</th>)}</tr></thead>
          <tbody>{groups.map((g) => { const carrier = g.carriers.find((c) => c.scac === g.assignedScac);
            return <tr key={g.group} aria-selected={responseGroup === g.group} onClick={() => setResponseGroup(g.group)}>
              <td>{g.group}</td><td>{g.dsoeId}</td><td>{g.chalk}</td><td>{g.assignedScac}</td><td>{carrier?.tender || ''}</td><td>{g.cblId ? g.bl : ''}</td><td>{g.awardStatus}</td>
            </tr>; })}</tbody>
        </table>{!groups.length && <p>No data to display.</p>}</div>
        <div className="shared-piece-count">{groups.length} row(s) found.</div>
      </>}
      {tab === 'Addresses' && renderFields(screens.routing.tabs.Addresses)}
      {tab === 'Water Port' && renderFields(screens.routing.tabs['Water Port'])}
      {tab === 'Notices' && <><div className="shared-table-scroll"><table className="shared-table"><thead><tr><th>Notice</th><th>Date</th><th>Message</th></tr></thead><tbody /></table><p>No data to display.</p></div><div className="shared-piece-count">0 row(s) found.</div></>}
      {tab === 'Status' && (() => { const rows = (store.history || []).filter((h) => h.kind === 'routings' && h.id === record.id); return <>
        <div className="shared-table-scroll"><table className="shared-table"><thead><tr><th>Action</th><th>Date</th><th>User</th><th>Status</th></tr></thead>
          <tbody>{rows.map((h, i) => <tr key={i}><td>{h.action}</td><td>{String(h.date || '').slice(0, 16).replace('T', ' ')}</td><td>{h.user}</td><td>{h.status}</td></tr>)}</tbody></table>{!rows.length && <p>No data to display.</p>}</div>
        <div className="shared-piece-count">{rows.length} row(s) found.</div></>; })()}
    </section>
    {sample && <p className="shared-schedule-note">Sample route order · view only. Click New to build your own.</p>}
    {errors.length > 0 && <ul className="shared-schedule-errors" role="alert">{errors.map((e) => <li key={e}>{e}</li>)}</ul>}
    <div className="shared-toolbar shared-route-actions">
      {sent
        ? <button type="button" disabled={locked || sample} title="Send a Status Request transaction for the Shipment ID." onClick={() => {
          const result = statusRequest(store, record.id, nowDate()); change(result.store); setMessage(<Notice kind="info" title="Information" lines={[result.message]} />);
        }}>Status Request</button>
        : <>
          <button type="button" disabled={readOnly} onClick={() => {
            if (!passedEditData(record)) { setMessage(<Notice kind="error" title="Error" lines={['Run Edit Data and pass the edits before sending the request.']} />); return; }
            const next = sendRequest(store, record.id, nowDate());
            change(next);
            setMessage(<Notice kind="ok" title="Transaction Successfully Processed" lines={['Request sent to GFM and forwarded to ATR.']} />);
            // Training shortcut: the ATR response window is simulated in 10 seconds.
            setSimulating({ store: next, remaining: ATR_SIMULATION_SECONDS });
          }}>Send Request</button>
          <button type="button" disabled={readOnly} onClick={() => {
            if (!record.saved || JSON.stringify(record.draft) !== JSON.stringify(record.saved)) { setMessage(<Notice kind="error" title="Error" lines={['Save the route order before Edit Data.']} />); return; }
            const found = routingCheckErrors(store, d, nowDate());
            change({ ...store, routings: { ...store.routings, [record.id]: { ...record, routeCheck: { revision: record.revision, passed: !found.length } } } });
            setMessage(found.length ? <Notice kind="error" title="Error" lines={found} /> : <Notice kind="info" title="Information" lines={['Passed Edits']} />);
          }}>Edit Data</button>
        </>}
      <button type="button" disabled={!ids.length} onClick={() => action('Print Route Report')}>Print Route Report</button>
      <button type="button" onClick={() => action('Ship Plan')}>Ship Plan</button>
      <button type="button" disabled={readOnly} onClick={() => action('Delete')}>Delete</button>
      <button type="button" disabled={readOnly} onClick={() => save(false)}>Save</button>
      <button type="button" disabled={readOnly} onClick={() => save(true)}>Save and Close</button>
      <button type="button" onClick={() => action('Close')}>Close</button>
    </div>
    {scacFor && (() => { const g = groups.find((x) => x.group === scacFor); return g && <ScacDialog group={g} readOnly={responseLocked || d.requestStatus === 'AW'}
      onChange={(patch) => {
        // The assigned carrier's SCAC, tender and costs go onto the group's CBL.
        change(withBill(setGroupResponse(store, record.id, g.group, patch), g.group));
      }} onClose={() => setScacFor(null)} />; })()}
    {simulating && <AtrSimulation remaining={simulating.remaining} onTick={() => {
      if (simulating.remaining > 1) { setSimulating({ ...simulating, remaining: simulating.remaining - 1 }); return; }
      change(receiveResponses(simulating.store, record.id, nowDate(), { force: true }));
      setMessage(<Notice kind="info" title="Information" lines={['ATR response received. Review the carriers on the Response tab.']} />);
      setTab('Response');
      setSimulating(null);
    }} />}
    {serviceFor && <ServiceCodeDialog group={serviceFor} codes={groups.find((g) => g.group === serviceFor)?.serviceCodes || []} readOnly={readOnly}
      onChange={(serviceCodes) => setGroup(serviceFor, { serviceCodes })} onClose={() => setServiceFor(null)} />}
    {equipmentFor && <EquipmentDialog group={equipmentFor} equipment={groups.find((g) => g.group === equipmentFor)?.equipment || []} readOnly={readOnly}
      onChange={(equipment) => setGroup(equipmentFor, { equipment })} onClose={() => setEquipmentFor(null)} />}
    {assigning && <AssignTcns store={store} record={record} change={change} setMessage={setMessage} onClose={() => setAssigning(false)} onShipPlan={() => { setAssigning(false); action('Ship Plan'); }} />}
    {lookup && <Lookup field={lookup.f} rows={lookup.rows} onSelect={(value) => (lookup.f.group ? setGroup(lookup.f.group, { ediMode: value }) : lookup.f.onPick ? lookup.f.onPick(value) : set(lookup.f.id, value))} onClose={() => setLookup(null)} />}
  </div>;
}

const EASTERN = 'Eastern Time: GFM expects all pickup and delivery date/times in the Eastern Time Zone.';
export const ATR_SIMULATION_SECONDS = 10;

// In training the ATR response window is a 10-second pop-up instead of the selected hours.
function AtrSimulation({ remaining, onTick }) {
  const tick = useRef(onTick);
  tick.current = onTick;
  useEffect(() => { const timer = setTimeout(() => tick.current(), 1000); return () => clearTimeout(timer); }, [remaining]);
  return <div className="cdf-dialog-overlay shared-atr-overlay">
    <section className="cdf-dialog cdf-dialog-bare shared-atr-sim" role="alertdialog" aria-modal="true" aria-label="Simulating ATR Time">
      <header><h3>Simulating ATR Time</h3></header>
      <p>The request has been forwarded to ATR. Carriers are responding…</p>
      <div className="shared-atr-bar" aria-hidden="true"><span style={{ width: `${((ATR_SIMULATION_SECONDS - remaining) / ATR_SIMULATION_SECONDS) * 100}%` }} /></div>
      <p role="timer" aria-live="polite">{remaining} second{remaining === 1 ? '' : 's'} remaining</p>
    </section>
  </div>;
}

// SCAC (Response → Assign/Remove SCAC): the carrier quotes for one equipment group, cheapest
// first. Clicking a row assigns (X) or removes that SCAC. Passing over a cheaper carrier needs
// its RSN reason.
function ScacDialog({ group, readOnly, onChange, onClose }) {
  const [errors, setErrors] = useState([]);
  const columns = ['Assigned', 'SCAC', 'Total Cost', 'Max Days', 'Tender', 'EQ Type', 'NMFC/UFC', 'RSN', 'Cumulative Weight', 'Conveyances Avail', 'Conveyances Used', 'Trans Mode'];
  const money = (n) => `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const toggle = (scac) => {
    if (readOnly) return;
    if (group.assignedScac === scac) { setErrors([]); onChange({ assignedScac: '' }); return; }
    const found = assignmentErrors(group.carriers, scac, group.reasons);
    setErrors(found);
    if (!found.length) onChange({ assignedScac: scac });
  };
  return <Dialog title="SCAC" bare onClose={onClose} wide overlayClassName="shared-route-scac-overlay">
    <div className="shared-route-equipment">
      <p className="shared-route-equipment-group">Equipment Group: {group.group}</p>
      <div className="shared-route-panel">
        <div className="shared-toolbar shared-route-empty-toolbar" />
        <div className="shared-table-scroll"><table className="shared-table">
          <thead><tr>{columns.map((c) => <th key={c} scope="col">{c}</th>)}</tr></thead>
          <tbody>{group.carriers.map((c) => <tr key={c.scac} aria-label={`SCAC ${c.scac}`} aria-selected={group.assignedScac === c.scac} onClick={() => toggle(c.scac)}>
            <td className="shared-route-center-cell">{group.assignedScac === c.scac ? 'X' : ''}</td><td>{c.scac}</td><td>{money(c.totalCost)}</td><td>{c.maxDays}</td><td>{c.tender}</td>
            <td>{c.eqType}</td><td>{c.nmfcUfc}</td>
            <td onClick={(e) => e.stopPropagation()}><select aria-label={`RSN ${c.scac}`} value={group.reasons[c.scac] || ''} disabled={readOnly}
              onChange={(e) => { setErrors([]); onChange({ reasons: { ...group.reasons, [c.scac]: e.target.value } }); }}>
              <option value="" />{RSN_CODES.map(([code, text]) => <option key={code} value={code}>{code} - {text}</option>)}
            </select></td>
            <td>{c.cumulativeWeight}</td><td>{c.conveyancesAvail}</td><td>{group.assignedScac === c.scac ? 1 : 0}</td><td />
          </tr>)}</tbody>
        </table>{!group.carriers.length && <p>No data to display.</p>}</div>
        <div className="shared-piece-count">{group.carriers.length} row(s) found.</div>
      </div>
      {errors.length > 0 && <ul className="shared-schedule-errors" role="alert">{errors.map((e) => <li key={e}>{e}</li>)}</ul>}
      <footer><button type="button" onClick={onClose}>Close</button></footer>
    </div>
  </Dialog>;
}

// The message line under the screen (Information / Error / Transaction Successfully Processed).
function Notice({ kind, title, lines }) {
  return <span className={`shared-route-notice is-${kind}`}><strong><span aria-hidden="true">{kind === 'error' ? '✕' : kind === 'ok' ? '✓' : 'i'}</span> {title}</strong>
    {lines.map((line) => <span key={line}><br />{line}</span>)}</span>;
}

// Equipment (guide steps 17–23): the group's equipment types; New opens New Equipment with the
// Equipment Type Lookup, Add keeps the window open for another, Save adds and closes.
function EquipmentDialog({ group, equipment, readOnly, onChange, onClose }) {
  const [adding, setAdding] = useState(false);
  const [type, setType] = useState('');
  const [lookup, setLookup] = useState(false);
  const add = () => { const code = type.trim().toUpperCase(); if (!code) return false; onChange([...equipment, code]); setType(''); return true; };
  return <Dialog title="Equipment" bare onClose={onClose} overlayClassName="shared-route-equipment-overlay">
    <div className="shared-route-equipment">
      <p className="shared-route-equipment-group">Equipment Group: {group}</p>
      <div className="shared-route-panel">
        <div className="shared-toolbar"><button type="button" disabled={readOnly} onClick={() => setAdding(true)}>New</button></div>
        <div className="shared-table-scroll"><table className="shared-table"><thead><tr><th scope="col">Equipment Type</th></tr></thead>
          <tbody>{equipment.map((code, i) => <tr key={`${code}-${i}`}><td>{code}</td></tr>)}</tbody></table>{!equipment.length && <p>No data to display.</p>}</div>
        <div className="shared-piece-count">{equipment.length} row(s) found.</div>
      </div>
      <footer><button type="button" onClick={onClose}>Close</button></footer>
    </div>
    {adding && <Dialog title="New Equipment" bare onClose={() => setAdding(false)} overlayClassName="shared-route-equipment-overlay shared-route-new-equipment">
      <div className="shared-route-equipment">
        <span className="shared-route-field"><label htmlFor="route-equip-type">Equip Type:</label>
          <input id="route-equip-type" aria-label="Equip Type" style={{ width: '56px' }} value={type} onChange={(e) => setType(e.target.value.toUpperCase())} />
          <button type="button" className="shared-route-lookup" aria-label="Look up Equip Type" onClick={() => setLookup(true)}>
            <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"><circle cx="6.5" cy="6.5" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="m10 10 4 4" stroke="currentColor" strokeWidth="1.5" /></svg>
          </button></span>
        <footer>
          <button type="button" onClick={add}>Add</button>
          <button type="button" onClick={() => { if (add()) setAdding(false); }}>Save</button>
          <button type="button" onClick={() => setAdding(false)}>Close</button>
        </footer>
      </div>
      {lookup && <ReferenceLookup title="Equipment Type Lookup" columns={['Type', 'Category', 'Description']} rows={EQUIPMENT_TYPE_ROWS} onSelect={(code) => setType(code)} onClose={() => setLookup(false)} />}
    </Dialog>}
  </Dialog>;
}

// Service Code: the group's accessorial/protective service codes. New opens the Service Code form:
// the code (typed or from the Service Code Lookup) fills Svc Code Type and Special Charge Desc;
// Stop is blank or 99.
function ServiceCodeDialog({ group, codes, readOnly, onChange, onClose }) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ code: '', stop: '' });
  const [lookup, setLookup] = useState(false);
  const info = serviceCodeInfo(form.code);
  const columns = [['code', 'Svc Code'], ['type', 'Svc Code Type'], ['desc', 'Special Charges Desc'], ['stop', 'Stop']];
  return <Dialog title="Service Code" bare onClose={onClose} overlayClassName="shared-route-equipment-overlay shared-route-service-overlay">
    <div className="shared-route-equipment">
      <p className="shared-route-equipment-group">Equipment Group: {group}</p>
      <div className="shared-route-panel">
        <div className="shared-toolbar"><button type="button" disabled={readOnly} onClick={() => { setForm({ code: '', stop: '' }); setAdding(true); }}>New</button></div>
        <div className="shared-table-scroll"><table className="shared-table"><thead><tr>{columns.map(([key, label]) => <th key={key} scope="col">{label}</th>)}</tr></thead>
          <tbody>{codes.map((row, i) => <tr key={`${row.code}-${i}`}>{columns.map(([key]) => <td key={key}>{row[key]}</td>)}</tr>)}</tbody></table>{!codes.length && <p>No data to display.</p>}</div>
        <div className="shared-piece-count">{codes.length} row(s) found.</div>
      </div>
      <footer><button type="button" onClick={onClose}>Close</button></footer>
    </div>
    {adding && <Dialog title="Service Code" bare onClose={() => setAdding(false)} overlayClassName="shared-route-equipment-overlay shared-route-new-service">
      <div className="shared-route-equipment shared-route-service-form">
        <span className="shared-route-field"><label htmlFor="route-svc-code">Service Code:</label>
          <input id="route-svc-code" aria-label="Service Code" style={{ width: '30px' }} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
          <button type="button" className="shared-route-lookup" aria-label="Look up Service Code" onClick={() => setLookup(true)}>
            <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"><circle cx="6.5" cy="6.5" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="m10 10 4 4" stroke="currentColor" strokeWidth="1.5" /></svg>
          </button></span>
        <span className="shared-route-field"><label className="shared-route-system" htmlFor="route-svc-type">Svc Code Type:</label><input id="route-svc-type" aria-label="Svc Code Type" readOnly value={info?.[1] || ''} style={{ width: '150px' }} /></span>
        <span className="shared-route-field"><label className="shared-route-system" htmlFor="route-svc-desc">Special Charge Desc:</label><input id="route-svc-desc" aria-label="Special Charge Desc" readOnly value={info?.[2] || ''} style={{ width: '142px' }} /></span>
        <span className="shared-route-field"><label htmlFor="route-svc-stop">Stop:</label>
          <select id="route-svc-stop" aria-label="Stop" value={form.stop} onChange={(e) => setForm({ ...form, stop: e.target.value })}><option value="" /><option value="99">99</option></select></span>
        <footer>
          <button type="button" onClick={() => {
            if (!form.code.trim()) return;
            onChange([...codes, { code: form.code.trim(), type: info?.[1] || '', desc: info?.[2] || '', stop: form.stop }]);
            setAdding(false);
          }}>Save</button>
          <button type="button" onClick={() => setAdding(false)}>Close</button>
        </footer>
      </div>
      {lookup && <ReferenceLookup title="Service Code Lookup" columns={['Service Code', 'Service Code Type', 'Description']} rows={SERVICE_CODES}
        onSelect={(code) => setForm((f) => ({ ...f, code }))} onClose={() => setLookup(false)} />}
    </Dialog>}
  </Dialog>;
}

// Equip Load Plan: the selected group's Fully Loaded flag and NMFC/UFC, saved with Save.
function LoadPlanForm({ plan, readOnly, onSave, onServiceCodes, onEquipment, openLookup }) {
  const [form, setForm] = useState({ fullyLoaded: plan.fullyLoaded, nmfc: plan.nmfc, nmfcSub: plan.nmfcSub });
  return <div className="shared-route-loadplan-form">
    <div className="shared-route-loadplan-fields">
      <span className="shared-route-field"><label>Equip Group:</label><span className="shared-route-value" aria-label="Selected equip group">{plan.group}</span></span>
      <span className="shared-route-field shared-route-flag"><label htmlFor="route-fully-loaded">Fully Loaded:</label>
        <input id="route-fully-loaded" type="checkbox" aria-label="Fully Loaded" checked={form.fullyLoaded} disabled={readOnly} onChange={(e) => setForm({ ...form, fullyLoaded: e.target.checked })} /></span>
      <span className="shared-route-field"><label htmlFor="route-plan-nmfc">NMFC/UFC:</label>
        <input id="route-plan-nmfc" aria-label="Load plan NMFC/UFC" style={{ width: '64px' }} value={form.nmfc} readOnly={readOnly} onChange={(e) => setForm({ ...form, nmfc: e.target.value })} />
        <input aria-label="Load plan NMFC/UFC Sub" style={{ width: '24px' }} value={form.nmfcSub} readOnly={readOnly} onChange={(e) => setForm({ ...form, nmfcSub: e.target.value })} />
        <button type="button" className="shared-route-lookup" aria-label="Look up Load plan NMFC/UFC" disabled={readOnly}
          onClick={() => openLookup({ f: { id: 'nmfc', label: 'NMFC/UFC', onPick: (value) => setForm((f) => ({ ...f, nmfc: value })) }, rows: lookupValues({ id: 'nmfc' }) })}>
          <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"><circle cx="6.5" cy="6.5" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="m10 10 4 4" stroke="currentColor" strokeWidth="1.5" /></svg>
        </button></span>
    </div>
    <div className="shared-toolbar">
      <button type="button" disabled={readOnly} onClick={onServiceCodes}>Service Codes</button>
      <button type="button" disabled={readOnly} onClick={onEquipment}>Equipment</button>
      <button type="button" disabled={readOnly} onClick={() => onSave(form)}>Save</button>
    </div>
  </div>;
}

export default function RoutingScreen({ store, record, opened, locked, newRouting, openRouting, ...rest }) {
  const [assignOnOpen, setAssignOnOpen] = useState(false);
  // After the ATR Carrier Response Hours, sent requests pick up their carrier list (RR → CR).
  useEffect(() => {
    const time = rest.now ? new Date(rest.now) : new Date();
    const due = Object.values(store.routings || {}).filter((r) => r.draft.requestStatus === 'RR' && time.getTime() >= Number(r.draft.responseDueAt));
    if (!due.length) return;
    let next = store;
    for (const r of due) next = receiveResponses(next, r.id, time);
    rest.change(next);
  }, [store, rest]);
  const [query, setQuery] = useState({ start: '', end: '' });
  const [search, setSearch] = useState(query);
  const [filters, setFilters] = useState({});
  if (opened && record) return <RouteOrder store={store} record={record} locked={locked} sample={Boolean(record.sample)} startAssigning={assignOnOpen} {...rest} />;
  const own = Object.values(store.routings || {});
  const all = [...own, ...ROUTING_SAMPLES.filter((s) => !own.some((r) => r.draft.shipmentId === s.draft.shipmentId))];
  const start = parseScheduleDate(search.start), end = parseScheduleDate(search.end);
  const rows = all.map((r) => ({ r, row: routingRow(r) })).filter(({ row }) => {
    const date = parseScheduleDate(row.requestDate);
    return (!start || (date && date >= start)) && (!end || (date && date <= end)) && Object.entries(filters).every(([key, value]) => contains(row[key], value));
  }).sort((a, b) => String(b.row.shipmentId).localeCompare(String(a.row.shipmentId)));
  return <div className="shared-routing-list">
    <form className="shared-schedule-search" role="search" aria-label="Routings search" onSubmit={(e) => { e.preventDefault(); setSearch(query); }}>
      <label htmlFor="routing-start">Start Date:</label><CmosDateField id="routing-start" label="Start Date" width="110px" value={query.start} onChange={(v) => setQuery({ ...query, start: v })} />
      <label htmlFor="routing-end">End Date:</label><CmosDateField id="routing-end" label="End Date" width="110px" value={query.end} onChange={(v) => setQuery({ ...query, end: v })} />
      <span className="shared-schedule-search-buttons"><button type="submit">Search</button></span>
    </form>
    <div className="shared-schedule-grid shared-routing-grid">
      <div className="shared-toolbar">
        <button type="button" disabled={locked} onClick={() => { setAssignOnOpen(true); newRouting(); }}>New</button>
        <button type="button" onClick={() => { setFilters({}); setQuery({ start: '', end: '' }); setSearch({ start: '', end: '' }); }}>Clear</button>
      </div>
      <div className="shared-table-scroll"><table className="shared-table">
        <thead>
          <tr className="shared-air-filters">{ROUTING_LIST_COLUMNS.map(([key, label]) => <th key={key}><input aria-label={`Filter ${label}`} value={filters[key] || ''} onChange={(e) => setFilters({ ...filters, [key]: e.target.value })} /></th>)}</tr>
          <tr>{ROUTING_LIST_COLUMNS.map(([key, label]) => <th key={key} scope="col">{label}</th>)}</tr>
        </thead>
        <tbody>{rows.map(({ r, row }) => <tr key={r.id}>
          {ROUTING_LIST_COLUMNS.map(([key]) => <td key={key}>{key === 'shipmentId'
            ? <button type="button" className="shared-air-manifest-link" aria-label={`Open route order ${row.shipmentId}`} onClick={() => { setAssignOnOpen(false); openRouting(r); }}><span aria-hidden="true">⧉ </span>{row.shipmentId}</button>
            : row[key]}</td>)}
        </tr>)}</tbody>
      </table>{!rows.length && <p>No data to display.</p>}</div>
      <div className="shared-piece-count">{rows.length} row(s) found.</div>
    </div>
  </div>;
}
