import { findPassage } from './RegulationPassage';
import { dafi10403Bank } from './dafi10403Bank';
import { dafi24602v2Bank } from './dafi24602v2Bank';
import { dafi24602v1Bank } from './dafi24602v1Bank';
import { dafi24602v4Bank } from './dafi24602v4Bank';
import { dtrPart2Bank } from './dtrPart2Bank';
import { dtrPart3Bank } from './dtrPart3Bank';
import { dtrPart4Bank } from './dtrPart4Bank';
import dafi10403 from './passages/dafi10403.json';
import dafi24602v2 from './passages/dafi24602v2.json';
import dafi24602v1 from './passages/dafi24602v1.json';
import dafi24602v4 from './passages/dafi24602v4.json';
import dtrPart2 from './passages/dtrPart2.json';
import dtrPart3 from './passages/dtrPart3.json';
import dtrPart4 from './passages/dtrPart4.json';

// If a bank question or citation changes, rebuild the passages with scripts/build_waps_passages.py.
test.each([
  ['DAFI 10-403', dafi10403Bank, dafi10403],
  ['DAFI 24-602V2', dafi24602v2Bank, dafi24602v2],
  ['DAFI 24-602V1', dafi24602v1Bank, dafi24602v1],
  ['DAFI 24-602V4', dafi24602v4Bank, dafi24602v4],
  ['DTR Part II', dtrPart2Bank, dtrPart2],
  ['DTR Part III', dtrPart3Bank, dtrPart3],
  ['DTR Part IV', dtrPart4Bank, dtrPart4],
])('every %s question has the exact passage for its citation', (name, bank, data) => {
  bank.forEach(item => {
    const passage = findPassage(data, item);
    expect(passage).toEqual(expect.objectContaining({ quote: expect.any(String), page: expect.any(Number), edition: expect.any(String) }));
  });
});

test('a passage is the cited paragraph in the publication\'s own words', () => {
  const item = dtrPart4Bank.find(row => row.ref === 'Ch A-402, para C.2.c(5)');
  const passage = findPassage(dtrPart4, item);
  expect(passage.quote).toContain('(5) Code 2 Transit Times: PPSOs must add five (5) days to the standard domestic transit time for Code 2 shipments due to additional logistical requirements.');
  expect(passage.edition).toBe('14 July 2026');
});
