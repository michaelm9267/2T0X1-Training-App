import {splitPayload, joinPayload} from './wapsPayload';
test('large unicode snapshots split below Firestore limits and restore exactly', () => {
  const value = JSON.stringify({reports: '😀'.repeat(400000)});
  const parts = splitPayload(value, 'g1');
  expect(parts.length).toBeGreaterThan(1);
  parts.forEach(p=>expect(Buffer.byteLength(p.data,'utf8')).toBeLessThan(900000));
  expect(joinPayload(parts,{generation:'g1',parts:parts.length})).toBe(value);
});
test('a concurrent generation is detected for retry instead of mixing account snapshots', () => {
  expect(()=>joinPayload([{data:'one',generation:'old'}],{generation:'new',parts:1})).toThrow(/changed/i);
});
