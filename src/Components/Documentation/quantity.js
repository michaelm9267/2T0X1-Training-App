// DG2 total quantity, entered in metric or imperial units. Filling either field fills the other;
// one Net/Gross choice applies to both.
export const MEASURES = {
  'Weight (kg / lb)': { metric: 'kg', imperial: 'lb', factor: 2.20462262 },
  'Volume (L / gal)': { metric: 'L', imperial: 'gal', factor: 0.264172052 },
};
export const DEFAULT_MEASURE = 'Weight (kg / lb)';
export const measureOf = name => MEASURES[name] || MEASURES[DEFAULT_MEASURE];

const round = value => String(Math.round(value * 100) / 100);
// Converts a typed amount; blank or non-numeric input clears the other field.
export function convertQuantity(text, toImperial, measureName) {
  const amount = Number(text);
  if (String(text ?? '').trim() === '' || !Number.isFinite(amount)) return '';
  const { factor } = measureOf(measureName);
  return round(toImperial ? amount * factor : amount / factor);
}

// The linked field to update when one quantity field (or the measure) changes, or null.
export function linkedQuantity(id, value, draft) {
  if (id === 'dg2QtyMetric') return { id: 'dg2QtyImperial', value: convertQuantity(value, true, draft.dg2QtyMeasure) };
  if (id === 'dg2QtyImperial') return { id: 'dg2QtyMetric', value: convertQuantity(value, false, draft.dg2QtyMeasure) };
  if (id === 'dg2QtyMeasure') return { id: 'dg2QtyImperial', value: convertQuantity(draft.dg2QtyMetric, true, value) };
  return null;
}
