import {dafi10403Bank} from './dafi10403Bank';
import {dafi24602v1Bank} from './dafi24602v1Bank';
import {dafi24602v2Bank} from './dafi24602v2Bank';
import {dafi24602v4Bank} from './dafi24602v4Bank';
import {dtrPart2Bank} from './dtrPart2Bank';
import {dtrPart3Bank} from './dtrPart3Bank';
import {dtrPart4Bank} from './dtrPart4Bank';
const banks = {dafi10403Bank,dafi24602v1Bank,dafi24602v2Bank,dafi24602v4Bank,dtrPart2Bank,dtrPart3Bank,dtrPart4Bank};
test.each(Object.entries(banks))('%s keeps the longest-choice strategy close to chance', (name, bank) => {
  // Random tie breaking avoids treating four equally long numeric choices as a 100% clue.
  const rate = bank.reduce((sum,q) => {
    const lengths = [q.answer,...q.wrong].map(s=>s.length), max = Math.max(...lengths);
    return sum + (lengths[0] === max ? 1 / lengths.filter(n=>n===max).length : 0);
  },0) / bank.length;
  expect(rate).toBeGreaterThanOrEqual(.22);
  expect(rate).toBeLessThanOrEqual(.28);
});
