// Reproducible structural/length diagnostics. Semantic review is recorded separately in
// docs/reference/waps-audit-*.json; this command never infers correctness from text matching.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
const names = ['dafi10403','dafi24602v1','dafi24602v2','dafi24602v4','dtrPart2','dtrPart3','dtrPart4'];
let failed = false;
const ids = new Set();
const results = names.map(name => {
  const source = fs.readFileSync(path.join(root, 'src/Components/Waps', `${name}Bank.js`), 'utf8');
  const context = {};
  vm.runInNewContext(source.replace(/export const /g, 'const ') + `\nglobalThis.bank = ${name}Bank;`, context);
  const passages = JSON.parse(fs.readFileSync(path.join(root, 'src/Components/Waps/passages', `${name}.json`)));
  const audit = JSON.parse(fs.readFileSync(path.join(root, 'docs/reference', `waps-audit-${name}.json`)));
  const reviewed = new Map(audit.questions.map(q => [q.id, q]));
  const errors = []; let weighted = 0, strict = 0, wordWeighted = 0;
  context.bank.forEach(q => {
    if (ids.has(q.id)) errors.push(`duplicate id: ${q.id}`); ids.add(q.id);
    const choices = [q.answer, ...q.wrong];
    if (choices.length !== 4 || new Set(choices).size !== 4) errors.push(`invalid choices: ${q.id}`);
    const passage = passages.questions[`${q.ref}|${q.question}`] || passages.refs[q.ref];
    if (!passage?.quote || !Number.isFinite(passage.page)) errors.push(`missing passage: ${q.id}`);
    const decision = reviewed.get(q.id);
    if (!decision || decision.status !== 'verified') errors.push(`semantic review unresolved: ${q.id}`);
    if (decision?.ref !== q.ref || (decision?.question && decision.question !== q.question)) errors.push(`stem or citation changed since review: ${q.id}`);
    if (decision?.answer !== q.answer) errors.push(`answer changed since review: ${q.id}`);
    const wrong = decision?.wrong || decision?.distractors?.map(d=>d.choice);
    if (JSON.stringify(wrong) !== JSON.stringify(q.wrong)) errors.push(`distractors changed since review: ${q.id}`);
    const lengths = choices.map(c=>c.length), max = Math.max(...lengths), ties = lengths.filter(n=>n===max).length;
    if (lengths[0] === max) {weighted += 1/ties; if (ties===1) strict += 1;}
    const words = choices.map(c=>c.trim().split(/\s+/).length), longest = Math.max(...words);
    if (words[0] === longest) wordWeighted += 1/words.filter(n=>n===longest).length;
  });
  const rate = weighted/context.bank.length;
  if (rate < .22 || rate > .28) errors.push(`longest-answer strategy outside22–28%: ${rate}`);
  if (errors.length) failed = true;
  return {bank:name, questions:context.bank.length, verified:audit.questions.filter(q=>q.status==='verified').length, longestStrategyPercent:+(100*rate).toFixed(2), strictLongestPercent:+(100*strict/context.bank.length).toFixed(2), wordStrategyPercent:+(100*wordWeighted/context.bank.length).toFixed(2), errors};
});
console.log(JSON.stringify({total:ids.size, results},null,2));
if (failed) process.exitCode = 1;
