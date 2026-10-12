import { useEffect, useRef, useState } from 'react';
import { useTestMode } from '../Session/mode';
import { manifestFields, isHazardousIndicator, paperwork, manifestTab } from '../CargoWindow/workflow';
import { DocumentBody } from './PaperworkDocument';
import RemoveFromManifest from './RemoveFromManifest';
import { entryTitle } from '../CargoWindow/frustration';
import { UN_NUMBERS, fieldsForUnNumber, findUnNumber, unOptionLabel } from './unNumbers';

// DG2 hazard details recorded per piece, following the Shipper's Declaration (DD Form 1387-2) entries.
const DG2_FIELDS = [
  { id: 'dg2Template', title: 'UN/ID Number', options: UN_NUMBERS.map(item => item.un), optionLabel: unOptionLabel },
  { id: 'dg2Name', title: 'Proper Shipping Name', wide: true },
  { id: 'dg2Technical', title: 'Technical Name', wide: true },
  { id: 'dg2Division', title: 'Hazard Class/Division' },
  { id: 'dg2Class', title: 'Hazard Class Name' },
  { id: 'dg2Subsidiary', title: 'Subsidiary Risk' },
  { id: 'dg2Label', title: 'Hazard Label' },
  { id: 'dg2PackingGroup', title: 'Packing Group', options: ['I', 'II', 'III', 'N/A'] },
  { id: 'dg2Compatibility', title: 'Compatibility Group' },
  { id: 'dg2Packages', title: 'Number of Packages' },
  { id: 'dg2PackageType', title: 'Type of Packaging' },
  { id: 'dg2NetQuantity', title: 'Net Quantity per Package' },
  { id: 'dg2Unit', title: 'Unit of Measure', options: ['L', 'mL', 'kg', 'g', 'lb', 'gal'] },
  { id: 'dg2NEW', title: 'Net Explosive Weight (lb)' },
  { id: 'dg2Aircraft', title: 'Aircraft Limitation', options: ['Passenger and cargo aircraft', 'Cargo aircraft only'] },
  { id: 'dg2Authorization', title: 'Special Provisions/Authorization', wide: true },
  { id: 'dg2Emergency', title: 'Emergency Response Phone' },
];

