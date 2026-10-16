// A requisition document occupies 14 positions, or 15 including its suffix.
export const documentTcn = value => {
  const document = String(value || '').trim().toUpperCase();
  return /^[A-Z0-9]{14,15}$/.test(document) ? document.padEnd(17, 'X') : '';
};
export const documentType = value => String(value || '').slice(0, 1).toUpperCase();
export const nonMilstripTcn = (store, date = new Date()) => {
  const local = date instanceof Date ? date : new Date(date);
  if (!Number.isFinite(local.getTime())) return null;
  const year = local.getFullYear();
  const day = Math.floor((Date.UTC(year, local.getMonth(), local.getDate()) - Date.UTC(year, 0, 1)) / 86400000) + 1;
  const prefix = `FA5030${year % 10}${String(day).padStart(3, '0')}X`;
  const used = new Set(Object.values(store.shipments).flatMap(record => [record.draft?.tcn, record.saved?.tcn]).filter(Boolean));
  for (let serial = 1; serial <= 999; serial++) {
    const tcn = `${prefix}${String(serial).padStart(3, '0')}XXX`;
    if (!used.has(tcn)) return tcn;
  }
  return null;
};
