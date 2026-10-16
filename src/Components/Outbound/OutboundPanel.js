import { useCallback, useState, useEffect } from 'react';
import CollapsibleCard from '../Documentation/CollapsibleCard';
import SectionJump from '../Documentation/SectionJump';
import { useTestMode } from '../Session/mode';
import ShippingDocument, { DocumentBody } from './ShippingDocument';
import { createRecord } from '../Cmos/model';
import CmosWorkspace from '../Cmos/CmosWorkspace';
import { usualDomInt } from './cmosLogic';
import { ITEMS, CONTAINERS, MARKINGS, TYPE_PACKS, originOf } from './outboundData';
import {
  OUTBOUND_STEPS, MODES, RECEIPT_CHECKS, CHOICE_LABEL, MIL_MODES, expectedReceipt, checkReady, checkComplete, formFields, presentedDocument,
  shipmentComplete, shipmentScore, smallParcelLimits, stageComplete,
} from './outboundLogic';

// Test mode says only that a judged entry was not accepted, never why.
const judged = (message, ok, test) => test && !ok && message ? 'Not accepted. Recheck your work.' : message;

const STEP_SUMMARY = {
  receive: 'Inspect the asset and its shipping document when the customer brings it in. Return the document if anything is wrong; accept custody when it is right.',
  pack: 'Choose the container, apply the markings, then measure and weigh the piece and write its packing data on the shipping document.',
  planning: 'In CMOS Shipment Planning, incheck the advance record (or build a New one), complete the record and its Pieces tab, enter the Mil Mode, save, and print the MSL from the Pieces tab.',
  'small-package': 'In CMOS Small Package Express, choose the carrier and service, send the request to rate it, print the shipping label, and apply the MSL and carrier label to the box.',
  surface: 'Build the commercial bill of lading for surface freight and apply the MSL to the box.',
  amc: 'Build the ATCMD for AMC channel airlift and apply the MSL to the box.',
};
const CHECK_HINTS = {
  nsn: 'Compare the NSN on the document with the NSN on the condition tag.',
  quantity: 'Count the items on the bench and compare with the document quantity.',
  condition: 'Yellow DD 1574 = condition A (serviceable). Green DD 1577-2 = condition F (unserviceable, reparable). Compare with the document.',
  funding: 'The TAC (or fund code) must be on the document so the move can be billed.',
  shipto: 'The document must name where the piece goes: a consignee DoDAAC, or a full address in the clear (a vendor has no DoDAAC).',
  signature: 'DD 1149 block 10 must be signed by an authorized requester. A DD 1348-1A has no requester signature block.',
};

function FormCard({ title, label, shipment, exercise, formId, onEdit, onSubmit, submitLabel }) {
  const test = useTestMode();
  const form = exercise.forms[formId] || {};
  const locked = Boolean(form.accepted);
  return <CollapsibleCard label={label} title={title} summary={<span>{locked ? 'Accepted' : 'Open'}</span>}>
    <form className="cmos-screen cmos-inline" aria-label={label} onSubmit={event => { event.preventDefault(); onSubmit(); }}>
      <div className="cmos-grid">{formFields(shipment, formId).map(field => {
        const id = `${formId}-${field.id}`;
        const invalid = !test && form.errors?.includes(field.id);
        return <div className="cmos-field" key={field.id}>
          <label htmlFor={id} className="cmos-required">{field.title}</label>
          {field.options ? <select id={id} className={invalid ? 'cmos-invalid' : undefined} disabled={locked} value={form.draft?.[field.id] ?? ''} onChange={event => onEdit(field.id, event.target.value)}><option value="">Select</option>{field.options.map(option => <option key={option} value={option}>{field.optionLabel ? field.optionLabel(option) : option}</option>)}</select>
            : <input id={id} className={invalid ? 'cmos-invalid' : undefined} readOnly={locked} inputMode={field.numeric ? 'decimal' : undefined} value={form.draft?.[field.id] ?? ''} onChange={event => onEdit(field.id, event.target.value)} />}
          {field.hint && !test && <small className="cmos-hint">{field.hint}</small>}
        </div>;
      })}</div>
      <div className="cmos-actions">{!locked && <button type="submit" className="primary-button">{submitLabel}</button>}<p aria-live="polite">{form.errors ? judged(form.feedback, locked, test) : form.feedback}</p></div>
    </form>
  </CollapsibleCard>;
}

