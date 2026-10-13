import { useState } from 'react';
import { ITEMS, originOf } from './outboundData';
import { SPE_FIELDS, PICKUP_LOCATIONS, pieceCube, activeTcn } from './cmosLogic';
import DateField from './DateField';
import CmosPrintExpressDocs from './CmosPrintExpressDocs';

// CMOS Small Package Express: shipments sent here with Expr Ship from Shipment Planning. The
// trainee picks the carrier (SCAC), service and package and sends the request, which the carrier
// rates; Cancel clears the rating. Print Express Docs opens the Print Small Package Express Documents
// window at any time. Every choice is the trainee's.

export default function CmosSmallPackage({ shipment, exercise, actions, onShipPlan, packages }) {
  const [saved, setSaved] = useState('');
  const [docsOpen, setDocsOpen] = useState(false);
  const spe = exercise.spe;
  const record = exercise.cmos.record;
  if (!spe) return <div className="cmos-spe">
    <SearchPane rows={[]} />
    <p className="cmos-message">No shipments are waiting for Small Package Express. Save the shipment in Shipment Planning with Mil Mode J or 5, then select Expr Ship.</p>
  </div>;
  const fields = SPE_FIELDS;
  const printed = spe.rated;
  const result = spe.result || {};
  const value = id => spe.draft[id] ?? '';
  const invalid = id => spe.errors?.includes(id) ? 'cmos-invalid' : undefined;
  const select = (id, options, label = fields[id]?.title) => <select id={`spe-${id}`} aria-label={label} className={invalid(id)} disabled={printed} value={value(id)} onChange={event => actions.editExpress(id, event.target.value)}><option value=""></option>{options.map(option => <option key={option} value={option}>{option}</option>)}</select>;
  const input = (id, props = {}) => <input id={`spe-${id}`} className={invalid(id)} readOnly={printed} value={value(id)} onChange={event => actions.editExpress(id, event.target.value)} {...props} />;
  const label = (id, text, required) => <label htmlFor={`spe-${id}`} className={required ? 'cmos-required' : ''}>{text}</label>;
  const ro = (text, content, wide) => <span className={`cmos-f ${wide ? 'cmos-f-wide' : ''}`}><span className="cmos-label">{text}</span><span className="cmos-readonly">{content}</span></span>;
  const pieces = record?.pieces || [];
  const totals = { weight: pieces.reduce((sum, p) => sum + (Number(p.weight) || 0), 0), cube: pieces.reduce((sum, p) => sum + (Number(pieceCube(p)) || 0), 0) };
  const feedback = spe.feedback;
  const tcn = activeTcn(shipment, exercise);

  const row = { tcn, bl: 'N', scac: printed ? value('scac') : '', rel: printed ? 'Y' : 'N', svc: printed ? value('service') : '', tracking: result.tracking || '', di: printed ? value('domInt').slice(0, 1) : '', closed: result.closed || '', err: '' };
  return <div className="cmos-spe">
    <SearchPane rows={[row]} />
    <section className="cmos-spe-detail" aria-label="Shipment details">
      <p className="cmos-spe-tcn"><strong>TCN:</strong> {tcn}</p>
      <div className="cmos-tabs"><button type="button" className="cmos-tab-active" aria-selected="true" role="tab">Shipment Details</button></div>
      <div className="cmos-panel">
        <div className="cmos-spe-grid">
          {ro('Movement Doc Number', '')}{ro('Hazardous', 'N')}
          <span className="cmos-f">{label('pu', 'P/U Location')}{select('pu', PICKUP_LOCATIONS, 'P/U Location')}</span>
          {ro('Consignee', record?.draft.consignee || '')}{ro('Mil Mode', exercise.milMode)}{ro('EDI Mode', 'AF')}{ro('U/C', exercise.cmos.record?.draft.ucName ? 'Y' : '')}
          {ro('Nomenclature', ITEMS[shipment.itemId].nomenclature, true)}
          {ro('Pieces', pieces.length)}{ro('Weight', totals.weight)}{ro('Cube', totals.cube)}
        </div>
        <hr />
        <div className="cmos-spe-grid">
          <span className="cmos-f">{label('scac', 'SCAC', true)}{select('scac', fields.scac.options)}</span>
          <span className="cmos-f">{label('domInt', 'DOM/INT', true)}{select('domInt', fields.domInt.options)}</span>
          <span className="cmos-f">{label('service', 'Service', true)}{select('service', fields.service.options)}</span>
          <span className="cmos-f">{label('shipmentDate', 'Shipment Date', true)}<DateField id="spe-shipmentDate" label="Shipment Date" className={invalid('shipmentDate')} readOnly={printed} value={value('shipmentDate')} onChange={v => actions.editExpress('shipmentDate', v)} /></span>
          <span className="cmos-f">{label('billTo', 'Bill To')}{select('billTo', ['Shipper', 'Recipient', 'Third Party'], 'Bill To')}</span>
          <span className="cmos-f">{label('destCity', 'Dest City', true)}{input('destCity')}</span>
          <span className="cmos-f cmos-f-wide">{label('reference', 'Reference')}{input('reference')}</span>
          <span className="cmos-f">{label('broker', 'Broker Indicator')}<input id="spe-broker" type="checkbox" disabled={printed} checked={Boolean(spe.draft.broker)} onChange={event => actions.editExpress('broker', event.target.checked)} /></span>
          <span className="cmos-f">{label('package', 'Package', true)}{select('package', fields.package.options)}</span>
          <span className="cmos-f">{label('handling', 'Additional Handling')}<input id="spe-handling" type="checkbox" disabled={printed} checked={Boolean(spe.draft.handling)} onChange={event => actions.editExpress('handling', event.target.checked)} /></span>
          <span className="cmos-f">{label('saturday', 'Saturday')}{select('saturday', ['Y', 'N'], 'Saturday')}</span>
          <span className="cmos-f">{label('insured', 'Insured Value')}{input('insured', { placeholder: '0', style: { width: '6em' } })}</span>
          <span className="cmos-f cmos-f-wide">{label('instructions', 'Special Instructions')}{input('instructions')}</span>
          <span className="cmos-f cmos-f-wide">{label('email', 'Recipient Email')}{input('email')}</span>
          <span className="cmos-f cmos-f-wide">{label('memo', 'Email Memo')}{input('memo')}</span>
          <span className="cmos-f">{label('booking', 'Booking Number')}{input('booking')}</span>
          <span className="cmos-f">{label('label', 'Shipping Label')}{select('label', ['Thermal', 'Laser'], 'Shipping Label')}</span>
        </div>
        <hr />
        <div className="cmos-spe-grid">
          {ro('Estimated Charges', printed ? `$${result.charges}` : '$.00')}{ro('Rated Weight', result.rated || '')}
          {ro('Tracking Number', result.tracking || '')}{ro('Closed/Released Date', result.closed || '')}
          {ro('Max Transit Days', result.transitDays || '')}{ro('GFM ID', '')}{ro('Error', '')}
        </div>
      </div>
      {(feedback || saved) && <p className="cmos-message" role="status">{feedback || saved}</p>}
      <div className="cmos-bottom-bar">
        <button type="button" disabled>Web Tracking</button><button type="button" disabled>Closeout</button>
        <button type="button" className="cmos-primary" disabled={printed} onClick={() => { setSaved(''); actions.sendRequest(); }}>Send Request</button>
        <button type="button" onClick={() => { setSaved(''); setDocsOpen(true); }}>Print Express Docs</button>
        <button type="button" disabled={!printed} onClick={() => { setSaved(''); actions.cancelRequest(); }}>Cancel</button><button type="button" disabled>Notices</button>
        <button type="button" onClick={onShipPlan}>Ship Plan</button>
        <button type="button" disabled>Edit</button>
        <button type="button" disabled={printed} onClick={() => setSaved('Shipment details saved. Print Express Docs to ship.')}>Save</button>
      </div>
    </section>
    {docsOpen && <CmosPrintExpressDocs origin={originOf(shipment)} packages={packages} current={shipment.key} actions={actions} onClose={() => setDocsOpen(false)} />}
  </div>;
}

