import { useState } from 'react';
import { useTestMode } from '../Session/mode';
import { TYPE_PACK_CODES } from '../Cmos/dtrReference';
import { MIL_MODES } from './outboundLogic';
import { OutboundMsl, PrintPreview } from './OutboundPrintouts';
import DateField from './DateField';
import CommodityLookup from '../Cmos/CommodityLookup';
import { AIR_DIM_OPTIONS, AIR_DIM_LABELS } from '../Cmos/commodityReference';
import { listRows, searchRows, planningFields, chosenMode, pieceCube, savePlanning, canExpressShip, activeTcn, tabOf, UC_FIELDS } from './cmosLogic';

// CMOS Shipment Planning: the list of TCNs (Incheck an advance record, or New), and the record
// screen with its header fields and Pieces tab.

const STATUSES = [['00', '00 - Advance Record Not Yet Inchecked'], ['PI', 'PI - Inchecked, Planning In Process'], ['all', 'All Statuses']];
const COLUMNS = [['tcn', 'TCN'], ['lead', 'Lead TCN'], ['consolidation', 'Consolidation'], ['docNbr', 'Document Number'], ['status', 'Status'], ['docType', 'Doc Type'], ['tac', 'TAC'], ['movDoc', 'Movement Document'], ['dsoe', 'DSOE ID'], ['chalk', 'Chalk'],
  ['consignee', 'Consignee DODAAC'], ['pod', 'POD'], ['milMode', 'MIL Mode'], ['priority', 'Priority'], ['rdd', 'RDD'], ['pieces', 'Pieces'], ['weight', 'Weight'], ['cube', 'Cube'], ['hold', 'Hold Codes'], ['frustrated', 'Frustrated Reason']];
// Record tabs; the hazmat and status tabs are not used in this training.
const TABS = [['pieces', 'Pieces'], ['consignee', 'Ultimate Consignee'], ['indicators', 'Indicators'], [null, 'DG2'], [null, 'T-9 Misc'], [null, 'Shipment Status'], [null, 'Cargo Frustration']];

