import { useState } from 'react';
import { Dialog } from './controls';
import CmosDateTimeField from './CmosDateTimeField';
import RegulationHelp from '../Regulations/RegulationHelp';

// CMOS Release Air Shipment: the manifest's mission, flight, DSOE ID, and chalk come from the
// manifest and its Air Schedule mission; the inspector enters the departure (DEP Date/Time) and the
// estimated delivery (EDD), then releases. Cargo lists the manifest being released; Passenger has
// no manifests in this trainer.
const COLUMNS = [['manifest', 'Manifest'], ['refId', 'Ref ID'], ['apod', 'APOD']];
const contains = (value, query) => !query || String(value || '').toUpperCase().includes(query.toUpperCase());

function ManifestGrid({ title, rows }) {
  const [filters, setFilters] = useState({});
  const shown = rows.filter(row => COLUMNS.every(([key]) => contains(row[key], filters[key])));
  return <section className="cmos-release-grid" aria-label={title}>
    <div className="cmos-release-tab" role="tab" aria-selected="true">{title}</div>
    <div className="cmos-release-panel">
      <div className="shared-toolbar"><button type="button" onClick={() => setFilters({})}>Clear</button></div>
      <table className="shared-table">
        <thead>
          <tr className="shared-air-filters">{COLUMNS.map(([key, label]) => <th key={key}><input aria-label={`Filter ${title} ${label}`} value={filters[key] || ''} onChange={e => setFilters({ ...filters, [key]: e.target.value })} /></th>)}</tr>
          <tr>{COLUMNS.map(([key, label]) => <th key={key}>{label}</th>)}</tr>
        </thead>
        <tbody>{shown.map(row => <tr key={row.manifest} aria-selected="true">{COLUMNS.map(([key]) => <td key={key}>{row[key]}</td>)}</tr>)}
          {!shown.length && <tr><td colSpan={COLUMNS.length}>No data to display.</td></tr>}</tbody>
      </table>
      <div className="shared-air-count">{shown.length} row(s) found.</div>
    </div>
  </section>;
}

export default function ReleaseAirShipment({ store, record, locked, message, onEdit, onRelease, onClose }) {
  const draft = record?.draft || {};
  const details = { ...record?.releaseDetails, ...record?.releaseDraft };
  const mission = Object.values(store.missions || {}).find(m => m.saved && String(m.saved.missionNumber || '').toUpperCase() === String(draft.mission || '').trim().toUpperCase());
  // Flight Nbr is the Air Schedule mission's; manifests built before a mission keep their own.
  const flightNumber = mission?.saved.flightNbr || draft.flightNumber || '';
  const readOnly = (label, value) => <label className="cmos-release-field cmos-release-readonly"><span>{label}</span><input aria-label={label} value={value || ''} readOnly /></label>;
  const dateTime = (label, key) => <div className="cmos-release-field"><span><span aria-hidden="true">* </span>{label}</span><CmosDateTimeField label={label} value={details[key] || ''} disabled={locked} onChange={value => onEdit(key, value)} /></div>;
  return <Dialog title="Release Air Shipment" wide onClose={onClose}>
    <div className="cmos-release">
      <div className="cmos-release-fields">
        {readOnly('Mission', draft.mission)}
        {dateTime('DEP Date/Time', 'departureAt')}
        {readOnly('DSOE ID', draft.dsoeId)}
        {readOnly('Flight Nbr', flightNumber)}
        {dateTime('EDD', 'edd')}
        {readOnly('Chalk', draft.chalk)}
      </div>
      <div className="cmos-release-grids">
        <ManifestGrid title="Cargo" rows={[{ manifest: draft.manifestNumber, refId: draft.refId, apod: draft.pod }]} />
        <ManifestGrid title="Passenger" rows={[]} />
      </div>
      <RegulationHelp claims={['documents.load', 'departure.finalPlan']} assumptions={['The required EDD, the Flight Nbr taken from the Air Schedule mission, and the release within 30 minutes following departure are trainer workflow rules, not cited regulatory requirements.']} />
      {message && <p className="cmos-release-message" role="status">{message}</p>}
      <footer className="cmos-release-footer">
        <button type="button" disabled={locked} onClick={() => onRelease({ ...details, flightNumber })}>Release</button>
        <button type="button" onClick={onClose}>Close</button>
      </footer>
    </div>
  </Dialog>;
}