// Practice: how the section went, and another shipment for it. The earlier sections were done for the trainee.
function PracticeCard({ practice, shipment, exercise }) {
  const section = OUTBOUND_STEPS.find(item => item.id === practice.section);
  const complete = stageComplete(shipment, exercise, section.id);
  const mistakes = exercise.mistakes || [];
  const earlier = OUTBOUND_STEPS.slice(0, OUTBOUND_STEPS.indexOf(section)).filter(item => !MODES[item.id]).map(item => item.title);
  return <CollapsibleCard className="practice-summary" label="Practice section" title={`Practice: ${section.title}`} summary={<span>{complete ? 'Complete' : 'In progress'}</span>}>
    <p>{earlier.length ? `${earlier.join(', ')} ${earlier.length === 1 ? 'is' : 'are'} already done for this shipment. ` : ''}{complete ? `Section complete with ${mistakes.length} ${mistakes.length === 1 ? 'mistake' : 'mistakes'}.` : `${mistakes.length} ${mistakes.length === 1 ? 'mistake' : 'mistakes'} so far. Practice is not scored.`}</p>
    {mistakes.length > 0 && <ul className="mistake-list">{mistakes.map((mistake, index) => <li key={index}>{mistake.detail} <span className="task-source">{mistake.reference}</span></li>)}</ul>}
    <div className="answer-options"><button type="button" className={complete ? 'primary-button' : undefined} onClick={practice.onAgain}>Practice again with a new shipment</button></div>
  </CollapsibleCard>;
}