function PlanningList({ shipment, exercise, actions, onOpen }) {
  const record = exercise.cmos.record;
  // Once the customer's record is saved (status PI), the list opens on PI so the saved TCN shows.
  const [status, setStatus] = useState(record?.saved ? 'PI' : '00');
  const [tcn, setTcn] = useState('');
  const [applied, setApplied] = useState({ status, tcn: '' });
  const [filters, setFilters] = useState({});
  const [selected, setSelected] = useState(record?.saved ? activeTcn(shipment, exercise) : null);
  const rows = searchRows(listRows(shipment, exercise), applied)
    .map(row => ({ ...row, consolidation: row.docType === 'M' && !row.customer ? 'N' : '' }))
    .filter(row => Object.entries(filters).every(([id, text]) => !text || String(row[id] ?? '').toUpperCase().includes(text.toUpperCase())));
  const selectedRow = rows.find(row => row.tcn === selected);
  function incheck() {
    if (!selectedRow) return;
    actions.incheck(selectedRow.tcn);
    if (selectedRow.tcn === activeTcn(shipment, exercise)) onOpen();
  }
  function newRecord() {
    if (record && !record.isNew) { actions.cmosMessage('This shipment is already inchecked. Select its TCN in the list.'); return; }
    actions.newRecord(); onOpen();
  }
  return <div className="cmos-sp-list">
    <div className="cmos-search" role="search" aria-label="Shipment Planning search">
      <label htmlFor="sp-status">Status</label>
      <select id="sp-status" value={status} onChange={event => setStatus(event.target.value)}>{STATUSES.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select>
      <label htmlFor="sp-tcn">TCN</label>
      <input id="sp-tcn" value={tcn} onChange={event => setTcn(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') setApplied({ status, tcn }); }} />
      <div className="cmos-search-buttons"><button type="button" onClick={() => setApplied({ status, tcn })}>Search</button><button type="button" onClick={() => { setStatus('00'); setTcn(''); setApplied({ status: '00', tcn: '' }); setFilters({}); }}>Clear</button></div>
      <p>Default search returns TCN's in 'PI' status. Searching by TCN will ignore selected Status.<br /><strong>Tip</strong> Add % to inputs for partial searches (Ex: %1234%)</p>
    </div>
    <div className="cmos-grid-box">
      <div className="cmos-toolbar">
        <button type="button" onClick={newRecord}>New</button>
        <button type="button" onClick={() => { setSelected(null); setFilters({}); }}>Clear</button>
        <button type="button" disabled={!selectedRow || selectedRow.status !== '00'} onClick={incheck}>Incheck</button>
        <button type="button" disabled>Copy TCN</button>
        <button type="button" disabled>Edit Check</button>
      </div>
      {exercise.cmos.message && <p className="cmos-message" role="alert">{exercise.cmos.message}</p>}
      <div className="cmos-table-wrap cmos-list-table"><table>
        <thead>
          <tr className="cmos-filter-row">{COLUMNS.map(([id, title]) => <th key={id}><input aria-label={`Filter ${title}`} value={filters[id] || ''} onChange={event => setFilters(current => ({ ...current, [id]: event.target.value }))} /></th>)}</tr>
          <tr>{COLUMNS.map(([id, title]) => <th key={id} scope="col">{title}</th>)}</tr>
        </thead>
        <tbody>{rows.length ? rows.map(row => <tr key={row.tcn} className={row.tcn === selected ? 'cmos-row-selected' : ''} onClick={() => setSelected(row.tcn)} aria-selected={row.tcn === selected}>
          {COLUMNS.map(([id]) => id === 'tcn'
            ? <td key={id} className="cmos-tcn-cell"><button type="button" className="cmos-row-pick" aria-label={`Select ${row.tcn}`} onClick={event => { event.stopPropagation(); setSelected(row.tcn); }}>⧉</button>
              <button type="button" className="cmos-row-button" onClick={event => { event.stopPropagation(); setSelected(row.tcn); if (row.customer && record?.saved) onOpen(); }}>{row.tcn}</button></td>
            : <td key={id}>{row[id] ?? ''}</td>)}
        </tr>) : <tr><td colSpan={COLUMNS.length}>No data to display.</td></tr>}</tbody>
      </table></div>
      <div className="cmos-footer">{rows.length} row(s) found.</div>
    </div>
  </div>;
}

function PlanningRecord({ shipment, exercise, actions, onClose, onExprShip }) {
  const test = useTestMode();
  const [lookup, setLookup] = useState(false);
  const [commodityLookup, setCommodityLookup] = useState(false);
  const [tab, setTab] = useState('pieces');
  const [chosen, setChosen] = useState([]);
  const [printing, setPrinting] = useState(null);
  const record = exercise.cmos.record;
  const fields = planningFields(shipment, record.draft);
  const locked = record.saved;
  const amc = chosenMode(record.draft) === '9';
  const value = id => record.draft[id] ?? '';
  const invalid = id => !test && record.errors?.includes(id);
  const control = (id, { width, options, optionLabels } = {}) => {
    const props = { id: `sp-${id}`, className: invalid(id) ? 'cmos-invalid' : undefined, style: width ? { width } : undefined };
    const choices = options || fields[id]?.options;
    if (fields[id]?.date) return <DateField id={`sp-${id}`} format={fields[id].date} className={props.className} width={width} readOnly={locked} value={value(id)} onChange={next => actions.editRecord(id, next)} />;
    return choices
      ? <select {...props} disabled={locked} value={value(id)} onChange={event => actions.editRecord(id, event.target.value)}><option value=""></option>{choices.map(option => <option key={option} value={option}>{optionLabels?.[option] || option}</option>)}</select>
      : <input {...props} readOnly={locked} value={value(id)} onChange={event => actions.editRecord(id, event.target.value)} />;
  };
  // Called as a function, not rendered as a component, so inputs keep focus while typing.
  const F = ({ id, label, required, ...rest }) => <span className="cmos-f"><label htmlFor={`sp-${id}`} className={required ? 'cmos-required' : ''}>{label}</label>{control(id, rest)}</span>;
  // Ultimate Consignee and Indicators entries, also called as functions so inputs keep focus.
  const uc = (id, label, width, required) => <span className="cmos-f"><label htmlFor={`sp-${id}`} className={required ? 'cmos-required' : ''}>{label}</label><input id={`sp-${id}`} className={invalid(id) ? 'cmos-invalid' : undefined} readOnly={locked} style={{ width }} value={value(id)} onChange={event => actions.editRecord(id, event.target.value)} /></span>;
  const check = (id, label) => <span className="cmos-f cmos-check-f"><label htmlFor={`sp-${id}`}>{label}</label><input id={`sp-${id}`} type="checkbox" className={invalid(id) ? 'cmos-invalid' : undefined} disabled={locked} checked={Boolean(value(id))} onChange={event => actions.editRecord(id, event.target.checked)} /></span>;
  const pieces = record.pieces;
  const totals = { pcs: pieces.length, wt: pieces.reduce((sum, p) => sum + (Number(p.weight) || 0), 0), cu: pieces.reduce((sum, p) => sum + (Number(pieceCube(p)) || 0), 0) };
  function print(indexes) { setPrinting(indexes); actions.printDocument('msl'); }
  function saveAndClose() { const next = savePlanning(shipment, exercise); actions.savePlanning(); if (next.cmos.record?.saved) onClose(); }
  const feedback = record.feedback;
  return <div className="cmos-sp-record">
    <div className="cmos-sp-head">
      <div className="cmos-col">{F({ id: 'docType', label: 'Doc Type' })}{F({ id: 'palId', label: 'Pal ID', width: '2.5em' })}{F({ id: 'dsoeId', label: 'DSOE ID', width: '4em' })}</div>
      <div className="cmos-col">{F({ id: 'docNbr', label: 'Doc Nbr' })}{F({ id: 'movDoc', label: 'Mov Doc' })}<span className="cmos-f-pair">{F({ id: 'chalk', label: 'Chalk', width: '6em' })}{F({ id: 'planId', label: 'Plan ID', width: '7em' })}</span></div>
      <div className="cmos-col">{F({ id: 'tcn', label: 'TCN', required: true })}{F({ id: 'ttan', label: 'TTAN', width: '7em' })}{F({ id: 'uln', label: 'ULN' })}</div>
      <div className="cmos-col">{F({ id: 'leadTcn', label: 'Lead TCN' })}{F({ id: 'ttn', label: 'TTN' })}{F({ id: 'uic', label: 'UIC', width: '4em' })}</div>
    </div>
    <hr />
    <div className="cmos-sp-main">
      <div className="cmos-col">
        <span className="cmos-f-pair">{F({ id: 'primeDic', label: 'Prime DIC', width: '4em' })}{F({ id: 'lineItems', label: 'Line Items/Quantity', width: '6em' })}</span>
        {F({ id: 'nomen', label: 'Nomen', required: true, width: '22em' })}
        <span className="cmos-f-pair">
          <span className="cmos-f"><label htmlFor="sp-milMode" className="cmos-required">MIL Mode</label>{control('milMode', { width: '2.5em' })}<button type="button" className="cmos-lookup" aria-label="Look up Mil Mode codes" aria-expanded={lookup} disabled={locked} onClick={() => setLookup(open => !open)}>⌕</button></span>
          {F({ id: 'ediMode', label: 'EDI Mode', width: '2.5em' })}{F({ id: 'expMode', label: 'Exp Mode', width: '2em' })}
        </span>
        {lookup && !locked && <div className="cmos-lookup-list" role="listbox" aria-label="Mil Mode codes">{Object.entries(MIL_MODES).map(([code, title]) => <button key={code} type="button" role="option" aria-selected={value('milMode') === code} onClick={() => { actions.editRecord('milMode', code); setLookup(false); }}><b>{code}</b> {title}</button>)}</div>}
        <span className="cmos-f-pair">{F({ id: 'nmfc', label: 'NMFC/UFC', required: true, width: '7em' })}<span className="cmos-f">{control('ufc', { width: '3em' })}</span>{F({ id: 'rate', label: 'Rate', options: ['A', 'B'], width: '3.5em' })}</span>
        <span className="cmos-f-pair">{F({ id: 'tac', label: 'TAC', width: '4em' })}{F({ id: 'advice', label: 'Advice Nbr', width: '10em' })}</span>
        {F({ id: 'acctClass', label: 'Acct Class', width: '18em' })}
        <span className="cmos-f-pair">{F({ id: 'sdn', label: 'SDN/MORD', width: '12em' })}{F({ id: 'loa', label: 'LOA Val Status', width: '2em' })}</span>
      </div>
      <div className="cmos-col">
        {F({ id: 'totalCost', label: 'Total Cost', width: '10em' })}
        <span className="cmos-f-pair">{F({ id: 'cage', label: 'CAGE', width: '4em' })}{F({ id: 'partNo', label: 'Part No/AIN', width: '12em' })}</span>
        {F({ id: 'nsn', label: 'NSN', required: true, width: '12em' })}
        <span className="cmos-f-pair">{F({ id: 'consignor', label: 'Consignor', required: true, width: '5em' })}{F({ id: 'poe', label: 'POE', required: amc, width: '4.5em' })}{F({ id: 'poeDodaac', label: 'POE DODAAC', required: amc, width: '5em' })}</span>
        <span className="cmos-f-pair">{F({ id: 'consignee', label: 'Consignee', width: '5em' })}{F({ id: 'pod', label: 'POD', required: amc, width: '4.5em' })}</span>
        <span className="cmos-f-pair">{F({ id: 'ciic', label: 'CIIC', required: true, width: '2em' })}{F({ id: 'secClass', label: 'Sec Class', width: '3.5em' })}{F({ id: 'typeCargo', label: 'Type Cargo', width: '3.5em' })}</span>
        <span className="cmos-f-pair">{F({ id: 'rdd', label: 'RDD', width: '3.5em' })}{F({ id: 'tp', label: 'TP', width: '3.5em' })}{F({ id: 'proj', label: 'Proj', width: '3em' })}</span>
        <span className="cmos-f-pair">{F({ id: 'eta', label: 'ETA', options: ['1', '2', '3', '4', '5', 'X'], width: '3.5em' })}{F({ id: 'fms', label: 'FMS Case Number', width: '3em' })}{F({ id: 'holdCode', label: 'Hold Code', width: '2em' })}</span>
        {F({ id: 'markFor', label: 'Mark For', width: '22em' })}
      </div>
      <div className="cmos-col">
        {F({ id: 'shipmentId', label: 'Shipment ID' })}{F({ id: 'containerId', label: 'Container ID' })}
        <span className="cmos-f-pair">{F({ id: 'aggregateId', label: 'Aggregate ID', width: '4em' })}{F({ id: 'consolidationId', label: 'Consolidation ID', width: '3em' })}</span>
        <span className="cmos-f-pair">{F({ id: 'etrrId', label: 'ETRR ID', width: '4em' })}{F({ id: 'pcfn', label: 'PCFN', width: '5em' })}</span>
        {F({ id: 'tmr', label: 'TMR Number', width: '14em' })}{F({ id: 'rfTag', label: 'RF Tag Number', width: '14em' })}
        <span className="cmos-f"><span className="cmos-label">Status</span><span className="cmos-readonly cmos-status">{locked ? 'PI' : record.isNew ? '' : '00'}</span><span className="cmos-readonly cmos-status-text">{locked ? 'INCHECKED · PLANNING IN PROCESS' : record.isNew ? 'NEW RECORD' : 'ADVANCE RECORD NOT YET INCHECKED'}</span></span>
      </div>
    </div>
    <div className="cmos-tabs" role="tablist" aria-label="Shipment Planning tabs">
      {TABS.map(([id, title]) => <button key={title} type="button" role="tab" aria-selected={tab === id} disabled={!id}
        className={`${tab === id ? 'cmos-tab-active' : ''} ${!test && id && record.errors?.some(error => tabOf(error) === id) ? 'cmos-tab-error' : ''}`} onClick={() => id && setTab(id)}>{title}</button>)}
    </div>
    {tab === 'consignee' && <div className="cmos-panel cmos-uc" role="tabpanel" aria-label="Ultimate Consignee">
      {uc('ucName', 'Name', '28em')}
      {uc('ucAddress', 'Address', '28em')}
      {uc('ucAddress2', 'Address 2', '28em')}
      {uc('ucCity', 'Base/City', '20em')}
      <span className="cmos-f-pair">{uc('ucCountry', 'Country', '2.5em', Boolean(Object.keys(UC_FIELDS).some(id => value(id))))}{uc('ucState', 'State', '2.5em')}{uc('ucZip', 'Zip', '9em')}</span>
      {uc('ucPhone', 'Phone Nbr', '12em')}
      <div><button type="button" className="cmos-uc-clear" disabled={locked} onClick={() => Object.keys(UC_FIELDS).forEach(id => value(id) && actions.editRecord(id, ''))}>Clear Ultimate Consignee Data</button></div>
    </div>}
    {tab === 'indicators' && <div className="cmos-panel cmos-indicators-tab" role="tabpanel" aria-label="Indicators">
      <div className="cmos-col">
        {F({ id: 'hazInd', label: 'Hazardous/Ammunition Ind', width: '9em' })}
        {check('t9', 'Misc T-9 Required')}{check('micap', 'MICAP Shipment')}{check('repship', 'REPSHIP Required')}
        <span className="cmos-f"><label htmlFor="sp-psi1">Protective Service Ind</label>{[1, 2, 3, 4].map(n => <input key={n} id={`sp-psi${n}`} aria-label={`Protective Service Ind ${n}`} readOnly={locked} style={{ width: '3em' }} value={value(`psi${n}`)} onChange={event => actions.editRecord(`psi${n}`, event.target.value)} />)}</span>
        {F({ id: 'typeAtcmd', label: 'Type ATCMD Required', options: ['A', 'B', 'C', 'D'], width: '3.5em' })}
        <span className="cmos-f-pair">{check('eei', 'Electronic Export Information')}{F({ id: 'demil', label: 'DEMIL', width: '2.5em' })}{F({ id: 'usml', label: 'USML', width: '2.5em' })}{F({ id: 'determination', label: 'Determination NBR', width: '8em' })}</span>
        {check('routing', 'Routing')}{check('weapons', 'Weapons Shipment')}{check('etrrInd', 'ETRR Ind')}{check('equipSys', 'Equipment Sys Ind')}
        <span className="cmos-f"><label htmlFor="sp-commodity">Commodity S/H</label>{control('commodity', { width: '4em' })}<button type="button" className="cmos-lookup" aria-label="Look up Commodity S/H codes" disabled={locked} onClick={() => setCommodityLookup(true)}>⌕</button></span>
        {commodityLookup && <CommodityLookup value={value('commodity')} onSelect={code => actions.editRecord('commodity', code)} onClose={() => setCommodityLookup(false)} />}
      </div>
      <div className="cmos-col">
        {check('dg1387', 'Danger Goods/1387-2 Required')}
        <span className="cmos-f">{F({ id: 'consolidationInd', label: 'Consolidation Ind/Supply Ind', options: ['Y - Consolidate', 'N - Do not consolidate'], width: '16em' })}<input type="checkbox" aria-label="Supply Ind" disabled={locked} checked={Boolean(value('supplyInd'))} onChange={event => actions.editRecord('supplyInd', event.target.checked)} /></span>
        {check('dd1907', 'DD Form 1907 Required')}{check('dunnage', 'Dunnage Required')}
        {F({ id: 'courier', label: 'Armed Forces Courier Ind', options: ['Y', 'N'], width: '3.5em' })}
        {check('mail', 'Mail Shipment')}{check('vet', 'Vet Inspectable Container')}{check('serialized', 'Serialized Shipment')}
        {F({ id: 'airDim', label: 'Air Dim', options: AIR_DIM_OPTIONS, optionLabels: AIR_DIM_LABELS, width: '3.5em' })}
      </div>
    </div>}
    {tab === 'pieces' && <div className="cmos-panel" role="tabpanel" aria-label="Pieces">
      <div className="cmos-totals">{[['Total PCS', totals.pcs], ['Total WT', totals.wt || ''], ['Total CU', totals.cu || '']].map(([label, total]) => <div className="cmos-field" key={label}><span className="cmos-label">{label}</span><span className="cmos-readonly">{total}</span></div>)}</div>
      <div className="cmos-toolbar">
        <button type="button" disabled={locked} onClick={actions.addPiece}>New</button>
        <button type="button" disabled>Duplicate</button>
        <button type="button" disabled={!locked || !pieces.length} onClick={() => print(pieces.map((_, index) => index))}>Print All Pieces</button>
        <button type="button" disabled={!locked || !chosen.length} onClick={() => print(chosen)}>Print Selected Pieces</button>
        {['Clear', 'Partial', 'Split'].map(label => <button key={label} type="button" disabled>{label}</button>)}
        <button type="button" disabled={locked || !pieces.length} onClick={actions.deletePieces}>Delete All</button>
      </div>
      <div className="cmos-table-wrap"><table>
        <thead><tr><th scope="col"><span className="visually-hidden">Select</span></th>{['Number', 'Weight', 'Cube', 'Type Pack', 'Length', 'Width', 'Height', 'Max Temp', 'Min Temp', 'Packer', 'Volume Qty', 'Volume UOM'].map(title => <th key={title} scope="col">{title}</th>)}</tr></thead>
        <tbody>{pieces.length ? pieces.map((piece, index) => <tr key={index}>
          <td><input type="checkbox" aria-label={`Select piece ${index + 1}`} checked={chosen.includes(index)} onChange={event => setChosen(list => event.target.checked ? [...list, index].sort() : list.filter(i => i !== index))} /></td>
          <td>{index + 1}</td>
          <td><input aria-label={`Piece ${index + 1} weight`} readOnly={locked} inputMode="decimal" value={piece.weight} onChange={event => actions.editPiece(index, 'weight', event.target.value)} /></td>
          <td>{pieceCube(piece)}</td>
          <td><select aria-label={`Piece ${index + 1} type pack`} disabled={locked} value={piece.typePack} onChange={event => actions.editPiece(index, 'typePack', event.target.value)}><option value=""></option>{TYPE_PACK_CODES.map(([code, text]) => <option key={code} value={code} title={text}>{code}</option>)}</select></td>
          {['length', 'width', 'height'].map(id => <td key={id}><input aria-label={`Piece ${index + 1} ${id}`} readOnly={locked} inputMode="decimal" value={piece[id]} onChange={event => actions.editPiece(index, id, event.target.value)} /></td>)}
          <td /><td /><td /><td /><td />
        </tr>) : <tr><td colSpan="13">No data to display.</td></tr>}</tbody>
      </table></div>
      <div className="cmos-footer">{pieces.length} row(s) found.{!locked && pieces.length ? ' Save the record to print MSLs.' : ''}</div>
    </div>}
    {printing && <PrintPreview title="Military Shipping Label" onClose={() => setPrinting(null)}>
      {printing.map(index => <OutboundMsl key={index} shipment={shipment} exercise={exercise} index={index} />)}
    </PrintPreview>}
    {feedback && <p className="cmos-message" role="status">{feedback}</p>}
    <div className="cmos-bottom-bar">
      {['First', 'Previous', 'Next', 'Last'].map(label => <button key={label} type="button" disabled>{label}</button>)}
      <span className="cmos-bar-gap" />
      <button type="button" disabled>Edit TCN</button><button type="button" disabled>Create AIT</button>
      <button type="button" disabled={!canExpressShip(exercise)} onClick={onExprShip}>Expr Ship</button>
      <button type="button" disabled>Rate Quote</button><button type="button" disabled>EEI</button>
      <span className="cmos-bar-gap" />
      <button type="button" disabled={locked} onClick={actions.savePlanning}>Save</button>
      <button type="button" disabled={locked} onClick={saveAndClose}>Save and Close</button>
      <button type="button" disabled>Delete</button>
      <button type="button" onClick={onClose}>Close</button>
    </div>
  </div>;
}

export default function CmosShipmentPlanning({ shipment, exercise, actions, onExprShip }) {
  const [view, setView] = useState('list');
  const record = exercise.cmos.record;
  const close = () => { if (record && !record.saved) actions.discardRecord(); setView('list'); };
  return view === 'detail' && record
    ? <PlanningRecord shipment={shipment} exercise={exercise} actions={actions} onClose={close} onExprShip={onExprShip} />
    : <PlanningList shipment={shipment} exercise={exercise} actions={actions} onOpen={() => setView('detail')} />;
}
