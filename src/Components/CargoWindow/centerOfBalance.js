// DTR Part III, Appendix P (June 2016), C.1–2, printed page III-P-2.
export function calculateCB(rows, grossValue) {
  const present = value => value !== undefined && value !== null && String(value).trim() !== '';
  if (!present(grossValue) || rows.length < 2 || rows.some(row => !present(row.distance) || !present(row.weight))) {
    return { error: 'Enter every axle distance, axle weight, and the vehicle gross weight.' };
  }
  const grossWeight = Number(grossValue);
  const axles = rows.map(row => ({ distance: Number(row.distance), weight: Number(row.weight) }));
  if (!Number.isFinite(grossWeight) || grossWeight <= 0 || axles.some(row => !Number.isFinite(row.distance) || !Number.isFinite(row.weight) || row.distance < 0 || row.weight <= 0)) {
    return { error: 'Use finite numbers: axle distances must be zero or greater; all weights must be greater than zero.' };
  }
  if (axles.some((row, index) => index > 0 && row.distance <= axles[index - 1].distance)) {
    return { error: 'Enter axle distances in front-to-rear order, all measured from the same forward RDL.' };
  }
  const axleWeight = axles.reduce((sum, axle) => sum + axle.weight, 0);
  const weightPrecision = Number.EPSILON * Math.max(Math.abs(axleWeight), grossWeight) * (axles.length + 2);
  if (Math.abs(axleWeight - grossWeight) > weightPrecision) {
    return { error: 'The axle weights must add up to the vehicle gross weight. Recheck your entries.' };
  }
  const moments = axles.map(axle => axle.distance * axle.weight);
  const totalMoment = moments.reduce((sum, moment) => sum + moment, 0);
  const exact = totalMoment / grossWeight;
  if (![totalMoment, exact].every(Number.isFinite)) return { error: 'These readings exceed the calculator range. Recheck your entries.' };
  // Correct only numerical noise at an exact half-inch boundary, not measured fractions.
  const roundingPrecision = Math.min(1e-9, Number.EPSILON * Math.max(1, exact) * (axles.length + 2));
  return { axles, moments, grossWeight, totalMoment, exact, rounded: Math.round(exact + roundingPrecision) };
}
