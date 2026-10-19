import { useEffect } from 'react';
import { Dialog } from './controls';
import CmosDateField from './CmosDateField';
import RegulationHelp from '../Regulations/RegulationHelp';
import { formatScheduleDateTime } from './airScheduleLogic';

// Release (Commercial BOL): the B/L number, the departure date and time (required), the carrier's
// waybill number, and the estimated delivery date; OK releases the bill.
export default function CblRelease({ record, locked, message, onEdit, onRelease, onClose }) {
  const details = { ...record?.releaseDetails, ...record?.releaseDraft };
  // The departure starts at the current date and time, as CMOS fills it in.
  useEffect(() => { if (!locked && !details.departureDate) onEdit('departureDate', formatScheduleDateTime(new Date())); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const row = (label, control, { required = false, system = false } = {}) => <div className={`cmos-release-field${system ? ' cmos-release-readonly' : ''}`}><span>{required && <span aria-hidden="true">* </span>}{label}:</span>{control}</div>;
  return <Dialog title="Release" onClose={onClose}><div className="cmos-release cmos-cbl-release">
    {row('B/L Nbr', <input aria-label="B/L Nbr" value={record?.draft?.movementDocNbr || ''} readOnly />, { system: true })}
    {row('Departure Date', <CmosDateField label="Departure Date" withTime width="128px" value={details.departureDate || ''} disabled={locked} title="Example: 18Oct2026/1956" onChange={value => onEdit('departureDate', value)} />, { required: true })}
    {row('Carrier/Waybill Nbr', <input aria-label="Carrier/Waybill Nbr" value={details.waybill || ''} disabled={locked} onChange={e => onEdit('waybill', e.target.value.toUpperCase())} />)}
    {row('Estimated Delivery Date', <CmosDateField label="Estimated Delivery Date" width="128px" value={details.deliveryDate || ''} disabled={locked} onChange={value => onEdit('deliveryDate', value)} />)}
    <RegulationHelp claims={['outbound.bol']} assumptions={['A required Departure Date, an optional waybill and delivery date, and the ddMmmyyyy/HHmm entry are CMOS screen behavior in this trainer, not cited regulatory requirements.']} />
    {message && <p className="cmos-release-message" role="status">{message}</p>}
    <footer className="cmos-release-footer">
      <button type="button" disabled={locked} onClick={() => onRelease(details)}>OK</button>
      <button type="button" onClick={onClose}>Close</button>
    </footer>
  </div></Dialog>;
}
