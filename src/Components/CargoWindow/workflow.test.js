import { scenarios } from './scenarios';
import { createExercise, getTasks } from './exercise';
import { paperwork, saveManifest, manifestFields, verifyPaperwork, requestCopies, removeFromManifest, reviewHazdec, DODAAC_PORTS, DESTINATIONS, DODAAC_INFO, randomDestination } from './workflow';

test('precheck requires inspecting each applicable packet and correct counts',()=>{
 const s=scenarios[1]; let e={...createExercise(),dsoeViewed:true};
 expect(paperwork(s).find(d=>d.id==='hazdec').required).toBe(true);
 expect(getTasks(s,'precheck',e).every(t=>t.complete)).toBe(false);
 for(const d of paperwork(s)) {e=verifyPaperwork(s,e,d.id,d.required?d.minimum:0);}
 expect(getTasks(s,'precheck',e).every(t=>t.complete)).toBe(false);
 e.documentsViewed=paperwork(s).map(d=>d.id);
 e.documentCopies.hazdec=3;
 // The ISU-90 travels with its ATTLA certification letter, which must be checked for applicability.
 expect(paperwork(s).find(d=>d.id==='attla').required).toBe(true);
 e.attlaReviewed=true; e.attlaLetterVerified=true;
 // The HAZDEC must also be reviewed line by line.
 expect(getTasks(s,'precheck',e).find(t=>t.id==='hazdec-review').complete).toBe(false);
 e=reviewHazdec(s,e);
 for(const d of paperwork(s)) e=verifyPaperwork(s,e,d.id,d.required?d.minimum:0);
 expect(getTasks(s,'precheck',e).every(t=>t.complete)).toBe(true);
});
test('precheck requires three LOGMOD placards and Incheck does not inspect an MSL',()=>{
 const s=scenarios[0];
 expect(paperwork(s).find(d=>d.id==='logmod-placards')).toMatchObject({title:'LOGMOD placards',required:true,minimum:3,copies:3});
 expect(getTasks(s,'incheck',createExercise()).some(task=>task.id==='label' || task.title==='Military shipping label')).toBe(false);
});
test('manifest rejects missing prerequisite checks and JI requires fresh inspection',()=>{
 const s=scenarios[0];const e=createExercise();
 e.manifestDraft=Object.fromEntries(manifestFields(s).map(f=>[f.id,String(f.expected)]));
 expect(saveManifest(s,e).manifestAccepted).toBe(false);
 expect(getTasks(s,'ji',e).every(t=>t.complete)).toBe(false);
});

function preparedPallet() {
 const s=scenarios[2];let e={...createExercise(),dsoeViewed:true};
 e.documentsViewed=paperwork(s).map(d=>d.id);
 for(const d of paperwork(s)) e=verifyPaperwork(s,e,d.id,d.required?d.minimum:0);
 e.notebookEntries={length:s.length,width:s.width,height:s.height,gross:s.weight};
 e.measurements=[{view:'side',endpoints:[{x:0,y:0},{x:s.length,y:0}]},{view:'front',endpoints:[{x:0,y:0},{x:s.width,y:0}]},{view:'side',endpoints:[{x:0,y:0},{x:0,y:s.height}]}];
 e.inspected=s.findings.map(f=>f.id);
 e.answers=Object.fromEntries(s.findings.map(f=>[f.id,{choice:f.correct,corrected:f.correct==='unsatisfactory'}]));
 e.manifestDraft=Object.fromEntries(manifestFields(s).map(f=>[f.id,String(f.expected)]));
 return {s,e};
}
test('manifest accepts matching prepared asset; JI needs separate fresh checks; changed readings invalidate readiness',()=>{
 let {s,e}=preparedPallet();
 expect(getTasks(s,'incheck',e).every(t=>t.complete)).toBe(true);
 e=saveManifest(s,e,true);
 expect(getTasks(s,'manifest',e).find(t=>t.id==='manifest-entry').complete).toBe(true);
 expect(getTasks(s,'manifest',e).find(t=>t.id==='msl')).toMatchObject({id:'msl',complete:false});
 e={...e,mslApplied:true};
 expect(getTasks(s,'manifest',e).filter(t=>!t.guideOnly).every(t=>t.complete)).toBe(true);
 expect(getTasks(s,'ji',e).every(t=>t.complete)).toBe(false);
 e.jiInspected=s.findings.map(f=>f.id);
 e.jiDocumentsViewed=paperwork(s).map(d=>d.id);
 e.jiMeasurements=e.measurements.map(m=>({...m,inches:Math.hypot(m.endpoints[1].x-m.endpoints[0].x,m.endpoints[1].y-m.endpoints[0].y)}));
 e.jiWeights={gross:{pounds:s.weight}};
 e.jiVerified=getTasks(s,'ji',e).map(t=>t.id);
 expect(getTasks(s,'ji',e).every(t=>t.complete)).toBe(true);
 delete e.notebookEntries.gross;
 expect(getTasks(s,'manifest',e).find(t=>t.id==='manifest-entry').complete).toBe(false);
 expect(getTasks(s,'ji',e).every(t=>t.complete)).toBe(false);
});
test('manifest mismatch prevents acceptance despite complete preparation',()=>{
 const {s,e}=preparedPallet();e.manifestDraft.weight='1';
 expect(saveManifest(s,e,true).manifestAccepted).toBe(false);
});

