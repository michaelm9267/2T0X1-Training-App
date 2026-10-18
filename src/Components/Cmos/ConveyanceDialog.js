import { useState } from 'react';
import { Dialog } from '../CdfCmos/controls';
import ReferenceLookup from './ReferenceLookup';
import CmosDateField from './CmosDateField';
import { EQUIPMENT_TYPE_ROWS } from './routingRequest';

// CBL Conveyances → New / open: one conveyance (car, truck or container) on the bill.
// Add saves and starts the next conveyance, Save keeps the window open, Save and Close closes it.
export const SEALS_APPLIED_BY = [['SH', 'Shipper'], ['CA', 'Carrier']];
const REQUIRED = [['primaryEqInit', 'Primary Eq Init'], ['primaryEqNbr', 'Primary Eq Nbr'], ['equipTypeOrdered', 'Equip Type Ordered'], ['equipTypeFurnished', 'Equip Type Furnished']];
const SEAL_ROWS = 4;

export const blankConveyance = (seq, scac) => ({
  conveyanceSeqNbr: seq, primaryEqInit: scac || '', primaryEqNbr: '', secondaryEqInit: '', secondaryEqNbr: '', tractorNbr: '', crossRefType: '',
  vehicleFullyLoaded: false, palletWt: '', dunnageWt: '', skidWt: '', tareWt: '',
  equipTypeOrdered: '', equipTypeFurnished: '', lengthOrderedFeet: '', lengthOrderedInches: '', lengthFurnishedFeet: '', lengthFurnishedInches: '',
  cubeOrdered: '', cubeFurnished: '', markedCapacityOrdered: '', markedCapacityFurnished: '', temperatureControl: '', dateFurnished: '',
  sealsAppliedBy: '', sealNumbers: Array(SEAL_ROWS).fill(''),
});

// What is stored: blank secondary equipment prints and lists as NONE.
export const conveyanceValues = (form) => ({
  ...form, cp: form.cp || 'Yes',
  secondaryEqInit: String(form.secondaryEqInit || '').trim() || 'NONE', secondaryEqNbr: String(form.secondaryEqNbr || '').trim() || 'NONE',
  sealNumbers: (form.sealNumbers || []).map((s) => String(s || '').trim()),
});

export const missingConveyanceFields = (form) => REQUIRED.filter(([key]) => !String(form[key] || '').trim()).map(([, label]) => `${label} is required.`);

function Field({ id, label, required, system, value, onChange, width, readOnly, lookup }) {
  return <span className="shared-route-field shared-cnv-field">
    <label htmlFor={`cnv-${id}`} className={system ? 'shared-route-system' : undefined}>{required && '* '}{label}:</label>
    <input id={`cnv-${id}`} aria-label={label} value={value ?? ''} readOnly={readOnly} style={{ width }} onChange={(e) => onChange(e.target.value)} />
    {lookup && <button type="button" className="shared-route-lookup" aria-label={`Look up ${label}`} onClick={lookup}>
      <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"><circle cx="6.5" cy="6.5" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="m10 10 4 4" stroke="currentColor" strokeWidth="1.5" /></svg>
    </button>}
  </span>;
}

