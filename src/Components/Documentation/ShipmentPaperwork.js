import RegulationHelp, { ClaimLink } from '../Regulations/RegulationHelp';
import { useTestMode, neutral } from '../Session/mode';
import { screenATTLA, letterApplies } from '../CargoWindow/transportability';
import { useCallback, useState } from 'react';
import { paperwork, verifyPaperwork, requestCopies, reviewHazdec } from '../CargoWindow/workflow';
import CollapsibleCard from './CollapsibleCard';
import PaperworkDocument from './PaperworkDocument';
import FrustrateButton from './FrustrateButton';
import MslModal from './MilitaryShippingLabel';

export default function ShipmentPaperwork({scenario,exercise,step,onWorkflow,onOpenCmos}) {
  const [counts,setCounts]=useState({});
  const [requests,setRequests]=useState({});
  const [openDocument,setOpenDocument]=useState(null);
  const test=useTestMode();
  const [mslOpen,setMslOpen]=useState(false);
  const closeMsl=useCallback(()=>setMslOpen(false),[]);
  const closeDocument=useCallback(()=>setOpenDocument(null),[]);
  const documents=paperwork(scenario);
  const screening=screenATTLA(scenario);
  return <CollapsibleCard label="Shipment paperwork" title="Increment monitor’s paperwork packet">
    <RegulationHelp claims={['documents.load', 'documents.hazdec', 'documents.msl', 'documents.attla', 'documents.jiCopies']} assumptions={['The packet copy counts are the training SOP. The cited three-copy rule applies to DD 2133, not to every packet document.', 'Numeric ATTLA screening thresholds remain user-supplied training criteria; a threshold alone does not require certification.']} />
    <p className="reference-note">Fictional training documents. Copy counts and ATTLA applicability below are this exercise’s SOP and scenario requirements.</p>
    <div className="training-task" aria-label="ATTLA transportability screening"><h4>ATTLA transportability screening</h4>
      <p className="reference-note">Uses your supplied training criteria attributed to DAFI 24-605V2 §3.54.1; official paragraph verification is pending. Thresholds initiate review and do not automatically require a certification letter.</p>
      {screening.reasons.length ? <ul>{screening.reasons.map(reason=><li key={reason}>{reason}</li>)}</ul> : <p>No supplied screening threshold is exceeded.</p>}
      {scenario.axles && <p>Fictional model: each axle has two equally loaded wheels, with {scenario.axles[0].contactAreaPerWheel} in² contact area per wheel.</p>}
      {!test && <p>Aircraft/loading review disposition: {scenario.attla?.reviewDisposition || 'See the scenario certification requirement.'}</p>}
      {step==='precheck' && screening.reasons.length>0 && <div className="answer-options">{[[true,'Certification required'],[false,'Review only — no separate letter']].map(([value,title])=><button type="button" key={title} onClick={()=>onWorkflow(e=>({...e,attlaReviewed:value===screening.certificationRequired,attlaLetterVerified:false,attlaFeedback:value===screening.certificationRequired?'Review disposition recorded.':'Recheck the aircraft/loading review disposition; a threshold alone does not decide certification.',documentsVerified:{...e.documentsVerified,attla:false},manifestAccepted:false,jiVerified:[]}))}>{title}</button>)}</div>}
      <p aria-live="polite">{neutral(exercise.attlaFeedback, test)}</p>
      {screening.reasons.length>0 && <div className="answer-options"><FrustrateButton scenario={scenario} exercise={exercise} onWorkflow={onWorkflow} reason="attla" label="ATTLA letter" /></div>}
    </div>
    {documents.map(d=><div className="training-task" key={d.id}><h4><ClaimLink claimId={{ logmod: 'documents.load', 'logmod-placards': 'cargo.weight', packing: 'documents.load', hazdec: 'documents.hazdec', attla: 'documents.attla' }[d.id]}>{d.title}</ClaimLink> · {d.required?'Required':'Not applicable'}</h4>
      <button type="button" onClick={()=>{onWorkflow(e=>({...e,documentsViewed:[...new Set([...e.documentsViewed,d.id])],jiDocumentsViewed:step==='ji'?[...new Set([...e.jiDocumentsViewed,d.id])]:e.jiDocumentsViewed,jiInspected:step==='ji' && documents.every(doc=>doc.id===d.id || e.jiDocumentsViewed.includes(doc.id))?[...new Set([...e.jiInspected,'documents','special-service'])]:e.jiInspected}));if((exercise.documentCopies[d.id]??d.copies)>0) setOpenDocument(d);}}>View {d.title}</button>
      {exercise.documentsViewed.includes(d.id) && <div><p>{d.required && (exercise.documentCopies[d.id]??d.copies)===0 ? 'The increment monitor did not bring this document. ' : ''}Available copies: {exercise.documentCopies[d.id]??d.copies}. {(exercise.documentCopies[d.id]??d.copies)>0 && <button type="button" className="link-button" onClick={()=>setOpenDocument(d)}>Open document</button>} {d.required?`Required: ${d.minimum}.`:d.id==='attla' && screening.reasons.length>0 ? 'Review required; scenario disposition does not require a separate letter.' : 'No document required for this scenario.'}</p>
        {d.id==='hazdec' && d.required && step==='precheck' && <div className="hazdec-review">
          <p>Review each HAZDEC entry against the packing list and AFMAN 24-604: UN number and proper shipping name, class or division, packing group, quantity, packing paragraph, cargo-aircraft-only limitation, and signature. Frustrate the piece if anything is wrong.</p>
          <div className="answer-options"><button type="button" onClick={()=>onWorkflow(e=>reviewHazdec(scenario,e))}>HAZDEC entries are correct</button><FrustrateButton scenario={scenario} exercise={exercise} onWorkflow={onWorkflow} reason="hazdec" label="HAZDEC entries" /></div>
          <p aria-live="polite">{neutral(exercise.hazdecFeedback, test)}</p>
        </div>}
        {d.id==='attla' && d.required && <div>{step==='precheck' && <button type="button" disabled={screening.reasons.length>0 && !exercise.attlaReviewed} onClick={()=>onWorkflow(e=>({...e,attlaReviewed:screening.reasons.length===0?true:e.attlaReviewed,attlaLetterVerified:letterApplies(scenario),attlaFeedback:letterApplies(scenario)?'Current letter matches configuration, dimensions, and gross weight.':'Letter is missing, outdated, inapplicable, or exceeds a certified limit. Hold for an applicable current letter.',documentsVerified:{...e.documentsVerified,attla:false},manifestAccepted:false,jiVerified:[]}))}>Verify ATTLA letter applicability</button>}
        </div>}
        {step==='precheck' && <><label>Count {d.title} copies <input type="number" min="0" step="1" value={counts[d.id]??''} onChange={event=>setCounts({...counts,[d.id]:event.target.value})} /></label>
          <div className="answer-options"><button type="button" onClick={()=>onWorkflow(e=>({...verifyPaperwork(scenario,e,d.id,counts[d.id]??''),manifestAccepted:false,jiVerified:[]}))}>Verify {d.title} copies</button>
            <FrustrateButton scenario={scenario} exercise={exercise} onWorkflow={onWorkflow} reason="paperwork" subject={d.id} label={d.title} /></div>
          {d.required && <div className="copy-request"><label>Additional {d.title} copies needed <input type="number" min="1" step="1" value={requests[d.id]??''} onChange={event=>setRequests({...requests,[d.id]:event.target.value})} /></label>
            <button type="button" onClick={()=>{onWorkflow(e=>requestCopies(scenario,e,d.id,requests[d.id]??''));setRequests({...requests,[d.id]:''});}}>Request additional {d.title} copies</button></div>}
          <p aria-live="polite">{neutral(exercise.documentFeedback[d.id], test)}</p></>}
      </div>}
    </div>)}
    {openDocument && <PaperworkDocument scenario={scenario} document={openDocument} onClose={closeDocument} />}
    {step==='manifest' && <div className="cmos-launcher"><button type="button" className="primary-button" onClick={onOpenCmos}>Open CMOS</button><p>Save the shipment in Shipment Planning, then assign it to a saved Air Manifest.</p><p aria-live="polite">{exercise.manifestFeedback}</p></div>}
    {step==='manifest' && <div className="training-task msl-task" aria-label="Military shipping label task"><h4>Military shipping label (MSL)</h4>
      <p>{!exercise.manifestAccepted ? 'Add the piece to the manifest before printing its MSL.' : exercise.mslApplied ? 'MSL applied to the piece in the cargo bay.' : 'Increment manifested. Print and apply the MSL.'}</p>
      <div className="answer-options"><button type="button" className="primary-button" disabled={!exercise.manifestAccepted || exercise.mslApplied} onClick={()=>onWorkflow(e=>e.manifestAccepted?{...e,mslApplied:true}:e)}>Apply MSL</button>
        {exercise.manifestAccepted && exercise.mslApplied && <button type="button" onClick={()=>setMslOpen(true)}>View MSL</button>}</div>
    </div>}
    {mslOpen && exercise.manifestAccepted && <MslModal scenario={scenario} onClose={closeMsl} />}
  </CollapsibleCard>;
}
