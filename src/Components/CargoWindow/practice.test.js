import { newPracticeSession, CDF_SECTIONS } from './practice';
import { isStageComplete } from './exercise';
import { withDocumentErrors } from './discrepancies';
import { checkPlan, autoPlan, planBasis } from '../LoadPlan/loadPlanLogic';
import { scenarios } from './scenarios';
import { seededRandom } from '../Session/scenarioCode';

const STAGES = ['precheck', 'incheck', 'manifest', 'ji'];
const view = (session, key) => withDocumentErrors({ ...session.shipments[key], destination: session.destination }, session.exercises[key]);

test('each practice section starts with every earlier stage done correctly and nothing recorded', () => {
  CDF_SECTIONS.forEach((section, index) => {
    for (const seed of [1, 2, 3]) {
      const session = newPracticeSession({ section, random: seededRandom(seed * 10 + index) });
      const keys = Object.keys(session.shipments).slice(0, session.pieceCount);
      expect(session.pieceCount).toBe(['load-plan', 'departure'].includes(section) ? 6 : 1);
      expect([session.stepId, session.scenarioId]).toEqual([section, keys[0]]);
      const done = { precheck: [], incheck: ['precheck'], manifest: ['precheck', 'incheck'], 'load-plan': ['precheck', 'incheck', 'manifest'], ji: ['precheck', 'incheck', 'manifest'], departure: STAGES }[section];
      keys.forEach(key => {
        done.forEach(stage => expect([key, stage, isStageComplete(view(session, key), stage, session.exercises[key])]).toEqual([key, stage, true]));
        STAGES.filter(stage => !done.includes(stage)).forEach(stage => expect(isStageComplete(view(session, key), stage, session.exercises[key])).toBe(false));
        expect(session.exercises[key].mistakes).toEqual([]);
      });
      const basis = planBasis(keys.map(key => ({ ...session.shipments[key], key, manifested: isStageComplete(view(session, key), 'manifest', session.exercises[key]) })));
      expect(session.loadPlan.accepted && session.loadPlan.basis === basis).toBe(['ji', 'departure'].includes(section));
    }
  });
});

test('the automatic load plan fits the whole chalk inside the floor and CB limits', () => {
  const pieces = scenarios.map(s => ({ ...s, key: s.id }));
  expect(checkPlan(pieces, autoPlan(pieces)).problems).toEqual([]);
  expect(checkPlan(pieces.slice(0, 1), autoPlan(pieces.slice(0, 1))).problems).toEqual([]);
});
