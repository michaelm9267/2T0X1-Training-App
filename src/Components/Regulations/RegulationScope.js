import { createContext, useContext } from 'react';
import { ModeContext } from '../Session/mode';
const Scope = createContext(null);

export default function RegulationScope({ view = 'contextual', assessmentActive, children }) {
  const mode = useContext(ModeContext);
  const parent = useContext(Scope);
  // A child view cannot remove an assessment restriction imposed by its owning flow.
  const locked = Boolean(parent?.locked || (assessmentActive ?? (parent ? false : mode === 'test')));
  return <Scope.Provider value={{ locked, view }}>{children}</Scope.Provider>;
}
export function useRegulationAids() {
  const mode = useContext(ModeContext);
  const scope = useContext(Scope);
  if (scope?.locked ?? mode === 'test') return false;
  return mode !== 'test' || scope?.view === 'review' || scope?.view === 'reference';
}