export default function OutboundPanel({ step, shipment, exercise, actions, packages, onSelectStep, onNextCustomer, hasNextCustomer, practice, cmosStore, cmosContext, cmosRequest }) {
  const test = useTestMode();
  const item = ITEMS[shipment.itemId];
  const origin = originOf(shipment);
  const [docOpen, setDocOpen] = useState(false);
  const closeDoc = useCallback(() => setDocOpen(false), []);
  const [cmosPage, setCmosPage] = useState(null);
  const closeCmos = useCallback(() => setCmosPage(null), []);
  useEffect(()=>{if(cmosRequest)setCmosPage('planning');},[cmosRequest]);
  const doc = presentedDocument(shipment, exercise.returned);
  const packing = exercise.forms.annotation?.accepted ? exercise.forms.annotation.draft : null;
  const paper = { title: `DD ${shipment.document}`, render: () => <DocumentBody doc={doc} shipment={shipment} received={exercise.custodyAccepted} packing={packing} /> };
  const openSmallPackage=()=>{const sid=Object.values(cmosStore.shipments).find(r=>r.draft.assetKey===shipment.key)?.id;const existing=Object.values(cmosStore.express).find(r=>r.draft.shipmentId===sid);if(sid){const next=existing?{...cmosStore,selection:{...cmosStore.selection,express:existing.id}}:createRecord(cmosStore,'express',{shipmentId:sid,packageType:'Box',domInt:usualDomInt(shipment)});actions.sharedCmos(next);}setCmosPage('spe');};
  const readings = exercise.packed ? [['Length', exercise.measured.length && `${shipment.packed.length} in`], ['Width', exercise.measured.width && `${shipment.packed.width} in`], ['Height', exercise.measured.height && `${shipment.packed.height} in`], ['Gross weight', exercise.weighed && `${shipment.packed.weight} lb`]] : [];
  const done = shipmentComplete(shipment, exercise);
  return <section className="documentation-panel" id="training-section" aria-labelledby="training-title">
    <div className="training-heading"><span className="eyebrow">{practice ? 'Practice · one section' : `${test ? 'Test' : 'Guided practice'} · Customer ${shipment.serial}`}</span><h2 id="training-title">{step.title}</h2><p className="muted">{STEP_SUMMARY[step.id]}</p></div>
    <SectionJump resetKey={`${shipment.key}-${shipment.serial}-${step.id}`} />
    {docOpen && <ShippingDocument doc={doc} shipment={shipment} received={exercise.custodyAccepted} packing={packing} onClose={closeDoc} />}

    <CollapsibleCard label="Shipping document" title="Shipping document" summary={<span>DD {shipment.document}{exercise.returned ? ' · corrected' : ''}</span>}>
      <p className="muted">{shipment.document === '1149' ? 'The customer brought a DD Form 1149, Requisition and Invoice/Shipping Document.' : 'The customer brought a DD Form 1348-1A, Issue Release/Receipt Document.'}</p>
      <div className="answer-options"><button type="button" className="primary-button" onClick={() => { setDocOpen(true); actions.viewDocument(); }}>View DD {shipment.document}</button></div>
    </CollapsibleCard>

    {step.id === 'receive' && <CollapsibleCard label="Receipt checks" title="Receipt checks" summary={<span>{RECEIPT_CHECKS.filter(check => checkComplete(shipment, exercise, check.id)).length} / {RECEIPT_CHECKS.length} complete</span>}>
      {!exercise.documentViewed && <p className="reference-note">View the shipping document to begin. Inspect the item on the bench for the NSN, quantity and condition checks.</p>}
      <div className="task-list">{RECEIPT_CHECKS.map(check => {
        const answer = exercise.answers[check.id];
        const expected = expectedReceipt(shipment, check.id);
        const complete = checkComplete(shipment, exercise, check.id);
        return <div className={`training-task ${complete ? 'task-complete' : ''}`} role="group" aria-label={check.title} key={check.id}>
          <div className="task-heading"><h4>{check.title}</h4><span>{complete ? (expected === 'unsatisfactory' ? 'Corrected' : 'Complete') : 'Pending'}</span></div>
          {!test && <p>{CHECK_HINTS[check.id]}</p>}
          <div className="answer-options">{Object.entries(CHOICE_LABEL).map(([value, label]) => <button key={value} type="button" disabled={!checkReady(exercise, check) || exercise.custodyAccepted} aria-pressed={answer === value} onClick={() => actions.answer(check.id, value)}>{label}</button>)}</div>
          {answer && (test ? <div className="task-feedback"><strong>Decision recorded.</strong></div>
            : <div className={`task-feedback ${answer === expected ? 'feedback-correct' : ''}`} aria-live="polite"><strong>{answer === expected ? 'Correct decision.' : 'Try again.'}</strong> {answer === expected && expected === 'unsatisfactory' && !exercise.returned ? 'Return the document to the customer for correction.' : ''} <span className="task-source">{check.reference}</span></div>)}
        </div>;
      })}</div>
      <div className="answer-options">
        <button type="button" disabled={exercise.returned || exercise.custodyAccepted} onClick={actions.returnDocument}>Return document to customer for correction</button>
        <button type="button" className="primary-button" disabled={exercise.custodyAccepted} onClick={actions.acceptCustody}>Accept custody</button>
      </div>
      {exercise.receiptFeedback && <p className="reference-note" role="status">{exercise.receiptFeedback}</p>}
    </CollapsibleCard>}

    {step.id === 'pack' && <>
      <CollapsibleCard label="Container" title="Container" summary={<span>{exercise.container ? CONTAINERS[exercise.container].title : 'Not chosen'}</span>}>
        {!test && <p className="muted">{item.esd ? 'This item is electrostatic discharge sensitive. ' : ''}{shipment.quantity} {item.ui} · about {Math.round(item.unitWeight * shipment.quantity)} lb before packing.</p>}
        <div className="container-options">{Object.entries(CONTAINERS).map(([id, container]) => <button key={id} type="button" aria-pressed={exercise.container === id} disabled={exercise.packed} onClick={() => actions.chooseContainer(id)}><strong>{container.title}</strong>{!test && <small>{container.note}</small>}</button>)}</div>
      </CollapsibleCard>
      <CollapsibleCard label="Markings" title="Markings" summary={<span>{exercise.markings.length} applied</span>}>
        <div className="container-options">{MARKINGS.map(marking => <button key={marking.id} type="button" aria-pressed={exercise.markings.includes(marking.id)} disabled={exercise.packed} onClick={() => actions.toggleMarking(marking.id)}>{marking.title}</button>)}</div>
        {!test && <p className="reference-note">ESDS items carry the ESD caution label. The MIL-STD-129 address label is the MSL: print it from the CMOS Pieces tab after Shipment planning and apply it with the bench's Labels tool.</p>}
        <div className="answer-options"><button type="button" className="primary-button" disabled={exercise.packed} onClick={actions.pack}>Pack and seal</button></div>
        {exercise.packFeedback && <p className="reference-note" role="status">{exercise.container ? judged(exercise.packFeedback, exercise.packed, test) : exercise.packFeedback}</p>}
      </CollapsibleCard>
      {exercise.packed && <CollapsibleCard label="Bench readings" title="Bench readings" summary={<span>{readings.filter(([, value]) => value).length} / 4 taken</span>}>
        <ul className="reading-list">{readings.map(([label, value]) => <li key={label}><strong>{label}</strong><span>{value || 'Not taken: use the bench tools'}</span></li>)}</ul>
      </CollapsibleCard>}
      {exercise.packed && <FormCard title={`Packing data on the DD ${shipment.document}`} label="Packing data on the shipping document" formId="annotation" submitLabel={`Write on the DD ${shipment.document}`} shipment={shipment} exercise={exercise} onEdit={(field, value) => actions.editForm('annotation', field, value)} onSubmit={() => actions.submitForm('annotation')} />}
      {!test && exercise.packed && <p className="reference-note">Type pack codes: {Object.entries(TYPE_PACKS).map(([code, title]) => `${code} ${title}`).join(' · ')}.</p>}
    </>}

    {step.id === 'planning' && <CollapsibleCard label="CMOS Shipment Planning" title="CMOS · Shipment Planning" summary={<span>{exercise.cmos.record?.saved ? `Saved · Mil Mode ${exercise.milMode}` : exercise.cmos.record ? 'Record open' : 'Not inchecked'}</span>}>
      <div className="answer-options"><button type="button" className="primary-button" onClick={() => setCmosPage('planning')}>Open CMOS Shipment Planning</button></div>
      {exercise.cmos.record?.feedback && exercise.cmos.record.saved && <p className="reference-note" role="status">{exercise.cmos.record.feedback}</p>}
      {!test && <>
        <ol className="planning-rules">
          <li>Search the list for the TCN{shipment.document === '1149' ? ` (a DD 1149 is not MILSTRIP: ${origin.cmosDodaac} + Julian date + X + 00# or 500-series number + XXX)` : ' (document number + XXX)'}. If it is there as an advance record (status 00), select it and click <strong>Incheck</strong>. If not, click <strong>New</strong> and build the record from the document{shipment.document === '1149' ? ', building the TCN with an unused number' : ''}.</li>
          <li>Check the prefilled data against the {shipment.document}. Every field can be changed. Enter NMFC/UFC (block 6 on a 1348-1A), CIIC (the PS code in block 9) and the Mil Mode you choose. For Mil Mode 9 also enter POE, POE DODAAC and POD; Modes J, 5 and B leave them blank. On the Indicators tab, set Hazardous/Ammunition Ind (N for non-hazardous) and check Routing for Mil Mode B.</li>
          <li>If the piece goes to an address in the clear (a vendor with no DoDAAC, or a delivery address different from the consignee DoDAAC's), enter it on the Ultimate Consignee tab. With no DoDAAC, the Consignee is the non-specific DoDAAC F00000 (DAFI 24-602V2 para 2.3.3 · DTR Part II, Chapter 203, para B.2). Otherwise leave the tab empty.</li>
          <li>On the Pieces tab, click New and enter weight, type pack and dimensions from the packing data you wrote on the document. Save.</li>
          <li>Print the MSL with Print All Pieces (or check pieces and Print Selected Pieces), then apply it to the box with the bench's Labels tool.</li>
        </ol>
        <p className="reference-note">Nothing in CMOS is graded; your trainer will review your entries and Mil Mode with you. Usual Mil Mode from {origin.name}:</p>
        <ul className="planning-rules">
          <li><strong>9 · AMC</strong>: overseas consignees, truck manifested to the aerial port{origin.alaska ? '; also routine (TP3) small parcels to the lower 48' : ''}.</li>
          <li><strong>B · LTL</strong>: lower-48 pieces over small parcel limits: {smallParcelLimits(shipment).weight} lb from {origin.name} (DTR Part II, Chapter 202, para M.1: 150 lb within CONUS, 300 lb between CONUS and Alaska), or the carriers' {smallParcelLimits(shipment).lengthGirth} in length + 2 × (width + height).</li>
          <li><strong>TP</strong> (DAFI 24-602V2 Table 2.1 · DTR Part II, Table 203-3): {shipment.document === '1149' ? 'a DD 1149 has no PD, so the RDD decides: 2 days out or less is TP1 (5 OCONUS), 8 days or less TP2 (21 OCONUS), later or blank TP3.' : 'PD 01–03 is TP1. PD 04–15 is TP2 with RDD 444, 555, 777, N__, E__, or a Julian RDD 8 days out or less (CONUS customer) or 21 days (OCONUS); otherwise TP3.'}</li>
          {origin.alaska ? <li><strong>J · Air small parcel</strong>: TP1 and TP2 small parcels to the lower 48.</li>
            : <><li><strong>J · Air small parcel</strong>: TP1 small parcels.</li><li><strong>5 · Surface small parcel</strong>: TP2 and TP3 small parcels.</li></>}
        </ul>
      </>}
    </CollapsibleCard>}

    {step.id === 'small-package' && <CollapsibleCard label="CMOS Small Package Express" title="CMOS · Small Package Express" summary={<span>{exercise.spe?.rated ? 'Rated' : 'Open'}</span>}>
      <div className="answer-options"><button type="button" className="primary-button" onClick={openSmallPackage}>Open CMOS Small Package Express</button></div>
      {exercise.spe?.rated && <p className="reference-note" role="status">Tracking number {exercise.spe.result.tracking} · {exercise.spe.draft.scac} {exercise.spe.draft.service}.{exercise.printed?.carrierLabel ? '' : ' Print the shipping label from Print Express Docs.'}{exercise.labels?.carrier && exercise.labels?.msl ? '' : ' Apply the MSL and carrier label with the bench\'s Labels tool.'}</p>}
      {!test && <p className="reference-note">Every choice here is yours and is not graded; your trainer will guide the carrier and service. {usualDomInt(shipment) === 'INT' ? `From ${origin.name} this package is INT: ${origin.alaska ? 'Alaska to anywhere outside Alaska is international' : 'it goes overseas'}.` : 'Within the lower 48 a package is DOM.'} Pick the shipment date from the calendar (ddmmmyyyy). Send Request has the carrier rate the shipment and assign the tracking number; Cancel clears the rating so you can change entries and send it again. Print Express Docs opens Print Small Package Express Documents, where you print the shipping label and run the pickup report for the SCAC.</p>}
    </CollapsibleCard>}

    {['surface','amc'].includes(step.id) && <CollapsibleCard label={step.id==='surface'?'Commercial bill of lading':'AMC transportation'} title={step.id==='surface'?'Commercial Bill of Lading':'AMC · Routings and Truck Manifest'}><div className="answer-options">{(step.id==='surface'?[['cbl','Commercial BOL']]:[['routing','Routings'],['truck','Truck Manifest'],['air','Air Manifest']]).map(([page,title])=><button key={page} onClick={()=>setCmosPage(page)}>Open CMOS {title}</button>)}</div></CollapsibleCard>}

    {['surface', 'amc'].includes(step.id) && exercise.forms[step.id]?.accepted && !exercise.labels?.msl && <p className="reference-note" role="status">{exercise.printed?.msl ? 'Apply the MSL to the box with the bench\'s Labels tool.' : 'Print the MSL from the CMOS Shipment Planning Pieces tab, then apply it to the box with the bench\'s Labels tool.'}</p>}

    {cmosPage && <CmosWorkspace store={cmosStore} onChange={actions.sharedCmos} initialPage={cmosPage} onClose={closeCmos} context={{...cmosContext,course:'outbound',activeAssetKey:shipment.key,sourceOrigin:origin.dodaac,origin:origin.cmosDodaac,documents:[{id:'source',title:paper.title,render:paper.render},...(cmosContext.documents||[])]}}/>}

    {practice && <PracticeCard practice={practice} shipment={shipment} exercise={exercise} />}

    {!practice && <CollapsibleCard className="practice-summary" label="Shipment record" title="Shipment record" summary={<span>{done ? `Score ${shipmentScore(exercise)}` : `${['receive', 'pack', 'planning'].filter(id => stageComplete(shipment, exercise, id)).length} / 4 steps`}</span>}>
      {done ? <p role="status">Shipment complete: Mil Mode {exercise.milMode} ({MIL_MODES[exercise.milMode].toLowerCase()}) to {shipment.dodaac || shipment.delivery?.name}. Score {shipmentScore(exercise)} / 100.</p> : <p>{(exercise.mistakes || []).length} {exercise.mistakes?.length === 1 ? 'mistake' : 'mistakes'} recorded. Each costs 5 points.</p>}
      {(done || !test) && exercise.mistakes?.length > 0 && <ul className="mistake-list">{exercise.mistakes.map((mistake, index) => <li key={index}>{mistake.detail} <span className="task-source">{mistake.reference}</span></li>)}</ul>}
      {done && hasNextCustomer && <div className="answer-options"><button type="button" className="primary-button" onClick={onNextCustomer}>Next customer</button></div>}
    </CollapsibleCard>}
  </section>;
}
