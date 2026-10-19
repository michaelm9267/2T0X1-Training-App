import { useState } from 'react';
import FloatingWindow from '../Session/FloatingWindow';
import ReferenceLookup from './ReferenceLookup';
import { screens } from './referenceInventory';
import { closeoutForPickup, printExpressDocuments } from './operations';
import { createRecord, isInternational, saveRecord } from './model';
import { CARRIER_ACCOUNTS, trackingNumber } from './trackingNumbers';
import { closedLabel } from './SpePrints';

// CMOS Print Small Package Express Documents (Print Express Docs), laid out like the CMOS window.
// Print Documents prints the checked documents of rated TCNs; Retrieve Documents prints again what
// was already printed. Summary Reports: Pickup Report closes out the SCAC's packages and makes the
// Carrier Pickup Report; with no Closed Date it is today's pickup, or choose a Closed Date to pull an
// earlier day's report. Shipper's Declaration, OP900 and OP950 are hazardous papers, unavailable here.
const DOCS = [['Carrier label', 'Shipping Label'], ['Commercial invoice', 'Commercial Invoice / B/L'], ['declaration', "Shipper's Declaration"], ['op900', 'OP900']];
const DEVICES = ['', 'ZEBRA ZT410 TMO DOCK', 'HP LASERJET TMO OFFICE'];
// The SCAC Lookup as CMOS lists it.
const SCAC_LOOKUP = [['FDE', 'Federal Express Corporation'], ['FDE-', 'FEDERAL EXPRESS'], ['PAZC', 'DHL EXPRESS'], ['UPSN', 'UNITED PARCEL SERVICE']];
const PU_ID = screens.spe.header.find(f => f.label === 'P/U Location')?.id || 'puLocation';
const contains = (value, query) => !query || String(value ?? '').toUpperCase().includes(String(query).toUpperCase());
const pad = (n, size = 2) => String(n).padStart(size, '0');
const Magnify = ({ label, onClick, disabled }) => <button type="button" className="spe-docs-magnify" aria-label={label} disabled={disabled} onClick={onClick}>
  <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true"><circle cx="9.5" cy="6.5" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.6" /><path d="M6.3 9.7 1.5 14.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg></button>;

// Earlier pickups for a SCAC (weekday evenings before today), so Closed Date can pull a previous
// day's report. Fictional training packages.
export function pastPickups(scac, now = new Date()) {
  if (!CARRIER_ACCOUNTS[scac]) return [];
  const list = [];
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  for (let i = 1; list.length < 18 && i < 60; i++) {
    const d = new Date(day); d.setDate(day.getDate() - i);
    if ([0, 6].includes(d.getDay()) || (d.getDate() * 7 + i) % 9 === 0) continue;
    const seed = d.getDate() * 31 + d.getMonth() * 7 + scac.length;
    d.setHours(19 + (seed % 5), (seed * 13) % 60, 0, 0);
    const julian = `${String(d.getFullYear()).slice(-1)}${pad(Math.round((d - new Date(d.getFullYear(), 0, 0)) / 86400000), 3)}`;
    const count = 1 + (seed % 3);
    const packages = Array.from({ length: count }, (_, j) => {
      const tcn = `FB5000${julian}${pad(40 + ((seed + j * 17) % 59), 4)}XAX`;
      const weight = 2 + ((seed * (j + 3)) % 40);
      return { tcn, tracking: trackingNumber(scac, tcn), service: '', pieces: 1, weight, cube: 1, cost: (12 + weight * 0.9).toFixed(2), advice: '', haz: '' };
    });
    list.push({ key: `past:${d.toISOString()}`, closedAt: d.toISOString(), packages });
  }
  return list;
}