test('engines require HAZDEC and manifest hazardous-material identification',()=>{
 for(const s of scenarios.filter(s=>s.axles)) {
  expect(paperwork(s).find(d=>d.id==='hazdec')).toMatchObject({required:true,minimum:3});
  expect(manifestFields(s).find(f=>f.id==='hazmat').expected).toBe('H - Hazardous material');
 }
});
test('ATTLA and pallet packing lists follow explicit scenario requirements',()=>{
 const generator=scenarios.find(s=>s.kind==='generator');
 for(const required of [true,false]) {
  const s={...generator,paperworkRequirements:{...generator.paperworkRequirements,attla:required}};
  expect(paperwork(s).find(d=>d.id==='attla').required).toBe(required);
  const pallet={...scenarios[2],loadConfiguration:required?'consolidated':'single-equipment',paperworkRequirements:{packing:required}};
  expect(paperwork(pallet).find(d=>d.id==='packing').required).toBe(required);
 }
 expect(paperwork({...scenarios[1],paperworkRequirements:{packing:false}}).find(d=>d.id==='packing').required).toBe(true);
});

test('requesting copies reports short, exact, and excess amounts',()=>{
 const s={...scenarios[1],paperworkCopies:{packing:0}};const e=createExercise();
 expect(requestCopies(s,e,'packing','1').documentFeedback.packing).toBe('Received 1. Still short 2 copies.');
 expect(requestCopies(s,e,'packing','3').documentCopies.packing).toBe(3);
 expect(requestCopies(s,e,'packing','5').documentFeedback.packing).toBe('Received 5, but only 3 were needed. Recount and verify.');
 expect(requestCopies(s,e,'logmod','1').documentFeedback.logmod).toMatch(/No additional copies are needed/);
 expect(requestCopies(s,e,'packing','').documentFeedback.packing).toBe('Enter how many additional copies are needed.');
});

test('manifest mismatch names each field that differs and where to find it',()=>{
 const {s,e}=preparedPallet();e.manifestDraft={...e.manifestDraft,origin:'FB4427',weight:'1'};
 const saved=saveManifest(s,e,true);
 expect(saved.manifestFeedback).toBe('These entries do not match the shipment paperwork: Origin DoDAAC, Gross weight (lb) (Pieces tab).');
 expect(saved.manifestErrors).toEqual(['origin','weight']);
 e.manifestDraft.weight=String(s.weight);
 expect(saveManifest(s,e,true).manifestFeedback).toBe('This entry does not match the shipment paperwork: Origin DoDAAC.');
});

test('a manifested piece stays locked until removed, and removal clears MSL and JI progress',()=>{
 let {s,e}=preparedPallet();
 e=saveManifest(s,e,true);
 expect(e.manifestRecord.tcn).toBe(e.manifestDraft.tcn);
 e={...e,mslApplied:true,jiVerified:['nets']};
 expect(saveManifest(s,{...e,manifestDraft:{...e.manifestDraft,weight:'1'}},true)).toMatchObject({manifestAccepted:true,mslApplied:true});
 e=removeFromManifest(e);
 expect(e).toMatchObject({manifestAccepted:false,mslApplied:false,manifestRecord:null,jiVerified:[]});
 expect(saveManifest(s,e,true).manifestAccepted).toBe(true);
});

test('precheck starts with the DSOE and cannot finish or manifest without it',()=>{
 const {s,e}=preparedPallet();
 expect(getTasks(s,'precheck',e)[0]).toMatchObject({id:'dsoe',complete:true});
 const noDsoe={...e,dsoeViewed:false};
 expect(getTasks(s,'precheck',noDsoe)[0].complete).toBe(false);
 expect(saveManifest(s,noDsoe,true).manifestFeedback).toBe('Complete Precheck and Incheck before accepting the manifest.');
});

test('every increment ships from FA5030 through EDF to FB5294 through OSN',()=>{
 for(const s of scenarios) {
  const v=Object.fromEntries(manifestFields(s).map(f=>[f.id,f.expected]));
  expect([v.origin,v.apoe,v.destination,v.apod]).toEqual(['FA5030','EDF','FB5294','OSN']);
  const moved=Object.fromEntries(manifestFields({...s,destination:'FB5612'}).map(f=>[f.id,f.expected]));
  expect([moved.destination,moved.apod]).toEqual(['FB5612','RMS']);
 }
 expect(new Set(Object.values(DODAAC_PORTS)).size).toBe(Object.keys(DODAAC_PORTS).length);
});

test('random destinations are overseas units with their own aerial ports',()=>{
 for(const code of DESTINATIONS) expect(DODAAC_INFO[code]).toBeDefined();
 expect(randomDestination(()=>0)).toBe(DESTINATIONS[0]);
 expect(randomDestination(()=>.999)).toBe(DESTINATIONS.at(-1));
});

test('accepting a HAZDEC with an error is a mistake and leaves the review open',()=>{
 const s={...scenarios[1],hazdecError:'signature'};
 const e=reviewHazdec(s,createExercise());
 expect(e.hazdecReviewed).toBe(false);
 expect(e.mistakes).toHaveLength(1);
 expect(getTasks(s,'precheck',e).find(t=>t.id==='hazdec-review').complete).toBe(false);
});
