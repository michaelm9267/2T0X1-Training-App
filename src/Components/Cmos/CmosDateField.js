import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { formatScheduleDate, parseScheduleDate } from './airScheduleLogic';

// A CMOS date entry with a calendar button. Writes ddMmmyyyy, or ddMmmyyyy/HHmm when withTime;
// the entry can still be typed.
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const pad = (n) => String(n).padStart(2, '0');

export default function CmosDateField({ id, label, value, onChange, withTime = false, readOnly, disabled, width, placeholder, title }) {
  const [open, setOpen] = useState(false);
  const wrapper = useRef(null);
  const popup = useRef(null);
  // The calendar floats over the page so a dialog's edge never clips it: placed under the field,
  // above it when there is no room below, and kept inside the window.
  const [place, setPlace] = useState(null);
  const current = parseScheduleDate(value);
  const start = current || new Date();
  const [month, setMonth] = useState({ year: start.getFullYear(), month: start.getMonth() });
  const timeText = /\/(\d{4})$/.exec(String(value || '').trim())?.[1] || '';
  const [time, setTime] = useState(timeText || '0800');
  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => { if (!wrapper.current?.contains(event.target) && !popup.current?.contains(event.target)) setOpen(false); };
    const escape = (event) => { if (event.key === 'Escape') { event.stopPropagation(); setOpen(false); } };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', escape, true);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', escape, true); };
  }, [open]);
  useLayoutEffect(() => {
    if (!open) return undefined;
    const position = () => {
      const field = wrapper.current?.getBoundingClientRect();
      const view = wrapper.current?.ownerDocument.defaultView || window;
      if (!field) return;
      const width = popup.current?.offsetWidth || 214, height = popup.current?.offsetHeight || 250, gap = 3, margin = 6;
      const below = field.bottom + gap;
      const top = below + height > view.innerHeight - margin && field.top - gap - height >= margin ? field.top - gap - height : Math.max(margin, Math.min(below, view.innerHeight - height - margin));
      const left = Math.max(margin, Math.min(field.left, view.innerWidth - width - margin));
      setPlace({ top, left });
    };
    position();
    const view = wrapper.current?.ownerDocument.defaultView || window;
    view.addEventListener('resize', position);
    view.addEventListener('scroll', position, true);
    return () => { view.removeEventListener('resize', position); view.removeEventListener('scroll', position, true); };
  }, [open]);
  const locked = readOnly || disabled;
  const toggle = () => {
    if (!open) { const d = parseScheduleDate(value) || new Date(); setMonth({ year: d.getFullYear(), month: d.getMonth() }); setTime(timeText || '0800'); }
    setOpen(!open);
  };
  const shift = (step) => setMonth((m) => { const d = new Date(m.year, m.month + step, 1); return { year: d.getFullYear(), month: d.getMonth() }; });
  const write = (date, hhmm = time) => onChange(withTime ? `${formatScheduleDate(date)}/${hhmm}` : formatScheduleDate(date));
  const first = new Date(month.year, month.month, 1);
  const days = new Date(month.year, month.month + 1, 0).getDate();
  const validTime = /^([01]\d|2[0-3])[0-5]\d$/.test(time);
  return <span className="cmos-date-field" ref={wrapper}>
    <input id={id} aria-label={label} title={title} value={value || ''} placeholder={placeholder || (withTime ? 'ddmmmyyyy/HHmm' : 'ddmmmyyyy')} style={width ? { width } : undefined}
      readOnly={locked} disabled={disabled} onChange={(e) => onChange(e.target.value)} />
    <button type="button" className="cmos-date-button" aria-label={`Choose ${label}`} aria-expanded={open} disabled={locked} onClick={toggle}>
      <svg viewBox="0 0 18 16" width="16" height="14" aria-hidden="true"><rect x="1" y="2.5" width="12" height="11" rx="1" fill="#fff" stroke="#6b7c93" /><path d="M1 6h12" stroke="#6b7c93" /><path d="M4 1v3M10 1v3" stroke="#6b7c93" strokeWidth="1.4" />{withTime && <><circle cx="13.5" cy="11.5" r="4" fill="#fff" stroke="#c0661f" /><path d="M13.5 9.5v2h1.6" stroke="#c0661f" fill="none" /></>}</svg>
    </button>
    {open && createPortal(<div ref={popup} className="cmos-date-popup cmos-date-popup-floating" role="dialog" aria-label={`${label} calendar`} style={place ? { top: place.top, left: place.left } : { visibility: 'hidden' }}>
      <div className="cmos-date-head">
        <button type="button" aria-label="Previous month" onClick={() => shift(-1)}>‹</button>
        <strong>{MONTHS[month.month]} {month.year}</strong>
        <button type="button" aria-label="Next month" onClick={() => shift(1)}>›</button>
      </div>
      <div className="cmos-date-grid">
        {WEEKDAYS.map((d) => <span key={d} className="cmos-date-weekday">{d}</span>)}
        {Array.from({ length: first.getDay() }, (_, i) => <span key={`blank-${i}`} />)}
        {Array.from({ length: days }, (_, i) => {
          const date = new Date(month.year, month.month, i + 1);
          const chosen = current && current.toDateString() === date.toDateString();
          return <button type="button" key={i} aria-label={`${formatScheduleDate(date)}`} aria-pressed={Boolean(chosen)} className={chosen ? 'is-chosen' : undefined}
            onClick={() => { write(date, validTime ? time : '0000'); setOpen(false); }}>{i + 1}</button>;
        })}
      </div>
      {withTime && <label className="cmos-date-time">Time (HHmm)
        <input aria-label={`${label} time`} value={time} maxLength={4} inputMode="numeric" className={validTime ? undefined : 'is-invalid'}
          onChange={(e) => { const next = e.target.value.replace(/\D/g, '').slice(0, 4); setTime(next); if (current && /^([01]\d|2[0-3])[0-5]\d$/.test(next)) write(current, next); }} />
      </label>}
      <div className="cmos-date-foot">
        <button type="button" onClick={() => { const now = new Date(); write(now, withTime ? `${pad(now.getHours())}${pad(now.getMinutes())}` : time); setOpen(false); }}>{withTime ? 'Now' : 'Today'}</button>
        <button type="button" onClick={() => setOpen(false)}>Close</button>
      </div>
    </div>, wrapper.current?.ownerDocument.body || document.body)}
  </span>;
}
