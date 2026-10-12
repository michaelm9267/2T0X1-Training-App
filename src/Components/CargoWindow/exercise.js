import { screenATTLA } from './transportability';
import { notebookFields, viewedReading } from './notebook';
import { paperwork, precheckComplete, manifestMatches, attlaReady, hazdecRequired, hazdecReady } from './workflow';
import { axleCode, axleLabels } from './axles';
import { canConfirmVehicleCorrection } from './vehicleInspection';
import { isFrustrated } from './frustration';
export function createExercise() {
  return { attlaReviewed:false,attlaLetterVerified:false,attlaFeedback:'', documentsViewed:[], documentsVerified:{}, documentCopies:{}, documentFeedback:{}, manifestDraft:{}, manifestAccepted:false, manifestFeedback:'', jiDocumentsViewed:[], jiMeasurements:[], jiWeights:{}, jiSides:[], jiInspected:[], jiTerminals:{}, jiVerified:[], measurements: [], weights: {}, inspected: [], answers: {}, cbResult: null, notebookDraft: {}, notebookEntries: {}, notebookFeedback: {}, tapeLabels: [], labelFeedback: '', vehicleState: {}, terminalViewed: {}, fuelViewed: false, frustrations: [], frustrationFeedback: '', mslApplied: false, manifestRecord: null, dsoeViewed: false };
}

function hasMeasurement(exercise, view, a, b) {
  const equal = (p, q) => Math.abs(p.x - q.x) < .1 && Math.abs(p.y - q.y) < .1;
  return exercise.measurements.some(record => record.view === view && (
    (equal(record.endpoints[0], a) && equal(record.endpoints[1], b)) ||
    (equal(record.endpoints[0], b) && equal(record.endpoints[1], a))
  ));
}

