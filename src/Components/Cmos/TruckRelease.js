import { useEffect } from 'react';
import { Dialog } from './controls';
import CmosDateField from './CmosDateField';
import { formatScheduleDateTime, parseScheduleDate, validDateTime } from './airScheduleLogic';

// Release Truck Manifest, as the CMOS window: the document (manifest) number, the departure
// date/time (filled with the current time, as CMOS does), and the estimated delivery date.
const pad = n => String(n).padStart(2, '0');
// The departure as the release check stores it (yyyy-mm-ddTHH:mm).
export const departureIso = text => { const d = validDateTime(text) && parseScheduleDate(text); return d ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}` : ''; };

export default function TruckRelease({ record, locked, message, onEdit, onRelease, onClose }) {
  const details = { ...record?.releaseDetails, ...record?.releaseDraft };
  useEffect(() => { if (!locked && !details.departureDate) onEdit('departureDate', formatScheduleDateTime(new Date())); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const row = (label, control, system = false) => <div className={`cmos-release-field${system ? ' cmos-release-readonly' : ''}`}><span>{label}</span>{control}</div>;
  return <Dialog title="Release Truck Manifest" onClose={onClose}><div className="cmos-release cmos-truck-release">
    <p className="cmos-truck-release-tip"><strong>Tip</strong> Edit/Complete information then select Release to process shipment</p>
    {row('Document Number', <input aria-label="Document Number" value={record?.draft?.manifestNumber || ''} readOnly />, true)}
    {row('Departure Date/Time', <CmosDateField label="Departure Date/Time" withTime width="128px" value={details.departureDate || ''} disabled={locked} title="Example: 19Oct2026/0000" onChange={value => onEdit('departureDate', value)} />)}
    {row('Estimated Delivery Date', <CmosDateField label="Estimated Delivery Date" withTime width="128px" value={details.deliveryDate || ''} disabled={locked} title="Example: 19Oct2026/0000" onChange={value => onEdit('deliveryDate', value)} />)}
    {message && <p className="cmos-release-message" role="status">{message}</p>}
    <footer className="cmos-release-footer">
      <button type="button" disabled={locked} onClick={() => onRelease({ ...details, departureAt: departureIso(details.departureDate) })}>Release</button>
      <button type="button" onClick={onClose}>Close</button>
    </footer>
  </div></Dialog>;
}
