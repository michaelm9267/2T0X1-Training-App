import {readProgress, saveProgress} from './wapsStorage';
import { onSave } from '../../cloudBridge';
beforeEach(() => localStorage.clear());
test('legacy exams migrate into the account-synced snapshot', () => {
  const exam = {position:0, items:[{id:'a',question:'Q',answer:'A',choices:['A','B','C','D']}],startedAt:1,endsAt:null,answers:{},flagged:[]};
  localStorage.setItem('waps-exam-e5', JSON.stringify(exam));
  expect(readProgress('e5').exam).toEqual(exam);
});
test('malformed saved cards/tests recover to usable empty progress', () => {
  localStorage.setItem('waps-progress-e5', '{"cards":null,"tests":null}');
  expect(readProgress('e5')).toMatchObject({cards: {}, tests: []});
});
test('every save persists and publishes WAPS snapshot with a local change timestamp', () => {
  const calls = []; const off = onSave((...args) => calls.push(args));
  saveProgress('e5', {cards: {}, tests: [], reports: []}); off();
  expect(calls[0][0]).toBe('waps');
  expect(JSON.parse(localStorage.getItem('waps-progress-e5'))).toMatchObject({cards: {}, tests: []});
  expect(JSON.parse(localStorage.getItem('transit-iq-cloud')).waps).toBeGreaterThan(0);
});
test('malformed history members and incomplete saved exams are discarded', () => {
  localStorage.setItem('waps-progress-e5', JSON.stringify({cards: {bad:null},tests:[null,{}, {at:1,total:10,right:3}], reports:[null],exam:{}}));
  const p = readProgress('e5');
  expect(p.tests).toEqual([{at:1,total:10,right:3}]);
  expect(p.cards).toEqual({}); expect(p.reports).toEqual([]); expect(p.exam).toBeNull();
});
