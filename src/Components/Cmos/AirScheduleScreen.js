import { useState } from 'react';
import { Dialog } from './controls';
import ReferenceLookup from './ReferenceLookup';
import CmosDateField from './CmosDateField';
import { createRecord, editRecord, saveRecord, deleteRecord } from './model';
import {
  AC_TYPES, TERMINALS, IO_OPTIONS, DIRECTIONS, MISSION_STATUSES, ROUTING_SLOTS, AIR_SCHEDULE_SAMPLES, dsoeRows,
  emptyMission, missionErrors, formatScheduleDate, parseScheduleDate,
} from './airScheduleLogic';
import { deploymentDsoeRows } from './deploymentLogic';

const COLUMNS = [['missionNumber', 'Mission Number'], ['ioInd', 'I/O'], ['dsoeId', 'DSOE ID'], ['chalk', 'Chalk'],
  ['scheduledArrival', 'Scheduled Arrival'], ['actualArrival', 'Actual Arrival'], ['scheduledDeparture', 'Scheduled Departure'], ['actualDeparture', 'Actual Departure']];
const contains = (value, query) => !query || String(value || '').toUpperCase().includes(String(query).toUpperCase().replace(/%/g, ''));
const defaultSearch = (now) => {
  const day = 864e5;
  return { from: formatScheduleDate(new Date(now - 30 * day)), to: formatScheduleDate(new Date(now + 31 * day)), io: 'O', status: 'O', mission: '' };
};

// APOD Terminals Lookup: pick a terminal, then Seq 1–5 puts it in that routing stop.
function TerminalLookup({ onPick, onClose }) {
  const columns = ['Terminal Name', 'Terminal', 'Type', 'TRDM'];
  const [filters, setFilters] = useState(columns.map(() => ''));
  const [selected, setSelected] = useState(null);
  const rows = TERMINALS.filter((row) => filters.every((q, i) => contains(row[i], q)));
  return <Dialog title="APOD Terminals Lookup" onClose={onClose} overlayClassName="shared-reference-overlay">
    <div className="shared-reference-lookup shared-terminal-lookup">
      <div className="shared-reference-toolbar"><button type="button" onClick={() => { setFilters(columns.map(() => '')); setSelected(null); }}>Clear</button></div>
      <div className="shared-reference-scroll"><table>
        <thead>
          <tr>{columns.map((c, i) => <th key={c}><input aria-label={`Filter ${c}`} value={filters[i]} onChange={(e) => setFilters(filters.map((v, j) => (j === i ? e.target.value : v)))} /></th>)}</tr>
          <tr>{columns.map((c) => <th key={c}>{c}</th>)}</tr>
        </thead>
        <tbody>{rows.map((row) => <tr key={row[1]} aria-label={`${row[1]} ${row[0]}`} aria-selected={selected === row[1]} tabIndex={0} onClick={() => setSelected(row[1])}>
          {row.map((v, i) => <td key={i}>{v}</td>)}
        </tr>)}</tbody>
      </table></div>
      <div className="shared-reference-count">{rows.length} row(s) found.</div>
      <footer>
        {Array.from({ length: ROUTING_SLOTS }, (_, i) => <button key={i} type="button" disabled={!selected} onClick={() => onPick(i, selected)}>Seq {i + 1}</button>)}
        <button type="button" onClick={onClose}>Close</button>
      </footer>
    </div>
  </Dialog>;
}

