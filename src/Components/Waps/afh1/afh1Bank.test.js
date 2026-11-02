import { afh1Rows, afh1Sets } from './afh1Bank';
import { afh1Chapters } from './afh1Meta';
import { findPassage } from '../RegulationPassage';
import passages from '../passages/afh1.json';

const sections = Object.fromEntries(afh1Chapters.flatMap(chapter => chapter.sections.map(section => [section.id, section])));
const items = afh1Sets('e5').flatMap(set => set.bank);
const tsgtItems = afh1Sets('e6').flatMap(set => set.bank);

test('every PDG question has four distinct choices and a unique id', () => {
  expect(new Set(tsgtItems.map(item => item.id)).size).toBe(tsgtItems.length);
  tsgtItems.forEach(item => {
    expect(item.wrong).toHaveLength(3);
    expect(new Set([item.answer, ...item.wrong]).size).toBe(4);
  });
});

test('every PDG question sits in a testable section and does not exceed the TSgt ADTC level', () => {
  afh1Rows.forEach(([ref, section, kind]) => {
    expect(sections[section]).toBeDefined();
    expect(['A', 'B', 'C', 'D']).toContain(kind);
    expect(kind <= sections[section].levels.e6).toBe(true);
    expect(ref.startsWith(section.startsWith('ATT') ? `Atch ${section.slice(3)}` : section.replace(/[A-Z]+$/, ''))).toBe(true);
  });
});

test('each rank studies only questions at or below its ADTC level', () => {
  items.forEach(item => expect(item.kind <= sections[item.section].levels.e5).toBe(true));
  expect(tsgtItems.length).toBeGreaterThan(items.length);
  // Every section the ADTC raises for TSgt has questions written at the TSgt level.
  Object.values(sections).filter(section => section.levels.e6 > section.levels.e5).forEach(section => {
    expect(tsgtItems.some(item => item.section === section.id && item.kind === section.levels.e6)).toBe(true);
  });
});

test('every PDG question has the exact AFH 1 passage for its citation', () => {
  tsgtItems.forEach(item => expect(findPassage(passages, item)).toEqual(expect.objectContaining({ quote: expect.any(String), edition: '15 February 2025' })));
});

test.each([['SSgt', items], ['TSgt', tsgtItems]])('%s: the correct answer is the longest choice about as often as chance (22-28%%)', (rank, bank) => {
  let longest = 0;
  bank.forEach(item => {
    const lengths = [item.answer, ...item.wrong].map(choice => choice.length);
    const max = Math.max(...lengths);
    if (lengths[0] === max) longest += 1 / lengths.filter(length => length === max).length;
  });
  const rate = longest / bank.length;
  expect(rate).toBeGreaterThanOrEqual(0.22);
  expect(rate).toBeLessThanOrEqual(0.28);
});
