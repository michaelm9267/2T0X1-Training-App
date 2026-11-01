// Apply only the two cited screening rules. These cases deliberately do not imply that
// passing weight/distance screening authorizes Code 2 service or overrides exclusions.
const cases = [
  ['July', 9500, 900, true, true], ['January', 9500, 900, false, true],
  ['January', 3000, 800, true, false], ['July', 10000, 801, true, true],
  ['July', 10001, 950, false, true], ['January', 3001, 800, false, false],
  ['January', 2500, 1200, true, true], ['July', 8000, 700, true, false],
];
const choices = ['Meets both weight and distance criteria', 'Meets weight only', 'Meets distance only', 'Meets neither criterion'];
export const scenarioBank = cases.map(([month, weight, miles, weightOK, distanceOK], i) => ({
  id: `scenario-code2-${i}`, setId: 'dtrPart4', publication: 'DTR Part IV', section: 'dtrPart4', sourceSection: 'cA402',
  ref: 'Ch A-402, para C.2.c(1)(b)', supportingRefs: ['Ch A-402, para C.2.c(1)(c)'],
  question: `A shipment estimated at ${weight.toLocaleString('en-US')} lbs moves ${miles} miles in ${month}. Considering only the Code 2 weight and distance screening rules, which criteria does it meet?`,
  answer: choices[weightOK ? (distanceOK ? 0 : 1) : distanceOK ? 2 : 3],
  wrong: choices.filter((_, index) => index !== (weightOK ? (distanceOK ? 0 : 1) : distanceOK ? 2 : 3)),
  explanation: 'Peak season (15 May–30 September) permits estimates up to 10,000 lbs; non-peak season permits up to 3,000 lbs. The distance must be greater than 800 miles. Other Code 2 criteria and exclusions still apply.',
}));