function MissionDialog({ store, mission, sample, locked, change, setMessage, onClose, dsoes }) {
  const [lookup, setLookup] = useState(null);
  const [errors, setErrors] = useState([]);
  const draft = { ...emptyMission(), ...mission.draft };
  const readOnly = locked || sample;
  const edit = (field, value) => { if (!readOnly) change(editRecord(store, 'missions', mission.id, { [field]: value })); };
  const setRouting = (index, value) => edit('routings', draft.routings.map((stop, i) => (i === index ? String(value).toUpperCase() : stop)));
  const save = (close) => {
    const found = missionErrors(draft, store.missions, mission.id);
    setErrors(found);
    if (found.length) return;
    change(saveRecord(editRecord(store, 'missions', mission.id, { missionNumber: draft.missionNumber.trim().toUpperCase() }), 'missions', mission.id));
    setMessage(<span className="shared-edit-ok"><strong>Transaction Successfully Processed</strong><br />Record Saved</span>);
    if (close) onClose(false);
  };
  // Closing a mission that was never saved discards it.
  const close = () => onClose(!mission.saved);
  const input = (field, label, { required, width, placeholder, disabled, lookupKind, date } = {}) => <div className="shared-schedule-field" data-field={field}>
    <label htmlFor={`schedule-${field}`} className={disabled ? 'shared-schedule-system' : undefined}>{required && <span className="shared-required-mark" aria-hidden="true">* </span>}{label}</label>
    <span className="shared-schedule-control">
      {date
        ? <CmosDateField id={`schedule-${field}`} label={label} withTime={date === 'datetime'} width={width} value={draft[field] || ''} readOnly={readOnly} disabled={disabled} onChange={(v) => edit(field, v)} />
        : <input id={`schedule-${field}`} aria-label={label} style={width ? { width } : undefined} placeholder={placeholder} value={draft[field] || ''}
          readOnly={readOnly || disabled} disabled={disabled} onChange={(e) => edit(field, e.target.value)} />}
      {lookupKind && <button type="button" className="shared-schedule-lookup" aria-label={`Look up ${label}`} disabled={readOnly}
        onClick={() => setLookup(lookupKind)}>
        <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"><circle cx="6.5" cy="6.5" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="m10 10 4 4" stroke="currentColor" strokeWidth="1.5" /></svg>
      </button>}
    </span>
  </div>;
  return <Dialog title="Air Schedule" onClose={close} wide overlayClassName="shared-schedule-overlay">
    <div className="shared-schedule-form">
      {sample && <p className="shared-schedule-note">Sample mission · view only. Click New to build your own mission.</p>}
      <div className="shared-schedule-columns">
        <div>
          <div className="shared-schedule-field" data-field="ioInd">
            <label htmlFor="schedule-ioInd"><span className="shared-required-mark" aria-hidden="true">* </span>I/O Ind</label>
            <span className="shared-schedule-control"><select id="schedule-ioInd" aria-label="I/O Ind" value={draft.ioInd} disabled={readOnly} onChange={(e) => edit('ioInd', e.target.value)}>
              {IO_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select></span>
          </div>
          {input('missionNumber', 'Mission Number', { required: true, width: '100px' })}
          {input('flightNbr', 'Flight Nbr', { width: '52px' })}
          {input('dsoeId', 'DSOE ID', { width: '52px', lookupKind: 'dsoe' })}
          {input('chalk', 'Chalk', { width: '46px', placeholder: '001' })}
          {input('carrier', 'Carrier', { width: '58px' })}
          {input('acType', 'AC Type', { width: '46px', lookupKind: 'acType' })}
          {input('tailNbr', 'Tail Nbr', { width: '58px' })}
        </div>
        <div>
          {input('allowableCabinLoad', 'Allowable Cabin Load', { width: '70px' })}
          {input('departedPr', 'Departed PR', { width: '38px' })}
          {input('spot', 'Spot', { width: '38px' })}
          {input('seats', 'Seats', { width: '38px' })}
          {input('scheduledArrival', 'Scheduled Arrival', { width: '128px', date: 'datetime' })}
          {input('actualArrival', 'Actual Arrival', { width: '128px', date: 'datetime' })}
          {input('scheduledDeparture', 'Scheduled Departure', { width: '128px', date: 'datetime' })}
          {input('actualDeparture', 'Actual Departure', { width: '128px', disabled: true, date: 'datetime' })}
        </div>
        <div>
          <div className="shared-schedule-field" data-field="remarks">
            <label htmlFor="schedule-remarks">Remarks</label>
            <textarea id="schedule-remarks" aria-label="Remarks" value={draft.remarks} readOnly={readOnly} onChange={(e) => edit('remarks', e.target.value)} />
          </div>
          <div className="shared-schedule-field" data-field="routings">
            <span className="shared-schedule-label">Routings</span>
            <span className="shared-schedule-control">
              {draft.routings.map((stop, i) => <input key={i} aria-label={`Routing ${i + 1}`} value={stop} maxLength={3} readOnly={readOnly} onChange={(e) => setRouting(i, e.target.value)} />)}
              <button type="button" className="shared-schedule-lookup" aria-label="Look up Routings" disabled={readOnly} onClick={() => setLookup('terminal')}>
                <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"><circle cx="6.5" cy="6.5" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="m10 10 4 4" stroke="currentColor" strokeWidth="1.5" /></svg>
              </button>
            </span>
          </div>
        </div>
      </div>
      {errors.length > 0 && <ul className="shared-schedule-errors" role="alert">{errors.map((e) => <li key={e}>{e}</li>)}</ul>}
      <footer>
        <button type="button" disabled={readOnly || !mission.saved || draft.statusCode === 'C'} onClick={() => {
          change(saveRecord(editRecord(store, 'missions', mission.id, { statusCode: 'C' }), 'missions', mission.id));
          setMessage(<span className="shared-edit-ok"><strong>Transaction Successfully Processed</strong><br />Mission Closed</span>);
          onClose(false);
        }}>Abort Mission</button>
        <button type="button" disabled={readOnly} onClick={() => save(false)}>Save</button>
        <button type="button" disabled={readOnly} onClick={() => save(true)}>Save and Close</button>
        <button type="button" disabled={readOnly || !mission.saved} onClick={() => {
          change(deleteRecord(store, 'missions', mission.id));
          setMessage(<span className="shared-edit-ok"><strong>Transaction Successfully Processed</strong><br />Record Deleted</span>);
          onClose(false);
        }}>Delete</button>
        <button type="button" onClick={close}>Close</button>
      </footer>
    </div>
    {lookup === 'acType' && <ReferenceLookup title="AC Type Lookup" columns={['Series', 'Description', 'Conveyance Seq', 'Military/Commercial']} rows={AC_TYPES}
      onSelect={(value) => edit('acType', value)} onClose={() => setLookup(null)} />}
    {lookup === 'dsoe' && <ReferenceLookup title="DSOE Lookup" columns={['DSOE ID', 'Chalk', 'Destination', 'Exercise/Mobility', 'Surface/Air']} rows={dsoeRows([...dsoes, ...deploymentDsoeRows(store)])}
      onSelect={(value, row) => { if (!readOnly) change(editRecord(store, 'missions', mission.id, { dsoeId: value, ...(row[1] ? { chalk: row[1] } : {}) })); }} onClose={() => setLookup(null)} />}
    {lookup === 'terminal' && <TerminalLookup onPick={(index, terminal) => setRouting(index, terminal)} onClose={() => setLookup(null)} />}
  </Dialog>;
}

export default function AirScheduleScreen({ store, change, locked, setMessage, dsoes = [], now = Date.now() }) {
  const [query, setQuery] = useState(() => defaultSearch(now));
  const [search, setSearch] = useState(query);
  const [filters, setFilters] = useState({});
  const [openId, setOpenId] = useState(null);
  const missions = store.missions || {};
  const own = Object.values(missions);
  const all = [...own, ...AIR_SCHEDULE_SAMPLES.filter((s) => !own.some((m) => String(m.draft.missionNumber).toUpperCase() === s.draft.missionNumber))];
  const from = parseScheduleDate(search.from), to = parseScheduleDate(search.to);
  const rows = all.filter((m) => {
    const d = m.saved || m.draft;
    if (!m.saved && !m.sample) return false;
    if (search.mission) return contains(d.missionNumber, search.mission);
    const arrival = parseScheduleDate(d.scheduledArrival);
    return (!search.io || (d.ioInd || 'O') === search.io) && (!search.status || (d.statusCode || 'O') === search.status)
      && (!arrival || ((!from || arrival >= from) && (!to || arrival <= new Date(to.getTime() + 864e5 - 1))))
      && Object.entries(filters).every(([key, value]) => contains(d[key], value));
  }).sort((a, b) => String((a.saved || a.draft).missionNumber).localeCompare(String((b.saved || b.draft).missionNumber)));
  const open = openId && (missions[openId] || AIR_SCHEDULE_SAMPLES.find((s) => s.id === openId));
  return <div className="shared-schedule">
    <form className="shared-schedule-search" role="search" aria-label="Air Schedule search" onSubmit={(e) => { e.preventDefault(); setSearch(query); }}>
      <label htmlFor="schedule-from">Scheduled Arrival Date Range</label>
      <span className="shared-date-range"><CmosDateField id="schedule-from" label="Scheduled Arrival From" width="110px" value={query.from} onChange={(v) => setQuery({ ...query, from: v })} />
        <CmosDateField label="Scheduled Arrival To" width="110px" value={query.to} onChange={(v) => setQuery({ ...query, to: v })} /></span>
      <label htmlFor="schedule-status">Status</label>
      <span><select id="schedule-status" aria-label="Status" value={query.io} title={DIRECTIONS.find(([c]) => c === query.io)?.[1]} onChange={(e) => setQuery({ ...query, io: e.target.value })}>
        <option value="" />{DIRECTIONS.map(([code, label]) => <option key={code} value={code}>{code} - {label}</option>)}
      </select>
      <select aria-label="Open or closed" value={query.status} onChange={(e) => setQuery({ ...query, status: e.target.value })}>
        <option value="" />{MISSION_STATUSES.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
      </select></span>
      <label htmlFor="schedule-mission">Mission</label>
      <input id="schedule-mission" aria-label="Mission search" value={query.mission} onChange={(e) => setQuery({ ...query, mission: e.target.value })} />
      <span className="shared-schedule-search-buttons"><button type="submit">Search</button><button type="button" onClick={() => { const value = defaultSearch(now); setQuery(value); setSearch(value); setFilters({}); }}>Clear</button></span>
      <p><strong>Tip</strong> Default search returns Open Missions.</p>
    </form>
    <div className="shared-schedule-grid">
      <div className="shared-toolbar">
        <button type="button" disabled={locked} onClick={() => {
          const next = createRecord(store, 'missions', emptyMission());
          change(next); setOpenId(next.selection.missions);
        }}>New</button>
        <button type="button" onClick={() => setFilters({})}>Clear</button>
      </div>
      <div className="shared-table-scroll"><table className="shared-table">
        <thead>
          <tr className="shared-air-filters">{COLUMNS.map(([key, label]) => <th key={key}><input aria-label={`Filter ${label}`} value={filters[key] || ''} onChange={(e) => setFilters({ ...filters, [key]: e.target.value })} /></th>)}</tr>
          <tr>{COLUMNS.map(([key, label]) => <th key={key} scope="col">{label}</th>)}</tr>
        </thead>
        <tbody>{rows.map((m) => { const d = m.saved || m.draft; return <tr key={m.id} aria-selected={openId === m.id}>
          {COLUMNS.map(([key]) => <td key={key}>{key === 'missionNumber'
            ? <button type="button" className="shared-air-manifest-link" aria-label={`Open mission ${d.missionNumber}`} onClick={() => setOpenId(m.id)}>{d.missionNumber}</button>
            : d[key]}</td>)}
        </tr>; })}</tbody>
      </table>{!rows.length && <p>No data to display.</p>}</div>
      <div className="shared-piece-count">{rows.length} row(s) found.</div>
    </div>
    {open && <MissionDialog store={store} mission={open} sample={Boolean(open.sample)} locked={locked} change={change} setMessage={setMessage} dsoes={dsoes}
      onClose={(discard) => {
        if (discard && missions[open.id]) change(deleteRecord(store, 'missions', open.id));
        setOpenId(null);
      }} />}
  </div>;
}
