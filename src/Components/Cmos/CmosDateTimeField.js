import { useEffect, useState } from 'react';
import CmosDateField from './CmosDateField';
import { formatScheduleDateTime, parseScheduleDate, validDateTime } from './airScheduleLogic';
import { parseLocal, toLocalInput } from '../Departure/departureLogic';

// The CMOS date/time box (ddMmmyyyy/HHmm, e.g. 18Oct2026/1744, with the calendar and Now button)
// for values kept in the YYYY-MM-DDTHH:MM local form. A typed entry that is not yet a complete date
// and time reports '' and shows the expected format.
export default function CmosDateTimeField({ label, value, onChange, disabled = false }) {
  const shown = parseLocal(value) ? formatScheduleDateTime(parseLocal(value)) : '';
  const [text, setText] = useState(shown);
  useEffect(() => { if (shown && parseScheduleDate(text)?.getTime() !== parseLocal(value)?.getTime()) setText(shown); }, [value]); // eslint-disable-line react-hooks/exhaustive-deps
  const invalid = text.trim() !== '' && !validDateTime(text);
  return <span className="cmos-datetime">
    <CmosDateField label={label} withTime width="128px" value={text} disabled={disabled} title="ddMmmyyyy/HHmm, e.g. 18Oct2026/1744 (24-hour)"
      onChange={next => { setText(next); onChange(validDateTime(next) ? toLocalInput(parseScheduleDate(next)) : ''); }} />
    {invalid && <small className="cmos-datetime-hint" role="status">Use ddMmmyyyy/HHmm, e.g. 18Oct2026/1744, or pick it from the calendar.</small>}
  </span>;
}
