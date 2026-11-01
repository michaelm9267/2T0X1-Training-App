// Firestore limits each document to 1 MiB. Keep chunks below that even for Unicode reports.
export function splitPayload(data, generation) {
  if (data.length > 2000000) throw new Error('The saved WAPS snapshot is too large. Export and clear older reports.');
  const parts = [];
  for (let start = 0; start < data.length;) {
    let end = Math.min(start + 200000, data.length);
    const last = data.charCodeAt(end - 1);
    if (end < data.length && last >= 0xD800 && last <= 0xDBFF) end -= 1;
    parts.push({generation, data: data.slice(start, end)}); start = end;
  }
  if (!parts.length || parts.length > 400) throw new Error('The saved WAPS snapshot is too large. Export and clear older reports.');
  return parts;
}
export function joinPayload(parts, header) {
  if (parts.length !== header.parts || parts.some(p => !p || p.generation !== header.generation || typeof p.data !== 'string')) throw new Error('Saved WAPS snapshot changed during download. Retry.');
  return parts.map(p=>p.data).join('');
}
