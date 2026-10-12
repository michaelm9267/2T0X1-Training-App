import { frustrate, openFrustration, entryTitle } from '../CargoWindow/frustration';

// Frustrates the asset for one specific reason from the area where the discrepancy is found.
// Release happens only in the main Cargo frustration panel.
export default function FrustrateButton({ scenario, exercise, onWorkflow, reason, subject, label, disabled = false }) {
  const title = entryTitle(scenario, { reason, subject });
  if (openFrustration(exercise, reason, subject)) return <span className="frustrated-tag">Frustrated: {title}. Release it in the Cargo frustration panel.</span>;
  return <button type="button" className="frustrate-button" disabled={disabled} aria-label={`Frustrate: ${label}`} title={title} onClick={() => onWorkflow(e => frustrate(scenario, e, reason, '', subject))}>Frustrate</button>;
}
