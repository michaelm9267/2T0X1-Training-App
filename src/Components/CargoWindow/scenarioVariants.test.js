import { scenarios } from './scenarios';
import { randomizeShipment, bringPaperwork } from './scenarioVariants';
import { calculateCB } from './centerOfBalance';
import { paperwork } from './workflow';

test('reset changes vehicle dimensions and maintains consistent axle weights and geometry', () => {
  for (const template of scenarios.filter(item => item.axles)) {
    let previous = template;
    for (let i=0;i<30;i++) {
      const next = randomizeShipment(template,previous,() => i/30);
      for (const key of ['length','width','height']) expect(next[key]).not.toBe(previous[key]);
      expect(next.weight).toBe(next.axles.reduce((sum,axle)=>sum+axle.weight,0));
      next.axles.forEach((axle,index) => { expect(axle.position).not.toBe(previous.axles[index].position); expect(axle.weight).not.toBe(previous.axles[index].weight); expect(axle.position).toBeGreaterThan(index ? next.axles[index-1].position : 0); expect(axle.position).toBeLessThan(next.length); });
      const cb=calculateCB(next.axles.map(axle=>({distance:axle.position,weight:axle.weight})),next.weight);
      expect(cb.error).toBeUndefined();
      expect(cb.exact).toBeGreaterThanOrEqual(next.axles[0].position);
      expect(cb.exact).toBeLessThanOrEqual(next.axles.at(-1).position);
      for (const axle of next.axles.slice(1)) expect(next.axles[0].weight).toBeGreaterThan(axle.weight);
      for (const key of ['length','width','height']) expect(Math.abs(next[key]-template[key])/template[key]).toBeLessThanOrEqual(.1);
      previous=next;
    }
    expect(template.axles).toEqual(scenarios.find(item=>item.id===template.id).axles);
  }
});
test('standard container and pallet footprints stay fixed; load values vary', () => {
  for (const template of scenarios.filter(item=>!item.axles)) {
    const next=randomizeShipment(template,template,()=>0);
    expect(next.length).toBe(template.length); expect(next.width).toBe(template.width);
    expect(next.weight).not.toBe(template.weight);
    expect(next.height === template.height).toBe(template.id==='isu-90');
  }
});
test('AGE generator has two axles and its own visual type', () => {
  const generator=scenarios.find(item=>item.id==='age-generator');
  expect(generator.kind).toBe('generator'); expect(generator.axles).toHaveLength(2);
});

test('generator exhaust varies and is included in overall height', () => {
  const template=scenarios.find(item=>item.id==='age-generator');
  const next=randomizeShipment(template,template,()=>0);
  expect(next.exhaustHeight).not.toBe(template.exhaustHeight);
  expect(next.exhaustHeight).toBeGreaterThan(0);
  expect(next.height-next.exhaustHeight).toBeGreaterThan(50);
});

test('reset issues a new 17-character TCN each time', () => {
  for (const template of scenarios) {
    let previous = template;
    for (let i=0;i<20;i++) {
      const next = randomizeShipment(template,previous,() => (i % 3) / 3);
      expect(next.tcn).toMatch(/^F\d{5}\$\$E\d{4}00XX$/);
      expect(next.tcn).not.toBe(previous.tcn);
      previous = next;
    }
  }
});

test('one packet in three brings a short or forgotten document', () => {
  const sequence = values => { let i = 0; return () => values[i++]; };
  const isu = scenarios.find(item => item.id === 'isu-90');
  expect(bringPaperwork(isu, sequence([.34]))).toEqual({});
  expect(bringPaperwork(isu, sequence([.1, 0, 0]))).toEqual({ logmod: 0 });
  expect(bringPaperwork(isu, sequence([.1, .6, .5]))).toEqual({ hazdec: 1 });
  expect(bringPaperwork(isu, sequence([.1, .99, .5]))).toEqual({ attla: 0 });
  const reset = randomizeShipment(isu, isu, () => .5);
  expect(paperwork(reset).every(d => !d.required || d.copies === d.minimum)).toBe(true);
});

test('resets keep axle weights within the ATTLA letter limits', () => {
  for (const template of scenarios.filter(item => item.attla?.letter?.maxAxle)) {
    for (const value of [0, .5, .99]) {
      const next = randomizeShipment(template, template, () => value);
      next.axles.forEach((axle, index) => expect(axle.weight).toBeLessThanOrEqual(template.attla.letter.maxAxle[index]));
      expect(next.weight).toBe(next.axles.reduce((sum, axle) => sum + axle.weight, 0));
    }
  }
});
