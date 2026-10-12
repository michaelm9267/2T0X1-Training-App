import { decodeScenario, encodeScenario, seededRandom, sessionFromScenario } from './scenarioCode';

test('scenario codes round-trip the instructor settings', () => {
  const settings = { seed: 12345, pieceCount: 8, destination: 'FB5612', mode: 'test', forced: { 'isu-90': { 'loose-case': true, access: false } } };
  const code = encodeScenario(settings);
  expect(code).toMatch(/^CDF-[A-Za-z0-9_-]+$/);
  expect(decodeScenario(code)).toEqual(settings);
  expect(decodeScenario('CDF-not-a-code')).toBeNull();
  expect(decodeScenario(encodeScenario({ ...settings, pieceCount: 40 }))).toBeNull();
});

test('the same code builds the same deployment, with pinned discrepancies applied', () => {
  const settings = { seed: 99, pieceCount: 6, destination: null, mode: 'guided', forced: { 'isu-90': { 'loose-case': false, access: true } } };
  const a = sessionFromScenario(settings), b = sessionFromScenario(settings);
  const strip = session => Object.values(session.shipments).map(({ length, width, height, weight, tcn, findings, docErrors }) => ({ length, width, height, weight, tcn, findings: findings.map(f => f.correct), docErrors }));
  expect(strip(a)).toEqual(strip(b));
  expect(a.destination).toBe(b.destination);
  const isu = a.shipments['isu-90'];
  expect(isu.findings.find(f => f.id === 'loose-case').correct).toBe('satisfactory');
  expect(isu.findings.find(f => f.id === 'access').correct).toBe('unsatisfactory');
  expect(a.mode).toBe('guided');
  const r = seededRandom(5), s = seededRandom(5);
  expect([r(), r(), r()]).toEqual([s(), s(), s()]);
});