// CMOS Shipment Planning–style manifest entry. Read-only values are fictional training defaults.
export default function ManifestScreen({ scenario, exercise, onChange, onSubmit, onRemove }) {
  const [open, setOpen] = useState(false);
  const dialog = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    dialog.current?.focus();
    const closeOnEscape = event => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', closeOnEscape);
    document.body.classList.add('cmos-modal-open');
    return () => { document.removeEventListener('keydown', closeOnEscape); document.body.classList.remove('cmos-modal-open'); };
  }, [open]);
  const [tab, setTab] = useState('pieces');
  const [paperId, setPaperId] = useState(null);
  const documents = paperwork(scenario).map(d => ({ ...d, available: (exercise.documentCopies[d.id] ?? d.copies) > 0 })).filter(d => d.required || d.available);
  const paper = documents.find(d => d.id === paperId && d.available);
  // Test mode does not point out which entries were wrong.
  const test = useTestMode();
  const errors = test ? [] : exercise.manifestErrors || [];
  const feedback = test && /not match/.test(exercise.manifestFeedback || '') ? 'Not accepted. Some entries do not match. Recheck every field.' : exercise.manifestFeedback;
  // A manifested piece is locked until it is removed from the manifest.
  const locked = exercise.manifestAccepted;
  const [dg2Open, setDg2Open] = useState(false);
  const openDg2 = () => { setTab('dg2'); setDg2Open(true); };
  const fields = Object.fromEntries(manifestFields(scenario).map(f => [f.id, f]));
  const draft = exercise.manifestDraft;
  const value = id => draft[id] ?? '';
  const number = id => Number(draft[id]) || 0;
  const hazardous = isHazardousIndicator(draft.hazmat);
  const activeTab = !hazardous && (tab === 'dg2' || tab === 't9') ? 'indicators' : tab;
  const cube = number('length') && number('width') && number('height') ? (number('length') * number('width') * number('height') / 1728).toFixed(1) : '';
  // Selecting a UN/ID number fills its shipping name, class, labels, and packing group.
  const change = (id, next) => {
    onChange(id, next);
    if (id === 'dg2Template') Object.entries(fieldsForUnNumber(next)).forEach(([field, filled]) => onChange(field, filled));
  };
  const unNames = findUnNumber(draft.dg2Template)?.names ?? [];
  const dg2Fields = DG2_FIELDS.map(d => d.id === 'dg2Name' && unNames.length > 1 ? { ...d, options: unNames } : d);
  const input = (id, props = {}) => {
    const f = fields[id] || dg2Fields.find(d => d.id === id);
    return f?.options
      ? <select id={`cmos-${id}`} disabled={locked} aria-invalid={errors.includes(id) || undefined} className={errors.includes(id) ? 'cmos-invalid' : undefined} value={value(id)} onChange={event => change(id, event.target.value)} {...props}><option value=""></option>{f.options.map(o => <option key={o} value={o}>{f.optionLabel ? f.optionLabel(o) : o}</option>)}</select>
      : <input id={`cmos-${id}`} readOnly={locked} aria-invalid={errors.includes(id) || undefined} className={errors.includes(id) ? 'cmos-invalid' : undefined} value={value(id)} onChange={event => onChange(id, event.target.value)} {...props} />;
  };
  const label = (id, required) => <label htmlFor={`cmos-${id}`} className={required ? 'cmos-required' : ''}>{fields[id].title}</label>;
  const field = (id, required = false, className = '') => <div className={`cmos-field ${className}`}>{label(id, required)}{input(id, { 'aria-required': required })}</div>;
  // DoDAAC with its aerial port beside it, like CMOS Consignor/POE and Consignee/POD.
  const pair = (id, port) => <div className="cmos-field cmos-pair">{label(id, true)}{input(id, { 'aria-required': true })}{label(port, true)}{input(port, { 'aria-required': true })}</div>;
  const fixed = (text, content, className = '') => <div className={`cmos-field ${className}`}><span className="cmos-label">{text}</span><span className="cmos-readonly">{content}</span></div>;
  const check = (text, checked) => <label className="cmos-check"><span>{text}</span><input type="checkbox" checked={checked} readOnly disabled /></label>;
  const tabs = [['pieces', 'Pieces'], ['consignee', 'Ultimate Consignee'], ['indicators', 'Indicators'], ...(hazardous ? [['dg2', 'DG2'], ['t9', 'T-9 Misc']] : []), ['status', 'Shipment Status'], ['frustration', 'Cargo Frustration']];
  const available = ['pieces', 'indicators', 'dg2', 't9', 'frustration'];
  const launcher = <div className="cmos-launcher">
    <button type="button" className="primary-button" onClick={() => setOpen(true)}>Open Shipment Planning</button>
    {!open && <p aria-live="polite">{feedback}</p>}
  </div>;
  if (!open) return launcher;
  return <>{launcher}<div className="cmos-overlay" onMouseDown={event => { if (event.target === event.currentTarget) setOpen(false); }}>
    <div className={`cmos-workspace ${paper ? 'has-paper' : ''}`}>
    <form className="cmos-screen" role="dialog" aria-modal="true" aria-labelledby="cmos-title" tabIndex={-1} ref={dialog} onSubmit={event => { event.preventDefault(); onSubmit(); }}>
    <div className="cmos-titlebar"><h3 id="cmos-title">Shipment Planning</h3><button type="button" aria-label="Close Shipment Planning" onClick={() => setOpen(false)}>×</button></div>
    {locked && <p className="cmos-locked" role="note">Piece 1 is on the manifest. Entries are locked; remove the piece from the manifest to change them.</p>}
    <div className="cmos-paperbar" role="group" aria-label="Shipment Planning paperwork">
      <span>Paperwork:</span>
      {documents.map(d => <button type="button" key={d.id} aria-pressed={paper?.id === d.id} disabled={!d.available} title={d.available ? undefined : 'Not in the paperwork packet'} onClick={() => setPaperId(paper?.id === d.id ? null : d.id)}>{d.title}{d.available ? '' : ' (missing)'}</button>)}
    </div>
    <div className="cmos-grid">
      {fixed('Doc Type', 'I - Increment')}
      {field('tcn', true, 'cmos-wide')}
      {fixed('Status', 'PI · PLANNING AND PACKAGING')}
    </div>
    <hr />
    <div className="cmos-grid">
      {fixed('Prime DIC', 'TX1')}
      {field('pieces', true)}
      {field('description', false, 'cmos-wide')}
      {pair('origin', 'apoe')}
      {pair('destination', 'apod')}
      {fixed('CIIC', 'U')}
      {fixed('TP', '3')}
    </div>
    <div className="cmos-tabs" role="tablist" aria-label="Shipment planning tabs">
      {tabs.map(([id, title]) => <button type="button" role="tab" key={id} aria-selected={activeTab === id} className={`${activeTab === id ? 'cmos-tab-active' : ''} ${errors.some(error => manifestTab(error) === title) ? 'cmos-tab-error' : ''}`} disabled={!available.includes(id)} onClick={() => setTab(id)}>{title}</button>)}
    </div>
    <div className="cmos-panel" role="tabpanel">
      {activeTab === 'pieces' && <>
        <div className="cmos-totals">{fixed('Total PCS', value('pieces'))}{fixed('Total WT', value('weight'))}{fixed('Total CU', cube)}</div>
        <div className="cmos-table-wrap"><table>
          <thead><tr><th>Number</th><th>Weight (lb)</th><th>Cube (ft³)</th><th>Length (in)</th><th>Width (in)</th><th>Height (in)</th></tr></thead>
          <tbody><tr className={hazardous ? 'cmos-haz-row' : ''}>
            <td>{hazardous ? <button type="button" className="cmos-row-button" onClick={openDg2}>1 · HAZ</button> : '1'}</td>
            <td>{input('weight', { 'aria-label': fields.weight.title })}</td>
            <td>{cube}</td>
            {['length', 'width', 'height'].map(id => <td key={id}>{input(id, { 'aria-label': fields[id].title })}</td>)}
          </tr></tbody>
        </table></div>
        <div className="cmos-footer">{hazardous ? 'Select the hazardous piece to enter its DG2 information. · ' : ''}1 row(s) found.</div>
      </>}
      {activeTab === 'indicators' && <div className="cmos-indicators">
        {field('hazmat', true)}
        {check('Misc T-9 Required', hazardous)}
        {check('Danger Goods/1387-2 Required', hazardous)}
      </div>}
      {activeTab === 'dg2' && <>
        <div className="cmos-toolbar">
          <button type="button" onClick={() => setDg2Open(true)}>{locked ? 'View' : value('dg2Template') ? 'Edit' : 'New'}</button>
          <button type="button" disabled={locked} onClick={() => DG2_FIELDS.forEach(d => value(d.id) && onChange(d.id, ''))}>Clear</button>
        </div>
        <div className="cmos-table-wrap"><table>
          <thead><tr><th>Piece</th><th>DG2 Template ID</th><th>Hazard Label</th><th>Hazard Class Name</th><th>Proper Shipping Name</th></tr></thead>
          <tbody>{value('dg2Template') || value('dg2Name')
            ? <tr className="cmos-haz-row"><td><button type="button" className="cmos-row-button" onClick={() => setDg2Open(true)} aria-label="Open DG2 for piece 1">1</button></td><td>{value('dg2Template')}</td><td>{value('dg2Label')}</td><td>{value('dg2Class')}</td><td>{value('dg2Name')}</td></tr>
            : <tr><td colSpan="5">No data to display.</td></tr>}</tbody>
        </table></div>
        <div className="cmos-footer">{value('dg2Template') || value('dg2Name') ? 1 : 0} row(s) found.</div>
        {dg2Open && <fieldset className="cmos-dg2-form">
          <legend>DG2 hazardous information · Piece 1</legend>
          <div className="cmos-grid">{dg2Fields.map(d => <div key={d.id} className={`cmos-field ${d.wide ? 'cmos-wide' : ''}`}><label htmlFor={`cmos-${d.id}`}>{d.title}</label>{input(d.id)}</div>)}</div>
          <div className="cmos-toolbar"><button type="button" onClick={() => setDg2Open(false)}>{locked ? 'Close DG2' : 'Save DG2'}</button></div>
        </fieldset>}
      </>}
      {activeTab === 'frustration' && <>
        <div className="cmos-table-wrap"><table>
          <thead><tr><th>Piece</th><th>Frustration Reason</th><th>Remarks</th><th>Status</th></tr></thead>
          <tbody>{exercise.frustrations.length ? exercise.frustrations.map((entry, index) => <tr key={index} className={entry.released ? '' : 'cmos-haz-row'}><td>1</td><td>{entryTitle(scenario, entry)}</td><td>{entry.note}</td><td>{entry.released ? 'RELEASED' : 'FRUSTRATED'}</td></tr>) : <tr><td colSpan="4">No data to display.</td></tr>}</tbody>
        </table></div>
        <div className="cmos-footer">{exercise.frustrations.length} row(s) found.</div>
      </>}
      {activeTab === 't9' && <div className="cmos-indicators">
        <div className="cmos-field"><label htmlFor="cmos-t9Remarks">T-9 Remarks</label>{input('t9Remarks')}</div>
      </div>}
    </div>
    <div className="cmos-actions">{locked ? <RemoveFromManifest onRemove={onRemove} /> : <button type="submit" className="primary-button">Add piece to manifest</button>}<p aria-live="polite">{feedback}</p></div>
    </form>
    {paper && <aside className="paper-sheet cmos-paper" aria-label={`${paper.title} (paperwork)`}>
      <div className="paper-toolbar"><span>{paper.title}</span><button type="button" aria-label={`Close ${paper.title} paperwork`} onClick={() => setPaperId(null)}>×</button></div>
      <DocumentBody scenario={scenario} documentId={paper.id} />
    </aside>}
    </div>
  </div></>;
}
