const MONTHS = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
];
export function parseCmosDate(value) {
  const text = String(value || "")
    .trim()
    .toUpperCase();
  let year, month, day;
  const code = /^(\d{2})([A-Z]{3})(\d{4})$/.exec(text),
    iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (code) {
    year = Number(code[3]);
    month = MONTHS.indexOf(code[2]);
    day = Number(code[1]);
  } else if (iso) {
    year = Number(iso[1]);
    month = Number(iso[2]) - 1;
    day = Number(iso[3]);
  } else return null;
  if (month < 0 || month > 11 || day < 1) return null;
  const date = new Date(Date.UTC(year, month, day));
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month &&
    date.getUTCDate() === day
    ? date.getTime()
    : null;
}
export function parseEasternDateTime(value) {
  const text = String(value || "").trim();
  const match =
    /^(\d{4}-\d{2}-\d{2}|\d{2}[A-Za-z]{3}\d{4})[T/ ](\d{2}):?(\d{2})$/.exec(
      text,
    );
  if (!match) return null;
  const date = parseCmosDate(match[1]),
    hour = Number(match[2]),
    minute = Number(match[3]);
  if (date === null || hour > 23 || minute > 59) return null;
  const target = date + hour * 3600000 + minute * 60000;
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  });
  const displayed = (timestamp) => {
    const parts = Object.fromEntries(
      fmt.formatToParts(timestamp).map((p) => [p.type, p.value]),
    );
    return Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
    );
  };
  let timestamp = target;
  for (let i = 0; i < 3; i++) timestamp += target - displayed(timestamp);
  return displayed(timestamp) === target ? timestamp : null;
}
