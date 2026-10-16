import { useState } from 'react';
import { Dialog, Fields, Lookup, lookupValues } from './controls';
import { field } from './referenceInventory';
import { editRecord, saveRecord, deleteRecord } from './model';
import { PAGE1_FLAGS, PAGE1_FIELDS, PAGE2_FIELDS } from '../CdfCmos/HazardousTcnDialog';
import { LOT_FIELDS } from '../CdfCmos/AmmoLotDialog';
import { AFMAN_REFERENCE, DG2_CATALOG, dg2Defaults, applyDg2Template, normalizeUn, unAutofill, unMatches, clearDg2Un } from './dg2Reference';
import Dg2Lookup from './Dg2Lookup';
import HazardUomLookup from './HazardUomLookup';

const extraPage2 = [
  ['imdgNetMassQty', 'IMDG Net Mass Qty'], ['imdgNetMassUom', 'IMDG Net Mass UOM'],
  ['transportIndex', 'Transport Index of Radioactive Material'], ['radioactiveActivity', 'Radioactive Activity Level'],
  ['radioactiveActivityUom', 'Radioactive Activity UOM'], ['dryIceWeight', 'Dry Ice Weight/UOM'], ['radioactivePrescription', 'Radioactive Prescription'],
];
const identificationRows = [
  ['properShippingName'], ['division', 'compatibility', 'imdg', 'percentage', 'sym'], ['unId', 'packingGroup', 'subsidiary'],
  ['specialProvisions'], ['packingPara'], ['suppPackingPara'], ['hazardClassName'], ['hazardLabel'],
  ['flashpoint', 'inhabitedDistance'], ['packaging'], ['imperialQty', 'imperialUom', 'packagingUnits', 'imdgNetMassQty', 'imdgNetMassUom'],
  ['metricQty', 'metricUom', 'transportIndex'], ['quantityType', 'identicalContainers', 'radioactiveActivity', 'radioactiveActivityUom'],
  ['dryIceWeight', 'radioactivePrescription'], ['additionalHandling'],
];
const shipperRows = [['aircraft', 'dtr'], ['shipper', 'phone'], ['address1'], ['address2'], ['city', 'country', 'state', 'zip'], ['emergencyContact']];

