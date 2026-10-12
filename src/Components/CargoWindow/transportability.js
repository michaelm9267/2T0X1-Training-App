// User-supplied training screening criteria; official paragraph verification
// remains pending. Crossing a threshold initiates review, not certification.
export function screenATTLA(s) {
  const reasons=[];
  for(const [id,limit,label] of [['length',240,'Length > 20 ft'],['width',96,'Width > 8 ft'],['height',96,'Height > 8 ft'],['weight',10000,'Gross weight > 10,000 lb']]) if(s[id]>limit) reasons.push(label);
  for(const [index,axle] of (s.axles||[]).entries()) {
    if(axle.weight>5000) reasons.push(`Axle ${index+1} load > 5,000 lb`);
    // Equal left/right loading is an explicit fictional scenario assumption.
    if(axle.wheels>0) {
      const wheel=axle.weight/axle.wheels;
      if(wheel>2500) reasons.push(`Wheel load at axle ${index+1} > 2,500 lb`);
      if(axle.contactAreaPerWheel>0 && wheel/axle.contactAreaPerWheel>50) reasons.push(`Floor contact pressure at axle ${index+1} > 50 PSI`);
    }
  }
  if(s.floorContactPressure>50) reasons.push('Floor contact pressure > 50 PSI');
  if(s.attla?.specialLoading) reasons.push('Special loading or securing procedures');
  if(s.attla?.unfamiliarRailInterface) reasons.push('Unfamiliar aircraft rail interface');
  if(s.attla?.letter && s.weight>s.attla.letter.maxWeight) reasons.push('Existing ATTLA letter weight limit exceeded');
  return {reasons,certificationRequired:s.attla?.certificationRequired===true || s.paperworkRequirements?.attla===true};
}
// A letter applies when it is current, matches the configuration, and the item is within its
// gross weight, any dimension limits it sets, and any per-axle limits it sets.
export function letterApplies(s) {
  const letter=s.attla?.letter;
  if(!letter?.current || letter.configurationId!==s.attla.configurationId || !Number.isFinite(letter.maxWeight) || s.weight>letter.maxWeight) return false;
  if(['Length','Width','Height'].some(key=>Number.isFinite(letter[`max${key}`]) && s[key.toLowerCase()]>letter[`max${key}`])) return false;
  return (letter.maxAxle||[]).every((limit,index)=>!s.axles?.[index] || s.axles[index].weight<=limit);
}
export function packingListRequired(s) {
  if(s.id==='isu-90') return true;
  if(s.loadConfiguration) return ['consolidated','multiple-items','sealed-container','equipment-with-loose-items'].includes(s.loadConfiguration);
  return s.paperworkRequirements?.packing===true;
}
