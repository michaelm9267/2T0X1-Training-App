import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import useModalDialog from '../Training/useModalDialog';
import { SCACS, PICKUP_LOCATIONS } from './cmosLogic';
import { CarrierLabel, CommercialInvoice, PickupReport, PrintPreview } from './OutboundPrintouts';
import DateField from './DateField';

// CMOS Print Small Package Express Documents: opens from Print Express Docs. Lists closed packages
// by SCAC and TCN with the documents each can print, and runs the carrier pickup report. Shipper's
// Declaration, OP900 and OP950 are hazardous materials papers, so they stay unavailable here.

const DOCS = [['carrierLabel', 'Shipping Label', true], ['invoice', 'Commercial Invoice / B/L', true], ['declaration', "Shipper's Declaration", false], ['op900', 'OP900', false]];
const DEVICES = ['ZEBRA ZT410 · TMO DOCK', 'HP LASERJET · TMO OFFICE'];

export default function CmosPrintExpressDocs({ origin, packages, current, actions, onClose }) {
  const dialog = useRef(null);
  useModalDialog(dialog, onClose);
  const start = packages.find(p => p.key === current);
  const [search, setSearch] = useState({ scac: start?.scac || '', tcn: start?.tcn || '' });
  const [applied, setApplied] = useState(search);
  const [device, setDevice] = useState(DEVICES[0]);
  const [mode, setMode] = useState('print');
  const [picked, setPicked] = useState({ carrierLabel: [], invoice: [] });
  const [summary, setSummary] = useState({ scac: start?.scac || '', closed: '', pu: '' });
  const [preview, setPreview] = useState(null);
  const [message, setMessage] = useState('');
  const match = (value, filter) => !filter.trim() || value.toUpperCase().includes(filter.trim().toUpperCase());
  const rows = packages.filter(p => match(p.scac, applied.scac) && match(p.tcn, applied.tcn));
  const toggle = (doc, key, on) => setPicked(state => ({ ...state, [doc]: on ? [...state[doc], key] : state[doc].filter(item => item !== key) }));
  function print() {
    const jobs = rows.flatMap(p => ['carrierLabel', 'invoice'].filter(doc => picked[doc].includes(p.key)).map(doc => ({ doc, p })));
    if (!jobs.length) { setMessage('Check Print for at least one document.'); return; }
    jobs.forEach(({ doc, p }) => actions.printDocument(doc, p.key));
    setMessage(`${jobs.length} document(s) sent to ${device}.`);
    setPreview({ title: 'Small Package Express Documents', wide: jobs.some(job => job.doc === 'invoice'), body: jobs.map(({ doc, p }) => doc === 'carrierLabel'
      ? <CarrierLabel key={`${doc}-${p.key}`} shipment={p.shipment} exercise={p.exercise} />
      : <CommercialInvoice key={`${doc}-${p.key}`} shipment={p.shipment} exercise={p.exercise} />) });
  }
  function pickupReport() {
    if (!summary.scac) { setMessage('Choose a SCAC for the pickup report.'); return; }
    const list = packages.filter(p => p.scac === summary.scac && (!summary.closed.trim() || p.closed === summary.closed.trim().toUpperCase()) && (!summary.pu || p.pu === summary.pu));
    setMessage('');
    setPreview({ title: `Pickup Report ${summary.scac}`, wide: true, body: <PickupReport origin={origin} scac={summary.scac} closed={summary.closed} pu={summary.pu} packages={list} /> });
  }
  return createPortal(<div className="cmos-overlay" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="cmos-app cmos-print-docs" role="dialog" aria-modal="true" aria-label="Print Small Package Express Documents" tabIndex={-1} ref={dialog}>
      <h2 className="cmos-page-title">Print Small Package Express Documents</h2>
      <div className="cmos-print-body">
        <div className="cmos-print-main">
          <div className="cmos-print-query">
            <label htmlFor="ped-query">Query</label><select id="ped-query" defaultValue=""><option value=""></option><option>Not printed</option><option>Closed today</option></select>
            <label htmlFor="ped-device">Selected Device</label><span><select id="ped-device" value={device} onChange={event => setDevice(event.target.value)}>{DEVICES.map(item => <option key={item}>{item}</option>)}</select> <button type="button" onClick={() => setMessage('Device list updated.')}>Update Device list</button></span>
          </div>
          <div className="cmos-print-search">
            <label htmlFor="ped-scac">SCAC</label><input id="ped-scac" list="ped-scacs" style={{ width: '5em' }} value={search.scac} onChange={event => setSearch({ ...search, scac: event.target.value })} />
            <label htmlFor="ped-tcn">TCN</label><input id="ped-tcn" style={{ width: '14em' }} value={search.tcn} onChange={event => setSearch({ ...search, tcn: event.target.value })} />
            <datalist id="ped-scacs">{SCACS.map(code => <option key={code} value={code} />)}</datalist>
            <span><button type="button" onClick={() => setApplied(search)}>Search</button> <button type="button" onClick={() => { setSearch({ scac: '', tcn: '' }); setApplied({ scac: '', tcn: '' }); }}>Clear</button></span>
          </div>
          <div className="cmos-print-mode" role="radiogroup" aria-label="Print or retrieve">
            <label><input type="radio" name="ped-mode" checked={mode === 'print'} onChange={() => setMode('print')} /> Print Documents</label>
            <label><input type="radio" name="ped-mode" checked={mode === 'retrieve'} onChange={() => setMode('retrieve')} /> Retrieve Documents</label>
          </div>
          <div className="cmos-grid-box">
            <div className="cmos-toolbar"><button type="button" onClick={() => setPicked({ carrierLabel: [], invoice: [] })}>Clear</button><button type="button" onClick={print}>Print</button></div>
            <div className="cmos-table-wrap"><table className="cmos-print-table">
              <thead>
                <tr><td /><td />{DOCS.map(([doc, , available]) => <td key={doc} colSpan="2"><button type="button" disabled={!available || !rows.length} onClick={() => setPicked(state => ({ ...state, [doc]: rows.map(p => p.key) }))}>Select All</button></td>)}</tr>
                <tr><th scope="col">SCAC</th><th scope="col">TCN</th>{DOCS.map(([doc, title]) => [<th key={doc} scope="col">{title}</th>, <th key={`${doc}-print`} scope="col">Print</th>])}</tr>
              </thead>
              <tbody>{rows.length ? rows.map(p => <tr key={p.key}>
                <td>{p.scac}</td><td>{p.tcn}</td>
                {DOCS.map(([doc, title, available]) => [<td key={doc}>{available ? 'AVAILABLE' : 'UNAVAILABLE'}</td>,
                  <td key={`${doc}-print`} className="cmos-print-check"><input type="checkbox" aria-label={`Print ${title} for ${p.tcn}`} disabled={!available} checked={Boolean(picked[doc]?.includes(p.key))} onChange={event => toggle(doc, p.key, event.target.checked)} /></td>])}
              </tr>) : <tr><td colSpan={2 + DOCS.length * 2}>No data to display.</td></tr>}</tbody>
            </table></div>
            <div className="cmos-footer">{rows.length} row(s) found.</div>
          </div>
          {!packages.some(p => p.key === current) && <p className="cmos-message">This shipment has not been rated. Use Send Request in Small Package Express before its documents can print.</p>}
          {message && <p className="cmos-message" role="status">{message}</p>}
        </div>
        <aside className="cmos-print-side" aria-label="Summary reports">
          <h3>Summary Reports</h3>
          <label htmlFor="ped-sum-scac">SCAC</label><select id="ped-sum-scac" value={summary.scac} onChange={event => setSummary({ ...summary, scac: event.target.value })}><option value=""></option>{SCACS.map(code => <option key={code}>{code}</option>)}</select>
          <label htmlFor="ped-sum-date">Closed Date</label><DateField id="ped-sum-date" label="Closed Date" value={summary.closed} onChange={closed => setSummary({ ...summary, closed })} />
          <label htmlFor="ped-sum-pu">P/U Loc</label><select id="ped-sum-pu" value={summary.pu} onChange={event => setSummary({ ...summary, pu: event.target.value })}><option value=""></option>{PICKUP_LOCATIONS.map(item => <option key={item}>{item}</option>)}</select>
          <button type="button" className="cmos-print-report" onClick={pickupReport}>Pickup Report</button>
          <h3>OP950</h3>
          <label htmlFor="ped-op950">OP950 Closed Date</label><DateField id="ped-op950" label="OP950 Closed Date" value="" onChange={() => {}} disabled />
          <button type="button" className="cmos-print-report" disabled>OP950</button>
        </aside>
      </div>
      <div className="cmos-bottom-bar"><span className="cmos-bar-gap" /><button type="button" onClick={onClose}>Close</button></div>
      {preview && <PrintPreview title={preview.title} wide={preview.wide} onClose={() => setPreview(null)}>{preview.body}</PrintPreview>}
    </section>
  </div>, document.body);
}