export default function SpeDocuments({ store, locked, current, now, origin = 'FA5030', change, viewDocument, onClose }) {
  const start = store.express[current];
  const tcnOf = r => store.shipments[r.draft.shipmentId]?.draft.tcn || '';
  const today = now ? new Date(now) : new Date();
  const [search, setSearch] = useState({ scac: start?.draft.scac || '', tcn: start ? tcnOf(start) : '' });
  const [applied, setApplied] = useState(search);
  const [mode, setMode] = useState('print');
  const [device, setDevice] = useState('');
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState({});
  const [filters, setFilters] = useState({});
  const [summary, setSummary] = useState({ scac: '', closed: '', pu: '' });
  const [lookup, setLookup] = useState(null);
  const [message, setMessage] = useState('');
  const rated = Object.values(store.express).filter(r => r.result?.state === 'success');
  const printedDocs = id => Object.values(store.documents).filter(d => d.saved?.ownerKind === 'express' && d.saved.ownerId === id && d.saved.printed);
  const available = (r, doc) => mode === 'retrieve'
    ? printedDocs(r.id).some(d => d.saved.title === doc)
    : doc === 'Carrier label' || (doc === 'Commercial invoice' && isInternational(r.draft.domInt));
  const rows = rated.map(r => ({ r, scac: r.draft.scac || '', tcn: tcnOf(r) }))
    .filter(row => contains(row.scac, applied.scac) && contains(row.tcn, applied.tcn) && contains(row.scac, filters.scac) && contains(row.tcn, filters.tcn))
    .filter(row => mode === 'print' || printedDocs(row.r.id).length)
    .filter(row => DOCS.every(([doc]) => contains(available(row.r, doc) ? 'AVAILABLE' : 'UNAVAILABLE', filters[doc])));
  const key = (id, doc) => `${id}|${doc}`;
  const print = () => {
    const picks = rows.flatMap(({ r }) => DOCS.filter(([doc]) => picked[key(r.id, doc)] && available(r, doc)).map(([doc]) => ({ id: r.id, title: doc })));
    if (!picks.length) { setMessage('Check Print for at least one available document.'); return; }
    if (mode === 'retrieve') {
      picks.forEach(({ id, title }) => { const doc = printedDocs(id).filter(d => d.saved.title === title).pop(); if (doc) viewDocument(doc.id); });
      setMessage('');
      return;
    }
    if (locked) return;
    const result = printExpressDocuments(store, picks);
    if (result.outcome.status !== 'success') { setMessage(result.outcome.messages.join(' ')); return; }
    change(result.store);
    result.documentIds.forEach(viewDocument);
    setPicked({});
    setMessage('');
  };
  const scac = summary.scac.trim().toUpperCase();
  // Closed Date: this session's closeouts and the earlier pickups, newest first.
  const closeouts = [
    ...Object.values(store.documents).filter(d => d.saved?.title === 'Pickup report' && d.saved.closedAt && d.saved.scac === scac).map(d => ({ key: d.id, closedAt: d.saved.closedAt })),
    ...pastPickups(scac, today),
  ].sort((a, b) => b.closedAt.localeCompare(a.closedAt));
  const pickupLocations = [...new Set(Object.values(store.express).map(r => r.draft[PU_ID]).filter(Boolean))];
  const pickupReport = () => {
    setMessage('');
    if (summary.closed.startsWith('past:')) {
      const past = closeouts.find(c => c.key === summary.closed);
      if (!past || locked) return;
      const made = createRecord(store, 'documents', { title: 'Pickup report', variant: 'Final', scac, closedAt: past.closedAt, origin, account: CARRIER_ACCOUNTS[scac], packages: past.packages, ownerKind: 'express', ownerId: '' });
      const id = made.selection.documents;
      change(saveRecord(made, 'documents', id));
      setSummary({ ...summary, closed: id });
      viewDocument(id);
      return;
    }
    if (summary.closed) { viewDocument(summary.closed); return; }
    if (locked) return;
    const result = closeoutForPickup(store, scac, today.toISOString(), summary.pu, PU_ID);
    if (result.outcome.status !== 'success') {
      // Nothing waiting: show today's report when there is one.
      const done = closeouts.find(c => !c.key.startsWith('past:') && new Date(c.closedAt).toDateString() === today.toDateString());
      if (done) viewDocument(done.key); else setMessage(result.outcome.messages.join(' '));
      return;
    }
    change(result.store);
    viewDocument(result.documentId);
  };
  return <FloatingWindow title="Print Small Package Express Documents" onClose={onClose} className="spe-docs-window" titleClass="spe-docs-titlebar">
    <div className="spe-docs">
      <div className="spe-docs-body">
        <div className="spe-docs-main">
          <div className="spe-docs-query">
            <label htmlFor="spe-docs-query">Query</label><select id="spe-docs-query" aria-label="Query" value={query} onChange={e => setQuery(e.target.value)}><option value="" /><option>Rated today</option><option>Not closed</option></select>
            <label htmlFor="spe-docs-device">Selected Device</label><span><select id="spe-docs-device" aria-label="Selected Device" value={device} onChange={e => setDevice(e.target.value)}>{DEVICES.map(d => <option key={d} value={d}>{d}</option>)}</select>
              <button type="button" onClick={() => setMessage('')}>Update Device list</button></span>
          </div>
          <form className="spe-docs-search" onSubmit={e => { e.preventDefault(); setApplied(search); }}>
            <div>
              <label htmlFor="spe-docs-scac">SCAC</label><input id="spe-docs-scac" aria-label="SCAC" className="spe-docs-scac" value={search.scac} onChange={e => setSearch({ ...search, scac: e.target.value.toUpperCase() })} /><Magnify label="Look up SCAC" onClick={() => setLookup('scac')} />
              <label htmlFor="spe-docs-tcn">TCN</label><input id="spe-docs-tcn" aria-label="TCN" className="spe-docs-tcn" value={search.tcn} onChange={e => setSearch({ ...search, tcn: e.target.value.toUpperCase() })} /><Magnify label="Look up TCN" onClick={() => setLookup('tcn')} />
            </div>
            <div><button type="submit">Search</button><button type="button" onClick={() => { setSearch({ scac: '', tcn: '' }); setApplied({ scac: '', tcn: '' }); }}>Clear</button></div>
          </form>
          <div className="spe-docs-mode" role="radiogroup" aria-label="Print or retrieve">
            <label><input type="radio" name="spe-docs-mode" checked={mode === 'print'} onChange={() => { setMode('print'); setPicked({}); }} />Print Documents</label>
            <label><input type="radio" name="spe-docs-mode" checked={mode === 'retrieve'} onChange={() => { setMode('retrieve'); setPicked({}); }} />Retrieve Documents</label>
          </div>
          <div className="spe-docs-grid">
            <div className="spe-docs-toolbar"><button type="button" onClick={() => { setPicked({}); setFilters({}); }}>Clear</button><button type="button" disabled={locked && mode === 'print'} onClick={print}>Print</button></div>
            <div className="spe-docs-scroll"><table>
              <colgroup><col className="spe-docs-c-scac" /><col className="spe-docs-c-tcn" />{DOCS.map(([doc]) => [<col key={doc} className="spe-docs-c-doc" />, <col key={`${doc}-p`} className="spe-docs-c-print" />])}</colgroup>
              <thead>
                <tr className="spe-docs-filters">
                  <td><input aria-label="Filter SCAC" value={filters.scac || ''} onChange={e => setFilters({ ...filters, scac: e.target.value })} /></td>
                  <td><input aria-label="Filter TCN" value={filters.tcn || ''} onChange={e => setFilters({ ...filters, tcn: e.target.value })} /></td>
                  {DOCS.map(([doc, title]) => [<td key={doc}><input aria-label={`Filter ${title}`} value={filters[doc] || ''} onChange={e => setFilters({ ...filters, [doc]: e.target.value })} /></td>,
                    <td key={`${doc}-all`}><button type="button" className="spe-docs-all" aria-label={`Select All ${title}`} onClick={() => setPicked(state => ({ ...state, ...Object.fromEntries(rows.filter(({ r }) => available(r, doc)).map(({ r }) => [key(r.id, doc), true])) }))}>Select All</button></td>])}
                </tr>
                <tr className="spe-docs-head"><th>SCAC</th><th>TCN</th>{DOCS.map(([doc, title]) => [<th key={doc}>{title}</th>, <th key={`${doc}-p`}>Print</th>])}</tr>
              </thead>
              <tbody>{rows.map(({ r, scac: rowScac, tcn }) => <tr key={r.id}><td>{rowScac}</td><td>{tcn}</td>
                {DOCS.map(([doc, title]) => { const ok = available(r, doc); return [<td key={doc}>{ok ? 'AVAILABLE' : 'UNAVAILABLE'}</td>,
                  <td key={`${doc}-p`} className="spe-docs-check"><input type="checkbox" aria-label={`Print ${title} for ${tcn}`} disabled={!ok} checked={Boolean(picked[key(r.id, doc)])} onChange={e => setPicked({ ...picked, [key(r.id, doc)]: e.target.checked })} /></td>]; })}
              </tr>)}</tbody>
            </table></div>
            <div className="spe-docs-count"><span /><span>{rows.length} row(s) found.</span></div>
          </div>
          {message && <p className="spe-docs-note" role="status">{message}</p>}
        </div>
        <aside className="spe-docs-side" aria-label="Summary reports">
          <h3>Summary Reports</h3>
          <div className="spe-docs-side-grid">
            <label htmlFor="spe-docs-sum-scac">SCAC</label><span><input id="spe-docs-sum-scac" aria-label="Summary SCAC" value={summary.scac} onChange={e => setSummary({ ...summary, scac: e.target.value.toUpperCase(), closed: '' })} /><Magnify label="Look up Summary SCAC" onClick={() => setLookup('summary')} /></span>
            <label htmlFor="spe-docs-closed" className="spe-docs-optional">Closed Date</label><span><select id="spe-docs-closed" aria-label="Closed Date" disabled={!scac} value={summary.closed} onChange={e => setSummary({ ...summary, closed: e.target.value })}><option value="" />{closeouts.map(c => <option key={c.key} value={c.key}>{closedLabel(c.closedAt)}</option>)}</select></span>
            <label htmlFor="spe-docs-pu" className="spe-docs-optional">P/U Loc</label><span><select id="spe-docs-pu" aria-label="P/U Loc" disabled={!scac} value={summary.pu} onChange={e => setSummary({ ...summary, pu: e.target.value })}><option value="" />{pickupLocations.map(p => <option key={p}>{p}</option>)}</select></span>
            <span /><span><button type="button" disabled={!scac} onClick={pickupReport}>Pickup Report</button></span>
          </div>
          <h3>OP950</h3>
          <div className="spe-docs-side-grid">
            <label htmlFor="spe-docs-op950">Closed Date</label><span><input id="spe-docs-op950" aria-label="OP950 Closed Date" disabled value="" readOnly /><Magnify label="Look up OP950 Closed Date" /></span>
            <span /><span><button type="button" disabled>OP950</button></span>
          </div>
        </aside>
      </div>
      <footer className="spe-docs-footer"><button type="button" onClick={onClose}>Close</button></footer>
      {lookup && <ReferenceLookup title={lookup === 'tcn' ? 'TCN Lookup' : 'SCAC Lookup'} columns={lookup === 'tcn' ? ['TCN', 'SCAC'] : ['SCAC', 'Motor Carrier Name']}
        rows={lookup === 'tcn' ? rated.map(r => [tcnOf(r), r.draft.scac || '']) : SCAC_LOOKUP}
        onSelect={value => lookup === 'summary' ? setSummary({ ...summary, scac: value, closed: '' }) : setSearch({ ...search, [lookup]: value })} onClose={() => setLookup(null)} />}
    </div>
  </FloatingWindow>;
}
