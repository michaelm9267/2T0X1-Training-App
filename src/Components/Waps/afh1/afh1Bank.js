import { afh1Chapters } from './afh1Meta';
import ch01 from './ch01';
import ch02 from './ch02';
import ch03 from './ch03';
import ch04 from './ch04';
import ch05 from './ch05';
import ch06 from './ch06';
import ch07 from './ch07';
import ch08 from './ch08';
import ch09 from './ch09';
import ch10 from './ch10';
import ch11 from './ch11';
import ch12 from './ch12';
import ch13 from './ch13';
import ch14 from './ch14';
import ch15 from './ch15';
import ch16 from './ch16';
import ch17 from './ch17';
import ch18 from './ch18';
import ch19 from './ch19';
import ch20 from './ch20';
import ch21 from './ch21';
import ch22 from './ch22';
import ch23 from './ch23';
import ch24 from './ch24';
import att from './att';

// The PDG (AFH 1, Airman) question bank, one file of rows per chapter.
// Row: [paragraph, section, kind, question, answer, three wrong answers]. kind is the ADTC
// comprehension level the question exercises (A recall, B understanding, C applying).
const rowsByChapter = {
  c01: ch01, c02: ch02, c03: ch03, c04: ch04, c05: ch05, c06: ch06,
  c07: ch07, c08: ch08, c09: ch09, c10: ch10, c11: ch11, c12: ch12,
  c13: ch13, c14: ch14, c15: ch15, c16: ch16, c17: ch17, c18: ch18,
  c19: ch19, c20: ch20, c21: ch21, c22: ch22, c23: ch23, c24: ch24,
  att,
};

export const afh1Rows = Object.values(rowsByChapter).flat();

const toItem = ([ref, section, kind, question, answer, wrong]) => ({
  id: `AFH1|${ref}|${question}`, ref, section, kind, question, answer, wrong,
  publication: 'AFH 1', passageSet: 'afh1',
});

// Study sets for one rank: a set per chapter that has questions, each section labelled with the
// comprehension level the ADTC requires for that rank. A rank only gets questions at or below its
// level, so the C (applying) questions written for TSgt stay out of the SSgt study set.
export function afh1Sets(rankId) {
  return afh1Chapters.filter(chapter => rowsByChapter[chapter.id]?.length).map(chapter => {
    const sections = chapter.sections.map(section => ({
      id: section.id, label: section.id.replace(/^ATT/, 'Atch '), title: section.title, level: section.levels[rankId],
    }));
    const levels = Object.fromEntries(sections.map(section => [section.id, section.level]));
    return {
      id: `afh1-${chapter.id}`,
      publication: chapter.number ? `Chapter ${chapter.number}` : 'Attachments',
      title: chapter.title,
      scope: `AFH 1, ${sections.map(s => s.id.startsWith('ATT') ? `Attachment ${s.id.slice(3)}` : `Section ${s.id}`).join(', ')}`,
      bank: rowsByChapter[chapter.id].filter(([, section, kind]) => kind <= levels[section]).map(row => ({ ...toItem(row), setId: `afh1-${chapter.id}` })),
      sections,
      leveled: true,
    };
  });
}