function SearchPane({ rows }) {
  const [dates, setDates] = useState({ start: '', end: '' });
  return <section className="cmos-spe-search" aria-label="Small Package Express search">
    <div className="cmos-spe-dates">
      <label htmlFor="spe-start">Start Date:</label><DateField id="spe-start" label="Start Date" value={dates.start} onChange={start => setDates(current => ({ ...current, start }))} />
      <label htmlFor="spe-end">End Date:</label><DateField id="spe-end" label="End Date" value={dates.end} onChange={end => setDates(current => ({ ...current, end }))} />
      <button type="button">Search</button>
    </div>
    <div className="cmos-grid-box">
      <div className="cmos-toolbar"><button type="button">Clear</button></div>
      <div className="cmos-table-wrap cmos-list-table"><table>
        <thead><tr>{['TCN', 'B/L', 'SCAC', 'REL', 'SVC', 'Tracking Number', 'D/I', 'Closed/Released Date', 'ERR'].map(title => <th key={title} scope="col">{title}</th>)}</tr></thead>
        <tbody>{rows.length ? rows.map(row => <tr key={row.tcn} className="cmos-row-selected">{['tcn', 'bl', 'scac', 'rel', 'svc', 'tracking', 'di', 'closed', 'err'].map(id => <td key={id}>{id === 'tcn' ? <span className="cmos-row-button">⧉ {row.tcn}</span> : row[id]}</td>)}</tr>) : <tr><td colSpan="9">No data to display.</td></tr>}</tbody>
      </table></div>
      <div className="cmos-footer">{rows.length} row(s) found.</div>
    </div>
  </section>;
}