export default function HazardousTcn({ activeEntry, locked, hazTab, setHazTab, entry, store, change, setConfirm, setEntry, setMessage }) {
  const [lookup, setLookup] = useState(null);
  const [notice, setNotice] = useState('');
  const draft = dg2Defaults(activeEntry.draft);
  const update = patch => change(editRecord(store, 'hazards', entry.id, patch));
  const chooseTemplate = template => {
    update(applyDg2Template(draft, template));
    setNotice(`UN reference loaded · AFMAN 24-604, Table A4.1, page ${template.page}.`);
  };
  const editPage2 = (key, value) => {
    if (key === 'unId') {
      const normalized = normalizeUn(value);
      const template = unAutofill(normalized);
      if (template) { chooseTemplate(template); return; }
      update(normalized !== normalizeUn(draft.page2.unId) ? clearDg2Un(draft, normalized) : { page2: { ...draft.page2, unId: normalized } });
      setNotice(unMatches(normalized).length ? 'Several AFMAN entries use this UN number. Select the applicable entry with the magnifying glass.' : '');
      return;
    }
    update({ page2: { ...draft.page2, [key]: value } });
  };
  const editHeader = (key, value) => {
    if (key === 'templateId') {
      const exact = DG2_CATALOG.find(t => t.id === value.trim().toUpperCase());
      const template = exact && !exact.forbidden && !exact.referenceOnly ? exact : unAutofill(String(value).replace(/^TRN-/i, ''));
      if (template) { chooseTemplate(template); return; }
    }
    update({ [key]: value });
  };
  const openFieldLookup = (f, rows) => {
    if (['templateId', 'unId', 'properShippingName'].includes(f.id)) setLookup({ kind: f.id === 'templateId' ? 'template' : 'un' });
    else if (['imperialUom', 'metricUom'].includes(f.id)) setLookup({ kind: 'uom', field: f });
    else if (f.id === 'emergencyContact') setLookup({ kind: 'emergency' });
    else setLookup({ kind: 'generic', field: f, rows });
  };
  const form = (fields, values, onEdit) => <Fields fields={fields} values={values} onEdit={onEdit} locked={locked} openLookup={openFieldLookup} />;
  const page2Fields = [...PAGE2_FIELDS, ...extraPage2].map(([key, label, options]) => ({
    ...field(label, key, key === 'additionalHandling' ? 'textarea' : options ? 'select' : 'text', options),
    ...(['imperialUom', 'metricUom'].includes(key) ? { type: 'text', options: undefined, lookup: [] } : {}),
    ...(['unId', 'properShippingName', 'emergencyContact'].includes(key) ? { lookup: [] } : {}),
    ...(key === 'country' ? { lookup: lookupValues({ id: 'ucCountry' }) } : {}),
    ...(key === 'state' ? { lookup: lookupValues({ id: 'ucState' }) } : {}),
  }));
  const page2Row = (ids, i) => <div className="shared-dg2-row" key={i}>{form(ids.map(id => page2Fields.find(f => f.id === id)), draft.page2, editPage2)}</div>;
  const records = Object.values(store.hazards).filter(r => r.draft.shipmentId === draft.shipmentId);
  const position = records.findIndex(r => r.id === entry.id);
  const navigate = target => { setEntry({ ...entry, id: records[target].id }); setNotice(''); };
  const save = close => {
    change(saveRecord(editRecord(store, 'hazards', entry.id, draft), 'hazards', entry.id));
    setNotice('Transaction Successfully Processed. Record successfully saved.');
    setMessage('Record successfully saved.');
    if (close) setEntry(null);
  };
  return <Dialog title="Hazardous TCN" heading="Maintain Hazardous TCNs" onClose={() => setEntry(null)} wide overlayClassName="shared-dg2-overlay">
    <div className="shared-dg2-editor">
      <div className="shared-dg2-header">
        {form([{ ...field('Piece', 'piece'), inputMode: 'numeric' }], draft, editHeader)}
        {form([{ ...field('Template ID', 'templateId'), lookup: [], lookupLabel: 'DG2 template' }], draft, editHeader)}
        {form([{ ...field('Template Type', 'templateType'), readOnly: true }], draft, editHeader)}
        <div className="shared-dg2-certifier">{form([field('Enter Name and Title', 'certifier')], draft, editHeader)}</div>
      </div>
      <div className="shared-tab-bar" role="tablist" aria-label="Hazardous TCN tabs">
        {['Page 1', 'Page 2', 'Hazard Cargo', 'Certification Statement'].map(t => <button key={t} role="tab" aria-selected={hazTab === t} onClick={() => setHazTab(t)}>{t}</button>)}
      </div>
      <section className="shared-dg2-panel" role="tabpanel" aria-label={hazTab}>
        {hazTab === 'Page 1' && <>
          <div className="shared-dg2-flags">{[PAGE1_FLAGS.slice(0, 5), PAGE1_FLAGS.slice(5, 10), PAGE1_FLAGS.slice(10, 13)].map((labels, i) => <div key={i}>
            {form(labels.map(label => field(label, label, 'checkbox')), draft.page1, (k, v) => update({ page1: { ...draft.page1, [k]: v } }))}
            {i === 2 && form(PAGE1_FIELDS.filter(([key]) => ['maxSpeed', 'poisonZone'].includes(key)).map(([key, label]) => field(label, key)), draft.page1, (k, v) => update({ page1: { ...draft.page1, [k]: v } }))}
          </div>)}</div>
          <div className="shared-dg2-page1-details">
            {['imdg', 'NOS Item', 'technicalName', 'dotE', 'explosiveApproval', 'competentApproval'].map(key => <div className="shared-dg2-row" key={key}>{form([key === 'NOS Item' ? field('NOS Item', key, 'checkbox') : field(PAGE1_FIELDS.find(f => f[0] === key)[1], key)], draft.page1, (k, v) => update({ page1: { ...draft.page1, [k]: v } }))}</div>)}
          </div>
        </>}
        {hazTab === 'Page 2' && <>
          <div className="shared-dg2-identification">{identificationRows.map(page2Row)}</div>
          <div className="shared-dg2-shipper">{shipperRows.map(page2Row)}</div>
        </>}
        {hazTab === 'Hazard Cargo' && <div className="shared-dg2-ammo">
          {form([field('Hazard Codes', 'hazardCode')], draft, editHeader)}
          <button disabled={locked} onClick={() => {
            let n = 1; const lots = draft.lots; const used = new Set(lots.map(l => l.id)); while (used.has(`lot-${n}`)) n++;
            update({ lots: [...lots, { id: `lot-${n}` }] });
          }}>New lot</button>
          {draft.lots.map(lot => <fieldset key={lot.id}><legend>Ammo Information · {lot.id}</legend>
            {form(LOT_FIELDS.map(([key, label, options]) => field(label, key, options ? 'select' : 'text', options)), lot, (k, v) => update({ lots: draft.lots.map(x => x.id === lot.id ? { ...x, [k]: v } : x) }))}
            <button disabled={locked} onClick={() => save(false)}>Save lot</button>
            <button disabled={locked} onClick={() => update({ lots: draft.lots.filter(x => x.id !== lot.id) })}>Delete lot {lot.id}</button>
          </fieldset>)}
        </div>}
        {hazTab === 'Certification Statement' && form([field('Certification Statement', 'certificationStatement', 'textarea')], draft, editHeader)}
      </section>
      <div className="shared-dg2-notice" aria-live="polite">{notice}</div>
      <a className="shared-dg2-reference" href={AFMAN_REFERENCE.url} target="_blank" rel="noreferrer">{AFMAN_REFERENCE.title}</a>
      <footer>
        <span className="shared-dg2-navigation">{[['First', 0], ['Previous', position - 1], ['Next', position + 1], ['Last', records.length - 1]].map(([label, target]) => <button key={label} disabled={target < 0 || target >= records.length || target === position} onClick={() => navigate(target)}>{label}</button>)}</span>
        <button disabled={locked} onClick={() => save(false)}>Save</button><button disabled={locked} onClick={() => save(true)}>Save and Close</button>
        <button disabled={locked} onClick={() => setConfirm({ title: 'Delete DG2 record?', run: () => { change(deleteRecord(store, 'hazards', entry.id)); setEntry(null); } })}>Delete</button>
        <button onClick={() => setEntry(null)}>Close</button>
      </footer>
    </div>
    {lookup && !['generic', 'uom'].includes(lookup.kind) && <Dg2Lookup emergency={lookup.kind === 'emergency'} templateLookup={lookup.kind === 'template'} page2={draft.page2} onSelect={r => lookup.kind === 'emergency' ? editPage2('emergencyContact', r.number) : chooseTemplate(r)} onClose={() => setLookup(null)} />}
    {lookup?.kind === 'uom' && <HazardUomLookup metric={lookup.field.id === 'metricUom'} onSelect={v => editPage2(lookup.field.id, v)} onClose={() => setLookup(null)} />}
    {lookup?.kind === 'generic' && <Lookup field={lookup.field} rows={lookup.rows} onSelect={v => editPage2(lookup.field.id, v)} onClose={() => setLookup(null)} />}
  </Dialog>;
}
