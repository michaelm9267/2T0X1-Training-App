import { paperwork, incrementTcn } from './workflow';
import { applyDiscrepancies } from './discrepancies';
// Practice variants: each reset varies the item's approximate real size and weight by a few
// percent, like differences in configuration, fuel, and load. All scene and worksheet values
// come from this one shipment snapshot until its next reset. Each reset also decides which
// discrepancies are present; forced pins chosen ones on or off (see discrepancies.js).
export function randomizeShipment(template, previous, random = Math.random, forced = {}) {
  function changed(base, old, spread, step = 1) {
    const low = Math.round(base * (1-spread) / step);
    const high = Math.round(base * (1+spread) / step);
    let units = low + Math.floor(random() * (high-low+1));
    units = Math.min(high,units);
    if (units*step === old) units = units === high ? low : units+1;
    return units*step;
  }
  const next = {...template};
  // New fictional increment-format TCN and paperwork date.
  next.documentDay = 1 + Math.floor(random() * 365);
  const uln = 1 + Math.floor(random() * 99999);
  let increment = 1001 + Math.floor(random() * 8999);
  if (incrementTcn(uln, increment) === previous.tcn) increment = increment === 9999 ? 1001 : increment + 1;
  next.tcn = incrementTcn(uln, increment);
  if (template.axles) {
    next.length = changed(template.length,previous.length,.03);
    next.width = changed(template.width,previous.width,.03);
    next.height = changed(template.height,previous.height,.04);
    if (template.kind === 'generator') {
      next.exhaustHeight = changed(template.exhaustHeight,previous.exhaustHeight,.5);
      const bodyHeight = changed(template.height-template.exhaustHeight,previous.height-previous.exhaustHeight,.04);
      next.height = bodyHeight + next.exhaustHeight;
      if (next.height === previous.height) next.height += 1;
    }
    next.axles = template.axles.map((axle,index) => ({...axle,
      position: Math.round(axle.position/template.length * next.length),
      weight: changed(axle.weight,previous.axles[index].weight,.08,50),
    }));
    // The front axle carries the engine or boom, so it stays the heaviest.
    const heaviestOther = Math.max(...next.axles.slice(1).map(axle => axle.weight));
    if (next.axles[0].weight <= heaviestOther) next.axles[0].weight = heaviestOther + 100;
    if (next.axles[0].weight === previous.axles[0].weight) next.axles[0].weight += 50;
    next.axles.forEach((axle,index) => {
      if (axle.position === previous.axles[index].position) axle.position += next.length > previous.length ? 1 : -1;
    });
    next.weight = next.axles.reduce((sum,axle)=>sum+axle.weight,0);
    // Different axle combinations can otherwise happen to give the same total.
    if (next.weight === previous.weight) {
      const delta = next.axles[0].weight + 50 === previous.axles[0].weight ? 100 : 50;
      next.axles[0].weight += delta; next.weight += delta;
    }
    // Stay within the axle limits of the piece's ATTLA certification letter.
    const limits = template.attla?.letter?.maxAxle;
    if (limits) {
      next.axles.forEach((axle, index) => {
        if (!limits[index] || axle.weight <= limits[index]) return;
        axle.weight = limits[index] - (limits[index] === previous.axles[index].weight ? 50 : 0);
      });
      next.weight = next.axles.reduce((sum, axle) => sum + axle.weight, 0);
    }
  } else {
    next.weight = changed(template.weight,previous.weight,.2,50);
    if (template.id === '463l-pallet') next.height = changed(template.height,previous.height,.2);
  }
  Object.assign(next, applyDiscrepancies(template, random, forced));
  next.paperworkCopies = 'doc-copies' in forced && !forced['doc-copies'] ? {} : bringPaperwork(next, forced['doc-copies'] ? () => 0 : random);
  return next;
}

// Copies the increment monitor brings. One time in three, one required document arrives
// with too few copies (0 means it was forgotten altogether).
export function bringPaperwork(shipment, random = Math.random) {
  if (random() >= 1/3) return {};
  const required = paperwork({...shipment,paperworkCopies:{}}).filter(d => d.required);
  const document = required[Math.floor(random() * required.length) % required.length];
  return { [document.id]: Math.floor(random() * document.minimum) % document.minimum };
}
