import { useEffect, useState } from 'react';
import DateField, { formatDate } from '../Outbound/DateField';
import { formatTime, parseLocal, toLocalInput } from './departureLogic';
import './departure.css';

// Aircraft departure entry for first-time users: a calendar date, then hour and minute lists in
// 24-hour local time, with Today and Use current time shortcuts. The value it reports is the
// YYYY-MM-DDTHH:MM departure the release checks use, or '' until the date, hour, and minute are set.
const two = n => String(n).padStart(2, '0');
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const twelveHour = h => `${h % 12 || 12} ${h < 12 ? 'AM' : 'PM'}`;
const partsOf = value => {
  const date = parseLocal(value);
  return date ? { date: formatDate(new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())), 'dmy'), hour: two(date.getHours()), minute: two(date.getMinutes()) } : { date: '', hour: '', minute: '' };
};
function compose({ date, hour, minute }) {
  const match = /^(\d{2})([A-Z]{3})(\d{4})$/.exec(String(date).trim().toUpperCase());
  if (!match || !MONTHS.includes(match[2]) || hour === '' || minute === '') return '';
  const day = new Date(Number(match[3]), MONTHS.indexOf(match[2]), Number(match[1]), Number(hour), Number(minute));
  return day.getDate() === Number(match[1]) ? toLocalInput(day) : '';
}

export default function DepartureTimeField({ label = 'Departure Date/Time', value, onChange, disabled = false }) {
  const [parts, setParts] = useState(() => partsOf(value));
  // A departure set elsewhere (another screen, a reset) replaces what is shown here.
  useEffect(() => { if (value && value !== compose(parts)) setParts(partsOf(value)); }, [value]); // eslint-disable-line react-hooks/exhaustive-deps
  const update = next => { const merged = { ...parts, ...next }; setParts(merged); onChange(compose(merged)); };
  const today = () => { const now = new Date(); update({ date: formatDate(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())), 'dmy') }); };
  const complete = parseLocal(compose(parts));
  const missing = [!compose({ ...parts, hour: '00', minute: '00' }) && 'date', parts.hour === '' && 'hour', parts.minute === '' && 'minute'].filter(Boolean);
  return <span className="departure-time-field" role="group" aria-label={label}>
    <span className="departure-time-row">
      <DateField label={`${label} date`} value={parts.date} disabled={disabled} onChange={date => update({ date })} />
      <button type="button" disabled={disabled} onClick={today}>Today</button>
    </span>
    <span className="departure-time-row">
      <label>Hour<select aria-label={`${label} hour`} disabled={disabled} value={parts.hour} onChange={event => update({ hour: event.target.value })}>
        <option value="">--</option>{Array.from({ length: 24 }, (_, h) => <option key={h} value={two(h)}>{two(h)} ({twelveHour(h)})</option>)}
      </select></label>
      <label>Minute<select aria-label={`${label} minute`} disabled={disabled} value={parts.minute} onChange={event => update({ minute: event.target.value })}>
        <option value="">--</option>{Array.from({ length: 60 }, (_, m) => <option key={m} value={two(m)}>{two(m)}</option>)}
      </select></label>
      <button type="button" disabled={disabled} onClick={() => { const now = new Date(); setParts(partsOf(toLocalInput(now))); onChange(toLocalInput(now)); }}>Use current time</button>
    </span>
    <small className="departure-time-status" aria-live="polite">{complete ? `Departs ${formatTime(complete)} (24-hour local time).` : `Choose the departure ${missing.join(', ').replace(/, ([^,]*)$/, ' and $1') || 'date'}.`}</small>
  </span>;
}
