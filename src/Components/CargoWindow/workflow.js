import { screenATTLA, packingListRequired, letterApplies } from './transportability';
import { recordMistake } from './mistakes';
export function paperwork(scenario) {
  const requirements=scenario.paperworkRequirements || {};
  const packing=packingListRequired(scenario);
  const hazdec=scenario.hasEngine===true || requirements.hazdec===true;
  const attla=screenATTLA(scenario).certificationRequired;
  // Copies the increment monitor brought; shipment variants may bring too few or forget one.
  const brought=(id,required,minimum)=>scenario.paperworkCopies?.[id] ?? (required?minimum:0);
  return [
    {id:'logmod',title:'LOGMOD paperwork',required:true,minimum:3,copies:brought('logmod',true,3)},
    {id:'logmod-placards',title:'LOGMOD placards',required:true,minimum:3,copies:brought('logmod-placards',true,3)},
    {id:'packing',title:'Packing list',required:packing,minimum:3,copies:brought('packing',packing,3)},
    {id:'hazdec',title:'HAZDEC',required:hazdec,minimum:3,copies:brought('hazdec',hazdec,3)},
    {id:'attla',title:'ATTLA',required:attla,minimum:1,copies:brought('attla',attla,1)},
  ];
}
// Ask the increment monitor for more copies; feedback tells whether the amount was right.
export function requestCopies(scenario,e,id,amount) {
  const document=paperwork(scenario).find(d=>d.id===id);
  const count=Number(amount);
  if(!document) return e;
  if(String(amount).trim()==='' || !Number.isInteger(count) || count<1) return {...e,documentFeedback:{...e.documentFeedback,[id]:'Enter how many additional copies are needed.'}};
  const available=e.documentCopies[id]??document.copies;
  const needed=document.required?Math.max(0,document.minimum-available):0;
  if(needed===0) return {...e,documentFeedback:{...e.documentFeedback,[id]:document.required?`No additional copies are needed; ${available} on hand meets the ${document.minimum} required.`:'This document is not required for this shipment.'}};
  const feedback=count<needed?`Received ${count}. Still short ${needed-count} ${needed-count===1?'copy':'copies'}.`:count>needed?`Received ${count}, but only ${needed} ${needed===1?'was':'were'} needed. Recount and verify.`:`Received ${count} ${count===1?'copy':'copies'}. Recount and verify.`;
  const next={...e,documentCopies:{...e.documentCopies,[id]:available+count},documentsVerified:{...e.documentsVerified,[id]:false},documentFeedback:{...e.documentFeedback,[id]:feedback},manifestAccepted:false,jiVerified:[]};
  return count===needed?next:recordMistake(next,'paperwork',`Requested ${count} ${document.title} ${count===1?'copy':'copies'} when ${needed} ${needed===1?'was':'were'} needed`,'DTR Part III App O K.2.d(1)–(2)');
}
// DoDAACs from the DoDAAC address file (FA5030 access list), offered in the CMOS-style manifest
// dropdowns. Each pairs with its aerial port: the APOD for overseas units, the APOE for CONUS ports.
export const DODAAC_INFO={
  FB5000:{port:'EDF',unit:'673 LRS LGRM',address:'5257 FINLETTER AVE',city:'JBER, AK 99506'},
  FB5294:{port:'OSN',unit:'51 LRS LGRDDC',address:'OSAN AB BLDG 824 SINJANG DONG',city:'PYEONGTAEK CITY, KR 17759'},
  FB5284:{port:'KUZ',unit:'8 LRS LGRD',address:'KUNSAN AB BLDG 823 RCVG SECT',city:'GUNSAN CITY, KR 54164'},
  FB5270:{port:'DNA',unit:'18 LRS LGRDDC',address:'KADENA AB BLDG 794 DOUGLAS BLVD',city:'KADENA AB OKINAWA, JP 904 0200'},
  FB5209:{port:'OKO',unit:'374 LRS LGRDDC',address:'BLDG 950 MCGUIRE ST',city:'YOKOTA AB, JP 197 0001'},
  FB5205:{port:'MSJ',unit:'35 LRS LGRD',address:'MISAWA AB BLDG 1334',city:'MISAWA CITY AOMORIKEN, JP 033 0012'},
  FB5240:{port:'UAM',unit:'36 LRS LGRM',address:'ANDERSEN AFB BLDG 18002',city:'YIGO, GU 96929'},
  FB5260:{port:'HIK',unit:'647 LRS LGRD',address:'75 A ST BLDG 1072',city:'JBPHH, HI 96853'},
  FB5612:{port:'RMS',unit:'86 LRS LGRDD',address:'RAMSTEIN AB BLDG 2127 TMO RCVG',city:'RAMSTEIN MIESENBACH, DE 66877'},
  FB5587:{port:'MHZ',unit:'48 FW LRS',address:'RAF LAKENHEATH BLDG 1035',city:'SUFFOLK, GB IP27 9PN'},
  FB4497:{port:'DOV',unit:'436 LRS LGRS',address:'639 EVREUX ST BLDG 639 DR 8',city:'DOVER AFB, DE 19902-5139'},
  FB4418:{port:'CHS',unit:'437 APS TRTD',address:'113 S BATES ST BLDG 178',city:'CHARLESTON AFB, SC 29404'},
  FB4427:{port:'SUU',unit:'60 APS TRC',address:'90 RAGSDALE ST BLDG 977',city:'TRAVIS AFB, CA 94535'},
  FB4479:{port:'TCM',unit:'62 APS TROT',address:'1180 LEVITOW BLVD BLDG 1180',city:'LEWIS MCCHORD, WA 98438'},
};
export const DODAAC_PORTS=Object.fromEntries(Object.entries(DODAAC_INFO).map(([dodaac,info])=>[dodaac,info.port]));
export const DODAACS=Object.keys(DODAAC_PORTS).sort();
// Every increment in the deployment moves from JBER (EDF) to one overseas destination, chosen
// for each deployment from these units. DESTINATION is the default when none is set.
export const ORIGIN='FB5000';
export const DESTINATIONS=['FB5294','FB5284','FB5270','FB5209','FB5205','FB5240','FB5260','FB5612','FB5587'];
export const DESTINATION='FB5294';
export const randomDestination=(random=Math.random)=>DESTINATIONS[Math.floor(random()*DESTINATIONS.length)];
export const AERIAL_PORTS=[...new Set(Object.values(DODAAC_PORTS))].sort();
export const HAZ_INDICATORS=['N - Non-hazardous','H - Hazardous material','A - Ammunition/explosives','O - Other'];
export const isHazardousIndicator=value=>Boolean(value) && !String(value).startsWith('N');
// Increment-format TCN (17 characters), as in CMOS for Doc Type I - Increment:
// F (Air Force) + ULN (5) + $$ + increment number (E + 4) + 00 + XX (partial/split codes).
export const incrementTcn=(uln,increment)=>`F${String(uln).padStart(5,'0')}$$E${increment}00XX`;
export const tcnUln=tcn=>tcn.slice(1,6);
export const tcnIncrement=tcn=>tcn.slice(8,13);
const increments={'rolling-stock':1001,'isu-90':1002,'463l-pallet':1003,'three-axle':1004,'age-generator':1005,'mj1-jammer':1006};
export function manifestFields(scenario) {
  const increment=increments[scenario.id] || 1009;
  const destination=scenario.destination || DESTINATION;
  return [
    {id:'tcn',title:'Transportation Control Number (TCN)',expected:scenario.tcn || incrementTcn(1,increment)},
    {id:'description',title:'Nomenclature',expected:scenario.subtitle},
    {id:'pieces',title:'Piece count',expected:1},
    {id:'origin',title:'Origin DoDAAC',expected:ORIGIN,options:DODAACS},
    {id:'apoe',title:'APOE',expected:DODAAC_PORTS[ORIGIN],options:AERIAL_PORTS},
    {id:'destination',title:'Destination DoDAAC',expected:destination,options:DODAACS},
    {id:'apod',title:'APOD',expected:DODAAC_PORTS[destination],options:AERIAL_PORTS},
    ...['length','width','height','weight'].map(id=>({id,title:id==='weight'?'Gross weight (lb)':`${id[0].toUpperCase()+id.slice(1)} (in)`,expected:scenario[id]})),
    {id:'hazmat',title:'Hazardous/Ammunition Ind',expected:paperwork(scenario).some(d=>d.id==='hazdec' && d.required)?'H - Hazardous material':'N - Non-hazardous',options:HAZ_INDICATORS},
  ];
}
export function verifyPaperwork(scenario,exercise,id,value) {
  const document=paperwork(scenario).find(d=>d.id===id);
  if (!document || !exercise.documentsViewed.includes(id)) return exercise;
  const count=Number(value);
  const correct=String(value).trim()!=='' && Number.isInteger(count) && count=== (exercise.documentCopies[id] ?? document.copies) && (!document.required || count>=document.minimum) && (id!=='attla' || !document.required || (exercise.attlaReviewed && exercise.attlaLetterVerified && letterApplies(scenario)));
  const verified={...exercise,documentsVerified:{...exercise.documentsVerified,[id]:correct},documentFeedback:{...exercise.documentFeedback,[id]:correct ? 'Verified.' : id==='attla' && document.required && (!exercise.attlaReviewed || !exercise.attlaLetterVerified || !letterApplies(scenario)) ? 'Complete the review and verify an applicable current ATTLA letter before confirming copies.' : 'Count the available copies. Request missing copies when required; use 0 for not applicable.'}};
  return correct || String(value).trim()==='' ? verified : recordMistake(verified,'paperwork',`${document.title} verification failed (entered ${value})`,'DTR Part III App O K.2.d(1)–(2)');
}
export function attlaReady(s,e) {return !screenATTLA(s).certificationRequired || (e.attlaReviewed && e.attlaLetterVerified && letterApplies(s));}
// Precheck starts from the DSOE, then verifies the paperwork packet.
export function precheckComplete(scenario,e) {return Boolean(e.dsoeViewed) && attlaReady(scenario,e) && hazdecReady(scenario,e) && paperwork(scenario).every(d=>e.documentsVerified[d.id]) && (screenATTLA(scenario).reasons.length===0 || e.attlaReviewed);}
// HAZDEC line-by-line review (AFMAN 24-604): required whenever the piece needs a HAZDEC.
export const hazdecRequired=scenario=>paperwork(scenario).some(d=>d.id==='hazdec'&&d.required);
export function hazdecReady(scenario,e) {return !hazdecRequired(scenario) || (Boolean(e.hazdecReviewed) && !scenario.hazdecError);}
export function reviewHazdec(scenario,e) {
  if(scenario.hazdecError) return recordMistake({...e,hazdecReviewed:false,hazdecFeedback:'Recheck the HAZDEC against the packing list and AFMAN 24-604 before accepting it.'},'paperwork','Accepted a HAZDEC that has an error','AFMAN 24-604 / TM 38-250');
  return {...e,hazdecReviewed:true,hazdecFeedback:'HAZDEC entries reviewed and accepted.'};
}
// Manifest fields whose entries differ from the shipment paperwork.
export function manifestMismatches(scenario,e) {
  return manifestFields(scenario).filter(f=>!(typeof f.expected==='number' ? String(e.manifestDraft[f.id]??'').trim()!=='' && Number(e.manifestDraft[f.id])===f.expected : String(e.manifestDraft[f.id]??'').trim().toLowerCase()===String(f.expected).toLowerCase()));
}
export function manifestMatches(scenario,e) { return manifestMismatches(scenario,e).length===0; }
// Shipment Planning tab holding each field outside the main header.
const MANIFEST_TABS={weight:'Pieces',length:'Pieces',width:'Pieces',height:'Pieces',hazmat:'Indicators'};
export const manifestTab=id=>MANIFEST_TABS[id];
// Removing the piece unlocks its entries and withdraws the MSL and any JI progress.
export function removeFromManifest(e) {
  if(!e.manifestAccepted) return e;
  return {...e,manifestAccepted:false,mslApplied:false,manifestRecord:null,manifestErrors:[],manifestFeedback:'Piece removed from the manifest. Correct the entries and add it again.',jiVerified:[],jiInspected:[],jiDocumentsViewed:[],jiMeasurements:[],jiWeights:{},jiSides:[],jiTerminals:{}};
}
export function saveManifest(scenario,e,incheckComplete=false) {
  if (e.manifestAccepted) return e;
  if ((e.frustrations||[]).some(entry=>!entry.released)) return {...e,manifestAccepted:false,manifestFeedback:'Asset is frustrated. Fix and release every frustration reason before adding it to the manifest.'};
  const ready=precheckComplete(scenario,e)&&incheckComplete;
  const mismatches=ready?manifestMismatches(scenario,e):[];
  const accepted=ready&&mismatches.length===0;
  const names=mismatches.map(f=>manifestTab(f.id)?`${f.title} (${manifestTab(f.id)} tab)`:f.title);
  const saved={...e,manifestAccepted:accepted,mslApplied:false,manifestRecord:accepted?{...e.manifestDraft}:null,manifestErrors:mismatches.map(f=>f.id),manifestFeedback:!ready?'Complete Precheck and Incheck before accepting the manifest.':accepted?'Piece added to manifest.':`${names.length===1?'This entry does':'These entries do'} not match the shipment paperwork: ${names.join(', ')}.`};
  return ready&&!accepted?recordMistake(saved,'manifest',`Manifest entries did not match: ${names.join(', ')}`,'DTR Part II App L (TCN) · App M (TCMD)'):saved;
}
