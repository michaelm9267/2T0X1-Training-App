export function axleCode(scenario, index) {
  return index === 0 ? 'FAW' : index === scenario.axles.length - 1 ? 'RAW' : 'IAW';
}

export function axleLabels(scenario) {
  return (scenario.axles || []).map((axle,index) => ({ ...axle, index, code:axleCode(scenario,index), type:axleCode(scenario,index).toLowerCase(), weightId:`W${index+1}`, distanceId:`D${index+1}` }));
}
