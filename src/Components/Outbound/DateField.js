import { useEffect, useRef, useState } from 'react';
import { DOCUMENT_DAY } from './outboundShipments';

// A date entry with a calendar picker. format 'dmy' writes ddmmmyyyy (12OCT2026); 'julian' writes
// the three-digit day of the year (285), as an RDD is written. The entry can still be typed.

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const YEAR = 2026;
const dayOfYear = date => Math.round((date - Date.UTC(date.getUTCFullYear(), 0, 1)) / 864e5) + 1;
export const formatDate = (date, format) => format === 'julian'
  ? String(dayOfYear(date)).padStart(3, '0')
  : `${String(date.getUTCDate()).padStart(2, '0')}${MONTHS[date.getUTCMonth()]}${date.getUTCFullYear()}`;
function parse(value, format) {
  const text = String(value || '').trim().toUpperCase();
  if (format === 'julian') return /^\d{3}$/.test(text) && Number(text) >= 1 && Number(text) <= 365 ? new Date(Date.UTC(YEAR, 0, Number(text))) : null;
  const match = /^(\d{2})([A-Z]{3})(\d{4})$/.exec(text);
  return match && MONTHS.includes(match[2]) ? new Date(Date.UTC(Number(match[3]), MONTHS.indexOf(match[2]), Number(match[1]))) : null;
}

export default function DateField({ id, value, onChange, format = 'dmy', readOnly, disabled, className, width = '8em', label }) {
  const [open, setOpen] = useState(false);
  const wrapper = useRef(null);
  const start = parse(value, format) || new Date(Date.UTC(YEAR, 0, DOCUMENT_DAY));
  const [month, setMonth] = useState({ year: start.getUTCFullYear(), month: start.getUTCMonth() });
  useEffect(() => {
    if (!open) return undefined;
    const close = event => { if (!wrapper.current?.contains(event.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);
  const locked = readOnly || disabled;
  const first = new Date(Date.UTC(month.year, month.month, 1));
  const days = new Date(Date.UTC(month.year, month.month + 1, 0)).getUTCDate();
  const selected = parse(value, format);
  const shift = step => setMonth(current => { const d = new Date(Date.UTC(current.year, current.month + step, 1)); return { year: d.getUTCFullYear(), month: d.getUTCMonth() }; });
  function toggle() {
    if (!open) { const d = parse(value, format) || start; setMonth({ year: d.getUTCFullYear(), month: d.getUTCMonth() }); }
    setOpen(!open);
  }
  return <span className="date-field" ref={wrapper}>
    <input id={id} aria-label={label} className={className} style={{ width }} readOnly={readOnly} disabled={disabled} placeholder={format === 'julian' ? 'ddd' : 'ddmmmyyyy'} value={value ?? ''} onChange={event => onChange(event.target.value)} />
    <button type="button" className="date-field-button" aria-label={`Choose ${label || 'date'} from calendar`} aria-expanded={open} disabled={locked} onClick={toggle}>📅</button>
    {open && !locked && <span className="date-calendar" role="dialog" aria-label="Calendar">
      <span className="date-calendar-head">
        <button type="button" aria-label="Previous month" onClick={() => shift(-1)}>‹</button>
        <strong>{MONTHS[month.month]} {month.year}</strong>
        <button type="button" aria-label="Next month" onClick={() => shift(1)}>›</button>
      </span>
      <span className="date-calendar-grid">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <span key={i} className="date-calendar-dow">{d}</span>)}
        {Array.from({ length: first.getUTCDay() }, (_, i) => <span key={`blank${i}`} />)}
        {Array.from({ length: days }, (_, i) => {
          const date = new Date(Date.UTC(month.year, month.month, i + 1));
          const isSelected = selected && selected.getTime() === date.getTime();
          return <button key={i} type="button" aria-label={`${i + 1} ${MONTHS[month.month]} ${month.year}${format === 'julian' ? `, day ${dayOfYear(date)}` : ''}`} aria-pressed={Boolean(isSelected)}
            className={dayOfYear(date) === DOCUMENT_DAY && month.year === YEAR ? 'date-calendar-today' : undefined} onClick={() => { onChange(formatDate(date, format)); setOpen(false); }}>{i + 1}</button>;
        })}
      </span>
    </span>}
  </span>;
}