export default function ConveyanceDialog({ initial, recordId, locked, nextSeq, scac, onSave, onClose }) {
  const [form, setForm] = useState(() => ({ ...blankConveyance(initial.conveyanceSeqNbr, scac), ...initial, sealNumbers: [...(initial.sealNumbers || []), ...Array(SEAL_ROWS).fill('')].slice(0, SEAL_ROWS) }));
  const [id, setId] = useState(recordId || null);
  const [errors, setErrors] = useState([]);
  const [lookup, setLookup] = useState(null);
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  const upper = (key) => (value) => set(key)(String(value).toUpperCase());
  const digits = (key) => (value) => set(key)(String(value).replace(/[^\d.]/g, ''));
  const save = (then) => {
    const missing = missingConveyanceFields(form);
    setErrors(missing);
    if (missing.length) return;
    const savedId = onSave(id, conveyanceValues(form));
    if (then === 'add') { setId(null); setForm(blankConveyance(nextSeq(form.conveyanceSeqNbr), scac)); }
    else if (then === 'close') onClose();
    else setId(savedId);
  };
  const p = { readOnly: locked };
  return <Dialog title="Conveyance" bare onClose={onClose} overlayClassName="shared-cnv-overlay">
    <div className="shared-cnv">
      <div className="shared-cnv-top">
        <div className="shared-cnv-col">
          <Field id="seq" label="Conveyance Seq Nbr" system readOnly value={form.conveyanceSeqNbr} width="42px" onChange={() => {}} />
          <Field id="pri-init" label="Primary Eq Init" required value={form.primaryEqInit} width="60px" onChange={upper('primaryEqInit')} {...p} />
          <Field id="sec-init" label="Secondary Eq Init" value={form.secondaryEqInit === 'NONE' ? '' : form.secondaryEqInit} width="60px" onChange={upper('secondaryEqInit')} {...p} />
        </div>
        <div className="shared-cnv-col">
          <Field id="tractor" label="Tractor Nbr" value={form.tractorNbr} width="132px" onChange={upper('tractorNbr')} {...p} />
          <Field id="pri-nbr" label="Primary Eq Nbr" required value={form.primaryEqNbr} width="132px" onChange={upper('primaryEqNbr')} {...p} />
          <Field id="sec-nbr" label="Secondary Eq Nbr" value={form.secondaryEqNbr === 'NONE' ? '' : form.secondaryEqNbr} width="132px" onChange={upper('secondaryEqNbr')} {...p} />
          <span className="shared-route-field shared-cnv-field"><label htmlFor="cnv-xref" className="shared-route-system">Cross Ref Type:</label>
            <select id="cnv-xref" aria-label="Cross Ref Type" disabled value={form.crossRefType} onChange={() => {}}><option value="" /></select></span>
        </div>
        <div className="shared-cnv-loaded">
          <label htmlFor="cnv-loaded">Vehicle Fully Loaded</label>
          <input id="cnv-loaded" type="checkbox" aria-label="Vehicle Fully Loaded" disabled={locked} checked={Boolean(form.vehicleFullyLoaded)} onChange={(e) => set('vehicleFullyLoaded')(e.target.checked)} />
        </div>
      </div>
      <div className="shared-cnv-weights">
        <Field id="pallet" label="Pallet Wt" value={form.palletWt} width="84px" onChange={digits('palletWt')} {...p} />
        <Field id="dunnage" label="Dunnage Wt" value={form.dunnageWt} width="84px" onChange={digits('dunnageWt')} {...p} />
        <Field id="skid" label="Skid Wt" value={form.skidWt} width="84px" onChange={digits('skidWt')} {...p} />
        <Field id="tare" label="Tare Wt" value={form.tareWt} width="84px" onChange={digits('tareWt')} {...p} />
      </div>
      <div className="shared-cnv-equip">
        <div className="shared-cnv-col">
          <Field id="eq-ord" label="Equip Type Ordered" required value={form.equipTypeOrdered} width="42px" onChange={upper('equipTypeOrdered')} lookup={locked ? null : () => setLookup('equipTypeOrdered')} {...p} />
          <span className="shared-cnv-pair"><Field id="len-ord" label="Length Ordered Feet" value={form.lengthOrderedFeet} width="42px" onChange={digits('lengthOrderedFeet')} {...p} />
            <Field id="len-ord-in" label="Inches" value={form.lengthOrderedInches} width="42px" onChange={digits('lengthOrderedInches')} {...p} /></span>
          <Field id="cube-ord" label="Cube Ordered" value={form.cubeOrdered} width="48px" onChange={digits('cubeOrdered')} {...p} />
          <Field id="cap-ord" label="Marked Capacity Ordered" value={form.markedCapacityOrdered} width="42px" onChange={digits('markedCapacityOrdered')} {...p} />
          <Field id="temp" label="Temperature Control" value={form.temperatureControl} width="66px" onChange={upper('temperatureControl')} {...p} />
        </div>
        <div className="shared-cnv-col">
          <Field id="eq-fur" label="Equip Type Furnished" required value={form.equipTypeFurnished} width="42px" onChange={upper('equipTypeFurnished')} lookup={locked ? null : () => setLookup('equipTypeFurnished')} {...p} />
          <span className="shared-cnv-pair"><Field id="len-fur" label="Length Furnished Feet" value={form.lengthFurnishedFeet} width="42px" onChange={digits('lengthFurnishedFeet')} {...p} />
            <Field id="len-fur-in" label="Inches" value={form.lengthFurnishedInches} width="42px" onChange={digits('lengthFurnishedInches')} {...p} /></span>
          <Field id="cube-fur" label="Cube Furnished Feet" value={form.cubeFurnished} width="48px" onChange={digits('cubeFurnished')} {...p} />
          <Field id="cap-fur" label="Marked Capacity Furnished" value={form.markedCapacityFurnished} width="78px" onChange={digits('markedCapacityFurnished')} {...p} />
          <span className="shared-route-field shared-cnv-field"><label htmlFor="cnv-date">Date Furnished:</label>
            <CmosDateField id="cnv-date" label="Date Furnished" width="132px" readOnly={locked} value={form.dateFurnished} onChange={set('dateFurnished')} /></span>
        </div>
      </div>
      <fieldset className="shared-cnv-seals">
        <legend>Conveyance Seals</legend>
        <label htmlFor="cnv-seal-by">Seals Applied By:</label>
        <select id="cnv-seal-by" aria-label="Seals Applied By" disabled={locked} value={form.sealsAppliedBy} onChange={(e) => set('sealsAppliedBy')(e.target.value)}>
          <option value="" />{SEALS_APPLIED_BY.map(([code, text]) => <option key={code} value={code}>{`${code}  - ${text}`}</option>)}
        </select>
        <table className="shared-table"><thead><tr><th /><th>Seal Numbers</th></tr></thead>
          <tbody>{form.sealNumbers.map((seal, i) => <tr key={i}><td /><td><input aria-label={`Seal Number ${i + 1}`} readOnly={locked} value={seal}
            onChange={(e) => setForm((f) => ({ ...f, sealNumbers: f.sealNumbers.map((s, n) => (n === i ? e.target.value.toUpperCase() : s)) }))} /></td></tr>)}</tbody></table>
      </fieldset>
      {errors.length > 0 && <p className="shared-air-errors" role="alert">{errors.join(' ')}</p>}
      <footer>
        <button type="button" disabled={locked} onClick={() => save('add')}>Add</button>
        <button type="button" disabled={locked} onClick={() => save()}>Save</button>
        <button type="button" disabled={locked} onClick={() => save('close')}>Save and Close</button>
        <button type="button" onClick={onClose}>Close</button>
      </footer>
    </div>
    {lookup && <ReferenceLookup title="Equipment Type Lookup" columns={['Type', 'Category', 'Description']} rows={EQUIPMENT_TYPE_ROWS}
      onSelect={(code) => set(lookup)(code)} onClose={() => setLookup(null)} />}
  </Dialog>;
}
