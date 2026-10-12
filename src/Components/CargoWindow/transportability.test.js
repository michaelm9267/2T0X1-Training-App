import { screenATTLA, packingListRequired, letterApplies } from './transportability';
import { scenarios } from './scenarios';
import { randomizeShipment } from './scenarioVariants';

test('screening thresholds are strict and do not themselves require certification',()=>{
 const base={length:240,width:96,height:96,weight:10000,axles:[{weight:5000,wheels:2,contactAreaPerWheel:50},{weight:5000,wheels:2,contactAreaPerWheel:50}],attla:{certificationRequired:false}};
 expect(screenATTLA(base).reasons).toHaveLength(0);
 for(const key of ['length','width','height','weight']) expect(screenATTLA({...base,[key]:base[key]+1}).reasons.length).toBeGreaterThan(0);
 const review=screenATTLA({...base,length:241});expect(review.certificationRequired).toBe(false);
 expect(screenATTLA({...base,axles:[{weight:5002,wheels:2,contactAreaPerWheel:50}]}).reasons.join(' ')).toMatch(/Axle.*Wheel.*pressure/);
});
test('configuration triggers and letters are checked separately',()=>{
 const s={length:100,width:50,height:50,weight:1000,attla:{certificationRequired:true,specialLoading:true,unfamiliarRailInterface:true,configurationId:'A',letter:{current:true,configurationId:'B',maxWeight:900,maxLength:100,maxWidth:50,maxHeight:50}}};
 expect(screenATTLA(s).reasons).toHaveLength(3);
 expect(letterApplies(s)).toBe(false);
 expect(letterApplies({...s,attla:{...s.attla,letter:{...s.attla.letter,configurationId:'A',maxWeight:1000}}})).toBe(true);
});
test('packing list follows cargo configuration',()=>{
 for(const type of ['consolidated','multiple-items','sealed-container','equipment-with-loose-items']) expect(packingListRequired({loadConfiguration:type})).toBe(true);
 for(const type of ['empty','single-equipment']) expect(packingListRequired({loadConfiguration:type})).toBe(false);
 expect(packingListRequired({id:'isu-90',loadConfiguration:'empty'})).toBe(true);
});
test('randomized three-axle shipment retains a valid applicable training letter',()=>{
 const template=scenarios.find(s=>s.id==='three-axle');
 for(const random of [()=>0,()=>.99]) {const s=randomizeShipment(template,template,random);expect(screenATTLA(s).certificationRequired).toBe(true);expect(letterApplies(s)).toBe(true);}
});