function inspectionTasks(scenario,exercise) {
  return scenario.findings.filter(finding => finding.id !== 'label').map(finding => {
    const answer=exercise.answers[finding.id];
    const inspected=['documents','special-service'].includes(finding.id) || exercise.inspected.includes(finding.id);
    return {...finding,inspected,complete:inspected && answer?.choice===finding.correct && (finding.correct!=='unsatisfactory' || (answer.corrected === true && canConfirmVehicleCorrection(scenario,exercise,finding.id)))};
  });
}
export function jiEvidence(scenario,e,id) {
  if(id==='paperwork') return paperwork(scenario).every(d=>e.jiDocumentsViewed.includes(d.id));
  if(id==='markings') return ['left','right'].every(side=>e.jiSides.includes(side));
  if(id==='measurements') {
    const readings={...e,measurements:e.jiMeasurements,weights:e.jiWeights};
    return notebookFields(scenario).every(f=>viewedReading(scenario,readings,f)!==undefined);
  }
  return e.jiInspected.includes(id);
}
export function getTasks(scenario, stageId, exercise) {
  if (stageId==='precheck') return [{id:'dsoe',title:'Review the DSOE',hint:'Open View DSOE at the top of the CDF Process column and confirm this increment, its ULN and TCN, and the chalk\'s processing schedule.',local:true,complete:Boolean(exercise.dsoeViewed)},...(screenATTLA(scenario).reasons.length ? [{id:'attla-screening',title:'ATTLA screening review',local:true,hint:'Review threshold triggers and the scenario aircraft/loading disposition.',complete:exercise.attlaReviewed}] : []), ...paperwork(scenario).map(d=>({id:d.id,title:d.title,hint:d.required ? `Verify ${d.minimum} ${d.minimum===1?'copy':'copies'} with the increment monitor.` : 'Not applicable to this shipment; record 0 copies.',local:true,complete:!!exercise.documentsVerified[d.id] && (d.id!=='attla' || attlaReady(scenario,exercise))})), ...(hazdecRequired(scenario) ? [{id:'hazdec-review',title:'Review HAZDEC entries',hint:'Open the HAZDEC and compare each entry with the packing list and AFMAN 24-604: UN number against the proper shipping name, class or division, packing group, quantity, packing paragraph, cargo-aircraft-only limitation, and the signature.',local:true,complete:hazdecReady(scenario,exercise)}] : [])];
  if (stageId==='manifest') return [{id:'manifest-entry',title:'Manifest asset',hint:'Enter the asset from its paperwork and reconcile with verified Incheck readings.',local:true,complete:exercise.manifestAccepted && manifestMatches(scenario,exercise) && precheckComplete(scenario,exercise) && isStageComplete(scenario,'incheck',exercise)},{id:'msl',title:'Apply military shipping label',hint:'After the increment is manifested, print and apply the MSL to the piece.',local:true,complete:exercise.manifestAccepted && exercise.mslApplied}];
  if (stageId==='ji') {
    const ready=isStageComplete(scenario,'manifest',exercise);
    return [
      ...scenario.findings.map(f=>({id:f.id,title:`JI: ${f.title}`,local:true,hint:'Reinspect the prepared asset in the cargo bay, then verify it for this final inspection.',fresh:true,evidence:exercise.jiInspected.includes(f.id),complete:ready && exercise.jiInspected.includes(f.id) && exercise.jiVerified.includes(f.id)})),
      ...['paperwork','measurements',...(scenario.axles?['markings']:[])].map(id=>({id,title:`JI: ${id}`,local:true,hint:id==='measurements' ? 'Retake length, width, height, gross weight, and all applicable axle distances and weights using Tape measure and Scale. You do not need to re-record the notebook.' : id==='paperwork' ? 'Open each document in the paperwork packet again for this JI.' : 'Use Inspect, then inspect the left and right tape markings in the cargo bay.',fresh:true,evidence:jiEvidence(scenario,exercise,id),complete:ready && jiEvidence(scenario,exercise,id) && exercise.jiVerified.includes(id)})),
    ];
  }

  if (stageId === 'incheck') {
    const { length, width, height } = scenario;
    const dimension = (view, a, b) => hasMeasurement(exercise, view, a, b);
    return [
      { id: 'length', title: 'Record overall length', hint: 'Side view: measure between matching left and right corners.', complete: exercise.notebookEntries.length !== undefined && (dimension('side', { x: 0, y: 0 }, { x: length, y: 0 }) || dimension('side', { x: 0, y: height }, { x: length, y: height })) },
      { id: 'width', title: 'Record overall width', hint: 'Front view: measure between matching left and right corners.', complete: exercise.notebookEntries.width !== undefined && (dimension('front', { x: 0, y: 0 }, { x: width, y: 0 }) || dimension('front', { x: 0, y: height }, { x: width, y: height })) },
      { id: 'height', title: 'Record overall height', hint: 'Either view: measure vertically from a lower corner to its upper corner.', complete: exercise.notebookEntries.height !== undefined && ['side', 'front'].some(view => { const w = view === 'side' ? length : width; return [0, w].some(x => dimension(view, { x, y: 0 }, { x, y: height })); }) },
      { id: 'gross', title: 'Record gross scale weight', hint: 'Use Scale → Weigh whole piece.', complete: exercise.notebookEntries.gross === scenario.weight },
      ...(scenario.axles || []).flatMap((axle, index) => [
        { id: `${axle.id}-position`, title: `Record D${index + 1} — ${axle.title.toLowerCase()} datum distance`, hint: 'Side view: start at the lower-left forward datum and end at the axle center target.', complete: exercise.notebookEntries[`D${index + 1}`] === axle.position && dimension('side', { x: 0, y: height }, { x: axle.position, y: height }) },
        { id: `${axle.id}-weight`, title: `Record W${index + 1} (${axleCode(scenario,index)}) weight`, hint: 'Use the individual axle scale control.', complete: exercise.notebookEntries[`W${index + 1}`] === axle.weight },
      ]),
      ...(scenario.axles ? [...axleLabels(scenario).map(axle => axle.type),'cb'].map(type => ({ id: `tape-${type}`, title: `Apply ${type.toUpperCase()} tape on both sides`, hint: 'Use Labeling tape in Side view. Verify the written value and location on each vehicle side.', complete: ['left','right'].every(side => exercise.tapeLabels.some(label => label.side === side && label.type === type)) })) : []),
      ...inspectionTasks(scenario,exercise),
    ];
  }
  return [];
}

export function isStageComplete(scenario, stageId, exercise) {
  // A frustrated asset cannot be manifested or pass its joint inspection.
  if ((stageId === 'manifest' || stageId === 'ji') && isFrustrated(exercise)) return false;
  const tasks = getTasks(scenario, stageId, exercise);
  return tasks.length > 0 && tasks.every(task => task.complete);
}
